/**
 * 上传响应类型定义
 */
export interface UploadSuccessResponse {
  success: true;
  url: string;
  fileName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface UploadErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

/**
 * 上传状态枚举
 */
export enum UploadStatus {
  IDLE = "idle",
  UPLOADING = "uploading",
  SUCCESS = "success",
  ERROR = "error",
}

/**
 * 链接格式类型
 */
export interface LinkFormats {
  url: string;
  html: string;
  markdown: string;
  bbcode: string;
  markdownWithLink: string;
}
