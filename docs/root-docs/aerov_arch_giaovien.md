# KIẾN TRÚC HỆ THỐNG QUẢN LÝ GIẢNG VIÊN - AEROEDU

## TEACHER MANAGEMENT SYSTEM ARCHITECTURE

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mô tả Tổng Quát

Hệ thống quản lý giảng viên là một module quan trọng trong nền tảng AeroEdu, cung cấp các công cụ toàn diện cho giảng viên để:
- Quản lý bài giảng trực tuyến thời gian thực
- Tổ chức và quản lý tài liệu giảng dạy
- Theo dõi và đánh giá tiến độ học tập của sinh viên
- Tạo và quản lý các nhóm thảo luận

### 1.2 Tính Năng Chính

```yaml
Core Features:
  1. Live Lecture Management:
     - Real-time video streaming
     - Interactive whiteboard
     - Screen sharing
     - Q&A and polling
     - Recording and replay
     - Attendance tracking
  
  2. Content Management:
     - Course materials (PDF, PPT, Videos)
     - Lecture plans and syllabi
     - Version control
     - Resource library
     - Content scheduling
  
  3. Learning Assessment:
     - Progress tracking sheets
     - Performance evaluation
     - Feedback and comments
     - Grade management
     - Report generation
  
  4. Discussion Groups:
     - Group creation and management
     - Topic-based discussions
     - Member management
     - Moderation tools
     - Activity tracking
```

### 1.3 Tech Stack

```typescript
// Technology Stack

Frontend:
  - Next.js 15 (React 18)
  - TypeScript
  - Tailwind CSS
  - WebRTC (Live streaming)
  - Socket.io (Real-time communication)
  - React Query (Data fetching)
  - Zustand (State management)

Backend:
  - Node.js 20+ with Express
  - TypeScript
  - Prisma ORM
  - Socket.io (WebSocket server)
  - Bull (Job queues)

Real-time Services:
  - WebRTC (Video/Audio)
  - Janus Gateway (Media server)
  - Socket.io (Chat, whiteboard)
  - Redis Pub/Sub (Broadcasting)

Databases:
  - PostgreSQL 15 (Primary)
  - MongoDB (Lecture recordings metadata)
  - Redis (Cache, sessions, pub/sub)

Storage:
  - Google Cloud Storage (Lecture materials)
  - CloudFlare R2 (Video recordings)

Streaming:
  - Janus WebRTC Gateway
  - LiveKit (Alternative)
  - HLS for video playback
```

---

## 2. KIẾN TRÚC TỔNG THỂ

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Live Class  │  │   Content    │  │  Assessment  │         │
│  │  Dashboard   │  │  Management  │  │    Tools     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Discussion  │  │   Reports    │  │  Analytics   │         │
│  │    Groups    │  │  Generator   │  │  Dashboard   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                              │
├─────────────────────────────────────────────────────────────────┤
│  • Authentication & Authorization                               │
│  • Rate Limiting                                                │
│  • Request Routing                                              │
│  • WebSocket Management                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│   Teacher    │   │  Live Lecture    │   │  Discussion  │
│   Service    │   │    Service       │   │   Service    │
│              │   │                  │   │              │
│ • Content    │   │ • WebRTC Server  │   │ • Groups     │
│ • Plans      │   │ • Streaming      │   │ • Messages   │
│ • Materials  │   │ • Recording      │   │ • Moderation │
│ • Assessment │   │ • Whiteboard     │   │ • Analytics  │
└──────────────┘   └──────────────────┘   └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │   MongoDB    │  │    Redis     │         │
│  │              │  │              │  │              │         │
│  │ • Teachers   │  │ • Recordings │  │ • Sessions   │         │
│  │ • Lectures   │  │ • Metadata   │  │ • Cache      │         │
│  │ • Materials  │  │ • Transcripts│  │ • Pub/Sub    │         │
│  │ • Groups     │  │              │  │ • Live Data  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   GCS/S3     │  │ CloudFlare   │  │    CDN       │         │
│  │              │  │      R2      │  │              │         │
│  │ • Documents  │  │ • Videos     │  │ • Static     │         │
│  │ • Images     │  │ • Recordings │  │   Assets     │         │
│  │ • PDFs       │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. DATABASE SCHEMA

### 3.1 PostgreSQL Schema

