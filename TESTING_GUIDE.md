# Phase 3 Testing & Validation Guide

**Status**: Ready for Manual Testing  
**Created**: March 7, 2026  

---

## 🎯 Testing Objectives

1. ✅ Verify Knowledge Graph (KG) seed data can be created
2. ✅ Test Grading API endpoints
3. ✅ Validate end-to-end workflow (essay submission → grading → results)
4. ✅ Confirm database integration
5. ✅ Verify UI components function correctly with real data

---

## Part 1: Knowledge Graph (KG) Testing

### 1.1 Database Verification

**Check if KG tables exist**:
```bash
$DATABASE_URL = your-postgresql-connection-string

# Connect to database
psql $DATABASE_URL

# List KG tables
\dt kg_concept kg_relationship learning_objective concept_search_cache
```

**Expected Output**:
```
                    List of relations
 Schema |        Name         | Type  |  Owner   
--------+---------------------+-------+----------
 public | kg_concept          | table | postgres
 public | kg_relationship     | table | postgres
 public | learning_objective  | table | postgres
 public | concept_search_cache| table | postgres
(4 rows)
```

### 1.2 Seed Data Creation

**Quick seed via SQL** (if KG seed script fails):

```sql
-- Connect to your database first with: psql $DATABASE_URL

-- Create sample concepts
INSERT INTO "KgConcept" (id, name, description, subject, grade, difficulty, "examples", "keyPoints", "relatedTopics")
VALUES 
  ('kg-001', 'Số Nguyên', 'Khái niệm về tập hợp số nguyên', 'math', '9', 'easy', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]),
  ('kg-002', 'Phương Trình Bậc Nhất', 'Phương trình có bậc 1 với một ẩn', 'math', '9', 'medium', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]),
  ('kg-003', 'Phương Trình Bậc Hai', 'Phương trình có dạng ax² + bx + c = 0', 'math', '10', 'hard', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]),
  ('kg-004', 'Hàm Số Bậc Hai', 'Hàm số có biểu thức y = ax² + bx + c', 'math', '10', 'hard', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]),
  ('kg-005', 'Căn Bậc Hai', 'Phép toán ngược của bình phương', 'math', '9', 'medium', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]),
  ('kg-006', 'Logarit', 'Phép toán ngược của phép lũy thừa', 'math', '11', 'hard', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]);

-- Create sample relationships (prerequisites)
INSERT INTO "KgRelationship" (id, "sourceId", "targetId", type, strength, description)
VALUES 
  ('rel-001', 'kg-001', 'kg-002', 'prerequisite', 0.9, 'Hiểu số nguyên là bắt buộc để giải phương trình bậc nhất'),
  ('rel-002', 'kg-002', 'kg-003', 'prerequisite', 0.85, 'Phương trình bậc nhất là bước chuẩn bị cho phương trình bậc hai'),
  ('rel-003', 'kg-004', 'kg-003', 'related', 0.8, 'Hàm số bậc hai liên quan đến phương trình bậc hai'),
  ('rel-004', 'kg-005', 'kg-003', 'related', 0.75, 'Căn bậc hai được sử dụng trong công thức của phương trình bậc hai'),
  ('rel-005', 'kg-003', 'kg-006', 'prerequisite', 0.7, 'Hiểu phương trình mũ là cơ sở cho logarit');

-- Verify
SELECT id, name, subject, grade, difficulty FROM "KgConcept" ORDER BY "createdAt";
SELECT COUNT(*) as concept_count FROM "KgConcept";
SELECT COUNT(*) as relationship_count FROM "KgRelationship";
```

### 1.3 Semantic Search Test

**Test the semantic search endpoint manually**:

