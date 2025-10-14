#!/bin/bash

# Debug Session Cookie Script
# Tests if NextAuth is properly setting session cookies after login

BASE_URL="http://localhost:3000"
EMAIL="vietchungvn@gmail.com"
PASSWORD="Test123!"

echo "🔍 Debugging NextAuth Session Cookies..."
echo ""

# Step 1: Get CSRF token
echo "Step 1: Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt "$BASE_URL/api/auth/csrf")
CSRF_TOKEN=$(echo $CSRF_RESPONSE | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "✅ CSRF Token: ${CSRF_TOKEN:0:20}..."
echo ""

# Step 2: Login
echo "Step 2: Attempting login..."
LOGIN_RESPONSE=$(curl -s -i -c cookies.txt -b cookies.txt \
  -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_TOKEN&email=$EMAIL&password=$PASSWORD&redirect=false&json=true")

echo "Login response headers:"
echo "$LOGIN_RESPONSE" | grep -E "(HTTP/|set-cookie)"
echo ""

# Step 3: Check cookies file
echo "Step 3: Checking cookies.txt..."
cat cookies.txt
echo ""

# Step 4: Test session endpoint with cookies
echo "Step 4: Testing /api/auth/session with cookies..."
SESSION_RESPONSE=$(curl -s -b cookies.txt "$BASE_URL/api/auth/session")
echo "Session response:"
echo "$SESSION_RESPONSE" | jq . 2>/dev/null || echo "$SESSION_RESPONSE"
echo ""

# Step 5: Check for session-token cookie
echo "Step 5: Checking for next-auth.session-token cookie..."
if grep -q "session-token" cookies.txt; then
  echo "✅ Session token cookie found!"
  grep "session-token" cookies.txt
else
  echo "❌ Session token cookie NOT found!"
  echo "This is why useSession() returns null!"
fi
echo ""

# Cleanup
rm -f cookies.txt

echo "🎯 Summary:"
if grep -q "session-token" cookies.txt 2>/dev/null; then
  echo "✅ Session cookies working correctly"
else
  echo "❌ Session cookies NOT being set after login"
  echo "   This causes client-side useSession() to return null"
fi


