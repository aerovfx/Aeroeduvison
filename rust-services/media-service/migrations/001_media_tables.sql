-- Migration 001: Media service tables

-- Documents table
CREATE TABLE IF NOT EXISTS "Document" (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    file_type TEXT,
    file_size BIGINT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_created_by ON "Document"(created_by);
CREATE INDEX idx_document_status ON "Document"(status);
CREATE INDEX idx_document_created_at ON "Document"(created_at);

-- Exam Matrices table
CREATE TABLE IF NOT EXISTS "ExamMatrix" (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    matrix_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_matrix_subject ON "ExamMatrix"(subject);
CREATE INDEX idx_exam_matrix_status ON "ExamMatrix"(status);
CREATE INDEX idx_exam_matrix_created_by ON "ExamMatrix"(created_by);

-- Exams table
CREATE TABLE IF NOT EXISTS "Exam" (
    id TEXT PRIMARY KEY,
    matrix_id TEXT NOT NULL REFERENCES "ExamMatrix"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_score DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_matrix_id ON "Exam"(matrix_id);
CREATE INDEX idx_exam_status ON "Exam"(status);
CREATE INDEX idx_exam_created_by ON "Exam"(created_by);
