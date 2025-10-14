#!/bin/bash

echo "🚀 Starting ALL Lab Simulations..."
echo "===================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Starting Python API servers...${NC}\n"

# Start all APIs in background
echo "1. Starting Aerodynamics (Port 8007)..."
cd python-simulations/aerodynamics && python3 api.py > /tmp/aerodynamics_api.log 2>&1 &
sleep 1

echo "2. Starting WFC Builder (Port 8008)..."
cd ../wfc-builder && python3 api.py > /tmp/wfc_api.log 2>&1 &
sleep 1

echo "3. Starting DataSim.AI (Port 8009)..."
cd ../datasim-ai && python3 api.py > /tmp/datasim_api.log 2>&1 &
sleep 1

echo "4. Starting ThermoFlow (Port 8010)..."
cd ../thermoflow && python3 api.py > /tmp/thermoflow_api.log 2>&1 &
sleep 1

echo "5. Starting MotionSim (Port 8012)..."
cd ../motionsim && python3 api.py > /tmp/motionsim_api.log 2>&1 &
sleep 1

echo "6. Starting Weather+Earthquake (Port 8013)..."
cd ../weather-sim && python3 api.py > /tmp/weather_api.log 2>&1 &

echo -e "\n${YELLOW}Waiting for servers to start...${NC}"
sleep 5

# Check health
echo -e "\n${BLUE}Health Check:${NC}"
curl -s http://localhost:8007/health > /dev/null && echo -e "${GREEN}✅ Port 8007 - Aerodynamics${NC}" || echo "❌ Port 8007"
curl -s http://localhost:8008/health > /dev/null && echo -e "${GREEN}✅ Port 8008 - WFC Builder${NC}" || echo "❌ Port 8008"
curl -s http://localhost:8009/health > /dev/null && echo -e "${GREEN}✅ Port 8009 - DataSim.AI${NC}" || echo "❌ Port 8009"
curl -s http://localhost:8010/health > /dev/null && echo -e "${GREEN}✅ Port 8010 - ThermoFlow${NC}" || echo "❌ Port 8010"
curl -s http://localhost:8012/health > /dev/null && echo -e "${GREEN}✅ Port 8012 - MotionSim${NC}" || echo "❌ Port 8012"
curl -s http://localhost:8013/health > /dev/null && echo -e "${GREEN}✅ Port 8013 - Weather+EQ${NC}" || echo "❌ Port 8013"

echo ""
echo "===================================="
echo -e "${GREEN}🎉 All systems started!${NC}"
echo "===================================="
echo ""
echo "Access simulations at:"
echo "  http://localhost:3000/dashboard/labtwin"
echo ""
echo "To stop all:"
echo "  pkill -f 'python.*api.py'"
echo ""


