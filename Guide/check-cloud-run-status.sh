#!/bin/bash

# Check Cloud Run Service Status

PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-east1"
SERVICE_NAME="lmsmath-app"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Checking Cloud Run Service Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Check service status
echo -e "${YELLOW}1️⃣ Service Status:${NC}"
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format="table(status.conditions.type, status.conditions.status, status.conditions.message)" \
  2>/dev/null || echo "Service not found or error"
echo ""

# 2. Check recent revisions
echo -e "${YELLOW}2️⃣ Recent Revisions:${NC}"
gcloud run revisions list \
  --service $SERVICE_NAME \
  --region $REGION \
  --limit 3 \
  --format="table(metadata.name, status.conditions[0].status, metadata.creationTimestamp)" \
  2>/dev/null
echo ""

# 3. Check latest logs (errors)
echo -e "${YELLOW}3️⃣ Recent Error Logs:${NC}"
gcloud run services logs read $SERVICE_NAME \
  --region $REGION \
  --limit 30 \
  --format="table(timestamp, severity, textPayload)" \
  2>/dev/null | grep -E "ERROR|error|Error|crash|Crash|failed|Failed" | tail -20
echo ""

# 4. Check latest logs (all)
echo -e "${YELLOW}4️⃣ Latest Logs (Last 10):${NC}"
gcloud run services logs read $SERVICE_NAME \
  --region $REGION \
  --limit 10 \
  2>/dev/null
echo ""

# 5. Check URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" 2>/dev/null)
echo -e "${YELLOW}5️⃣ Testing Service URL:${NC}"
echo "   URL: $SERVICE_URL"
if [ ! -z "$SERVICE_URL" ]; then
    echo -e "${BLUE}   Testing /api/health...${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/health" --connect-timeout 10 || echo "TIMEOUT")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}   ✅ Health check passed (200)${NC}"
    else
        echo -e "${RED}   ❌ Health check failed ($HTTP_CODE)${NC}"
    fi
else
    echo -e "${RED}   ❌ No service URL${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 Common Issues:${NC}"
echo ""
echo "ERR_CONNECTION_RESET / ERR_TIMED_OUT usually means:"
echo "  1. Service is crashing on startup"
echo "  2. Database connection failing"
echo "  3. Memory/timeout exceeded"
echo "  4. Missing environment variables"
echo ""
echo "Check logs above for clues!"
echo ""

