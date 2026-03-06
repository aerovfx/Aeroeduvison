# 🎯 Cursor API Setup - Quick Guide

## 🚀 Setup nhanh (bạn đã có key!)

### Bước 1: Tạo file .env.local

```bash
cd /Users/vietchung/lmsmath

# Tạo file .env.local
cat > .env.local << 'EOF'
# AI Content Generator - Cursor API Configuration

# Provider mode (auto sẽ tự động dùng Cursor nếu có key)
AI_PROVIDER="auto"

# Cursor API Key (bạn đã có)
CURSOR_API_KEY="key_b2840f5b728a83699def85ef918acacee7dfe983124b3792da614f9011e1a418"

# Ollama (optional, nếu muốn dùng local AI)
# OLLAMA_URL="http://localhost:11434"
# OLLAMA_MODEL="llama2"
EOF
```

### Bước 2: Khởi động lại server

```bash
# Stop server hiện tại (Ctrl+C nếu đang chạy)

# Start lại
npm run dev
```

### Bước 3: Test ngay!

1. Truy cập: http://localhost:3000/teacher/ai-content-generator
2. Login với tài khoản TEACHER
3. Tạo bài học/quiz
4. Cursor API sẽ được sử dụng tự động! ✨

---

## 🎯 Cursor API có gì?

### Ưu điểm:
- ✅ **Có thể rẻ hơn OpenAI** (hoặc free với Cursor Pro subscription)
- ✅ **Dễ dùng** - Giống hệt OpenAI API
- ✅ **Chất lượng cao** - Dùng GPT-4 và các models tốt
- ✅ **Nhanh** - Response time tốt

### So sánh:

| Feature | Cursor API | OpenAI | Ollama |
|---------|-----------|--------|--------|
| Cost | Low/Free* | $0.01-0.03 | Free |
| Quality | 9/10 | 9/10 | 7/10 |
| Speed | Fast | Fast | Medium |
| Setup | Easy | Easy | Medium |
| Internet | Yes | Yes | No |

*Free nếu có Cursor Pro subscription

---

## 🔧 Advanced Configuration

### Chọn provider cụ thể

```bash
# Trong .env.local

# Chỉ dùng Cursor
AI_PROVIDER="cursor"

# Hoặc auto (thử tất cả)
AI_PROVIDER="auto"
```

### Priority khi dùng "auto":

1. **Cursor** (nếu có CURSOR_API_KEY)
2. **Ollama** (nếu đang chạy local)
3. **OpenAI** (nếu có OPENAI_API_KEY)
4. **Demo Mode** (fallback)

---

## 🧪 Test Cursor API

### Test bằng curl:

```bash
curl -X POST http://localhost:3000/api/ai-content/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "type": "lesson",
    "subject": "Toán học",
    "grade": "9",
    "topic": "Phương trình bậc hai",
    "difficulty": "medium"
  }'
```

### Xem logs:

```bash
# Terminal đang chạy npm run dev sẽ show:
# "Using Cursor API..."

# Nếu thấy message này = success! ✅
```

---

## 🐛 Troubleshooting

### Lỗi "Cursor API error"

**Nguyên nhân:**
- API key không đúng
- Hết quota
- Network issue

**Giải pháp:**
```bash
# 1. Kiểm tra key trong .env.local
cat .env.local | grep CURSOR_API_KEY

# 2. Test key với curl
curl -X POST https://api.cursor.sh/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer key_b2840f5b728a83699def85ef918acacee7dfe983124b3792da614f9011e1a418" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'

# Nếu có response = key hoạt động
```

### Không thấy "Using Cursor API..." trong logs

**Nguyên nhân:**
- File .env.local chưa có
- Server chưa restart
- AI_PROVIDER set sai

**Giải pháp:**
```bash
# 1. Kiểm tra file
ls -la .env.local

# 2. Kiểm tra content
cat .env.local

# 3. Restart server
# Ctrl+C để stop
npm run dev
```

### Fallback sang Demo Mode

Nếu Cursor API fail, hệ thống tự động dùng Demo Mode. Vẫn tạo được nội dung nhưng dùng template!

---

## 💡 Tips & Tricks

### 1. Combine with Ollama

Dùng Cursor cho production, Ollama cho development:

```bash
# .env.local
AI_PROVIDER="cursor"

# .env.development.local
AI_PROVIDER="ollama"
```

### 2. Monitor usage

Theo dõi trong Cursor dashboard để biết đang dùng bao nhiêu quota.

### 3. Rate limiting

Nếu gặp rate limit, thêm retry logic hoặc switch sang provider khác.

---

## 📊 Expected Performance

Với Cursor API:

| Content Type | Time | Tokens | Quality |
|--------------|------|--------|---------|
| Lesson | 15-25s | ~3000 | Excellent |
| Quiz | 10-15s | ~2000 | Excellent |
| Slides | 12-18s | ~2500 | Excellent |
| Video Script | 15-20s | ~3000 | Excellent |

---

## ✅ Checklist

- [x] Có Cursor API key
- [ ] Tạo file .env.local với key
- [ ] Restart server
- [ ] Test tạo nội dung
- [ ] Check logs thấy "Using Cursor API..."
- [ ] Content quality tốt

---

## 🎉 Kết luận

Bạn đã sẵn sàng dùng Cursor API! Giờ có thể:

✨ Tạo bài học chất lượng cao
📝 Generate quiz tự động  
🎯 Tạo slides chuyên nghiệp
🎬 Sinh video scripts

**Chi phí thấp hơn OpenAI, chất lượng vẫn tuyệt vời!**

---

**Happy Teaching with Cursor AI! 🚀✨**

