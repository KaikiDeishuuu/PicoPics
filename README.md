# PicoPics V2

现代化图片托管平台 - 基于 Next.js 15 + Cloudflare Workers 的高性能图片分享解决方案

> **AI-Assisted Development**
>
> This project is fully created with AI assistance. All code, design, and architecture decisions were made collaboratively with AI to deliver a modern, efficient, and maintainable codebase.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Styled with Tailwind CSS](https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Powered by Cloudflare](https://img.shields.io/badge/Powered%20by-Cloudflare-orange?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

## 核心特性

- **高性能** - Cloudflare 边缘计算，毫秒级响应
- **安全可靠** - GitHub OAuth + JWT 认证
- **响应式设计** - 完美适配所有设备
- **现代化 UI** - 流畅动画和暗色主题
- **实时通知** - Telegram Bot 集成
- **管理面板** - 完整的后台管理系统
- **系统监控** - 多服务器实时监控仪表板

## 技术栈

### 前端

- Next.js 15 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- React Query
- Framer Motion

### 后端

- Cloudflare Workers (Hono)
- Cloudflare R2 (对象存储)
- Cloudflare D1 (SQLite 数据库)
- Durable Objects (状态管理)

### 部署

- Vercel (前端)
- Cloudflare Workers (后端)

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env.local` 并填入你的配置：

```bash
cp env.example .env.local
```

### 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 部署到生产环境

```bash
# 部署前端到 Vercel
npx vercel --prod

# 部署 Workers 到 Cloudflare
npm run deploy
```

## 文档

查看 [docs](./docs) 目录获取完整文档：

- [开发指南](./docs/DEVELOPMENT.md) - 开发环境配置和调试
- [部署指南](./docs/DEPLOY_GUIDE.md) - 完整部署教程
- [配置指南](./docs/CONFIG_GUIDE.md) - 环境变量和安全配置
- [通知系统](./docs/NOTIFICATION_GUIDE.md) - 消息通知配置
- [Telegram Bot](./docs/TELEGRAM_NOTIFICATION_GUIDE.md) - Telegram 集成
- [安全指南](./docs/SECURITY.md) - 安全最佳实践

## 主要功能

### 图片管理

- 图片上传和管理
- 多格式分享链接 (URL/HTML/Markdown/BBCode)
- React Masonry 瀑布流布局
- 图片压缩和优化

### 用户系统

- GitHub OAuth 认证
- JWT 令牌管理
- 用户权限控制
- 个人资料管理

### 管理功能

- 管理员面板
- IP 黑名单管理
- 用户管理
- 系统设置

### 系统监控

- 多服务器实时监控
- CPU、内存、网络、磁盘监控
- 性能趋势图表
- 自定义服务器命名
- 地理位置显示
- 移动端适配
- 明暗主题切换

### 通知系统

- Telegram Bot 集成
- 实时消息推送
- 系统告警

## 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 代码检查
npm run format       # 代码格式化
npm run test         # 运行测试
```

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！
