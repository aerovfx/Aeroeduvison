# Prisma Migration Status - Question Model

## ✅ Schema Updated

**File**: `prisma/schema.prisma`
**Model**: `Question` (lines 633-690)

**Status**: Schema definition complete, ready for migration

---

## ⚠️ Migration Issues

### Issue 1: Fulltext Index Not Supported

**Error**:
```
Error parsing attribute "@@fulltext": Defining fulltext indexes is not supported with the current connector.
```

**Status**: ✅ **FIXED**
- Removed `@@fulltext([content, explanation])` 
- Added comment about using PostgreSQL tsvector/tsquery for full-text search
- Can use regular indexes and LIKE queries for now

### Issue 2: Database Connection

**Error**:
```
Error: P1011: Error opening a TLS connection: bad certificate format
```

**Status**: ⚠️ **NEEDS ATTENTION**
- Database connection issue (may be network/SSL config)
- Prisma generate succeeded ✅
- Database push needs network access

---

## ✅ Prisma Generate - SUCCESS

**Command**: `npx prisma generate`

**Result**: ✅ Success
- Prisma Client generated successfully
- Question model available in `@prisma/client`
- Types generated correctly

**Output**:
```
✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client
```

---

## 🔄 Database Push - PENDING

**Command**: `npx prisma db push`

**Status**: ⏳ Needs network access or manual execution

**To Complete**:
1. Ensure database is accessible
2. Check SSL/TLS configuration in DATABASE_URL
3. Run: `npx prisma db push`

**Alternative**: Use migration (recommended for production)
```bash
npx prisma migrate dev --name add_question_model
```

---

## 📋 Question Model Fields

### Basic Information
- `id` (String, @id, @default(cuid()))
- `topic` (String)
- `subject` (String)
- `grade` (String)
- `questionType` (String) - MCQ, TRUE_FALSE, SHORT_ANSWER, ESSAY, CODE
- `difficulty` (String) - EASY, MEDIUM, HARD
- `content` (String, @db.Text)

### Answers
- `options` (String[])
- `correctAnswer` (String?)
- `explanation` (String, @db.Text)

### Metadata
- `learningObjectives` (String[])
- `keywords` (String[])
- `tags` (String[])

### Quality Metrics
- `qualityScore` (Float?)
- `discriminationIndex` (Float?)

### Usage Tracking
- `usageCount` (Int, @default(0))
- `averageScore` (Float?)
- `averageTimeSeconds` (Int?)

### Status
- `status` (String, @default("Nháp")) - Nháp, Chờ duyệt, Đã duyệt, Từ chối
- `aiGenerated` (Boolean, @default(false))
- `humanReviewed` (Boolean, @default(false))
- `reviewedBy` (String?)
- `reviewedAt` (DateTime?)

### Relations
- `createdBy` (String) - User ID
- `createdAt` (DateTime, @default(now()))
- `updatedAt` (DateTime, @updatedAt)

### Indexes
- `@@index([subject])`
- `@@index([grade])`
- `@@index([questionType])`
- `@@index([difficulty])`
- `@@index([status])`
- `@@index([createdBy])`
- `@@index([humanReviewed])`
- `@@index([aiGenerated])`
- `@@index([createdAt])`
- `@@index([qualityScore])`
- `@@index([usageCount])`

---

## 🧪 Testing After Migration

### 1. Verify Model Exists

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Check if Question model exists
console.log('Question model:', prisma.question ? '✅ Exists' : '❌ Missing');
```

### 2. Test Create

```typescript
const question = await prisma.question.create({
  data: {
    topic: 'Test',
    subject: 'Toán học',
    grade: 'Khối 10',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Test question',
    explanation: 'Test explanation',
    learningObjectives: [],
    keywords: [],
    tags: [],
    status: 'Nháp',
    createdBy: 'test-user-id',
  },
});
console.log('Created:', question.id);
```

### 3. Test Query

```typescript
const questions = await prisma.question.findMany({
  take: 5,
});
console.log('Found:', questions.length, 'questions');
```

---

## 📝 Next Steps

1. ✅ **Prisma Generate** - COMPLETED
2. ⏳ **Database Push** - PENDING (needs network access or manual execution)
3. ⏳ **Test API Endpoints** - Can test after migration
4. ⏳ **Connect UI** - After API testing

---

## 🔧 Manual Migration Steps

If automatic migration fails, you can manually create the table:

```sql
-- Run in PostgreSQL database
CREATE TABLE "Question" (
  "id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "questionType" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "options" TEXT[],
  "correctAnswer" TEXT,
  "explanation" TEXT NOT NULL,
  "learningObjectives" TEXT[],
  "keywords" TEXT[],
  "tags" TEXT[],
  "qualityScore" DOUBLE PRECISION,
  "discriminationIndex" DOUBLE PRECISION,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "averageScore" DOUBLE PRECISION,
  "averageTimeSeconds" INTEGER,
  "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
  "aiModel" TEXT,
  "humanReviewed" BOOLEAN NOT NULL DEFAULT false,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'Nháp',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "Question_subject_idx" ON "Question"("subject");
CREATE INDEX "Question_grade_idx" ON "Question"("grade");
CREATE INDEX "Question_questionType_idx" ON "Question"("questionType");
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");
CREATE INDEX "Question_status_idx" ON "Question"("status");
CREATE INDEX "Question_createdBy_idx" ON "Question"("createdBy");
CREATE INDEX "Question_humanReviewed_idx" ON "Question"("humanReviewed");
CREATE INDEX "Question_aiGenerated_idx" ON "Question"("aiGenerated");
CREATE INDEX "Question_createdAt_idx" ON "Question"("createdAt");
CREATE INDEX "Question_qualityScore_idx" ON "Question"("qualityScore");
CREATE INDEX "Question_usageCount_idx" ON "Question"("usageCount");
```

---

**Last Updated**: January 3, 2026
**Status**: Prisma Generate ✅ | Database Push ⏳
