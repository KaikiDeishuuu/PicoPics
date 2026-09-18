#!/usr/bin/env bash
# PicoPics daily backup: consistent SQLite snapshot + images directory.
# Installed to /opt/picopics/bin/backup.sh by setup-server.sh; invoked by
# picopics-backup.timer. Keeps the newest KEEP_DAYS copies.
set -euo pipefail

DATA_DIR="${DATA_DIR:-/var/lib/picopics}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/picopics}"
KEEP_DAYS="${KEEP_DAYS:-7}"

stamp="$(date +%Y%m%d-%H%M%S)"
target="${BACKUP_DIR}/${stamp}"
mkdir -p "${target}"

# .backup produces a consistent snapshot even while the gateway writes.
sqlite3 "${DATA_DIR}/db.sqlite" ".backup '${target}/db.sqlite'"

tar -czf "${target}/images.tar.gz" -C "${DATA_DIR}" images

# Rotate: keep the newest KEEP_DAYS backup directories.
ls -1dt "${BACKUP_DIR}"/*/ 2>/dev/null | tail -n +$((KEEP_DAYS + 1)) | xargs -r rm -rf

echo "backup complete: ${target} ($(du -sh "${target}" | cut -f1))"
