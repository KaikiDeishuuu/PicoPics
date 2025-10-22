#!/bin/bash

# PicoPics 环境配置脚本
# 用于快速设置所有 Worker 的环境变量

set -e  # 遇到错误立即退出

# 配置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 PicoPics 环境配置脚本${NC}"
echo -e "${BLUE}================================${NC}"

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

# 配置 Uploader Worker
echo -e "${YELLOW}配置 Uploader Worker...${NC}"
cd uploader-worker

echo "$ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo "https://cdn.$DOMAIN" | npx wrangler secret put R2_PUBLIC_BASE --env production
echo "https://$DOMAIN,https://www.$DOMAIN,https://*.pages.dev,http://localhost:3000" | npx wrangler secret put ALLOWED_ORIGINS --env production
echo "10485760" | npx wrangler secret put MAX_UPLOAD_SIZE --env production
echo "2097152000" | npx wrangler secret put DAILY_QUOTA_BYTES --env production
echo "true" | npx wrangler secret put ABUSE_DETECTION_ENABLED --env production
echo "true" | npx wrangler secret put AUTH_ENABLED --env production
echo "true" | npx wrangler secret put CONTENT_MODERATION_ENABLED --env production
echo "false" | npx wrangler secret put TURNSTILE_ENABLED --env production
echo "20" | npx wrangler secret put DAILY_UPLOAD_LIMIT_PER_IP --env production

echo -e "${GREEN}✅ Uploader Worker 配置完成${NC}"

# 配置 History Worker
echo -e "${YELLOW}配置 History Worker...${NC}"
cd ../history-worker

echo "$ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo "https://$DOMAIN,https://www.$DOMAIN,https://*.pages.dev,http://localhost:3000" | npx wrangler secret put ALLOWED_ORIGINS --env production

echo -e "${GREEN}✅ History Worker 配置完成${NC}"

# 配置 R2 Browser Worker
echo -e "${YELLOW}配置 R2 Browser Worker...${NC}"
cd ../r2-browser-worker

echo "$ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo "*" | npx wrangler secret put ALLOWED_ORIGINS --env production

echo -e "${GREEN}✅ R2 Browser Worker 配置完成${NC}"

# 配置 CDN Worker
echo -e "${YELLOW}配置 CDN Worker...${NC}"
cd ../cdn-worker

echo "$ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo "*" | npx wrangler secret put ALLOWED_ORIGINS --env production
echo "31536000" | npx wrangler secret put CACHE_MAX_AGE --env production

echo -e "${GREEN}✅ CDN Worker 配置完成${NC}"

# 配置前端应用
echo -e "${YELLOW}配置前端应用...${NC}"
cd ../CFworkerImageFRONTED

echo "https://uploader-worker-prod.$ACCOUNT_ID.workers.dev/upload" | npx wrangler pages secret put NEXT_PUBLIC_UPLOAD_API
echo "https://r2-browser-worker-prod.$ACCOUNT_ID.workers.dev" | npx wrangler pages secret put NEXT_PUBLIC_ADMIN_API
echo "https://history-worker-prod.$ACCOUNT_ID.workers.dev/api/history" | npx wrangler pages secret put NEXT_PUBLIC_HISTORY_API
echo "https://cdn.$DOMAIN" | npx wrangler pages secret put NEXT_PUBLIC_CDN_BASE

echo -e "${GREEN}✅ 前端应用配置完成${NC}"

# 返回项目根目录
cd ..

echo -e "${GREEN}🎉 基础环境变量配置完成！${NC}"
echo -e "${YELLOW}重要提醒:${NC}"
echo "1. 请手动设置以下敏感变量:"
echo "   - ADMIN_USERS: 管理员GitHub用户名（逗号分隔）"
echo "   - ADMIN_TOKEN: 管理员访问令牌"
echo "   - TELEGRAM_BOT_TOKEN: Telegram机器人令牌（可选）"
echo "   - TELEGRAM_CHAT_ID: Telegram聊天ID（可选）"
echo "   - TURNSTILE_SECRET_KEY: Cloudflare Turnstile密钥（可选）"
echo ""
echo "2. 请更新所有 wrangler.toml 文件中的资源绑定:"
echo "   - R2 存储桶名称"
echo "   - D1 数据库ID"
echo "   - KV 命名空间ID"
echo ""
echo "3. 运行以下命令创建资源:"
echo "   npx wrangler r2 bucket create $BUCKET_NAME"
echo "   npx wrangler d1 create $DB_NAME"
echo "   npx wrangler kv:namespace create \"$KV_NAME\""
echo ""
echo -e "${BLUE}📖 详细说明请参考: CONFIG_GUIDE.md${NC}"
