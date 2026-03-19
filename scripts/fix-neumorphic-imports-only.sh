#!/bin/bash

# Fix ONLY broken NeumorphicInput import statements (not JSX elements)

echo "🔧 Fixing broken NeumorphicInput IMPORT statements..."
echo ""

cd /Users/pixibox/Aeroeduvison

# Find files with broken import (at beginning of line)
for file in $(find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f); do
  if grep -q "^import { input className=" "$file"; then
    echo "📄 Fixing: $file"
    
    # Replace ONLY import statement at beginning of line
    sed -i '' 's/^import { input className="[^"]*" } from "@\/components\/ui\/neumorphic-input";/import { NeumorphicInput } from "@\/components\/ui\/neumorphic-input";/g' "$file"
    
    echo "   ✅ Fixed!"
  fi
done

echo ""
echo "🎉 Import fix complete!"
echo ""

# Check for remaining broken imports (only at line start)
REMAINING=$(find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -c "^import { input className=" {} \; | awk '{s+=$1} END {print s}')
echo "📊 Remaining broken IMPORT statements: $REMAINING"
echo ""

if [ "$REMAINING" -eq 0 ]; then
  echo "✅ SUCCESS! All import statements are fixed!"
  echo ""
  echo "📝 Note: JSX <input className=...> elements are NOT affected."
  echo "   These are normal HTML elements and should remain as-is."
else
  echo "⚠️  Some files still have broken imports:"
  find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -l "^import { input className=" {} \;
fi
echo ""
