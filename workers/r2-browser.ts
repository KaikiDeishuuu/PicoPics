import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

interface Env {
  IMAGES: R2Bucket;
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ADMIN_TOKEN: string;
}

interface R2Object {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  contentType?: string;
}

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
  })
);

// 获取 CORS 头部
function getCorsHeaders(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(",") || ["*"];

  if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
      "Access-Control-Max-Age": "86400",
    };
  }

  return {};
}

// 验证管理员权限
async function verifyAdmin(
  request: Request,
  env: Env
): Promise<{
  valid: boolean;
  error?: string;
}> {
  const adminToken = request.headers.get("X-Admin-Token");

  if (!adminToken || adminToken !== env.ADMIN_TOKEN) {
    return { valid: false, error: "管理员令牌验证失败" };
  }

  return { valid: true };
}

// 获取 R2 对象列表
app.get("/api/objects", async (c) => {
  const env = c.env;
  const authResult = await verifyAdmin(c.req.raw, env);

  if (!authResult.valid) {
    return c.json({ success: false, error: authResult.error }, 403);
  }

  try {
    const objects = await env.IMAGES.list();

    const r2Objects: R2Object[] = objects.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      lastModified: obj.uploaded.toISOString(),
      etag: obj.etag,
      contentType: obj.httpMetadata?.contentType,
    }));

    return c.json({
      success: true,
      data: r2Objects,
    });
  } catch (error) {
    console.error("List objects error:", error);
    return c.json({ success: false, error: "获取对象列表失败" }, 500);
  }
});

// 删除 R2 对象
app.delete("/api/delete/:key", async (c) => {
  const env = c.env;
  const key = c.req.param("key");
  const authResult = await verifyAdmin(c.req.raw, env);

  if (!authResult.valid) {
    return c.json({ success: false, error: authResult.error }, 403);
  }

  try {
    // 删除 R2 对象
    await env.IMAGES.delete(key);

    // 删除数据库记录
    await env.DB.prepare(`DELETE FROM user_images WHERE r2_object_key = ?`).bind(key).run();

    return c.json({
      success: true,
      message: "对象删除成功",
    });
  } catch (error) {
    console.error("Delete object error:", error);
    return c.json({ success: false, error: "删除对象失败" }, 500);
  }
});

// 健康检查
app.get("/health", (c) => {
  return c.json({ status: "ok", worker: "r2-browser-worker-v2" });
});

export default app;
