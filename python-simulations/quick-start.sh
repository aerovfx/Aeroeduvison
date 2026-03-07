#!/bin/bash

# 🚀 Quick Start Script for Python Simulations
# This script helps you quickly set up and build simulations

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     🧪 LabTwin Python Simulations - Quick Start       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Python
echo -e "${CYAN}[1/4] Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed!${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✅ Found: $PYTHON_VERSION${NC}"
echo ""

# Install dependencies
echo -e "${CYAN}[2/4] Installing dependencies...${NC}"
if [ -f "requirements.txt" ]; then
    python3 -m pip install -r requirements.txt --quiet
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  requirements.txt not found, skipping...${NC}"
fi
echo ""

# Build simulations
echo -e "${CYAN}[3/4] Building all simulations...${NC}"
python3 build-all.py
echo ""

# Summary
echo -e "${CYAN}[4/4] Setup complete!${NC}"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗"
echo -e "║                  ✅ All Done!                          ║"
echo -e "╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${PURPLE}📦 Next steps:${NC}"
echo -e "  ${BLUE}1.${NC} Start Next.js dev server:"
echo -e "     ${YELLOW}npm run dev${NC}"
echo -e ""
echo -e "  ${BLUE}2.${NC} Open your browser:"
echo -e "     ${YELLOW}http://localhost:3000/dashboard/labtwin/labs${NC}"
echo -e ""
echo -e "  ${BLUE}3.${NC} Explore the simulations!"
echo ""
echo -e "${PURPLE}🔧 Useful commands:${NC}"
echo -e "  • Build all:        ${YELLOW}python3 build-all.py${NC}"
echo -e "  • Build refraction: ${YELLOW}cd refraction && python3 build.py${NC}"
echo -e "  • Build projectile: ${YELLOW}cd projectile && python3 build.py${NC}"
echo ""
echo -e "${CYAN}📚 Documentation: ${YELLOW}../PYTHON_SIMULATIONS_GUIDE.md${NC}"
echo ""


