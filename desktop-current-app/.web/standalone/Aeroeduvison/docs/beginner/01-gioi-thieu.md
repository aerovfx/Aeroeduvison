---
title: "Giới Thiệu Tổng Quan"
description: "Tìm hiểu AeroEduVison là gì, có những tính năng gì, và tại sao nên sử dụng nó"
published: true
---

# 1. Giới Thiệu Tổng Quan

## 🎯 AeroEduVison Là Gì?

**AeroEduVison** là một hệ thống quản lý học tập (LMS - Learning Management System) được tích hợp AI, giúp tạo ra trải nghiệm học tập tương tác và cá nhân hóa cho học sinh và giáo viên.

### Định Nghĩa Đơn Giản

Hãy tưởng tượng AeroEduVison như một "trường học số" nơi:
- 🎓 **Học sinh** có thể học qua các phòng thí nghiệm ảo, nhận được phản hồi từ AI
- 👨‍🏫 **Giáo viên** có thể tạo bài học tự động, chấm bài tự động, theo dõi tiến độ học sinh
- 🤖 **AI** giúp tạo nội dung, đánh giá, và cá nhân hóa trải nghiệm học tập

## ✨ Tính Năng Chính

### 1. 🔐 Xác Thực Người Dùng (Authentication)
- Đăng nhập/đăng ký an toàn
- Xác thực 2 bước (2FA)
- Đăng nhập bằng Google
- Phân quyền theo vai trò (Học sinh/Giáo viên/Admin)

**Ví dụ:** Học sinh đăng nhập → chỉ thấy các khóa học của mình

### 2. 🔬 Phòng Thí Nghiệm Ảo (Simulations)
- 20+ phòng thí nghiệm tương tác
- Vật lý: Chuyển động, Khí động học, Quang học
- Hóa học: Mô phỏng phân tử 3D
- Sinh học: Mô phỏng tăng trưởng
- Chạy real-time với Python

**Ví dụ:** Học sinh thay đổi góc ném → xem quỹ đạo bay của vật thể ngay lập tức

### 3. 🖼️ Chấm Bài Tự Động (OCR Grading)
- Chụp ảnh bài làm → AI tự động chấm điểm
- Nhận diện chữ viết tay (OCR)
- AI chấm điểm tự luận (Gemini Pro)
- Auto AI Selection - Tự động chọn AI tốt nhất
- Batch processing - Xử lý hàng loạt
- Statistics & Analytics - Thống kê chi tiết
- Voice Feedback - Đọc nhận xét bằng giọng nói
- Export CSV - Xuất kết quả

**URL:** `http://localhost:3000/dashboard/labtwin/labs/ocr-grading`

**Ví dụ:** Học sinh chụp ảnh bài toán → OCR đọc chữ → AI chấm điểm + nhận xét chi tiết

### 4. 🤖 Tính Năng AI
- **Tạo nội dung tự động**: Nhập chủ đề → AI tạo bài học hoàn chỉnh
- **Gia sư thông minh**: AI trả lời câu hỏi, hướng dẫn học tập
- **Đánh giá thông minh**: AI đưa ra nhận xét chi tiết

**Ví dụ:** Giáo viên nhập "Định luật Newton" → AI tạo bài giảng, bài tập, đáp án

### 5. 📊 Theo Dõi Tiến Độ (Analytics)
- Theo dõi tiến độ học tập real-time
- Hệ thống điểm XP và thành tích
- Dashboard cho giáo viên
- Phân tích hiệu suất học sinh

**Ví dụ:** Giáo viên xem dashboard → biết học sinh nào đang gặp khó khăn

## 🏗️ Kiến Trúc Hệ Thống (Đơn Giản Hóa)

```
┌─────────────────────────────────────┐
│   Giao Diện Web (Next.js)          │
│   - Trang chủ, Dashboard, Labs     │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│   API Layer (Next.js API Routes)   │
│   - Xử lý requests từ frontend     │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│   Backend Services                  │
│   - Database (Prisma + PostgreSQL)  │
│   - AI Services (Gemini, Ollama)    │
│   - Python Simulations              │
│   - OCR Service                     │
└─────────────────────────────────────┘
```

### Giải Thích Đơn Giản:

