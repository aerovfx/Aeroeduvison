#!/bin/bash

# WFC Builder - Run Script
# Port: 8019

echo "🧠 Starting WFC Builder - Wave Function Collapse 3D"
echo "📊 Procedural Generation with Python Backend"
echo "🎮 WebGL Frontend Ready"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies. Please check requirements.txt"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "⚠️  requirements.txt not found. Installing basic dependencies..."
    pip3 install Flask Flask-CORS numpy Werkzeug
fi

echo ""
echo "🚀 Starting WFC Builder server on port 8019..."
echo "🌐 Open your browser and go to: http://localhost:8019"
echo "📡 API Health Check: http://localhost:8019/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the application
python3 app.py












