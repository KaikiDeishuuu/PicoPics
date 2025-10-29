// API错误处理 - 将API错误码映射到用户友好的通知

import { Notifications } from "@/lib/notifications";

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

/**
 * 处理API错误并返回相应的通知
 */
export function handleApiError(error: unknown): {
  notification: ReturnType<typeof Notifications.upload.error>;
  code?: string;
} {
  // 如果是Error对象
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // 检测各种错误类型
    if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
      return {
        notification: Notifications.upload.quotaExceeded(),
        code: "QUOTA_EXCEEDED",
      };
    }

    if (
      errorMessage.includes("frequency") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many")
    ) {
      return {
        notification: Notifications.upload.frequencyLimit("几分钟"),
        code: "RATE_LIMIT",
      };
    }

    if (
      errorMessage.includes("size") ||
      errorMessage.includes("too large") ||
      errorMessage.includes("max size")
    ) {
      return {
        notification: Notifications.upload.oversized("10MB"),
        code: "FILE_TOO_LARGE",
      };
    }

    if (
      errorMessage.includes("type") ||
      errorMessage.includes("format") ||
      errorMessage.includes("not allowed")
    ) {
      return {
        notification: Notifications.upload.invalidType(),
        code: "INVALID_FILE_TYPE",
      };
    }

    if (
      errorMessage.includes("blocked") ||
      errorMessage.includes("banned") ||
      errorMessage.includes("forbidden")
    ) {
      return {
        notification: Notifications.ipBan.banned("违规操作", "24小时"),
        code: "IP_BLOCKED",
      };
    }

    if (
      errorMessage.includes("moderation") ||
      errorMessage.includes("inappropriate") ||
      errorMessage.includes("content")
    ) {
      return {
        notification: Notifications.upload.contentModerated("上传的内容不符合平台规范"),
        code: "CONTENT_BLOCKED",
      };
    }

    // 默认错误
    return {
      notification: Notifications.upload.error(error.message),
    };
  }

  // 未知错误
  return {
    notification: Notifications.upload.error("发生了未知错误，请稍后重试"),
  };
}

/**
 * 从HTTP状态码推断错误类型
 */
export function getErrorFromStatus(
  status: number,
  message?: string
): {
  notification: ReturnType<typeof Notifications.upload.error>;
  code: string;
} {
  switch (status) {
    case 413:
      return {
        notification: Notifications.upload.oversized("10MB"),
        code: "FILE_TOO_LARGE",
      };
    case 415:
      return {
        notification: Notifications.upload.invalidType(),
        code: "INVALID_FILE_TYPE",
      };
    case 429:
      return {
        notification: Notifications.upload.frequencyLimit("几分钟"),
        code: "RATE_LIMIT",
      };
    case 403:
      return {
        notification: Notifications.ipBan.banned("违规操作", "24小时"),
        code: "FORBIDDEN",
      };
    case 401:
      return {
        notification: Notifications.auth.loginRequired(),
        code: "UNAUTHORIZED",
      };
    case 500:
    case 502:
    case 503:
      return {
        notification: Notifications.system.serverError(),
        code: "SERVER_ERROR",
      };
    default:
      return {
        notification: Notifications.upload.error(message || `服务器返回错误 ${status}`),
        code: `HTTP_${status}`,
      };
  }
}

/**
 * 检查错误代码是否是特定类型
 */
export function isErrorCode(error: unknown, code: string): boolean {
  if (error instanceof Error) {
    return error.message.includes(code);
  }
  return false;
}
