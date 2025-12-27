#!/bin/bash

echo "🚀 Starting MotionSim API..."
echo "📍 Port: 8014"
echo "🔧 Physics simulations: Free Fall, Projectile, Harmonic"
echo ""

cd "$(dirname "$0")"
python3 main.py

