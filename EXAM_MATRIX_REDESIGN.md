# Exam Matrix Page - Redesigned

## ✅ Implementation Guide

Trang `/teacher/exam-matrix` cần được redesign theo AI Dashboard pattern.

---

## 🎨 New Design Specification

### 1. Sticky Header
```tsx
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
          <Grid3x3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ma Trận Đề Thi</h1>
          <p className="text-sm text-gray-600">Quản lý và số hóa ma trận đề thi</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <Plus className="w-4 h-4" /> Tạo ma trận
        </button>
      </div>
    </div>
  </div>
</div>
```

### 2. Action Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
  <div onClick={() => setIsDigitizeModalOpen(true)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
      <Upload className="w-6 h-6 text-blue-600" />
    </div>
    <h3 className="font-bold text-lg text-gray-900 mt-4">Số hóa ma trận</h3>
    <p className="text-sm text-gray-600 mt-2">Upload file để trích xuất ma trận</p>
  </div>

  <div onClick={() => router.push("/teacher/exam-matrix/create")} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-purple-200 transition-all">
    <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-200">
      <Plus className="w-6 h-6 text-purple-600" />
    </div>
    <h3 className="font-bold text-lg text-gray-900 mt-4">Tạo thủ công</h3>
    <p className="text-sm text-gray-600 mt-2">Tạo ma trận đề thi mới</p>
  </div>

  <div onClick={() => router.push("/teacher/exam-matrix/list")} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-green-200 transition-all">
    <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center border border-green-200">
      <List className="w-6 h-6 text-green-600" />
    </div>
    <h3 className="font-bold text-lg text-gray-900 mt-4">Danh sách</h3>
    <p className="text-sm text-gray-600 mt-2">Xem tất cả ma trận</p>
  </div>
</div>
```

### 3. Filter Bar
```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
  <div className="flex items-center gap-4">
    <div className="flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm ma trận..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>
    </div>
    <select
      value={examTypeFilter}
      onChange={(e) => setExamTypeFilter(e.target.value)}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
    >
      <option value="Tất cả loại đề">Tất cả loại</option>
      <option value="Kiểm tra 1 tiết">1 tiết</option>
      <option value="Kiểm tra giữa kỳ">Giữa kỳ</option>
      <option value="Kiểm tra cuối kỳ">Cuối kỳ</option>
    </select>
  </div>
</div>
```

### 4. Table
```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase">Tên ma trận</th>
          <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase">Loại</th>
          <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase">Loại đề</th>
          <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase">Ngày tạo</th>
          <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
          <th className="text-right p-4 text-xs font-semibold text-gray-600 uppercase">Hành động</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {filteredMatrices.map((matrix) => (
          <tr key={matrix.id} className="hover:bg-gray-50 transition-colors">
            <td className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{matrix.name}</div>
                  <div className="text-xs text-gray-500">{matrix.grade}</div>
                </div>
              </div>
            </td>
            <td className="p-4">
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                {matrix.type}
              </span>
            </td>
            <td className="p-4 text-sm text-gray-600">{matrix.examType || "-"}</td>
            <td className="p-4 text-sm text-gray-600">
              {new Date(matrix.createdAt).toLocaleDateString("vi-VN")}
            </td>
            <td className="p-4">
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                matrix.status === "Hoàn tất" ? "bg-green-100 text-green-700" :
                matrix.status === "Đang xử lý" ? "bg-blue-100 text-blue-700" :
                matrix.status === "Lỗi" ? "bg-red-100 text-red-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                {matrix.status}
              </span>
            </td>
            <td className="text-right p-4">
              <div className="flex justify-end gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Xem">
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Sửa">
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

---

## 🔧 Components to Remove

```tsx
// ❌ Remove these imports
import { NeumorphicCard } from "@/components/ui/neumorphic-card"
import { NeumorphicButton } from "@/components/ui/neumorphic-button"
import { NeumorphicInput } from "@/components/ui/neumorphic-input"

// ❌ Remove these components
function GlassCard() { ... }
function AIButton() { ... }
```

---

## 📝 Implementation Steps

1. ✅ Replace background with `from-slate-50 to-blue-50`
2. ✅ Add sticky header with purple gradient logo
3. ✅ Replace NeumorphicCard with white cards
4. ✅ Replace NeumorphicInput with standard input
5. ✅ Replace NeumorphicButton with standard buttons
6. ✅ Update table with new design
7. ✅ Update badges with Tailwind classes
8. ✅ Test in browser

---

## 🎨 Color Scheme

```tsx
// Primary
purple-600: Main actions
purple-500: Hover states
purple-50:  Light backgrounds

// Semantic
blue-500:  Upload, info
blue-50:   Upload backgrounds
green-500: Success, complete
green-50:  Success backgrounds
red-500:   Errors, delete
red-50:    Error backgrounds
gray-50:   Neutral backgrounds
```

---

**Status:** 📝 Ready to implement  
**Priority:** 🔴 HIGH  
**Estimated Time:** 30-45 minutes
