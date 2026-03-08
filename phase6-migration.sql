-- Phase 6: Knowledge Management & Scaling Migrations
-- Run these migrations to add Phase 6 features

-- ============================================================================
-- 6.1 LMS Integration Tables
-- ============================================================================

-- LMS Integrations
CREATE TABLE IF NOT EXISTS lms_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES "User"(id), -- Or schools table if exists
    lms_provider TEXT NOT NULL CHECK (lms_provider IN ('google', 'moodle', 'canvas', 'microsoft')),
    lms_instance_url TEXT,
    api_credentials JSONB,
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lms_integrations_school ON lms_integrations(school_id);
CREATE INDEX idx_lms_integrations_provider ON lms_integrations(lms_provider);

-- External Course Mappings
CREATE TABLE IF NOT EXISTS lms_course_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_course_id UUID REFERENCES courses(id),
    external_course_id TEXT NOT NULL,
    lms_integration_id UUID REFERENCES lms_integrations(id),
    last_synced TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(external_course_id, lms_integration_id)
);

CREATE INDEX idx_lms_mappings_internal ON lms_course_mappings(internal_course_id);
CREATE INDEX idx_lms_mappings_external ON lms_course_mappings(external_course_id);

-- LMS Assignments Sync
CREATE TABLE IF NOT EXISTS lms_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_mapping_id UUID REFERENCES lms_course_mappings(id),
    external_assignment_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    points_possible FLOAT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(external_assignment_id, course_mapping_id)
);

CREATE INDEX idx_lms_assignments_course ON lms_assignments(course_mapping_id);
CREATE INDEX idx_lms_assignments_due ON lms_assignments(due_date);

-- Grade Passback Log
CREATE TABLE IF NOT EXISTS grade_passback_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES "User"(id),
    assignment_id UUID REFERENCES lms_assignments(id),
    grade FLOAT,
    status TEXT CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_grade_passback_student ON grade_passback_log(student_id);
CREATE INDEX idx_grade_passback_status ON grade_passback_log(status);

-- ============================================================================
-- 6.2 Parent Portal Tables
-- ============================================================================

-- Parent-Child Relationships
CREATE TABLE IF NOT EXISTS parent_child_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES "User"(id),
    student_id UUID REFERENCES "User"(id),
    relationship_type TEXT CHECK (relationship_type IN ('parent', 'guardian', 'other')),
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_child_parent ON parent_child_relationships(parent_id);
CREATE INDEX idx_parent_child_student ON parent_child_relationships(student_id);

-- Weekly Reports
CREATE TABLE IF NOT EXISTS weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES "User"(id),
    week_start DATE NOT NULL,
    study_time_seconds INT DEFAULT 0,
    lessons_completed INT DEFAULT 0,
    average_score FLOAT,
    quizzes_passed INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    achievements_earned TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    improvements TEXT[] DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_to_parents BOOLEAN DEFAULT FALSE,
    UNIQUE(student_id, week_start)
);

CREATE INDEX idx_weekly_reports_student ON weekly_reports(student_id);
CREATE INDEX idx_weekly_reports_week ON weekly_reports(week_start);

-- Parent Notifications
CREATE TABLE IF NOT EXISTS parent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES "User"(id),
    student_id UUID REFERENCES "User"(id),
    notification_type TEXT CHECK (notification_type IN ('achievement', 'low_score', 'streak', 'reminder', 'message')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parent_notifications_parent ON parent_notifications(parent_id);
CREATE INDEX idx_parent_notifications_read ON parent_notifications(read);

-- Parent Messages (Parent-Teacher Communication)
CREATE TABLE IF NOT EXISTS parent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES "User"(id),
    recipient_id UUID REFERENCES "User"(id),
    student_id UUID REFERENCES "User"(id),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parent_messages_sender ON parent_messages(sender_id);
CREATE INDEX idx_parent_messages_recipient ON parent_messages(recipient_id);

-- ============================================================================
-- 6.3 AI Study Buddy Tables
-- ============================================================================

-- Study Buddy Sessions
CREATE TABLE IF NOT EXISTS study_buddy_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES "User"(id),
    session_type TEXT CHECK (session_type IN ('chat', 'voice', 'study_plan', 'motivation')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    message_count INT DEFAULT 0,
    satisfaction_rating INT CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5)
);

CREATE INDEX idx_study_buddy_sessions_student ON study_buddy_sessions(student_id);
CREATE INDEX idx_study_buddy_sessions_started ON study_buddy_sessions(started_at);

-- Study Buddy Conversations
CREATE TABLE IF NOT EXISTS study_buddy_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES study_buddy_sessions(id),
    sender TEXT CHECK (sender IN ('student', 'ai')),
    message_type TEXT CHECK (message_type IN ('text', 'voice', 'image')),
    content TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_buddy_messages_session ON study_buddy_messages(session_id);
