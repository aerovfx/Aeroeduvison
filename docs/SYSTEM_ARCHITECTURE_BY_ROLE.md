# Kiến trúc hệ thống AeroEduVision theo phân quyền

Tài liệu mô tả kiến trúc tổng quan và các module chính của ứng dụng theo từng vai trò: **Student**, **Teacher**, **Admin**.

---

## 1. Tổng quan phân quyền

| Vai trò   | Mã role   | Mô tả ngắn |
|-----------|-----------|-------------|
| **Student** | `STUDENT` | Học viên: học bài, làm bài tập, quiz, xem tiến độ và thành tích. |
| **Teacher** | `TEACHER` | Giáo viên: quản lý khóa học, lớp, đề thi, ngân hàng câu hỏi, chấm bài, analytics. |
| **Admin**   | `ADMIN` / `SUPER_ADMIN` | Quản trị: quản lý người dùng, toàn bộ nội dung, vận hành hệ thống. |

- **Xác thực**: NextAuth (session, `session.user.role`).
- **Phân quyền**: `lib/permissions.ts` — `isAdmin()`, `isTeacher()`, `isStudent()`, và các helper theo module (courses, quizzes, assignments, …).
- **Sidebar**: `app/(dashboard)/_components/sidebar-routes.tsx` — menu thay đổi theo role và path (`/teacher/*`, `/admin/*`, `/dashboard/*`).

---

## 2. STUDENT – Học viên

### 2.1 Mục đích

Học viên dùng hệ thống để: xem dashboard cá nhân, học theo lộ trình, tương tác với AI Tutor, làm bài tập/quiz, thí nghiệm ảo, xem thành tích và thông báo.

### 2.2 Các module chính (routes & chức năng)

| Module | Route | Mô tả |
|--------|--------|--------|
| **Dashboard** | `/dashboard` | Trang chủ: thống kê nhanh, khóa học đang học, tiến độ, streak. |
| **Learning Path** | `/learning-paths`, `/learning-paths-demo` | Lộ trình học theo môn (Toán, Lý, Hóa, Sinh, …), bài học, planner. |
| **Analytics** | `/dashboard/analytics` | Thống kê học tập cá nhân, biểu đồ, động lực. |
| **AI Tutor** | `/ai-tutor` | Chat với AI gia sư, hỗ trợ học tập. |
| **Emotion Tracker** | `/dashboard/emotion` | Trạng thái cảm xúc (mood), heatmap lớp (nếu có). |
| **Vision Tracker** | `/dashboard/vision-tracker` | Theo dõi khuôn mặt/tay, nhận diện biểu cảm, cử chỉ; dữ liệu gửi gộp lên server. |
| **Assignments** | `/dashboard/assignments` | Danh sách bài tập, nộp bài, xem feedback. |
| **Achievements** | `/dashboard/achievements` | Huy hiệu, thành tích, XP. |
| **Notifications** | `/dashboard/notifications` | Thông báo hệ thống. |
| **LabTwin** | `/dashboard/labtwin`, `/dashboard/labtwin/labs/*` | Phòng lab ảo: thí nghiệm Vật lý, Hóa, Sinh, mô phỏng (pendulum, projectile, chemistry-lab, …). |
| **STEM** | `/dashboard/stem` | Dự án STEM, templates. |
| **Notes** | `/dashboard/notes` | Ghi chú cá nhân. |
| **Scrum Board** | `/dashboard/scrumboard` | Bảng công việc (Kanban). |
| **Contacts** | `/dashboard/contacts` | Danh bạ. |
| **Courses** | `/courses/[courseId]` | Nội dung khóa học, chương, bài học (sau khi đăng ký). |
| **Quiz** | `/dashboard/quiz/[quizId]` | Làm bài quiz. |
| **Competition** | `/dashboard/competition`, `/dashboard/competition/[id]` | Cuộc thi (nếu mở cho học viên). |
| **Settings / Profile** | `/dashboard/settings`, `/dashboard/profile`, `/dashboard/change-password` | Cài đặt, hồ sơ, đổi mật khẩu. |

### 2.3 API / Backend liên quan (học viên)

- Auth: đăng nhập, đăng ký, session.
- Courses: xem khóa đã đăng ký, chapter, lesson.
- Assignments: nộp bài, xem điểm/feedback.
- Quiz: làm quiz, lưu kết quả.
- Progress: cập nhật hoàn thành bài học, XP.
- Emotion: `POST /api/vision-tracker/emotion`, `GET /api/vision-tracker/emotion/stats` (capture & thống kê biểu cảm).
- AI Tutor: chat API, lưu lịch sử.
- Learning paths, STEM, LabTwin: các API tương ứng (read, progress).

### 2.4 Quyền (theo `lib/permissions.ts`)

- **courses, lessons, quizzes, assignments**: `view` — chỉ xem/nộp trong phạm vi đã đăng ký.
- **progress**: `view` — xem tiến độ của bản thân.
- **payments**: `view` — thanh toán / mua khóa.
- **notes, tasks**: `edit` — ghi chú, công việc cá nhân.
- **analytics**: `none` — không vào analytics toàn hệ thống; chỉ dashboard cá nhân.

