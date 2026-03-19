#!/bin/bash

# Teacher Pages Redesign Script
# Applies AI Dashboard design pattern to all teacher pages

echo "🎨 Starting Teacher Pages Redesign..."
echo ""

# List of pages to update
PAGES=(
  "exam-matrix/page.tsx"
  "question-bank/page.tsx"
  "exams/page.tsx"
  "online-exam-room/page.tsx"
  "classes/page.tsx"
  "calendar/page.tsx"
  "assignments/page.tsx"
  "camera-management/page.tsx"
  "document-digitization/page.tsx"
  "environment-monitoring/page.tsx"
  "exam-generator/page.tsx"
  "exam-grading/page.tsx"
  "exam-reports/page.tsx"
  "interaction-center/page.tsx"
  "latex-documents/page.tsx"
  "learning-path-builder/page.tsx"
  "multi-disciplinary-paths/page.tsx"
  "create-module/page.tsx"
  "grading/page.tsx"
  "agents/page.tsx"
)

cd /Users/pixibox/Aeroeduvison

for page in "${PAGES[@]}"; do
  FILE="app/(dashboard)/(routes)/teacher/$page"
  if [ -f "$FILE" ]; then
    echo "✅ Updating: $page"
    
    # Replace glass-panel with white cards
    sed -i '' 's/glass-panel rounded-2xl p-6/bg-white rounded-xl shadow-sm border border-gray-100 p-6/g' "$FILE"
    sed -i '' 's/glass-panel rounded-xl p-6/bg-white rounded-xl shadow-sm border border-gray-100 p-6/g' "$FILE"
    sed -i '' 's/glass-card neu-card/bg-white rounded-xl shadow-sm border border-gray-100/g' "$FILE"
    
    # Replace background
    sed -i '' 's/bg-gradient-to-br from-\[hsl(var(--background))\] to-\[hsl(var(--card))\]/bg-gradient-to-br from-slate-50 to-blue-50/g' "$FILE"
    sed -i '' 's/min-h-screen bg-gradient/min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/g' "$FILE"
    
    # Replace text colors
    sed -i '' 's/text-\[hsl(var(--foreground))\]/text-gray-900/g' "$FILE"
    sed -i '' 's/text-\[hsl(var(--muted-foreground))\]/text-gray-600/g' "$FILE"
    
    echo "   Done!"
  else
    echo "⚠️  File not found: $page"
  fi
done

echo ""
echo "🎉 Redesign Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Review each updated file"
echo "   2. Add sticky headers manually"
echo "   3. Update button styles"
echo "   4. Test in browser"
echo ""
