-- Create Question table manually
-- This script creates the Question table as defined in Prisma schema

CREATE TABLE IF NOT EXISTS "Question" (
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
    "tags" TEXT[],
    "metadata" JSONB,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Question_subject_idx" ON "Question"("subject");
CREATE INDEX IF NOT EXISTS "Question_grade_idx" ON "Question"("grade");
CREATE INDEX IF NOT EXISTS "Question_questionType_idx" ON "Question"("questionType");
CREATE INDEX IF NOT EXISTS "Question_difficulty_idx" ON "Question"("difficulty");
CREATE INDEX IF NOT EXISTS "Question_status_idx" ON "Question"("status");
CREATE INDEX IF NOT EXISTS "Question_createdBy_idx" ON "Question"("createdBy");
CREATE INDEX IF NOT EXISTS "Question_humanReviewed_idx" ON "Question"("humanReviewed");
CREATE INDEX IF NOT EXISTS "Question_aiGenerated_idx" ON "Question"("aiGenerated");
CREATE INDEX IF NOT EXISTS "Question_createdAt_idx" ON "Question"("createdAt");
CREATE INDEX IF NOT EXISTS "Question_qualityScore_idx" ON "Question"("qualityScore");
CREATE INDEX IF NOT EXISTS "Question_usageCount_idx" ON "Question"("usageCount");
