# 🎨 Neumorphic Gradient Minimalism Design System

## 🎯 Overview

Kết hợp giữa **Neumorphism** (soft shadows) và **Gradient Minimalism** (subtle gradients) để tạo ra giao diện hiện đại, thanh lịch và tinh tế.

---

## 🌈 Color Palette

### Base Colors

```
Background: #F0F4F8 (Soft Blue-Gray)
Foreground: #1E293B (Dark Slate)
Card: #FFFFFF → #F8FAFC (Gradient White)
```

### Primary Gradient

```
Primary: #3B82F6 (Blue 500)
Primary Light: #60A5FA (Blue 400)
Primary Dark: #2563EB (Blue 600)

Gradient: linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #2563EB 100%)
```

### Secondary Gradient

```
Secondary: #8B5CF6 (Purple 500)
Secondary Light: #A78BFA (Purple 400)
Secondary Dark: #7C3AED (Purple 600)
```

### Accent Gradient

```
Accent: #14B8A6 (Teal 500)
Accent Light: #2DD4BF (Teal 400)
Accent Dark: #0D9488 (Teal 600)
```

---

## 🎭 Neumorphic Shadows

### Light Source
- **Direction**: Top-left (45°)
- **Light Shadow**: Top-left (-8px, -8px)
- **Dark Shadow**: Bottom-right (8px, 8px)
- **Blur**: 16px
- **Spread**: 0px

### Shadow Presets

```css
/* Default */
--neu-shadow: 
  -8px -8px 16px rgba(255, 255, 255, 0.8),
   8px 8px 16px rgba(166, 180, 200, 0.4);

/* Large */
--neu-shadow-lg: 
  -12px -12px 24px rgba(255, 255, 255, 0.8),
   12px 12px 24px rgba(166, 180, 200, 0.4);

/* Inner (for inputs) */
--neu-shadow-inner: 
  inset -6px -6px 12px rgba(255, 255, 255, 0.8),
  inset 6px 6px 12px rgba(166, 180, 200, 0.4);

/* Pressed */
--neu-shadow-pressed: 
  inset -4px -4px 8px rgba(255, 255, 255, 0.8),
  inset 4px 4px 8px rgba(166, 180, 200, 0.4);
```

---

## 🧩 Components

### 1. Neumorphic Card

```tsx
<NeumorphicCard variant="default" size="md" hover>
  Content here
</NeumorphicCard>
```

**Variants:**
- `default` - Standard neumorphic
- `primary` - With colored shadow
- `success` - With green shadow
- `gradient` - Gradient background

**Sizes:**
- `sm` - p-4
- `md` - p-6
- `lg` - p-8

### 2. Neumorphic Button

```tsx
<NeumorphicButton variant="primary" size="lg">
  Click me
</NeumorphicButton>
```

**Variants:**
- `primary` - Blue gradient
- `secondary` - Purple gradient
- `accent` - Teal gradient
- `outline` - White with border

**States:**
- Default - Raised shadow
- Hover - Lifted + larger shadow
- Active - Pressed (inner shadow)
- Disabled - 50% opacity

### 3. Neumorphic Input

```tsx
<NeumorphicInput 
  label="Email"
  placeholder="Enter email"
  icon={<Mail />}
/>
```

**Features:**
- Inner shadow (pressed effect)
- Focus ring
- Icon support
- Error states

---

## 🎨 Usage Examples

### Dashboard Card

```tsx
<NeumorphicCard variant="gradient" size="lg">
  <h3 className="text-xl font-bold gradient-text">
    Welcome Back
  </h3>
  <p className="text-gray-600 mt-2">
    Here's your analytics overview
  </p>
  <div className="grid grid-cols-3 gap-4 mt-6">
    <StatCard value="1,234" label="Users" />
    <StatCard value="567" label="Orders" />
    <StatCard value="89%" label="Growth" />
  </div>
</NeumorphicCard>
```

### Form

```tsx
<div className="space-y-6">
  <NeumorphicInput
    label="Email"
    type="email"
    placeholder="you@example.com"
    icon={<Mail />}
  />
  
  <NeumorphicInput
    label="Password"
    type="password"
    placeholder="••••••••"
    icon={<Lock />}
  />
  
  <NeumorphicButton variant="primary" size="lg" className="w-full">
    Sign In
  </NeumorphicButton>
</div>
```

