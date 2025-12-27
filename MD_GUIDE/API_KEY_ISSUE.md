# ⚠️ API Key Issue - Models Not Found

## 🐛 Vấn đề

Tất cả Gemini models đều trả về **404 Not Found**:
```
models/gemini-pro is not found for API version v1beta
```

## 🔍 Nguyên nhân có thể

API key `AIzaSyApz38IGfS6_LqsFyD2L-3DPQUAOvrOVoI` có thể:

1. ❌ **Đã hết hạn**
2. ❌ **Không có quyền truy cập Gemini models**
3. ❌ **Chưa được kích hoạt đầy đủ**
4. ❌ **API key không hợp lệ**

## ✅ Cách kiểm tra & sửa

### Bước 1: Truy cập Google AI Studio
```
https://aistudio.google.com/
```

### Bước 2: Tạo API Key mới

1. Click **"Get API key"**
2. Chọn **"Create API key in new project"**
3. Copy API key mới

### Bước 3: Update `.env.local`

```bash
# Thay thế API key cũ bằng key mới
GEMINI_API_KEY=<YOUR_NEW_API_KEY_HERE>
```

### Bước 4: Restart server

```bash
# Kill server hiện tại
lsof -ti:3000 | xargs kill -9

# Restart
npm run dev
```

## 🔧 Test API Key trực tiếp

```bash
# Test với curl
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

**Kết quả mong đợi:**
```json
{
  "models": [
    {
      "name": "models/gemini-pro",
      ...
    }
  ]
}
```

**Nếu lỗi:**
```json
{
  "error": {
    "code": 400,
    "message": "API key not valid"
  }
}
```
→ API key không hợp lệ, cần tạo mới!

## 📝 Lưu ý

- Free tier của Google AI Studio có **quota giới hạn**
- Cần **verify email** và **accept terms** trước khi dùng
- Một số models yêu cầu **billing account**

## 🚀 Alternative: Dùng API key khác

Nếu không muốn tạo key mới, có thể dùng:
1. **OpenAI GPT-4** (cần API key khác)
2. **Claude** (cần API key khác) 
3. **Llama 3** (chạy local, không cần key)

---

**Khuyến nghị:** Tạo API key mới tại Google AI Studio và update vào `.env.local`

