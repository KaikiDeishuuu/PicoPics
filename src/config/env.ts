import { z } from "zod";

// 环境变量验证模式
const envSchema = z.object({
  // API 端点
  NEXT_PUBLIC_UPLOAD_API: z
    .string()
    .url()
    .default("https://uploader-worker-v2-prod.haoweiw370.workers.dev"),
  NEXT_PUBLIC_HISTORY_API: z
    .string()
    .url()
    .default("https://history-worker-v2-prod.haoweiw370.workers.dev"),
  NEXT_PUBLIC_ADMIN_API: z
    .string()
    .url()
    .default("https://r2-browser-worker-v2-prod.haoweiw370.workers.dev"),
  NEXT_PUBLIC_CDN_URL: z
    .string()
    .url()
    .default("https://cdn-worker-v2-prod.haoweiw370.workers.dev"),

  // GitHub OAuth (可选)
  NEXT_PUBLIC_GITHUB_CLIENT_ID: z.string().optional(),

  // 调试模式
  NEXT_PUBLIC_DEBUG: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // API 超时
  NEXT_PUBLIC_API_TIMEOUT: z.string().transform(Number).default("30000"),

  // 最大上传大小
  NEXT_PUBLIC_MAX_UPLOAD_SIZE: z.string().transform(Number).default("10485760"), // 10MB
});

// 获取环境变量
function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

// 标准化 URL
function normalizeUrl(url: string | undefined, suffix: string): string {
  if (!url) return "";
  let normalized = url.replace(/\/+$/, ""); // 移除尾部斜杠
  if (suffix && !normalized.endsWith(suffix)) {
    normalized = `${normalized}${suffix}`;
  }
  return normalized;
}

// 加载环境配置
function loadEnvConfig() {
  const config = {
    uploadApi: normalizeUrl(
      getEnv(
        "NEXT_PUBLIC_UPLOAD_API",
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev"
      ),
      "/upload"
    ),
    historyApi: normalizeUrl(
      getEnv(
        "NEXT_PUBLIC_HISTORY_API",
        "https://history-worker-v2-prod.haoweiw370.workers.dev"
      ),
      ""
    ),
    adminApi: normalizeUrl(
      getEnv(
        "NEXT_PUBLIC_ADMIN_API",
        "https://r2-browser-worker-v2-prod.haoweiw370.workers.dev"
      ),
      ""
    ),
    cdnUrl: normalizeUrl(
      getEnv(
        "NEXT_PUBLIC_CDN_URL",
        "https://cdn-worker-v2-prod.haoweiw370.workers.dev"
      ),
      ""
    ),
    githubClientId: getEnv("NEXT_PUBLIC_GITHUB_CLIENT_ID"),
    debug: getEnv("NEXT_PUBLIC_DEBUG", "false") === "true",
    apiTimeout: Number(getEnv("NEXT_PUBLIC_API_TIMEOUT", "30000")),
    maxUploadSize: Number(getEnv("NEXT_PUBLIC_MAX_UPLOAD_SIZE", "10485760")),
  };

  // 验证配置
  try {
    envSchema.parse({
      NEXT_PUBLIC_UPLOAD_API: config.uploadApi,
      NEXT_PUBLIC_HISTORY_API: config.historyApi,
      NEXT_PUBLIC_ADMIN_API: config.adminApi,
      NEXT_PUBLIC_CDN_URL: config.cdnUrl,
      NEXT_PUBLIC_GITHUB_CLIENT_ID: config.githubClientId,
      NEXT_PUBLIC_DEBUG: config.debug.toString(),
      NEXT_PUBLIC_API_TIMEOUT: config.apiTimeout.toString(),
      NEXT_PUBLIC_MAX_UPLOAD_SIZE: config.maxUploadSize.toString(),
    });
    return config;
  } catch (error) {
    console.error("Environment validation failed:", error);
    return config;
  }
}

export const env = loadEnvConfig();
