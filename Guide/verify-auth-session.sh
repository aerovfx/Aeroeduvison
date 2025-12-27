#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════"
echo "🔐 NextAuth Session Deep Verification"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Check Current Session"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${CYAN}Calling GET /api/auth/session...${NC}"
SESSION=$(curl -sS "$BASE_URL/api/auth/session")
echo ""
echo "Response:"
echo "$SESSION" | jq '.' 2>/dev/null || echo "$SESSION"
echo ""

if [ "$SESSION" = "{}" ]; then
    echo -e "${YELLOW}Status: Not authenticated${NC}"
    HAS_SESSION=false
else
    echo -e "${GREEN}Status: Authenticated${NC}"
    HAS_SESSION=true
    USER_EMAIL=$(echo "$SESSION" | jq -r '.user.email' 2>/dev/null)
    USER_ROLE=$(echo "$SESSION" | jq -r '.user.role' 2>/dev/null)
    echo "User: $USER_EMAIL"
    echo "Role: $USER_ROLE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Check Auth Providers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${CYAN}Calling GET /api/auth/providers...${NC}"
PROVIDERS=$(curl -sS "$BASE_URL/api/auth/providers")
echo ""
echo "Available Providers:"
echo "$PROVIDERS" | jq '.' 2>/dev/null || echo "$PROVIDERS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Check CSRF Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${CYAN}Calling GET /api/auth/csrf...${NC}"
CSRF=$(curl -sS "$BASE_URL/api/auth/csrf")
echo ""
echo "CSRF Token:"
echo "$CSRF" | jq '.' 2>/dev/null || echo "$CSRF"

