#!/bin/bash

# Script setup database local với Docker PostgreSQL
# Usage: ./setup-local-database.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🚀 Setup Database Local với Docker PostgreSQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker chưa được cài đặt${NC}"
    echo "Vui lòng cài đặt Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker đã được cài đặt${NC}"
echo ""

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose chưa được cài đặt${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose đã được cài đặt${NC}"
echo ""

# Start PostgreSQL
echo "📦 Đang khởi động PostgreSQL container..."
echo ""

if docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  PostgreSQL container đã chạy${NC}"
else
    echo "Đang start PostgreSQL..."
    docker-compose up -d postgres
    
    echo ""
    echo "⏳ Đợi PostgreSQL khởi động (10 giây)..."
    sleep 10
fi

echo ""
echo -e "${GREEN}✅ PostgreSQL container đã sẵn sàng${NC}"
echo ""

# Database connection info
DB_USER="lmsmath"
DB_PASSWORD="lmsmath_password"
DB_NAME="lmsmath"
DB_HOST="localhost"
DB_PORT="5432"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "📋 Thông tin Database:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Host:     ${DB_HOST}"
echo "Port:     ${DB_PORT}"
echo "Database: ${DB_NAME}"
echo "User:     ${DB_USER}"
echo "Password: ${DB_PASSWORD}"
echo ""
echo "DATABASE_URL:"
echo "${DATABASE_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Update .env.local
echo "📝 Đang cập nhật .env.local..."
echo ""

if [ ! -f ".env.local" ]; then
    echo "Tạo file .env.local..."
    touch .env.local
fi

# Backup .env.local
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup
    echo -e "${BLUE}💾 Đã backup .env.local thành .env.local.backup${NC}"
fi

# Update DATABASE_URL in .env.local
if grep -q "^DATABASE_URL=" .env.local; then
    # Replace existing DATABASE_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env.local
    else
        # Linux
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env.local
    fi
    echo -e "${GREEN}✅ Đã cập nhật DATABASE_URL trong .env.local${NC}"
else
    # Add DATABASE_URL
    echo "" >> .env.local
    echo "# Local PostgreSQL Database" >> .env.local
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env.local
    echo -e "${GREEN}✅ Đã thêm DATABASE_URL vào .env.local${NC}"
fi

echo ""

# Test connection
echo "🔍 Đang kiểm tra kết nối database..."
echo ""

# Wait a bit more for PostgreSQL to be fully ready
sleep 5

if docker-compose exec -T postgres psql -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Kết nối database thành công!${NC}"
else
    echo -e "${YELLOW}⚠️  Chưa thể kết nối, đợi thêm 5 giây...${NC}"
    sleep 5
    if docker-compose exec -T postgres psql -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Kết nối database thành công!${NC}"
    else
        echo -e "${RED}❌ Không thể kết nối database${NC}"
        echo "Vui lòng kiểm tra logs: docker-compose logs postgres"
        exit 1
    fi
fi

echo ""

# Generate Prisma Client
echo "🔧 Đang generate Prisma Client..."
echo ""

npx prisma generate

echo ""
echo -e "${GREEN}✅ Prisma Client đã được generate${NC}"
echo ""

# Run migrations
echo "📊 Đang chạy database migrations..."
echo ""

npx prisma migrate dev --name init || npx prisma db push

echo ""
echo -e "${GREEN}✅ Database migrations đã hoàn thành${NC}"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup Database Local hoàn tất!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Thông tin kết nối:"
echo "   DATABASE_URL: ${DATABASE_URL}"
echo ""
echo "🚀 Bước tiếp theo:"
echo "   1. Kiểm tra database: ${BLUE}docker-compose ps postgres${NC}"
echo "   2. Xem logs: ${BLUE}docker-compose logs postgres${NC}"
echo "   3. Chạy Prisma Studio: ${BLUE}npx prisma studio${NC}"
echo "   4. Start dev server: ${BLUE}npm run dev${NC}"
echo ""
echo "🛑 Để dừng database:"
echo "   ${BLUE}docker-compose stop postgres${NC}"
echo ""
echo "🗑️  Để xóa database (mất dữ liệu):"
echo "   ${BLUE}docker-compose down -v postgres${NC}"
echo ""

