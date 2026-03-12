# Hướng Dẫn Import Danh Sách Học Sinh

## Tổng Quan

Script `import-students-from-list.ts` cho phép import danh sách học sinh từ bảng với các thông tin:
- **Mã định danh Bộ** (ID Number)
- **Họ và tên** (Full Name)
- **Ngày sinh** (Date of Birth) - format: DD/MM/YYYY
- **Giới tính** (Gender) - "Nam" hoặc "Nữ"

## Cài Đặt

### 1. Cập nhật Database Schema

Trước khi chạy script, cần cập nhật database schema để thêm các fields mới:

```bash
npx prisma generate
npx prisma db push
```

Hoặc nếu dùng migrations:

```bash
npx prisma migrate dev
```

### 2. Chạy Script Import

```bash
npm run db:import-students
```

Hoặc:

```bash
npx tsx scripts/import-students-from-list.ts
```

## Cách Hoạt Động

### 1. Tạo Email Tự Động

Email được tạo từ tên và mã định danh:
- Format: `firstname.lastname.last4digits@student.aeroedu.local`
- Ví dụ: `ho.kha.ai.5949@student.aeroedu.local`

### 2. Tạo Password Mặc Định

Password được tạo từ:
- 6 số cuối của mã định danh
- 2 số cuối của năm sinh

Ví dụ:
- Mã định danh: `7759155949` → `9155949`
- Năm sinh: `2009` → `09`
- Password: `915594909`

### 3. Lưu Thông Tin

Các thông tin được lưu vào database:
- `name`: Họ và tên
- `email`: Email tự động
- `idNumber`: Mã định danh Bộ
- `dateOfBirth`: Ngày sinh (parsed từ DD/MM/YYYY)
- `gender`: Giới tính (Nam/Nữ)
- `role`: "STUDENT"
- `password`: Password đã hash

## Kiểm Tra Kết Quả

Sau khi chạy script, bạn sẽ thấy:
- ✅ Số học sinh đã tạo thành công
- ⚠️ Số học sinh đã tồn tại (bị bỏ qua)
- ❌ Số học sinh bị lỗi

## Lưu Ý

1. **Email Duplicate**: Script sẽ bỏ qua nếu email đã tồn tại
2. **Mã Định Danh Duplicate**: Script sẽ bỏ qua nếu mã định danh đã tồn tại
3. **Password**: Học sinh nên đổi password khi đăng nhập lần đầu
4. **Email Format**: Email được tạo tự động, có thể không phải email thật

## Ví Dụ Sử Dụng

### Import danh sách mới

```bash
# 1. Cập nhật schema
npx prisma db push

# 2. Chạy import
npm run db:import-students
```

### Xem kết quả

Script sẽ hiển thị:
```
🚀 Bắt đầu import danh sách học sinh...
📊 Tổng số học sinh: 45

✅ Đã tạo học sinh: Hồ Khả Ái
   - Email: ho.kha.ai.5949@student.aeroedu.local
   - Mã định danh: 7759155949
   - Ngày sinh: 13/07/2009
   - Giới tính: Nữ
   - Password mặc định: 915594909
   - ID: [uuid]

...

📈 Tóm tắt:
✅ Đã tạo thành công: 45 học sinh
⚠️  Đã bỏ qua (đã tồn tại): 0 học sinh
❌ Lỗi: 0 học sinh
📊 Tổng số đã xử lý: 45 học sinh
```

## Troubleshooting

### Lỗi "Database schema chưa được cập nhật"

**Giải pháp:**
```bash
npx prisma generate
npx prisma db push
```

### Lỗi "Email already exists"

Script sẽ tự động bỏ qua học sinh đã tồn tại. Không cần lo lắng.

### Lỗi "Mã định danh đã tồn tại"

Script sẽ tự động bỏ qua. Kiểm tra xem học sinh đã được import chưa.

## Cập Nhật Danh Sách

Để thêm học sinh mới vào script:
1. Mở file `scripts/import-students-from-list.ts`
2. Thêm object mới vào array `students`
3. Chạy lại script

## Export Danh Sách

Để export danh sách học sinh đã import, có thể dùng Prisma Studio:

```bash
npx prisma studio
```

Hoặc query trực tiếp từ database.
