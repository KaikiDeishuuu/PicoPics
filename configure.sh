#!/bin/bash

# ==========================================
# PicoPics 自动配置脚本
# ==========================================
# 功能：
# 1. 自动配置所有 Workers 的环境变量
# 2. 自动配置 CORS 允许的来源
# 3. 区分 secret 变量和普通变量
# 4. 一键配置所有服务
# ==========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# 检查 .env 文件
check_env_file() {
    if [ ! -f ".env" ]; then
        print_error ".env 文件不存在"
        print_info "请先复制 .env.example 为 .env 并填写配置"
echo ""
        echo "  cp .env.example .env"
        echo "  vim .env  # 编辑配置文件"
echo ""
        exit 1
    fi
    print_success "找到 .env 配置文件"
}

# 加载环境变量
load_env() {
    print_info "加载环境变量..."
    set -a
    source .env
    set +a
    print_success "环境变量加载完成"
}

# 生成 CORS 允许的来源
generate_allowed_origins() {
    print_info "生成 CORS 允许的来源..."
    
    if [ -z "$FRONTEND_DOMAINS" ]; then
        print_error "FRONTEND_DOMAINS 未配置"
        exit 1
    fi
    
    # 将逗号分隔的域名转换为 https:// 前缀的格式
    IFS=',' read -ra DOMAINS <<< "$FRONTEND_DOMAINS"
    ALLOWED_ORIGINS=""
    
    for domain in "${DOMAINS[@]}"; do
        # 去除空格
        domain=$(echo "$domain" | xargs)
        if [ -n "$domain" ]; then
            if [ -z "$ALLOWED_ORIGINS" ]; then
                ALLOWED_ORIGINS="https://$domain"
            else
                ALLOWED_ORIGINS="$ALLOWED_ORIGINS,https://$domain"
            fi
        fi
    done
    
    export ALLOWED_ORIGINS
    print_success "CORS 来源: $ALLOWED_ORIGINS"
}

# 配置 Worker 的 secret 变量
configure_worker_secrets() {
    local worker_name=$1
    local worker_dir=$2
    
    print_header "配置 $worker_name 的 Secret 变量"
    
    cd "$worker_dir"
    
    # Secret 变量列表（敏感信息）
    declare -a secrets=(
        "GITHUB_CLIENT_ID"
        "GITHUB_CLIENT_SECRET"
        "ADMIN_TOKEN"
        "ADMIN_USERS"
        "MAX_UPLOAD_SIZE"
        "DAILY_QUOTA_BYTES"
        "ALLOWED_ORIGINS"
    )
    
    # 可选的 Secret 变量
    declare -a optional_secrets=(
        "TURNSTILE_SECRET_KEY"
        "TELEGRAM_BOT_TOKEN"
        "TELEGRAM_CHAT_ID"
    )
    
    # 配置必需的 secrets
    for secret in "${secrets[@]}"; do
        local value="${!secret}"
        if [ -n "$value" ]; then
            echo "$value" | npx wrangler secret put "$secret" --env production >/dev/null 2>&1
            print_success "设置 $secret"
        else
            print_warning "$secret 未配置，跳过"
        fi
    done
    
    # 配置可选的 secrets
    for secret in "${optional_secrets[@]}"; do
        local value="${!secret}"
        if [ -n "$value" ]; then
            echo "$value" | npx wrangler secret put "$secret" --env production >/dev/null 2>&1
            print_success "设置 $secret (可选)"
        fi
    done
    
    cd - >/dev/null
}

# 配置前端环境变量
configure_frontend() {
    print_header "配置前端环境变量"
    
    local frontend_dir="CFworkerImageFRONTED"
    cd "$frontend_dir"
    
    # 删除旧的 .env.local
    rm -f .env.local
    
    # 生成 .env.local
    cat > .env.local << EOF
# 自动生成的环境配置 - $(date)

# ========== API 服务地址 ==========
# 注意：NEXT_PUBLIC_UPLOAD_API 必须包含 /upload 后缀
NEXT_PUBLIC_UPLOAD_API=https://uploader-worker-prod.${CLOUDFLARE_ACCOUNT_NAME}.workers.dev/upload
NEXT_PUBLIC_HISTORY_API=https://history-worker-prod.${CLOUDFLARE_ACCOUNT_NAME}.workers.dev
NEXT_PUBLIC_ADMIN_API=https://r2-browser-worker-prod.${CLOUDFLARE_ACCOUNT_NAME}.workers.dev
NEXT_PUBLIC_CDN_URL=${R2_PUBLIC_BASE}

# ========== 可选配置 ==========
# NEXT_PUBLIC_GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
# NEXT_PUBLIC_DEBUG=false
# NEXT_PUBLIC_API_TIMEOUT=30000
# NEXT_PUBLIC_MAX_UPLOAD_SIZE=${MAX_UPLOAD_SIZE}
EOF
    
    print_success "前端 .env.local 已创建"
    print_info "上传 API: https://uploader-worker-prod.${CLOUDFLARE_ACCOUNT_NAME}.workers.dev/upload"
    
    cd - >/dev/null
}

# 验证配置
validate_config() {
    print_header "验证配置"
    
    local errors=0
    
    # 检查必需的环境变量
    declare -a required_vars=(
        "CLOUDFLARE_ACCOUNT_ID"
        "CLOUDFLARE_ACCOUNT_NAME"
        "CDN_DOMAIN"
        "FRONTEND_DOMAINS"
        "R2_BUCKET_NAME"
        "R2_PUBLIC_BASE"
        "D1_DATABASE_ID"
        "KV_USER_CACHE_ID"
        "GITHUB_CLIENT_ID"
        "GITHUB_CLIENT_SECRET"
        "ADMIN_TOKEN"
        "ADMIN_USERS"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "$var 未配置"
            ((errors++))
        else
            print_success "$var 已配置"
        fi
    done
    
    if [ $errors -gt 0 ]; then
        print_error "发现 $errors 个配置错误，请检查 .env 文件"
        exit 1
    fi
    
    print_success "所有必需配置项验证通过"
}

# 主函数
main() {
    print_header "PicoPics 自动配置工具"
    
    # 1. 检查环境
    check_env_file
    load_env
    
    # 2. 验证配置
    validate_config
    
    # 3. 生成 CORS 配置
    generate_allowed_origins
    
    # 4. 配置各个 Worker
    echo ""
    configure_worker_secrets "Uploader Worker" "uploader-worker"
    
    echo ""
    configure_worker_secrets "History Worker" "history-worker"
    
    echo ""
    configure_worker_secrets "R2 Browser Worker" "r2-browser-worker"
    
    echo ""
    configure_worker_secrets "CDN Worker" "cdn-worker"
    
    # 5. 配置前端
    echo ""
    configure_frontend
    
    # 6. 完成
    echo ""
    print_header "配置完成"
    print_success "所有环境变量已配置完成！"
echo ""
    print_info "下一步："
    echo "  1. 部署所有 Workers: ./deploy.sh"
    echo "  2. 或单独部署:"
    echo "     cd uploader-worker && npx wrangler deploy --env production"
    echo "     cd history-worker && npx wrangler deploy --env production"
    echo "     cd r2-browser-worker && npx wrangler deploy --env production"
    echo "     cd cdn-worker && npx wrangler deploy --env production"
    echo "  3. 部署前端:"
    echo "     cd CFworkerImageFRONTED && npm run build"
    echo "     npx wrangler pages deploy out --project-name=cfworker-image-frontend --branch=production"
echo ""
}

# 运行主函数
main
