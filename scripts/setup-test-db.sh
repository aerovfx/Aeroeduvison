#!/usr/bin/env bash
# scripts/setup-test-db.sh — chuẩn bị Postgres local cho `npm test` (Phase B0).
#
# Chạy 1 lần trước khi test (hoặc mỗi khi prisma/schema.prisma đổi):
#   ./scripts/setup-test-db.sh
#
# Tạo cluster Postgres 16 tạm dưới $PGTEST_DATA (mặc định /tmp/aeroedu-test-pg),
# apply schema sinh từ `prisma migrate diff --from-empty` (schema THẬT, không
# viết tay DDL — tránh lệch so với prisma/schema.prisma). In ra TEST_DATABASE_URL
# để export trước khi chạy `npm test`.
#
# Không đụng tới DB production/staging — toàn bộ nằm trong thư mục tạm riêng.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGTEST_DATA="${PGTEST_DATA:-/tmp/aeroedu-test-pg}"
PG_USER="${PG_USER:-postgres}"
DB_NAME="aeroedu_test"

command -v "$PGBIN/initdb" >/dev/null || {
  echo "Không tìm thấy PostgreSQL 16 tại $PGBIN. Cài: apt install postgresql-16 (Linux) hoặc brew install postgresql@16 (macOS)." >&2
  exit 2
}
command -v "$ROOT/node_modules/.bin/prisma" >/dev/null || {
  echo "Thiếu prisma CLI. Chạy: npm install (root) trước." >&2
  exit 2
}

RUN_AS=""
if [ "$(id -u)" = "0" ]; then
  id "$PG_USER" >/dev/null 2>&1 || { echo "Cần user hệ thống '$PG_USER' để chạy Postgres (không chạy được với root)." >&2; exit 2; }
  RUN_AS="sudo -u $PG_USER"
fi

if [ ! -d "$PGTEST_DATA/data" ]; then
  echo "==> initdb ($PGTEST_DATA/data)"
  mkdir -p "$PGTEST_DATA/socket"
  [ -n "$RUN_AS" ] && chown -R "$PG_USER" "$PGTEST_DATA"
  $RUN_AS env LC_ALL=C "$PGBIN/initdb" -D "$PGTEST_DATA/data" --username=aeroedu --encoding=UTF8 --auth=trust >/dev/null
fi

if ! "$PGBIN/pg_ctl" status -D "$PGTEST_DATA/data" >/dev/null 2>&1; then
  echo "==> pg_ctl start"
  $RUN_AS env LC_ALL=C "$PGBIN/pg_ctl" start -w -D "$PGTEST_DATA/data" -l "$PGTEST_DATA/pg.log" \
    -o "-c listen_addresses='' -c unix_socket_directories='$PGTEST_DATA/socket'"
fi

ENCODED_SOCKET="${PGTEST_DATA//\//%2F}/socket"
TEST_DATABASE_URL="postgresql://aeroedu@localhost/$DB_NAME?host=$ENCODED_SOCKET"

"$PGBIN/psql" -h "$PGTEST_DATA/socket" -U aeroedu -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || {
  echo "==> createdb $DB_NAME"
  $RUN_AS env "$PGBIN/createdb" -h "$PGTEST_DATA/socket" -U aeroedu "$DB_NAME"
}

echo "==> apply schema (prisma migrate diff --from-empty)"
SCHEMA_SQL="$PGTEST_DATA/schema.sql"
"$ROOT/node_modules/.bin/prisma" migrate diff \
  --from-empty \
  --to-schema-datamodel "$ROOT/prisma/schema.prisma" \
  --script > "$SCHEMA_SQL"
"$PGBIN/psql" -h "$PGTEST_DATA/socket" -U aeroedu -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SCHEMA_SQL" >/dev/null

echo
echo "Test DB sẵn sàng. Export biến này trước khi chạy test:"
echo
echo "  export TEST_DATABASE_URL=\"$TEST_DATABASE_URL\""
echo
echo "Dừng cluster khi xong: $PGBIN/pg_ctl stop -D $PGTEST_DATA/data -m fast"
