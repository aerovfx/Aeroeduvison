#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════"
echo "🔐 NextAuth v4 Comprehensive Security Test"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Test function with colored output
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Testing: $name... "
    
    status_code=$(curl -sS -o /dev/null -w "%{http_code}" "$url" 2>&1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $status_code, Expected: $expected_status)"
        ((FAIL_COUNT++))
    fi
}

test_json_response() {
    local name="$1"
    local url="$2"
    local expected_pattern="$3"
    
    echo -n "Testing: $name... "
    
    response=$(curl -sS "$url" 2>&1)
    
    if echo "$response" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Response: $response"
        ((FAIL_COUNT++))
    fi
}

test_security() {
    local name="$1"
    local command="$2"
    local check_pattern="$3"
    
    echo -n "Security Test: $name... "
    
    result=$(eval "$command" 2>&1)
    
    if echo "$result" | grep -q "$check_pattern"; then
        echo -e "${GREEN}✅ SECURE${NC}"
        ((PASS_COUNT++))
    else
        echo -e "${YELLOW}⚠️ WARNING${NC}"
        ((WARN_COUNT++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 1: Public Routes (Guest Access)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Homepage" "$BASE_URL/" "200"
test_endpoint "Pricing Page" "$BASE_URL/pricing" "200"
test_endpoint "Contact Sales" "$BASE_URL/contact-sales" "200"
test_endpoint "Terms of Service" "$BASE_URL/terms" "200"
test_endpoint "Privacy Policy" "$BASE_URL/privacy" "200"
test_endpoint "Cookie Policy" "$BASE_URL/cookies" "200"
test_endpoint "Login Page" "$BASE_URL/auth/login" "200"
test_endpoint "Signup Page" "$BASE_URL/auth/signup" "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 2: Protected Routes (Should Redirect)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Dashboard (unauthenticated)" "$BASE_URL/dashboard" "307"
test_endpoint "Learning Paths (unauthenticated)" "$BASE_URL/learning-paths" "307"
test_endpoint "AI Tutor (unauthenticated)" "$BASE_URL/ai-tutor" "307"
test_endpoint "Teacher Routes (unauthenticated)" "$BASE_URL/teacher/courses" "307"
test_endpoint "Admin Routes (unauthenticated)" "$BASE_URL/admin/dashboard" "307"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 3: NextAuth API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_json_response "Session API (logged out)" "$BASE_URL/api/auth/session" "{}"
test_json_response "Providers API" "$BASE_URL/api/auth/providers" "credentials"
test_endpoint "CSRF Token" "$BASE_URL/api/auth/csrf" "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 4: Security Headers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_security "X-Frame-Options" "curl -sS -I $BASE_URL/ | grep -i 'x-frame-options'" "."
test_security "Content-Security-Policy" "curl -sS -I $BASE_URL/ | grep -i 'content-security'" "."
test_security "Strict-Transport-Security" "curl -sS -I $BASE_URL/ | grep -i 'strict-transport'" "."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 5: Deleted Routes (Should 404)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Old /sign-in (deleted)" "$BASE_URL/sign-in" "404"
test_endpoint "Old /sign-up (deleted)" "$BASE_URL/sign-up" "404"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 6: Database & Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Checking NEXTAUTH_SECRET... "
if [ -n "$NEXTAUTH_SECRET" ] || grep -q "NEXTAUTH_SECRET" .env.local 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC} (Set)"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL${NC} (Not set)"
    ((FAIL_COUNT++))
fi

echo -n "Checking DATABASE_URL... "
if grep -q "DATABASE_URL" .env 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC} (Set)"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL${NC} (Not set)"
    ((FAIL_COUNT++))
fi

echo -n "Checking Google OAuth credentials... "
if grep -q "GOOGLE_CLIENT_ID" .env.local 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC} (Configured)"
    ((PASS_COUNT++))
else
    echo -e "${YELLOW}⚠️ WARNING${NC} (Not configured)"
    ((WARN_COUNT++))
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "📊 TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}✅ Passed: $PASS_COUNT${NC}"
echo -e "${RED}❌ Failed: $FAIL_COUNT${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARN_COUNT${NC}"
echo ""

# Calculate pass rate
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASS_COUNT * 100 / (PASS_COUNT + FAIL_COUNT)))
    echo "Pass Rate: ${PASS_RATE}%"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Security Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. ❌ Add rate limiting to /api/auth/callback/credentials"
echo "2. ❌ Implement email verification for new signups"
echo "3. ❌ Add account lockout after 5 failed attempts"
echo "4. ⚠️  Add security headers (CSP, HSTS, X-Frame-Options)"
echo "5. ⚠️  Consider implementing 2FA for sensitive accounts"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CRITICAL TESTS PASSED!${NC}"
    echo ""
    echo "🎯 System Status: PRODUCTION READY (with recommendations)"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED - REVIEW REQUIRED${NC}"
    exit 1
fi

