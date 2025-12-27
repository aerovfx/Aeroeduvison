#!/bin/bash

# =============================================================================
# View Cloud Run Logs
# =============================================================================

SERVICE_NAME="lmsmath-app"
REGION="asia-east1"

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "Select log viewing option:"
echo "1) Recent logs (last 50 entries)"
echo "2) Tail logs (live streaming)"
echo "3) Error logs only"
echo "4) Last hour logs"
echo ""
read -p "Enter choice (1-4): " CHOICE

case $CHOICE in
  1)
    print_info "Fetching recent logs..."
    gcloud run logs read "$SERVICE_NAME" \
      --region "$REGION" \
      --limit 50
    ;;
  2)
    print_info "Streaming logs (Ctrl+C to stop)..."
    gcloud run logs tail "$SERVICE_NAME" \
      --region "$REGION"
    ;;
  3)
    print_info "Fetching error logs..."
    gcloud run logs read "$SERVICE_NAME" \
      --region "$REGION" \
      --limit 100 \
      --log-filter='severity>=ERROR'
    ;;
  4)
    print_info "Fetching logs from last hour..."
    gcloud run logs read "$SERVICE_NAME" \
      --region "$REGION" \
      --limit 200 \
      --log-filter="timestamp>=\"$(date -u -v-1H '+%Y-%m-%dT%H:%M:%S')Z\""
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac