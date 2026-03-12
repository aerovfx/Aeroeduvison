#!/usr/bin/env bash
# ===========================================
# Build & Verify Rust Services (Offline)
# ===========================================
# Usage: ./scripts/build-and-verify-rust.sh
# ===========================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=============================================="
echo "  Rust Services Build Verification"
echo "=============================================="
echo -e "${NC}"

SERVICES=(
  "aero-backend:8090"
  "vector-sim-service:8091"
  "auth-service:8092"
  "course-service:8093"
  "admin-service:8094"
  "ai-service:8095"
  "student-service:8096"
  "stem-service:8097"
  "media-service:8098"
)

PASS=0
FAIL=0

echo -e "${YELLOW}Checking build status for all 9 services...${NC}"
echo ""

for service_info in "${SERVICES[@]}"; do
  SERVICE_NAME="${service_info%%:*}"
  PORT="${service_info##*:}"
  
  echo -n "  $SERVICE_NAME (port $PORT)... "
  
  if cargo check --manifest-path "rust-services/$SERVICE_NAME/Cargo.toml" --quiet 2>/dev/null; then
    echo -e "${GREEN}✅ Build OK${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ Build Failed${NC}"
    ((FAIL++))
  fi
done

echo ""
echo -e "${BLUE}=============================================="
echo "  Build Summary"
echo "=============================================="
echo -e "${NC}"
echo "Passed: $PASS/9"
echo "Failed: $FAIL/9"
echo ""

# Check middleware configuration
echo -e "${YELLOW}Checking middleware configuration...${NC}"

if grep -q "RUST_CANARY_PERCENT=100" middleware.ts; then
  echo -e "${GREEN}✅ Canary configured at 100%${NC}"
else
  echo -e "${YELLOW}⚠️  Canary not at 100%${NC}"
fi

if grep -q "ENABLE_RUST_CANARY_PROXY=true" middleware.ts; then
  echo -e "${GREEN}✅ Canary proxy enabled${NC}"
else
  echo -e "${RED}❌ Canary proxy not enabled${NC}"
fi

ROUTE_COUNT=$(grep -c "rustBase:" middleware.ts || true)
if [ "$ROUTE_COUNT" -gt 30 ]; then
  echo -e "${GREEN}✅ $ROUTE_COUNT route mappings configured${NC}"
else
  echo -e "${YELLOW}⚠️  Only $ROUTE_COUNT route mappings${NC}"
fi

echo ""

# Check .env.production
echo -e "${YELLOW}Checking .env.production...${NC}"

if grep -q "RUST_BACKEND_URL=" .env.production; then
  echo -e "${GREEN}✅ Rust service URLs configured${NC}"
else
  echo -e "${RED}❌ Rust service URLs not configured${NC}"
fi

if grep -q "DIRECT_RUST.*_PROXY=true" .env.production; then
  echo -e "${GREEN}✅ Direct proxy enabled${NC}"
else
  echo -e "${RED}❌ Direct proxy not enabled${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}=============================================="
echo "  OVERALL STATUS"
echo "=============================================="
echo -e "${NC}"

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL BUILDS PASSED${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run services: bun run rust:all"
  echo "  2. Test health: curl http://127.0.0.1:8090/health"
  echo "  3. Deploy: ./deploy-rust-100.sh"
  exit 0
else
  echo -e "${RED}❌ $FAIL BUILD(S) FAILED${NC}"
  echo ""
  echo "Please fix build errors before deployment."
  exit 1
fi
