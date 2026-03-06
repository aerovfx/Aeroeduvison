#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pushing local database to Supabase...${NC}"

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide Supabase DATABASE_URL${NC}"
    echo -e "${YELLOW}Usage: ./scripts/push-to-supabase.sh 'postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres'${NC}"
    exit 1
fi

SUPABASE_DATABASE_URL="$1"

echo -e "${BLUE}📝 Setting up environment...${NC}"

# Create temporary .env file for Supabase
cat > .env.supabase << EOF
DATABASE_URL="$SUPABASE_DATABASE_URL"
EOF

echo -e "${BLUE}🔧 Running Prisma migrations on Supabase...${NC}"

# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push --schema=./prisma/schema.prisma

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema pushed to Supabase successfully!${NC}"
else
    echo -e "${RED}❌ Failed to push schema to Supabase${NC}"
    exit 1
fi

echo -e "${BLUE}🌱 Seeding Supabase database...${NC}"

# Seed the database
npx prisma db seed

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database seeded successfully!${NC}"
else
    echo -e "${RED}❌ Failed to seed database${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 Updating Google Secret Manager...${NC}"

# Update DATABASE_URL in Google Secret Manager
echo "$SUPABASE_DATABASE_URL" | gcloud secrets versions add DATABASE_URL --data-file=-

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ DATABASE_URL updated in Google Secret Manager!${NC}"
else
    echo -e "${RED}❌ Failed to update DATABASE_URL in Secret Manager${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Redeploying Cloud Run service...${NC}"

# Redeploy the service
gcloud run services update lmsmath --region=asia-southeast1 --image=gcr.io/gen-lang-client-0712182643/lmsmath:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Service redeployed successfully!${NC}"
else
    echo -e "${RED}❌ Failed to redeploy service${NC}"
    exit 1
fi

# Clean up
rm -f .env.supabase

echo -e "${GREEN}🎉 Database successfully pushed to Supabase!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "   1. Test your application at https://aerovfx.com"
echo -e "   2. Verify database connection in Supabase dashboard"
echo -e "   3. Check logs in Google Cloud Console if needed"





