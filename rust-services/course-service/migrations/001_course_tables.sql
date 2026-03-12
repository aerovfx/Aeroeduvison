-- Migration 001: Course service tables
-- These tables should already exist in the main database

-- Courses table
CREATE TABLE IF NOT EXISTS "Course" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    school_id TEXT NOT NULL DEFAULT 'default-school',
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price DOUBLE PRECISION,
    is_published BOOLEAN NOT NULL DEFAULT false,
    category_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS "Chapter" (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    position INTEGER NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_free BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chapter_course_id ON "Chapter"(course_id);
CREATE INDEX idx_chapter_position ON "Chapter"(position);

-- User Progress table
CREATE TABLE IF NOT EXISTS "UserProgress" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL REFERENCES "Chapter"(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_progress_user_id ON "UserProgress"(user_id);
CREATE INDEX idx_user_progress_chapter_id ON "UserProgress"(chapter_id);
CREATE UNIQUE INDEX idx_user_progress_unique ON "UserProgress"(user_id, chapter_id);

-- Attachments table
CREATE TABLE IF NOT EXISTS "Attachment" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachment_course_id ON "Attachment"(course_id);
