# 🏗️ Tóm Tắt Kiến Trúc Hệ Thống LMS Math

**Tên dự án**: LabTwin / LMS Math  
**Loại**: Learning Management System (LMS) với AI-Driven Education  
**Tech Stack**: Next.js 15, TypeScript, PostgreSQL, Prisma, NextAuth.js  
**Deployment**: Google Cloud Run (Container-based)

---

## 📐 Tổng Quan Kiến Trúc

Hệ thống được xây dựng theo mô hình **AI-Driven Education** với 5 tầng chính:

```
┌─────────────────────────────────────────────────────────┐
│  1. UX Layer (Presentation)                             │
│     - Student Dashboard, Teacher Dashboard, Admin      │
│     - AI Tutor Interface, Learning Paths               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. API & Integration Layer                             │
│     - REST API Routes, Webhooks                         │
│     - Third-party AI Models (GPT-4, Gemini, Grok)      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. AI Layer (Core Intelligence)                        │
│     - AI Tutor Agent                                    │
│     - Personal Learning Graph (PLG)                     │
│     - Recommendation Engine                             │
│     - Assessment & Mastery Engine                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  4. Data Layer                                          │
│     - User Profiles, XP System                          │
│     - Content Graph, Interaction Logs                   │
│     - Encryption & Access Control                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  5. Infrastructure Layer                                │
│     - Authentication (NextAuth.js)                     │
│     - Database (PostgreSQL + Prisma)                    │
│     - Storage (GCS, S3)                                 │
│     - Monitoring & Analytics                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Components

### 1. **Frontend Application** (Next.js 15 App Router)

**Cấu trúc thư mục:**
```
app/
├── (auth)/              # Authentication pages
├── (dashboard)/         # Protected dashboard routes
│   ├── (routes)/
│   │   ├── dashboard/   # Student dashboard
│   │   ├── admin/       # Admin panel
│   │   ├── teacher/     # Teacher dashboard
│   │   ├── ai-tutor/    # AI Tutor interface
│   │   └── learning-paths/ # Learning paths
│   └── _components/     # Shared dashboard components
├── (marketing)/         # Public marketing pages
├── (course)/            # Course pages
└── api/                 # API routes
```

**Tính năng chính:**
- ✅ Server-side rendering (SSR) với Next.js 15
- ✅ Server Actions cho form handling
- ✅ Real-time updates với Socket.io
- ✅ Responsive design với Tailwind CSS
- ✅ Component library (Radix UI, MUI)

### 2. **Authentication & Authorization**

**Provider**: NextAuth.js v4

**Các phương thức đăng nhập:**
- 🔐 Credentials (Email/Password)
- 🔵 Google OAuth
- 🔒 Two-Factor Authentication (2FA)
- 📝 Account lockout sau nhiều lần đăng nhập sai

**Phân quyền (RBAC):**
- **ADMIN**: Toàn quyền quản lý hệ thống
- **TEACHER**: Quản lý khóa học và học sinh
- **STUDENT**: Học tập và tương tác với nội dung
- **GUEST**: Duyệt catalog

**Middleware**: 
- Route protection
- Role-based access control
- Automatic redirects
- Domain enforcement (inphysic.com)

### 3. **Database Schema** (PostgreSQL + Prisma)

**Các model chính:**

#### User Management
- `User`: Thông tin người dùng, role, XP, 2FA
- `Account`: OAuth accounts
- `Session`: User sessions
- `AuthLog`: Audit log cho authentication

#### Learning Content
- `Course`: Khóa học
- `Chapter`: Chương/bài học
- `Category`: Danh mục khóa học
- `Attachment`: Tài liệu đính kèm
- `MuxData`: Video streaming data

#### Progress Tracking
- `UserProgress`: Tiến độ học tập
- `Purchase`: Ghi nhận mua khóa học
- `LabCompletion`: Hoàn thành lab/simulation

#### AI & Content Generation
- `AIGeneratedContent`: Nội dung được AI tạo
- `Personal Learning Graph`: (Conceptual, trong code)

#### STEM Projects
- `STEMProject`: Dự án STEM
- `STEMMilestone`: Cột mốc dự án
- `STEMDeliverable`: Sản phẩm dự án
- `STEMFeedback`: Phản hồi từ giáo viên

#### Communication
- `ChatRoom`: Phòng chat
- `ChatMessage`: Tin nhắn
- `ChatParticipant`: Người tham gia

#### Gamification
- `DebateTopic`: Chủ đề tranh luận
- `DebateVote`: Bình chọn
- `DebateResult`: Kết quả

### 4. **AI Services Layer**

#### AI Tutor System
**Location**: `/app/api/ai-tutor-chat/route.ts`

**Tính năng:**
- 🤖 Intelligent model selection (GPT-4, Grok, Gemini)
- 😊 Emotion detection từ user messages
- 📊 Context-aware responses
- 🎯 Action extraction (suggested actions)
- 🔄 Multi-tier fallback system

**Flow:**
```
User Message → Model Selection → AI Processing → 
Emotion Detection → Action Extraction → Response
```

#### Personal Learning Graph (PLG)
**Location**: `/lib/plg/service.ts`

**Chức năng:**
- 📈 Track skill mastery theo thời gian
- 🧠 Forgetting curve algorithm (Ebbinghaus)
- 🔁 Spaced repetition
- 💡 Content recommendations
- 📊 Learning analytics

**APIs:**
- `GET /api/plg/:studentId` - Lấy PLG data
- `POST /api/plg/:studentId/update-skill` - Cập nhật skill
- `POST /api/plg/:studentId/record-interaction` - Ghi nhận tương tác
- `GET /api/plg/:studentId/recommendations` - Đề xuất nội dung

#### AI Content Generation
- **Lesson Generator**: Tạo bài học tự động
- **Quiz Generator**: Tạo câu hỏi
- **Assessment Generator**: Tạo bài đánh giá
- **Grading System**: Chấm điểm tự động với OCR

### 5. **Virtual Labs & Simulations**

**Location**: `/python-simulations/`

**Các lab hiện có:**
1. **Optics Lab** (`optics-lab/`)
   - Refraction, reflection
   - Light propagation
   - Shadow simulation

2. **Physics Motion** (`physics-motion/`)
   - Projectile motion
   - Harmonic motion
   - Motion tracking

3. **Chemistry Lab** (`chemistry-lab/`)
   - Chemical reactions
   - 3D molecular visualization

4. **Aerodynamics** (`aerodynamics/`)
   - Airflow simulation
   - 3D flow visualization

5. **OCR Grading** (`ocr-grading/`)
   - Handwriting recognition
   - AI-powered grading
   - Multi-subject support

**Architecture:**
- Python backend (Flask/FastAPI)
- RESTful API endpoints
- JSON response format
- Real-time simulation data

### 6. **Storage & Media**

**Cloud Storage:**
- **Google Cloud Storage (GCS)**: Video, images, documents
- **AWS S3**: Backup storage option
- **Mux**: Video streaming service

**File Upload:**
- UploadThing integration
- Signed URLs cho secure access
- Image proxy cho optimization

### 7. **Deployment Architecture**

#### Container Setup
**Dockerfile**: Multi-stage build
- Base: Node.js 20-slim
- Dependencies stage
- Builder stage (Prisma generate + Next.js build)
- Runner stage (standalone output)

#### Cloud Run Deployment
- **Platform**: Google Cloud Run
- **Region**: asia-east1
- **Resources**: 2 CPU, 2GB RAM
- **Scaling**: 0-10 instances
- **Domain**: inphysic.com

#### CI/CD
- **Cloud Build**: Automated builds
- **Build config**: `cloudbuild.yaml`
- **Auto-deploy**: On git push

#### Local Development
- **Docker Compose**: PostgreSQL + Redis
- **Hot reload**: Next.js dev server
- **Database**: Prisma migrations

---

## 🔄 Data Flow Examples

### 1. Student Login Flow
```
User → /auth/login → NextAuth.js → 
Database Check → Session Creation → 
Middleware Check → Role-based Redirect → Dashboard
```

### 2. AI Tutor Interaction
```
Student → AI Tutor Page → 
Check-in Questions → 
POST /api/ai-tutor-chat → 
Model Selection → AI Processing → 
PLG Update → Response + Actions → 
Frontend Display
```

### 3. Lab Completion Flow
```
Student → Lab Page → 
Run Simulation → 
Python API → 
Results → 
POST /api/lab-completion → 
XP Award → 
PLG Update → 
Progress Saved
```

### 4. Content Generation Flow
```
Teacher → AI Content Generator → 
Input Parameters → 
POST /api/ai-generate-lesson → 
AI Model (GPT/Grok) → 
Content Generation → 
Save to Database → 
Return to Teacher
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Material-UI
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Real-time**: Socket.io

