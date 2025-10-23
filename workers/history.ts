import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { D1Database } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

interface ImageHistoryRecord {
  id: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  r2ObjectKey: string;
}

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };
  }

  return {};
}

// 验证 GitHub Token
async function verifyGitHubToken(
  token: string,
  env: Env
): Promise<{
  valid: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "PicoPics/2.0",
      },
    });

    if (!response.ok) {
      return { valid: false, error: "Invalid token" };
    }

    const user = await response.json();
    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: "Token verification failed" };
  }
}

// 获取用户历史记录
app.get("/api/history", async (c) => {
  const env = c.env;
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "需要提供有效的访问令牌" }, 401);
  }

  const token = authHeader.substring(7);
  const authResult = await verifyGitHubToken(token, env);

  if (!authResult.valid || !authResult.user) {
    return c.json({ success: false, error: "无效的访问令牌" }, 403);
  }

  try {
    const records = await env.DB.prepare(
      `SELECT * FROM user_images WHERE user_id = ? ORDER BY created_at DESC`
    )
      .bind(authResult.user.id.toString())
      .all();

    const historyRecords: ImageHistoryRecord[] =
      records.results?.map((record: any) => ({
        id: record.id,
        fileName: record.file_name,
        url: `https://cdn-worker-v2-prod.haoweiw370.workers.dev/${record.r2_object_key}`,
        size: record.file_size,
        type: record.file_type,
        uploadedAt: record.created_at,
        r2ObjectKey: record.r2_object_key,
      })) || [];

    return c.json({
      success: true,
      data: historyRecords,
    });
  } catch (error) {
    console.error("Get history error:", error);
    return c.json({ success: false, error: "获取历史记录失败" }, 500);
  }
});

// 健康检查
app.get("/health", (c) => {
  return c.json({ status: "ok", worker: "history-worker-v2" });
});

export default app;