CREATE INDEX idx_study_buddy_messages_created ON study_buddy_messages(created_at);

-- Study Plans
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES "User"(id),
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    goals TEXT[] DEFAULT '{}',
    tasks JSONB DEFAULT '[]',
    completion_percentage FLOAT DEFAULT 0.0,
    ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_plans_student ON study_plans(student_id);
CREATE INDEX idx_study_plans_dates ON study_plans(start_date, end_date);

-- Study Plan Tasks
CREATE TABLE IF NOT EXISTS study_plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id UUID REFERENCES study_plans(id),
    title TEXT NOT NULL,
    description TEXT,
    estimated_duration_minutes INT,
    actual_duration_minutes INT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INT DEFAULT 0
);

CREATE INDEX idx_study_plan_tasks_plan ON study_plan_tasks(study_plan_id);
CREATE INDEX idx_study_plan_tasks_completed ON study_plan_tasks(completed);

-- ============================================================================
-- 6.4 Content Library Tables
-- ============================================================================

-- Content Library
CREATE TABLE IF NOT EXISTS content_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT CHECK (content_type IN ('lesson', 'video', 'quiz', 'worksheet', 'interactive', 'document')),
    subject TEXT,
    grade_level TEXT,
    tags TEXT[] DEFAULT '{}',
    ai_generated_tags TEXT[] DEFAULT '{}',
    quality_score FLOAT DEFAULT 0.0 CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    usage_count INT DEFAULT 0,
    rating FLOAT DEFAULT 0.0,
    rating_count INT DEFAULT 0,
    author_id UUID REFERENCES "User"(id),
    source_url TEXT,
    license TEXT CHECK (license IN ('public', 'creative_commons', 'proprietary', 'school')),
    file_url TEXT,
    file_size_bytes BIGINT,
    metadata JSONB DEFAULT '{}',
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_library_type ON content_library(content_type);
CREATE INDEX idx_content_library_subject ON content_library(subject);
CREATE INDEX idx_content_library_grade ON content_library(grade_level);
CREATE INDEX idx_content_library_tags ON content_library USING GIN (tags);
CREATE INDEX idx_content_library_ai_tags ON content_library USING GIN (ai_generated_tags);
CREATE INDEX idx_content_library_quality ON content_library(quality_score DESC);
CREATE INDEX idx_content_library_usage ON content_library(usage_count DESC);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_content_search ON content_library 
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Content Relationships
CREATE TABLE IF NOT EXISTS content_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_library(id),
    related_content_id UUID REFERENCES content_library(id),
    relationship_type TEXT CHECK (relationship_type IN ('prerequisite', 'supplement', 'advanced', 'similar')),
    strength FLOAT DEFAULT 0.0 CHECK (strength >= 0.0 AND strength <= 1.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_id, related_content_id)
);

CREATE INDEX idx_content_relationships_content ON content_relationships(content_id);
CREATE INDEX idx_content_relationships_related ON content_relationships(related_content_id);

-- Content Reviews
CREATE TABLE IF NOT EXISTS content_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_library(id),
    reviewer_id UUID REFERENCES "User"(id),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE, -- Verified purchaser/user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_id, reviewer_id)
);

CREATE INDEX idx_content_reviews_content ON content_reviews(content_id);
CREATE INDEX idx_content_reviews_rating ON content_reviews(rating);

-- Content Usage Tracking
CREATE TABLE IF NOT EXISTS content_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_library(id),
    user_id UUID REFERENCES "User"(id),
    action TEXT CHECK (action IN ('view', 'download', 'complete', 'rate', 'share')),
    duration_seconds INT,
    completed BOOLEAN DEFAULT FALSE,
    score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_usage_content ON content_usage(content_id);
CREATE INDEX idx_content_usage_user ON content_usage(user_id);
CREATE INDEX idx_content_usage_action ON content_usage(action);

-- User Contributions
CREATE TABLE IF NOT EXISTS user_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id),
    content_id UUID REFERENCES content_library(id),
    contribution_type TEXT CHECK (contribution_type IN ('create', 'edit', 'translate', 'review', 'tag')),
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES "User"(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_contributions_user ON user_contributions(user_id);
CREATE INDEX idx_user_contributions_status ON user_contributions(status);

-- Curriculum Standards Mapping
CREATE TABLE IF NOT EXISTS curriculum_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code TEXT NOT NULL UNIQUE, -- e.g., 'CCSS.MATH.CONTENT.HSA.REI.A.1'
    description TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade_level TEXT,
    category TEXT,
    parent_standard_id UUID REFERENCES curriculum_standards(id)
);

CREATE INDEX idx_curriculum_standards_code ON curriculum_standards(standard_code);
CREATE INDEX idx_curriculum_standards_subject ON curriculum_standards(subject);

