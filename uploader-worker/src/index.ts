/**
 * Uploader Worker - 专门处理图片上传
 *
 * 功能：
 * - 接收前端的图片上传请求
 * - 验证文件类型和大小
 * - 检查每日上传配额
 * - 存储到 R2
 * - 返回图片 URL
 *
 * 路由：
 * - POST /upload - 上传图片
 * - GET /quota - 查询配额状态
 * - OPTIONS /* - CORS 预检
 */

import type { ExecutionContext } from "@cloudflare/workers-types";
import type { Env, UploadResponse } from "./types";
import UploadQuota from "./upload_quota";
import IPBlacklist from "./ip_blacklist";

// 速率限制配置
const RATE_LIMIT = {
  MAX_REQUESTS: 30, // 每分钟最多 30 次上传请求
  WINDOW_MS: 60 * 1000,
};

// 并发控制
let activeUploads = 0;
const MAX_CONCURRENT_UPLOADS = 50;

// 速率限制缓存
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

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

    // 速率限制
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return errorResponse("请求过于频繁，请稍后再试", 429, env, request);
    }

    // 防滥用检查（如果启用）
    if (env.ABUSE_DETECTION_ENABLED === "true" && env.IP_BLACKLIST) {
      const blacklistCheck = await checkIPBlacklist(clientIP, env);
      if (!blacklistCheck.allowed) {
        return errorResponse(
          blacklistCheck.reason || "IP已被封禁",
          403,
          env,
          request
        );
      }
    }

    // 路由
    if (pathname === "/upload" && request.method === "POST") {
      return handleUpload(request, env, ctx);
    }

    if (pathname === "/quota" && request.method === "GET") {
      return handleQuotaStatus(request, env);
    }

    // GitHub OAuth 代理端点
    if (pathname === "/auth/github/device" && request.method === "POST") {
      return handleGitHubDeviceAuth(request, env);
    }

    if (pathname === "/auth/github/token" && request.method === "POST") {
      return handleGitHubTokenPoll(request, env);
    }

    // 管理员权限验证
    if (pathname === "/auth/admin/check" && request.method === "GET") {
      return handleAdminCheck(request, env);
    }

    // R2 存储浏览器 API (管理员专用)
    if (pathname === "/api/browse" && request.method === "GET") {
      return handleBrowseR2(request, env);
    }

    if (pathname === "/api/delete" && request.method === "DELETE") {
      return handleDeleteR2(request, env);
    }

    // 测试 Telegram 通知
    if (pathname === "/test-telegram" && request.method === "GET") {
      return handleTestTelegram(request, env);
    }

    // 测试 Telegram 通知
    if (pathname === "/test-telegram" && request.method === "GET") {
      return handleTelegramTest(request, env);
    }

    // 默认响应
    return new Response(
      JSON.stringify(
        {
          service: "Image Uploader Worker",
          version: "2.0.0",
          endpoints: {
            upload: "POST /upload - 上传图片",
            quota: "GET /quota - 查询配额状态",
          },
          limits: {
            singleImage: "10MB",
            dailyQuota: "2000MB",
            rateLimit: "30 requests/minute",
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
 * GitHub Device Flow - 启动认证
 */
async function handleGitHubDeviceAuth(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const clientId = env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "GitHub Client ID not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(env, request),
          },
        }
      );
    }

    const response = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: "read:user user:email",
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(env, request),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to initiate auth",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  }
}

/**
 * 处理管理员权限验证
 */
