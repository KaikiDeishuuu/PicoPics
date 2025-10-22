#!/bin/bash

# PicoPics 一键部署脚本
# 部署所有 Cloudflare Workers 和前端应用

set -e  # 遇到错误立即退出

# 配置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 PicoPics 一键部署脚本${NC}"
echo -e "${BLUE}================================${NC}"

# 检查是否已登录
echo -e "${YELLOW}检查 Cloudflare 登录状态...${NC}"
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ 未登录 Cloudflare，请先运行: npx wrangler login${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 已登录 Cloudflare${NC}"

# 部署 Uploader Worker
echo -e "${BLUE}部署 Uploader Worker...${NC}"
cd uploader-worker
npx wrangler deploy --env production
echo -e "${GREEN}✅ Uploader Worker 部署完成${NC}"

# 部署 History Worker
echo -e "${BLUE}部署 History Worker...${NC}"
cd ../history-worker
npx wrangler deploy --env production
echo -e "${GREEN}✅ History Worker 部署完成${NC}"

# 部署 R2 Browser Worker
echo -e "${BLUE}部署 R2 Browser Worker...${NC}"
cd ../r2-browser-worker
npx wrangler deploy --env production
echo -e "${GREEN}✅ R2 Browser Worker 部署完成${NC}"

# 部署 CDN Worker
echo -e "${BLUE}部署 CDN Worker...${NC}"
cd ../cdn-worker
npx wrangler deploy --env production
echo -e "${GREEN}✅ CDN Worker 部署完成${NC}"

# 部署前端应用
echo -e "${BLUE}部署前端应用...${NC}"
cd ../CFworkerImageFRONTED

# 构建应用
echo -e "${YELLOW}构建前端应用...${NC}"
npm run build

# 部署到 Cloudflare Pages
echo -e "${YELLOW}部署到 Cloudflare Pages...${NC}"
npx wrangler pages deploy out --branch production --commit-dirty=true

echo -e "${GREEN}✅ 前端应用部署完成${NC}"

# 返回项目根目录
cd ..

echo -e "${GREEN}🎉 所有组件部署完成！${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}📋 部署摘要:${NC}"
echo "• Uploader Worker: https://uploader-worker-prod.[account].workers.dev"
echo "• History Worker: https://history-worker-prod.[account].workers.dev"
echo "• R2 Browser Worker: https://r2-browser-worker-prod.[account].workers.dev"
echo "• CDN Worker: https://cdn-worker.[account].workers.dev"
echo "• 前端应用: https://[your-pages-project].pages.dev"
echo ""
echo -e "${BLUE}📖 查看详细日志: npx wrangler tail${NC}"
echo -e "${GREEN}现在可以开始使用 PicoPics 了！${NC}"