```sql
-- ============================================================================
-- LIVE LECTURES TABLES
-- ============================================================================

-- Bảng lịch giảng dạy
CREATE TABLE lecture_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    offering_id UUID REFERENCES course_offerings(id),
    
    -- Thông tin buổi giảng
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lecture_type VARCHAR(50) NOT NULL, -- LIVE, RECORDED, HYBRID
    
    -- Thời gian
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    duration_minutes INTEGER,
    
    -- Trạng thái
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED', 
    -- SCHEDULED, LIVE, COMPLETED, CANCELLED
    
    -- Live stream metadata
    stream_url TEXT,
    stream_key VARCHAR(255),
    recording_url TEXT,
    recording_duration INTEGER,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    -- {
    --   "allow_chat": true,
    --   "allow_qa": true,
    --   "auto_record": true,
    --   "max_participants": 500,
    --   "enable_whiteboard": true,
    --   "enable_screen_share": true
    -- }
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_lectures_teacher ON lecture_schedules(teacher_id);
CREATE INDEX idx_lectures_course ON lecture_schedules(course_id);
CREATE INDEX idx_lectures_status ON lecture_schedules(status);
CREATE INDEX idx_lectures_scheduled ON lecture_schedules(scheduled_start);

-- Bảng điểm danh buổi học
CREATE TABLE lecture_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lecture_schedules(id),
    student_id UUID NOT NULL REFERENCES users(id),
    
    -- Thông tin điểm danh
    status VARCHAR(50) NOT NULL, -- PRESENT, ABSENT, LATE, EXCUSED
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    duration_minutes INTEGER,
    
    -- Mức độ tham gia
    engagement_score DECIMAL(5,2), -- 0-100
    interaction_count INTEGER DEFAULT 0, -- Questions, polls, chat
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(lecture_id, student_id)
);

CREATE INDEX idx_attendance_lecture ON lecture_attendance(lecture_id);
CREATE INDEX idx_attendance_student ON lecture_attendance(student_id);

-- Bảng chat trong buổi học
CREATE TABLE lecture_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lecture_schedules(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Nội dung
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'TEXT', -- TEXT, IMAGE, FILE, POLL
    
    -- Parent message (for replies)
    parent_id UUID REFERENCES lecture_chats(id),
    
    -- Status
    is_deleted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    
    -- Reactions
    reactions JSONB DEFAULT '[]',
    -- [{"emoji": "👍", "users": ["user_id1", "user_id2"]}]
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lecture_chats_lecture ON lecture_chats(lecture_id);
CREATE INDEX idx_lecture_chats_user ON lecture_chats(user_id);
CREATE INDEX idx_lecture_chats_created ON lecture_chats(created_at DESC);

-- Bảng Q&A trong buổi học
CREATE TABLE lecture_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lecture_schedules(id),
    student_id UUID NOT NULL REFERENCES users(id),
    
    -- Câu hỏi
    question TEXT NOT NULL,
    
    -- Trả lời
    answer TEXT,
    answered_by UUID REFERENCES users(id),
    answered_at TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ANSWERED, DISMISSED
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Voting
    upvotes INTEGER DEFAULT 0,
    upvoted_by JSONB DEFAULT '[]', -- Array of user IDs
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_lecture ON lecture_questions(lecture_id);
CREATE INDEX idx_questions_status ON lecture_questions(status);

-- Bảng polls trong buổi học
CREATE TABLE lecture_polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lecture_schedules(id),
    teacher_id UUID NOT NULL REFERENCES users(id),
    
    -- Nội dung poll
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"id": 1, "text": "Option 1"}]
    
    -- Settings
    allow_multiple BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    show_results_immediately BOOLEAN DEFAULT TRUE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, CLOSED
    closed_at TIMESTAMP,
    
    -- Results
    total_votes INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_polls_lecture ON lecture_polls(lecture_id);

-- Bảng kết quả poll
CREATE TABLE lecture_poll_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES lecture_polls(id),
    student_id UUID NOT NULL REFERENCES users(id),
    
    -- Response
    selected_options JSONB NOT NULL, -- [1, 2] for option IDs
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(poll_id, student_id)
);

CREATE INDEX idx_poll_responses_poll ON lecture_poll_responses(poll_id);

-- ============================================================================
-- CONTENT MANAGEMENT TABLES
-- ============================================================================

-- Bảng tài liệu giảng dạy
CREATE TABLE teaching_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    
    -- Thông tin tài liệu
    title VARCHAR(255) NOT NULL,
    description TEXT,
    material_type VARCHAR(50) NOT NULL, 
    -- DOCUMENT, PRESENTATION, VIDEO, AUDIO, IMAGE, LINK, OTHER
    
    -- File information
    file_name VARCHAR(255),
    file_path TEXT,
    file_size INTEGER, -- bytes
    mime_type VARCHAR(100),
    
    -- External link
    external_url TEXT,
    
    -- Category and tags
    category VARCHAR(100),
    tags TEXT[], -- Array of tags
    
    -- Version control
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES teaching_materials(id),
    
    -- Access control
    visibility VARCHAR(50) DEFAULT 'PRIVATE', 
    -- PRIVATE, COURSE, PUBLIC
    
    -- Status
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_materials_teacher ON teaching_materials(teacher_id);
CREATE INDEX idx_materials_course ON teaching_materials(course_id);
CREATE INDEX idx_materials_type ON teaching_materials(material_type);
CREATE INDEX idx_materials_status ON teaching_materials(status);

-- Bảng kế hoạch giảng dạy
CREATE TABLE lesson_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    offering_id UUID REFERENCES course_offerings(id),
    
    -- Thông tin kế hoạch
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Thời gian
    week_number INTEGER,
    lesson_number INTEGER,
    estimated_duration INTEGER, -- minutes
    
    -- Nội dung kế hoạch
    learning_objectives JSONB, -- Array of objectives
    -- [
    --   "Understand basic concepts",
    --   "Apply knowledge to solve problems"
    -- ]
    
    teaching_methods JSONB, -- Array of methods
    -- [
    --   {"method": "Lecture", "duration": 30},
    --   {"method": "Discussion", "duration": 20}
    -- ]
    
    content_outline JSONB, -- Structured outline
    -- {
    --   "introduction": "...",
    --   "main_content": [...],
    --   "conclusion": "..."
    -- }
    
    activities JSONB, -- Learning activities
    -- [
    --   {
    --     "title": "Group Discussion",
    --     "duration": 20,
    --     "instructions": "..."
    --   }
    -- ]
    
    assessment_methods JSONB, -- Assessment strategies
    resources_needed JSONB, -- Required materials/equipment
    homework_assignment TEXT,
    
    -- Links to materials
    material_ids UUID[], -- Array of teaching_materials IDs
    
    -- Status
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, APPROVED, IN_USE, ARCHIVED
    
    -- Feedback
    notes TEXT, -- Teacher's notes
    reflection TEXT, -- Post-lesson reflection
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX idx_lesson_plans_course ON lesson_plans(course_id);
CREATE INDEX idx_lesson_plans_week ON lesson_plans(week_number);

-- Bảng thư viện tài nguyên
CREATE TABLE resource_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    
    -- Thông tin thư mục
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_folder_id UUID REFERENCES resource_library(id),
    
    -- Type
    type VARCHAR(50) NOT NULL, -- FOLDER, FILE
    
    -- File info (if type = FILE)
    file_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    
    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with_teachers UUID[], -- Array of teacher IDs
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_resource_library_teacher ON resource_library(teacher_id);
CREATE INDEX idx_resource_library_parent ON resource_library(parent_folder_id);

-- ============================================================================
-- ASSESSMENT & TRACKING TABLES
-- ============================================================================

-- Bảng phiếu theo dõi học tập
CREATE TABLE student_tracking_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    student_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    offering_id UUID REFERENCES course_offerings(id),
    
    -- Kỳ học
    semester VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    
    -- Thông tin theo dõi
    attendance_rate DECIMAL(5,2), -- Percentage
    participation_score DECIMAL(5,2), -- 0-100
    
    -- Performance tracking
    performance_data JSONB,
    -- {
    --   "assignments": {
    --     "completed": 8,
    --     "total": 10,
    --     "average_score": 85.5
    --   },
    --   "quizzes": {...},
    --   "exams": {...}
    -- }
    
    -- Progress notes
    progress_notes JSONB, -- Array of dated notes
    -- [
    --   {
    --     "date": "2025-01-15",
    --     "note": "Showing improvement",
    --     "author": "teacher_id"
    --   }
    -- ]
    
    -- Strengths and weaknesses
    strengths TEXT[],
    areas_for_improvement TEXT[],
    
    -- Recommendations
    recommendations TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, WITHDRAWN
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracking_teacher ON student_tracking_sheets(teacher_id);
CREATE INDEX idx_tracking_student ON student_tracking_sheets(student_id);
CREATE INDEX idx_tracking_course ON student_tracking_sheets(course_id);

-- Bảng đánh giá và nhận xét
CREATE TABLE student_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_sheet_id UUID NOT NULL REFERENCES student_tracking_sheets(id),
    teacher_id UUID NOT NULL REFERENCES users(id),
    student_id UUID NOT NULL REFERENCES users(id),
    
    -- Loại đánh giá
    evaluation_type VARCHAR(50) NOT NULL, 
    -- MIDTERM, FINAL, WEEKLY, MONTHLY, CUSTOM
    
    -- Thời gian
    evaluation_date DATE NOT NULL,
    
    -- Điểm đánh giá
    scores JSONB,
    -- {
    --   "knowledge": 8.5,
    --   "skills": 9.0,
    --   "attitude": 8.0,
    --   "participation": 9.5
    -- }
    
    overall_score DECIMAL(5,2),
    
    -- Nhận xét
    comments TEXT,
    positive_feedback TEXT,
    areas_for_improvement TEXT,
    action_plan TEXT,
    
    -- Đánh giá theo chuẩn
    rubric_scores JSONB,
    -- [
    --   {
    --     "criterion": "Critical Thinking",
    --     "score": 4,
    --     "max_score": 5,
    --     "comment": "..."
    --   }
    -- ]
    
    -- Status
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, REVIEWED
    
    -- Visibility
    visible_to_student BOOLEAN DEFAULT FALSE,
    visible_to_parents BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evaluations_tracking ON student_evaluations(tracking_sheet_id);
CREATE INDEX idx_evaluations_student ON student_evaluations(student_id);
CREATE INDEX idx_evaluations_date ON student_evaluations(evaluation_date);

-- Bảng phản hồi và góp ý
CREATE TABLE student_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    student_id UUID NOT NULL REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    
    -- Context
    context_type VARCHAR(50), -- ASSIGNMENT, EXAM, PARTICIPATION, BEHAVIOR
    context_id UUID, -- ID of related entity
    
    -- Feedback content
    feedback_type VARCHAR(50), -- PRAISE, CONSTRUCTIVE, CONCERN, SUGGESTION
    subject VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Priority
    priority VARCHAR(50) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    
    -- Follow-up
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_notes TEXT,
    followup_date DATE,
    
    -- Response
    student_response TEXT,
    responded_at TIMESTAMP,
    
    -- Visibility
    is_private BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'SENT', -- SENT, READ, ACKNOWLEDGED, RESOLVED
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_teacher ON student_feedback(teacher_id);
CREATE INDEX idx_feedback_student ON student_feedback(student_id);
CREATE INDEX idx_feedback_status ON student_feedback(status);

-- ============================================================================
-- DISCUSSION GROUPS TABLES
-- ============================================================================

-- Bảng nhóm thảo luận
CREATE TABLE discussion_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    
    -- Thông tin nhóm
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Type
    group_type VARCHAR(50) NOT NULL, 
    -- COURSE_WIDE, SECTION, PROJECT, STUDY, CUSTOM
    
    -- Settings
    is_private BOOLEAN DEFAULT FALSE,
    auto_join BOOLEAN DEFAULT FALSE, -- Auto-join for enrolled students
    max_members INTEGER,
    
    -- Features
    allow_member_posts BOOLEAN DEFAULT TRUE,
    allow_file_sharing BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED, CLOSED
    
    -- Metadata
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_groups_teacher ON discussion_groups(teacher_id);
CREATE INDEX idx_groups_course ON discussion_groups(course_id);
CREATE INDEX idx_groups_status ON discussion_groups(status);

-- Bảng thành viên nhóm
CREATE TABLE discussion_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES discussion_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Role in group
    role VARCHAR(50) DEFAULT 'MEMBER', 
    -- OWNER, MODERATOR, MEMBER
    
    -- Permissions
    can_post BOOLEAN DEFAULT TRUE,
    can_comment BOOLEAN DEFAULT TRUE,
    can_moderate BOOLEAN DEFAULT FALSE,
    
    -- Activity tracking
    last_read_at TIMESTAMP,
    last_posted_at TIMESTAMP,
    post_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE', 
    -- ACTIVE, MUTED, BANNED
    
    -- Notifications
    notification_preference VARCHAR(50) DEFAULT 'ALL', 
    -- ALL, MENTIONS, NONE
    
    -- Metadata
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON discussion_group_members(group_id);
CREATE INDEX idx_group_members_user ON discussion_group_members(user_id);

-- Bảng bài đăng trong nhóm
CREATE TABLE discussion_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES discussion_groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    
    -- Content
    title VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Type
    post_type VARCHAR(50) DEFAULT 'DISCUSSION', 
    -- DISCUSSION, QUESTION, ANNOUNCEMENT, POLL, RESOURCE
    
    -- Pinning
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_at TIMESTAMP,
    
    -- Moderation
    is_locked BOOLEAN DEFAULT FALSE, -- No more comments
    is_hidden BOOLEAN DEFAULT FALSE,
    
    -- Attachments
    attachments JSONB, -- Array of file metadata
    -- [
    --   {
    --     "name": "file.pdf",
    --     "url": "...",
    --     "size": 1024,
    --     "type": "application/pdf"
    --   }
    -- ]
    
    -- Tags
    tags TEXT[],
    
    -- Reactions
    reactions JSONB DEFAULT '[]',
    -- [{"emoji": "👍", "users": ["user_id1"]}]
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'PUBLISHED', 
    -- DRAFT, PUBLISHED, ARCHIVED, DELETED
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_posts_group ON discussion_posts(group_id);
CREATE INDEX idx_posts_author ON discussion_posts(author_id);
CREATE INDEX idx_posts_created ON discussion_posts(created_at DESC);
CREATE INDEX idx_posts_pinned ON discussion_posts(is_pinned, created_at DESC);

-- Bảng bình luận
CREATE TABLE discussion_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES discussion_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    
    -- Parent comment (for nested replies)
    parent_id UUID REFERENCES discussion_comments(id),
    
    -- Content
    content TEXT NOT NULL,
    
    -- Attachments
    attachments JSONB,
    
    -- Reactions
    reactions JSONB DEFAULT '[]',
    
    -- Best answer (for questions)
    is_best_answer BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    is_hidden BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_comments_post ON discussion_comments(post_id);
CREATE INDEX idx_comments_author ON discussion_comments(author_id);
CREATE INDEX idx_comments_parent ON discussion_comments(parent_id);

-- Bảng hoạt động trong nhóm
CREATE TABLE discussion_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES discussion_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Action
    action_type VARCHAR(50) NOT NULL,
    -- JOIN, LEAVE, POST_CREATE, POST_EDIT, POST_DELETE,
    -- COMMENT_CREATE, MEMBER_ADD, MEMBER_REMOVE, etc.
    
    -- Target
    target_type VARCHAR(50), -- POST, COMMENT, MEMBER
    target_id UUID,
    
    -- Details
    details JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_group ON discussion_activity_log(group_id);
CREATE INDEX idx_activity_user ON discussion_activity_log(user_id);
CREATE INDEX idx_activity_created ON discussion_activity_log(created_at DESC);
```

