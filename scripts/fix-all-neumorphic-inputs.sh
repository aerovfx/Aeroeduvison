#!/bin/bash

# Fix all broken NeumorphicInput imports caused by sed replacements

echo "🔧 Fixing broken NeumorphicInput imports..."
echo ""

cd /Users/pixibox/Aeroeduvison

# Find and fix all broken NeumorphicInput imports
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -l "input className=" {} \; | while read file; do
  echo "📄 Fixing: $file"
  
  # Replace broken import with correct one
  sed -i '' 's/import { input className="[^"]*" } from "@\/components\/ui\/neumorphic-input"/import { NeumorphicInput } from "@\/components\/ui\/neumorphic-input"/g' "$file"
  
  echo "   ✅ Fixed!"
done

echo ""
echo "🎉 All imports fixed!"
echo ""

# Verify
REMAINING=$(find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -l "input className=" {} \; | wc -l)
echo "📊 Remaining broken imports: $REMAINING"
echo ""

if [ "$REMAINING" -eq 0 ]; then
  echo "✅ SUCCESS! All imports are fixed!"
else
  echo "⚠️  Some files still have broken imports:"
  find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -l "input className=" {} \;
fi
echo ""
