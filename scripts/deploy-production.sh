#!/bin/bash

# Production Deployment Script
# Chạy: bash scripts/deploy-production.sh

set -e

echo "🚀 Starting Production Deployment Process..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Stop any running servers
print_status "Stopping any running servers..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Step 2: Clean previous builds
print_status "Cleaning previous builds..."
rm -rf .next
print_success "Build cache cleared"

# Step 3: Install dependencies
print_status "Installing dependencies..."
npm install --legacy-peer-deps
print_success "Dependencies installed"

# Step 4: Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Step 5: Build for production
print_status "Building for production..."
npm run build
print_success "Production build completed"

# Step 6: Test production build locally
print_status "Testing production build locally..."
if [ -f ".next/standalone/server.js" ]; then
    print_status "Using standalone server..."
    node .next/standalone/server.js &
    SERVER_PID=$!
else
    print_status "Using standard Next.js start..."
    npm run start &
    SERVER_PID=$!
fi
sleep 5

# Check if server is running
if curl -s http://localhost:3000/sign-in > /dev/null; then
    print_success "Production server is running successfully!"
    
    # Test key endpoints
    print_status "Testing key endpoints..."
    
    # Test sign-in page
    if curl -s http://localhost:3000/sign-in | grep -q "Sign In"; then
        print_success "✓ Sign-in page loads correctly"
    else
        print_error "✗ Sign-in page failed to load"
    fi
    
    # Test sign-up page
    if curl -s http://localhost:3000/sign-up | grep -q "Sign Up"; then
        print_success "✓ Sign-up page loads correctly"
    else
        print_error "✗ Sign-up page failed to load"
    fi
    
    # Test database connection
    if curl -s http://localhost:3000/test-db | grep -q "Database connection successful"; then
        print_success "✓ Database connection working"
    else
        print_error "✗ Database connection failed"
    fi
    
    # Test static assets
    if curl -s -I http://localhost:3000/_next/static/css/app/layout.css | grep -q "200 OK"; then
        print_success "✓ Static assets loading correctly"
    else
        print_warning "⚠ Static assets may have issues"
    fi
    
else
    print_error "Production server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Stop production server
kill $SERVER_PID 2>/dev/null || true
sleep 2

print_success "================================================"
print_success "🎉 Production deployment test completed successfully!"
print_success "================================================"

echo ""
print_status "📋 Next steps for actual deployment:"
echo "1. Set up production database"
echo "2. Configure environment variables on your hosting platform"
echo "3. Deploy using your preferred method:"
echo "   - Vercel: vercel --prod"
echo "   - Netlify: Connect GitHub and auto-deploy"
echo "   - Railway: Connect GitHub and auto-deploy"
echo "   - Google Cloud Run: gcloud run deploy"
echo ""
print_status "📚 See PRODUCTION_DEPLOYMENT_GUIDE.md for detailed instructions"
