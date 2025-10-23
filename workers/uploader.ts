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

    // Reset counters daily
    const now = Date.now();
    const lastReset = (await this.state.storage.get<number>("lastReset")) || 0;
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - lastReset > oneDay) {
      await this.state.storage.put("lastReset", now);
      await this.state.storage.deleteAll();
    }

    if (request.method === "GET") {
      const quota = await this.getQuota(userId);
      return new Response(JSON.stringify(quota), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const { bytes } = await request.json();
      await this.incrementUsage(userId, bytes);
      return new Response("OK");
    }

    return new Response("Method not allowed", { status: 405 });
  }

  async getQuota(userId: string): Promise<UploadQuotaState> {
    const dailyUploads =
      (await this.state.storage.get<number>(`uploads:${userId}`)) || 0;
    const dailyBytes =
      (await this.state.storage.get<number>(`bytes:${userId}`)) || 0;
    const lastReset =
      (await this.state.storage.get<number>("lastReset")) || Date.now();

    return { dailyUploads, dailyBytes, lastReset };
  }

  async incrementUsage(userId: string, bytes: number): Promise<void> {
    const currentUploads =
      (await this.state.storage.get<number>(`uploads:${userId}`)) || 0;
    const currentBytes =
      (await this.state.storage.get<number>(`bytes:${userId}`)) || 0;

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
    console.log(`Blocked IP ${ip} for 24 hours. Reason: ${reason}`);
  }
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use(
  "*",
  cors({
    origin: "*", // Will be validated in the route handler
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Admin-Token",
      "CF-Turnstile-Token",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

app.use("*", logger());
app.use("*", prettyJSON());

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
      return c.json(
        { success: false, error: "Missing authorization code" },
        400
      );
    }

    // 交换访问令牌
    console.log("Exchanging code for token...");
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
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
      }
    );

    console.log("Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log("Token exchange failed:", errorText);
      return c.json(
        { success: false, error: "Failed to exchange code for token" },
        400
      );
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
      return c.json(
        { success: false, error: "Failed to fetch user info" },
        400
      );
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

// Upload endpoint
app.post("/upload", async (c) => {
  try {
    const clientIP = c.req.header("CF-Connecting-IP") || "unknown";

    // Get user ID from authentication
    let userId = "anonymous";
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const authResult = await verifyGitHubToken(token, c.env);
      if (authResult.valid && authResult.user) {
        userId = authResult.user.id.toString();
      }
    }

    // Check IP blacklist
    if (c.env.ABUSE_DETECTION_ENABLED === "true") {
      const blacklistId = c.env.IP_BLACKLIST.idFromName(clientIP);
      const blacklistStub = c.env.IP_BLACKLIST.get(blacklistId);
      const blacklistResponse = await blacklistStub.fetch(c.req.raw as any);
      const { blocked } = (await blacklistResponse.json()) as {
        blocked: boolean;
      };

      if (blocked) {
        return c.json(
          {
            success: false,
            code: "IP_BLOCKED",
            message:
              "Your IP has been temporarily blocked due to suspicious activity",
          },
          403
        );
      }
    }

    // Dynamic rate limiting based on user behavior and system load
    const quotaId = c.env.UPLOAD_QUOTA.idFromName(userId);
    const quotaStub = c.env.UPLOAD_QUOTA.get(quotaId);
    const quotaResponse = await quotaStub.fetch(
      new Request(`${c.req.url}?userId=${userId}`, { method: "GET" }) as any
    );
    const quota = (await quotaResponse.json()) as {
      dailyBytes: number;
      uploadCount: number;
      lastUpload: number;
    };

    // Dynamic quota calculation based on user activity
    const baseQuota = parseInt(c.env.DAILY_QUOTA_BYTES || "104857600"); // 100MB base
    const timeSinceLastUpload = Date.now() - (quota.lastUpload || 0);
    const hoursSinceLastUpload = timeSinceLastUpload / (1000 * 60 * 60);

    // Increase quota for active users (bonus system)
    const activityBonus = Math.min(quota.uploadCount * 1048576, 52428800); // Max 50MB bonus
    const dynamicQuota = baseQuota + activityBonus;

    // Only enforce quota for very high usage (prevent abuse)
    if (quota.dailyBytes > dynamicQuota * 2) {
      return c.json(
        {
          success: false,
          code: "QUOTA_EXCEEDED",
          message: "Upload limit exceeded. Please try again later.",
        },
        429
      );
    }

    const contentType = c.req.header("Content-Type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return c.json(
        {
          success: false,
          code: "INVALID_CONTENT_TYPE",
          message: "Content-Type must be multipart/form-data",
        },
        400
      );
    }

    const formData = await c.req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return c.json(
        {
          success: false,
          code: "NO_FILE",
          message: "No file provided",
        },
        400
      );
    }

    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        {
          success: false,
          code: "INVALID_FILE_TYPE",
          message: `Unsupported file type. Allowed: ${allowedTypes.join(", ")}`,
        },
        415
      );
    }

    const maxFileSize = parseInt(c.env.MAX_FILE_SIZE || "10485760"); // 10MB default
    if (file.size > maxFileSize) {
      return c.json(
        {
          success: false,
          code: "FILE_TOO_LARGE",
          message: `File too large. Maximum size: ${
            maxFileSize / (1024 * 1024)
          }MB`,
        },
        413
      );
    }

    // Content moderation (async - don't block upload)
    if (c.env.CONTENT_MODERATION_ENABLED === "true" && c.env.AI) {
      // Start content moderation in background
      contentModeration(file)
        .then((moderationResult) => {
          if (moderationResult.blocked) {
            // If content is blocked, we could delete the uploaded file
            // For now, just log it
            console.warn(
              `Content moderation blocked upload: ${moderationResult.label} for file ${fileName}`
            );
          }
        })
        .catch((error) => {
          console.error("Content moderation error:", error);
        });
    }

    // Generate unique filename
    const fileExt = file.type.split("/")[1];
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}.${fileExt}`;

    // Upload to R2
    await c.env.IMAGES.put(fileName, file as any, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000", // 1 year
      },
    });

    await quotaStub.fetch(
      new Request("http://quota", {
        method: "POST",
        body: JSON.stringify({ bytes: file.size }),
      }) as any
    );

    // Save to database
    const r2ObjectKey = fileName;

    try {
      await c.env.DB.prepare(
        `INSERT INTO user_images (image_id, user_id, r2_object_key, filename, upload_date, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          fileName, // image_id
          userId,
          r2ObjectKey,
          file.name,
          new Date().toISOString(), // upload_date
          file.size,
          file.type
        )
        .run();

      console.log(`Saved image to database: ${r2ObjectKey} for user ${userId}`);
    } catch (dbError) {
      console.error("Database save error:", dbError);
      // Continue even if database save fails
    }

    // Generate public URL using CDN worker
    const publicUrl = `https://cdn-worker-v2-prod.haoweiw370.workers.dev/${fileName}`;

    return c.json({
      success: true,
      data: {
        id: fileName,
        url: publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        r2ObjectKey: r2ObjectKey,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json(
      {
        success: false,
        code: "INTERNAL_ERROR",
        message: "Upload failed due to server error",
      },
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
    const totalImages = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM user_images"
    ).first();

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

// Content moderation function (async)
async function contentModeration(
  file: File
): Promise<{ blocked: boolean; label?: string }> {
  try {
    const imageBuffer = await file.arrayBuffer();
    const imageArray = Array.from(new Uint8Array(imageBuffer));

    const response = await fetch(
      "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/run/@cf/microsoft/resnet-50",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer YOUR_API_TOKEN`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageArray }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const blockedLabels = [
      "bikini",
      "brassiere",
      "weapon",
      "rifle",
      "military uniform",
    ];

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
      return c.json(
        { success: false, error: "图片不存在或您没有权限删除" },
        404
      );
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

      console.log(
        `User ${authResult.user.login} successfully deleted image: ${r2ObjectKey}`
      );
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
          details:
            deleteError instanceof Error
              ? deleteError.message
              : String(deleteError),
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
        await c.env.DB.prepare(
          "DELETE FROM user_images WHERE r2_object_key = ? AND user_id = ?"
        )
          .bind(key, authResult.user.id.toString())
          .run();
      } catch (dbError) {
        console.error(
          `Failed to delete database record for key ${key}:`,
          dbError
        );
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
    const dbDeleteResult = await c.env.DB.prepare(
      "DELETE FROM user_images WHERE user_id = ?"
    )
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

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
}

export default app;
export { UploadQuota, IPBlacklist };
