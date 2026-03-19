# Question Bank - Redesigned Guide

## ✅ Redesign Instructions

Trang question-bank cần được thiết kế lại theo phong cách mới giống teacher dashboard.

---

## 🎨 New Design Specification

### Light Theme
- **Background**: `bg-gradient-to-br from-slate-50 to-blue-50`
- **Cards**: White với `shadow-sm border border-gray-100`
- **Text**: `text-gray-900` và `text-gray-600`
- **Accent**: Purple-600 cho primary actions

### Layout Structure

```
┌─────────────────────────────────────────────┐
│  Top Bar (sticky)                           │
│  📚 Ngân Hàng Câu Hỏi                       │
│     Quản lý và sinh hàng loạt với AI        │
│     [Total: 1,234] [Sinh hàng loạt]         │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  Action Cards (3 columns)                   │
│  ✨ Sinh tự động | 📤 Upload | 📋 Danh sách│
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  Quick Stats                                │
│  [Multiple Choice] [True/False] [Short]    │
└─────────────────────────────────────────────┘
```

---

## 🔧 Components to Update

### 1. Remove Old Components
```tsx
// ❌ Remove these
function GlassCard() { ... }
function AIButton() { ... }
```

### 2. Add New Header
```tsx
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-6 py-4">
    <div className="flex items-center justify-between">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ngân Hàng Câu Hỏi</h1>
          <p className="text-sm text-gray-600">Quản lý và sinh hàng loạt câu hỏi với AI</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Total Count */}
        <div className="px-4 py-2 rounded-lg bg-purple-50 border border-purple-200">
          <Database className="w-5 h-5 text-purple-600" />
          <span className="text-xl font-black text-purple-600">{totalQuestions}</span>
        </div>
        
        {/* Generate Button */}
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <Sparkles className="h-4 w-4" />
          Sinh hàng loạt
        </button>
      </div>
    </div>
  </div>
</div>
```

### 3. Update Action Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Generate Card */}
  <div 
    onClick={() => setGenerateOpen(true)}
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-purple-200 transition-all group"
  >
    <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-200 group-hover:scale-110 transition-transform">
      <Sparkles className="w-6 h-6 text-purple-600" />
    </div>
    <h3 className="font-bold text-lg text-gray-900 mt-4">Sinh tự động</h3>
    <p className="text-sm text-gray-600 mt-2">
      Tạo hàng loạt câu hỏi theo chủ đề và khối lớp
    </p>
  </div>

  {/* Upload Card */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
      <Upload className="w-6 h-6 text-blue-600" />
    </div>
    <h3 className="font-bold text-lg text-gray-900 mt-4">Upload đề thi</h3>
    <p className="text-sm text-gray-600 mt-2">
      Upload file Word, PDF để trích xuất câu hỏi
    </p>
  </div>

  {/* List Card */}
  <div 
    onClick={() => router.push('/teacher/question-bank/list')}
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-green-200 transition-all"
  >
    <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center border border-green-200">
      <List className="w-6 h-6 text-green-600" />
    </div>
    <h3 className="font-bold text-lg text-gray-900 mt-4">Danh sách câu hỏi</h3>
    <p className="text-sm text-gray-600 mt-2">
      Xem và chỉnh sửa tất cả câu hỏi
    </p>
  </div>
</div>
```

---

## 🎨 Color Palette

### Primary Colors
```css
--purple-600: #9333ea   /* Main brand */
--purple-500: #a855f7   /* Hover states */
--purple-50:  #faf5ff   /* Light backgrounds */
```

### Semantic Colors
```css
--blue-500:  #3b82f6   /* Upload */
--blue-50:   #eff6ff   /* Upload bg */
--green-500: #22c55e   /* List */
--green-50:  #f0fdf4   /* List bg */
```

---

## 📝 File Changes

### Modified File
- `app/(dashboard)/(routes)/teacher/question-bank/page.tsx`

### Changes Required
1. ✅ Remove GlassCard component
2. ✅ Remove AIButton component
3. ✅ Add sticky top bar
4. ✅ Update action cards
5. ✅ Use Tailwind colors
6. ✅ Add hover effects

---

## 🎯 Key Changes

### Before (Dark Theme)
```tsx
glass-panel rounded-2xl p-6
bg-gradient-to-br from-[hsl(var(--primary))]
text-[hsl(var(--foreground))]
shadow-[var(--glow-primary)]
```

### After (Light Theme)
```tsx
bg-white rounded-xl shadow-sm border border-gray-100
bg-gradient-to-br from-purple-500 to-purple-600
text-gray-900
shadow-sm hover:shadow-md
```

---

**Status:** 📝 Ready to implement  
**Style:** Matching Teacher Dashboard  
**Priority:** High
