# 🤖 AI Tutor System - Gia Sư Cá Nhân Ảo

## 📋 Tổng quan

Hệ thống AI Tutor là một gia sư cá nhân ảo thông minh, sử dụng AI để phân tích và tạo lộ trình học tập cá nhân hóa cho từng học sinh dựa trên trạng thái cảm xúc, năng lực, và mục tiêu học tập hàng ngày.

## 🎯 Mục tiêu

- Tạo trải nghiệm học tập cá nhân hóa cho từng học sinh
- Theo dõi và điều chỉnh lộ trình học tập theo thời gian thực
- Phân tích trạng thái cảm xúc và động lực học tập
- Cập nhật XP và tiến độ tự động
- Cung cấp feedback và gợi ý điều chỉnh kịp thời

## 🔄 Luồng hoạt động

### 1. Check-in Hàng Ngày
```
Học sinh mở AI Tutor → Chatbot chào mừng → Bắt đầu check-in
```

**Câu hỏi:**
- Cảm giác hôm nay thế nào? (😊 Vui vẻ / 😐 Bình thường / 😔 Mệt mỏi / 😰 Căng thẳng)
- Muốn học gì hôm nay? (Toán / Vật lý / Hóa / Lập trình / AI/ML / Để AI chọn)
- Tự đánh giá ở level nào? (Beginner / Intermediate / Advanced / Expert)

### 2. Phân Tích AI

AI phân tích các yếu tố:

#### 📊 Competency Score (Điểm năng lực)
- Base score từ self-assessment
- Điều chỉnh dựa trên lịch sử hoàn thành bài học
- Tính từ UserProgress trong database

#### 💪 Engagement Score (Mức độ tương tác)
- Tỷ lệ hoàn thành bài học gần đây
- Tần suất học tập
- Thời gian học trung bình

#### 😊 Emotion Score (Điểm cảm xúc)
- Trạng thái cảm xúc hiện tại
- Mức độ động lực (motivation level)
- Weighted calculation:
  - Happy: 1.0x motivation
  - Neutral: 0.7x motivation
  - Tired: 0.5x motivation
  - Stressed: 0.4x motivation

#### 🚀 Learning Velocity (Tốc độ học tập)
- Số bài hoàn thành trong 5 bài gần nhất
- Xu hướng tiến bộ theo thời gian

### 3. Tạo Lộ Trình Học Tập

AI chọn nội dung dựa trên:

#### Điều Chỉnh Độ Khó
```javascript
if (motivation < 60) {
  // Giảm độ khó nếu học sinh mệt/căng thẳng
  targetDifficulty = lowerLevel(currentLevel);
}
```

#### Số Lượng Bài Học
- Motivation ≥ 70: 4 bài học
- Motivation 50-69: 3 bài học
- Motivation < 50: 2 bài học

#### Đề Xuất Thông Minh
- "Hôm nay học nhẹ nhàng" nếu động lực thấp
- "Thử thách bản thân" nếu năng lượng cao
- "Tập trung bài ngắn" nếu engagement thấp
- "Tốc độ học tập ấn tượng!" nếu velocity cao

### 4. Thực Hiện Bài Học

#### Theo Dõi Realtime
- XP cập nhật sau mỗi bài hoàn thành
- Progress bar cập nhật liên tục
- Hiển thị stats ngay lập tức:
  - ✅ Số bài hoàn thành
  - ⚡ Tổng XP
  - 🎯 Tỷ lệ hoàn thành

#### Adaptive Feedback
**Sau bài đầu tiên:**
> "Tuyệt vời! Bước đầu tiên luôn là quan trọng nhất! 🎉"

**Sau hoàn thành 50%:**
> "Wow! Bạn đã hoàn thành một nửa rồi! Tiếp tục phát huy! 🔥"

**Sau mỗi bài:**
> "Xuất sắc! Tiếp tục momentum này! 💪"

### 5. Hỗ Trợ & Điều Chỉnh

#### Khi Gặp Khó Khăn
Học sinh click "Cần trợ giúp" → AI gợi ý:

**💡 Mẹo học tập:**
- Đọc lại lý thuyết
- Thử ví dụ đơn giản trước
- Tìm video giải thích
- Hỏi trong diễn đàn

**🎯 Điều chỉnh:**
- Thử lại bài này
- Chuyển sang bài dễ hơn
- Xem tài liệu hỗ trợ

