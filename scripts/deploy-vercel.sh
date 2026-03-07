#!/bin/bash

# Deploy to Vercel Script
# Chạy: bash scripts/deploy-vercel.sh

set -e

echo "🚀 Deploying to Vercel..."
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed!"
    print_status "Install it with: npm i -g vercel"
    exit 1
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_error "Not logged in to Vercel!"
    print_status "Login with: vercel login"
    exit 1
fi

print_status "Current Vercel user: $(vercel whoami)"

# Build for production first
print_status "Building for production..."
npm run build
print_success "Build completed"

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod

print_success "=========================================="
print_success "🎉 Deployment to Vercel completed!"
print_success "=========================================="

echo ""
print_status "📋 Don't forget to set environment variables in Vercel dashboard:"
echo "1. Go to your project in Vercel dashboard"
echo "2. Go to Settings > Environment Variables"
echo "3. Add these variables:"
echo ""
echo "   DATABASE_URL=your-production-database-url"
echo "   NEXTAUTH_URL=https://your-domain.vercel.app"
echo "   NEXTAUTH_SECRET=your-secret-key"
echo ""
echo "   Optional:"
echo "   GOOGLE_CLIENT_ID=your-google-client-id"
echo "   GOOGLE_CLIENT_SECRET=your-google-client-secret"
echo ""
print_status "📚 See PRODUCTION_DEPLOYMENT_GUIDE.md for detailed instructions"




