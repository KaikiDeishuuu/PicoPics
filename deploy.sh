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

# 全局变量
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_LOG="$PROJECT_ROOT/deploy.log"
FAILED_SERVICES=()

# 日志函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$DEPLOY_LOG"
}

log_error() {
    echo -e "${RED}$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $*${NC}" | tee -a "$DEPLOY_LOG"
    FAILED_SERVICES+=("$*")
}

log_success() {
    echo -e "${GREEN}$(date '+%Y-%m-%d %H:%M:%S') - SUCCESS: $*${NC}" | tee -a "$DEPLOY_LOG"
}

log_info() {
    echo -e "${BLUE}$(date '+%Y-%m-%d %H:%M:%S') - INFO: $*${NC}" | tee -a "$DEPLOY_LOG"
}

# 清理函数
cleanup() {
    log "清理临时文件..."
    rm -f "$DEPLOY_LOG"
}

trap cleanup EXIT

echo -e "${GREEN}🚀 PicoPics 一键部署脚本${NC}"
echo -e "${BLUE}================================${NC}"
log "开始部署 PicoPics 项目"

# 检查是否已登录
log_info "检查 Cloudflare 登录状态..."
if ! npx wrangler whoami > /dev/null 2>&1; then
    log_error "未登录 Cloudflare，请先运行: npx wrangler login"
    exit 1
fi
log_success "已登录 Cloudflare"

# 获取账户信息
ACCOUNT_ID=$(npx wrangler whoami 2>/dev/null | grep "Account ID" | awk '{print $3}')
if [ -z "$ACCOUNT_ID" ]; then
    log_error "无法获取 Cloudflare 账户 ID"
    exit 1
fi
log_info "账户 ID: $ACCOUNT_ID"

# 部署前的配置检查
log_info "执行部署前配置检查..."

# 检查必要的配置
check_worker_config() {
    local worker_name=$1
    local worker_dir=$2
    shift 2
    local required_secrets=("$@")

    log_info "检查 $worker_name 配置..."

    cd "$PROJECT_ROOT/$worker_dir"

    # 检查 wrangler.toml 是否存在
    if [ ! -f "wrangler.toml" ]; then
        log_error "$worker_name 缺少 wrangler.toml 配置文件"
        return 1
    fi

    # 检查必要的 secrets 或 wrangler.toml 中的 vars
    for secret in "${required_secrets[@]}"; do
        # 首先检查是否作为 secret 设置
        if npx wrangler secret list --env production 2>/dev/null | grep -q "$secret"; then
            continue
        fi

        # 如果不是 secret，检查是否在 wrangler.toml 中设置了 vars
        if grep -q "^$secret.*=" wrangler.toml 2>/dev/null; then
            continue
        fi

        # 如果都没有找到，报告错误
        log_error "$worker_name 缺少必要配置: $secret"
        echo -e "${YELLOW}请运行以下命令之一设置:${NC}"
        echo -e "${BLUE}  cd $worker_dir${NC}"
        echo -e "${BLUE}  npx wrangler secret put $secret --env production${NC}"
        echo -e "${BLUE}  或在 wrangler.toml 的 [env.production.vars] 部分添加: $secret = \"value\"${NC}"
        return 1
    done

    log_success "$worker_name 配置检查通过"
    return 0
}

# 检查 Uploader Worker
if ! check_worker_config "Uploader Worker" "uploader-worker" "ADMIN_USERS" "ADMIN_TOKEN"; then
    log_error "Uploader Worker 配置检查失败，请修复后重新运行"
    exit 1
fi

# 检查 CDN Worker
if ! check_worker_config "CDN Worker" "cdn-worker" "ALLOWED_ORIGINS"; then
    log_error "CDN Worker 配置检查失败，请修复后重新运行"
    exit 1
fi

# 检查 History Worker
if ! check_worker_config "History Worker" "history-worker" "ALLOWED_ORIGINS"; then
    log_error "History Worker 配置检查失败，请修复后重新运行"
    exit 1
fi

# 检查 R2 Browser Worker
if ! check_worker_config "R2 Browser Worker" "r2-browser-worker" "ALLOWED_ORIGINS"; then
    log_error "R2 Browser Worker 配置检查失败，请修复后重新运行"
    exit 1
fi

log_success "所有配置检查通过"

# 部署函数
deploy_worker() {
    local worker_name=$1
    local worker_dir=$2

    log_info "部署 $worker_name..."
    cd "$PROJECT_ROOT/$worker_dir"

    if ! npx wrangler deploy --env production; then
        log_error "$worker_name 部署失败"
        return 1
    fi

    log_success "$worker_name 部署完成"
    return 0
}

