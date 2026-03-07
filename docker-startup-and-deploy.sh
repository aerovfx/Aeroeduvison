#!/bin/bash

###############################################################################
# docker-startup-and-deploy.sh
# Purpose: Start Docker and deploy to Cloud Run
# Usage: ./docker-startup-and-deploy.sh
###############################################################################

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Docker Startup & AeroeduVision Deployment                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Check if Docker is installed
echo -e "${BLUE}📦 Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker found: $(docker --version)${NC}"
echo ""

# Step 2: Start Docker
echo -e "${BLUE}🐳 Starting Docker Desktop...${NC}"
echo "   This may take 30-60 seconds..."
open -a Docker 2>/dev/null || open /Applications/Docker.app 2>/dev/null

# Wait for Docker to be ready
echo -e "${YELLOW}⏳ Waiting for Docker daemon to start...${NC}"
max_attempts=30
attempt=0

while ! docker ps &> /dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ Docker failed to start after $max_attempts attempts${NC}"
        echo "   Please start Docker Desktop manually and try again"
        exit 1
    fi
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

echo -e "${GREEN}✅ Docker is running!${NC}"
echo ""

# Step 3: Check gcloud
echo -e "${BLUE}🌍 Checking gcloud authentication...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found${NC}"
    exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated. Authenticating...${NC}"
    gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json
fi

PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$PROJECT" != "gen-lang-client-0712182643" ]; then
    echo -e "${YELLOW}⚠️  Setting project...${NC}"
    gcloud config set project gen-lang-client-0712182643
fi

ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format='value(account)')
echo -e "${GREEN}✅ Authenticated: $ACCOUNT${NC}"
echo ""

# Step 4: Check .env file
echo -e "${BLUE}📝 Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp env.example .env
    echo -e "${YELLOW}📝 Edit .env with your values:${NC}"
    echo "   nano .env"
    echo ""
    read -p "Press Enter after you've configured .env... "
fi
echo -e "${GREEN}✅ .env file configured${NC}"
echo ""

# Step 5: Run deployment
echo -e "${BLUE}🚀 Starting deployment...${NC}"
echo ""
./deploy-to-gen-lang-client.sh

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Deployment Successful!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "📍 Service deployed to Cloud Run"
    echo "🌐 Get your service URL:"
    echo "   gcloud run services describe lmsmath-app --region asia-southeast1 --format='value(status.url)'"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
