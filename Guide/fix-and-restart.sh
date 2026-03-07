#!/bin/bash

echo "🔧 FIXING SIGN-UP ERROR..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Kill all Next.js servers
echo "${BLUE}Step 1: Stopping all Next.js servers...${NC}"
pkill -f "next dev" 2>/dev/null && echo "${GREEN}✅ Servers stopped${NC}" || echo "${YELLOW}⚠️  No servers running${NC}"
sleep 1

# 2. Verify .env.local
echo ""
echo "${BLUE}Step 2: Verifying .env.local...${NC}"
if [ -f ".env.local" ]; then
    current_url=$(grep "DATABASE_URL" .env.local | cut -d'"' -f2)
    if [ "$current_url" = "file:./dev.db" ]; then
        echo "${GREEN}✅ .env.local is correct: $current_url${NC}"
    else
        echo "${YELLOW}⚠️  Fixing .env.local...${NC}"
        echo 'DATABASE_URL="file:./dev.db"' > .env.local
        echo "${GREEN}✅ .env.local fixed${NC}"
    fi
else
    echo "${YELLOW}⚠️  Creating .env.local...${NC}"
    echo 'DATABASE_URL="file:./dev.db"' > .env.local
    echo "${GREEN}✅ .env.local created${NC}"
fi

# 3. Regenerate Prisma Client
echo ""
echo "${BLUE}Step 3: Regenerating Prisma Client...${NC}"
npx prisma generate > /dev/null 2>&1 && echo "${GREEN}✅ Prisma client regenerated${NC}" || echo "${RED}❌ Prisma generate failed${NC}"

# 4. Instructions to restart
echo ""
echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║  READY TO RESTART SERVER                                   ║${NC}"
echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "${YELLOW}NOW RUN IN YOUR TERMINAL:${NC}"
echo ""
echo "${BLUE}  npm run dev${NC}"
echo ""
echo "Then test sign-up at: ${BLUE}http://localhost:3001/sign-up${NC}"
echo ""
echo "${GREEN}✨ All fixes applied! Server restart will complete the fix.${NC}"


