import type { R2Bucket } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

interface Env {
  IMAGES: R2Bucket;
  IMAGES_BUCKET_ID: string;
  ALLOWED_ORIGINS: string;
  ALLOWED_REFERERS?: string; // 允许的 Referer 白名单
}

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use("*", logger());

// Referer 防盗链检查
app.use("*", async (c, next) => {
  const path = c.req.path;

  // 健康检查和根路径不检查
  if (path === "/health" || path === "/") {
    await next();
    return;
  }

  const referer = c.req.header("Referer");
  const allowedReferers = c.env.ALLOWED_REFERERS?.split(",") || [
    "https://image.hiaplha.xyz", // CDN 自身
    "localhost", // 本地开发
  ];

  // 检查 Referer
  if (referer) {
    const isAllowed = allowedReferers.some((allowed) => referer.includes(allowed));

    if (!isAllowed) {
      console.warn("Blocked request from unauthorized referer:", {
        referer,
        path,
        ip: c.req.header("CF-Connecting-IP"),
      });
      return c.text("403 Forbidden: Unauthorized referer", 403);
    }
  } else {
    // 无 Referer 的请求（直接访问、API调用、部分浏览器）
    // 可以选择允许或拒绝
    console.log("Request without referer:", {
      path,
      userAgent: c.req.header("User-Agent"),
      ip: c.req.header("CF-Connecting-IP"),
    });
  }

  await next();
});

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

  if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
      "Access-Control-Max-Age": "86400",
    };
  }

  return {};
}

// 健康检查
app.get("/health", (c) => {
  return c.json({ status: "ok", worker: "cdn-worker-v2" });
});

// 根路径重定向到健康检查
app.get("/", (c) => {
  return c.redirect("/health");
});

// 图片服务路由 - 支持动态缩略图生成
app.get("/:key", async (c) => {
  const key = c.req.param("key");
  const env = c.env;

  // 解析查询参数
  const url = new URL(c.req.url);
  const width = url.searchParams.get("w");
  const height = url.searchParams.get("h");
  const quality = url.searchParams.get("q") || "80";
  const format = url.searchParams.get("f") || "auto";

  try {
    // 从 R2 获取对象
    const object = await env.IMAGES.get(key);

    if (!object) {
      return c.notFound();
    }

    // 如果请求缩略图，使用 Cloudflare Image Resizing
    if (width || height) {
      const resizeUrl = new URL(`https://imagedelivery.net/${env.IMAGES_BUCKET_ID}/${key}`);
      if (width) resizeUrl.searchParams.set("width", width);
      if (height) resizeUrl.searchParams.set("height", height);
      resizeUrl.searchParams.set("quality", quality);
      resizeUrl.searchParams.set("format", format);

      // 重定向到 Cloudflare Image Resizing
      return c.redirect(resizeUrl.toString(), 302);
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

export default app;