#### Nghỉ Giải Lao
**Gợi ý nghỉ ngơi:**
- Đứng dậy vận động
- Uống nước
- Thư giãn mắt
- Hít thở sâu

### 6. Tổng Kết & Phản Hồi

#### Sau Khi Hoàn Thành
**📊 Thống kê:**
- Số bài hoàn thành
- Tổng XP nhận được
- Thời gian học
- Tỷ lệ hoàn thành

**🤖 Phản hồi AI:**

**100% hoàn thành:**
```
🌟 Xuất sắc! Bạn đã hoàn thành 100% kế hoạch!
💪 Engagement của bạn đang rất cao!
🚀 Ngày mai có thể thử độ khó cao hơn!
```

**Hoàn thành một phần:**
```
👍 Tốt lắm! Bạn đã cố gắng rất nhiều!
💡 Mẹo: Học đều đặn mỗi ngày sẽ giúp tiến bộ nhanh hơn
🎯 Tiếp tục như vậy, bạn sẽ đạt mục tiêu!
```

## 🏗️ Kiến Trúc Kỹ Thuật

### Frontend
**File:** `/app/(dashboard)/(routes)/ai-tutor/page.tsx`

**State Management:**
```typescript
- messages: Message[]              // Chat messages
- userState: {                     // User's current state
    emotion, motivation, goals, 
    currentXP, skillLevel
  }
- dailyPlan: DailyPlan            // Generated learning plan
- learningSession: {               // Active session tracking
    active, startTime, currentLesson,
    earnedXP, completedLessons
  }
- aiAnalysis: Analysis            // AI analysis results
```

### Backend APIs

#### 1. Generate Daily Plan
**Endpoint:** `POST /api/generate-daily-plan`

**Input:**
```json
{
  "subject": "mathematics",
  "level": "intermediate",
  "motivation": 75,
  "emotion": "happy",
  "currentXP": 1500
}
```

**Output:**
```json
{
  "success": true,
  "plan": {
    "lessons": [...],
    "totalTime": 120,
    "totalXP": 450,
    "difficulty": "intermediate",
    "focus": ["mathematics"],
    "adaptiveRecommendations": [...]
  },
  "analysis": {
    "competency": 65,
    "engagement": 72,
    "emotionScore": 75,
    "learningVelocity": 80
  },
  "recommendations": [...]
}
```

**Logic:**
1. Fetch user's learning history từ database
2. Calculate các metrics (competency, engagement, emotion, velocity)
3. Adjust difficulty dựa trên emotion & motivation
4. Select lessons phù hợp từ lesson database
5. Generate adaptive recommendations

#### 2. Update Learning Progress
**Endpoint:** `POST /api/update-learning-progress`

**Input:**
```json
{
  "lessonId": 1,
  "lessonTitle": "Phương trình bậc hai",
  "earnedXP": 150,
  "timeSpent": 45,
  "difficulty": "intermediate",
  "subject": "mathematics",
  "completionStatus": "completed"
}
```

**Output:**
```json
{
  "success": true,
  "earnedXP": 150,
  "dailyStats": {
    "totalXP": 450,
    "completedLessons": 3,
    "timeSpent": 120,
    "subjects": ["mathematics"]
  }
}
```

**Logic:**
1. Store learning activity vào database
2. Update user's total XP
3. Calculate và return daily stats

## 📊 Database Schema

### Recommended Tables

#### learning_activities
```sql
CREATE TABLE learning_activities (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  lesson_id INT NOT NULL,
  lesson_title VARCHAR(255) NOT NULL,
  earned_xp INT NOT NULL,
  time_spent INT NOT NULL,
  difficulty VARCHAR(50),
  subject VARCHAR(100),
  completion_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_learning_activities_user_date 
  ON learning_activities(user_id, created_at);
```

#### daily_learning_plans
```sql
CREATE TABLE daily_learning_plans (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, DATE(created_at))
);
```

#### users metadata extension
```sql
ALTER TABLE users 
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Store: { total_xp, learning_streak, last_active, ... }
```

## 🎨 UI Components

### 1. Header với Live Stats
```tsx
<div className="flex items-center space-x-4">
  <div className="text-right">
    <div className="text-sm text-gray-500">Today's Progress</div>
    <div className="text-2xl font-bold text-purple-600">
      {learningSession.earnedXP} XP
    </div>
    {learningSession.active && (
      <div className="text-xs text-green-600">
        <Activity className="animate-pulse" />
        Learning in progress
      </div>
    )}
  </div>
</div>
```

