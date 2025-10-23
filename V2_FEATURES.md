# PicoPics V2 - 功能特性文档

## 🎯 架构概览

PicoPics V2 是一个现代化的图片上传和管理平台，采用前后端分离架构：

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **后端**: Cloudflare Workers + Hono
- **存储**: Cloudflare R2 (对象存储) + D1 (数据库)
- **部署**: Vercel (前端) + Cloudflare Workers (后端)

---

## ✨ 核心功能

### 1. 现代化 UI 系统

#### 组件库

- **shadcn/ui**: 基于 Radix UI 的高质量组件库
- **Framer Motion**: 流畅的动画系统
- **Tailwind CSS**: 原子化 CSS 框架

#### 主题系统

- 支持 **浅色/深色/系统** 三种主题模式
- CSS Variables 动态主题切换
- Framer Motion 平滑过渡动画

#### 业务组件

- `UploadCard`: 拖拽上传组件，支持文件预览
- `QuotaBadge`: 配额显示组件，可视化存储使用情况
- `ProgressBar`: 进度条组件，实时显示上传进度
- `Toast`: 通知系统，统一的用户反馈
- `ThemeToggle`: 主题切换按钮

---

### 2. 数据管理优化

#### React Query 集成

```typescript
// 自动缓存、重试、状态管理
const uploadMutation = useUploadImage();
const { data, isLoading } = useUserImages();
```

#### 智能缓存层

```typescript
// stale-while-revalidate 策略
const data = await smartCache.get(key, fetcher, {
  maxAge: 5 * 60 * 1000, // 5分钟新鲜
  staleWhileRevalidate: 10 * 60 * 1000, // 10分钟过期
});
```

**特性**:

- 自动后台更新过期数据
- 标签化缓存失效
- 缓存统计信息
- 最大缓存条目限制

#### Zod Schema 验证

```typescript
// 统一的类型定义和运行时验证
export const ImageHistorySchema = z.object({
  id: z.number(),
  fileName: z.string(),
  url: z.string().url(),
  size: z.number().positive(),
  type: z.string(),
  uploadedAt: z.string(),
  r2ObjectKey: z.string(),
});
```

---

### 3. PWA 支持

#### 功能特性

- ✅ 离线访问能力
- ✅ 应用清单配置
- ✅ 智能缓存策略
- ✅ 安装到主屏幕

#### 缓存策略

```javascript
// 图片使用 CacheFirst，API 使用 NetworkFirst
runtimeCaching: [
  {
    urlPattern: /\.(png|jpg|jpeg|gif|webp)$/,
    handler: "CacheFirst",
    options: {
      cacheName: "images",
      expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /\.workers\.dev/,
    handler: "NetworkFirst",
    options: {
      cacheName: "api",
      expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
    },
  },
];
```

---

### 4. 性能优化

#### 动态限流系统

```typescript
// 基于用户行为的动态配额
const baseQuota = 100 * 1024 * 1024; // 100MB 基础配额
const activityBonus = Math.min(uploadCount * 1048576, 52428800); // 最多 50MB 奖励
const dynamicQuota = baseQuota + activityBonus;
```

**特性**:

- 活跃用户获得更高配额
- 防止滥用的动态限制
- Durable Objects 分布式计数

#### 边缘图像优化

```typescript
// CDN Worker 支持动态缩略图
GET /image.jpg?w=200&h=200&q=80&f=webp
```

**支持参数**:

- `w`: 宽度
- `h`: 高度
- `q`: 质量 (1-100)
- `f`: 格式 (auto/webp/avif)

#### 代码分割

```javascript
// Webpack 优化配置
splitChunks: {
  cacheGroups: {
    vendor: {
      test: /node_modules/,
      maxSize: 500 * 1024
    },
    common: {
      minChunks: 2,
      maxSize: 500 * 1024
    }
  }
}
```

---

### 5. 开发体验优化

#### Biome 代码检查

```bash
npm run lint        # 检查代码
npm run lint:fix    # 自动修复
npm run format      # 格式化代码
npm run check       # 完整检查（lint + format）
```

**优势**:

- 比 ESLint + Prettier 快 10-100 倍
- 类型感知的代码检查
- 自动修复功能

#### Vitest 测试

```bash
npm run test             # 运行测试
npm run test:ui          # 测试 UI 界面
npm run test:coverage    # 测试覆盖率
```

**特性**:

- 兼容 Jest API
- MSW 模拟 API 请求
- React Testing Library 组件测试

#### GitHub Actions CI/CD

自动化流程:

1. **Lint & Format**: 代码质量检查
2. **Test**: 运行测试套件
3. **Build**: 构建应用
4. **Deploy**: 部署到 Cloudflare/Vercel

---

## 🔒 安全特性

### 1. 输入验证

- Zod schema 运行时验证
- 文件类型和大小限制
- 防 XSS 和注入攻击

### 2. 访问控制

- GitHub OAuth 认证
- JWT Token 验证
- 用户级数据隔离

### 3. CORS 配置

```typescript
// 动态 CORS 白名单
const allowedOrigins = [
  "https://v2.pico.lambdax.me",
  "https://picopics.vercel.app",
];
```

---

## 📦 技术栈总结

### 前端

| 技术            | 用途        | 版本   |
| --------------- | ----------- | ------ |
| Next.js         | React 框架  | 14     |
| TypeScript      | 类型系统    | 5+     |
| Tailwind CSS    | 样式框架    | 3+     |
| shadcn/ui       | 组件库      | latest |
| Framer Motion   | 动画库      | 11+    |
| React Query     | 数据管理    | 5+     |
| React Hook Form | 表单管理    | 7+     |
| Zod             | Schema 验证 | 3+     |

### 后端

| 技术               | 用途          |
| ------------------ | ------------- |
| Cloudflare Workers | 边缘计算      |
| Hono               | Web 框架      |
| Cloudflare R2      | 对象存储      |
| Cloudflare D1      | SQLite 数据库 |
| Durable Objects    | 分布式状态    |
| Cloudflare KV      | 键值存储      |

### 工程化

| 工具           | 用途             |
| -------------- | ---------------- |
| Biome          | Linter/Formatter |
| Vitest         | 测试框架         |
| MSW            | API Mock         |
| GitHub Actions | CI/CD            |
| Wrangler       | Cloudflare CLI   |

---

## 🚀 部署指南

### 前端部署 (Vercel)

```bash
npm run vercel:deploy
```

### Workers 部署

```bash
# 部署所有 Workers
cd uploader-worker && npx wrangler deploy
cd history-worker && npx wrangler deploy
cd cdn-worker && npx wrangler deploy
cd r2-browser-worker && npx wrangler deploy
```

### 环境变量

查看 `.env.example` 获取完整的环境变量列表。

---

## 📊 性能指标

- **首次加载**: < 2s
- **交互时间**: < 1s
- **缓存命中率**: > 80%
- **PWA Lighthouse 评分**: > 90

---

## 🎯 未来规划

- [ ] AI 辅助上传（内容审核）
- [ ] 图片 CDN 全球加速
- [ ] 批量上传支持
- [ ] 图片编辑功能
- [ ] 分享链接生成
- [ ] WebP/AVIF 自动转换
- [ ] 图片压缩优化

---

**构建时间**: 2025-10-23  
**版本**: 2.0.0  
**作者**: PicoPics Team
