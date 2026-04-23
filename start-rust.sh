#!/usr/bin/env bash
# ============================================================
# start-rust.sh — Khởi động toàn bộ Rust microservices
# Dùng: ./start-rust.sh
# Dừng: Ctrl+C (kill tất cả child processes)
# ============================================================

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
RUST_SERVICES="$ROOT/rust-services"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}🦀 Starting Rust microservices...${NC}"

# Kill all child processes on Ctrl+C
cleanup() {
  echo -e "\n${YELLOW}Stopping all services...${NC}"
  kill 0
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start a service in background with colored prefix
start_service() {
  local name="$1"
  local dir="$2"
  local color="$3"

  (
    cd "$dir"
    export $(cat .env 2>/dev/null | grep -v '^#' | xargs 2>/dev/null) || true
    echo -e "${color}[${name}] Starting...${NC}"
    cargo run 2>&1 | while IFS= read -r line; do
      echo -e "${color}[${name}]${NC} $line"
    done
  ) &
}

# ── Core services first ─────────────────────────────────────
start_service "auth      " "$RUST_SERVICES/auth-service"          '\033[0;33m'
start_service "aero-gw   " "$RUST_SERVICES/aero-backend"          '\033[0;32m'

# ── Domain services ─────────────────────────────────────────
start_service "course    " "$RUST_SERVICES/course-service"        '\033[0;36m'
start_service "admin     " "$RUST_SERVICES/admin-service"         '\033[0;35m'
start_service "student   " "$RUST_SERVICES/student-service"       '\033[1;34m'
start_service "media     " "$RUST_SERVICES/media-service"         '\033[0;34m'
start_service "grading   " "$RUST_SERVICES/grading-service"       '\033[1;32m'

# ── AI / Analytics services ─────────────────────────────────
start_service "ai        " "$RUST_SERVICES/ai-service"            '\033[0;31m'
start_service "analytics " "$RUST_SERVICES/analytics-service"     '\033[1;36m'
start_service "emotion   " "$RUST_SERVICES/emotion-service"       '\033[1;35m'

# ── Other services ──────────────────────────────────────────
start_service "chat      " "$RUST_SERVICES/chat-service"          '\033[1;33m'
start_service "assign    " "$RUST_SERVICES/assignments-service"   '\033[0;33m'
start_service "achieve   " "$RUST_SERVICES/achievements-service"  '\033[0;36m'
start_service "camera    " "$RUST_SERVICES/camera-iot-service"    '\033[1;31m'
start_service "stem      " "$RUST_SERVICES/stem-service"          '\033[0;32m'
start_service "teacher   " "$RUST_SERVICES/teacher-service"       '\033[1;34m'
start_service "exam      " "$RUST_SERVICES/exam-service"          '\033[0;35m'
start_service "transcript" "$RUST_SERVICES/transcript-service"    '\033[1;33m'
start_service "latex     " "$RUST_SERVICES/latex-service"         '\033[0;34m'

echo -e "${GREEN}✅ All services starting. Ports:${NC}"
echo "  aero-backend:     8090  (API Gateway)"
echo "  auth-service:     8092"
echo "  course-service:   8093"
echo "  admin-service:    8094"
echo "  student-service:  8095"
echo "  ai-service:       8096"
echo "  stem-service:     8097"
echo "  media-service:    8098"
echo "  camera-service:   8099"
echo "  grading-service:  8100"
echo "  chat-service:     8101"
echo "  assignments:      8102"
echo "  achievements:     8103"
echo "  analytics:        8104"
echo "  emotion-service:  8105"
echo "  teacher-service:  8106"
echo "  exam-service:     8107"
echo "  transcript:       8108"
echo "  latex-service:    8109"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for all background processes
wait
