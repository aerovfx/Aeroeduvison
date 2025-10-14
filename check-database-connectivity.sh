#!/bin/bash

# ============================================================================
# Database Connectivity Test for Cloud Run Deployment
# ============================================================================
# This script verifies that the Prisma DATABASE_URL is correctly configured
# and that the application can connect to the database from Cloud Run
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
echo -e "${BLUE}║        Database Connectivity Test - Cloud Run                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# STEP 1: Check DATABASE_URL Secret
# ============================================================================
echo -e "${YELLOW}📋 STEP 1: Checking DATABASE_URL Secret${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud secrets describe DATABASE_URL --project=$PROJECT_ID > /dev/null 2>&1; then
  echo -e "${GREEN}✓ DATABASE_URL secret exists${NC}"
  
  # Get latest version info
  LATEST_VERSION=$(gcloud secrets versions list DATABASE_URL \
    --project=$PROJECT_ID \
    --limit=1 \
    --format="value(name)")
  
  CREATE_TIME=$(gcloud secrets versions list DATABASE_URL \
    --project=$PROJECT_ID \
    --limit=1 \
    --format="value(createTime)")
  
  echo "  • Latest version: $LATEST_VERSION"
  echo "  • Last updated: $CREATE_TIME"
else
  echo -e "${RED}✗ DATABASE_URL secret not found${NC}"
  echo ""
  echo "To create the secret, run:"
  echo "  echo -n 'your-database-url' | gcloud secrets create DATABASE_URL --data-file=- --project=$PROJECT_ID"
  exit 1
fi

echo ""

# ============================================================================
# STEP 2: Verify Secret is Mounted to Cloud Run
# ============================================================================
echo -e "${YELLOW}📋 STEP 2: Verifying Secret Mount to Cloud Run${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.spec.containers[0].env)" | grep -q "DATABASE_URL"; then
  echo -e "${GREEN}✓ DATABASE_URL is mounted to Cloud Run service${NC}"
else
  echo -e "${RED}✗ DATABASE_URL is NOT mounted to Cloud Run service${NC}"
  echo ""
  echo "To mount the secret, run:"
  echo "  gcloud run services update $SERVICE_NAME \\"
  echo "    --region=$REGION \\"
  echo "    --project=$PROJECT_ID \\"
  echo "    --set-secrets=DATABASE_URL=DATABASE_URL:latest"
  exit 1
fi

echo ""

# ============================================================================
# STEP 3: Test Database Connection via Application
# ============================================================================
echo -e "${YELLOW}📋 STEP 3: Testing Database Connection via Application${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Testing Auth Session API (requires database access)..."
HTTP_CODE=$(curl -s -o /tmp/session-response.json -w "%{http_code}" "$SERVICE_URL/api/auth/session")

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Auth Session API responded successfully${NC}"
  echo "  HTTP Status: $HTTP_CODE"
  echo "  Response:"
  cat /tmp/session-response.json | jq '.' 2>/dev/null || cat /tmp/session-response.json
else
  echo -e "${RED}✗ Auth Session API failed${NC}"
  echo "  HTTP Status: $HTTP_CODE"
fi

echo ""

# Test Auth Providers (also requires database)
echo "Testing Auth Providers API..."
HTTP_CODE=$(curl -s -o /tmp/providers-response.json -w "%{http_code}" "$SERVICE_URL/api/auth/providers")

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Auth Providers API responded successfully${NC}"
  echo "  HTTP Status: $HTTP_CODE"
else
  echo -e "${RED}✗ Auth Providers API failed${NC}"
  echo "  HTTP Status: $HTTP_CODE"
fi

echo ""

# ============================================================================
# STEP 4: Check for Database Errors in Logs
# ============================================================================
echo -e "${YELLOW}📋 STEP 4: Checking Logs for Database Errors${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Searching for database-related errors in recent logs..."

# Check for Prisma errors
PRISMA_ERRORS=$(gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=100 \
  --format="value(textPayload)" 2>/dev/null | grep -i "prisma" | grep -i "error" | wc -l || echo "0")

# Check for connection errors
CONNECTION_ERRORS=$(gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=100 \
  --format="value(textPayload)" 2>/dev/null | grep -i "connection" | grep -i "error" | wc -l || echo "0")

# Check for database errors
DB_ERRORS=$(gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=100 \
  --format="value(textPayload)" 2>/dev/null | grep -i "database" | grep -i "error" | wc -l || echo "0")

if [ "$PRISMA_ERRORS" -eq "0" ] && [ "$CONNECTION_ERRORS" -eq "0" ] && [ "$DB_ERRORS" -eq "0" ]; then
  echo -e "${GREEN}✓ No database errors found in recent logs${NC}"
else
  echo -e "${YELLOW}⚠ Found database-related errors in logs:${NC}"
  echo "  • Prisma errors: $PRISMA_ERRORS"
  echo "  • Connection errors: $CONNECTION_ERRORS"
  echo "  • Database errors: $DB_ERRORS"
  echo ""
  echo "To view error details:"
  echo "  gcloud run services logs read $SERVICE_NAME --region=$REGION | grep -i 'error' | grep -i 'database\\|prisma\\|connection'"
fi

echo ""

# ============================================================================
# STEP 5: Test Database Connection String Format
# ============================================================================
echo -e "${YELLOW}📋 STEP 5: Analyzing Database Connection${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to get a sample of the DATABASE_URL (without revealing the full string)
echo "Checking DATABASE_URL format..."

