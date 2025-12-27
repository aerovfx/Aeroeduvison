#!/bin/bash

# Script test Python Simulations
# Kiểm tra xem tất cả files đã được tạo chưa

# Change to script directory
cd "$(dirname "$0")"

echo "🧪 Testing Python Simulations System..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Counter
PASS=0
FAIL=0

# Test function
test_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((FAIL++))
    fi
}

echo -e "${BLUE}=== Testing Python Files ===${NC}"
test_file "python-simulations/build-all.py" "Build script"
test_file "python-simulations/refraction/main.py" "Refraction - main.py"
test_file "python-simulations/refraction/build.py" "Refraction - build.py"
test_file "python-simulations/refraction/output/data.json" "Refraction - data.json"
test_file "python-simulations/projectile/main.py" "Projectile - main.py"
test_file "python-simulations/projectile/build.py" "Projectile - build.py"
test_file "python-simulations/projectile/output/data.json" "Projectile - data.json"
test_file "python-simulations/motion-tracking/main.py" "Motion Tracking - main.py"
test_file "python-simulations/motion-tracking/build.py" "Motion Tracking - build.py"
test_file "python-simulations/motion-tracking/output/data.json" "Motion Tracking - data.json"
test_file "python-simulations/harmonic-motion/main.py" "Harmonic Motion - main.py"
test_file "python-simulations/harmonic-motion/build.py" "Harmonic Motion - build.py"
test_file "python-simulations/harmonic-motion/output/data.json" "Harmonic Motion - data.json"

echo ""
echo -e "${BLUE}=== Testing Public Data Files ===${NC}"
test_file "public/labs/index.json" "Labs index"
test_file "public/labs/refraction/data.json" "Refraction - public data"
test_file "public/labs/refraction/manifest.json" "Refraction - public manifest"
test_file "public/labs/projectile/data.json" "Projectile - public data"
test_file "public/labs/projectile/manifest.json" "Projectile - public manifest"
test_file "public/labs/motion-tracking/data.json" "Motion Tracking - public data"
test_file "public/labs/motion-tracking/manifest.json" "Motion Tracking - public manifest"
test_file "public/labs/harmonic-motion/data.json" "Harmonic Motion - public data"
test_file "public/labs/harmonic-motion/manifest.json" "Harmonic Motion - public manifest"

echo ""
echo -e "${BLUE}=== Testing Next.js Pages ===${NC}"
test_file "app/(dashboard)/(routes)/dashboard/labtwin/page.tsx" "LabTwin main page"
test_file "app/(dashboard)/(routes)/dashboard/labtwin/labs/page.tsx" "Labs index page"
test_file "app/(dashboard)/(routes)/dashboard/labtwin/labs/refraction/page.tsx" "Refraction page"
test_file "app/(dashboard)/(routes)/dashboard/labtwin/labs/projectile/page.tsx" "Projectile page"
test_file "app/(dashboard)/(routes)/dashboard/labtwin/labs/motion-tracking/page.tsx" "Motion Tracking page"
test_file "app/(dashboard)/(routes)/dashboard/labtwin/labs/harmonic-motion/page.tsx" "Harmonic Motion page"

echo ""
echo -e "${BLUE}=== Testing Components ===${NC}"
test_file "components/simulations/refraction-viewer.tsx" "Refraction viewer"
test_file "components/simulations/projectile-viewer.tsx" "Projectile viewer"
test_file "components/simulations/motion-tracking-viewer.tsx" "Motion Tracking viewer"
test_file "components/simulations/harmonic-motion-viewer.tsx" "Harmonic Motion viewer"

echo ""
echo -e "${BLUE}=== Summary ===${NC}"
echo -e "${GREEN}✅ Passed: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}❌ Failed: $FAIL${NC}"
else
    echo -e "${GREEN}🎉 All tests passed!${NC}"
fi

echo ""
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✨ Python Simulations System is COMPLETE! ✨${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Restart dev server: npm run dev"
    echo "  2. Visit: http://localhost:3000/dashboard/labtwin"
    echo "  3. Test simulations!"
else
    echo -e "${RED}Some files are missing. Run: npm run simulations:build${NC}"
fi

echo ""

