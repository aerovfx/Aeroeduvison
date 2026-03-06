#!/bin/bash

# START ALL LABS - Khởi động tất cả Python simulation backends
# Author: AI Assistant
# Date: 2024-10-12

echo "🚀 STARTING ALL LABS FOR LABTWIN"
echo "=================================="
echo ""

# Kill any existing processes on these ports
echo "🧹 Cleaning up existing processes..."
for port in 8000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 8011 8012 8013 8014 8015 8016 8017 8018 8019; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done
sleep 2

echo "✅ Cleanup complete"
echo ""

# Function to start a lab
start_lab() {
    local lab_name=$1
    local lab_dir=$2
    local port=$3
    local log_file="/tmp/${lab_name}.log"
    
    echo "🔬 Starting $lab_name (Port $port)..."
    
    if [ -d "$lab_dir" ]; then
        cd "$lab_dir"
        
        # Check if main.py exists
        if [ -f "main.py" ]; then
            # Start the backend
            python3 main.py > "$log_file" 2>&1 &
            local pid=$!
            echo "   ✅ Started $lab_name (PID: $pid, Port: $port)"
            echo "   📝 Log: $log_file"
        else
            echo "   ⚠️  No main.py found in $lab_dir"
        fi
        
        cd - > /dev/null
    else
        echo "   ❌ Directory not found: $lab_dir"
    fi
    echo ""
}

# Start all labs
echo "🎯 Starting all simulation backends..."
echo ""

# Core Labs
start_lab "OCR-Simulation" "/Users/vietchung/lmsmath/python-simulations/ocr-simulation" 8000
start_lab "BioGrowth" "/Users/vietchung/lmsmath/python-simulations/biogrowth" 8001
start_lab "Chemistry-Lab" "/Users/vietchung/lmsmath/python-simulations/chemistry-lab" 8002
start_lab "DataSim-AI" "/Users/vietchung/lmsmath/python-simulations/datasim-ai" 8003
start_lab "MechaForce" "/Users/vietchung/lmsmath/python-simulations/mechaforce" 8004
start_lab "MotionSim-Pro" "/Users/vietchung/lmsmath/python-simulations/motionsim" 8005
start_lab "ThermoFlow" "/Users/vietchung/lmsmath/python-simulations/thermoflow" 8006
start_lab "Physics-Motion" "/Users/vietchung/lmsmath/python-simulations/physics-motion" 8007
start_lab "Aerodynamics" "/Users/vietchung/lmsmath/python-simulations/aerodynamics" 8008
start_lab "AeroFlow-3D" "/Users/vietchung/lmsmath/python-simulations/aeroflow-3d" 8009
start_lab "Harmonic-Motion" "/Users/vietchung/lmsmath/python-simulations/harmonic-motion" 8010
start_lab "Motion-Tracking" "/Users/vietchung/lmsmath/python-simulations/motion-tracking" 8011
start_lab "OCR-Grading" "/Users/vietchung/lmsmath/python-simulations/ocr-grading" 8012
start_lab "Optics-Lab" "/Users/vietchung/lmsmath/python-simulations/optics-lab" 8013
start_lab "MotionSim" "/Users/vietchung/lmsmath/python-simulations/motion-sim" 8014
start_lab "ChemLab-3D" "/Users/vietchung/lmsmath/python-simulations/chemlab-3d" 8015
start_lab "Projectile" "/Users/vietchung/lmsmath/python-simulations/projectile" 8016
start_lab "Refraction" "/Users/vietchung/lmsmath/python-simulations/refraction" 8017
start_lab "Weather-Sim" "/Users/vietchung/lmsmath/python-simulations/weather-sim" 8018
start_lab "WFC-Builder" "/Users/vietchung/lmsmath/python-simulations/wfc-builder" 8019

echo "⏳ Waiting for backends to start..."
sleep 5

echo ""
echo "🔍 Checking backend status..."
echo "=============================="

# Check which backends are running
running_count=0
total_count=20

for port in 8000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 8011 8012 8013 8014 8015 8016 8017 8018 8019; do
    if lsof -i:$port > /dev/null 2>&1; then
        echo "✅ Port $port: Running"
        ((running_count++))
    else
        echo "❌ Port $port: Not running"
    fi
done

echo ""
echo "📊 SUMMARY:"
echo "   Running: $running_count/$total_count backends"
echo "   Success rate: $(( running_count * 100 / total_count ))%"
echo ""

if [ $running_count -gt 0 ]; then
    echo "🎉 SUCCESS! $running_count backends are running"
    echo ""
    echo "🌐 Access URLs:"
    echo "   LabTwin: http://localhost:3000/dashboard/labtwin/labs"
    echo "   Next.js: http://localhost:3000"
    echo ""
    echo "📝 Log files:"
    echo "   All logs: /tmp/*.log"
    echo "   Example: tail -f /tmp/OCR-Simulation.log"
    echo ""
    echo "🛑 To stop all backends:"
    echo "   ./STOP_ALL_LABS.sh"
else
    echo "❌ No backends are running. Check the logs for errors."
    echo "   Logs: /tmp/*.log"
fi

echo ""
echo "🚀 All labs startup complete!"
