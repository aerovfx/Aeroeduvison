# ⚡ Quick Start: Database Local

## 🎯 Tùy Chọn Nhanh

### Option 1: Docker (Khuyến nghị - Dễ nhất)

**Bước 1:** Mở Docker Desktop và đợi nó khởi động

**Bước 2:** Chạy:
```bash
./setup-local-database.sh
```

**Xong!** Database sẽ tự động được setup.

---

### Option 2: PostgreSQL Local

Nếu bạn đã có PostgreSQL cài đặt:

**Bước 1:** Tạo database:
```bash
createdb lmsmath
```

**Bước 2:** Cập nhật `.env.local`:
```bash
DATABASE_URL="postgresql://$(whoami)@localhost:5432/lmsmath"
```

**Bước 3:** Chạy migrations:
```bash
npx prisma generate
npx prisma db push
```

---

## 🚨 Nếu Docker Chưa Chạy

### macOS:
1. Mở **Docker Desktop** từ Applications
2. Đợi icon Docker ở menu bar không còn loading
3. Chạy lại: `./setup-local-database.sh`

### Hoặc cài PostgreSQL local:
```bash
brew install postgresql@15
brew services start postgresql@15
createdb lmsmath
```

Sau đó cập nhật `.env.local`:
```bash
DATABASE_URL="postgresql://$(whoami)@localhost:5432/lmsmath"
```

---

## ✅ Sau Khi Setup

Test kết nối:
```bash
node list-users.js
```

Start dev server:
```bash
npm run dev
```

Mở: http://localhost:3000/auth/login

