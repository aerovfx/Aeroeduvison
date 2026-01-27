#!/bin/bash

###############################################################################
# diagnose-build.sh
# Purpose: Diagnose why npm build is failing
# Usage: ./diagnose-build.sh
###############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Build Diagnostics - Finding Build Issues              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Check Node version
echo -e "${BLUE}1️⃣  Checking Node.js version...${NC}"
node --version
npm --version
echo ""

# 2. Check dependencies
echo -e "${BLUE}2️⃣  Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing...${NC}"
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# 3. Check Prisma
echo -e "${BLUE}3️⃣  Checking Prisma schema...${NC}"
if [ -f "prisma/schema.prisma" ]; then
    echo -e "${GREEN}✅ Prisma schema found${NC}"
    echo "Generating Prisma client..."
    PRISMA_SKIP_VALIDATION=1 npx prisma generate
else
    echo -e "${RED}❌ Prisma schema not found${NC}"
fi
echo ""

# 4. Check TypeScript
echo -e "${BLUE}4️⃣  Checking TypeScript compilation...${NC}"
npm run type-check 2>&1 | head -20 || echo "TypeScript check failed (may be normal)"
echo ""

# 5. Try to build
echo -e "${BLUE}5️⃣  Running build...${NC}"
echo "This may take several minutes..."
npm run build 2>&1 | tail -50

echo ""
echo -e "${GREEN}✅ Diagnostics complete${NC}"
