# 部署选项指南

## 🚀 推荐方案：Vercel 部署

### 优势
- ✅ 无大小限制（相比 Cloudflare Pages 的 25MB 限制）
- ✅ 原生 Next.js 支持，性能最佳
- ✅ 支持 API 路由
- ✅ 自动 HTTPS 和 CDN
- ✅ 预览部署（PR 自动部署）
- ✅ 全球边缘网络

### 快速部署

#### 方法 1：使用部署脚本
```bash
cd /home/PicoPics
./deploy-vercel.sh
```

#### 方法 2：手动部署
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod
```

#### 方法 3：GitHub 集成
1. 推送代码到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入项目
3. 配置环境变量
4. 自动部署

### 环境变量配置
在 Vercel 项目设置中添加：
```
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-v2-prod.haoweiw370.workers.dev/upload
NEXT_PUBLIC_HISTORY_API=https://history-worker-v2-prod.haoweiw370.workers.dev/api/history
NEXT_PUBLIC_CDN_BASE=https://cdn-worker-v2-prod.haoweiw370.workers.dev
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
```

---

## 🔄 备选方案：GitHub Pages

### 优势
- ✅ 完全免费
- ✅ 与 GitHub 集成
- ✅ 自动部署

### 限制
- ❌ 不支持 API 路由（需要静态导出）
- ❌ 构建大小限制
- ❌ 功能相对简单

### 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Prepare for GitHub Pages deployment"
   git push origin main
   ```

2. **启用 GitHub Pages**
   - 进入仓库 Settings
   - 找到 Pages 部分
   - 选择 "GitHub Actions" 作为源

3. **自动部署**
   - GitHub Actions 会自动构建和部署
   - 使用 `next.config.github.js` 配置

---

## 📊 方案对比

| 特性 | Vercel | GitHub Pages | Cloudflare Pages |
|------|--------|--------------|------------------|
| 大小限制 | 无限制 | 1GB | 25MB |
| Next.js 支持 | 原生 | 静态导出 | 有限 |
| API 路由 | ✅ | ❌ | ✅ |
| 自动部署 | ✅ | ✅ | ✅ |
| 预览部署 | ✅ | ❌ | ✅ |
| 自定义域名 | ✅ | ✅ | ✅ |
| 费用 | 免费额度 | 免费 | 免费 |

---

## 🎯 推荐部署流程

### 1. 立即部署到 Vercel（推荐）
```bash
cd /home/PicoPics
./deploy-vercel.sh
```

### 2. 配置自定义域名（可选）
- 在 Vercel 项目设置中添加域名
- 配置 DNS 记录
- 自动获得 SSL 证书

### 3. 设置环境变量
确保在 Vercel 中配置了所有必要的环境变量

### 4. 测试部署
访问部署的 URL 确保一切正常

---

## 🔧 故障排除

### Vercel 部署问题
1. **构建失败**：检查 `next.config.js` 配置
2. **环境变量**：确保在 Vercel 中正确设置
3. **API 路由**：确保路由文件在 `app/api/` 目录

### GitHub Pages 问题
1. **静态导出**：使用 `next.config.github.js`
2. **构建大小**：优化图片和代码
3. **路由问题**：确保使用 `trailingSlash: true`

---

## 📝 下一步

1. 选择部署方案（推荐 Vercel）
2. 运行部署命令
3. 配置环境变量
4. 测试功能
5. 配置自定义域名（可选）

需要帮助？查看具体的部署指南文件。
