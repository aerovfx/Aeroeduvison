# AI Native UI Guide for Teacher Pages
## Aeroeduvison Teacher Account Interface

---

## 📋 Overview

This guide documents the AI Native UI design system implemented across all teacher account pages in the Aeroeduvison application. The design system features a dark-first glassmorphism aesthetic with modern, polished buttons and components.

---

## 🎨 Design Principles

### 1. **Dark-First Design**
- Background: Deep space blue `hsl(225 15% 6%)`
- Glass panels with backdrop blur
- Subtle gradients and glows
- High contrast for readability

### 2. **AI-Native Aesthetics**
- Glassmorphism panels with transparency
- Neon glow effects on interactive elements
- Smooth transitions and animations
- Modern, futuristic appearance

### 3. **Consistent Components**
- Unified button styles across all pages
- Standardized card layouts
- Consistent spacing and typography
- Cohesive color palette

---

## 🎯 Component Library

### Buttons

#### Primary Button (`ai-button-primary`)
```tsx
<button className="ai-button-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-[var(--glow-primary)] transition-all hover:shadow-[0_0_30px_rgba(120,100,255,0.35)]">
  <Icon className="w-5 h-5" />
  Action Text
</button>
```

**Features:**
- Purple gradient background
- Glow effect on hover
- Smooth shadow transitions
- Icon support

#### Secondary Button (`ai-button`)
```tsx
<button className="ai-button text-[hsl(var(--foreground))] px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.3)] transition-all hover:bg-white/10">
  <Icon className="w-5 h-5" />
  Action Text
</button>
```

**Features:**
- Transparent background
- Subtle border
- Hover state with background tint
- Versatile for secondary actions

#### Danger Button
```tsx
<button className="ai-button text-[hsl(var(--destructive))] px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border border-[hsl(var(--destructive)/0.3)] hover:border-[hsl(var(--destructive)/0.5)] hover:bg-[hsl(var(--destructive)/0.08)] transition-all">
  <Icon className="w-5 h-5" />
  Destructive Action
</button>
```

**Features:**
- Red color scheme
- Clear visual warning
- Consistent with design system

### Cards & Panels

#### Glass Panel
```tsx
<GlassCard>
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg">
      <Icon className="w-5 h-5" />
    </div>
    <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Card Title</h2>
  </div>
  {/* Content */}
</GlassCard>
```

**Features:**
- Glassmorphism effect
- Backdrop blur
- Subtle border
- Hover effects

#### Stat Box
```tsx
<StatBox
  label="Total Students"
  value={42}
  icon={<Users className="w-6 h-6" />}
  gradient="primary"
/>
```

**Features:**
- Gradient icon background
- Large value display
- Descriptive label
- Color-coded gradients

### Badges

#### AI Badge
```tsx
<AIBadge variant="default">Badge Text</AIBadge>
<AIBadge variant="success">Success</AIBadge>
<AIBadge variant="warning">Warning</AIBadge>
<AIBadge variant="danger">Danger</AIBadge>
```

**Variants:**
- `default`: Primary color
- `success`: Green/teal color
- `warning`: Yellow/orange color
- `danger`: Red color

### Inputs

#### AI Input
```tsx
<input
  type="text"
  className="ai-input w-full px-4 py-2.5 rounded-xl"
  placeholder="Enter text..."
/>
```

**Features:**
- Dark background
- Subtle border
- Focus glow effect
- Rounded corners

---

## 📄 Page-Specific Implementations

### 1. Teacher Dashboard (`/teacher/dashboard`)

**Key Components:**
- AI Teacher Dashboard header with gradient text
- Stats grid with 4 metric cards
- View tabs (Overview, Engagement, Emotion)
- Student table with AI badges
- Action buttons for each student

**Button Examples:**
```tsx
// Header actions
<button className="ai-button text-[hsl(var(--foreground))] px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2">
  <BarChart3 className="w-4 h-4" />
  Analytics
</button>

<button className="ai-button-primary text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2">
  <Users className="w-4 h-4" />
  Quản lý lớp
</button>

// Student actions
<button className="ai-button text-[hsl(var(--foreground))] p-2 rounded-xl">
  <Eye className="w-4 h-4" />
</button>

<button className="ai-button-primary text-white p-2 rounded-xl">
  <MessageSquare className="w-4 h-4" />
</button>
```

### 2. Grading Page (`/teacher/grading`)

**Key Components:**
- Upload section with drag & drop
- Bubble sheet form for answer keys
- Essay question editor
- AI grading buttons
- Export/Import actions

**Button Examples:**
```tsx
// AI Grading
<button className="ai-button-primary text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-[var(--glow-primary)]">
  <Sparkles className="w-3.5 h-3.5" />
  Chấm AI
</button>

// Save answer key
<button className="ai-button-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-[var(--glow-primary)]">
  <Save className="w-5 h-5" />
  Lưu đáp án
</button>

// Export JSON
<button className="ai-button text-[hsl(var(--foreground))] px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
  <Download className="w-5 h-5" />
  Xuất JSON
</button>

// Essay question actions
<button className="ai-button-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
  <Plus className="w-4 h-4" />
  Thêm câu
</button>
```

