#!/bin/bash

echo "============================================"
echo "🚀 Starting ML Training Backend"
echo "============================================"
echo ""

# 1. Kill existing process
echo "1️⃣  Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 1
echo "   ✅ Port 8000 cleared"
echo ""

# 2. Check TensorFlow
echo "2️⃣  Checking dependencies..."
python3 -c "import tensorflow" 2>/dev/null && {
    echo "   ✅ TensorFlow installed"
} || {
    echo "   ⚠️  TensorFlow not found, installing..."
    pip3 install --quiet tensorflow keras datasets numpy matplotlib
    echo "   ✅ TensorFlow installed"
}
echo ""

# 3. Start backend
echo "3️⃣  Starting FastAPI backend..."
cd /Users/vietchung/lmsmath/python-simulations/ocr-simulation
python3 main.py > /tmp/ml_backend.log 2>&1 &
BACKEND_PID=$!
echo "   🔧 Backend PID: $BACKEND_PID"
echo ""

# 4. Wait for startup
echo "4️⃣  Waiting for backend to start..."
for i in {1..10}; do
    echo -n "   Loading... ($i/10) "
    sleep 1
    curl -s http://localhost:8000/ > /dev/null 2>&1 && {
        echo "✅"
        break
    }
    echo "⏳"
done
echo ""

# 5. Test API
echo "5️⃣  Testing ML Training API..."
curl -s http://localhost:8000/api/ml/datasets | python3 -m json.tool > /dev/null 2>&1 && {
    echo "   ✅ ML Training API responding"
    echo ""
    echo "============================================"
    echo "✅ Backend Started Successfully!"
    echo "============================================"
    echo ""
    echo "📍 Backend URL:  http://localhost:8000"
    echo "📍 API Docs:     http://localhost:8000/docs"
    echo "📍 Frontend:     http://localhost:3000/dashboard/labtwin/ml-training"
    echo ""
    echo "📊 Logs:         tail -f /tmp/ml_backend.log"
    echo "🛑 Stop:         kill $BACKEND_PID"
    echo ""
    echo "🎉 Ready to train ML models!"
    echo "============================================"
} || {
    echo "   ❌ API not responding"
    echo ""
    echo "============================================"
    echo "❌ Backend Failed to Start"
    echo "============================================"
    echo ""
    echo "📄 Check logs:"
    echo "   tail -f /tmp/ml_backend.log"
    echo ""
    echo "🔍 Common issues:"
    echo "   1. TensorFlow installation failed"
    echo "   2. Port 8000 still in use"
    echo "   3. Import errors in ml_training/"
    echo ""
}

