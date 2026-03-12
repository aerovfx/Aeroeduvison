#!/usr/bin/env bash
# ===========================================
# Verify 100% Rust Migration
# ===========================================
# Usage: ./scripts/verify-rust-100.sh
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
echo "  Verifying 100% Rust Migration"
echo "=============================================="
echo -e "${NC}"

PASS=0
FAIL=0
WARN=0

# Check function
check() {
  local name=$1
  local result=$2
  
  if [ "$result" -eq 0 ]; then
    echo -e "${GREEN}✅ $name${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ $name${NC}"
    ((FAIL++))
  fi
}

warn() {
  local name=$1
  echo -e "${YELLOW}⚠️  $name${NC}"
  ((WARN++))
}

# 1. Check Rust services are running locally
echo -e "${YELLOW}1. Checking local Rust services...${NC}"

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

for service_info in "${SERVICES[@]}"; do
  SERVICE_NAME="${service_info%%:*}"
  PORT="${service_info##*:}"
  
  if curl -s -f "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
    check "  $SERVICE_NAME (port $PORT) - Healthy" 0
  else
    check "  $SERVICE_NAME (port $PORT) - Unhealthy" 1
  fi
done

echo ""

# 2. Check middleware configuration
echo -e "${YELLOW}2. Checking middleware configuration...${NC}"

if grep -q "ENABLE_RUST_CANARY_PROXY=true" middleware.ts; then
  check "  Canary proxy enabled" 0
else
  check "  Canary proxy enabled" 1
fi

if grep -q "RUST_CANARY_PERCENT=100" middleware.ts; then
  check "  Canary at 100%" 0
elif grep -q "RUST_CANARY_PERCENT=" middleware.ts; then
  CANARY_PERCENT=$(grep "RUST_CANARY_PERCENT=" middleware.ts | head -1 | sed 's/.*=//' | tr -d '"')
  warn "  Canary at ${CANARY_PERCENT}% (not 100%)"
else
  check "  Canary configured" 1
fi

# Check route mappings
ROUTE_COUNT=$(grep -c "rustBase:" middleware.ts || true)
if [ "$ROUTE_COUNT" -gt 30 ]; then
  check "  Route mappings configured ($ROUTE_COUNT routes)" 0
else
  check "  Route mappings configured ($ROUTE_COUNT routes)" 1
fi

echo ""

# 3. Check .env.production
echo -e "${YELLOW}3. Checking .env.production...${NC}"

if [ -f ".env.production" ]; then
  check "  .env.production exists" 0
  
  if grep -q "RUST_BACKEND_URL=" .env.production; then
    check "  Rust service URLs configured" 0
  else
    check "  Rust service URLs configured" 1
  fi
  
  if grep -q "DIRECT_RUST.*_PROXY=true" .env.production; then
    check "  Direct proxy enabled" 0
  else
    check "  Direct proxy enabled" 1
  fi
else
  check "  .env.production exists" 1
fi

echo ""

# 4. Check for remaining Node.js endpoints
echo -e "${YELLOW}4. Checking for remaining Node.js endpoints...${NC}"

# Count route files
REMAINING=$(find app/api -name "route.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $REMAINING Node.js route files"

# Check for deprecated endpoints
DEPRECATED_COUNT=$(find app/api -name "DEPRECATED.md" 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $DEPRECATED_COUNT deprecated endpoints"

# Check for test/mock endpoints
MOCK_COUNT=$(find app/api -name "mock-*" -o -name "test-*" -o -name "debug-*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$MOCK_COUNT" -eq 0 ]; then
  check "  No test/mock endpoints" 0
else
  warn "  Found $MOCK_COUNT test/mock endpoints"
fi

echo ""

# 5. Check Rust services build
echo -e "${YELLOW}5. Checking Rust services build status...${NC}"

if command -v cargo &> /dev/null; then
  cd rust-services
  
  for service_info in "${SERVICES[@]}"; do
    SERVICE_NAME="${service_info%%:*}"
    
    if [ -d "$SERVICE_NAME" ]; then
      cd "$SERVICE_NAME"
      if cargo check --quiet 2>/dev/null; then
        check "  $SERVICE_NAME - Build OK" 0
      else
        check "  $SERVICE_NAME - Build failed" 1
      fi
      cd ..
    else
      check "  $SERVICE_NAME - Directory not found" 1
    fi
  done
  
  cd ..
else
  warn "  Cargo not installed - skipping build check"
fi

echo ""

# 6. Check deployment script
echo -e "${YELLOW}6. Checking deployment configuration...${NC}"

if [ -f "deploy-rust-100.sh" ]; then
  check "  Deployment script exists" 0
  
  if [ -x "deploy-rust-100.sh" ]; then
    check "  Deployment script executable" 0
  else
    check "  Deployment script executable" 1
  fi
else
  check "  Deployment script exists" 1
fi

if [ -f "docker-compose.yml" ]; then
  check "  Docker Compose configured" 0
else
  warn "  Docker Compose not configured"
fi

echo ""

# 7. Summary
echo -e "${BLUE}=============================================="
echo "  Verification Summary"
echo "=============================================="
echo -e "${NC}"

TOTAL=$((PASS + FAIL))
SUCCESS_RATE=0
if [ "$TOTAL" -gt 0 ]; then
  SUCCESS_RATE=$((PASS * 100 / TOTAL))
fi

echo -e "Passed:  ${GREEN}$PASS${NC}"
echo -e "Failed:  ${RED}$FAIL${NC}"
echo -e "Warnings: ${YELLOW}$WARN${NC}"
echo ""
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed! Ready for deployment.${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run: bun run rust:all"
  echo "  2. Test locally: curl http://127.0.0.1:8090/health"
  echo "  3. Deploy: ./deploy-rust-100.sh"
  echo "  4. Monitor canary rollout"
  exit 0
else
  echo -e "${RED}⚠️  Some checks failed. Please fix issues before deployment.${NC}"
  echo ""
  echo "Failed checks: $FAIL"
  exit 1
fi
