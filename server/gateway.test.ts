// @vitest-environment node
// (jsdom's FormData/File are incompatible with Node's undici Request bodies)
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGateway, type GatewayConfig } from "./gateway";

const GITHUB_USER = { id: 777, login: "gwtester" };

// Minimal valid PNG (magic bytes + IHDR-ish padding) — the worker sniffs the
// first 16 bytes, so only the signature matters.
function pngBytes(size = 256): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return bytes;
}

function makeConfig(dataDir: string): GatewayConfig {
  return {
    port: 0,
    dataDir,
    publicOrigin: "https://picopics.test",
    githubClientId: "test-client-id",
    githubClientSecret: "test-client-secret",
    adminToken: "test-admin-token",
    maxFileSize: "10485760",
    dailyQuotaBytes: "104857600",
    abuseDetectionEnabled: "true",
    contentModerationEnabled: "false",
    allowedOrigins: "https://picopics.test",
    allowedReferers: "picopics.test",
    imagesBucketId: "",
  };
}

describe("gateway integration", () => {
  let dir: string;
  let gateway: ReturnType<typeof createGateway>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "picopics-gw-"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("api.github.com/user")) {
          return new Response(JSON.stringify(GITHUB_USER), { status: 200 });
        }
        if (url.includes("api.telegram.org")) {
          return new Response("{}", { status: 200 });
        }
        throw new Error(`Unexpected fetch in test: ${url}`);
      })
    );
    gateway = createGateway(makeConfig(dir));
  });

  afterEach(() => {
    gateway.close();
    rmSync(dir, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  const call = (req: Request) => gateway.dispatch(req);

  it("serves uploader /health", async () => {
    const res = await call(new Request("https://picopics.test/health"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("healthy");
  });

  it("runs the full upload → history → CDN → delete round trip", async () => {
    // Upload
    const form = new FormData();
    form.append("image", new File([pngBytes()], "cat.png", { type: "image/png" }));
    const uploadRes = await call(
      new Request("https://picopics.test/upload", {
        method: "POST",
        headers: { Authorization: "Bearer gh-token" },
        body: form,
      })
    );
    const uploadJson = await uploadRes.json();
    expect(uploadRes.status).toBe(200);
    expect(uploadJson.success).toBe(true);
    const key = uploadJson.data.r2ObjectKey as string;
    expect(key).toMatch(/^images\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]+\.png$/);
    expect(uploadJson.data.url).toBe(`https://picopics.test/${key}`);

    // Object bytes on disk (R2 shim)
    const file = join(dir, "images", key);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).length).toBe(256);

    // D1 row via the history app (same SQLite, different Hono app)
    const historyRes = await call(
      new Request("https://picopics.test/api/history", {
        headers: { Authorization: "Bearer gh-token" },
      })
    );
    const historyJson = await historyRes.json();
    expect(historyRes.status).toBe(200);
    expect(historyJson.success).toBe(true);
    expect(historyJson.data).toHaveLength(1);
    expect(historyJson.data[0].fileName).toBe(key.split("/").pop());
    expect(historyJson.data[0].url).toBe(`https://picopics.test/${key}`);

    // CDN app serves the bytes with image content type
    const imageRes = await call(new Request(`https://picopics.test/${key}`));
    expect(imageRes.status).toBe(200);
    expect(imageRes.headers.get("Content-Type")).toBe("image/png");
    expect((await imageRes.arrayBuffer()).byteLength).toBe(256);

    // Quota was incremented by the DO shim
    const quotaRes = await call(
      new Request("https://picopics.test/api/quota", {
        headers: { Authorization: "Bearer gh-token" },
      })
    );
    const quotaJson = await quotaRes.json();
    expect(quotaRes.status).toBe(200);
    expect(quotaJson.data.used).toBe(256);

    // Admin stats exercise the D1 aggregate queries incl. DATE(upload_date)
    const statsRes = await call(
      new Request("https://picopics.test/api/admin/stats", {
        headers: { "X-Admin-Token": "test-admin-token" },
      })
    );
    expect(statsRes.status).toBe(200);
    const statsJson = await statsRes.json();
    expect(statsJson.totalImages).toBe(1);

    // Delete removes both the D1 row and the disk object
    const deleteRes = await call(
      new Request("https://picopics.test/api/delete", {
        method: "DELETE",
        headers: { Authorization: "Bearer gh-token", "Content-Type": "application/json" },
        body: JSON.stringify({ r2ObjectKey: key }),
      })
    );
    expect(deleteRes.status).toBe(200);

    const historyAfter = await call(
      new Request("https://picopics.test/api/history", {
        headers: { Authorization: "Bearer gh-token" },
      })
    );
    expect((await historyAfter.json()).data).toHaveLength(0);

    const imageAfter = await call(new Request(`https://picopics.test/${key}`));
    expect(imageAfter.status).toBe(404);
  });

  it("rejects uploads without a token", async () => {
    const form = new FormData();
    form.append("image", new File([pngBytes()], "cat.png", { type: "image/png" }));
    const res = await call(
      new Request("https://picopics.test/upload", { method: "POST", body: form })
    );
    expect(res.status).toBe(401);
  });

  it("forwards X-Forwarded-For into CF-Connecting-IP (abuse detection reads it)", async () => {
    const form = new FormData();
    form.append("image", new File([pngBytes()], "cat.png", { type: "image/png" }));
    const res = await call(
      new Request("https://picopics.test/upload", {
        method: "POST",
        headers: { Authorization: "Bearer gh-token", "X-Forwarded-For": "203.0.113.9" },
        body: form,
      })
    );
    expect(res.status).toBe(200);
  });
});
