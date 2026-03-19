# Import Câu Hỏi Từ File - Tài Liệu Hướng Dẫn

## ✅ Tính năng đã tích hợp

### Vị trí
- **URL**: `http://localhost:3000/teacher/question-bank`
- **Access**: Click vào nút "Import từ file" trong phần "Thao tác nhanh"

### Định dạng file hỗ trợ

#### 1. Excel/CSV (.xlsx, .xls, .csv)

**Cấu trúc file mẫu:**

| content/question | A | B | C | D | correctAnswer/đáp_án | explanation/giải_thích | subject/môn | grade/khối | difficulty/độ_khó |
|-----------------|---|---|---|---|---------------------|----------------------|-------------|------------|------------------|
| Nội dung câu hỏi 1 | Phương án A | Phương án B | Phương án C | Phương án D | A | Giải thích chi tiết | Vật lý | 10 | Dễ |
| Nội dung câu hỏi 2 | Đúng | Sai | | | B | Giải thích | Toán | 11 | Trung bình |

**Các cột có thể sử dụng:**
- **Nội dung**: `content`, `question`, `nội_dung`, `câu_hỏi`
- **Phương án**: `A`, `B`, `C`, `D` hoặc `options`, `phương_án`
- **Đáp án đúng**: `correctAnswer`, `đáp_án`, `answer`
- **Giải thích**: `explanation`, `giải_thích`
- **Môn học**: `subject`, `môn`
- **Khối lớp**: `grade`, `khối`
- **Chủ đề**: `topic`, `chủ_đề`
- **Độ khó**: `difficulty`, `độ_khó`

#### 2. Word (.docx, .doc)

**Định dạng mẫu:**

```
Câu 1: Nội dung câu hỏi thứ nhất?
A. Phương án lựa chọn A
B. Phương án lựa chọn B
C. Phương án lựa chọn C
D. Phương án lựa chọn D
Đáp án: A
Giải thích: Giải thích chi tiết

Câu 2: Nội dung câu hỏi thứ hai?
A. Phương án A
B. Phương án B
C. Phương án C
D. Phương án D
Đáp án: C
```

**Hoặc định dạng số:**

```
1. Nội dung câu hỏi?
A. Phương án A
B. Phương án B
C. Phương án C
D. Phương án D
Answer: B
```

### Tự động nhận diện

#### Môn học (Subject Mapping)
```
toán, toán học, đại số, hình học → Toán học
vật, vật lý, lí → Vật lý
hóa, hóa học → Hóa học
sinh, sinh học → Sinh học
văn, ngữ văn → Ngữ văn
anh, tiếng anh → Tiếng Anh
lịch sử, sử → Lịch sử
địa, địa lý → Địa lý
gdcd, công dân → GDCD
công nghệ → Công nghệ
tin, tin học → Tin học
```

#### Khối lớp (Grade Mapping)
```
6, khối 6 → Khối 6
7, khối 7 → Khối 7
...
10, khối 10 → Khối 10
11, khối 11 → Khối 11
12, khối 12 → Khối 12
```

#### Độ khó (Difficulty Mapping)
```
dễ, easy → EASY
trung bình, medium → MEDIUM
khó, hard → HARD
```

## 🎯 Cách sử dụng

### Bước 1: Chuẩn bị file
1. Soạn câu hỏi trong Excel, Word, hoặc CSV
2. Đảm bảo có đủ các cột thông tin cần thiết
3. Lưu file với định dạng phù hợp (.xlsx, .xls, .csv, .docx, .doc)

### Bước 2: Import vào hệ thống
1. Truy cập `http://localhost:3000/teacher/question-bank`
2. Click nút **"Import từ file"** trong phần "Thao tác nhanh"
3. Kéo thả file vào vùng upload hoặc click để chọn file
4. Chọn môn học và khối lớp mặc định (nếu file không có cột này)
5. Xem preview số lượng câu hỏi sẽ import
6. Click **"Import"** để bắt đầu

### Bước 3: Kiểm tra kết quả
1. Xem thông báo số lượng câu hỏi import thành công
2. Truy cập danh sách câu hỏi để kiểm tra
3. Chỉnh sửa nếu cần thiết

