# Uploader Worker

专门处理图片上传的 Cloudflare Worker。

## 功能

✅ **图片上传**

- 接收前端 POST 请求
- 验证文件类型（只允许图片）
- 验证文件大小（单张最大 10MB）
- 生成随机安全的文件名
- 存储到 R2 存储桶

✅ **每日配额限制**

- 使用 Durable Object 追踪每日上传量
- 默认每天最多 2000MB
- 按 UTC 日期重置
- 可通过 `DAILY_QUOTA_BYTES` 环境变量配置

✅ **安全特性**

- 速率限制（每分钟最多 30 次请求）
- 并发控制（最多 50 个同时上传）
- CORS 跨域支持
- IP 级别的速率限制

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

编辑 `wrangler.toml`:

```toml
account_id = "你的账户ID"  # wrangler whoami 获取

[vars]
R2_PUBLIC_BASE = "https://pic.yourdomain.com"  # CDN 域名
MAX_UPLOAD_SIZE = "10485760"  # 10MB
DAILY_QUOTA_BYTES = "2097152000"  # 2000MB
ALLOWED_ORIGINS = "*"  # 或指定域名
```

### 3. 本地开发

```bash
npm run dev
```

Worker 将在 http://localhost:8787 运行

### 4. 部署

```bash
# 部署到开发环境
npm run deploy

# 部署到生产环境
npm run deploy:prod
```

## API 端点

### POST /upload

上传图片。

**请求：**

- Content-Type: image/\*
- Body: 图片文件的二进制数据

**响应（成功）：**

```json
{
  "success": true,
  "url": "https://pic.yourdomain.com/abc123.jpg",
  "fileName": "abc123.jpg",
  "size": 102400,
  "type": "image/jpeg",
  "uploadedAt": "2025-10-21T10:30:00.000Z"
}
```

**响应（失败）：**

```json
{
  "success": false,
  "error": "文件过大，最大允许 10MB",
  "code": "ERR_413"
}
```

### GET /quota

查询今日配额使用情况。

**响应：**

```json
{
  "usedBytes": 524288000,
  "remainingBytes": 1572864000,
  "date": "2025-10-21"
}
```

## 环境变量

| 变量                | 说明                     | 默认值              |
| ------------------- | ------------------------ | ------------------- |
| `R2_PUBLIC_BASE`    | CDN 公开访问域名         | -                   |
| `MAX_UPLOAD_SIZE`   | 单张图片最大大小（字节） | 10485760 (10MB)     |
| `DAILY_QUOTA_BYTES` | 每日总上传配额（字节）   | 2097152000 (2000MB) |
| `ALLOWED_ORIGINS`   | 允许的 CORS 来源         | `*`                 |

## 限制说明

| 限制类型     | 值           |
| ------------ | ------------ |
| 单张图片最大 | 10MB         |
| 每日总配额   | 2000MB       |
| 速率限制     | 30 请求/分钟 |
| 并发上传     | 50           |

## 错误代码

| 代码    | 说明                         |
| ------- | ---------------------------- |
| ERR_400 | 请求错误（如文件类型不支持） |
| ERR_413 | 文件过大                     |
| ERR_429 | 请求过于频繁或配额已用完     |
| ERR_500 | 服务器内部错误               |
| ERR_503 | 服务繁忙                     |

## 与 CDN Worker 的关系

- **Uploader Worker**：处理上传，将图片存入 R2
- **CDN Worker**：处理访问，从 R2 读取图片并分发

两者通过 R2 存储桶连接，但各自独立部署和扩展。

## License

MIT