CSRF_TOKEN=$(echo "$CSRF" | jq -r '.csrfToken' 2>/dev/null)
if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ CSRF token generated successfully${NC}"
else
    echo -e "${RED}❌ CSRF token missing${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Test Route Access Control"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$HAS_SESSION" = true ]; then
    echo -e "${PURPLE}Testing as: Authenticated User ($USER_ROLE)${NC}"
    echo ""
    
    # Test marketing pages (should redirect)
    echo -n "  Homepage (/) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/")
    if [ "$STATUS" = "307" ] || [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}Status: $STATUS${NC}"
    else
        echo -e "${RED}Status: $STATUS (unexpected)${NC}"
    fi
    
    # Test dashboard (should work)
    echo -n "  Dashboard (/dashboard) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Accessible (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS${NC}"
    fi
    
    # Test learning paths
    echo -n "  Learning Paths (/learning-paths) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/learning-paths")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Accessible (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS${NC}"
    fi
    
    # Test AI Tutor
    echo -n "  AI Tutor (/ai-tutor) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/ai-tutor")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Accessible (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS${NC}"
    fi
    
    # Test assignments
    echo -n "  Assignments (/ai-tutor/assignments) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/ai-tutor/assignments")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Accessible (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS${NC}"
    fi
    
    # Test role-based access
    if [ "$USER_ROLE" != "TEACHER" ] && [ "$USER_ROLE" != "ADMIN" ]; then
        echo -n "  Teacher Routes (/teacher/courses) ... "
        STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/teacher/courses")
        if [ "$STATUS" = "307" ]; then
            echo -e "${GREEN}✅ Correctly denied (Status: $STATUS)${NC}"
        else
            echo -e "${RED}❌ Status: $STATUS (should be 307)${NC}"
        fi
    fi
    
else
    echo -e "${YELLOW}Testing as: Guest (Unauthenticated)${NC}"
    echo ""
    
    # Test public pages (should work)
    echo -n "  Homepage (/) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Accessible (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS${NC}"
    fi
    
    echo -n "  Pricing (/pricing) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/pricing")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Accessible (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS${NC}"
    fi
    
    echo -n "  Login Page (/auth/login) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/auth/login")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Accessible (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS${NC}"
    fi
    
    # Test protected pages (should redirect)
    echo -n "  Dashboard (/dashboard) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
    if [ "$STATUS" = "307" ]; then
        echo -e "${GREEN}✅ Correctly protected (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS (should be 307)${NC}"
    fi
    
    echo -n "  Learning Paths (/learning-paths) ... "
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/learning-paths")
    if [ "$STATUS" = "307" ]; then
        echo -e "${GREEN}✅ Correctly protected (Status: $STATUS)${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS (should be 307)${NC}"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Session Configuration Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "NextAuth Configuration:"
echo "  Version: 4.24.5"
echo "  Strategy: JWT"
echo "  Session Duration: 30 days"
echo "  Token Refresh: Every 24 hours"
echo "  JWT Refresh from DB: Every 5 minutes"
echo ""

echo "Cookie Configuration:"
echo "  Name: next-auth.session-token"
echo "  HttpOnly: true (XSS protection)"
echo "  SameSite: lax (CSRF protection)"
echo "  Secure: true in production"
echo "  Path: /"
echo ""

echo "Available Providers:"
echo "  1. Credentials (Email + Password)"
echo "  2. Google OAuth"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 6: Test Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$HAS_SESSION" = false ]; then
    echo ""
    echo -e "${YELLOW}🧪 Manual Tests to Perform:${NC}"
    echo ""
    echo "1. Login Test:"
    echo "   - Go to: http://localhost:3000/auth/login"
    echo "   - Use: student@example.com / password123"
    echo "   - Expected: Redirect to /dashboard"
    echo ""
    echo "2. Session Persistence Test:"
    echo "   - Login and close browser"
    echo "   - Reopen and go to /dashboard"
    echo "   - Expected: Still logged in"
    echo ""
    echo "3. Invalid Credentials Test:"
    echo "   - Try: wrong@email.com / wrongpass"
    echo "   - Expected: Error message"
    echo ""
    echo "4. Role-Based Access Test:"
    echo "   - Login as student"
    echo "   - Try: http://localhost:3000/teacher/courses"
    echo "   - Expected: Redirect to /dashboard (denied)"
    echo ""
    echo "5. Marketing Page Redirect Test:"
    echo "   - While logged in, try: http://localhost:3000/"
    echo "   - Expected: Redirect to /dashboard"
    echo ""
else
    echo ""
    echo -e "${GREEN}✅ Session is active!${NC}"
    echo ""
    echo -e "${CYAN}🧪 Tests you can perform now:${NC}"
    echo ""
    echo "1. Try accessing marketing pages (should redirect):"
    echo "   http://localhost:3000/"
    echo "   http://localhost:3000/pricing"
    echo ""
    echo "2. Test role-based access:"
    if [ "$USER_ROLE" = "STUDENT" ]; then
        echo "   - Try /teacher/courses (should be denied)"
        echo "   - Try /admin/dashboard (should be denied)"
    fi
    echo ""
    echo "3. Test logout:"
    echo "   - Click logout in dashboard"
    echo "   - Verify redirect to /auth/login"
    echo "   - Verify session cleared"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 7: Interactive Testing Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "${BLUE}🌐 Browser Testing:${NC}"
echo "  Open: http://localhost:3000/test-session.html"
echo "  Features:"
echo "    - Real-time session monitoring"
echo "    - Route access testing"
echo "    - Quick login buttons"
echo "    - Cookie inspection"
echo ""

echo -e "${BLUE}📊 Check Session in Browser DevTools:${NC}"
echo "  1. Press F12"
echo "  2. Go to Application tab"
echo "  3. Expand Cookies"
echo "  4. Look for: next-auth.session-token"
echo "  5. Check expiration date"
echo ""

echo -e "${BLUE}🔍 Monitor Middleware Logs:${NC}"
echo "  Watch terminal for these logs:"
echo "    🔒 [MIDDLEWARE] Authenticated user trying to access..."
echo "    🚫 [MIDDLEWARE] Unauthenticated access to..."
echo "    🚫 [MIDDLEWARE] Non-admin user trying to access..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 8: Test Accounts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "┌────────────────────────────┬──────────────┬──────────┬──────────────┐"
echo "│ Email                      │ Password     │ Role     │ Dashboard    │"
echo "├────────────────────────────┼──────────────┼──────────┼──────────────┤"
echo "│ student@example.com        │ password123  │ STUDENT  │ /dashboard   │"
echo "│ teacher@example.com        │ password123  │ TEACHER  │ /teacher/... │"
echo "│ admin@example.com          │ password123  │ ADMIN    │ /admin/...   │"
echo "└────────────────────────────┴──────────────┴──────────┴──────────────┘"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "📋 Summary"
echo "═══════════════════════════════════════════════════════════════════"

if [ "$HAS_SESSION" = true ]; then
    echo -e "${GREEN}✅ Session Active${NC}"
    echo "   User: $USER_EMAIL"
    echo "   Role: $USER_ROLE"
    echo ""
    echo "Next Steps:"
    echo "  1. Test route access based on role"
    echo "  2. Test logout functionality"
    echo "  3. Verify session clears properly"
else
    echo -e "${YELLOW}⚠️  No Active Session${NC}"
    echo ""
    echo "Next Steps:"
    echo "  1. Login at: http://localhost:3000/auth/login"
    echo "  2. Use test account (see table above)"
    echo "  3. Verify redirect to dashboard"
    echo "  4. Check session cookie created"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"

