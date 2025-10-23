export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",

  // Upload errors
  UPLOAD_FAILED = "UPLOAD_FAILED",
  STORAGE_ERROR = "STORAGE_ERROR",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  // Authentication
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_TOKEN = "INVALID_TOKEN",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
  }
}

// Error factory functions
export const errors = {
  validation: (message: string, details?: unknown) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),

  fileTooLarge: (maxSize: number) =>
    new AppError(
      ErrorCode.FILE_TOO_LARGE,
      `文件大小超过限制 ${maxSize}MB`,
      413
    ),

  invalidFileType: (allowedTypes: string[]) =>
    new AppError(
      ErrorCode.INVALID_FILE_TYPE,
      `不支持的文件类型，仅支持: ${allowedTypes.join(", ")}`,
      415
    ),

  uploadFailed: (details?: unknown) =>
    new AppError(ErrorCode.UPLOAD_FAILED, "文件上传失败", 500, details),

  rateLimitExceeded: (resetTime?: Date) =>
    new AppError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      "请求过于频繁，请稍后再试",
      429,
      { resetTime }
    ),

  quotaExceeded: (resetTime?: Date) =>
    new AppError(ErrorCode.QUOTA_EXCEEDED, "已达到每日上传配额", 429, {
      resetTime,
    }),

  unauthorized: (message = "未授权访问") =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401),

  internal: (message = "服务器内部错误", details?: unknown) =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, 500, details),
};

// Error response type
export interface ErrorResponse {
  success: false;
  code: ErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
}

export function createErrorResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    code: error.code,
    message: error.message,
    details: error.details,
    timestamp: new Date().toISOString(),
  };
}
