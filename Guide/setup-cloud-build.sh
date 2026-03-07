#!/bin/bash

# Setup Cloud Build and Permissions

set -e

PROJECT_ID="gen-lang-client-0712182643"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Setup Cloud Build & Permissions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Enable APIs
echo -e "${YELLOW}1️⃣ Enabling required APIs...${NC}"
echo -e "${BLUE}   This may take 1-2 minutes...${NC}"

gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}   ✅ Cloud Build API enabled${NC}"

gcloud services enable containerregistry.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}   ✅ Container Registry API enabled${NC}"

gcloud services enable artifactregistry.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}   ✅ Artifact Registry API enabled${NC}"

gcloud services enable run.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}   ✅ Cloud Run API enabled${NC}"

echo ""

# Step 2: Get project number
echo -e "${YELLOW}2️⃣ Getting project number...${NC}"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
echo -e "${BLUE}   Project Number: $PROJECT_NUMBER${NC}"
echo ""

# Step 3: Grant permissions
echo -e "${YELLOW}3️⃣ Granting permissions to Cloud Build service account...${NC}"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin \
  --quiet

echo -e "${GREEN}   ✅ Cloud Run Admin role granted${NC}"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser \
  --quiet

echo -e "${GREEN}   ✅ Service Account User role granted${NC}"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/storage.admin \
  --quiet

echo -e "${GREEN}   ✅ Storage Admin role granted${NC}"

echo ""

# Step 4: Verify
echo -e "${YELLOW}4️⃣ Verifying setup...${NC}"

echo -e "${BLUE}   Enabled APIs:${NC}"
gcloud services list --enabled --project=$PROJECT_ID --filter="name:(cloudbuild OR artifactregistry OR run)" --format="table(name)"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "   Project: $PROJECT_ID"
echo "   Project Number: $PROJECT_NUMBER"
echo "   APIs: ✅ Enabled"
echo "   Permissions: ✅ Granted"
echo ""
echo -e "${GREEN}🚀 Ready to deploy!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "   1. Run: chmod +x deploy-local-amd64.sh"
echo "   2. Run: ./deploy-local-amd64.sh"
echo ""

