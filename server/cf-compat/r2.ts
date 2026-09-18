import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

interface R2HttpMetadata {
  contentType?: string;
  cacheControl?: string;
}

interface R2PutOptions {
  httpMetadata?: R2HttpMetadata;
}

interface R2ObjectLike {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  httpMetadata?: R2HttpMetadata;
}

interface R2ObjectBodyLike extends R2ObjectLike {
  body: ReadableStream;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Disk-backed R2 bucket: object bytes at <root>/<key>, content-type and
 * upload metadata in a sidecar JSON so `head`/`get` can rebuild the R2Object
 * shape the workers rely on (cdn.ts reads httpMetadata/etag/uploaded/size).
 */
export class R2BucketDisk {
  constructor(private readonly root: string) {}

  private resolveKey(key: string): string {
    // Object keys come from our own uploader (images/<date>/<uuid>.<ext>)
    // and from admin delete routes (URL-decoded user input) — normalize and
    // confine to the bucket root.
    const target = resolve(this.root, key);
    const rootWithSep = this.root.endsWith(sep) ? this.root : this.root + sep;
    if (target !== this.root && !target.startsWith(rootWithSep)) {
      throw new Error(`R2 shim: key escapes bucket root: ${key}`);
    }
    return target;
  }

  private metaPath(file: string): string {
    return `${file}.__meta__.json`;
  }

  private async readMeta(file: string): Promise<R2ObjectLike | null> {
    try {
      const raw = await readFile(this.metaPath(file), "utf8");
      const meta = JSON.parse(raw) as Omit<R2ObjectLike, "uploaded"> & { uploaded: string };
      return { ...meta, uploaded: new Date(meta.uploaded) };
    } catch {
      return null;
    }
  }

  async put(
    key: string,
    value: ArrayBuffer | ReadableStream | string | Blob | null,
    options: R2PutOptions = {}
  ): Promise<R2ObjectLike | null> {
    if (value === null) {
      await this.delete(key);
      return null;
    }
    const file = this.resolveKey(key);
    let bytes: Uint8Array;
    if (value instanceof ArrayBuffer) {
      bytes = new Uint8Array(value);
    } else if (typeof value === "string") {
      bytes = new TextEncoder().encode(value);
    } else if (value instanceof Blob) {
      bytes = new Uint8Array(await value.arrayBuffer());
    } else {
      // ReadableStream — buffer it (uploads are capped at MAX_FILE_SIZE)
      const reader = value.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        chunks.push(chunk);
      }
      const total = chunks.reduce((n, c) => n + c.byteLength, 0);
      bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
    }

    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, bytes);
    const etag = createHash("md5").update(bytes).digest("hex");
    const object: R2ObjectLike = {
      key,
      size: bytes.byteLength,
      etag,
      uploaded: new Date(),
      httpMetadata: options.httpMetadata,
    };
    await writeFile(
      this.metaPath(file),
      JSON.stringify({ ...object, uploaded: object.uploaded.toISOString() })
    );
    return object;
  }

  async head(key: string): Promise<R2ObjectLike | null> {
    const file = this.resolveKey(key);
    try {
      await stat(file);
    } catch {
      return null;
    }
    return (await this.readMeta(file)) ?? null;
  }

  async get(key: string): Promise<R2ObjectBodyLike | null> {
    const file = this.resolveKey(key);
    let buffer: Buffer;
    try {
      buffer = await readFile(file);
    } catch {
      return null;
    }
    const meta = (await this.readMeta(file)) ?? {
      key,
      size: buffer.byteLength,
      etag: "",
      uploaded: new Date(),
      httpMetadata: undefined,
    };
    const body = new Response(new Uint8Array(buffer)).body as ReadableStream;
    const bytes = new Uint8Array(buffer);
    return {
      ...meta,
      size: buffer.byteLength,
      body,
      blob: async () => new Blob([bytes]),
      arrayBuffer: async () => bytes.slice().buffer,
    };
  }

  async delete(key: string): Promise<void> {
    const file = this.resolveKey(key);
    await Promise.all([rm(file, { force: true }), rm(this.metaPath(file), { force: true })]);
    // Prune now-empty date directories; failures are cosmetic.
    try {
      const dir = dirname(file);
      if (dir !== this.root) {
        await rm(dir, { recursive: false, force: true }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}
