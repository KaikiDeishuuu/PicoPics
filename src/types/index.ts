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

// 图片历史记录
export interface ImageHistoryRecord {
  id: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  r2ObjectKey: string;
}

// 用户认证状态
export interface AuthState {
  user: GitHubUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

// 管理员统计信息
export interface AdminStats {
  totalImages: number;
  totalSize: number;
  totalUsers: number;
  recentUploads: number;
}

// 用户信息
export interface UserInfo {
  id: string;
  username: string;
  totalUploads: number;
  totalSize: number;
  lastUpload: string | null;
}

// 系统设置
export interface SystemSettings {
  telegramNotifications: boolean;
  abuseDetection: boolean;
  turnstileEnabled: boolean;
  authEnabled: boolean;
  aiModeration: boolean;
  quotaEnabled: boolean;
  dailyQuota: number;
}

// R2 对象信息
export interface R2Object {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  contentType?: string;
}

// 用户分组
export interface UserGroup {
  userId: string;
  username: string;
  objects: R2Object[];
  totalSize: number;
  fileCount: number;
}

// 文件删除事件
export interface FileDeletedEvent {
  keys: string[];
  timestamp: number;
}

// 全局状态
export interface GlobalState {
  historyRefreshTrigger: number;
  adminStatsRefreshTrigger: number;
  fileDeleted: FileDeletedEvent | null;
}
