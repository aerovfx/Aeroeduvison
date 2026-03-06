# Vision Tracker Theme - Hướng Dẫn Sử Dụng

## 🎨 Tổng Quan

Vision Tracker Theme là một design system minimalist với neumorphic styling và gradient tím đẹp mắt.

### Đặc Điểm Chính:
- **Minimalist**: Spacing rộng rãi, clean design
- **Neumorphic**: Soft shadows tạo chiều sâu 3D
- **Purple Gradient**: #667eea → #764ba2
- **Background**: #e0e5ec (xám nhạt neumorphic)
- **Responsive**: Bento grid layout tự động điều chỉnh

---

## 📦 Installation

Theme đã được import sẵn trong `app/layout.tsx`:

```tsx
import '../styles/vision-tracker-theme.css'
```

---

## 🧩 Components

### 1. BentoCard - Card Bento Grid

```tsx
import { BentoCard } from '@/components/ui/vision-tracker';

<BentoCard
  title="Tiêu Đề"
  icon="📊"
  size="small" // small | medium | large | wide | full
  badge="New"
>
  {/* Nội dung */}
</BentoCard>
```

**Sizes:**
- `small`: 4 columns
- `medium`: 4 columns, 2 rows
- `large`: 8 columns, 2 rows
- `wide`: 6 columns
- `full`: 12 columns (full width)

### 2. MetricCard - Hiển Thị Số Liệu

```tsx
import { MetricCard } from '@/components/ui/vision-tracker';

<MetricCard
  value="85%"
  label="Độ Chính Xác"
  icon="🎯"
  size="medium" // small | medium | large
/>
```

### 3. ChartContainer - Container Cho Charts

```tsx
import { ChartContainer } from '@/components/ui/vision-tracker';

<ChartContainer minHeight={200}>
  <canvas id="myChart"></canvas>
</ChartContainer>
```

### 4. VisionButton - Button Với Gradient

```tsx
import { VisionButton } from '@/components/ui/vision-tracker';

<VisionButton
  onClick={handleClick}
  variant="primary" // primary | secondary
>
  Click Me
</VisionButton>
```

### 5. VisionInput - Input Field

```tsx
import { VisionInput } from '@/components/ui/vision-tracker';

<VisionInput
  value={text}
  onChange={(e) => setText(e.target.value)}
  placeholder="Nhập text..."
/>
```

### 6. VisionCard - Simple Card

```tsx
import { VisionCard } from '@/components/ui/vision-tracker';

<VisionCard onClick={handleClick}>
  {/* Nội dung */}
</VisionCard>
```

---

## 📐 Layout Examples

### Basic Page Structure

```tsx
'use client';

import { BentoCard, MetricCard } from '@/components/ui/vision-tracker';

export default function MyPage() {
  return (
    <div className="vision-container">
      <div className="vision-header">
        <h1>🎯 Trang Của Tôi</h1>
        <p>Mô tả ngắn gọn về trang</p>
        <div className="status-badge">
          <span className="status-dot"></span>
          <span>Đang Hoạt Động</span>
        </div>
      </div>

      <div className="bento-grid">
        <BentoCard title="Số Liệu 1" icon="📊" size="small">
          <MetricCard value="125" label="Users" />
        </BentoCard>

        <BentoCard title="Biểu Đồ" icon="📈" size="wide">
          <ChartContainer>
            {/* Your chart here */}
          </ChartContainer>
        </BentoCard>

        <BentoCard title="Hoạt Động" icon="📝" size="full">
          <div className="activity-log">
            <div className="activity-item">
              [12:00] Người dùng đã đăng nhập
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
```

### Advanced Grid Layout

```tsx
<div className="bento-grid">
  {/* Large video/main content */}
  <BentoCard title="Main Content" icon="📹" size="large">
    {/* 8 columns x 2 rows */}
  </BentoCard>

  {/* Medium sidebar */}
  <BentoCard title="Sidebar" icon="📊" size="medium">
    {/* 4 columns x 2 rows */}
  </BentoCard>

  {/* Three small cards */}
  <BentoCard title="Metric 1" icon="🎯" size="small">
    <MetricCard value="85%" label="Progress" />
  </BentoCard>

  <BentoCard title="Metric 2" icon="⚡" size="small">
    <MetricCard value="1234" label="Points" />
  </BentoCard>

  <BentoCard title="Metric 3" icon="🏆" size="small">
    <MetricCard value="42" label="Rank" />
  </BentoCard>

  {/* Two wide cards */}
  <BentoCard title="Chart 1" icon="📈" size="wide">
    {/* 6 columns */}
  </BentoCard>

  <BentoCard title="Chart 2" icon="📉" size="wide">
    {/* 6 columns */}
  </BentoCard>

  {/* Full width footer */}
  <BentoCard title="Activity Log" icon="📝" size="full">
    {/* 12 columns */}
  </BentoCard>
</div>
```

---

## 🎨 CSS Classes

### Container & Layout
- `.vision-container` - Main container (max-width: 1600px)
- `.vision-header` - Page header with center alignment
- `.bento-grid` - 12-column responsive grid

