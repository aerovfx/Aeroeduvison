-- Migration 001: Create auth-related tables
-- These tables should already exist in the main database, this is for reference

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    email TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ
);

CREATE INDEX idx_failed_login_attempts_locked ON failed_login_attempts(locked_until);

-- Verification tokens (should exist from NextAuth)
-- Password reset tokens (should exist from NextAuth)

-- Note: The main "User" table and related tables are managed by Prisma
-- This migration is for additional auth-specific tables
