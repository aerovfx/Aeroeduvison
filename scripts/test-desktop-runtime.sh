#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_ROOT="$(mktemp -d)"
SOCKET_DIR="$TEST_ROOT/socket"
DATA_DIR="$TEST_ROOT/postgres"
mkdir -p "$SOCKET_DIR"
cleanup() {
  /opt/homebrew/opt/postgresql@16/bin/pg_ctl stop -D "$DATA_DIR" -m fast >/dev/null 2>&1 || true
  rm -rf "$TEST_ROOT"
}
trap cleanup EXIT

LC_ALL=C /opt/homebrew/opt/postgresql@16/bin/initdb -D "$DATA_DIR" --username=aeroedu --encoding=UTF8 --auth=trust >/dev/null
LC_ALL=C /opt/homebrew/opt/postgresql@16/bin/pg_ctl start -w -D "$DATA_DIR" -o "-c listen_addresses='' -c unix_socket_directories='$SOCKET_DIR'" >/dev/null
PGHOST="$SOCKET_DIR" PGUSER=aeroedu /opt/homebrew/opt/postgresql@16/bin/createdb aeroedu
encoded_socket="${SOCKET_DIR//\//%2F}"
DATABASE_URL="postgresql://aeroedu@localhost/aeroedu?host=$encoded_socket" \
  AEROEDU_DESKTOP_SCHEMA="$ROOT/aeroedu-vite/src-tauri/resources/backend/schema.sql" \
  "$ROOT/aeroedu-vite/src-tauri/binaries/aeroedu-node-aarch64-apple-darwin" \
  "$ROOT/aeroedu-vite/src-tauri/resources/backend/bootstrap.cjs"
count="$(PGHOST="$SOCKET_DIR" PGUSER=aeroedu /opt/homebrew/opt/postgresql@16/bin/psql -d aeroedu -tAc 'SELECT count(*) FROM "User"')"
[ "$count" = 7 ] || { echo "Expected 7 initial users, found $count" >&2; exit 1; }
echo 'Desktop PostgreSQL bootstrap/persistence test: OK (7 users)'
