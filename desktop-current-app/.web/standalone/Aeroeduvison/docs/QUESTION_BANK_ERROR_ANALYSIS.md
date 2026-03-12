# Phân Tích Lỗi Question Bank - Database Chưa Đồng Bộ

## 🔍 Nguyên Nhân Gốc Rễ

### Vấn Đề Chính
Lỗi "Database chưa được đồng bộ" xuất hiện vì **không thể kết nối đến database** do lỗi TLS certificate, không phải vì Prisma client thiếu model.

### Kết Quả Chẩn Đoán

1. ✅ **Prisma Client**: Model `Question` đã tồn tại trong Prisma client
   ```
   Question model exists: true
   ```

2. ❌ **Database Connection**: Kết nối database thất bại
   ```
   Error: Error opening a TLS connection: bad certificate format
   ```

3. ❌ **Table Check**: Không thể kiểm tra bảng vì không kết nối được database

4. ❌ **Query**: Không thể query vì không kết nối được database

## 🔗 Chuỗi Lỗi

```
1. DATABASE_URL có vấn đề với SSL/TLS certificate
   ↓
2. Không thể kết nối đến Neon PostgreSQL database
   ↓
3. Không thể chạy `npx prisma db push` để tạo bảng Question
   ↓
4. Bảng Question không tồn tại trong database
   ↓
5. API `/api/question-bank` thất bại khi query
   ↓
6. Trang `/teacher/question-bank` hiển thị lỗi "Database chưa được đồng bộ"
```

## 🛠️ Giải Pháp

### Giải Pháp 1: Sửa DATABASE_URL (Khuyến Nghị)

**Vấn đề hiện tại**: DATABASE_URL có lỗi với SSL certificate format

**Các bước:**

1. **Kiểm tra DATABASE_URL hiện tại:**
   ```bash
   cat .env | grep DATABASE_URL
   ```

2. **Sửa DATABASE_URL với SSL mode phù hợp:**
   
   **Option A: Sử dụng pooled connection với SSL require**
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-twilight-recipe-a12e50nn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   ```
   
   **Option B: Sử dụng direct connection với SSL require**
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-twilight-recipe-a12e50nn.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   ```
   
   **Option C: Tạm thời disable SSL verification (chỉ cho development)**
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-twilight-recipe-a12e50nn.ap-southeast-1.aws.neon.tech/neondb?sslmode=no-verify"
   ```
   ⚠️ **Cảnh báo**: Chỉ dùng cho development, không dùng cho production!

3. **Test kết nối:**
   ```bash
   npx tsx scripts/diagnose-question-bank.ts
   ```

4. **Nếu kết nối thành công, chạy db push:**
   ```bash
   npx prisma db push
   ```

### Giải Pháp 2: Kiểm Tra Neon Dashboard

1. Vào [Neon Console](https://console.neon.tech)
2. Kiểm tra database có đang hoạt động không
3. Lấy connection string mới từ Neon dashboard
4. Cập nhật DATABASE_URL trong `.env`

### Giải Pháp 3: Sử Dụng Prisma Accelerate (Nếu có)

Nếu bạn có Prisma Accelerate connection string (như trong `env.example`):

```env
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
```

Prisma Accelerate tự động xử lý SSL/TLS, không cần cấu hình thêm.

## 📋 Checklist Khắc Phục

- [ ] Kiểm tra DATABASE_URL trong `.env`
- [ ] Test kết nối database: `npx tsx scripts/diagnose-question-bank.ts`
- [ ] Nếu kết nối thành công, chạy: `npx prisma db push`
- [ ] Verify bảng Question đã được tạo
- [ ] Test API: `curl http://localhost:3000/api/question-bank`
- [ ] Test trang: `http://localhost:3000/teacher/question-bank`

## 🔧 Script Chẩn Đoán

Đã tạo script để chẩn đoán vấn đề:

```bash
npx tsx scripts/diagnose-question-bank.ts
```

Script này sẽ:
1. Kiểm tra Prisma client có model Question không
2. Test kết nối database
3. Kiểm tra bảng Question có tồn tại không
4. Test query bảng Question
5. Hiển thị lỗi chi tiết nếu có

## 📝 Lưu Ý

1. **TLS Certificate Error**: Lỗi này thường xảy ra khi:
   - DATABASE_URL có format không đúng
   - SSL mode không phù hợp với Neon database
   - Node.js version không tương thích với SSL library
   - System certificates không được cập nhật

2. **Prisma Client vs Database**: 
   - Prisma client có model ≠ Database có bảng
   - Cần chạy `npx prisma db push` để sync schema với database

3. **Network Access**: 
   - Đảm bảo có quyền truy cập network khi chạy `npx prisma db push`
   - Firewall có thể chặn kết nối đến Neon database

## 🎯 Kết Luận

**Nguyên nhân chính**: Lỗi TLS certificate khi kết nối database, không phải vấn đề với Prisma schema.

**Giải pháp**: Sửa DATABASE_URL để kết nối thành công, sau đó chạy `npx prisma db push` để tạo bảng Question trong database.
