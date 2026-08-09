#!/usr/bin/env bash
set -euo pipefail
ROOT="${AEROEDU_HOME:-/opt/aeroedu}"
BACKUP_DIR="${AEROEDU_BACKUP_DIR:-/var/backups/aeroedu}"
mkdir -p "$BACKUP_DIR"
archive="$BACKUP_DIR/aeroedu-$(date -u +%Y%m%dT%H%M%SZ).dump"
AEROEDU_ENV_FILE="${AEROEDU_ENV_FILE:-$ROOT/.env.onprem}" "$ROOT/onprem.sh" backup "$archive"
AEROEDU_ENV_FILE="${AEROEDU_ENV_FILE:-$ROOT/.env.onprem}" "$ROOT/onprem.sh" verify-backup "$archive"
