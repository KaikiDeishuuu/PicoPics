/**
 * CDN Worker - 专门处理图片分发
 *
 * 功能：
 * - 从 R2 读取图片
 * - 设置长期缓存头
 * - 支持条件请求（ETag, If-None-Match）
 * - CORS 支持
 * - 健康检查
 *
 * 路由：
 * - GET /{filename} - 获取图片
 * - GET /health - 健康检查
 * - OPTIONS /* - CORS 预检
 */

export interface Env {
  IMAGES: R2Bucket;
  ALLOWED_ORIGINS?: string;
  CACHE_MAX_AGE?: string;
}

// 缓存配置
const DEFAULT_CACHE_MAX_AGE = 31536000; // 1 年

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // CORS 预检
    if (request.method === "OPTIONS") {
      return handleCors(env);
    }

    // 健康检查
    if (pathname === "/health" || pathname === "/") {
      return handleHealth();
    }

    // 图片请求
    if (pathname.startsWith("/") && pathname.length > 1) {
      return handleImageRequest(pathname.slice(1), env, request);
    }

    return new Response("Not Found", { status: 404 });
  },
};

/**
 * 处理图片请求
 */
async function handleImageRequest(
  fileName: string,
  env: Env,
  request: Request
): Promise<Response> {
  try {
    // 从 R2 获取文件
    const object = await env.IMAGES.get(fileName);

    if (!object) {
      return new Response("Image not found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          ...getCorsHeaders(env),
        },
      });
    }

    // 构建响应头
    const cacheMaxAge = parseInt(
      env.CACHE_MAX_AGE || String(DEFAULT_CACHE_MAX_AGE)
    );

    const headers: Record<string, string> = {
      "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
      "Cache-Control": `public, max-age=${cacheMaxAge}, immutable`,
      "CDN-Cache-Control": `public, max-age=${cacheMaxAge}`,
      "Cloudflare-CDN-Cache-Control": `public, max-age=${cacheMaxAge}`,
      ETag: object.etag,
      "Last-Modified": object.uploaded.toUTCString(),
      "Content-Length": object.size.toString(),
      "X-Content-Type-Options": "nosniff",
      "X-Worker": "cdn-worker",
      ...getCorsHeaders(env),
    };

    // 支持条件请求（304 Not Modified）
    const ifNoneMatch = request.headers.get("If-None-Match");
    if (ifNoneMatch === object.etag) {
      return new Response(null, { status: 304, headers });
    }

    // 返回图片
    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Image fetch error:", error);
    return new Response("Error fetching image", {
      status: 500,
      headers: getCorsHeaders(env),
    });
  }
}

/**
 * 健康检查
 */
function handleHealth(): Response {
  return new Response(
    JSON.stringify(
      {
        service: "CDN Worker",
        status: "healthy",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}

/**
 * CORS 处理
 */
function handleCors(env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(env),
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * 获取 CORS 头
 */
function getCorsHeaders(env: Env): Record<string, string> {
  const allowedOrigins = env.ALLOWED_ORIGINS || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigins,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  };
}