## 📊 Tính năng

### ✅ Đã hoàn thành
- [x] Import từ Excel (.xlsx, .xls)
- [x] Import từ CSV
- [x] Import từ Word (.docx, .doc)
- [x] Tự động nhận diện môn học
- [x] Tự động nhận diện khối lớp
- [x] Tự động nhận diện độ khó
- [x] Preview số lượng câu hỏi
- [x] Xử lý hàng loạt
- [x] Báo cáo lỗi chi tiết
- [x] Validation dữ liệu

### 🔮 Sắp tới
- [ ] Import từ PDF
- [ ] Template file mẫu downloadable
- [ ] Mapping cột tùy chỉnh
- [ ] Preview nội dung chi tiết trước khi import
- [ ] Chỉnh sửa câu hỏi trong preview
- [ ] Gộp câu hỏi trùng lặp
- [ ] Export câu hỏi ra file

## 🧪 File mẫu

### Mẫu Excel cho Vật lý 10

```
| content | A | B | C | D | correctAnswer | explanation | subject | grade | difficulty |
|---------|---|---|---|---|---------------|-------------|---------|-------|------------|
| Đơn vị của vận tốc là: | m/s | m/s² | m | s | A | Vận tốc là quãng đường đi được trong một đơn vị thời gian | Vật lý | 10 | Dễ |
| Gia tốc là đại lượng: | Vô hướng | Vectơ | Cả hai | Không có | B | Gia tốc có hướng và độ lớn | Vật lý | 10 | Trung bình |
```

### Mẫu Word cho Vật lý 10

```
Câu 1: Đơn vị của vận tốc là:
A. m/s
B. m/s²
C. m
D. s
Đáp án: A
Giải thích: Vận tốc là quãng đường đi được trong một đơn vị thời gian

Câu 2: Gia tốc là đại lượng:
A. Vô hướng
B. Vectơ
C. Cả hai
D. Không có
Đáp án: B
Giải thích: Gia tốc có hướng và độ lớn
```

## ⚠️ Lưu ý

1. **Kích thước file**: Tối đa 10MB
2. **Số lượng câu hỏi**: Nên chia nhỏ file nếu > 500 câu
3. **Encoding**: Đảm bảo file Unicode (UTF-8) để không lỗi font tiếng Việt
4. **Validation**: Câu hỏi cần có nội dung > 10 ký tự
5. **Trùng lặp**: Hệ thống không tự động phát hiện câu hỏi trùng

## 🐛 Xử lý lỗi

### Lỗi: "Không thể đọc file"
- Kiểm tra định dạng file
- Đảm bảo file không bị hỏng
- Thử lưu lại file với định dạng khác

### Lỗi: "Không tìm thấy câu hỏi hợp lệ"
- Kiểm tra lại tên cột
- Đảm bảo có đủ nội dung câu hỏi
- Kiểm tra encoding (UTF-8)

### Lỗi: "Import thất bại"
- Kiểm tra kết nối mạng
- Xem log lỗi chi tiết trong console
- Thử import từng phần nhỏ

## 📁 Files liên quan

```
components/question-bank/
├── import-modal.tsx          # Component modal import
└── bulk-generate-modal.tsx   # Component sinh hàng loạt

app/(dashboard)/(routes)/teacher/question-bank/
├── page.tsx                  # Trang chính (có nút Import)
├── list/page.tsx             # Danh sách câu hỏi
└── edit/[id]/page.tsx        # Chỉnh sửa câu hỏi

api/questions/
└── route.ts                  # API tạo câu hỏi
```

## 💡 Tips

1. **Sử dụng Excel template**: Tạo file mẫu với đầy đủ cột
2. **Copy từ nguồn khác**: Copy từ PDF/Word vào Excel dễ dàng
3. **Batch import**: Chia thành nhiều file nhỏ để dễ quản lý
4. **Review sau import**: Kiểm tra lại câu hỏi sau khi import
5. **Tagging**: Thêm từ khóa để dễ tìm kiếm sau này
