# 快速部署指南

按照本指南 10 分钟内完成部署。

## 前置要求

- Cloudflare 账户
- 已创建 R2 存储桶
- Node.js 18+ 和 npm
- Wrangler CLI (`npm install -g wrangler`)

## 步骤 1：获取账户信息

```bash
# 登录 Cloudflare
wrangler login

# 获取账户 ID
wrangler whoami
```

记下你的 **Account ID**。

## 步骤 2：部署 Uploader Worker

```bash
cd uploader-worker

# 安装依赖
npm install

# 编辑配置文件
nano wrangler.toml
```

修改以下内容：

```toml
account_id = "你的账户ID"  # 替换为第 1 步获取的 ID

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "你的存储桶名称"  # 替换为你的 R2 存储桶

[vars]
R2_PUBLIC_BASE = "https://pic.yourdomain.com"  # 你的 CDN 域名（稍后配置）
```

部署：

```bash
npm run deploy:prod
```

记下部署后的 URL，例如：`https://uploader-worker-prod.你的账户.workers.dev`

## 步骤 3：部署 CDN Worker

```bash
cd ../cdn-worker

# 安装依赖
npm install

# 编辑配置文件
nano wrangler.toml
```

修改以下内容：

```toml
account_id = "你的账户ID"  # 同步骤 2

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "你的存储桶名称"  # 同步骤 2

# 如果要绑定自定义域名，取消注释并修改
routes = [
  { pattern = "pic.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

部署：

```bash
npm run deploy:prod
```

记下部署后的 URL 或绑定的域名。

## 步骤 4：配置域名（可选但推荐）

### 4.1 在 Cloudflare DNS 中添加记录

登录 Cloudflare Dashboard → DNS → 添加记录：

| 类型  | 名称   | 内容                                      | 代理状态            |
| ----- | ------ | ----------------------------------------- | ------------------- |
| CNAME | upload | uploader-worker-prod.你的账户.workers.dev | ✅ 代理（橙色云朵） |
| CNAME | pic    | cdn-worker-prod.你的账户.workers.dev      | ✅ 代理（橙色云朵） |

### 4.2 更新 Workers 配置

回到 `uploader-worker/wrangler.toml`，更新：

```toml
[env.production.vars]
R2_PUBLIC_BASE = "https://pic.yourdomain.com"  # 使用你的实际域名
```

重新部署：

```bash
cd uploader-worker
npm run deploy:prod
```

## 步骤 5：部署前端

```bash
cd ../CFworkerImageFRONTED

# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
nano .env.local
```

设置：

```env
NEXT_PUBLIC_UPLOAD_API=https://upload.yourdomain.com/upload
# 或者使用 Worker 默认域名：
# NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-prod.你的账户.workers.dev/upload
```

### 5.1 部署到 Cloudflare Pages

```bash
# 构建
npm run build

# 部署
wrangler pages deploy .next --project-name=image-uploader
```

或者通过 Cloudflare Dashboard：

1. 进入 **Workers & Pages** → **Create application** → **Pages**
2. 连接你的 Git 仓库
3. 配置构建设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `CFworkerImageFRONTED`
4. 添加环境变量：
   - `NEXT_PUBLIC_UPLOAD_API`: 你的上传 API 地址
5. **保存并部署**

## 步骤 6：测试

### 6.1 测试上传功能

```bash
# 测试上传 Worker
curl -X POST \
  https://upload.yourdomain.com/upload \
  -H "Content-Type: image/jpeg" \
  --data-binary @test.jpg
```

应该返回：

```json
{
  "success": true,
  "url": "https://pic.yourdomain.com/abc123.jpg",
  "fileName": "abc123.jpg",
  ...
}
```

### 6.2 测试分发功能

在浏览器中访问返回的图片 URL，应该能看到图片。

### 6.3 测试前端

访问你的 Pages 域名（如 `https://image-uploader.pages.dev`），尝试上传图片。

## 步骤 7：查看配额状态

```bash
curl https://upload.yourdomain.com/quota
```

输出：

```json
{
  "usedBytes": 0,
  "remainingBytes": 2097152000,
  "date": "2025-10-21"
}
```

## 故障排查

### 问题 1：上传失败，提示 "Quota service unavailable"

**原因**：Durable Object 未正确绑定。

**解决**：

1. 确保 `wrangler.toml` 中有：

   ```toml
   [[durable_objects.bindings]]
   name = "UPLOAD_QUOTA"
   class_name = "UploadQuota"
   script_name = "uploader-worker-prod"  # 确保与 [env.production] 下的 name 一致
   ```

2. 重新部署：
   ```bash
   npm run deploy:prod
   ```

### 问题 2：图片无法访问

**原因**：CDN Worker 未绑定或 R2 存储桶配置错误。

**解决**：

1. 检查 `cdn-worker/wrangler.toml` 中的 R2 绑定
2. 确保 `uploader-worker` 的 `R2_PUBLIC_BASE` 指向 CDN Worker 的域名
3. 检查 Cloudflare DNS 代理状态（橙色云朵）

### 问题 3：CORS 错误

**原因**：CORS 配置不正确。

**解决**：

在两个 Worker 的 `wrangler.toml` 中设置：

```toml
[vars]
ALLOWED_ORIGINS = "https://yourdomain.com,https://www.yourdomain.com"
```

重新部署。

## 下一步

- ✅ 配置自定义域名
- ✅ 调整配额限制
- ✅ 启用 Cloudflare WAF
- ✅ 配置 Cloudflare Analytics
- ✅ 设置告警规则

## 快速命令总结

```bash
# 部署 Uploader Worker
cd uploader-worker && npm install && npm run deploy:prod

# 部署 CDN Worker
cd ../cdn-worker && npm install && npm run deploy:prod

# 部署前端
cd ../CFworkerImageFRONTED && npm install && npm run build && wrangler pages deploy .next

# 查看日志
wrangler tail --name uploader-worker-prod
wrangler tail --name cdn-worker-prod
```



