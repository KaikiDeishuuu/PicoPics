// GitHub 用户信息
export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

// 上传状态枚举
export enum UploadStatus {
  IDLE = "idle",
  UPLOADING = "uploading",
  SUCCESS = "success",
  ERROR = "error",
}

// 上传成功响应
export interface UploadSuccessResponse {
  success: boolean;
  url: string;
  fileName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// 上传错误响应
export interface UploadErrorResponse {
  success: false;
  error: string;
}

// 通用上传响应
export type UploadResponse = UploadSuccessResponse | UploadErrorResponse;
