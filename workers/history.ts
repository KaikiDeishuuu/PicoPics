import type { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  CDN_BASE_URL: string;
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

const DEFAULT_PAGE_SIZE = 60;
const MAX_PAGE_SIZE = 500;

// Token 验证缓存：GitHub API 有速率限制，画廊每次刷新都不该真调一次。
// module 级 Map 在 Workers 上随 isolate 存活，在 VPS 网关上是进程级缓存。
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const TOKEN_CACHE_MAX = 1000;
const tokenCache = new Map<string, { user: any; expires: number }>();

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

// 验证 GitHub Token（带缓存，仅缓存成功结果）
async function verifyGitHubToken(
  token: string,
  _env: Env
): Promise<{
  valid: boolean;
  user?: any;
  error?: string;
}> {
  const cached = tokenCache.get(token);
  if (cached && cached.expires > Date.now()) {
    return { valid: true, user: cached.user };
  }

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

    if (tokenCache.size >= TOKEN_CACHE_MAX) {
      // Map 按插入序遍历，删最旧一条腾位（不用迭代器语法，兼容 es5 目标）
      let removed = false;
      tokenCache.forEach((_value, key) => {
        if (!removed) {
          tokenCache.delete(key);
          removed = true;
        }
      });
    }
    tokenCache.set(token, { user, expires: Date.now() + TOKEN_CACHE_TTL_MS });

    return { valid: true, user };
  } catch (_error) {
    return { valid: false, error: "Token verification failed" };
  }
}

function parsePagination(query: Record<string, string | undefined>) {
  const limitRaw = parseInt(query.limit || "", 10);
  const offsetRaw = parseInt(query.offset || "", 10);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
  return { limit, offset };
}

// 获取用户历史记录（分页：?limit=60&offset=0）
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
    const { limit, offset } = parsePagination(c.req.query());
    const userId = authResult.user.id.toString();

    const totalRow = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM user_images WHERE user_id = ?"
    )
      .bind(userId)
      .first<{ cnt: number }>();
    const total = totalRow?.cnt ?? 0;

    const records = await env.DB.prepare(
      `SELECT * FROM user_images WHERE user_id = ? ORDER BY upload_date DESC LIMIT ? OFFSET ?`
    )
      .bind(userId, limit, offset)
      .all();

    const historyRecords: ImageHistoryRecord[] =
      records.results?.map((record: any) => ({
        id: record.image_id || record.id,
        fileName: record.filename,
        url: `${env.CDN_BASE_URL || "https://image.hiaplha.xyz"}/${record.r2_object_key}`,
        size: record.file_size,
        type: record.mime_type,
        uploadedAt: record.upload_date || new Date().toISOString(),
        r2ObjectKey: record.r2_object_key,
      })) || [];

    return c.json({
      success: true,
      data: historyRecords,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + historyRecords.length < total,
      },
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
