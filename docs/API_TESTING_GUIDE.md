# API Testing Guide - Question Bank & Content Validation

## Quick Start

### 1. Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (if database is accessible)
npx prisma db push
```

### 2. Start Server

```bash
npm run dev
```

### 3. Login

1. Go to http://localhost:3000/sign-in
2. Login with teacher account
3. Copy session token from browser cookies (DevTools → Application → Cookies)

---

## Test Question Bank API

### Test 1: Create Question

**Endpoint**: `POST /api/question-bank`

**Browser Console**:
```javascript
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
  }),
});

const data = await response.json();
console.log('Created:', data);
```

**Expected**: `{ success: true, question: {...} }`

### Test 2: List Questions

**Browser Console**:
```javascript
const response = await fetch('/api/question-bank');
const data = await response.json();
console.log('Questions:', data.questions);
console.log('Total:', data.total);
```

**Expected**: Array of questions with pagination info

### Test 3: Search Questions

**Browser Console**:
```javascript
const response = await fetch('/api/question-bank?search=phương%20trình&subject=Toán%20học');
const data = await response.json();
console.log('Search results:', data);
```

---

## Test Content Validation API

### Test 1: Validate Lesson

**Browser Console**:
```javascript
const lesson = {
  title: 'Phương trình bậc nhất',
  objectives: ['Hiểu khái niệm', 'Biết cách giải'],
  content: '# Phương trình bậc nhất\n\nCó dạng ax + b = 0',
  keyPoints: ['Dạng tổng quát'],
  exercises: ['Giải: 2x + 5 = 13'],
  summary: 'Tóm tắt',
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
    content: lesson,
    context: {
      subject: 'Toán học',
      grade: 'Khối 10',
      topic: 'Phương trình bậc nhất',
    },
  }),
});

const data = await response.json();
console.log('Validation:', data);
console.log('Score:', data.validation.overallScore);
console.log('Can Publish:', data.validation.canPublish);
console.log('Curriculum:', data.validation.curriculumCompliance);
console.log('Bias:', data.validation.biasDetection);
console.log('Readability:', data.validation.readability);
```

**Expected**: Validation result with 7 dimensions, curriculum compliance, bias detection, readability

---

## Manual Testing via UI

### Question Bank

1. Go to http://localhost:3000/teacher/question-bank
2. Click "Tạo câu hỏi mới"
3. Fill in the form
4. Submit and check if question appears in list

### Content Validation

1. Generate content using Content Generator
2. Validation should run automatically
3. Check validation results in UI

---

## Troubleshooting

### Error: "Database schema not synced"

**Solution**:
```bash
npx prisma generate
npx prisma db push
```

### Error: "Cannot read properties of undefined"

**Solution**: Prisma client not generated. Run `npx prisma generate`

### Error: "Unauthorized"

**Solution**: Login again and check session

---

**Last Updated**: January 3, 2026
