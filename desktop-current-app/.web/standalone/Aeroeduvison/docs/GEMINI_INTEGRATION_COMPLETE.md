# Gemini API Integration - Complete Guide

## 📋 Tổng Quan

Tài liệu này mô tả việc tích hợp **Google Gemini API** vào toàn bộ các dịch vụ AI trong hệ thống AeroEdu.

---

## ✅ Đã Hoàn Thành

### 1. Gemini Provider Enhancement

**File**: `lib/ai/providers/gemini-provider.ts`

**Cải tiến**:
- ✅ Hỗ trợ Vision API cho OCR và image analysis
- ✅ Hỗ trợ system messages (prepend to first user message)
- ✅ Cải thiện cost estimation (Flash vs Pro pricing)
- ✅ Support multiple API keys (GEMINI_API_KEY, GOOGLE_AI_API_KEY)
- ✅ Better error handling và fallback

**Methods mới**:
- `completeWithVision()` - Generate với images
- `extractTextFromImage()` - OCR từ images

### 2. Gemini Service Layer

**File**: `lib/ai/services/gemini-service.ts` (NEW)

**Tính năng**:
- ✅ Unified interface cho tất cả Gemini operations
- ✅ Text generation với system prompts
- ✅ OCR từ images
- ✅ Image analysis với prompts
- ✅ JSON generation với schema validation
- ✅ Automatic error handling và fallback

**API**:
```typescript
// Text generation
await GeminiService.generateText(prompt, options)

// OCR
await GeminiService.extractTextFromImage(imageData, mimeType, language)

// Image analysis
await GeminiService.analyzeImage(imageData, prompt, mimeType, options)

// JSON generation
await GeminiService.generateJSON<T>(prompt, options)
```

### 3. Document Digitization Integration

**Files Updated**:
- `lib/document-digitization/process-service.ts`
- `app/api/ai/analyze-document/route.ts`

**Changes**:
- ✅ Sử dụng `GeminiService.extractTextFromImage()` cho OCR
- ✅ Sử dụng `GeminiService.generateJSON()` cho document analysis
- ✅ Fallback to direct API nếu service fails
- ✅ Better error handling

---

## 🔄 Đang Tiến Hành

### 4. Lesson Generation Integration

**File**: `app/api/ai-generate-lesson/route.ts`

**Status**: ⏳ Cần cập nhật để sử dụng GeminiService

**Current**: Direct API calls
**Target**: Use GeminiService với orchestrator

### 5. AI Tutor Integration

**File**: `app/api/ai-tutor-chat/route.ts`

**Status**: ⏳ Cần thêm Gemini support

**Current**: GPT-4 và Grok only
**Target**: Add Gemini as option/fallback

### 6. Question Bank Generation

**File**: `lib/ai/services/question-bank-manager.ts`

**Status**: ⏳ Cần tích hợp Gemini

**Target**: Use GeminiService cho question generation

### 7. Content Generation Services

**File**: `lib/ai/services/content-generator.ts`

**Status**: ⏳ Cần tích hợp Gemini

**Target**: Use orchestrator với Gemini priority

### 8. Exam Generation từ Matrix

**File**: `lib/exam-matrix/exam-generator.ts`

**Status**: ⏳ Cần tích hợp Gemini

**Target**: Use GeminiService cho missing question generation

### 9. Grading Services

**Files**: 
- `app/api/llm-grading/route.ts`
- `lib/ai/services/smart-grading.ts`

**Status**: ⏳ Cần tích hợp Gemini

**Target**: Use GeminiService cho grading

---

## 📝 Migration Guide

### Step 1: Replace Direct API Calls

**Before**:
```typescript
const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
const result = await model.generateContent([...])
```

**After**:
```typescript
import { GeminiService } from '@/lib/ai/services/gemini-service'

const text = await GeminiService.generateText(prompt, {
  systemPrompt: 'You are...',
  temperature: 0.7,
})
```

### Step 2: Use Orchestrator for Multi-Provider

