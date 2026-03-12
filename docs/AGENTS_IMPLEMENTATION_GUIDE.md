# Hướng Dẫn Triển Khai Agents

## ✅ Đã Hoàn Thành

### 1. Agent Core Infrastructure

**Files đã tạo:**
- `/lib/agents/types.ts` - Types và interfaces
- `/lib/agents/registry.ts` - Registry 16 Agents
- `/lib/agents/agent-loop.ts` - Agent Loop core
- `/lib/agents/index.ts` - Exports

**16 Agents đã đăng ký:**

#### Student Agents (5)
- ✅ `study-planner` - Trợ lý học tập
- ✅ `ai-tutor` - Gia sư AI (ĐÃ CÓ UI)
- ✅ `progress-tracker` - Theo dõi tiến độ
- ✅ `exam-prep` - Ôn thi
- ✅ `career-advisor` - Tư vấn hướng nghiệp

#### Teacher Agents (7)
- ✅ `content-generator` - Soạn giáo án
- ✅ `auto-grading` - Chấm bài tự động
- ✅ `exam-matrix` - Ma trận đề thi (ĐÃ CÓ)
- ✅ `student-insight` - Phân tích học sinh
- ✅ `schedule-planner` - Xếp thời khóa biểu
- ✅ `feedback-generator` - Nhận xét học bạ
- ✅ `education-research` - Nghiên cứu giáo dục

#### Admin Agents (4)
- ✅ `system-monitor` - Giám sát hệ thống
- ✅ `analytics-report` - Báo cáo thống kê
- ✅ `compliance-checker` - Kiểm tra compliance
- ✅ `resource-optimizer` - Tối ưu tài nguyên

### 2. AI Tutor Agent - Hoàn Chỉnh

**URL:** `/student/ai-tutor`

**Features:**
- ✅ Chat interface với Bot
- ✅ Chọn môn học (Toán, Lý, Hóa, Sinh, Văn, Anh)
- ✅ System prompt tối ưu cho gia sư
- ✅ Lịch sử chat trong session
- ✅ Gợi ý câu hỏi nhanh
- ✅ Loading states
- ✅ Responsive design

**API:**
- ✅ `/api/agents/llm` - LLM Gateway
- ✅ Authentication với next-auth
- ✅ OpenAI integration
- ✅ Token usage tracking

---

## 🚀 Cách Sử Dụng

### Cho Học Sinh

1. **Truy cập AI Tutor:**
   ```
   http://localhost:3100/student/ai-tutor
   ```

2. **Chọn môn học** từ dropdown
3. **Nhập câu hỏi** hoặc click vào gợi ý
4. **Chat với AI** để được giải thích

### Cho Developers

**Tạo Agent mới:**

```typescript
import { AgentLoop } from '@/lib/agents'

const agent = new AgentLoop({
  model: 'gpt-4o-mini',
  temperature: 0.7,
})

// Register tools
agent.registerTool('calculator', (params) => {
  return params.a + params.b
})

// Run agent
const result = await agent.run(
  'Bạn là trợ lý toán học...',
  'Tính 2 + 2',
  { userId: 'student-123' }
)

console.log(result.response)
```

**Thêm Agent vào Registry:**

```typescript
// lib/agents/registry.ts
export const AGENT_REGISTRY = {
  // ...existing agents
  'my-new-agent': {
    id: 'my-new-agent',
    name: 'My Agent',
    displayName: 'Agent Của Tôi',
    description: 'Mô tả agent',
    role: 'student',
    mode: 'interactive',
    capabilities: ['read:data', 'write:results'],
    tools: ['tool1', 'tool2'],
    enabled: true,
  }
}
```

---

## 📋 Next Steps

### Phase 2: Progress Tracker Agent (Ưu tiên cao)

**Cần tạo:**
1. API `/api/agents/progress-tracker`
2. Dashboard component hiển thị metrics
3. Risk detection algorithm
4. Alert system

**Files:**
- `/lib/agents/progress-tracker.ts`
- `/app/api/agents/progress-tracker/route.ts`
- `/components/agents/progress-dashboard.tsx`

### Phase 3: Auto Grading Agent

**Cần tạo:**
1. API `/api/agents/auto-grading`
2. MCQ grader (exact match)
3. Essay grader (LLM rubric)
4. Feedback generator

**Files:**
- `/lib/agents/auto-grading.ts`
- `/app/api/agents/auto-grading/route.ts`
- `/components/agents/grading-interface.tsx`

### Phase 4: Study Planner Agent

