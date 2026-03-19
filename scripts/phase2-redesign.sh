#!/bin/bash

# Phase 2 - MEDIUM Priority Pages Redesign
# Applies AI Dashboard design to 15 MEDIUM priority teacher pages

echo "🎨 Phase 2 - MEDIUM Priority Pages Redesign"
echo "==========================================="
echo ""

# MEDIUM Priority pages (including subdirectories)
PAGES=(
  "document-digitization/page.tsx"
  "exam-generator/page.tsx"
  "exam-grading/page.tsx"
  "exam-reports/page.tsx"
  "latex-documents/page.tsx"
  "learning-path-builder/page.tsx"
  "multi-disciplinary-paths/page.tsx"
  "create-module/page.tsx"
  "environment-monitoring/page.tsx"
  "vision/object-detection/page.tsx"
  "student/[studentId]/page.tsx"
  "classes/[id]/page.tsx"
  "exam-matrix/[id]/page.tsx"
  "exam-matrix/[id]/review/page.tsx"
  "exam-matrix/[id]/edit/page.tsx"
)

cd /Users/pixibox/Aeroeduvison

for page in "${PAGES[@]}"; do
  FILE="app/(dashboard)/(routes)/teacher/$page"
  if [ -f "$FILE" ]; then
    echo "📄 Processing: $page"
    
    # 1. Replace backgrounds
    sed -i '' 's/bg-gradient-to-br from-\[hsl(var(--background))\] to-\[hsl(var(--card))\]/bg-gradient-to-br from-slate-50 to-blue-50/g' "$FILE"
    sed -i '' 's/min-h-screen bg-gradient/min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/g' "$FILE"
    
    # 2. Replace glass-panel and neumorphic cards
    sed -i '' 's/glass-panel rounded-2xl p-6/bg-white rounded-xl shadow-sm border border-gray-100 p-6/g' "$FILE"
    sed -i '' 's/glass-panel rounded-xl p-6/bg-white rounded-xl shadow-sm border border-gray-100 p-6/g' "$FILE"
    sed -i '' 's/glass-card neu-card/bg-white rounded-xl shadow-sm border border-gray-100/g' "$FILE"
    sed -i '' 's/NeumorphicCard variant="gradient" size="lg"/div className="bg-white rounded-xl shadow-sm border border-gray-100"/g' "$FILE"
    
    # 3. Replace text colors
    sed -i '' 's/text-\[hsl(var(--foreground))\]/text-gray-900/g' "$FILE"
    sed -i '' 's/text-\[hsl(var(--muted-foreground))\]/text-gray-600/g' "$FILE"
    sed -i '' 's/text-\[hsl(var(--primary))\]/text-purple-600/g' "$FILE"
    sed -i '' 's/text-\[hsl(var(--success))\]/text-green-600/g' "$FILE"
    sed -i '' 's/text-\[hsl(var(--destructive))\]/text-red-600/g' "$FILE"
    sed -i '' 's/text-\[hsl(var(--warning))\]/text-yellow-600/g' "$FILE"
    sed -i '' 's/text-\[hsl(var(--info))\]/text-blue-600/g' "$FILE"
    
    # 4. Replace button variants
    sed -i '' 's/variant="primary"/className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"/g' "$FILE"
    sed -i '' 's/variant="outline"/className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"/g' "$FILE"
    sed -i '' 's/variant="danger"/className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"/g' "$FILE"
    sed -i '' 's/variant="success"/className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"/g' "$FILE"
    
    # 5. Replace shadow effects
    sed -i '' 's/shadow-\[var(--glow-primary)\]/shadow-sm/g' "$FILE"
    sed -i '' 's/shadow-\[var(--glow-success)\]/shadow-sm/g' "$FILE"
    sed -i '' 's/shadow-\[var(--glow-destructive)\]/shadow-sm/g' "$FILE"
    sed -i '' 's/shadow-\[var(--glow-warning)\]/shadow-sm/g' "$FILE"
    sed -i '' 's/neu-shadow-sm/shadow-sm/g' "$FILE"
    sed -i '' 's/neu-shadow/shadow-md/g' "$FILE"
    
    # 6. Replace gradient text
    sed -i '' 's/gradient-text/text-purple-600/g' "$FILE"
    
    # 7. Replace border colors
    sed -i '' 's/border-\[hsl(var(--border))\]/border-gray-200/g' "$FILE"
    sed -i '' 's/border-\[hsl(var(--primary)\/0\.3)\]/border-purple-200/g' "$FILE"
    sed -i '' 's/border-\[hsl(var(--success)\/0\.3)\]/border-green-200/g' "$FILE"
    sed -i '' 's/border-\[hsl(var(--destructive)\/0\.3)\]/border-red-200/g' "$FILE"
    sed -i '' 's/border-\[hsl(var(--warning)\/0\.3)\]/border-yellow-200/g' "$FILE"
    
    # 8. Replace hover states
    sed -i '' 's/hover:border-\[hsl(var(--primary)\/0\.3)\]/hover:border-purple-200/g' "$FILE"
    sed -i '' 's/hover:bg-white\/10/hover:bg-gray-50/g' "$FILE"
    sed -i '' 's/hover:bg-\[hsl(var(--primary)\/0\.08)\]/hover:bg-purple-50/g' "$FILE"
    sed -i '' 's/hover:bg-\[hsl(var(--success)\/0\.08)\]/hover:bg-green-50/g' "$FILE"
    sed -i '' 's/hover:bg-\[hsl(var(--destructive)\/0\.08)\]/hover:bg-red-50/g' "$FILE"
    
    # 9. Replace badge variants
    sed -i '' 's/variant="default"/className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"/g' "$FILE"
    sed -i '' 's/variant="secondary"/className="px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700"/g' "$FILE"
    
    # 10. Replace neumorphic inputs
    sed -i '' 's/NeumorphicInput/input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"/g' "$FILE"
    
    echo "   ✅ Done!"
  else
    echo "   ⚠️  File not found"
  fi
done

echo ""
echo "==========================================="
echo "🎉 Phase 2 Redesign Complete!"
echo "==========================================="
echo ""
echo "📊 Progress: 29/40 pages (72.5%)"
echo ""
echo "📝 Next Steps:"
echo "   1. Add sticky headers to each page"
echo "   2. Remove Neumorphic imports"
echo "   3. Update button click handlers"
echo "   4. Test each page in browser"
echo ""
echo "📚 Documentation:"
echo "   - PHASE2_COMPLETE.md (will be created)"
echo "   - TEACHER_PAGES_MASTER_PLAN.md"
echo ""
