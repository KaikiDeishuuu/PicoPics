import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "./uploader";

type AppEnv = Parameters<typeof app.request>[2];

const GITHUB_USER = { id: 12345, login: "tester" };

// verifyGitHubToken reads caches.default and fetches api.github.com;
// neither exists under Node/vitest, so stub both.
function stubCachesAndFetch(githubStatus = 200) {
  vi.stubGlobal("caches", {
    default: {
      match: async () => undefined,
      put: async () => {},
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("api.github.com/user")) {
        return githubStatus === 200
          ? new Response(JSON.stringify(GITHUB_USER), { status: 200 })
          : new Response("{}", { status: githubStatus });
      }
      if (url.includes("api.telegram.org")) {
        return new Response("{}", { status: 200 });
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    })
  );
}

// Order log shared by the D1 and R2 mocks so tests can assert the
// D1-before-R2 delete ordering across the two bindings.
function createMockEnv(
  opts: { record?: unknown; d1RunResult?: { success: boolean }; r2Fails?: boolean } = {}
) {
  const order: string[] = [];

  const db = {
    prepare(sql: string) {
      return {
        bind(..._params: unknown[]) {
          return {
            first: async () => opts.record ?? null,
            run: async () => {
              order.push(`d1:${sql.trim().split(/\s+/).slice(0, 3).join(" ")}`);
              return opts.d1RunResult ?? { success: true };
            },
            all: async () => ({ results: [] }),
          };
        },
      };
    },
  };

  const images = {
    delete: async (key: string) => {
      if (opts.r2Fails) {
        throw new Error("R2 unavailable");
      }
      order.push(`r2:${key}`);
      return undefined;
    },
  };

  // ALLOWED_ORIGINS intentionally absent: the origin middleware passes
  // requests through when it is unconfigured.
  const env = {
    IMAGES: images,
    UPLOAD_QUOTA: {},
    IP_BLACKLIST: {},
    DB: db,
    MAX_FILE_SIZE: "10485760",
    DAILY_QUOTA_BYTES: "100000000",
    ABUSE_DETECTION_ENABLED: "false",
    CONTENT_MODERATION_ENABLED: "false",
    GITHUB_CLIENT_ID: "test-client-id",
    GITHUB_CLIENT_SECRET: "test-client-secret",
    ADMIN_TOKEN: "test-admin-token",
  } as unknown as AppEnv;

  return { env, order };
}

function deleteRequest(body: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return new Request("https://upload.test/api/delete", {
    method: "DELETE",
    headers,
    body: JSON.stringify(body),
  });
}

// c.executionCtx throws (rather than returning undefined) when Hono has no
// ExecutionContext, so every request must supply a stub waitUntil.
function callDelete(req: Request, env: AppEnv) {
  const executionCtx = { waitUntil: () => {} } as Parameters<typeof app.request>[3];
  return app.request(req, undefined, env, executionCtx);
}

describe("DELETE /api/delete", () => {
  beforeEach(() => stubCachesAndFetch());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("deletes the D1 record before the R2 object and returns success", async () => {
    const { env, order } = createMockEnv({
      record: { r2_object_key: "u/1/a.png", user_id: "12345" },
    });

    const res = await callDelete(deleteRequest({ r2ObjectKey: "u/1/a.png" }, "gh-token"), env);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deleted.r2ObjectKey).toBe("u/1/a.png");
    expect(order).toEqual(["d1:DELETE FROM user_images", "r2:u/1/a.png"]);
  });

  it("still reports success when the R2 delete fails (orphan reclaimed by clean-invalid)", async () => {
    const { env, order } = createMockEnv({
      record: { r2_object_key: "u/1/a.png", user_id: "12345" },
      r2Fails: true,
    });

    const res = await callDelete(deleteRequest({ r2ObjectKey: "u/1/a.png" }, "gh-token"), env);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(order).toEqual(["d1:DELETE FROM user_images"]);
  });

  it("does not touch R2 when the D1 delete fails", async () => {
    const { env, order } = createMockEnv({
      record: { r2_object_key: "u/1/a.png", user_id: "12345" },
      d1RunResult: { success: false },
    });

    const res = await callDelete(deleteRequest({ r2ObjectKey: "u/1/a.png" }, "gh-token"), env);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(order).toEqual(["d1:DELETE FROM user_images"]);
  });

  it("returns 404 and deletes nothing when the caller does not own the image", async () => {
    const { env, order } = createMockEnv({ record: null });

    const res = await callDelete(deleteRequest({ r2ObjectKey: "u/other/a.png" }, "gh-token"), env);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(order).toEqual([]);
  });

  it("rejects invalid GitHub tokens with 403", async () => {
    stubCachesAndFetch(401);
    const { env, order } = createMockEnv();

    const res = await callDelete(deleteRequest({ r2ObjectKey: "u/1/a.png" }, "bad-token"), env);

    expect(res.status).toBe(403);
    expect(order).toEqual([]);
  });

  it("requires a Bearer token (401)", async () => {
    const { env, order } = createMockEnv();

    const res = await callDelete(deleteRequest({ r2ObjectKey: "u/1/a.png" }), env);

    expect(res.status).toBe(401);
    expect(order).toEqual([]);
  });

  it("requires r2ObjectKey in the body (400)", async () => {
    const { env, order } = createMockEnv();

    const res = await callDelete(deleteRequest({}, "gh-token"), env);

    expect(res.status).toBe(400);
    expect(order).toEqual([]);
  });
});
