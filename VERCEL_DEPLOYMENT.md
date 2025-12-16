# Vercel 部署指南

## 🚀 快速部署到 Vercel

### 1. 准备工作

确保你已经：

- ✅ 创建了 Vercel 账户
- ✅ 安装了 Vercel CLI: `npm i -g vercel`
- ✅ 配置了所有必要的环境变量

### 2. 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

#### 必需的环境变量：

```bash
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

### 3. 部署方法

#### 方法一：使用 Vercel CLI

```bash
# 1. 登录 Vercel
vercel login

# 2. 在项目根目录部署
cd /home/PicoPicsFullStack/PicoPics
vercel

# 3. 生产环境部署
vercel --prod
```

#### 方法二：通过 GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 控制台连接 GitHub 仓库
3. 配置环境变量
4. 自动部署

### 4. 功能验证

部署完成后，验证以下功能：

- ✅ 图片上传功能
- ✅ 移动端响应式布局
- ✅ 暗色模式切换
- ✅ 管理员面板

### 5. 注意事项

1. **数据库依赖**: 应用依赖 Cloudflare D1 数据库，确保 D1 数据库和 Worker 正常运行
2. **CORS 配置**: 所有 Cloudflare Workers 都已配置正确的 CORS 头
3. **环境变量**: 确保所有 `NEXT_PUBLIC_` 前缀的变量都正确设置
4. **构建优化**: Next.js 配置已优化，支持 Vercel 的构建环境

### 6. 故障排除

如果遇到问题：

1. 检查 Vercel 构建日志
2. 验证环境变量是否正确设置
3. 确认 Cloudflare Workers 是否正常运行
4. 检查网络连接和 CORS 配置

### 7. 性能优化

- ✅ 图片优化已禁用（Cloudflare Workers 不支持）
- ✅ 代码分割已配置
- ✅ 静态资源缓存已优化
- ✅ PWA 功能已配置

## 🎉 部署完成！

你的 PicoPics V2 应用现在应该可以在 Vercel 上正常运行了！
