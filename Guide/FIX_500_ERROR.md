# ✅ Fix 500 Error - Hướng dẫn

## 🐛 Vấn đề
Lỗi **500 Internal Server Error** khi gọi `/api/llm-grading`

## 🔍 Nguyên nhân
API key `GEMINI_API_KEY` bị **duplicate** trong `.env.local` → Process.env không load đúng

## ✅ Đã sửa
1. ✅ Xóa duplicate key trong `.env.local`
2. ✅ File `.env.local` giờ clean và đúng format

## 🚀 Cách khắc phục

### Bước 1: Dừng server hiện tại
```bash
# Nhấn Ctrl + C trong terminal đang chạy server
```

### Bước 2: Restart server
```bash
npm run dev
```

### Bước 3: Verify
1. Truy cập: `http://localhost:3000/dashboard/labtwin/labs/ocr-grading`
2. Kiểm tra **API Status** (góc phải phải là 🟢 **Gemini API Ready**)
3. Thử upload và xử lý 1 bài thi

## 📝 File `.env.local` hiện tại (đúng)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lmsmath"

# Google AI Studio (Gemini) API Key
GEMINI_API_KEY=AIzaSyApz38IGfS6_LqsFyD2L-3DPQUAOvrOVoI
```

## 🔧 Debug Commands

### Kiểm tra API key được load chưa:
```bash
# Trong terminal đang chạy server, bạn sẽ thấy log
# Nếu thấy lỗi "GEMINI_API_KEY is not defined" → chưa load đúng
```

### Test API trực tiếp:
```bash
curl -X POST http://localhost:3000/api/llm-grading \
  -H "Content-Type: application/json" \
  -d '{
    "student_answer": "Test answer",
    "question_text": "Test question",  
    "model_answer": "Test model",
    "max_score": 10,
    "llm_provider": "gemini"
  }'
```

**Expected response:**
```json
{
  "score": 7.5,
  "comment": "...",
  "provider": "gemini"
}
```

## ⚠️ Nếu vẫn lỗi

### 1. Xóa cache Next.js:
```bash
rm -rf .next
npm run dev
```

### 2. Kiểm tra API key hợp lệ:
- Truy cập: https://aistudio.google.com/
- Kiểm tra API key: `AIzaSyApz38IGfS6_LqsFyD2L-3DPQUAOvrOVoI`
- Xem quota còn không

### 3. Kiểm tra console log:
```bash
# Mở browser console (F12)
# Xem tab Network → llm-grading
# Xem error message chi tiết
```

## ✅ Checklist sau khi restart

- [ ] Server khởi động không lỗi
- [ ] API Status hiển thị 🟢 Gemini API Ready
- [ ] Upload bài thi test
- [ ] Click "Xử lý bài thi đầu tiên"
- [ ] Thấy kết quả chấm điểm
- [ ] Không còn lỗi 500

## 🎉 Done!

Sau khi restart, hệ thống sẽ hoạt động bình thường!

---

**Last updated:** $(date)
**Status:** ✅ Fixed