---

## 4. API ENDPOINTS

### 4.1 Live Lecture APIs

```typescript
// ============================================================================
// LIVE LECTURE MANAGEMENT APIs
// ============================================================================

/**
 * @route   POST /api/teacher/lectures
 * @desc    Create new live lecture schedule
 * @access  Teacher only
 */
interface CreateLectureRequest {
  course_id: string;
  offering_id?: string;
  title: string;
  description?: string;
  lecture_type: 'LIVE' | 'RECORDED' | 'HYBRID';
  scheduled_start: string; // ISO datetime
  scheduled_end: string;
  settings?: {
    allow_chat?: boolean;
    allow_qa?: boolean;
    auto_record?: boolean;
    max_participants?: number;
    enable_whiteboard?: boolean;
    enable_screen_share?: boolean;
  };
}

/**
 * @route   GET /api/teacher/lectures
 * @desc    Get all lectures for teacher
 * @access  Teacher only
 * @query   status, date_from, date_to, course_id
 */

/**
 * @route   GET /api/teacher/lectures/:id
 * @desc    Get lecture details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/lectures/:id
 * @desc    Update lecture
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/lectures/:id
 * @desc    Cancel lecture
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/lectures/:id/start
 * @desc    Start live lecture
 * @access  Teacher only
 * @returns Stream URL, WebRTC credentials
 */
interface StartLectureResponse {
  stream_url: string;
  stream_key: string;
  webrtc_config: {
    ice_servers: RTCIceServer[];
    room_id: string;
  };
  whiteboard_url: string;
}

/**
 * @route   POST /api/teacher/lectures/:id/end
 * @desc    End live lecture
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/lectures/:id/attendance
 * @desc    Get attendance for lecture
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/lectures/:id/attendance/mark
 * @desc    Manually mark attendance
 * @access  Teacher only
 */
interface MarkAttendanceRequest {
  student_id: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  notes?: string;
}

/**
 * @route   GET /api/teacher/lectures/:id/chat
 * @desc    Get chat messages from lecture
 * @access  Teacher only
 * @query   page, limit, before, after
 */

/**
 * @route   POST /api/teacher/lectures/:id/chat/pin
 * @desc    Pin/unpin chat message
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/lectures/:id/chat/:message_id
 * @desc    Delete chat message
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/lectures/:id/questions
 * @desc    Get Q&A questions
 * @access  Teacher only
 * @query   status (PENDING, ANSWERED, DISMISSED)
 */

/**
 * @route   POST /api/teacher/lectures/:id/questions/:question_id/answer
 * @desc    Answer student question
 * @access  Teacher only
 */
interface AnswerQuestionRequest {
  answer: string;
}

/**
 * @route   POST /api/teacher/lectures/:id/polls
 * @desc    Create poll during lecture
 * @access  Teacher only
 */
interface CreatePollRequest {
  question: string;
  options: { id: number; text: string }[];
  allow_multiple: boolean;
  is_anonymous: boolean;
  show_results_immediately: boolean;
}

/**
 * @route   GET /api/teacher/lectures/:id/polls/:poll_id/results
 * @desc    Get poll results
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/lectures/:id/polls/:poll_id/close
 * @desc    Close poll
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/lectures/:id/recording
 * @desc    Get recording URL
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/lectures/:id/analytics
 * @desc    Get lecture analytics
 * @access  Teacher only
 */
interface LectureAnalytics {
  total_attendees: number;
  attendance_rate: number;
  average_duration: number;
  engagement_metrics: {
    chat_messages: number;
    questions_asked: number;
    polls_responded: number;
  };
  student_engagement: Array<{
    student_id: string;
    duration: number;
    interaction_count: number;
    engagement_score: number;
  }>;
}
```

### 4.2 Content Management APIs

```typescript
// ============================================================================
// TEACHING MATERIALS APIs
// ============================================================================

/**
 * @route   POST /api/teacher/materials
 * @desc    Upload teaching material
 * @access  Teacher only
 */
interface UploadMaterialRequest {
  title: string;
  description?: string;
  material_type: 'DOCUMENT' | 'PRESENTATION' | 'VIDEO' | 'AUDIO' | 'IMAGE' | 'LINK';
  course_id?: string;
  category?: string;
  tags?: string[];
  visibility?: 'PRIVATE' | 'COURSE' | 'PUBLIC';
  file?: File; // For upload
  external_url?: string; // For links
}

/**
 * @route   GET /api/teacher/materials
 * @desc    Get all materials
 * @access  Teacher only
 * @query   course_id, material_type, category, tags, status
 */

/**
 * @route   GET /api/teacher/materials/:id
 * @desc    Get material details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/materials/:id
 * @desc    Update material
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/materials/:id
 * @desc    Delete material
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/materials/:id/publish
 * @desc    Publish material
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/materials/:id/version
 * @desc    Create new version of material
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/materials/:id/analytics
 * @desc    Get material analytics (views, downloads)
 * @access  Teacher only
 */

// ============================================================================
// LESSON PLANS APIs
// ============================================================================

/**
 * @route   POST /api/teacher/lesson-plans
 * @desc    Create lesson plan
 * @access  Teacher only
 */
interface CreateLessonPlanRequest {
  course_id: string;
  offering_id?: string;
  title: string;
  description?: string;
  week_number?: number;
  lesson_number?: number;
  estimated_duration?: number;
  learning_objectives?: string[];
  teaching_methods?: Array<{
    method: string;
    duration: number;
  }>;
  content_outline?: {
    introduction?: string;
    main_content?: any[];
    conclusion?: string;
  };
  activities?: Array<{
    title: string;
    duration: number;
    instructions: string;
  }>;
  assessment_methods?: any;
  resources_needed?: any;
  homework_assignment?: string;
  material_ids?: string[];
}

/**
 * @route   GET /api/teacher/lesson-plans
 * @desc    Get all lesson plans
 * @access  Teacher only
 * @query   course_id, week_number, status
 */

/**
 * @route   GET /api/teacher/lesson-plans/:id
 * @desc    Get lesson plan details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/lesson-plans/:id
 * @desc    Update lesson plan
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/lesson-plans/:id
 * @desc    Delete lesson plan
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/lesson-plans/:id/approve
 * @desc    Mark lesson plan as approved
 * @access  Teacher/Admin
 */

/**
 * @route   POST /api/teacher/lesson-plans/:id/reflection
 * @desc    Add post-lesson reflection
 * @access  Teacher only
 */
interface AddReflectionRequest {
  reflection: string;
  notes?: string;
}

/**
 * @route   POST /api/teacher/lesson-plans/:id/duplicate
 * @desc    Duplicate lesson plan
 * @access  Teacher only
 */

// ============================================================================
// RESOURCE LIBRARY APIs
// ============================================================================

/**
 * @route   GET /api/teacher/library
 * @desc    Get resource library structure
 * @access  Teacher only
 * @query   parent_folder_id
 */

/**
 * @route   POST /api/teacher/library/folder
 * @desc    Create folder
 * @access  Teacher only
 */
interface CreateFolderRequest {
  name: string;
  description?: string;
  parent_folder_id?: string;
}

/**
 * @route   POST /api/teacher/library/file
 * @desc    Upload file to library
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/library/:id
 * @desc    Update folder/file
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/library/:id
 * @desc    Delete folder/file
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/library/:id/share
 * @desc    Share folder/file with other teachers
 * @access  Teacher only
 */
interface ShareResourceRequest {
  teacher_ids: string[];
}

/**
 * @route   POST /api/teacher/library/:id/move
 * @desc    Move folder/file
 * @access  Teacher only
 */
interface MoveResourceRequest {
  target_folder_id: string;
}
```

### 4.3 Student Assessment APIs

