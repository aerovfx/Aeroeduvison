# Fix: "Cannot read properties of undefined (reading 'findMany')" Error

## Vấn Đề

Lỗi `Cannot read properties of undefined (reading 'findMany')` xảy ra khi Prisma client chưa được generate sau khi thêm model `Class` vào schema.

## Nguyên Nhân

Khi thêm model mới vào `prisma/schema.prisma`, bạn cần:
1. Generate Prisma client để TypeScript biết về model mới
2. Push schema vào database để tạo bảng

## Giải Pháp

### Bước 1: Generate Prisma Client

```bash
npx prisma generate
```

Lệnh này sẽ:
- Đọc `prisma/schema.prisma`
- Generate TypeScript types cho tất cả models
- Tạo Prisma client với các methods như `prisma.class.findMany()`

### Bước 2: Push Schema vào Database

```bash
npx prisma db push
```

Lệnh này sẽ:
- Tạo bảng `Class` trong database
- Tạo bảng `ClassStudent` trong database
- Đồng bộ schema với database

### Hoặc sử dụng Migration (Khuyến nghị cho Production)

```bash
npx prisma migrate dev --name add_class_models
```

## Kiểm Tra

Sau khi chạy các lệnh trên:

1. **Kiểm tra Prisma Client:**
   ```bash
   # Mở Node.js REPL
   node
   > const { db } = require('./lib/db.ts')
   > console.log(db.class) // Should not be undefined
   ```

2. **Kiểm tra Database:**
   - Kết nối database và kiểm tra xem có bảng `Class` và `ClassStudent` không

3. **Test API:**
   - Refresh trang `/teacher/classes`
   - Kiểm tra console không còn lỗi

## Lỗi Thường Gặp

### Lỗi: "Schema validation error"
- **Nguyên nhân:** Schema có lỗi syntax
- **Giải pháp:** Kiểm tra `prisma/schema.prisma` có lỗi không

### Lỗi: "Database connection failed"
- **Nguyên nhân:** Không kết nối được database
- **Giải pháp:** Kiểm tra `DATABASE_URL` trong `.env`

### Lỗi: "Table already exists"
- **Nguyên nhân:** Bảng đã tồn tại nhưng schema không khớp
- **Giải pháp:** 
  ```bash
  npx prisma db push --force-reset  # ⚠️ Xóa dữ liệu cũ
  # Hoặc
  npx prisma migrate reset  # ⚠️ Reset toàn bộ database
  ```

## Tự Động Hóa

Để tránh lỗi này trong tương lai, thêm vào `package.json`:

```json
{
  "scripts": {
    "db:sync": "prisma generate && prisma db push",
    "db:migrate": "prisma generate && prisma migrate dev"
  }
}
```

Sau đó chạy:
```bash
npm run db:sync
```

## API Routes Đã Được Cập Nhật

Các API routes sau đã được cập nhật để hiển thị lỗi rõ ràng hơn:
- `/api/classes` - GET, POST
- `/api/classes/[id]` - GET, DELETE
- `/api/classes/[id]/students` - GET, POST
- `/api/classes/[id]/students/[studentId]` - DELETE

Nếu gặp lỗi schema, API sẽ trả về:
```json
{
  "error": "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
  "code": "PRISMA_SCHEMA_NOT_SYNCED"
}
```
