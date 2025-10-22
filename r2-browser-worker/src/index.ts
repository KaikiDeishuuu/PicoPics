/**
 * R2 Browser Worker - 提供R2存储桶浏览和管理功能
 *
 * 功能：
 * - 验证管理员身份
 * - 列出R2存储桶中的所有对象
 * - 删除指定的对象
 *
 * 路由：
 * - GET /api/browse - 浏览R2存储桶内容
 * - DELETE /api/delete - 删除指定对象
 * - OPTIONS /* - CORS 预检
 */

import { Router } from "itty-router";
import type { ExecutionContext, R2Bucket } from "@cloudflare/workers-types";
import type { R2BrowserResponse, DeleteResponse } from "./types";

export interface Env {
  IMAGES: R2Bucket;
  ALLOWED_ORIGINS: string;
  ADMIN_USERS: string;
}

const router = Router();

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return router.handle(request, env, ctx).catch((error) => {
      console.error("Worker error:", error);
      return errorResponse("Internal server error", 500, env, request);
    });
  },
};

// CORS 预检处理
router.options("*", (request: Request, env: Env) => {
  return handleCors(env, request);
});

// 浏览R2存储桶内容
router.get("/api/browse", async (request: Request, env: Env) => {
  try {
    // 验证管理员权限
    const isAdmin = await verifyAdmin(request, env);
    if (!isAdmin) {
      return errorResponse("需要管理员权限", 403, env, request);
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "100"),
      1000
    );

    // 列出R2对象
    const objects = await env.IMAGES.list({
      limit,
      cursor: cursor || undefined,
    });

    const objectInfos = objects.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      httpEtag: obj.httpEtag,
      checksums: obj.checksums,
    }));

    const response: R2BrowserResponse = {
      success: true,
      data: {
        objects: objectInfos,
        truncated: objects.truncated,
        cursor: objects.cursor,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(env, request),
      },
    });
  } catch (error) {
    console.error("Browse error:", error);
    return errorResponse("浏览存储桶失败", 500, env, request);
  }
});

// 删除R2对象
router.delete("/api/delete", async (request: Request, env: Env) => {
  try {
    // 验证管理员权限
    const isAdmin = await verifyAdmin(request, env);
    if (!isAdmin) {
      return errorResponse("需要管理员权限", 403, env, request);
    }

    const url = new URL(request.url);
    const keys = url.searchParams.getAll("key");

    if (keys.length === 0) {
      return errorResponse("请指定要删除的对象键", 400, env, request);
    }

    // 删除对象
    const deletePromises = keys.map((key) => env.IMAGES.delete(key));
    await Promise.all(deletePromises);

    const response: DeleteResponse = {
      success: true,
      deleted: keys,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(env, request),
      },
    });
  } catch (error) {
    console.error("Delete error:", error);
    return errorResponse("删除对象失败", 500, env, request);
  }
});

// 默认路由
router.all("*", (request: Request, env: Env) => {
  const response = {
    service: "R2 Browser API Worker",
    version: "1.0.0",
    endpoints: {
      browse: "GET /api/browse - 浏览R2存储桶内容 (管理员权限)",
      delete: "DELETE /api/delete?key=object-key - 删除指定对象 (管理员权限)",
    },
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(env, request),
    },
  });
});

/**
 * 验证管理员权限
 */
async function verifyAdmin(request: Request, env: Env): Promise<boolean> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.substring(7);
    const userInfo = await verifyGitHubToken(token);

    if (!userInfo) {
      return false;
    }

    // 检查是否为管理员
    const adminUsers = env.ADMIN_USERS.split(",").map((u) => u.trim());
    return adminUsers.includes(userInfo.login);
  } catch (error) {
    console.error("Admin verification error:", error);
    return false;
  }
}

/**
 * 验证 GitHub Access Token 并获取用户信息
 */
async function verifyGitHubToken(
  token: string
): Promise<{ id: number; login: string } | null> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Cloudflare-R2-Browser-Worker",
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

  if (allowedOrigins === "*") {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, X-Admin-Token",
      "Access-Control-Max-Age": "86400",
    };
  }

  const requestOrigin = request?.headers.get("Origin") || "";
  const allowedList = allowedOrigins.split(",").map((o) => o.trim());
  const isAllowed = allowedList.some((allowed) => {
    if (allowed === requestOrigin) return true;
    if (allowed.includes("*")) {
      const pattern = allowed.replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(requestOrigin);
    }
    return false;
  });

  return {
    "Access-Control-Allow-Origin": isAllowed
      ? requestOrigin
      : allowedList[0] || "*",
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Admin-Token",
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
  const response: R2BrowserResponse = {
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
