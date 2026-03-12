---
title: "Khái Niệm Cơ Bản"
description: "Học các khái niệm và thuật ngữ quan trọng trong dự án AeroEduVison"
published: true
---

# 3. Khái Niệm Cơ Bản

Học các khái niệm và thuật ngữ quan trọng để hiểu và làm việc với dự án.

## 🔐 Authentication & Authorization

### Authentication (Xác Thực)
**Là gì?** Xác minh người dùng là ai (đăng nhập)

**Ví dụ:**
- Nhập email + password → Hệ thống kiểm tra → Cho phép đăng nhập

**Trong dự án:**
- Sử dụng **NextAuth v5**
- File: `app/api/auth/[...nextauth]/route.ts`

### Authorization (Phân Quyền)
**Là gì?** Xác định người dùng được phép làm gì

**Ví dụ:**
- Học sinh → chỉ xem khóa học của mình
- Giáo viên → tạo, chỉnh sửa khóa học
- Admin → quản lý toàn bộ hệ thống

**Trong dự án:**
- Roles: `STUDENT`, `TEACHER`, `ADMIN`
- File: `lib/auth/permissions.ts`

## 🗄️ Database & ORM

### Database (Cơ Sở Dữ Liệu)
**Là gì?** Nơi lưu trữ dữ liệu (users, courses, assignments, etc.)

**Trong dự án:**
- Sử dụng **PostgreSQL**
- Lưu trữ: thông tin người dùng, khóa học, bài tập, điểm số

### ORM (Object-Relational Mapping)
**Là gì?** Công cụ giúp làm việc với database dễ dàng hơn

**Trong dự án:**
- Sử dụng **Prisma**
- File: `prisma/schema.prisma`

**Ví dụ:**
```typescript
// Thay vì viết SQL:
// SELECT * FROM users WHERE email = 'user@example.com'

// Dùng Prisma:
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
})
```

### Schema (Lược Đồ)
**Là gì?** Định nghĩa cấu trúc dữ liệu (bảng, cột, quan hệ)

**Ví dụ:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(STUDENT)
  courses   Course[] // Quan hệ: 1 User có nhiều Course
}
```

## ⚛️ React & Next.js

### React
**Là gì?** Thư viện JavaScript để xây dựng giao diện người dùng

**Khái niệm quan trọng:**
- **Component**: Khối xây dựng UI (như LEGO)
- **Props**: Dữ liệu truyền vào component
- **State**: Dữ liệu thay đổi trong component
- **Hooks**: Các hàm đặc biệt (useState, useEffect, etc.)

**Ví dụ:**
```tsx
// Component đơn giản
function Button({ text, onClick }) {
  return <button onClick={onClick}>{text}</button>
}
```

### Next.js
**Là gì?** Framework React với nhiều tính năng mạnh mẽ

**Tính năng quan trọng:**
- **App Router**: Cách tổ chức routes mới (Next.js 13+)
- **Server Components**: Component chạy trên server
- **API Routes**: Tạo API endpoints dễ dàng
- **SSR/SSG**: Server-side rendering/static generation

**Ví dụ:**
```
app/
  page.tsx          → Trang chủ (/)
  about/page.tsx    → Trang about (/about)
  api/users/route.ts → API endpoint (/api/users)
```

## 🎨 Styling

### TailwindCSS
**Là gì?** Framework CSS utility-first

**Ví dụ:**
```tsx
// Thay vì viết CSS riêng:
<div className="bg-blue-500 text-white p-4 rounded">
  Hello
</div>
```

### shadcn/ui
**Là gì?** Component library xây dựng trên Radix UI + TailwindCSS

**Ví dụ:**
- `components/ui/button.tsx` → Component Button
- `components/ui/input.tsx` → Component Input

## 🤖 AI & ML

### LLM (Large Language Model)
**Là gì?** Mô hình AI có thể hiểu và tạo ra ngôn ngữ tự nhiên

**Trong dự án:**
- **Google Gemini**: AI tạo nội dung, chấm bài
- **Ollama**: AI chạy local (tùy chọn)

**Ví dụ:**
```typescript
// Gọi AI để tạo nội dung
const content = await ai.generateLesson("Newton's Laws")
```

### OCR (Optical Character Recognition)
**Là gì?** Nhận diện chữ viết từ hình ảnh

**Trong dự án:**
- Sử dụng **PaddleOCR**, **VietOCR**, **TrOCR**
- Chấm bài tự động từ ảnh chụp
- URL: `http://localhost:3000/dashboard/labtwin/labs/ocr-grading`

**Tính năng:**
- Upload ảnh bài thi
- OCR nhận diện chữ viết tay
- AI chấm điểm tự luận (Gemini Pro)
- Auto AI Selection - Tự động chọn AI tốt nhất
- Batch processing - Xử lý hàng loạt
- Voice Feedback - Đọc nhận xét
- Export CSV

**Ví dụ:**
- Học sinh chụp ảnh bài làm → OCR đọc chữ → AI chấm điểm + nhận xét chi tiết

**Tài liệu:** [OCR_GRADING_COMPLETE_GUIDE.md](../../Guide/OCR_GRADING_COMPLETE_GUIDE.md)

