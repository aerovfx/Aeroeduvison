# Hướng dẫn tích hợp Gemini API

## Bước 1: Thêm API Key vào file môi trường

Tạo hoặc cập nhật file `.env.local` trong thư mục gốc của project:

```bash
# Google AI Studio (Gemini) API Key
GEMINI_API_KEY=AIzaSyApz38IGfS6_LqsFyD2L-3DPQUAOvrOVoI
```

## Bước 2: Cài đặt dependencies

Package `@google/generative-ai` đã được cài đặt. Nếu cần cài lại:

```bash
npm install @google/generative-ai --legacy-peer-deps
```

## Bước 3: Khởi động lại server

```bash
npm run dev
```

## Bước 4: Sử dụng hệ thống

1. Truy cập: `http://localhost:3000/dashboard/labtwin/labs/ocr-grading`
2. Upload ảnh bài thi
3. Chọn mô hình LLM (Gemini)
4. Nhập đáp án mẫu
5. Click "Xử lý bài thi" hoặc "Xử lý hàng loạt"

## Tính năng đã tích hợp:

✅ **OCR Processing** - Nhận dạng chữ viết tay
✅ **Gemini Pro API** - Chấm điểm tự động với AI
✅ **Batch Processing** - Xử lý hàng loạt nhiều bài thi
✅ **Statistics** - Thống kê và phân tích kết quả
✅ **Export CSV** - Xuất kết quả ra file

## API Endpoint:

### POST `/api/llm-grading`

**Request Body:**
```json
{
  "student_answer": "Bài làm của học sinh...",
  "question_text": "Câu hỏi...",
  "model_answer": "Đáp án mẫu...",
  "max_score": 10,
  "llm_provider": "gemini"
}
```

**Response:**
```json
{
  "score": 8.5,
  "comment": "Bài làm tốt, trình bày rõ ràng...",
  "provider": "gemini"
}
```

## Lưu ý bảo mật:

⚠️ **KHÔNG** commit file `.env.local` lên git
⚠️ API Key đã được thêm vào `.gitignore` tự động
⚠️ Sử dụng environment variables cho production

## Troubleshooting:

### Lỗi: "GEMINI_API_KEY is not defined"
- Kiểm tra file `.env.local` đã được tạo
- Khởi động lại Next.js server

### Lỗi: "Error parsing Gemini response"
- Kiểm tra API key có hợp lệ
- Kiểm tra quota của API key trên Google AI Studio

### Lỗi network
- Kiểm tra kết nối internet
- Kiểm tra firewall không chặn API calls

## Mở rộng:

Để thêm các LLM providers khác (GPT-4, Claude, Llama3), cập nhật file:
`/app/api/llm-grading/route.ts`

---

**Created:** $(date)
**API Key:** AIzaSyApz38IGfS6_LqsFyD2L-3DPQUAOvrOVoI

