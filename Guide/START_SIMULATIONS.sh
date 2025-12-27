#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Python Simulations for LabTwin"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 What's included:"
echo "  ✅ 4 Python Simulations (Refraction, Projectile, Motion Tracking, Harmonic)"
echo "  ✅ 1 Video Tracking Tool"
echo "  ✅ Custom parameters input"
echo "  ✅ Clickable presets"
echo "  ✅ Complete physics data"
echo ""
echo "🚨 IMPORTANT: Dev mode has routing issues"
echo "   Use PRODUCTION build for best experience!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Choose option [1=Production, 2=Dev, 3=Info]: " choice

case $choice in
  1)
    echo ""
    echo "🏗️  Building for production..."
    npm run build
    echo ""
    echo "🚀 Starting production server..."
    npm start
    ;;
  2)
    echo ""
    echo "⚠️  Dev mode may have routing issues!"
    echo "💡 Recommended: Use Incognito browser or try production build"
    echo ""
    echo "🔧 Starting dev server..."
    npm run dev
    ;;
  3)
    echo ""
    echo "📚 Information:"
    echo ""
    echo "URLs (Production build):"
    echo "  Main:     http://localhost:3000/dashboard/labtwin"
    echo "  Labs:     http://localhost:3000/dashboard/labtwin/labs"
    echo "  Video:    http://localhost:3000/dashboard/labtwin/video-tracking"
    echo ""
    echo "Documentation:"
    echo "  README_PYTHON_SIMULATIONS.md       - This guide"
    echo "  PYTHON_SIMULATIONS_GUIDE.md        - Complete tutorial"
    echo "  python-simulations/README.md       - Technical docs"
    echo ""
    echo "Build commands:"
    echo "  npm run simulations:build          - Build all simulations"
    echo "  npm run build && npm start         - Production server"
    echo "  npm run dev                        - Development server"
    echo ""
    ;;
  *)
    echo "Invalid option. Exiting."
    exit 1
    ;;
esac
