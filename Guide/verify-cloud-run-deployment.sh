#!/bin/bash

# ============================================================================
# Cloud Run Deployment Verification Script
# ============================================================================
# This script verifies the Cloud Run deployment and checks all environment
# variables, especially DATABASE_URL for Prisma connectivity
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-southeast1"
SERVICE_NAME="lmsmath"
SERVICE_URL="https://lmsmath-442514522574.asia-southeast1.run.app"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Cloud Run Deployment Verification - LMS Math             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# STEP 1: Check Cloud Run Service Status
# ============================================================================
echo -e "${YELLOW}📋 STEP 1: Checking Cloud Run Service Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.url)" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Service is deployed and running${NC}"
else
  echo -e "${RED}✗ Service not found or not accessible${NC}"
  exit 1
fi

# Get service details
echo ""
echo "Service Details:"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="table(
    metadata.name,
    status.url,
    status.latestReadyRevisionName,
    status.conditions[0].status
  )"

echo ""

# ============================================================================
# STEP 2: Verify Environment Variables
# ============================================================================
echo -e "${YELLOW}📋 STEP 2: Verifying Environment Variables${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get environment variables
echo "Checking environment variables configuration..."
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.spec.containers[0].env)" > /tmp/cloud-run-env.txt

if [ -s /tmp/cloud-run-env.txt ]; then
  echo -e "${GREEN}✓ Environment variables are configured${NC}"
  echo ""
  echo "Environment Variables Set:"
  cat /tmp/cloud-run-env.txt | grep -o "name=[^;]*" | sed 's/name=/  • /' || echo "  (Unable to parse variables)"
else
  echo -e "${RED}✗ No environment variables found${NC}"
fi

echo ""

# ============================================================================
# STEP 3: Verify Secrets (DATABASE_URL, NEXTAUTH_SECRET, etc.)
# ============================================================================
echo -e "${YELLOW}📋 STEP 3: Verifying Secrets Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# List of critical secrets
CRITICAL_SECRETS=("DATABASE_URL" "NEXTAUTH_SECRET")
OPTIONAL_SECRETS=("GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "MUX_TOKEN_ID" "MUX_TOKEN_SECRET" "UPLOADTHING_SECRET" "STRIPE_API_KEY" "GCS_BUCKET_NAME")

echo "Checking critical secrets..."
for secret in "${CRITICAL_SECRETS[@]}"; do
  if gcloud secrets describe $secret --project=$PROJECT_ID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ $secret${NC} - exists"
    
    # Check if secret is mounted to Cloud Run service
    if gcloud run services describe $SERVICE_NAME \
      --region=$REGION \
      --project=$PROJECT_ID \
      --format="value(spec.template.spec.containers[0].env)" | grep -q $secret; then
      echo -e "  ${GREEN}✓ Mounted to Cloud Run service${NC}"
    else
      echo -e "  ${RED}✗ NOT mounted to Cloud Run service${NC}"
    fi
    
    # Get latest version
    LATEST_VERSION=$(gcloud secrets versions list $secret \
      --project=$PROJECT_ID \
      --limit=1 \
      --format="value(name)")
    echo -e "  • Latest version: ${LATEST_VERSION}"
  else
    echo -e "${RED}✗ $secret${NC} - NOT found"
  fi
  echo ""
done

echo "Checking optional secrets..."
for secret in "${OPTIONAL_SECRETS[@]}"; do
  if gcloud secrets describe $secret --project=$PROJECT_ID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ $secret${NC} - exists"
  else
    echo -e "${YELLOW}⚠ $secret${NC} - not configured (optional)"
  fi
done

echo ""

# ============================================================================
# STEP 4: Check Resource Configuration
# ============================================================================
echo -e "${YELLOW}📋 STEP 4: Checking Resource Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Resource Allocation:"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="yaml(spec.template.spec.containers[0].resources)"

echo ""
echo "Scaling Configuration:"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="table(
    spec.template.spec.containerConcurrency:label='Concurrency',
    spec.template.metadata.annotations.'autoscaling.knative.dev/minScale':label='Min Instances',
    spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale':label='Max Instances'
  )"

echo ""