### 3. Analytics Page (`/teacher/analytics`)

**Key Components:**
- Time range selector
- Detailed analytics charts
- Student performance cards
- Export functionality

**Button Examples:**
```tsx
// Time range buttons
<button className="ai-button-primary text-white px-6 py-2.5 rounded-xl font-semibold">
  Tuần này
</button>

<button className="ai-button text-[hsl(var(--foreground))] px-6 py-2.5 rounded-xl font-semibold">
  Tháng này
</button>

// Export button
<button className="ai-button-primary text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2">
  <Download className="w-4 h-4" />
  Xuất PDF
</button>
```

### 4. Emotion Map (`/teacher/emotion-map`)

**Key Components:**
- Emotion visualization
- Student emotion cards
- Filter controls
- Support actions

**Button Examples:**
```tsx
// Emotion filter
<button className="ai-button flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
  <Heart className="w-4 h-4" />
  Cảm xúc
</button>

// Support action
<button className="ai-button-primary text-white px-4 py-2 rounded-xl text-sm font-semibold">
  Gửi động viên
</button>
```

### 5. Interaction Center (`/teacher/interaction-center`)

**Key Components:**
- Message threads
- Quick actions
- Student list
- Notification system

**Button Examples:**
```tsx
// Send message
<button className="ai-button-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
  <Send className="w-3.5 h-3.5" />
  Gửi
</button>

// Quick actions
<button className="ai-button text-[hsl(var(--foreground))] p-2 rounded-xl">
  <MessageSquare className="w-4 h-4" />
</button>
```

### 6. Exams Page (`/teacher/exams`)

**Key Components:**
- Exam list
- Create exam button
- Exam cards
- Delete actions

**Button Examples:**
```tsx
// Create exam
<button className="ai-button-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
  <Plus className="w-5 h-5" />
  Tạo đề thi
</button>

// Exam actions
<button className="ai-button text-[hsl(var(--foreground))] p-2 rounded-xl">
  <Eye className="w-4 h-4" />
</button>
```

### 7. Question Bank (`/teacher/question-bank`)

**Key Components:**
- Question list
- Create question
- Filter controls
- Edit/Delete actions

**Button Examples:**
```tsx
// Create question
<button className="ai-button-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
  <Plus className="w-5 h-5" />
  Thêm câu hỏi
</button>

// Question actions
<button className="ai-button text-[hsl(var(--foreground))] p-2 rounded-xl">
  <Edit className="w-4 h-4" />
</button>
```

### 8. Learning Path Builder (`/teacher/learning-path-builder`)

**Key Components:**
- Module selector
- Path builder
- Preview panel
- Save/Export actions

**Button Examples:**
```tsx
// Create path
<button className="ai-button-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
  <Save className="w-5 h-5" />
  Tạo Learning Path
</button>

// Add module
<button className="ai-button w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold">
  <Plus className="w-4 h-4" />
  Thêm module
</button>
```

### 9. Environment Monitoring (`/teacher/environment-monitoring`)

**Key Components:**
- Sensor data cards
- Real-time charts
- Alert system
- Export data

**Button Examples:**
```tsx
// Export data
<button className="ai-button-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
  <Download className="w-4 h-4" />
  Xuất dữ liệu
</button>
```

### 10. Vision Object Detection (`/teacher/vision/object-detection`)

**Key Components:**
- Camera feed
- Detection overlay
- Model selector
- Capture actions

**Button Examples:**
```tsx
// Start detection
<button className="ai-button-primary text-white px-4 py-2 rounded-xl flex items-center gap-2">
  <Camera className="w-4 h-4" />
  Bắt đầu
</button>
```

---

## 🎨 Color Palette

### Primary Colors
```css
--primary: hsl(245 85% 65%)      /* Purple */
--secondary: hsl(280 75% 60%)    /* Violet */
--success: hsl(175 80% 45%)      /* Teal */
--warning: hsl(35 90% 55%)       /* Orange */
--destructive: hsl(0 80% 65%)    /* Red */
--info: hsl(210 90% 60%)         /* Blue */
```

### Background Colors
```css
--background: hsl(225 15% 6%)    /* Deep space blue */
--card: rgba(255, 255, 255, 0.02) /* Glass panel */
--border: rgba(255, 255, 255, 0.06) /* Subtle border */
```

### Text Colors
```css
--foreground: rgba(255, 255, 255, 0.9)   /* Primary text */
--muted-foreground: rgba(255, 255, 255, 0.4) /* Secondary text */
```

