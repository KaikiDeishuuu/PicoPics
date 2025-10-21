# 图片上传前端

基于 Next.js + TypeScript + Tailwind CSS 的图片上传界面。

## 功能特性

✨ **三种上传方式**

- 🖱️ 点击上传：点击区域选择文件
- 🎯 拖拽上传：直接拖拽图片文件
- 📋 粘贴上传：Ctrl+V / Cmd+V 粘贴截图

🎨 **美观的 UI**

- 使用 Tailwind CSS 构建
- 响应式设计，支持移动端
- 平滑的动画效果
- 直观的状态反馈

📊 **完整的功能**

- 实时上传进度显示
- 图片预览
- **6 种链接格式**：
  - 📎 直接链接 (URL)
  - 🌐 HTML 标签
  - 🌐 HTML (简化版)
  - 📝 Markdown
  - 🔗 Markdown (可点击)
  - 💬 BBCode
- 一键复制链接
- 格式说明提示
- 错误处理和提示

### 支持的引用格式

| 格式                  | 示例                                 | 用途             |
| --------------------- | ------------------------------------ | ---------------- |
| **直接链接**          | `https://pic.yourdomain.com/abc.jpg` | 浏览器访问、分享 |
| **HTML**              | `<img src="..." alt="...">`          | 网页开发         |
| **HTML (简化)**       | `<img src="...">`                    | 快速插入         |
| **Markdown**          | `![alt](url)`                        | GitHub、技术博客 |
| **Markdown (可点击)** | `[![alt](url)](url)`                 | 点击查看大图     |
| **BBCode**            | `[img]url[/img]`                     | 论坛、贴吧       |

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **HTTP**: Axios
- **部署**: Cloudflare Pages

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`:

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，设置你的后端 API 地址：

```env
NEXT_PUBLIC_UPLOAD_API=https://your-worker.your-account.workers.dev/upload
```

### 3. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 部署到 Cloudflare Pages

### 方法 1: 通过 Git 自动部署

1. 将代码推送到 GitHub/GitLab
2. 在 Cloudflare Dashboard 中创建 Pages 项目
3. 连接你的 Git 仓库
4. 配置构建设置：
   - **构建命令**: `npm run build`
   - **构建输出目录**: `.next`
   - **根目录**: `CFworkerImageFRONTED`
5. 添加环境变量：
   - `NEXT_PUBLIC_UPLOAD_API`: 你的 Worker URL

### 方法 2: 使用 Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录
wrangler login

# 构建
npm run build

# 部署
wrangler pages deploy .next
```

## 项目结构

```
CFworkerImageFRONTED/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 主页面
│   │   └── globals.css        # 全局样式
│   ├── components/            # React 组件
│   │   ├── UploadZone.tsx    # 上传区域组件
│   │   └── ResultDisplay.tsx # 结果展示组件
│   ├── services/              # API 服务
│   │   └── upload.ts         # 上传服务
│   └── types/                 # TypeScript 类型定义
│       └── index.ts
├── public/                    # 静态资源
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## 配置说明

### next.config.js

```javascript
const nextConfig = {
  // 环境变量
  env: {
    NEXT_PUBLIC_UPLOAD_API: process.env.NEXT_PUBLIC_UPLOAD_API,
  },

  // 图片域名配置（如果使用 Next.js Image 组件）
  images: {
    domains: ["pic.lambdax.me"],
  },
};
```

### 环境变量

| 变量名                   | 说明              | 示例                                |
| ------------------------ | ----------------- | ----------------------------------- |
| `NEXT_PUBLIC_UPLOAD_API` | 后端上传 API 地址 | `https://api.yourdomain.com/upload` |

⚠️ **注意**: 以 `NEXT_PUBLIC_` 开头的变量会暴露到浏览器端。

## 使用方法

### 1. 点击上传

点击上传区域 → 选择图片文件 → 等待上传完成

### 2. 拖拽上传

将图片文件拖拽到上传区域 → 松开鼠标 → 等待上传完成

### 3. 粘贴上传

在页面任意位置按 Ctrl+V (Mac: Cmd+V) → 自动上传剪贴板中的图片

### 4. 复制链接

上传成功后，点击对应格式的"复制"按钮即可复制链接。

## 开发指南

### 添加新的链接格式

编辑 `src/services/upload.ts` 中的 `generateLinkFormats` 函数：

```typescript
export function generateLinkFormats(url: string, fileName?: string) {
  return {
    // ... 现有格式
    myCustomFormat: `自定义格式: ${url}`,
  };
}
```

然后在 `src/components/ResultDisplay.tsx` 中添加对应的 UI。

### 自定义样式

所有样式使用 Tailwind CSS。你可以：

1. 修改 `tailwind.config.ts` 来自定义主题
2. 编辑 `src/app/globals.css` 添加全局样式
3. 在组件中使用 Tailwind 类名

### 添加新功能

1. 在 `src/types/index.ts` 中定义类型
2. 在 `src/services/` 中实现业务逻辑
3. 在 `src/components/` 中创建 UI 组件
4. 在 `src/app/page.tsx` 中集成

## 常见问题

### 上传失败怎么办？

1. 检查环境变量 `NEXT_PUBLIC_UPLOAD_API` 是否正确
2. 确认后端 Worker 已部署并运行
3. 检查浏览器控制台的错误信息
4. 确认后端已配置 CORS

### 如何限制文件大小？

在 `src/services/upload.ts` 中修改 `maxSize` 变量：

```typescript
const maxSize = 10 * 1024 * 1024; // 10MB
```

同时确保后端 Worker 的限制与之匹配。

### 如何添加身份验证？

1. 修改 `src/services/upload.ts` 的请求头：

```typescript
headers: {
  'Content-Type': file.type,
  'Authorization': `Bearer ${yourToken}`,
}
```

2. 确保后端 Worker 支持验证

## 性能优化

- ✅ 使用 Next.js 14 App Router
- ✅ TypeScript 严格模式
- ✅ Tailwind CSS 按需加载
- ✅ 图片懒加载
- ✅ 代码分割

## 浏览器兼容性

- Chrome/Edge: ✅ 最新版本
- Firefox: ✅ 最新版本
- Safari: ✅ 最新版本
- Mobile: ✅ iOS Safari, Chrome Mobile

## License

MIT

## 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
