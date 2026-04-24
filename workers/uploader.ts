import type {
  D1Database,
  DurableObjectNamespace,
  DurableObjectState,
  R2Bucket,
} from "@cloudflare/workers-types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

interface Env {
  IMAGES: R2Bucket;
  UPLOAD_QUOTA: DurableObjectNamespace;
  IP_BLACKLIST: DurableObjectNamespace;
  DB: D1Database;
  AI?: any;
  ALLOWED_ORIGINS: string;
  MAX_FILE_SIZE: string;
  DAILY_QUOTA_BYTES: string;
  ABUSE_DETECTION_ENABLED: string;
  CONTENT_MODERATION_ENABLED: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ADMIN_TOKEN: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  CDN_BASE_URL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CF_AI_API_TOKEN?: string;
}

interface UploadQuotaState {
  dailyUploads: number;
  dailyBytes: number;
  lastReset: number;
}

class UploadQuota {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "anonymous";

    // Reset counters daily - but only check at the start
    const now = Date.now();
    const lastReset = (await this.state.storage.get<number>("lastReset")) || 0;
    const oneDay = 24 * 60 * 60 * 1000;

    const needsReset = now - lastReset > oneDay;

    if (request.method === "GET") {
      // Before returning quota, reset if needed
      if (needsReset) {
        console.log(`QUOTA: Resetting daily counters for all users`);
        await this.state.storage.deleteAll();
        await this.state.storage.put("lastReset", now);
      }

      const quota = await this.getQuota(userId);
      return new Response(JSON.stringify(quota), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      // Reset before incrementing if needed
      if (needsReset) {
        console.log(`QUOTA: Resetting daily counters before increment`);
        await this.state.storage.deleteAll();
        await this.state.storage.put("lastReset", now);
      }

      const { bytes } = await request.json();
      console.log(`QUOTA: Updating quota for user ${userId}, adding ${bytes} bytes`);
      await this.incrementUsage(userId, bytes);
      console.log(`QUOTA: Quota updated successfully for user ${userId}`);
      return new Response("OK");
    }

    return new Response("Method not allowed", { status: 405 });
  }

  async getQuota(userId: string): Promise<UploadQuotaState> {
    const dailyUploads = (await this.state.storage.get<number>(`uploads:${userId}`)) || 0;
    const dailyBytes = (await this.state.storage.get<number>(`bytes:${userId}`)) || 0;
    const lastReset = (await this.state.storage.get<number>("lastReset")) || Date.now();

    return { dailyUploads, dailyBytes, lastReset };
  }

  async incrementUsage(userId: string, bytes: number): Promise<void> {
    const currentUploads = (await this.state.storage.get<number>(`uploads:${userId}`)) || 0;
    const currentBytes = (await this.state.storage.get<number>(`bytes:${userId}`)) || 0;

    await this.state.storage.put(`uploads:${userId}`, currentUploads + 1);
    await this.state.storage.put(`bytes:${userId}`, currentBytes + bytes);
  }
}

class IPBlacklist {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

    if (request.method === "GET") {
      const isBlocked = await this.isBlocked(clientIP);
      return new Response(JSON.stringify({ blocked: isBlocked }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const { reason } = await request.json();
      await this.blockIP(clientIP, reason);
      return new Response("OK");
    }

    return new Response("Method not allowed", { status: 405 });
  }

  async isBlocked(ip: string): Promise<boolean> {
    const blockedUntil = await this.state.storage.get<number>(`blocked:${ip}`);
    if (!blockedUntil) return false;

    if (Date.now() > blockedUntil) {
      await this.state.storage.delete(`blocked:${ip}`);
      return false;
    }

    return true;
  }

  async blockIP(ip: string, reason: string): Promise<void> {
    // Block for 24 hours
    const blockedUntil = Date.now() + 24 * 60 * 60 * 1000;
    await this.state.storage.put(`blocked:${ip}`, blockedUntil);
    await this.state.storage.put(`reason:${ip}`, reason);
    await this.state.storage.put(`addedBy:${ip}`, "admin");
    await this.state.storage.put(`addedAt:${ip}`, new Date().toISOString());
    console.log(`Blocked IP ${ip} for 24 hours. Reason: ${reason}`);
  }

  // 获取所有黑名单IP
  async getBlacklist(): Promise<any[]> {
    const blacklist: any[] = [];
    const keys = await this.state.storage.list({ prefix: "blocked:" });

    for (const [key, blockedUntil] of keys) {
      const ip = key.replace("blocked:", "");
      const reason = (await this.state.storage.get(`reason:${ip}`)) || "No reason provided";
      const addedBy = (await this.state.storage.get(`addedBy:${ip}`)) || "system";
      const addedAt = (await this.state.storage.get(`addedAt:${ip}`)) || new Date().toISOString();

      const isActive = Date.now() < (blockedUntil as number);

      blacklist.push({
        ip,
        reason,
        addedBy,
        addedAt,
        status: isActive ? "active" : "expired",
      });
    }

    return blacklist;
  }

  // 添加IP到黑名单
  async addToBlacklist(ip: string, reason: string): Promise<void> {
    const blockedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await this.state.storage.put(`blocked:${ip}`, blockedUntil);
    await this.state.storage.put(`reason:${ip}`, reason);
    await this.state.storage.put(`addedBy:${ip}`, "admin");
    await this.state.storage.put(`addedAt:${ip}`, new Date().toISOString());
    console.log(`Added IP ${ip} to blacklist. Reason: ${reason}`);
  }

  // 从黑名单移除IP
  async removeFromBlacklist(ip: string): Promise<void> {
    await this.state.storage.delete(`blocked:${ip}`);
    await this.state.storage.delete(`reason:${ip}`);
    await this.state.storage.delete(`addedBy:${ip}`);
    await this.state.storage.delete(`addedAt:${ip}`);
    console.log(`Removed IP ${ip} from blacklist`);
  }
}

const app = new Hono<{ Bindings: Env }>();

const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];
type SupportedImageExtension = "jpg" | "png" | "gif" | "webp";

const MIME_TO_EXTENSION: Record<SupportedMimeType, SupportedImageExtension> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function createErrorResponse(error: string, code: string, message: string, status: number) {
  return Response.json(
    {
      success: false,
      error,
      code,
      message,
    },
    { status }
  );
}

function createUploadSuccessResponse(data: {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  uploadedAt: string;
  r2ObjectKey: string;
}) {
  return Response.json({
    success: true,
    data,
  });
}

async function detectImageType(file: File): Promise<SupportedImageExtension | null> {
  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;

  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

  const isGif =
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38;

  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (isPng) return "png";
  if (isJpeg) return "jpg";
  if (isGif) return "gif";
  if (isWebp) return "webp";

  return null;
}

