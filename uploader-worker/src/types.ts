/**
 * 环境变量类型定义
 */
export interface Env {
  IMAGES: R2Bucket;
  UPLOAD_QUOTA: DurableObjectNamespace;
  IP_BLACKLIST: DurableObjectNamespace;
  AI: Ai; // Cloudflare AI binding
  R2_PUBLIC_BASE?: string;
  MAX_UPLOAD_SIZE?: string;
  ALLOWED_ORIGINS?: string;
  DAILY_QUOTA_BYTES?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  ABUSE_DETECTION_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_ENABLED?: string;
  AUTH_ENABLED?: string;
  CONTENT_MODERATION_ENABLED?: string;
  GITHUB_CLIENT_ID?: string;
}

/**
 * 上传成功的响应
 */
export interface UploadSuccessResponse {
  success: true;
  url: string;
  fileName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

/**
 * 上传失败的响应
 */
export interface UploadErrorResponse {
  success: false;
  error: string;
  code?: string;
}

/**
 * 上传响应类型
 */
export type UploadResponse = UploadSuccessResponse | UploadErrorResponse;
