# ⚡ Quick Setup - Gemini API Key

## 🚨 Lỗi Hiện Tại

Bạn đang gặp lỗi:
```
GEMINI_API_KEY chưa được cấu hình hoặc không hợp lệ. Vui lòng kiểm tra file .env
```

---

## ✅ Giải Pháp (2 phút)

### Bước 1: Lấy Gemini API Key

1. **Truy cập:** https://aistudio.google.com/app/apikey
2. **Đăng nhập** với Google account
3. **Click "Create API Key"**
4. **Copy API key** (bắt đầu với `AIza...`)

### Bước 2: Thêm vào file `.env`

Mở file `.env` trong thư mục project và thêm dòng:

```env
GEMINI_API_KEY="AIzaSy...your-api-key-here"
```

**Lưu ý:**
- Nếu file `.env` không tồn tại, tạo mới từ `env.example`
- Đảm bảo không có khoảng trắng thừa
- Giữ nguyên dấu ngoặc kép

### Bước 3: Restart Server

**Quan trọng:** Phải restart Next.js server để load env variables mới!

```bash
# Dừng server hiện tại (Ctrl+C)
# Sau đó chạy lại:
npm run dev
```

---

## 🔍 Kiểm Tra

Sau khi restart, kiểm tra:

```bash
# Kiểm tra env variable có được load không
node -e "require('dotenv').config(); console.log(process.env.GEMINI_API_KEY ? '✅ OK' : '❌ Missing')"
```

Hoặc test trực tiếp:
1. Upload một ảnh
2. Click "Số hóa với AI"
3. Nếu thành công → API key đã hoạt động ✅

---

## 📝 Ví Dụ File `.env`

```env
# Database
DATABASE_URL="..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Google Gemini API (THÊM DÒNG NÀY)
GEMINI_API_KEY="AIzaSyBPvQ8FwcM0gEJ2Isf6qS7OPvzlIPewFIo"

# Optional: Chọn model
GEMINI_VISION_MODEL="gemini-2.5-flash"
```

---

## ⚠️ Lưu Ý

1. **Không commit `.env`** vào git (đã có trong `.gitignore`)
2. **API key là bí mật** - không chia sẻ công khai
3. **Restart server** sau khi thêm env variable
4. **Kiểm tra quota** tại https://aistudio.google.com nếu gặp lỗi quota

---

## 🆘 Vẫn Gặp Lỗi?

### Kiểm tra:

1. **API key có đúng format không?**
   - Phải bắt đầu với `AIza`
   - Không có khoảng trắng thừa

2. **File `.env` có đúng vị trí không?**
   - Phải ở root của project: `/Users/vietchung/Aeroeduvision/.env`

3. **Server đã restart chưa?**
   - Next.js chỉ load env variables khi khởi động
   - Phải restart sau khi thêm/sửa `.env`

4. **Có nhiều file `.env` không?**
   - Kiểm tra cả `.env` và `.env.local`
   - Next.js ưu tiên `.env.local` nếu có

---

## ✅ Sau Khi Setup

Sau khi thêm API key và restart:
- ✅ Upload ảnh → Số hóa với AI
- ✅ Gemini Vision sẽ trích xuất text
- ✅ Gemini AI sẽ phân tích nội dung
- ✅ Không cần OCR service nữa!
