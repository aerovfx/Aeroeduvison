#!/bin/bash
set -eo pipefail

# deploy-cloudrun-with-secrets.sh
# Purpose: Build & push container image, create/update Secret Manager secrets from .env file,
# and deploy to Cloud Run with secrets attached as environment variables.
# Usage: ./deploy-cloudrun-with-secrets.sh [PROJECT_ID] [SERVICE_NAME] [REGION] [IMAGE_TAG]
# Example: ./deploy-cloudrun-with-secrets.sh inphysic lmsmath-app asia-east1 v1.0.0

# Defaults
PROJECT_ID="${1:-inphysic}"
SERVICE_NAME="${2:-lmsmath-app}"
REGION="${3:-asia-southeast1}"
IMAGE_TAG="${4:-latest}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}"

# Files to source (priority: .env.production, .env)
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE=".env"
fi

# List of secrets to sync
SECRETS_LIST="NEXTAUTH_URL NEXTAUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET DATABASE_URL"

# Helper: check dependencies
function check_prereqs() {
  command -v gcloud >/dev/null 2>&1 || { echo "gcloud CLI is required. Install and authenticate (gcloud auth login)."; exit 1; }
  command -v docker >/dev/null 2>&1 || echo "Warning: docker not found. gcloud builds submit will still work if configured."
}

# Helper: source env file safely
function load_env() {
  if [ -f "$ENV_FILE" ]; then
    echo "🔒 Loading environment variables from $ENV_FILE"
    # Export all variables from file
    set -a
    # shellcheck disable=SC1091
    source "$ENV_FILE"
    set +a
  else
    echo "⚠️  No .env or .env.production found. Secrets must be available via env or will be skipped."
  fi
}

# Helper: create or update a secret in Secret Manager
function sync_secret() {
  local secret_name="$1"
  local secret_value="$2"

  if [ -z "$secret_value" ]; then
    echo "   - Skipping $secret_name (no value set)"
    return
  fi

  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "   - Secret $secret_name exists. Adding new version..."
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID" >/dev/null 2>&1 || true
  else
    echo "   - Creating secret $secret_name and adding value..."
    echo -n "$secret_value" | gcloud secrets create "$secret_name" --data-file=- --project="$PROJECT_ID" >/dev/null 2>&1 || {
      # If secret already exists (race condition), just add version instead
      echo "   - Secret already exists, adding new version..."
      echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID" >/dev/null 2>&1 || true
    }
  fi
}

# Main
check_prereqs

echo "📦 Using project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

load_env

# Sync secrets
echo "🔐 Syncing secrets to Secret Manager..."
for secret_name in $SECRETS_LIST; do
  # Get value from environment variable (already loaded from .env file)
  value=$(eval echo \$"$secret_name")
  
  if [ -z "$value" ]; then
    echo "   - Skipping $secret_name (no value found)"
    continue
  fi

  sync_secret "$secret_name" "$value"
done

# Build and push image
echo "🔨 Building and pushing image: $IMAGE_NAME"
gcloud builds submit --tag "$IMAGE_NAME"

# Prepare --set-secrets arguments for gcloud run deploy
SECRETS_ARGS=""
for secret_name in $SECRETS_LIST; do
  # Only attach if secret exists
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    SECRETS_ARGS="$SECRETS_ARGS --set-secrets ${secret_name}=${secret_name}:latest"
  fi
done

# Deploy
echo "☁️  Deploying to Cloud Run service: $SERVICE_NAME (region: $REGION)"
# Default runtime settings - modify as needed
# shellcheck disable=SC2086
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --port 8080 \
  --set-env-vars "NODE_ENV=production" \
  $SECRETS_ARGS

# Show service URL
echo "✅ Deployment finished. Service URL:"
gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format 'value(status.url)'

echo "✨ Done"
