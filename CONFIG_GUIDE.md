# 🔒 PicoPics 安全环境配置指南

> **重要安全提醒**: 本指南强调所有敏感配置都通过 wrangler secret 命令设置，**绝不**将明文凭据提交到 GitHub！

本文档详细说明 PicoPics 项目的环境变量配置，包括普通环境变量和敏感的 Secret Variables 的设置方法。

## 🛡️ 安全原则

### ❌ 绝对不要做的事

- 不要在 `wrangler.toml` 中写入真实的账户 ID、数据库 ID 等敏感信息
- 不要将包含真实配置的 `wrangler.toml` 文件提交到 GitHub
- 不要在代码中硬编码 API 密钥、数据库连接串等敏感信息

### ✅ 正确的做法

- 使用 `wrangler secret put` 命令设置敏感信息
- 敏感信息存储在 Cloudflare 的安全存储中
- 配置文件只包含注释和占位符说明
- 使用 `setup-env.sh` 脚本自动生成安全的配置文件

## 📋 目录

- [快速开始](#快速开始)
- [配置流程](#配置流程)
- [Uploader Worker 配置](#uploader-worker-配置)
- [History Worker 配置](#history-worker-配置)
- [R2 Browser Worker 配置](#r2-browser-worker-配置)
- [CDN Worker 配置](#cdn-worker-配置)
- [前端应用配置](#前端应用配置)
- [批量配置脚本](#批量配置脚本)

## 🚀 快速开始

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/your-username/PicoPics.git
cd PicoPics

# 安装所有依赖
npm install
cd uploader-worker && npm install && cd ..
cd history-worker && npm install && cd ..
cd r2-browser-worker && npm install && cd ..
cd cdn-worker && npm install && cd ..
cd CFworkerImageFRONTED && npm install && cd ..
```

### 2. 运行自动配置脚本

```bash
# 运行安全配置脚本
./setup-env.sh
```

脚本会：

- 检查 Cloudflare 登录状态
- 动态生成所有 `wrangler.toml` 配置文件
- 自动设置所有环境变量和资源绑定
- 提供安全配置指导

### 3. 部署项目

```bash
# 部署所有 Worker
./deploy.sh
```

## 配置流程

### 1. 准备阶段

```bash
# 1. 登录 Cloudflare
npx wrangler login

# 2. 获取账户信息
npx wrangler whoami

# 3. 创建必要的资源（脚本会自动处理）
# R2 存储桶、D1 数据库、KV 命名空间
```

### 2. 运行配置脚本

`setup-env.sh` 脚本会自动：

- 获取资源 ID（R2 bucket ID, D1 database ID, KV namespace ID）
- 动态生成安全的 `wrangler.toml` 文件
- 设置所有环境变量和资源绑定
- 配置前端应用的环境变量

### 3. 手动设置敏感变量（可选）

某些敏感信息需要手动设置：

```bash
# 管理员配置
npx wrangler secret put ADMIN_USERS --env production
# 输入: github_username1,github_username2

npx wrangler secret put ADMIN_TOKEN --env production
# 输入: your-secure-admin-token

# Telegram 通知（可选）
npx wrangler secret put TELEGRAM_BOT_TOKEN --env production
npx wrangler secret put TELEGRAM_CHAT_ID --env production

# Cloudflare Turnstile（可选）
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
```

## Uploader Worker 配置

Uploader Worker 是核心上传服务，包含最多的配置选项。

### 自动配置内容

`setup-env.sh` 脚本会自动设置：

- **CLOUDFLARE_ACCOUNT_ID**: Cloudflare 账户 ID
- **R2_BUCKET_NAME**: R2 存储桶名称
- **KV_NAMESPACE_ID**: KV 命名空间 ID
- **D1_DATABASE_ID**: D1 数据库 ID
- **R2_PUBLIC_BASE**: CDN 基础 URL
- **ALLOWED_ORIGINS**: 允许的源域名
- **MAX_UPLOAD_SIZE**: 最大上传大小 (10MB)
- **DAILY_QUOTA_BYTES**: 每日配额 (2GB)

### 功能开关

- **ABUSE_DETECTION_ENABLED**: 滥用检测 (true)
- **AUTH_ENABLED**: 认证启用 (true)
- **CONTENT_MODERATION_ENABLED**: 内容审核 (true)
- **TURNSTILE_ENABLED**: Turnstile 验证 (false)
- **DAILY_UPLOAD_LIMIT_PER_IP**: IP 日上传限制 (20)

### 手动设置的敏感变量

```bash
cd uploader-worker

# 管理员配置
npx wrangler secret put ADMIN_USERS --env production
# 输入管理员的 GitHub 用户名，多个用逗号分隔
# 例如: KaikiDeishuuu,admin1,admin2

npx wrangler secret put ADMIN_TOKEN --env production
# 输入安全的管理员访问令牌
# 建议使用强密码或随机生成的字符串
# 例如: a1b2c3d4e5f678901234567890abcdef

# Telegram 通知（可选）
npx wrangler secret put TELEGRAM_BOT_TOKEN --env production
npx wrangler secret put TELEGRAM_CHAT_ID --env production

# Cloudflare Turnstile（可选）
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
```

#### 管理员令牌管理

**重要**: 管理员令牌是访问管理界面的关键凭据，请妥善保管。

- **设置令牌**: 使用 `wrangler secret put ADMIN_TOKEN --env production`
- **修改令牌**: 重新运行上述命令，会覆盖原有令牌
- **安全建议**:
  - 使用强密码（至少 16 位，包含字母、数字、符号）
  - 定期更换令牌
  - 不要在聊天记录或文档中明文记录令牌
- **忘记令牌**: 如果忘记令牌，可以重新设置，但会使旧令牌失效

## History Worker 配置

History Worker 用于查询上传历史。

### 自动配置内容

- **CLOUDFLARE_ACCOUNT_ID**: Cloudflare 账户 ID
- **D1_DATABASE_ID**: D1 数据库 ID（与 uploader-worker 共用）
- **ALLOWED_ORIGINS**: 允许的源域名

## R2 Browser Worker 配置

R2 Browser Worker 用于管理界面浏览 R2 存储桶内容。

### 自动配置内容

- **CLOUDFLARE_ACCOUNT_ID**: Cloudflare 账户 ID
- **R2_BUCKET_NAME**: R2 存储桶名称
- **ALLOWED_ORIGINS**: 允许的源域名（生产环境建议限制）

## CDN Worker 配置

CDN Worker 负责图片分发和缓存优化。

### 自动配置内容

- **CLOUDFLARE_ACCOUNT_ID**: Cloudflare 账户 ID
- **R2_BUCKET_NAME**: R2 存储桶名称
- **ALLOWED_ORIGINS**: 允许的源域名（通常为 \*）
- **CACHE_MAX_AGE**: 缓存最大年龄 (1 年)

## 前端应用配置

前端应用部署到 Cloudflare Pages。

### 自动配置内容

`setup-env.sh` 脚本会自动设置：

- **NEXT_PUBLIC_UPLOAD_API**: 上传 API 端点
- **NEXT_PUBLIC_ADMIN_API**: 管理 API 端点
- **NEXT_PUBLIC_HISTORY_API**: 历史 API 端点
- **NEXT_PUBLIC_CDN_BASE**: CDN 基础 URL

### 本地开发环境变量

编辑 `CFworkerImageFRONTED/.env.local` 文件：

```env
# Cloudflare 配置
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# GitHub OAuth 配置
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 应用配置
NEXT_PUBLIC_UPLOAD_API=http://localhost:8787/upload
NEXT_PUBLIC_ADMIN_API=http://localhost:8788
NEXT_PUBLIC_HISTORY_API=http://localhost:8789/api/history
NEXT_PUBLIC_CDN_BASE=http://localhost:8790

# 开发环境配置
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

## 批量配置脚本

### setup-env.sh 脚本详解

脚本执行流程：

1. **登录检查**: 验证 Cloudflare 登录状态
2. **用户输入**: 收集域名、存储桶名、数据库名等信息
3. **资源验证**: 获取 R2 bucket ID、D1 database ID、KV namespace ID
4. **配置文件生成**: 动态生成所有 `wrangler.toml` 文件
5. **环境变量设置**: 使用 `wrangler secret put` 设置所有变量
6. **前端配置**: 设置 Cloudflare Pages 环境变量

### 脚本优势

- **安全性**: 所有敏感信息通过 secret 命令设置
- **自动化**: 一键配置所有组件
- **动态生成**: wrangler.toml 文件根据实际资源动态生成
- **错误处理**: 完善的错误检查和提示

### 手动执行（备选方案）

如果不想使用脚本，也可以手动执行：

```bash
# 1. 登录 Cloudflare
npx wrangler login

# 2. 获取账户 ID
ACCOUNT_ID=$(npx wrangler whoami | grep "Account ID" | awk '{print $3}')

# 3. 创建资源
npx wrangler r2 bucket create your-bucket-name
npx wrangler d1 create your-database-name
npx wrangler kv:namespace create "USER_CACHE"

# 4. 设置环境变量（参考脚本内容）
# ... 手动执行所有 wrangler secret put 命令
```

## 🔍 故障排除

### 查看配置

```bash
# 查看 Worker 环境变量
cd uploader-worker
npx wrangler secret list --env production

# 查看 Pages 环境变量
cd CFworkerImageFRONTED
npx wrangler pages secret list
```

### 修改配置

```bash
# 修改环境变量
npx wrangler secret put VARIABLE_NAME --env production
# 输入新值

# 删除环境变量
npx wrangler secret delete VARIABLE_NAME --env production
```

### 常见问题

1. **Secret not found**: 确保在正确的环境（production/development）中设置
2. **Invalid value**: 检查变量值格式是否正确
3. **Permission denied**: 确保已登录 Cloudflare 账户且有相应权限
4. **Resource not found**: 确保资源（如 R2 存储桶、D1 数据库）已创建

### 重新配置

如果需要重新配置：

```bash
# 1. 删除所有 secret
npx wrangler secret delete VARIABLE_NAME --env production

# 2. 重新运行配置脚本
./setup-env.sh
```

## 📝 配置清单

- [ ] Cloudflare 账户登录
- [ ] R2 存储桶创建
- [ ] D1 数据库创建
- [ ] KV 命名空间创建
- [ ] 域名配置
- [ ] 运行 `setup-env.sh` 脚本
- [ ] 手动设置敏感变量（管理员、Telegram 等）
- [ ] 测试部署

---

## 🎯 下一步

配置完成后，按照 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) 进行部署测试。

## 🔐 安全提醒

- **永远不要** 将真实的 `wrangler.toml` 文件提交到 GitHub
- **永远不要** 在代码中硬编码敏感信息
- **始终使用** `wrangler secret put` 设置敏感变量
- **定期轮换** API 密钥和令牌
- **监控** Cloudflare 控制台的访问日志
