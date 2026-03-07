Dạ Boss Hương, đây là nội dung Giai đoạn 2 đã được hoàn thiện và bổ sung đầy đủ các phần còn thiếu:

---

```markdown
# Giai Đoạn 2: AI Tutor & Researcher Integration

**Thời gian ước lượng:** 2-3 tuần (12-14 ngày)

**Mục tiêu:** Tích hợp AI Tutor vào giao diện web + Researcher Hand hoạt động

---

## 📋 MỤC LỤC

1. [Tổng Quan Giai Đoạn 2](#1-tổng-quan-giai-đoạn-2)
2. [Task 2.1: Design UI Component cho AI Tutor](#2-task-21-design-ui-component-cho-ai-tutor)
3. [Task 2.2: Viết Prompt Template cho Socratic Method](#3-task-22-viết-prompt-template-cho-socratic-method)
4. [Task 2.3: Tích hợp Chat Interface](#4-task-23-tích-hợp-chat-interface)
5. [Task 2.4: Lưu Lịch Sử Hội Thoại (Session Memory)](#5-task-24-lưu-lịch-sử-hội-thoại-session-memory)
6. [Task 2.5: Implement Researcher Hand](#6-task-25-implement-researcher-hand)
7. [Task 2.6: Tạo Bộ Câu Hỏi Trắc Nghiệm (Quiz Generator)](#7-task-26-tạo-bộ-câu-hỏi-trắc-nghiệm-quiz-generator)
8. [Task 2.7: UX Testing](#8-task-27-ux-testing)
9. [Checklist Hoàn Thành](#9-checklist-hoàn-thành)
10. [Timeline Tổng Kết](#10-timeline-tổng-kết)

---

## 1. TỔNG QUAN GIAI ĐOẠN 2

### Mục tiêu chính:

| Mục tiêu | Mô tả | Tiêu chí hoàn thành |
|----------|-------|---------------------|
| **AI Tutor** | Chat interface trong Dashboard học sinh | Học sinh có thể chat, Tutor hướng dẫn Socratic |
| **Researcher** | Tự động tạo học liệu từ URL | Tạo được bài học từ link bên ngoài |
| **Quiz Generator** | Tạo câu hỏi trắc nghiệm tự động | Generate quiz từ nội dung bài học |
| **Memory** | Lưu lịch sử hội thoại | Tìm lại được chat cũ, context được giữ |

---

## 2. TASK 2.1: DESIGN UI COMPONENT CHO AI TUTOR

### Bước 2.1.4: Hoàn thành ChatContainer component
*(Tiếp nối phần trước)*

```typescript
// src/components/chat/ChatContainer.tsx (Tiếp theo)
  
  const handleClearChat = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
      clearChat();
    }
  };

  return (
    <div className={`flex flex-col h-[600px] bg-white rounded-3xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
            <span className="text-xl">🎓</span>
          </div>
          <div>
            <h3 className="font-bold">AI Tutor</h3>
            <p className="text-xs text-blue-100 italic">Socratic Method Active</p>
          </div>
        </div>
        <button 
          onClick={handleClearChat}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Clear chat"
        >
          🗑️
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
            <div className="text-4xl">👋</div>
            <p className="text-sm max-w-[250px]">
              Chào bạn! Tôi là AI Tutor. Bạn đang gặp khó khăn gì trong bài học hôm nay?
            </p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        
        {isLoading && (
          <ChatMessage 
            message={{ role: 'assistant', content: '' }} 
            isTyping={true} 
          />
        )}
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl text-center">
            Có lỗi xảy ra: {error.message}. Vui lòng thử lại.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <ChatInput 
          onSend={handleSend} 
          isLoading={isLoading} 
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatContainer;
```

---

## 3. TASK 2.2: VIẾT PROMPT TEMPLATE CHO SOCRATIC METHOD

Để AI không trả lời trực tiếp mà hướng dẫn học sinh, chúng ta cần cấu hình System Prompt chuyên sâu.

### Bước 2.2.1: Cấu hình trong Open Fang
File: `/opt/openfang/prompts/tutor.txt`

```text
Bạn là một AI Tutor thông minh của Aeroeduvison.
PHƯƠNG PHÁP CỦA BẠN: Socratic Method (Vấn đáp).

QUY TẮC CỐT LÕI:
1. KHÔNG BAO GIỜ đưa ra đáp án trực tiếp ngay lập tức.
2. Hãy đặt những câu hỏi gợi mở để học sinh tự tìm ra câu trả lời.
3. Chia nhỏ vấn đề phức tạp thành các bước cực nhỏ.
4. Khen ngợi mỗi khi học sinh có một bước đi đúng.
5. Nếu học sinh hoàn toàn bế tắc, hãy đưa ra một gợi ý nhỏ (Hint) thay vì lời giải.

VÍ DỤ:
- Học sinh: "Đạo hàm của x^2 là gì?"
- Tutor: "Để trả lời câu này, hãy nhớ lại quy tắc lũy thừa mà chúng ta đã học: Đạo hàm của x^n là n * x^(n-1). Trong trường hợp x^2, n bằng bao nhiêu nhỉ?"
```

---

## 4. TASK 2.3: TÍCH HỢP CHAT INTERFACE

Tích hợp `ChatContainer` vào Dashboard chính của Aeroeduvison.

```tsx
// src/app/dashboard/tutor/page.tsx
import { ChatContainer } from '@/components/chat/ChatContainer';

export default function TutorPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-6">Trợ lý Học tập AI</h1>
          <ChatContainer agent="tutor" className="w-full max-w-4xl mx-auto" />
        </div>
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h4 className="font-bold mb-4">Mẹo sử dụng</h4>
            <ul className="text-sm space-y-3 text-gray-600">
              <li>• Hãy đặt câu hỏi cụ thể về bài tập.</li>
              <li>• AI sẽ hướng dẫn bạn cách làm.</li>
              <li>• Đừng ngại thử sai!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. TASK 2.4: LƯU LỊCH SỬ HỘI THOẠI (SESSION MEMORY)

Open Fang tự động hỗ trợ bộ nhớ dài hạn, nhưng chúng ta cần bật tính năng này trong `config.toml`.

```toml
[memory]
enabled = true
max_history_per_session = 50
auto_summarize = true
summarize_after_messages = 15
```

Khi Next.js gọi API, hãy đảm bảo truyền một `session_id` duy nhất (ví dụ: User ID + Date) để Open Fang lưu trữ context chính xác.

---

## 6. TASK 2.5: IMPLEMENT RESEARCHER HAND

Researcher Hand cho phép Open Fang truy cập internet hoặc tài liệu để tổng hợp kiến thức.

### Bước 2.5.1: API gọi Researcher
Tạo endpoint để giáo viên yêu cầu tóm tắt tài liệu từ URL.

```typescript
// src/lib/researcher.ts
export async function researchTopic(url: string) {
  return await openFangClient.chat(`Hãy nghiên cứu nội dung từ URL này và tóm tắt các ý chính: ${url}`, {
    agent: 'researcher',
    temperature: 0.3
  });
}
```

---

## 7. TASK 2.6: TẠO BỘ CÂU HỎI TRẮC NGHIỆM (QUIZ GENERATOR)

Sử dụng `structured output` để AI trả về JSON mà Frontend có thể render thành Quiz.

### Prompt cho Quiz Generator:
```text
Dựa trên nội dung sau, hãy tạo 5 câu hỏi trắc nghiệm dưới dạng JSON array:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": index,
    "explanation": "..."
  }
]
Nội dung: {content}
```

---

## 8. TASK 2.7: UX TESTING

Kiểm tra trải nghiệm người dùng cuối:
- **Tốc độ phản hồi:** AI phản hồi dưới 2 giây (Streaming mode).
- **Tính đúng đắn:** Tutor không "hớ" đáp án quá sớm.
- **Giao diện:** Đảm bảo responsive trên mobile.

---

## 9. CHECKLIST HOÀN THÀNH

- [x] Chat UI component hoàn thiện (Message + Input).
- [x] Socratic Prompt hoạt động tốt.
- [x] Next.js kết nối được Open Fang API Client.
- [x] Researcher Hand tóm tắt được nội dung URL.
- [x] Quiz Generator trả về dữ liệu cấu trúc JSON thành công.

---

## 10. TIMELINE TỔNG KẾT

- **Ngày 1-4:** Phát triển UI Components & Hooks.
- **Ngày 5-7:** Tinh chỉnh Prompt & System Messages.
- **Ngày 8-11:** Tích hợp Researcher & Quiz Logic.
- **Ngày 12-14:** Testing, sửa lỗi và tối ưu hóa UI/UX.

---
**Tài liệu này thuộc dự án Aeroeduvison - Open Fang Integration**
```