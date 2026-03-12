-- Migration 001: AI service tables
-- These tables should already exist in the main database

-- AI Generated Content table
CREATE TABLE IF NOT EXISTS "AIGeneratedContent" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    topic TEXT NOT NULL,
    curriculum TEXT,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    estimated_duration INTEGER NOT NULL DEFAULT 45,
    status TEXT NOT NULL DEFAULT 'draft',
    usage_count INTEGER NOT NULL DEFAULT 0,
    rating DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_content_user_id ON "AIGeneratedContent"(user_id);
CREATE INDEX idx_ai_content_subject ON "AIGeneratedContent"(subject);
CREATE INDEX idx_ai_content_status ON "AIGeneratedContent"(status);
CREATE INDEX idx_ai_content_type ON "AIGeneratedContent"(content_type);
CREATE INDEX idx_ai_content_created_at ON "AIGeneratedContent"(created_at);

-- Chat messages table (optional - for chat history)
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    context_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_message_user_id ON "ChatMessage"(user_id);
CREATE INDEX idx_chat_message_created_at ON "ChatMessage"(created_at);
