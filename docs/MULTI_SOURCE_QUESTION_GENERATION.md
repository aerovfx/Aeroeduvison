# 📚 Multi-Source Question Generation

## 🎉 Tính Năng Mới

Sinh câu hỏi tự động từ **nhiều nguồn dữ liệu** khác nhau!

---

## 📦 Supported Sources

| Source | Status | Description |
|--------|--------|-------------|
| **YouTube** | ✅ Ready | Extract transcript from videos |
| **Website** | ✅ Ready | Scrape content from URLs |
| **Text** | ✅ Ready | Direct text input |
| **PDF** | ⏳ Soon | Extract text from PDF files |
| **DOC/DOCX** | ⏳ Soon | Extract text from Word documents |
| **Image** | ⏳ Soon | OCR text from images |

---

## 🚀 Cách Sử Dụng

### 1. Truy cập
```
/teacher/question-bank → Click "Sinh hàng loạt"
```

### 2. Chọn nguồn
- **YouTube**: Dán link video
- **Website**: Dán URL trang web
- **Văn bản**: Dán nội dung trực tiếp

### 3. Trích xuất
- Click "Trích xuất"
- Chờ xử lý
- Xem trước nội dung

### 4. Sinh câu hỏi
- Chọn môn học, khối lớp
- Click "Sinh câu hỏi"
- AI tạo câu hỏi từ nội dung

---

## 💡 Use Cases

### Giáo viên
```
1. Tìm video bài giảng trên YouTube
2. Extract transcript
3. Generate 30 câu hỏi trắc nghiệm
4. Lưu vào ngân hàng đề
```

### Tự động hóa
```
1. Scraping educational websites
2. Extract lesson content
3. Generate questions automatically
4. Organize by subject/grade
```

---

## 🔧 Technical Architecture

### Content Extractor
```typescript
import { contentExtractor } from '@/lib/agents/extractors/content-extractor'

// Extract from YouTube
const youtube = await contentExtractor.extract(
  'https://youtube.com/watch?v=...',
  'youtube'
)

// Extract from Website
const website = await contentExtractor.extract(
  'https://example.com/lesson',
  'website'
)

// Extract from Text
const text = await contentExtractor.extract(
  'Nội dung bài học...',
  'text'
)
```

### API Endpoints
```
POST /api/extract/youtube
{ "videoId": "..." }
→ { transcript, title, duration }

POST /api/extract/website
{ "url": "..." }
→ { title, content }

POST /api/extract/pdf
{ "filePath": "..." }
→ { title, content, pages }

POST /api/extract/doc
{ "filePath": "..." }
→ { title, content }
```

---

## 📊 Example Flow

### YouTube Example
```
Input: https://youtube.com/watch?v=dQw4w9WgXcQ
  ↓
Extract Video ID: dQw4w9WgXcQ
  ↓
Fetch Transcript
  ↓
Content: "Welcome to this lesson about..."
  ↓
Generate Questions
  ↓
Output: 30 questions about the topic
```

### Website Example
```
Input: https://vi.wikipedia.org/Phân_số
  ↓
Scrape Content
  ↓
Content: "Phân số là một số hữu tỉ..."
  ↓
Generate Questions
  ↓
Output: 20 questions about fractions
```

---

## 🎯 Features

### Multi-Source Support
- ✅ Combine multiple sources
- ✅ Batch extraction
- ✅ Content deduplication

### Smart Processing
- ✅ Auto-detect content type
- ✅ Language detection
- ✅ Topic extraction

### Question Generation
- ✅ AI-powered questions
- ✅ Multiple question types
- ✅ Difficulty adjustment

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `lib/agents/extractors/content-extractor.ts` | Core extractor |
| `app/api/extract/youtube/route.ts` | YouTube API |
| `app/api/extract/website/route.ts` | Website API |
| `components/question-bank/bulk-generate-modal.tsx` | Updated UI |

---

## 🔮 Coming Soon

### PDF Support
```typescript
// Upload PDF file
const pdf = await contentExtractor.extract('/path/to/file.pdf', 'pdf')
// Extract text from all pages
// Generate questions from content
```

### DOC/DOCX Support
```typescript
// Upload Word document
const doc = await contentExtractor.extract('/path/to/file.docx', 'docx')
// Extract formatted text
// Generate questions
```

### Image OCR
```typescript
// Upload image
const image = await contentExtractor.extract('/path/to/image.png', 'image')
// OCR text extraction
// Generate questions from text
```

---

## 🎊 Benefits

| Benefit | Impact |
|---------|--------|
| **Time Saving** | 90% less manual work |
| **Content Variety** | Multiple sources = diverse questions |
| **Automation** | Fully automated pipeline |
| **Scalability** | Generate 100s of questions quickly |

---

**🚀 Multi-Source Question Generation is here!**

**Sinh câu hỏi từ YouTube, Website, và hơn thế nữa!** 🎉
