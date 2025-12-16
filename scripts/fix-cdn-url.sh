#!/bin/bash

# 修复 Admin Panel 图片显示问题 - 重新部署 uploader worker
# 问题：缩略图使用旧的 CDN 地址
# 解决：配置正确的 CDN_BASE_URL 环境变量

set -e

echo "🔧 修复 Admin Panel 图片显示问题"
echo "=================================="
echo ""

# 进入 workers 目录
cd "$(dirname "$0")/../workers"

echo "📦 检查配置文件..."
if [ ! -f "uploader-wrangler.toml" ]; then
    echo "❌ 错误：找不到 uploader-wrangler.toml"
    exit 1
fi

echo "✅ 配置文件存在"
echo ""

# 显示当前 CDN 配置
echo "📋 当前 CDN 配置："
grep "CDN_BASE_URL" uploader-wrangler.toml
echo ""

# 部署 uploader worker
echo "🚀 开始部署 uploader-worker-v2-prod..."
echo ""

npx wrangler deploy --config uploader-wrangler.toml

echo ""
echo "✅ 部署完成！"
echo ""
echo "📝 验证步骤："
echo "1. 打开 Admin Panel → 数据管理"
echo "2. 检查图片 URL 是否更新为: https://image.hiaplha.xyz/..."
echo "3. 确认缩略图能正常显示"
echo ""
echo "💡 提示："
echo "如果还有问题，请检查："
echo "- CDN worker 是否正常运行"
echo "- 域名 image.hiaplha.xyz 是否可访问"
echo "- R2 存储桶权限是否正确配置"
