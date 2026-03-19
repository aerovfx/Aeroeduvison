# Teacher Pages - Icon & Title Customization Guide

## 📋 Complete Reference for All 38 Pages

---

## 🔴 Phase 1 - HIGH Priority (10 pages)

### 1. `/teacher/exam-matrix/page.tsx`
```tsx
<Grid3x3 className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Ma Trận Đề Thi</h1>
<p className="text-sm text-gray-600">Quản lý và số hóa ma trận đề thi</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Upload className="w-4 h-4 inline mr-2" />
    Số hóa ma trận
  </button>
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Tạo ma trận
  </button>
</div>
```

### 2. `/teacher/question-bank/page.tsx`
```tsx
<Database className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Ngân Hàng Câu Hỏi</h1>
<p className="text-sm text-gray-600">Quản lý và sinh câu hỏi với AI</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Sparkles className="w-4 h-4 inline mr-2" />
    Sinh hàng loạt
  </button>
</div>
```

### 3. `/teacher/exams/page.tsx`
```tsx
<FileText className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Đề Thi</h1>
<p className="text-sm text-gray-600">Quản lý và chấm điểm tự động</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Tạo đề thi
  </button>
</div>
```

### 4. `/teacher/online-exam-room/page.tsx`
```tsx
<Clock className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Phòng Thi Online</h1>
<p className="text-sm text-gray-600">Tổ chức và quản lý thi trực tuyến</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Tạo phòng thi
  </button>
</div>
```

### 5. `/teacher/classes/page.tsx`
```tsx
<Users className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Quản Lý Lớp</h1>
<p className="text-sm text-gray-600">Quản lý lớp học và học sinh</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Thêm lớp học
  </button>
</div>
```

### 6. `/teacher/calendar/page.tsx`
```tsx
<Calendar className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Lịch Biểu</h1>
<p className="text-sm text-gray-600">Lịch dạy và sự kiện</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Thêm sự kiện
  </button>
</div>
```

### 7. `/teacher/assignments/page.tsx`
```tsx
<BookOpen className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Bài Tập</h1>
<p className="text-sm text-gray-600">Giao và quản lý bài tập</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Giao bài tập
  </button>
</div>
```

### 8. `/teacher/grading/page.tsx`
```tsx
<CheckCircle2 className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Chấm Điểm</h1>
<p className="text-sm text-gray-600">Chấm điểm tự động với AI</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Upload className="w-4 h-4 inline mr-2" />
    Upload bài làm
  </button>
</div>
```

### 9. `/teacher/interaction-center/page.tsx`
```tsx
<MessageSquare className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Tương Tác</h1>
<p className="text-sm text-gray-600">Tương tác với học sinh</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Send className="w-4 h-4 inline mr-2" />
    Gửi thông báo
  </button>
</div>
```

### 10. `/teacher/camera-management/page.tsx`
```tsx
<Camera className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Camera AI</h1>
<p className="text-sm text-gray-600">Quản lý camera và vision AI</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Settings className="w-4 h-4 inline mr-2" />
    Cấu hình
  </button>
</div>
```

---

## 🟡 Phase 2 - MEDIUM Priority (15 pages)

### 11. `/teacher/document-digitization/page.tsx`
```tsx
<Upload className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Số Hóa Tài Liệu</h1>
<p className="text-sm text-gray-600">Trích xuất câu hỏi từ tài liệu</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Upload className="w-4 h-4 inline mr-2" />
    Upload tài liệu
  </button>
</div>
```

### 12. `/teacher/exam-generator/page.tsx`
```tsx
<Sparkles className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Sinh Đề Thi</h1>
<p className="text-sm text-gray-600">Sinh đề thi tự động với AI</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Sparkles className="w-4 h-4 inline mr-2" />
    Sinh đề ngay
  </button>
</div>
```

### 13. `/teacher/exam-grading/page.tsx`
```tsx
<CheckCircle className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Chấm Thi</h1>
<p className="text-sm text-gray-600">Chấm điểm và phân tích kết quả</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Upload className="w-4 h-4 inline mr-2" />
    Upload bài thi
  </button>
</div>
```

### 14. `/teacher/exam-reports/page.tsx`
```tsx
<BarChart3 className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Báo Cáo Thi</h1>
<p className="text-sm text-gray-600">Phân tích và báo cáo kết quả thi</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Download className="w-4 h-4 inline mr-2" />
    Xuất báo cáo
  </button>
</div>
```

### 15. `/teacher/latex-documents/page.tsx`
```tsx
<FileText className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">LaTeX Documents</h1>
<p className="text-sm text-gray-600">Quản lý tài liệu LaTeX</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Tạo tài liệu
  </button>
</div>
```

### 16. `/teacher/learning-path-builder/page.tsx`
```tsx
<Route className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Learning Path</h1>
<p className="text-sm text-gray-600">Xây dựng lộ trình học tập</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Tạo lộ trình
  </button>
</div>
```

### 17. `/teacher/multi-disciplinary-paths/page.tsx`
```tsx
<Layers className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Multi-Disciplinary</h1>
<p className="text-sm text-gray-600">Lộ trình liên môn học</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Tạo lộ trình
  </button>
</div>
```

### 18. `/teacher/create-module/page.tsx`
```tsx
<Plus className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Tạo Module</h1>
<p className="text-sm text-gray-600">Tạo module học tập mới</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Save className="w-4 h-4 inline mr-2" />
    Lưu module
  </button>
</div>
```

