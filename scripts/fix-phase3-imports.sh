#!/bin/bash

# Fix broken imports caused by sed replacements
# This script fixes the syntax errors in Phase 3 files

echo "🔧 Fixing broken imports from Phase 3..."
echo ""

cd /Users/pixibox/Aeroeduvison

# Files to fix
FILES=(
  "app/(dashboard)/(routes)/teacher/exam-reports/page.tsx"
  "app/(dashboard)/(routes)/teacher/question-bank/list/page.tsx"
  "app/(dashboard)/(routes)/teacher/question-bank/create/page.tsx"
  "app/(dashboard)/(routes)/teacher/question-bank/edit/[id]/page.tsx"
  "app/(dashboard)/(routes)/teacher/exams/create/page.tsx"
  "app/(dashboard)/(routes)/teacher/exam-preview/[exam_id]/page.tsx"
  "app/(dashboard)/(routes)/teacher/latex-documents/[id]/page.tsx"
  "app/(dashboard)/(routes)/teacher/document-digitization/[id]/review/page.tsx"
  "app/(dashboard)/(routes)/teacher/system-flow/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📄 Fixing: $file"
    
    # Fix broken NeumorphicInput import
    sed -i '' 's/import { input className="[^"]*" } from "@\/components\/ui\/neumorphic-input"/import { NeumorphicInput } from "@\/components\/ui\/neumorphic-input"/g' "$file"
    
    # Fix any other broken imports with className
    sed -i '' 's/import { [^}]*className="[^"]*" } from/import { NeumorphicInput } from/g' "$file"
    
    echo "   ✅ Fixed!"
  fi
done

echo ""
echo "🎉 Import fix complete!"
echo ""
echo "📝 Next: Test each page in browser"
echo ""
