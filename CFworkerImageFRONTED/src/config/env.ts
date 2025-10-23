/**
 * 环境变量配置中心
 * 统一管理所有环境变量，提供默认值和验证
 */

interface EnvConfig {
  // API 地址
  uploadApi: string;
  historyApi: string;
  adminApi: string;
  cdnUrl: string;

  // 可选配置
  githubClientId?: string;
  turnstileSiteKey?: string;
  debug: boolean;
  apiTimeout: number;
  maxUploadSize: number;
}

/**
 * 获取环境变量，支持默认值
 */
function getEnv(key: string, defaultValue: string = ""): string {
  if (typeof window === "undefined") {
    // 服务端渲染时从 process.env 获取
    return process.env[key] || defaultValue;
  }
  // 客户端从 process.env 获取（Next.js 会在构建时注入）
  return process.env[key] || defaultValue;
}

/**
 * 确保 URL 格式正确
 */
function normalizeUrl(url: string, defaultPath: string = ""): string {
  if (!url) return "";

  // 移除末尾的斜杠
  let normalized = url.replace(/\/+$/, "");

  // 如果指定了默认路径且 URL 不包含该路径，添加它
  if (defaultPath && !normalized.endsWith(defaultPath)) {
    normalized = `${normalized}${defaultPath}`;
  }

  return normalized;
}

/**
 * 验证必需的环境变量
 */
function validateEnv(config: EnvConfig): void {
  const errors: string[] = [];

  if (!config.uploadApi) {
    errors.push("NEXT_PUBLIC_UPLOAD_API 未配置");
  }

  if (!config.historyApi) {
    errors.push("NEXT_PUBLIC_HISTORY_API 未配置");
  }

  if (!config.adminApi) {
    errors.push("NEXT_PUBLIC_ADMIN_API 未配置");
  }

  if (!config.cdnUrl) {
    errors.push("NEXT_PUBLIC_CDN_URL 未配置");
  }

  if (errors.length > 0 && config.debug) {
    console.error("环境变量配置错误：");
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error("\n请检查 .env.local 文件，参考 .env.example 进行配置");
  }
}

/**
 * 加载并验证环境配置
 */
function loadEnvConfig(): EnvConfig {
  const config: EnvConfig = {
    // API 地址 - 自动添加路径后缀
    // 默认值指向生产环境，避免意外访问本地环境
    uploadApi: normalizeUrl(
      getEnv(
        "NEXT_PUBLIC_UPLOAD_API",
        "https://uploader-worker-prod.haoweiw370.workers.dev/upload"
      ),
      "/upload"
    ),
    historyApi: normalizeUrl(
      getEnv(
        "NEXT_PUBLIC_HISTORY_API",
        "https://history-worker-prod.haoweiw370.workers.dev"
      ),
      ""
    ),
    adminApi: normalizeUrl(
      getEnv(
        "NEXT_PUBLIC_ADMIN_API",
        "https://r2-browser-worker-prod.haoweiw370.workers.dev"
      ),
      ""
    ),
    cdnUrl: normalizeUrl(
      getEnv("NEXT_PUBLIC_CDN_URL", "https://pic.lambdax.me"),
      ""
    ),

    // 可选配置
    githubClientId: getEnv("NEXT_PUBLIC_GITHUB_CLIENT_ID"),
    turnstileSiteKey: getEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),

    // 开发配置
    debug: getEnv("NEXT_PUBLIC_DEBUG", "false") === "true",
    apiTimeout: parseInt(getEnv("NEXT_PUBLIC_API_TIMEOUT", "30000"), 10),
    maxUploadSize: parseInt(
      getEnv("NEXT_PUBLIC_MAX_UPLOAD_SIZE", "10485760"),
      10
    ),
  };

  // 验证配置
  validateEnv(config);

  // 调试模式下打印配置
  if (config.debug && typeof window !== "undefined") {
    console.log("环境配置已加载：", {
      uploadApi: config.uploadApi,
      historyApi: config.historyApi,
      adminApi: config.adminApi,
      cdnUrl: config.cdnUrl,
      apiTimeout: config.apiTimeout,
      maxUploadSize: `${(config.maxUploadSize / 1024 / 1024).toFixed(1)}MB`,
    });
  }

  return config;
}

// 导出配置实例
export const env = loadEnvConfig();

// 导出类型
export type { EnvConfig };
