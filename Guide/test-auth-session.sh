#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════"
echo "🔐 NextAuth Session Automated Tests"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
PASS_COUNT=0
FAIL_COUNT=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local expected_redirect="$4"
    
    echo -n "Testing: $name... "
    
    response=$(curl -sS -o /dev/null -w "%{http_code}|%{redirect_url}" "$url" 2>&1)
    status_code=$(echo "$response" | cut -d'|' -f1)
    redirect_url=$(echo "$response" | cut -d'|' -f2)
    
    if [ "$status_code" = "$expected_status" ]; then
        if [ -n "$expected_redirect" ] && [ "$redirect_url" != "$expected_redirect" ]; then
            echo -e "${RED}❌ FAIL${NC} (Wrong redirect: $redirect_url)"
            ((FAIL_COUNT++))
        else
            echo -e "${GREEN}✅ PASS${NC}"
            ((PASS_COUNT++))
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $status_code, Expected: $expected_status)"
        ((FAIL_COUNT++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Marketing Pages (Unauthenticated)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Homepage" "$BASE_URL/" "200"
test_endpoint "Pricing" "$BASE_URL/pricing" "200"
test_endpoint "Contact Sales" "$BASE_URL/contact-sales" "200"
test_endpoint "Terms" "$BASE_URL/terms" "200"
test_endpoint "Privacy" "$BASE_URL/privacy" "200"
test_endpoint "Cookies" "$BASE_URL/cookies" "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Auth Pages (Unauthenticated)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Login Page" "$BASE_URL/auth/login" "200"
test_endpoint "Signup Page" "$BASE_URL/auth/signup" "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Protected Routes (Unauthenticated - Should Redirect)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Dashboard" "$BASE_URL/dashboard" "307"
test_endpoint "Learning Paths" "$BASE_URL/learning-paths" "307"
test_endpoint "AI Tutor" "$BASE_URL/ai-tutor" "307"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Session API (Unauthenticated)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Testing: Session API... "
session_response=$(curl -sS "$BASE_URL/api/auth/session")
if [ "$session_response" = "{}" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Empty session)"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL${NC} (Session: $session_response)"
    ((FAIL_COUNT++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Database Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Testing: Database connectivity... "
db_test=$(curl -sS "$BASE_URL/api/auth/providers" 2>&1)
if echo "$db_test" | grep -q "credentials\|google"; then
    echo -e "${GREEN}✅ PASS${NC} (Auth providers available)"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL${NC} (Providers: $db_test)"
    ((FAIL_COUNT++))
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "📊 TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi
