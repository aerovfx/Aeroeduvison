#!/bin/bash

# ============================================================================
# Quick Health Check for Cloud Run Deployment
# ============================================================================
# A simple script to quickly verify if the Cloud Run service is healthy
# ============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE_URL="https://lmsmath-442514522574.asia-southeast1.run.app"

echo -e "${BLUE}🏥 Quick Health Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Homepage
echo -n "Testing homepage... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ OK (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ FAIL (HTTP $HTTP_CODE)${NC}"
fi

# Test 2: Sign-in page
echo -n "Testing sign-in page... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/sign-in" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ OK (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ FAIL (HTTP $HTTP_CODE)${NC}"
fi

# Test 3: Auth session API
echo -n "Testing auth session API... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/auth/session" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ OK (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ FAIL (HTTP $HTTP_CODE)${NC}"
fi

# Test 4: Response time
echo -n "Measuring response time... "
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$SERVICE_URL/" 2>/dev/null || echo "0")
if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l 2>/dev/null || echo "1") )); then
  echo -e "${GREEN}✓ ${RESPONSE_TIME}s${NC}"
else
  echo -e "${YELLOW}⚠ ${RESPONSE_TIME}s (slow)${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Service URL: $SERVICE_URL${NC}"
echo ""
echo "For detailed checks, run:"
echo "  ./verify-cloud-run-deployment.sh     # Full verification"
echo "  ./check-database-connectivity.sh     # Database checks"
echo "  ./test-cloud-run-scaling.sh          # Load testing"
echo ""

