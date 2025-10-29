import { z } from "zod";

// 上传相关 Schema
export const UploadSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  filename: z.string(),
  size: z.number().positive(),
  type: z.string(),
  uploadedAt: z.string().datetime(),
  r2ObjectKey: z.string(),
});

export const UploadRequestSchema = z.object({
  image: z.instanceof(File, { message: "请选择图片文件" }),
});

// 历史记录 Schema
export const ImageHistorySchema = z.object({
  id: z.number(),
  fileName: z.string(),
  url: z.string().url(),
  size: z.number().positive(),
  type: z.string(),
  uploadedAt: z.string().datetime(),
  r2ObjectKey: z.string(),
});

// 用户 Schema
export const UserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional(),
});

// API 响应 Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});

// 配额 Schema
export const QuotaSchema = z.object({
  dailyBytes: z.number().nonnegative(),
  uploadCount: z.number().nonnegative(),
  lastUpload: z.number().nonnegative(),
});

// 管理员统计 Schema
export const AdminStatsSchema = z.object({
  totalImages: z.number().nonnegative(),
  totalUsers: z.number().nonnegative(),
  totalSize: z.string(),
  todayUploads: z.number().nonnegative(),
});

// 环境变量 Schema
export const EnvSchema = z.object({
  NEXT_PUBLIC_UPLOAD_API: z.string().url(),
  NEXT_PUBLIC_HISTORY_API: z.string().url(),
  NEXT_PUBLIC_ADMIN_API: z.string().url(),
  NEXT_PUBLIC_CDN_URL: z.string().url(),
  NEXT_PUBLIC_GITHUB_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_DEBUG: z.boolean().default(false),
  NEXT_PUBLIC_API_TIMEOUT: z.number().positive().default(30000),
  NEXT_PUBLIC_MAX_UPLOAD_SIZE: z.number().positive().default(10485760),
});

// 类型导出
export type UploadResult = z.infer<typeof UploadSchema>;
export type UploadRequest = z.infer<typeof UploadRequestSchema>;
export type ImageHistoryRecord = z.infer<typeof ImageHistorySchema>;
export type User = z.infer<typeof UserSchema>;
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & {
  data?: T;
};
export type Quota = z.infer<typeof QuotaSchema>;
export type AdminStats = z.infer<typeof AdminStatsSchema>;
export type EnvConfig = z.infer<typeof EnvSchema>;