async function handleAdminCheck(request: Request, env: Env): Promise<Response> {
  try {
    // 1. 验证 Authorization 头
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("需要提供有效的访问令牌", 401, env, request);
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // 2. 验证 GitHub token 并获取用户信息
    const authResult = await verifyGitHubTokenCached(token, env);
    if (!authResult.valid || !authResult.user) {
      return errorResponse("无效的访问令牌", 403, env, request);
    }

    // 3. 检查是否为管理员（增强验证）
    const adminUsers = env.ADMIN_USERS
      ? env.ADMIN_USERS.split(",").map((u: string) => u.trim())
      : [];
    const isAdmin = adminUsers.includes(authResult.user.login);

    // 4. 如果是管理员，验证额外的管理员令牌
    if (isAdmin) {
      const adminTokenHeader = request.headers.get("X-Admin-Token");
      if (!adminTokenHeader || adminTokenHeader !== env.ADMIN_TOKEN) {
        return errorResponse("管理员令牌验证失败", 403, env, request);
      }
    }

    // 记录管理员访问日志
    if (isAdmin) {
      console.log(
        `Admin access: ${authResult.user.login} (${authResult.user.id})`
      );
    }

    // 5. 返回结果
    const response = {
      success: true,
      isAdmin,
      user: {
        id: authResult.user.id,
        login: authResult.user.login,
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
    console.error("Admin check error:", error);
    return errorResponse("管理员验证失败", 500, env, request);
  }
}

/**
 * 处理R2存储桶浏览（管理员专用）
 */
async function handleBrowseR2(request: Request, env: Env): Promise<Response> {
  try {
    // 1. 验证管理员权限
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("需要提供有效的访问令牌", 401, env, request);
    }

    const token = authHeader.substring(7);
    const authResult = await verifyGitHubTokenCached(token, env);
    if (!authResult.valid || !authResult.user) {
      return errorResponse("无效的访问令牌", 403, env, request);
    }

    const adminUsers = env.ADMIN_USERS
      ? env.ADMIN_USERS.split(",").map((u: string) => u.trim())
      : [];
    const isAdmin = adminUsers.includes(authResult.user.login);
    if (!isAdmin) {
      return errorResponse("需要管理员权限", 403, env, request);
    }

    // 2. 验证管理员令牌
    const adminTokenHeader = request.headers.get("X-Admin-Token");
    if (!adminTokenHeader || adminTokenHeader !== env.ADMIN_TOKEN) {
      return errorResponse("管理员令牌验证失败", 403, env, request);
    }

    // 3. 解析查询参数
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100
    );

    // 3. 列出R2对象
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

    const response = {
      success: true,
      data: {
        objects: objectInfos,
        truncated: objects.truncated,
        cursor: objects.truncated ? "next" : null, // 简化cursor处理
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
    console.error("Browse R2 error:", error);
    return errorResponse("浏览存储桶失败", 500, env, request);
  }
}

/**
 * 处理R2对象删除（管理员专用）
 */
async function handleDeleteR2(request: Request, env: Env): Promise<Response> {
  try {
    // 1. 验证管理员权限
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("需要提供有效的访问令牌", 401, env, request);
    }

    const token = authHeader.substring(7);
    const authResult = await verifyGitHubTokenCached(token, env);
    if (!authResult.valid || !authResult.user) {
      return errorResponse("无效的访问令牌", 403, env, request);
    }

    const adminUsers = env.ADMIN_USERS
      ? env.ADMIN_USERS.split(",").map((u: string) => u.trim())
      : [];
    const isAdmin = adminUsers.includes(authResult.user.login);
    if (!isAdmin) {
      return errorResponse("需要管理员权限", 403, env, request);
    }

    // 2. 验证管理员令牌
    const adminTokenHeader = request.headers.get("X-Admin-Token");
    if (!adminTokenHeader || adminTokenHeader !== env.ADMIN_TOKEN) {
      return errorResponse("管理员令牌验证失败", 403, env, request);
    }

    // 3. 解析要删除的对象键
    const url = new URL(request.url);
    const keys = url.searchParams.getAll("key");

    if (keys.length === 0) {
      return errorResponse("请指定要删除的对象键", 400, env, request);
    }

    // 3. 删除对象
    const deletePromises = keys.map((key) => env.IMAGES.delete(key));
    await Promise.all(deletePromises);

    // 4. 记录删除操作
    console.log(`Admin ${authResult.user.login} deleted objects:`, keys);

    const response = {
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
    console.error("Delete R2 error:", error);
    return errorResponse("删除对象失败", 500, env, request);
  }
}
async function handleGitHubTokenPoll(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as { device_code: string };
    const clientId = env.GITHUB_CLIENT_ID;

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "GitHub Client ID not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(env, request),
          },
        }
      );
    }

    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          device_code: body.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(env, request),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to poll token",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  }
}

