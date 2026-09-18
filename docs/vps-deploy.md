# PicoPics VPS 部署（az-japan / Azure Debian 12）

单域名全栈自托管方案：**三个 Cloudflare Worker（uploader/history/cdn）的 Hono 代码原样运行在 Node 网关里**，Cloudflare 绑定由 `server/cf-compat/` 兼容层替换——R2→本地磁盘、D1→SQLite、Durable Objects→进程内实例（SQLite 持久化）、`caches.default`→内存缓存。前端为 Next.js standalone。TLS 由 Caddy 自动签发。

## 架构

```
浏览器 ── https://<域名> ──> Caddy :443
  ├─ POST /auth/callback、/upload、/api/* ──> picopics-api (Node :8080, gateway)
  ├─ GET  /api/history                   ──> 同上（history worker）
  ├─ GET  /images/*                      ──> 同上（cdn worker）
  └─ 其余（含 GET /auth/callback 页面）  ──> picopics-web (Next standalone :3000)

数据：/var/lib/picopics/db.sqlite（SQLite，WAL）
      /var/lib/picopics/images/<对象键>（图片文件 + .__meta__.json 边车）
代码：/opt/picopics/web（Next standalone）、/opt/picopics/server（gateway bundle）
```

组件职责见 `server/gateway.ts`（路由分发与 env 组装）与 `server/cf-compat/`（各绑定 shim）。

## 首次准备（已完成一次的部分可跳过）

1. **系统**：swap 2G、Node 22（NodeSource）、Caddy（官方 apt 源）、build-essential。
2. **目录与用户**：
   ```bash
   sudo useradd --system --home /opt/picopics --shell /usr/sbin/nologin picopics || true
   sudo mkdir -p /opt/picopics/{web,server/dist} /var/lib/picopics
   sudo chown -R picopics:picopics /opt/picopics /var/lib/picopics
   ```
3. **systemd**：复制 `deploy/az-japan/picopics-api.service`、`picopics-web.service` 到 `/etc/systemd/system/`，`systemctl daemon-reload && systemctl enable picopics-api picopics-web`。
4. **Caddy**：`sed 's/__DOMAIN__/<你的域名>/' deploy/az-japan/Caddyfile.template | sudo tee /etc/caddy/Caddyfile`，`sudo systemctl reload caddy`。
5. **配置**：`sudo cp deploy/az-japan/server.env.example /opt/picopics/server/.env` 并填写（属主 picopics，权限 600）：
   - `PUBLIC_ORIGIN=https://<域名>`
   - `GITHUB_CLIENT_ID/SECRET`（GitHub OAuth App，回调 `https://<域名>/auth/callback`）
   - `ADMIN_TOKEN`（随机长字符串，`openssl rand -hex 32`）
   - `TELEGRAM_BOT_TOKEN/CHAT_ID`（可选）
6. **DNS / Azure**：域名 A 记录 → VM 公网 IPv4；NSG 入站放行 80/443。

## 日常部署

```bash
./scripts/deploy-vps.sh <域名>     # 本地构建 → rsync → 远程重启
```

构建发生在本地（服务器只有 853Mi 内存，跑不动 next build），服务器只执行 better-sqlite3 原生模块安装和服务重启。

## 运维速查

```bash
systemctl status picopics-api picopics-web caddy
journalctl -u picopics-api -f              # gateway 日志（含 worker 的 console.log）
sudo -u picopics sqlite3 /var/lib/picopics/db.sqlite   # 查库
curl -s http://127.0.0.1:8080/health       # 网关健康（不经 Caddy）
curl -s https://<域名>/health              # 经 Caddy
```

备份（建议 cron 每日）：

```bash
sudo tar czf /backup/picopics-$(date +%F).tgz /var/lib/picopics
```

## 已知差异（与 Cloudflare 生产相比）

- CDN 的 `?w/&h=` 缩略图参数会重定向到 Cloudflare Image Resizing，VPS 上不可用（客户端不使用该参数）。
- IP 黑名单管理端点与 Durable Object 交互的既有缺陷（admin 写 `global` 实例、检查用 per-IP 实例）按原样保留，与 CF 行为一致。
- 上传/删除的 Telegram 通知在 Node 侧为 fire-and-forget（等价于 Workers 的 waitUntil 弱化版）。
- GitHub token 验证缓存在进程内存（60s），重启即清空。

## 故障排查

- **502**：对应后端服务没起来 → `journalctl -u picopics-api` / `picopics-web`。
- **上传 413/429**：检查 `.env` 的 `MAX_FILE_SIZE` / `DAILY_QUOTA_BYTES`。
- **图片 404**：确认对象文件在 `/var/lib/picopics/images/<key>` 存在；D1 记录与文件不一致时用 `/api/clean-invalid` 清理。
- **OAuth 回环失败**：GitHub OAuth App 回调地址必须是 `https://<域名>/auth/callback`，且 `GITHUB_CLIENT_ID/SECRET` 与该 App 匹配。
