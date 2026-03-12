#!/bin/bash
# Test script for question generation and database storage

echo "=== Testing Question Generation & Storage ==="
echo ""

# Test data - Generate 30 questions for Math Grade 6
RESPONSE=$(curl -s -X POST http://localhost:3100/api/questions/bulk-generate \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Toán",
    "grade": "Khối 6",
    "topics": [
      { "name": "Phân số", "questionCount": 10 },
      { "name": "Số thập phân", "questionCount": 10 },
      { "name": "Hình học cơ bản", "questionCount": 10 }
    ],
    "useAI": true
  }')

echo "Response:"
echo "$RESPONSE" | jq '.'

# Check if questions were saved
echo ""
echo "=== Verifying Database Storage ==="
echo ""

# Query to check saved questions (this would need DB access)
echo "Check your database with:"
echo "  SELECT COUNT(*), subject, grade, questionType FROM \"Question\" GROUP BY subject, grade, questionType;"
echo ""
echo "Or use Prisma Studio:"
echo "  npx prisma studio"
echo ""

# Extract stats from response
GENERATED=$(echo "$RESPONSE" | jq -r '.data.generated // 0')
echo "Questions generated: $GENERATED"

if [ "$GENERATED" -gt 0 ]; then
  echo "✅ Success! Questions should be saved in database."
else
  echo "❌ Failed to generate questions."
fi

echo ""
echo "=== Test Complete ==="
