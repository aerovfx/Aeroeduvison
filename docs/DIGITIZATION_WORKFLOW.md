# Quy Trình Số Hóa Tài Liệu - Workflow Hoàn Chỉnh

## 📋 Tổng Quan

Quy trình số hóa tài liệu đã được tái cấu trúc để đảm bảo kết quả cuối cùng được lưu vào hệ thống và có thể download dễ dàng.

---

## 🔄 Quy Trình Xử Lý (4 Bước)

### **Bước 1: Upload Tài Liệu**
- User upload file (PDF, JPG, PNG)
- File được lưu vào `uploads/documents/{userId}/`
- Tạo document record trong database với status "Hàng đợi"

**API:** `POST /api/documents/upload`

---

### **Bước 2: OCR - Trích Xuất Text**
- Sử dụng **Gemini Vision API** để trích xuất text từ hình ảnh
- Lưu text vào `document.ocrText`
- Log quá trình vào `DocumentProcessingLog`

**API:** `POST /api/documents/[id]/process` (OCR phase)

**Kết quả:**
- `ocrText`: Text đã trích xuất
- `status`: "Đang xử lý" → "Hoàn tất" hoặc "Lỗi"

---

### **Bước 3: AI Phân Tích & Tái Cấu Trúc**
- Phân tích nội dung với **Gemini AI**:
  - Xác định loại tài liệu (exam, textbook, question_bank, document)
  - Phân tích cấu trúc (sections, chapters)
  - Trích xuất chủ đề chính
  - Tạo tóm tắt
  - **Tái cấu trúc văn bản** (format rõ ràng, headings, paragraphs)
  - Phân tích layout (nếu có hình ảnh)

**API:** `POST /api/ai/analyze-document` (internal)

**Kết quả lưu vào:**
- `metadata.aiAnalysis`: Toàn bộ kết quả phân tích
- `metadata.restructuredText`: Văn bản đã tái cấu trúc
- `metadata.layoutAnalysis`: Phân tích layout

---

### **Bước 4: Lưu Kết Quả Cuối Cùng**
- Tự động lưu file kết quả vào `uploads/results/{userId}/`
- File bao gồm:
  - **Header**: Metadata (tên tài liệu, loại, ngày số hóa, chủ đề, tóm tắt, cấu trúc)
  - **Nội dung**: Văn bản đã tái cấu trúc (hoặc OCR text nếu không có tái cấu trúc)
  - **Footer**: Thông tin hệ thống

**API:** Tự động trong `POST /api/documents/[id]/process` (Step 4)

**Kết quả:**
- `digitizedUrl`: URL đến file kết quả (`/uploads/results/{userId}/{filename}.txt`)
- `metadata.resultFile`: Thông tin file kết quả (url, fileName, savedAt, format, size)

---

## 📥 Download Kết Quả Cuối Cùng

### **Cách 1: Tự Động (Sau Khi Số Hóa)**
- File kết quả được tự động tạo sau khi AI analysis hoàn tất
- Click nút **"Tải kết quả số hóa"** để download

### **Cách 2: Thủ Công (Nếu Chưa Có)**
- Click nút **"Tải kết quả số hóa"**
- Hệ thống sẽ tự động tạo file nếu chưa có
- Sau đó download file

**API:** `POST /api/documents/[id]/save-result` (nếu cần tạo lại)

---

## 📄 Format File Kết Quả

