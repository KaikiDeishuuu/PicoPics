# PicoPics 故障排查指南

## 🔍 常见问题诊断

### 1. 数据一致性问题 - R2 与 D1 不同步

#### 症状

- R2 存储桶为空，但历史记录仍显示文件
- Admin 后台统计数据不准确
- 删除文件后历史记录未更新

#### 原因分析

1. **删除操作不完整** - 只删除了 R2 对象，未删除 D1 数据库记录
2. **数据同步失败** - R2 和 D1 删除操作未原子化
3. **历史记录缓存** - 前端缓存了过时的数据

#### 解决方案

**步骤 1：使用清理 API 修复数据一致性**

```bash
curl -X DELETE "https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/api/admin/clean-all-invalid" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**步骤 2：验证数据一致性**

```bash
# 检查统计数据
curl -X GET "https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/api/admin/stats" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN"

# 检查历史记录
curl -X GET "https://history-worker-prod.YOUR_ACCOUNT.workers.dev/api/history" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN"
```

**步骤 3：前端状态同步**

- 确保前端使用全局状态管理
- 删除操作后自动刷新历史记录
- Admin 面板统计数据实时更新

### 2. 上传失败 - CORS 错误

#### 症状

```
Access to XMLHttpRequest at 'http://localhost:8787/upload' from origin 'https://xxx.pages.dev'
has been blocked by CORS policy: Request header field authorization is not allowed by
Access-Control-Allow-Headers in preflight response.
```

#### 原因分析

1. **前端指向本地环境** - `.env.local` 配置了 `localhost`
2. **CORS 配置不匹配** - Worker 的 `ALLOWED_ORIGINS` 未包含前端域名
3. **请求头不允许** - `Authorization` 头未在 CORS 配置中

#### 解决方案

**步骤 1：检查前端环境配置**

```bash
cd CFworkerImageFRONTED
cat .env.local
```

确保配置正确（**注意 /upload 后缀**）：

```bash
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/upload
NEXT_PUBLIC_HISTORY_API=https://history-worker-prod.YOUR_ACCOUNT.workers.dev
NEXT_PUBLIC_ADMIN_API=https://r2-browser-worker-prod.YOUR_ACCOUNT.workers.dev
NEXT_PUBLIC_CDN_URL=https://pic.YOUR_DOMAIN.com
```

**步骤 2：更新 CORS 配置**

```bash
# 编辑全局 .env
vim .env

# 确保 FRONTEND_DOMAINS 包含所有域名
FRONTEND_DOMAINS=yourdomain.com,your-project.pages.dev,*.your-project.pages.dev

# 重新配置
./configure.sh

# 重新部署 uploader-worker
cd uploader-worker
npx wrangler deploy --env production
```

**步骤 3：重新构建前端**

```bash
cd CFworkerImageFRONTED
npm run build
npx wrangler pages deploy out --project-name=cfworker-image-frontend --branch=production
```

**验证修复**

```bash
# 检查环境变量
cd CFworkerImageFRONTED
npm run build 2>&1 | grep "Environments"

# 应该显示：- Environments: .env.local
```

---

### 2. 图片预览空白

#### 症状

- 上传成功
- 显示上传成功消息
- Image Preview 区域是空白的

#### 原因

- Next.js Image 组件配置问题
- 外部图片域名未配置
- 图片 URL 无效

#### 解决方案

**检查 next.config.js**

```javascript
images: {
  unoptimized: true,
  domains: [
    "pic.lambdax.me",  // 你的 CDN 域名
    "localhost",
  ],
}
```

**检查 ResultDisplay 组件**

```typescript
<Image
  src={data.url}
  alt="Uploaded"
  width={1200}
  height={800}
  className="rounded-lg w-full h-auto object-contain max-h-96"
  unoptimized // 必须有这个属性
/>
```

---

### 3. GitHub 登录后历史记录为空

#### 症状

- GitHub 登录成功
- 历史记录显示空白或加载失败

#### 原因

- 历史记录 API 配置错误
- CORS 阻止访问
- 登录后未刷新历史

#### 解决方案

**检查历史 API 配置**

```bash
cd CFworkerImageFRONTED
cat .env.local | grep HISTORY
```

应该是：

```bash
NEXT_PUBLIC_HISTORY_API=https://history-worker-prod.YOUR_ACCOUNT.workers.dev
```

**检查 Worker CORS**

```bash
cd history-worker
npx wrangler tail --env production
```

然后在前端刷新页面，查看是否有 CORS 错误。

**更新 CORS 配置**

```bash
# 更新 history-worker 的 ALLOWED_ORIGINS
echo "https://yourdomain.com,https://your-project.pages.dev,https://*.your-project.pages.dev" | \
  npx wrangler secret put ALLOWED_ORIGINS --env production