---

## 3. TEACHER – Giáo viên

### 3.1 Mục đích

Giáo viên quản lý lớp học, khóa học, đề thi, ngân hàng câu hỏi, số hóa tài liệu, chấm bài, xem báo cáo và dùng công cụ AI (tạo nội dung, ma trận đề).

### 3.2 Các module chính (routes & chức năng)

| Module | Route | Mô tả |
|--------|--------|--------|
| **AI Dashboard** | `/teacher/ai-dashboard` | Dashboard hỗ trợ AI, gợi ý giảng dạy. |
| **Class Overview** | `/teacher/dashboard` | Tổng quan lớp học, học viên, hoạt động. |
| **Analytics** | `/teacher/analytics` | Phân tích hiệu quả giảng dạy, điểm, tiến độ lớp. |
| **Số hóa tài liệu** | `/teacher/document-digitization`, `/[id]/review` | Upload tài liệu, OCR, tạo ma trận/câu hỏi (AI). |
| **Ma trận đề** | `/teacher/exam-matrix`, `/[id]`, `/[id]/edit`, `/[id]/review` | Tạo/sửa ma trận đề, xem preview, tạo đề thi từ ma trận. |
| **Ngân hàng câu hỏi** | `/teacher/question-bank`, `/create`, `/[id]/edit` | CRUD câu hỏi, lọc môn/khối/mức độ, thêm câu vào ma trận đề. |
| **Đề thi** | `/teacher/exams` | Danh sách đề thi, tạo đề từ ma trận (tự động chọn câu từ ngân hàng). |
| **Lớp học** | `/teacher/classes`, `/classes/[id]` | Quản lý lớp, danh sách học viên. |
| **Phòng thi trực tuyến** | `/teacher/online-exam-room` | Tổ chức thi trực tuyến. |
| **Chấm thi** | `/teacher/exam-grading` | Chấm bài thi (hỗ trợ AI nếu có). |
| **Báo cáo** | `/teacher/exam-reports` | Báo cáo điểm, thống kê đề thi. |
| **Learning Path Builder** | `/teacher/learning-path-builder` | Tạo/sửa lộ trình học. |
| **AI Content Gen** | `/teacher/create-module` | Tạo nội dung bài học/câu hỏi bằng AI. |
| **Student Chat** | `/teacher/interaction-center` | Tương tác/chat với học viên. |
| **Assignments** | `/teacher/assignments` | Tạo bài tập, xem bài nộp, chấm điểm. |
| **Grading** | `/teacher/grading` | Chấm điểm tổng hợp. |
| **Calendar** | `/teacher/calendar` | Lịch dạy, sự kiện. |
| **Student detail** | `/teacher/student/[studentId]` | Chi tiết từng học viên. |
| **Multi-disciplinary paths** | `/teacher/multi-disciplinary-paths` | Lộ trình liên môn. |
| **System flow** | `/teacher/system-flow` | Luồng hệ thống (tài liệu/quy trình). |

Một số trang dùng chung với student (cùng layout dashboard): Logo Design, Documentation (`/dashboard/logo-design`, `/docs`).

### 3.3 API / Backend liên quan (giáo viên)

- **Courses**: CRUD khóa học (của mình), lesson, quiz, assignment.
- **Classes**: CRUD lớp, thêm/xóa học viên.
- **Question bank**: `GET/POST/DELETE /api/question-bank`, lọc theo môn, khối, mức độ.
- **Exam matrices**: `GET/POST /api/exam-matrices`, `/[id]/questions` (thêm câu vào ma trận).
- **Exams**: `POST /api/exams/generate-from-matrix` (tạo đề từ ma trận), `GET/DELETE /api/teacher/exams`, `/[id]`.
- **Document digitization**: upload, OCR, xử lý tài liệu, tạo ma trận.
- **Grading**: nộp bài, chấm điểm, feedback.
- **AI content**: generate stream, lưu nội dung (chỉ teacher/admin).
- **Sync / Analytics**: dữ liệu theo teacher/school.

### 3.4 Quyền (theo `lib/permissions.ts`)

- **courses, lessons, quizzes, assignments**: `edit` — tạo/sửa/xóa trong khóa học của mình.
- **progress**: `view` — xem tiến độ học viên, không tự enroll.
- **analytics**: `view` — xem analytics khóa học/lớp của mình.
- **users**: `edit` — chỉ hồ sơ cá nhân, không đổi role.
- Admin có thể làm mọi thứ teacher làm (isTeacher = TEACHER hoặc ADMIN).

---

## 4. ADMIN – Quản trị viên

### 4.1 Mục đích

Quản trị toàn hệ thống: người dùng, phân quyền, nội dung, vận hành, AI models, cảnh báo và giám sát (học viên at-risk, emotion, giáo viên).

### 4.2 Các module chính (routes & chức năng)

