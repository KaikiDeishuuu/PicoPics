# CDN Worker

专门处理图片分发的 Cloudflare Worker。

## 功能

✅ **高性能图片分发**

- 从 R2 读取图片
- 边缘缓存（Cloudflare CDN）
- 长期浏览器缓存（1 年）
- 支持条件请求（304 Not Modified）

✅ **优化特性**

- ETag 支持
- Last-Modified 支持
- Immutable 缓存指令
- CORS 跨域支持

✅ **监控**

- 健康检查端点
- 错误日志

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

编辑 `wrangler.toml`:

```toml
account_id = "你的账户ID"

# 绑定到自定义域名
routes = [
  { pattern = "pic.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[vars]
CACHE_MAX_AGE = "31536000"  # 1 年
ALLOWED_ORIGINS = "*"
```

### 3. 本地开发

```bash
npm run dev
```

### 4. 部署

```bash
# 部署到生产环境
npm run deploy:prod
```

## API 端点

### GET /{filename}

获取图片。

**示例：**

```
GET https://pic.yourdomain.com/abc123.jpg
```

**响应头：**

```
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000, immutable
ETag: "abc123def456"
Last-Modified: Mon, 21 Oct 2025 10:30:00 GMT
```

### GET /health

健康检查。

**响应：**

```json
{
  "service": "CDN Worker",
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-10-21T10:30:00.000Z"
}
```

## 缓存策略

### 边缘缓存

- Cloudflare 自动在全球边缘节点缓存图片
- 缓存时间：1 年
- 基于 `Cache-Control` 头

### 浏览器缓存

- `Cache-Control: public, max-age=31536000, immutable`
- 浏览器缓存 1 年，不会重新验证

### 条件请求

- 支持 `If-None-Match` 头
- 如果 ETag 匹配，返回 304 Not Modified
- 节省带宽

## 环境变量

| 变量              | 说明             | 默认值          |
| ----------------- | ---------------- | --------------- |
| `CACHE_MAX_AGE`   | 缓存时间（秒）   | 31536000 (1 年) |
| `ALLOWED_ORIGINS` | 允许的 CORS 来源 | `*`             |

## 性能优化

✅ **已实施的优化：**

- 使用 Cloudflare 全球 CDN
- 长期缓存减少回源
- ETag 支持减少传输
- Immutable 指令避免重新验证

✅ **推荐的域名配置：**

- 为 CDN Worker 使用专门的子域名（如 `pic.yourdomain.com`）
- 在 Cloudflare DNS 中启用 CDN（橙色云朵）
- 配置自定义 SSL/TLS

## 与 Uploader Worker 的关系

- **Uploader Worker**：负责上传，URL 如 `https://upload.yourdomain.com/upload`
- **CDN Worker**：负责分发，URL 如 `https://pic.yourdomain.com/{filename}`

上传成功后，Uploader Worker 返回的 URL 指向 CDN Worker 的域名。

## 监控建议

在 Cloudflare Dashboard 中监控：

- 请求数量
- 带宽使用
- 缓存命中率
- 错误率

## License

MIT
