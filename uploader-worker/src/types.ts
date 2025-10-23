/**
 * 环境变量类型定义
 */
export interface Env {
  IMAGES: R2Bucket;
  UPLOAD_QUOTA: DurableObjectNamespace;
  IP_BLACKLIST: DurableObjectNamespace;
  AI: Ai; // Cloudflare AI binding
  DB: D1Database; // D1 Database binding
  USER_CACHE: KVNamespace; // KV缓存用于存储GitHub用户信息
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
  ADMIN_USERS?: string; // 管理员GitHub用户名列表，用逗号分隔
  ADMIN_TOKEN?: string; // 管理员访问令牌
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

/**
 * 图片历史记录接口
 */
export interface ImageHistoryRecord {
  id: number;
  imageId: string;
  userId: string;
  r2ObjectKey: string;
  filename: string;
  uploadDate: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 历史记录API响应接口
 */
export interface HistoryResponse {
  success: boolean;
  data?: ImageHistoryRecord[];
  error?: string;
  code?: string;
}
