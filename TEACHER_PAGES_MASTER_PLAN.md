# 🎨 Teacher Pages Redesign - Master Plan

## ✅ Status Overview

### Completed (4/40 pages) - 10%
- ✅ `/teacher/dashboard` - Redesigned
- ✅ `/teacher/analytics` - Redesigned
- ✅ `/teacher/emotion-map` - Redesigned
- ✅ `/teacher/ai-dashboard` - Reference design

### Remaining (36/40 pages) - 90%

---

## 📋 Priority Levels

### 🔴 HIGH Priority (10 pages)
Core teaching features used daily:

1. `/teacher/exam-matrix/page.tsx` - Ma trận đề thi
2. `/teacher/question-bank/page.tsx` - Ngân hàng câu hỏi
3. `/teacher/exams/page.tsx` - Đề thi
4. `/teacher/online-exam-room/page.tsx` - Phòng thi online
5. `/teacher/classes/page.tsx` - Quản lý lớp
6. `/teacher/calendar/page.tsx` - Lịch biểu
7. `/teacher/assignments/page.tsx` - Bài tập
8. `/teacher/grading/page.tsx` - Chấm điểm
9. `/teacher/interaction-center/page.tsx` - Tương tác
10. `/teacher/camera-management/page.tsx` - Camera AI

### 🟡 MEDIUM Priority (15 pages)
Important but less frequent:

11. `/teacher/document-digitization/page.tsx` - Số hóa tài liệu
12. `/teacher/exam-generator/page.tsx` - Sinh đề thi
13. `/teacher/exam-grading/page.tsx` - Chấm thi
14. `/teacher/exam-reports/page.tsx` - Báo cáo thi
15. `/teacher/latex-documents/page.tsx` - LaTeX documents
16. `/teacher/learning-path-builder/page.tsx` - Learning path
17. `/teacher/multi-disciplinary-paths/page.tsx` - Multi-disciplinary
18. `/teacher/create-module/page.tsx` - Tạo module
19. `/teacher/environment-monitoring/page.tsx` - Environment
20. `/teacher/vision/object-detection/page.tsx` - Vision AI
21. `/teacher/student/[studentId]/page.tsx` - Student profile
22. `/teacher/classes/[id]/page.tsx` - Class detail
23. `/teacher/exam-matrix/[id]/page.tsx` - Matrix detail
24. `/teacher/exam-matrix/[id]/review/page.tsx` - Matrix review
25. `/teacher/exam-matrix/[id]/edit/page.tsx` - Matrix edit

### 🟢 LOW Priority (11 pages)
Specialized features:

26. `/teacher/question-bank/list/page.tsx` - Question list
27. `/teacher/question-bank/create/page.tsx` - Create question
28. `/teacher/question-bank/edit/[id]/page.tsx` - Edit question
29. `/teacher/exams/create/page.tsx` - Create exam
30. `/teacher/exam-preview/[exam_id]/page.tsx` - Exam preview
31. `/teacher/latex-documents/[id]/page.tsx` - LaTeX detail
32. `/teacher/document-digitization/[id]/review/page.tsx` - Review
33. `/teacher/agent/page.tsx` - Agent settings
34. `/teacher/system-flow/page.tsx` - System flow
35. `/teacher/ai-dashboard/page.tsx` - Already done
36. `/teacher/grading/_components/ScanGrading.tsx` - Component

---

## 🎨 Design Pattern (AI Dashboard Style)

### 1. Background & Layout
```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
  {/* Content */}
</div>
```

### 2. Sticky Top Bar (REQUIRED for all pages)
```tsx
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-6 py-4">
    <div className="flex items-center justify-between">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Page Title</h1>
          <p className="text-sm text-gray-600">Page subtitle</p>
        </div>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Buttons, stats, etc. */}
      </div>
    </div>
  </div>
</div>
```

### 3. Main Content
```tsx
<div className="max-w-7xl mx-auto px-6 py-6">
  {/* Stats Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    {/* Stat cards */}
  </div>
  
  {/* Main Content */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    {/* Tables, lists, forms, etc. */}
  </div>
</div>
```

---

## 🔧 Automated Redesign Script

### Run the Script
```bash
cd /Users/pixibox/Aeroeduvison
chmod +x scripts/redesign-teacher-pages.sh
./scripts/redesign-teacher-pages.sh
```

### What It Does
- ✅ Replaces `glass-panel` → `bg-white rounded-xl shadow-sm`
- ✅ Replaces HSL colors → Tailwind colors
- ✅ Replaces dark bg → `slate-50 to-blue-50`
- ✅ Updates text colors → `text-gray-900/600`

### Manual Steps After Script
1. ✅ Add sticky header to each page
2. ✅ Update button styles
3. ✅ Fix icon colors
4. ✅ Test in browser

---

## 📊 Component Replacement Guide

### Old → New Components

