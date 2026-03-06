#!/bin/bash

# =============================================================================
# Setup Secrets in Google Cloud Secret Manager
# =============================================================================

set -e

PROJECT_ID="gen-lang-client-0712182643"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Set project
gcloud config set project "$PROJECT_ID" --quiet

print_info "Setting up secrets for project: $PROJECT_ID"

# Function to create or update secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    
    if gcloud secrets describe "$SECRET_NAME" --quiet 2>/dev/null; then
        print_warning "Secret $SECRET_NAME already exists"
        read -p "Update it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=-
            print_success "Secret $SECRET_NAME updated"
        fi
    else
        echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
            --data-file=- \
            --replication-policy="automatic"
        print_success "Secret $SECRET_NAME created"
    fi
}

# =============================================================================
# NEXTAUTH_SECRET
# =============================================================================

print_info "Setting up NEXTAUTH_SECRET..."

if [ -z "$NEXTAUTH_SECRET" ]; then
    print_warning "NEXTAUTH_SECRET not set in environment"
    read -p "Enter NEXTAUTH_SECRET (or press Enter to generate): " INPUT_SECRET
    
    if [ -z "$INPUT_SECRET" ]; then
        print_info "Generating new secret..."
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        echo "Generated: $NEXTAUTH_SECRET"
    else
        NEXTAUTH_SECRET="$INPUT_SECRET"
    fi
fi

create_or_update_secret "nextauth-secret" "$NEXTAUTH_SECRET"

# =============================================================================
# GOOGLE_CLIENT_SECRET
# =============================================================================

print_info "Setting up GOOGLE_CLIENT_SECRET..."

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    print_warning "GOOGLE_CLIENT_SECRET not set in environment"
    read -p "Enter GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
fi

if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    create_or_update_secret "google-client-secret" "$GOOGLE_CLIENT_SECRET"
else
    print_warning "Skipping GOOGLE_CLIENT_SECRET (empty)"
fi

# =============================================================================
# DATABASE_URL
# =============================================================================

print_info "Setting up DATABASE_URL..."

if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL not set in environment"
    read -p "Enter DATABASE_URL: " DATABASE_URL
fi

if [ -n "$DATABASE_URL" ]; then
    create_or_update_secret "database-url" "$DATABASE_URL"
else
    print_warning "Skipping DATABASE_URL (empty)"
fi

# =============================================================================
# Grant Access to Cloud Run
# =============================================================================

print_info "Granting access to Cloud Run service account..."

# Get default compute service account
SERVICE_ACCOUNT=$(gcloud iam service-accounts list \
    --filter="email:*compute@developer.gserviceaccount.com" \
    --format="value(email)")

if [ -n "$SERVICE_ACCOUNT" ]; then
    for SECRET in "nextauth-secret" "google-client-secret" "database-url"; do
        if gcloud secrets describe "$SECRET" --quiet 2>/dev/null; then
            gcloud secrets add-iam-policy-binding "$SECRET" \
                --member="serviceAccount:$SERVICE_ACCOUNT" \
                --role="roles/secretmanager.secretAccessor" \
                --quiet 2>/dev/null || true
        fi
    done
    print_success "Access granted to $SERVICE_ACCOUNT"
else
    print_warning "Could not find service account"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Secrets Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Listing secrets..."
gcloud secrets list --filter="name:nextauth-secret OR name:google-client-secret OR name:database-url"

echo ""
print_success "✅ All secrets configured!"
print_info "You can now run: ./deploy.sh"