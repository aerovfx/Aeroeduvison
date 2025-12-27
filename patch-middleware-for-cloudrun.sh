#!/bin/bash

# Patch middleware.ts to disable Cloud Run URL redirect
# Run this in Cloud Shell before deploying

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Patching middleware.ts for Cloud Run deployment...${NC}"
echo ""

# Check if middleware.ts exists
if [ ! -f "middleware.ts" ]; then
    echo -e "${YELLOW}⚠️  middleware.ts not found in current directory${NC}"
    echo "Please run this script from the project root (where middleware.ts is located)"
    exit 1
fi

# Backup original file
echo -e "${YELLOW}📦 Creating backup...${NC}"
cp middleware.ts middleware.ts.backup
echo -e "${GREEN}   ✅ Backup created: middleware.ts.backup${NC}"
echo ""

# Apply patch using sed
echo -e "${YELLOW}🔧 Applying patch...${NC}"

# Create temporary file with the patch
cat > /tmp/middleware_patch.sed << 'EOF'
/\/\/ Enforce primary domain: redirect any \*\.run\.app to https:\/\/inphysic\.com/,/^  }$/ {
    # Add comment before
    i\
  // ✅ DISABLED: Allow Cloud Run URL for deployment testing\
  // Enforce primary domain: redirect any *.run.app to https://inphysic.com\
  // Uncomment this when custom domain is fully configured\
  /*
    
    # Delete the original comment line
    /\/\/ Enforce primary domain: redirect any \*\.run\.app to https:\/\/inphysic\.com/d
    
    # Add closing comment after the closing brace
    /^  }$/ a\
  */
}
EOF

# Apply the patch
sed -i.tmp -f /tmp/middleware_patch.sed middleware.ts || {
    # If sed with -f fails, use direct sed commands
    echo -e "${YELLOW}   Trying alternative patch method...${NC}"
    
    # More robust approach: comment out lines 76-81
    sed -i.tmp '76 i\
  // ✅ DISABLED: Allow Cloud Run URL for deployment testing\
  // Uncomment this when custom domain is fully configured\
  /*
' middleware.ts
    
    sed -i.tmp '82 a\
  */
' middleware.ts
}

# Clean up temp file
rm -f /tmp/middleware_patch.sed
rm -f middleware.ts.tmp

echo -e "${GREEN}   ✅ Patch applied successfully${NC}"
echo ""

# Show the changes
echo -e "${BLUE}📝 Changes made:${NC}"
echo ""
echo "Lines around the redirect logic have been commented out:"
echo ""
sed -n '71,90p' middleware.ts | cat -n
echo ""

echo -e "${GREEN}✅ Patch complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review the changes above"
echo "  2. Run deployment: ./deploy-cloud-run-with-secrets.sh"
echo "  3. To restore original: mv middleware.ts.backup middleware.ts"
echo ""
