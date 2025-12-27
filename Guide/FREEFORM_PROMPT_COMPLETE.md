# Freeform Prompt Input - Complete Implementation

## ✅ Hoàn thành tích hợp Freeform Prompt

### 1. Tính năng mới
- ✅ Chế độ nhập liệu linh hoạt: **Prompt tự do** hoặc **Form có sẵn**
- ✅ Text area lớn (12 rows) cho prompt chi tiết
- ✅ Placeholder với ví dụ cụ thể về quan hệ khối lượng và gia tốc
- ✅ Hỗ trợ cả backend API và streaming API
- ✅ Tự động phát hiện loại nội dung (quiz, lesson, slides, video)

### 2. Cách sử dụng

#### Bước 1: Chọn chế độ nhập liệu
Truy cập: `http://localhost:3000/teacher/ai-content-generator`

Chọn một trong hai chế độ:
- **✍️ Prompt tự do**: Linh hoạt, chi tiết - nhập prompt bất kỳ
- **📋 Form có sẵn**: Nhanh, đơn giản - điền các trường có sẵn

#### Bước 2: Nhập nội dung (Chế độ Prompt tự do)
Ví dụ prompt:
```
Tạo bài quiz về quan hệ giữa khối lượng và gia tốc

Khối lượng (m) và gia tốc (a) là hai đại lượng cơ bản trong vật lý, 
và chúng có quan hệ mật thiết với nhau.

**Quan hệ giữa khối lượng và gia tốc**

Khi một vật bị tác động bởi lực F, nó sẽ thay đổi tốc độ theo tỷ lệ 
với lực. Quan hệ chính xác giữa khối lượng và gia tốc được mô tả bởi 
Định luật II Newton:

F = ma

Trong đó:
- F là lực tác động (N)
- m là khối lượng (kg)
- a là gia tốc (m/s²)

Hãy tạo 5 câu hỏi trắc nghiệm về chủ đề này cho học sinh lớp 10.
```

#### Bước 3: Chọn AI Model
- **⚡ Cursor AI** (Mặc định - Nhanh, miễn phí)
- **🏠 Ollama** (llama3.2:latest - Local AI)
- **🧠 OpenAI GPT-4** (Chất lượng cao)
- **🤖 Auto** (Tự động chọn tốt nhất)
- **🎭 Demo Mode** (Mẫu có sẵn)

#### Bước 4: Tạo nội dung
Click **"Tạo nội dung với AI"** và chờ kết quả real-time.

### 3. Ưu điểm của Freeform Prompt

#### So với Form có sẵn:
- 🆓 **Không giới hạn** bởi các trường cố định
- 📝 **Chi tiết hơn**: Nhập đầy đủ lý thuyết, công thức, ví dụ
- 🎯 **Chính xác hơn**: AI hiểu rõ yêu cầu cụ thể
- 💡 **Sáng tạo hơn**: Tự do mô tả theo ý tưởng riêng
- 🚀 **Nhanh hơn**: Không cần điền nhiều trường

#### Ví dụ so sánh:

**Form có sẵn:**
- Môn học: Vật lý
- Lớp: 10
- Chủ đề: Định luật Newton
- Độ khó: Trung bình

**Freeform Prompt:**
```
Tạo bài quiz về Định luật II Newton (F=ma) với 5 câu hỏi:
1. Khái niệm cơ bản về F=ma
2. Ví dụ tính toán với F=10N, m=2kg, tìm a
3. Ứng dụng trong xe ô tô phanh gấp
4. So sánh lực cần thiết với khối lượng khác nhau
5. Phân tích tình huống thực tế

Yêu cầu: Câu hỏi cụ thể, đáp án sai hợp lý, giải thích chi tiết.
```

### 4. Cấu trúc Code