### 19. `/teacher/environment-monitoring/page.tsx`
```tsx
<Activity className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Environment</h1>
<p className="text-sm text-gray-600">Giám sát môi trường học tập</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <RefreshCw className="w-4 h-4 inline mr-2" />
    Làm mới
  </button>
</div>
```

### 20. `/teacher/vision/object-detection/page.tsx`
```tsx
<Eye className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Vision AI</h1>
<p className="text-sm text-gray-600">Nhận diện vật thể và cảm xúc</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Camera className="w-4 h-4 inline mr-2" />
    Bật camera
  </button>
</div>
```

### 21. `/teacher/student/[studentId]/page.tsx`
```tsx
<User className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Hồ Sơ Học Sinh</h1>
<p className="text-sm text-gray-600">Chi tiết và tiến độ học tập</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <MessageSquare className="w-4 h-4 inline mr-2" />
    Nhắn tin
  </button>
</div>
```

### 22. `/teacher/classes/[id]/page.tsx`
```tsx
<Users className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Chi Tiết Lớp</h1>
<p className="text-sm text-gray-600">Thông tin và thống kê lớp học</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Edit className="w-4 h-4 inline mr-2" />
    Chỉnh sửa
  </button>
</div>
```

### 23-25. `/teacher/exam-matrix/[id]/*` (3 pages)
```tsx
<Grid3x3 className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Chi Tiết Ma Trận</h1>
<p className="text-sm text-gray-600">Xem và chỉnh sửa ma trận</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Edit className="w-4 h-4 inline mr-2" />
    Chỉnh sửa
  </button>
</div>
```

---

## 🟢 Phase 3 - LOW Priority (9 pages)

### 26. `/teacher/question-bank/list/page.tsx`
```tsx
<List className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Danh Sách Câu Hỏi</h1>
<p className="text-sm text-gray-600">Tất cả câu hỏi trong ngân hàng</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Plus className="w-4 h-4 inline mr-2" />
    Thêm câu hỏi
  </button>
</div>
```

### 27. `/teacher/question-bank/create/page.tsx`
```tsx
<Plus className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Thêm Câu Hỏi</h1>
<p className="text-sm text-gray-600">Tạo câu hỏi mới</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Save className="w-4 h-4 inline mr-2" />
    Lưu câu hỏi
  </button>
</div>
```

### 28. `/teacher/question-bank/edit/[id]/page.tsx`
```tsx
<Edit className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Sửa Câu Hỏi</h1>
<p className="text-sm text-gray-600">Chỉnh sửa thông tin câu hỏi</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Save className="w-4 h-4 inline mr-2" />
    Lưu thay đổi
  </button>
</div>
```

### 29. `/teacher/exams/create/page.tsx`
```tsx
<Plus className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Tạo Đề Thi</h1>
<p className="text-sm text-gray-600">Tạo đề thi mới từ ngân hàng</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Save className="w-4 h-4 inline mr-2" />
    Lưu đề thi
  </button>
</div>
```

### 30. `/teacher/exam-preview/[exam_id]/page.tsx`
```tsx
<Eye className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Preview Đề Thi</h1>
<p className="text-sm text-gray-600">Xem trước đề thi</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Download className="w-4 h-4 inline mr-2" />
    Tải đề thi
  </button>
</div>
```

### 31. `/teacher/latex-documents/[id]/page.tsx`
```tsx
<FileText className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Chi Tiết LaTeX</h1>
<p className="text-sm text-gray-600">Xem và chỉnh sửa tài liệu</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Edit className="w-4 h-4 inline mr-2" />
    Chỉnh sửa
  </button>
</div>
```

### 32. `/teacher/document-digitization/[id]/review/page.tsx`
```tsx
<Eye className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Review Tài Liệu</h1>
<p className="text-sm text-gray-600">Kiểm tra và xác nhận kết quả</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <CheckCircle className="w-4 h-4 inline mr-2" />
    Duyệt
  </button>
</div>
```

### 33. `/teacher/system-flow/page.tsx`
```tsx
<Activity className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">System Flow</h1>
<p className="text-sm text-gray-600">Luồng hệ thống và API</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <RefreshCw className="w-4 h-4 inline mr-2" />
    Refresh
  </button>
</div>
```

### 34. `/teacher/grading/_components/ScanGrading.tsx`
```tsx
<Scan className="w-5 h-5 text-white" />
<h1 className="text-xl font-bold text-gray-900">Scan Grading</h1>
<p className="text-sm text-gray-600">Chấm điểm từ bài scan</p>
<div className="flex items-center gap-2">
  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
    <Upload className="w-4 h-4 inline mr-2" />
    Upload bài
  </button>
</div>
```

---

## 🎯 Quick Implementation

### Step 1: Find and Replace
For each page, find the generic header and replace with the customized version from above.

### Step 2: Add Required Icons
Make sure to import the icons at the top of each file:
```tsx
import {
  Grid3x3, Database, FileText, Clock, Users, Calendar,
  BookOpen, CheckCircle2, MessageSquare, Camera, Upload,
  Sparkles, CheckCircle, BarChart3, Route, Layers, Plus,
  Activity, Eye, User, Edit, List, Save, RefreshCw, Send
} from "lucide-react"
```

### Step 3: Test
Open each page in browser and verify the header looks correct.

---

## ✅ Completion Checklist

- [ ] All 38 pages have customized headers
- [ ] All icons are imported
- [ ] All titles are accurate
- [ ] All descriptions are clear
- [ ] All action buttons work
- [ ] All pages tested in browser

---

**Status:** 📝 Ready to implement  
**Estimated Time:** 2-3 hours for all 38 pages  
**Priority:** HIGH - Final step to 100% completion!
