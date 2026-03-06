#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🐳 Docker Check & Deploy${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if Docker is running
echo -e "${YELLOW}🔍 Checking Docker status...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running!${NC}"
    echo ""
    echo -e "${YELLOW}📋 To fix this:${NC}"
    echo ""
    echo -e "${CYAN}Option 1: Start Docker Desktop GUI${NC}"
    echo "   1. Open Docker Desktop app from Applications"
    echo "   2. Wait for Docker to start (icon turns normal)"
    echo "   3. Run this script again"
    echo ""
    echo -e "${CYAN}Option 2: Start from command line (if installed)${NC}"
    echo "   open -a Docker"
    echo "   # Wait 30 seconds for Docker to start"
    echo "   ./START_DOCKER_AND_DEPLOY.sh"
    echo ""
    echo -e "${RED}❌ Cannot proceed without Docker running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running!${NC}"
docker --version
echo ""

# Check Docker Buildx
echo -e "${YELLOW}🔍 Checking Docker Buildx...${NC}"
if ! docker buildx version > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Buildx not available${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Buildx available${NC}"
echo ""

# All good - proceed to deploy
echo -e "${GREEN}✅ All prerequisites met!${NC}"
echo ""
echo -e "${YELLOW}🚀 Starting deployment...${NC}"
echo ""

# Run the main deploy script
exec ./DEPLOY_FIX_LOCALHOST_FINAL.sh

