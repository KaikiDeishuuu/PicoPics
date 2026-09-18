import type Database from "better-sqlite3";

interface DOStorageLike {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteAll(): Promise<void>;
  list(options?: { prefix?: string }): Promise<Map<string, unknown>>;
}

interface DOInstance {
  fetch(request: Request): Promise<Response>;
}

type DOConstructor = new (state: unknown, env: unknown) => DOInstance;

interface DurableObjectIdLike {
  name: string;
}

interface DurableObjectStubLike {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespaceLike {
  idFromName(name: string): DurableObjectIdLike;
  get(id: DurableObjectIdLike): DurableObjectStubLike;
}

/**
 * Per-(namespace, instance) storage: in-memory Map with write-through to the
 * do_storage table so quota counters and IP blacklist entries survive
 * restarts. All values are JSON-encoded.
 */
class StorageShim implements DOStorageLike {
  private readonly cache = new Map<string, unknown>();
  private readonly stmtLoadAll: Database.Statement;
  private readonly stmtUpsert: Database.Statement;
  private readonly stmtDeleteKey: Database.Statement;
  private readonly stmtDeleteAll: Database.Statement;
  private loaded = false;

  constructor(
    private readonly namespace: string,
    private readonly name: string,
    db: Database.Database
  ) {
    this.stmtLoadAll = db.prepare(
      "SELECT key, value FROM do_storage WHERE namespace = ? AND name = ?"
    );
    this.stmtUpsert = db.prepare(
      `INSERT INTO do_storage (namespace, name, key, value) VALUES (?, ?, ?, ?)
       ON CONFLICT(namespace, name, key) DO UPDATE SET value = excluded.value`
    );
    this.stmtDeleteKey = db.prepare(
      "DELETE FROM do_storage WHERE namespace = ? AND name = ? AND key = ?"
    );
    this.stmtDeleteAll = db.prepare("DELETE FROM do_storage WHERE namespace = ? AND name = ?");
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cache.size > 0 || this.loaded) return;
    for (const row of this.stmtLoadAll.all(this.namespace, this.name) as {
      key: string;
      value: string;
    }[]) {
      this.cache.set(row.key, JSON.parse(row.value));
    }
    this.loaded = true;
  }

  async get(key: string): Promise<unknown> {
    await this.ensureLoaded();
    return this.cache.get(key);
  }

  async put(key: string, value: unknown): Promise<void> {
    await this.ensureLoaded();
    this.cache.set(key, value);
    this.stmtUpsert.run(this.namespace, this.name, key, JSON.stringify(value));
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureLoaded();
    const had = this.cache.delete(key);
    this.stmtDeleteKey.run(this.namespace, this.name, key);
    return had;
  }

  async deleteAll(): Promise<void> {
    this.cache.clear();
    this.loaded = true;
    this.stmtDeleteAll.run(this.namespace, this.name);
  }

  async list(options?: { prefix?: string }): Promise<Map<string, unknown>> {
    await this.ensureLoaded();
    const result = new Map<string, unknown>();
    for (const key of Array.from(this.cache.keys()).sort()) {
      if (!options?.prefix || key.startsWith(options.prefix)) {
        result.set(key, this.cache.get(key));
      }
    }
    return result;
  }
}

/**
 * In-process Durable Object namespace: idFromName(name) → get(id) → fetch()
 * dispatches to a lazily-created instance of the real DO class exported by
 * workers/uploader.ts (UploadQuota / IPBlacklist), so the DO business logic
 * itself runs unchanged. A single Node process keeps per-name access
 * serialized, matching DO single-instance semantics closely enough for the
 * read-then-write patterns the workers use.
 */
export function createNamespace(
  namespace: string,
  ctor: DOConstructor,
  env: unknown,
  db: Database.Database
): DurableObjectNamespaceLike {
  const instances = new Map<string, DOInstance>();
  return {
    idFromName(name: string): DurableObjectIdLike {
      return { name };
    },
    get(id: DurableObjectIdLike): DurableObjectStubLike {
      let instance = instances.get(id.name);
      if (!instance) {
        // DO classes access this.state.storage — the shim state wraps the
        // persisting storage map.
        instance = new ctor({ storage: new StorageShim(namespace, id.name, db) }, env);
        instances.set(id.name, instance);
      }
      return {
        fetch: (request: Request) => instance.fetch(request),
      };
    },
  };
}
