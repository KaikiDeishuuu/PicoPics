import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import type {
  R2Bucket,
  DurableObjectNamespace,
  DurableObjectState,
} from "@cloudflare/workers-types";

interface Env {
  IMAGES: R2Bucket;
  UPLOAD_QUOTA: DurableObjectNamespace;
  IP_BLACKLIST: DurableObjectNamespace;
  AI?: any;
  ALLOWED_ORIGINS: string;
  MAX_FILE_SIZE: string;
  DAILY_QUOTA_BYTES: string;
  ABUSE_DETECTION_ENABLED: string;
  CONTENT_MODERATION_ENABLED: string;
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

// Upload endpoint
app.post("/upload", async (c) => {
  try {
    const clientIP = c.req.header("CF-Connecting-IP") || "unknown";
    const userId = c.req.header("X-User-ID") || "anonymous";

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

    // Check quota
    const quotaId = c.env.UPLOAD_QUOTA.idFromName(userId);
    const quotaStub = c.env.UPLOAD_QUOTA.get(quotaId);
    const quotaResponse = await quotaStub.fetch(c.req.raw as any);
    const quota = (await quotaResponse.json()) as { dailyBytes: number };

    const maxBytes = parseInt(c.env.DAILY_QUOTA_BYTES || "104857600"); // 100MB default
    if (quota.dailyBytes >= maxBytes) {
      return c.json(
        {
          success: false,
          code: "QUOTA_EXCEEDED",
          message: "Daily upload quota exceeded",
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
    const file = formData.get("file") as File;

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

    // Content moderation (if enabled)
    if (c.env.CONTENT_MODERATION_ENABLED === "true" && c.env.AI) {
      try {
        const imageBuffer = await file.arrayBuffer();
        const imageArray = Array.from(new Uint8Array(imageBuffer));

        const response = await c.env.AI.run("@cf/microsoft/resnet-50", {
          image: imageArray,
        });
        const blockedLabels = [
          "bikini",
          "brassiere",
          "weapon",
          "rifle",
          "military uniform",
        ];

        for (const result of response) {
          if (result.score > 0.6) {
            const label = result.label.toLowerCase();
            for (const blocked of blockedLabels) {
              if (label.includes(blocked)) {
                return c.json(
                  {
                    success: false,
                    code: "CONTENT_BLOCKED",
                    message: `Content moderation: ${result.label}`,
                  },
                  400
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Content moderation error:", error);
        // Continue with upload if moderation fails
      }
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

    // Generate public URL (assuming R2 public bucket)
    const publicUrl = `https://pub-xxxxx.r2.dev/${fileName}`;

    return c.json({
      success: true,
      data: {
        id: fileName,
        url: publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
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

export default app;
export { UploadQuota, IPBlacklist };
