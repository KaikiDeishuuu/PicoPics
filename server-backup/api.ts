import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { env } from "../lib/env";
import { errors, createErrorResponse } from "../lib/errors";
import { uploadResponseSchema } from "../lib/schema";

interface CloudflareEnv {
  IMAGES: any; // R2Bucket type not available in Next.js environment
}

const app = new Hono<{ Bindings: CloudflareEnv }>();

// Middleware
app.use(
  "*",
  cors({
    origin: env.ALLOWED_ORIGINS.split(","),
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

app.use("*", logger());
app.use("*", prettyJSON());

// Health check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

// Upload endpoint
app.post("/api/upload", async (c) => {
  try {
    const contentType = c.req.header("Content-Type") || "";

    if (!contentType.includes("multipart/form-data")) {
      throw errors.validation("Content-Type must be multipart/form-data");
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw errors.validation("No file provided");
    }

    // Validate file
    if (!file.type.startsWith("image/")) {
      throw errors.invalidFileType([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ]);
    }

    if (file.size > env.MAX_FILE_SIZE) {
      throw errors.fileTooLarge(env.MAX_FILE_SIZE / (1024 * 1024));
    }

    // Generate unique filename
    const fileExt = file.type.split("/")[1];
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}.${fileExt}`;

    // Upload to R2
    const r2 = c.env.IMAGES as any;

    await r2.put(fileName, file as any, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000", // 1 year
      },
    });

    // Generate public URL
    const publicUrl = `${env.R2_PUBLIC_URL}/${fileName}`;

    const response = {
      success: true,
      data: {
        id: fileName,
        url: publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Validate response
    uploadResponseSchema.parse(response);

    return c.json(response);
  } catch (error) {
    console.error("Upload error:", error);

    if (error instanceof Error && "statusCode" in error) {
      const appError = error as any;
      return c.json(createErrorResponse(appError), appError.statusCode as any);
    }

    const appError = errors.internal("Upload failed", error);
    return c.json(createErrorResponse(appError), appError.statusCode as any);
  }
});

// Quota endpoint
app.get("/api/quota", async (c) => {
  try {
    // In a real implementation, this would check the user's quota from KV/Durable Object
    const quota = {
      used: 15,
      limit: 50,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    };

    return c.json({
      success: true,
      data: quota,
    });
  } catch (error) {
    console.error("Quota check error:", error);
    const appError = errors.internal("Failed to check quota");
    return c.json(createErrorResponse(appError), appError.statusCode as any);
  }
});

// Upload history endpoint
app.get("/api/uploads", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);

    // In a real implementation, this would fetch from D1 database
    const uploads = [
      {
        id: "sample-1",
        filename: "sample.jpg",
        url: "https://example.com/sample.jpg",
        size: 1024000,
        type: "image/jpeg",
        uploadedAt: new Date().toISOString(),
      },
    ];

    return c.json({
      success: true,
      data: {
        uploads,
        total: uploads.length,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Upload history error:", error);
    const appError = errors.internal("Failed to fetch upload history");
    return c.json(createErrorResponse(appError), appError.statusCode as any);
  }
});

export default app;