# Access the secret (this requires proper permissions)
DB_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -n "$DB_URL" ]; then
  # Extract protocol (without showing sensitive data)
  if [[ $DB_URL == postgresql://* ]]; then
    echo -e "${GREEN}✓ Database URL format: PostgreSQL${NC}"
    echo "  Protocol: postgresql://"
  elif [[ $DB_URL == mysql://* ]]; then
    echo -e "${GREEN}✓ Database URL format: MySQL${NC}"
    echo "  Protocol: mysql://"
  elif [[ $DB_URL == file:* ]]; then
    echo -e "${YELLOW}⚠ Database URL format: SQLite (file-based)${NC}"
    echo "  Protocol: file:"
    echo -e "${YELLOW}  WARNING: SQLite is not recommended for Cloud Run (ephemeral storage)${NC}"
  else
    echo -e "${YELLOW}⚠ Database URL format: Unknown${NC}"
  fi
  
  # Check for SSL mode
  if [[ $DB_URL == *"sslmode=require"* ]]; then
    echo -e "${GREEN}✓ SSL mode: Required (secure)${NC}"
  elif [[ $DB_URL == *"sslmode=disable"* ]]; then
    echo -e "${YELLOW}⚠ SSL mode: Disabled (not recommended for production)${NC}"
  fi
  
  # Check for connection pooling params
  if [[ $DB_URL == *"connection_limit"* ]] || [[ $DB_URL == *"pool_timeout"* ]]; then
    echo -e "${GREEN}✓ Connection pooling parameters detected${NC}"
  else
    echo -e "${YELLOW}⚠ No connection pooling parameters detected${NC}"
    echo "  Consider adding: ?connection_limit=10&pool_timeout=20"
  fi
else
  echo -e "${RED}✗ Unable to access DATABASE_URL secret${NC}"
  echo "  (May require additional permissions)"
fi

echo ""

# ============================================================================
# STEP 6: Test Prisma Client Generation
# ============================================================================
echo -e "${YELLOW}📋 STEP 6: Checking Prisma Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Checking if Prisma Client is properly generated in deployment..."

# Check logs for Prisma generation
PRISMA_GENERATE=$(gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=200 \
  --format="value(textPayload)" 2>/dev/null | grep -i "prisma.*generated" | wc -l || echo "0")

if [ "$PRISMA_GENERATE" -gt "0" ]; then
  echo -e "${GREEN}✓ Prisma Client generation detected in logs${NC}"
else
  echo -e "${YELLOW}⚠ No Prisma Client generation messages found${NC}"
  echo "  This is normal if the container already has Prisma Client built-in"
fi

# Check logs for Prisma schema issues
SCHEMA_ERRORS=$(gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=100 \
  --format="value(textPayload)" 2>/dev/null | grep -i "schema" | grep -i "error" | wc -l || echo "0")

if [ "$SCHEMA_ERRORS" -eq "0" ]; then
  echo -e "${GREEN}✓ No Prisma schema errors${NC}"
else
  echo -e "${RED}✗ Found $SCHEMA_ERRORS Prisma schema errors${NC}"
fi

echo ""

# ============================================================================
# STEP 7: Database Provider Check
# ============================================================================
echo -e "${YELLOW}📋 STEP 7: Checking Prisma Schema Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "prisma/schema.prisma" ]; then
  PROVIDER=$(grep "provider" prisma/schema.prisma | grep -v "generator" | awk '{print $3}' | tr -d '"')
  echo "  • Prisma provider: $PROVIDER"
  
  if [ "$PROVIDER" == "postgresql" ]; then
    echo -e "${GREEN}✓ Using PostgreSQL (recommended for Cloud Run)${NC}"
  elif [ "$PROVIDER" == "mysql" ]; then
    echo -e "${GREEN}✓ Using MySQL${NC}"
  elif [ "$PROVIDER" == "sqlite" ]; then
    echo -e "${YELLOW}⚠ Using SQLite (not recommended for Cloud Run)${NC}"
    echo "  SQLite uses file storage which is ephemeral in Cloud Run"
    echo "  Consider migrating to PostgreSQL (Cloud SQL)"
  fi
else
  echo -e "${YELLOW}⚠ Prisma schema file not found locally${NC}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                DATABASE CONNECTIVITY SUMMARY                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Overall health check
OVERALL_HEALTH="GOOD"

if [ "$HTTP_CODE" != "200" ]; then
  OVERALL_HEALTH="POOR"
fi

if [ "$PRISMA_ERRORS" -gt "0" ] || [ "$CONNECTION_ERRORS" -gt "0" ] || [ "$DB_ERRORS" -gt "0" ]; then
  OVERALL_HEALTH="WARNING"
fi

if [ "$OVERALL_HEALTH" == "GOOD" ]; then
  echo -e "${GREEN}✅ Database connectivity: HEALTHY${NC}"
  echo ""
  echo "All checks passed successfully!"
elif [ "$OVERALL_HEALTH" == "WARNING" ]; then
  echo -e "${YELLOW}⚠️  Database connectivity: WARNING${NC}"
  echo ""
  echo "Some issues detected. Review the logs above."
else
  echo -e "${RED}❌ Database connectivity: FAILED${NC}"
  echo ""
  echo "Critical issues detected. Database may not be accessible."
fi

echo ""
echo "📋 Recommendations:"
echo "  1. Ensure DATABASE_URL is correctly formatted"
echo "  2. Use PostgreSQL (Cloud SQL) for production"
echo "  3. Enable SSL mode (sslmode=require)"
echo "  4. Configure connection pooling"
echo "  5. Monitor database connections in Cloud Console"
echo ""

echo "🔍 Additional Debugging:"
echo "  • View full logs: gcloud run services logs tail $SERVICE_NAME --region=$REGION"
echo "  • Test locally: npx prisma studio (with local DATABASE_URL)"
echo "  • Check Cloud SQL: https://console.cloud.google.com/sql"
echo ""

echo -e "${GREEN}✅ Database connectivity check complete!${NC}"
echo ""

