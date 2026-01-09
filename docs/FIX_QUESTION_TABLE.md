# Hướng Dẫn Tạo Bảng Question

## Vấn Đề

Bảng `Question` chưa tồn tại trong database, nhưng Prisma CLI gặp lỗi TLS certificate khi chạy trong sandbox.

## Giải Pháp

### Cách 1: Chạy Prisma DB Push Trực Tiếp (Khuyến Nghị)

Mở terminal của bạn và chạy:

```bash
cd /Users/vietchung/Aeroeduvision
npx prisma db push
```

Nếu vẫn gặp lỗi TLS, thử:

```bash
# Option 1: Sử dụng pooled connection
DATABASE_URL="postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-twilight-recipe-a12e50nn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" npx prisma db push

# Option 2: Sử dụng direct connection  
DATABASE_URL="postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-twilight-recipe-a12e50nn.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" npx prisma db push
```

### Cách 2: Sử Dụng Neon Console

1. Vào [Neon Console](https://console.neon.tech)
2. Chọn database của bạn
3. Mở SQL Editor
4. Copy và paste nội dung từ file `scripts/create-question-table.sql`
5. Chạy SQL script

### Cách 3: Sử Dụng psql (Nếu Có)

```bash
psql "postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-twilight-recipe-a12e50nn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" < scripts/create-question-table.sql
```

## Verify

Sau khi tạo bảng, chạy script chẩn đoán để verify:

```bash
npx tsx scripts/diagnose-question-bank.ts
```

Bạn sẽ thấy:
```
Table 'Question' exists: ✅ YES
✅ Query successful
Total questions: 0
```

## Sau Khi Tạo Bảng

1. Refresh trang `/teacher/question-bank`
2. Bạn sẽ thấy trang trống với nút "Tạo câu hỏi đầu tiên"
3. Click vào nút để tạo câu hỏi mới

## Lưu Ý

- Nếu vẫn gặp lỗi TLS, kiểm tra DATABASE_URL trong `.env`
- Đảm bảo bạn có quyền truy cập network
- Nếu dùng Neon, đảm bảo database đang hoạt động