# 重新部署
npx wrangler deploy --env production
```

---

### 4. 环境变量未生效

#### 症状

- 修改了 `.env` 或 `.env.local`
- 前端仍使用旧配置

#### 原因

- Next.js 构建时固化环境变量
- 未重新构建

#### 解决方案

**必须重新构建**

```bash
cd CFworkerImageFRONTED

# 删除旧构建
rm -rf .next out

# 重新构建
npm run build

# 重新部署
npx wrangler pages deploy out --project-name=cfworker-image-frontend --branch=production
```

**验证环境变量**

```bash
# 构建时会显示使用的环境文件
npm run build 2>&1 | grep "Environments"
```

---

### 5. Worker Secret 配置错误

#### 症状

- 认证失败
- 管理员功能无法使用
- 上传被拒绝

#### 诊断命令

```bash
# 查看已配置的 secrets
cd uploader-worker
npx wrangler secret list --env production

# 应该看到：
# - GITHUB_CLIENT_ID
# - GITHUB_CLIENT_SECRET
# - ADMIN_TOKEN
# - ADMIN_USERS
# - ALLOWED_ORIGINS
# - MAX_UPLOAD_SIZE
# - DAILY_QUOTA_BYTES
```

#### 解决方案

**重新配置 Secrets**

```bash
# 使用配置脚本
cd /path/to/PicoPics
./configure.sh

# 或手动设置
cd uploader-worker
echo "your_value" | npx wrangler secret put SECRET_NAME --env production
```

---

### 6. 上传 API 路径错误

#### 症状

```
Request URL: https://uploader-worker-prod.xxx.workers.dev/
Status: 200 OK
Response: {"success":false,"device_code":"..."}
```

返回的是设备码而不是上传结果。

#### 原因

请求发送到了 `/` 而不是 `/upload`

#### 解决方案

**检查前端配置**

```bash
cd CFworkerImageFRONTED
cat .env.local | grep UPLOAD_API
```

**必须包含 /upload 后缀**：

```bash
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-prod.xxx.workers.dev/upload
#                                                                    ^^^^^^^
#                                                                    必须有这个
```

**自动修复**

```bash
# 使用配置脚本
./configure.sh

# 或手动更新
cd CFworkerImageFRONTED
vim .env.local
# 添加 /upload 后缀
npm run build
npx wrangler pages deploy out --project-name=cfworker-image-frontend --branch=production
```

---

### 7. 构建后仍然访问 localhost（重要！）

#### 症状

```
Access to XMLHttpRequest at 'http://localhost:8787/upload' from origin
'https://your-prod-domain.pages.dev' has been blocked by CORS policy
```

生产环境的前端访问本地 Worker，即使 `.env.local` 配置了生产环境 URL。

#### 原因

Next.js 在构建时固化环境变量到静态文件中。如果有以下情况，会导致 localhost 被硬编码：

1. `next.config.js` 中有默认值指向 localhost
2. `env.ts` 中的默认值是 localhost
3. 构建时未正确读取 `.env.local`

#### 解决方案

**步骤 1：检查构建后的文件**

```bash
cd CFworkerImageFRONTED
npm run build

# 检查是否包含 localhost
grep -r "localhost:8787" out/

# 如果找到结果，说明有问题
```

**步骤 2：修复配置文件**

**移除 `next.config.js` 中的默认值**：

```javascript
// ❌ 错误 - 不要这样做
env: {
  NEXT_PUBLIC_UPLOAD_API: process.env.NEXT_PUBLIC_UPLOAD_API || "http://localhost:8787/upload",
}

// ✅ 正确 - 完全依赖 .env.local
// 环境变量配置
// 注意：使用 .env.local 文件配置环境变量
// Next.js 会自动读取 NEXT_PUBLIC_* 前缀的变量
```

**更新 `src/config/env.ts` 默认值**：

```typescript
// ❌ 错误
uploadApi: normalizeUrl(
  getEnv("NEXT_PUBLIC_UPLOAD_API", "http://localhost:8787/upload"),
  "/upload"
),

// ✅ 正确 - 默认值指向生产环境
uploadApi: normalizeUrl(
  getEnv("NEXT_PUBLIC_UPLOAD_API", "https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/upload"),
  "/upload"
),
```

**步骤 3：确保 `.env.local` 正确**

```bash
cat .env.local

# 应该包含（注意 /upload 后缀）：
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/upload
NEXT_PUBLIC_HISTORY_API=https://history-worker-prod.YOUR_ACCOUNT.workers.dev
NEXT_PUBLIC_ADMIN_API=https://r2-browser-worker-prod.YOUR_ACCOUNT.workers.dev
NEXT_PUBLIC_CDN_URL=https://pic.YOUR_DOMAIN.com
```

**步骤 4：完全清理并重新构建**

```bash
# 删除所有构建产物
rm -rf .next out

# 重新构建
npm run build

# 验证不再包含 localhost
grep -r "localhost:8787" out/ || echo "✓ Clean!"