```typescript
// ============================================================================
// STUDENT TRACKING APIs
// ============================================================================

/**
 * @route   POST /api/teacher/tracking-sheets
 * @desc    Create tracking sheet for student
 * @access  Teacher only
 */
interface CreateTrackingSheetRequest {
  student_id: string;
  course_id: string;
  offering_id?: string;
  semester: string;
  academic_year: string;
}

/**
 * @route   GET /api/teacher/tracking-sheets
 * @desc    Get all tracking sheets
 * @access  Teacher only
 * @query   course_id, student_id, semester, academic_year
 */

/**
 * @route   GET /api/teacher/tracking-sheets/:id
 * @desc    Get tracking sheet details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/tracking-sheets/:id
 * @desc    Update tracking sheet
 * @access  Teacher only
 */
interface UpdateTrackingSheetRequest {
  attendance_rate?: number;
  participation_score?: number;
  performance_data?: any;
  strengths?: string[];
  areas_for_improvement?: string[];
  recommendations?: string;
}

/**
 * @route   POST /api/teacher/tracking-sheets/:id/notes
 * @desc    Add progress note
 * @access  Teacher only
 */
interface AddProgressNoteRequest {
  note: string;
}

/**
 * @route   GET /api/teacher/tracking-sheets/:id/history
 * @desc    Get tracking history
 * @access  Teacher only
 */

// ============================================================================
// STUDENT EVALUATION APIs
// ============================================================================

/**
 * @route   POST /api/teacher/evaluations
 * @desc    Create student evaluation
 * @access  Teacher only
 */
interface CreateEvaluationRequest {
  tracking_sheet_id: string;
  student_id: string;
  evaluation_type: 'MIDTERM' | 'FINAL' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  evaluation_date: string; // ISO date
  scores?: {
    knowledge?: number;
    skills?: number;
    attitude?: number;
    participation?: number;
  };
  overall_score?: number;
  comments?: string;
  positive_feedback?: string;
  areas_for_improvement?: string;
  action_plan?: string;
  rubric_scores?: Array<{
    criterion: string;
    score: number;
    max_score: number;
    comment?: string;
  }>;
  visible_to_student?: boolean;
  visible_to_parents?: boolean;
}

/**
 * @route   GET /api/teacher/evaluations
 * @desc    Get all evaluations
 * @access  Teacher only
 * @query   student_id, course_id, evaluation_type, date_from, date_to
 */

/**
 * @route   GET /api/teacher/evaluations/:id
 * @desc    Get evaluation details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/evaluations/:id
 * @desc    Update evaluation
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/evaluations/:id/publish
 * @desc    Publish evaluation (make visible to student)
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/evaluations/:id
 * @desc    Delete evaluation
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/evaluations/:id/pdf
 * @desc    Export evaluation as PDF
 * @access  Teacher only
 */

// ============================================================================
// STUDENT FEEDBACK APIs
// ============================================================================

/**
 * @route   POST /api/teacher/feedback
 * @desc    Send feedback to student
 * @access  Teacher only
 */
interface SendFeedbackRequest {
  student_id: string;
  course_id?: string;
  context_type?: 'ASSIGNMENT' | 'EXAM' | 'PARTICIPATION' | 'BEHAVIOR';
  context_id?: string;
  feedback_type: 'PRAISE' | 'CONSTRUCTIVE' | 'CONCERN' | 'SUGGESTION';
  subject: string;
  content: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requires_followup?: boolean;
  followup_date?: string;
  is_private?: boolean;
}

/**
 * @route   GET /api/teacher/feedback
 * @desc    Get all feedback sent
 * @access  Teacher only
 * @query   student_id, course_id, status, priority
 */

/**
 * @route   GET /api/teacher/feedback/:id
 * @desc    Get feedback details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/feedback/:id
 * @desc    Update feedback
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/feedback/:id/followup
 * @desc    Add follow-up notes
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/feedback/:id/resolve
 * @desc    Mark feedback as resolved
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/students/:student_id/feedback-history
 * @desc    Get all feedback for a student
 * @access  Teacher only
 */
```

### 4.4 Discussion Group APIs

```typescript
// ============================================================================
// DISCUSSION GROUPS APIs
// ============================================================================

/**
 * @route   POST /api/teacher/discussion-groups
 * @desc    Create discussion group
 * @access  Teacher only
 */
interface CreateGroupRequest {
  name: string;
  description?: string;
  course_id?: string;
  group_type: 'COURSE_WIDE' | 'SECTION' | 'PROJECT' | 'STUDY' | 'CUSTOM';
  is_private?: boolean;
  auto_join?: boolean;
  max_members?: number;
  allow_member_posts?: boolean;
  allow_file_sharing?: boolean;
  requires_approval?: boolean;
}

/**
 * @route   GET /api/teacher/discussion-groups
 * @desc    Get all groups managed by teacher
 * @access  Teacher only
 * @query   course_id, group_type, status
 */

/**
 * @route   GET /api/teacher/discussion-groups/:id
 * @desc    Get group details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/discussion-groups/:id
 * @desc    Update group
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/discussion-groups/:id
 * @desc    Delete group
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/archive
 * @desc    Archive group
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/restore
 * @desc    Restore archived group
 * @access  Teacher only
 */

// ============================================================================
// GROUP MEMBERS APIs
// ============================================================================

/**
 * @route   GET /api/teacher/discussion-groups/:id/members
 * @desc    Get group members
 * @access  Teacher only
 * @query   role, status
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/members
 * @desc    Add members to group
 * @access  Teacher only
 */
interface AddMembersRequest {
  user_ids: string[];
  role?: 'MEMBER' | 'MODERATOR';
  send_notification?: boolean;
}

/**
 * @route   DELETE /api/teacher/discussion-groups/:id/members/:user_id
 * @desc    Remove member from group
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/discussion-groups/:id/members/:user_id
 * @desc    Update member role/permissions
 * @access  Teacher only
 */
interface UpdateMemberRequest {
  role?: 'MEMBER' | 'MODERATOR';
  can_post?: boolean;
  can_comment?: boolean;
  can_moderate?: boolean;
}

/**
 * @route   POST /api/teacher/discussion-groups/:id/members/:user_id/mute
 * @desc    Mute member
 * @access  Teacher only
 */
interface MuteMemberRequest {
  duration_hours?: number; // If not provided, indefinite
  reason?: string;
}

/**
 * @route   POST /api/teacher/discussion-groups/:id/members/:user_id/unmute
 * @desc    Unmute member
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/members/:user_id/ban
 * @desc    Ban member
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/discussion-groups/:id/members/:user_id/activity
 * @desc    Get member activity in group
 * @access  Teacher only
 */

// ============================================================================
// GROUP POSTS APIs
// ============================================================================

/**
 * @route   GET /api/teacher/discussion-groups/:id/posts
 * @desc    Get all posts in group
 * @access  Teacher only
 * @query   post_type, is_pinned, page, limit
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/posts
 * @desc    Create post in group
 * @access  Teacher only
 */
interface CreatePostRequest {
  title?: string;
  content: string;
  post_type?: 'DISCUSSION' | 'QUESTION' | 'ANNOUNCEMENT' | 'POLL' | 'RESOURCE';
  tags?: string[];
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  is_pinned?: boolean;
}

/**
 * @route   GET /api/teacher/discussion-groups/:id/posts/:post_id
 * @desc    Get post details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/discussion-groups/:id/posts/:post_id
 * @desc    Update post
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/discussion-groups/:id/posts/:post_id
 * @desc    Delete post
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/posts/:post_id/pin
 * @desc    Pin/unpin post
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/posts/:post_id/lock
 * @desc    Lock post (prevent comments)
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/posts/:post_id/hide
 * @desc    Hide post
 * @access  Teacher only
 */
interface HidePostRequest {
  reason: string;
}

/**
 * @route   GET /api/teacher/discussion-groups/:id/posts/:post_id/comments
 * @desc    Get post comments
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/discussion-groups/:id/posts/:post_id/comments/:comment_id
 * @desc    Delete comment
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/discussion-groups/:id/posts/:post_id/comments/:comment_id/best-answer
 * @desc    Mark comment as best answer
 * @access  Teacher only
 */

// ============================================================================
// GROUP ANALYTICS APIs
// ============================================================================

/**
 * @route   GET /api/teacher/discussion-groups/:id/analytics
 * @desc    Get group analytics
 * @access  Teacher only
 */
interface GroupAnalytics {
  overview: {
    total_members: number;
    total_posts: number;
    total_comments: number;
    active_members: number; // Last 7 days
  };
  engagement: {
    posts_per_day: number;
    comments_per_post: number;
    average_response_time: number; // minutes
  };
  top_contributors: Array<{
    user_id: string;
    user_name: string;
    post_count: number;
    comment_count: number;
  }>;
  activity_timeline: Array<{
    date: string;
    posts: number;
    comments: number;
    active_users: number;
  }>;
  popular_topics: Array<{
    tag: string;
    count: number;
  }>;
}

/**
 * @route   GET /api/teacher/discussion-groups/:id/activity
 * @desc    Get group activity log
 * @access  Teacher only
 * @query   action_type, user_id, date_from, date_to, page, limit
 */

/**
 * @route   GET /api/teacher/discussion-groups/:id/export
 * @desc    Export group data
 * @access  Teacher only
 * @query   format (json, csv, pdf)
 */
```

---

## 5. REAL-TIME FEATURES IMPLEMENTATION

### 5.1 WebRTC Live Streaming

