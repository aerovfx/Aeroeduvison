# Test Content Validation API - Hướng Dẫn

## Prerequisites

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Login as Teacher**:
   - Go to http://localhost:3000/sign-in
   - Login with teacher account

---

## Test 1: Validate a Lesson

### Using cURL

```bash
curl -X POST http://localhost:3000/api/content-generation/validate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "contentType": "lesson",
    "content": {
      "title": "Phương trình bậc nhất một ẩn",
      "objectives": [
        "Hiểu được khái niệm phương trình bậc nhất",
        "Biết cách giải phương trình bậc nhất",
        "Áp dụng vào giải bài toán thực tế"
      ],
      "content": "# Phương trình bậc nhất một ẩn\n\n## 1. Khái niệm\n\nPhương trình bậc nhất một ẩn có dạng: ax + b = 0 (với a ≠ 0)\n\nVí dụ: 2x + 5 = 13\n\n## 2. Cách giải\n\nBước 1: Chuyển số hạng tự do sang vế phải\n2x = 13 - 5\n2x = 8\n\nBước 2: Chia cả hai vế cho hệ số của x\nx = 8 / 2\nx = 4",
      "keyPoints": [
        "Dạng tổng quát: ax + b = 0",
        "Cách giải: chuyển vế và chia",
        "Ứng dụng trong thực tế"
      ],
      "exercises": [
        "Giải phương trình: 3x - 7 = 14",
        "Giải phương trình: 5x + 10 = 0"
      ],
      "summary": "Phương trình bậc nhất là nền tảng của đại số",
      "duration": 45,
      "difficulty": "medium",
      "grade": "Khối 10",
      "subject": "Toán học"
    },
    "context": {
      "subject": "Toán học",
      "grade": "Khối 10",
      "topic": "Phương trình bậc nhất",
      "curriculum": "Vietnam GDPT 2018"
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "validation": {
    "passed": true,
    "canPublish": true,
    "overallScore": 85,
    "dimensions": {
      "accuracy": 100,
      "completeness": 90,
      "clarity": 85,
      "engagement": 80,
      "appropriateness": 100,
      "curriculumCompliance": 100,
      "biasFree": 100
    },
    "curriculumCompliance": {
      "aligned": true,
      "score": 100,
      "issues": []
    },
    "biasDetection": {
      "detected": false,
      "types": [],
      "severity": "low",
      "recommendations": []
    },
    "readability": {
      "score": 75,
      "level": "medium",
      "avgSentenceLength": 12,
      "avgWordsPerSentence": 15,
      "gradeLevel": "Khối 10"
    },
    "issues": [],
    "warnings": [],
    "errors": [],
    "recommendations": []
  }
}
```

---

## Test 2: Validate a Quiz

### Using cURL

```bash
curl -X POST http://localhost:3000/api/content-generation/validate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "contentType": "quiz",
    "content": {
      "title": "Quiz về phương trình bậc nhất",
      "questions": [
        {
          "question": "Phương trình nào sau đây là phương trình bậc nhất?",
          "type": "MCQ",
          "options": [
            "x² + 2x = 0",
            "2x + 5 = 13",
            "3x² - 1 = 0",
            "x³ + x = 5"
          ],
          "correctAnswer": 1,
          "explanation": "Phương trình bậc nhất có dạng ax + b = 0",
          "difficulty": "easy",
          "tags": ["phương trình", "bậc nhất"]
        },
        {
          "question": "Giải phương trình: 3x - 7 = 14",
          "type": "MCQ",
          "options": ["x = 5", "x = 6", "x = 7", "x = 8"],
          "correctAnswer": 2,
          "explanation": "3x - 7 = 14 => 3x = 21 => x = 7",
          "difficulty": "medium",
          "tags": ["giải phương trình"]
        }
      ],
      "metadata": {
        "subject": "Toán học",
        "grade": "Khối 10",
        "topic": "Phương trình bậc nhất"
      }
    },
    "context": {
      "subject": "Toán học",
      "grade": "Khối 10",
      "topic": "Phương trình bậc nhất"
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "validation": {
    "passed": true,
    "canPublish": false,
    "overallScore": 65,
    "dimensions": {
      "accuracy": 100,
      "completeness": 60,
      "clarity": 100,
      "engagement": 100,
      "appropriateness": 100
    },
    "issues": [
      {
        "type": "completeness",
        "severity": "high",
        "message": "Too few questions (2/10 recommended)"
      }
    ],
    "warnings": [],
    "errors": ["Too few questions (2/10 recommended)"],
    "recommendations": [
      "Add more comprehensive content to cover all key points"
    ]
  }
}
```

---

## Test 3: Validate Slides

### Using cURL

