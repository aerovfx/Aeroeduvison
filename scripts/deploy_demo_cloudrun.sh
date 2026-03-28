#!/bin/bash

# =============================================================================
# Cloud Run Deployment Script — __demo__
# Project: extreme-lattice-491123-p2
# Based on: scripts/deploy_cloudrun.sh (empyrean-harbor-489423-v6)
# =============================================================================
# Usage:
#   bash scripts/deploy_demo_cloudrun.sh              # Full deploy
#   bash scripts/deploy_demo_cloudrun.sh deploy-only   # Redeploy existing image
#   bash scripts/deploy_demo_cloudrun.sh build-only    # Build Docker image only
#   bash scripts/deploy_demo_cloudrun.sh make-public   # Make service public
#   bash scripts/deploy_demo_cloudrun.sh status         # Check status
#   bash scripts/deploy_demo_cloudrun.sh logs           # View logs
#   bash scripts/deploy_demo_cloudrun.sh help           # Show help
# =============================================================================

set -e

# ─────────────────────────────────────────────────────────────
# CONFIGURATION — __demo__ on extreme-lattice-491123-p2
# ─────────────────────────────────────────────────────────────
PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="demo"
IMAGE_NAME="demo-frontend"
IMAGE_TAG="latest"
REPO_NAME="demo"

# GCS Bucket Configuration (same region)
BUCKET_NAME="demo-3d-assets"
BUCKET_LOCATION="asia-southeast1"
CDN_BUCKET_NAME="demo-cdn-extreme-lattice"

# Artifact Registry full URI
AR_HOST="${REGION}-docker.pkg.dev"
IMAGE_URI="${AR_HOST}/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

# ─────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1"; }
print_info()    { echo -e "  ${YELLOW}→${NC} $1"; }
print_step()    { echo -e "  ${CYAN}[$1]${NC} $2"; }

# ─────────────────────────────────────────────────────────────
# STEP 0: PRE-FLIGHT CHECKS
# ─────────────────────────────────────────────────────────────
check_prerequisites() {
    print_header "Step 0: Pre-Flight Checks"

    # gcloud
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    print_success "gcloud CLI found: $(gcloud version 2>/dev/null | head -1)"

    # Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Install Docker Desktop: https://docker.com/products/docker-desktop/"
        exit 1
    fi

    # Check Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon not running. Start Docker Desktop first."
        exit 1
    fi
    print_success "Docker Desktop running: $(docker version --format '{{.Server.Version}}' 2>/dev/null)"

    # Check if buildx is available
    if docker buildx version &> /dev/null; then
        print_success "Docker Buildx available"
    else
        print_info "Docker Buildx not available — will use legacy builder"
    fi
}

# ─────────────────────────────────────────────────────────────
# STEP 1: AUTHENTICATE
# ─────────────────────────────────────────────────────────────
authenticate() {
    print_header "Step 1: Authenticate with Google Cloud"

    # Check existing auth
    ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
    if [ -z "$ACCOUNT" ]; then
        print_info "Not authenticated. Starting login flow..."
        gcloud auth login
    else
        print_success "Authenticated as: $ACCOUNT"
    fi

    # Set project
    gcloud config set project "$PROJECT_ID" --quiet
    print_success "Project set: $PROJECT_ID"

    # Configure Docker for Artifact Registry
    gcloud auth configure-docker "$AR_HOST" --quiet
    print_success "Docker configured for $AR_HOST"
}

# ─────────────────────────────────────────────────────────────
# STEP 2: ENABLE APIS
# ─────────────────────────────────────────────────────────────
enable_apis() {
    print_header "Step 2: Enable Required GCP APIs"

    local APIS=(
        "run.googleapis.com"
        "artifactregistry.googleapis.com"
        "cloudbuild.googleapis.com"
        "storage.googleapis.com"
    )

    for api in "${APIS[@]}"; do
        print_info "Enabling $api..."
        gcloud services enable "$api" --quiet
    done

    # CDN optional
    if gcloud services enable cdn.googleapis.com --quiet 2>/dev/null; then
        print_success "Cloud CDN enabled"
    else
        print_info "Cloud CDN skipped (optional)"
    fi

    print_success "All required APIs enabled"
}

# ─────────────────────────────────────────────────────────────
# STEP 3: ARTIFACT REGISTRY
# ─────────────────────────────────────────────────────────────
create_registry() {
    print_header "Step 3: Create Artifact Registry Repository"

    if gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" &> /dev/null; then
        print_success "Repository already exists: $REPO_NAME"
    else
        print_info "Creating repository: $REPO_NAME"
        gcloud artifacts repositories create "$REPO_NAME" \
            --repository-format=docker \
            --location="$REGION" \
            --description="Docker repo for __demo__ app"
        print_success "Repository created"
    fi
}

