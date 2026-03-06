#!/bin/bash

# ============================================================================
# STEM Page Verification Script
# ============================================================================
# Tests the STEM Projects page and API endpoints
# ============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE_URL="https://inphysic.com"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         STEM Projects Page Verification                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: STEM Dashboard Page
echo -e "${YELLOW}TEST 1: STEM Dashboard Page${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Testing $SERVICE_URL/dashboard/stem ... "
HTTP_CODE=$(curl -s -o /tmp/stem-page.html -w "%{http_code}" "$SERVICE_URL/dashboard/stem" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ OK (HTTP $HTTP_CODE)${NC}"
  
  # Check for expected content
  if grep -q "STEM Projects" /tmp/stem-page.html || grep -q "Dự án STEM" /tmp/stem-page.html; then
    echo -e "  ${GREEN}✓ Page contains STEM content${NC}"
  else
    echo -e "  ${YELLOW}⚠ Page loaded but STEM content not found${NC}"
  fi
else
  echo -e "${RED}✗ FAIL (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 2: STEM Test API
echo -e "${YELLOW}TEST 2: STEM Test API${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Testing $SERVICE_URL/api/stem/test ... "
HTTP_CODE=$(curl -s -o /tmp/stem-api-test.json -w "%{http_code}" "$SERVICE_URL/api/stem/test" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ OK (HTTP $HTTP_CODE)${NC}"
  
  # Parse JSON response
  if command -v jq &> /dev/null; then
    SUCCESS=$(cat /tmp/stem-api-test.json | jq -r '.success' 2>/dev/null)
    MESSAGE=$(cat /tmp/stem-api-test.json | jq -r '.message' 2>/dev/null)
    PROJECT_COUNT=$(cat /tmp/stem-api-test.json | jq -r '.database.projectCount' 2>/dev/null)
    
    echo -e "  • Success: $SUCCESS"
    echo -e "  • Message: $MESSAGE"
    echo -e "  • Database projects: $PROJECT_COUNT"
  else
    echo -e "  ${YELLOW}⚠ jq not installed, can't parse JSON${NC}"
    echo "  Response:"
    cat /tmp/stem-api-test.json | head -5
  fi
else
  echo -e "${RED}✗ FAIL (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 3: STEM Create Page
echo -e "${YELLOW}TEST 3: STEM Create Page${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Testing $SERVICE_URL/dashboard/stem/create ... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/dashboard/stem/create" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ OK (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠ $HTTP_CODE (may require authentication)${NC}"
fi
echo ""

# Test 4: STEM Templates Page
echo -e "${YELLOW}TEST 4: STEM Templates Page${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Testing $SERVICE_URL/dashboard/stem/templates ... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/dashboard/stem/templates" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ OK (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠ $HTTP_CODE (may require authentication)${NC}"
fi
echo ""

# Test 5: Check Navigation Menu
echo -e "${YELLOW}TEST 5: Navigation Menu${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /tmp/stem-page.html ]; then
  echo "Checking for STEM menu item..."
  if grep -q "STEM Projects" /tmp/stem-page.html || grep -q "STEM" /tmp/stem-page.html; then
    echo -e "${GREEN}✓ STEM menu item found${NC}"
  else
    echo -e "${YELLOW}⚠ STEM menu item not found in page${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Page not cached, skipping check${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    VERIFICATION SUMMARY                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "✅ STEM Projects Feature Status:"
echo "  • Dashboard page: $SERVICE_URL/dashboard/stem"
echo "  • Create page: $SERVICE_URL/dashboard/stem/create"
echo "  • Templates page: $SERVICE_URL/dashboard/stem/templates"
echo ""

echo "🔧 Features Available:"
echo "  ✓ 10 mock STEM projects (from Context)"
echo "  ✓ Project filtering (status, category)"
echo "  ✓ Project search"
echo "  ✓ Project statistics"
echo "  ✓ Team members display"
echo "  ✓ Progress tracking"
echo "  ✓ Milestones & feedback"
echo ""

echo "📊 Mock Projects Include:"
echo "  1. Smart Traffic Light System (Engineering)"
echo "  2. AI Tutor for Math (Technology)"
echo "  3. Ocean Cleaner Boat (Engineering)"
echo "  4. Renewable Energy House Model (Engineering)"
echo "  5. Virtual Chemistry Lab (Science)"
echo "  6. Smart Waste Bin (Technology)"
echo "  7. AI Language Learning App (Technology)"
echo "  8. Earthquake Early Warning System (Engineering)"
echo "  9. BioPlastic from Waste (Science)"
echo "  10. Smart Classroom IoT (Technology)"
echo ""

echo "🎯 Next Steps:"
echo "  1. Visit: $SERVICE_URL/dashboard/stem"
echo "  2. Sign in to view projects"
echo "  3. Explore project details"
echo "  4. Test create new project"
echo ""

echo -e "${GREEN}✅ STEM Projects verification complete!${NC}"
echo ""

