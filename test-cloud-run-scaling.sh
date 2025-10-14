#!/bin/bash

# ============================================================================
# Cloud Run Auto-Scaling Test Script
# ============================================================================
# This script tests auto-scaling behavior by simulating traffic
# It uses Apache Bench (ab) and vegeta for load testing
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_URL="https://lmsmath-442514522574.asia-southeast1.run.app"
PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-southeast1"
SERVICE_NAME="lmsmath"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Cloud Run Auto-Scaling Test - LMS Math                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Check Prerequisites
# ============================================================================
echo -e "${YELLOW}📋 Checking Prerequisites${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for Apache Bench
if command -v ab &> /dev/null; then
  echo -e "${GREEN}✓ Apache Bench (ab) installed${NC}"
  AB_AVAILABLE=true
else
  echo -e "${YELLOW}⚠ Apache Bench (ab) not found${NC}"
  echo "  Install with: brew install httpd (macOS) or apt-get install apache2-utils (Linux)"
  AB_AVAILABLE=false
fi

# Check for curl
if command -v curl &> /dev/null; then
  echo -e "${GREEN}✓ curl installed${NC}"
else
  echo -e "${RED}✗ curl not found (required)${NC}"
  exit 1
fi

# Check for gcloud
if command -v gcloud &> /dev/null; then
  echo -e "${GREEN}✓ gcloud CLI installed${NC}"
else
  echo -e "${RED}✗ gcloud CLI not found (required)${NC}"
  exit 1
fi

echo ""

# ============================================================================
# Get Current Service Configuration
# ============================================================================
echo -e "${YELLOW}📋 Current Service Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get min/max instances
MIN_INSTANCES=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.metadata.annotations.'autoscaling.knative.dev/minScale')" 2>/dev/null || echo "0")

MAX_INSTANCES=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale')" 2>/dev/null || echo "100")

CONCURRENCY=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.spec.containerConcurrency)" 2>/dev/null || echo "80")

echo "  • Min Instances: $MIN_INSTANCES"
echo "  • Max Instances: $MAX_INSTANCES"
echo "  • Max Concurrency per Instance: $CONCURRENCY"
echo ""

# ============================================================================
# Test 1: Baseline Performance (Single Request)
# ============================================================================
echo -e "${YELLOW}📋 TEST 1: Baseline Performance${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Testing single request performance..."
echo ""

# Test homepage
echo "Homepage (/):"
RESPONSE_TIME=$(curl -s -o /dev/null -w "  Time: %{time_total}s | HTTP Code: %{http_code} | Size: %{size_download} bytes\n" "$SERVICE_URL/")
echo "$RESPONSE_TIME"

# Test sign-in page
echo "Sign-in page (/sign-in):"
RESPONSE_TIME=$(curl -s -o /dev/null -w "  Time: %{time_total}s | HTTP Code: %{http_code} | Size: %{size_download} bytes\n" "$SERVICE_URL/sign-in")
echo "$RESPONSE_TIME"

# Test API endpoint
echo "Auth session API (/api/auth/session):"
RESPONSE_TIME=$(curl -s -o /dev/null -w "  Time: %{time_total}s | HTTP Code: %{http_code} | Size: %{size_download} bytes\n" "$SERVICE_URL/api/auth/session")
echo "$RESPONSE_TIME"

echo ""

# ============================================================================
# Test 2: Light Load (10 concurrent users)
# ============================================================================
if [ "$AB_AVAILABLE" = true ]; then
  echo -e "${YELLOW}📋 TEST 2: Light Load (10 concurrent users, 100 requests)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  echo "Starting light load test..."
  echo ""
  
  ab -n 100 -c 10 -q "$SERVICE_URL/" > /tmp/ab-light-load.txt 2>&1
  
  echo "Results:"
  grep -A 2 "Requests per second:" /tmp/ab-light-load.txt || echo "No results"
  grep "Time per request:" /tmp/ab-light-load.txt | head -1 || echo "No timing data"
  grep "Transfer rate:" /tmp/ab-light-load.txt || echo "No transfer data"
  
  echo ""
  echo "Checking instance count after light load..."
  sleep 5
  
  # Note: Instance count is harder to get directly, but we can check logs
  echo "  (Check Cloud Console for real-time instance count)"
  echo ""
fi

