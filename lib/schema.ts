import { z } from "zod";

// File validation schemas
export const fileSchema = z.object({
  name: z.string().min(1, "文件名不能为空"),
  size: z.number().positive("文件大小必须大于0"),
  type: z.string().min(1, "文件类型不能为空"),
  lastModified: z.number().optional(),
});

export const uploadRequestSchema = z.object({
  file: z.instanceof(File).refine((file) => file.size > 0, "文件不能为空"),
  metadata: z
    .object({
      alt: z.string().optional(),
      caption: z.string().optional(),
    })
    .optional(),
});

export const uploadResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    filename: z.string(),
    size: z.number(),
    type: z.string(),
    uploadedAt: z.string().datetime(),
  }),
});

// API response schemas
export const errorResponseSchema = z.object({
  success: z.literal(false),
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.string().datetime(),
});

export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// User schemas
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const githubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  avatar_url: z.string().url(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
});

// Quota schemas
export const quotaSchema = z.object({
  used: z.number(),
  limit: z.number(),
  resetTime: z.string().datetime(),
});

export const quotaResponseSchema = successResponseSchema(quotaSchema);

// Upload history schemas
export const uploadRecordSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  size: z.number(),
  type: z.string(),
  uploadedAt: z.string().datetime(),
  userId: z.string().optional(),
});

export const uploadHistoryResponseSchema = successResponseSchema(
  z.object({
    uploads: z.array(uploadRecordSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  })
);

// Form schemas
export const uploadFormSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "请选择文件")
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB
      "文件大小不能超过10MB"
    )
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
          file.type
        ),
      "仅支持 JPEG、PNG、GIF、WebP 格式的图片"
    ),
  alt: z.string().max(500, "描述不能超过500个字符").optional(),
  caption: z.string().max(200, "标题不能超过200个字符").optional(),
});

// Type exports
export type FileInfo = z.infer<typeof fileSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type User = z.infer<typeof userSchema>;
export type GitHubUser = z.infer<typeof githubUserSchema>;
export type Quota = z.infer<typeof quotaSchema>;
export type UploadRecord = z.infer<typeof uploadRecordSchema>;
export type UploadForm = z.infer<typeof uploadFormSchema>;
