#!/bin/bash

# Cloudflare Pages 一键部署脚本
# 用于快速部署前端到 Cloudflare Pages

set -e

echo "🚀 Cloudflare Pages 部署脚本"
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否安装了 wrangler
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ 错误: 未安装 wrangler${NC}"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  未登录 Cloudflare${NC}"
    echo "正在打开登录页面..."
    wrangler login
fi

# 检查环境变量
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env.local 文件${NC}"
    echo "请复制 .env.local.example 并配置环境变量"
    read -p "是否现在创建? (y/n): " create_env
    if [ "$create_env" = "y" ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✅ 已创建 .env.local${NC}"
        echo "请编辑此文件并设置 NEXT_PUBLIC_UPLOAD_API"
        exit 0
    else
        exit 1
    fi
fi

# 安装依赖
echo -e "\n${BLUE}📦 安装依赖...${NC}"
npm install

# 类型检查
echo -e "\n${BLUE}🔍 TypeScript 类型检查...${NC}"
npm run type-check || {
    echo -e "${YELLOW}⚠️  类型检查有警告，继续部署${NC}"
}

# 构建
echo -e "\n${BLUE}🏗️  构建项目...${NC}"
npm run build || {
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
}

# 选择部署方式
echo -e "\n${YELLOW}请选择部署方式:${NC}"
echo "1) 直接部署（使用 wrangler）"
echo "2) Git 集成部署（推送到仓库后自动部署）"
echo "3) 取消"
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        # 直接部署
        echo -e "\n${BLUE}🚀 部署到 Cloudflare Pages...${NC}"
        read -p "请输入 Pages 项目名称: " project_name
        
        wrangler pages deploy out --project-name="${project_name}"
        
        echo -e "\n${GREEN}✅ 部署成功!${NC}"
        echo -e "${BLUE}访问地址: https://${project_name}.pages.dev${NC}"
        ;;
    2)
        echo -e "\n${BLUE}📝 Git 集成部署说明:${NC}"
        echo "1. 将代码推送到 GitHub/GitLab"
        echo "2. 在 Cloudflare Dashboard 中:"
        echo "   - 进入 Pages"
        echo "   - 点击 'Create a project'"
        echo "   - 连接你的 Git 仓库"
        echo "   - 设置构建命令: npm run build"
        echo "   - 设置输出目录: out"
        echo "   - 添加环境变量: NEXT_PUBLIC_UPLOAD_API"
        echo "3. 保存并部署"
        ;;
    3)
        echo "取消部署"
        exit 0
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 完成!${NC}"