# 验证包含生产环境URL
grep -r "uploader-worker-prod" out/ && echo "✓ Production URLs found!"
```

**步骤 5：重新部署**

```bash
npx wrangler pages deploy out --project-name=cfworker-image-frontend --branch=production
```

**验证修复**

- 访问新部署的 URL
- 打开浏览器开发者工具 > Network
- 尝试上传图片
- 检查请求 URL 应该是 `https://uploader-worker-prod.xxx.workers.dev/upload`

---

### 8. 本地开发 vs 生产环境混淆

#### 症状

生产环境的前端访问本地 Worker：

```
Access to XMLHttpRequest at 'http://localhost:8787/upload' from origin
'https://your-prod-domain.pages.dev' has been blocked by CORS policy
```

#### 原因

`.env.local` 配置了本地开发环境

#### 解决方案

**为不同环境创建不同配置**

`.env.local` - 生产环境：

```bash
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-prod.xxx.workers.dev/upload
NEXT_PUBLIC_HISTORY_API=https://history-worker-prod.xxx.workers.dev
NEXT_PUBLIC_ADMIN_API=https://r2-browser-worker-prod.xxx.workers.dev
NEXT_PUBLIC_CDN_URL=https://pic.yourdomain.com
```

`.env.development` - 本地开发：

```bash
NEXT_PUBLIC_UPLOAD_API=http://localhost:8787/upload
NEXT_PUBLIC_HISTORY_API=http://localhost:8788
NEXT_PUBLIC_ADMIN_API=http://localhost:8789
NEXT_PUBLIC_CDN_URL=http://localhost:8787
```

**部署前确认**

```bash
# 确保使用生产配置
cat .env.local
npm run build
# 检查输出中的 "Environments: .env.local"
```

---

## 🛠️ 调试工具

### 查看 Worker 实时日志

```bash
# Uploader Worker
cd uploader-worker
npx wrangler tail --env production --format pretty

# History Worker
cd history-worker
npx wrangler tail --env production --format pretty

# R2 Browser Worker
cd r2-browser-worker
npx wrangler tail --env production --format pretty

# CDN Worker
cd cdn-worker
npx wrangler tail --env production --format pretty
```

### 测试 API 端点

```bash
# 测试上传（需要 GitHub token）
curl -X POST "https://uploader-worker-prod.xxx.workers.dev/upload" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -F "image=@test.jpg" \
  -v

# 测试历史记录
curl "https://history-worker-prod.xxx.workers.dev/api/history" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -v

# 测试 CDN
curl -I "https://pic.yourdomain.com/path/to/image.jpg"
```

### 检查环境变量

```bash
# 列出所有 secrets
npx wrangler secret list --env production

# 检查 D1 数据库
npx wrangler d1 execute pico-pics-db --command "SELECT COUNT(*) FROM user_images" --remote

# 检查 KV 命名空间
npx wrangler kv:namespace list

# 检查 R2 存储桶
npx wrangler r2 bucket list
```

---

## 📋 完整诊断清单

部署后如果遇到问题，按顺序检查：

- [ ] **前端 `.env.local` 配置正确**

  - [ ] `NEXT_PUBLIC_UPLOAD_API` 包含 `/upload` 后缀
  - [ ] 所有 API 地址指向生产环境（不是 localhost）
  - [ ] CDN URL 正确

- [ ] **Worker Secrets 已配置**

  - [ ] `ALLOWED_ORIGINS` 包含所有前端域名
  - [ ] `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 正确
  - [ ] `ADMIN_TOKEN` 已设置

- [ ] **CORS 配置正确**

  - [ ] `ALLOWED_ORIGINS` 包含 `https://` 前缀
  - [ ] 支持通配符域名（如 `*.pages.dev`）
  - [ ] Access-Control-Allow-Headers 包含 `Authorization`

- [ ] **重新构建和部署**

  - [ ] 删除 `.next` 和 `out` 目录
  - [ ] 运行 `npm run build`
  - [ ] 重新部署到 Cloudflare Pages

- [ ] **测试功能**
  - [ ] GitHub 登录
  - [ ] 图片上传
  - [ ] 历史记录加载
  - [ ] 图片 CDN 访问

---

## 🆘 获取帮助

如果以上方法都无法解决问题：

1. **查看 Worker 日志**

   ```bash
   npx wrangler tail --env production --format pretty
   ```

2. **查看浏览器控制台**

   - 打开 DevTools (F12)
   - 查看 Console 和 Network 标签
   - 记录完整的错误信息

3. **收集诊断信息**

   ```bash
   # 环境配置
   cat .env.local

   # Secret 列表
   npx wrangler secret list --env production

   # 构建输出
   npm run build 2>&1 | grep -A 5 "Environments"
   ```

4. **提交 Issue**
   - 包含完整的错误信息
   - 包含相关配置（隐藏敏感信息）
   - 说明复现步骤

---

**记住：每次修改环境变量后，都必须重新构建和部署！** 🔄
