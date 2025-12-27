# 🧪 Checklist kiểm tra đồng bộ modules cho Student

## Tài khoản test: `student@example.com`

---

## ✅ Test 1: Learning Path → Assignments

### Bước thực hiện:
1. Đăng nhập với `student@example.com`
2. Vào `/learning-paths` 
3. Click bài "Ứng dụng đạo hàm" (lesson-w1-d5)
4. Làm xong bài tập và nộp
5. Nhận điểm (ví dụ: 85/100)
6. Click "Hoàn thành và tiếp tục"

### Kiểm tra:
- [ ] Vào `/ai-tutor/assignments`
- [ ] Bài "Ứng dụng đạo hàm" xuất hiện ở đầu list
- [ ] Status: ✅ Completed
- [ ] Accuracy: 85%
- [ ] Score: 85/100
- [ ] XP: +88
- [ ] Progress bar: 100%

**Expected:** ✅ Bài học xuất hiện ngay lập tức

---

## ✅ Test 2: Progress Tracking During Lesson

### Bước thực hiện:
1. Bắt đầu một bài mới
2. Trả lời câu 1 → Click "Câu tiếp theo"
3. Mở tab mới, vào `/ai-tutor/assignments`

### Kiểm tra:
- [ ] Bài đang học có badge "🔄 In Progress"
- [ ] Progress bar hiển thị % (14%, 28%, ...)
- [ ] Mỗi lần trả lời câu → % tăng

**Expected:** ✅ Progress update real-time

---

## ✅ Test 3: Score-based Unlock Logic

### Scenario A: Fail (< 60%)
1. Làm bài, đạt 45%
2. Nhận message: ⚠️ "Chưa đạt yêu cầu"
3. Button: "🔄 Học lại bài này"

### Kiểm tra:
- [ ] Bài tiếp theo vẫn có icon 🔒 Lock
- [ ] Có message: "Hoàn thành bài trước với điểm >= 6/10"
- [ ] Không thể click vào bài bị lock

**Expected:** ✅ Bài sau vẫn locked

### Scenario B: Pass (>= 60%)
1. Học lại, đạt 75%
2. Nhận message: ✅ "Đạt yêu cầu!"
3. Button: "✓ Hoàn thành và tiếp tục"

### Kiểm tra:
- [ ] Bài tiếp theo icon đổi từ 🔒 → ▶️ Available
- [ ] Có button "Bắt đầu học"
- [ ] Click được vào bài mới

**Expected:** ✅ Bài sau auto-unlock

---

## ✅ Test 4: Assignments Page Display

### Vào `/ai-tutor/assignments` kiểm tra:

#### Filters:
- [ ] "All" - Hiện tất cả bài
- [ ] "✅ Completed" - Chỉ bài đã làm xong
- [ ] "🔄 In Progress" - Bài đang làm
- [ ] "⏳ Pending" - Bài được assign chưa làm
- [ ] "🤖 AI Recommended" - Bài AI gợi ý

#### Sort:
- [ ] By Date - Mới nhất lên đầu
- [ ] By XP - XP cao nhất lên đầu
- [ ] By Difficulty - Dễ → Khó
- [ ] By Progress - % cao nhất lên đầu

#### Display Info:
- [ ] Subject icon (🧮 📐 🧪 🧬 💻)
- [ ] AI badge (🤖 AI)
- [ ] Status badge (color-coded)
- [ ] Difficulty badge
- [ ] Duration (phút)
- [ ] XP reward
- [ ] Accuracy % (nếu completed)
- [ ] Progress bar (nếu in-progress)
- [ ] Dates (Assigned & Completed)

---

## ✅ Test 5: Dashboard Aggregation

### Vào `/dashboard` kiểm tra:

- [ ] Total XP = Tổng XP từ tất cả bài completed
- [ ] Recent activities hiển thị bài vừa hoàn thành
- [ ] Subject breakdown (Toán, Lý, Hóa...)
- [ ] Streak counter (nếu học liên tục)

**Expected:** Dashboard tự động tính từ assignments

---

## ✅ Test 6: Analytics Integration

### Vào `/dashboard/analytics` kiểm tra:

- [ ] Performance chart cập nhật với điểm mới
- [ ] Subject-wise XP chart
- [ ] Weekly progress
- [ ] Skill radar chart

**Expected:** Charts update với data mới

---

## ✅ Test 7: Achievements Unlock

### Scenario: Earn enough XP

- [ ] Complete 3 bài → Check Achievements
- [ ] Nếu đạt milestone → Badge mới unlock
- [ ] Notification xuất hiện

