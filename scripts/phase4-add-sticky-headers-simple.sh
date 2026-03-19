#!/bin/bash

# Phase 4: Add Basic Sticky Headers (Simpler Approach)
# Adds a generic sticky header that you can customize later

echo "🎨 Phase 4: Adding Basic Sticky Headers"
echo "======================================="
echo ""

cd /Users/pixibox/Aeroeduvison

# Generic sticky header (you'll customize icons/titles manually)
GENERIC_HEADER='
      {/* Sticky Header - TODO: Customize icon and title */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Page Title</h1>
                <p className="text-sm text-gray-600">Page description</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Add action buttons here */}
            </div>
          </div>
        </div>
      </div>
'

PROCESSED=0
SKIPPED=0

# Find all teacher page files
while IFS= read -r -d '' FILE; do
  echo "📄 Processing: ${FILE#app/(dashboard)/(routes)/teacher/}"
  
  # Check if already has sticky header
  if grep -q "sticky top-0 z-10" "$FILE"; then
    echo "   ⚠️  Already has header - skipping"
    SKIPPED=$((SKIPPED + 1))
  else
    # Add header after "return (" statement
    if grep -q "return (" "$FILE"; then
      # Create temp file with header
      awk '
        /return \(/ { 
          print
          getline
          print
          print "      {/* Sticky Header */}"
          print "      <div className=\"bg-white border-b border-gray-200 sticky top-0 z-10\">"
          print "        <div className=\"max-w-7xl mx-auto px-6 py-4\">"
          print "          <div className=\"flex items-center justify-between\">"
          print "            <div className=\"flex items-center gap-3\">"
          print "              <div className=\"w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center\">"
          print "                <Brain className=\"w-5 h-5 text-white\" />"
          print "              </div>"
          print "              <div>"
          print "                <h1 className=\"text-xl font-bold text-gray-900\">Page Title</h1>"
          print "                <p className=\"text-sm text-gray-600\">Page description</p>"
          print "              </div>"
          print "            </div>"
          print "            <div className=\"flex items-center gap-2\">"
          print "              {/* Action buttons */}"
          print "            </div>"
          print "          </div>"
          print "        </div>"
          print "      </div>"
          next
        }
        { print }
      ' "$FILE" > "${FILE}.tmp"
      
      mv "${FILE}.tmp" "$FILE"
      
      echo "   ✅ Header added!"
      PROCESSED=$((PROCESSED + 1))
    else
      echo "   ⚠️  No return statement found"
      SKIPPED=$((SKIPPED + 1))
    fi
  fi
done < <(find app/\(dashboard\)/\(routes\)/teacher -name "*.tsx" -type f -print0)

echo ""
echo "======================================="
echo "🎉 Sticky Header Script Complete!"
echo "======================================="
echo ""
echo "📊 Results:"
echo "   ✅ Processed: $PROCESSED pages"
echo "   ⚠️  Skipped: $SKIPPED pages"
echo ""
echo "📝 Next Steps:"
echo "   1. Open each page and customize:"
echo "      - Replace <Brain> with page-specific icon"
echo "      - Update 'Page Title' with actual title"
echo "      - Add page description"
echo "      - Add action buttons"
echo "   2. Test each page in browser"
echo "   3. Verify responsive design"
echo ""
