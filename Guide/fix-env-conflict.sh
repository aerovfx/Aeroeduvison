#!/bin/bash

# Fix Environment Variable Conflicts on Cloud Run

set -e

PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-east1"
SERVICE_NAME="lmsmath-app"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Fix Environment Variable Conflicts${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}This will clear ALL env vars and secrets from Cloud Run service.${NC}"
echo -e "${YELLOW}Then you can redeploy with clean configuration.${NC}"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}1️⃣ Clearing environment variables...${NC}"
gcloud run services update "$SERVICE_NAME" \
  --region "$REGION" \
  --clear-env-vars \
  --no-traffic \
  --quiet 2>/dev/null || echo "   No env vars to clear"

echo -e "${GREEN}   ✅ Environment variables cleared${NC}"
echo ""

echo -e "${YELLOW}2️⃣ Clearing secrets...${NC}"
gcloud run services update "$SERVICE_NAME" \
  --region "$REGION" \
  --clear-secrets \
  --no-traffic \
  --quiet 2>/dev/null || echo "   No secrets to clear"

echo -e "${GREEN}   ✅ Secrets cleared${NC}"
echo ""

echo -e "${YELLOW}3️⃣ Verifying current configuration...${NC}"
echo ""
gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format="table(spec.template.spec.containers[0].env[].name, spec.template.spec.containers[0].env[].value)" \
  2>/dev/null || echo "   No environment variables set"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Cleanup Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "   1. Run deploy script again:"
echo "      ./deploy-local-amd64.sh"
echo ""