**Cần tạo:**
1. API `/api/agents/study-planner`
2. Calendar integration
3. Goal tracking
4. Reminder system

**Files:**
- `/lib/agents/study-planner.ts`
- `/app/api/agents/study-planner/route.ts`
- `/components/agents/study-plan-calendar.tsx`

### Phase 5: Admin Dashboard

**Cần tạo:**
1. Agent monitoring dashboard
2. Usage analytics
3. Cost tracking
4. Performance metrics

**Files:**
- `/app/(dashboard)/(routes)/admin/agents/page.tsx`
- `/components/agents/admin-dashboard.tsx`
- `/app/api/agents/analytics/route.ts`

---

## 🔧 Architecture

### Agent Loop Flow

```
User Input
    ↓
AgentLoop.run(systemPrompt, userMessage)
    ↓
Build Prompt (system + history)
    ↓
Call LLM (/api/agents/llm)
    ↓
Parse Response
    ↓
Extract Tool Calls?
    ├─ Yes → Execute Tools → Continue Loop
    └─ No → Return Response
```

### LLM Gateway

```
Client → /api/agents/llm
    ↓
Auth Check (next-auth)
    ↓
OpenAI API
    ↓
Return { content, usage }
```

### Data Flow

```
Student → AI Tutor → LLM → Response
    ↓
Save to Learning Session
    ↓
Progress Tracker analyzes
    ↓
Update Student Metrics
    ↓
Dashboard updates
```

---

## 📊 Metrics & Monitoring

### Agent Performance

```typescript
interface AgentMetrics {
  totalInteractions: number
  avgResponseTime: number
  userSatisfaction: number // 1-5
  tokenUsage: {
    daily: number
    weekly: number
    monthly: number
  }
  cost: {
    daily: number
    weekly: number
    monthly: number
  }
}
```

### Cost Estimation

```
GPT-4o-mini: $0.15 / 1M input tokens
             $0.60 / 1M output tokens

Ví dụ:
- 100 students × 10 messages/day × 500 tokens = 500K tokens/day
- Cost: 500K × $0.15/1M = $0.075/day
- Monthly: ~$2.25
```

---

## 🔐 Security

### Authentication
- ✅ All API routes require next-auth session
- ✅ User ID attached to all messages
- ✅ Role-based access control (student/teacher/admin)

### Data Privacy
- Student data encrypted at rest
- Session data auto-deleted after 30 days
- No PII sent to LLM without consent

### Rate Limiting
```typescript
// TODO: Add rate limiting
- Students: 20 messages/hour
- Teachers: 50 messages/hour
- Admin: unlimited
```

---

## 📚 Best Practices

### System Prompt Design

```typescript
// Good system prompt structure
const SYSTEM_PROMPT = `
You are [ROLE] of [SYSTEM].

Your responsibilities:
- [Task 1]
- [Task 2]

Your style:
- [Style 1]
- [Style 2]

You can help with:
- [Capability 1]
- [Capability 2]
`
```

### Error Handling

```typescript
try {
  const result = await agent.run(...)
  if (!result.success) {
    // Show user-friendly error
    toast.error(result.response)
  }
} catch (error) {
  // Log technical error
  console.error(error)
  // Show generic error to user
  toast.error("Không thể kết nối")
}
```

### Context Management

```typescript
// Keep last 10 messages for context
const contextMessages = messages.slice(-10)

// Include relevant metadata
const enrichedMessage = {
  role: 'user',
  content: userInput,
  metadata: {
    subject: 'Math',
    grade: 10,
    difficulty: 'medium',
  }
}
```

---

## 🎯 Testing

### Unit Tests

```typescript
describe('AgentLoop', () => {
  it('should run agent loop successfully', async () => {
    const agent = new AgentLoop()
    const result = await agent.run(
      'You are a helpful assistant',
      'Hello!'
    )
    expect(result.success).toBe(true)
    expect(result.response).toBeDefined()
  })
})
```

### Integration Tests

```typescript
describe('AI Tutor API', () => {
  it('should return response from LLM', async () => {
    const response = await fetch('/api/agents/llm', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }]
      })
    })
    expect(response.ok).toBe(true)
  })
})
```

---

## 📖 Tài Liệu Liên Quan

- [AEROEDUVISION_AGENTS_ARCHITECTURE.md](./AEROEDUVISION_AGENTS_ARCHITECTURE.md)
- [UI_STANDARDIZATION_GUIDE.md](./UI_STANDARDIZATION_GUIDE.md)
- [QUESTION_BANK_GUIDE.md](./QUESTION_BANK_GUIDE.md)

