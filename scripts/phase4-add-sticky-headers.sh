#!/bin/bash

# Phase 4: Add Sticky Headers to All Teacher Pages
# This is a SEMI-AUTOMATED script - adds basic headers, then you customize

echo "🎨 Phase 4: Adding Sticky Headers to Teacher Pages"
echo "=================================================="
echo ""

# Define page icons (mapping page paths to Lucide icon names)
declare -A PAGE_ICONS=(
  ["exam-matrix/page.tsx"]="Grid3x3"
  ["question-bank/page.tsx"]="Database"
  ["exams/page.tsx"]="FileText"
  ["online-exam-room/page.tsx"]="Clock"
  ["classes/page.tsx"]="Users"
  ["calendar/page.tsx"]="Calendar"
  ["assignments/page.tsx"]="BookOpen"
  ["grading/page.tsx"]="CheckCircle2"
  ["interaction-center/page.tsx"]="MessageSquare"
  ["camera-management/page.tsx"]="Camera"
  ["document-digitization/page.tsx"]="Upload"
  ["exam-generator/page.tsx"]="Sparkles"
  ["exam-grading/page.tsx"]="CheckCircle"
  ["exam-reports/page.tsx"]="BarChart3"
  ["latex-documents/page.tsx"]="FileText"
  ["learning-path-builder/page.tsx"]="Route"
  ["multi-disciplinary-paths/page.tsx"]="Layers"
  ["create-module/page.tsx"]="Plus"
  ["environment-monitoring/page.tsx"]="Activity"
  ["vision/object-detection/page.tsx"]="Eye"
  ["student/[studentId]/page.tsx"]="User"
  ["classes/[id]/page.tsx"]="Users"
  ["exam-matrix/[id]/page.tsx"]="Grid3x3"
  ["exam-matrix/[id]/review/page.tsx"]="Eye"
  ["exam-matrix/[id]/edit/page.tsx"]="Edit"
  ["question-bank/list/page.tsx"]="List"
  ["question-bank/create/page.tsx"]="Plus"
  ["question-bank/edit/[id]/page.tsx"]="Edit"
  ["exams/create/page.tsx"]="Plus"
  ["exam-preview/[exam_id]/page.tsx"]="Eye"
  ["latex-documents/[id]/page.tsx"]="FileText"
  ["document-digitization/[id]/review/page.tsx"]="Eye"
  ["system-flow/page.tsx"]="Activity"
  ["grading/_components/ScanGrading.tsx"]="Scan"
)

# Define page titles
declare -A PAGE_TITLES=(
  ["exam-matrix/page.tsx"]="Ma Trận Đề Thi"
  ["question-bank/page.tsx"]="Ngân Hàng Câu Hỏi"
  ["exams/page.tsx"]="Đề Thi"
  ["online-exam-room/page.tsx"]="Phòng Thi Online"
  ["classes/page.tsx"]="Quản Lý Lớp"
  ["calendar/page.tsx"]="Lịch Biểu"
  ["assignments/page.tsx"]="Bài Tập"
  ["grading/page.tsx"]="Chấm Điểm"
  ["interaction-center/page.tsx"]="Tương Tác"
  ["camera-management/page.tsx"]="Camera AI"
  ["document-digitization/page.tsx"]="Số Hóa Tài Liệu"
  ["exam-generator/page.tsx"]="Sinh Đề Thi"
  ["exam-grading/page.tsx"]="Chấm Thi"
  ["exam-reports/page.tsx"]="Báo Cáo Thi"
  ["latex-documents/page.tsx"]="LaTeX Documents"
  ["learning-path-builder/page.tsx"]="Learning Path"
  ["multi-disciplinary-paths/page.tsx"]="Multi-Disciplinary"
  ["create-module/page.tsx"]="Tạo Module"
  ["environment-monitoring/page.tsx"]="Environment"
  ["vision/object-detection/page.tsx"]="Vision AI"
  ["student/[studentId]/page.tsx"]="Học Sinh"
  ["classes/[id]/page.tsx"]="Chi Tiết Lớp"
  ["exam-matrix/[id]/page.tsx"]="Ma Trận"
  ["exam-matrix/[id]/review/page.tsx"]="Review"
  ["exam-matrix/[id]/edit/page.tsx"]="Edit"
  ["question-bank/list/page.tsx"]="Danh Sách Câu Hỏi"
  ["question-bank/create/page.tsx"]="Thêm Câu Hỏi"
  ["question-bank/edit/[id]/page.tsx"]="Sửa Câu Hỏi"
  ["exams/create/page.tsx"]="Tạo Đề Thi"
  ["exam-preview/[exam_id]/page.tsx"]="Preview"
  ["latex-documents/[id]/page.tsx"]="LaTeX Detail"
  ["document-digitization/[id]/review/page.tsx"]="Review"
  ["system-flow/page.tsx"]="System Flow"
  ["grading/_components/ScanGrading.tsx"]="Scan Grading"
)

cd /Users/pixibox/Aeroeduvison

PROCESSED=0
SKIPPED=0

for page_path in "${!PAGE_ICONS[@]}"; do
  FILE="app/(dashboard)/(routes)/teacher/$page_path"
  
  if [ -f "$FILE" ]; then
    echo "📄 Processing: $page_path"
    
    ICON="${PAGE_ICONS[$page_path]}"
    TITLE="${PAGE_TITLES[$page_path]}"
    
    # Create the sticky header component
    STICKY_HEADER="
      {/* Sticky Header */}
      <div className=\"bg-white border-b border-gray-200 sticky top-0 z-10\">
        <div className=\"max-w-7xl mx-auto px-6 py-4\">
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center gap-3\">
              <div className=\"w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center\">
                <${ICON} className=\"w-5 h-5 text-white\" />
              </div>
              <div>
                <h1 className=\"text-xl font-bold text-gray-900\">${TITLE}</h1>
                <p className=\"text-sm text-gray-600\">Quản lý và theo dõi</p>
              </div>
            </div>
            <div className=\"flex items-center gap-2\">
              {/* Action buttons */}
            </div>
          </div>
        </div>
      </div>
    "
    
    # Check if file already has a sticky header
    if grep -q "sticky top-0 z-10" "$FILE"; then
      echo "   ⚠️  Already has sticky header - skipping"
      SKIPPED=$((SKIPPED + 1))
    else
      # Find the main return statement and add header before main content
      # This is a simplified approach - adds after the opening div
      
      # Create a temp file with the header inserted
      awk -v header="$STICKY_HEADER" '
        /return \(/ { 
          print $0
          getline
          print $0
          print header
          next
        }
        { print }
      ' "$FILE" > "${FILE}.tmp"
      
      mv "${FILE}.tmp" "$FILE"
      
      echo "   ✅ Sticky header added!"
      PROCESSED=$((PROCESSED + 1))
    fi
  else
    echo "   ⚠️  File not found: $page_path"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "=================================================="
echo "🎉 Sticky Header Script Complete!"
echo "=================================================="
echo ""
echo "📊 Results:"
echo "   ✅ Processed: $PROCESSED pages"
echo "   ⚠️  Skipped: $SKIPPED pages"
echo ""
echo "📝 Next Steps:"
echo "   1. Review each page in browser"
echo "   2. Customize action buttons for each page"
echo "   3. Adjust descriptions if needed"
echo "   4. Test responsive design"
echo ""
echo "⚠️  Manual Fixes Needed:"
echo "   - Some pages may need header position adjustments"
echo "   - Add page-specific action buttons"
echo "   - Verify icons match page content"
echo ""