### 2. Learning Session Progress Bar
```tsx
{learningSession.active && (
  <div className="bg-gradient-to-r from-purple-500 to-pink-500">
    <div className="flex justify-between">
      <span>✅ {completedLessons}/{totalLessons}</span>
      <span>⚡ {earnedXP} XP</span>
      <span>🎯 {percentage}%</span>
    </div>
    <div className="progress-bar">
      <div style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
)}
```

### 3. Chatbot Messages
```tsx
<div className={`message ${type === 'bot' ? 'bot' : 'user'}`}>
  <div className="content">{message.content}</div>
  {message.actions && (
    <div className="actions">
      {message.actions.map(action => (
        <button onClick={() => handleAction(action.action, action.data)}>
          {action.label}
        </button>
      ))}
    </div>
  )}
</div>
```

## 🚀 Cách Sử Dụng

### Cho Học Sinh

1. **Mở AI Tutor** từ sidebar
2. **Click "Bắt đầu ngay"** để check-in
3. **Chọn cảm xúc** hôm nay
4. **Chọn môn học** muốn học
5. **Chọn level** hiện tại
6. **Xem AI analysis** và lộ trình được tạo
7. **Bắt đầu học** và hoàn thành từng bài
8. **Nhận XP** và feedback sau mỗi bài
9. **Xem tổng kết** cuối buổi học

### Cho Giáo Viên/Admin

1. Monitor student engagement qua analytics
2. Xem AI recommendations cho từng học sinh
3. Điều chỉnh lesson database nếu cần
4. Theo dõi XP và progress trends

## 📈 Metrics & Analytics

### Key Metrics Tracked

1. **Competency Score**: Đánh giá năng lực tổng thể
2. **Engagement Rate**: Tỷ lệ tương tác với hệ thống
3. **Emotion Score**: Trạng thái cảm xúc trung bình
4. **Learning Velocity**: Tốc độ hoàn thành bài học
5. **Daily XP**: XP kiếm được mỗi ngày
6. **Completion Rate**: Tỷ lệ hoàn thành lộ trình

### Dashboard Views

**Student View:**
- Today's progress
- Weekly stats
- Achievement badges
- Learning streak

**Admin View:**
- Class engagement overview
- Individual student analytics
- Content effectiveness
- AI recommendation accuracy

## 🔮 Tính Năng Tương Lai

### Phase 2
- [ ] Natural Language Processing cho chat tự do
- [ ] Voice interaction support
- [ ] Gamification với badges & achievements
- [ ] Social learning với study groups
- [ ] Parent/Teacher notifications

### Phase 3
- [ ] Machine Learning model training trên student data
- [ ] Predictive analytics cho student success
- [ ] Personalized content generation
- [ ] Multi-modal learning (video, audio, text)
- [ ] AR/VR integration

## 🛠️ Development Guide

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Setup database:**
```bash
npx prisma generate
npx prisma migrate dev
```

3. **Run development server:**
```bash
npm run dev
```

4. **Test AI Tutor:**
Navigate to: `http://localhost:3000/ai-tutor`

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Deployment

```bash
# Build
npm run build

# Deploy to Cloud Run
gcloud run deploy lmsmath --source .
```

## 📝 Best Practices

### For AI Logic
- Always provide fallback plans
- Handle API errors gracefully
- Cache lesson database for performance
- Log all AI decisions for debugging

### For UX
- Show loading states clearly
- Provide instant feedback
- Allow undo/retry actions
- Keep messages conversational

### For Performance
- Lazy load lesson content
- Use React.memo for expensive components
- Debounce user inputs
- Cache API responses

## 🤝 Contributing

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Component naming: PascalCase
- Function naming: camelCase

### Git Workflow
```bash
git checkout -b feature/ai-tutor-enhancement
git commit -m "feat: add voice interaction"
git push origin feature/ai-tutor-enhancement
```

### Pull Request Template
- Description of changes
- Screenshots/videos
- Test coverage
- Breaking changes

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [AI/ML Best Practices](https://developers.google.com/machine-learning/guides)
- [UX Design for Education](https://www.nngroup.com/articles/elearning/)

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Contact the development team
- Check the FAQ section

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-17  
**Maintainer:** LMS Math Development Team