```bash
# 1. Start the app (if not running)
npm run dev

# 2. In another terminal, test the search API
# Search for concepts by name/description
curl -X POST http://localhost:3000/api/kg/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "phương trình",
    "mode": "semantic",
    "subject": "math",
    "filters": {
      "grade": ["9", "10"],
      "difficulty": ["medium", "hard"]
    }
  }'

# Expected Response:
# {
#   "success": true,
#   "results": [
#     {
#       "id": "kg-002",
#       "name": "Phương Trình Bậc Nhất",
#       "similarity": 0.94,  
#       "subject": "math",
#       "grade": "9"
#     },
#     {
#       "id": "kg-003",
#       "name": "Phương Trình Bậc Hai",
#       "similarity": 0.91,
#       "subject": "math",
#       "grade": "10"
#     }
#   ],
#   "count": 2
# }
```

---

## Part 2: Advanced Grading (Essay Grading) Testing

### 2.1 Database Verification

**Check grading tables exist**:

```bash
psql $DATABASE_URL

# List grading tables
\dt grading_rubric rubric_criterion student_submission submission_grade grading_analytics
```

**Expected Output**:
```
                    List of relations
 Schema |           Name            | Type  |  Owner   
--------+---------------------------+-------+----------
 public | grading_rubric            | table | postgres
 public | rubric_criterion           | table | postgres
 public | student_submission         | table | postgres
 public | submission_grade           | table | postgres
 public | grading_analytics          | table | postgres
(5 rows)
```

### 2.2 Create a Test Rubric

**Using the API**:

```bash
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "create-rubric",
    "name": "Math Essay - Logarithms",
    "subject": "math",
    "grade": "11",
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

# Response should include rubricId
# {
#   "success": true,
#   "rubric": {
#     "id": "rubric-xyz123",
#     "name": "Math Essay - Logarithms",
#     "criteria": [...]
#   }
# }
```

**Save the `rubricId` for next steps!**

### 2.3 Submit an Essay for Grading

```bash
# Save rubricId from previous step
RUBRIC_ID="<rubric-id-from-previous-response>"

# Submit essay
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "submit",
    "rubricId": "'$RUBRIC_ID'",
    "title": "Bài viết về Logarit",
    "content": "Logarit là một khái niệm toán học rất quan trọng trong đại số. Logarit là phép toán ngược của lũy thừa. Nếu a^y = x thì log_a(x) = y. Ví dụ, nếu 2^3 = 8 thì log_2(8) = 3. Người ta sử dụng logarit để giải các phương trình mũ. Các tính chất quan trọng của logarit bao gồm: log_a(xy) = log_a(x) + log_a(y) và log_a(x/y) = log_a(x) - log_a(y). Logarit tự nhiên (ln) có cơ số e ≈ 2.718. Ứng dụng của logarit rất rộng: trong khoa học, kỹ thuật, tài chính. Một vài ứng dụng quan trọng là đo độ acid-base (pH), đo độ lớn của trận động đất (thang Richter), và tài chính (lãi suất). Logarit giúp chúng ta xử lý các số rất lớn hoặc rất bé một cách dễ dàng. Kết luận, logarit là một công cụ mạnh mẽ trong toán học.",
    "subject": "math",
    "sessionId": "session-123"
  }'

# Response:
# {
#   "success": true,
#   "message": "Submission received for grading",
#   "submissionId": "sub-abc456",
#   "status": "pending"
# }
```

**Save the `submissionId` for polling!**

### 2.4 Poll for Grading Results

