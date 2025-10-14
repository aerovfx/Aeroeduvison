#!/bin/bash

# Auth Testing Demo Script
# This script demonstrates how to run auth tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  $1${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in project root directory!"
    exit 1
fi

print_header "Auth.js (Next-Auth) Testing Demo"

# Step 1: Check environment
print_step "Step 1: Checking environment..."
sleep 1

if [ -f ".env" ]; then
    print_success ".env file found"
    
    # Check for required variables
    if grep -q "NEXTAUTH_SECRET" .env; then
        print_success "NEXTAUTH_SECRET configured"
    else
        print_warning "NEXTAUTH_SECRET not found in .env"
    fi
    
    if grep -q "NEXTAUTH_URL" .env; then
        print_success "NEXTAUTH_URL configured"
    else
        print_warning "NEXTAUTH_URL not found in .env"
    fi
    
    if grep -q "DATABASE_URL" .env; then
        print_success "DATABASE_URL configured"
    else
        print_error "DATABASE_URL not found in .env"
    fi
else
    print_error ".env file not found!"
    print_info "Create .env file with required variables"
    exit 1
fi

echo ""

# Step 2: Check database
print_step "Step 2: Checking database..."
sleep 1

if [ -f "prisma/dev.db" ]; then
    print_success "Database file exists"
else
    print_warning "Database file not found"
    print_info "Run: npx prisma migrate dev"
fi

echo ""

# Step 3: Run comprehensive test
print_step "Step 3: Running comprehensive auth test..."
print_info "This will test authentication logic, JWT, roles, and permissions"
echo ""
sleep 2

npm run test:auth

echo ""
print_success "Comprehensive test completed!"
echo ""

# Step 4: Ask about API test
print_step "Step 4: API Endpoint Test"
print_warning "API test requires the dev server to be running!"
echo ""

read -p "Is the dev server running on port 3000? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running API tests..."
    echo ""
    sleep 1
    npm run test:auth:api
    echo ""
    print_success "API test completed!"
else
    print_info "Skipping API tests"
    print_info "To run API tests:"
    echo "  Terminal 1: npm run dev"
    echo "  Terminal 2: npm run test:auth:api"
fi

echo ""

# Step 5: Browser test info
print_step "Step 5: Browser Interactive Test"
print_info "For visual testing, open the browser test page"
echo ""
print_info "URL: http://localhost:3000/test-auth-browser.html"
echo ""
print_info "Test users available:"
echo "  👨‍🎓 Student: student.test@example.com / StudentPass123!"
echo "  👨‍🏫 Teacher: teacher.test@example.com / TeacherPass123!"
echo "  👑 Admin: admin.test@example.com / AdminPass123!"
echo ""

read -p "Open browser test now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "http://localhost:3000/test-auth-browser.html"
        print_success "Browser test opened!"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000/test-auth-browser.html"
        print_success "Browser test opened!"
    else
        print_warning "Could not open browser automatically"
        print_info "Please open: http://localhost:3000/test-auth-browser.html"
    fi
else
    print_info "You can open it later at: http://localhost:3000/test-auth-browser.html"
fi

echo ""

# Summary
print_header "Testing Summary"

print_success "Comprehensive test: COMPLETED"
print_info "API test: Check output above"
print_info "Browser test: Available at /test-auth-browser.html"

echo ""
print_info "For detailed information, see:"
echo "  📖 AUTH_TESTING_GUIDE.md - Full testing guide"
echo "  📝 AUTH_TEST_SUMMARY.md - Quick summary"
echo "  🚀 AUTH_QUICK_REFERENCE.md - Quick reference"

echo ""
print_header "Test Demo Completed"

# Exit with success
exit 0


