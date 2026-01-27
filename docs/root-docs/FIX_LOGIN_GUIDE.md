# 🔧 Hướng dẫn sửa lỗi đăng nhập

## ✅ Đã khắc phục

Database schema đã được đồng bộ và tài khoản test đã được tạo lại.

## 🎯 Các bước để đăng nhập thành công

### 1. Restart Next.js Server

**QUAN TRỌNG**: Bạn cần restart server để load Prisma Client mới!

```bash
# Dừng server hiện tại (Ctrl+C trong terminal đang chạy npm run dev)
# Sau đó chạy lại:
npm run dev
```

### 2. Tài khoản test có sẵn

Sau khi restart server, bạn có thể đăng nhập với các tài khoản sau:

| Role | Email | Password |
|------|-------|----------|
| **Student** | student@example.com | student123 |
| Student 2 | student2@example.com | student123 |
| Student 3 | student3@example.com | student123 |
| Student 4 | student4@example.com | student123 |
| **Teacher** | teacher@example.com | teacher123 |
| Teacher 2 | teacher2@example.com | teacher123 |
| **Admin** | admin@example.com | admin123 |

### 3. Kiểm tra tài khoản

Nếu vẫn gặp vấn đề, chạy script kiểm tra:

```bash
# Kiểm tra tài khoản student
npx tsx scripts/check-user-account.ts student@example.com student123

# Kiểm tra tài khoản khác
npx tsx scripts/check-user-account.ts admin@example.com admin123
```

### 4. Tạo lại tài khoản (nếu cần)

```bash
npm run db:seed
```

## 🐛 Lỗi phổ biến

### Lỗi: "The column `User.role` does not exist"

**Nguyên nhân**: Prisma Client cũ chưa được reload

**Giải pháp**:
```bash
# 1. Stop server (Ctrl+C)
# 2. Regenerate Prisma Client
npx prisma generate
# 3. Restart server
npm run dev
```

### Lỗi: "User not found"

**Nguyên nhân**: Tài khoản chưa được tạo

**Giải pháp**:
```bash
npm run db:seed
```

### Lỗi: "Invalid password"

**Nguyên nhân**: Mật khẩu sai hoặc hash không đúng

**Giải pháp**:
1. Kiểm tra mật khẩu đúng chưa (có phân biệt chữ hoa/thường)
2. Chạy lại seed để tạo mật khẩu mới:
   ```bash
   npm run db:seed
   ```

### Tài khoản bị khóa

**Nguyên nhân**: Đã đăng nhập sai quá 5 lần

**Kiểm tra**:
```bash
npx tsx scripts/check-user-account.ts student@example.com student123
```

Nếu thấy "Account is LOCKED", chạy:
```sql
-- Unlock account bằng Prisma Studio hoặc SQL
UPDATE "User" SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE email = 'student@example.com';
```

Hoặc dùng Prisma Studio:
```bash
npm run db:studio
```

## 📝 Checklist

- [ ] Database đã được sync (`npx prisma db push`)
- [ ] Prisma Client đã được regenerate (`npx prisma generate`)
- [ ] Tài khoản test đã được tạo (`npm run db:seed`)
- [ ] Server đã được restart
- [ ] Thử đăng nhập với `student@example.com` / `student123`

## 🔍 Debug logs

Khi đăng nhập, check console logs của server để xem:

```
[AUTHORIZE] called with: { email: 'student@example.com' }
[AUTHORIZE] looking up user: student@example.com
[AUTHORIZE] prisma user: true student-user
[AUTHORIZE] checking password...
[AUTHORIZE] password valid? true
[AUTHORIZE] login successful for: student@example.com
```

Nếu thấy lỗi ở bất kỳ bước nào, đó là nơi cần debug!

## ✅ Kết quả mong đợi

Sau khi restart server và đăng nhập với `student@example.com` / `student123`, bạn sẽ:

1. Thấy màn hình dashboard của student
2. Không có lỗi trong console
3. Session được lưu (không bị logout khi refresh)

---

**Lưu ý quan trọng**: Nhớ **RESTART SERVER** sau khi chạy `prisma generate` hoặc `prisma db push`!