```typescript
// ============================================================================
// WEBRTC LIVE LECTURE IMPLEMENTATION
// ============================================================================

// services/webrtc/lecture-stream.service.ts
import { JanusClient } from 'janus-gateway-client';
import { EventEmitter } from 'events';

export class LectureStreamService extends EventEmitter {
  private janus: JanusClient;
  private videoRoomPlugin: any;
  private localStream: MediaStream | null = null;
  
  constructor() {
    super();
    this.initJanus();
  }
  
  private async initJanus() {
    this.janus = new JanusClient({
      server: process.env.JANUS_SERVER_URL!,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: process.env.TURN_SERVER_URL!,
          username: process.env.TURN_USERNAME!,
          credential: process.env.TURN_CREDENTIAL!,
        },
      ],
    });
    
    await this.janus.connect();
  }
  
  /**
   * Start broadcasting lecture
   */
  async startBroadcast(lectureId: string, options: BroadcastOptions): Promise<void> {
    try {
      // Create video room
      this.videoRoomPlugin = await this.janus.attach('janus.plugin.videoroom');
      
      // Create room
      await this.videoRoomPlugin.send({
        message: {
          request: 'create',
          room: lectureId,
          publishers: 1, // Only teacher can publish
          bitrate: 1000000, // 1 Mbps
          fir_freq: 10,
          audiocodec: 'opus',
          videocodec: 'vp8',
          record: options.autoRecord,
          rec_dir: `/recordings/${lectureId}`,
        },
      });
      
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });
      
      // Join as publisher
      await this.videoRoomPlugin.send({
        message: {
          request: 'join',
          room: lectureId,
          ptype: 'publisher',
          display: options.displayName,
        },
        jsep: await this.createOffer(),
      });
      
      // Handle events
      this.setupEventHandlers();
      
      this.emit('broadcast-started', { lectureId });
    } catch (error) {
      console.error('Failed to start broadcast:', error);
      this.emit('broadcast-error', error);
      throw error;
    }
  }
  
  /**
   * Stop broadcasting
   */
  async stopBroadcast(): Promise<void> {
    try {
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // Leave room
      if (this.videoRoomPlugin) {
        await this.videoRoomPlugin.send({
          message: { request: 'leave' },
        });
        
        await this.videoRoomPlugin.detach();
      }
      
      this.emit('broadcast-stopped');
    } catch (error) {
      console.error('Failed to stop broadcast:', error);
      throw error;
    }
  }
  
  /**
   * Share screen
   */
  async shareScreen(): Promise<void> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      // Replace video track
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.peerConnection
        .getSenders()
        .find(s => s.track?.kind === 'video');
      
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }
      
      // Handle screen share stop
      videoTrack.onended = () => {
        this.stopScreenShare();
      };
      
      this.emit('screen-share-started');
    } catch (error) {
      console.error('Failed to share screen:', error);
      throw error;
    }
  }
  
  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    try {
      // Restore camera video
      const videoTrack = this.localStream?.getVideoTracks()[0];
      const sender = this.peerConnection
        .getSenders()
        .find(s => s.track?.kind === 'video');
      
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
      
      this.emit('screen-share-stopped');
    } catch (error) {
      console.error('Failed to stop screen share:', error);
      throw error;
    }
  }
  
  /**
   * Mute/unmute audio
   */
  toggleAudio(mute: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute;
      });
      
      this.emit('audio-toggled', { muted: mute });
    }
  }
  
  /**
   * Enable/disable video
   */
  toggleVideo(disable: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !disable;
      });
      
      this.emit('video-toggled', { disabled: disable });
    }
  }
  
  /**
   * Get broadcast statistics
   */
  async getStats(): Promise<BroadcastStats> {
    if (!this.peerConnection) {
      throw new Error('No active broadcast');
    }
    
    const stats = await this.peerConnection.getStats();
    
    let bitrate = 0;
    let packetLoss = 0;
    let fps = 0;
    
    stats.forEach(report => {
      if (report.type === 'outbound-rtp') {
        if (report.mediaType === 'video') {
          bitrate = report.bytesSent * 8 / report.timestamp;
          fps = report.framesPerSecond || 0;
        }
      }
      
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        packetLoss = (report.packetsLost / report.packetsSent) * 100;
      }
    });
    
    return {
      bitrate: Math.round(bitrate / 1000), // Kbps
      packetLoss: Math.round(packetLoss * 100) / 100,
      fps: Math.round(fps),
      resolution: this.getVideoResolution(),
    };
  }
  
  private async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    
    await this.peerConnection.setLocalDescription(offer);
    
    return offer;
  }
  
  private setupEventHandlers(): void {
    this.videoRoomPlugin.on('message', (message: any) => {
      if (message.videoroom === 'joined') {
        this.emit('viewer-joined', message.publishers);
      }
      
      if (message.videoroom === 'event') {
        if (message.publishers) {
          this.emit('viewers-updated', message.publishers);
        }
        
        if (message.leaving) {
          this.emit('viewer-left', message.leaving);
        }
      }
    });
  }
  
  private getVideoResolution(): string {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (!videoTrack) return 'unknown';
    
    const settings = videoTrack.getSettings();
    return `${settings.width}x${settings.height}`;
  }
}

interface BroadcastOptions {
  displayName: string;
  autoRecord: boolean;
}

interface BroadcastStats {
  bitrate: number; // Kbps
  packetLoss: number; // Percentage
  fps: number;
  resolution: string;
}

// ============================================================================
// INTERACTIVE WHITEBOARD
// ============================================================================

// services/whiteboard/whiteboard.service.ts
import { fabric } from 'fabric';
import { Socket } from 'socket.io-client';

export class WhiteboardService {
  private canvas: fabric.Canvas;
  private socket: Socket;
  private isDrawing = false;
  
  constructor(canvasElement: HTMLCanvasElement, socket: Socket) {
    this.canvas = new fabric.Canvas(canvasElement, {
      isDrawingMode: true,
      width: 1920,
      height: 1080,
    });
    
    this.socket = socket;
    this.setupEventListeners();
  }
  
  /**
   * Set drawing tool
   */
  setTool(tool: DrawingTool): void {
    switch (tool) {
      case 'pen':
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush.width = 2;
        this.canvas.freeDrawingBrush.color = '#000000';
        break;
      
      case 'eraser':
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush.width = 20;
        this.canvas.freeDrawingBrush.color = '#FFFFFF';
        break;
      
      case 'text':
      case 'shape':
      case 'select':
        this.canvas.isDrawingMode = false;
        break;
    }
  }
  
  /**
   * Add text
   */
  addText(text: string, x: number, y: number): void {
    const textObj = new fabric.Text(text, {
      left: x,
      top: y,
      fontSize: 20,
      fill: '#000000',
    });
    
    this.canvas.add(textObj);
    this.broadcastObject(textObj);
  }
  
  /**
   * Add shape
   */
  addShape(type: 'rectangle' | 'circle' | 'triangle', x: number, y: number): void {
    let shape: fabric.Object;
    
    switch (type) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: x,
          top: y,
          width: 100,
          height: 100,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
      
      case 'circle':
        shape = new fabric.Circle({
          left: x,
          top: y,
          radius: 50,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
      
      case 'triangle':
        shape = new fabric.Triangle({
          left: x,
          top: y,
          width: 100,
          height: 100,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
    }
    
    this.canvas.add(shape);
    this.broadcastObject(shape);
  }
  
  /**
   * Clear whiteboard
   */
  clear(): void {
    this.canvas.clear();
    this.socket.emit('whiteboard:clear');
  }
  
  /**
   * Undo last action
   */
  undo(): void {
    const objects = this.canvas.getObjects();
    if (objects.length > 0) {
      const lastObject = objects[objects.length - 1];
      this.canvas.remove(lastObject);
      this.socket.emit('whiteboard:undo', lastObject.toJSON());
    }
  }
  
  /**
   * Export whiteboard as image
   */
  exportAsImage(): string {
    return this.canvas.toDataURL({
      format: 'png',
      quality: 1,
    });
  }
  
  /**
   * Save whiteboard state
   */
  save(): string {
    return JSON.stringify(this.canvas.toJSON());
  }
  
  /**
   * Load whiteboard state
   */
  load(state: string): void {
    this.canvas.loadFromJSON(state, () => {
      this.canvas.renderAll();
    });
  }
  
  private setupEventListeners(): void {
    // Local drawing events
    this.canvas.on('path:created', (e: any) => {
      this.broadcastObject(e.path);
    });
    
    this.canvas.on('object:modified', (e: any) => {
      this.socket.emit('whiteboard:update', e.target.toJSON());
    });
    
    // Remote drawing events
    this.socket.on('whiteboard:draw', (data: any) => {
      fabric.util.enlivenObjects([data], (objects: fabric.Object[]) => {
        objects.forEach(obj => {
          this.canvas.add(obj);
        });
        this.canvas.renderAll();
      });
    });
    
    this.socket.on('whiteboard:update', (data: any) => {
      const object = this.canvas.getObjects().find(obj => obj.toJSON().id === data.id);
      if (object) {
        object.set(data);
        this.canvas.renderAll();
      }
    });
    
    this.socket.on('whiteboard:clear', () => {
      this.canvas.clear();
    });
  }
  
  private broadcastObject(obj: fabric.Object): void {
    this.socket.emit('whiteboard:draw', obj.toJSON());
  }
}

type DrawingTool = 'pen' | 'eraser' | 'text' | 'shape' | 'select';
```