# ─────────────────────────────────────────────────────────────
# STEP 4: BUILD DOCKER IMAGE (locally with Docker Desktop)
# ─────────────────────────────────────────────────────────────
build_docker() {
    print_header "Step 4: Build Docker Image (Docker Desktop + Rosetta)"

    print_info "Image: $IMAGE_URI"
    print_info "Platform: linux/amd64 (cross-build from Apple Silicon)"
    print_info "Using Docker Desktop with Rosetta emulation"
    echo ""

    # Prefer buildx (BuildKit) for better caching & memory management
    if docker buildx version &> /dev/null; then
        print_info "Building with docker buildx..."
        docker buildx build \
            --platform linux/amd64 \
            --load \
            --no-cache \
            --tag "$IMAGE_URI" \
            --progress=plain \
            -f Dockerfile \
            .
    else
        print_info "Building with docker build..."
        docker build \
            --platform linux/amd64 \
            --no-cache \
            --tag "$IMAGE_URI" \
            --progress=plain \
            .
    fi

    print_success "Docker image built successfully"

    # Show image size
    SIZE=$(docker image inspect "$IMAGE_URI" --format='{{.Size}}' 2>/dev/null)
    if [ -n "$SIZE" ]; then
        SIZE_MB=$((SIZE / 1024 / 1024))
        print_info "Image size: ${SIZE_MB}MB"
    fi
}

# ─────────────────────────────────────────────────────────────
# STEP 5: PUSH IMAGE TO ARTIFACT REGISTRY
# ─────────────────────────────────────────────────────────────
push_image() {
    print_header "Step 5: Push Image to Artifact Registry"

    print_info "Pushing: $IMAGE_URI"
    docker push "$IMAGE_URI"
    print_success "Image pushed successfully"
}

