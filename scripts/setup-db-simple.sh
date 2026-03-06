#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up database for Math LMS${NC}"

# Database configuration
DB_NAME="lmsmath"
DB_USER="vietchung"  # Use current user for macOS
DB_PASSWORD="lms123"

echo -e "${BLUE}📊 Creating database...${NC}"

# Create database using current user
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists or creation failed"

echo -e "${GREEN}✅ Database created${NC}"

# Update .env.local with the new database URL
echo -e "${BLUE}📝 Updating .env.local...${NC}"

cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://$DB_USER@localhost:5432/$DB_NAME"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="math-lms-secret-key-$(date +%s)"

# Mux (optional, for video streaming)
MUX_TOKEN_ID="test-mux-token-id"
MUX_TOKEN_SECRET="test-mux-token-secret"

# Uploadthing (optional, for file uploads)
UPLOADTHING_SECRET="test-uploadthing-secret"
UPLOADTHING_APP_ID="test-uploadthing-app-id"

# Stripe (optional, for payments)
STRIPE_API_KEY="test-stripe-api-key"
STRIPE_WEBHOOK_SECRET="test-stripe-webhook-secret"
EOF

echo -e "${GREEN}✅ .env.local updated with database configuration${NC}"

echo -e "${BLUE}🔧 Running Prisma migrations...${NC}"

# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name init

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migration completed successfully!${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi

echo -e "${BLUE}🌱 Seeding database with test data...${NC}"

# Run seed script
npm run db:seed

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database seeded successfully!${NC}"
else
    echo -e "${RED}❌ Database seeding failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
echo -e "${BLUE}📋 Database Information:${NC}"
echo -e "   Database: $DB_NAME"
echo -e "   User: $DB_USER"
echo -e "   Host: localhost"
echo -e "   Port: 5432"
echo ""
echo -e "${YELLOW}🔑 Test Accounts Created:${NC}"
echo -e "   Admin: admin@example.com / admin123"
echo -e "   Teacher: teacher@example.com / teacher123"
echo -e "   Teacher 2: teacher2@example.com / teacher123"
echo -e "   Student: student@example.com / student123"
echo -e "   Student 2: student2@example.com / student123"
echo -e "   Student 3: student3@example.com / student123"
echo -e "   Student 4: student4@example.com / student123"
echo ""
echo -e "${BLUE}🚀 You can now start the development server:${NC}"
echo -e "   npm run dev"
