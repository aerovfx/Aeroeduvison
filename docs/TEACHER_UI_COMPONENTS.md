# Teacher UI Components Documentation

## 📋 Tổng Quan

Tài liệu này mô tả các component UI chung được tạo ra để đảm bảo tính nhất quán và hiện đại cho các trang trong Teacher Dashboard.

---

## 🎨 Design System

### Layout Pattern

Tất cả các trang teacher sử dụng layout pattern thống nhất:

```tsx
<div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50 min-h-screen">
  {/* Header */}
  <PageHeader ... />
  
  {/* Filters */}
  <PageFilters ... />
  
  {/* Content */}
  <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
    {/* Loading, Empty, or Content */}
  </div>
</div>
```

### Color Scheme

- **Background**: `bg-gray-50` - Light gray background cho container
- **Cards**: `bg-white rounded-lg border shadow-sm` - White cards với border và shadow
- **Primary Actions**: `bg-primary` - Primary color cho main actions
- **Status Colors**:
  - Success: `bg-green-100 text-green-800`
  - Warning: `bg-yellow-100 text-yellow-800`
  - Error: `bg-red-100 text-red-800`
  - Info: `bg-blue-100 text-blue-800`

### Spacing

- **Container Padding**: `px-4 sm:px-6 py-6`
- **Component Gap**: `space-y-6`
- **Button Gap**: `gap-2`
- **Icon Gap**: `gap-2` hoặc `gap-4`

---

## 📦 Components

### 1. PageHeader

**Location**: `components/teacher/PageHeader.tsx`

**Purpose**: Header thống nhất cho tất cả các trang với title, description, icon, badge và actions.

**Props**:

```typescript
interface PageHeaderProps {
  title: string                    // Tiêu đề trang
  description?: string             // Mô tả ngắn gọn
  icon?: ReactNode                 // Icon hiển thị bên cạnh title
  badge?: string                   // Badge text (ví dụ: "AI", "New")
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  actions?: ReactNode              // Action buttons (thường là Create button)
  className?: string               // Custom className
}
```

**Example**:

```tsx
<PageHeader
  title="Ngân hàng câu hỏi"
  description="Quản lý và tổ chức câu hỏi cho các kỳ thi. Tạo, chỉnh sửa và duyệt câu hỏi."
  icon={<HelpCircle className="h-6 w-6" />}
  actions={
    <Button onClick={() => router.push("/teacher/question-bank/create")} size="lg" className="gap-2">
      <Plus className="h-4 w-4" />
      Tạo câu hỏi mới
    </Button>
  }
/>
```

**Features**:
- ✅ Responsive design (flex-col trên mobile, flex-row trên desktop)
- ✅ Icon với background highlight
- ✅ Badge support cho labels như "AI", "New", etc.
- ✅ Actions section cho buttons
- ✅ Consistent spacing và typography

---

### 2. PageFilters

**Location**: `components/teacher/PageFilters.tsx`

**Purpose**: Search bar và filters thống nhất với responsive design.

**Props**:

```typescript
interface PageFiltersProps {
  searchQuery: string              // Search input value
  onSearchChange: (value: string) => void  // Search change handler
  onSearchSubmit?: (e: React.FormEvent) => void  // Optional submit handler
  placeholder?: string             // Search placeholder (default: "Tìm kiếm...")
  filters?: ReactNode              // Additional filter components (Select, etc.)
  className?: string               // Custom className
}
```

**Example**:

```tsx
<PageFilters
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  onSearchSubmit={handleSearch}
  placeholder="Tìm kiếm câu hỏi..."
  filters={
    <>
      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Tất cả">Tất cả</SelectItem>
          <SelectItem value="Đã duyệt">Đã duyệt</SelectItem>
        </SelectContent>
      </Select>
    </>
  }
/>
```

**Features**:
- ✅ Search icon và clear button
- ✅ Responsive layout (flex-col trên mobile)
- ✅ Support multiple filters
- ✅ Auto-submit on Enter
- ✅ Clear search functionality

