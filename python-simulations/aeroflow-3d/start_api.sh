#!/bin/bash

# AeroFlow XR API Startup Script

echo "🌊 AeroFlow XR - 3D Fluid Simulation"
echo "======================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo ""
echo "✅ Environment ready!"
echo ""

# Start API server
echo "🚀 Starting AeroFlow XR API on port 8008..."
echo ""
python api.py