## 🔬 Simulations

### Simulation (Mô Phỏng)
**Là gì?** Mô phỏng hiện tượng vật lý/hóa học/sinh học trên máy tính

**Trong dự án:**
- Viết bằng **Python** (NumPy, SciPy)
- Build ra JSON data
- Hiển thị với **HTML Canvas** trong Next.js
- URL: `http://localhost:3000/dashboard/labtwin/labs`

**Simulations có sẵn:**
- **Refraction** - Khúc xạ ánh sáng (Snell's law)
- **Projectile** - Chuyển động ném xiên (quỹ đạo parabol)
- **Motion Tracking** - Theo dõi chuyển động 3D→2D
- **Harmonic Motion** - Dao động điều hòa

**Workflow:**
1. Viết logic Python trong `main.py`
2. Build với `build.py` → tạo `data.json`
3. `build-all.py` copy vào `public/labs/`
4. Next.js hiển thị trong browser

**Ví dụ:**
- Simulation chuyển động ném: Thay đổi góc → Xem quỹ đạo bay real-time

**Tài liệu:** [PYTHON_SIMULATIONS_GUIDE.md](../../Guide/PYTHON_SIMULATIONS_GUIDE.md)

## 🔄 API & Routes

### API (Application Programming Interface)
**Là gì?** Giao diện cho phép các phần khác nhau của ứng dụng giao tiếp

**Trong dự án:**
- API Routes trong `app/api/`
- RESTful API

**Ví dụ:**
```
GET  /api/courses        → Lấy danh sách khóa học
POST /api/courses        → Tạo khóa học mới
GET  /api/courses/:id    → Lấy chi tiết khóa học
```

### Route (Tuyến Đường)
**Là gì?** Đường dẫn URL đến một trang hoặc API endpoint

**Ví dụ:**
- `/dashboard` → Trang dashboard
- `/courses/123` → Trang chi tiết khóa học 123
- `/api/users` → API endpoint lấy users

## 📦 Package Management

### npm (Node Package Manager)
**Là gì?** Công cụ quản lý các thư viện JavaScript

**Lệnh thường dùng:**
```bash
npm install          # Cài đặt dependencies
npm run dev         # Chạy development server
npm run build       # Build cho production
```

### package.json
**Là gì?** File định nghĩa dependencies và scripts

**Ví dụ:**
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.2.0"
  },
  "scripts": {
    "dev": "next dev"
  }
}
```

## 🔧 Development Tools

### TypeScript
**Là gì?** JavaScript với kiểu dữ liệu (type safety)

**Ví dụ:**
```typescript
// JavaScript
function add(a, b) {
  return a + b
}

// TypeScript
function add(a: number, b: number): number {
  return a + b
}
```

### Git
**Là gì?** Hệ thống quản lý phiên bản code

**Lệnh thường dùng:**
```bash
git clone <repo>     # Tải code về
git add .            # Thêm file vào staging
git commit -m "msg"  # Commit thay đổi
git push             # Đẩy code lên remote
```

## 🚀 Deployment

### Docker
**Là gì?** Công cụ đóng gói ứng dụng vào container

**Trong dự án:**
- `Dockerfile` → Định nghĩa cách build image
- `docker-compose.yml` → Định nghĩa cách chạy nhiều containers

### Cloud Run
**Là gì?** Dịch vụ của Google Cloud để chạy containers

**Trong dự án:**
- Deploy ứng dụng lên Cloud Run
- Auto-scaling, HTTPS tự động

## 📚 Thuật Ngữ Bổ Sung

### Middleware
**Là gì?** Code chạy trước khi request đến route

**Ví dụ:**
- Kiểm tra authentication trước khi vào dashboard

### Server Component vs Client Component
- **Server Component**: Chạy trên server, không có JavaScript
- **Client Component**: Chạy trên browser, có thể tương tác

### SSR vs SSG vs CSR
- **SSR** (Server-Side Rendering): Render trên server mỗi request
- **SSG** (Static Site Generation): Render trước, tạo file tĩnh
- **CSR** (Client-Side Rendering): Render trên browser

## 🎯 Tóm Tắt

| Khái Niệm | Mô Tả Ngắn | File/Thư Mục Liên Quan |
|-----------|------------|------------------------|
| **Authentication** | Xác minh người dùng | `app/api/auth/` |
| **Prisma** | ORM cho database | `prisma/schema.prisma` |
| **Component** | Khối xây dựng UI | `components/` |
| **API Route** | Endpoint API | `app/api/` |
| **Simulation** | Mô phỏng thí nghiệm | `python-simulations/` |
| **OCR** | Nhận diện chữ viết | `python-ocr/` |

## 🚀 Bước Tiếp Theo

Bây giờ bạn đã hiểu các khái niệm cơ bản, hãy tiếp tục với:

👉 **[Các Bước Đầu Tiên](./04-buoc-dau-tien.md)** - Bắt đầu làm việc với dự án

---

**Câu hỏi?** Xem [FAQ](./06-cau-hoi-thuong-gap.md) hoặc quay lại [Mục Lục](./index.md)
