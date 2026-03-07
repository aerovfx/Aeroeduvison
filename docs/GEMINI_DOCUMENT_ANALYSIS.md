# Tích Hợp Gemini API Cho Phân Tích Tài Liệu

## ✅ Đã Tích Hợp

Module số hóa tài liệu đã được tích hợp với **Google Gemini API** để phân tích nội dung tài liệu một cách thông minh.

---

## 🔑 Cấu Hình API Key

### Bước 1: Lấy Gemini API Key

1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập với Google account
3. Click "Create API Key"
4. Copy API key

### Bước 2: Thêm vào `.env`

Thêm vào file `.env` hoặc `.env.local`:

```env
# Google Gemini API
GEMINI_API_KEY="your-api-key-here"

# Optional: Chọn model (mặc định: gemini-2.5-flash)
GEMINI_MODEL="gemini-2.5-flash"
```

**Lưu ý:** 
- Có thể dùng `GOOGLE_AI_API_KEY` thay cho `GEMINI_API_KEY` (hỗ trợ cả hai)
- Model options:
  - `gemini-2.5-flash` - Nhanh, rẻ (mặc định)
  - `gemini-2.5-pro` - Chất lượng cao hơn
  - `gemini-pro` - Model cũ (vẫn hoạt động)

---

## 🚀 Cách Hoạt Động

### Luồng Xử Lý:

```
1. User upload document
   ↓
2. OCR trích xuất text
   ↓
3. POST /api/ai/analyze-document
   ↓
4. Gemini AI phân tích:
   - Loại tài liệu (exam, textbook, question_bank, document)
   - Cấu trúc (sections, chapters)
   - Chủ đề chính (key topics)
   - Tóm tắt nội dung
   ↓
5. Lưu kết quả vào database
   ↓
6. Hiển thị trên trang review
```

### API Endpoint:

**POST** `/api/ai/analyze-document`

**Request:**
```json
{
  "text": "Nội dung text đã được OCR...",
  "documentType": "IMAGE|PDF",
  "fileName": "filename.jpg"
}
```

**Response:**
```json
{
  "type": "textbook",
  "structure": {
    "sections": [
      {
        "title": "Chương 1: Dao động điều hòa",
        "content": "Nội dung tóm tắt..."
      }
    ]
  },
  "keyTopics": ["Vật lý", "Dao động", "Con lắc"],
  "summary": "Tài liệu về dao động điều hòa trong vật lý...",
  "metadata": {
    "wordCount": 500,
    "characterCount": 2500,
    "estimatedPages": 2,
    "aiModel": "gemini-2.5-flash",
    "aiProvider": "gemini"
  }
}
```

---

## 📊 Tính Năng Phân Tích

### 1. **Phát Hiện Loại Tài Liệu**

Gemini tự động phân loại:
- `exam` - Đề thi
- `textbook` - Sách giáo khoa
- `question_bank` - Ngân hàng câu hỏi
- `document` - Tài liệu thông thường

### 2. **Phân Tích Cấu Trúc**

Tự động nhận diện:
- Các phần/chương/bài
- Tiêu đề và nội dung
- Cấu trúc phân cấp

### 3. **Trích Xuất Chủ Đề**

Liệt kê 3-5 chủ đề chính:
- Môn học (Toán, Văn, Lý, Hóa, Sinh, Sử, Địa, Anh)
- Chủ điểm cụ thể (Phương trình, Hàm số, Hình học, etc.)

### 4. **Tóm Tắt Nội Dung**

Tạo tóm tắt ngắn gọn 2-3 câu về nội dung chính

---

## 🔄 Fallback Mechanism

Nếu Gemini API không khả dụng:

1. **Tự động fallback** về basic analysis (không dùng AI)
2. Vẫn trả về kết quả với:
   - `aiModel: "fallback"`
   - `aiProvider: "fallback"`
3. User vẫn có thể xem document, chỉ không có AI analysis

---

## 💰 Chi Phí

### Gemini Pricing (2025):

- **Gemini 2.5 Flash:**
  - Input: $0.075 / 1M tokens
  - Output: $0.30 / 1M tokens
  - **Ước tính:** ~$0.0001-0.0005 per document analysis

- **Gemini 2.5 Pro:**
  - Input: $1.25 / 1M tokens
  - Output: $5.00 / 1M tokens
  - **Ước tính:** ~$0.001-0.005 per document analysis

**Khuyến nghị:** Dùng `gemini-2.5-flash` cho document analysis (đủ tốt và rẻ hơn nhiều)

---

## 🐛 Troubleshooting

### Lỗi: "GEMINI_API_KEY is not configured"

**Giải pháp:**
1. Kiểm tra `.env` có `GEMINI_API_KEY` không
2. Restart Next.js server sau khi thêm env variable
3. Đảm bảo API key hợp lệ

### Lỗi: "Gemini API error: 403"

**Nguyên nhân:** API key không hợp lệ hoặc hết quota

**Giải pháp:**
1. Kiểm tra API key tại https://aistudio.google.com/app/apikey
2. Kiểm tra quota/usage
3. Tạo API key mới nếu cần

### Lỗi: "Model not found"

**Nguyên nhân:** Model name không đúng

**Giải pháp:**
- Dùng model names hợp lệ:
  - `gemini-2.5-flash`
  - `gemini-2.5-pro`
  - `gemini-pro`

---

## 📝 Logs

Khi phân tích tài liệu, kiểm tra logs:

```bash
# Server logs sẽ hiển thị:
🤖 [ANALYZE] Using Gemini AI for document analysis
✅ [ANALYZE] Gemini analysis successful

# Hoặc nếu fallback:
⚠️ [ANALYZE] Using fallback analysis (Gemini not available or failed)
```

---

## 🎯 Kết Quả

Sau khi tích hợp:

✅ **Phân tích thông minh** - Gemini AI phân tích nội dung  
✅ **Tự động phân loại** - Nhận diện loại tài liệu  
✅ **Trích xuất chủ đề** - Tìm chủ đề chính  
✅ **Tóm tắt nội dung** - Tạo summary tự động  
✅ **Fallback an toàn** - Vẫn hoạt động nếu API không khả dụng  

---

## 📚 Tài Liệu Tham Khảo

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Gemini Models](https://ai.google.dev/models/gemini)
- [API Pricing](https://ai.google.dev/pricing)