Tôi đã tạo kiến trúc hệ thống quản lý giảng viên rất chi tiết! 

**Điểm nổi bật:**

1. **Live Lecture Management** - WebRTC streaming với Janus Gateway
2. **Content Management** - Quản lý tài liệu và kế hoạch giảng dạy đầy đủ
3. **Student Assessment** - Phiếu theo dõi, đánh giá chi tiết
4. **Discussion Groups** - CRUD hoàn chỉnh với moderation tools
5. **Real-time Features** - Interactive whiteboard, Q&A, polls

# KIẾN TRÚC HỆ THỐNG QUẢN LÝ GIẢNG VIÊN - BỔ SUNG

## PHẦN BỔ SUNG: EXAM, ATTENDANCE, ANNOUNCEMENTS & LIBRARY

---

## 6. QUẢN LÝ THI CỬ (EXAM MANAGEMENT)

### 6.1 Database Schema - Exam Management

```sql
-- ============================================================================
-- EXAM MANAGEMENT TABLES
-- ============================================================================

-- Bảng đề thi
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    offering_id UUID REFERENCES course_offerings(id),
    
    -- Thông tin đề thi
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exam_type VARCHAR(50) NOT NULL, 
    -- QUIZ, MIDTERM, FINAL, PRACTICE, PLACEMENT
    
    -- Cấu trúc đề thi
    total_questions INTEGER NOT NULL,
    total_points DECIMAL(10,2) NOT NULL,
    passing_score DECIMAL(5,2), -- Percentage to pass
    
    -- Thời gian
    duration_minutes INTEGER NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    late_submission_allowed BOOLEAN DEFAULT FALSE,
    late_penalty_percent DECIMAL(5,2), -- Penalty per day late
    
    -- Cài đặt đề thi
    settings JSONB DEFAULT '{}',
    -- {
    --   "shuffle_questions": true,
    --   "shuffle_options": true,
    --   "show_results": "after_submission", // after_submission, after_deadline, manual
    --   "show_correct_answers": false,
    --   "attempts_allowed": 1,
    --   "require_proctoring": false,
    --   "require_lockdown_browser": false,
    --   "allow_calculator": false,
    --   "allow_notes": false,
    --   "time_limit_per_question": null,
    --   "require_webcam": false,
    --   "auto_submit": true
    -- }
    
    -- Phân bố điểm
    grade_weight DECIMAL(5,2), -- Weight in final grade (percentage)
    
    -- Instructions
    instructions TEXT,
    
    -- Access control
    access_code VARCHAR(50), -- Optional access code
    ip_restrictions TEXT[], -- Array of allowed IP ranges
    
    -- Status
    status VARCHAR(50) DEFAULT 'DRAFT', 
    -- DRAFT, SCHEDULED, ACTIVE, COMPLETED, ARCHIVED, CANCELLED
    
    -- Version control
    version INTEGER DEFAULT 1,
    parent_exam_id UUID REFERENCES exams(id),
    is_template BOOLEAN DEFAULT FALSE,
    
    -- Analytics
    average_score DECIMAL(5,2),
    highest_score DECIMAL(5,2),
    lowest_score DECIMAL(5,2),
    completion_rate DECIMAL(5,2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_exams_teacher ON exams(teacher_id);
CREATE INDEX idx_exams_course ON exams(course_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_start_time ON exams(start_time);

-- Bảng câu hỏi trong đề thi
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    
    -- Thông tin câu hỏi
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    -- MCQ, MULTIPLE_SELECT, TRUE_FALSE, SHORT_ANSWER, ESSAY, FILL_BLANK, MATCHING, CODE
    
    -- Points
    points DECIMAL(5,2) NOT NULL,
    
    -- Content
    question_content JSONB NOT NULL,
    -- For MCQ/Multiple Select:
    -- {
    --   "options": [
    --     {"id": "A", "text": "Option A", "is_correct": true},
    --     {"id": "B", "text": "Option B", "is_correct": false}
    --   ],
    --   "explanation": "Why A is correct..."
    -- }
    -- For Essay:
    -- {
    --   "rubric": [
    --     {"criterion": "Content", "points": 5},
    --     {"criterion": "Organization", "points": 3}
    --   ],
    --   "sample_answer": "...",
    --   "min_words": 300,
    --   "max_words": 500
    -- }
    -- For Code:
    -- {
    --   "language": "python",
    --   "starter_code": "def solution():\n    pass",
    --   "test_cases": [...],
    --   "time_limit": 2000,
    --   "memory_limit": 256
    -- }
    
    -- Media
    attachments JSONB, -- Images, audio, video
    -- [
    --   {
    --     "type": "image",
    --     "url": "...",
    --     "caption": "..."
    --   }
    -- ]
    
    -- Difficulty
    difficulty VARCHAR(50), -- EASY, MEDIUM, HARD
    
    -- Topics/Tags
    topics TEXT[],
    tags TEXT[],
    
    -- Learning objectives
    learning_objective_id UUID,
    bloom_taxonomy_level VARCHAR(50), 
    -- REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE
    
    -- Time limit per question (optional)
    time_limit_seconds INTEGER,
    
    -- Order
    sort_order INTEGER,
    section_id UUID REFERENCES exam_sections(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_section ON exam_questions(section_id);
CREATE INDEX idx_exam_questions_order ON exam_questions(exam_id, sort_order);

-- Bảng phần/section trong đề thi
CREATE TABLE exam_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    
    -- Section info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Instructions
    instructions TEXT,
    
    -- Order
    sort_order INTEGER NOT NULL,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    -- {
    --   "shuffle_questions": true,
    --   "time_limit_minutes": 30,
    --   "must_complete_before_next": true
    -- }
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exam_sections_exam ON exam_sections(exam_id);

-- Bảng bài thi của sinh viên
CREATE TABLE exam_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id),
    student_id UUID NOT NULL REFERENCES users(id),
    
    -- Attempt info
    attempt_number INTEGER NOT NULL DEFAULT 1,
    
    -- Timing
    started_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP,
    time_spent_seconds INTEGER,
    
    -- Answers
    answers JSONB NOT NULL,
    -- {
    --   "question_id_1": {
    --     "answer": "A",
    --     "time_spent": 45,
    --     "flagged": false
    --   },
    --   "question_id_2": {
    --     "answer": "Sample essay text...",
    --     "time_spent": 600
    --   }
    -- }
    
    -- Scoring
    total_score DECIMAL(10,2),
    score_percentage DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    -- IN_PROGRESS, SUBMITTED, GRADING, GRADED
    
    -- Auto-grading results
    auto_graded_at TIMESTAMP,
    auto_grade_score DECIMAL(10,2),
    
    -- Manual grading
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP,
    
    -- Feedback
    feedback TEXT,
    question_feedback JSONB, -- Feedback per question
    
    -- Flags and violations
    flags JSONB DEFAULT '[]',
    -- [
    --   {
    --     "type": "TAB_SWITCH",
    --     "timestamp": "2025-01-02T10:30:00Z",
    --     "details": "..."
    --   }
    -- ]
    
    violations INTEGER DEFAULT 0,
    proctoring_data JSONB, -- From proctoring system
    
    -- IP and device info
    ip_address INET,
    user_agent TEXT,
    
    -- Late submission
    is_late BOOLEAN DEFAULT FALSE,
    late_penalty DECIMAL(5,2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(exam_id, student_id, attempt_number)
);

CREATE INDEX idx_exam_submissions_exam ON exam_submissions(exam_id);
CREATE INDEX idx_exam_submissions_student ON exam_submissions(student_id);
CREATE INDEX idx_exam_submissions_status ON exam_submissions(status);

-- Bảng chi tiết điểm từng câu
CREATE TABLE exam_question_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES exam_questions(id),
    
    -- Student answer
    student_answer JSONB,
    
    -- Scoring
    points_earned DECIMAL(5,2) NOT NULL,
    points_possible DECIMAL(5,2) NOT NULL,
    
    -- Grading
    is_correct BOOLEAN,
    is_partially_correct BOOLEAN DEFAULT FALSE,
    
    -- Rubric scoring (for essays)
    rubric_scores JSONB,
    -- [
    --   {
    --     "criterion": "Content",
    --     "points_earned": 4,
    --     "points_possible": 5,
    --     "comment": "Good analysis but missing key points"
    --   }
    -- ]
    
    -- Feedback
    feedback TEXT,
    
    -- Auto-grading
    auto_graded BOOLEAN DEFAULT FALSE,
    
    -- Manual grading
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_question_scores_submission ON exam_question_scores(submission_id);
CREATE INDEX idx_question_scores_question ON exam_question_scores(question_id);

-- Bảng ngân hàng câu hỏi
CREATE TABLE question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    
    -- Question info (similar to exam_questions)
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    question_content JSONB NOT NULL,
    
    -- Categorization
    category VARCHAR(100),
    difficulty VARCHAR(50),
    topics TEXT[],
    tags TEXT[],
    
    -- Learning objectives
    learning_objective VARCHAR(255),
    bloom_taxonomy_level VARCHAR(50),
    
    -- Usage statistics
    times_used INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    
    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with_teachers UUID[],
    
    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_question_bank_teacher ON question_bank(teacher_id);
CREATE INDEX idx_question_bank_course ON question_bank(course_id);
CREATE INDEX idx_question_bank_category ON question_bank(category);
CREATE INDEX idx_question_bank_difficulty ON question_bank(difficulty);

-- Bảng phân tích kết quả thi
CREATE TABLE exam_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    
    -- Overall statistics
    total_submissions INTEGER DEFAULT 0,
    completed_submissions INTEGER DEFAULT 0,
    
    -- Score distribution
    average_score DECIMAL(5,2),
    median_score DECIMAL(5,2),
    std_deviation DECIMAL(5,2),
    highest_score DECIMAL(5,2),
    lowest_score DECIMAL(5,2),
    
    -- Grade distribution
    grade_distribution JSONB,
    -- {
    --   "A": 5,
    --   "B": 10,
    --   "C": 8,
    --   "D": 3,
    --   "F": 2
    -- }
    
    -- Question analysis
    question_statistics JSONB,
    -- {
    --   "question_id_1": {
    --     "average_score": 4.5,
    --     "difficulty_index": 0.75,
    --     "discrimination_index": 0.35,
    --     "time_average": 120
    --   }
    -- }
    
    -- Time analysis
    average_time_minutes DECIMAL(10,2),
    completion_rate DECIMAL(5,2),
    
    -- Reliability
    cronbach_alpha DECIMAL(5,4), -- Internal consistency
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(exam_id)
);

CREATE INDEX idx_exam_analytics_exam ON exam_analytics(exam_id);

-- ============================================================================
-- GRADE MANAGEMENT TABLES
-- ============================================================================

-- Bảng điểm tổng hợp
CREATE TABLE gradebook (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    offering_id UUID NOT NULL REFERENCES course_offerings(id),
    
    -- Gradebook info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Grading scale
    grading_scale JSONB NOT NULL,
    -- {
    --   "A": {"min": 90, "max": 100},
    --   "B+": {"min": 85, "max": 89.99},
    --   "B": {"min": 80, "max": 84.99},
    --   ...
    -- }
    
    -- Grade components and weights
    grade_components JSONB NOT NULL,
    -- {
    --   "attendance": {"weight": 10, "max_points": 100},
    --   "assignments": {"weight": 30, "max_points": 100},
    --   "quizzes": {"weight": 20, "max_points": 100},
    --   "midterm": {"weight": 20, "max_points": 100},
    --   "final": {"weight": 20, "max_points": 100}
    -- }
    
    -- Policies
    drop_lowest JSONB,
    -- {
    --   "assignments": 1,
    --   "quizzes": 2
    -- }
    
    allow_extra_credit BOOLEAN DEFAULT FALSE,
    late_penalty_policy JSONB,
    -- {
    --   "enabled": true,
    --   "penalty_percent_per_day": 10,
    --   "max_days_late": 3
    -- }
    
    -- Display settings
    show_what_if BOOLEAN DEFAULT TRUE, -- Allow students to calculate "what if" scenarios
    show_statistics BOOLEAN DEFAULT TRUE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, LOCKED, ARCHIVED
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gradebook_teacher ON gradebook(teacher_id);
CREATE INDEX idx_gradebook_course ON gradebook(course_id);
CREATE INDEX idx_gradebook_offering ON gradebook(offering_id);

-- Bảng mục điểm (grade items)
CREATE TABLE grade_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gradebook_id UUID NOT NULL REFERENCES gradebook(id) ON DELETE CASCADE,
    
    -- Item info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Category
    category VARCHAR(100) NOT NULL, -- ATTENDANCE, ASSIGNMENT, QUIZ, EXAM, etc.
    
    -- Points
    max_points DECIMAL(10,2) NOT NULL,
    
    -- Weight (if using weighted grading)
    weight DECIMAL(5,2),
    
    -- Due date
    due_date TIMESTAMP,
    
    -- Extra credit
    is_extra_credit BOOLEAN DEFAULT FALSE,
    
    -- Count towards final grade
    include_in_grade BOOLEAN DEFAULT TRUE,
    
    -- Order
    sort_order INTEGER,
    
    -- Related entity
    entity_type VARCHAR(50), -- EXAM, ASSIGNMENT, ATTENDANCE
    entity_id UUID,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, HIDDEN, DELETED
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grade_items_gradebook ON grade_items(gradebook_id);
CREATE INDEX idx_grade_items_category ON grade_items(category);

-- Bảng điểm sinh viên
CREATE TABLE student_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_item_id UUID NOT NULL REFERENCES grade_items(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id),
    
    -- Score
    score DECIMAL(10,2),
    max_points DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'GRADED',
    -- NOT_SUBMITTED, SUBMITTED, GRADING, GRADED, EXCUSED, MISSING
    
    -- Late submission
    is_late BOOLEAN DEFAULT FALSE,
    late_days INTEGER DEFAULT 0,
    late_penalty DECIMAL(5,2) DEFAULT 0,
    
    -- Override
    is_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    
    -- Feedback
    feedback TEXT,
    
    -- Grading
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP,
    
    -- Submission reference
    submission_id UUID, -- References exam_submissions or assignment_submissions
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(grade_item_id, student_id)
);

CREATE INDEX idx_student_grades_item ON student_grades(grade_item_id);
CREATE INDEX idx_student_grades_student ON student_grades(student_id);
CREATE INDEX idx_student_grades_status ON student_grades(status);

-- Bảng điểm tổng kết
CREATE TABLE final_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gradebook_id UUID NOT NULL REFERENCES gradebook(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id),
    
    -- Calculated grades
    total_points_earned DECIMAL(10,2),
    total_points_possible DECIMAL(10,2),
    percentage DECIMAL(5,2),
    
    -- Letter grade
    letter_grade VARCHAR(5),
    grade_points DECIMAL(5,2), -- GPA points (e.g., 4.0, 3.5)
    
    -- Component scores
    component_scores JSONB,
    -- {
    --   "attendance": {"earned": 95, "possible": 100, "percentage": 95},
    --   "assignments": {"earned": 270, "possible": 300, "percentage": 90},
    --   ...
    -- }
    
    -- Status
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    -- IN_PROGRESS, FINALIZED, INCOMPLETE, WITHDRAWN
    
    -- Override
    is_override BOOLEAN DEFAULT FALSE,
    override_grade VARCHAR(5),
    override_reason TEXT,
    override_by UUID REFERENCES users(id),
    
    -- Finalization
    finalized_at TIMESTAMP,
    finalized_by UUID REFERENCES users(id),
    
    -- Comments
    comments TEXT,
    
    -- Metadata
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(gradebook_id, student_id)
);

CREATE INDEX idx_final_grades_gradebook ON final_grades(gradebook_id);
CREATE INDEX idx_final_grades_student ON final_grades(student_id);
CREATE INDEX idx_final_grades_status ON final_grades(status);

-- Bảng lịch sử thay đổi điểm
CREATE TABLE grade_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_grade_id UUID REFERENCES student_grades(id),
    final_grade_id UUID REFERENCES final_grades(id),
    
    -- Change info
    change_type VARCHAR(50) NOT NULL,
    -- SCORE_UPDATE, OVERRIDE, REGRADE, EXCUSED, STATUS_CHANGE
    
    -- Old and new values
    old_value JSONB,
    new_value JSONB,
    
    -- Reason
    reason TEXT,
    
    -- Changed by
    changed_by UUID NOT NULL REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grade_history_student_grade ON grade_change_history(student_grade_id);
CREATE INDEX idx_grade_history_final_grade ON grade_change_history(final_grade_id);
CREATE INDEX idx_grade_history_changed_by ON grade_change_history(changed_by);
```

