#!/bin/bash
# Test script for bulk question generation

echo "=== Testing Bulk Question Generation API ==="
echo ""

# Test data
curl -X POST http://localhost:3100/api/questions/bulk-generate \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Toán",
    "grade": "Khối 6",
    "topics": [
      { "name": "Phân số", "questionCount": 30 },
      { "name": "Số thập phân", "questionCount": 30 },
      { "name": "Hình học cơ bản", "questionCount": 30 }
    ],
    "useAI": true
  }' | jq '.'

echo ""
echo "=== Test Complete ==="
