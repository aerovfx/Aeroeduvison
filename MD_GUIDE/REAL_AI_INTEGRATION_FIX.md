# Fix Real AI Integration - Gọi Ollama/Cursor thực

## ❌ Vấn đề

Khi dùng Freeform Prompt, app chỉ trả về câu hỏi demo generic, không gọi AI thực.

**Câu hỏi demo (sai):**
- "Câu 1: Dựa trên nội dung... hãy xác định khái niệm chính?"
- "Câu 2: Ứng dụng thực tế của kiến thức này là gì?"
- Tất cả đáp án đều là A
- Không liên quan đến chủ đề "Chuyển động thẳng biến đổi đều"

**Câu hỏi từ Ollama trực tiếp (đúng):**
- "Một vật di chuyển trên đường thẳng với vận tốc ban đầu là 5 m/s..."
- "Sau đó, gia tốc của vật tăng lên và đạt giá trị là 0,8 m/s^2..."
- Tính toán cụ thể, liên quan đến chủ đề

## ✅ Giải pháp

### 1. Tạo function `generateWithRealAI()`

Thay vì gọi `generateFromFreeformPrompt()` (demo), giờ gọi `generateWithRealAI()`:

```typescript
if (freeformPrompt) {
  // CŨ - chỉ demo
  generatedContent = await generateFromFreeformPrompt(freeformPrompt, aiModel);
  
  // MỚI - gọi AI thực
  generatedContent = await generateWithRealAI(freeformPrompt, aiModel, { type, subject, grade, topic });
}
```

### 2. Flow mới

```
Freeform Prompt Input
  ↓
generateWithRealAI(prompt, aiModel, context)
  ↓
Try Ollama (if aiModel === 'ollama' || 'auto')
  → POST http://localhost:11434/api/generate
  → Parse JSON response
  → Return quiz with real questions
  ↓ (if failed)
Try Cursor API (if aiModel === 'cursor' || 'auto')
  → POST https://api.cursor.sh/v1/chat/completions
  → Parse JSON response
  → Return quiz with real questions
  ↓ (if failed)
Fallback to Demo Mode
  → generateFromFreeformPrompt() (generic questions)
```

### 3. Ollama Integration

```typescript
const response = await fetch(`${ollamaUrl}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.2:latest',
    prompt: `${userPrompt}\n\nTrả về JSON format:\n{"title": "...", "questions": [...]}`,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 3000,
    }
  }),
});

const data = await response.json();
const aiResponse = data.response;

// Parse JSON from Ollama response
const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
const parsed = JSON.parse(jsonMatch[0]);

return {
  title: parsed.title,
  quiz: { questions: parsed.questions }
};
```

### 4. Cursor Integration

```typescript
const response = await fetch('https://api.cursor.sh/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${cursorApiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'Bạn là chuyên gia giáo dục...' },
      { role: 'user', content: `${prompt}\n\nTrả về JSON...` }
    ],
  }),
});

const data = await response.json();
const aiResponse = data.choices[0].message.content;
```

## 🧪 Test

### Test Ollama trực tiếp:
```bash
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:latest",
    "prompt": "Tạo quiz về Chuyển động thẳng biến đổi đều...",
    "stream": false
  }'
```

### Kết quả mong đợi:
- ✅ Câu hỏi cụ thể về chủ đề
- ✅ Tính toán với số liệu thực
- ✅ Công thức vật lý đúng
- ✅ Giải thích chi tiết

## 🚀 Sử dụng

1. Truy cập: http://localhost:3000/dashboard/ai-content-generator
2. Chọn "✍️ Prompt tự do"
3. Chọn AI Model: **"🏠 Ollama"** (hoặc Cursor)
4. Nhập prompt chi tiết
5. Click "Tạo nội dung với AI"
6. Xem câu hỏi THẬT từ AI (không phải demo)

## 📊 Logging

Console sẽ hiển thị:
```
🤖 [REAL-AI] Generating with model: ollama
🏠 [OLLAMA] Attempting to generate with Ollama...
✅ [OLLAMA] Generation successful
```

Hoặc nếu fail:
```
🏠 [OLLAMA] Failed: connection error
⚡ [CURSOR] Attempting to generate with Cursor...
```

## ✅ Hoàn tất!

Giờ freeform prompt sẽ gọi AI THỰC (Ollama/Cursor) thay vì trả về demo generic!
