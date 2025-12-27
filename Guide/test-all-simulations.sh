#!/bin/bash

echo "🧪 Testing All Simulation Systems..."
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Aerodynamics API
echo -e "\n${BLUE}1. Testing Aerodynamics API (Port 8007)${NC}"
if curl -s http://localhost:8007/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ Aerodynamics API is running${NC}"
    
    # Test presets
    PRESETS=$(curl -s http://localhost:8007/presets | grep -c "cylinder")
    if [ "$PRESETS" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Presets endpoint working${NC}"
    fi
else
    echo -e "${RED}❌ Aerodynamics API not running${NC}"
    echo -e "${YELLOW}   Start with: cd python-simulations/aerodynamics && python api.py${NC}"
fi

# Test WFC Builder API
echo -e "\n${BLUE}2. Testing WFC Builder API (Port 8008)${NC}"
if curl -s http://localhost:8008/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ WFC Builder API is running${NC}"
    
    # Test tilesets
    TILESETS=$(curl -s http://localhost:8008/tilesets | grep -c "building_blocks")
    if [ "$TILESETS" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Tilesets endpoint working${NC}"
    fi
else
    echo -e "${RED}❌ WFC Builder API not running${NC}"
    echo -e "${YELLOW}   Start with: cd python-simulations/wfc-builder && python api.py${NC}"
fi

# Test DataSim.AI API
echo -e "\n${BLUE}3. Testing DataSim.AI API (Port 8009)${NC}"
if curl -s http://localhost:8009/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ DataSim.AI API is running${NC}"
    
    # Test models
    MODELS=$(curl -s http://localhost:8009/models | grep -c "logistic_regression")
    if [ "$MODELS" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Models endpoint working${NC}"
    fi
else
    echo -e "${RED}❌ DataSim.AI API not running${NC}"
    echo -e "${YELLOW}   Start with: cd python-simulations/datasim-ai && python api.py${NC}"
fi

# Test Data Files
echo -e "\n${BLUE}4. Testing Data Files${NC}"
BASE_DIR="/Users/vietchung/lmsmath"
FILES=(
    "$BASE_DIR/public/labs/aerodynamics/data.json"
    "$BASE_DIR/public/labs/aerodynamics/manifest.json"
    "$BASE_DIR/public/labs/wfc-builder/data.json"
    "$BASE_DIR/public/labs/wfc-builder/manifest.json"
    "$BASE_DIR/public/labs/datasim-ai/data.json"
    "$BASE_DIR/public/labs/datasim-ai/manifest.json"
    "$BASE_DIR/public/labs/index.json"
)

ALL_FILES_OK=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}   ✅ $(basename $(dirname $file))/$(basename $file)${NC}"
    else
        echo -e "${RED}   ❌ Missing: $file${NC}"
        ALL_FILES_OK=false
    fi
done

# Summary
echo -e "\n======================================"
echo -e "${BLUE}Summary${NC}"
echo -e "======================================"

RUNNING_APIS=0
curl -s http://localhost:8007/health > /dev/null 2>&1 && ((RUNNING_APIS++))
curl -s http://localhost:8008/health > /dev/null 2>&1 && ((RUNNING_APIS++))
curl -s http://localhost:8009/health > /dev/null 2>&1 && ((RUNNING_APIS++))

echo -e "APIs Running: ${GREEN}$RUNNING_APIS/3${NC}"

if [ "$RUNNING_APIS" -eq 3 ] && [ "$ALL_FILES_OK" = true ]; then
    echo -e "\n${GREEN}🎉 ALL SYSTEMS GO! Ready for use!${NC}"
    echo -e "\n${BLUE}Access simulations at:${NC}"
    echo -e "${GREEN}   http://localhost:3000/dashboard/labtwin${NC}"
    echo -e "${GREEN}   http://localhost:3000/dashboard/labtwin/labs${NC}"
else
    echo -e "\n${YELLOW}⚠️  Some systems need attention${NC}"
    if [ "$RUNNING_APIS" -lt 3 ]; then
        echo -e "${YELLOW}   Start missing APIs (see errors above)${NC}"
    fi
    if [ "$ALL_FILES_OK" = false ]; then
        echo -e "${YELLOW}   Run build scripts to generate missing files${NC}"
    fi
fi

echo ""