# ─────────────────────────────────────────────────────────────
# STEP 6: DEPLOY TO CLOUD RUN
# ─────────────────────────────────────────────────────────────
deploy_cloud_run() {
    local DEPLOY_IMAGE="${1:-$IMAGE_URI}"

    print_header "Step 6: Deploy to Cloud Run"

    print_info "Service:  $SERVICE_NAME"
    print_info "Region:   $REGION"
    print_info "Image:    $DEPLOY_IMAGE"
    print_info "Memory:   1Gi  |  CPU: 1  |  Max instances: 10"
    echo ""

    # Read env vars from .env.local (skip comments and empty lines)
    # We use ^||^ separator to avoid conflicts with special chars in URLs
    local ENV_VARS="NODE_ENV=production"

    # Database
    ENV_VARS="${ENV_VARS}||DATABASE_URL=postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-twilight-recipe-a12e50nn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

    # Auth — NEXTAUTH_URL will be auto-set in Step 7
    ENV_VARS="${ENV_VARS}||NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa"
    ENV_VARS="${ENV_VARS}||NEXTAUTH_URL=https://demo-placeholder.run.app"

    # Google OAuth
    ENV_VARS="${ENV_VARS}||GOOGLE_CLIENT_ID=903966803331-vf16qa9g66ocnhme1et3m0gc0r4um8th.apps.googleusercontent.com"
    ENV_VARS="${ENV_VARS}||GOOGLE_CLIENT_SECRET=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"

    # Google Cloud
    ENV_VARS="${ENV_VARS}||GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
    ENV_VARS="${ENV_VARS}||GOOGLE_CLOUD_BUCKET=${BUCKET_NAME}"

    # AI / LLM — OpenRouter for production (Ollama won't work in Cloud Run)
    ENV_VARS="${ENV_VARS}||OPENAI_API_KEY=${OPENROUTER_API_KEY:-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}"
    ENV_VARS="${ENV_VARS}||OPENAI_BASE_URL=https://openrouter.ai/api/v1"
    ENV_VARS="${ENV_VARS}||OPENAI_MODEL=gpt-4o-mini"
    ENV_VARS="${ENV_VARS}||OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-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}"

    # Rust canary — disabled for demo
    ENV_VARS="${ENV_VARS}||RUST_CANARY_GRADING_PERCENT=0"
    ENV_VARS="${ENV_VARS}||RUST_CANARY_LLM_GRADING_PERCENT=0"

    # Storage
    ENV_VARS="${ENV_VARS}||STORAGE_BUCKET=${BUCKET_NAME}"
    ENV_VARS="${ENV_VARS}||CDN_URL=https://storage.googleapis.com/${CDN_BUCKET_NAME}"

    gcloud run deploy "$SERVICE_NAME" \
        --image "$DEPLOY_IMAGE" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 1 \
        --concurrency 80 \
        --timeout 600 \
        --min-instances 0 \
        --max-instances 10 \
        --set-env-vars="^||^${ENV_VARS}"

    if [ $? -eq 0 ]; then
        print_success "Deployment successful!"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────────
# STEP 7: AUTO-CONFIGURE NEXTAUTH_URL
# ─────────────────────────────────────────────────────────────
configure_nextauth_url() {
    print_header "Step 7: Configure NEXTAUTH_URL"

    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" \
        --format 'value(status.url)' 2>/dev/null)

    if [ -z "$SERVICE_URL" ]; then
        print_error "Could not get service URL"
        return 1
    fi

    print_info "Service URL: $SERVICE_URL"
    print_info "Updating NEXTAUTH_URL..."

    gcloud run services update "$SERVICE_NAME" \
        --region "$REGION" \
        --update-env-vars "NEXTAUTH_URL=${SERVICE_URL}" \
        --quiet

    print_success "NEXTAUTH_URL set to: $SERVICE_URL"
    echo ""
    echo -e "  ${GREEN}══════════════════════════════════════════════════${NC}"
    echo -e "  ${GREEN}  DEPLOYMENT COMPLETE!${NC}"
    echo -e "  ${GREEN}══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}App URL:${NC}  $SERVICE_URL"
    echo -e "  ${CYAN}Project:${NC}  $PROJECT_ID"
    echo -e "  ${CYAN}Service:${NC}  $SERVICE_NAME"
    echo -e "  ${CYAN}Region:${NC}   $REGION"
    echo ""
    echo -e "  ${YELLOW}POST-DEPLOY:${NC}"
    echo "  1. Add OAuth redirect URI in Google Cloud Console:"
    echo "     → ${SERVICE_URL}/api/auth/callback/google"
    echo "  2. Test login at: ${SERVICE_URL}/auth/login"
    echo "  3. View logs: bash scripts/deploy_demo_cloudrun.sh logs"
    echo ""
}

# ─────────────────────────────────────────────────────────────
# GCS BUCKET SETUP
# ─────────────────────────────────────────────────────────────
setup_gcs_buckets() {
    print_header "Setting up GCS Buckets"

    # Asset bucket
    if gcloud storage buckets describe "gs://${BUCKET_NAME}" &> /dev/null; then
        print_success "Asset bucket exists: ${BUCKET_NAME}"
    else
        print_info "Creating asset bucket: ${BUCKET_NAME}"
        gcloud storage buckets create "gs://${BUCKET_NAME}" \
            --location="$BUCKET_LOCATION" \
            --project="$PROJECT_ID"
        print_success "Asset bucket created"
    fi

    # CORS config
    cat > /tmp/cors.json << 'EOF'
[{"origin":["*"],"method":["GET","PUT","POST","DELETE"],"responseHeader":["Content-Type","Content-Disposition"],"maxAgeSeconds":3600}]
EOF
    gcloud storage buckets update "gs://${BUCKET_NAME}" --cors-file=/tmp/cors.json --quiet
    rm /tmp/cors.json
    print_success "CORS configured"

    # CDN bucket
    if gcloud storage buckets describe "gs://${CDN_BUCKET_NAME}" &> /dev/null; then
        print_success "CDN bucket exists: ${CDN_BUCKET_NAME}"
    else
        print_info "Creating CDN bucket: ${CDN_BUCKET_NAME}"
        gcloud storage buckets create "gs://${CDN_BUCKET_NAME}" \
            --location="$BUCKET_LOCATION" \
            --project="$PROJECT_ID"
        print_success "CDN bucket created"
    fi

    # Try public access
    if gcloud storage buckets add-iam-policy-binding "gs://${CDN_BUCKET_NAME}" \
        --member="allUsers" --role="roles/storage.objectViewer" --quiet 2>/dev/null; then
        print_success "CDN bucket is public"
    else
        print_info "Public access blocked by org policy (configure manually)"
    fi
}

# ─────────────────────────────────────────────────────────────
# IAM PERMISSIONS
# ─────────────────────────────────────────────────────────────
setup_iam() {
    print_header "Setting up IAM Permissions"

    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
    SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

    print_info "Service account: $SA_EMAIL"

    local ROLES=(
        "roles/run.admin"
        "roles/artifactregistry.writer"
        "roles/iam.serviceAccountUser"
        "roles/logging.logWriter"
        "roles/storage.objectViewer"
    )

    for ROLE in "${ROLES[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$SA_EMAIL" \
            --role="$ROLE" --quiet 2>/dev/null
        print_success "Granted: $ROLE"
    done
}

# ─────────────────────────────────────────────────────────────
# MAKE SERVICE PUBLIC
# ─────────────────────────────────────────────────────────────
make_service_public() {
    print_header "Making Service Public"

    # Try direct IAM binding
    if gcloud run services add-iam-policy-binding "$SERVICE_NAME" \
        --member="allUsers" \
        --role="roles/run.invoker" \
        --region="$REGION" --quiet 2>/dev/null; then
        print_success "Service is now public!"
        SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
            --region "$REGION" --format 'value(status.url)')
        echo -e "  URL: ${GREEN}$SERVICE_URL${NC}"
        return 0
    fi

    # Try project-level org policy override
    print_info "Direct method failed. Trying org policy override..."
    cat > /tmp/allow_all_policy.yaml << EOF
constraint: constraints/iam.allowedPolicyMemberDomains
listPolicy:
  allValues: ALLOW
EOF

    if gcloud resource-manager org-policies set-policy /tmp/allow_all_policy.yaml \
        --project="$PROJECT_ID" --quiet 2>/dev/null; then
        print_success "Org policy overridden"
        rm /tmp/allow_all_policy.yaml
        sleep 30
        gcloud run services add-iam-policy-binding "$SERVICE_NAME" \
            --member="allUsers" --role="roles/run.invoker" \
            --region="$REGION" --quiet
        print_success "Service is now public!"
        return 0
    fi
    rm -f /tmp/allow_all_policy.yaml

    # Manual instructions
    print_error "Automatic methods failed — org policy may block allUsers"
    echo ""
    echo "  Manual fix options:"
    echo "  1. Console → IAM → Org Policies → 'Domain restricted sharing' → Allow All"
    echo "  2. Then run: bash scripts/deploy_demo_cloudrun.sh make-public"
    echo ""
}

