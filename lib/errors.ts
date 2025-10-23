// 标准化错误定义
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

// 错误代码常量
export const ERROR_CODES = {
  // 认证错误
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // 上传错误
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",

  // 数据库错误
  DATABASE_ERROR: "DATABASE_ERROR",
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",

  // 网络错误
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",

  // 系统错误
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

// 错误工厂函数
export const createError = {
  unauthorized: (message = "需要认证") => new AppError(ERROR_CODES.UNAUTHORIZED, message, 401),

  invalidToken: (message = "无效的访问令牌") =>
    new AppError(ERROR_CODES.INVALID_TOKEN, message, 403),

  fileTooLarge: (maxSize: number) =>
    new AppError(ERROR_CODES.FILE_TOO_LARGE, `文件大小超过限制 (${maxSize} bytes)`, 400),

  invalidFileType: (allowedTypes: string[]) =>
    new AppError(
      ERROR_CODES.INVALID_FILE_TYPE,
      `不支持的文件类型。允许的类型: ${allowedTypes.join(", ")}`,
      400
    ),

  uploadFailed: (message = "上传失败") => new AppError(ERROR_CODES.UPLOAD_FAILED, message, 500),

  quotaExceeded: (message = "上传配额已用完") =>
    new AppError(ERROR_CODES.QUOTA_EXCEEDED, message, 429),

  databaseError: (message = "数据库操作失败") =>
    new AppError(ERROR_CODES.DATABASE_ERROR, message, 500),

  recordNotFound: (message = "记录不存在") =>
    new AppError(ERROR_CODES.RECORD_NOT_FOUND, message, 404),

  networkError: (message = "网络连接失败") => new AppError(ERROR_CODES.NETWORK_ERROR, message, 0),

  timeout: (message = "请求超时") => new AppError(ERROR_CODES.TIMEOUT, message, 408),

  internalError: (message = "内部服务器错误") =>
    new AppError(ERROR_CODES.INTERNAL_ERROR, message, 500),

  validationError: (message = "数据验证失败") =>
    new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400),
};

// 错误处理工具
export const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, error.message, 500);
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, "未知错误", 500);
};

// 错误响应类型
export type ErrorResponse = {
  success: false;
  code: string;
  message: string;
  details?: unknown;
};

// 错误响应格式化
export const formatErrorResponse = (error: AppError): ErrorResponse => ({
  success: false,
  code: error.code,
  message: error.message,
  details: error.details,
});