```bash
# Save submissionId from previous step
SUBMISSION_ID="<submission-id-from-previous-response>"

# Poll for results (wait ~30 seconds for grading)
# Keep calling this until you get a result (not 204)
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "get-results",
    "submissionId": "'$SUBMISSION_ID'"
  }'

# If grading is still in progress: HTTP 204 (No Content)
#
# When ready, you'll get:
# {
#   "success": true,
#   "grade": {
#     "id": "grade-xyz789",
#     "finalScore": 82,
#     "percentage": 82,
#     "maxScore": 100,
#     "status": "pass",
#     "feedback": "Bài viết của em rất tốt! Em đã hiểu rõ khái niệm logarit...",
#     "criterionScores": {
#       "criterion-1": 23,
#       "criterion-2": 22,
#       "criterion-3": 19,
#       "criterion-4": 18
#     },
#     "criterionFeedback": {
#       "criterion-1": "Rất tốt! Em giải thích rõ ràng...",
#       "criterion-2": "Ví dụ cụ thể và dễ hiểu...",
#       "criterion-3": "Có một lỗi nhỏ...",
#       "criterion-4": "Cấu trúc tốt..."
#     },
#     "strengths": [
#       "Hiểu sâu về mối quan hệ logarit-lũy thừa",
#       "Giải thích rõ ràng với ví dụ cụ thể"
#     ],
#     "improvements": [
#       "Cần giải thích thêm về ứng dụng",
#       "Nhập nhằng một chút về cơ số"
#     ],
#     "grammarIssues": [
#       "Typo: 'Em đã hiểu' nên là 'Em hiểu'"
#     ],
#     "conceptErrors": [
#       "Nhầm lẫn giữa log tự nhiên và log cơ số 10"
#     ],
#     "recommendedConcepts": [
#       "kg-003",
#       "kg-004"
#     ],
#     "confidenceScore": 0.87,
#     "gradedAt": "2026-03-07T10:30:00Z"
#   }
# }
```

### 2.5 View Analytics

```bash
# View grading statistics for the rubric
curl -X GET "http://localhost:3000/api/grading/grade?action=analytics&rubricId=$RUBRIC_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "analytics": {
#     "rubricId": "rubric-xyz123",
#     "totalSubmissions": 1,
#     "avgScore": 82,
#     "stdDeviation": 0,
#     "passRate": 100,
#     "commonMistakes": [
#       "Nhầm lẫn giữa cơ số"
#     ],
#     "topStrengths": [
#       "Hiểu khái niệm rõ ràng"
#     ]
#   }
# }
```

---

## Part 3: Integration Testing

### 3.1 End-to-End Workflow

**Complete flow in sequence**:

1. ✅ Create rubric (see 2.2)
2. ✅ Submit essay (see 2.3)
3. ✅ Poll for results (see 2.4)
4. ✅ Review grade (optional, see below)
5. ✅ View analytics (see 2.5)

### 3.2 Human Review Workflow

```bash
# Teacher reviews and potentially adjusts AI grade
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -d '{
    "action": "review",
    "gradeId": "grade-xyz789",
    "adjustedScore": 85,
    "notes": "Bài viết tốt, tôi nâng điểm 3 điểm vì giải thích rất chi tiết"
  }'

# Response:
# {
#   "success": true,
#   "grade": {
#     "id": "grade-xyz789",
#     "finalScore": 85,
#     "isHumanReviewed": true,
#     "reviewedBy": "teacher-123",
#     "reviewNotes": "Bài viết tốt..."
#   }
# }
```

### 3.3 Check Submission History

```bash
# Get all submissions for a rubric
curl -X GET "http://localhost:3000/api/grading/grade?action=submissions&rubricId=$RUBRIC_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "submissions": [
#     {
#       "id": "sub-abc456",
#       "userId": "user-123",
#       "title": "Bài viết về Logarit",
#       "submittedAt": "2026-03-07T10:20:00Z",
#       "status": "graded",
#       "grade": {
#         "finalScore": 82,
#         "status": "pass"
#       }
#     }
#   ],
#   "count": 1
# }
```

---

## Part 4: Frontend UI Testing

### 4.1 Manual UI Testing

**Setup**:
```bash
# 1. Start dev server
npm run dev

# 2. Open browser to http://localhost:3000
# 3. Navigate to essay grader component (if integrated in dashboard)
```

**Test Scenarios**:

#### Scenario A: Happy Path
```
1. Select a rubric from dropdown
2. Type an essay (50+ characters)
3. Click "Nộp & Chấm Điểm" (Submit)
4. Wait for loading indicator
5. ✅ See score card with:
   - Green badge for passing score
   - Color-coded criterion scores
   - Strengths (green)
   - Improvements (yellow)
   - Issues (red)
6. ✅ Can see recommended concepts
7. ✅ Can submit another essay
```