/**
 * 处理图片上传
 */
async function handleUpload(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // 并发控制
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    return errorResponse("服务器繁忙，请稍后再试", 503, env, request);
  }

  activeUploads++;
  const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

  try {
    // 1. GitHub OAuth 验证（如果启用）
    let userInfo: { id: number; login: string } | null = null;
    if (env.AUTH_ENABLED === "true") {
      const authHeader = request.headers.get("Authorization");

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return errorResponse("需要登录认证", 401, env, request);
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      const authResult = await verifyGitHubTokenCached(token, env);
      if (!authResult.valid || !authResult.user) {
        return errorResponse("认证失败，请重新登录", 403, env, request);
      }

      userInfo = authResult.user;
    }

    // 2. Cloudflare Turnstile 验证（如果启用）
    if (env.TURNSTILE_ENABLED === "true") {
      const turnstileToken = request.headers.get("CF-Turnstile-Token");

      if (!turnstileToken) {
        return errorResponse("缺少验证 token", 400, env, request);
      }

      if (env.TURNSTILE_SECRET_KEY) {
        const turnstileValid = await verifyTurnstile(
          turnstileToken,
          clientIP,
          env.TURNSTILE_SECRET_KEY
        );

        if (!turnstileValid) {
          return errorResponse("验证失败，请重试", 403, env, request);
        }
      }
    }

    // 3. 验证文件大小
    const contentLength = parseInt(
      request.headers.get("Content-Length") || "0"
    );
    const maxSize = parseInt(env.MAX_UPLOAD_SIZE || "10485760"); // 默认 10MB

    if (contentLength === 0) {
      return errorResponse("未提供文件", 400, env, request);
    }

    if (contentLength > maxSize) {
      return errorResponse(
        `文件过大，最大允许 ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
        413,
        env,
        request
      );
    }

    // 2. 读取文件
    const file = await request.blob();
    const fileType = file.type;

    // 验证文件类型
    if (!fileType.startsWith("image/")) {
      return errorResponse("只允许上传图片文件", 400, env, request);
    }

    // 内容审核移到异步任务，以避免阻塞用户上传体验
    const moderationEnabled =
      env.CONTENT_MODERATION_ENABLED === "true" && !!env.AI;

    // 5. 检查每日配额（通过 Durable Object）
    const bytes = file.size;
    try {
      const quotaId = env.UPLOAD_QUOTA.idFromName("global");
      const quotaStub = env.UPLOAD_QUOTA.get(quotaId);
      const quotaResp = await quotaStub.fetch(
        "http://fake-host/check-increase",
        {
          method: "POST",
          body: JSON.stringify({ bytes }),
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!quotaResp.ok) {
        return errorResponse("配额服务不可用", 503, env, request);
      }

      const quotaJson = (await quotaResp.json()) as {
        allowed: boolean;
        remainingBytes?: number;
      };

      if (!quotaJson.allowed) {
        const remaining = quotaJson.remainingBytes || 0;
        return errorResponse(
          `今日上传配额已用完，剩余 ${(remaining / 1024 / 1024).toFixed(2)}MB`,
          429,
          env,
          request
        );
      }
    } catch (e) {
      console.error("Quota check error:", e);
      return errorResponse("配额检查失败", 500, env, request);
    }

    // 4. 生成文件名和R2对象键
    const timestamp = Date.now().toString(36);
    const randomName = generateRandomName(24);
    const extension = getFileExtension(fileType);
    const imageId = `${timestamp}-${randomName}`;
    const fileName = `${imageId}.${extension}`;

    // 如果有用户信息，使用用户专属文件夹
    const r2ObjectKey = userInfo ? `${userInfo.id}/${fileName}` : fileName;

    // 5. 上传到 R2
    await env.IMAGES.put(r2ObjectKey, file, {
      httpMetadata: {
        contentType: fileType,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        size: file.size.toString(),
        userId: userInfo?.id?.toString() || "",
      },
    });

    // 6. 生成 URL
    const publicBase = env.R2_PUBLIC_BASE || new URL(request.url).origin;
    const imageUrl = `${publicBase}/${r2ObjectKey}`;

    // 7. 如果有用户信息，写入D1数据库记录
    if (userInfo && env.DB) {
      try {
        await env.DB.prepare(
          `INSERT INTO user_images (image_id, user_id, r2_object_key, filename, upload_date, file_size, mime_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            imageId,
            userInfo.id.toString(),
            r2ObjectKey,
            fileName,
            new Date().toISOString(),
            file.size,
            fileType
          )
          .run();
      } catch (dbError) {
        console.error("Failed to save to database:", dbError);
        // 数据库写入失败不应该阻止上传成功，但要记录错误
      }
    }

    // 7. 记录到防滥用系统
    if (env.ABUSE_DETECTION_ENABLED === "true" && env.IP_BLACKLIST) {
      try {
        await recordUploadToBlacklist(clientIP, file.size, env);
      } catch (e) {
        console.error("Failed to record to blacklist:", e);
      }
    }

    // 8. 异步：发送 Telegram 通知 & 内容审核
    ctx.waitUntil(
      (async () => {
        // 8a. 发送 Telegram 通知（可选）
        if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
          try {
            await sendTelegramNotification(env, {
              ip: clientIP,
              fileName: r2ObjectKey, // 使用完整的R2对象键
              fileSize: file.size,
              fileType,
              url: imageUrl,
              user: userInfo?.login,
            });
          } catch (err) {
            console.error("Telegram notification failed:", err);
          }
        }

        // 8b. 内容审核（异步执行）
        if (moderationEnabled) {
          try {
            const moderationResult = await moderateImage(file, env);
            if (!moderationResult.safe) {
              console.log("Async moderation blocked:", moderationResult.reason);
              // 尝试删除 R2 对象
              try {
                await env.IMAGES.delete(r2ObjectKey);
                console.log("Deleted image due to moderation:", r2ObjectKey);
              } catch (delErr) {
                console.error(
                  "Failed to delete R2 object after moderation:",
                  delErr
                );
              }

              // 通知 Telegram 或其他系统
              if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
                try {
                  await sendTelegramMessage(
                    env,
                    `Image removed after moderation: ${r2ObjectKey} Reason: ${moderationResult.reason}`
                  );
                } catch (notifyErr) {
                  console.error(
                    "Failed to send post-moderation notification:",
                    notifyErr
                  );
                }
              }
            }
          } catch (modErr) {
            console.error("Async moderation error:", modErr);
          }
        }
      })()
    );

    // 9. 返回响应
    const response: UploadResponse = {
      success: true,
      url: imageUrl,
      fileName: r2ObjectKey, // 返回完整的R2对象键
      size: file.size,
      type: fileType,
      uploadedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(env, request),
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("上传失败", 500, env, request);
  } finally {
    activeUploads--;
  }
}

