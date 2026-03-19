# OpenFang-Inspired UI Design

## 🎨 Giao Diện Agent Chat - Phong Cách OpenFang

Đã cập nhật giao diện chat của teacher agents theo thiết kế của OpenFang với:
- Sidebar navigation
- Chat interface hiện đại
- Status indicators
- Message bubbles
- Service control panel

---

## 🎯 Thay Đổi Chính

### 1. **Layout Mới**

#### Trước:
```
┌────────────────────────────────────┐
│  Sidebar (nhỏ)                     │
│  - Agent list                      │
├────────────────────────────────────┤
│  Main Content                      │
│  - Service panel (card)            │
│  - Chat window                     │
│  - Input form                      │
└────────────────────────────────────┘
```

#### Bây Giờ (OpenFang Style):
```
┌──────────────┬─────────────────────────┐
│   Sidebar    │   Main Chat Panel       │
│              │                         │
│  - Logo      │  - Service Control Bar  │
│  - Agents    │  - Chat Messages        │
│  - Selected  │  - Input Form           │
│    indicator │                         │
└──────────────┴─────────────────────────┘
```

### 2. **Sidebar Design**

**Features:**
- Full height (`h-[100vh]`)
- Border phải với `border-[hsl(var(--border))]`
- Background: `bg-[hsl(225,15%,8%)]`
- Agent list với selected state

**Agent Item:**
```tsx
<div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary">
    <Bot className="w-4 h-4" />
  </div>
  <div className="flex-1">
    <div className="font-medium">{Agent Name}</div>
    <div className="text-xs text-muted">{Category}</div>
  </div>
  {selected && <div className="w-2 h-2 rounded-full bg-success animate-pulse" />}
</div>
```

### 3. **Service Control Bar**

**Design:**
- Border bottom
- Background: `bg-[hsl(225,15%,8%)]`
- Padding: `p-4`
- Flex layout với status + controls

**Status Indicator:**
```tsx
<div className="flex items-center gap-3">
  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
  <div>
    <div className="text-xs font-semibold">OpenFang Agent OS</div>
    <div className="text-[10px]">
      <span className="text-success">● Online</span>
    </div>
  </div>
</div>
```

**Control Buttons:**
- Start: Gradient green → blue
- Stop: Red với border
- Refresh: Icon button

### 4. **Chat Messages**

**User Message (Right):**
```tsx
<div className="flex justify-end">
  <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-gradient-to-br from-primary to-secondary text-white shadow-[0_0_12px_rgba(120,100,255,0.3)]">
    <div className="text-xs">{message}</div>
  </div>
</div>
```

**AI Message (Left):**
```tsx
<div className="flex justify-start">
  <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-[hsl(225,15%,12%)] border border-border">
    <div className="text-xs">{message}</div>
    <div className="text-[9px] text-muted mt-2 flex items-center gap-2">
      <Bot className="w-2.5 h-2.5" />
      <span>AI Assistant</span>
    </div>
  </div>
</div>
```

### 5. **Empty States**

**AI Running:**
```tsx
<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(120,100,255,0.3)]">
  <Bot className="w-8 h-8 text-white" />
</div>
<h3 className="text-base font-bold">🤖 AI thực tế đã sẵn sàng!</h3>
```

**AI Offline:**
```tsx
<div className="w-16 h-16 rounded-2xl bg-[hsl(var(--destructive)/0.2)] flex items-center justify-center mx-auto mb-4">
  <AlertCircle className="w-8 h-8 text-destructive" />
</div>
<h3 className="text-base font-bold">⚠️ AI chưa được khởi động</h3>
```

### 6. **Input Form**

**Container:**
- Border top
- Background: `bg-[hsl(225,15%,8%)]`
- Padding: `p-4`

**Input Field:**
```tsx
<input
  className="flex-1 bg-[hsl(225,15%,12%)] border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
  placeholder="Nhập câu hỏi cho trợ giảng AI..."
/>
```

**Send Button:**
```tsx
<button
  className="px-6 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary to-secondary text-white flex items-center gap-2 shadow-[0_0_12px_rgba(120,100,255,0.3)]"
>
  <Send className="w-4 h-4" />
  <span>Send</span>
</button>
```

---

## 🎨 Color Palette

