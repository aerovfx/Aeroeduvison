#!/bin/bash

# Script kiểm tra cấu hình OAuth hiện tại

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID=${PROJECT_ID:-"gen-lang-client-0712182643"}
SERVICE_NAME="lmsmath-app"
REGION="asia-east1"

echo -e "${BLUE}🔍 OAuth Configuration Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" 2>/dev/null || echo "N/A")

echo -e "${BLUE}📊 Current Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Service Name: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Service URL: $SERVICE_URL"
echo ""

# Check NEXTAUTH_URL
echo -e "${YELLOW}Checking NEXTAUTH_URL...${NC}"
ENV_JSON=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="json" 2>/dev/null)
NEXTAUTH_URL=$(echo "$ENV_JSON" | grep -o '"NEXTAUTH_URL".*' | grep -o "'value': '[^']*" | sed "s/'value': '//" || echo "NOT SET")
if [ "$NEXTAUTH_URL" = "" ]; then
    NEXTAUTH_URL="NOT SET"
fi

if [ "$NEXTAUTH_URL" = "NOT SET" ]; then
    echo -e "${RED}❌ NEXTAUTH_URL is not set${NC}"
else
    if [ "$NEXTAUTH_URL" = "$SERVICE_URL" ]; then
        echo -e "${GREEN}✅ NEXTAUTH_URL matches service URL: $NEXTAUTH_URL${NC}"
    else
        echo -e "${YELLOW}⚠️  NEXTAUTH_URL mismatch:${NC}"
        echo "    Current: $NEXTAUTH_URL"
        echo "    Service: $SERVICE_URL"
    fi
fi
echo ""

# Check Google Client ID secret
echo -e "${YELLOW}Checking Google OAuth secrets...${NC}"
if gcloud secrets describe google-client-id --project=$PROJECT_ID &> /dev/null; then
    CLIENT_ID=$(gcloud secrets versions access latest --secret="google-client-id" --project=$PROJECT_ID)
    echo -e "${GREEN}✅ google-client-id secret exists${NC}"
    echo "    Client ID: ${CLIENT_ID:0:50}..."
else
    echo -e "${RED}❌ google-client-id secret does not exist${NC}"
fi

if gcloud secrets describe google-client-secret --project=$PROJECT_ID &> /dev/null; then
    echo -e "${GREEN}✅ google-client-secret secret exists${NC}"
else
    echo -e "${RED}❌ google-client-secret secret does not exist${NC}"
fi
echo ""

# Check if secrets are attached to Cloud Run
echo -e "${YELLOW}Checking secret attachments...${NC}"
ENV_VARS=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(spec.template.spec.containers[0].env)")

if [[ $ENV_VARS == *"google-client-id"* ]]; then
    echo -e "${GREEN}✅ GOOGLE_CLIENT_ID secret is attached${NC}"
else
    echo -e "${RED}❌ GOOGLE_CLIENT_ID secret is NOT attached${NC}"
fi

if [[ $ENV_VARS == *"google-client-secret"* ]]; then
    echo -e "${GREEN}✅ GOOGLE_CLIENT_SECRET secret is attached${NC}"
else
    echo -e "${RED}❌ GOOGLE_CLIENT_SECRET secret is NOT attached${NC}"
fi
echo ""

# Display callback URL
if [ "$SERVICE_URL" != "N/A" ]; then
    CALLBACK_URL="$SERVICE_URL/api/auth/callback/google"
    echo -e "${BLUE}📍 Required OAuth Configuration:${NC}"
    echo ""
    echo "Authorized redirect URIs (add in Google Cloud Console):"
    echo -e "  ${GREEN}$CALLBACK_URL${NC}"
    echo ""
    echo "Authorized JavaScript origins (add in Google Cloud Console):"
    echo -e "  ${GREEN}$SERVICE_URL${NC}"
    echo ""
    echo "Google Cloud Console:"
    echo "  https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}💡 To auto-fix issues, run:${NC}"
echo "   ./fix-google-oauth.sh"

