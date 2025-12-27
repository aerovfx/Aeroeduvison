#!/bin/bash

echo "🚀 Khởi động Khúc xạ ánh sáng API..."
echo "✨ Tính năng: Định luật Snell, Phản xạ toàn phần"
cd "$(dirname "$0")"

if [ ! -f "output/data.json" ]; then
    echo "🔨 Building data..."
    python3 build.py
fi

echo ""
echo "✅ Starting API on port 8017..."
echo "📡 Swagger docs: http://localhost:8017/docs"
echo "🌐 API: http://localhost:8017"
echo ""

python3 api.py

