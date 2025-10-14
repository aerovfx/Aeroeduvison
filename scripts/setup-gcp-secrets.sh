#!/bin/bash

# Setup Google Cloud Secrets for LMS Math Application
# Run this script after setting up your GCP project and enabling required APIs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    print_error "No GCP project is set. Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_status "Setting up secrets for project: $PROJECT_ID"

# Enable required APIs
print_status "Enabling required APIs..."
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Function to create secret if it doesn't exist
create_secret_if_not_exists() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe "$secret_name" &> /dev/null; then
        print_warning "Secret $secret_name already exists. Updating..."
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
    else
        print_status "Creating secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" --data-file=-
    fi
}

# Prompt for required secrets
echo ""
print_status "Please provide the following environment variables:"

# Database URL
read -p "DATABASE_URL (PostgreSQL connection string): " DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL is required"
    exit 1
fi

# NextAuth Secret
read -p "NEXTAUTH_SECRET (random string for JWT signing): " NEXTAUTH_SECRET
if [ -z "$NEXTAUTH_SECRET" ]; then
    print_warning "Generating random NEXTAUTH_SECRET..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
fi

# Optional secrets
read -p "MUX_TOKEN_ID (optional, press enter to skip): " MUX_TOKEN_ID
read -p "MUX_TOKEN_SECRET (optional, press enter to skip): " MUX_TOKEN_SECRET
read -p "UPLOADTHING_SECRET (optional, press enter to skip): " UPLOADTHING_SECRET
read -p "UPLOADTHING_APP_ID (optional, press enter to skip): " UPLOADTHING_APP_ID
read -p "STRIPE_API_KEY (optional, press enter to skip): " STRIPE_API_KEY
read -p "STRIPE_WEBHOOK_SECRET (optional, press enter to skip): " STRIPE_WEBHOOK_SECRET

# Google Cloud Storage setup
read -p "GCS_BUCKET_NAME (for file uploads, optional): " GCS_BUCKET_NAME

# Create secrets
print_status "Creating secrets in Google Secret Manager..."

create_secret_if_not_exists "DATABASE_URL" "$DATABASE_URL"
create_secret_if_not_exists "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"

if [ ! -z "$MUX_TOKEN_ID" ]; then
    create_secret_if_not_exists "MUX_TOKEN_ID" "$MUX_TOKEN_ID"
fi

if [ ! -z "$MUX_TOKEN_SECRET" ]; then
    create_secret_if_not_exists "MUX_TOKEN_SECRET" "$MUX_TOKEN_SECRET"
fi

if [ ! -z "$UPLOADTHING_SECRET" ]; then
    create_secret_if_not_exists "UPLOADTHING_SECRET" "$UPLOADTHING_SECRET"
fi

if [ ! -z "$UPLOADTHING_APP_ID" ]; then
    create_secret_if_not_exists "UPLOADTHING_APP_ID" "$UPLOADTHING_APP_ID"
fi

if [ ! -z "$STRIPE_API_KEY" ]; then
    create_secret_if_not_exists "STRIPE_API_KEY" "$STRIPE_API_KEY"
fi

if [ ! -z "$STRIPE_WEBHOOK_SECRET" ]; then
    create_secret_if_not_exists "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
fi

if [ ! -z "$GCS_BUCKET_NAME" ]; then
    create_secret_if_not_exists "GCS_BUCKET_NAME" "$GCS_BUCKET_NAME"
fi

# Create GCS bucket if specified
if [ ! -z "$GCS_BUCKET_NAME" ]; then
    print_status "Creating GCS bucket: $GCS_BUCKET_NAME"
    if gsutil ls -b gs://"$GCS_BUCKET_NAME" &> /dev/null; then
        print_warning "Bucket $GCS_BUCKET_NAME already exists"
    else
        gsutil mb -p "$PROJECT_ID" -c STANDARD -l asia-southeast1 gs://"$GCS_BUCKET_NAME"
        
        # Make bucket publicly readable for uploaded files
        gsutil iam ch allUsers:objectViewer gs://"$GCS_BUCKET_NAME"
        
        # Set CORS policy
        cat > /tmp/cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF
        gsutil cors set /tmp/cors.json gs://"$GCS_BUCKET_NAME"
        rm /tmp/cors.json
    fi
fi

print_status "Secrets setup completed!"
print_status "Next steps:"
echo "1. Update your cloudbuild.yaml to reference these secrets"
echo "2. Run the deploy script: ./scripts/deploy.sh"
echo "3. Your application will be available at: https://lmsmath-[hash]-uc.a.run.app"

print_warning "Make sure to:"
echo "- Set up your database and run migrations"
echo "- Configure your domain if needed"
echo "- Set up monitoring and logging"








