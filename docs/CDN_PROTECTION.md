# CDN 防盗刷方案

## 当前风险

你的 CDN `https://image.hiaplha.xyz` 目前是公开的，任何人都可以：

1. 直接访问图片 URL
2. 在其他网站引用你的图片
3. 大量请求消耗你的流量

## 多层防护方案

### 方案 1: Referer 白名单（简单有效）

在 CDN Worker 中检查 Referer 头：

```typescript
// workers/cdn.ts
app.use("*", async (c, next) => {
  const referer = c.req.header("Referer");
  const allowedReferers = [
    "https://your-app.vercel.app",
    "https://yourdomain.com",
    "https://image.hiaplha.xyz", // 允许直接访问预览
  ];

  // 无 Referer (直接访问/API调用) 允许
  // 有 Referer 时检查白名单
  if (
    referer &&
    !allowedReferers.some((allowed) => referer.includes(allowed))
  ) {
    return c.text("Forbidden: Invalid referer", 403);
  }

  await next();
});
```

### 方案 2: 签名 URL（最安全）

生成带时效性的签名 URL：

**在 uploader worker 生成签名 URL:**

```typescript
// 生成签名
async function generateSignedUrl(
  key: string,
  expiresIn: number = 3600 // 1小时
): Promise<string> {
  const expires = Date.now() + expiresIn * 1000;
  const message = `${key}:${expires}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const secret = encoder.encode(env.CDN_SECRET); // 配置密钥

  const hashBuffer = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", hashBuffer, data);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `https://image.hiaplha.xyz/${key}?expires=${expires}&signature=${signatureHex}`;
}
```

**在 CDN worker 验证签名:**

```typescript
// workers/cdn.ts
async function verifySignature(
  key: string,
  expires: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // 检查是否过期
  if (Date.now() > parseInt(expires)) {
    return false;
  }

  // 验证签名
  const message = `${key}:${expires}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const secretKey = encoder.encode(secret);

  const hashBuffer = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const expectedSignature = await crypto.subtle.sign("HMAC", hashBuffer, data);
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedHex === signature;
}

app.get("/:key", async (c) => {
  const key = c.req.param("key");
  const expires = c.req.query("expires");
  const signature = c.req.query("signature");

  // 如果有签名参数，进行验证
  if (signature && expires) {
    const isValid = await verifySignature(
      key,
      expires,
      signature,
      c.env.CDN_SECRET
    );

    if (!isValid) {
      return c.text("Invalid or expired signature", 403);
    }
  } else {
    // 没有签名时，检查 Referer
    const referer = c.req.header("Referer");
    if (!referer || !isAllowedReferer(referer)) {
      return c.text("Forbidden", 403);
    }
  }

  // 返回图片
  const object = await c.env.BUCKET.get(key);
  if (!object) return c.notFound();

  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
    },
  });
});
```

### 方案 3: 速率限制

使用 Cloudflare Rate Limiting 或 Durable Objects:

```typescript
// workers/cdn.ts
class RateLimiter {
  state: DurableObjectState;

  async fetch(request: Request): Promise<Response> {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const key = `rate:${ip}`;

    const count = (await this.state.storage.get<number>(key)) || 0;
    const now = Date.now();

    // 每分钟最多100个请求
    if (count > 100) {
      return new Response("Too Many Requests", { status: 429 });
    }

    await this.state.storage.put(key, count + 1);

    // 1分钟后重置
    await this.state.storage.setAlarm(now + 60000);

    return new Response("OK");
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }
}
```

### 方案 4: User-Agent 过滤

阻止常见的爬虫和下载工具：

```typescript
const blockedUserAgents = [
  /wget/i,
  /curl/i,
  /python-requests/i,
  /bot/i,
  /crawler/i,
  /spider/i,
];

app.use("*", async (c, next) => {
  const userAgent = c.req.header("User-Agent") || "";

  if (blockedUserAgents.some((pattern) => pattern.test(userAgent))) {
    return c.text("Forbidden", 403);
  }

  await next();
});
```

## 推荐实施顺序

1. **立即实施**: Referer 白名单
2. **中期**: 速率限制
3. **长期**: 签名 URL（如果需要更高安全性）
4. **可选**: User-Agent 过滤

## Cloudflare 原生防护

在 Cloudflare Dashboard 中启用：

1. **WAF (Web Application Firewall)**

   - Security → WAF
   - 启用 Managed Rules

2. **Rate Limiting**

   - Security → WAF → Rate limiting rules
   - 创建规则：100 requests/minute per IP

3. **Hotlink Protection**

   - Scrape Shield → Enable Hotlink Protection

4. **Bot Fight Mode**
   - Security → Bots → 启用

## 监控和告警

设置 Cloudflare Workers Analytics:

```typescript
// 在 worker 中记录可疑请求
if (suspicious) {
  console.warn("Suspicious request:", {
    ip: c.req.header("CF-Connecting-IP"),
    referer: c.req.header("Referer"),
    userAgent: c.req.header("User-Agent"),
  });
}
```

在 Cloudflare Dashboard 查看：

- Workers → Analytics
- 设置告警：流量超过阈值时通知

## 成本控制

设置 Workers 用量限制：

1. Workers → Settings → Usage Model
2. 设置每日请求上限
3. 配置预算告警