/**
 * 测试 Telegram 通知
 */
async function handleTestTelegram(
  request: Request,
  env: Env
): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Telegram not configured",
        token: !!env.TELEGRAM_BOT_TOKEN,
        chatId: !!env.TELEGRAM_CHAT_ID,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  }

  try {
    await sendTelegramNotification(env, {
      ip: "test",
      fileName: "test.jpg",
      fileSize: 1024,
      fileType: "image/jpeg",
      url: "https://example.com/test.jpg",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test notification sent",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  } catch (error) {
    // Optionally log the real error details for server-side debugging
    console.error("handleTestTelegramNotification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  }
}

/**
 * 查询配额状态
 */
async function handleQuotaStatus(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const quotaId = env.UPLOAD_QUOTA.idFromName("global");
    const quotaStub = env.UPLOAD_QUOTA.get(quotaId);
    const quotaResp = await quotaStub.fetch("http://fake-host/status");

    if (!quotaResp.ok) {
      return errorResponse("无法获取配额状态", 500, env, request);
    }

    const quotaData = await quotaResp.json();

    return new Response(JSON.stringify(quotaData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(env, request),
      },
    });
  } catch (e) {
    return errorResponse("获取配额状态失败", 500, env, request);
  }
}

/**
 * 测试 Telegram 通知
 */
async function handleTelegramTest(
  request: Request,
  env: Env
): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Telegram 未配置",
        configured: {
          botToken: !!env.TELEGRAM_BOT_TOKEN,
          chatId: !!env.TELEGRAM_CHAT_ID,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  }

  try {
    await sendTelegramNotification(env, {
      ip: "测试",
      fileName: "test-image.png",
      fileSize: 1024 * 1024,
      fileType: "image/png",
      url: "https://example.com/test.png",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "测试通知已发送，请检查 Telegram",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "发送失败",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env, request),
        },
      }
    );
  }
}