### 6.2 API Endpoints - Exam Management

```typescript
// ============================================================================
// EXAM MANAGEMENT APIs
// ============================================================================

/**
 * @route   POST /api/teacher/exams
 * @desc    Create new exam
 * @access  Teacher only
 */
interface CreateExamRequest {
  course_id: string;
  offering_id?: string;
  title: string;
  description?: string;
  exam_type: 'QUIZ' | 'MIDTERM' | 'FINAL' | 'PRACTICE' | 'PLACEMENT';
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  total_points: number;
  passing_score?: number;
  settings?: ExamSettings;
  instructions?: string;
  grade_weight?: number;
}

interface ExamSettings {
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_results?: 'after_submission' | 'after_deadline' | 'manual';
  show_correct_answers?: boolean;
  attempts_allowed?: number;
  require_proctoring?: boolean;
  require_lockdown_browser?: boolean;
  allow_calculator?: boolean;
  allow_notes?: boolean;
  auto_submit?: boolean;
}

/**
 * @route   GET /api/teacher/exams
 * @desc    Get all exams
 * @access  Teacher only
 * @query   course_id, exam_type, status, date_from, date_to
 */

/**
 * @route   GET /api/teacher/exams/:id
 * @desc    Get exam details
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/exams/:id
 * @desc    Update exam
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/exams/:id
 * @desc    Delete exam
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/exams/:id/duplicate
 * @desc    Duplicate exam
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/exams/:id/publish
 * @desc    Publish exam (make available to students)
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/exams/:id/sections
 * @desc    Add section to exam
 * @access  Teacher only
 */
interface CreateSectionRequest {
  title: string;
  description?: string;
  instructions?: string;
  sort_order: number;
  settings?: {
    shuffle_questions?: boolean;
    time_limit_minutes?: number;
    must_complete_before_next?: boolean;
  };
}

// ============================================================================
// EXAM QUESTIONS APIs
// ============================================================================

/**
 * @route   POST /api/teacher/exams/:exam_id/questions
 * @desc    Add question to exam
 * @access  Teacher only
 */
interface AddQuestionRequest {
  question_number: number;
  question_text: string;
  question_type: 'MCQ' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'CODE';
  points: number;
  question_content: any; // Varies by type
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  topics?: string[];
  tags?: string[];
  section_id?: string;
  sort_order?: number;
}

/**
 * @route   GET /api/teacher/exams/:exam_id/questions
 * @desc    Get all questions in exam
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/exams/:exam_id/questions/:question_id
 * @desc    Update question
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/exams/:exam_id/questions/:question_id
 * @desc    Delete question
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/exams/:exam_id/questions/reorder
 * @desc    Reorder questions
 * @access  Teacher only
 */
interface ReorderQuestionsRequest {
  question_orders: Array<{
    question_id: string;
    sort_order: number;
  }>;
}

/**
 * @route   POST /api/teacher/exams/:exam_id/questions/import
 * @desc    Import questions from question bank
 * @access  Teacher only
 */
interface ImportQuestionsRequest {
  question_ids: string[];
  section_id?: string;
}

/**
 * @route   POST /api/teacher/exams/:exam_id/generate-questions
 * @desc    AI-generate questions based on content
 * @access  Teacher only
 */
interface GenerateQuestionsRequest {
  topic: string;
  count: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question_types: string[];
  bloom_level?: string;
}

// ============================================================================
// QUESTION BANK APIs
// ============================================================================

/**
 * @route   POST /api/teacher/question-bank
 * @desc    Add question to question bank
 * @access  Teacher only
 */
interface AddToQuestionBankRequest {
  question_text: string;
  question_type: string;
  question_content: any;
  course_id?: string;
  category?: string;
  difficulty?: string;
  topics?: string[];
  tags?: string[];
  learning_objective?: string;
  bloom_taxonomy_level?: string;
}

/**
 * @route   GET /api/teacher/question-bank
 * @desc    Get questions from bank
 * @access  Teacher only
 * @query   course_id, category, difficulty, question_type, tags
 */

/**
 * @route   PUT /api/teacher/question-bank/:id
 * @desc    Update question in bank
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/question-bank/:id
 * @desc    Delete question from bank
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/question-bank/:id/share
 * @desc    Share question with other teachers
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/question-bank/statistics
 * @desc    Get question bank statistics
 * @access  Teacher only
 */

// ============================================================================
// EXAM SUBMISSIONS & GRADING APIs
// ============================================================================

/**
 * @route   GET /api/teacher/exams/:exam_id/submissions
 * @desc    Get all submissions for exam
 * @access  Teacher only
 * @query   status, student_id, attempt_number
 */

/**
 * @route   GET /api/teacher/exams/:exam_id/submissions/:submission_id
 * @desc    Get submission details
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/exams/:exam_id/submissions/:submission_id/grade
 * @desc    Grade submission (or individual questions)
 * @access  Teacher only
 */
interface GradeSubmissionRequest {
  question_scores: Array<{
    question_id: string;
    points_earned: number;
    feedback?: string;
    rubric_scores?: Array<{
      criterion: string;
      points_earned: number;
      points_possible: number;
      comment?: string;
    }>;
  }>;
  overall_feedback?: string;
}

/**
 * @route   POST /api/teacher/exams/:exam_id/submissions/:submission_id/regrade
 * @desc    Regrade submission
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/exams/:exam_id/auto-grade
 * @desc    Auto-grade all objective questions
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/exams/:exam_id/grading-queue
 * @desc    Get submissions that need manual grading
 * @access  Teacher only
 * @query   question_type (ESSAY, SHORT_ANSWER)
 */

/**
 * @route   POST /api/teacher/exams/:exam_id/release-grades
 * @desc    Release grades to students
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/exams/:exam_id/analytics
 * @desc    Get exam analytics
 * @access  Teacher only
 */
interface ExamAnalyticsResponse {
  overview: {
    total_submissions: number;
    completed: number;
    in_progress: number;
    average_score: number;
    median_score: number;
    highest_score: number;
    lowest_score: number;
    std_deviation: number;
    pass_rate: number;
  };
  grade_distribution: {
    [grade: string]: number;
  };
  question_analysis: Array<{
    question_id: string;
    question_number: number;
    average_score: number;
    difficulty_index: number; // 0-1
    discrimination_index: number; // -1 to 1
    most_common_answer: string;
    correct_percentage: number;
  }>;
  time_analysis: {
    average_time_minutes: number;
    median_time_minutes: number;
    fastest_completion: number;
    slowest_completion: number;
  };
  reliability: {
    cronbach_alpha: number;
  };
}

/**
 * @route   GET /api/teacher/exams/:exam_id/export
 * @desc    Export exam results
 * @access  Teacher only
 * @query   format (csv, excel, pdf)
 */

/**
 * @route   POST /api/teacher/exams/:exam_id/curve
 * @desc    Apply grade curve
 * @access  Teacher only
 */
interface ApplyCurveRequest {
  curve_type: 'LINEAR' | 'FLAT' | 'BELL';
  parameters: {
    add_points?: number;
    multiply_by?: number;
    set_average_to?: number;
  };
}

// ============================================================================
// GRADEBOOK APIs
// ============================================================================

/**
 * @route   POST /api/teacher/gradebook
 * @desc    Create gradebook for course
 * @access  Teacher only
 */
interface CreateGradebookRequest {
  course_id: string;
  offering_id: string;
  name: string;
  description?: string;
  grading_scale: GradingScale;
  grade_components: GradeComponents;
  drop_lowest?: { [category: string]: number };
  allow_extra_credit?: boolean;
  late_penalty_policy?: LatePenaltyPolicy;
}

interface GradingScale {
  [letterGrade: string]: {
    min: number;
    max: number;
  };
}

interface GradeComponents {
  [component: string]: {
    weight: number;
    max_points: number;
  };
}

interface LatePenaltyPolicy {
  enabled: boolean;
  penalty_percent_per_day: number;
  max_days_late: number;
}

/**
 * @route   GET /api/teacher/gradebook/:id
 * @desc    Get gradebook
 * @access  Teacher only
 */

/**
 * @route   PUT /api/teacher/gradebook/:id
 * @desc    Update gradebook settings
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/gradebook/:id/items
 * @desc    Get all grade items
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/gradebook/:id/items
 * @desc    Create grade item
 * @access  Teacher only
 */
interface CreateGradeItemRequest {
  name: string;
  description?: string;
  category: string;
  max_points: number;
  weight?: number;
  due_date?: string;
  is_extra_credit?: boolean;
  include_in_grade?: boolean;
  entity_type?: string;
  entity_id?: string;
}

/**
 * @route   PUT /api/teacher/gradebook/:id/items/:item_id
 * @desc    Update grade item
 * @access  Teacher only
 */

/**
 * @route   DELETE /api/teacher/gradebook/:id/items/:item_id
 * @desc    Delete grade item
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/gradebook/:id/grades
 * @desc    Get all student grades
 * @access  Teacher only
 * @query   student_id, category, status
 */

/**
 * @route   POST /api/teacher/gradebook/:id/grades
 * @desc    Enter/update student grade
 * @access  Teacher only
 */
interface EnterGradeRequest {
  grade_item_id: string;
  student_id: string;
  score: number;
  feedback?: string;
  is_late?: boolean;
  is_override?: boolean;
  override_reason?: string;
}

/**
 * @route   POST /api/teacher/gradebook/:id/grades/batch
 * @desc    Batch update grades
 * @access  Teacher only
 */
interface BatchUpdateGradesRequest {
  grades: Array<{
    grade_item_id: string;
    student_id: string;
    score: number;
    feedback?: string;
  }>;
}

/**
 * @route   POST /api/teacher/gradebook/:id/calculate
 * @desc    Recalculate all final grades
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/gradebook/:id/final-grades
 * @desc    Get final grades for all students
 * @access  Teacher only
 */

/**
 * @route   POST /api/teacher/gradebook/:id/final-grades/:student_id/override
 * @desc    Override final grade
 * @access  Teacher only
 */
interface OverrideFinalGradeRequest {
  override_grade: string;
  override_reason: string;
}

/**
 * @route   POST /api/teacher/gradebook/:id/finalize
 * @desc    Finalize all grades (lock them)
 * @access  Teacher only
 */

/**
 * @route   GET /api/teacher/gradebook/:id/export
 * @desc    Export gradebook
 * @access  Teacher only
 * @query   format (csv, excel, pdf)
 */

/**
 * @route   GET /api/teacher/gradebook/:id/statistics
 * @desc    Get gradebook statistics
 * @access  Teacher only
 */
interface GradebookStatistics {
  class_average: number;
  median_grade: number;
  grade_distribution: { [grade: string]: number };
  component_averages: { [component: string]: number };
  at_risk_students: Array<{
    student_id: string;
    student_name: string;
    current_grade: number;
    missing_assignments: number;
  }>;
}

/**
 * @route   GET /api/teacher/gradebook/:id/history
 * @desc    Get grade change history
 * @access  Teacher only
 * @query   student_id, changed_by, date_from, date_to
 */
```

Tôi sẽ tiếp tục với **QUẢN LÝ ĐIỂM DANH** trong message tiếp theo để tránh quá dài. Bạn muốn tôi tiếp tục không?