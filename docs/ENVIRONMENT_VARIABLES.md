# 环境变量配置指南

## 问题说明

即使在 Vercel 中配置了环境变量，为什么代码中还会有硬编码的 URL？

### 原因

1. **Fallback 机制**：代码中的硬编码值是作为后备（fallback）方案存在的
2. **环境变量未正确传递**：某些场景下环境变量可能未正确加载
3. **客户端 vs 服务端**：Next.js 中只有 `NEXT_PUBLIC_` 前缀的变量才能在客户端访问

## 环境变量配置

### 必需的环境变量

```bash
# Vercel/生产环境
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-v2-prod.haoweiw370.workers.dev
NEXT_PUBLIC_CDN_BASE=https://image.hiaplha.xyz
NEXT_PUBLIC_MAX_UPLOAD_SIZE=10485760

# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_secret
```

### Vercel 配置步骤

1. 进入 Vercel Dashboard
2. 选择项目 → Settings → Environment Variables
3. 添加以上环境变量
4. **重要**：选择适用的环境（Production / Preview / Development）
5. 重新部署项目

### 本地开发配置

创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-v2-prod.haoweiw370.workers.dev
NEXT_PUBLIC_CDN_BASE=https://image.hiaplha.xyz
NEXT_PUBLIC_MAX_UPLOAD_SIZE=10485760
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_secret
```

## 代码中的最佳实践

### ✅ 正确做法

```typescript
// 始终使用环境变量，提供合理的 fallback
const apiUrl = 
  process.env.NEXT_PUBLIC_UPLOAD_API || 
  "https://uploader-worker-v2-prod.haoweiw370.workers.dev";

const response = await fetch(`${apiUrl}/api/endpoint`);
```

### ❌ 错误做法

```typescript
// 直接硬编码 URL
const response = await fetch(
  "https://uploader-worker-v2-prod.haoweiw370.workers.dev/api/endpoint"
);
```

## 常见问题

### Q1: 为什么 Vercel 配置了还是用硬编码？

**A**: 因为代码中的硬编码是 fallback 值，只有当环境变量**完全未定义**时才会使用。如果环境变量已设置，应该会使用环境变量的值。

检查方法：
```typescript
console.log("API URL:", process.env.NEXT_PUBLIC_UPLOAD_API);
```

### Q2: 环境变量不生效怎么办？

**可能原因**：
1. 变量名拼写错误
2. 客户端代码没有使用 `NEXT_PUBLIC_` 前缀
3. 修改环境变量后没有重新部署
4. 环境变量没有应用到当前环境（Production/Preview）

**解决方法**：
1. 检查变量名是否正确
2. 确保客户端代码使用 `NEXT_PUBLIC_` 前缀
3. 在 Vercel 中修改环境变量后，重新部署项目
4. 检查环境变量是否应用到了正确的环境

### Q3: 如何验证环境变量是否生效？

在页面中添加调试代码：

```typescript
useEffect(() => {
  console.log("Upload API:", process.env.NEXT_PUBLIC_UPLOAD_API);
  console.log("CDN Base:", process.env.NEXT_PUBLIC_CDN_BASE);
}, []);
```

打开浏览器控制台查看输出。

## 相关文件

需要使用环境变量的文件：
- `lib/hooks/use-queries.ts` - React Query hooks
- `lib/api.ts` - API 工具函数
- `app/admin/page.tsx` - Admin 页面
- `app/settings/page.tsx` - 设置页面
- `app/auth/callback/page.tsx` - OAuth 回调
- `components/ui/ip-management.tsx` - IP 管理

## 硬编码 Fallback 的原因

我们保留硬编码的 fallback 值是为了：

1. **开发体验**：本地开发时即使忘记配置也能工作
2. **容错性**：环境变量加载失败时有备用方案
3. **调试方便**：快速识别是否使用了默认值

但在生产环境中，**应该始终依赖环境变量**，硬编码只是最后的保障。

## 推荐配置流程

1. **本地开发**：
   - 复制 `env.example` 到 `.env.local`
   - 填写正确的环境变量
   - 运行 `npm run dev`

2. **Vercel 部署**：
   - 在 Vercel Dashboard 配置所有环境变量
   - 确保选择了正确的环境（Production）
   - 触发新的部署或手动重新部署

3. **验证**：
   - 打开生产环境网站
   - F12 查看 Network 标签
   - 确认 API 请求使用的是正确的 URL

## 总结

- ✅ 硬编码的 URL 是 **fallback 值**，不是 bug
- ✅ 在 Vercel 配置环境变量后，应该使用环境变量的值
- ✅ 如果还是用硬编码，检查变量名、前缀、部署状态
- ✅ 使用 `console.log` 验证环境变量是否正确加载
