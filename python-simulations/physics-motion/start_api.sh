#!/bin/bash

echo "🚀 Khởi động Chuyển động Vật lý API v2.0..."
echo "✨ 7 loại chuyển động"
cd "$(dirname "$0")"

if [ ! -f "output/data.json" ]; then
    echo "🔨 Building data..."
    python3 build.py
fi

echo ""
echo "✅ Starting API on port 8007..."
echo "📡 Swagger docs: http://localhost:8007/docs"
echo "🌐 API: http://localhost:8007"
echo ""

python3 api.py




