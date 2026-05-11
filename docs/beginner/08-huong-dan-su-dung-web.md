---
title: "Hướng Dẫn Sử Dụng Web AeroEdu"
description: "Tài liệu tổng hợp toàn bộ chức năng web AeroEdu, phân loại theo Học sinh - Giáo viên - Quản trị, kèm hướng dẫn sử dụng chi tiết."
published: true
---

# 🌐 Hướng Dẫn Sử Dụng Web AeroEdu

Tài liệu này **tổng hợp toàn bộ chức năng** của website AeroEdu, phân loại rõ ràng theo ba vai trò: **Học sinh (STUDENT)**, **Giáo viên (TEACHER)** và **Quản trị (ADMIN)**, kèm hướng dẫn sử dụng chi tiết cho từng nhóm.

---

## 📑 Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Đăng Ký & Đăng Nhập](#2-đăng-ký--đăng-nhập)
3. [Chức Năng Dành Cho Học Sinh](#3-chức-năng-dành-cho-học-sinh-student)
4. [Chức Năng Dành Cho Giáo Viên](#4-chức-năng-dành-cho-giáo-viên-teacher)
5. [Chức Năng Dành Cho Quản Trị](#5-chức-năng-dành-cho-quản-trị-admin)
6. [Chức Năng Dùng Chung](#6-chức-năng-dùng-chung)
7. [Phân Quyền & Điều Hướng Theo Vai Trò](#7-phân-quyền--điều-hướng-theo-vai-trò)
8. [Mẹo & Xử Lý Sự Cố](#8-mẹo--xử-lý-sự-cố)

---

## 1. Tổng Quan Hệ Thống

AeroEdu là nền tảng **LMS + AI + Vision** dành cho trường học và tổ chức giáo dục, chạy trên Next.js. Website chia thành các khu vực sau:

| Khu vực | Đường dẫn | Mô tả |
|---------|-----------|-------|
| Landing Page | `/` | Trang giới thiệu công khai |
| Đăng nhập / Đăng ký | `/auth/login`, `/auth/signup` | Xác thực người dùng |
| Dashboard | `/dashboard` | Trang chính sau đăng nhập |
| Khu học sinh | `/student/*` | Tính năng riêng cho học sinh |
| Khu giáo viên | `/teacher/*` | Tính năng riêng cho giáo viên |
| Khu quản trị | `/admin/*`, `/dashboard/admin/*` | Quản trị hệ thống |
| Tài liệu | `/docs` | Hướng dẫn sử dụng (công khai) |
| Marketing | `/pricing`, `/contact-sales`, `/privacy`, `/terms`, `/cookies` | Các trang thông tin |

### Menu Chính Trên Landing Page

Thanh menu trên cùng của trang chủ gồm các mục:
- **Sản phẩm** (`#products`)
- **Giải pháp** (`#solutions`)
- **Developers** (`#developers`)
- **Tài nguyên** (`#resources`)
- **Tài liệu** (`/docs`) — *tài liệu này*
- **Giá cả** (`/pricing`)

Góc phải menu có:
- **Theme Toggle** — chuyển Light / Dark mode
- **Language Switcher** — chuyển Tiếng Việt / English
- **Đăng nhập / Bắt đầu / Liên hệ sales**

---

## 2. Đăng Ký & Đăng Nhập

### 2.1. Đăng Ký Tài Khoản Mới

1. Truy cập trang chủ → nhấn **"Bắt đầu"** (Get started)
2. Chọn phương thức đăng ký:
   - Email + mật khẩu
   - Đăng nhập bằng **Google**
3. Xác nhận email (nếu yêu cầu)
4. Hệ thống gán vai trò mặc định (thường là `STUDENT`)

### 2.2. Đăng Nhập

1. Nhấn **"Đăng nhập"** trên menu hoặc truy cập `/auth/login`
2. Nhập thông tin → hệ thống tự động điều hướng đến dashboard tương ứng với vai trò
3. Nếu bật 2FA, nhập mã xác thực

### 2.3. Quên Mật Khẩu

- Truy cập `/auth/forgot-password`, nhập email → nhận link đặt lại tại `/auth/reset-password`

### 2.4. Đăng Xuất

- Nhấn biểu tượng **User** trên navbar → chọn **Sign out**

---

## 3. Chức Năng Dành Cho Học Sinh (STUDENT)

Học sinh đăng nhập sẽ được chuyển đến `/dashboard`.

### 3.1. Dashboard Học Sinh — `/dashboard`

- Tổng quan tiến độ học tập, XP, điểm tích lũy
- Danh sách khóa học đang học, bài tập sắp đến hạn
- Thông báo, lộ trình đề xuất

**Cách sử dụng:**
- Nhấn vào card khóa học để vào chi tiết
- Nhấn "Xem tất cả" ở mỗi section để mở danh sách đầy đủ

### 3.2. Khóa Học — `/courses/[courseId]`

- Xem video bài giảng, tài liệu, bài tập
- Theo dõi tiến độ từng chương
- Tham gia thảo luận

### 3.3. Lộ Trình Học — `/learning-paths`

- Xem các lộ trình học tập cá nhân hóa
- Đánh dấu đã hoàn thành từng mốc
- Nhận huy hiệu khi đạt mục tiêu

### 3.4. AI Tutor (Gia Sư AI) — `/ai-tutor` và `/student/ai-tutor`

- Chat với AI để hỏi bài, giải thích khái niệm
- AI đề xuất bài tập phù hợp với trình độ
- Cấu hình gia sư tại `/student/agent-settings`

**Mẹo:** Mô tả câu hỏi càng rõ ràng (gồm môn học, lớp, đề bài), phản hồi càng chính xác.

### 3.5. Chuẩn Bị Kỳ Thi — `/student/exam-prep`

- Tài liệu ôn tập theo chủ đề
- Mô phỏng đề thi, làm thử
- Báo cáo điểm yếu & gợi ý bù

### 3.6. Làm Bài Thi — `/student/exam`, `/student/exams`

- Danh sách đề thi được giao
- Bấm **"Bắt đầu"** → làm bài trong giao diện thi trực tuyến
- Hệ thống tự lưu tiến độ; nộp bài khi hoàn thành

### 3.7. Tiến Độ Học Tập — `/student/progress`

- Biểu đồ tiến độ theo thời gian
- Bảng xếp hạng lớp
- Huy hiệu thành tích

### 3.8. Phiên Âm Video — `/student/video-transcript`

- Xem text-transcript của video bài giảng
- Tìm kiếm theo từ khóa
- Nhảy đến đoạn video tương ứng

### 3.9. Định Hướng Nghề Nghiệp — `/student/career`

- Gợi ý nghề nghiệp dựa trên sở thích & năng lực
- Roadmap kỹ năng cần học

---

## 4. Chức Năng Dành Cho Giáo Viên (TEACHER)

Giáo viên được điều hướng đến `/teacher/dashboard` sau đăng nhập.

### 4.1. Dashboard Giáo Viên — `/teacher/dashboard`

- Tổng quan lớp học, số học sinh, bài tập
- Bảng phân tích cảm xúc & mức độ tập trung của học sinh
- Cảnh báo học sinh có nguy cơ (at-risk)

### 4.2. Quản Lý Lớp Học — `/teacher/classes`

- Tạo lớp mới, đặt tên, chọn môn
- Mời học sinh qua email hoặc mã lớp
- Xem danh sách học sinh, trạng thái tham gia

### 4.3. Quản Lý Bài Tập — `/teacher/assignments`

- Tạo bài tập từ ngân hàng câu hỏi hoặc soạn mới
- Phân công cho lớp/học sinh cụ thể
- Theo dõi tiến độ nộp bài & điểm

### 4.4. Ngân Hàng Câu Hỏi — `/teacher/question-bank`

- Upload câu hỏi lên ngân hàng
- Tạo đề thi tự động từ ngân hàng theo ma trận
- Import từ file Excel / Word / LaTeX

### 4.5. Ma Trận Đề Thi — `/teacher/exam-matrix`

- Định nghĩa ma trận kiến thức + mức độ (nhận biết / thông hiểu / vận dụng / vận dụng cao)
- Tự động sinh đề phù hợp ma trận

### 4.6. Tạo Đề Thi — `/teacher/exam-generator`, `/teacher/exam-edit`, `/teacher/exam-preview`

- AI sinh đề tự động
- Chỉnh sửa, xem trước đề trước khi công bố
- Xuất file PDF/DOCX

### 4.7. Phòng Thi Trực Tuyến — `/teacher/online-exam-room`

- Mở phòng thi, cấu hình thời gian, quy tắc
- Giám sát học sinh làm bài realtime
- Đóng phòng & thu bài

### 4.8. Chấm Bài — `/teacher/grading`, `/teacher/exam-grading`

- Chấm bài tự luận với hỗ trợ **AI + OCR**
- Nhận dạng chữ viết tay
- Gợi ý feedback tự động
- Tổng hợp điểm & phân tích kết quả

### 4.9. Số Hóa Tài Liệu — `/teacher/document-digitization`

- Upload ảnh/PDF đề thi in giấy
- OCR trích xuất câu hỏi, đáp án
- Chuyển vào ngân hàng câu hỏi

### 4.10. Tạo Module Bài Học — `/teacher/create-module`

- Soạn bài giảng mới, nhúng video, hình ảnh, công thức LaTeX
- AI hỗ trợ sinh nội dung tự động

### 4.11. Xây Dựng Lộ Trình — `/teacher/learning-path-builder`

- Thiết kế lộ trình học cá nhân hóa
- Kết nối giữa các chủ đề / môn học

### 4.12. Phân Tích Cảm Xúc — `/teacher/emotion-map`

- Heatmap cảm xúc lớp học
- Xác định thời điểm học sinh mất tập trung

### 4.13. Giám Sát Camera & Môi Trường — `/teacher/camera-management`, `/teacher/environment-monitoring`

- Cấu hình camera phòng học
- Theo dõi nhiệt độ, độ ẩm, ánh sáng (IoT)

### 4.14. Các Tính Năng Khác

- **Trung tâm tương tác**: `/teacher/interaction-center`
- **Tài liệu LaTeX**: `/teacher/latex-documents`
- **Lộ trình liên môn**: `/teacher/multi-disciplinary-paths`
- **Ghi chú cuộc họp**: `/teacher/meeting-notes`
- **Báo cáo đề thi**: `/teacher/exam-reports`
- **Transcript lớp học**: `/teacher/transcript`
- **AI Agents riêng**: `/teacher/agents`, `/teacher/ai-dashboard`

---

## 5. Chức Năng Dành Cho Quản Trị (ADMIN)

Admin có quyền truy cập toàn bộ hệ thống. Sau đăng nhập chuyển đến `/admin/dashboard`.

### 5.1. Dashboard Admin

- `/admin/dashboard` — tổng quan truyền thống
- `/dashboard/admin/overview` — dashboard 2.0 với KPI & biểu đồ xu hướng

### 5.2. Quản Lý Người Dùng — `/admin/users`, `/dashboard/admin/students`, `/dashboard/admin/teachers`

- CRUD người dùng (tạo / sửa / xóa / khóa)
- Phân vai trò: STUDENT / TEACHER / ADMIN
- Reset mật khẩu, deactivate tài khoản
- Import / export danh sách

### 5.3. Quản Lý Khóa Học — `/admin/courses`

- CRUD khóa học, chương trình học
- Định nghĩa chuẩn kiến thức

### 5.4. Quản Lý Bài Kiểm Tra — `/admin/quiz`

- Duyệt quiz do giáo viên tạo
- Thống kê độ khó, độ phân biệt
- Xuất báo cáo

### 5.5. Quản Lý Bài Tập — `/admin/assignments`

- Xem toàn bộ bài tập
- Xóa / chỉnh sửa bài không phù hợp

### 5.6. Lộ Trình Học — `/admin/learning-path`

- Duyệt lộ trình giáo viên tạo
- Phân tích hiệu quả

### 5.7. STEM & Mô Phỏng — `/admin/stem`

- Quản lý thí nghiệm 3D, LabTwin
- Cấu hình simulation

### 5.8. Video — `/admin/video`

- Upload, tag, phân loại video bài giảng
- Quản lý quyền xem

### 5.9. Cuộc Thi — `/admin/competition`

- Tạo cuộc thi, phê duyệt đề
- Bảng xếp hạng, trao giải

### 5.10. Phân Quyền — `/admin/permissions`

- Cấp / thu hồi quyền theo vai trò
- Quản lý scope (lớp, khóa học)

### 5.11. Dashboard Admin 2.0 — `/dashboard/admin/*`

| Mục | Đường dẫn | Mô tả |
|-----|-----------|-------|
| Tổng quan | `/dashboard/admin/overview` | KPI & charts |
| Học sinh | `/dashboard/admin/students` | Danh sách, trạng thái |
| Giáo viên | `/dashboard/admin/teachers` | Phân công, thống kê |
| Cảnh báo | `/dashboard/admin/alerts` | Log lỗi & bất thường |
| At-risk | `/dashboard/admin/at-risk` | Học sinh có nguy cơ |
| Nội dung | `/dashboard/admin/content` | CRUD nội dung toàn hệ thống |
| Cảm xúc | `/dashboard/admin/emotion` | Heatmap cảm xúc toàn hệ thống |
| Camera | `/dashboard/admin/camera-management` | Tất cả camera |
| IoT | `/dashboard/admin/iot-management` | Cảm biến, thiết bị |
| Operations | `/dashboard/admin/operations` | Logs, performance |
| Cài đặt | `/dashboard/admin/settings` | Config toàn hệ thống |
| Agents | `/dashboard/admin/agents` | Quản lý AI agents |

### 5.12. Calendar & Agile

- `/admin/calendar` — lịch sự kiện
- `/admin/agile` — bảng quản lý theo mô hình agile

---

## 6. Chức Năng Dùng Chung

Các tính năng sau có sẵn cho **mọi vai trò**:

### 6.1. Hồ Sơ Cá Nhân

- `/dashboard/profile` — xem / cập nhật thông tin
- `/dashboard/change-password` — đổi mật khẩu

### 6.2. Tài Liệu — `/docs`

- Truy cập mở — không cần đăng nhập
- Sidebar điều hướng gồm: *Cho Người Mới*, *Getting Started*, *Authentication*, *AI Features*, *OCR & Grading*, *Simulations*, *API Reference*, *Troubleshooting*

### 6.3. Chuyển Ngôn Ngữ & Theme

- **Language Switcher**: VI ↔ EN
- **Theme Toggle**: Light ↔ Dark
- Cấu hình lưu trong localStorage

### 6.4. Trang Pháp Lý (công khai)

- `/privacy` — Chính sách bảo mật
- `/terms` — Điều khoản
- `/cookies` — Chính sách cookie

### 6.5. Liên Hệ & Hỗ Trợ

- `/contact-sales` — Form liên hệ đội ngũ
- `/pricing` — Bảng giá

---

## 7. Phân Quyền & Điều Hướng Theo Vai Trò

Bảng tổng hợp quyền truy cập (theo `middleware.ts` và `lib/auth-redirect.ts`):

| Vai trò | Routes được phép | Điều hướng mặc định sau login |
|---------|------------------|-------------------------------|
| **STUDENT** | `/dashboard/*`, `/learning-paths/*`, `/ai-tutor/*`, `/student/*`, `/courses/*`, `/docs/**` | `/dashboard` |
| **TEACHER** | `/teacher/*`, `/dashboard/*`, `/learning-paths/*`, `/ai-tutor/*`, `/docs/**` | `/teacher/dashboard` |
| **ADMIN** | Tất cả (`*`) | `/admin/dashboard` |

Truy cập route ngoài quyền sẽ bị middleware chặn hoặc chuyển về trang chủ vai trò.

---

## 8. Mẹo & Xử Lý Sự Cố

### 8.1. Mẹo Sử Dụng Hiệu Quả

- **Sử dụng phím tắt** trên dashboard: `Ctrl+K` mở search
- **Gom nhóm bài tập** theo tag để dễ tìm (giáo viên)
- **Kích hoạt notifications** để không bỏ lỡ deadline (học sinh)
- **Dùng Export CSV** khi cần thống kê ngoại tuyến (admin)

### 8.2. Sự Cố Thường Gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Không đăng nhập được | Kiểm tra email/mật khẩu, reset qua `/auth/forgot-password` |
| Không truy cập được trang | Kiểm tra vai trò, có thể bị middleware chặn |
| OCR kết quả sai | Đảm bảo ảnh rõ, đủ sáng; xem mục *OCR & Grading* trong docs |
| Contentlayer chưa sinh file | Đợi vài giây, refresh; hoặc restart dev server |
| Camera không hoạt động | Cấp quyền camera cho trình duyệt, kiểm tra HTTPS |

### 8.3. Liên Hệ Hỗ Trợ

- Mở issue trên repository GitHub
- Liên hệ qua `/contact-sales`
- Tham khảo mục **Troubleshooting** trong sidebar docs

---

## 📖 Tài Liệu Liên Quan

- [Giới Thiệu Tổng Quan](/docs/beginner/01-gioi-thieu)
- [Cấu Trúc Dự Án](/docs/beginner/02-cau-truc-du-an)
- [Khái Niệm Cơ Bản](/docs/beginner/03-khai-niem-co-ban)
- [Các Bước Đầu Tiên](/docs/beginner/04-buoc-dau-tien)
- [Các Tác Vụ Thường Gặp](/docs/beginner/05-cac-tac-vu-thuong-gap)
- [Câu Hỏi Thường Gặp](/docs/beginner/06-cau-hoi-thuong-gap)
- [Tài Liệu Tham Khảo](/docs/beginner/07-tai-lieu-tham-khao)

---

> *Tài liệu này được cập nhật liên tục. Nếu phát hiện sai sót hoặc muốn đóng góp, vui lòng mở issue trên repository.*
