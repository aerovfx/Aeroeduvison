-- Migration 001: Admin service tables
-- These tables should already exist in the main database

-- Auth Log table for audit trail
CREATE TABLE IF NOT EXISTS "AuthLog" (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    email TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_log_user_id ON "AuthLog"(user_id);
CREATE INDEX idx_auth_log_email ON "AuthLog"(email);
CREATE INDEX idx_auth_log_created_at ON "AuthLog"(created_at);

-- Failed login attempts (for account lockout)
-- This table is created by auth-service migration