| Module | Route | Mô tả |
|--------|--------|--------|
| **System Overview** | `/admin/overview` (hoặc `/admin/dashboard`) | Tổng quan hệ thống, số liệu toàn trường. |
| **Users** | `/admin/users` | Quản lý tài khoản: tạo/sửa/xóa, gán role. |
| **Phân quyền** | `/admin/permissions` | Cấu hình quyền theo role/module. |
| **Student Insights** | `/admin/students` | Danh sách học viên, thống kê, chi tiết. |
| **At-Risk Manager** | `/admin/at-risk` | Học viên có nguy cơ (điểm thấp, bỏ học, …). |
| **Alerts Inbox** | `/admin/alerts` | Hộp thư cảnh báo hệ thống. |
| **Teacher Performance** | `/admin/teachers` | Hiệu suất giáo viên, báo cáo. |
| **Emotion Monitor** | `/admin/emotion` | Giám sát biểu cảm (từ Emotion Tracker / Vision Tracker). |
| **Content Monitor** | `/admin/content` | Kiểm duyệt/giám sát nội dung. |
| **Operations** | `/admin/operations` | Vận hành, bảo trì. |
| **AI Models** | `/admin/models` | Quản lý model AI, retrain, health. |
| **Settings** | `/admin/settings` | Cài đặt hệ thống. |
| **Courses / Assignments / Quiz / Video / Learning path / Competition / STEM / Calendar** | `/admin/courses`, `/admin/assignments`, … | Quản lý toàn bộ (CRUD, duyệt, xóa). |

Layout admin: `app/admin/layout.tsx` — AdminNavbar, AdminSidebar; menu trong `admin/_components/admin-sidebar-routes.tsx`.

### 4.3 API / Backend liên quan (admin)

- **Users**: `GET/POST/PUT/DELETE /api/admin/users`, `/api/admin/students/[studentId]` — chỉ admin/super_admin.
- **Models**: `/api/admin/models/health`, `/api/admin/models/[id]/retrain`.
- **STEM sync**: `/api/admin/stem/sync`.
- **Auth logs, unlock account**: các API admin-only.
- **Data sync**: `getSyncDataForUser(role, schoolId)` — admin thấy toàn bộ theo school.

### 4.4 Quyền (theo `lib/permissions.ts`)

- Tất cả module: `full` — toàn quyền CRUD và quản lý.
- **users**: tạo/sửa/xóa user, đổi role, reset mật khẩu.
- **courses, lessons, quizzes, assignments, progress, payments, analytics**: toàn hệ thống.

---

## 5. Module dùng chung / Cross-role

- **Auth**: Đăng nhập/đăng ký — Student, Teacher, Admin (role khác nhau).
- **Profile & Settings**: Cá nhân (student/teacher dùng dashboard settings; admin có thêm admin settings).
- **Documentation**: `/docs` — tài liệu nội bộ.
- **LabTwin / STEM**: Student dùng để học; Teacher có thể tham chiếu; Admin quản lý nội dung/STEM.
- **Competition**: Student tham gia; Admin/Teacher quản lý (tùy cấu hình).
- **Emotion / Vision Tracker**: Student gửi dữ liệu; Admin xem tổng hợp (Emotion Monitor); Teacher có thể xem theo lớp (nếu tích hợp).

---

## 6. Luồng điều hướng theo role

```
[Login] → session.role
    ├── STUDENT   → sidebar = studentRoutes  → /dashboard, /learning-paths, /ai-tutor, ...
    ├── TEACHER   → sidebar = teacherRoutes → /teacher/dashboard, /teacher/exam-matrix, ...
    └── ADMIN     → sidebar = adminRoutes   → /admin/dashboard, /admin/users, ...
```

- **Path-based**: Vào `/teacher/*` hoặc `/admin/*` thì sidebar chuyển sang menu Teacher/Admin (kể cả khi role tương ứng).
- **Bảo vệ route**: Trang admin (ví dụ `app/admin/*`) kiểm tra `session.user.role === 'ADMIN'` (hoặc SUPER_ADMIN); không đúng thì redirect/403.

---

## 7. Tóm tắt công nghệ & thư mục chính

| Thành phần | Công nghệ / Vị trí |
|------------|--------------------|
| Auth | NextAuth, `lib/auth.ts`, `lib/permissions.ts` |
| DB | Prisma, `prisma/schema.prisma` |
| Dashboard layout | `app/(dashboard)/layout.tsx`, `_components/sidebar-routes.tsx` |
| Teacher layout | `app/(dashboard)/(routes)/teacher/layout.tsx` |
| Admin layout | `app/admin/layout.tsx`, `_components/admin-sidebar-routes.tsx` |
| Student routes | `app/(dashboard)/(routes)/dashboard/*`, `learning-paths*`, `ai-tutor` |
| Teacher routes | `app/(dashboard)/(routes)/teacher/*` |
| Admin routes | `app/admin/*` |
| API | `app/api/*` — phân quyền theo role trong từng route. |

---

*Tài liệu phản ánh kiến trúc và các module chính tại thời điểm viết; khi thêm/xóa tính năng nên cập nhật lại theo từng phân quyền.*
