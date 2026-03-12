# Hướng dẫn Đồng bộ Giao diện Webapp

## 🎨 Chuẩn Giao diện Chung

### 1. Layout Structure

Tất cả các trang nên theo cấu trúc sau:

```tsx
<div className="flex flex-col h-full bg-gray-50">
  {/* Header */}
  <PageHeader
    title="Tên trang"
    description="Mô tả ngắn"
    actions={
      <>
        <Button>Action 1</Button>
        <Button>Action 2</Button>
      </>
    }
  />

  {/* Content */}
  <div className="flex-1 overflow-auto">
    <div className="container mx-auto px-6 py-6">
      {/* Nội dung trang */}
    </div>
  </div>
</div>
```

### 2. Components Chuẩn

#### Page Header
```tsx
import { PageHeader } from "@/components/layout/page-header"

<PageHeader
  title="Ngân hàng câu hỏi"
  description="Quản lý và sinh hàng loạt câu hỏi"
  actions={
    <Button onClick={handleClick}>
      <Plus className="h-4 w-4 mr-2" />
      Thêm mới
    </Button>
  }
/>
```

#### Stats Card
```tsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-blue-100 rounded-lg">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="font-semibold">Tiêu đề</h3>
    </div>
    <div className="text-3xl font-bold text-primary mb-1">123</div>
    <p className="text-sm text-muted-foreground">Mô tả thống kê</p>
  </CardContent>
</Card>
```

#### Action Card (Clickable)
```tsx
<Card className="cursor-pointer hover:shadow-lg transition-shadow">
  <CardContent className="p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-blue-100 rounded-lg">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="font-semibold">Tên action</h3>
    </div>
    <p className="text-sm text-muted-foreground">
      Mô tả chi tiết về action này
    </p>
  </CardContent>
</Card>
```

### 3. Color Palette

```typescript
// Background colors
bg-gray-50      // Page background
bg-white        // Card/Panel background
bg-gray-100     // Secondary background

// Brand colors
bg-blue-50      // Light blue backgrounds
bg-blue-100     // Icon backgrounds
text-blue-600   // Icon colors
text-blue-900   // Dark blue text

// Status colors
bg-green-100    // Success
bg-red-100      // Error/Danger
bg-yellow-100   // Warning
bg-gray-100     // Neutral/Disabled
```

### 4. Typography

```tsx
// Headings
text-2xl font-bold        // Page title
text-xl font-bold         // Section title
text-lg font-semibold     // Card title

// Body
text-base                 // Normal text
text-sm                   // Secondary text
text-xs                   // Caption/Helper text

// Colors
text-foreground           // Primary text
text-muted-foreground     // Secondary text
```

### 5. Spacing

```tsx
// Padding
p-3   // 12px - Small cards
p-4   // 16px - Medium cards
p-6   // 24px - Large sections

// Margin
m-4   // 16px - Between elements
m-6   // 24px - Between sections

// Gap
gap-2  // 8px  - Close items
gap-4  // 16px - Standard spacing
gap-6  // 24px - Wide spacing
```

### 6. Common Patterns

#### Data List
```tsx
<div className="space-y-4">
  {items.map((item) => (
    <Card key={item.id}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">{item.name}</h4>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <Button variant="outline" size="sm">Action</Button>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

#### Stats Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
  {stats.map((stat) => (
    <Card key={stat.label}>
      <CardContent className="p-6">
        <div className="text-sm text-muted-foreground mb-1">{stat.label}</div>
        <div className="text-3xl font-bold">{stat.value}</div>
        <div className="text-xs text-muted-foreground mt-1">{stat.change}</div>
      </CardContent>
    </Card>
  ))}
</div>
```

#### Action Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
  {actions.map((action) => (
    <Card key={action.title} className="cursor-pointer hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <action.icon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold">{action.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{action.description}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

### 7. Responsive Design

```tsx
// Grid layouts
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

// Container
container mx-auto px-6

// Hide/show on mobile
hidden md:block
md:hidden
```

### 8. Loading States

```tsx
{loading ? (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
) : (
  // Content
)}
```

### 9. Empty States

```tsx
<Card>
  <CardContent className="p-12 text-center">
    <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">Không có dữ liệu</h3>
    <p className="text-muted-foreground mb-4">
      Mô tả trạng thái trống
    </p>
    <Button onClick={handleAction}>
      <Plus className="h-4 w-4 mr-2" />
      Thêm mới
    </Button>
  </CardContent>
</Card>
```

### 10. Toast Notifications

```tsx
import { toast } from "react-hot-toast"

// Success
toast.success("Đã lưu thành công!")

// Error
toast.error("Không thể thực hiện thao tác")

// Loading
const loadingToast = toast.loading("Đang xử lý...")
toast.dismiss(loadingToast)
```

## 📋 Checklist Đồng bộ

Khi tạo/sửa trang, kiểm tra:

- [ ] Sử dụng `PageHeader` component
- [ ] Background màu `bg-gray-50`
- [ ] Container với `container mx-auto px-6`
- [ ] Cards với border và shadow phù hợp
- [ ] Typography đúng chuẩn (text-2xl, text-sm, v.v.)
- [ ] Spacing nhất quán (gap-4, p-6, m-4)
- [ ] Loading state
- [ ] Empty state
- [ ] Responsive design
- [ ] Toast notifications

## 🎯 Ví dụ Trang Chuẩn

```tsx
"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "react-hot-toast"

export default function ExamplePage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])

  const handleAction = async () => {
    setLoading(true)
    try {
      // Action logic
      toast.success("Thành công!")
    } catch (error) {
      toast.error("Thất bại")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <PageHeader
        title="Ví dụ"
        description="Trang ví dụ chuẩn"
        actions={
          <Button onClick={handleAction} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm mới
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : data.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Không có dữ liệu</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {/* Data items */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

## 📖 Tài liệu Tham khảo

- [Shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI Primitives](https://www.radix-ui.com)
