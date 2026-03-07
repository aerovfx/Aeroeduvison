#!/bin/bash

# Khởi động FastAPI server cho Phòng thí nghiệm Quang học

echo "🔬 Khởi động Phòng thí nghiệm Quang học ảo API..."

# Di chuyển đến thư mục script
cd "$(dirname "$0")"

# Kiểm tra Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 không được cài đặt"
    exit 1
fi

# Kiểm tra và cài đặt dependencies
echo "📦 Kiểm tra dependencies..."
pip3 install -q fastapi uvicorn numpy pydantic 2>/dev/null || {
    echo "⚠️  Cài đặt dependencies..."
    pip3 install fastapi uvicorn numpy pydantic
}

# Build data nếu chưa có
if [ ! -f "output/data.json" ]; then
    echo "🔨 Building simulation data..."
    python3 build.py
fi

# Khởi động API server
echo ""
echo "✅ Khởi động API server..."
echo "📡 API docs: http://localhost:8002/docs"
echo "🌐 API endpoint: http://localhost:8002"
echo "🔍 Health check: http://localhost:8002/health"
echo ""
echo "Endpoints:"
echo "  POST /api/refraction   - Khúc xạ ánh sáng"
echo "  POST /api/reflection   - Phản xạ ánh sáng"
echo "  POST /api/prism        - Tán sắc qua lăng kính"
echo "  POST /api/lens         - Thấu kính"
echo "  GET  /api/materials    - Danh sách môi trường"
echo "  GET  /api/spectrum     - Phổ bước sóng"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python3 api.py