### Glow Effects
```css
--glow-primary: 0 0 20px rgba(120, 100, 255, 0.2)
--glow-success: 0 0 20px rgba(0, 210, 180, 0.2)
--glow-warning: 0 0 20px rgba(255, 180, 50, 0.2)
--glow-destructive: 0 0 20px rgba(255, 80, 80, 0.2)
```

---

## 📐 Spacing & Typography

### Spacing Scale
- `px-2 py-1`: Extra small (badges, tags)
- `px-3 py-1.5`: Small (compact buttons)
- `px-4 py-2`: Medium (standard buttons)
- `px-6 py-3`: Large (primary actions)
- `px-8 py-4`: Extra large (hero buttons)

### Typography
- **Headers**: `text-3xl font-bold gradient-text`
- **Section titles**: `text-lg font-bold`
- **Button text**: `text-sm font-semibold` or `font-bold`
- **Body**: `text-base`
- **Captions**: `text-xs text-[hsl(var(--muted-foreground))]`

### Border Radius
- Buttons: `rounded-xl` (12px)
- Cards: `rounded-2xl` (16px)
- Small elements: `rounded-lg` (8px)
- Icons: `rounded-full` (50%)

---

## ✨ Animations & Transitions

### Button Hover
```css
transition-all hover:shadow-[0_0_30px_rgba(120,100,255,0.35)]
```

### Card Hover
```css
transition-all duration-300 hover:border-[hsl(var(--primary)/0.3)] hover:shadow-[var(--glow-primary)]
```

### Loading State
```tsx
<Loader2 className="w-5 h-5 animate-spin" />
```

---

## 📱 Responsive Design

### Mobile Breakpoints
- `md`: 768px (tablets)
- `lg`: 1024px (desktops)
- `xl`: 1280px (large screens)

### Responsive Patterns
```tsx
// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Button groups
<div className="flex flex-wrap gap-2">

// Responsive tables
<div className="overflow-x-auto">
```

---

## ♿ Accessibility

### Focus States
```css
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]
```

### Disabled States
```tsx
<button disabled className="opacity-50 cursor-not-allowed">
```

### ARIA Labels
```tsx
<button aria-label="Close dialog">
  <X className="w-4 h-4" />
</button>
```

---

## 🔧 Usage Guidelines

### DO ✅
- Use `ai-button-primary` for primary actions
- Use `ai-button` for secondary actions
- Maintain consistent spacing (px-6 py-3 for buttons)
- Include icons for better visual communication
- Use glow effects on hover states
- Keep text concise and clear

### DON'T ❌
- Mix different button styles randomly
- Use too many primary buttons in one view
- Forget to add hover states
- Skip icons on action buttons
- Use light colors on dark backgrounds
- Override the design system colors

---

## 📚 Migration Checklist

When updating existing pages:

- [ ] Replace standard buttons with `ai-button-primary` or `ai-button`
- [ ] Update card containers to use `GlassCard` component
- [ ] Add glow effects to primary actions
- [ ] Update color scheme to use HSL variables
- [ ] Add icons to all action buttons
- [ ] Ensure consistent spacing (rounded-xl, px-6 py-3)
- [ ] Update hover states with transitions
- [ ] Test on mobile devices
- [ ] Verify accessibility (focus states, ARIA labels)

---

## 🎯 Performance Tips

1. **Use CSS variables** for consistent theming
2. **Minimize inline styles** - use utility classes
3. **Lazy load heavy components** (charts, maps)
4. **Optimize images** with Next.js Image component
5. **Use backdrop-blur sparingly** on mobile

---

## 📖 Examples

### Complete Button Set
```tsx
<div className="flex gap-2">
  <button className="ai-button-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-[var(--glow-primary)]">
    <Save className="w-5 h-5" />
    Save
  </button>
  
  <button className="ai-button text-[hsl(var(--foreground))] px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border border-[hsl(var(--border))]">
    <Download className="w-5 h-5" />
    Export
  </button>
  
  <button className="ai-button text-[hsl(var(--destructive))] px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border border-[hsl(var(--destructive)/0.3)]">
    <Trash2 className="w-5 h-5" />
    Delete
  </button>
</div>
```

### Complete Card
```tsx
<GlassCard>
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-lg">
      <Brain className="w-5 h-5" />
    </div>
    <div>
      <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">AI Insights</h3>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">Smart suggestions</p>
    </div>
  </div>
  
  <div className="space-y-3">
    {/* Content */}
  </div>
  
  <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
    <button className="ai-button-primary w-full text-white px-4 py-2.5 rounded-xl font-semibold">
      Take Action
    </button>
  </div>
</GlassCard>
```

---

## 🚀 Future Enhancements

- [ ] Add more button variants (outline, ghost, link)
- [ ] Create animation presets
- [ ] Add loading skeleton components
- [ ] Implement dark/light theme toggle
- [ ] Add more chart visualizations
- [ ] Create component storybook

---

**Last Updated:** 2026-03-16  
**Author:** AI Native UI Team  
**Version:** 1.0.0