#### Scenario B: Validation Error
```
1. Try to submit with <50 characters
2. ✅ See error: "Bài viết phải có ít nhất 50 ký tự"
3. ✅ Submit button stays disabled
4. Type more text
5. ✅ Error clears, button enables
```

#### Scenario C: Failed Grading
```
1. If LLM is unavailable, should see:
   ✅ Clear error message
   ✅ Option to retry
   ✅ Can go back to form
```

---

## Part 5: Troubleshooting

### Issue: "Cannot find module '@/lib/prisma'"
**Solution**: Created `/lib/prisma.ts` - this was missing

### Issue: KG seed script doesn't run
**Solution**: Manual SQL inserts (see 2.2)

### Issue: Grading takes >90 seconds
**Solution**: Check if LLM (Ollama) is running:
```bash
# Check if Ollama is available
curl http://localhost:11434/api/tags

# Or start Ollama
ollama serve
```

### Issue: Can't authenticate API calls
**Solution**: Get authentication token:
```bash
# Get session from NextAuth cookies or login
# Add Authorization header: Bearer $TOKEN
```

---

## Part 6: Validation Checklist

### Knowledge Graph
- [ ] KG tables created in PostgreSQL
- [ ] Sample concepts seeded (6+ concepts)
- [ ] Relationships created (5+ relationships)
- [ ] Semantic search returns results
- [ ] Concept details display correctly
- [ ] Filtering works (by subject, grade, difficulty)

### Advanced Grading
- [ ] Grading tables created
- [ ] Rubric created successfully
- [ ] Essay submission accepted
- [ ] Grading completes within 90 seconds
- [ ] Results displayed accurately
- [ ] Feedback sections show both Vietnamese and scores
- [ ] Recommended concepts linked
- [ ] Human review works
- [ ] Analytics calculated correctly

### Integration
- [ ] UI renders without errors
- [ ] Forms submit correctly
- [ ] Polling mechanism works (2s intervals)
- [ ] Results display formatted properly
- [ ] Error handling graceful
- [ ] Vietnamese text displays correctly

### Performance
- [ ] Page loads in <3s
- [ ] Grading completes in ~30-60s
- [ ] Analytics query <2s
- [ ] No memory leaks on polling
- [ ] Database queries optimized

---

## 📊 Test Summary Template

Use this to document your testing:

```
═════════════════════════════════════════════════════════
Testing Summary - Phase 3 Priority 1 & 2
═════════════════════════════════════════════════════════

Date: 2026-03-07
Tester: [Your Name]

KNOWLEDGE GRAPH (Priority 1):
✅/❌ KG tables created
✅/❌ Sample data seeded  
✅/❌ Search API working
✅/❌ UI rendering correctly
Notes: ..................

GRADING SYSTEM (Priority 2):
✅/❌ Rubric created
✅/❌ Essay submitted
✅/❌ LLM grading completed
✅/❌ Results accurate
✅/❌ Feedback extracted
Notes: ..................

INTEGRATION:
✅/❌ End-to-end workflow
✅/❌ Error handling
✅/❌ Performance acceptable
Notes: ..................

ISSUES FOUND:
1. [Issue description]
   Status: Open/Resolved
   
COMPLETION:
Date Completed: YYYY-MM-DD
Tester Signature: _____________
```

---

## 🚀 Next Steps After Testing

**If all tests pass**:
1. ✅ Mark Priority 1 & 2 as validated
2. Move to Priority 3: Security Guardrails
3. Deploy to staging environment
4. Run load testing

**If issues found**:
1. Document in GitHub Issues
2. Create fix branch
3. Run regression testing
4. Re-test before moving forward

---

**Version**: 1.0  
**Last Updated**: March 7, 2026  
**Status**: Ready for Testing ✅
