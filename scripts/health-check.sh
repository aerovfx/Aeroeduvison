#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              🏥 SYSTEM HEALTH CHECK                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PORT=3001
BASE_URL="http://localhost:$PORT"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "🔍 Checking if server is running on port $PORT..."
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is NOT running${NC}"
    echo "   Start with: npm run dev"
    exit 1
fi

echo ""
echo "🧪 Testing endpoints..."
echo ""

# Test 1: Root
echo "1. Testing root (/)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    echo -e "   ${GREEN}✅ Root: $HTTP_CODE${NC}"
else
    echo -e "   ${RED}❌ Root: $HTTP_CODE${NC}"
fi

# Test 2: Auth Session
echo "2. Testing auth session (/api/auth/session)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/auth/session)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Auth Session: $HTTP_CODE${NC}"
else
    echo -e "   ${RED}❌ Auth Session: $HTTP_CODE${NC}"
fi

# Test 3: AI Content Generator
echo "3. Testing AI Content Generator (/api/ai-content/generate-stream)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"quiz","subject":"Vật lý","grade":"12","topic":"Dao động cơ","aiModel":"demo"}' \
  $BASE_URL/api/ai-content/generate-stream)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo -e "   ${GREEN}✅ AI Content: $HTTP_CODE${NC}"
else
    echo -e "   ${RED}❌ AI Content: $HTTP_CODE${NC}"
fi

# Test 4: Dashboard
echo "4. Testing dashboard (/dashboard)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/dashboard)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "   ${GREEN}✅ Dashboard: $HTTP_CODE${NC}"
else
    echo -e "   ${RED}❌ Dashboard: $HTTP_CODE${NC}"
fi

# Test 5: LabTwin
echo "5. Testing LabTwin (/dashboard/labtwin)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/dashboard/labtwin)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "   ${GREEN}✅ LabTwin: $HTTP_CODE${NC}"
else
    echo -e "   ${RED}❌ LabTwin: $HTTP_CODE${NC}"
fi

echo ""
echo "📊 Environment Check..."
echo ""

# Check NEXTAUTH_URL
if grep -q "NEXTAUTH_URL=\"http://localhost:$PORT\"" .env.local 2>/dev/null; then
    echo -e "   ${GREEN}✅ NEXTAUTH_URL matches port $PORT${NC}"
else
    echo -e "   ${YELLOW}⚠️  NEXTAUTH_URL might not match port $PORT${NC}"
    echo "   Current value:"
    grep NEXTAUTH_URL .env.local 2>/dev/null || echo "   (not found in .env.local)"
fi

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "   ${GREEN}✅ .env.local exists${NC}"
else
    echo -e "   ${RED}❌ .env.local NOT found${NC}"
fi

echo ""
echo "🎯 System Status Summary:"
echo ""

# Overall status
ERRORS=0
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "401" ] && [ "$HTTP_CODE" != "307" ] && [ "$HTTP_CODE" != "302" ]; then
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    echo ""
    echo "🚀 Ready to use:"
    echo "   - Frontend: $BASE_URL"
    echo "   - AI Generator: $BASE_URL/dashboard/ai-content-generator"
    echo "   - LabTwin: $BASE_URL/dashboard/labtwin"
else
    echo -e "${YELLOW}⚠️  Some issues detected${NC}"
    echo "   Check the errors above and:"
    echo "   1. Make sure server is fully started"
    echo "   2. Check .env.local configuration"
    echo "   3. Restart server if needed: npm run dev"
fi

echo ""