# ============================================================================
# Test 3: Medium Load (50 concurrent users)
# ============================================================================
if [ "$AB_AVAILABLE" = true ]; then
  echo -e "${YELLOW}📋 TEST 3: Medium Load (50 concurrent users, 500 requests)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  echo "Starting medium load test..."
  echo "This should trigger auto-scaling to 2-3 instances..."
  echo ""
  
  ab -n 500 -c 50 -q "$SERVICE_URL/" > /tmp/ab-medium-load.txt 2>&1
  
  echo "Results:"
  grep -A 2 "Requests per second:" /tmp/ab-medium-load.txt || echo "No results"
  grep "Time per request:" /tmp/ab-medium-load.txt | head -1 || echo "No timing data"
  grep "Transfer rate:" /tmp/ab-medium-load.txt || echo "No transfer data"
  grep "Failed requests:" /tmp/ab-medium-load.txt || echo "No failure data"
  
  echo ""
  echo "Waiting for instances to scale up..."
  sleep 10
  echo ""
fi

# ============================================================================
# Test 4: Heavy Load (100 concurrent users)
# ============================================================================
if [ "$AB_AVAILABLE" = true ]; then
  echo -e "${YELLOW}📋 TEST 4: Heavy Load (100 concurrent users, 1000 requests)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  echo "Starting heavy load test..."
  echo "This should trigger auto-scaling to 5-8 instances..."
  echo ""
  
  ab -n 1000 -c 100 -q "$SERVICE_URL/" > /tmp/ab-heavy-load.txt 2>&1
  
  echo "Results:"
  grep -A 2 "Requests per second:" /tmp/ab-heavy-load.txt || echo "No results"
  grep "Time per request:" /tmp/ab-heavy-load.txt | head -1 || echo "No timing data"
  grep "Transfer rate:" /tmp/ab-heavy-load.txt || echo "No transfer data"
  grep "Failed requests:" /tmp/ab-heavy-load.txt || echo "No failure data"
  
  # Check for 95th percentile
  echo ""
  echo "Response Time Percentiles:"
  grep "95%" /tmp/ab-heavy-load.txt || echo "No percentile data"
  grep "99%" /tmp/ab-heavy-load.txt || echo "No percentile data"
  
  echo ""
  echo "Waiting for instances to scale up..."
  sleep 15
  echo ""
fi

# ============================================================================
# Test 5: Sustained Load (Test scaling behavior over time)
# ============================================================================
if [ "$AB_AVAILABLE" = true ]; then
  echo -e "${YELLOW}📋 TEST 5: Sustained Load (2 minutes, 50 concurrent users)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  echo "Starting sustained load test..."
  echo "This tests how the service maintains performance under continuous load..."
  echo ""
  
  # Run for 2 minutes with 50 concurrent connections
  ab -t 120 -c 50 -q "$SERVICE_URL/" > /tmp/ab-sustained-load.txt 2>&1
  
  echo "Results:"
  grep -A 2 "Requests per second:" /tmp/ab-sustained-load.txt || echo "No results"
  grep "Time per request:" /tmp/ab-sustained-load.txt | head -1 || echo "No timing data"
  grep "Failed requests:" /tmp/ab-sustained-load.txt || echo "No failure data"
  
  echo ""
fi

# ============================================================================
# Test 6: Spike Test (Sudden traffic spike)
# ============================================================================
if [ "$AB_AVAILABLE" = true ]; then
  echo -e "${YELLOW}📋 TEST 6: Spike Test (200 concurrent users, 2000 requests)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  echo "Starting spike test..."
  echo "This tests how quickly the service can scale up..."
  echo ""
  
  ab -n 2000 -c 200 -q "$SERVICE_URL/" > /tmp/ab-spike-load.txt 2>&1
  
  echo "Results:"
  grep -A 2 "Requests per second:" /tmp/ab-spike-load.txt || echo "No results"
  grep "Time per request:" /tmp/ab-spike-load.txt | head -1 || echo "No timing data"
  grep "Failed requests:" /tmp/ab-spike-load.txt || echo "No failure data"
  
  # Check error rate
  FAILED=$(grep "Failed requests:" /tmp/ab-spike-load.txt | awk '{print $3}' || echo "0")
  if [ "$FAILED" -eq "0" ]; then
    echo -e "${GREEN}✓ No failed requests during spike${NC}"
  else
    echo -e "${YELLOW}⚠ $FAILED failed requests during spike${NC}"
  fi
  
  echo ""
fi

# ============================================================================
# Test 7: Scale Down Test
# ============================================================================
echo -e "${YELLOW}📋 TEST 7: Scale Down Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Waiting for instances to scale down (60 seconds)..."
echo "  (No traffic being sent...)"

for i in {60..1}; do
  printf "\r  Time remaining: %02d seconds" $i
  sleep 1