---

### 3. LoadingSkeleton

**Location**: `components/teacher/LoadingSkeleton.tsx`

**Purpose**: Loading states đẹp mắt thay vì spinner đơn giản.

**Components**:

#### TableLoadingSkeleton

```tsx
<TableLoadingSkeleton rows={5} />
```

Hiển thị skeleton cho table với số rows chỉ định.

#### CardLoadingSkeleton

```tsx
<CardLoadingSkeleton />
```

Hiển thị skeleton cho card content.

**Example**:

```tsx
{loading ? (
  <div className="p-6">
    <TableLoadingSkeleton rows={5} />
  </div>
) : (
  // Content
)}
```

**Features**:
- ✅ Animated pulse effect
- ✅ Realistic skeleton shapes
- ✅ Configurable rows/count
- ✅ Consistent với design system

---

### 4. EmptyState

**Location**: `components/teacher/EmptyState.tsx`

**Purpose**: Empty states với icon, message và action button.

**Props**:

```typescript
interface EmptyStateProps {
  icon?: ReactNode                 // Icon hiển thị
  title: string                    // Title message
  description?: string              // Description text
  action?: {                        // Optional action button
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  className?: string               // Custom className
}
```

**Example**:

```tsx
<EmptyState
  icon={<FileText className="h-12 w-12" />}
  title="Chưa có tài liệu nào"
  description="Bắt đầu bằng cách tải lên tài liệu để số hóa với AI"
  action={{
    label: "Tải tài liệu lên",
    icon: <Upload className="h-4 w-4" />,
    onClick: () => setIsUploadModalOpen(true)
  }}
/>
```

**Features**:
- ✅ Centered layout
- ✅ Icon với background
- ✅ Clear messaging
- ✅ Action button với icon
- ✅ Responsive design

---

## 📄 Pages Updated

### 1. Document Digitization

**Path**: `app/(dashboard)/(routes)/teacher/document-digitization/page.tsx`

**Updates**:
- ✅ Sử dụng `PageHeader` với badge "AI"
- ✅ Sử dụng `PageFilters` cho search
- ✅ Sử dụng `TableLoadingSkeleton` cho loading
- ✅ Sử dụng `EmptyState` khi không có documents
- ✅ Improved spacing và layout
- ✅ Breadcrumbs styling

**Before**:
```tsx
<div className="border-b bg-white">
  <div className="container mx-auto px-6 py-4">
    <h1 className="text-2xl font-bold">Số hoá tài liệu</h1>
  </div>
</div>
```

**After**:
```tsx
<PageHeader
  title="Số hoá tài liệu"
  description="Quản lý và số hoá tài liệu với AI..."
  icon={<Upload className="h-6 w-6" />}
  badge="AI"
  actions={<Button>...</Button>}
/>
```

---

### 2. Question Bank

**Path**: `app/(dashboard)/(routes)/teacher/question-bank/page.tsx`

**Updates**:
- ✅ Sử dụng `PageHeader` với icon HelpCircle
- ✅ Sử dụng `PageFilters` với status và type filters
- ✅ Sử dụng `TableLoadingSkeleton` và `EmptyState`
- ✅ Improved responsive design
- ✅ Consistent button styles

---

### 3. Exams

**Path**: `app/(dashboard)/(routes)/teacher/exams/page.tsx`

**Updates**:
- ✅ Sử dụng `PageHeader` với badge "AI"
- ✅ Sử dụng `PageFilters` với status và type filters
- ✅ Sử dụng `TableLoadingSkeleton` và `EmptyState`
- ✅ Consistent layout với các trang khác

---

## 🎯 Best Practices

### 1. Component Usage

**✅ DO**:
- Sử dụng `PageHeader` cho tất cả các trang
- Sử dụng `PageFilters` cho search và filters
- Sử dụng `LoadingSkeleton` thay vì spinner đơn giản
- Sử dụng `EmptyState` với action button

