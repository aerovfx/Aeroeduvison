#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up PostgreSQL database for Math LMS${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
    echo -e "${YELLOW}On macOS: brew install postgresql${NC}"
    echo -e "${YELLOW}On Ubuntu: sudo apt-get install postgresql postgresql-contrib${NC}"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running. Starting PostgreSQL...${NC}"
    
    # Try to start PostgreSQL (different commands for different systems)
    if command -v brew &> /dev/null; then
        # macOS with Homebrew
        brew services start postgresql
    elif command -v systemctl &> /dev/null; then
        # Linux with systemd
        sudo systemctl start postgresql
    else
        echo -e "${RED}❌ Cannot start PostgreSQL automatically. Please start it manually.${NC}"
        exit 1
    fi
    
    # Wait a moment for PostgreSQL to start
    sleep 3
fi

# Database configuration
DB_NAME="lmsmath"
DB_USER="lmsuser"
DB_PASSWORD="lms123"

echo -e "${BLUE}📊 Creating database and user...${NC}"

# Create database and user
sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

\q
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and user created successfully!${NC}"
else
    echo -e "${RED}❌ Failed to create database and user${NC}"
    exit 1
fi

# Update .env.local with the new database URL
echo -e "${BLUE}📝 Updating .env.local...${NC}"

cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

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
echo -e "   Password: $DB_PASSWORD"
echo -e "   Host: localhost"
echo -e "   Port: 5432"
echo ""
echo -e "${YELLOW}🔑 Test Accounts Created:${NC}"
echo -e "   Teacher: teacher@example.com / teacher123"
echo -e "   Student: student@example.com / student123"
echo -e "   Admin: admin@example.com / admin123"
echo -e "   Student 2: student2@example.com / student123"
echo -e "   Student 3: student3@example.com / student123"
echo ""
echo -e "${BLUE}🚀 You can now start the development server:${NC}"
echo -e "   npm run dev"
