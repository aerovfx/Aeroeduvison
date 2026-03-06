#!/bin/bash

# GCS Setup Script for Math LMS
echo "🚀 Setting up Google Cloud Storage for Math LMS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud CLI is not installed!"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

print_status "Google Cloud CLI found"

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_warning "You are not authenticated with Google Cloud"
    echo "Please run: gcloud auth login"
    exit 1
fi

print_status "Google Cloud authentication verified"

# Get current project
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    print_error "No project is set. Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_status "Current project: $PROJECT_ID"

# Create GCS bucket
BUCKET_NAME="math-lms-videos-$(whoami)-$(date +%s)"
echo "Creating GCS bucket: $BUCKET_NAME"

if gcloud storage buckets create gs://$BUCKET_NAME --location=asia-southeast1; then
    print_status "GCS bucket created: $BUCKET_NAME"
else
    print_error "Failed to create GCS bucket"
    exit 1
fi

# Create CORS configuration
CORS_FILE="cors.json"
cat > $CORS_FILE << 'EOF'
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Range", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
EOF

print_status "CORS configuration file created: $CORS_FILE"

# Apply CORS to bucket
if gsutil cors set $CORS_FILE gs://$BUCKET_NAME; then
    print_status "CORS policy applied to bucket"
else
    print_warning "Failed to apply CORS policy"
fi

# Create service account
SA_NAME="math-lms-gcs-service"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo "Creating service account: $SA_NAME"

if gcloud iam service-accounts create $SA_NAME \
    --display-name="Math LMS GCS Service" \
    --description="Service account for Math LMS GCS operations"; then
    print_status "Service account created: $SA_EMAIL"
else
    print_warning "Service account might already exist"
fi

# Grant Storage Admin role
if gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.admin"; then
    print_status "Storage Admin role granted to service account"
else
    print_error "Failed to grant Storage Admin role"
fi

# Create and download service account key
KEY_FILE="service-account-key.json"
echo "Creating service account key..."

if gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SA_EMAIL; then
    print_status "Service account key created: $KEY_FILE"
else
    print_error "Failed to create service account key"
    exit 1
fi

# Create .env.local file
ENV_FILE=".env.local"
echo "Creating environment configuration..."

cat > $ENV_FILE << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/lmsmath"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Mux (for video streaming)
MUX_TOKEN_ID="your-mux-token-id"
MUX_TOKEN_SECRET="your-mux-token-secret"

# Google Cloud Storage Configuration
GOOGLE_CLOUD_PROJECT_ID="$PROJECT_ID"
GOOGLE_CLOUD_KEY_FILE="./$KEY_FILE"
GCS_BUCKET_NAME="$BUCKET_NAME"
NEXT_PUBLIC_GCS_BUCKET_NAME="$BUCKET_NAME"

# Uploadthing (for file uploads)
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"

# Stripe (for payments)
STRIPE_API_KEY="your-stripe-api-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
EOF

print_status "Environment file created: $ENV_FILE"

# Make bucket publicly readable for demo
echo "Making bucket publicly readable for demo..."
if gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME; then
    print_status "Bucket is now publicly readable"
else
    print_warning "Failed to make bucket public"
fi

# Clean up
rm -f $CORS_FILE

echo ""
echo "🎉 GCS Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  - Project ID: $PROJECT_ID"
echo "  - Bucket Name: $BUCKET_NAME"
echo "  - Service Account: $SA_EMAIL"
echo "  - Key File: $KEY_FILE"
echo "  - Environment File: $ENV_FILE"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start your development server: npm run dev"
echo "  2. Test upload at: http://localhost:3000/test-gcs-video"
echo "  3. Upload a video file to test the integration"
echo ""
echo "⚠️  Security Note:"
echo "  - Keep your service account key file secure"
echo "  - Don't commit it to version control"
echo "  - Consider using signed URLs for production"
