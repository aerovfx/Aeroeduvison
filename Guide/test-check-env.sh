#!/bin/bash

# Test script for /api/check-env endpoint

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧪 Testing /api/check-env Endpoint${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detect base URL
BASE_URL="${1:-http://localhost:3000}"

echo -e "${YELLOW}📍 Testing: ${BASE_URL}/api/check-env${NC}"
echo ""

# Make request
echo -e "${BLUE}📡 Sending GET request...${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/check-env" 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Check HTTP status
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE OK${NC}"
    echo ""
    echo -e "${BLUE}📋 Response:${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    
    # Extract and display key info
    if command -v jq &> /dev/null; then
        echo -e "${BLUE}📊 Key Information:${NC}"
        echo ""
        echo -e "  ${YELLOW}NEXTAUTH_URL:${NC} $(echo "$BODY" | jq -r '.NEXTAUTH_URL // "not set"')"
        echo -e "  ${YELLOW}NODE_ENV:${NC} $(echo "$BODY" | jq -r '.NODE_ENV // "not set"')"
        echo -e "  ${YELLOW}K_SERVICE:${NC} $(echo "$BODY" | jq -r '.K_SERVICE // "not set"')"
        echo -e "  ${YELLOW}VERCEL_URL:${NC} $(echo "$BODY" | jq -r '.VERCEL_URL // "not set"')"
        echo -e "  ${YELLOW}Detected Base URL:${NC} $(echo "$BODY" | jq -r '.detectedBaseUrl // "not set"')"
        echo ""
    fi
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo ""
    echo -e "${RED}Error Response:${NC}"
    echo "$BODY"
    echo ""
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Usage:${NC}"
echo "  ./test-check-env.sh                    # Test localhost:3000"
echo "  ./test-check-env.sh https://inphysic.com  # Test production"
echo ""