/**
 * 缓存的GitHub Token验证（带KV缓存）
 */
async function verifyGitHubTokenCached(
  token: string,
  env: Env
): Promise<{ valid: boolean; user?: { id: number; login: string } }> {
  // 生成缓存键
  const cacheKey = `github_token:${token.substring(0, 16)}`; // 使用token前16位作为缓存键

  try {
    // 尝试从缓存获取
    const cached = await env.USER_CACHE.get(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached);
      // 检查缓存是否过期（1小时）
      if (Date.now() - cachedData.timestamp < 3600000) {
        return cachedData.result;
      }
    }
  } catch (cacheError) {
    console.warn("Cache read error:", cacheError);
    // 缓存读取失败，继续验证
  }

  // 调用原始验证函数
  const result = await verifyGitHubToken(token);

  // 缓存结果（只缓存成功的结果）
  if (result.valid && result.user) {
    try {
      await env.USER_CACHE.put(
        cacheKey,
        JSON.stringify({
          result,
          timestamp: Date.now(),
        }),
        {
          expirationTtl: 3600, // 1小时过期
        }
      );
    } catch (cacheError) {
      console.warn("Cache write error:", cacheError);
      // 缓存写入失败不影响正常功能
    }
  }

  return result;
}

/**
 * 验证 GitHub Access Token 并获取用户信息
 */
async function verifyGitHubToken(
  token: string
): Promise<{ valid: boolean; user?: { id: number; login: string } }> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Cloudflare-Image-Upload-Worker",
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const userData: { id: number; login: string } = await response.json();
    return {
      valid: true,
      user: {
        id: userData.id,
        login: userData.login,
      },
    };
  } catch (error) {
    console.error("GitHub token verification error:", error);
    return { valid: false };
  }
}

/**
 * 验证 Cloudflare Turnstile Token
 */
async function verifyTurnstile(
  token: string,
  ip: string,
  secretKey: string
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip: ip,
        }),
      }
    );

    if (!response.ok) {
      console.error("Turnstile verification failed:", response.status);
      return false;
    }

    const result = (await response.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!result.success) {
      console.error("Turnstile validation failed:", result["error-codes"]);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}

/**
 * 检查 IP 黑名单
 */
async function checkIPBlacklist(
  ip: string,
  env: Env
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const blacklistId = env.IP_BLACKLIST.idFromName("global");
    const blacklistStub = env.IP_BLACKLIST.get(blacklistId);
    const resp = await blacklistStub.fetch("http://fake-host/check", {
      method: "POST",
      body: JSON.stringify({ ip }),
      headers: { "Content-Type": "application/json" },
    });

    if (!resp.ok) {
      return { allowed: true }; // 失败时允许通过
    }

    const result = (await resp.json()) as { allowed: boolean; reason?: string };
    return result;
  } catch (e) {
    console.error("IP blacklist check error:", e);
    return { allowed: true }; // 出错时允许通过
  }
}

/**
 * 记录上传到黑名单系统
 */
async function recordUploadToBlacklist(
  ip: string,
  bytes: number,
  env: Env
): Promise<void> {
  try {
    const blacklistId = env.IP_BLACKLIST.idFromName("global");
    const blacklistStub = env.IP_BLACKLIST.get(blacklistId);
    const resp = await blacklistStub.fetch("http://fake-host/record", {
      method: "POST",
      body: JSON.stringify({ ip, bytes }),
      headers: { "Content-Type": "application/json" },
    });

    if (!resp.ok) {
      console.error("Failed to record upload");
    }

    const result = (await resp.json()) as {
      allowed: boolean;
      banned?: boolean;
      reason?: string;
    };

    // 如果被封禁，发送 Telegram 通知
    if (result.banned && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      await sendBanNotification(env, ip, result.reason || "滥用检测");
    }
  } catch (e) {
    console.error("Record upload error:", e);
  }
}

