# PicoPics V2 - 开发环境配置指南

## 🚀 快速开始

### 1. 环境变量配置

复制环境变量模板文件：
```bash
cp env.example .env.local
```

然后编辑 `.env.local` 文件，填入你的实际配置：

```bash
# GitHub OAuth (必需)
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here

# Cloudflare Workers API 端点 (使用你自己的 worker URLs)
NEXT_PUBLIC_UPLOAD_API=https://your-uploader-worker.your-subdomain.workers.dev
NEXT_PUBLIC_HISTORY_API=https://your-history-worker.your-subdomain.workers.dev
NEXT_PUBLIC_CDN_BASE=https://your-cdn-worker.your-subdomain.workers.dev
NEXT_PUBLIC_R2_BROWSER_API=https://your-r2-browser-worker.your-subdomain.workers.dev

# 管理员令牌
ADMIN_TOKEN=your_admin_token_here

# Cloudflare 配置
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
DATABASE_ID=your_database_id_here
R2_BUCKET_NAME=your_bucket_name_here
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

## 🔧 开发注意事项

### 环境变量保护

- **永远不要提交** `.env.local` 文件到 Git
- 使用 `env.example` 作为模板
- 生产环境变量在 Vercel 中单独配置

### API 端点配置

- API 端点应该**不包含**具体的路径（如 `/upload`, `/api/history`）
- 路径会在代码中动态拼接
- 示例：
  - ✅ 正确：`https://your-worker.workers.dev`
  - ❌ 错误：`https://your-worker.workers.dev/upload`

### 本地开发 vs 生产环境

- 本地开发使用你自己的 Cloudflare Workers
- 生产环境使用预配置的 Workers
- 通过环境变量自动切换

## 🛠️ 项目结构

```
PicoPics/
├── app/                    # Next.js App Router
├── components/             # React 组件
├── lib/                    # 工具库和 API 客户端
├── workers/                # Cloudflare Workers
├── test/                   # 测试文件
├── public/                 # 静态资源
└── docs/                   # 文档
```

## 🧪 测试

```bash
# 运行测试
npm test

# 运行测试并监听变化
npm run test:watch
```

## 📦 构建和部署

```bash
# 构建项目
npm run build

# 部署到 Vercel
npx vercel --prod
```

## 🔒 安全注意事项

1. **敏感信息保护**：
   - 不要提交包含真实 API 密钥的文件
   - 使用环境变量管理敏感配置

2. **API 端点安全**：
   - 确保 API 端点配置正确
   - 避免路径重复问题

3. **开发环境隔离**：
   - 本地开发使用独立的 Workers
   - 生产环境使用稳定的 Workers
