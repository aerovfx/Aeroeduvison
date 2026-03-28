#!/bin/bash
# =============================================================================
# KHỞI ĐỘNG OMR SERVICE
# =============================================================================
# Sử dụng:
#   ./start_omr.sh          # Chạy server trên port 8002
#   ./start_omr.sh test     # Chạy test pipeline
#   ./start_omr.sh dev      # Chạy với auto-reload
# =============================================================================

cd "$(dirname "$0")"

# Cài đặt dependencies nếu chưa có
if ! python3 -c "import cv2" 2>/dev/null; then
    echo "📦 Cài đặt dependencies..."
    pip install -r requirements.txt --break-system-packages -q
fi

case "$1" in
    test)
        echo "🧪 Chạy test pipeline..."
        python3 test_omr.py "${@:2}"
        ;;
    dev)
        echo "🔄 Khởi động OMR server (dev mode - auto reload)..."
        python3 -m uvicorn omr_server:app --host 0.0.0.0 --port 8002 --reload
        ;;
    *)
        echo "🚀 Khởi động OMR server trên port 8002..."
        python3 -m uvicorn omr_server:app --host 0.0.0.0 --port 8002 --workers 2
        ;;
esac
