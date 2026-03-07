---
title: "Các Bước Đầu Tiên"
description: "Hướng dẫn chi tiết từng bước để bắt đầu làm việc với dự án AeroEduVison"
published: true
---

# 4. Các Bước Đầu Tiên

Hướng dẫn chi tiết từng bước để bắt đầu làm việc với dự án AeroEduVison.

## ✅ Checklist Trước Khi Bắt Đầu

Trước khi bắt đầu, đảm bảo bạn có:

- [ ] **Node.js 18+** đã cài đặt
- [ ] **npm** hoặc **yarn** đã cài đặt
- [ ] **Git** đã cài đặt
- [ ] **PostgreSQL** (hoặc Docker để chạy PostgreSQL)
- [ ] **Python 3.12+** (cho simulations)
- [ ] **Code Editor** (VS Code được khuyến nghị)
- [ ] **Terminal/Command Line** quen thuộc

## 📥 Bước 1: Clone Repository

### 1.1 Mở Terminal

Mở terminal/command prompt ở thư mục bạn muốn lưu dự án.

### 1.2 Clone Code

```bash
git clone https://github.com/aerovfx/Aeroeduvison.git
cd Aeroeduvison
```

**Giải thích:**
- `git clone` → Tải code từ GitHub về máy
- `cd Aeroeduvison` → Vào thư mục dự án

## 📦 Bước 2: Cài Đặt Dependencies

### 2.1 Cài Đặt Node.js Dependencies

```bash
npm install
```

**Lệnh này sẽ:**
- Đọc `package.json`
- Tải về tất cả thư viện cần thiết
- Mất khoảng 2-5 phút tùy tốc độ mạng

**Nếu gặp lỗi:**
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

### 2.2 Cài Đặt Python Dependencies (Tùy chọn)

Nếu muốn chạy simulations:

```bash
cd python-simulations
pip install -r requirements.txt
cd ..
```

## ⚙️ Bước 3: Cấu Hình Environment Variables

### 3.1 Tạo File .env.local

```bash
cp env.example .env.local
```

### 3.2 Mở và Chỉnh Sửa .env.local

Mở file `.env.local` trong editor và điền các giá trị:

```env
# Database (với Docker - khuyến nghị)
DATABASE_URL="postgresql://lmsmath:lmsmath_password@localhost:5432/lmsmath"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-random-string"

# Google Cloud (tùy chọn, cho production)
GOOGLE_CLOUD_PROJECT_ID=""
GOOGLE_CLOUD_STORAGE_BUCKET=""

# AI Services (cho OCR Grading)
GEMINI_API_KEY="your-gemini-api-key-here"
OLLAMA_BASE_URL="http://localhost:11434"
```

**Lưu ý quan trọng:**
- ⚠️ **KHÔNG** commit file `.env.local` lên Git
- Tạo `NEXTAUTH_SECRET` ngẫu nhiên: `openssl rand -base64 32`
- Lấy `GEMINI_API_KEY` từ: https://aistudio.google.com/

### 3.3 Tạo Database

#### Option A: Docker (Khuyến nghị - Dễ nhất)

**Bước 1:** Mở Docker Desktop và đợi nó khởi động hoàn toàn

**Bước 2:** Chạy script setup tự động:
```bash
./setup-local-database.sh
```

Script sẽ tự động:
- ✅ Start PostgreSQL container
- ✅ Cập nhật DATABASE_URL trong .env.local
- ✅ Generate Prisma Client
- ✅ Chạy database migrations

**Thông tin database:**
```
Host:     localhost
Port:     5432
Database: lmsmath
User:     lmsmath
Password: lmsmath_password
```

#### Option B: PostgreSQL Local

```bash
# macOS với Homebrew
brew install postgresql@15
brew services start postgresql@15
createdb lmsmath

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb lmsmath
```

Sau đó cập nhật `DATABASE_URL` trong `.env.local`:
```env
DATABASE_URL="postgresql://$(whoami)@localhost:5432/lmsmath"
```

## 🗄️ Bước 4: Setup Database

### 4.1 Generate Prisma Client

```bash
npm run db:generate
```

**Lệnh này:**
- Đọc `prisma/schema.prisma`
- Tạo Prisma Client (code để làm việc với database)

### 4.2 Push Schema to Database

```bash
npm run db:push
```

**Lệnh này:**
- Tạo các bảng trong database
- Dựa trên schema trong `prisma/schema.prisma`

