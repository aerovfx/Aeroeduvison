# 🚀 START - AI Content Generator với Cursor API

## ⚡ Bắt đầu ngay (3 bước)

### 1️⃣ Kiểm tra setup

```bash
cd /Users/vietchung/lmsmath

# Check .env.local đã có chưa
cat .env.local
# Phải thấy: CURSOR_API_KEY="key_b2840f5b..."
```

✅ File `.env.local` đã được tạo với Cursor API key của bạn!

### 2️⃣ Khởi động server

```bash
npm run dev
```

Đợi thấy:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

### 3️⃣ Truy cập & Test

1. Mở browser: **http://localhost:3000**
2. **Login** với tài khoản TEACHER
3. Sidebar → Click **"🚀 AI Content Generator"**
4. **Tạo thử một bài học:**
   - Loại: Bài học
   - Môn: Toán học
   - Lớp: 9
   - Chủ đề: Phương trình bậc hai
   - Click **"Tạo nội dung với AI"**

### ✅ Xong! 

Trong logs của terminal (nơi chạy `npm run dev`) bạn sẽ thấy:
```
Using Cursor API...
```

Nếu thấy message này = **Thành công!** 🎉

---

## 🎯 What's Next?

### Thử các loại nội dung khác:

1. **📝 Quiz**: Tạo 10-15 câu hỏi tự động
2. **🎯 Slides**: 8-12 slides chuyên nghiệp
3. **🎬 Video Script**: Kịch bản video đầy đủ

### Tính năng:

- ✅ Copy nội dung
- ✅ Download JSON
- ✅ Tùy chỉnh độ khó
- ✅ Thêm yêu cầu riêng

---

## 📊 Providers Available

Hiện tại system hỗ trợ:

| Provider | Status | Setup |
|----------|--------|-------|
| **Cursor API** | ✅ Active | Done! |
| **Ollama** | ⏸️ Optional | See guide |
| **OpenAI** | ⏸️ Optional | Add key |
| **Demo Mode** | ✅ Fallback | Always on |

---

## 🐛 Nếu có vấn đề

### Không thấy "Using Cursor API..."

```bash
# 1. Check .env.local
cat .env.local

# 2. Restart server
# Ctrl+C để stop
npm run dev
```

### Lỗi khi generate

System sẽ tự động fallback sang Demo Mode → Vẫn tạo được nội dung!

---

## 📚 Docs

- **Cursor Setup**: `/docs/CURSOR_API_SETUP.md`
- **Ollama Setup**: `/docs/OLLAMA_SETUP_GUIDE.md`
- **Full Guide**: `/docs/AI_CONTENT_GENERATOR_GUIDE.md`
- **Complete**: `/AI_PROVIDERS_COMPLETE.md`

---

## ✨ Enjoy!

Giờ bạn có thể:
- ⚡ Tạo bài học trong 15-20 giây
- 📝 Generate quiz tự động
- 🎯 Tạo slides chuyên nghiệp
- 💰 Chi phí thấp với Cursor API

**Happy Teaching with AI! 🎓🚀**

