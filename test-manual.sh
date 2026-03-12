#!/bin/bash

# Manual Testing Guide for Phase 3 Priority 1 & 2
# Aeroeduvison - March 7, 2026
#
# This script provides reusable curl commands for testing
# Usage: Copy-paste individual commands into terminal
# Prerequisites: App running on localhost:3000, authenticated session

echo "═════════════════════════════════════════════════"
echo "Phase 3 Testing - Manual curl Commands"
echo "═════════════════════════════════════════════════"
echo ""

# Configuration
BASE_URL="http://localhost:3000"
# Get your token from browser cookies: _verificationToken or similar
# Or get from login: POST /api/auth/signin
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"  # REPLACE THIS
USER_ID="user-123"  # REPLACE WITH YOUR USER ID

echo "📋 Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Auth Token: ${AUTH_TOKEN:0:20}..."
echo ""

# ═══════════════════════════════════════════════════════
# PART 1: KNOWLEDGE GRAPH TESTING
# ═══════════════════════════════════════════════════════

echo "═══ PART 1: KNOWLEDGE GRAPH TESTING ═══"
echo ""

echo "1️⃣  Test Semantic Search (GET /api/kg/search)"
echo "Command:"
cat << 'EOF'
curl -X GET "http://localhost:3000/api/kg/search/trending?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
EOF
echo ""

echo "2️⃣  Find Similar Concepts (GET /api/kg/search/similar)"
echo "Command:"
cat << 'EOF'
curl -X GET "http://localhost:3000/api/kg/search/similar?conceptId=kg-001&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
EOF
echo ""

echo "3️⃣  Get Learning Recommendations (GET /api/kg/search/recommendations)"
echo "Command:"
cat << 'EOF'
curl -X GET "http://localhost:3000/api/kg/search/recommendations?conceptId=kg-002&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
EOF
echo ""

echo "4️⃣  Cross-Subject Search (GET /api/kg/search/cross-subject)"
echo "Command:"
cat << 'EOF'
curl -X GET "http://localhost:3000/api/kg/search/cross-subject?q=logarithm&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
EOF
echo ""

# ═══════════════════════════════════════════════════════
# PART 2: GRADING SYSTEM TESTING
# ═══════════════════════════════════════════════════════

echo "═══ PART 2: GRADING SYSTEM TESTING ═══"
echo ""

echo "1️⃣  CREATE A RUBRIC (POST /api/grading/grade action=create-rubric)"
echo "Command:"
cat << 'EOF'
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "create-rubric",
    "name": "Math Essay - Logarithms Grade 11",
    "subject": "math",
    "grade": "11",
    "description": "Rubric for grading logarithm essays",
    "criteria": [
      {
        "criterion": "Hiểu Khái Niệm",
        "description": "Học sinh hiểu rõ khái niệm logarit",
        "maxPoints": 25,
        "weight": 1
      },
      {
        "criterion": "Giải Thích & Ví Dụ",
        "description": "Giải thích chính xác với ví dụ cụ thể",
        "maxPoints": 25,
        "weight": 1
      },
      {
        "criterion": "Tính Toán Chính Xác",
        "description": "Các phép tính logarit chính xác",
        "maxPoints": 25,
        "weight": 1
      },
      {
        "criterion": "Cấu Trúc & Trình Bày",
        "description": "Bài viết có cấu trúc logic, dễ hiểu",
        "maxPoints": 25,
        "weight": 1
      }
    ],
    "maxScore": 100,
    "minPassingScore": 60
  }'
EOF
echo ""
echo "⚠️  SAVE THE RUBRIC ID FROM RESPONSE FOR NEXT STEPS"
echo "Example response: { rubric: { id: 'rubric-xyz123', ... } }"
echo ""