**Expected:** Achievements tự động unlock

---

## ✅ Test 8: Emotion Tracker

### Vào `/dashboard/emotion` kiểm tra:

- [ ] Engagement score phản ánh kết quả học
- [ ] High score → Higher engagement
- [ ] Streak → Better motivation

**Expected:** Emotion metrics tương quan với performance

---

## ✅ Test 9: AI Tutor Context

### Vào `/ai-tutor` và chat:

### Test questions:
- "Tôi đang học bài gì?"
- "Điểm bài vừa rồi như thế nào?"
- "Tôi yếu ở phần nào?"

### Kiểm tra:
- [ ] AI biết bài đang học
- [ ] AI biết điểm số gần nhất
- [ ] AI đưa ra gợi ý phù hợp

**Expected:** AI có context về learning progress

---

## ✅ Test 10: Notifications

### Vào `/dashboard/notifications` kiểm tra:

Sau khi hoàn thành bài, nên có notification:
- [ ] "🎉 Bài học hoàn thành: Ứng dụng đạo hàm"
- [ ] "🏆 Achievement unlocked!" (nếu có)
- [ ] "🔥 Streak: 3 ngày liên tục"

**Expected:** Notifications tự động tạo

---

## 🎯 OVERALL SYNC STATUS

| Module | Data Source | Sync Status | Priority |
|--------|-------------|-------------|----------|
| 📊 Dashboard | Aggregate từ tất cả | ✅ Implemented | HIGH |
| 🗺️ Learning Path | learning-path-progress | ✅ Implemented | HIGH |
| 📝 Assignments | ai-tutor-assignments | ✅ Implemented | HIGH |
| 📈 Analytics | ai-tutor-assignments | ⚠️ Partial | MEDIUM |
| 💝 Emotion | learning outcomes | ⚠️ Partial | MEDIUM |
| 🏆 Achievements | XP milestones | ⚠️ Needs work | LOW |
| 🔔 Notifications | Event-driven | ⚠️ Needs work | LOW |
| 🤖 AI Tutor | All context | ⚠️ Needs work | HIGH |

---

## 🔧 Quick Fixes Needed:

### 1. Analytics auto-update
```typescript
// In /dashboard/analytics/page.tsx
useEffect(() => {
  const assignments = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  const totalXP = assignments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.earnedXP, 0);
  setTotalXP(totalXP);
}, []);
```

### 2. Achievements XP listener
```typescript
// Check XP milestones when assignments update
const checkAchievements = () => {
  const totalXP = calculateTotalXP();
  if (totalXP >= 500) unlockAchievement('first-500-xp');
  if (totalXP >= 1000) unlockAchievement('first-1000-xp');
};
```

### 3. AI Tutor context
```typescript
// In /ai-tutor/page.tsx
const getStudentContext = () => {
  const assignments = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  const pathProgress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
  
  return {
    recentLessons: assignments.slice(0, 5),
    weakAreas: findWeakAreas(assignments),
    currentLesson: getCurrentLesson(pathProgress)
  };
};
```

---

## ✅ Current Implementation Status:

### ✅ WORKING:
1. **Learning Path → Assignments**: Bài học tự động lưu khi bắt đầu (in-progress) và khi hoàn thành (completed)
2. **Score validation**: Kiểm tra >= 60% để unlock
3. **Progress tracking**: Update % khi làm bài
4. **Data persistence**: localStorage sync

### ⚠️ PARTIALLY WORKING:
1. **Analytics**: Có demo data, chưa đọc từ assignments
2. **Emotion**: Có demo data, chưa link với learning outcomes
3. **Dashboard**: Hiển thị static data, chưa aggregate real-time

### 🔧 NEEDS IMPLEMENTATION:
1. **Achievements**: Auto-unlock dựa trên XP
2. **Notifications**: Auto-create khi có events
3. **AI Tutor**: Context awareness từ learning progress

---

## 🎓 Recommended Test Flow:

1. Clear localStorage (Start fresh)
2. Login as student@example.com
3. Vào `/learning-paths`
4. Làm bài lesson-w1-d4 (in-progress)
5. Check `/ai-tutor/assignments` → Thấy bài in-progress
6. Quay lại làm tiếp
7. Complete với 85%
8. Check `/ai-tutor/assignments` → Status completed
9. Check `/learning-paths` → Bài d5 unlocked
10. Repeat với bài d5

---

**Status:** 🟢 Core sync working, additional integrations recommended

