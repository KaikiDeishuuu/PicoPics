import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { R2Bucket } from "@cloudflare/workers-types";

interface Env {
  IMAGES: R2Bucket;
  ALLOWED_ORIGINS: string;
}

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "HEAD", "OPTIONS"],
    allowHeaders: ["Content-Type", "Cache-Control"],
  })
);

// 获取 CORS 头部
function getCorsHeaders(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(",") || ["*"];

  if (
    allowedOrigins.includes("*") ||
    (origin && allowedOrigins.includes(origin))
  ) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
      "Access-Control-Max-Age": "86400",
    };
  }

  return {};
}

// 图片服务路由
app.get("/:key", async (c) => {
  const key = c.req.param("key");
  const env = c.env;

  try {
    // 从 R2 获取对象
    const object = await env.IMAGES.get(key);

    if (!object) {
      return c.notFound();
    }

    // 设置缓存头
    const cacheMaxAge = 31536000; // 1年
    const headers: Record<string, string> = {
      "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
      "Cache-Control": `public, max-age=${cacheMaxAge}, immutable`,
      "CDN-Cache-Control": `public, max-age=${cacheMaxAge}`,
      "Cloudflare-CDN-Cache-Control": `public, max-age=${cacheMaxAge}`,
      ETag: object.etag,
      "Last-Modified": object.uploaded.toUTCString(),
      "Content-Length": object.size.toString(),
      "X-Content-Type-Options": "nosniff",
      "X-Worker": "cdn-worker-v2",
      ...getCorsHeaders(env, c.req.raw),
    };

    return new Response(object.body as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("CDN Worker error:", error);
    return c.text("Internal Server Error", 500);
  }
});

// 健康检查
app.get("/health", (c) => {
  return c.json({ status: "ok", worker: "cdn-worker-v2" });
});

export default app;
