# Hướng Dẫn Cập Nhật Học Sinh Thật Thay Cho Demo

## Tổng Quan

Hệ thống đã được cập nhật để sử dụng học sinh thật từ database thay vì các học sinh demo (Nguyễn Văn A, Trần Thị B, Lê Văn C).

## Các Bước Thực Hiện

### 1. Import Danh Sách Học Sinh

Chạy script để import 45 học sinh từ danh sách:

```bash
npm run db:import-students
```

### 2. Tạo Dữ Liệu Demo

Sau khi import, tạo dữ liệu demo (điểm số, XP, tham gia) cho các học sinh:

```bash
npm run db:generate-demo-data
```

Script này sẽ:
- Tạo điểm số đa dạng (60-95%)
- Tạo XP ngẫu nhiên (500-1200)
- Tạo tỷ lệ tham gia (75-95%)
- Tạo số bài thi đã làm (3-8)
- Cập nhật vào ClassStudent nếu học sinh đã trong lớp
- Cập nhật XP vào User cho tất cả học sinh

### 3. Thêm Học Sinh Vào Lớp (Tùy chọn)

Nếu muốn quản lý học sinh trong lớp:
1. Vào `/teacher/classes`
2. Tạo lớp học mới hoặc chọn lớp có sẵn
3. Click "Thêm học sinh"
4. Chọn học sinh từ danh sách đã import
5. Học sinh sẽ có dữ liệu demo đã tạo

## Các Trang Đã Được Cập Nhật

### 1. Teacher Dashboard (`/teacher/dashboard`)
- Hiển thị học sinh thật từ database
- Tự động fetch từ API `/api/teacher/students`
- Hiển thị điểm số, XP, tham gia từ dữ liệu demo

### 2. Teacher Analytics (`/teacher/analytics`)
- Top performing students: Lấy 3 học sinh có điểm cao nhất
- Struggling students: Lấy 2 học sinh có điểm thấp nhất (< 70%)
- Tất cả thống kê được tính từ dữ liệu thật

### 3. Classes Management (`/teacher/classes`)
- Quản lý lớp học và học sinh
- Thêm học sinh vào lớp từ danh sách đã import
- Xem thông số học sinh trong lớp

## API Endpoints

### `/api/teacher/students`
- GET: Lấy danh sách học sinh với dữ liệu demo
- Tự động generate demo data nếu học sinh chưa có trong lớp
- Trả về: điểm số, XP, tham gia, engagement, emotion, etc.

## Dữ Liệu Demo

Dữ liệu demo được tạo với phân bố đa dạng:
- **Điểm số**: 60-95% (phân bố đều)
- **XP**: 500-1200 (dựa trên điểm số)
- **Tham gia**: 75-95% (dựa trên điểm số)
- **Bài thi**: 3-8 bài (ngẫu nhiên)
- **Tỷ lệ đạt**: ~80% số bài thi

## Lưu Ý

1. **Dữ liệu Demo**: Dữ liệu được tạo ngẫu nhiên để demo. Bạn có thể sửa sau trong database hoặc qua UI.

2. **Học Sinh Chưa Trong Lớp**: Học sinh chưa được thêm vào lớp vẫn có XP trong User, nhưng không có ClassStudent record. Khi thêm vào lớp, ClassStudent sẽ được tạo với dữ liệu demo.

3. **Cập Nhật Dữ Liệu**: Để cập nhật dữ liệu thật, bạn có thể:
   - Sửa trực tiếp trong database
   - Sửa qua UI (sẽ cần tạo API update)
   - Chạy lại script với logic khác

## Troubleshooting

### Không thấy học sinh trong dashboard
- Kiểm tra xem đã import học sinh chưa: `npm run db:import-students`
- Kiểm tra xem đã tạo demo data chưa: `npm run db:generate-demo-data`
- Kiểm tra console để xem có lỗi API không

### Dữ liệu không đúng
- Chạy lại script generate demo data
- Kiểm tra database xem dữ liệu đã được lưu chưa
- Clear cache và refresh trang
