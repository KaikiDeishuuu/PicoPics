// 通知服务 - 统一管理所有系统通知

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  type: NotificationType;
  title: string;
  description?: string;
  duration?: number;
}

// 通知场景定义
export const Notifications = {
  // 上传相关
  upload: {
    success: (filename: string): Notification => ({
      type: "success",
      title: "上传成功",
      description: `图片 ${filename} 已成功上传`,
      duration: 3000,
    }),
    error: (reason?: string): Notification => ({
      type: "error",
      title: "上传失败",
      description: reason || "请检查网络连接后重试",
      duration: 5000,
    }),
    oversized: (maxSize: string): Notification => ({
      type: "error",
      title: "文件过大",
      description: `文件大小超过限制 ${maxSize}`,
      duration: 5000,
    }),
    invalidType: (): Notification => ({
      type: "error",
      title: "不支持的文件类型",
      description: "请上传 JPG、PNG、GIF 或 WEBP 格式的图片",
      duration: 5000,
    }),
    quotaExceeded: (): Notification => ({
      type: "warning",
      title: "上传配额已用完",
      description: "今日上传次数已达上限，请明天再试",
      duration: 6000,
    }),
    frequencyLimit: (waitTime: string): Notification => ({
      type: "warning",
      title: "上传频率过高",
      description: `请等待 ${waitTime} 后重试`,
      duration: 5000,
    }),
    contentModerated: (reason?: string): Notification => ({
      type: "error",
      title: "内容审核未通过",
      description: reason || "上传的内容违反使用条款",
      duration: 6000,
    }),
  },

  // IP封禁相关
  ipBan: {
    banned: (reason?: string, duration?: string): Notification => ({
      type: "error",
      title: "IP已被封禁",
      description: reason
        ? `${reason}。${duration || "24小时"}后可解封`
        : `您的IP已被临时封禁，请${duration || "24小时"}后再试`,
      duration: 8000,
    }),
    unbanned: (): Notification => ({
      type: "success",
      title: "IP已解封",
      description: "您现在可以正常使用服务了",
      duration: 3000,
    }),
    blockWarning: (attempts: number): Notification => ({
      type: "warning",
      title: "警告",
      description: `您的操作异常，再失败${attempts}次将被封禁`,
      duration: 6000,
    }),
  },

  // 认证相关
  auth: {
    loginRequired: (): Notification => ({
      type: "warning",
      title: "需要登录",
      description: "请先登录 GitHub 账号",
      duration: 5000,
    }),
    loginSuccess: (): Notification => ({
      type: "success",
      title: "登录成功",
      description: "欢迎回来！",
      duration: 3000,
    }),
    logoutSuccess: (): Notification => ({
      type: "info",
      title: "已登出",
      description: "期待再次使用",
      duration: 3000,
    }),
    tokenExpired: (): Notification => ({
      type: "warning",
      title: "登录已过期",
      description: "请重新登录",
      duration: 5000,
    }),
  },

  // 管理员相关
  admin: {
    accessDenied: (): Notification => ({
      type: "error",
      title: "无权限访问",
      description: "您不是管理员",
      duration: 5000,
    }),
    tokenInvalid: (): Notification => ({
      type: "error",
      title: "管理员令牌无效",
      description: "请检查令牌是否正确",
      duration: 5000,
    }),
    banSuccess: (ip: string): Notification => ({
      type: "success",
      title: "封禁成功",
      description: `IP ${ip} 已被添加到黑名单`,
      duration: 3000,
    }),
    unbanSuccess: (ip: string): Notification => ({
      type: "success",
      title: "解封成功",
      description: `IP ${ip} 已从黑名单移除`,
      duration: 3000,
    }),
  },

  // 图片相关
  image: {
    deleteSuccess: (): Notification => ({
      type: "success",
      title: "删除成功",
      description: "图片已从您的画廊中移除",
      duration: 3000,
    }),
    deleteError: (): Notification => ({
      type: "error",
      title: "删除失败",
      description: "请稍后重试",
      duration: 5000,
    }),
    copySuccess: (): Notification => ({
      type: "success",
      title: "已复制",
      description: "图片链接已复制到剪贴板",
      duration: 2000,
    }),
    loadError: (): Notification => ({
      type: "error",
      title: "加载失败",
      description: "无法加载图片，请刷新重试",
      duration: 5000,
    }),
  },

  // 网络相关
  network: {
    offline: (): Notification => ({
      type: "warning",
      title: "网络离线",
      description: "请检查网络连接",
      duration: 5000,
    }),
    slowConnection: (): Notification => ({
      type: "info",
      title: "网络较慢",
      description: "上传可能需要更长时间",
      duration: 5000,
    }),
    timeout: (): Notification => ({
      type: "error",
      title: "请求超时",
      description: "请稍后重试",
      duration: 5000,
    }),
  },

  // 系统相关
  system: {
    maintenance: (): Notification => ({
      type: "info",
      title: "系统维护中",
      description: "服务暂时不可用，请稍后再试",
      duration: 6000,
    }),
    rateLimit: (retryAfter: number): Notification => ({
      type: "warning",
      title: "请求过于频繁",
      description: `请等待 ${retryAfter} 秒后重试`,
      duration: 5000,
    }),
    serverError: (): Notification => ({
      type: "error",
      title: "服务器错误",
      description: "请稍后重试或联系客服",
      duration: 5000,
    }),
  },

  // 配额相关
  quota: {
    approaching: (percentage: number): Notification => ({
      type: "warning",
      title: "配额即将用尽",
      description: `您已使用 ${percentage}% 的配额`,
      duration: 6000,
    }),
    exceeded: (resetTime: string): Notification => ({
      type: "warning",
      title: "配额已用完",
      description: `配额将在 ${resetTime} 重置`,
      duration: 6000,
    }),
    reset: (): Notification => ({
      type: "success",
      title: "配额已重置",
      description: "您现在可以继续上传了",
      duration: 3000,
    }),
  },
};

// 通知工具函数
export class NotificationService {
  private static toastHandler: ((notification: Notification) => void) | null = null;

  static setToastHandler(handler: (notification: Notification) => void) {
    NotificationService.toastHandler = handler;
  }

  static show(notification: Notification) {
    if (NotificationService.toastHandler) {
      NotificationService.toastHandler(notification);
    } else {
      console.warn("Notification service not initialized");
    }
  }

  static success(title: string, description?: string) {
    NotificationService.show({ type: "success", title, description });
  }

  static error(title: string, description?: string) {
    NotificationService.show({ type: "error", title, description });
  }

  static warning(title: string, description?: string) {
    NotificationService.show({ type: "warning", title, description });
  }

  static info(title: string, description?: string) {
    NotificationService.show({ type: "info", title, description });
  }
}
