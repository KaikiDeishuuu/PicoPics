# 自定义域名配置指南

## 为什么需要自定义域名？

1. **隐藏 Cloudflare 用户名** - 避免暴露 `haoweiw370.workers.dev`
2. **品牌化** - 使用自己的域名更专业
3. **安全性** - 更难被扫描和攻击

## 推荐域名方案

假设你有域名 `yourdomain.com`，可以配置：

```
api.yourdomain.com          -> uploader-worker-v2-prod
history.yourdomain.com      -> history-worker-v2-prod
cdn.yourdomain.com          -> cdn-worker-v2-prod
image.yourdomain.com        -> R2 bucket (已有 image.hiaplha.xyz)
```

## 配置步骤

### 1. 在 Cloudflare Dashboard 添加自定义域名

对于每个 Worker:

1. 打开 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 选择对应的 Worker (如 `uploader-worker-v2-prod`)
4. 点击 Settings → Triggers
5. 在 Custom Domains 部分，点击 Add Custom Domain
6. 输入子域名 (如 `api.yourdomain.com`)
7. Cloudflare 会自动创建 DNS 记录

### 2. 通过 wrangler.toml 配置 (推荐)

在 `workers/uploader-wrangler.toml` 中添加：

```toml
[route]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
```

### 3. 部署时自动绑定

```bash
npx wrangler deploy --config uploader-wrangler.toml
```

## 更新环境变量

配置好自定义域名后，更新 Vercel 环境变量：

```env
NEXT_PUBLIC_UPLOAD_API=https://api.yourdomain.com
NEXT_PUBLIC_HISTORY_API=https://history.yourdomain.com
NEXT_PUBLIC_CDN_BASE=https://image.yourdomain.com
```

## 临时方案：限制访问来源

如果暂时无法配置自定义域名，可以在 Worker 中添加来源限制：

```typescript
// 在 worker 开头添加
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin") || c.req.header("Referer");
  const allowedOrigins = [
    "https://your-app.vercel.app",
    "https://yourdomain.com",
  ];

  if (origin && !allowedOrigins.some((allowed) => origin.includes(allowed))) {
    return c.json({ error: "Unauthorized origin" }, 403);
  }

  await next();
});
```

## 迁移检查清单

- [ ] 为所有 Workers 配置自定义域名
- [ ] 更新 Vercel 环境变量
- [ ] 更新 `.env.local` 和 `.env.template`
- [ ] 更新代码中的 fallback URLs
- [ ] 测试所有 API 端点
- [ ] 更新文档
