# 🔧 Sửa Lỗi GEMINI_API_KEY

## ✅ API Key Đã Có Trong .env

Script kiểm tra đã xác nhận:
```
✅ GEMINI_API_KEY is configured
   Key prefix: AIzaSyBQQK...
   Key length: 39 characters
```

---

## 🚨 Vấn Đề: Server Chưa Restart

Next.js chỉ load environment variables khi **khởi động server**. Nếu bạn:
- Vừa thêm `GEMINI_API_KEY` vào `.env`
- Hoặc sửa `GEMINI_API_KEY` trong `.env`

Thì **phải restart server** để nó load giá trị mới.

---

## ✅ Giải Pháp

### Bước 1: Dừng Server Hiện Tại

Trong terminal đang chạy `npm run dev`:
- Nhấn `Ctrl + C` để dừng server

### Bước 2: Khởi Động Lại Server

```bash
npm run dev
```

### Bước 3: Test Lại

1. Quay lại trang review document
2. Click "Số hóa lại"
3. Bây giờ sẽ hoạt động! ✅

---

## 🔍 Kiểm Tra Nhanh

Chạy script kiểm tra:

```bash
node scripts/check-gemini-key.js
```

Nếu thấy:
```
✅ GEMINI_API_KEY is configured
```

→ API key đã OK, chỉ cần restart server.

---

## 📝 Lưu Ý Quan Trọng

### Next.js Environment Variables:

1. **Chỉ load khi khởi động** - Phải restart sau khi sửa `.env`
2. **Ưu tiên `.env.local`** - Nếu có cả `.env` và `.env.local`, `.env.local` được ưu tiên
3. **Server-side only** - Env variables chỉ có trong server-side code (API routes)

### Kiểm Tra Env Variables:

```bash
# Xem tất cả env variables (không hiển thị giá trị)
node -e "require('dotenv').config(); console.log(Object.keys(process.env).filter(k => k.includes('GEMINI')).join(', '))"

# Kiểm tra GEMINI_API_KEY có giá trị không
node -e "require('dotenv').config(); console.log(process.env.GEMINI_API_KEY ? '✅ OK' : '❌ Missing')"
```

---

## 🎯 Sau Khi Restart

Sau khi restart server, bạn sẽ thấy trong logs:

```
🤖 [PROCESS] Using Gemini Vision API for text extraction
✅ [PROCESS] GEMINI_API_KEY found: AIzaSyBQQK...
✅ [PROCESS] Gemini Vision extraction successful: 500 ký tự
```

Và document sẽ được số hóa thành công! 🎉

---

## 🆘 Vẫn Gặp Lỗi?

Nếu sau khi restart vẫn lỗi:

1. **Kiểm tra API key có hợp lệ:**
   - Truy cập: https://aistudio.google.com/app/apikey
   - Xem API key có còn active không

2. **Kiểm tra quota:**
   - Vào Google AI Studio
   - Xem usage và quota

3. **Kiểm tra logs:**
   - Xem server logs để biết lỗi chi tiết
   - Kiểm tra processing logs trong database

4. **Test API key trực tiếp:**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
   ```

---

## ✅ Tóm Tắt

1. ✅ API key đã có trong `.env`
2. ⚠️ **Cần restart Next.js server**
3. ✅ Sau đó sẽ hoạt động bình thường

**Action:** Dừng server (Ctrl+C) và chạy lại `npm run dev`
