// Telegram Bot通知服务

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface TelegramMessage {
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  disable_notification?: boolean;
  reply_markup?: any;
}

class TelegramBotService {
  private config: TelegramConfig | null = null;

  /**
   * 初始化Telegram Bot配置
   */
  init(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * 发送Telegram消息
   */
  async sendMessage(message: TelegramMessage): Promise<boolean> {
    if (!this.config) {
      console.warn("Telegram Bot not configured");
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          ...message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Telegram API error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Telegram send error:", error);
      return false;
    }
  }

  /**
   * 格式化消息内容
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ========== 预定义的通知消息 ==========

  /**
   * 图片上传通知
   */
  async notifyImageUploaded(data: {
    userId: string;
    filename: string;
    size: number;
    url?: string;
  }): Promise<boolean> {
    const sizeMB = (data.size / 1024 / 1024).toFixed(2);
    const text = `
📤 <b>图片上传成功</b>

👤 用户ID: <code>${this.escapeHtml(data.userId)}</code>
📷 文件名: <code>${this.escapeHtml(data.filename)}</code>
📊 大小: ${sizeMB} MB
🔗 链接: ${data.url ? `<a href="${data.url}">查看图片</a>` : "N/A"}
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    return this.sendMessage({
      text,
      parse_mode: "HTML",
      disable_notification: false,
    });
  }

  /**
   * 图片删除通知
   */
  async notifyImageDeleted(data: {
    userId: string;
    filename: string;
    r2ObjectKey: string;
  }): Promise<boolean> {
    const text = `
🗑️ <b>图片已删除</b>

👤 用户ID: <code>${this.escapeHtml(data.userId)}</code>
📷 文件名: <code>${this.escapeHtml(data.filename)}</code>
🔑 对象键: <code>${this.escapeHtml(data.r2ObjectKey)}</code>
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    return this.sendMessage({
      text,
      parse_mode: "HTML",
      disable_notification: true,
    });
  }

  /**
   * IP封禁通知
   */
  async notifyIPBanned(data: {
    ip: string;
    reason: string;
    duration: string;
    bannedBy?: string;
  }): Promise<boolean> {
    const text = `
🚫 <b>IP已封禁</b>

🌐 IP地址: <code>${this.escapeHtml(data.ip)}</code>
📝 原因: ${this.escapeHtml(data.reason)}
⏰ 时长: ${this.escapeHtml(data.duration)}
👮 操作者: ${data.bannedBy ? this.escapeHtml(data.bannedBy) : "系统"}
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    return this.sendMessage({
      text,
      parse_mode: "HTML",
      disable_notification: false,
    });
  }

  /**
   * IP解封通知
   */
  async notifyIPUnbanned(data: {
    ip: string;
    unbannedBy?: string;
  }): Promise<boolean> {
    const text = `
✅ <b>IP已解封</b>

🌐 IP地址: <code>${this.escapeHtml(data.ip)}</code>
👮 操作者: ${data.unbannedBy ? this.escapeHtml(data.unbannedBy) : "系统"}
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    return this.sendMessage({
      text,
      parse_mode: "HTML",
      disable_notification: true,
    });
  }

  /**
   * 内容审核通知
   */
  async notifyContentModeration(data: {
    userId: string;
    filename: string;
    reason: string;
    confidence?: number;
  }): Promise<boolean> {
    const text = `
⚠️ <b>内容审核未通过</b>

👤 用户ID: <code>${this.escapeHtml(data.userId)}</code>
📷 文件名: <code>${this.escapeHtml(data.filename)}</code>
❌ 原因: ${this.escapeHtml(data.reason)}
${data.confidence ? `🔍 置信度: ${(data.confidence * 100).toFixed(1)}%` : ""}
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    return this.sendMessage({
      text,
      parse_mode: "HTML",
      disable_notification: false,
    });
  }

  /**
   * 配额超限通知
   */
  async notifyQuotaExceeded(data: {
    userId: string;
    quotaType: string;
    limit: string;
  }): Promise<boolean> {
    const text = `
⚠️ <b>配额超限</b>

👤 用户ID: <code>${this.escapeHtml(data.userId)}</code>
📊 类型: ${this.escapeHtml(data.quotaType)}
🔢 限制: ${this.escapeHtml(data.limit)}
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    return this.sendMessage({
      text,
      parse_mode: "HTML",
      disable_notification: true,
    });
  }

  /**
   * 系统错误通知
   */
  async notifySystemError(data: {
    error: string;
    endpoint?: string;
    details?: string;
  }): Promise<boolean> {
    const text = `
🔴 <b>系统错误</b>

❌ 错误: <code>${this.escapeHtml(data.error)}</code>
${data.endpoint ? `🔗 端点: <code>${this.escapeHtml(data.endpoint)}</code>` : ""}
${data.details ? `📝 详情:\n<pre>${this.escapeHtml(data.details)}</pre>` : ""}
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    return this.sendMessage({
      text,
      parse_mode: "HTML",
      disable_notification: false,
    });
  }

  /**
   * 管理员操作通知
   */
  async notifyAdminAction(data: {
    admin: string;
    action: string;
    target?: string;
    details?: string;
  }): Promise<boolean> {
    const text = `
👮 <b>管理员操作</b>

👤 管理员: <code>${this.escapeHtml(data.admin)}</code>
⚙️ 操作: ${this.escapeHtml(data.action)}
${data.target ? `🎯 目标: <code>${this.escapeHtml(data.target)}</code>` : ""}
${data.details ? `📝 详情: ${this.escapeHtml(data.details)}` : ""}
🕐 时间: ${new Date().toLocaleString("zh-CN")}
    `.trim();

    return this.sendMessage({
      text,
      parse_mode: "HTML",
      disable_notification: true,
    });
  }
}

// 单例实例
export const telegramBot = new TelegramBotService();
