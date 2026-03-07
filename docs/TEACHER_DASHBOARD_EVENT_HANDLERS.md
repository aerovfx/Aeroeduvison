# Teacher Dashboard Event Handlers Documentation

## Tổng Quan

Tài liệu này mô tả tất cả các event handlers trong trang Teacher Dashboard (`/teacher/dashboard`).

## Event Handlers Chính

### 1. View Student Detail

**Handler**: `handleViewStudentDetail(student: Student)`

**Vị trí**: Dòng 162-166

**Chức năng**: 
- Navigate đến trang chi tiết học sinh
- Log thông tin để debug

**Code**:
```typescript
const handleViewStudentDetail = (student: Student) => {
  console.log(`👀 [Dashboard] Viewing details for: ${student.name}`);
  console.log(`📊 [Dashboard] Navigating to: /teacher/student/${student.id}`);
  router.push(`/teacher/student/${student.id}`);
};
```

**Sử dụng tại**:
1. **Bảng Student List** (dòng 912): Button "View Details" trong cột Actions
2. **At-Risk Students Section** (dòng 987): Button "Chi tiết" trong quick actions

**Route**: `/teacher/student/${student.id}`

---

### 2. Send Encouragement

**Handler**: `handleSendEncouragement(student: Student)`

**Vị trí**: Dòng 145-151

**Chức năng**: 
- Mở modal gửi lời động viên
- Set student được chọn và reset message

**Code**:
```typescript
const handleSendEncouragement = (student: Student) => {
  console.log(`💝 [Dashboard] Opening encouragement modal for: ${student.name}`);
  console.log(`📊 [Dashboard] Student stats - Engagement: ${student.engagement}%, XP: ${student.totalXP}`);
  setSelectedStudentForAction(student);
  setEncouragementMessage('');
  setShowEncouragementModal(true);
};
```

**Sử dụng tại**:
- **At-Risk Students Section** (dòng 973): Button "Gửi động viên"

---

### 3. Send Material

**Handler**: `handleSendMaterial(student: Student)`

**Vị trí**: Dòng 153-160

**Chức năng**: 
- Mở modal gửi tài liệu học tập
- Set student được chọn và reset form

**Code**:
```typescript
const handleSendMaterial = (student: Student) => {
  console.log(`📚 [Dashboard] Opening material modal for: ${student.name}`);
  console.log(`📊 [Dashboard] Student needs: Learning materials`);
  setSelectedStudentForAction(student);
  setMaterialTitle('');
  setMaterialUrl('');
  setShowMaterialModal(true);
};
```

**Sử dụng tại**:
- **At-Risk Students Section** (dòng 980): Button "Gửi tài liệu"

---

### 4. Adjust Learning Path

**Handler**: `handleAdjustLearningPath(student: Student)`

**Vị trí**: Dòng 279-282

**Chức năng**: 
- Navigate đến trang điều chỉnh learning path
- Pass student ID và current progress

**Code**:
```typescript
const handleAdjustLearningPath = (student: Student) => {
  console.log(`🎯 Adjusting learning path for ${student.name}`);
  router.push(`/teacher/learning-path-adjust?student=${student.id}&current=${student.progress}`);
};
```

**Sử dụng tại**:
- **Student List Table** (dòng 905): Button với icon Target trong cột Actions

---

### 5. View Class Analytics

**Handler**: `handleViewClassAnalytics()`

**Vị trí**: Dòng 274-277

**Chức năng**: 
- Navigate đến trang analytics

**Code**:
```typescript
const handleViewClassAnalytics = () => {
  console.log('📊 Opening class analytics...');
  router.push('/teacher/analytics');
};
```

**Sử dụng tại**:
- **Quick Actions Panel** (dòng 777): Button "View Analytics"

---

### 6. AI Insights

**Handler**: `handleAIInsights()`

**Vị trí**: Dòng 233-236

**Chức năng**: 
- Navigate đến trang AI Insights

**Code**:
```typescript
const handleAIInsights = () => {
  console.log('🧠 Opening AI Insights...');
  router.push('/teacher/ai-insights');
};
```

**Sử dụng tại**:
- **Header** (dòng 340): Button "AI Insights"

---

### 7. Send Reminders

**Handler**: `handleSendReminders()`

