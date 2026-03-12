#!/bin/bash
# Cleanup Script: Remove Test/Debug Endpoints
# This script removes all test, debug, and check endpoints from the codebase
# 
# Usage: ./scripts/cleanup-test-debug-endpoints.sh
# Dry run: ./scripts/cleanup-test-debug-endpoints.sh --dry-run

set -e

DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE - No files will be deleted"
    echo ""
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
DELETED_COUNT=0
SKIPPED_COUNT=0

echo "🧹 Starting cleanup of test/debug endpoints..."
echo ""

# Define endpoints to remove
ENDPOINTS=(
    # Test endpoints
    "app/api/test/route.ts"
    "app/api/test-auth/route.ts"
    "app/api/test-auth-cleanup/route.ts"
    "app/api/test-auth-edge-cases/route.ts"
    "app/api/test-auth-redirects/route.ts"
    "app/api/test-auth-session/route.ts"
    "app/api/test-cookies/route.ts"
    "app/api/test-credentials/route.ts"
    "app/api/test-db/route.ts"
    "app/api/test-role-access/route.ts"
    "app/api/test-session/route.ts"
    "app/api/test-user/route.ts"
    
    # Debug endpoints
    "app/api/debug-auth/route.ts"
    "app/api/debug-db/route.ts"
    "app/api/debug-nextauth/route.ts"
    "app/api/debug-session/route.ts"
    
    # Check endpoints (redundant)
    "app/api/check-env/route.ts"
    "app/api/checkenv/route.ts"
)

# Endpoints to skip (legitimate use cases)
SKIP_ENDPOINTS=(
    "app/api/courses/[courseId]/checkout/route.ts"  # This is a legitimate checkout endpoint
    "app/api/stem/test/route.ts"  # Keep for now - STEM test endpoint
)

echo "📋 Endpoints to remove: ${#ENDPOINTS[@]}"
echo "⏭️  Endpoints to skip: ${#SKIP_ENDPOINTS[@]}"
echo ""

# Remove endpoints
for endpoint in "${ENDPOINTS[@]}"; do
    file_path="$endpoint"
    
    # Check if should skip
    skip=false
    for skip_endpoint in "${SKIP_ENDPOINTS[@]}"; do
        if [ "$endpoint" == "$skip_endpoint" ]; then
            skip=true
            break
        fi
    done
    
    if [ "$skip" = true ]; then
        echo -e "${YELLOW}⏭️  SKIP:${NC} $endpoint"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    if [ -f "$file_path" ]; then
        if [ "$DRY_RUN" = true ]; then
            echo -e "${YELLOW}🗑️  WOULD DELETE:${NC} $file_path"
        else
            rm -f "$file_path"
            echo -e "${GREEN}✅ DELETED:${NC} $file_path"
        fi
        ((DELETED_COUNT++))
    else
        echo -e "${RED}❌ NOT FOUND:${NC} $file_path"
    fi
done

echo ""
echo "==================================="
if [ "$DRY_RUN" = true ]; then
    echo "📊 DRY RUN SUMMARY"
    echo "Would delete: $DELETED_COUNT files"
    echo "Would skip: $SKIPPED_COUNT files"
    echo ""
    echo "To actually delete files, run without --dry-run:"
    echo "  ./scripts/cleanup-test-debug-endpoints.sh"
else
    echo "✅ CLEANUP COMPLETE"
    echo "Deleted: $DELETED_COUNT files"
    echo "Skipped: $SKIPPED_COUNT files"
fi
echo "==================================="