-- Content to Standards Mapping
CREATE TABLE IF NOT EXISTS content_standards_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_library(id),
    standard_id UUID REFERENCES curriculum_standards(id),
    alignment_strength FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_id, standard_id)
);

CREATE INDEX idx_content_standards_content ON content_standards_mapping(content_id);
CREATE INDEX idx_content_standards_standard ON content_standards_mapping(standard_id);

-- ============================================================================
-- Functions & Triggers for Phase 6
-- ============================================================================

-- Function to update content rating
CREATE OR REPLACE FUNCTION update_content_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.rating IS DISTINCT FROM OLD.rating) THEN
        UPDATE content_library
        SET 
            rating = (SELECT AVG(rating) FROM content_reviews WHERE content_id = NEW.content_id),
            rating_count = (SELECT COUNT(*) FROM content_reviews WHERE content_id = NEW.content_id)
        WHERE id = NEW.content_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update content rating
CREATE TRIGGER trg_update_content_rating
AFTER INSERT OR UPDATE ON content_reviews
FOR EACH ROW
EXECUTE FUNCTION update_content_rating();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_content_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE content_library
    SET usage_count = usage_count + 1
    WHERE id = NEW.content_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track content usage
CREATE TRIGGER trg_increment_content_usage
AFTER INSERT ON content_usage
FOR EACH ROW
WHEN (NEW.action = 'view')
EXECUTE FUNCTION increment_content_usage();

-- Function to generate weekly report
CREATE OR REPLACE FUNCTION generate_weekly_report(p_student_id UUID, p_week_start DATE)
RETURNS VOID AS $$
DECLARE
    v_study_time INT;
    v_lessons INT;
    v_avg_score FLOAT;
    v_quizzes INT;
    v_streak INT;
BEGIN
    -- Calculate metrics
    SELECT 
        COALESCE(SUM(duration_seconds), 0),
        COUNT(*) FILTER (WHERE action = 'complete'),
        AVG(score),
        COUNT(*) FILTER (WHERE action = 'quiz_complete')
    INTO v_study_time, v_lessons, v_avg_score, v_quizzes
    FROM content_usage
    WHERE user_id = p_student_id
      AND created_at >= p_week_start
      AND created_at < p_week_start + INTERVAL '7 days';
    
    -- Get streak
    SELECT streak_days INTO v_streak
    FROM "User"
    WHERE id = p_student_id;
    
    -- Insert or update report
    INSERT INTO weekly_reports (
        student_id, week_start, study_time_seconds,
        lessons_completed, average_score, quizzes_passed, streak_days
    ) VALUES (
        p_student_id, p_week_start, v_study_time,
        v_lessons, v_avg_score, v_quizzes, v_streak
    )
    ON CONFLICT (student_id, week_start) DO UPDATE SET
        study_time_seconds = EXCLUDED.study_time_seconds,
        lessons_completed = EXCLUDED.lessons_completed,
        average_score = EXCLUDED.average_score,
        quizzes_passed = EXCLUDED.quizzes_passed,
        streak_days = EXCLUDED.streak_days,
        generated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data
-- ============================================================================

-- Sample LMS Providers
INSERT INTO lms_integrations (lms_provider, lms_instance_url) VALUES
    ('google', 'https://classroom.google.com'),
    ('moodle', 'https://moodle.school.edu'),
    ('canvas', 'https://school.instructure.com')
ON CONFLICT DO NOTHING;

-- Sample Curriculum Standards
INSERT INTO curriculum_standards (standard_code, description, subject, grade_level, category) VALUES
    ('CCSS.MATH.CONTENT.HSA.REI.A.1', 'Explain each step in solving a simple equation', 'Math', '9-10', 'Algebra'),
    ('CCSS.MATH.CONTENT.HSA.REI.B.3', 'Solve linear equations and inequalities in one variable', 'Math', '9-10', 'Algebra'),
    ('CCSS.ELA-LITERACY.RL.9-10.1', 'Cite strong and thorough textual evidence', 'ELA', '9-10', 'Reading'),
    ('NGSS.HS-PS1-1', 'Use the periodic table to predict properties of elements', 'Science', '9-12', 'Chemistry')
ON CONFLICT (standard_code) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE lms_integrations IS 'LMS integration configurations for schools';
COMMENT ON TABLE parent_child_relationships IS 'Links parents/guardians to students';
COMMENT ON TABLE weekly_reports IS 'Automated weekly progress reports for parents';
COMMENT ON TABLE study_buddy_sessions IS 'AI Study Buddy conversation sessions';
COMMENT ON TABLE content_library IS 'Central repository of educational content';
COMMENT ON TABLE curriculum_standards IS 'Educational curriculum standards (CCSS, NGSS, etc.)';
COMMENT ON TABLE content_standards_mapping IS 'Maps content to curriculum standards';
