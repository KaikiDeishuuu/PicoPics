# 🌟 PicoPics

> **现代化、高性能的图片托管服务** - 基于 Cloudflare 生态系统构建

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://cloudflare.com)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

<div align="center">
  <em>安全 · 快速 · 免费 · AI 驱动 · 已部署</em>
</div>

---

## ✨ 特性亮点

### 🚀 高性能架构
- **全球 CDN 加速** - Cloudflare 边缘网络，全球 300+ 个数据中心
- **毫秒级响应** - 智能缓存和边缘计算优化
- **无限扩展** - 无服务器架构，按需扩展
- **实时部署** - 一键部署脚本，自动化 CI/CD

### 🔒 企业级安全
- **GitHub OAuth 认证** - 安全的身份验证系统
- **AI 内容审核** - 智能识别和过滤不当内容
- **DDoS 防护** - Cloudflare 企业级安全防护
- **安全配置** - 敏感信息通过 wrangler secret 管理，绝不提交到 Git
- **IP 黑名单** - 自动检测和封禁滥用行为

### 🎨 现代化体验
- **响应式设计** - 完美适配桌面和移动设备
- **拖拽上传** - 支持拖拽、粘贴和点击上传
- **实时预览** - 即时图片预览和格式转换
- **多格式支持** - JPG, PNG, GIF, WebP, SVG
- **批量上传** - 支持多文件同时上传

### 💰 成本优化
- **按量付费** - 只为实际使用的存储和流量付费
- **智能压缩** - 自动优化图片大小和质量
- **长期存储** - 基于 Cloudflare R2 的成本效益存储
- **配额管理** - 灵活的用户配额和速率限制

### 🛠️ 开发者友好
- **自动化配置** - `configure.sh` 脚本一键配置所有环境
- **安全部署** - `deploy.sh` 脚本一键部署所有组件
- **完整文档** - 详细的配置和部署指南
- **TypeScript** - 完整的类型安全和开发体验

---