| Component | Replace With |
|-----------|--------------|
| `GlassCard` | `div.bg-white.rounded-xl.shadow-sm` |
| `NeumorphicCard` | `div.bg-white.rounded-xl` |
| `AIButton` | `button.bg-purple-600` |
| `glass-panel` | `bg-white rounded-xl shadow-sm` |
| `gradient-text` | `text-purple-600` |
| `shadow-[var(--glow)]` | `shadow-sm` or `shadow-md` |

### Color Replacements

| Old | New |
|-----|-----|
| `hsl(var(--foreground))` | `text-gray-900` |
| `hsl(var(--muted-foreground))` | `text-gray-600` |
| `hsl(var(--primary))` | `purple-600` |
| `hsl(var(--success))` | `green-500` |
| `hsl(var(--destructive))` | `red-500` |
| `hsl(var(--warning))` | `yellow-500` |
| `hsl(var(--info))` | `blue-500` |

---

## 📝 Implementation Checklist

### For Each Page

#### Step 1: Run Script
```bash
./scripts/redesign-teacher-pages.sh
```

#### Step 2: Add Sticky Header
```tsx
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
      <PageIcon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-gray-900">Page Title</h1>
      <p className="text-sm text-gray-600">Description</p>
    </div>
  </div>
</div>
```

#### Step 3: Update Main Container
```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
  <div className="max-w-7xl mx-auto px-6 py-6">
    {/* Content */}
  </div>
</div>
```

#### Step 4: Update Cards
```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  {/* Card content */}
</div>
```

#### Step 5: Update Buttons
```tsx
// Primary
<button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
  Action
</button>

// Secondary
<button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
  Cancel
</button>
```

#### Step 6: Test
- [ ] Open page in browser
- [ ] Check responsive on mobile
- [ ] Test all buttons
- [ ] Verify loading states
- [ ] Check error handling

---

## 🎯 Quick Start Templates

### Template 1: List Page
```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "lucide-react"

export default function ListPage() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const res = await fetch('/api/items')
      const data = await res.json()
      setItems(data.items)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Page Title</h1>
                <p className="text-sm text-gray-600">Description</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/create')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Content */}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Template 2: Stats/Dashboard Page
```tsx
<div className="max-w-7xl mx-auto px-6 py-6">
  {/* Stats Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 rounded-lg bg-blue-50">
          <Icon className="w-6 h-6 text-blue-500" />
        </div>
        <span className="text-2xl font-bold text-gray-900">123</span>
      </div>
      <div className="text-sm text-gray-600">Label</div>
    </div>
    {/* More stat cards... */}
  </div>

  {/* Main Content */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    {/* Tables, charts, etc. */}
  </div>
</div>
```

---

## 📈 Progress Tracking

### Phase 1: HIGH Priority (Week 1)
- [ ] exam-matrix
- [ ] question-bank
- [ ] exams
- [ ] online-exam-room
- [ ] classes
- [ ] calendar
- [ ] assignments
- [ ] grading
- [ ] interaction-center
- [ ] camera-management

### Phase 2: MEDIUM Priority (Week 2)
- [ ] document-digitization
- [ ] exam-generator
- [ ] exam-grading
- [ ] exam-reports
- [ ] latex-documents
- [ ] learning-path-builder
- [ ] multi-disciplinary-paths
- [ ] create-module
- [ ] environment-monitoring
- [ ] vision/object-detection
- [ ] student/[id]
- [ ] classes/[id]
- [ ] exam-matrix/[id] pages

### Phase 3: LOW Priority (Week 3)
- [ ] question-bank sub-pages
- [ ] exams sub-pages
- [ ] latex sub-pages
- [ ] Other specialized pages

---

## 🎉 Success Criteria

### Visual Consistency
- ✅ All pages have sticky purple header
- ✅ All pages use slate-50 to blue-50 background
- ✅ All cards are white with shadow-sm
- ✅ All text uses gray-900/600
- ✅ All buttons use purple-600 for primary

### Code Quality
- ✅ No glass-panel classes
- ✅ No HSL color variables
- ✅ No neumorphic components
- ✅ Using standard Tailwind
- ✅ Consistent spacing

### User Experience
- ✅ Fast loading
- ✅ Responsive design
- ✅ Clear visual hierarchy
- ✅ Consistent navigation
- ✅ Accessible

---

## 📚 Resources

### Documentation
- `TEACHER_PAGES_REDESIGN_GUIDE.md` - Detailed guide
- `TEACHER_DASHBOARD_REDESIGNED.md` - Dashboard example
- `ANALYTICS_REDESIGNED.md` - Analytics example
- `EMOTION_MAP_REDESIGNED.md` - Emotion map example

### Scripts
- `scripts/redesign-teacher-pages.sh` - Auto-update script

### Reference Pages
- `/teacher/dashboard` - ✅ Completed
- `/teacher/analytics` - ✅ Completed
- `/teacher/emotion-map` - ✅ Completed
- `/teacher/ai-dashboard` - ✅ Reference

---

**Status:** 🚀 Ready to implement  
**Total Pages:** 40  
**Completed:** 4 (10%)  
**Remaining:** 36 (90%)  
**Estimated Time:** 2-3 weeks for all pages