```
================================================================================
KẾT QUẢ SỐ HÓA TÀI LIỆU
================================================================================

Tên tài liệu: SGK Toán 9 - Chương 5
Loại tài liệu: Sách giáo khoa
Ngày số hóa: 15/01/2025, 10:30:45
Thời gian xử lý: 12 giây

Chủ đề: Toán học, Hàm số, Phương trình

Tóm tắt:
Bài học về hàm số bậc nhất, cách vẽ đồ thị và giải phương trình...

Cấu trúc tài liệu:
1. Khái niệm hàm số
2. Hàm số bậc nhất
3. Đồ thị hàm số
4. Ứng dụng

--------------------------------------------------------------------------------
NỘI DUNG ĐÃ SỐ HÓA
--------------------------------------------------------------------------------

# Hàm số bậc nhất

## Khái niệm
Hàm số bậc nhất là hàm số có dạng y = ax + b...

[Văn bản đã tái cấu trúc với định dạng rõ ràng]

================================================================================
Được tạo bởi hệ thống số hóa tài liệu AeroEduVision
Ngày tạo: 15/01/2025, 10:30:45
================================================================================
```

---

## 🎯 Kết Quả Cuối Cùng Cho Người Dùng

### **1. File Kết Quả (.txt)**
- **Vị trí**: `uploads/results/{userId}/{filename}.txt`
- **Nội dung**: 
  - Metadata đầy đủ (tên, loại, chủ đề, tóm tắt, cấu trúc)
  - Văn bản đã tái cấu trúc (dễ đọc, có format)
- **Download**: Click nút "Tải kết quả số hóa"

### **2. Dữ Liệu Trong Database**
- `document.ocrText`: Text gốc từ OCR
- `document.metadata.aiAnalysis`: Kết quả phân tích AI
- `document.metadata.restructuredText`: Văn bản đã tái cấu trúc
- `document.digitizedUrl`: URL đến file kết quả
- `document.metadata.resultFile`: Thông tin file kết quả

### **3. Hiển Thị Trên UI**
- **Tab "So sánh"**: Original vs Digitized
- **Tab "Text đã số hóa"**: OCR text gốc
- **Tab "Văn bản tái cấu trúc"**: Văn bản đã được AI tổ chức lại
- **Tab "Phân tích AI"**: Loại tài liệu, chủ đề, cấu trúc, layout
- **Tab "Log xử lý"**: Chi tiết quá trình xử lý

---

## 🔧 API Endpoints

### **1. POST /api/documents/upload**
Upload tài liệu

### **2. POST /api/documents/[id]/process**
Xử lý số hóa (OCR + AI Analysis + Lưu kết quả)

### **3. POST /api/documents/[id]/save-result**
Lưu/tạo lại file kết quả (nếu cần)

### **4. GET /api/documents/file/[...path]**
Download file (documents hoặc results)

### **5. POST /api/ai/analyze-document**
Phân tích AI (internal, được gọi bởi process route)

---

## ✅ Checklist Quy Trình

- [x] Upload tài liệu
- [x] OCR trích xuất text (Gemini Vision)
- [x] AI phân tích và tái cấu trúc (Gemini AI)
- [x] Tự động lưu file kết quả
- [x] Lưu metadata vào database
- [x] Download file kết quả
- [x] Hiển thị trên UI

---

## 🚀 Lợi Ích

1. **Kết quả hoàn chỉnh**: File kết quả bao gồm cả metadata và nội dung
2. **Dễ sử dụng**: Download một file duy nhất, không cần copy/paste nhiều phần
3. **Tự động**: File được tạo tự động sau khi số hóa
4. **Có thể tái tạo**: Có thể tạo lại file nếu cần
5. **Format chuẩn**: File có header, nội dung, footer rõ ràng

---

## 📝 Lưu Ý

- File kết quả được lưu tự động sau khi AI analysis hoàn tất
- Nếu file chưa có, click "Tải kết quả số hóa" sẽ tự động tạo
- File được lưu với format `.txt`, có thể mở bằng bất kỳ text editor nào
- File bao gồm cả văn bản tái cấu trúc (nếu có) hoặc OCR text gốc

---

## 🔗 Tài Liệu Liên Quan

- [AI Analysis Purpose](./AI_ANALYSIS_PURPOSE.md)
- [Gemini Vision Digitization](./GEMINI_VISION_DIGITIZATION.md)
- [Document Digitization API Integration](./DOCUMENT_DIGITIZATION_API_INTEGRATION.md)
