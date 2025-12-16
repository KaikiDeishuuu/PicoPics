# 安全配置快速指南

## ⚠️ 立即需要修改的配置

### 1. 更新 Workers 配置中的域名白名单

**文件**: `workers/uploader-wrangler.toml`

找到这一行：
```toml
ALLOWED_ORIGINS = "vercel.app,localhost,127.0.0.1"
```

修改为你的实际域名：
```toml
ALLOWED_ORIGINS = "your-app-name.vercel.app,yourdomain.com,localhost"
```

**文件**: `workers/cdn-wrangler.toml`

找到这一行：
```toml
ALLOWED_REFERERS = "https://image.hiaplha.xyz,localhost,127.0.0.1,vercel.app"
```

修改为：
```toml
ALLOWED_REFERERS = "https://image.hiaplha.xyz,your-app-name.vercel.app,yourdomain.com,localhost"
```

### 2. 重新部署 Workers

```bash
cd workers

# 部署 CDN worker
npx wrangler deploy --config cdn-wrangler.toml

# 部署 Uploader worker
npx wrangler deploy --config uploader-wrangler.toml

# 部署 History worker (如果有的话)
npx wrangler deploy --config history-wrangler.toml
```

### 3. 验证防护是否生效

```bash
# 测试 CDN 防盗链（应该被拒绝）
curl -H "Referer: https://evil-site.com" https://image.hiaplha.xyz/some-image.png
# 应该返回: 403 Forbidden

# 测试 Uploader 来源限制（应该被拒绝）
curl -H "Origin: https://evil-site.com" https://your-worker.workers.dev/upload
# 应该返回: Unauthorized origin
```

## 🔒 已实施的安全措施

### CDN Worker (image.hiaplha.xyz)
- ✅ Referer 白名单检查
- ✅ 记录可疑请求日志
- ✅ 健康检查端点不受限制

### Uploader Worker
- ✅ Origin/Referer 双重检查
- ✅ 强制 GitHub 认证
- ✅ IP 黑名单机制
- ✅ 每日上传配额限制
- ✅ 文件大小限制

### History Worker
- ✅ GitHub token 验证
- ✅ 用户隔离（只能查看自己的历史）

## 📊 监控建议

### Cloudflare Dashboard
1. 进入 Workers & Pages
2. 选择对应的 Worker
3. 查看 Analytics 选项卡
4. 监控：
   - 请求数量趋势
   - 错误率
   - 响应时间
   - 被拒绝的请求（403 错误）

### 设置告警
1. Notifications → Add
2. 选择 "Worker exceeded daily request limit"
3. 设置阈值（如 100,000 请求/天）
4. 添加邮箱通知

## 🎯 进阶防护（可选）

### 1. 启用 Cloudflare WAF
```bash
# 在 Cloudflare Dashboard
Security → WAF → Create firewall rule

# 规则示例：
If:
  (http.request.uri.path contains "/upload") and
  (not http.referer contains "your-domain.com")
Then:
  Block
```

### 2. 速率限制
```bash
# wrangler.toml 中添加
[limits]
cpu_ms = 50
```

### 3. 图片水印
在上传时自动添加水印，防止盗用。

### 4. 签名 URL
为敏感图片生成带时效的签名 URL。

## ⚙️ 完整部署清单

- [ ] 修改 `uploader-wrangler.toml` 中的 ALLOWED_ORIGINS
- [ ] 修改 `cdn-wrangler.toml` 中的 ALLOWED_REFERERS  
- [ ] 部署 CDN worker
- [ ] 部署 Uploader worker
- [ ] 测试防盗链是否生效
- [ ] 测试正常访问是否正常
- [ ] 在 Cloudflare Dashboard 设置告警
- [ ] 监控 24 小时，确认无异常

## 🆘 如果遇到问题

### 正常请求被拒绝
1. 检查 ALLOWED_ORIGINS 是否包含你的域名
2. 确保域名格式正确（不要包含协议前缀）
3. 查看 Worker 日志，确认拦截原因

### 无法上传图片
1. 检查浏览器控制台错误
2. 确认 Origin header 正确发送
3. 临时将 ALLOWED_ORIGINS 设为 "*" 测试

### CDN 图片无法加载
1. 检查 Referer header
2. 确认你的前端域名在白名单中
3. 查看 CDN worker 日志

## 📝 注意事项

1. **不要使用 `ALLOWED_ORIGINS = "*"`** 在生产环境，这会让防护失效
2. **定期检查日志**，发现异常及时处理
3. **测试后再部署**，避免影响正常用户
4. **保留 localhost 白名单**，方便本地开发
