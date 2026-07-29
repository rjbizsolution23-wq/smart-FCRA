#!/usr/bin/env bash
# Smart FCRA v2 — Automated Cloudflare D1 backup
# Usage: ./scripts/backup-database.sh [--remote]
# Requires: wrangler authenticated, optional R2 via wrangler r2

set -euo pipefail

DB_NAME="fcra-detector-v2"
BACKUP_DIR="${BACKUP_DIR:-./.backups}"
REMOTE_FLAG="${1:-}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/smart_fcra_v2_backup_${TIMESTAMP}.sql"
R2_BUCKET="${R2_BACKUP_BUCKET:-smart-fcra-v2-docs}"
R2_PREFIX="backups/d1"

mkdir -p "$BACKUP_DIR"

echo "[INFO] Exporting D1 database: ${DB_NAME}"

if [[ "$REMOTE_FLAG" == "--remote" ]]; then
  npx wrangler d1 export "$DB_NAME" --remote --output="$BACKUP_FILE"
else
  npx wrangler d1 export "$DB_NAME" --local --output="$BACKUP_FILE"
fi

echo "[SUCCESS] Backup written: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"

if command -v wrangler >/dev/null 2>&1; then
  R2_KEY="${R2_PREFIX}/smart_fcra_v2_backup_${TIMESTAMP}.sql"
  echo "[INFO] Uploading to R2: ${R2_BUCKET}/${R2_KEY}"
  if npx wrangler r2 object put "${R2_BUCKET}/${R2_KEY}" --file="$BACKUP_FILE" --remote 2>/dev/null; then
    echo "[SUCCESS] Replicated to R2: ${R2_KEY}"
  else
    echo "[WARN] R2 upload skipped (binding/credentials). Local backup preserved."
  fi
fi

echo "[DONE] Backup complete at ${TIMESTAMP}"