**❌ DON'T**:
- Tạo custom header cho mỗi trang
- Hardcode search bar
- Chỉ hiển thị "Loading..." text
- Hiển thị empty state không có action

### 2. Styling

**✅ DO**:
- Sử dụng `bg-gray-50` cho container background
- Sử dụng `bg-white rounded-lg border shadow-sm` cho cards
- Sử dụng `px-4 sm:px-6 py-6` cho container padding
- Sử dụng `space-y-6` cho component gaps

**❌ DON'T**:
- Sử dụng custom colors không có trong design system
- Hardcode spacing values
- Mix different border radius
- Inconsistent shadows

### 3. Responsive Design

**✅ DO**:
- Sử dụng `sm:` breakpoints cho mobile-first
- Test trên mobile và desktop
- Sử dụng `flex-col sm:flex-row` cho responsive layouts
- Sử dụng `w-full sm:w-[180px]` cho filter selects

**❌ DON'T**:
- Ignore mobile experience
- Hardcode widths
- Assume desktop-only usage

---

## 🔄 Migration Guide

### Updating Existing Pages

1. **Import components**:
```tsx
import { PageHeader } from "@/components/teacher/PageHeader"
import { PageFilters } from "@/components/teacher/PageFilters"
import { TableLoadingSkeleton } from "@/components/teacher/LoadingSkeleton"
import { EmptyState } from "@/components/teacher/EmptyState"
```

2. **Replace header**:
```tsx
// Before
<div className="flex items-center justify-between">
  <h1 className="text-3xl font-bold">Title</h1>
  <Button>Action</Button>
</div>

// After
<PageHeader
  title="Title"
  description="Description"
  icon={<Icon />}
  actions={<Button>Action</Button>}
/>
```

3. **Replace search/filters**:
```tsx
// Before
<div className="flex gap-4">
  <Input placeholder="Search..." />
  <Select>...</Select>
</div>

// After
<PageFilters
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  filters={<Select>...</Select>}
/>
```

4. **Replace loading/empty states**:
```tsx
// Before
{loading ? (
  <Loader2 className="animate-spin" />
) : items.length === 0 ? (
  <p>No items</p>
) : (
  // Content
)}

// After
{loading ? (
  <TableLoadingSkeleton rows={5} />
) : items.length === 0 ? (
  <EmptyState
    icon={<Icon />}
    title="No items"
    action={{ label: "Create", onClick: handleCreate }}
  />
) : (
  // Content
)}
```

---

## 📊 Component Comparison

| Feature | Before | After |
|---------|--------|-------|
| **Header** | Custom HTML | `PageHeader` component |
| **Search** | Custom Input | `PageFilters` component |
| **Loading** | Simple spinner | `LoadingSkeleton` |
| **Empty State** | Plain text | `EmptyState` with action |
| **Consistency** | Varies by page | Unified design |
| **Responsive** | Inconsistent | Mobile-first |
| **Maintainability** | High | Low (reusable) |

---

## 🚀 Future Enhancements

### Planned Improvements

1. **Theme Support**
   - Dark mode variants
   - Custom color schemes
   - Accessibility improvements

2. **Advanced Filters**
   - Date range picker
   - Multi-select filters
   - Saved filter presets

3. **Enhanced Loading**
   - Progressive loading
   - Skeleton animations
   - Optimistic updates

4. **Empty States**
   - Different variants (error, no results, etc.)
   - Illustration support
   - Contextual help

---

## 📝 Changelog

### Version 1.0.0 (January 2025)

**Added**:
- `PageHeader` component
- `PageFilters` component
- `LoadingSkeleton` components
- `EmptyState` component

**Updated**:
- Document Digitization page
- Question Bank page
- Exams page

**Improved**:
- Consistent design system
- Responsive design
- Loading states
- Empty states

---

## 🔗 Related Documentation

- [Teacher Dashboard Guide](../Guide/TEACHER_INTERFACE_AUDIT.md)
- [Design System](../docs/DESIGN_SYSTEM.md)
- [Component Library](../components/README.md)

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: ✅ Active
