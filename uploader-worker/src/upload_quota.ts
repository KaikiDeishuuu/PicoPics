/**
 * Durable Object: UploadQuota
 *
 * 功能：追踪每日上传字节数（按 UTC 日期）
 * 限制：每天最多上传 2000MB（可配置）
 */

export default class UploadQuota {
  state: any;
  env: any;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }

  // 获取今天的键（UTC 日期）
  todayKey(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // POST /check-increase - 检查并增加配额
    if (request.method === "POST" && pathname.endsWith("/check-increase")) {
      try {
        const body = (await request.json()) as any;
        const bytes = Number(body.bytes || 0);

        if (isNaN(bytes) || bytes <= 0) {
          return new Response(JSON.stringify({ error: "invalid bytes" }), {
            status: 400,
          });
        }

        const key = this.todayKey();
        const stored = (await this.state.storage.get(key)) as
          | { usedBytes: number }
          | undefined;
        const used = stored?.usedBytes ?? 0;
        const dailyLimit = Number(
          this.env.DAILY_QUOTA_BYTES || 2097152000 // 默认 2000 MB
        );

        // 检查是否超过配额
        if (used + bytes > dailyLimit) {
          return new Response(
            JSON.stringify({
              allowed: false,
              remainingBytes: Math.max(0, dailyLimit - used),
              usedBytes: used,
            }),
            { status: 200 }
          );
        }

        // 更新已使用字节数
        const newUsed = used + bytes;
        await this.state.storage.put(key, { usedBytes: newUsed });

        return new Response(
          JSON.stringify({
            allowed: true,
            remainingBytes: Math.max(0, dailyLimit - newUsed),
            usedBytes: newUsed,
          }),
          { status: 200 }
        );
      } catch (e) {
        // Log error internally for diagnostics
        console.error('Error in /check-increase endpoint:', e);
        return new Response(
          JSON.stringify({
            error: "Internal server error",
          }),
          { status: 500 }
        );
      }
    }

    // GET /status - 查询当前配额状态
    if (request.method === "GET" && pathname.endsWith("/status")) {
      const key = this.todayKey();
      const stored = (await this.state.storage.get(key)) as
        | { usedBytes: number }
        | undefined;
      const used = stored?.usedBytes ?? 0;
      const dailyLimit = Number(this.env.DAILY_QUOTA_BYTES || 2097152000);

      return new Response(
        JSON.stringify({
          usedBytes: used,
          remainingBytes: Math.max(0, dailyLimit - used),
          date: this.todayKey(),
        }),
        { status: 200 }
      );
    }

    return new Response("Not found", { status: 404 });
  }
}