**Before**:
```typescript
// Try OpenAI, then Gemini, then fallback
if (OPENAI_API_KEY) {
  result = await openaiCall()
} else if (GEMINI_API_KEY) {
  result = await geminiCall()
}
```

**After**:
```typescript
import { AIServiceOrchestrator } from '@/lib/ai/ai-service-orchestrator'

const orchestrator = new AIServiceOrchestrator({
  preferredProvider: 'gemini',
  fallbackEnabled: true,
})

const response = await orchestrator.complete({
  messages: [{ role: 'user', content: prompt }],
  options: { model: 'gemini-2.0-flash-exp' },
})
```

### Step 3: OCR Integration

**Before**:
```typescript
const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
const result = await model.generateContent([
  { inlineData: { mimeType, data: base64 } },
  { text: 'Extract text...' }
])
```

**After**:
```typescript
import { GeminiService } from '@/lib/ai/services/gemini-service'

const text = await GeminiService.extractTextFromImage(
  base64Image,
  'image/jpeg',
  'vi'
)
```

---

## 🎯 Best Practices

### 1. Always Use GeminiService

✅ **DO**:
```typescript
import { GeminiService } from '@/lib/ai/services/gemini-service'
const result = await GeminiService.generateText(prompt)
```

❌ **DON'T**:
```typescript
const genAI = new GoogleGenerativeAI(apiKey)
// Direct API calls bypass caching, rate limiting, etc.
```

### 2. Use Orchestrator for Multi-Provider

✅ **DO**:
```typescript
const orchestrator = new AIServiceOrchestrator({
  preferredProvider: 'gemini',
  fallbackEnabled: true,
})
```

❌ **DON'T**:
```typescript
// Manual fallback logic
if (geminiFails) {
  tryOpenAI()
}
```

### 3. Handle Errors Gracefully

✅ **DO**:
```typescript
try {
  const result = await GeminiService.generateText(prompt)
} catch (error) {
  // Fallback or error handling
  console.error('Gemini failed:', error)
  return fallbackResponse()
}
```

### 4. Use Appropriate Models

- **Text Generation**: `gemini-2.0-flash-exp` (fast, cheap)
- **Complex Analysis**: `gemini-2.5-pro` (better quality)
- **Vision/OCR**: `gemini-2.0-flash-exp` (supports vision)

---

## 🔧 Configuration

### Environment Variables

```bash
# Primary API key
GEMINI_API_KEY=your-api-key

# Alternative (fallback)
GOOGLE_AI_API_KEY=your-api-key

# Model selection
GEMINI_DEFAULT_MODEL=gemini-2.0-flash-exp
GEMINI_VISION_MODEL=gemini-2.0-flash-exp
```

### Model Selection

| Model | Use Case | Cost | Speed |
|-------|----------|------|-------|
| `gemini-2.0-flash-exp` | General purpose, OCR | Low | Fast |
| `gemini-2.5-flash` | Balanced | Medium | Medium |
| `gemini-2.5-pro` | Complex tasks | High | Slow |

---

## 📊 Integration Status

| Service | Status | Priority | Notes |
|---------|--------|----------|-------|
| Document Digitization | ✅ Complete | High | OCR + Analysis |
| Lesson Generation | ⏳ In Progress | High | Need orchestrator |
| AI Tutor | ⏳ Pending | Medium | Add as option |
| Question Bank | ⏳ Pending | High | Generation |
| Content Generation | ⏳ Pending | Medium | Use orchestrator |
| Exam Generation | ⏳ Pending | Medium | Missing questions |
| Grading | ⏳ Pending | High | Smart grading |

---

## 🚀 Next Steps

1. ✅ Complete Document Digitization integration
2. ⏳ Update Lesson Generation to use orchestrator
3. ⏳ Add Gemini to AI Tutor
4. ⏳ Integrate Question Bank generation
5. ⏳ Update Content Generation services
6. ⏳ Add Gemini to Exam Generation
7. ⏳ Integrate Grading services

---

**Last Updated**: January 2025  
**Status**: 🟡 In Progress (30% Complete)  
**Next Review**: After Lesson Generation integration
