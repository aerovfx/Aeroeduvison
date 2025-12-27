# 🗄️ Hướng Dẫn Setup Database Local

## 🚀 Cách 1: Sử dụng Docker (Khuyến nghị)

### Bước 1: Start Docker Desktop

1. Mở **Docker Desktop** trên macOS
2. Đợi Docker khởi động hoàn toàn (icon Docker ở menu bar không còn loading)

### Bước 2: Chạy Script Setup

```bash
./setup-local-database.sh
```

Script sẽ tự động:
- ✅ Start PostgreSQL container
- ✅ Cập nhật DATABASE_URL trong .env.local
- ✅ Generate Prisma Client
- ✅ Chạy database migrations

### Bước 3: Kiểm Tra

```bash
# Kiểm tra container đang chạy
docker-compose ps postgres

# Xem logs
docker-compose logs postgres

# Test kết nối
docker-compose exec postgres psql -U lmsmath -d lmsmath -c "SELECT 1;"
```

## 🔧 Cách 2: PostgreSQL Local (Không dùng Docker)

### Bước 1: Cài Đặt PostgreSQL

**macOS (với Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Hoặc download từ:**
https://www.postgresql.org/download/macosx/

### Bước 2: Tạo Database

```bash
# Tạo user và database
createuser -s lmsmath
createdb -O lmsmath lmsmath

# Hoặc với psql
psql postgres
```

Trong psql:
```sql
CREATE USER lmsmath WITH PASSWORD 'lmsmath_password';
CREATE DATABASE lmsmath OWNER lmsmath;
GRANT ALL PRIVILEGES ON DATABASE lmsmath TO lmsmath;
\q
```

### Bước 3: Cập Nhật .env.local

Thêm hoặc cập nhật trong `.env.local`:

```bash
DATABASE_URL="postgresql://lmsmath:lmsmath_password@localhost:5432/lmsmath"
```

### Bước 4: Chạy Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Chạy migrations
npx prisma migrate dev --name init

# Hoặc push schema (nếu chưa có migrations)
npx prisma db push
```

## 📋 Thông Tin Database Local

### Với Docker:
```
Host:     localhost
Port:     5432
Database: lmsmath
User:     lmsmath
Password: lmsmath_password
```

### DATABASE_URL:
```
postgresql://lmsmath:lmsmath_password@localhost:5432/lmsmath
```

## 🧪 Test Kết Nối

### Với Docker:
```bash
docker-compose exec postgres psql -U lmsmath -d lmsmath -c "SELECT version();"
```

### Với PostgreSQL Local:
```bash
psql -U lmsmath -d lmsmath -c "SELECT version();"
```

### Với Prisma Studio:
```bash
npx prisma studio
```

Mở trình duyệt: http://localhost:5555

## 🛑 Dừng Database

### Với Docker:
```bash
# Dừng container
docker-compose stop postgres

# Dừng và xóa container (giữ data)
docker-compose down postgres

# Dừng và xóa tất cả (mất data)
docker-compose down -v postgres
```

### Với PostgreSQL Local:
```bash
# macOS với Homebrew
brew services stop postgresql@15
```

## 🔍 Troubleshooting

### Lỗi: "Cannot connect to Docker daemon"

**Giải pháp:**
1. Mở Docker Desktop
2. Đợi Docker khởi động hoàn toàn
3. Thử lại: `docker ps`

### Lỗi: "Port 5432 already in use"

**Giải pháp:**
```bash
# Tìm process đang dùng port 5432
lsof -i :5432

# Kill process (thay PID bằng process ID)
kill -9 <PID>

# Hoặc đổi port trong docker-compose.yml
ports:
  - "5433:5432"  # Dùng port 5433 thay vì 5432
```

### Lỗi: "Database does not exist"

**Giải pháp:**
```bash
# Tạo database
docker-compose exec postgres psql -U lmsmath -c "CREATE DATABASE lmsmath;"

# Hoặc với PostgreSQL local
createdb -O lmsmath lmsmath
```

### Lỗi: "Prisma Client not generated"

**Giải pháp:**
```bash
# Generate lại Prisma Client
npx prisma generate

# Nếu vẫn lỗi, xóa và generate lại
rm -rf node_modules/.prisma
npx prisma generate
```

## 📚 Lệnh Hữu Ích

### Xem danh sách users:
```bash
node list-users.js
```

### Reset database (mất dữ liệu):
```bash
npx prisma migrate reset --force
```

### Seed database (nếu có):
```bash
npm run db:seed
```

### Xem schema:
```bash
npx prisma studio
```

## ✅ Checklist

- [ ] Docker Desktop đã chạy (nếu dùng Docker)
- [ ] PostgreSQL container đang chạy (nếu dùng Docker)
- [ ] DATABASE_URL đã được cập nhật trong .env.local
- [ ] Prisma Client đã được generate
- [ ] Database migrations đã chạy
- [ ] Test kết nối thành công
- [ ] Có thể list users với `node list-users.js`

