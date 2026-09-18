# PicoPics VPS 部署（az-japan / Azure Debian 12）

单域名全栈自托管方案：**三个 Cloudflare Worker（uploader/history/cdn）的 Hono 代码原样运行在 Node 网关里**，Cloudflare 绑定由 `server/cf-compat/` 兼容层替换——R2→本地磁盘、D1→SQLite、Durable Objects→进程内实例（SQLite 持久化）、`caches.default`→内存缓存。前端为 Next.js standalone。这台 VM 与其他站点共享，**前置代理是既有的 nginx（+ certbot）**，PicoPics 以新增 server 块的方式接入；域名经 Cloudflare 橙云代理实现 IPv4/IPv6 双栈。

## 架构

```
浏览器 ── https://<域名>（CF 橙云，双栈）──> nginx :443 (certbot LE 证书)
  ├─ POST /auth/callback、/upload、/api/* ──> picopics-api (Node :8080, gateway)
  ├─ GET  /api/history                     ──> 同上（history worker）
  ├─ GET  /images/*                        ──> 同上（cdn worker）
  └─ 其余（含 GET /auth/callback、GET /upload 页面）──> picopics-web (Next standalone :3000)

> 注意：`/auth/callback` 和 `/upload` 都是「同一路径既是 Next 页面又是 API 端点」，
> nginx 按 `$request_method` 切分（POST→8080，GET→3000），新增同类路径时要照做，
> 否则浏览器打开页面会 404。

数据：/var/lib/picopics/db.sqlite（SQLite，WAL）
      /var/lib/picopics/images/<对象键>（图片文件 + .__meta__.json 边车）
代码：/opt/picopics/web（Next standalone）、/opt/picopics/server（gateway bundle）
```

组件职责见 `server/gateway.ts`（路由分发与 env 组装）与 `server/cf-compat/`（各绑定 shim）。

## 首次准备（已完成一次的部分可跳过）

1. **一键脚本**（swap、Node 22、picopics 用户/目录、systemd 单元、nginx 站点、certbot 证书、.env 模板）：
   ```bash
   rsync -az deploy/az-japan az-japan:/tmp/picopics-setup/
   ssh az-japan 'sudo bash /tmp/picopics-setup/setup-server.sh <域名>'
   ```
2. **配置**：编辑 `/opt/picopics/server/.env`（属主 picopics，600）：
   - `PUBLIC_ORIGIN=https://<域名>`
   - `GITHUB_CLIENT_ID/SECRET`（GitHub OAuth App，回调 `https://<域名>/auth/callback`）
   - `ADMIN_TOKEN`（随机长字符串，`openssl rand -hex 32`）
   - `TELEGRAM_BOT_TOKEN/CHAT_ID`（可选）
3. **DNS / Azure**：AAAA 记录指向 VM 公网 IPv6，橙云代理开启（CF 提供双栈边缘）；NSG 放行 80/443 (IPv6)。

## 日常部署

```bash
./scripts/deploy-vps.sh <域名>     # 本地构建 → rsync → 远程重启
```

构建发生在本地（服务器只有 853Mi 内存，跑不动 next build），服务器只执行 better-sqlite3 原生模块安装和服务重启。

## 运维速查

```bash
systemctl status picopics-api picopics-web nginx
journalctl -u picopics-api -f              # gateway 日志（含 worker 的 console.log）
sudo -u picopics sqlite3 /var/lib/picopics/db.sqlite   # 查库
curl -s http://127.0.0.1:8080/health       # 网关健康（不经 nginx）
curl -s https://<域名>/health              # 经 CF + nginx
```

备份（已由 `picopics-backup.timer` 每日 04:30 自动执行，保留 7 份）：

```bash
systemctl list-timers picopics-backup.timer            # 下次执行时间
systemctl start picopics-backup.service                # 手动跑一次
ls /var/backups/picopics/                              # db.sqlite + images.tar.gz
```

恢复：解包 `images.tar.gz` 到 `/var/lib/picopics/images/`，用备份的 `db.sqlite` 覆盖前先停 `picopics-api`。

## 已知差异（与 Cloudflare 生产相比）

- CDN 的 `?w/&h=` 缩略图参数会重定向到 Cloudflare Image Resizing，VPS 上不可用（客户端不使用该参数）。
- 上传/删除的 Telegram 通知在 Node 侧为 fire-and-forget（等价于 Workers 的 waitUntil 弱化版）。
- GitHub token 验证缓存：uploader 在 caches shim（5 分钟），history 在进程内存（5 分钟），重启即清空。
- nginx 对 `/images/*` 有 30 天源站缓存（`X-Cache-Status` 响应头可见 HIT/MISS），Cloudflare 侧由橙云边缘缓存承担。

## 故障排查

- **502**：对应后端服务没起来 → `journalctl -u picopics-api` / `picopics-web`。
- **上传 413/429**：检查 `.env` 的 `MAX_FILE_SIZE` / `DAILY_QUOTA_BYTES`。
- **图片 404**：确认对象文件在 `/var/lib/picopics/images/<key>` 存在；D1 记录与文件不一致时用 `/api/clean-invalid` 清理。
- **OAuth 回环失败**：GitHub OAuth App 回调地址必须是 `https://<域名>/auth/callback`，且 `GITHUB_CLIENT_ID/SECRET` 与该 App 匹配。