```bash
curl -X POST http://localhost:3000/api/content-generation/validate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "contentType": "slides",
    "content": {
      "title": "Phương trình bậc nhất",
      "slides": [
        {
          "title": "Khái niệm",
          "content": "• Phương trình bậc nhất có dạng ax + b = 0\n• Với a ≠ 0\n• Ví dụ: 2x + 5 = 13",
          "speakerNotes": "Giới thiệu khái niệm cơ bản"
        },
        {
          "title": "Cách giải",
          "content": "• Bước 1: Chuyển vế\n• Bước 2: Chia cho hệ số\n• Ví dụ: 2x = 8 => x = 4",
          "speakerNotes": "Hướng dẫn từng bước giải"
        }
      ]
    },
    "context": {
      "subject": "Toán học",
      "grade": "Khối 10",
      "topic": "Phương trình bậc nhất"
    }
  }'
```

---

## Test Using Browser DevTools

### 1. Open Browser Console

1. Go to http://localhost:3000/teacher/dashboard
2. Open DevTools (F12)
3. Go to Console tab

### 2. Test Lesson Validation

```javascript
// Validate a lesson
const testLesson = {
  title: 'Phương trình bậc nhất một ẩn',
  objectives: [
    'Hiểu được khái niệm phương trình bậc nhất',
    'Biết cách giải phương trình bậc nhất',
  ],
  content: '# Phương trình bậc nhất\n\nPhương trình bậc nhất có dạng: ax + b = 0\n\nVí dụ: 2x + 5 = 13',
  keyPoints: ['Dạng tổng quát: ax + b = 0'],
  exercises: ['Giải phương trình: 3x - 7 = 14'],
  summary: 'Tóm tắt bài học',
  duration: 45,
  difficulty: 'medium',
  grade: 'Khối 10',
  subject: 'Toán học',
};

const response = await fetch('/api/content-generation/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contentType: 'lesson',
    content: testLesson,
    context: {
      subject: 'Toán học',
      grade: 'Khối 10',
      topic: 'Phương trình bậc nhất',
      curriculum: 'Vietnam GDPT 2018',
    },
  }),
});

const data = await response.json();
console.log('Validation Result:', data);
console.log('Overall Score:', data.validation.overallScore);
console.log('Can Publish:', data.validation.canPublish);
console.log('Curriculum Aligned:', data.validation.curriculumCompliance.aligned);
console.log('Bias Detected:', data.validation.biasDetection.detected);
console.log('Readability:', data.validation.readability);
```

### 3. Test Quiz Validation

```javascript
// Validate a quiz
const testQuiz = {
  title: 'Quiz về phương trình',
  questions: [
    {
      question: 'Phương trình nào là bậc nhất?',
      type: 'MCQ',
      options: ['x² + 2x = 0', '2x + 5 = 13', '3x² - 1 = 0'],
      correctAnswer: 1,
      explanation: 'Phương trình bậc nhất có dạng ax + b = 0',
      difficulty: 'easy',
      tags: ['phương trình'],
    },
  ],
  metadata: {
    subject: 'Toán học',
    grade: 'Khối 10',
    topic: 'Phương trình bậc nhất',
  },
};

const response = await fetch('/api/content-generation/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contentType: 'quiz',
    content: testQuiz,
    context: {
      subject: 'Toán học',
      grade: 'Khối 10',
      topic: 'Phương trình bậc nhất',
    },
  }),
});

const data = await response.json();
console.log('Quiz Validation:', data);
```

---

## Validation Score Interpretation

### Overall Score Ranges

| Score | Quality | Can Publish | Action |
|-------|---------|-------------|--------|
| 90-100 | Excellent | ✅ Yes | Publish immediately |
| 80-89 | Good | ✅ Yes | Minor improvements recommended |
| 70-79 | Acceptable | ⚠️ Review | Address recommendations |
| 60-69 | Needs Work | ❌ No | Fix issues before publishing |
| < 60 | Poor | ❌ No | Major revision required |

### Dimension Scores

Each dimension is scored 0-100:
- **Accuracy**: Factual correctness
- **Completeness**: Required sections present
- **Clarity**: Readability and understandability
- **Engagement**: Examples and interactivity
- **Appropriateness**: Age-appropriate content
- **Curriculum Compliance**: GDPT 2018 alignment
- **Bias-Free**: No detected bias

### Publishability Criteria

Content can be published if:
- ✅ Overall score >= 70
- ✅ No high-severity errors
- ✅ Curriculum compliance aligned (score >= 80)
- ✅ No high-severity bias detected

---

## Common Issues

### Issue 1: "Unauthorized"

**Error**: Not logged in

**Solution**: Login at http://localhost:3000/sign-in

### Issue 2: "Forbidden: Only teachers and admins can validate content"

**Error**: User role is not TEACHER or ADMIN

**Solution**: Use teacher or admin account

### Issue 3: "Missing required fields"

**Error**: Missing contentType, content, or context

**Solution**: Ensure all required fields are provided

---

## Expected Test Results

### ✅ Success Criteria

1. **Lesson Validation**: Returns validation result with 7 dimensions
2. **Quiz Validation**: Returns validation with question-specific checks
3. **Slides Validation**: Returns validation with slide-specific checks
4. **Curriculum Compliance**: Checks GDPT 2018 alignment
5. **Bias Detection**: Detects gender, cultural, socioeconomic, regional bias
6. **Readability**: Provides detailed readability information
7. **Publishability**: Correctly determines if content can be published

---

**Last Updated**: January 3, 2026
