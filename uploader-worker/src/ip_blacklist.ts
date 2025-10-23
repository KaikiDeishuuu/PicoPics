/**
 * IP Blacklist Durable Object
 *
 * 功能：
 * - 追踪 IP 上传频率
 * - 自动封禁滥用 IP
 * - 持久化黑名单
 */

export interface IPRecord {
  ip: string;
  uploadCount: number;
  totalBytes: number;
  firstUploadTime: number;
  lastUploadTime: number;
  violations: number;
  banned: boolean;
  banExpiry?: number;
  // 新增：时间窗口内的上传记录
  uploadTimestamps: number[]; // 存储最近的上传时间戳
}

// 滥用检测配置
const ABUSE_THRESHOLDS = {
  // 短时间内大量上传
  MAX_UPLOADS_PER_MINUTE: 20, // 1分钟内最多20次上传
  MAX_UPLOADS_PER_HOUR: 100, // 1小时内最多100次上传
  MAX_UPLOADS_PER_DAY: 500, // 1天内最多500次上传

  // 流量限制
  MAX_BYTES_PER_HOUR: 200 * 1024 * 1024, // 1小时内最多 200MB
  MAX_BYTES_PER_DAY: 1000 * 1024 * 1024, // 1天内最多 1000MB

  // 封禁时长
  BAN_DURATION_FIRST: 1 * 60 * 60 * 1000, // 首次违规：1小时
  BAN_DURATION_SECOND: 24 * 60 * 60 * 1000, // 二次违规：24小时
  BAN_DURATION_PERMANENT: 30 * 24 * 60 * 60 * 1000, // 三次及以上：30天
};

export default class IPBlacklist {
  private state: DurableObjectState;
  private storage: DurableObjectStorage;

