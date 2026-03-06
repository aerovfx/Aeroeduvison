# Test Question Bank API - Hướng Dẫn

## Prerequisites

1. **Prisma Migration**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Login as Teacher**:
   - Go to http://localhost:3000/sign-in
   - Login with teacher account

---

## Test 1: Create Question

### Using cURL

```bash
curl -X POST http://localhost:3000/api/question-bank \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "content": "Giải phương trình: 2x + 5 = 13",
    "type": "TNKQ - Nhiều lựa chọn",
    "subject": "Toán học",
    "grade": "Khối 10",
    "difficulty": "Trung bình",
    "options": ["x = 4", "x = 5", "x = 6", "x = 7"],
    "correctAnswer": 0,
    "explanation": "Ta có: 2x + 5 = 13 => 2x = 8 => x = 4",
    "topic": "Phương trình bậc nhất",
    "keywords": ["phương trình", "bậc nhất", "đại số"],
    "learningObjectives": ["Hiểu cách giải phương trình bậc nhất"]
  }'
```

### Expected Response

```json
{
  "success": true,
  "question": {
    "id": "clx...",
    "content": "Giải phương trình: 2x + 5 = 13",
    "type": "MCQ",
    "subject": "Toán học",
    "grade": "Khối 10",
    "difficulty": "MEDIUM",
    "status": "Nháp",
    "createdAt": "2026-01-03T..."
  }
}
```

---

## Test 2: List Questions

### Using cURL

```bash
# List all questions
curl http://localhost:3000/api/question-bank \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Search questions
curl "http://localhost:3000/api/question-bank?search=phương%20trình" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Filter by status
curl "http://localhost:3000/api/question-bank?status=Đã%20duyệt" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Filter by type
curl "http://localhost:3000/api/question-bank?type=TNKQ%20-%20Nhiều%20lựa%20chọn" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Filter by subject
curl "http://localhost:3000/api/question-bank?subject=Toán%20học" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Filter by grade
curl "http://localhost:3000/api/question-bank?grade=Khối%2010" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Filter by difficulty
curl "http://localhost:3000/api/question-bank?difficulty=Trung%20bình" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Combined filters
curl "http://localhost:3000/api/question-bank?subject=Toán%20học&grade=Khối%2010&status=Đã%20duyệt" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Expected Response

```json
{
  "questions": [
    {
      "id": "clx...",
      "content": "...",
      "type": "MCQ",
      "subject": "Toán học",
      "grade": "Khối 10",
      "difficulty": "MEDIUM",
      "cognitiveLevel": "Hiểu cách giải phương trình bậc nhất",
      "status": "Nháp",
      "createdAt": "2026-01-03T...",
      "updatedAt": "2026-01-03T...",
      "createdBy": "user-id"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
```

---

## Test 3: Get Question Detail

### Using cURL

```bash
curl http://localhost:3000/api/question-bank/QUESTION_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Expected Response

```json
{
  "question": {
    "id": "clx...",
    "content": "Giải phương trình: 2x + 5 = 13",
    "type": "MCQ",
    "subject": "Toán học",
    "grade": "Khối 10",
    "difficulty": "MEDIUM",
    "topic": "Phương trình bậc nhất",
    "options": ["x = 4", "x = 5", "x = 6", "x = 7"],
    "correctAnswer": "0",
    "explanation": "Ta có: 2x + 5 = 13 => 2x = 8 => x = 4",
    "learningObjectives": ["Hiểu cách giải phương trình bậc nhất"],
    "keywords": ["phương trình", "bậc nhất", "đại số"],
    "tags": ["phương trình", "bậc nhất", "đại số"],
    "qualityScore": null,
    "status": "Nháp",
    "aiGenerated": false,
    "humanReviewed": false,
    "createdAt": "2026-01-03T...",
    "updatedAt": "2026-01-03T..."
  }
}
```

---

## Test 4: Delete Question

### Using cURL

```bash
curl -X DELETE http://localhost:3000/api/question-bank/QUESTION_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Expected Response

```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

---

## Test Using Browser DevTools

### 1. Open Browser Console

1. Go to http://localhost:3000/teacher/question-bank
2. Open DevTools (F12)
3. Go to Console tab

### 2. Test Create Question

```javascript
// Create a question
const response = await fetch('/api/question-bank', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Giải phương trình: 2x + 5 = 13',
    type: 'TNKQ - Nhiều lựa chọn',
    subject: 'Toán học',
    grade: 'Khối 10',
    difficulty: 'Trung bình',
    options: ['x = 4', 'x = 5', 'x = 6', 'x = 7'],
    correctAnswer: 0,
    explanation: 'Ta có: 2x + 5 = 13 => 2x = 8 => x = 4',
    topic: 'Phương trình bậc nhất',
    keywords: ['phương trình', 'bậc nhất'],
  })
});

const data = await response.json();
console.log('Created:', data);
```

### 3. Test List Questions

```javascript
// List questions
const response = await fetch('/api/question-bank');
const data = await response.json();
console.log('Questions:', data.questions);
console.log('Total:', data.total);
```

### 4. Test Search

```javascript
// Search questions
const response = await fetch('/api/question-bank?search=phương%20trình');
const data = await response.json();
console.log('Search results:', data);
```

---

## Common Issues

### Issue 1: "Database schema not synced"

**Error**:
```json
{
  "error": "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
  "code": "PRISMA_SCHEMA_NOT_SYNCED"
}
```

**Solution**:
```bash
npx prisma generate
npx prisma db push
```

### Issue 2: "Cannot read properties of undefined (reading 'findMany')"

**Error**: Question model not found in Prisma client

**Solution**:
```bash
npx prisma generate
```

### Issue 3: "Unauthorized"

**Error**: Not logged in or session expired

**Solution**: 
- Login again at http://localhost:3000/sign-in
- Check session token in cookies

---

## Expected Test Results

### ✅ Success Criteria

1. **Create Question**: Returns 200 with question object
2. **List Questions**: Returns array of questions with pagination
3. **Get Detail**: Returns full question details
4. **Delete Question**: Returns success message
5. **Search**: Returns filtered results
6. **Filters**: Work correctly (status, type, subject, grade, difficulty)

---

**Last Updated**: January 3, 2026
