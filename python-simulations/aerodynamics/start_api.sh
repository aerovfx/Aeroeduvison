#!/bin/bash

echo "🌬️  Starting Aerodynamics Simulation API..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install requirements
echo "📦 Installing requirements..."
pip install -q -r requirements.txt

# Run API server
echo "🚀 Starting server on port 8007..."
python api.py

