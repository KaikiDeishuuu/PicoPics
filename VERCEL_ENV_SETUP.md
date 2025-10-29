# Vercel 环境变量配置指南

## 🚨 重要：需要在 Vercel 控制台配置环境变量

你的应用已经部署到 Vercel，但是需要配置环境变量才能正常工作。

### 部署 URL

- **生产环境**: https://pico-pics-cvcmwgszj-kaikideishuus-projects.vercel.app
- **预览环境**: https://pico-pics-kb4bt109n-kaikideishuus-projects.vercel.app

### 需要配置的环境变量

在 Vercel 控制台的项目设置中添加以下环境变量：

#### 1. 进入 Vercel 控制台

1. 访问 https://vercel.com/dashboard
2. 找到项目 `pico-pics`
3. 点击项目进入详情页
4. 点击 "Settings" 标签
5. 点击 "Environment Variables"

#### 2. 添加以下环境变量

```bash
# Agent 监控 API 配置
NEXT_PUBLIC_AGENT_PROXY_URL=https://your-agent-proxy.workers.dev
NEXT_PUBLIC_AGENT_API_URL=https://your-agent-api.com
NEXT_PUBLIC_AGENT_API_KEY=your_agent_api_key_here

# Agent 数据库 Worker URL
NEXT_PUBLIC_AGENT_DATABASE_WORKER_URL=https://your-agent-database.workers.dev

# 图片上传相关 API
NEXT_PUBLIC_UPLOAD_API=https://your-upload-worker.workers.dev
NEXT_PUBLIC_HISTORY_API=https://your-history-worker.workers.dev
NEXT_PUBLIC_CDN_BASE=https://your-cdn-worker.workers.dev

# GitHub OAuth (必需)
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here

# 管理员配置
ADMIN_TOKEN=your_admin_token_here

# Cloudflare D1 数据库 (服务器端，不会暴露到客户端)
CF_D1_DATABASE_ID=your_database_id_here
CF_ACCOUNT_ID=your_account_id_here
CF_API_TOKEN=your_cloudflare_api_token_here
```

#### 3. 环境变量设置说明

- **NEXT*PUBLIC*\*** 变量：会暴露到客户端，用于前端代码
- **CF\_\*** 变量：仅服务器端使用，用于 D1 数据库操作
- **ADMIN_TOKEN**：管理员访问令牌
- **NEXT_PUBLIC_GITHUB_CLIENT_ID**：GitHub OAuth 客户端 ID

#### 4. 配置完成后

1. 保存所有环境变量
2. 重新部署项目（Vercel 会自动触发）
3. 等待部署完成
4. 访问生产环境 URL 测试功能

### 当前问题

构建日志显示：`Error: D1 query failed: Unauthorized`

这是因为缺少 Cloudflare D1 数据库的环境变量配置。

### 验证步骤

配置完成后，检查以下功能：

1. ✅ 首页加载正常
2. ✅ Agent 监控系统显示数据
3. ✅ Agent 名称可以自定义和保存
4. ✅ 图片上传功能正常
5. ✅ 移动端布局正常

### 故障排除

如果仍有问题：

1. 检查 Vercel 构建日志
2. 确认所有环境变量都已正确设置
3. 验证 Cloudflare Workers 是否正常运行
4. 检查网络连接和 CORS 配置
