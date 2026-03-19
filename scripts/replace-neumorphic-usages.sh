#!/bin/bash

# Replace Neumorphic component USAGES with standard elements
echo "🔧 Replacing Neumorphic component usages..."
echo ""

cd /Users/pixibox/Aeroeduvison

# Replace NeumorphicCard with div
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' 's/<NeumorphicCard/<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"/g' {} \;
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' 's/<\/NeumorphicCard>/<\/div>/g' {} \;

# Replace NeumorphicButton with button
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' 's/<NeumorphicButton className="/<button className="/g' {} \;
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' 's/<\/NeumorphicButton>/<\/button>/g' {} \;
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' 's/<NeumorphicButton/<button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"/g' {} \;

# Replace NeumorphicInput with input
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' 's/<NeumorphicInput placeholder="/<input placeholder="/g' {} \;
find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec sed -i '' 's/\/>/\/>/g' {} \;

echo "✅ Component usages replaced!"
echo ""

# Verify
REMAINING=$(find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -l "Neumorphic" {} \; | wc -l)
echo "📊 Remaining files with Neumorphic: $REMAINING"
echo ""

if [ "$REMAINING" -eq 0 ]; then
  echo "🎉 SUCCESS! All Neumorphic components removed!"
else
  echo "⚠️  Some files still have Neumorphic:"
  find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -exec grep -l "Neumorphic" {} \;
  echo ""
  echo "📝 These need manual fixing"
fi
echo ""
