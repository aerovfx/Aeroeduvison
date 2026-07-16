#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Chạy TOÀN BỘ stack backend Rust (18 microservice + gateway aero-backend) LOCAL,
# dùng cùng Postgres `aeroedu` + JWT_SECRET với server.cjs → để so parity Node↔Rust.
#
#   Gateway aero-backend nghe :8190  (server.cjs giữ :8090 để so sánh song song)
#   Mỗi service nghe cổng chuẩn 8092–8109 (khớp map trong aero-backend/main.rs).
#
# Dùng:
#   ./run-local-rust-stack.sh          # build (debug) + chạy tất cả, log ở /tmp/rust-stack
#   ./run-local-rust-stack.sh stop     # dừng tất cả
#   RUST_STACK_ONLY="auth course student" ./run-local-rust-stack.sh   # chạy tập con
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
export DATABASE_URL="${DATABASE_URL:-postgresql://$(whoami)@localhost:5432/aeroedu}"
export JWT_SECRET="${JWT_SECRET:-aeroedu-local-dev-secret-change-me}"
export RUST_LOG="${RUST_LOG:-info}"

LOGDIR=/tmp/rust-stack
PIDFILE=$LOGDIR/pids
mkdir -p "$LOGDIR"

# service → port (khớp default *_SERVICE_URL trong aero-backend/src/main.rs)
declare -a SVCS=(
  "auth:8092" "course:8093" "admin:8094" "student:8095" "ai:8096"
  "stem:8097" "media:8098" "camera-iot:8099" "grading:8100" "chat:8101"
  "assignments:8102" "achievements:8103" "analytics:8104" "emotion:8105"
  "teacher:8106" "exam:8107" "transcript:8108" "latex:8109"
)
GATEWAY_PORT=8190

if [[ "${1:-}" == "stop" ]]; then
  [[ -f "$PIDFILE" ]] && while read -r pid; do kill "$pid" 2>/dev/null; done < "$PIDFILE"
  rm -f "$PIDFILE"; echo "đã dừng stack Rust."; exit 0
fi

echo "▶ Build workspace (debug)…"
if ! cargo build --workspace -q 2>"$LOGDIR/build.err"; then
  echo "❌ build lỗi — xem $LOGDIR/build.err"; tail -20 "$LOGDIR/build.err"; exit 1
fi

: > "$PIDFILE"
BIN=target/debug

start() { # name port env-var-prefix
  local name=$1 port=$2
  local addrvar
  # env ADDR var: <NAME>_SERVICE_ADDR (camera-iot → CAMERA_IOT_SERVICE_ADDR)
  addrvar="$(echo "$name" | tr 'a-z-' 'A-Z_')_SERVICE_ADDR"
  local bin="$BIN/${name}-service"
  [[ -x "$bin" ]] || { echo "  ⚠ thiếu binary $bin — bỏ qua"; return; }
  env "$addrvar=127.0.0.1:$port" DATABASE_URL="$DATABASE_URL" JWT_SECRET="$JWT_SECRET" \
    "$bin" > "$LOGDIR/${name}.log" 2>&1 &
  echo $! >> "$PIDFILE"
  echo "  ▸ ${name}-service :$port (pid $!)"
}

echo "▶ Khởi động services…"
for entry in "${SVCS[@]}"; do
  name=${entry%%:*}; port=${entry##*:}
  if [[ -n "${RUST_STACK_ONLY:-}" ]] && [[ " $RUST_STACK_ONLY " != *" $name "* ]]; then continue; fi
  start "$name" "$port"
done

echo "▶ Khởi động gateway aero-backend :$GATEWAY_PORT …"
env AERO_BACKEND_ADDR="127.0.0.1:$GATEWAY_PORT" DATABASE_URL="$DATABASE_URL" JWT_SECRET="$JWT_SECRET" \
  "$BIN/aero-backend" > "$LOGDIR/aero-backend.log" 2>&1 &
echo $! >> "$PIDFILE"
echo "  ▸ aero-backend :$GATEWAY_PORT (pid $!)"

echo ""
echo "✅ Stack Rust đang chạy. Gateway: http://localhost:$GATEWAY_PORT"
echo "   Log: $LOGDIR/*.log   ·   Dừng: ./run-local-rust-stack.sh stop"
