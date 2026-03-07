# 🤖 AI Tutor - Gia Sư Cá Nhân Ảo

## ✨ Giới thiệu

AI Tutor là hệ thống gia sư cá nhân ảo thông minh, tự động điều chỉnh lộ trình học tập dựa trên:
- 😊 **Trạng thái cảm xúc** hàng ngày
- 🎯 **Mục tiêu học tập** cá nhân
- 📊 **Năng lực hiện tại** (XP, competency)
- 💪 **Mức độ engagement** với hệ thống

## 🎯 Luồng Hoạt Động

```
┌─────────────────────────────────────────────────────────────┐
│  1. CHECK-IN HÀNG NGÀY                                      │
│     • Hỏi cảm xúc: 😊 😐 😔 😰                              │
│     • Hỏi muốn học gì: Toán/Lý/Hóa/Code/AI                  │
│     • Hỏi level: Beginner → Expert                          │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  2. AI PHÂN TÍCH                                            │
│     📊 Competency Score    (Năng lực tổng thể)             │
│     💪 Engagement Rate     (Tỷ lệ tương tác)               │
│     😊 Emotion Score       (Điểm cảm xúc)                   │
│     🚀 Learning Velocity   (Tốc độ học tập)                │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  3. TẠO LỘ TRÌNH HỌC TẬP                                   │
│     • Chọn 2-4 bài học phù hợp                             │
│     • Điều chỉnh độ khó theo cảm xúc                        │
│     • Tính toán thời gian & XP dự kiến                      │
│     • Đưa ra đề xuất thông minh                             │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  4. HỌC SINH THỰC HIỆN BÀI HỌC                             │
│     ✅ Hoàn thành → +XP → Progress cập nhật                 │
│     😅 Khó khăn → AI gợi ý & điều chỉnh                     │
│     ⏸️  Nghỉ ngơi → Tips nghỉ giải lao                      │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  5. CHATBOT THEO DÕI & FEEDBACK                             │
│     • Theo dõi tiến độ realtime                             │
│     • Adaptive encouragement                                 │
│     • Gợi ý điều chỉnh nếu cần                              │
│     • Tổng kết & phân tích cuối buổi                        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Truy cập AI Tutor
```
Dashboard → Sidebar → AI Tutor
hoặc truy cập: /ai-tutor
```

### 2. Bắt đầu Check-in
- Click **"Bắt đầu ngay! 💪"**
- Chọn cảm giác hôm nay
- Chọn môn học
- Chọn level

### 3. Xem Phân Tích AI
```
🤖 Phân tích AI của bạn
📊 Competency Score: 65/100
💪 Engagement: 72%
😊 Emotion Score: 75/100
🚀 Learning Velocity: 80%
```

### 4. Học & Nhận XP
- Làm từng bài học
- Nhận XP sau mỗi bài
- Xem progress realtime

### 5. Tổng Kết
```
🎊 Tổng kết buổi học
✅ Hoàn thành: 4/4 bài
⚡ Tổng XP: 450 XP
⏱️ Thời gian: 120 phút
🎯 Tỷ lệ: 100%
```

## 📊 Tính Năng Chính

### ✅ Đã Có
- [x] Check-in hàng ngày với emotion tracking
- [x] AI analysis (XP, competency, engagement, emotion)
- [x] Dynamic learning path generation
- [x] Real-time progress tracking
- [x] XP updates tự động
- [x] Adaptive feedback & encouragement
- [x] Help system khi gặp khó khăn
- [x] Break reminders
- [x] Session summary với AI feedback

### 🔮 Sắp Có
- [ ] Natural language chat
- [ ] Voice interaction
- [ ] Gamification (badges, achievements)
- [ ] Study groups
- [ ] Parent notifications

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React Hooks
- TypeScript
- Tailwind CSS

**Backend:**
- Next.js API Routes
- Prisma ORM
- PostgreSQL

**AI/ML:**
- Custom scoring algorithms
- Adaptive difficulty adjustment
- Personalization engine

## 📂 File Structure

```
app/
├── (dashboard)/(routes)/ai-tutor/
│   └── page.tsx                    # Main AI Tutor UI
├── api/
│   ├── generate-daily-plan/
│   │   └── route.ts               # AI plan generation
│   └── update-learning-progress/
│       └── route.ts               # XP & progress updates
docs/
└── AI_TUTOR_SYSTEM.md             # Chi tiết documentation
```

## 💡 Ví Dụ Sử Dụng

### Scenario 1: Học sinh năng động
```
Input:
- Emotion: 😊 Vui vẻ (motivation: 90)
- Subject: Toán học
- Level: Intermediate

AI Output:
- 4 bài học (45-60 phút mỗi bài)
- Độ khó: Intermediate → Advanced
- Đề xuất: "Năng lượng tốt! Thử thách bản thân"
- Total XP: 600 XP
```

### Scenario 2: Học sinh mệt mỏi
```
Input:
- Emotion: 😔 Mệt mỏi (motivation: 50)
- Subject: Vật lý
- Level: Advanced

