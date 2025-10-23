# PicoPics v2 环境配置说明

## 前端域名配置

- **自定义域名**: `v2.pico.lambdax.me`
- **部署方式**: Cloudflare Pages
- **域名用途**: 仅用于前端访问，不是 CDN 或其他 worker 的域名

## API 服务地址

```bash
# 上传服务
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-v2-prod.haoweiw370.workers.dev/upload

# 历史记录服务
NEXT_PUBLIC_HISTORY_API=https://history-worker-v2-prod.haoweiw370.workers.dev

# 管理服务
NEXT_PUBLIC_ADMIN_API=https://r2-browser-worker-v2-prod.haoweiw370.workers.dev

# CDN 服务
NEXT_PUBLIC_CDN_URL=https://cdn-worker-v2-prod.haoweiw370.workers.dev
```

## 数据库配置

- **R2 存储桶**: `next-lambda-image-r2`
- **D1 数据库**: `v2-pico-pics-db1`
- **账户 ID**: `fc590bfe34fc6df2312c469a5db04aa2`
- **D1 数据库 ID**: `90ca5dd2-fc00-475b-99ac-99810d559356`

## 部署配置

1. **前端部署**: 使用自定义域名 `v2.pico.lambdax.me`
2. **Worker 部署**: 使用 Cloudflare Workers 默认域名
3. **CORS 配置**: 允许前端域名访问所有 worker 服务