### Stats Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
  {stats.map((stat) => (
    <NeumorphicCard 
      key={stat.label}
      variant="default"
      hover
      className="text-center"
    >
      <div className="text-3xl font-bold gradient-text">
        {stat.value}
      </div>
      <div className="text-sm text-gray-600 mt-2">
        {stat.label}
      </div>
    </NeumorphicCard>
  ))}
</div>
```

---

## 🎭 Advanced Effects

### Gradient Text

```css
.gradient-text {
  background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #14B8A6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Floating Animation

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
```

### Gradient Border

```css
.gradient-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  z-index: -1;
}
```

---

## 📱 Responsive Design

### Breakpoints

```
sm: 640px   - Mobile landscape
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1536px - Extra large
```

### Mobile Optimization

```tsx
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  md:grid-cols-3
  lg:grid-cols-4
  gap-4
">
```

---

## 🌙 Dark Mode

### Colors

```css
.dark {
  --background: #0F172A;
  --foreground: #F8FAFC;
  --shadow-light: rgba(30, 41, 59, 0.8);
  --shadow-dark: rgba(0, 0, 0, 0.4);
}
```

### Usage

```tsx
<div className="dark:bg-gray-900 dark:text-white">
  Content
</div>
```

---

## 🎯 Best Practices

### DO ✅
- Use consistent shadow directions
- Keep gradients subtle (135deg angle)
- Maintain good contrast ratios
- Use hover states for interactivity
- Test in both light/dark modes

### DON'T ❌
- Don't use too many shadow layers
- Don't make gradients too vibrant
- Don't ignore accessibility
- Don't mix shadow directions
- Don't overuse animations

---

## 📊 Performance

### CSS Optimization

```css
/* Good - Using CSS variables */
.neu-card {
  box-shadow: var(--neu-shadow);
  transition: var(--transition-base);
}

/* Bad - Hardcoded values */
.neu-card {
  box-shadow: -8px -8px 16px rgba(255,255,255,0.8), 8px 8px 16px rgba(166,180,200,0.4);
  transition: all 0.3s;
}
```

### Animation Performance

```css
/* Good - Using transform */
.hover-lift {
  transition: transform 0.3s;
}
.hover-lift:hover {
  transform: translateY(-4px);
}

/* Bad - Using margin/padding */
.hover-lift-bad {
  transition: margin 0.3s;
}
.hover-lift-bad:hover {
  margin-top: -4px;
}
```

---

## 🎊 Examples

### Login Page

```tsx
<div className="min-h-screen neu-container flex items-center justify-center p-4">
  <NeumorphicCard size="lg" className="w-full max-w-md">
    <h1 className="text-3xl font-bold gradient-text text-center mb-8">
      Welcome Back
    </h1>
    
    <form className="space-y-6">
      <NeumorphicInput
        label="Email"
        type="email"
        placeholder="you@example.com"
        icon={<Mail />}
      />
      
      <NeumorphicInput
        label="Password"
        type="password"
        placeholder="••••••••"
        icon={<Lock />}
      />
      
      <NeumorphicButton 
        variant="primary" 
        size="lg" 
        className="w-full"
      >
        Sign In
      </NeumorphicButton>
    </form>
  </NeumorphicCard>
</div>
```

### Dashboard

```tsx
<div className="p-8 space-y-8">
  {/* Header */}
  <div className="flex items-center justify-between">
    <h1 className="text-4xl font-bold gradient-text">
      Dashboard
    </h1>
    <NeumorphicButton variant="primary">
      <Plus className="w-5 h-5 mr-2" />
      New Project
    </NeumorphicButton>
  </div>
  
  {/* Stats */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    {stats.map(stat => (
      <NeumorphicCard key={stat.label} hover>
        <div className="text-3xl font-bold gradient-text">
          {stat.value}
        </div>
        <div className="text-sm text-gray-600">
          {stat.label}
        </div>
      </NeumorphicCard>
    ))}
  </div>
  
  {/* Recent Activity */}
  <NeumorphicCard variant="gradient" size="lg">
    <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
    {/* Content */}
  </NeumorphicCard>
</div>
```

---

## 🎉 Conclusion

**Neumorphic Gradient Minimalism:**
- ✅ **Modern** - Latest design trends
- ✅ **Elegant** - Soft shadows + gradients
- ✅ **Accessible** - Good contrast ratios
- ✅ **Performant** - CSS-only effects
- ✅ **Customizable** - CSS variables

**Ready to transform your UI!** 🚀