  constructor(state: DurableObjectState, _env: any) {
    this.state = state;
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 检查 IP 是否被封禁
    if (path === "/check" && request.method === "POST") {
      const { ip } = (await request.json()) as { ip: string };
      const result = await this.checkIP(ip);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 记录上传行为
    if (path === "/record" && request.method === "POST") {
      const { ip, bytes } = (await request.json()) as {
        ip: string;
        bytes: number;
      };
      const result = await this.recordUpload(ip, bytes);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 封禁 IP
    if (path === "/ban" && request.method === "POST") {
      const { ip, duration } = (await request.json()) as {
        ip: string;
        duration?: number;
      };
      await this.banIP(ip, duration);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 解封 IP
    if (path === "/unban" && request.method === "POST") {
      const { ip } = (await request.json()) as { ip: string };
      await this.unbanIP(ip);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 获取统计信息
    if (path === "/stats" && request.method === "GET") {
      const stats = await this.getStats();
      return new Response(JSON.stringify(stats, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 列出所有 IP 记录（管理员/内部使用）
    if (path === "/list" && request.method === "GET") {
      // 支持查询参数：bannedOnly=true
      const url = new URL(request.url);
      const bannedOnly = url.searchParams.get("bannedOnly") === "true";

      const allKeys = await this.storage.list<IPRecord>({ prefix: "ip:" });
      const records = Array.from(allKeys.values());

      const filtered = bannedOnly ? records.filter((r) => r.banned) : records;

      return new Response(
        JSON.stringify({
          success: true,
          total: records.length,
          returned: filtered.length,
          data: filtered,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  }

  /**
   * 检查 IP 是否被封禁
   */
  private async checkIP(
    ip: string
  ): Promise<{ allowed: boolean; reason?: string; record?: IPRecord }> {
    const record = await this.getIPRecord(ip);

    if (!record) {
      return { allowed: true };
    }

    // 检查是否被封禁
    if (record.banned) {
      if (record.banExpiry && Date.now() > record.banExpiry) {
        // 封禁已过期，解封
        await this.unbanIP(ip);
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `IP已被封禁，解封时间：${
          record.banExpiry
            ? new Date(record.banExpiry).toLocaleString("zh-CN")
            : "永久"
        }`,
        record,
      };
    }

    return { allowed: true, record };
  }

  /**
   * 记录上传行为并检测滥用
   */
  private async recordUpload(
    ip: string,
    bytes: number
  ): Promise<{
    allowed: boolean;
    reason?: string;
    banned?: boolean;
    record?: IPRecord;
  }> {
    const now = Date.now();
    let record = await this.getIPRecord(ip);

    if (!record) {
      // 新 IP
      record = {
        ip,
        uploadCount: 0,
        totalBytes: 0,
        firstUploadTime: now,
        lastUploadTime: now,
        violations: 0,
        banned: false,
        uploadTimestamps: [],
      };
    }

    // 更新记录
    record.uploadCount++;
    record.totalBytes += bytes;
    record.lastUploadTime = now;
    record.uploadTimestamps.push(now);

    // 清理过期的时间戳（只保留最近24小时的记录）
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    record.uploadTimestamps = record.uploadTimestamps.filter(
      (ts) => ts > oneDayAgo
    );

    // 滥用检测
    const abuseCheck = this.detectAbuse(record);

    if (abuseCheck.isAbuse) {
      // 违规次数+1
      record.violations++;

      // 根据违规次数确定封禁时长
      let banDuration: number;
      if (record.violations === 1) {
        banDuration = ABUSE_THRESHOLDS.BAN_DURATION_FIRST;
      } else if (record.violations === 2) {
        banDuration = ABUSE_THRESHOLDS.BAN_DURATION_SECOND;
      } else {
        banDuration = ABUSE_THRESHOLDS.BAN_DURATION_PERMANENT;
      }

      // 封禁
      record.banned = true;
      record.banExpiry = now + banDuration;

      await this.storage.put(`ip:${ip}`, record);

      return {
        allowed: false,
        reason: abuseCheck.reason,
        banned: true,
        record,
      };
    }

    // 保存记录
    await this.storage.put(`ip:${ip}`, record);

    return { allowed: true, record };
  }

  /**
   * 滥用检测逻辑
   */
  private detectAbuse(record: IPRecord): { isAbuse: boolean; reason?: string } {
    const now = Date.now();

    // 计算各个时间窗口内的上传次数
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const uploadsLastMinute = record.uploadTimestamps.filter(
      (ts) => ts > oneMinuteAgo
    ).length;
    const uploadsLastHour = record.uploadTimestamps.filter(
      (ts) => ts > oneHourAgo
    ).length;
    const uploadsLastDay = record.uploadTimestamps.filter(
      (ts) => ts > oneDayAgo
    ).length;

    // 1分钟内上传次数检测
    if (uploadsLastMinute > ABUSE_THRESHOLDS.MAX_UPLOADS_PER_MINUTE) {
      return {
        isAbuse: true,
        reason: `1分钟内上传次数过多（${uploadsLastMinute}次，限制${ABUSE_THRESHOLDS.MAX_UPLOADS_PER_MINUTE}次）`,
      };
    }

    // 1小时内上传次数检测
    if (uploadsLastHour > ABUSE_THRESHOLDS.MAX_UPLOADS_PER_HOUR) {
      return {
        isAbuse: true,
        reason: `1小时内上传次数过多（${uploadsLastHour}次，限制${ABUSE_THRESHOLDS.MAX_UPLOADS_PER_HOUR}次）`,
      };
    }

    // 1天内上传次数检测
    if (uploadsLastDay > ABUSE_THRESHOLDS.MAX_UPLOADS_PER_DAY) {
      return {
        isAbuse: true,
        reason: `24小时内上传次数过多（${uploadsLastDay}次，限制${ABUSE_THRESHOLDS.MAX_UPLOADS_PER_DAY}次）`,
      };
    }

    // 流量限制检测
    const bytesLastHour = record.totalBytes; // 简化处理，实际应该也按时间窗口计算
    if (bytesLastHour > ABUSE_THRESHOLDS.MAX_BYTES_PER_HOUR) {
      return {
        isAbuse: true,
        reason: `1小时内上传流量过大（${(bytesLastHour / 1024 / 1024).toFixed(
          2
        )}MB，限制${ABUSE_THRESHOLDS.MAX_BYTES_PER_HOUR / 1024 / 1024}MB）`,
      };
    }

    const bytesLastDay = record.totalBytes;
    if (bytesLastDay > ABUSE_THRESHOLDS.MAX_BYTES_PER_DAY) {
      return {
        isAbuse: true,
        reason: `24小时内上传流量过大（${(bytesLastDay / 1024 / 1024).toFixed(
          2
        )}MB，限制${ABUSE_THRESHOLDS.MAX_BYTES_PER_DAY / 1024 / 1024}MB）`,
      };
    }

    return { isAbuse: false };
  }

  /**
   * 手动封禁 IP
   */
  private async banIP(ip: string, duration?: number): Promise<void> {
    let record = await this.getIPRecord(ip);

    if (!record) {
      record = {
        ip,
        uploadCount: 0,
        totalBytes: 0,
        firstUploadTime: Date.now(),
        lastUploadTime: Date.now(),
        violations: 0,
        banned: false,
        uploadTimestamps: [],
      };
    }

    record.banned = true;
    if (duration) {
      record.banExpiry = Date.now() + duration;
    }

    await this.storage.put(`ip:${ip}`, record);
  }

  /**
   * 解封 IP
   */
  private async unbanIP(ip: string): Promise<void> {
    const record = await this.getIPRecord(ip);

    if (record) {
      record.banned = false;
      delete record.banExpiry;
      await this.storage.put(`ip:${ip}`, record);
    }
  }

  /**
   * 获取 IP 记录
   */
  private async getIPRecord(ip: string): Promise<IPRecord | null> {
    return (await this.storage.get<IPRecord>(`ip:${ip}`)) || null;
  }

  /**
   * 获取统计信息
   */
  private async getStats(): Promise<any> {
    const allKeys = await this.storage.list<IPRecord>({ prefix: "ip:" });
    const records = Array.from(allKeys.values());

    const bannedCount = records.filter((r) => r.banned).length;
    const totalIPs = records.length;
    const totalUploads = records.reduce((sum, r) => sum + r.uploadCount, 0);
    const totalBytes = records.reduce((sum, r) => sum + r.totalBytes, 0);

    return {
      totalIPs,
      bannedCount,
      totalUploads,
      totalBytes,
      totalBytesMB: (totalBytes / 1024 / 1024).toFixed(2),
      thresholds: ABUSE_THRESHOLDS,
    };
  }
}
