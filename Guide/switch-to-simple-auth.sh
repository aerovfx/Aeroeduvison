#!/bin/bash

# Switch to Simple Auth (No Database Required)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Switch to Simple Auth (No Database)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}This will:${NC}"
echo "  1. Switch NextAuth to use simple auth (no database)"
echo "  2. Keep your current auth logic as backup"
echo "  3. Allow app to run without DATABASE_URL"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}1️⃣ Backing up current auth route...${NC}"
cp app/api/auth/[...nextauth]/route.ts app/api/auth/[...nextauth]/route.ts.backup
echo -e "${GREEN}   ✅ Backup created${NC}"
echo ""

echo -e "${YELLOW}2️⃣ Updating to simple auth...${NC}"
cat > app/api/auth/[...nextauth]/route.ts << 'EOF'
import NextAuth from "next-auth"
import { authOptionsSimple } from "@/lib/auth-simple"

// ✅ Using simple auth (no database required)
// Hardcoded users:
// - teacher@example.com / teacher123
// - student@example.com / student123

const handler = NextAuth(authOptionsSimple)

export { handler as GET, handler as POST }
EOF

echo -e "${GREEN}   ✅ Updated to simple auth${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Switch Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Changes:${NC}"
echo "   ✅ Switched to authOptionsSimple"
echo "   ✅ No database required"
echo "   ✅ Backup saved: route.ts.backup"
echo ""
echo -e "${BLUE}👤 Test Users:${NC}"
echo "   Teacher: teacher@example.com / teacher123"
echo "   Student: student@example.com / student123"
echo ""
echo -e "${YELLOW}⚠️  Note:${NC}"
echo "   - User data will NOT persist (hardcoded users)"
echo "   - To restore database auth: cp route.ts.backup route.ts"
echo ""
echo -e "${GREEN}🚀 Next step: Rebuild and deploy${NC}"
echo "   ./deploy-local-amd64.sh"
echo ""

