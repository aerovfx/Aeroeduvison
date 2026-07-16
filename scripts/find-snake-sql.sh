#!/usr/bin/env bash
# find-snake-sql.sh <service> — Định vị các vị trí SQL dùng tên cột snake_case
# trong khi DB (Prisma) dùng camelCase, để sửa tay (chuẩn hoá tên cột Rust↔DB).
#
# Nguồn chân lý: information_schema của DB local `aeroedu`. Lấy mọi cột camelCase
# (nhiều từ), đổi sang snake_case, rồi tìm token đó trong các dòng CÓ SQL keyword
# của service. Loại bớt nhiễu (field struct Rust, biến, comment).
#
#   ./scripts/find-snake-sql.sh course-service
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
SVC="${1:?Cần tên service, vd: course-service}"
DIR="rust-services/$SVC/src"
[[ -d "$DIR" ]] || { echo "Không thấy $DIR"; exit 1; }

# Cột camelCase (nhiều từ) → snake_case. VD createdAt → created_at, userId → user_id
psql aeroedu -tAc \
  "SELECT DISTINCT column_name FROM information_schema.columns
   WHERE table_schema='public' AND column_name ~ '[a-z][A-Z]';" 2>/dev/null \
  | sed -E 's/([a-z0-9])([A-Z])/\1_\2/g' | tr 'A-Z' 'a-z' | sort -u > /tmp/snake_cols.txt

TOK="$(paste -sd'|' /tmp/snake_cols.txt)"
[[ -z "$TOK" ]] && { echo "Không lấy được cột từ DB (Postgres chạy chưa?)"; exit 1; }

echo "── $SVC : dòng SQL nghi dùng cột snake_case ──"
# Dòng có SQL keyword HOẶC nằm trong raw string, chứa token snake_case cột.
grep -rnE "($TOK)" "$DIR" 2>/dev/null \
  | grep -iE "SELECT |INSERT INTO|UPDATE |DELETE FROM|WHERE |ORDER BY|GROUP BY| SET |VALUES|RETURNING|FROM \"|JOIN |r#\"" \
  | grep -viE "^\s*//|pub [a-z_]+:|: (DateTime|String|Option|i32|i64|bool|f64|Vec)" \
  | sed -E 's#^rust-services/[^/]+/src/##' \
  | sort
n=$(grep -rnE "($TOK)" "$DIR" 2>/dev/null | grep -iE "SELECT |INSERT INTO|UPDATE |DELETE FROM|WHERE |ORDER BY|GROUP BY| SET |VALUES|RETURNING|FROM \"|JOIN |r#\"" | grep -cviE "^\s*//|pub [a-z_]+:|: (DateTime|String|Option|i32|i64|bool)")
echo "── tổng: $n dòng ──"
