#!/usr/bin/env bash
# One-time server preparation for PicoPics on the shared az-japan VM.
# Run AS ROOT with the deploy/az-japan directory staged on the box:
#   rsync -az deploy/az-japan az-japan:/tmp/picopics-setup/
#   ssh az-japan 'sudo bash /tmp/picopics-setup/setup-server.sh <domain>'
# Re-runnable: every step is idempotent.
#
# The VM already runs nginx (front door for other sites) and Docker — we add
# ourselves alongside: swap, Node 22, a picopics system user, systemd units,
# and an nginx site. TLS via the existing certbot setup.
set -euo pipefail

DOMAIN="${1:?usage: setup-server.sh <domain>}"
SRC="$(cd "$(dirname "$0")" && pwd)"

echo "==> [1/7] 2G swap (skip if present)"
if ! swapon --show | grep -q .; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl -w vm.swappiness=20 >/dev/null
    grep -q 'vm.swappiness' /etc/sysctl.d/*.conf 2>/dev/null || \
        echo 'vm.swappiness=20' > /etc/sysctl.d/99-picopics-swap.conf
else
    echo "    swap already present"
fi

echo "==> [2/7] Node 22 (skip if installed)"
if [ "$(node -v 2>/dev/null || true)" != "v22."* ]; then
    apt-get update -y
    apt-get install -y curl ca-certificates build-essential
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
node -v

echo "==> [3/7] picopics user and directories"
id picopics >/dev/null 2>&1 || useradd --system --home /opt/picopics --shell /usr/sbin/nologin picopics
mkdir -p /opt/picopics/web /opt/picopics/server/dist /var/lib/picopics
chown -R picopics:picopics /opt/picopics /var/lib/picopics

echo "==> [4/7] systemd units"
install -m 644 "$SRC/picopics-api.service" /etc/systemd/system/picopics-api.service
install -m 644 "$SRC/picopics-web.service" /etc/systemd/system/picopics-web.service
systemctl daemon-reload
systemctl enable picopics-api picopics-web >/dev/null

echo "==> [5/7] nginx site for $DOMAIN (HTTP first; certbot upgrades to TLS)"
sed "s/__DOMAIN__/$DOMAIN/g" "$SRC/nginx-picopics.conf.template" > /etc/nginx/sites-available/picopics
ln -sf /etc/nginx/sites-available/picopics /etc/nginx/sites-enabled/picopics
nginx -t && systemctl reload nginx

echo "==> [6/7] Let's Encrypt certificate (certbot reuses the existing account)"
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "kaiki@hiaplha.xyz" || \
        echo "!! certbot failed — if Cloudflare blocks HTTP-01, flip the DNS record to grey cloud and re-run"
fi
nginx -t && systemctl reload nginx

echo "==> [7/7] gateway .env placeholder (secrets are filled separately)"
if [ ! -f /opt/picopics/server/.env ]; then
    sed "s|https://YOUR.DOMAIN|https://$DOMAIN|g" "$SRC/server.env.example" > /opt/picopics/server/.env
    chown picopics:picopics /opt/picopics/server/.env
    chmod 600 /opt/picopics/server/.env
fi

echo "SETUP-OK — now run scripts/deploy-vps.sh $DOMAIN from your workstation"