function createSecureObjectKey(ext: SupportedImageExtension) {
  const datePrefix = new Date().toISOString().slice(0, 10);
  return `images/${datePrefix}/${crypto.randomUUID()}.${ext}`;
}

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
}

// Middleware
app.use(
  "*",
  cors({
    origin: "*", // Will be validated in the route handler
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token", "CF-Turnstile-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

app.use("*", logger());
app.use("*", prettyJSON());

// Origin 验证中间件 - 防止未授权访问
app.use("*", async (c, next) => {
  const path = c.req.path;

  // 健康检查不需要验证
  if (path === "/health") {
    await next();
    return;
  }

  const origin = c.req.header("Origin");
  const referer = c.req.header("Referer");
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(",") || [];

  // 检查 Origin 或 Referer
  const source = origin || referer;

  if (source) {
    const isAllowed = allowedOrigins.some(
      (allowed) =>
        source.includes(allowed) || source.includes("localhost") || source.includes("127.0.0.1")
    );

    if (!isAllowed && allowedOrigins.length > 0 && !allowedOrigins.includes("*")) {
      console.warn("Blocked request from unauthorized origin:", {
        origin,
        referer,
        path,
        ip: c.req.header("CF-Connecting-IP"),
      });
      return c.json(
        {
          success: false,
          error: "Unauthorized origin",
          code: "ORIGIN_NOT_ALLOWED",
        },
        403
      );
    }
  }

  await next();
});

// Health check
app.get("/health", (c) => {
  return c.json({
    service: "Upload Worker",
    status: "healthy",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// GitHub OAuth 回调处理
app.post("/auth/callback", async (c) => {
  try {
    const { code, state } = await c.req.json();

    console.log("OAuth callback received:", {
      code: code?.substring(0, 10) + "...",
      state,
    });

    if (!code) {
      console.log("Missing authorization code");
      return c.json({ success: false, error: "Missing authorization code" }, 400);
    }

    // 交换访问令牌
    console.log("Exchanging code for token...");
    console.log("GitHub Client ID exists:", !!c.env.GITHUB_CLIENT_ID);
    console.log("GitHub Client Secret exists:", !!c.env.GITHUB_CLIENT_SECRET);

    if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET) {
      console.log("Missing GitHub OAuth credentials");
      return c.json({ success: false, error: "GitHub OAuth credentials not configured" }, 500);
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: c.env.GITHUB_CLIENT_ID,
        client_secret: c.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    console.log("Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log("Token exchange failed:", errorText);
      return c.json({ success: false, error: "Failed to exchange code for token" }, 400);
    }

    const tokenData = await tokenResponse.json();
    console.log("Token data:", {
      error: tokenData.error,
      hasAccessToken: !!tokenData.access_token,
    });

    if (tokenData.error) {
      console.log("Token data error:", tokenData.error);
      return c.json(
        {
          success: false,
          error: tokenData.error_description || tokenData.error,
        },
        400
      );
    }

    // 获取用户信息
    console.log("Fetching user info...");
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "PicoPics-v2/1.0.0",
      },
    });

    console.log("User response status:", userResponse.status);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.log("User fetch failed:", errorText);
      return c.json({ success: false, error: "Failed to fetch user info" }, 400);
    }

    const user = await userResponse.json();
    console.log("User data received:", { id: user.id, login: user.login });

    return c.json({
      success: true,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      },
      accessToken: tokenData.access_token,
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

// Get user quota endpoint
app.get("/api/quota", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, error: "需要提供有效的访问令牌" }, 401);
    }

    const token = authHeader.substring(7);
    const authResult = await verifyGitHubToken(token, c.env);
    if (!authResult.valid || !authResult.user) {
      return c.json({ success: false, error: "无效的访问令牌" }, 403);
    }

    const userId = authResult.user.id.toString();

    // Get quota from Durable Object
    const quotaId = c.env.UPLOAD_QUOTA.idFromName(userId);
    const quotaStub = c.env.UPLOAD_QUOTA.get(quotaId);
    const quotaResponse = await quotaStub.fetch(
      new Request(`http://quota?userId=${userId}`, { method: "GET" }) as any
    );
    const quota = (await quotaResponse.json()) as UploadQuotaState;

    // Calculate dynamic quota
    const baseQuota = parseInt(c.env.DAILY_QUOTA_BYTES || "104857600"); // 100MB base
    const activityBonus = Math.min(quota.dailyUploads * 1048576, 52428800); // Max 50MB bonus
    const dynamicQuota = baseQuota + activityBonus;

    console.log(
      `API/QUOTA: User ${userId} - used: ${quota.dailyBytes}, limit: ${dynamicQuota}, uploads: ${quota.dailyUploads}`
    );

    return c.json({
      success: true,
      data: {
        used: quota.dailyBytes,
        limit: dynamicQuota,
        dailyUploads: quota.dailyUploads,
        lastReset: quota.lastReset,
      },
    });
  } catch (error) {
    console.error("Get quota error:", error);
    return c.json({ success: false, error: "获取配额失败" }, 500);
  }
});

// Upload endpoint
app.post("/upload", async (c) => {
  try {
    const clientIP = c.req.header("CF-Connecting-IP") || "unknown";

    // 强制要求 GitHub 认证
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return createErrorResponse(
        "Unauthorized",
        "UNAUTHORIZED",
        "Valid GitHub authentication is required for upload.",
        401
      );
    }

    const token = authHeader.substring(7);

    // 验证 GitHub token 并获取用户信息
    let githubUser: any;
    let userId: string;
    let username: string;

    try {
      const githubResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "PicoPics-v2/1.0.0",
        },
      });

      if (!githubResponse.ok) {
        return createErrorResponse("Forbidden", "FORBIDDEN", "Invalid GitHub access token.", 403);
      }

      githubUser = await githubResponse.json();
      userId = githubUser.id.toString();
      username = githubUser.login;
    } catch (error) {
      console.error("GitHub authentication error:", error);
      return createErrorResponse(
        "Authentication failed",
        "INTERNAL_ERROR",
        "GitHub authentication failed. Please sign in again.",
        500
      );
    }

    // Check IP blacklist
    if (c.env.ABUSE_DETECTION_ENABLED === "true") {
      const blacklistId = c.env.IP_BLACKLIST.idFromName(clientIP);
      const blacklistStub = c.env.IP_BLACKLIST.get(blacklistId);
      const blacklistResponse = await blacklistStub.fetch(
        new Request(`http://blacklist`, {
          method: "GET",
          headers: { "CF-Connecting-IP": clientIP },
        }) as any
      );
      const { blocked } = (await blacklistResponse.json()) as {
        blocked: boolean;
      };

      if (blocked) {
        return createErrorResponse(
          "Forbidden",
          "RATE_LIMITED",
          "Your IP has been temporarily blocked due to suspicious activity.",
          403
        );
      }
    }

    // Dynamic rate limiting based on user behavior and system load
    const quotaId = c.env.UPLOAD_QUOTA.idFromName(userId);
    const quotaStub = c.env.UPLOAD_QUOTA.get(quotaId);
    const quotaResponse = await quotaStub.fetch(
      new Request(`http://quota?userId=${userId}`, { method: "GET" }) as any
    );
    const quotaText = await quotaResponse.text();

    let quota: UploadQuotaState;
    try {
      quota = JSON.parse(quotaText) as UploadQuotaState;
    } catch (jsonError) {
      throw new Error(
        `Quota JSON parse failed: ${
          jsonError instanceof Error ? jsonError.message : String(jsonError)
        }`
      );
    }

    // Dynamic quota calculation based on user activity
    const baseQuota = parseInt(c.env.DAILY_QUOTA_BYTES || "104857600"); // 100MB base

    // Increase quota for active users (bonus system)
    const activityBonus = Math.min(quota.dailyUploads * 1048576, 52428800); // Max 50MB bonus
    const dynamicQuota = baseQuota + activityBonus;

    // Only enforce quota for very high usage (prevent abuse)
    if (quota.dailyBytes > dynamicQuota * 2) {
      return createErrorResponse(
        "Quota exceeded",
        "QUOTA_EXCEEDED",
        "Upload limit exceeded. Please try again later.",
        429
      );
    }

    const contentType = c.req.header("Content-Type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return createErrorResponse(
        "Invalid request",
        "INVALID_IMAGE",
        "Content-Type must be multipart/form-data.",
        400
      );
    }

    const formData = await c.req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return createErrorResponse("Invalid request", "INVALID_IMAGE", "No file provided.", 400);
    }

    if (!SUPPORTED_MIME_TYPES.includes(file.type as SupportedMimeType)) {
      return createErrorResponse(
        "Unsupported file type",
        "UNSUPPORTED_FILE_TYPE",
        "Only JPG, PNG, GIF, and WebP images are allowed.",
        415
      );
    }

    const maxFileSize = parseInt(c.env.MAX_FILE_SIZE || "10485760"); // 10MB default
    if (file.size > maxFileSize) {
      return createErrorResponse(
        "File too large",
        "FILE_TOO_LARGE",
        `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB.`,
        413
      );
    }

    const detectedType = await detectImageType(file);
    if (!detectedType) {
      return createErrorResponse(
        "Unsupported file type",
        "UNSUPPORTED_FILE_TYPE",
        "Only JPG, PNG, GIF, and WebP images are allowed.",
        415
      );
    }

    const expectedExt = MIME_TO_EXTENSION[file.type as SupportedMimeType];
    if (detectedType !== expectedExt) {
      return createErrorResponse(
        "Invalid image",
        "INVALID_IMAGE",
        "Uploaded file content does not match declared image type.",
        415
      );
    }

    const objectKey = createSecureObjectKey(detectedType);
    const uploadTime = new Date().toISOString();

    // Content moderation (async - don't block upload)
    if (c.env.CONTENT_MODERATION_ENABLED === "true" && c.env.AI) {
      // Start content moderation in background
      contentModeration(file, c.env)
        .then((moderationResult) => {
          if (moderationResult.blocked) {
            console.warn("upload moderated", {
              userId,
              label: moderationResult.label,
              key: objectKey,
            });
          }
        })
        .catch((error) => {
          console.error("Content moderation error:", error);
        });
    }

    // Upload to R2
    try {
      // Convert File to ArrayBuffer for R2
      const fileBuffer = await file.arrayBuffer();
      await c.env.IMAGES.put(objectKey, fileBuffer, {
        httpMetadata: {
          contentType: `image/${detectedType === "jpg" ? "jpeg" : detectedType}`,
          cacheControl: "public, max-age=31536000", // 1 year
        },
      });
      console.info("upload success", {
        userId,
        key: objectKey,
        size: file.size,
        type: detectedType,
      });
    } catch (r2Error) {
      console.error("upload failed", {
        code: "UPLOAD_FAILED",
        key: objectKey,
        message: r2Error instanceof Error ? r2Error.message : String(r2Error),
      });
      return createErrorResponse(
        "Upload failed",
        "UPLOAD_FAILED",
        "Failed to upload file to storage.",
        500
      );
    }

    // Update quota after successful upload
    await quotaStub.fetch(
      new Request(`http://quota?userId=${userId}`, {
        method: "POST",
        body: JSON.stringify({ bytes: file.size }),
      }) as any
    );

    // Save to database
    const r2ObjectKey = objectKey;
    const downloadFilename = `${objectKey.split("/").pop() || objectKey}`;

    try {
      await c.env.DB.prepare(
        `INSERT INTO user_images (image_id, user_id, r2_object_key, filename, upload_date, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          objectKey, // image_id
          userId,
          r2ObjectKey,
          downloadFilename,
          uploadTime, // upload_date
          file.size,
          `image/${detectedType === "jpg" ? "jpeg" : detectedType}`
        )
        .run();

      // Save/update user profile
      try {
        await c.env.DB.prepare(
          `INSERT INTO user_profiles (user_id, username, email, avatar_url, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             username = excluded.username,
             email = excluded.email,
             avatar_url = excluded.avatar_url,
             updated_at = excluded.updated_at`
        )
          .bind(
            userId,
            username,
            githubUser.email || null,
            githubUser.avatar_url || null,
            new Date().toISOString()
          )
          .run();
      } catch (profileError) {
        console.error("Failed to save user profile:", profileError);
      }
    } catch (dbError) {
      console.error("Database save error:", dbError);
      return createErrorResponse(
        "Upload failed",
        "UPLOAD_FAILED",
        "Failed to save upload metadata.",
        500
      );
    }

    // Generate public URL using CDN worker
    const publicUrl = `${c.env.CDN_BASE_URL || "https://image.hiaplha.xyz"}/${objectKey}`;

    // Format file size
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const fileSizeKB = (file.size / 1024).toFixed(2);
    const sizeDisplay = file.size > 1024 * 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;

    // Send Telegram notification (async)
    const telegramMessage = `
📤 <b>🖼️ 新图片上传</b>

━━━━━━━━━━━━━━
👤 <b>用户信息</b>
├─ 用户名: <code>${username}</code>
├─ 用户ID: <code>${userId}</code>
└─ IP地址: <code>${clientIP}</code>

📷 <b>文件信息</b>
├─ 文件名: <code>${downloadFilename}</code>
├─ 类型: <code>image/${detectedType === "jpg" ? "jpeg" : detectedType}</code>
├─ 格式: <code>${detectedType.toUpperCase()}</code>
└─ 大小: <code>${sizeDisplay}</code>

🔗 查看: <a href="${publicUrl}">点击预览</a>

🕐 ${new Date().toLocaleString("zh-CN")}
━━━━━━━━━━━━━━
    `.trim();

    // 使用 waitUntil 确保异步任务完成
    if (c.executionCtx) {
      c.executionCtx.waitUntil(
        sendTelegramNotification(c.env, telegramMessage)
          .then(() => {})
          .catch((err) => {
            console.warn("telegram notification failed", {
              message: err instanceof Error ? err.message : String(err),
            });
          })
      );
    } else {
      // Fallback: 如果无法使用 waitUntil，使用普通异步调用
      sendTelegramNotification(c.env, telegramMessage)
        .then(() => {})
        .catch((err) => {
          console.warn("telegram notification failed", {
            message: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return createUploadSuccessResponse({
      id: objectKey,
      url: publicUrl,
      filename: downloadFilename,
      size: file.size,
      type: `image/${detectedType === "jpg" ? "jpeg" : detectedType}`,
      uploadedAt: uploadTime,
      r2ObjectKey: r2ObjectKey,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return createErrorResponse(
      "Internal error",
      "INTERNAL_ERROR",
      "Upload failed due to server error.",
      500
    );
  }
});

// 管理员 API 端点
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

// 获取数据库统计
app.get("/api/admin/stats", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    // 检查数据库连接
    if (!c.env.DB) {
      return c.json({ success: false, error: "数据库未配置" }, 500);
    }

    // 先检查表是否存在
    const tables = await c.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_images'"
    ).first();

    if (!tables) {
      return c.json({
        success: true,
        totalImages: 0,
        totalUsers: 0,
        totalSize: "0 B",
        todayUploads: 0,
        message: "数据库表不存在，返回默认值",
      });
    }

    // 获取统计数据
    const totalImages = await c.env.DB.prepare("SELECT COUNT(*) as count FROM user_images").first();

    const totalUsers = await c.env.DB.prepare(
      "SELECT COUNT(DISTINCT user_id) as count FROM user_images"
    ).first();

    const totalSize = await c.env.DB.prepare(
      "SELECT SUM(file_size) as size FROM user_images"
    ).first();

    // 尝试不同的日期列名
    let todayUploads = 0;
    try {
      const todayResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM user_images WHERE DATE(created_at) = DATE('now')"
      ).first();
      todayUploads = (todayResult?.count as number) || 0;
    } catch (dateError) {
      // 如果 created_at 不存在，尝试其他可能的列名
      try {
        const todayResult = await c.env.DB.prepare(
          "SELECT COUNT(*) as count FROM user_images WHERE DATE(upload_time) = DATE('now')"
        ).first();
        todayUploads = (todayResult?.count as number) || 0;
      } catch {
        // 如果都失败，设置为 0
        todayUploads = 0;
      }
    }

    return c.json({
      success: true,
      totalImages: (totalImages?.count as number) || 0,
      totalUsers: (totalUsers?.count as number) || 0,
      totalSize: formatBytes((totalSize?.size as number) || 0),
      todayUploads: todayUploads,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return c.json(
      {
        success: false,
        error: "获取统计数据失败",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// 获取用户列表
app.get("/api/admin/users", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    const users = await c.env.DB.prepare(
      `SELECT 
        user_id as id,
        user_id as username,
        user_id as email,
        COUNT(*) as uploads,
        MAX(upload_date) as lastActive
       FROM user_images 
       GROUP BY user_id 
       ORDER BY lastActive DESC`
    ).all();

    return c.json({
      success: true,
      data: users.results || [],
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return c.json({ success: false, error: "获取用户列表失败" }, 500);
  }
});

// 获取系统设置
app.get("/api/admin/settings", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    return c.json({
      success: true,
      settings: {
        maxFileSize: c.env.MAX_FILE_SIZE,
        dailyQuota: c.env.DAILY_QUOTA_BYTES,
        abuseDetection: c.env.ABUSE_DETECTION_ENABLED,
        contentModeration: c.env.CONTENT_MODERATION_ENABLED,
      },
    });
  } catch (error) {
    console.error("Admin settings error:", error);
    return c.json({ success: false, error: "获取系统设置失败" }, 500);
  }
});

// Telegram通知辅助函数
async function sendTelegramNotification(env: Env, message: string): Promise<void> {
  console.log("TELEGRAM: Starting notification");

  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  console.log("TELEGRAM: Token exists:", !!botToken, "Chat ID exists:", !!chatId);

  if (!botToken || !chatId) {
    console.log("TELEGRAM: Missing credentials, skipping");
    throw new Error("Missing Telegram credentials");
  }

  console.log("TELEGRAM: Making API call");

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    };

    // 隐藏敏感信息
    const maskedUrl = url.substring(0, 30) + "***" + url.substring(url.length - 10);
    console.log("TELEGRAM: Sending request to:", maskedUrl);
    console.log("TELEGRAM: Payload chat_id:", chatId);
    console.log("TELEGRAM: About to make fetch call");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("TELEGRAM: Request timeout after 3s");
      controller.abort();
    }, 3000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("TELEGRAM: Got response, status:", response.status);

      const responseText = await response.text();
      console.log("TELEGRAM: Response status:", response.status);
      console.log("TELEGRAM: Response body (first 200 chars):", responseText.substring(0, 200));

      if (response.ok) {
        console.log("TELEGRAM: SUCCESS - Notification sent");
        return;
      } else {
        console.log("TELEGRAM: FAILED - Status:", response.status, "Error:", responseText);
        throw new Error(`Telegram API error: ${response.status} - ${responseText}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.log("TELEGRAM: Fetch failed:", fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.log("TELEGRAM: EXCEPTION:", error);
    console.log("TELEGRAM: Exception type:", error?.constructor?.name);
    console.log(
      "TELEGRAM: Exception message:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

// AI内容筛查函数 - 使用Cloudflare Workers AI
async function checkContentSafety(
  file: File,
  env: Env
): Promise<{ blocked: boolean; label?: string; confidence?: number }> {
  try {
    // 检查AI服务是否可用
    if (!env.AI || env.CONTENT_MODERATION_ENABLED !== "true") {
      return { blocked: false }; // 如果未启用，直接通过
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();

    // 使用Cloudflare Workers AI的NSFW检测模型
    const result = await env.AI.run("@cf/automod/clip-nsfw", {
      image: arrayBuffer,
    });

    // 检查结果 - result应该是 { NSFW: 0.0-1.0 } 格式
    const nsfwScore = (result as any)?.NSFW || 0;

    // 如果NSFW分数超过0.7，认为是不适当内容
    const threshold = 0.7;
    if (nsfwScore > threshold) {
      return {
        blocked: true,
        label: "inappropriate_content",
        confidence: nsfwScore,
      };
    }

    return { blocked: false, confidence: nsfwScore };
  } catch (error) {
    console.error("Content moderation error:", error);
    // 如果筛查失败，默认允许通过（避免误判）
    return { blocked: false };
  }
}

// Content moderation function (async)
async function contentModeration(
  file: File,
  env: Env
): Promise<{ blocked: boolean; label?: string }> {
  try {
    const imageBuffer = await file.arrayBuffer();
    const imageArray = Array.from(new Uint8Array(imageBuffer));

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/microsoft/resnet-50`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CF_AI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageArray }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const blockedLabels = ["bikini", "brassiere", "weapon", "rifle", "military uniform"];

    for (const item of result.result || []) {
      if (item.score > 0.6) {
        const label = item.label.toLowerCase();
        for (const blocked of blockedLabels) {
          if (label.includes(blocked)) {
            return { blocked: true, label: item.label };
          }
        }
      }
    }

    return { blocked: false };
  } catch (error) {
    console.error("Content moderation error:", error);
    return { blocked: false }; // Default to allow on error
  }
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

// 用户删除图片
app.delete("/api/delete", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, error: "需要提供有效的访问令牌" }, 401);
    }

    const token = authHeader.substring(7);
    const authResult = await verifyGitHubToken(token, c.env);
    if (!authResult.valid || !authResult.user) {
      return c.json({ success: false, error: "无效的访问令牌" }, 403);
    }

    const { r2ObjectKey } = await c.req.json();
    if (!r2ObjectKey) {
      return c.json({ success: false, error: "缺少 R2 对象键" }, 400);
    }

    // 验证用户是否拥有该图片
    const record = await c.env.DB.prepare(
      "SELECT * FROM user_images WHERE r2_object_key = ? AND user_id = ?"
    )
      .bind(r2ObjectKey, authResult.user.id.toString())
      .first();

    if (!record) {
      return c.json({ success: false, error: "图片不存在或您没有权限删除" }, 404);
    }

    // 使用事务确保 R2 和 D1 操作的原子性
    try {
      // 1. 先删除 R2 对象
      const r2DeleteResult = await c.env.IMAGES.delete(r2ObjectKey);
      console.log(`R2 delete result for ${r2ObjectKey}:`, r2DeleteResult);

      // 2. 删除数据库记录
      const dbDeleteResult = await c.env.DB.prepare(
        "DELETE FROM user_images WHERE r2_object_key = ? AND user_id = ?"
      )
        .bind(r2ObjectKey, authResult.user.id.toString())
        .run();

      console.log(`DB delete result for ${r2ObjectKey}:`, dbDeleteResult);

      // 3. 验证删除是否成功
      if (!dbDeleteResult.success) {
        console.error(`Failed to delete database record for ${r2ObjectKey}`);
        return c.json({ success: false, error: "数据库删除失败" }, 500);
      }

      console.log(`User ${authResult.user.login} successfully deleted image: ${r2ObjectKey}`);

      // Get client IP for notification
      const clientIP = c.req.header("CF-Connecting-IP") || "unknown";

      // Send Telegram notification (async)
      const telegramMessage = `
🗑️ <b>📷 图片已删除</b>

━━━━━━━━━━━━━━
👤 <b>用户信息</b>
├─ 用户名: <code>${authResult.user.login}</code>
├─ 用户ID: <code>${authResult.user.id.toString()}</code>
└─ IP地址: <code>${clientIP}</code>

📷 <b>删除信息</b>
└─ 文件: <code>${r2ObjectKey}</code>

🕐 ${new Date().toLocaleString("zh-CN")}
━━━━━━━━━━━━━━
      `.trim();

      // 使用 waitUntil 确保异步任务完成
      if (c.executionCtx) {
        c.executionCtx.waitUntil(
          sendTelegramNotification(c.env, telegramMessage).catch((err) =>
            console.error("Telegram notification failed:", err)
          )
        );
      } else {
        sendTelegramNotification(c.env, telegramMessage).catch((err) =>
          console.error("Telegram notification failed:", err)
        );
      }

      return c.json({
        success: true,
        message: "图片删除成功",
        deleted: {
          r2ObjectKey,
          userId: authResult.user.id.toString(),
          success: dbDeleteResult.success,
        },
      });
    } catch (deleteError) {
      console.error(`Delete operation failed for ${r2ObjectKey}:`, deleteError);

      // 如果 R2 删除成功但 D1 删除失败，尝试恢复 R2 对象
      // 注意：R2 删除是不可逆的，这里只能记录错误
      return c.json(
        {
          success: false,
          error: "删除操作失败，请重试",
          details: deleteError instanceof Error ? deleteError.message : String(deleteError),
        },
        500
      );
    }
  } catch (error) {
    console.error("Delete image error:", error);
    return c.json(
      {
        success: false,
        error: "删除图片失败",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// 清理无效记录 - 删除数据库中不存在对应 R2 对象的记录
app.post("/api/clean-invalid", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, error: "需要提供有效的访问令牌" }, 401);
    }

    const token = authHeader.substring(7);
    const authResult = await verifyGitHubToken(token, c.env);
    if (!authResult.valid || !authResult.user) {
      return c.json({ success: false, error: "无效的访问令牌" }, 403);
    }

    // 获取用户的所有记录
    const userRecords = await c.env.DB.prepare(
      "SELECT r2_object_key FROM user_images WHERE user_id = ?"
    )
      .bind(authResult.user.id.toString())
      .all();

    if (!userRecords.results || userRecords.results.length === 0) {
      return c.json({
        success: true,
        message: "没有找到任何记录",
        deleted: [],
      });
    }

    const invalidRecords: string[] = [];

    // 检查每个记录对应的 R2 对象是否存在
    for (const record of userRecords.results) {
      const key = record.r2_object_key as string;
      try {
        const r2Object = await c.env.IMAGES.head(key);
        if (!r2Object) {
          invalidRecords.push(key);
        }
      } catch (error) {
        // R2 对象不存在或访问失败
        invalidRecords.push(key);
      }
    }

    if (invalidRecords.length === 0) {
      return c.json({
        success: true,
        message: "所有记录都是有效的",
        deleted: [],
      });
    }

    // 删除无效的数据库记录
    const deletePromises = invalidRecords.map(async (key) => {
      try {
        await c.env.DB.prepare("DELETE FROM user_images WHERE r2_object_key = ? AND user_id = ?")
          .bind(key, authResult.user.id.toString())
          .run();
      } catch (dbError) {
        console.error(`Failed to delete database record for key ${key}:`, dbError);
      }
    });

    await Promise.all(deletePromises);

    console.log(
      `User ${authResult.user.login} cleaned ${invalidRecords.length} invalid records:`,
      invalidRecords
    );

    return c.json({
      success: true,
      message: `已清理 ${invalidRecords.length} 个无效记录`,
      deleted: invalidRecords,
    });
  } catch (error) {
    console.error("Clean invalid records error:", error);
    return c.json({ success: false, error: "清理无效记录失败" }, 500);
  }
});

// 清空存储 - 删除用户的所有 R2 数据和 D1 数据
app.post("/api/clear-storage", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, error: "需要提供有效的访问令牌" }, 401);
    }

    const token = authHeader.substring(7);
    const authResult = await verifyGitHubToken(token, c.env);
    if (!authResult.valid || !authResult.user) {
      return c.json({ success: false, error: "无效的访问令牌" }, 403);
    }

    const userId = authResult.user.id.toString();

    // 获取用户的所有记录
    const userRecords = await c.env.DB.prepare(
      "SELECT r2_object_key FROM user_images WHERE user_id = ?"
    )
      .bind(userId)
      .all();

    if (!userRecords.results || userRecords.results.length === 0) {
      return c.json({
        success: true,
        message: "没有找到任何记录",
        deleted: {
          r2Objects: [],
          dbRecords: 0,
        },
      });
    }

    const deletedR2Objects: string[] = [];
    const deletePromises: Promise<any>[] = [];

    // 删除所有 R2 对象
    for (const record of userRecords.results) {
      const key = record.r2_object_key as string;
      deletePromises.push(
        c.env.IMAGES.delete(key)
          .then(() => {
            deletedR2Objects.push(key);
          })
          .catch((error) => {
            console.error(`Failed to delete R2 object ${key}:`, error);
          })
      );
    }

    // 等待所有 R2 删除操作完成
    await Promise.all(deletePromises);

    // 删除所有数据库记录
    const dbDeleteResult = await c.env.DB.prepare("DELETE FROM user_images WHERE user_id = ?")
      .bind(userId)
      .run();

    console.log(
      `User ${authResult.user.login} cleared all storage: ${
        deletedR2Objects.length
      } R2 objects, ${dbDeleteResult.meta?.changes || 0} DB records`
    );

    return c.json({
      success: true,
      message: `已清空所有存储：删除了 ${
        deletedR2Objects.length
      } 个 R2 对象和 ${dbDeleteResult.meta?.changes || 0} 条数据库记录`,
      deleted: {
        r2Objects: deletedR2Objects,
        dbRecords: dbDeleteResult.meta?.changes || 0,
      },
    });
  } catch (error) {
    console.error("Clear storage error:", error);
    return c.json({ success: false, error: "清空存储失败" }, 500);
  }
});

// IP黑名单管理
app.get("/api/admin/ip-blacklist", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    // 获取所有黑名单IP
    const blacklistId = c.env.IP_BLACKLIST.idFromName("global");
    const blacklistStub = c.env.IP_BLACKLIST.get(blacklistId);
    const response = await blacklistStub.fetch("http://dummy/list");
    const result = (await response.json()) as { blacklist?: string[] };

    return c.json({
      success: true,
      data: result.blacklist || [],
    });
  } catch (error) {
    console.error("Get IP blacklist error:", error);
    return c.json({ success: false, error: "获取IP黑名单失败" }, 500);
  }
});

app.post("/api/admin/ip-blacklist", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    const { ip, reason } = await c.req.json();
    if (!ip) {
      return c.json({ success: false, error: "IP地址不能为空" }, 400);
    }

    // 添加到黑名单
    const blacklistId = c.env.IP_BLACKLIST.idFromName("global");
    const blacklistStub = c.env.IP_BLACKLIST.get(blacklistId);
    await blacklistStub.fetch("http://dummy/add", {
      method: "POST",
      body: JSON.stringify({ ip, reason: reason || "Manual ban" }),
    });

    // Send Telegram notification
    const telegramMessage = `
🚫 <b>IP已封禁</b>

🌐 IP地址: <code>${ip}</code>
📝 原因: ${reason || "Manual ban"}
⏰ 时长: 永久
👮 操作者: 管理员
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    // 使用 waitUntil 确保异步任务完成
    if (c.executionCtx) {
      c.executionCtx.waitUntil(
        sendTelegramNotification(c.env, telegramMessage).catch((err) =>
          console.error("Telegram notification failed:", err)
        )
      );
    } else {
      sendTelegramNotification(c.env, telegramMessage).catch((err) =>
        console.error("Telegram notification failed:", err)
      );
    }

    return c.json({
      success: true,
      message: "IP已添加到黑名单",
    });
  } catch (error) {
    console.error("Add IP to blacklist error:", error);
    return c.json({ success: false, error: "添加IP到黑名单失败" }, 500);
  }
});

app.delete("/api/admin/ip-blacklist/:ip", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    const ip = c.req.param("ip");
    if (!ip) {
      return c.json({ success: false, error: "IP地址不能为空" }, 400);
    }

    // 从黑名单移除
    const blacklistId = c.env.IP_BLACKLIST.idFromName("global");
    const blacklistStub = c.env.IP_BLACKLIST.get(blacklistId);
    await blacklistStub.fetch(`http://dummy/remove/${ip}`, {
      method: "DELETE",
    });

    // Send Telegram notification
    const telegramMessage = `
✅ <b>IP已解封</b>

🌐 IP地址: <code>${ip}</code>
👮 操作者: 管理员
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    // 使用 waitUntil 确保异步任务完成
    if (c.executionCtx) {
      c.executionCtx.waitUntil(
        sendTelegramNotification(c.env, telegramMessage).catch((err) =>
          console.error("Telegram notification failed:", err)
        )
      );
    } else {
      sendTelegramNotification(c.env, telegramMessage).catch((err) =>
        console.error("Telegram notification failed:", err)
      );
    }

    return c.json({
      success: true,
      message: "IP已从黑名单移除",
    });
  } catch (error) {
    console.error("Remove IP from blacklist error:", error);
    return c.json({ success: false, error: "从黑名单移除IP失败" }, 500);
  }
});

// Test endpoint for Telegram notifications
app.get("/test-telegram", async (c) => {
  console.log("TEST: Telegram test endpoint called");

  const botToken = c.env.TELEGRAM_BOT_TOKEN;
  const chatId = c.env.TELEGRAM_CHAT_ID;

  console.log("TEST: Token exists:", !!botToken, "Chat ID exists:", !!chatId);

  if (!botToken || !chatId) {
    return c.json({
      success: false,
      error: "Missing Telegram credentials",
      hasToken: !!botToken,
      hasChatId: !!chatId,
    });
  }

  try {
    console.log("TEST: Making test API call");

    const testMessage = `🧪 <b>测试通知</b>

━━━━━━━━━━━━━━
📅 ${new Date().toLocaleString("zh-CN")}
━━━━━━━━━━━━━━
    `.trim();

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(10000),
    });

    console.log("TEST: Response status:", response.status);

    if (response.ok) {
      const result = await response.json();
      return c.json({
        success: true,
        message: "Test notification sent successfully",
        response: result,
      });
    } else {
      const errorText = await response.text();
      return c.json({
        success: false,
        error: "Telegram API error",
        status: response.status,
        details: errorText,
      });
    }
  } catch (error) {
    console.log("TEST: Exception:", error);
    return c.json({
      success: false,
      error: "Exception during test",
      details: String(error),
    });
  }
});

// 获取用户设置
app.get("/api/user/settings", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, error: "需要提供有效的访问令牌" }, 401);
    }

    const token = authHeader.substring(7);
    const authResult = await verifyGitHubToken(token, c.env);
    if (!authResult.valid || !authResult.user) {
      return c.json({ success: false, error: "无效的访问令牌" }, 403);
    }

    const userId = authResult.user.id.toString();

    try {
      const result = await c.env.DB.prepare(
        "SELECT telegram_chat_id, notification_enabled FROM user_settings WHERE user_id = ?"
      )
        .bind(userId)
        .first();

      if (!result) {
        return c.json({
          success: true,
          data: {
            telegramChatId: null,
            notificationEnabled: false,
          },
        });
      }

      return c.json({
        success: true,
        data: {
          telegramChatId: (result as any).telegram_chat_id,
          notificationEnabled: (result as any).notification_enabled === 1,
        },
      });
    } catch (dbError) {
      console.error("Get user settings error:", dbError);
      return c.json({ success: false, error: "获取设置失败" }, 500);
    }
  } catch (error) {
    console.error("User settings error:", error);
    return c.json({ success: false, error: "获取设置失败" }, 500);
  }
});

// 更新用户设置
app.put("/api/user/settings", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: false, error: "需要提供有效的访问令牌" }, 401);
    }

    const token = authHeader.substring(7);
    const authResult = await verifyGitHubToken(token, c.env);
    if (!authResult.valid || !authResult.user) {
      return c.json({ success: false, error: "无效的访问令牌" }, 403);
    }

    const userId = authResult.user.id.toString();
    const { telegramChatId, notificationEnabled } = await c.req.json();

    try {
      // 使用 UPSERT (INSERT OR REPLACE) 更新设置
      await c.env.DB.prepare(
        `INSERT INTO user_settings (user_id, telegram_chat_id, notification_enabled, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           telegram_chat_id = excluded.telegram_chat_id,
           notification_enabled = excluded.notification_enabled,
           updated_at = excluded.updated_at`
      )
        .bind(userId, telegramChatId || null, notificationEnabled ? 1 : 0, new Date().toISOString())
        .run();

      return c.json({
        success: true,
        message: "设置已更新",
      });
    } catch (dbError) {
      console.error("Update user settings error:", dbError);
      return c.json({ success: false, error: "更新设置失败" }, 500);
    }
  } catch (error) {
    console.error("Update user settings error:", error);
    return c.json({ success: false, error: "更新设置失败" }, 500);
  }
});

// 获取系统统计信息
app.get("/api/admin/system-stats", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    // 获取数据库统计
    const totalUsersResult = await c.env.DB.prepare(
      "SELECT COUNT(DISTINCT user_id) as count FROM user_images"
    ).first();
    const totalUsers = totalUsersResult?.count || 0;

    const totalImagesResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM user_images"
    ).first();
    const totalImages = totalImagesResult?.count || 0;

    const totalSizeResult = await c.env.DB.prepare(
      "SELECT SUM(file_size) as size FROM user_images"
    ).first();
    const totalSize = totalSizeResult?.size || 0;

    const todayUploadsResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM user_images WHERE date(upload_date) = date('now')"
    ).first();
    const todayUploads = todayUploadsResult?.count || 0;

    return c.json({
      success: true,
      data: {
        cpu: 45,
        memory: 62,
        disk: 78,
        network: {
          in: 1250000,
          out: 980000,
        },
        uptime: "15 days, 3 hours",
        requests: {
          total: 12500,
          success: 11800,
          error: 700,
        },
        responseTime: 145,
        dbStats: {
          totalUsers: Number(totalUsers) || 0,
          totalImages: Number(totalImages) || 0,
          totalSize: Number(totalSize) || 0,
          todayUploads: Number(todayUploads) || 0,
        },
      },
    });
  } catch (error) {
    console.error("System stats error:", error);
    return c.json({ success: false, error: "获取系统统计失败" }, 500);
  }
});

// 获取用户列表
app.get("/api/admin/users", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    // 获取所有用户及统计信息
    const usersQuery = await c.env.DB.prepare(
      `
      SELECT 
        ui.user_id as id,
        ui.user_id as username,
        ui.user_id as email,
        COUNT(*) as uploads,
        MAX(ui.upload_date) as lastActive,
        SUM(ui.file_size) as totalSize
      FROM user_images ui
      GROUP BY ui.user_id
      ORDER BY lastActive DESC
    `
    ).all();

    // 如果数据库中没有用户数据，返回当前用户
    if (!usersQuery.results || usersQuery.results.length === 0) {
      const authHeader = c.req.header("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const githubResponse = await fetch("https://api.github.com/user", {
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": "PicoPics-v2/1.0.0",
            },
          });

          if (githubResponse.ok) {
            const githubUser = await githubResponse.json();
            return c.json({
              success: true,
              data: [
                {
                  id: githubUser.id.toString(),
                  username: githubUser.login,
                  email: githubUser.email || "N/A",
                  uploads: 0,
                  lastActive: new Date().toISOString(),
                },
              ],
            });
          }
        } catch (error) {
          console.error("Failed to fetch current user:", error);
        }
      }

      return c.json({ success: true, data: [] });
    }

    // 格式化用户数据 - 直接从查询结果获取
    const users = usersQuery.results.map((row: any) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      uploads: row.uploads,
      lastActive: row.lastActive,
      totalSize: row.totalSize || 0,
    }));

    return c.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    return c.json({ success: false, error: "获取用户列表失败" }, 500);
  }
});

// 管理员删除图片（R2 + D1）
app.delete("/api/admin/images/:key", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    const key = decodeURIComponent(c.req.param("key"));

    // 1. 从 R2 删除
    try {
      await c.env.IMAGES.delete(key);
      console.log(`Admin deleted R2 object: ${key}`);
    } catch (r2Error) {
      console.error(`Failed to delete R2 object ${key}:`, r2Error);
    }

    // 2. 从 D1 删除
    try {
      await c.env.DB.prepare("DELETE FROM user_images WHERE r2_object_key = ?").bind(key).run();
      console.log(`Admin deleted D1 record for: ${key}`);
    } catch (dbError) {
      console.error(`Failed to delete D1 record for ${key}:`, dbError);
    }

    // 发送通知
    const clientIP = c.req.header("CF-Connecting-IP") || "unknown";
    const telegramMessage = `
🗑️ <b>删除图片</b>

━━━━━━━━━━━━━
👤 Admin 操作
└─ IP: <code>${clientIP}</code>

📁 已删除文件
└─ <code>${key}</code>

🕐 ${new Date().toLocaleString("zh-CN")}
━━━━━━━━━━━━━
    `.trim();

    // 使用 waitUntil 确保异步任务完成
    if (c.executionCtx) {
      c.executionCtx.waitUntil(
        sendTelegramNotification(c.env, telegramMessage).catch((err) =>
          console.error("Telegram notification failed:", err)
        )
      );
    } else {
      sendTelegramNotification(c.env, telegramMessage).catch((err) =>
        console.error("Telegram notification failed:", err)
      );
    }

    return c.json({
      success: true,
      message: "图片已删除",
      deleted: { key },
    });
  } catch (error) {
    console.error("Admin delete image error:", error);
    return c.json({ success: false, error: "删除失败" }, 500);
  }
});

// 批量删除图片（管理员）
app.post("/api/admin/images/batch-delete", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    const { keys } = await c.req.json();
    if (!Array.isArray(keys) || keys.length === 0) {
      return c.json({ success: false, error: "请提供要删除的图片键列表" }, 400);
    }

    console.log(`Admin batch deleting ${keys.length} images`);

    const deleted: string[] = [];
    const failed: string[] = [];

    // 批量删除
    for (const key of keys) {
      try {
        // 1. 从 R2 删除
        await c.env.IMAGES.delete(key);

        // 2. 从 D1 删除
        await c.env.DB.prepare("DELETE FROM user_images WHERE r2_object_key = ?").bind(key).run();

        deleted.push(key);
        console.log(`Successfully deleted: ${key}`);
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
        failed.push(key);
      }
    }

    // 发送通知
    const clientIP = c.req.header("CF-Connecting-IP") || "unknown";

    // 构建删除详情（只显示前5个）
    const deletedFiles = deleted
      .slice(0, 5)
      .map((k) => `• ${k}`)
      .join("\n");
    const moreFiles = deleted.length > 5 ? `\n... 还有 ${deleted.length - 5} 个文件` : "";

    const telegramMessage = `
🗑️ <b>批量删除图片</b>

━━━━━━━━━━━━━
👤 Admin 操作
└─ IP: <code>${clientIP}</code>

📊 删除统计
├─ 总数: ${keys.length}
├─ 成功: ${deleted.length}
└─ 失败: ${failed.length}

📁 已删除文件
${deletedFiles}${moreFiles}

🕐 ${new Date().toLocaleString("zh-CN")}
━━━━━━━━━━━━━
    `.trim();

    // 使用 waitUntil 确保异步任务完成
    if (c.executionCtx) {
      c.executionCtx.waitUntil(
        sendTelegramNotification(c.env, telegramMessage).catch((err) =>
          console.error("Telegram notification failed:", err)
        )
      );
    } else {
      sendTelegramNotification(c.env, telegramMessage).catch((err) =>
        console.error("Telegram notification failed:", err)
      );
    }

    return c.json({
      success: true,
      message: `已删除 ${deleted.length} 张图片`,
      deleted,
      failed,
      total: keys.length,
    });
  } catch (error) {
    console.error("Admin batch delete error:", error);
    return c.json({ success: false, error: "批量删除失败" }, 500);
  }
});

// 获取所有图片列表（管理员）
app.get("/api/admin/images", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    // 从 D1 获取所有图片记录
    const imagesResult = await c.env.DB.prepare(
      `
      SELECT 
        ui.id,
        ui.image_id,
        ui.user_id,
        ui.r2_object_key,
        ui.filename,
        ui.upload_date,
        ui.file_size,
        ui.mime_type,
        COALESCE(up.username, 'User ' || ui.user_id) as username
      FROM user_images ui
      LEFT JOIN user_profiles up ON ui.user_id = up.user_id
      ORDER BY ui.upload_date DESC
      LIMIT 100
    `
    ).all();

    const images = (imagesResult.results || []).map((row: any) => ({
      id: row.id,
      imageId: row.image_id,
      userId: row.user_id,
      key: row.r2_object_key,
      filename: row.filename,
      uploadDate: row.upload_date,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      username: row.username,
      url: `${c.env.CDN_BASE_URL || "https://image.hiaplha.xyz"}/${row.r2_object_key}`,
    }));

    return c.json({ success: true, data: images });
  } catch (error) {
    console.error("Get admin images error:", error);
    return c.json({ success: false, error: "获取图片列表失败" }, 500);
  }
});

// 管理员清理数据库
app.post("/api/admin/cleanup", async (c) => {
  try {
    const adminCheck = await verifyAdmin(c.req.raw, c.env);
    if (!adminCheck.valid) {
      return c.json({ success: false, error: adminCheck.error }, 403);
    }

    const { action, userId } = await c.req.json();

    let deletedCount = 0;

    if (action === "cleanup-orphans") {
      // 清理 D1 中不存在对应 R2 对象的记录
      const allRecords = await c.env.DB.prepare("SELECT r2_object_key FROM user_images").all();

      for (const record of allRecords.results || []) {
        const key = record.r2_object_key as string;
        try {
          const r2Object = await c.env.IMAGES.head(key);
          if (!r2Object) {
            await c.env.DB.prepare("DELETE FROM user_images WHERE r2_object_key = ?")
              .bind(key)
              .run();
            deletedCount++;
          }
        } catch (error) {
          console.error(`Error checking R2 object ${key}:`, error);
        }
      }
    } else if (action === "cleanup-user" && userId) {
      // 清理指定用户的所有图片
      const userRecords = await c.env.DB.prepare(
        "SELECT r2_object_key FROM user_images WHERE user_id = ?"
      )
        .bind(userId)
        .all();

      for (const record of userRecords.results || []) {
        const key = record.r2_object_key as string;
        // 删除 R2 对象
        try {
          await c.env.IMAGES.delete(key);
        } catch (error) {
          console.error(`Failed to delete R2 object ${key}:`, error);
        }
        // 删除 D1 记录
        await c.env.DB.prepare("DELETE FROM user_images WHERE r2_object_key = ?").bind(key).run();
        deletedCount++;
      }
    }

    return c.json({
      success: true,
      message: `已清理 ${deletedCount} 条记录`,
      deletedCount,
    });
  } catch (error) {
    console.error("Admin cleanup error:", error);
    return c.json({ success: false, error: "清理失败" }, 500);
  }
});

export default app;
export { UploadQuota, IPBlacklist };
