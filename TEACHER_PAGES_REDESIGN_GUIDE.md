# Teacher Pages - AI Dashboard Design Implementation

## 🎨 AI Dashboard Design Pattern

Dựa trên trang `/teacher/ai-dashboard`, đây là design pattern cần áp dụng cho các trang còn lại:

---

## 📐 Core Design Elements

### 1. Background & Layout
```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
  {/* Content */}
</div>
```

### 2. Sticky Top Bar
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
          <p className="text-sm text-gray-600">Page subtitle/description</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Stats, buttons, etc. */}
      </div>
    </div>
  </div>
</div>
```

### 3. Main Content Area
```tsx
<div className="max-w-7xl mx-auto px-6 py-6">
  {/* Stats Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    {/* Stat cards here */}
  </div>

  {/* Main Content */}
  {/* Tables, lists, forms, etc. */}
</div>
```

### 4. Stat Cards
```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  <div className="flex items-center justify-between mb-3">
    <div className="w-12 h-12 rounded-lg bg-{color}-50 flex items-center justify-center">
      <Icon className="w-6 h-6 text-{color}-500" />
    </div>
    <span className="text-2xl font-bold text-gray-900">{value}</span>
  </div>
  <div className="text-sm text-gray-600">{label}</div>
</div>
```

### 5. Action Cards
```tsx
<div
  onClick={handleClick}
  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-{color}-200 transition-all"
>
  <div className="w-12 h-12 rounded-lg bg-{color}-50 flex items-center justify-center border border-{color}-200">
    <Icon className="w-6 h-6 text-{color}-500" />
  </div>
  <h3 className="font-bold text-lg text-gray-900 mt-4">Title</h3>
  <p className="text-sm text-gray-600 mt-2">Description</p>
</div>
```

---

## 🎯 Pages to Update

### 1. `/teacher/exam-matrix` ✅

#### Current State
- Using NeumorphicCard, NeumorphicButton
- Dark theme with glass-panel
- HSL color variables

#### Required Changes
```tsx
// ❌ Remove imports
import { NeumorphicCard } from "@/components/ui/neumorphic-card"
import { NeumorphicButton } from "@/components/ui/neumorphic-button"
import { NeumorphicInput } from "@/components/ui/neumorphic-input"

// ✅ Add sticky header
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
      <Grid3x3 className="w-5 h-5 text-white" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-gray-900">Ma Trận Đề</h1>
      <p className="text-sm text-gray-600">Quản lý và số hóa ma trận đề thi</p>
    </div>
  </div>
</div>

// ✅ Update cards
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  {/* Content */}
</div>
```

---

### 2. `/teacher/question-bank` ✅

#### Current State
- Using GlassCard, AIButton components
- Dark theme with glass-panel
- HSL color variables

#### Required Changes
```tsx
// ❌ Remove components
function GlassCard() { ... }
function AIButton() { ... }

// ✅ Add sticky header
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
      <Database className="w-5 h-5 text-white" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-gray-900">Ngân Hàng Câu Hỏi</h1>
      <p className="text-sm text-gray-600">Quản lý và sinh hàng loạt với AI</p>
    </div>
  </div>
</div>

// ✅ Update action cards
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="w-12 h-12 rounded-lg bg-purple-50">
      <Sparkles className="w-6 h-6 text-purple-500" />
    </div>
    <h3 className="font-bold text-lg text-gray-900 mt-4">Sinh tự động</h3>
    <p className="text-sm text-gray-600 mt-2">Description</p>
  </div>
</div>
```

---

### 3. `/teacher/exams` ✅

#### Current State
- Using glass-panel, AI Native components
- Dark theme
- Gradient backgrounds

#### Required Changes
```tsx
// ✅ Add sticky header
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
      <FileText className="w-5 h-5 text-white" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-gray-900">Đề Thi</h1>
      <p className="text-sm text-gray-600">Quản lý và chấm điểm tự động</p>
    </div>
  </div>
</div>

// ✅ Update exam cards
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  {/* Exam content */}
</div>
```

---

### 4. `/teacher/online-exam-room` ✅

#### Current State
- Using glass-panel components
- Dark theme
- Complex UI with multiple sections

#### Required Changes
```tsx
// ✅ Add sticky header
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
      <Clock className="w-5 h-5 text-white" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-gray-900">Phòng Thi Online</h1>
      <p className="text-sm text-gray-600">Tổ chức và quản lý thi trực tuyến</p>
    </div>
  </div>
</div>

// ✅ Update sections
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
  {/* Section content */}
