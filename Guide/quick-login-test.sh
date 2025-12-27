#!/bin/bash
echo "🔍 Quick Login Flow Debug"
echo "========================="
echo ""

echo "1. Getting CSRF token..."
CSRF_TOKEN=$(curl -s "https://inphysic.com/api/auth/csrf" | jq -r '.csrfToken')
echo "CSRF: ${CSRF_TOKEN:0:20}..."
echo ""

echo "2. Testing login POST request..."
curl -i -X POST "https://inphysic.com/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Cookie: csrfToken=$CSRF_TOKEN" \
  -d "csrfToken=$CSRF_TOKEN&email=teacher@example.com&password=teacher123&callbackUrl=/dashboard" \
  -c /tmp/login-cookies.txt \
  2>/dev/null | head -30
echo ""

echo "3. Checking cookies saved..."
cat /tmp/login-cookies.txt
echo ""

echo "4. Testing session endpoint..."
curl -s -b /tmp/login-cookies.txt "https://inphysic.com/api/auth/session" | jq '.'
