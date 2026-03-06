# Số Hóa Tài Liệu Với Gemini Vision API

## ✅ Đã Tích Hợp

Module số hóa tài liệu hiện sử dụng **Google Gemini Vision API** để trích xuất text trực tiếp từ ảnh, **không cần OCR service**.

---

## 🎯 Ưu Điểm

### So với OCR Service:

| Tính năng | OCR Service | Gemini Vision |
|-----------|-------------|---------------|
| **Cần khởi động service** | ✅ Cần | ❌ Không cần |
| **Cấu hình phức tạp** | ✅ Cần setup | ❌ Chỉ cần API key |
| **Độ chính xác** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Hỗ trợ tiếng Việt** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Xử lý công thức toán** | ⭐⭐ | ⭐⭐⭐⭐ |
| **Chi phí** | Miễn phí (local) | ~$0.0001-0.0005/ảnh |

---

## 🔑 Cấu Hình

### Bước 1: Lấy Gemini API Key

1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập với Google account
3. Click "Create API Key"
4. Copy API key

### Bước 2: Thêm vào `.env`

```env
# Google Gemini API Key
GEMINI_API_KEY="your-api-key-here"

# Optional: Chọn model (mặc định: gemini-2.5-flash)
GEMINI_VISION_MODEL="gemini-2.5-flash"
```

**Model Options:**
- `gemini-2.5-flash` - Nhanh, rẻ (mặc định) ⚡
- `gemini-2.5-pro` - Chất lượng cao hơn 🚀
- `gemini-1.5-pro` - Model cũ (vẫn hoạt động)

### Bước 3: Restart Server

```bash
npm run dev
```

---

## 🚀 Cách Hoạt Động

### Luồng Xử Lý:

```
1. User upload ảnh
   ↓
2. File được lưu vào storage
   ↓
3. POST /api/documents/[id]/process
   ↓
4. Convert ảnh → Base64
   ↓
5. Gửi đến Gemini Vision API
   ↓
6. Gemini trích xuất text
   ↓
7. Gửi text đến Gemini AI để phân tích
   ↓
8. Lưu kết quả vào database
```

### API Call:

**Gemini Vision API:**
```typescript
const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

const result = await model.generateContent([
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image
    }
  },
  { text: "Trích xuất toàn bộ văn bản tiếng Việt trong ảnh này..." }
])

const extractedText = result.response.text()
```

---

## 📊 Tính Năng

### 1. **Trích Xuất Text Chính Xác**

- ✅ Hỗ trợ tiếng Việt tốt
- ✅ Giữ nguyên định dạng (xuống dòng, khoảng trắng)
- ✅ Xử lý công thức toán học
- ✅ Nhận diện bảng biểu

### 2. **Không Cần OCR Service**

- ❌ Không cần khởi động Python OCR service
- ❌ Không cần cấu hình port 8001
- ✅ Chỉ cần API key là đủ

### 3. **Tự Động Phân Tích**

Sau khi trích xuất text, Gemini AI sẽ tự động:
- Phân loại tài liệu (exam, textbook, question_bank)
- Trích xuất chủ đề chính
- Tạo tóm tắt nội dung
- Phân tích cấu trúc

---

## 💰 Chi Phí

### Gemini 2.5 Flash (Mặc định):

- **Input:** $0.075 / 1M tokens
- **Output:** $0.30 / 1M tokens
- **Ước tính:** ~$0.0001-0.0005 per image

**Ví dụ:**
- 100 ảnh: ~$0.01-0.05
- 1000 ảnh: ~$0.10-0.50

### Gemini 2.5 Pro (Chất lượng cao):

- **Input:** $1.25 / 1M tokens
- **Output:** $5.00 / 1M tokens
- **Ước tính:** ~$0.001-0.005 per image

**Khuyến nghị:** Dùng `gemini-2.5-flash` cho hầu hết trường hợp (đủ tốt và rẻ hơn 10x)

---

## 🔍 So Sánh Kết Quả

### OCR Service (PaddleOCR):
- ✅ Miễn phí (local)
- ⚠️ Cần setup và khởi động service
- ⚠️ Độ chính xác phụ thuộc vào chất lượng ảnh
- ⚠️ Có thể miss một số ký tự đặc biệt

### Gemini Vision:
- ✅ Không cần setup
- ✅ Độ chính xác cao hơn
- ✅ Xử lý tốt tiếng Việt
- ✅ Hiểu context và cấu trúc
- ⚠️ Có chi phí (nhưng rất rẻ)

---

## 🐛 Troubleshooting

### Lỗi: "GEMINI_API_KEY chưa được cấu hình"

**Giải pháp:**
1. Kiểm tra `.env` có `GEMINI_API_KEY` không
2. Restart Next.js server
3. Đảm bảo API key hợp lệ

### Lỗi: "Đã vượt quá quota"

**Giải pháp:**
1. Kiểm tra usage tại https://aistudio.google.com
2. Upgrade plan nếu cần
3. Hoặc đợi quota reset

### Lỗi: "File quá lớn"

**Giải pháp:**
- Gemini Vision giới hạn: ~20MB per image
- Nén ảnh trước khi upload
- Hoặc chia nhỏ ảnh

---

## 📝 Logs

Khi xử lý, kiểm tra logs:

```bash
# Server logs sẽ hiển thị:
🤖 [PROCESS] Using Gemini Vision API for text extraction
✅ [PROCESS] Gemini Vision extraction successful: 500 ký tự

# Processing logs trong database:
- stage: "ocr"
- message: "Trích xuất text thành công với Gemini Vision: 500 ký tự"
- metadata: { provider: "gemini-vision", model: "gemini-2.5-flash" }
```

---

## 🎯 Kết Luận

✅ **Đã tích hợp Gemini Vision API**  
✅ **Không cần OCR service**  
✅ **Độ chính xác cao**  
✅ **Dễ cấu hình** (chỉ cần API key)  
✅ **Chi phí hợp lý** (~$0.0001-0.0005/ảnh)  

Chỉ cần thêm `GEMINI_API_KEY` vào `.env` và restart server là có thể sử dụng ngay!
