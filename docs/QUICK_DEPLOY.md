# 🚀 快速部署指南

## ⚠️ 重要说明

**本项目不包含敏感信息，部署时需要手动配置环境变量！**

## 🔧 部署前准备

### 1. 获取必要信息

#### Cloudflare 信息

- [ ] Cloudflare Account ID
- [ ] R2 存储桶名称
- [ ] D1 数据库 ID
- [ ] KV 命名空间 ID

#### GitHub OAuth

- [ ] GitHub Client ID
- [ ] GitHub Client Secret

#### 管理员配置

- [ ] 管理员 GitHub 用户名
- [ ] 自定义 Admin Token

## 🚀 快速部署步骤

### 1. 克隆项目

```bash
git clone https://github.com/your-username/PicoPics.git
cd PicoPics
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp env.template .env

# 编辑环境变量
vim .env
```

### 3. 运行自动配置

```bash
# 运行配置脚本
./configure.sh
```

### 4. 手动设置敏感变量

#### 4.1 Uploader Worker 配置

```bash
cd uploader-worker

# GitHub OAuth 配置
npx wrangler secret put GITHUB_CLIENT_ID --env production
npx wrangler secret put GITHUB_CLIENT_SECRET --env production

# 管理员配置
npx wrangler secret put ADMIN_USERS --env production
# 输入: your_github_username,another_admin

npx wrangler secret put ADMIN_TOKEN --env production
# 输入: your_secure_admin_token

# 系统配置
npx wrangler secret put ALLOWED_ORIGINS --env production
# 输入: https://yourdomain.com,https://your-project.pages.dev,https://*.your-project.pages.dev

npx wrangler secret put MAX_UPLOAD_SIZE --env production
# 输入: 10485760

npx wrangler secret put DAILY_QUOTA_BYTES --env production
# 输入: 104857600

# 可选配置
npx wrangler secret put TELEGRAM_BOT_TOKEN --env production
npx wrangler secret put TELEGRAM_CHAT_ID --env production
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
```

#### 4.2 History Worker 配置

```bash
cd history-worker

# CORS 配置
npx wrangler secret put ALLOWED_ORIGINS --env production
# 输入: https://yourdomain.com,https://your-project.pages.dev,https://*.your-project.pages.dev
```

#### 4.3 R2 Browser Worker 配置

```bash
cd r2-browser-worker

# CORS 配置
npx wrangler secret put ALLOWED_ORIGINS --env production
# 输入: https://yourdomain.com,https://your-project.pages.dev,https://*.your-project.pages.dev
```

#### 4.4 CDN Worker 配置

```bash
cd cdn-worker

# CORS 配置
npx wrangler secret put ALLOWED_ORIGINS --env production
# 输入: https://yourdomain.com,https://your-project.pages.dev,https://*.your-project.pages.dev
```

### 5. 部署所有组件

```bash
# 部署所有 Worker
./deploy.sh

# 或手动部署
cd uploader-worker && npx wrangler deploy --env production && cd ..
cd history-worker && npx wrangler deploy --env production && cd ..
cd r2-browser-worker && npx wrangler deploy --env production && cd ..
cd cdn-worker && npx wrangler deploy --env production && cd ..
```

### 6. 部署前端

```bash
cd CFworkerImageFRONTED

# 构建前端
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy out --project-name=cfworker-image-frontend --branch=production
```

## 🔍 验证部署

### 1. 检查 Worker 状态

```bash
# 查看所有部署
npx wrangler deployments list

# 测试 API 端点
curl https://uploader-worker-prod.YOUR_ACCOUNT.workers.dev/
```

### 2. 测试功能

- [ ] 访问前端页面
- [ ] GitHub 登录
- [ ] 图片上传
- [ ] 历史记录
- [ ] Admin 面板

## 🛠️ 故障排查

### 常见问题

1. **CORS 错误**: 检查 `ALLOWED_ORIGINS` 配置
2. **认证失败**: 检查 GitHub OAuth 配置
3. **上传失败**: 检查 R2 存储配置
4. **历史记录不显示**: 检查 D1 数据库配置

### 详细排查

参考 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 获取详细解决方案。

## 📝 环境变量清单

### 必需变量

- `CLOUDFLARE_ACCOUNT_ID`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ADMIN_USERS`
- `ADMIN_TOKEN`
- `ALLOWED_ORIGINS`

### 可选变量

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TURNSTILE_SECRET_KEY`
- `MAX_UPLOAD_SIZE`
- `DAILY_QUOTA_BYTES`

## 🎉 部署完成

部署完成后，您将拥有：

- ✅ 完整的图片托管服务
- ✅ 用户认证系统
- ✅ 管理后台
- ✅ 全球 CDN 加速
- ✅ 数据一致性保证

**恭喜！您的 PicoPics 图床系统已成功部署！** 🎊
