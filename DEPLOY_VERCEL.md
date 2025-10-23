# Vercel 部署指南

## 快速部署到 Vercel

### 方法 1：通过 Vercel CLI（推荐）

1. **安装 Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**

   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   cd /home/PicoPics
   vercel --prod
   ```

### 方法 2：通过 GitHub 集成

1. **推送代码到 GitHub**

   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **在 Vercel 中导入项目**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 选择你的 GitHub 仓库
   - 配置环境变量（见下方）

### 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

```
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-v2-prod.haoweiw370.workers.dev/upload
NEXT_PUBLIC_HISTORY_API=https://history-worker-v2-prod.haoweiw370.workers.dev/api/history
NEXT_PUBLIC_CDN_BASE=https://cdn-worker-v2-prod.haoweiw370.workers.dev
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
```

### 部署优势

- ✅ 无大小限制（相比 Cloudflare Pages）
- ✅ 原生 Next.js 支持
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 自动部署（GitHub 集成）
- ✅ 预览部署（PR 自动部署）

### 自定义域名

1. 在 Vercel 项目设置中添加自定义域名
2. 配置 DNS 记录指向 Vercel
3. 自动获得 SSL 证书

## 方案 2：GitHub Pages 部署

### 配置 GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_UPLOAD_API: https://uploader-worker-v2-prod.haoweiw370.workers.dev/upload
          NEXT_PUBLIC_HISTORY_API: https://history-worker-v2-prod.haoweiw370.workers.dev/api/history
          NEXT_PUBLIC_CDN_BASE: https://cdn-worker-v2-prod.haoweiw370.workers.dev

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        if: github.ref == 'refs/heads/main'
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

### GitHub Pages 限制

- ❌ 不支持 API 路由（需要静态导出）
- ❌ 构建大小限制
- ✅ 免费
- ✅ 自动部署

## 推荐方案

**推荐使用 Vercel**，因为：

1. 对 Next.js 支持最好
2. 无大小限制
3. 支持 API 路由
4. 部署简单
5. 性能优秀