echo "2️⃣  SUBMIT AN ESSAY (POST /api/grading/grade action=submit)"
# Use rubric ID from step 1
RUBRIC_ID="<REPLACE-WITH-RUBRIC-ID-FROM-STEP-1>"
cat << EOF
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "submit",
    "rubricId": "$RUBRIC_ID",
    "title": "Bài viết về Logarit",
    "content": "Logarit là một khái niệm toán học rất quan trọng trong đại số. Logarit là phép toán ngược của lũy thừa. Nếu a^y = x thì log_a(x) = y. Ví dụ, nếu 2^3 = 8 thì log_2(8) = 3. Người ta sử dụng logarit để giải các phương trình mũ. Các tính chất quan trọng của logarit bao gồm: log_a(xy) = log_a(x) + log_a(y) và log_a(x/y) = log_a(x) - log_a(y). Logarit tự nhiên (ln) có cơ số e ≈ 2.718. Ứng dụng của logarit rất rộng trong khoa học, kỹ thuật, tài chính. Logarit giúp xử lý các số rất lớn hoặc rất bé.",
    "subject": "math"
  }'
EOF
echo ""
echo "⚠️  SAVE THE SUBMISSION ID FROM RESPONSE"
echo "Example response: { submissionId: 'sub-abc456', status: 'pending' }"
echo ""

echo "3️⃣  POLL FOR GRADING RESULTS (POST /api/grading/grade action=get-results)"
echo "⏳ Wait ~30 seconds, then run this command repeatedly until you get results"
SUBMISSION_ID="<REPLACE-WITH-SUBMISSION-ID-FROM-STEP-2>"
cat << EOF
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "get-results",
    "submissionId": "$SUBMISSION_ID"
  }'
EOF
echo ""
echo "✅ If you get HTTP 204 (No Content), grading is still in progress, retry in 5-10 seconds"
echo "✅ When done, response will include: grade { finalScore, percentage, feedback, ... }"
echo ""

echo "4️⃣  VIEW ALL SUBMISSIONS FOR RUBRIC (GET /api/grading/grade action=submissions)"
cat << EOF
curl -X GET "http://localhost:3000/api/grading/grade?action=submissions&rubricId=$RUBRIC_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
EOF
echo ""

echo "5️⃣  VIEW RUBRIC ANALYTICS (GET /api/grading/grade action=analytics)"
cat << EOF
curl -X GET "http://localhost:3000/api/grading/grade?action=analytics&rubricId=$RUBRIC_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
EOF
echo ""

echo "6️⃣  VIEW RUBRIC DETAILS (GET /api/grading/grade action=rubric)"
cat << EOF
curl -X GET "http://localhost:3000/api/grading/grade?action=rubric&rubricId=$RUBRIC_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
EOF
echo ""

echo "7️⃣  TEACHER REVIEW GRADE (POST /api/grading/grade action=review) [Optional]"
GRADE_ID="<REPLACE-WITH-GRADE-ID-FROM-RESULTS>"
cat << EOF
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -d '{
    "action": "review",
    "gradeId": "$GRADE_ID",
    "adjustedScore": 85,
    "notes": "Very good work, I bumped the score up by 3 points for detailed explanations"
  }'
EOF
echo ""

# ═══════════════════════════════════════════════════════
# PART 3: DATABASE VERIFICATION
# ═══════════════════════════════════════════════════════

echo "═══ PART 3: DATABASE VERIFICATION ═══"
echo ""

echo "SQL Commands to verify data in PostgreSQL:"
echo ""

cat << 'EOF'
# Connect to database
psql $DATABASE_URL

# Count knowledge graph concepts
SELECT COUNT(*) as concept_count FROM "KgConcept";
SELECT name, subject, grade, difficulty FROM "KgConcept" ORDER BY "createdAt" DESC LIMIT 5;

# Count relationships
SELECT COUNT(*) as relationship_count FROM "KgRelationship";
SELECT COUNT(*) as type_prerequisite FROM "KgRelationship" WHERE type = 'prerequisite';

# Check grading rubrics
SELECT COUNT(*) as rubric_count FROM "GradingRubric";
SELECT name, subject, grade, "maxScore" FROM "GradingRubric" ORDER BY "createdAt" DESC;

