# 🚀 Quick Start - AI Content Generator

## ⚡ 3 Bước để bắt đầu

### 1️⃣ Setup Database (Bắt buộc)

```bash
cd /Users/vietchung/lmsmath

# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

### 2️⃣ (Optional) Thêm OpenAI API Key

```bash
# Tạo/chỉnh sửa .env.local
nano .env.local

# Thêm dòng này:
OPENAI_API_KEY="sk-your-api-key-here"
```

**Lưu ý:** Không có API key? Không sao! Hệ thống sẽ dùng **demo mode** 🎨

### 3️⃣ Khởi động & Sử dụng

```bash
# Khởi động server
npm run dev

# Truy cập: http://localhost:3000
# Login → Teacher Dashboard → 🚀 AI Content Generator
```

---

## 🎯 Test ngay

### Test 1: Tạo bài học
```
✏️ Loại: Bài học
📚 Môn: Toán học
🎓 Lớp: 9
📖 Chủ đề: Phương trình bậc hai

→ Click "Tạo nội dung với AI"
```

### Test 2: Tạo Quiz
```
✏️ Loại: Quiz
📚 Môn: Vật lý
🎓 Lớp: 10
📖 Chủ đề: Định luật Newton

→ Click "Tạo nội dung với AI"
```

---

## 📋 Checklist

- [ ] Chạy `npm run db:generate`
- [ ] Chạy `npm run db:push`
- [ ] (Optional) Thêm OPENAI_API_KEY vào .env.local
- [ ] Chạy `npm run dev`
- [ ] Login với tài khoản TEACHER
- [ ] Thấy "🚀 AI Content Generator" trong sidebar
- [ ] Test tạo bài học
- [ ] Test tạo quiz
- [ ] Test copy & download

---

## ✅ Xong!

Bây giờ bạn có thể:
- ✨ Tạo bài học tự động
- 📝 Sinh quiz chất lượng cao
- 🎯 Tạo slides chuyên nghiệp
- 🎬 Generate video scripts

**Tiết kiệm 70-80% thời gian chuẩn bị! 🎉**

---

## 📚 Đọc thêm

- Full guide: `/docs/AI_CONTENT_GENERATOR_GUIDE.md`
- Demo: `/AI_GENERATOR_DEMO.md`
- Complete: `/AI_GENERATOR_COMPLETE.md`