#### Frontend (`/teacher/ai-content-generator/page.tsx`):
```typescript
const [inputMode, setInputMode] = useState<'structured' | 'freeform'>('freeform');
const [formData, setFormData] = useState({
  freeformPrompt: '',
  // ... other fields
});

// Toggle between modes
<button onClick={() => setInputMode('freeform')}>Prompt tự do</button>
<button onClick={() => setInputMode('structured')}>Form có sẵn</button>

// Freeform textarea
{inputMode === 'freeform' && (
  <textarea
    name="freeformPrompt"
    rows={12}
    placeholder="VD: Tạo bài quiz về..."
  />
)}
```

#### Backend API (`/api/ai-content/generate/route.ts`):
```typescript
interface GenerateContentRequest {
  freeformPrompt?: string; // New field
  // ... other fields
}

function createPrompt(request: GenerateContentRequest): string {
  // Prioritize freeform prompt
  if (request.freeformPrompt && request.freeformPrompt.trim().length > 0) {
    return `Bạn là chuyên gia giáo dục Việt Nam. Hãy tạo nội dung dựa trên:
${request.freeformPrompt}`;
  }
  // Fallback to structured prompt
  return basePrompt;
}
```

#### Streaming API (`/api/ai-content/generate-stream/route.ts`):
```typescript
if (freeformPrompt) {
  generatedContent = await generateFromFreeformPrompt(freeformPrompt, aiModel);
} else {
  // Use structured generation
}

async function generateFromFreeformPrompt(prompt: string, aiModel: string) {
  // Auto-detect type from keywords
  // Generate appropriate content
  return generatedContent;
}
```

### 5. Tự động phát hiện loại nội dung

AI sẽ tự động phát hiện loại nội dung từ prompt:
- Nếu chứa: `quiz`, `câu hỏi`, `trắc nghiệm` → **Quiz**
- Nếu chứa: `slide` → **Slides**
- Nếu chứa: `video` → **Video Script**
- Mặc định: **Lesson**

### 6. Tips cho Freeform Prompt tốt

1. **Rõ ràng**: Nêu rõ loại nội dung cần tạo (quiz, bài học, slides)
2. **Chi tiết**: Cung cấp lý thuyết, công thức, ví dụ cụ thể
3. **Cấu trúc**: Sử dụng markdown, bullet points để dễ đọc
4. **Yêu cầu**: Nêu rõ số lượng (5 câu hỏi, 3 slides, etc.)
5. **Ngữ cảnh**: Chỉ rõ đối tượng (lớp 10, trình độ cơ bản, etc.)

### 7. Ví dụ prompt hay

#### Quiz về Toán học:
```
Tạo quiz về Phương trình bậc hai cho lớp 10

Nội dung: ax² + bx + c = 0 (a ≠ 0)
- Công thức nghiệm: x = [-b ± √(b²-4ac)] / 2a
- Δ = b² - 4ac (biệt thức)
- Δ > 0: 2 nghiệm phân biệt
- Δ = 0: nghiệm kép
- Δ < 0: vô nghiệm

Tạo 5 câu hỏi:
1. Công thức tổng quát
2. Tính Δ với ví dụ cụ thể
3. Giải phương trình x² - 5x + 6 = 0
4. Điều kiện có nghiệm kép
5. Ứng dụng thực tế
```

#### Bài học về Vật lý:
```
Tạo bài học về Định luật I Newton (Định luật quán tính)

Nội dung chính:
- Phát biểu: Vật sẽ giữ nguyên trạng thái đứng yên hoặc chuyển 
  động thẳng đều nếu không có lực tác dụng
- Khái niệm quán tính
- Ví dụ: Hành khách ngã về phía trước khi xe phanh gấp

Yêu cầu:
- Giải thích chi tiết, dễ hiểu
- 3 ví dụ thực tế
- 2 bài tập vận dụng
- Sơ đồ minh họa
```

## 🎉 Hoàn thành!

Freeform Prompt đã được tích hợp hoàn toàn và sẵn sàng sử dụng. 
Bạn có thể tạo nội dung AI với sự linh hoạt tối đa, không còn bị 
giới hạn bởi các trường form cố định!
