#!/bin/bash

# PicoPics 安全环境配置脚本
# 用于安全地设置所有 Worker 的环境变量和资源绑定
# 所有敏感信息都通过 wrangler secret 设置，不会在文件中明文存储

set -e  # 遇到错误立即退出

# 配置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}� PicoPics 安全环境配置脚本${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}⚠️  安全提醒: 所有敏感信息将通过 wrangler secret 安全存储${NC}"
echo ""

# 检查是否已登录
echo -e "${YELLOW}检查 Cloudflare 登录状态...${NC}"
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ 未登录 Cloudflare，请先运行: npx wrangler login${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 已登录 Cloudflare${NC}"

# 获取用户输入
echo -e "${BLUE}请输入配置信息:${NC}"
read -p "Cloudflare Account ID (默认: 从 whoami 获取): " ACCOUNT_ID
if [ -z "$ACCOUNT_ID" ]; then
    ACCOUNT_ID=$(npx wrangler whoami | grep "Account ID" | awk '{print $3}')
    if [ -z "$ACCOUNT_ID" ]; then
        echo -e "${RED}❌ 无法获取 Account ID，请手动输入${NC}"
        exit 1
    fi
fi

read -p "域名 (例如: yourdomain.com): " DOMAIN
read -p "R2 存储桶名称: " BUCKET_NAME
read -p "D1 数据库名称: " DB_NAME
read -p "KV 命名空间名称 (默认: USER_CACHE): " KV_NAME
KV_NAME=${KV_NAME:-USER_CACHE}

echo -e "${BLUE}配置信息确认:${NC}"
echo "Account ID: $ACCOUNT_ID"
echo "域名: $DOMAIN"
echo "R2 存储桶: $BUCKET_NAME"
echo "D1 数据库: $DB_NAME"
echo "KV 命名空间: $KV_NAME"
read -p "确认配置? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消配置${NC}"
    exit 0
fi

echo -e "${BLUE}开始安全配置...${NC}"

# 获取资源ID
echo -e "${YELLOW}获取资源ID...${NC}"

# 获取R2 bucket ID
R2_BUCKET_ID=$(npx wrangler r2 bucket info $BUCKET_NAME 2>/dev/null | grep -o '"id": "[^"]*"' | cut -d'"' -f4)
if [ -z "$R2_BUCKET_ID" ]; then
    echo -e "${RED}❌ 无法获取 R2 存储桶信息，请确保存储桶已创建${NC}"
    exit 1
fi

# 获取D1 database ID
D1_DB_ID=$(npx wrangler d1 info $DB_NAME 2>/dev/null | grep -o '"uuid": "[^"]*"' | cut -d'"' -f4)
if [ -z "$D1_DB_ID" ]; then
    echo -e "${RED}❌ 无法获取 D1 数据库信息，请确保数据库已创建${NC}"
    exit 1
fi

# 获取KV namespace ID
KV_ID=$(npx wrangler kv:namespace list | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$KV_ID" ]; then
    echo -e "${RED}❌ 无法获取 KV 命名空间信息，请确保命名空间已创建${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 资源ID获取完成${NC}"

# 动态生成wrangler.toml文件
echo -e "${YELLOW}生成安全的配置文件...${NC}"

# Uploader Worker
cat > uploader-worker/wrangler.toml << EOF
name = "uploader-worker-prod"
main = "src/index.ts"
compatibility_date = "2025-10-20"

[ai]
binding = "AI"

[vars]
ABUSE_DETECTION_ENABLED = "true"
TURNSTILE_ENABLED = "false"
AUTH_ENABLED = "true"
CONTENT_MODERATION_ENABLED = "true"
DAILY_UPLOAD_LIMIT_PER_IP = "20"

[[durable_objects.bindings]]
name = "UPLOAD_QUOTA"
class_name = "UploadQuota"
script_name = "uploader-worker-prod"

[[durable_objects.bindings]]
name = "IP_BLACKLIST"
class_name = "IPBlacklist"
script_name = "uploader-worker-prod"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["UploadQuota"]

[[migrations]]
tag = "v2"
new_sqlite_classes = ["IPBlacklist"]

[env.production]
name = "uploader-worker-prod"

[env.production.ai]
binding = "AI"

[env.production.vars]
ABUSE_DETECTION_ENABLED = "true"
TURNSTILE_ENABLED = "false"
AUTH_ENABLED = "true"
CONTENT_MODERATION_ENABLED = "true"
DAILY_UPLOAD_LIMIT_PER_IP = "20"

[[env.production.durable_objects.bindings]]
name = "UPLOAD_QUOTA"
class_name = "UploadQuota"
script_name = "uploader-worker-prod"

[[env.production.durable_objects.bindings]]
name = "IP_BLACKLIST"
class_name = "IPBlacklist"
script_name = "uploader-worker-prod"

[[env.production.migrations]]
tag = "v1"
new_sqlite_classes = ["UploadQuota"]

[[env.production.migrations]]
tag = "v2"
new_sqlite_classes = ["IPBlacklist"]
EOF

# History Worker
cat > history-worker/wrangler.toml << EOF
name = "history-worker-prod"
main = "src/index.ts"
compatibility_date = "2025-10-20"

[env.production]
name = "history-worker-prod"
EOF

# R2 Browser Worker
cat > r2-browser-worker/wrangler.toml << EOF
name = "r2-browser-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "r2-browser-worker-prod"
EOF

# CDN Worker
cat > cdn-worker/wrangler.toml << EOF
name = "cdn-worker"
main = "src/index.ts"
compatibility_date = "2025-10-20"

[vars]
ALLOWED_ORIGINS = "*"

[env.production]
name = "cdn-worker-prod"

[env.production.vars]
ALLOWED_ORIGINS = "*"
EOF

# 前端应用
cat > wrangler.toml << EOF
[build]
command = "npm run build"
publish = "out"
pages_build_output_dir = "out"

[build.environment]
NODE_VERSION = "18"
NEXT_TELEMETRY_DISABLED = "1"

[env.production]
NODE_ENV = "production"

[env.preview]
NODE_ENV = "development"

[[redirects]]
from = "/api/*"
to = "https://your-worker.workers.dev/:splat"
status = 200
force = true

[[headers]]
for = "/*"
[headers.values]
X-Content-Type-Options = "nosniff"
X-Frame-Options = "DENY"
X-XSS-Protection = "1; mode=block"
Referrer-Policy = "strict-origin-when-cross-origin"
Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[[headers]]
for = "/_next/static/*"
[headers.values]
Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
for = "/images/*"
[headers.values]
Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
for = "/*.css"
[headers.values]
Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
for = "/*.js"
[headers.values]
Cache-Control = "public, max-age=31536000, immutable"
EOF

echo -e "${GREEN}✅ 配置文件生成完成${NC}"

# 设置环境变量和资源绑定
echo -e "${YELLOW}设置环境变量和资源绑定...${NC}"

# Uploader Worker 配置
echo -e "${BLUE}配置 Uploader Worker...${NC}"
cd uploader-worker

echo "$ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo "$BUCKET_NAME" | npx wrangler secret put R2_BUCKET_NAME --env production
echo "$KV_ID" | npx wrangler secret put KV_NAMESPACE_ID --env production
echo "$D1_DB_ID" | npx wrangler secret put D1_DATABASE_ID --env production
echo "https://cdn.$DOMAIN" | npx wrangler secret put R2_PUBLIC_BASE --env production
echo "https://$DOMAIN,https://www.$DOMAIN,https://*.pages.dev,http://localhost:3000" | npx wrangler secret put ALLOWED_ORIGINS --env production
echo "10485760" | npx wrangler secret put MAX_UPLOAD_SIZE --env production
echo "2097152000" | npx wrangler secret put DAILY_QUOTA_BYTES --env production

echo -e "${GREEN}✅ Uploader Worker 配置完成${NC}"

# History Worker 配置
echo -e "${BLUE}配置 History Worker...${NC}"
cd ../history-worker

echo "$ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo "$D1_DB_ID" | npx wrangler secret put D1_DATABASE_ID --env production
echo "https://$DOMAIN,https://www.$DOMAIN,https://*.pages.dev,http://localhost:3000" | npx wrangler secret put ALLOWED_ORIGINS --env production

echo -e "${GREEN}✅ History Worker 配置完成${NC}"

# R2 Browser Worker 配置
echo -e "${BLUE}配置 R2 Browser Worker...${NC}"
cd ../r2-browser-worker

echo "$ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo "$BUCKET_NAME" | npx wrangler secret put R2_BUCKET_NAME --env production
echo "*" | npx wrangler secret put ALLOWED_ORIGINS --env production

echo -e "${GREEN}✅ R2 Browser Worker 配置完成${NC}"

# CDN Worker 配置
echo -e "${BLUE}配置 CDN Worker...${NC}"
cd ../cdn-worker

echo "$ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo "$BUCKET_NAME" | npx wrangler secret put R2_BUCKET_NAME --env production
echo "31536000" | npx wrangler secret put CACHE_MAX_AGE --env production

echo -e "${GREEN}✅ CDN Worker 配置完成${NC}"

# 配置前端应用
echo -e "${BLUE}配置前端应用...${NC}"
cd ..

echo "https://uploader-worker-prod.$ACCOUNT_ID.workers.dev/upload" | npx wrangler pages secret put NEXT_PUBLIC_UPLOAD_API
echo "https://r2-browser-worker-prod.$ACCOUNT_ID.workers.dev" | npx wrangler pages secret put NEXT_PUBLIC_ADMIN_API
echo "https://history-worker-prod.$ACCOUNT_ID.workers.dev/api/history" | npx wrangler pages secret put NEXT_PUBLIC_HISTORY_API
echo "https://cdn.$DOMAIN" | npx wrangler pages secret put NEXT_PUBLIC_CDN_BASE

echo -e "${GREEN}✅ 前端应用配置完成${NC}"

# 返回项目根目录
cd ..

echo -e "${GREEN}🎉 安全配置完成！${NC}"
echo -e "${YELLOW}重要提醒:${NC}"
echo "1. 所有敏感信息已安全存储在 Cloudflare 中，不会出现在文件中"
echo "2. 配置文件已动态生成，只包含必要的绑定信息"
echo "3. 请手动设置以下敏感变量（如果需要）:"
echo "   - ADMIN_USERS: 管理员GitHub用户名（逗号分隔）"
echo "   - ADMIN_TOKEN: 管理员访问令牌"
echo "   - TELEGRAM_BOT_TOKEN: Telegram机器人令牌"
echo "   - TELEGRAM_CHAT_ID: Telegram聊天ID"
echo "   - TURNSTILE_SECRET_KEY: Cloudflare Turnstile密钥"
echo ""
echo -e "${BLUE}📖 详细说明请参考: CONFIG_GUIDE.md${NC}"
echo -e "${GREEN}现在可以安全地部署项目了！${NC}"