# ─────────────────────────────────────────────────────────────
# STATUS & LOGS
# ─────────────────────────────────────────────────────────────
show_status() {
    print_header "Deployment Status — __demo__"

    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" --format 'value(status.url)' 2>/dev/null)

    if [ -z "$SERVICE_URL" ]; then
        print_error "Service '$SERVICE_NAME' not found in $REGION"
        return 1
    fi

    print_success "Service: $SERVICE_NAME"
    print_info "URL: $SERVICE_URL"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$SERVICE_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        print_success "Public access: YES (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "403" ]; then
        print_info "Public access: NO (HTTP 403) — run 'make-public' to fix"
    else
        print_info "Status: HTTP $HTTP_CODE"
    fi

    echo ""
    gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" \
        --format='table(status.latestReadyRevisionName,status.traffic[0].percent)' 2>/dev/null
}

view_logs() {
    print_header "Recent Logs — __demo__"
    gcloud logging read \
        "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
        --project="$PROJECT_ID" \
        --limit=30 \
        --format="table(timestamp,textPayload)"
}

# ─────────────────────────────────────────────────────────────
# HELP
# ─────────────────────────────────────────────────────────────
show_help() {
    echo ""
    echo "  __demo__ Cloud Run Deploy Script"
    echo "  Project: $PROJECT_ID  |  Region: $REGION  |  Service: $SERVICE_NAME"
    echo ""
    echo "  Usage: bash scripts/deploy_demo_cloudrun.sh [command]"
    echo ""
    echo "  Commands:"
    echo "    deploy        Full deployment: build → push → deploy → configure (default)"
    echo "    deploy-only   Deploy using existing image (skip build)"
    echo "    build-only    Build & push Docker image only (no deploy)"
    echo "    setup         Setup APIs, Registry, IAM, GCS Buckets"
    echo "    make-public   Make Cloud Run service publicly accessible"
    echo "    status        Show deployment status"
    echo "    logs          View recent logs"
    echo "    help          Show this help"
    echo ""
    echo "  Requirements:"
    echo "    - Docker Desktop running (with Rosetta enabled on Apple Silicon)"
    echo "    - gcloud CLI authenticated"
    echo "    - Docker Desktop Settings → Resources → Memory: 12-16GB, Swap: 4GB"
    echo ""
}

# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
main() {
    print_header "__demo__ Cloud Run Deployment"
    echo "  Project:  $PROJECT_ID"
    echo "  Region:   $REGION"
    echo "  Service:  $SERVICE_NAME"
    echo "  Image:    $IMAGE_URI"
    echo ""

    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            authenticate
            enable_apis
            create_registry
            setup_iam
            setup_gcs_buckets
            build_docker
            push_image
            deploy_cloud_run "$IMAGE_URI"
            configure_nextauth_url
            ;;
        deploy-only)
            check_prerequisites
            authenticate
            deploy_cloud_run "$IMAGE_URI"
            configure_nextauth_url
            ;;
        build-only)
            check_prerequisites
            authenticate
            create_registry
            build_docker
            push_image
            ;;
        setup)
            check_prerequisites
            authenticate
            enable_apis
            create_registry
            setup_iam
            setup_gcs_buckets
            ;;
        make-public)
            authenticate
            make_service_public
            ;;
        status)
            authenticate
            show_status
            ;;
        logs)
            authenticate
            view_logs
            ;;
        help|-h|--help)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