### Backend
- **Runtime**: Node.js 20
- **API**: Next.js API Routes
- **ORM**: Prisma
- **Database**: PostgreSQL 15
- **Cache**: Redis (optional)

### AI & ML
- **OpenAI**: GPT-4, GPT-4o-mini
- **Google**: Gemini 2.5 Pro
- **X.AI**: Grok-beta
- **Hybrid System**: Intelligent model selection

### Infrastructure
- **Hosting**: Google Cloud Run
- **Database**: Cloud SQL (PostgreSQL)
- **Storage**: Google Cloud Storage
- **CDN**: Cloud CDN
- **Monitoring**: Cloud Logging

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Testing**: Jest, Vitest
- **CI/CD**: Google Cloud Build

---

## 📊 Key Features

### For Students
- ✅ AI Tutor - Gia sư cá nhân ảo
- ✅ Learning Paths - Lộ trình học tập cá nhân hóa
- ✅ Virtual Labs - Phòng thí nghiệm ảo
- ✅ XP System - Hệ thống điểm kinh nghiệm
- ✅ Progress Tracking - Theo dõi tiến độ
- ✅ STEM Projects - Dự án STEM
- ✅ Competitions - Cuộc thi

### For Teachers
- ✅ Course Management - Quản lý khóa học
- ✅ Student Analytics - Phân tích học sinh
- ✅ AI Content Generator - Tạo nội dung tự động
- ✅ Assignment Grading - Chấm bài tự động
- ✅ Learning Path Management - Quản lý lộ trình