/**
 * 发送 Telegram 上传通知
 */
async function sendTelegramNotification(
  env: Env,
  data: {
    ip: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
    user?: string;
  }
): Promise<void> {
  const message = `
🖼️ <b>图片上传通知</b>

� 用户: ${data.user ? `<code>${data.user}</code>` : "未登录"}
�📝 文件名: <code>${data.fileName}</code>
📦 大小: ${(data.fileSize / 1024 / 1024).toFixed(2)} MB
🎨 类型: ${data.fileType}
🌐 IP: <code>${data.ip}</code>
⏰ 时间: ${new Date().toLocaleString("zh-CN")}

🔗 链接: ${data.url}
  `.trim();

  await sendTelegramMessage(env, message);
}

/**
 * 发送 IP 封禁通知
 */
async function sendBanNotification(
  env: Env,
  ip: string,
  reason: string
): Promise<void> {
  const message = `
🚫 <b>IP 自动封禁通知</b>

🌐 IP: <code>${ip}</code>
⚠️ 原因: ${reason}
⏰ 时间: ${new Date().toLocaleString("zh-CN")}

该 IP 因触发防滥用机制已被自动封禁。
  `.trim();

  await sendTelegramMessage(env, message);
}

/**
 * 发送 Telegram 消息
 */
async function sendTelegramMessage(env: Env, message: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.log("Telegram not configured: TOKEN or CHAT_ID missing");
    return;
  }

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    console.log("Sending Telegram notification...");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Telegram API error:", errorText);
    } else {
      console.log("Telegram notification sent successfully");
    }
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}

/**
 * 速率限制检查
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const key = `rate:${identifier}`;

  let record = rateLimitCache.get(key);

  if (!record || now > record.resetTime) {
    rateLimitCache.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, CF-Turnstile-Token",
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
      // 简单通配符匹配：只支持 * 在开头或结尾
      const pattern = allowed.replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(requestOrigin);
    }
    return false;
  });

  return {
    "Access-Control-Allow-Origin": isAllowed
      ? requestOrigin
      : allowedList[0] || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, CF-Turnstile-Token, Authorization, X-Admin-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * 使用 Cloudflare AI 进行图片内容审核
 */
async function moderateImage(
  imageBlob: Blob,
  env: Env
): Promise<{ safe: boolean; reason?: string }> {
  try {
    // 将图片转换为 ArrayBuffer
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageArray = Array.from(new Uint8Array(imageBuffer));

    // 使用 Cloudflare AI 的图片分类模型
    const response = (await env.AI.run("@cf/microsoft/resnet-50", {
      image: imageArray,
    })) as Array<{ label: string; score: number }>;

    // 定义不允许的内容类别（基于 ImageNet 标签）
    const blockedLabels = [
      "bikini",
      "brassiere",
      "swimming trunks",
      "weapon",
      "rifle",
      "revolver",
      "assault rifle",
      "machine gun",
      "military uniform",
    ];

    // 检查是否有高置信度的违规内容
    for (const result of response) {
      if (result.score > 0.6) {
        // 60% 以上的置信度
        const label = result.label.toLowerCase();
        for (const blocked of blockedLabels) {
          if (label.includes(blocked)) {
            return {
              safe: false,
              reason: `检测到不适当内容: ${result.label}`,
            };
          }
        }
      }
    }

    return { safe: true };
  } catch (error) {
    console.error("Image moderation error:", error);
    // 如果审核失败，默认允许（避免误杀）
    return { safe: true };
  }
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
  const response: UploadResponse = {
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

/**
 * 生成随机文件名
 */
function generateRandomName(length: number = 24): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

/**
 * 获取文件扩展名
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/heic": "heic",
  };

  return mimeToExt[mimeType.toLowerCase()] || "jpg";
}

// 导出 Durable Object
export { UploadQuota, IPBlacklist };
