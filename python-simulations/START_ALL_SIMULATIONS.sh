#!/bin/bash

# Script khởi động tất cả 6 simulations mới
# Ports: 8002-8007

echo "🚀 KHỞI ĐỘNG TẤT CẢ 6 PHÒNG THÍ NGHIỆM ẢO"
echo "=========================================="
echo ""

# Base directory
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Function to start a simulation
start_simulation() {
    local name=$1
    local dir=$2
    local port=$3
    
    echo "🔧 Starting $name (Port $port)..."
    cd "$BASE_DIR/$dir"
    
    if [ -f "start_api.sh" ]; then
        bash start_api.sh > /tmp/${dir}.log 2>&1 &
        echo "   ✅ Started (PID: $!)"
        echo "   📡 http://localhost:$port/docs"
    else
        echo "   ⚠️  start_api.sh not found"
    fi
    
    echo ""
}

# Start all simulations
start_simulation "Optics Lab" "optics-lab" 8002
sleep 2

start_simulation "Chemistry Lab" "chemistry-lab" 8003
sleep 2

start_simulation "Physics Motion" "physics-motion" 8004
sleep 2

start_simulation "BioGrowth" "biogrowth" 8005
sleep 2

start_simulation "ThermoFlow" "thermoflow" 8006
sleep 2

start_simulation "MechaForce" "mechaforce" 8007
sleep 2

echo "=========================================="
echo "✅ ALL 6 SIMULATIONS STARTED!"
echo ""
echo "📡 API Documentation:"
echo "   🔬 Optics:    http://localhost:8002/docs"
echo "   🧪 Chemistry: http://localhost:8003/docs"
echo "   🚀 Physics:   http://localhost:8004/docs"
echo "   🧬 Biology:   http://localhost:8005/docs"
echo "   🌡️  Thermo:    http://localhost:8006/docs"
echo "   ⚙️  Mecha:     http://localhost:8007/docs"
echo ""
echo "📝 Logs: /tmp/*.log"
echo ""
echo "To stop all: pkill -f 'uvicorn.*api:app'"
echo "=========================================="