**Vị trí**: Dòng 238-256

**Chức năng**: 
- Gửi nhắc nhở đến học sinh chưa hoàn thành bài tập
- Filter students có progress < 80%
- Confirm trước khi gửi

**Code**:
```typescript
const handleSendReminders = () => {
  const incompleteStudents = students.filter(s => s.progress < 80);
  if (incompleteStudents.length === 0) {
    alert('✅ Tất cả học sinh đã hoàn thành bài tập tuần này!');
    return;
  }
  
  const confirmed = confirm(`Gửi nhắc nhở đến ${incompleteStudents.length} học sinh chưa hoàn thành bài tập?`);
  if (confirmed) {
    incompleteStudents.forEach(student => {
      sendNotificationToStudent(
        student.id,
        'Nhắc nhở: Bạn còn bài tập chưa hoàn thành tuần này. Hãy cố gắng hoàn thành nhé! 💪',
        'reminder'
      );
    });
    alert(`✅ Đã gửi nhắc nhở đến ${incompleteStudents.length} học sinh!`);
  }
};
```

**Sử dụng tại**:
- **AI Co-Teacher Panel** (dòng 713): Button "Gửi nhắc nhở"

---

### 8. Create Module

**Handler**: `handleCreateModule()`

**Vị trí**: Dòng 258-262

**Chức năng**: 
- Navigate đến trang tạo module mới
- Filter high performers (score >= 85) và pass IDs

**Code**:
```typescript
const handleCreateModule = () => {
  console.log('📚 Creating new advanced module...');
  const highPerformers = students.filter(s => s.averageScore >= 85);
  router.push(`/teacher/create-module?targetStudents=${highPerformers.map(s => s.id).join(',')}`);
};
```

**Sử dụng tại**:
- **AI Co-Teacher Panel** (dòng 743): Button "Tạo module"

---

### 9. Send Broadcast Notification

**Handler**: `handleSendBroadcastNotification()`

**Vị trí**: Dòng 264-272

**Chức năng**: 
- Gửi thông báo đến toàn bộ lớp
- Prompt để nhập message
- Gửi đến tất cả students

**Code**:
```typescript
const handleSendBroadcastNotification = () => {
  const message = prompt('Nhập thông báo muốn gửi cho toàn lớp:');
  if (message && message.trim()) {
    students.forEach(student => {
      sendNotificationToStudent(student.id, message, 'info');
    });
    alert(`✅ Đã gửi thông báo đến ${students.length} học sinh!`);
  }
};
```

**Sử dụng tại**:
- **Quick Actions Panel** (dòng 769): Button "Send Notification"

---

### 10. Time Range Change

**Handler**: `handleTimeRangeChange(range: 'week' | 'month' | 'all')`

**Vị trí**: Dòng 213-231

**Chức năng**: 
- Thay đổi time range cho charts
- Hiển thị notification

**Code**:
```typescript
const handleTimeRangeChange = (range: 'week' | 'month' | 'all') => {
  console.log(`📅 Changing time range to: ${range}`);
  setTimeRange(range);
  
  // Show notification
  const rangeText = range === 'week' ? 'tuần này' : range === 'month' ? '30 ngày' : 'tất cả thời gian';
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-right';
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span class="text-sm font-medium text-gray-900">Đã lọc theo ${rangeText}</span>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
};
```

**Sử dụng tại**:
- **Header** (dòng 333): Button "Tuần này"
- **XP Trend Chart** (dòng 490): Select dropdown

---

### 11. View Tab Change

**Handler**: `setSelectedView(view: 'overview' | 'engagement' | 'emotion')`

**Vị trí**: Dòng 442, 453, 464

**Chức năng**: 
- Thay đổi view tab (Overview, Engagement, Emotion)

**Sử dụng tại**:
- **View Tabs** (dòng 442, 453, 464): 3 buttons cho 3 views

---

### 12. Submit Encouragement

**Handler**: `submitEncouragement()`

**Vị trí**: Dòng 168-185

**Chức năng**: 
- Gửi lời động viên đến học sinh
- Validate message
- Call API và show alert

