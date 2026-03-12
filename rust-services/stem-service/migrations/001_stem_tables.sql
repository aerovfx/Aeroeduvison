-- Migration 001: STEM service tables

-- STEM Projects table
CREATE TABLE IF NOT EXISTS "StemProject" (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stem_project_subject ON "StemProject"(subject);
CREATE INDEX idx_stem_project_status ON "StemProject"(status);
CREATE INDEX idx_stem_project_created_by ON "StemProject"(created_by);

-- Lab Completion table
CREATE TABLE IF NOT EXISTS "LabCompletion" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    lab_id TEXT NOT NULL,
    lab_type TEXT NOT NULL,
    score DOUBLE PRECISION,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_completion_user_id ON "LabCompletion"(user_id);
CREATE INDEX idx_lab_completion_lab_id ON "LabCompletion"(lab_id);
CREATE INDEX idx_lab_completion_completed_at ON "LabCompletion"(completed_at);