</div>
```

---

## 🎨 Color Scheme

### Primary Colors
```css
purple-500: #a855f7   /* Main brand color */
purple-600: #9333ea   /* Hover states */
purple-50:  #faf5ff   /* Light backgrounds */
```

### Semantic Colors
```css
blue-500:  #3b82f6   /* Info, upload */
blue-50:   #eff6ff
green-500: #22c55e   /* Success, lists */
green-50:  #f0fdf4
yellow-500: #eab308  /* Warnings */
yellow-50:  #fefce8
red-500:   #ef4444   /* Errors, alerts */
red-50:    #fef2f2
orange-500: #f97316  /* Engagement */
orange-50:  #fff7ed
```

### Neutral Colors
```css
gray-50:  #f9fafb     /* Card backgrounds */
gray-100: #f3f4f6     /* Borders */
gray-200: #e5e7eb     /* Dividers */
gray-600: #4b5563     /* Secondary text */
gray-900: #111827     /* Primary text */
```

---

## 🔧 Implementation Checklist

### For Each Page

#### Step 1: Remove Old Components
- [ ] Remove GlassCard
- [ ] Remove AIButton
- [ ] Remove NeumorphicCard
- [ ] Remove NeumorphicButton
- [ ] Remove NeumorphicInput

#### Step 2: Add Sticky Header
- [ ] Add `bg-white border-b border-gray-200 sticky top-0 z-10`
- [ ] Add purple gradient logo
- [ ] Add title + subtitle
- [ ] Add action buttons

#### Step 3: Update Main Container
- [ ] Add `bg-gradient-to-br from-slate-50 to-blue-50`
- [ ] Add `max-w-7xl mx-auto px-6 py-6`

#### Step 4: Update Cards
- [ ] Replace with `bg-white rounded-xl shadow-sm border border-gray-100`
- [ ] Update hover effects
- [ ] Update color scheme

#### Step 5: Update Stats
- [ ] Use colored backgrounds (`bg-blue-50`, etc.)
- [ ] Use Tailwind colors (`text-blue-500`, etc.)
- [ ] Standardize sizing (`w-12 h-12`)

#### Step 6: Update Buttons
- [ ] Primary: `bg-purple-600 text-white`
- [ ] Secondary: `text-gray-700 hover:bg-gray-100`
- [ ] Danger: `bg-red-500 text-white`

---

## 📊 Component Mapping

### Old → New

| Old Component | New Replacement |
|--------------|-----------------|
| `GlassCard` | `div.bg-white.rounded-xl.shadow-sm.border.border-gray-100` |
| `AIButton variant="primary"` | `button.bg-purple-600.text-white` |
| `AIButton variant="default"` | `button.text-gray-700.hover:bg-gray-100` |
| `NeumorphicCard` | `div.bg-white.rounded-xl.shadow-sm` |
| `NeumorphicButton` | `button.bg-purple-600.text-white` |
| `glass-panel` | `bg-white rounded-xl shadow-sm border border-gray-100` |
| `gradient-text` | `text-purple-600` or `text-gray-900` |
| `shadow-[var(--glow-primary)]` | `shadow-sm` or `shadow-md` |
| `text-[hsl(var(--foreground))]` | `text-gray-900` |
| `text-[hsl(var(--muted-foreground))]` | `text-gray-600` |

---

## 🎯 Quick Start Template

```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "lucide-react"

export default function PageName() {
  const router = useRouter()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load data
  }, [])

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
                <p className="text-sm text-gray-600">Page subtitle</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Action buttons */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Stat cards */}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* Content */}
        </div>
      </div>
    </div>
  )
}
```

---

## ✅ Success Criteria

### Visual Check
- [ ] Light background (slate-50 to blue-50)
- [ ] White cards với shadow-sm
- [ ] Purple gradient logos
- [ ] Gray text (600/900)
- [ ] Consistent spacing

### Code Check
- [ ] No glass-panel classes
- [ ] No HSL color variables
- [ ] No neumorphic components
- [ ] Using Tailwind colors
- [ ] Sticky header present

### Functionality Check
- [ ] All buttons work
- [ ] All links navigate correctly
- [ ] Loading states present
- [ ] Error handling works
- [ ] Responsive on mobile

---

## 📚 Reference Files

### Good Examples
- `/teacher/dashboard/page.tsx` ✅
- `/teacher/analytics/page.tsx` ✅
- `/teacher/emotion-map/_EmotionMapContent.tsx` ✅
- `/teacher/ai-dashboard/page.tsx` ✅

### Files to Update
- `/teacher/exam-matrix/page.tsx` ⏳
- `/teacher/question-bank/page.tsx` ⏳
- `/teacher/exams/page.tsx` ⏳
- `/teacher/online-exam-room/page.tsx` ⏳

---

**Status:** 📝 Ready to implement  
**Priority:** High  
**Estimated Time:** 2-3 hours per page