1. **Frontend (Giao diện)**: Nơi người dùng tương tác (click, nhập liệu)
2. **API Layer**: Nhận yêu cầu từ frontend, xử lý logic
3. **Backend**: Lưu trữ dữ liệu, chạy AI, xử lý phức tạp

## 🎓 Ai Sử Dụng AeroEduVison?

### 👨‍🎓 Học Sinh
- Học qua phòng thí nghiệm ảo
- Nhận phản hồi từ AI gia sư
- Theo dõi tiến độ và thành tích
- Học mọi lúc, mọi nơi

### 👨‍🏫 Giáo Viên
- Tạo và quản lý khóa học dễ dàng
- Tự động tạo nội dung với AI
- Chấm bài tự động
- Theo dõi tiến độ học sinh real-time

### 👨‍💻 Nhà Phát Triển
- Codebase hiện đại (Next.js 15, React 19)
- Tài liệu đầy đủ
- Dễ mở rộng và tùy chỉnh
- Sẵn sàng cho production

## 🛠️ Công Nghệ Sử Dụng

### Frontend (Giao Diện)
- **Next.js 15**: Framework React cho web
- **React 19**: Thư viện UI
- **TailwindCSS**: Styling (làm đẹp giao diện)
- **shadcn/ui**: Component library

### Backend (Xử Lý)
- **Node.js**: Môi trường chạy JavaScript
- **Prisma**: Quản lý database
- **PostgreSQL**: Cơ sở dữ liệu
- **NextAuth**: Xác thực người dùng

### AI & ML
- **Google Gemini**: AI tạo nội dung
- **Ollama**: AI chạy local
- **PaddleOCR**: Nhận diện chữ viết

### Simulations (Mô Phỏng)
- **Python 3.12**: Ngôn ngữ lập trình
- **FastAPI**: API server
- **Taichi**: Đồ họa 3D
- **OpenCV**: Xử lý hình ảnh

## 📊 Thống Kê Dự Án

- **Tổng số file code**: 2,000+
- **Tài liệu**: 500+ files
- **Phòng thí nghiệm**: 20+
- **API endpoints**: 100+
- **UI components**: 300+

## 🎯 Tại Sao Chọn AeroEduVison?

### ✅ Ưu Điểm

1. **Tích hợp AI mạnh mẽ**
   - Tạo nội dung tự động
   - Chấm bài thông minh
   - Gia sư cá nhân hóa

2. **Phòng thí nghiệm tương tác**
   - Học qua thực hành
   - Trực quan, dễ hiểu
   - Thí nghiệm an toàn

3. **Dễ sử dụng**
   - Giao diện thân thiện
   - Tài liệu đầy đủ
   - Hỗ trợ đa ngôn ngữ

4. **Sẵn sàng cho production**
   - Deploy dễ dàng
   - Scale tốt
   - Bảo mật cao

## 📚 Tài Liệu Tham Khảo

### Hướng Dẫn Chi Tiết
- 📖 [Guide/README.md](../../Guide/README.md) - Mục lục 299 file tài liệu
- 🔬 [Python Simulations Guide](../../Guide/PYTHON_SIMULATIONS_GUIDE.md) - Hướng dẫn tạo simulations
- 🖼️ [OCR Grading Guide](../../Guide/OCR_GRADING_COMPLETE_GUIDE.md) - Hệ thống chấm bài tự động
- 🤖 [AI Generator Guide](../../Guide/AI_GENERATOR_COMPLETE_GUIDE.md) - Tạo nội dung với AI
- ☁️ [Cloud Run Guide](../../Guide/CLOUD_RUN_QUICK_REFERENCE.md) - Deploy production

### Quick References
- 🚀 [Quick Start Local DB](../../Guide/QUICK_START_LOCAL_DB.md)
- 🧪 [Testing Quick Reference](../../Guide/TESTING_QUICK_REFERENCE.md)
- 🔐 [Auth Quick Reference](../../Guide/AUTH_QUICK_REFERENCE.md)

## 🚀 Bước Tiếp Theo

Bây giờ bạn đã hiểu tổng quan về AeroEduVison, hãy tiếp tục với:

👉 **[Cấu Trúc Dự Án](./02-cau-truc-du-an.md)** - Tìm hiểu cách dự án được tổ chức

---

**Câu hỏi?** Xem [FAQ](./06-cau-hoi-thuong-gap.md) hoặc quay lại [Mục Lục](./index.md)