## 🚀 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn
- Cloudflare 账户

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/PicoPics.git
   cd PicoPics
   ```

2. **安装依赖**
   ```bash
   # 安装根目录依赖
   npm install
   
   # 安装所有 Worker 依赖
   cd uploader-worker && npm install && cd ..
   cd history-worker && npm install && cd ..
   cd r2-browser-worker && npm install && cd ..
   cd cdn-worker && npm install && cd ..
   cd CFworkerImageFRONTED && npm install && cd ..
   ```

3. **配置 Cloudflare 账户**
   ```bash
   # 登录 Cloudflare（必需）
   npx wrangler login
   
   # 验证登录状态
   npx wrangler whoami
   ```

4. **运行自动配置脚本**
   ```bash
   # 🚀 一键安全配置（推荐）
   ./configure.sh
   ```

5. **手动设置敏感变量**
   ```bash
   # 管理员配置
   npx wrangler secret put ADMIN_USERS --env production
   # 输入: github_username1,github_username2
   
   npx wrangler secret put ADMIN_TOKEN --env production
   # 输入: your-secure-admin-token
   
   # GitHub OAuth
   npx wrangler secret put GITHUB_CLIENT_ID --env production
   npx wrangler secret put GITHUB_CLIENT_SECRET --env production
   ```

6. **部署项目**
   ```bash
   # 部署所有组件
   ./deploy.sh
   ```

📖 **环境配置指南**：[docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md)

📋 **部署检查清单**：[docs/DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md)

🚀 **快速部署指南**：[docs/QUICK_DEPLOY.md](./docs/QUICK_DEPLOY.md)

🔧 **故障排查指南**：[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

🔒 **安全说明**：[docs/SECURITY.md](./docs/SECURITY.md)

---

## 📁 项目结构

```
PicoPics/
├── 📁 cdn-worker/              # CDN 内容分发 Worker
├── 📁 uploader-worker/         # 上传处理 Worker
├── 📁 history-worker/          # 历史查询 Worker
├── 📁 r2-browser-worker/       # 管理界面 Worker
├── 📁 CFworkerImageFRONTED/    # Next.js 前端应用
├── 📁 docs/                    # 📚 文档目录
│   ├── 📄 ENVIRONMENT_SETUP.md     # 📖 环境配置指南
│   ├── 📄 DEPLOYMENT_CHECKLIST.md  # 📋 部署检查清单
│   ├── 📄 QUICK_DEPLOY.md          # 🚀 快速部署指南
│   ├── 📄 TROUBLESHOOTING.md       # 🔧 故障排查指南
│   └── 📄 SECURITY.md              # 🔒 安全说明
├── 📄 configure.sh             # 🔐 安全环境配置脚本
├── 📄 deploy.sh                # 🚀 一键部署脚本
├── 📄 env.template             # 📋 环境变量模板
├── 📄 .gitignore               # 🚫 Git 忽略文件
├── 📄 LICENSE                  # 📄 MIT 许可证
└── 📄 README.md                # 📖 项目说明
```

---

## 🏗️ 技术架构

### 核心组件

| 组件         | 技术栈                          | 职责                         | 部署状态  |
| ------------ | ------------------------------- | ---------------------------- | --------- |
| **前端界面** | Next.js 14 + React + TypeScript | 用户交互和文件上传           | ✅ 已部署 |
| **上传服务** | Cloudflare Workers + AI         | 身份验证、内容审核、文件处理 | ✅ 已部署 |
| **存储层**   | Cloudflare R2                   | 高持久性对象存储             | ✅ 已配置 |
| **数据库**   | Cloudflare D1                   | 元数据存储和查询             | ✅ 已配置 |
| **缓存层**   | Cloudflare KV                   | 用户会话和缓存               | ✅ 已配置 |
| **状态管理** | Durable Objects                 | 配额控制和速率限制           | ✅ 已部署 |
| **管理界面** | Cloudflare Workers              | 存储桶内容管理               | ✅ 已部署 |
| **历史服务** | Cloudflare Workers + D1         | 上传历史查询                 | ✅ 已部署 |
| **CDN 网络** | Cloudflare CDN                  | 全球内容分发和缓存           | ✅ 已部署 |

---

## 🔧 API 参考

### 上传接口
```typescript
POST /upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

// 响应
{
  "success": true,
  "url": "https://cdn.example.com/image.jpg",
  "fileName": "image.jpg",
  "size": 1024000,
  "type": "image/jpeg"
}
```

### 获取配额
```typescript
GET /quota
Authorization: Bearer <token>

// 响应
{
  "used": 50000000,
  "limit": 100000000,
  "resetTime": "2024-12-31T23:59:59Z"
}
```

---

## 🤝 贡献指南

我们欢迎各种形式的贡献！请遵循以下步骤：

### 🚀 快速开始贡献
1. **Fork 项目** 到你的 GitHub 账户
2. **克隆到本地** 并安装依赖
3. **创建特性分支** `git checkout -b feature/amazing-feature`
4. **提交更改** `git commit -m 'Add amazing feature'`
5. **推送分支** `git push origin feature/amazing-feature`
6. **创建 Pull Request**

### 🔒 安全贡献
**重要**: 贡献代码时请注意：
- **不要提交** 真实的 `wrangler.toml` 文件（已加入 `.gitignore`）
- **不要包含** 真实的 API 密钥或敏感信息
- **使用环境变量** 引用所有敏感配置
- **测试安全配置** 确保不会泄露敏感信息

---

## 📞 联系我们

- **📚 GitHub**: [https://github.com/your-username/PicoPics](https://github.com/your-username/PicoPics)
- **💬 问题反馈**: [GitHub Issues](https://github.com/your-username/PicoPics/issues)
- **👨‍💻 作者**: [Your Name](https://github.com/your-username)

---

## 📄 许可证

本项目采用 **MIT 许可证** 开源协议 - 详见 [LICENSE](./LICENSE) 文件

---

<div align="center">

**🌟 如果这个项目对你有帮助，请给我们一个 Star！🌟**

</div>