### For Admins
- ✅ User Management - Quản lý người dùng
- ✅ System Analytics - Phân tích hệ thống
- ✅ Permission Management - Quản lý phân quyền
- ✅ Content Moderation - Kiểm duyệt nội dung

---

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt)
- ✅ Account lockout mechanism
- ✅ Two-factor authentication (2FA)
- ✅ Session management
- ✅ CSRF protection
- ✅ XSS prevention
- ✅ SQL injection prevention (Prisma)
- ✅ Rate limiting
- ✅ Audit logging (AuthLog)

---

## 📈 Scalability Considerations

- ✅ Stateless API design
- ✅ Database indexing
- ✅ Caching strategy (Redis)
- ✅ CDN for static assets
- ✅ Horizontal scaling (Cloud Run)
- ✅ Connection pooling
- ✅ Async processing

---

## 🚀 Future Enhancements

- 📅 Multi-language support (i18n)
- 📅 Mobile app (React Native)
- 📅 Advanced analytics dashboard
- 📅 Real-time collaboration
- 📅 Video conferencing integration
- 📅 Blockchain certificates
- 📅 AR/VR lab experiences

---

## 📝 Notes

- Hệ thống được thiết kế theo mô hình **AI-Driven Education**
- Personal Learning Graph (PLG) là core của hệ thống cá nhân hóa
- XP System được sử dụng như intelligent signal cho AI recommendations
- Virtual Labs được xây dựng bằng Python, giao tiếp qua REST API
- Hệ thống hỗ trợ multi-tenant với `schoolId` trong database

---

**Last Updated**: 2025-01-XX  
**Version**: 2.0  
**Status**: Production Ready ✅

