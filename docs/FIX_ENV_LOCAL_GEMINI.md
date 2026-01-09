# 🔧 Sửa Lỗi GEMINI_API_KEY - .env.local Override

## 🚨 Vấn Đề Đã Tìm Thấy

Bạn có **2 file env**:
- `.env` - Có API key thật: `AIzaSyBQQKlAXxeF1m40Qc6fLCn_Uc7xqHU0FcM` ✅
- `.env.local` - Có placeholder: `"your-gemini-api-key"` ❌

**Next.js ưu tiên `.env.local` hơn `.env`**, nên nó đang đọc placeholder thay vì API key thật!

---

## ✅ Giải Pháp

### Option 1: Sửa `.env.local` (Khuyến nghị)

Mở file `.env.local` và thay dòng:

```env
# Từ:
GEMINI_API_KEY="your-gemini-api-key"

# Thành:
GEMINI_API_KEY="AIzaSyBQQKlAXxeF1m40Qc6fLCn_Uc7xqHU0FcM"
```

### Option 2: Xóa dòng trong `.env.local`

Xóa hoặc comment dòng `GEMINI_API_KEY` trong `.env.local`:

```env
# GEMINI_API_KEY="your-gemini-api-key"  # Commented out - use .env instead
```

Sau đó Next.js sẽ đọc từ `.env`.

---

## 🔄 Sau Khi Sửa

**Quan trọng:** Phải restart Next.js server!

```bash
# 1. Dừng server (Ctrl+C)
# 2. Khởi động lại
npm run dev
```

---

## 🔍 Kiểm Tra

Sau khi restart, kiểm tra server logs khi số hóa document:

```
✅ [PROCESS] GEMINI_API_KEY found and valid:
   keyPrefix: AIzaSyBQQK...
   keyLength: 39
   source: GEMINI_API_KEY
```

---

## 📝 Lưu Ý Về Next.js Env Priority

Next.js load env files theo thứ tự ưu tiên:

1. `.env.local` (highest priority) ⭐
2. `.env.development` / `.env.production`
3. `.env` (lowest priority)

**Vì vậy:**
- Nếu có cả `.env` và `.env.local` → `.env.local` được dùng
- Nếu muốn dùng `.env` → Xóa/comment trong `.env.local`

---

## ✅ Tóm Tắt

1. ✅ API key thật đã có trong `.env`
2. ❌ `.env.local` đang override với placeholder
3. ✅ **Sửa `.env.local`** với API key thật
4. ✅ **Restart server**
5. ✅ Hoạt động! 🎉
