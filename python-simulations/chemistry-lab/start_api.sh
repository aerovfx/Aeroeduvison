#!/bin/bash

# Khởi động FastAPI server cho Phòng thí nghiệm Hóa học

echo "🧪 Khởi động Phòng thí nghiệm Hóa học ảo API..."

# Di chuyển đến thư mục script
cd "$(dirname "$0")"

# Kiểm tra Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 không được cài đặt"
    exit 1
fi

# Build data nếu chưa có
if [ ! -f "output/data.json" ]; then
    echo "🔨 Building simulation data..."
    python3 build.py
fi

# Khởi động API server
echo ""
echo "✅ Khởi động API server..."
echo "📡 API docs: http://localhost:8003/docs"
echo "🌐 API endpoint: http://localhost:8003"
echo "🔍 Health check: http://localhost:8003/health"
echo ""
echo "Endpoints:"
echo "  POST /api/balance          - Cân bằng phương trình"
echo "  POST /api/calculate        - Tính toán mol"
echo "  POST /api/molecular-mass   - Khối lượng phân tử"
echo "  GET  /api/reactions        - Danh sách phản ứng"
echo "  POST /api/simulate         - Mô phỏng phản ứng"
echo "  GET  /api/elements         - Bảng nguyên tố"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python3 api.py