### Cards
- `.bento-item` - Bento grid item
- `.vision-card` - Simple card with hover effect
- `.item-title` - Card title with icon
- `.title-icon` - Icon container with gradient

### Metrics
- `.metric` - Metric display container
- `.metric-value` - Large gradient number
- `.metric-label` - Small label text

### Buttons & Inputs
- `.vision-button` - Primary gradient button
- `.vision-button-secondary` - Secondary neumorphic button
- `.vision-input` - Neumorphic input field

### Badges & Status
- `.status-badge` - Status indicator with dot
- `.status-dot` - Pulsing dot indicator
- `.info-badge` - Small info badge

### Activity Log
- `.activity-log` - Container for activity items
- `.activity-item` - Individual activity entry with slide-in animation

### Charts
- `.chart-container` - Container for Chart.js or similar

---

## 🌈 Color Variables

```css
:root {
  /* Gradients */
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --bg-neumorphic: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);

  /* Colors */
  --bg-base: #e0e5ec;
  --text-primary: #4a5568;
  --text-secondary: #718096;
  --purple-light: #667eea;
  --purple-dark: #764ba2;

  /* Shadows */
  --shadow-dark: rgba(163, 177, 198, 0.7);
  --shadow-light: rgba(255, 255, 255, 0.95);
  --shadow-inset: rgba(163, 177, 198, 0.1);

  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 20px;
  --spacing-lg: 28px;
  --spacing-xl: 40px;

  /* Border Radius */
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 28px;
  --radius-xl: 32px;
}
```

---

## 📱 Responsive Breakpoints

```css
/* Desktop: 12 columns */
@media (max-width: 1200px) {
  /* Tablet: Adjust large items */
  .item-large { grid-column: span 12; }
  .item-medium { grid-column: span 6; }
}

@media (max-width: 768px) {
  /* Mobile: Single column */
  .bento-grid { grid-template-columns: 1fr; }
  .item-large, .item-medium, .item-small, .item-wide {
    grid-column: span 1;
  }
}
```

---

## 🎯 Best Practices

### 1. Use Bento Grid for Layouts
```tsx
// ✅ Good
<div className="bento-grid">
  <BentoCard size="large">...</BentoCard>
</div>

// ❌ Bad
<div className="flex flex-wrap">
  <div className="w-full md:w-1/2">...</div>
</div>
```

### 2. Consistent Icon Usage
```tsx
// ✅ Good - Emoji icons
<BentoCard icon="🎯" title="Goals" />

// ✅ Also good - Lucide icons in content
import { Target } from 'lucide-react';
<Target className="text-purple-500" />
```

### 3. Metric Display
```tsx
// ✅ Good - Use MetricCard
<MetricCard value="85%" label="Accuracy" />

// ❌ Bad - Custom styling
<div className="text-4xl font-bold">85%</div>
```

### 4. Activity Logs
```tsx
// ✅ Good
<div className="activity-log">
  {activities.map(item => (
    <div key={item.id} className="activity-item">
      [{item.time}] {item.message}
    </div>
  ))}
</div>
```

---

## 🚀 Migration Guide

### Updating Existing Page

**Before:**
```tsx
export default function MyPage() {
  return (
    <div className="p-6 bg-white">
      <h1 className="text-2xl font-bold">My Page</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-100 p-4 rounded">
          Content
        </div>
      </div>
    </div>
  );
}
```

**After:**
```tsx
import { BentoCard } from '@/components/ui/vision-tracker';

export default function MyPage() {
  return (
    <div className="vision-container">
      <div className="vision-header">
        <h1>✨ My Page</h1>
        <p>Description here</p>
      </div>

      <div className="bento-grid">
        <BentoCard title="Content" icon="📊" size="small">
          Content
        </BentoCard>
      </div>
    </div>
  );
}
```

---

## 🎨 Examples from Vision Tracker

Xem ví dụ hoàn chỉnh tại:
```
/app/(dashboard)/(routes)/dashboard/vision-tracker/page.tsx
```

Các tính năng được demo:
- ✅ Bento grid layout 12 columns
- ✅ Responsive design
- ✅ Gradient icons with shadow
- ✅ Metric cards với animation
- ✅ Chart containers
- ✅ Activity log với slide-in effect
- ✅ Neumorphic cards với hover effects
- ✅ Status badges với pulsing dots

---

## 🐛 Troubleshooting

### CSS không load
```tsx
// Đảm bảo import trong app/layout.tsx
import '../styles/vision-tracker-theme.css'
```

### Grid không responsive
```tsx
// Đảm bảo sử dụng class đúng
<div className="bento-grid">  {/* ✅ */}
<div className="grid">        {/* ❌ */}
```

### Components không tìm thấy
```tsx
// Import từ đúng path
import { BentoCard } from '@/components/ui/vision-tracker';  {/* ✅ */}
import { BentoCard } from '@/components/BentoCard';         {/* ❌ */}
```

---

## 📚 Resources

- Design Inspiration: Vision Tracker Page
- Color Palette: Purple Gradient (#667eea → #764ba2)
- Font: Inter (system font stack)
- Icons: Emoji + Lucide React

---

**Tạo bởi:** Vision Tracker Theme System
**Version:** 1.0.0
**Last Updated:** 2025-12-20
