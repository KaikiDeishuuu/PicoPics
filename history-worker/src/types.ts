/**
 * 环境变量类型定义
 */
export interface Env {
  DB: any; // D1Database
  ALLOWED_ORIGINS?: string;
}

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
 * API响应接口
 */
export interface HistoryResponse {
  success: boolean;
  data?: ImageHistoryRecord[];
  error?: string;
  code?: string;
}