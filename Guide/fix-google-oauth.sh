#!/bin/bash

# Script tự động sửa lỗi Google OAuth "invalid_client"
# Script này sẽ kiểm tra và cập nhật cấu hình OAuth cho Cloud Run

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

echo -e "${BLUE}🔧 Google OAuth Auto-Fix Script${NC}"
echo "Project ID: $PROJECT_ID"
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Get current service URL
echo -e "${YELLOW}📋 Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}❌ Cannot get service URL. Service may not exist.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Service URL: $SERVICE_URL${NC}"
echo ""

# Step 1: Update NEXTAUTH_URL
echo -e "${YELLOW}📝 Step 1: Updating NEXTAUTH_URL...${NC}"
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars "NEXTAUTH_URL=$SERVICE_URL" \
  --quiet

echo -e "${GREEN}✅ NEXTAUTH_URL updated to: $SERVICE_URL${NC}"
echo ""

# Step 2: Check Google OAuth secrets
echo -e "${YELLOW}🔐 Step 2: Checking Google OAuth secrets...${NC}"

if ! gcloud secrets describe google-client-id --project=$PROJECT_ID &> /dev/null; then
    echo -e "${RED}❌ Secret 'google-client-id' does not exist${NC}"
    echo -e "${YELLOW}Creating secret...${NC}"
    read -p "Enter Google OAuth Client ID: " CLIENT_ID
    echo "$CLIENT_ID" | gcloud secrets create google-client-id --data-file=- --project=$PROJECT_ID
else
    CLIENT_ID=$(gcloud secrets versions access latest --secret="google-client-id" --project=$PROJECT_ID)
    echo -e "${GREEN}✅ Google Client ID found: ${CLIENT_ID:0:30}...${NC}"
fi

if ! gcloud secrets describe google-client-secret --project=$PROJECT_ID &> /dev/null; then
    echo -e "${RED}❌ Secret 'google-client-secret' does not exist${NC}"
    echo -e "${YELLOW}Creating secret...${NC}"
    read -sp "Enter Google OAuth Client Secret: " CLIENT_SECRET
    echo ""
    echo "$CLIENT_SECRET" | gcloud secrets create google-client-secret --data-file=- --project=$PROJECT_ID
else
    echo -e "${GREEN}✅ Google Client Secret found${NC}"
fi

# Check if secrets are attached to Cloud Run service
echo ""
echo -e "${YELLOW}🔗 Step 3: Checking if secrets are attached to Cloud Run...${NC}"
CURRENT_SECRETS=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(spec.template.spec.containers[0].env)" | grep -o "google-client-[a-z]*" || echo "")

if [[ $CURRENT_SECRETS != *"google-client-id"* ]]; then
    echo -e "${YELLOW}⚠️  Google Client ID secret not attached. Attaching...${NC}"
    gcloud run services update $SERVICE_NAME \
      --region $REGION \
      --set-secrets "GOOGLE_CLIENT_ID=google-client-id:latest" \
      --quiet
    echo -e "${GREEN}✅ Google Client ID secret attached${NC}"
fi

if [[ $CURRENT_SECRETS != *"google-client-secret"* ]]; then
    echo -e "${YELLOW}⚠️  Google Client Secret not attached. Attaching...${NC}"
    gcloud run services update $SERVICE_NAME \
      --region $REGION \
      --set-secrets "GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
      --quiet
    echo -e "${GREEN}✅ Google Client Secret attached${NC}"
fi

# Generate redirect URI
CALLBACK_URL="$SERVICE_URL/api/auth/callback/google"

echo ""
echo -e "${BLUE}📋 Step 4: OAuth Configuration Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Service URL:${NC} $SERVICE_URL"
echo -e "${GREEN}NEXTAUTH_URL:${NC} $SERVICE_URL"
echo -e "${GREEN}Callback URL:${NC} $CALLBACK_URL"
echo -e "${GREEN}Client ID:${NC} ${CLIENT_ID:0:50}..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 5: Instructions for Google Cloud Console
echo -e "${YELLOW}⚠️  MANUAL STEP REQUIRED: Configure OAuth in Google Cloud Console${NC}"
echo ""
echo "1. Open Google Cloud Console:"
echo "   https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo ""
echo "2. Find OAuth 2.0 Client ID:"
echo "   $CLIENT_ID"
echo ""
echo "3. Add these Authorized redirect URIs:"
echo -e "   ${GREEN}$CALLBACK_URL${NC}"
echo ""
echo "4. Add these Authorized JavaScript origins:"
echo -e "   ${GREEN}$SERVICE_URL${NC}"
echo ""
echo "5. Click 'SAVE'"
echo ""

# Option to open browser
read -p "Open Google Cloud Console in browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Opening browser...${NC}"
    open "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
fi

echo ""
echo -e "${GREEN}✅ Configuration check complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure redirect URIs in Google Cloud Console (see above)"
echo "2. Wait 1-2 minutes for changes to propagate"
echo "3. Test Google sign-in at: $SERVICE_URL/auth/login"
echo ""
echo -e "${BLUE}📝 To test OAuth after configuration:${NC}"
echo "curl -I $SERVICE_URL/api/auth/signin/google"

