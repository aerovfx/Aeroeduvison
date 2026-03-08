-- Phase 5: Advanced Features Database Migrations
-- Run these migrations to add Phase 5 features

-- ============================================================================
-- 5.1 Learning Path Tables
-- ============================================================================

-- Learning Paths table
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    current_level INT DEFAULT 1,
    completed_skills TEXT[] DEFAULT '{}',
    recommended_next TEXT[] DEFAULT '{}',
    knowledge_gaps JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_learning_paths_student ON learning_paths(student_id);

-- Skill Assessments table
CREATE TABLE IF NOT EXISTS skill_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL,
    proficiency_level FLOAT DEFAULT 0.0 CHECK (proficiency_level >= 0.0 AND proficiency_level <= 1.0),
    last_assessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_skill_assessments_student ON skill_assessments(student_id);
CREATE UNIQUE INDEX idx_skill_assessments_unique ON skill_assessments(student_id, skill_id);

-- ============================================================================
-- 5.2 Analytics & Reporting Tables
-- ============================================================================

-- Study Sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    lesson_id TEXT,
    duration_seconds INT,
    completed BOOLEAN DEFAULT FALSE,
    score FLOAT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_study_sessions_student ON study_sessions(student_id);
CREATE INDEX idx_study_sessions_started ON study_sessions(started_at);

-- Weekly Reports (materialized view)
CREATE OR REPLACE MATERIALIZED VIEW weekly_study_reports AS
SELECT 
    student_id,
    DATE_TRUNC('week', started_at) as week_start,
    COUNT(*) as lessons_completed,
    AVG(score) as average_score,
    SUM(duration_seconds) as total_study_time_seconds
FROM study_sessions
WHERE completed = TRUE
GROUP BY student_id, week_start
ORDER BY week_start DESC;

CREATE UNIQUE INDEX idx_weekly_reports ON weekly_study_reports(student_id, week_start);

-- ============================================================================
-- 5.3 Plagiarism Detection Tables
-- ============================================================================