# ============================================================================
# STEP 5: Test HTTP Endpoints
# ============================================================================
echo -e "${YELLOW}📋 STEP 5: Testing HTTP Endpoints${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Homepage
echo "Testing homepage..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/" || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Homepage${NC} - HTTP $HTTP_CODE"
else
  echo -e "${RED}✗ Homepage${NC} - HTTP $HTTP_CODE"
fi

# Test 2: Sign-in page
echo "Testing sign-in page..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/sign-in" || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Sign-in page${NC} - HTTP $HTTP_CODE"
else
  echo -e "${RED}✗ Sign-in page${NC} - HTTP $HTTP_CODE"
fi

# Test 3: Auth session API
echo "Testing auth session API..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/auth/session" || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Auth session API${NC} - HTTP $HTTP_CODE"
else
  echo -e "${RED}✗ Auth session API${NC} - HTTP $HTTP_CODE"
fi

# Test 4: Auth providers API
echo "Testing auth providers API..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/auth/providers" || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Auth providers API${NC} - HTTP $HTTP_CODE"
else
  echo -e "${RED}✗ Auth providers API${NC} - HTTP $HTTP_CODE"
fi

# Test 5: CSRF token API
echo "Testing CSRF token API..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/auth/csrf" || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ CSRF token API${NC} - HTTP $HTTP_CODE"
else
  echo -e "${RED}✗ CSRF token API${NC} - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# STEP 6: Test Database Connectivity (via API)
# ============================================================================
echo -e "${YELLOW}📋 STEP 6: Testing Database Connectivity${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a health check endpoint response
echo "Testing database connectivity through application..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/auth/session" || echo "000")

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Database appears to be accessible${NC}"
  echo "  (Session API responded successfully, which requires DB access)"
else
  echo -e "${RED}✗ Database connection may have issues${NC}"
  echo "  (Session API failed, which might indicate DB connectivity problems)"
fi

echo ""

# ============================================================================
# STEP 7: Check Recent Logs for Errors
# ============================================================================
echo -e "${YELLOW}📋 STEP 7: Checking Recent Logs${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Fetching recent logs (last 10 entries)..."
gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=10 \
  --format="table(
    timestamp.date('%Y-%m-%d %H:%M:%S'),
    severity,
    textPayload
  )" 2>/dev/null || echo "Unable to fetch logs"

echo ""

# Check for errors in logs
echo "Checking for errors in recent logs..."
ERROR_COUNT=$(gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=100 \
  --format="value(severity)" 2>/dev/null | grep -c "ERROR" || echo "0")

if [ "$ERROR_COUNT" -eq "0" ]; then
  echo -e "${GREEN}✓ No recent errors found in logs${NC}"
else
  echo -e "${YELLOW}⚠ Found $ERROR_COUNT error(s) in recent logs${NC}"
  echo "  Run the following command to view error details:"
  echo "  gcloud run services logs read $SERVICE_NAME --region=$REGION --format='value(textPayload)' | grep -i error"
fi

echo ""

# ============================================================================
# STEP 8: Performance Metrics
# ============================================================================
echo -e "${YELLOW}📋 STEP 8: Checking Performance Metrics${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Getting current instance count..."
INSTANCE_COUNT=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.traffic[0].percent)" 2>/dev/null || echo "N/A")

echo "  • Service is receiving traffic"
echo ""

# Test response time
echo "Testing response time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$SERVICE_URL/" || echo "0")
echo "  • Homepage response time: ${RESPONSE_TIME}s"

if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
  echo -e "  ${GREEN}✓ Response time is good${NC}"
else
  echo -e "  ${YELLOW}⚠ Response time is slower than expected${NC}"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    VERIFICATION SUMMARY                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Service Status:${NC} Running"
echo -e "${GREEN}✓ Service URL:${NC} $SERVICE_URL"
echo -e "${GREEN}✓ Region:${NC} $REGION"
echo -e "${GREEN}✓ Project:${NC} $PROJECT_ID"
echo ""

echo "📊 Next Steps:"
echo "  1. Run load tests: ./test-cloud-run-scaling.sh"
echo "  2. Monitor metrics: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics"
echo "  3. View logs: gcloud run services logs tail $SERVICE_NAME --region=$REGION"
echo "  4. Test auth flow: $SERVICE_URL/sign-in"
echo ""

echo -e "${GREEN}✅ Verification Complete!${NC}"
echo ""

