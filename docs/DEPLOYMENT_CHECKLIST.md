# 部署检查清单

## 🚀 部署前准备

### 1. Cloudflare 资源准备

- [ ] **Cloudflare 账户**: 确保有 Cloudflare 账户
- [ ] **R2 存储桶**: 创建名为 `lambdaimagebucket` 的存储桶
- [ ] **D1 数据库**: 创建名为 `pico-pics-db` 的数据库
- [ ] **KV 存储**: 创建用于用户缓存的 KV 命名空间
- [ ] **自定义域名**: 配置 R2 自定义域名（可选）

### 2. GitHub OAuth 应用

- [ ] **创建 OAuth App**: 在 GitHub 设置中创建 OAuth App
- [ ] **回调 URL**: 设置为 `https://yourdomain.com/auth/github/callback`
- [ ] **权限设置**: 启用用户信息读取权限
- [ ] **获取凭据**: 记录 Client ID 和 Client Secret

### 3. 环境变量准备

- [ ] **GitHub 凭据**: Client ID 和 Client Secret
- [ ] **管理员信息**: GitHub 用户名和自定义 admin token
- [ ] **域名配置**: 前端域名和 CDN 域名
- [ ] **安全配置**: Telegram 通知（可选）

## 🔧 部署步骤

### 1. 克隆项目

```bash
git clone https://github.com/your-username/picopics.git
cd picopics
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env

# 运行自动配置
./configure.sh
```

### 3. 部署 Cloudflare Workers

#### 3.1 部署 Uploader Worker

```bash
cd uploader-worker

# 设置环境变量
npx wrangler secret put GITHUB_CLIENT_ID --env production
npx wrangler secret put GITHUB_CLIENT_SECRET --env production
npx wrangler secret put ADMIN_USERS --env production
npx wrangler secret put ADMIN_TOKEN --env production
npx wrangler secret put ALLOWED_ORIGINS --env production
npx wrangler secret put MAX_UPLOAD_SIZE --env production
npx wrangler secret put DAILY_QUOTA_BYTES --env production

# 部署
npx wrangler deploy --env production
```

#### 3.2 部署 History Worker

```bash
cd history-worker

# 设置环境变量
npx wrangler secret put ALLOWED_ORIGINS --env production

# 部署
npx wrangler deploy --env production
```

#### 3.3 部署 R2 Browser Worker

```bash
cd r2-browser-worker

# 设置环境变量
npx wrangler secret put ALLOWED_ORIGINS --env production

# 部署
npx wrangler deploy --env production
```

#### 3.4 部署 CDN Worker

```bash
cd cdn-worker

# 设置环境变量
npx wrangler secret put ALLOWED_ORIGINS --env production

# 部署
npx wrangler deploy --env production
```

### 4. 部署前端应用

#### 4.1 构建前端

```bash
cd CFworkerImageFRONTED

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件

# 构建
npm run build
```

#### 4.2 部署到 Cloudflare Pages

```bash
# 使用 Wrangler 部署
npx wrangler pages deploy out --project-name=cfworker-image-frontend --branch=production

# 或使用 Cloudflare Dashboard 上传
```

## ✅ 部署后验证

### 1. API 端点测试

```bash
# 测试上传 API
curl -X POST "https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/upload" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -F "image=@test.jpg"

# 测试历史记录 API
curl -X GET "https://history-worker-prod.YOUR_ACCOUNT.workers.dev/api/history" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN"

# 测试 Admin API
curl -X GET "https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/api/admin/stats" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN"
```

### 2. 前端功能测试

- [ ] **访问前端**: 打开前端 URL
- [ ] **GitHub 登录**: 测试 OAuth 登录
- [ ] **图片上传**: 测试文件上传功能
- [ ] **历史记录**: 查看上传历史
- [ ] **Admin 面板**: 访问管理后台

### 3. 数据一致性检查

```bash
# 检查统计数据
curl -X GET "https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/api/admin/stats" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN"

# 检查 R2 存储
# 在 Cloudflare Dashboard 中查看 R2 存储桶

# 检查 D1 数据库
# 在 Cloudflare Dashboard 中查看 D1 数据库
```

## 🔍 常见问题排查

### 1. 上传失败

- [ ] 检查 CORS 配置
- [ ] 验证 GitHub token
- [ ] 检查文件大小限制
- [ ] 查看 Worker 日志

### 2. 历史记录不显示

- [ ] 检查 D1 数据库连接
- [ ] 验证用户认证
- [ ] 检查 API 端点配置

### 3. Admin 面板无法访问

- [ ] 检查管理员权限
- [ ] 验证 admin token
- [ ] 检查 CORS 配置

### 4. 图片无法显示

- [ ] 检查 R2 存储配置
- [ ] 验证 CDN 域名
- [ ] 检查图片 URL 格式

## 📊 性能优化

### 1. 缓存配置

- [ ] 配置 CDN 缓存策略
- [ ] 设置适当的缓存头
- [ ] 启用 Cloudflare 缓存

### 2. 数据库优化

- [ ] 创建必要的索引
- [ ] 定期清理无效记录
- [ ] 监控数据库性能

### 3. 监控设置

- [ ] 配置错误监控
- [ ] 设置性能指标
- [ ] 启用日志记录

## 🛡️ 安全检查

### 1. 访问控制

- [ ] 验证 CORS 配置
- [ ] 检查 API 权限
- [ ] 限制管理员访问

### 2. 数据安全

- [ ] 加密敏感数据
- [ ] 定期备份数据
- [ ] 监控异常访问

### 3. 密钥管理

- [ ] 定期轮换密钥
- [ ] 安全存储凭据
- [ ] 限制密钥权限

## 📝 维护任务

### 日常维护

- [ ] 监控系统状态
- [ ] 检查错误日志
- [ ] 更新依赖包

### 定期维护

- [ ] 清理无效记录
- [ ] 备份数据库
- [ ] 更新安全配置

### 紧急响应

- [ ] 准备回滚方案
- [ ] 建立监控告警
- [ ] 制定应急流程

## 🎉 部署完成

部署完成后，请确保：

- [ ] 所有功能正常工作
- [ ] 性能指标正常
- [ ] 安全配置正确
- [ ] 监控系统就绪

**恭喜！您的 PicoPics 图床系统已成功部署！** 🎊