AI Output:
- 2 bài học (30-35 phút mỗi bài)
- Độ khó: Intermediate (giảm từ Advanced)
- Đề xuất: "Hôm nay học nhẹ nhàng, không áp lực"
- Total XP: 220 XP
```

### Scenario 3: Học sinh gặp khó khăn
```
Trong khi học:
- Click "😅 Cần trợ giúp"

AI Response:
💡 Mẹo học tập:
• Đọc lại phần lý thuyết
• Thử làm ví dụ đơn giản trước
• Tìm video giải thích
• Hỏi trong diễn đàn

Options:
[🔄 Thử lại] [⏭️ Chuyển bài khác] [📚 Tài liệu]
```

## 🎨 UI Screenshots

### Check-in Screen
```
┌────────────────────────────────────┐
│  👋 Xin chào!                      │
│                                    │
│  Cảm giác hôm nay thế nào?        │
│                                    │
│  [😊 Vui vẻ, tràn năng lượng]    │
│  [😐 Bình thường, ổn định]        │
│  [😔 Hơi mệt mỏi]                 │
│  [😰 Áp lực, căng thẳng]          │
└────────────────────────────────────┘
```

### Learning Session
```
┌────────────────────────────────────┐
│  📚 Buổi học đang diễn ra          │
│  ✅ 2/4 bài  ⚡ 280 XP  🎯 50%    │
│  [████████░░░░░░░░] 50%           │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  BOT: ✨ Bài học 3/4               │
│       📖 Hệ phương trình            │
│       ⏱️ 40 phút  ⚡ 120 XP        │
│                                    │
│  [✅ Đã hoàn thành]                │
│  [😅 Cần trợ giúp]                │
│  [⏸️ Nghỉ giải lao]                │
└────────────────────────────────────┘
```

### Session Summary
```
┌────────────────────────────────────┐
│  🎊 Tổng kết buổi học hôm nay     │
│                                    │
│  ✅ Hoàn thành: 4/4 bài           │
│  ⚡ Tổng XP: 450 XP               │
│  ⏱️ Thời gian: 120 phút           │
│  🎯 Tỷ lệ: 100%                   │
│                                    │
│  🤖 Phản hồi AI:                   │
│  🌟 Xuất sắc! Hoàn thành 100%!    │
│  💪 Engagement rất cao!            │
│  🚀 Ngày mai thử độ khó cao hơn!  │
│                                    │
│  [🏠 Dashboard] [🔄 Học tiếp]     │
└────────────────────────────────────┘
```

## 🔧 API Endpoints

### Generate Daily Plan
```typescript
POST /api/generate-daily-plan

Body: {
  subject: string,
  level: string,
  motivation: number,
  emotion: string,
  currentXP: number
}

Response: {
  success: true,
  plan: DailyPlan,
  analysis: Analysis,
  recommendations: string[]
}
```

### Update Progress
```typescript
POST /api/update-learning-progress

Body: {
  lessonId: number,
  lessonTitle: string,
  earnedXP: number,
  timeSpent: number,
  difficulty: string,
  subject: string,
  completionStatus: string
}

Response: {
  success: true,
  earnedXP: number,
  dailyStats: DailyStats
}
```

## 📊 Metrics Tracked

| Metric | Description | Usage |
|--------|-------------|-------|
| Competency Score | Năng lực tổng thể | Chọn độ khó bài học |
| Engagement Rate | Tỷ lệ tương tác | Điều chỉnh số lượng bài |
| Emotion Score | Trạng thái cảm xúc | Điều chỉnh áp lực |
| Learning Velocity | Tốc độ học tập | Dự đoán thành công |
| Daily XP | XP hôm nay | Gamification |
| Completion Rate | Tỷ lệ hoàn thành | Đánh giá hiệu quả |

## 🎯 Best Practices

### Cho Học Sinh
1. Check-in mỗi ngày để có lộ trình tốt nhất
2. Trung thực với cảm xúc để AI điều chỉnh chính xác
3. Hoàn thành đủ bài để maintain engagement
4. Nghỉ giải lao khi cần
5. Cầu cứu chatbot khi gặp khó khăn

### Cho Giáo Viên
1. Monitor student engagement qua dashboard
2. Xem AI recommendations để hiểu học sinh
3. Điều chỉnh lesson database theo phản hồi
4. Track XP trends để identify issues sớm

## 🐛 Troubleshooting

### Vấn đề: AI không tạo được plan
```
Giải pháp:
1. Check network connection
2. Verify API endpoint
3. Check database connection
4. Xem console logs
→ Fallback plan sẽ được dùng
```

### Vấn đề: XP không cập nhật
```
Giải pháp:
1. Check /api/update-learning-progress
2. Verify database schema
3. Check user authentication
→ XP vẫn hiển thị local, sync sau
```

### Vấn đề: Chatbot không phản hồi
```
Giải pháp:
1. Refresh trang
2. Clear localStorage
3. Check browser console
→ Contact support nếu vẫn lỗi
```

## 📚 Tài Liệu Thêm

- [Chi tiết system](./docs/AI_TUTOR_SYSTEM.md)
- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)

## 🤝 Support

Gặp vấn đề? Liên hệ:
- 📧 Email: support@lmsmath.com
- 💬 Discord: LMS Math Community
- 🐛 GitHub Issues: [Create Issue](https://github.com/...)

---

**Happy Learning! 🎓✨**

