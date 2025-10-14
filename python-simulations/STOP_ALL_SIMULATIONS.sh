#!/bin/bash

# Script dừng tất cả simulations

echo "🛑 Dừng tất cả simulations..."

# Kill all uvicorn processes running api:app
pkill -f "uvicorn.*api:app" 2>/dev/null

# Wait a bit
sleep 1

# Check if any still running
if pgrep -f "uvicorn.*api:app" > /dev/null; then
    echo "⚠️  Some processes still running, force killing..."
    pkill -9 -f "uvicorn.*api:app"
fi

echo "✅ All simulations stopped!"
echo ""
echo "Ports freed: 8002-8007"



