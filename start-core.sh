#!/usr/bin/env bash
# ============================================================
# start-core.sh — Chỉ khởi động 2 service cốt lõi:
#   • aero-backend  (port 8090) — API Gateway
#   • auth-service  (port 8092) — Đăng nhập / JWT
#
# Dùng khi muốn test nhanh frontend mà không cần compile 19 services.
# Cho dev đầy đủ: bash start-rust.sh
# ============================================================

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
RUST="$ROOT/rust-services"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}🦀 Starting core Rust services (auth + gateway)...${NC}"

cleanup() {
  echo -e "\n${YELLOW}Stopping core services...${NC}"
  kill 0
  exit 0
}
trap cleanup SIGINT SIGTERM

start_service() {
  local name="$1"
  local dir="$2"
  local color="$3"
  (
    cd "$dir"
    # Load .env của service đó nếu có
    set -a
    [ -f .env ] && source .env
    set +a
    echo -e "${color}[${name}] Starting...${NC}"
    cargo run 2>&1 | while IFS= read -r line; do
      echo -e "${color}[${name}]${NC} $line"
    done
  ) &
}

# Auth-service trước (aero-backend proxy đến 8092)
start_service "auth-service " "$RUST/auth-service"  '\033[0;33m'
# Chờ 1 giây rồi khởi động gateway để auth-service kịp bind port
sleep 1
start_service "aero-backend " "$RUST/aero-backend"  '\033[0;32m'

echo -e "${GREEN}✅ Core services starting:${NC}"
echo "  aero-backend  → http://localhost:8090  (API Gateway)"
echo "  auth-service  → http://localhost:8092  (Auth/JWT)"
echo ""
echo -e "${YELLOW}Ctrl+C để dừng${NC}"

wait
