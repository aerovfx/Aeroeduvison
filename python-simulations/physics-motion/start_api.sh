#!/bin/bash

echo "🚀 Khởi động Chuyển động Vật lý API..."
cd "$(dirname "$0")"

if [ ! -f "output/data.json" ]; then
    echo "🔨 Building data..."
    python3 build.py
fi

echo ""
echo "✅ Starting API..."
echo "📡 http://localhost:8004/docs"
echo ""

python3 api.py