**Code**:
```typescript
const submitEncouragement = () => {
  if (!selectedStudentForAction || !encouragementMessage) return;
  
  console.log(`💝 [Dashboard] Sending encouragement to: ${selectedStudentForAction.name}`);
  console.log(`📝 [Dashboard] Message: "${encouragementMessage}"`);
  
  sendNotificationToStudent(
    selectedStudentForAction.id,
    encouragementMessage,
    'encouragement'
  );
  
  setShowEncouragementModal(false);
  setEncouragementMessage('');
  
  console.log(`✅ [Dashboard] Encouragement sent successfully!`);
  alert(`✅ Đã gửi lời động viên đến ${selectedStudentForAction.name}!\n\n"${encouragementMessage}"`);
};
```

**Sử dụng tại**:
- **Encouragement Modal** (dòng 1065): Button "Gửi động viên"

---

### 13. Submit Material

**Handler**: `submitMaterial()`

**Vị trí**: Dòng 187-210

**Chức năng**: 
- Gửi tài liệu đến học sinh
- Validate title
- Call API và show alert

**Code**:
```typescript
const submitMaterial = () => {
  if (!selectedStudentForAction || !materialTitle) return;
  
  console.log(`📚 [Dashboard] Sending material to: ${selectedStudentForAction.name}`);
  console.log(`📄 [Dashboard] Material: "${materialTitle}" (${materialType})`);
  console.log(`🔗 [Dashboard] URL: ${materialUrl || 'No URL'}`);
  
  assignMaterialToStudent(
    selectedStudentForAction.id,
    {
      type: materialType,
      title: materialTitle,
      url: materialUrl,
      description: `Tài liệu từ giáo viên`
    }
  );
  
  setShowMaterialModal(false);
  setMaterialTitle('');
  setMaterialUrl('');
  
  console.log(`✅ [Dashboard] Material sent successfully!`);
  alert(`✅ Đã gửi tài liệu "${materialTitle}" đến ${selectedStudentForAction.name}!`);
};
```

**Sử dụng tại**:
- **Material Modal** (dòng 1161): Button "Gửi tài liệu"

---

## Navigation Routes

| Handler | Route |
|---------|-------|
| `handleViewStudentDetail` | `/teacher/student/${student.id}` |
| `handleAdjustLearningPath` | `/teacher/learning-path-adjust?student=${id}&current=${progress}` |
| `handleViewClassAnalytics` | `/teacher/analytics` |
| `handleAIInsights` | `/teacher/ai-insights` |
| `handleCreateModule` | `/teacher/create-module?targetStudents=${ids}` |
| Direct navigation (Message) | `/teacher/interaction-center?student=${id}` |
| Direct navigation (Learning Path) | `/teacher/learning-path-builder` |

---

## Issues & Recommendations

### ✅ Đã Sửa

1. **Thống nhất View Detail Handler**: 
   - Trước: Có 2 cách khác nhau (direct `router.push` và handler)
   - Sau: Tất cả đều dùng `handleViewStudentDetail` để có logging nhất quán

### 🔍 Cần Kiểm Tra

1. **Route `/teacher/student/[id]`**: Cần đảm bảo route này tồn tại và hoạt động
2. **Route `/teacher/learning-path-adjust`**: Cần kiểm tra route này
3. **Route `/teacher/create-module`**: Cần kiểm tra route này
4. **Route `/teacher/interaction-center`**: Cần kiểm tra route này

---

## Testing Checklist

- [ ] Click "View Details" trong student list table → Navigate đúng
- [ ] Click "Chi tiết" trong at-risk section → Navigate đúng
- [ ] Click "Gửi động viên" → Modal mở và gửi thành công
- [ ] Click "Gửi tài liệu" → Modal mở và gửi thành công
- [ ] Click "Adjust Learning Path" → Navigate đúng với params
- [ ] Click "View Analytics" → Navigate đúng
- [ ] Click "AI Insights" → Navigate đúng
- [ ] Click "Gửi nhắc nhở" → Gửi đến đúng students
- [ ] Click "Tạo module" → Navigate đúng với high performers
- [ ] Click "Send Notification" → Prompt và gửi broadcast
- [ ] Change time range → Charts update
- [ ] Switch view tabs → Content changes

---

**Last Updated**: 2026-01-03
**File**: `app/(dashboard)/(routes)/teacher/dashboard/page.tsx`