# 健康检查函数
health_check() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}

    log_info "健康检查: $service_name"

    local response
    if ! response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" 2>/dev/null); then
        log_error "$service_name 健康检查失败: 无法连接"
        return 1
    fi

    if [ "$response" -ne "$expected_status" ]; then
        log_error "$service_name 健康检查失败: HTTP $response (期望 $expected_status)"
        return 1
    fi

    log_success "$service_name 健康检查通过"
    return 0
}

# 部署所有组件
log_info "开始部署所有组件..."

# 部署 Workers
deploy_worker "Uploader Worker" "uploader-worker"
deploy_worker "CDN Worker" "cdn-worker"
deploy_worker "History Worker" "history-worker"
deploy_worker "R2 Browser Worker" "r2-browser-worker"

# 部署前端应用
log_info "部署前端应用..."
cd "$PROJECT_ROOT"

log_info "构建前端应用..."
if ! npm run pages:build; then
    log_error "前端应用构建失败"
    exit 1
fi

log_info "部署到 Cloudflare Pages..."
if ! npx wrangler pages deploy .next --branch production --commit-dirty=true; then
    log_error "前端应用部署失败"
    exit 1
fi

log_success "前端应用部署完成"

# 返回项目根目录
cd "$PROJECT_ROOT"

# 执行健康检查
log_info "执行部署后健康检查..."

# 检查 Workers
health_check "Uploader Worker" "https://uploader-worker-v2-prod.$ACCOUNT_ID.workers.dev" 200
health_check "CDN Worker" "https://cdn-worker-v2-prod.$ACCOUNT_ID.workers.dev" 200
health_check "History Worker" "https://history-worker-v2-prod.$ACCOUNT_ID.workers.dev" 200
health_check "R2 Browser Worker" "https://r2-browser-worker-v2-prod.$ACCOUNT_ID.workers.dev" 200

# 检查前端应用（获取实际的 Pages URL）
PAGES_URL=$(npx wrangler pages deployment list 2>/dev/null | head -n 1 | awk '{print $2}' || echo "")
if [ -n "$PAGES_URL" ]; then
    health_check "前端应用" "$PAGES_URL" 200
else
    log_info "前端应用 URL 无法自动获取，请手动验证"
fi

# 部署总结
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}📋 部署摘要:${NC}"
echo "• Uploader Worker: https://uploader-worker-v2-prod.$ACCOUNT_ID.workers.dev"
echo "• CDN Worker: https://cdn-worker-v2-prod.$ACCOUNT_ID.workers.dev"
echo "• History Worker: https://history-worker-v2-prod.$ACCOUNT_ID.workers.dev"
echo "• R2 Browser Worker: https://r2-browser-worker-v2-prod.$ACCOUNT_ID.workers.dev"
if [ -n "$PAGES_URL" ]; then
    echo "• 前端应用: $PAGES_URL"
else
    echo "• 前端应用: https://[your-pages-project].pages.dev"
fi

# 显示失败的服务
if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo -e "${RED}⚠️  以下服务部署或检查失败:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo -e "${RED}  - $service${NC}"
    done
    echo -e "${YELLOW}请检查日志文件: $DEPLOY_LOG${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📖 查看详细日志: npx wrangler tail${NC}"
echo -e "${BLUE}📝 部署日志: $DEPLOY_LOG${NC}"
echo -e "${GREEN}现在可以开始使用 PicoPics 了！${NC}"

# 保存部署信息
cat > "$PROJECT_ROOT/deploy-info.txt" << EOF
PicoPics 部署信息
==================

部署时间: $(date)
账户 ID: $ACCOUNT_ID

服务 URLs:
- Uploader Worker: https://uploader-worker-v2-prod.$ACCOUNT_ID.workers.dev
- CDN Worker: https://cdn-worker-v2-prod.$ACCOUNT_ID.workers.dev
- History Worker: https://history-worker-v2-prod.$ACCOUNT_ID.workers.dev
- R2 Browser Worker: https://r2-browser-worker-v2-prod.$ACCOUNT_ID.workers.dev
- 前端应用: ${PAGES_URL:-https://[your-pages-project].pages.dev}

管理员配置:
- 管理员用户: 通过 wrangler secret 设置
- 管理员令牌: 通过 wrangler secret 设置

日志文件: $DEPLOY_LOG
EOF

log_success "部署信息已保存到: $PROJECT_ROOT/deploy-info.txt"