#!/bin/bash

# Remove ALL Neumorphic imports from teacher pages
echo "🔧 Removing all Neumorphic imports..."
echo ""

cd /Users/pixibox/Aeroeduvison

# Find and remove Neumorphic imports
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' '/import.*NeumorphicCard/d' {} \;
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' '/import.*NeumorphicButton/d' {} \;
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' '/import.*NeumorphicInput/d' {} \;
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' '/import.*Neumorphic/d' {} \;

echo "✅ All Neumorphic imports removed!"
echo ""

# Verify
REMAINING=$(find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -l "Neumorphic" {} \; | wc -l)
echo "📊 Remaining files with Neumorphic: $REMAINING"
echo ""

if [ "$REMAINING" -eq 0 ]; then
  echo "🎉 SUCCESS! All Neumorphic imports removed!"
else
  echo "⚠️  Some files still have Neumorphic imports:"
  find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -l "Neumorphic" {} \;
fi
echo ""
