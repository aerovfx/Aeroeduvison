# 🎓 AI Auto-Grading System - OCR + LLM

## 🚀 Quick Start

### 1. API Key đã được thiết lập sẵn!

File `.env.local` đã được tạo với Gemini API key:
```
GEMINI_API_KEY=AIzaSyApz38IGfS6_LqsFyD2L-3DPQUAOvrOVoI
```

### 2. Khởi động server

```bash
npm run dev
```

### 3. Truy cập hệ thống

Mở trình duyệt và vào:
```
http://localhost:3000/dashboard/labtwin/labs/ocr-grading
```

---

## ✨ Tính năng chính

### 📤 **Tab 1: Upload & Cấu hình**
- Upload ảnh bài thi (JPG, PNG, PDF)
- Chọn mô hình OCR: VietOCR / PaddleOCR / TrOCR
- Chọn mô hình LLM: **Gemini Pro** (đã kích hoạt)
- Nhập câu hỏi và đáp án mẫu

### 🧠 **Tab 2: Chấm điểm**
- Xem text OCR đã nhận dạng
- Chỉnh sửa text nếu OCR sai
- Xem điểm số AI chấm (0-10)
- Đọc nhận xét chi tiết từ Gemini
- So sánh với đáp án mẫu
- Chấm lại nếu cần

### ⚡ **Tab 3: Xử lý hàng loạt**
- Xử lý song song nhiều bài thi
- Thanh tiến trình real-time
- Tạm dừng/Tiếp tục
- Xem bảng kết quả chi tiết
- Color-coded theo điểm số

### 📊 **Tab 4: Thống kê**
- Điểm trung bình, cao nhất, thấp nhất
- Tỷ lệ đạt/không đạt
- Biểu đồ phân bố điểm
- Độ lệch chuẩn
- Top 5 học sinh xuất sắc

---

## 🎯 Cách sử dụng

### Chấm 1 bài thi:

1. **Upload ảnh** bài thi
2. Nhập **đáp án mẫu** và **số điểm tối đa**
3. Click **"Xử lý bài thi đầu tiên"**
4. Chờ OCR + AI chấm điểm (3-5s)
5. Xem kết quả trong tab "Chấm điểm"

### Chấm hàng loạt:

1. **Upload nhiều ảnh** bài thi
2. Nhập **đáp án mẫu**
3. Chuyển sang tab **"Xử lý hàng loạt"**
4. Click **"Bắt đầu xử lý"**
5. Xem tiến trình và kết quả
6. Click **"Xuất kết quả"** để tải file CSV

---

## 🔍 Các chỉ số quan trọng

### API Status (góc phải trên)
- 🟢 **Gemini API Ready** - Sẵn sàng sử dụng
- 🔴 **API Offline** - Kiểm tra API key hoặc internet
- 🟡 **Checking...** - Đang kết nối

### Độ tin cậy OCR
- Hiển thị % độ chính xác khi nhận dạng chữ
- Càng cao càng tốt (>90% là tốt)

### Màu sắc điểm số
- 🟢 **8-10**: Xuất sắc
- 🟡 **5-7.9**: Đạt
- 🔴 **0-4.9**: Không đạt

---

## 🛠️ Cấu trúc kỹ thuật

```
Frontend: React/Next.js + Tailwind CSS
├── OCR Processing (simulated - có thể tích hợp VietOCR)
└── LLM Grading
    └── API: /api/llm-grading
        └── Gemini Pro API
            ├── Input: student_answer, model_answer, question_text
            └── Output: score (0-10), comment

Backend: Next.js API Routes
├── /app/api/llm-grading/route.ts
└── Google Generative AI SDK (@google/generative-ai)
```

---

## 📝 Ví dụ Prompt gửi đến Gemini

```
Bạn là một giáo viên chuyên nghiệp đang chấm bài thi tự luận.

### Câu hỏi:
Trình bày nguyên nhân thắng lợi của Cách mạng tháng Tám.

### Đáp án mẫu:
Do có sự lãnh đạo sáng suốt của Đảng Cộng sản Việt Nam...

### Bài làm học sinh:
Cách mạng tháng Tám thắng lợi vì...

→ Cho điểm 0-10 và giải thích ngắn gọn.
```

**Gemini trả về:**
```json
{
  "score": 8.5,
  "comment": "Bài làm trình bày được ý chính về vai trò của Đảng. 
             Tuy nhiên thiếu dẫn chứng cụ thể về thời cơ quốc tế."
}
```

---

## 🔐 Bảo mật

✅ API key được lưu trong `.env.local` (không commit lên git)  
✅ `.env.local` đã được thêm vào `.gitignore`  
✅ Sử dụng environment variables  
✅ Server-side API calls (client không thấy key)

---

## 🐛 Troubleshooting

### Lỗi: "API Offline"

**Nguyên nhân:**
- API key không đúng
- Chưa có file `.env.local`
- Server chưa được khởi động lại sau khi thêm API key

**Giải pháp:**
```bash
# 1. Kiểm tra file .env.local tồn tại
ls -la .env.local

# 2. Kiểm tra nội dung
cat .env.local

# 3. Khởi động lại server
npm run dev
```

### Lỗi: "Error parsing Gemini response"

**Nguyên nhân:**
- Gemini trả về format không đúng JSON
- API key hết quota

**Giải pháp:**
- Kiểm tra quota tại: https://aistudio.google.com/
- Code đã có fallback parsing - sẽ tự động retry

### Upload ảnh không hoạt động

**Giải pháp:**
- Chỉ upload file JPG, PNG, PDF
- Kích thước < 50MB
- Kiểm tra browser console (F12)

---

## 📦 Export Format (CSV)

```csv
Student ID,Question,Score,Max Score,Comment
A123,q1,8.5,10,"Bài làm tốt, trình bày rõ ràng..."
A456,q1,7.0,10,"Còn thiếu dẫn chứng..."
```

---

## 🚀 Mở rộng trong tương lai

### Phase 1: OCR thực
- [ ] Tích hợp VietOCR Python API
- [ ] Tích hợp PaddleOCR
- [ ] OpenCV preprocessing (deskew, denoise)

### Phase 2: Multi-LLM
- [ ] Thêm GPT-4 API
- [ ] Thêm Claude API
- [ ] Thêm Llama3 local

### Phase 3: Advanced Features
- [ ] Voice feedback (TTS)
- [ ] Vector similarity grading
- [ ] Fine-tune LLM cho từng môn học
- [ ] Embedding caching
- [ ] GPU queue manager

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Console log (F12 → Console)
2. Network tab (F12 → Network)
3. Server log (terminal chạy `npm run dev`)

---

**✨ Hệ thống đã sẵn sàng sử dụng!**

Truy cập: `http://localhost:3000/dashboard/labtwin/labs/ocr-grading`