# Check student submissions
SELECT COUNT(*) as submission_count FROM "StudentSubmission";
SELECT id, status, "submittedAt" FROM "StudentSubmission" ORDER BY "submittedAt" DESC LIMIT 5;

# Check grades
SELECT COUNT(*) as grade_count FROM "SubmissionGrade";
SELECT "finalScore", percentage, status, "gradedAt" FROM "SubmissionGrade" ORDER BY "gradedAt" DESC LIMIT 5;

# Check analytics
SELECT "rubricId", "totalSubmissions", "avgScore", "passRate" FROM "GradingAnalytics";
EOF
echo ""

# ═══════════════════════════════════════════════════════
# PART 4: FRONTEND UI TESTING
# ═══════════════════════════════════════════════════════

echo "═══ PART 4: FRONTEND UI TESTING ═══"
echo ""

echo "Manual browser testing:"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Open browser: http://localhost:3000"
echo ""
echo "3. If essay grader is integrated in dashboard:"
echo "   a) Navigate to Dashboard or Grading section"
echo "   b) Select 'Essay Grader' component"
echo "   c) Choose a rubric from dropdown"
echo "   d) Type an essay (>50 chars)"
echo "   e) Click 'Nộp & Chấm Điểm' button"
echo "   f) Wait for loading animation"
echo ""
echo "4. Verify results display:"
echo "   ✅ Score card (large, color-coded)"
echo "   ✅ Status badge (✓ Đạt, ⚠ Cần cải thiện, ✗ Chưa đạt)"
echo "   ✅ Criterion-specific scores"
echo "   ✅ Strengths (green boxes)"
echo "   ✅ Improvements (yellow boxes)"
echo "   ✅ Grammar issues (red boxes)"
echo "   ✅ Concept errors (red boxes)"
echo "   ✅ Recommended concepts (blue tags)"
echo "   ✅ Confidence score (progress bar)"
echo ""
echo "5. Try validation:"
echo "   a) Try to submit essay with <50 characters"
echo "   b) Should see error message"
echo "   c) Add more text, error should clear"
echo ""
echo "6. Try submitting multiple essays:"
echo "   a) After first grading, click 'Nộp Bài Khác'"
echo "   b) Form should reset"
echo "   c) Can submit another essay"
echo ""

# ═══════════════════════════════════════════════════════
# PART 5: TROUBLESHOOTING
# ═══════════════════════════════════════════════════════

echo "═══ PART 5: TROUBLESHOOTING ═══"
echo ""

echo "Issue: 'Unauthorized' error"
echo "Solution: Replace YOUR_TOKEN with actual token from:"
echo "  1. Browser DevTools → Application → Cookies"
echo "  2. Look for: sessionId, _auth_token, or similar"
echo "  3. Or login and capture from response"
echo ""

echo "Issue: 'POST /api/grading/grade 400 Bad Request'"
echo "Solution:"
echo "  1. Check JSON formatting (valid syntax)"
echo "  2. Make sure all required fields present"
echo "  3. Rubric ID must exist"
echo "  4. Essay must be >50 chars"
echo ""

echo "Issue: 'Grading timeout' or no results"
echo "Solution:"
echo "  1. Check if LLM (Ollama) is running: curl http://localhost:11434/api/tags"
echo "  2. If not, start: ollama serve"
echo "  3. Check database connection"
echo "  4. Check server logs for errors"
echo ""

echo "Issue: 'CORS error'"
echo "Solution:"
echo "  1. Make sure request includes proper headers"
echo "  2. Use localhost, not 127.0.0.1"
echo "  3. Check CORS settings in route handler"
echo ""

echo ""
echo "═════════════════════════════════════════════════"
echo "Testing Guide Complete!"
echo "═════════════════════════════════════════════════"
echo ""
echo "Next Steps:"
echo "  1. Replace YOUR_TOKEN with actual token"
echo "  2. Copy-paste commands one by one"
echo "  3. Document results in TESTING_GUIDE.md"
echo "  4. Report any issues found"
echo ""
