-- Migration 001: Student service tables
-- These tables should already exist in the main database

-- Class table
CREATE TABLE IF NOT EXISTS "Class" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    school_id TEXT NOT NULL DEFAULT 'default-school',
    teacher_id TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_class_school_id ON "Class"(school_id);
CREATE INDEX idx_class_teacher_id ON "Class"(teacher_id);
CREATE INDEX idx_class_active ON "Class"(is_active);

-- Learning Path table
CREATE TABLE IF NOT EXISTS "LearningPath" (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    goals TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_path_student_id ON "LearningPath"(student_id);
CREATE INDEX idx_learning_path_status ON "LearningPath"(status);

-- Student Skill table (for PLG)
CREATE TABLE IF NOT EXISTS "StudentSkill" (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    proficiency_level DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_practiced TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, skill_name)
);

CREATE INDEX idx_student_skill_student_id ON "StudentSkill"(student_id);
CREATE INDEX idx_student_skill_name ON "StudentSkill"(skill_name);

-- Learning Interaction table (for PLG analytics)
CREATE TABLE IF NOT EXISTS "LearningInteraction" (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    score DOUBLE PRECISION,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_interaction_student_id ON "LearningInteraction"(student_id);
CREATE INDEX idx_learning_interaction_content_id ON "LearningInteraction"(content_id);
CREATE INDEX idx_learning_interaction_created_at ON "LearningInteraction"(created_at);
