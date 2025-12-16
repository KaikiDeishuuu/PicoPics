# 修复 Admin Panel 图片显示问题

## 问题描述

Admin Panel 的数据管理页面中，图片缩略图无法加载，F12 显示还在使用旧的 CDN 地址：

```
https://cdn-worker-v2-prod.haoweiw370.workers.dev/1765895203208-b5n8q48tv.jpeg
```

## 根本原因

后端 `workers/uploader.ts` 在返回图片列表时（line 2119），使用了环境变量 `CDN_BASE_URL`：

```typescript
url: `${c.env.CDN_BASE_URL || "https://your-cdn-worker.workers.dev"}/${row.r2_object_key}`,
```

但该环境变量在 Cloudflare Workers 中**没有正确配置**，导致使用了旧的或默认的 CDN 地址。

## 解决方案

### 方案 1：在 Cloudflare Dashboard 配置环境变量（推荐）

1. 登录 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 找到你的 `uploader-worker-v2-prod` worker
4. 进入 Settings → Variables
5. 添加环境变量：
   - **变量名**：`CDN_BASE_URL`
   - **值**：`https://image.hiaplha.xyz`
6. 保存后重新部署 worker

### 方案 2：使用 Wrangler CLI 配置

```bash
# 设置环境变量
wrangler secret put CDN_BASE_URL --env production
# 输入: https://image.hiaplha.xyz

# 或者使用 vars (非敏感配置)
# 在 wrangler.toml 中添加：
[env.production.vars]
CDN_BASE_URL = "https://image.hiaplha.xyz"
```

### 方案 3：创建 uploader-wrangler.toml 配置文件

在 `workers/` 目录创建 `uploader-wrangler.toml`：

```toml
name = "uploader-worker-v2-prod"
main = "uploader.ts"
compatibility_date = "2024-01-01"

[vars]
CDN_BASE_URL = "https://image.hiaplha.xyz"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "your-bucket-name"

[[d1_databases]]
binding = "DB"
database_name = "your-database-name"
database_id = "your-database-id"
```

然后部署：

```bash
cd workers
wrangler deploy --config uploader-wrangler.toml
```

## 验证修复

1. 配置完成后，重新部署 worker
2. 打开 Admin Panel → 数据管理
3. 检查图片 URL 是否已更新为 `https://image.hiaplha.xyz/...`
4. 确认图片能正常显示

## 相关代码位置

- 后端 API：`workers/uploader.ts` line 2083-2130 (`/api/admin/images`)
- 前端显示：`app/admin/page.tsx` line 1007
- 环境变量使用：`workers/uploader.ts` line 2119

## 注意事项

- 修改环境变量后需要重新部署 worker 才能生效
- 确保 CDN worker 本身也正常工作
- Gallery 页面也使用相同的 API，修复后两个页面都会正常显示
