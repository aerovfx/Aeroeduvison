# Dual Theme System - Light & Dark Modes

## 🎨 Overview

Hệ thống theme kép cho phép chuyển đổi giữa:
- **Light Mode**: Minimal clean theme (mặc định)
- **Dark Mode**: AI Native glassmorphism theme

---

## 🌗 Theme Features

### Light Mode (Minimal)
```
Background: Light gray-blue (#F8FAFC)
Cards: White with subtle shadows
Text: Dark gray (#1E293B)
Primary: Purple (#7C3AED)
Shadows: Soft, natural
```

### Dark Mode (AI Native)
```
Background: Dark blue-gray (#0F172A)
Cards: Glassmorphism with blur
Text: Light gray (#F1F5F9)
Primary: Purple with glow
Glow Effects: Purple, green, yellow, red
```

---

## 🎯 Theme Toggle

### Component
```tsx
import { ThemeToggle } from '@/components/theme/theme-toggle'

<ThemeToggle />
```

### Features
- ✅ Click to toggle
- ✅ Saves to localStorage
- ✅ Persists across sessions
- ✅ Smooth transitions
- ✅ Icon indicates current theme

---

## 🎨 CSS Variables

### Light Theme (Default)
```css
:root {
  --background: 210 40% 98%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --primary: 262 83% 58%;
  --border: 214 32% 91%;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
```

### Dark Theme (.dark class)
```css
.dark {
  --background: 225 15% 6%;
  --foreground: 210 40% 98%;
  --card: 225 15% 8%;
  --primary: 262 83% 58%;
  --border: 225 15% 18%;
  --glow-primary: 0 0 20px rgba(120, 100, 255, 0.2);
  --glass-bg: rgba(255, 255, 255, 0.02);
}
```

---

## 🛠️ Theme-Aware Components

### Cards
```tsx
// Automatically adapts to theme
<div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border">
  Content
</div>
```

### Buttons
```tsx
// Uses theme-aware classes
<button className="ai-button">Secondary</button>
<button className="ai-button-primary">Primary</button>
```

### Inputs
```tsx
// Adapts background and border
<input className="ai-input" />
```

---

## 📊 Component Behavior

### Light Mode
| Component | Style |
|-----------|-------|
| Cards | White bg, gray border |
| Buttons | Gray bg, subtle hover |
| Inputs | White bg, gray border |
| Shadows | Soft, natural |
| Text | Dark gray |

### Dark Mode
| Component | Style |
|-----------|-------|
| Cards | Glass bg, blur effect |
| Buttons | Glass bg, glow on hover |
| Inputs | Glass bg, glow on focus |
| Shadows | Glow effects |
| Text | Light gray |

---

## 🎯 Usage Examples

### Page Background
```tsx
// Automatically uses theme colors
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
```

### Cards
```tsx
// Light: White card
// Dark: Glass card with blur
<div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border">
```

### Text
```tsx
// Light: Dark text
// Dark: Light text
<h1 className="text-gray-900 dark:text-foreground">Title</h1>
```

---

## 🌙 Theme Persistence

### How It Works
1. User clicks theme toggle
2. Theme saved to localStorage
3. `dark` class added/removed from `<html>`
4. CSS variables update automatically
5. All components adapt instantly

### localStorage Key
```javascript
localStorage.setItem('theme', 'dark') // or 'light'
```

### Default Theme
- First visit: **Light mode**
- Returning: Last selected theme

---

## 🎨 Custom Styling

### Light Mode Only
```css
@media (prefers-color-scheme: light) {
  .my-custom-class {
    /* Light mode styles */
  }
}
```

### Dark Mode Only
```css
.dark .my-custom-class {
  /* Dark mode styles */
}
```

### Force Light/Dark
```tsx
<div className="light:my-styles dark:my-dark-styles">
```

---

## 📱 Responsive Considerations

### Mobile
- Theme toggle in header
- Easy to access
- Large touch target

### Desktop
- Theme toggle in top bar
- Keyboard shortcut (planned)
- Hover states enhanced

---

## 🎯 Best Practices

### DO ✅
- Use theme-aware classes (`ai-button`, `ai-input`)
- Use CSS variables (`hsl(var(--primary))`)
- Test both themes
- Provide good contrast

### DON'T ❌
- Hardcode colors (`#ffffff`, `#000000`)
- Use light-specific classes only
- Forget to test dark mode
- Ignore accessibility

---

## 🔧 Customization

### Change Primary Color
```css
:root {
  --primary: 262 83% 58%; /* Change this */
}

.dark {
  --primary: 262 83% 58%; /* Keep consistent */
}
```

### Adjust Glass Effect
```css
.dark {
  --glass-bg: rgba(255, 255, 255, 0.02); /* More opaque */
  --glass-blur: 20px; /* More blur */
}
```

### Modify Shadows
```css
:root {
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.dark {
  --glow-primary: 0 0 20px rgba(120, 100, 255, 0.2);
}
```

---

## 📊 Theme Comparison

| Feature | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Background** | Light gray-blue | Dark blue-gray |
| **Cards** | White solid | Glass with blur |
| **Borders** | Subtle gray | Subtle light |
| **Shadows** | Natural | Glow effects |
| **Text** | Dark gray | Light gray |
| **Primary** | Purple solid | Purple with glow |
| **Mood** | Clean, minimal | Modern, tech |

---

## 🚀 Implementation Status

### Completed ✅
- Theme toggle component
- CSS variables for both themes
- Theme-aware utility classes
- localStorage persistence
- Smooth transitions
- Dashboard integration

### In Progress 🚧
- All teacher pages
- Student pages
- Admin pages

### Planned 📋
- Keyboard shortcut
- System preference detection
- Per-page theme override
- Animation preferences

---

## 🎉 Result

**Both themes are now fully functional:**

### Light Mode
- ✅ Clean, minimal design
- ✅ Perfect for daytime
- ✅ High contrast
- ✅ Professional look

### Dark Mode
- ✅ AI Native glassmorphism
- ✅ Perfect for nighttime
- ✅ Glow effects
- ✅ Modern, tech aesthetic

**Users can now switch between themes anytime!** 🌗✨