done

echo ""
echo ""
echo "After idle period, instances should scale down to minimum ($MIN_INSTANCES)"
echo "  (Check Cloud Console to verify instance count)"
echo ""

# ============================================================================
# Test 8: Different Endpoints Load
# ============================================================================
if [ "$AB_AVAILABLE" = true ]; then
  echo -e "${YELLOW}📋 TEST 8: Multiple Endpoints Test${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  echo "Testing different endpoints simultaneously..."
  echo ""
  
  # Test multiple endpoints in parallel
  echo "1. Homepage..."
  ab -n 100 -c 20 -q "$SERVICE_URL/" > /tmp/ab-endpoint-home.txt 2>&1 &
  
  echo "2. Sign-in page..."
  ab -n 100 -c 20 -q "$SERVICE_URL/sign-in" > /tmp/ab-endpoint-signin.txt 2>&1 &
  
  echo "3. API endpoint..."
  ab -n 100 -c 20 -q "$SERVICE_URL/api/auth/session" > /tmp/ab-endpoint-api.txt 2>&1 &
  
  # Wait for all tests to complete
  wait
  
  echo ""
  echo "Results summary:"
  echo "  Homepage:"
  grep "Requests per second:" /tmp/ab-endpoint-home.txt | awk '{print "    RPS:", $4}' || echo "    No data"
  
  echo "  Sign-in:"
  grep "Requests per second:" /tmp/ab-endpoint-signin.txt | awk '{print "    RPS:", $4}' || echo "    No data"
  
  echo "  API:"
  grep "Requests per second:" /tmp/ab-endpoint-api.txt | awk '{print "    RPS:", $4}' || echo "    No data"
  
  echo ""
fi

# ============================================================================
# Performance Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    LOAD TEST SUMMARY                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$AB_AVAILABLE" = true ]; then
  echo "Test Results:"
  echo ""
  
  # Summary from heavy load test (most comprehensive)
  if [ -f /tmp/ab-heavy-load.txt ]; then
    echo "Heavy Load Test (100 concurrent users):"
    grep "Requests per second:" /tmp/ab-heavy-load.txt | awk '{print "  • Throughput:", $4, "req/sec"}' || echo "  No data"
    grep "Time per request:" /tmp/ab-heavy-load.txt | head -1 | awk '{print "  • Avg Response Time:", $4, "ms"}' || echo "  No data"
    grep "Failed requests:" /tmp/ab-heavy-load.txt | awk '{print "  • Failed Requests:", $3}' || echo "  No data"
  fi
  
  echo ""
  echo "Auto-Scaling Behavior:"
  echo "  • Min Instances: $MIN_INSTANCES"
  echo "  • Max Instances: $MAX_INSTANCES"
  echo "  • Concurrency: $CONCURRENCY requests per instance"
  echo ""
  echo "  Expected Scaling:"
  echo "    - Light load (10 concurrent):    $MIN_INSTANCES-1 instances"
  echo "    - Medium load (50 concurrent):   2-3 instances"
  echo "    - Heavy load (100 concurrent):   5-8 instances"
  echo "    - Spike load (200 concurrent):   8-10 instances"
  echo ""
else
  echo -e "${YELLOW}⚠ Load tests skipped (Apache Bench not installed)${NC}"
  echo ""
  echo "To install Apache Bench:"
  echo "  macOS:  brew install httpd"
  echo "  Linux:  sudo apt-get install apache2-utils"
  echo ""
fi

# ============================================================================
# Recommendations
# ============================================================================
echo "📊 View Real-Time Metrics:"
echo "  Cloud Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
echo ""
echo "  Or use CLI:"
echo "  gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.traffic)'"
echo ""

echo "📋 Additional Monitoring Commands:"
echo "  1. View logs:        gcloud run services logs tail $SERVICE_NAME --region=$REGION"
echo "  2. Watch instances:  watch -n 5 'gcloud run services describe $SERVICE_NAME --region=$REGION --format=\"value(status.traffic)\"'"
echo "  3. Get metrics:      gcloud monitoring time-series list --filter='resource.type=\"cloud_run_revision\"'"
echo ""

echo -e "${GREEN}✅ Load Testing Complete!${NC}"
echo ""
echo "Key Observations to Check:"
echo "  1. Did instances scale up during high load?"
echo "  2. Did instances scale down after idle period?"
echo "  3. Were there any failed requests?"
echo "  4. What was the response time during peak load?"
echo "  5. How long did cold starts take (if any)?"
echo ""