### Background Colors
```css
--bg-sidebar: hsl(225,15%,8%)
--bg-chat: hsl(225,15%,6%)
--bg-input: hsl(225,15%,12%)
--bg-message-ai: hsl(225,15%,12%)
```

### Border Colors
```css
--border-sidebar: hsl(var(--border))
--border-message: hsl(var(--border))
```

### Accent Colors
```css
--primary: hsl(245,85%,65%)   /* Purple */
--secondary: hsl(280,75%,60%) /* Violet */
--success: hsl(175,80%,45%)   /* Teal */
--destructive: hsl(0,80%,65%) /* Red */
```

---

## 📐 Layout Structure

### Main Container
```tsx
<div className="neu-container min-h-screen px-0 grid grid-cols-12 gap-0 bg-[hsl(225,15%,6%)]">
  {/* Sidebar */}
  <aside className="col-span-12 md:col-span-3 lg:col-span-3 border-r border-border bg-[hsl(225,15%,8%)]">
    {/* Agent list */}
  </aside>

  {/* Main Chat */}
  <main className="col-span-12 md:col-span-9 lg:col-span-9 flex flex-col h-[100vh]">
    {/* Service Control Bar */}
    <div className="border-b border-border bg-[hsl(225,15%,8%)] p-4">
      {/* Status + Controls */}
    </div>

    {/* Chat Window */}
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Message bubbles */}
      </div>

      {/* Input Form */}
      <div className="border-t border-border bg-[hsl(225,15%,8%)] p-4">
        {/* Input + Send button */}
      </div>
    </div>
  </main>
</div>
```

---

## ✨ Animations & Effects

### Glow Effects
```tsx
// Primary button glow
shadow-[0_0_12px_rgba(120,100,255,0.3)]
hover:shadow-[0_0_20px_rgba(120,100,255,0.5)]

// Status dot pulse
animate-pulse
```

### Transitions
```tsx
transition-all
hover:bg-[hsl(var(--foreground)/0.05)]
```

---

## 🎯 Key Features

### ✅ Sidebar
- Full height
- Agent list với selected state
- Gradient icon cho selected agent
- Pulse dot indicator

### ✅ Service Control
- Compact status bar
- Start/Stop buttons
- Refresh button
- Error messages

### ✅ Chat Messages
- User: Gradient bubble (right)
- AI: Dark bubble với border (left)
- AI signature với icon
- Max width 70%

### ✅ Input Form
- Full width form
- Modern input styling
- Gradient send button
- Disabled states

---

## 📱 Responsive Design

### Breakpoints
```tsx
col-span-12  /* Mobile */
md:col-span-3  /* Tablet sidebar */
lg:col-span-3  /* Desktop sidebar */
```

### Mobile
- Sidebar collapses
- Full width chat
- Touch-friendly buttons

---

## 🎨 Design Principles

### 1. **Dark Theme**
- Deep blue backgrounds
- Subtle borders
- High contrast text

### 2. **Gradient Accents**
- Primary → Secondary
- Success → Info
- Glow effects

### 3. **Rounded Corners**
- `rounded-xl` for buttons
- `rounded-2xl` for messages
- `rounded-lg` for small elements

### 4. **Consistent Spacing**
- `p-4` for containers
- `px-4 py-3` for inputs
- `gap-3` for flex items

---

## 🔧 Implementation Details

### File Changes
- ✅ `app/(dashboard)/(routes)/teacher/agents/page.tsx`
  - Sidebar component
  - Service control bar
  - Chat window
  - Input form

### Dependencies
- ✅ Lucide React icons
- ✅ Tailwind CSS
- ✅ Next.js

### State Management
- ✅ `openFangStatus` - Service status
- ✅ `messages` - Chat history
- ✅ `selectedAgent` - Current agent
- ✅ `serviceMessage` - Notifications

---

## 🎉 Result

### Before:
- Basic card layout
- Simple message bubbles
- No sidebar navigation

### After (OpenFang Style):
- ✅ Professional sidebar
- ✅ Service control bar
- ✅ Modern chat interface
- ✅ Gradient message bubbles
- ✅ Status indicators
- ✅ Polished UI/UX

---

**Last Updated:** 2026-03-16  
**Version:** 3.0.0 (OpenFang UI)  
**Status:** ✅ Production Ready
