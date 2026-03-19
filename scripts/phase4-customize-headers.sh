#!/bin/bash

# Phase 4: Customize Headers with Page-Specific Icons and Titles
# This script automates the customization process

echo "🎨 Phase 4: Customizing Sticky Headers"
echo "======================================"
echo ""

cd /Users/pixibox/Aeroeduvison

# Define customizations
declare -A CUSTOMIZATIONS=(
  ["exam-matrix/page.tsx"]="Grid3x3|Ma Trận Đề Thi|Quản lý và số hóa ma trận đề thi|Upload,Plus"
  ["question-bank/page.tsx"]="Database|Ngân Hàng Câu Hỏi|Quản lý và sinh câu hỏi với AI|Sparkles"
  ["exams/page.tsx"]="FileText|Đề Thi|Quản lý và chấm điểm tự động|Plus"
  ["online-exam-room/page.tsx"]="Clock|Phòng Thi Online|Tổ chức và quản lý thi trực tuyến|Plus"
  ["classes/page.tsx"]="Users|Quản Lý Lớp|Quản lý lớp học và học sinh|Plus"
  ["calendar/page.tsx"]="Calendar|Lịch Biểu|Lịch dạy và sự kiện|Plus"
  ["assignments/page.tsx"]="BookOpen|Bài Tập|Giao và quản lý bài tập|Plus"
  ["grading/page.tsx"]="CheckCircle2|Chấm Điểm|Chấm điểm tự động với AI|Upload"
  ["interaction-center/page.tsx"]="MessageSquare|Tương Tác|Tương tác với học sinh|Send"
  ["camera-management/page.tsx"]="Camera|Camera AI|Quản lý camera và vision AI|Settings"
)

PROCESSED=0

for page_path in "${!CUSTOMIZATIONS[@]}"; do
  FILE="app/(dashboard)/(routes)/teacher/$page_path"
  
  if [ -f "$FILE" ]; then
    echo "📄 Customizing: $page_path"
    
    IFS='|' read -r ICON TITLE DESC BUTTONS <<< "${CUSTOMIZATIONS[$page_path]}"
    
    # Replace generic header with customized one
    # This is a simplified version - you may need to adjust based on actual file structure
    
    # Replace icon
    sed -i '' "s/<Brain className=\"w-5 h-5 text-white\" \/>/<${ICON} className=\"w-5 h-5 text-white\" \/>/g" "$FILE"
    
    # Replace title
    sed -i '' "s/Page Title/${TITLE}/g" "$FILE"
    
    # Replace description
    sed -i '' "s/Page description/${DESC}/g" "$FILE"
    
    echo "   ✅ Customized: ${ICON} | ${TITLE}"
    PROCESSED=$((PROCESSED + 1))
  else
    echo "   ⚠️  File not found: $page_path"
  fi
done

echo ""
echo "======================================"
echo "🎉 Header Customization Complete!"
echo "======================================"
echo ""
echo "📊 Results:"
echo "   ✅ Processed: $PROCESSED pages"
echo ""
echo "📝 Next Steps:"
echo "   1. Review customized pages in browser"
echo "   2. Add action buttons for each page"
echo "   3. Test responsive design"
echo "   4. Continue with remaining pages"
echo ""
