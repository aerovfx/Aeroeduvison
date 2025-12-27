#!/bin/bash

# Script to check environment variables on production Cloud Run

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PRODUCTION_URL="https://inphysic.com"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌐 Checking Production Environment Variables${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}📍 Production URL: ${PRODUCTION_URL}${NC}"
echo ""

# Method 1: Check via API endpoint
echo -e "${YELLOW}📡 Method 1: Check via /api/check-env endpoint${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "${PRODUCTION_URL}/api/check-env" 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE OK${NC}"
    echo ""
    echo -e "${BLUE}📋 Environment Variables:${NC}"
    if command -v jq &> /dev/null; then
        echo "$BODY" | jq '.'
        echo ""
        echo -e "${BLUE}📊 Key Values:${NC}"
        echo -e "  ${YELLOW}NEXTAUTH_URL:${NC} $(echo "$BODY" | jq -r '.NEXTAUTH_URL // "not set"')"
        echo -e "  ${YELLOW}NODE_ENV:${NC} $(echo "$BODY" | jq -r '.NODE_ENV // "not set"')"
        echo -e "  ${YELLOW}K_SERVICE:${NC} $(echo "$BODY" | jq -r '.K_SERVICE // "not set"')"
        echo -e "  ${YELLOW}VERCEL_URL:${NC} $(echo "$BODY" | jq -r '.VERCEL_URL // "not set"')"
        echo -e "  ${YELLOW}Detected Base URL:${NC} $(echo "$BODY" | jq -r '.detectedBaseUrl // "not set"')"
        echo -e "  ${YELLOW}Host:${NC} $(echo "$BODY" | jq -r '.host // "not set"')"
        echo -e "  ${YELLOW}Port:${NC} $(echo "$BODY" | jq -r '.port // "not set"')"
        echo -e "  ${YELLOW}Timestamp:${NC} $(echo "$BODY" | jq -r '.timestamp // "not set"')"
    else
        echo "$BODY"
    fi
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo ""
    echo -e "${RED}Error Response:${NC}"
    echo "$BODY"
    echo ""
    echo -e "${YELLOW}💡 Tip: Endpoint might not be deployed yet or server is down${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Method 2: Check via gcloud CLI (if available)
if command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}📡 Method 2: Check via gcloud CLI${NC}"
    echo ""
    
    SERVICE_NAME="lmsmath-app"
    REGION="asia-east1"
    
    echo -e "${CYAN}Checking Cloud Run service environment variables...${NC}"
    echo ""
    
    gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" \
        --format="value(spec.template.spec.containers[0].env)" 2>/dev/null | \
        grep -E "NEXTAUTH_URL|NODE_ENV|K_SERVICE" || \
        echo -e "${YELLOW}⚠️  Could not fetch env vars via gcloud (might need authentication)${NC}"
    
    echo ""
else
    echo -e "${YELLOW}📡 Method 2: gcloud CLI not available${NC}"
    echo -e "${CYAN}💡 Install gcloud CLI to check env vars directly from Cloud Run${NC}"
    echo ""
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}💡 Quick Test Commands:${NC}"
echo ""
echo -e "  ${YELLOW}Check via curl:${NC}"
echo "    curl ${PRODUCTION_URL}/api/check-env"
echo ""
echo -e "  ${YELLOW}Check via browser:${NC}"
echo "    ${PRODUCTION_URL}/api/check-env"
echo ""
echo -e "  ${YELLOW}Check via gcloud (if authenticated):${NC}"
echo "    gcloud run services describe lmsmath-app --region asia-east1 --format='value(spec.template.spec.containers[0].env)'"
echo ""

