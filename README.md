# Kaiki Image - Cloudflare R2 图床

> 基于 Cloudflare Workers + R2 + AI 的现代化图床服务  
> 完整的图片上传和存储解决方案，采用 TypeScript + 微服务架构  
> Created by **Kaiki**

## 架构设计

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Frontend  │─────>│ Uploader Worker  │─────>│  R2 Bucket   │
│  (Next.js)  │ POST │  (上传服务)      │ Write│   (存储)     │
└─────────────┘      └──────────────────┘      └──────────────┘
                              │                         │
                              │ Read                    │
                              ↓                         ↓
                     ┌──────────────────┐      ┌──────────────┐
                     │   CDN Worker     │<─────│              │
                     │   (分发服务)     │      │              │
                     └──────────────────┘      └──────────────┘
                              ↓
                     ┌──────────────────┐
                     │    End Users     │
                     │   (图片访问)     │
                     └──────────────────┘
```

## 核心特性

- **全球 CDN** - Cloudflare 边缘网络加速
- **GitHub OAuth** - 安全的用户认证
- **AI 审核** - Cloudflare AI 自动内容检测
- **配额管理** - 每日上传限额保护
- **防滥用** - IP 黑名单与速率限制

## 技术栈

### 后端

- **Cloudflare Workers** - 无服务器计算
- **R2 Storage** - 对象存储
- **Cloudflare AI** - ResNet-50 图像分类
- **Durable Objects** - 配额与黑名单管理

### 前端

- **Next.js 14** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 原子化 CSS
- **Cloudflare Pages** - 静态托管

## 项目结构

## ✨ 特性```

┌─────────────┐ ┌──────────────────┐ ┌──────────────┐

- 🚀 **全球 CDN** - Cloudflare 边缘网络加速 │ Frontend │────────>│ Uploader Worker │────────>│ R2 Bucket │

- 🔐 **GitHub OAuth** - 安全的用户认证 │ (Next.js) │ POST │ (上传服务) │ Write │ (存储) │

- 🤖 **AI 审核** - Cloudflare AI 自动内容检测 └─────────────┘ └──────────────────┘ └──────────────┘

- 📊 **配额管理** - 每日上传限额保护 │

- 🛡️ **防滥用** - IP 黑名单与速率限制 │ Read

- 📱 **响应式** - 完美支持移动设备 ↓

- 🎨 **现代 UI** - 渐变主题，流畅动画 ┌──────────────────┐ ┌──────────────┐

                        │   CDN Worker     │<────────│              │

## 🏗️ 技术栈 │ (分发服务) │ │ │

                        └──────────────────┘         └──────────────┘

### 后端 ↓

- **Cloudflare Workers** - 无服务器计算 ┌──────────────────┐

- **R2 Storage** - 对象存储 │ End Users │

- **Cloudflare AI** - ResNet-50 图像分类 │ (图片访问) │

- **Durable Objects** - 配额与黑名单管理 └──────────────────┘

````

### 前端

- **Next.js 14** - React 框架## 📁 项目结构

- **TypeScript** - 类型安全

- **Tailwind CSS** - 原子化 CSS```

- **Cloudflare Pages** - 静态托管
```
CFworkerImage/
├── uploader-worker/          # 上传 Worker（处理图片上传 + 配额管理）
│   ├── src/index.ts          # 主入口
│   ├── src/upload_quota.ts   # Durable Object（配额追踪）
│   ├── wrangler.toml         # Worker 配置
│   └── package.json
│
├── cdn-worker/               # CDN Worker（高性能图片分发）
│   ├── src/index.ts          # 主入口
│   ├── wrangler.toml         # Worker 配置
│   └── package.json
│
├── CFworkerImageFRONTED/     # 前端界面（Next.js + TypeScript）
│   ├── src/app/              # Next.js App Router
│   ├── src/components/       # React 组件
│   ├── src/services/         # API 服务
│   ├── tsconfig.json
│   └── package.json
│
├── DEPLOY_GUIDE.md           # 部署指南（重要！）
├── SECURITY.md               # 安全配置说明
└── README.md                 # 本文件
```


## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/CFworkerImage.git
cd CFworkerImage
```

### 2. 部署后端 Workers

```bash
# 部署上传服务
cd uploader-worker
npm install
npx wrangler deploy --env production

# 部署 CDN 服务
cd ../cdn-worker
npm install
npx wrangler deploy --env production
```

### 3. 部署前端

```bash
cd ../CFworkerImageFRONTED
npm install
npm run build
npx wrangler pages deploy out --project-name=your-project-name
```

### 4. 配置环境变量

```bash
# Telegram 通知（可选）
npx wrangler secret put TELEGRAM_BOT_TOKEN --env production
npx wrangler secret put TELEGRAM_CHAT_ID --env production

# GitHub OAuth（可选）
npx wrangler secret put GITHUB_CLIENT_ID --env production
```

详细配置说明请参考 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)




## 配置说明

### Uploader Worker 环境变量

| 变量                | 说明                                  | 默认值              |
| ------------------- | ------------------------------------- | ------------------- |
| `R2_PUBLIC_BASE`    | CDN 域名（返回给前端的图片 URL 前缀） | -                   |
| `MAX_UPLOAD_SIZE`   | 单张图片最大大小（字节）              | 10485760 (10MB)     |
| `DAILY_QUOTA_BYTES` | 每日总配额（字节）                    | 2097152000 (2000MB) |
| `ALLOWED_ORIGINS`   | 允许的 CORS 来源                      | `*`                 |

### CDN Worker 环境变量

| 变量              | 说明             | 默认值          |
| ----------------- | ---------------- | --------------- |
| `CACHE_MAX_AGE`   | 缓存时间（秒）   | 31536000 (1 年) |
| `ALLOWED_ORIGINS` | 允许的 CORS 来源 | `*`             |

### 前端环境变量

| 变量                     | 说明                | 示例                                   |
| ------------------------ | ------------------- | -------------------------------------- |
| `NEXT_PUBLIC_UPLOAD_API` | Uploader Worker URL | `https://upload.yourdomain.com/upload` |

## 限制说明

| 项目         | 限制         |
| ------------ | ------------ |
| 单张图片最大 | 10MB         |
| 每日总配额   | 2000MB       |
| 上传速率限制 | 30 请求/分钟 |
| 并发上传数   | 50           |
| CDN 缓存时间 | 1 年         |

## 相关文档

- [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) - 完整部署指南
- [SECURITY.md](./SECURITY.md) - 安全配置说明
- [uploader-worker/README.md](./uploader-worker/README.md) - 上传服务文档
- [cdn-worker/README.md](./cdn-worker/README.md) - CDN 服务文档
- [CFworkerImageFRONTED/README.md](./CFworkerImageFRONTED/README.md) - 前端文档

## 开源协议

MIT License

---

**Made by [Kaiki](https://github.com/KaikiDeishuuu)**
````
