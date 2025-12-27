#!/bin/bash

# STOP ALL LABS - Dừng tất cả Python simulation backends
# Author: AI Assistant
# Date: 2024-10-12

echo "🛑 STOPPING ALL LABS"
echo "===================="
echo ""

# Kill all Python processes running on simulation ports
echo "🔍 Finding and stopping simulation backends..."

stopped_count=0
total_ports=20

for port in 8000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 8011 8012 8013 8014 8015 8016 8017 8018 8019; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "🛑 Stopping process on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null
        ((stopped_count++))
    else
        echo "✅ Port $port: Already stopped"
    fi
done

echo ""
echo "🧹 Cleaning up log files..."
rm -f /tmp/*.log 2>/dev/null || true

echo ""
echo "📊 SUMMARY:"
echo "   Stopped: $stopped_count processes"
echo "   Total ports: $total_ports"
echo ""

if [ $stopped_count -gt 0 ]; then
    echo "✅ Successfully stopped $stopped_count backends"
else
    echo "ℹ️  No backends were running"
fi

echo ""
echo "🛑 All labs stopped!"
echo ""
echo "🚀 To restart all labs:"
echo "   ./START_ALL_LABS.sh"
