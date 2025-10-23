# 环境变量配置指南

## ⚠️ 重要说明

**本项目不包含敏感信息，部署时需要手动配置环境变量！**

## 🔧 环境变量清单

### 1. Cloudflare 账户信息

```bash
# Cloudflare Account ID
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# R2 存储桶名称
R2_BUCKET_NAME=lambdaimagebucket

# D1 数据库 ID
D1_DATABASE_ID=9f276330-cc71-41e8-a271-e18ae473711c

# KV 命名空间 ID
KV_NAMESPACE_ID=948d584514b54a639f32491af1fdb90f
```

### 2. GitHub OAuth 配置

```bash
# GitHub OAuth App 配置
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 3. 管理员配置

```bash
# 管理员用户列表（GitHub 用户名，逗号分隔）
ADMIN_USERS=your_github_username,another_admin

# 管理员令牌
ADMIN_TOKEN=your_secure_admin_token_here
```

### 4. 安全配置

```bash
# Telegram 通知（可选）
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Cloudflare Turnstile（可选）
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

### 5. 系统配置

```bash
# 文件大小限制（字节）
MAX_UPLOAD_SIZE=10485760

# 每日配额（字节）
DAILY_QUOTA_BYTES=104857600

# 允许的域名（逗号分隔）
ALLOWED_ORIGINS=https://yourdomain.com,https://your-project.pages.dev,https://*.your-project.pages.dev

# R2 公共访问域名
R2_PUBLIC_BASE=https://pic.yourdomain.com
```

## 🚀 快速配置脚本

### 1. 创建环境变量文件

```bash
# 复制模板
cp .env.example .env

# 编辑环境变量
vim .env
```

### 2. 使用自动配置脚本

```bash
# 运行配置脚本
./configure.sh

# 或者手动配置
./setup-env.sh
```

### 3. 手动配置 Cloudflare Workers

#### Uploader Worker

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

# 可选配置
npx wrangler secret put TELEGRAM_BOT_TOKEN --env production
npx wrangler secret put TELEGRAM_CHAT_ID --env production
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
```

#### History Worker

```bash
cd history-worker

# 设置环境变量
npx wrangler secret put ALLOWED_ORIGINS --env production
```

#### R2 Browser Worker

```bash
cd r2-browser-worker

# 设置环境变量
npx wrangler secret put ALLOWED_ORIGINS --env production
```

#### CDN Worker

```bash
cd cdn-worker

# 设置环境变量
npx wrangler secret put ALLOWED_ORIGINS --env production
```

## 🔍 配置验证

### 1. 检查 Worker 部署状态

```bash
# 检查所有 Worker
npx wrangler whoami
npx wrangler deployments list --env production
```

### 2. 测试 API 端点

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

### 3. 检查前端配置

```bash
cd CFworkerImageFRONTED

# 检查环境变量
cat .env.local

# 构建测试
npm run build

# 检查构建结果
grep -r "localhost" out/ || echo "✅ 没有 localhost 引用"
```

## 🛠️ 故障排查

### 1. 环境变量未设置

**症状**: API 返回 500 错误或认证失败
**解决**: 检查所有必需的环境变量是否已设置

### 2. CORS 错误

**症状**: 前端无法访问 Worker API
**解决**: 检查 `ALLOWED_ORIGINS` 是否包含前端域名

### 3. 数据库连接失败

**症状**: 历史记录或统计数据无法加载
**解决**: 检查 D1 数据库 ID 和绑定配置

### 4. R2 存储访问失败

**症状**: 图片无法上传或显示
**解决**: 检查 R2 存储桶名称和权限配置

## 📝 部署检查清单

### 部署前检查

- [ ] 所有环境变量已设置
- [ ] GitHub OAuth 应用已创建
- [ ] Cloudflare 资源已创建（R2、D1、KV）
- [ ] 域名已配置（可选）

### 部署后验证

- [ ] 所有 Worker 部署成功
- [ ] 前端构建成功
- [ ] API 端点响应正常
- [ ] 上传功能正常
- [ ] 历史记录正常
- [ ] Admin 面板正常

## 🔐 安全建议

1. **定期轮换密钥**: 定期更新 GitHub token 和 admin token
2. **限制访问**: 只允许必要的域名访问 API
3. **监控日志**: 定期检查 Worker 日志
4. **备份数据**: 定期备份 D1 数据库

## 📞 获取帮助

如果遇到问题，请参考：

1. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 详细故障排查指南
2. [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
3. [GitHub Issues](https://github.com/your-repo/issues) - 报告问题
