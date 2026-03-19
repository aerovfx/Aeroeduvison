-- Grading Service Tables
-- These tables support the AI grading, human review, and rubric-based assessment workflows.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main submission table (for assignment-based grading)
CREATE TABLE IF NOT EXISTS submission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL,
    student_id TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDING',
    score DOUBLE PRECISION,
    feedback TEXT,
    confidence DOUBLE PRECISION,
    ai_grading_result JSONB,
    human_review_data JSONB,
    reviewed_by TEXT,
    review_notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graded_at TIMESTAMPTZ,
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_submission_student ON submission(student_id);
CREATE INDEX idx_submission_assignment ON submission(assignment_id);
CREATE INDEX idx_submission_status ON submission(status);
CREATE INDEX idx_submission_submitted_at ON submission(submitted_at);

-- Rubric-based student submission
CREATE TABLE IF NOT EXISTS student_submission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    rubric_id UUID NOT NULL,
    content TEXT NOT NULL,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_submission_user ON student_submission(user_id);
CREATE INDEX idx_student_submission_rubric ON student_submission(rubric_id);
CREATE INDEX idx_student_submission_status ON student_submission(status);

-- Detailed grade for rubric-based submissions
CREATE TABLE IF NOT EXISTS submission_grade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES student_submission(id) ON DELETE CASCADE,
    final_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    feedback TEXT,
    criterion_scores JSONB,
    criterion_feedback JSONB,
    strengths JSONB,
    improvements JSONB,
    grammar_issues JSONB,
    concept_errors JSONB,
    recommended_concepts JSONB,
    confidence_score DOUBLE PRECISION,
    graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_grade_submission ON submission_grade(submission_id);

-- Grading rubric definitions
CREATE TABLE IF NOT EXISTS grading_rubric (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    max_score DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    min_passing_score DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    description TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grading_rubric_subject ON grading_rubric(subject);

-- Rubric criteria
CREATE TABLE IF NOT EXISTS rubric_criterion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rubric_id UUID NOT NULL REFERENCES grading_rubric(id) ON DELETE CASCADE,
    criterion TEXT NOT NULL,
    description TEXT,
    max_points DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    examples JSONB
);

CREATE INDEX idx_rubric_criterion_rubric ON rubric_criterion(rubric_id);

-- Audit log for grading actions
CREATE TABLE IF NOT EXISTS grading_audit_log (
    id BIGSERIAL PRIMARY KEY,
    submission_id TEXT,
    action TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grading_audit_submission ON grading_audit_log(submission_id);
CREATE INDEX idx_grading_audit_actor ON grading_audit_log(actor_id);
CREATE INDEX idx_grading_audit_created ON grading_audit_log(created_at);