### 4.3 Seed Initial Data (Tùy chọn)

```bash
npm run db:seed
```

**Lệnh này:**
- Thêm dữ liệu mẫu vào database
- Tạo user admin, courses mẫu, etc.

## 🚀 Bước 5: Chạy Development Server

### 5.1 Start Server

```bash
npm run dev
```

**Kết quả mong đợi:**
```
✓ Ready - started server on 0.0.0.0:3000
✓ Compiled / in 2.3s
```

### 5.2 Mở Browser

Mở trình duyệt và truy cập:
```
http://localhost:3000
```

Bạn sẽ thấy trang chủ của AeroEduVison! 🎉

## 🧪 Bước 6: Chạy Python Simulations (Tùy chọn)

Nếu muốn test simulations:

### 6.1 Cài Đặt Python Dependencies

```bash
cd python-simulations
pip install -r requirements.txt
```

### 6.2 Build Simulations

```bash
# Build tất cả simulations
npm run simulations:build

# Hoặc build từng simulation
npm run simulations:refraction
npm run simulations:projectile
```

### 6.3 Xem Simulations

Truy cập: `http://localhost:3000/dashboard/labtwin/labs`

Các simulations có sẵn:
- **Refraction** - Khúc xạ ánh sáng
- **Projectile** - Chuyển động ném xiên
- **Motion Tracking** - Theo dõi chuyển động
- **Harmonic Motion** - Dao động điều hòa

## ✅ Bước 7: Verify Installation

Kiểm tra các tính năng hoạt động:

### 7.1 Frontend
- [ ] Trang chủ load được
- [ ] Không có lỗi trong console (F12)

### 7.2 Authentication
- [ ] Có thể đăng ký tài khoản mới
- [ ] Có thể đăng nhập
- [ ] Dashboard hiển thị sau khi login

### 7.3 Database
- [ ] Dữ liệu được lưu (thử tạo user mới)
- [ ] Có thể query database

### 7.4 API
- [ ] Truy cập `http://localhost:3000/api/health` (nếu có)
- [ ] API endpoints hoạt động

## 🐛 Troubleshooting

### Lỗi: Port 3000 đã được sử dụng

```bash
# Tìm process đang dùng port 3000
lsof -ti:3000

# Kill process
lsof -ti:3000 | xargs kill -9

# Hoặc chạy trên port khác
npm run dev -- -p 3001
```

### Lỗi: Database connection failed

1. Kiểm tra PostgreSQL đang chạy:
   ```bash
   # macOS
   brew services list
   
   # Docker
   docker ps
   ```

2. Kiểm tra `DATABASE_URL` trong `.env.local`

3. Test connection:
   ```bash
   psql $DATABASE_URL
   ```

### Lỗi: Module not found

```bash
# Xóa và cài lại
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: Prisma client not generated

```bash
npm run db:generate
```

## 📝 Ghi Chú Quan Trọng

### File .env.local
- ⚠️ **KHÔNG BAO GIỜ** commit file này lên Git
- File này chứa thông tin nhạy cảm (passwords, API keys)

### Database
- Backup database trước khi chạy migrations
- Không xóa database trong production

### Development vs Production
- Development: `npm run dev` (hot reload, debug mode)
- Production: `npm run build && npm start` (optimized, no hot reload)

## 🎯 Bước Tiếp Theo

Sau khi setup xong, bạn có thể:

1. **Khám phá codebase**
   - Xem các components trong `components/`
   - Xem các pages trong `app/`
   - Xem API routes trong `app/api/`

2. **Tạo feature đầu tiên**
   - Thử sửa một component
   - Thêm một page mới
   - Tạo một API endpoint

3. **Đọc tài liệu**
   - [Các Tác Vụ Thường Gặp](./05-cac-tac-vu-thuong-gap.md)
   - [Authentication Guide](../authentication/overview.md)
   - [Simulations Guide](../simulations/overview.md)

## 🚀 Bước Tiếp Theo

Bây giờ bạn đã setup xong, hãy tiếp tục với:

👉 **[Các Tác Vụ Thường Gặp](./05-cac-tac-vu-thuong-gap.md)** - Học cách thực hiện các công việc phổ biến

---

**Câu hỏi?** Xem [FAQ](./06-cau-hoi-thuong-gap.md) hoặc quay lại [Mục Lục](./index.md)
