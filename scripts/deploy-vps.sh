#!/usr/bin/env bash
# Build PicoPics locally and ship it to the VPS.
# Usage: ./scripts/deploy-vps.sh <domain>     e.g. ./scripts/deploy-vps.sh picopics.example.com
# Env:   SSH_HOST (default: az-japan)
#        GITHUB_CLIENT_ID (required — the public OAuth app id, baked into the
#        login button at build time; not stored in the repo)
set -euo pipefail

DOMAIN="${1:?usage: deploy-vps.sh <domain>}"
SSH_HOST="${SSH_HOST:-az-japan}"
REMOTE_DIR="/opt/picopics"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${GITHUB_CLIENT_ID:?GITHUB_CLIENT_ID is required (public OAuth app id from github.com/settings/developers)}"

echo "==> [1/4] Building frontend (standalone) for https://$DOMAIN"
NEXT_PUBLIC_GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID" \
NEXT_PUBLIC_UPLOAD_API="https://$DOMAIN" \
NEXT_PUBLIC_HISTORY_API="https://$DOMAIN" \
NEXT_PUBLIC_CDN_BASE="https://$DOMAIN" \
  npm run build

echo "==> [2/4] Bundling gateway"
npm run build:gateway

echo "==> [3/4] rsync to $SSH_HOST:$REMOTE_DIR"
# Next standalone: server.js + traced node_modules; static/ and public/ ride along separately
rsync -az --delete "$ROOT/.next/standalone/" "$SSH_HOST:$REMOTE_DIR/web/"
rsync -az --delete "$ROOT/.next/static/" "$SSH_HOST:$REMOTE_DIR/web/.next/static/"
rsync -az --delete "$ROOT/public/" "$SSH_HOST:$REMOTE_DIR/web/public/"
rsync -az --delete "$ROOT/server/dist/" "$SSH_HOST:$REMOTE_DIR/server/dist/"
rsync -az "$ROOT/server/package.json" "$SSH_HOST:$REMOTE_DIR/server/package.json"

echo "==> [4/4] Installing native deps and restarting services"
ssh "$SSH_HOST" "set -e
  cd $REMOTE_DIR/server
  if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
  sudo systemctl restart picopics-api picopics-web
  sleep 2
  systemctl is-active picopics-api picopics-web
"

echo
echo "Deployed. Verify: https://$DOMAIN/health  (gateway) and https://$DOMAIN/  (frontend)"
