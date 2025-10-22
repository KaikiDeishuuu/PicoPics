/**
 * History Worker - 处理用户图片历史记录查询
 *
 * 功能：
 * - 验证用户 GitHub OAuth 身份
 * - 查询用户的所有图片记录
 * - 返回图片元数据列表
 *
 * 路由：
 * - GET /api/history - 获取用户历史记录
 * - OPTIONS /* - CORS 预检
 */

import type { ExecutionContext } from "@cloudflare/workers-types";
import type { Env, HistoryResponse, ImageHistoryRecord } from "./types";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // CORS 预检
    if (request.method === "OPTIONS") {
      return handleCors(env, request);
    }

    // 只允许 GET 请求
    if (request.method !== "GET") {
      return errorResponse("只允许 GET 请求", 405, env, request);
    }

    // 路由
    if (pathname === "/api/history") {
      return handleHistory(request, env);
    }

    // 默认响应
    return new Response(
      JSON.stringify(
        {
          service: "History API Worker",
          version: "1.0.0",
          endpoints: {
            history: "GET /api/history - 获取用户历史记录",
          },
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  },
};

/**
 * 处理历史记录查询
 */
async function handleHistory(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // 1. 验证 Authorization 头
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("需要提供有效的访问令牌", 401, env, request);
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // 2. 验证 GitHub token 并获取用户信息
    const userInfo = await verifyGitHubToken(token);
    if (!userInfo) {
      return errorResponse("无效的访问令牌", 403, env, request);
    }

    // 3. 查询用户的历史记录
    const records = await getUserImageHistory(env.DB, userInfo.id.toString());

    // 4. 返回结果
    const response: HistoryResponse = {
      success: true,
      data: records,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(env, request),
      },
    });
  } catch (error) {
    console.error("History query error:", error);
    return errorResponse("查询历史记录失败", 500, env, request);
  }
}

/**
 * 验证 GitHub Access Token 并获取用户信息
 */
async function verifyGitHubToken(token: string): Promise<{ id: number; login: string } | null> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Cloudflare-History-API-Worker",
      },
    });

    if (!response.ok) {
      return null;
    }

    const userData: { id: number; login: string } = await response.json();
    return {
      id: userData.id,
      login: userData.login,
    };
  } catch (error) {
    console.error("GitHub token verification error:", error);
    return null;
  }
}

/**
 * 获取用户的图片历史记录
 */
async function getUserImageHistory(
  db: any,
  userId: string
): Promise<ImageHistoryRecord[]> {
  try {
    const query = `
      SELECT
        id,
        image_id as imageId,
        user_id as userId,
        r2_object_key as r2ObjectKey,
        filename,
        upload_date as uploadDate,
        file_size as fileSize,
        mime_type as mimeType,
        created_at as createdAt,
        updated_at as updatedAt
      FROM user_images
      WHERE user_id = ?
      ORDER BY upload_date DESC
    `;

    const result = await db.prepare(query).bind(userId).all();

    if (!result.success) {
      console.error("Database query failed:", result.error);
      return [];
    }

    return (result.results as any[]) || [];
  } catch (error) {
    console.error("Database query error:", error);
    return [];
  }
}

/**
 * CORS 处理
 */
function handleCors(env: Env, request?: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(env, request),
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * 获取 CORS 头
 */
function getCorsHeaders(env: Env, request?: Request): Record<string, string> {
  const allowedOrigins = env.ALLOWED_ORIGINS || "*";

  // 如果是 "*"，直接返回
  if (allowedOrigins === "*") {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    };
  }

  // 获取请求的 Origin
  const requestOrigin = request?.headers.get("Origin") || "";

  // 检查请求的 Origin 是否在允许列表中
  const allowedList = allowedOrigins.split(",").map((o) => o.trim());
  const isAllowed = allowedList.some((allowed) => {
    // 精确匹配
    if (allowed === requestOrigin) return true;
    // 通配符匹配
    if (allowed.includes("*")) {
      // 先转义正则特殊字符(包括反斜杠)\ ，再替换*为.*
      const escapeRegexSpecialChars = (str: string): string =>
        str.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&'); // escape all regex metacharacters including backslash, but not * (handled next)
      const pattern = escapeRegexSpecialChars(allowed).replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(requestOrigin);
    }
    return false;
  });

  return {
    "Access-Control-Allow-Origin": isAllowed
      ? requestOrigin
      : allowedList[0] || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * 错误响应
 */
function errorResponse(
  message: string,
  status: number,
  env: Env,
  request?: Request
): Response {
  const response: HistoryResponse = {
    success: false,
    error: message,
    code: `ERR_${status}`,
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(env, request),
    },
  });
}