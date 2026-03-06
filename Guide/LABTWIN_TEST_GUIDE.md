# 🧪 LabTwin - Hướng dẫn Test

## ✅ Trạng thái hiện tại
- ✅ Server đang chạy tại: http://localhost:3000
- ✅ LabTwin module đã hoàn thành
- ✅ Tất cả thí nghiệm đã được tạo
- ✅ Không có lỗi ThemeProvider

## 👥 Test Users

### 1. Student User
- **Email**: `student@example.com`
- **Password**: `password123`
- **Role**: student
- **Expected**: Full access to LabTwin experiments

### 2. Teacher User
- **Email**: `teacher@example.com`
- **Password**: `password123`
- **Role**: teacher
- **Expected**: Full access + teacher features

### 3. Admin User
- **Email**: `admin@example.com`
- **Password**: `password123`
- **Role**: admin
- **Expected**: Full access + admin panel

## 🧪 Danh sách thí nghiệm LabTwin

### Cơ học (Mechanics)
1. **Chuyển động thẳng đều** - `/learning-paths-demo/labtwin/experiment/mechanics-1`
   - Mô phỏng chuyển động với đồ thị vận tốc
   - Điều chỉnh vận tốc từ 1-20 m/s
   - Thu thập dữ liệu vị trí theo thời gian

2. **Rơi tự do** - `/learning-paths-demo/labtwin/experiment/mechanics-2`
   - Thí nghiệm rơi tự do với gia tốc g = 9.8 m/s²
   - Điều chỉnh độ cao ban đầu từ 10-200m
   - Tính toán thời gian rơi và vận tốc khi chạm đất

### Sóng (Waves)
3. **Sóng cơ học** - `/learning-paths-demo/labtwin/experiment/waves-1`
   - Mô phỏng sóng dọc và sóng ngang
   - Điều chỉnh tần số (0.5-5 Hz) và biên độ (10-100)
   - Hiển thị bước sóng và tốc độ lan truyền

### Điện từ (Electromagnetism)
4. **Điện trường** - `/learning-paths-demo/labtwin/experiment/electricity-1`
   - Tương tác với điện tích điểm
   - Vẽ đường sức điện
   - Mô phỏng chuyển động của điện tích thử

5. **Mạch điện DC** - `/learning-paths-demo/labtwin/experiment/electricity-2`
   - Thí nghiệm mạch nối tiếp/song song
   - Định luật Ohm với điện trở thay đổi
   - Tính toán dòng điện, điện áp, công suất

### Quang học (Optics)
6. **Khúc xạ ánh sáng** - `/learning-paths-demo/labtwin/experiment/optics-1`
   - Định luật Snell với chiết suất khác nhau
   - Phản xạ toàn phần và góc tới hạn
   - Animation ánh sáng lan truyền

## 🔍 Test Cases

### Test Case 1: Đăng nhập và truy cập
1. Mở http://localhost:3000/sign-in
2. Đăng nhập với từng user (student, teacher, admin)
3. Verify đăng nhập thành công
4. Navigate đến http://localhost:3000/learning-paths-demo/labtwin

### Test Case 2: Thí nghiệm cơ học
1. **Chuyển động thẳng đều**:
   - Click "Bắt đầu" để chạy simulation
   - Điều chỉnh vận tốc slider
   - Verify đồ thị vị trí theo thời gian
   - Check dữ liệu thu thập trong bảng

2. **Rơi tự do**:
   - Điều chỉnh độ cao ban đầu
   - Click "Bắt đầu" và quan sát vật rơi
   - Verify tính toán thời gian rơi lý thuyết
   - Check vận tốc khi chạm đất

### Test Case 3: Thí nghiệm sóng
1. **Sóng cơ học**:
   - Chuyển đổi giữa sóng dọc/ngang
   - Điều chỉnh tần số và biên độ
   - Verify animation sóng lan truyền
   - Check tính toán bước sóng

### Test Case 4: Thí nghiệm điện từ
1. **Điện trường**:
   - Thêm/xóa điện tích
   - Di chuyển điện tích bằng click & drag
   - Verify đường sức điện hiển thị
   - Check chuyển động điện tích thử

2. **Mạch điện DC**:
   - Chuyển đổi nối tiếp/song song
   - Điều chỉnh điện áp và điện trở
   - Verify định luật Ohm
   - Check tính toán công suất

### Test Case 5: Thí nghiệm quang học
1. **Khúc xạ ánh sáng**:
   - Điều chỉnh góc tới
   - Thay đổi chiết suất môi trường
   - Verify định luật Snell
   - Test phản xạ toàn phần

## 🎯 Expected Results

### ✅ Tất cả thí nghiệm phải:
- Load không lỗi
- Canvas rendering hoạt động
- Controls (sliders, buttons) responsive
- Animation mượt mà
- Dữ liệu thu thập chính xác
- Lý thuyết hiển thị đúng

### ✅ UI/UX phải:
- Responsive trên mobile/desktop
- Navigation hoạt động
- Progress tracking
- XP system
- Achievements

### ✅ Performance phải:
- Load time < 3s
- Animation 60fps
- No memory leaks
- Smooth interactions

## 🐛 Troubleshooting

### Nếu gặp lỗi ThemeProvider:
1. Check console logs
2. Verify ThemeProvider setup
3. Restart development server

### Nếu canvas không render:
1. Check browser console
2. Verify canvas dimensions
3. Check animation loop

### Nếu controls không hoạt động:
1. Check state management
2. Verify event handlers
3. Check component re-renders

## 📊 Test Report Template

```
LabTwin Test Report
==================
Date: [DATE]
Tester: [NAME]
User Type: [student/teacher/admin]

Experiments Tested:
- [ ] Mechanics 1: Uniform Motion
- [ ] Mechanics 2: Free Fall
- [ ] Waves 1: Mechanical Waves
- [ ] Electricity 1: Electric Field
- [ ] Electricity 2: DC Circuit
- [ ] Optics 1: Light Refraction

Issues Found:
- [ ] Issue 1
- [ ] Issue 2

Overall Status: [PASS/FAIL]
Recommendations: [TEXT]
```

## 🚀 Ready for Testing!

LabTwin module đã sẵn sàng để test với đầy đủ tính năng:
- 6 thí nghiệm vật lý tương tác
- Canvas-based simulations
- Real-time data collection
- Responsive design
- Role-based access
- XP and achievement system

**Bắt đầu test ngay tại: http://localhost:3000/learning-paths-demo/labtwin**