-- Plagiarism Reports table
CREATE TABLE IF NOT EXISTS plagiarism_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES "Submission"(id) ON DELETE CASCADE,
    originality_score FLOAT CHECK (originality_score >= 0.0 AND originality_score <= 100.0),
    matched_sources JSONB DEFAULT '[]',
    suspicious_passages JSONB DEFAULT '[]',
    overall_assessment TEXT,
    reviewed_by UUID REFERENCES "User"(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plagiarism_reports_submission ON plagiarism_reports(submission_id);

-- Text Fingerprints (for plagiarism detection)
CREATE TABLE IF NOT EXISTS text_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES "Submission"(id) ON DELETE CASCADE,
    fingerprint_hash TEXT NOT NULL,
    text_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_text_fingerprints_hash ON text_fingerprints(fingerprint_hash);
CREATE INDEX idx_text_fingerprints_submission ON text_fingerprints(submission_id);

-- ============================================================================
-- 5.5 Gamification Tables
-- ============================================================================

-- Add XP and level columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS last_study_date DATE;

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    badge_type TEXT CHECK (badge_type IN ('achievement', 'subject', 'special')),
    xp_reward INT DEFAULT 0,
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default badges
INSERT INTO badges (name, description, icon_url, badge_type, xp_reward, criteria) VALUES
    ('first_lesson', 'Complete your first lesson', '/badges/first_lesson.png', 'achievement', 50, '{"type": "lesson_completed", "count": 1}'),
    ('quiz_master', 'Get 10 perfect quiz scores', '/badges/quiz_master.png', 'achievement', 200, '{"type": "perfect_quiz", "count": 10}'),
    ('week_warrior', 'Maintain a 7-day streak', '/badges/week_warrior.png', 'achievement', 100, '{"type": "streak_days", "count": 7}'),
    ('math_whiz', 'Master 10 math skills', '/badges/math_whiz.png', 'subject', 150, '{"type": "skills_mastered", "subject": "math", "count": 10}'),
    ('science_star', 'Master 10 science skills', '/badges/science_star.png', 'subject', 150, '{"type": "skills_mastered", "subject": "science", "count": 10}'),
    ('helper', 'Help 5 peers', '/badges/helper.png', 'special', 100, '{"type": "peer_help", "count": 5}'),
    ('explorer', 'Try all subjects', '/badges/explorer.png', 'special', 100, '{"type": "subjects_tried", "count": 5}'),
    ('comeback_kid', 'Improve score by 20%', '/badges/comeback_kid.png', 'special', 150, '{"type": "score_improvement", "percentage": 20}')
ON CONFLICT (name) DO NOTHING;

-- User Badges (many-to-many)
CREATE TABLE IF NOT EXISTS user_badges (
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- XP Transactions (audit trail)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    reason TEXT NOT NULL,
    reference_id TEXT, -- Reference to lesson, quiz, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created ON xp_transactions(created_at);

-- Leaderboards (materialized view)
CREATE OR REPLACE MATERIALIZED VIEW leaderboards_global AS
SELECT 
    id,
    name,
    email,
    xp,
    level,
    streak_days,
    RANK() OVER (ORDER BY xp DESC) as global_rank,
    RANK() OVER (PARTITION BY level ORDER BY xp DESC) as level_rank
FROM "User"
WHERE role = 'STUDENT' AND xp > 0;

CREATE UNIQUE INDEX idx_leaderboards_global ON leaderboards_global(id);

-- Subject-specific leaderboards
CREATE OR REPLACE MATERIALIZED VIEW leaderboards_by_subject AS
SELECT 
    u.id,
    u.name,
    u.xp,
    sa.skill_id as subject,
    COUNT(*) as skills_mastered,
    RANK() OVER (PARTITION BY sa.skill_id ORDER BY u.xp DESC) as subject_rank
FROM "User" u
JOIN skill_assessments sa ON u.id = sa.student_id
WHERE u.role = 'STUDENT' AND sa.proficiency_level >= 0.8
GROUP BY u.id, u.name, u.xp, sa.skill_id;

CREATE UNIQUE INDEX idx_leaderboards_subject ON leaderboards_by_subject(id, subject);

-- ============================================================================
-- 5.6 Achievements & Milestones Tables
-- ============================================================================

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    milestone_type TEXT CHECK (milestone_type IN ('lesson', 'quiz', 'streak', 'xp', 'level')),
    target_value INT NOT NULL,
    xp_reward INT DEFAULT 0,
    badge_id UUID REFERENCES badges(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Milestones progress
CREATE TABLE IF NOT EXISTS user_milestones (
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
    progress INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, milestone_id)
);

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Function to update user level based on XP
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate level based on XP (exponential curve)
    NEW.level := FLOOR(SQRT(NEW.xp / 100)) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update level on XP change
CREATE TRIGGER trg_update_user_level
BEFORE UPDATE OF xp ON "User"
FOR EACH ROW
EXECUTE FUNCTION update_user_level();

-- Function to update streak
CREATE OR REPLACE FUNCTION update_study_streak()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed = TRUE AND NEW.student_id IS NOT NULL THEN
        UPDATE "User"
        SET 
            streak_days = CASE 
                WHEN last_study_date = CURRENT_DATE - 1 THEN streak_days + 1
                WHEN last_study_date = CURRENT_DATE THEN streak_days
                ELSE 1
            END,
            last_study_date = CURRENT_DATE
        WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update streak on session completion
CREATE TRIGGER trg_update_streak
AFTER UPDATE ON study_sessions
FOR EACH ROW
WHEN (OLD.completed = FALSE AND NEW.completed = TRUE)
EXECUTE FUNCTION update_study_streak();

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_study_reports;
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboards_global;
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboards_by_subject;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data for Testing
-- ============================================================================

-- Insert sample milestones
INSERT INTO milestones (name, description, milestone_type, target_value, xp_reward) VALUES
    ('First Steps', 'Complete your first lesson', 'lesson', 1, 50),
    ('Getting Started', 'Complete 10 lessons', 'lesson', 10, 200),
    ('Dedicated Learner', 'Complete 50 lessons', 'lesson', 50, 500),
    ('Quiz Novice', 'Pass 5 quizzes', 'quiz', 5, 100),
    ('Quiz Expert', 'Pass 25 quizzes', 'quiz', 25, 400),
    ('Week Warrior', '7-day streak', 'streak', 7, 200),
    ('Month Master', '30-day streak', 'streak', 30, 1000),
    ('XP Collector', 'Earn 1000 XP', 'xp', 1000, 300),
    ('Level Up', 'Reach level 5', 'level', 5, 500)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_xp ON "User"(xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_level ON "User"(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_streak ON "User"(streak_days DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_duration ON study_sessions(duration_seconds);
CREATE INDEX IF NOT EXISTS idx_plagiarism_score ON plagiarism_reports(originality_score);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE learning_paths IS 'Stores personalized learning paths for students';
COMMENT ON TABLE skill_assessments IS 'Tracks student proficiency in individual skills';
COMMENT ON TABLE study_sessions IS 'Records of student study sessions for analytics';
COMMENT ON TABLE plagiarism_reports IS 'Plagiarism detection reports for submissions';
COMMENT ON TABLE badges IS 'Available badges/achievements in gamification system';
COMMENT ON TABLE user_badges IS 'Badges earned by users';
COMMENT ON TABLE xp_transactions IS 'Audit trail of XP gains and losses';
COMMENT ON MATERIALIZED VIEW leaderboards_global IS 'Global student leaderboard ranked by XP';
COMMENT ON MATERIALIZED VIEW leaderboards_by_subject IS 'Subject-specific leaderboards';
