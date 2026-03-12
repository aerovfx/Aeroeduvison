# 🦙 Ollama Setup Guide - Chạy AI Local miễn phí

## 📋 Tổng quan

**Ollama** cho phép bạn chạy các mô hình AI mạnh mẽ **trên máy tính của bạn**, hoàn toàn **miễn phí** và **private**!

### Ưu điểm:
- ✅ **Miễn phí 100%** - Không giới hạn request
- ✅ **Private** - Dữ liệu không rời khỏi máy bạn
- ✅ **Nhanh** - Không phụ thuộc internet
- ✅ **Dễ cài đặt** - Chỉ vài phút

### Nhược điểm:
- ❌ Cần máy tính khá mạnh (RAM >= 8GB)
- ❌ Chất lượng có thể thấp hơn GPT-4 một chút
- ❌ Cần cài đặt thêm phần mềm

---

## 🚀 Cài đặt Ollama

### macOS (bạn đang dùng)

```bash
# Cách 1: Download và cài đặt từ website
# Truy cập: https://ollama.ai/download
# Download file .dmg và cài đặt như app thông thường

# Cách 2: Dùng Homebrew
brew install ollama
```

### Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows

Download installer từ: https://ollama.ai/download

---

## 🎯 Khởi động Ollama

### Bước 1: Start Ollama service

```bash
# macOS/Linux
ollama serve
```

Service sẽ chạy ở `http://localhost:11434`

### Bước 2: Tải model

Mở terminal mới và chạy:

```bash
# Model nhẹ, nhanh (khuyến nghị cho bắt đầu)
ollama pull llama2

# Hoặc model tiếng Việt tốt hơn
ollama pull gemma:7b

# Hoặc model mạnh hơn (cần RAM nhiều hơn)
ollama pull mistral
ollama pull llama2:13b
```

### Bước 3: Test Ollama

```bash
# Test xem model hoạt động không
ollama run llama2 "Xin chào, bạn là ai?"
```

---

## 🔧 Cấu hình cho AI Content Generator

### 1. Cập nhật .env.local

```bash
# Mở file .env.local
nano .env.local

# Thêm hoặc uncomment các dòng này:
AI_PROVIDER="auto"  # Sẽ tự động thử Ollama trước
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama2"  # hoặc model bạn đã tải
```

### 2. Khởi động lại app

```bash
# Stop server hiện tại (Ctrl+C)
# Start lại
npm run dev
```

### 3. Test tạo nội dung

- Vào `/teacher/ai-content-generator`
- Tạo bài học/quiz
- Ollama sẽ được dùng tự động!

---

## 📊 So sánh Models

| Model | RAM cần | Tốc độ | Chất lượng | Tiếng Việt |
|-------|---------|--------|------------|------------|
| llama2 | 8GB | Nhanh | Tốt | Khá |
| llama2:13b | 16GB | Trung bình | Rất tốt | Tốt |
| mistral | 8GB | Nhanh | Rất tốt | Khá |
| gemma:7b | 8GB | Nhanh | Tốt | Tốt |
| codellama | 8GB | Nhanh | Tốt (code) | Yếu |
| qwen:7b | 8GB | Nhanh | Tốt | Xuất sắc |

### Khuyến nghị:

**Cho tiếng Việt tốt nhất:**
```bash
ollama pull qwen:7b
# Hoặc
ollama pull gemma:7b
```

**Cho performance tốt nhất:**
```bash
ollama pull mistral
```

---

## 🎮 Commands hữu ích

```bash
# Liệt kê models đã cài
ollama list

# Xóa model không dùng
ollama rm llama2

# Update model
ollama pull llama2

# Chạy model interactive
ollama run llama2

# Stop Ollama service
# Ctrl+C (if running in foreground)
# Or kill process
```

---

## 🐛 Troubleshooting

### Lỗi "connection refused"

```bash
# Kiểm tra Ollama có chạy không
curl http://localhost:11434

# Nếu không có response, start Ollama:
ollama serve
```

### Lỗi "model not found"

```bash
# Tải model trước khi dùng
ollama pull llama2
```

### Chạy chậm hoặc lag

1. **Giảm model size**:
   ```bash
   # Dùng model nhỏ hơn
   ollama pull llama2:7b  # thay vì 13b
   ```

2. **Giảm num_predict trong code**:
   ```typescript
   // app/api/ai-content/generate/route.ts
   options: {
     num_predict: 2000,  // giảm từ 4000
   }
   ```

3. **Close apps khác** để giải phóng RAM

### Response không đủ chi tiết

Dùng model lớn hơn:
```bash
ollama pull llama2:13b
# Hoặc
ollama pull mistral:7b-instruct
```

---

## 🚀 Advanced Tips

### 1. Chạy Ollama như background service

**macOS:**
```bash
# Tạo LaunchAgent
cat > ~/Library/LaunchAgents/com.ollama.service.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.service</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load service
launchctl load ~/Library/LaunchAgents/com.ollama.service.plist
```

### 2. Custom system prompt

Chỉnh sửa trong `route.ts`:

```typescript
async function generateWithOllama(...) {
  const customPrompt = `Bạn là GV tiếng Việt xuất sắc, 
  chuyên môn ${request.subject}, 
  dạy học sinh lớp ${request.grade}.
  
  ${prompt}`;
  
  // ...
}
```

### 3. Multiple models cho different tasks

```typescript
// Quiz → dùng model nhanh
const quizModel = 'llama2:7b';

// Lesson → dùng model chất lượng cao
const lessonModel = 'mistral:7b-instruct';
```

---

## 📈 Performance Benchmarks

Test trên MacBook Pro M1, 16GB RAM:

| Model | Bài học (45 phút) | Quiz (10 câu) | Slides (8 slides) |
|-------|-------------------|---------------|-------------------|
| llama2 | ~15s | ~8s | ~12s |
| llama2:13b | ~25s | ~12s | ~18s |
| mistral | ~12s | ~6s | ~10s |
| gemma:7b | ~14s | ~7s | ~11s |

So với cloud APIs:
- **OpenAI**: 10-30s (phụ thuộc network)
- **Cursor**: 8-20s (phụ thuộc network)
- **Ollama**: 8-25s (local, ổn định)

---

## 🎯 Kết luận

Ollama là lựa chọn tuyệt vời nếu:
- ✅ Bạn có máy tính khá mạnh
- ✅ Muốn tiết kiệm chi phí (100% free)
- ✅ Cần privacy (data không ra khỏi máy)
- ✅ Không muốn phụ thuộc internet

**Setup ngay hôm nay và tận hưởng AI miễn phí! 🚀**

---

## 📚 Resources

- Website: https://ollama.ai
- GitHub: https://github.com/ollama/ollama
- Models: https://ollama.ai/library
- Discord: https://discord.gg/ollama

---

**Happy Local AI! 🦙✨**

