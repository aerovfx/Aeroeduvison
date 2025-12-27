# 🔬 Hướng Dẫn Thiết Kế Lab Simulation - Design Pattern

> Tài liệu này mô tả mô hình thiết kế chuẩn cho các trang thí nghiệm Lab Simulation, dựa trên implementation thành công của **Refraction Lab**.

**Tham khảo:** `/dashboard/labtwin/labs/refraction`

---

## 📐 Kiến Trúc Tổng Quan

### Cấu Trúc Layout (3 Cột)

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Full Width)                   │
│  - Title + Icon                                          │
│  - Description                                           │
│  - Tags (Category, Level, Duration)                      │
│  - Backend Status Badge                                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────┬───────────────────────────┐
│                             │                           │
│   MAIN SIMULATION           │   SIDEBAR (Right)         │
│   (2 cols - lg:col-span-2)  │   (1 col)                 │
│                             │                           │
│   ┌─────────────────────┐   │   ┌─────────────────┐     │
│   │  Canvas             │   │   │ Current Data    │     │
│   │  (Visualization)    │   │   └─────────────────┘     │
│   └─────────────────────┘   │                           │
│                             │   ┌─────────────────┐     │
│   ┌─────────────────────┐   │   │ Data Table      │     │
│   │ Current Parameters  │   │   │ (i → r)         │     │
│   └─────────────────────┘   │   └─────────────────┘     │
│                             │                           │
│   ┌─────────────────────┐   │   ┌─────────────────┐     │
│   │ Enhanced Slider     │   │   │ Material Props  │     │
│   │ (Angle Control)     │   │   └─────────────────┘     │
│   └─────────────────────┘   │                           │
│                             │   ┌─────────────────┐     │
│   ┌─────────────────────┐   │   │ Theory/Formula  │     │
│   │ Material Selection  │   │   └─────────────────┘     │
│   └─────────────────────┘   │                           │
│                             │   ┌─────────────────┐     │
│   ┌─────────────────────┐   │   │ Lab Info        │     │
│   │ Action Buttons      │   │   └─────────────────┘     │
│   └─────────────────────┘   │                           │
│                             │                           │
│   ┌─────────────────────┐   │                           │
│   │ Legend/Notes        │   │                           │
│   └─────────────────────┘   │                           │
└─────────────────────────────┴───────────────────────────┘
```

---

## 🎨 Design System & Color Palette

### 1. Card Headers - Gradient Themes

Mỗi loại card có gradient riêng để dễ phân biệt:

```css
/* Current Data - Purple/Blue */
bg-gradient-to-r from-purple-50 to-blue-50
border-2 border-purple-200

/* Data Table - Indigo/Purple */
bg-gradient-to-r from-indigo-50 to-purple-50
border-2 border-indigo-200

/* Material Properties - Amber/Yellow */
bg-gradient-to-r from-amber-50 to-yellow-50
border-2 border-amber-200

/* Theory/Formula - Teal/Cyan */
bg-gradient-to-r from-teal-50 to-cyan-50
border-2 border-teal-200

/* Lab Info - Slate/Gray */
bg-gradient-to-r from-slate-50 to-gray-50
border-2 border-slate-200
```

### 2. Interactive Elements Color Coding

```javascript
const colorScheme = {
  primary: {
    ray: '#EF4444',        // Red - Tia tới/Incident
    result: '#3B82F6',     // Blue - Tia khúc xạ/Refracted
    secondary: '#22C55E',  // Green - Tia phản xạ/Reflected
    special: '#9333EA',    // Purple - Phản xạ toàn phần/Total reflection
  },
  data: {
    time: 'blue-50',       // Time values
    input: 'pink-50',      // Input angles/params
    output: 'green-50',    // Output/results
    warning: 'purple-50',  // Special states
  },
  materials: {
    medium1: 'blue-50',    // First medium
    medium2: 'green-50',   // Second medium
  }
}
```

---

## 🎯 Component Structure

### 1. State Management

```typescript
// Core simulation state
const [angleIn, setAngleIn] = useState(30);
const [selectedMaterial1, setSelectedMaterial1] = useState("air");
const [selectedMaterial2, setSelectedMaterial2] = useState("water");
const [refractionData, setRefractionData] = useState<RefractionData | null>(null);

// UI state
const [loading, setLoading] = useState(false);
const [time, setTime] = useState(0);
const [isMounted, setIsMounted] = useState(false);

// Backend status
const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

// Canvas reference
const canvasRef = useRef<HTMLCanvasElement>(null);
```

### 2. Data Structures

```typescript
interface SimulationData {
  // Input parameters
  n1: number;
  n2: number;
  angle_in_deg: number;
  
  // Output results
  angle_out_deg: number | null;
  is_total_reflection: boolean;
  critical_angle: number | null;
  
  // Visualization data
  rays: {
    incident_ray: number[][];
    refracted_ray: number[][] | null;
    reflected_ray: number[][] | null;
  };
}

interface Material {
  name: string;
  n: number;      // Refractive index
  color: string;  // Hex color for visualization
}
```

### 3. Configuration Object

```typescript
const config = {
  name: "refraction",              // Lab ID
  title: "Khúc xạ ánh sáng",      // Display title
  description: "...",              // Brief description
  category: "Quang học",           // Category
  level: "Lớp 11",                // Education level
  duration: "45 phút",            // Expected duration
  xp: 80,                         // Experience points
  port: 8017                      // Backend API port
};
```

---

## 🎨 Enhanced Slider Design Pattern

### Implementation

```tsx
<div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200 shadow-sm">
  {/* Header with Label and Value Display */}
  <div className="flex items-center justify-between mb-4">
    <label className="text-lg font-bold text-purple-900 flex items-center gap-2">
      <Settings className="h-5 w-5" />
      Góc tới (i)
    </label>
    <div className="bg-white px-6 py-3 rounded-lg border-2 border-purple-300 shadow-md">
      <span className="text-3xl font-bold text-purple-600">{angleIn}°</span>
    </div>
  </div>
  
  {/* Slider with Scale */}
  <div className="relative">
    <Slider
      value={[angleIn]}
      onValueChange={(value) => setAngleIn(value[0])}
      max={80}
      min={0}
      step={1}
      className="mt-2 h-3 cursor-pointer"
    />
    <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
      <span className="font-medium">0°</span>
      <span className="font-medium">20°</span>
      <span className="font-medium">40°</span>
      <span className="font-medium">60°</span>
      <span className="font-medium">80°</span>
    </div>
  </div>
</div>
```

**Key Features:**
- ✅ Gradient background để nổi bật
- ✅ Large value display (3xl font) trong hộp riêng
- ✅ Icon cho label
- ✅ Scale markers dưới slider
- ✅ Shadow và border cho depth
- ✅ Thicker slider (h-3) dễ tương tác

---

## 📊 Data Table Pattern

### Implementation

```tsx
<Card className="border-2 border-indigo-200 shadow-lg">
  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
    <CardTitle className="flex items-center gap-2">
      <TableIcon className="h-5 w-5 text-indigo-600" />
      Bảng góc tới - góc khúc xạ
    </CardTitle>
    <CardDescription>
      Phụ thuộc giữa góc tới (i) và góc khúc xạ (r)
    </CardDescription>
  </CardHeader>
  <CardContent className="pt-6">
    <Table>
      <TableHeader>
        <TableRow className="bg-indigo-100">
          <TableHead className="text-center font-bold">Góc tới (i)</TableHead>
          <TableHead className="text-center font-bold">
            <ArrowRight className="h-4 w-4 inline" />
          </TableHead>
          <TableHead className="text-center font-bold">Góc khúc xạ (r)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {calculateDataTable().map((row, index) => (
          <TableRow 
            key={index}
            className={`
              ${isCurrentValue(row) ? 'bg-yellow-50 font-semibold border-l-4 border-yellow-400' : ''}
              ${row.isSpecialState ? 'bg-purple-50' : ''}
              hover:bg-gray-50 transition-colors
            `}
          >
            <TableCell className="text-center font-medium">{row.input}°</TableCell>
            <TableCell className="text-center">
              <ArrowRight className="h-4 w-4 mx-auto text-gray-400" />
            </TableCell>
            <TableCell className="text-center font-medium">
              {row.output ? `${row.output}°` : 'Special State'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

**Key Features:**
- ✅ Highlight current value với màu vàng + border-left
- ✅ Special states (như total reflection) có màu riêng
- ✅ Arrow icon giữa input-output
- ✅ Hover effects
- ✅ Gradient header
- ✅ Description text

---

## 🎨 Canvas Visualization Pattern

### Setup & Drawing

```typescript
useEffect(() => {
  if (!isMounted || !data || !canvasRef.current) return;
  
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  canvas.width = 600;
  canvas.height = 400;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // 1. Draw backgrounds with gradients
  drawMaterialGradients(ctx, centerX, centerY);
  
  // 2. Draw interface lines and guides
  drawInterfaceLines(ctx, centerX, centerY);
  
  // 3. Draw rays with glow effects
  drawRaysWithGlow(ctx, data.rays, centerX, centerY);
  
  // 4. Draw angle arcs and labels
  drawAngleIndicators(ctx, data.angles, centerX, centerY);
  
  // 5. Draw material labels
  drawMaterialLabels(ctx, materials, centerX, centerY);
  
}, [data, isMounted, selectedMaterial1, selectedMaterial2]);
```

### Best Practices cho Canvas

#### 1. Material Gradients
```typescript
const gradient1 = ctx.createLinearGradient(0, 0, 0, centerY);
gradient1.addColorStop(0, material1.color);
gradient1.addColorStop(1, material1.color + 'CC'); // Add transparency
ctx.fillStyle = gradient1;
ctx.fillRect(0, 0, canvas.width, centerY);
```

#### 2. Glow Effects cho Rays
```typescript
// Glow effect
ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
ctx.shadowBlur = 10;
ctx.strokeStyle = '#EF4444';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(startX, startY);
ctx.lineTo(endX, endY);
ctx.stroke();
ctx.shadowBlur = 0; // Reset
```

#### 3. Arrows với Fill
```typescript
const angle = Math.atan2(endY - startY, endX - startX);
const arrowLength = 12;
ctx.fillStyle = color;
ctx.beginPath();
ctx.moveTo(endX, endY);
ctx.lineTo(
  endX - arrowLength * Math.cos(angle - Math.PI / 6),
  endY - arrowLength * Math.sin(angle - Math.PI / 6)
);
ctx.lineTo(
  endX - arrowLength * Math.cos(angle + Math.PI / 6),
  endY - arrowLength * Math.sin(angle + Math.PI / 6)
);
ctx.closePath();
ctx.fill();
```

#### 4. Text Labels với Background
```typescript
// Background box
ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
ctx.fillRect(x - 5, y - 18, width, height);

// Text
ctx.fillStyle = '#1F2937';
ctx.font = 'bold 16px Arial';
ctx.fillText(text, x, y);
```

#### 5. Angle Arcs
```typescript
ctx.strokeStyle = '#6B7280';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(
  centerX, 
  centerY, 
  arcRadius, 
  startAngle, 
  endAngle, 
  counterclockwise
);
ctx.stroke();
```

---

## 🎨 Legend/Color Key Pattern

```tsx
<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
  <div className="text-sm font-bold mb-3 flex items-center gap-2">
    <Info className="h-4 w-4" />
    Chú thích màu sắc
  </div>
  <div className="space-y-2 text-sm">
    <div className="flex items-center gap-2">
      <div className="w-8 h-1 bg-red-500 rounded"></div>
      <span>Tia tới (màu đỏ)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-1 bg-blue-500 rounded"></div>
      <span>Tia khúc xạ (màu xanh)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-1 bg-green-500 rounded"></div>
      <span>Tia phản xạ (màu xanh lá)</span>
    </div>
  </div>
</div>
```

---

## 🔄 Backend Integration Pattern

### Health Check System

```typescript
useEffect(() => {
  if (!isMounted) return;
  
  const checkBackend = async () => {
    try {
      const response = await fetch(`http://localhost:${config.port}/api/health`);
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      setBackendStatus('offline');
    }
  };

  checkBackend();
  const interval = setInterval(checkBackend, 10000); // Check every 10s
  return () => clearInterval(interval);
}, [isMounted]);
```

### Hybrid Calculation (Backend + Client Fallback)

```typescript
const updateSimulation = async () => {
  if (backendStatus === 'online') {
    try {
      const response = await fetch(`http://localhost:${config.port}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSimulationData(result.data);
      } else {
        // Fallback to client-side
        const data = calculateClientSide(params);
        setSimulationData(data);
      }
    } catch (error) {
      // Fallback to client-side
      const data = calculateClientSide(params);
      setSimulationData(data);
    }
  } else {
    // Use client-side calculation
    const data = calculateClientSide(params);
    setSimulationData(data);
  }
};
```

### Status Badge

```tsx
<Badge 
  variant={backendStatus === 'online' ? 'default' : 'destructive'}
  className="flex items-center space-x-1"
>
  <Activity className="h-3 w-3" />
  <span>
    {backendStatus === 'online' ? 'Backend Online' : 
     backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}
  </span>
</Badge>
```

---

## 🎯 Material Selection Pattern

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
    <label className="text-sm font-bold mb-2 block text-blue-900">
      Môi trường 1 (trên)
    </label>
    <Select value={selectedMaterial1} onValueChange={setSelectedMaterial1}>
      <SelectTrigger className="bg-white border-blue-300 font-medium">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(materials).map(([key, material]) => (
          <SelectItem key={key} value={key}>
            {material.name} (n = {material.n})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  
  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
    <label className="text-sm font-bold mb-2 block text-green-900">
      Môi trường 2 (dưới)
    </label>
    <Select value={selectedMaterial2} onValueChange={setSelectedMaterial2}>
      <SelectTrigger className="bg-white border-green-300 font-medium">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(materials).map(([key, material]) => (
          <SelectItem key={key} value={key}>
            {material.name} (n = {material.n})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

**Key Features:**
- ✅ Màu background khác nhau cho mỗi selector
- ✅ Border màu matching
- ✅ Label font-bold với màu phù hợp
- ✅ Hiển thị cả tên và giá trị trong options

---

## 📦 Material Properties Display

```tsx
<Card className="border-2 border-amber-200 shadow-lg">
  <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
    <CardTitle className="flex items-center gap-2">
      <Lightbulb className="h-5 w-5 text-amber-600" />
      Chiết suất vật liệu
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-2 pt-6">
    {Object.entries(materials).map(([key, material]) => (
      <div 
        key={key}
        className={`
          flex justify-between items-center p-3 rounded-lg border-2 transition-all
          ${(selectedMaterial1 === key || selectedMaterial2 === key) 
            ? 'bg-amber-100 border-amber-400 shadow-md font-bold' 
            : 'bg-gray-50 border-gray-200'}
        `}
      >
        <span className="font-medium">{material.name}:</span>
        <span className="font-bold text-lg">n = {material.n}</span>
      </div>
    ))}
  </CardContent>
</Card>
```

**Key Features:**
- ✅ Highlight vật liệu đang được chọn
- ✅ Transition-all cho smooth animation
- ✅ Font size lớn hơn cho giá trị
- ✅ Gradient header

---

## 📐 Theory/Formula Card Pattern

```tsx
<Card className="border-2 border-teal-200 shadow-lg">
  <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
    <CardTitle className="flex items-center gap-2">
      <Info className="h-5 w-5 text-teal-600" />
      Định luật Snell
    </CardTitle>
  </CardHeader>
  <CardContent className="pt-6">
    {/* Formula Display */}
    <div className="bg-gradient-to-r from-teal-100 to-cyan-100 p-4 rounded-lg border-2 border-teal-300 mb-4">
      <div className="text-center font-mono text-xl font-bold text-teal-900">
        n₁ × sin(i) = n₂ × sin(r)
      </div>
    </div>
    
    {/* Explanation */}
    <div className="space-y-2 text-sm">
      <div className="flex items-start gap-2">
        <span className="font-bold text-teal-700">•</span>
        <div>
          <span className="font-semibold">n₁, n₂:</span> Chiết suất của hai môi trường
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="font-bold text-teal-700">•</span>
        <div>
          <span className="font-semibold">i:</span> Góc tới
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="font-bold text-teal-700">•</span>
        <div>
          <span className="font-semibold">r:</span> Góc khúc xạ
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 🎮 Action Buttons Pattern

```tsx
<div className="flex space-x-2">
  <Button 
    onClick={runSimulation}
    disabled={loading}
    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
    size="lg"
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
    <span>{loading ? 'Đang chạy...' : 'Chạy mô phỏng'}</span>
  </Button>
  
  <Button 
    onClick={resetSimulation}
    variant="outline"
    className="flex items-center space-x-2 border-2"
    size="lg"
  >
    <RotateCcw className="h-4 w-4" />
    <span>Reset</span>
  </Button>
</div>
```

**Key Features:**
- ✅ Primary button có gradient background
- ✅ flex-1 để chiếm nhiều space hơn
- ✅ Loading state với spinner
- ✅ Size="lg" cho touch-friendly
- ✅ Icons rõ ràng

---

## 💡 Best Practices

### 1. Hydration Safety
```typescript
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
}, []);

if (!isMounted) {
  return <LoadingState />;
}
```

### 2. Canvas Rendering Dependencies
```typescript
// Include ALL dependencies that affect rendering
useEffect(() => {
  // Draw logic
}, [data, isMounted, selectedMaterial1, selectedMaterial2, materials]);
```

### 3. Responsive Design
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    {/* Main content */}
  </div>
  <div>
    {/* Sidebar */}
  </div>
</div>
```

### 4. Error Boundaries & Fallbacks
```typescript
try {
  // Backend call
} catch (error) {
  console.error('Backend error, using fallback:', error);
  // Use client-side calculation
}
```

### 5. Accessibility
- ✅ Label cho tất cả inputs
- ✅ Alt text cho images (nếu có)
- ✅ Keyboard navigation support
- ✅ Color contrast ratio đạt chuẩn
- ✅ Focus states rõ ràng

### 6. Performance
- ✅ useCallback cho event handlers
- ✅ useMemo cho expensive calculations
- ✅ Debounce slider changes (nếu cần)
- ✅ Canvas rendering optimization

---

## 📋 Checklist cho Lab Mới

### Setup Phase
- [ ] Tạo file page.tsx trong `/dashboard/labtwin/labs/[lab-name]/`
- [ ] Define interfaces cho data structures
- [ ] Setup config object với port, metadata
- [ ] Initialize state management

### UI Phase - Layout
- [ ] Header với title, description, tags
- [ ] Backend status badge
- [ ] Grid layout 2/3 split (main + sidebar)
- [ ] Canvas area với proper sizing

### UI Phase - Controls
- [ ] Enhanced slider với gradient background
- [ ] Material/parameter selectors với color coding
- [ ] Action buttons (Run, Reset, etc.)
- [ ] Legend/color key

### UI Phase - Data Display
- [ ] Current data card với gradient header
- [ ] Data table (nếu áp dụng)
- [ ] Material properties card
- [ ] Theory/formula card
- [ ] Lab info card

### Canvas Implementation
- [ ] Canvas ref setup
- [ ] Background/environment drawing
- [ ] Interface lines và guides
- [ ] Main visualization elements
- [ ] Glow effects và shadows
- [ ] Angle indicators và arcs
- [ ] Text labels với backgrounds
- [ ] Arrows cho vectors/rays

### Backend Integration
- [ ] Health check system
- [ ] API endpoints defined
- [ ] Hybrid calculation (backend + client fallback)
- [ ] Error handling
- [ ] Loading states

### Polish
- [ ] All colors match design system
- [ ] Gradients applied consistently
- [ ] Shadows và borders correct
- [ ] Hover states working
- [ ] Transitions smooth
- [ ] Mobile responsive
- [ ] No hydration errors
- [ ] No linter errors

### Testing
- [ ] Backend online scenario
- [ ] Backend offline scenario
- [ ] All parameter ranges
- [ ] Edge cases (if any)
- [ ] Mobile/tablet views
- [ ] Browser compatibility

---

## 🎨 Quick Color Reference

```css
/* Primary Actions */
.gradient-primary { @apply bg-gradient-to-r from-purple-600 to-blue-600; }

/* Card Headers by Type */
.header-data { @apply bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200; }
.header-table { @apply bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200; }
.header-material { @apply bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200; }
.header-theory { @apply bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200; }
.header-info { @apply bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200; }

/* Data Values */
.value-time { @apply bg-blue-50 border-blue-200; }
.value-input { @apply bg-pink-50 border-pink-200; }
.value-output { @apply bg-green-50 border-green-200; }
.value-special { @apply bg-purple-50 border-purple-200; }

/* Canvas Colors */
--ray-incident: #EF4444;      /* Red */
--ray-refracted: #3B82F6;     /* Blue */
--ray-reflected: #22C55E;     /* Green */
--ray-special: #9333EA;       /* Purple */
```

---

## 📚 Dependencies Required

```json
{
  "dependencies": {
    "react": "^19.x",
    "next": "^15.x",
    "@radix-ui/react-slider": "latest",
    "@radix-ui/react-select": "latest",
    "lucide-react": "latest",
    "tailwindcss": "^3.x"
  }
}
```

### Components Used
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `Button`
- `Badge`
- `Slider`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`

### Icons Used (from lucide-react)
- `Settings`, `Play`, `RotateCcw`, `Activity`, `Loader2`, `Lightbulb`
- `Info`, `ArrowRight`, `Table as TableIcon`

---

## 🔗 Reference Implementation

**Live Example:** http://localhost:3000/dashboard/labtwin/labs/refraction

**Source Code:** `/app/(dashboard)/(routes)/dashboard/labtwin/labs/refraction/page.tsx`

**Documentation:**
- `REFRACTION_UX_IMPROVEMENTS.md` - UX/UI improvements detail
- `REFRACTION_ISSUES_RESOLVED.md` - Technical issues resolved

---

## 📊 Charts & Graphs Pattern (NEW v2.0)

### When to Add Charts

Charts are beneficial when:
- ✅ Showing relationship between 2+ variables
- ✅ Time-series data (progression over time)
- ✅ Comparison of multiple scenarios
- ✅ Trends and patterns need visualization

### Chart Libraries

Recommended: **Recharts** (React-friendly)
```bash
npm install recharts
```

Alternative: **Chart.js** with react-chartjs-2

### Chart Types by Use Case

#### 1. Line Chart - For Trends
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Example: Angle vs Refraction Angle
<Card className="border-2 border-blue-200">
  <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
    <CardTitle className="flex items-center gap-2">
      <TrendingUp className="h-5 w-5 text-blue-600" />
      Đồ thị góc tới - góc khúc xạ
    </CardTitle>
  </CardHeader>
  <CardContent className="pt-6">
    <LineChart width={500} height={300} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="angleIn" 
        label={{ value: 'Góc tới (°)', position: 'bottom' }}
      />
      <YAxis 
        label={{ value: 'Góc khúc xạ (°)', angle: -90, position: 'left' }}
      />
      <Tooltip />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="angleOut" 
        stroke="#3B82F6" 
        strokeWidth={3}
        dot={{ fill: '#3B82F6', r: 4 }}
      />
    </LineChart>
  </CardContent>
</Card>
```

#### 2. Bar Chart - For Comparisons
```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Example: Light intensity comparison
<BarChart width={500} height={300} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="position" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="intensity" fill="#FFEB3B" />
</BarChart>
```

#### 3. Scatter Plot - For Distribution
```tsx
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Example: Ray distribution on screen
<ScatterChart width={400} height={400}>
  <CartesianGrid />
  <XAxis dataKey="x" />
  <YAxis dataKey="y" />
  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
  <Scatter name="Light spots" data={spotData} fill="#FFC107" />
</ScatterChart>
```

### Chart Data Generation

```typescript
// Generate chart data from simulation
const generateChartData = () => {
  const data = [];
  for (let angle = 0; angle <= 80; angle += 5) {
    const result = calculateRefraction(n1, n2, angle);
    data.push({
      angleIn: angle,
      angleOut: result.angle_out_deg || 0,
      isTotalReflection: result.is_total_reflection
    });
  }
  return data;
};
```

### Chart Styling Guidelines

```tsx
// Consistent chart theme
const chartColors = {
  primary: '#3B82F6',    // Blue
  secondary: '#10B981',  // Green
  accent: '#F59E0B',     // Amber
  danger: '#EF4444',     // Red
  grid: '#E5E7EB',       // Gray-200
};

// Responsive sizing
const ChartContainer = ({ children }) => (
  <ResponsiveContainer width="100%" height={300}>
    {children}
  </ResponsiveContainer>
);
```

### Example Implementations

#### Refraction Lab Chart
```tsx
<Card className="border-2 border-blue-200 shadow-lg">
  <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
    <CardTitle>Đồ thị Snell's Law</CardTitle>
    <CardDescription>
      Mối quan hệ giữa góc tới và góc khúc xạ
    </CardDescription>
  </CardHeader>
  <CardContent className="pt-6">
    <LineChart width={500} height={300} data={generateChartData()}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis 
        dataKey="angleIn" 
        label={{ value: 'Góc tới (i) °', position: 'insideBottom', offset: -5 }}
      />
      <YAxis 
        label={{ value: 'Góc khúc xạ (r) °', angle: -90, position: 'insideLeft' }}
      />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: '#fff', 
          border: '2px solid #3B82F6',
          borderRadius: '8px'
        }}
      />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="angleOut" 
        stroke="#3B82F6" 
        strokeWidth={3}
        name="Góc khúc xạ"
        dot={(props) => {
          const { cx, cy, payload } = props;
          return (
            <circle 
              cx={cx} 
              cy={cy} 
              r={payload.isTotalReflection ? 6 : 4} 
              fill={payload.isTotalReflection ? '#9333EA' : '#3B82F6'}
              stroke="#fff"
              strokeWidth={2}
            />
          );
        }}
      />
      {/* Critical angle line */}
      <ReferenceLine 
        x={calculateCriticalAngle(n1, n2)} 
        stroke="#EF4444" 
        strokeDasharray="5 5"
        label="Góc tới hạn"
      />
    </LineChart>
    
    <div className="mt-4 text-xs text-gray-600 space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
        <span>Khúc xạ bình thường</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
        <span>Phản xạ toàn phần</span>
      </div>
    </div>
  </CardContent>
</Card>
```

#### Light Shadows Chart
```tsx
// Shadow width vs distance chart
<LineChart width={500} height={300} data={shadowWidthData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="distance" label={{ value: 'Khoảng cách (cm)' }} />
  <YAxis label={{ value: 'Độ rộng bóng (cm)', angle: -90 }} />
  <Tooltip />
  <Legend />
  <Line 
    type="monotone" 
    dataKey="umbraWidth" 
    stroke="#8B0000" 
    name="Bóng tối"
    strokeWidth={3}
  />
  <Line 
    type="monotone" 
    dataKey="penumbraWidth" 
    stroke="#FF9800" 
    name="Bóng nửa tối"
    strokeWidth={3}
  />
</LineChart>
```

### Chart Best Practices

1. **Always include labels** cho axes
2. **Use tooltips** for detailed data on hover
3. **Add legends** khi có multiple lines/bars
4. **Match colors** với canvas visualization
5. **Responsive** - use ResponsiveContainer
6. **Loading states** khi generating data
7. **Empty states** khi không có data

---

## 🏆 Lab Completion Button Pattern (NEW v2.0)

### Purpose
- Track lab completion
- Award XP (experience points)
- Gamify learning experience
- Require student interaction before completion

### State Management

```typescript
// Completion tracking
const [hasInteracted, setHasInteracted] = useState(false);
const [isCompleted, setIsCompleted] = useState(false);
const [isCompleting, setIsCompleting] = useState(false);

// Track initial values
const initialValues = useRef({
  param1: defaultValue1,
  param2: defaultValue2,
  // ... all parameters
});
```

### Interaction Detection

```typescript
// Detect parameter changes
useEffect(() => {
  if (!isMounted) return;
  
  const hasChanged = 
    param1 !== initialValues.current.param1 ||
    param2 !== initialValues.current.param2 ||
    param3 !== initialValues.current.param3;
  
  if (hasChanged && !hasInteracted) {
    setHasInteracted(true);
  }
}, [param1, param2, param3, isMounted, hasInteracted]);
```

### Complete Lab Function

```typescript
const completeLab = async () => {
  if (!hasInteracted || isCompleted) return;
  
  setIsCompleting(true);
  try {
    const response = await fetch('/api/lab-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        labId: config.name,
        labName: config.title,
        xpEarned: config.xp,
        parameters: {
          param1,
          param2,
          param3,
          // ... all relevant parameters
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      setIsCompleted(true);
      
      toast({
        title: "🎉 Hoàn thành thí nghiệm!",
        description: `Chúc mừng! Bạn đã nhận được +${config.xp} XP`,
        duration: 5000,
      });
    } else {
      throw new Error('Failed to complete lab');
    }
  } catch (error) {
    console.error('Error completing lab:', error);
    toast({
      title: "❌ Lỗi",
      description: "Không thể hoàn thành thí nghiệm. Vui lòng thử lại.",
      variant: "destructive",
      duration: 3000,
    });
  } finally {
    setIsCompleting(false);
  }
};
```

### UI Implementation

```tsx
<div className="space-y-3">
  {/* Regular action buttons */}
  <div className="flex space-x-2">
    <Button onClick={runSimulation} /* ... */>
      <Play /> Chạy mô phỏng
    </Button>
    <Button onClick={resetSimulation} /* ... */>
      <RotateCcw /> Reset
    </Button>
  </div>
  
  {/* Complete Lab Button */}
  <Button 
    onClick={completeLab}
    disabled={!hasInteracted || isCompleted || isCompleting}
    className={`w-full ${
      isCompleted 
        ? 'bg-green-600 hover:bg-green-700' 
        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
    }`}
    size="lg"
  >
    {isCompleting ? (
      <>
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Đang xử lý...</span>
      </>
    ) : isCompleted ? (
      <>
        <CheckCircle className="h-5 w-5" />
        <span>✅ Đã hoàn thành</span>
      </>
    ) : (
      <>
        <Trophy className="h-5 w-5" />
        <span>Hoàn thành thí nghiệm (+{config.xp} XP)</span>
      </>
    )}
  </Button>
  
  {/* Hint text when not interacted */}
  {!hasInteracted && !isCompleted && (
    <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
      💡 Thay đổi thông số thí nghiệm để kích hoạt nút hoàn thành
    </p>
  )}
</div>
```

### Reset Behavior

```typescript
const resetSimulation = () => {
  // Reset parameters to default
  setParam1(defaultValue1);
  setParam2(defaultValue2);
  
  // Reset interaction tracking but keep completion status
  setHasInteracted(false);
  initialValues.current = {
    param1: defaultValue1,
    param2: defaultValue2,
  };
};
```

### API Endpoint

Create `/app/api/lab-completion/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { labId, labName, xpEarned, parameters } = await req.json();

  // Check if already completed
  const existing = await db.labCompletion.findFirst({
    where: { userId: session.user.id, labId }
  });

  if (existing) {
    return NextResponse.json({ 
      message: "Lab already completed",
      alreadyCompleted: true 
    });
  }

  // Create completion record
  const completion = await db.labCompletion.create({
    data: {
      userId: session.user.id,
      labId,
      labName,
      xpEarned,
      parameters: parameters || {},
      completedAt: new Date(),
    },
  });

  // Update user XP
  await db.user.update({
    where: { id: session.user.id },
    data: { xp: { increment: xpEarned } },
  });

  return NextResponse.json({ 
    success: true, 
    completion, 
    xpEarned 
  });
}
```

### Database Schema

Add to `prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields
  xp            Int               @default(0)
  LabCompletion LabCompletion[]
}

model LabCompletion {
  id          String   @id @default(cuid())
  userId      String
  labId       String
  labName     String
  xpEarned    Int
  parameters  Json?
  completedAt DateTime @default(now())
  User        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, labId])
  @@index([userId])
  @@index([labId])
}
```

### Color Scheme

```css
/* Not Interacted - Disabled */
opacity-50

/* Ready to Complete */
bg-gradient-to-r from-emerald-600 to-teal-600
hover:from-emerald-700 hover:to-teal-700

/* Completing - Loading */
bg-emerald-600 (with spinner)

/* Completed - Success */
bg-green-600 hover:bg-green-700

/* Hint Text */
text-amber-600 bg-amber-50 border-amber-200
```

### Icons
- `<Trophy />` - Ready to complete
- `<Loader2 />` - Completing (animated spin)
- `<CheckCircle />` - Completed

---

## 🎨 Shadow Colors Pattern (NEW v2.0)

### When to Use
For labs visualizing shadows, darkness, or light absence

### Color Palette

#### Umbra (Complete Shadow)
```css
/* Gradient: Dark Red → Purple → Midnight Blue */
background: linear-gradient(to right, 
  rgba(139, 0, 0, 0.85),    /* Dark Red */
  rgba(75, 0, 130, 0.9),     /* Indigo */
  rgba(25, 25, 112, 0.85)    /* Midnight Blue */
);
border: 2px solid rgba(139, 0, 0, 0.9);
```

#### Penumbra (Partial Shadow)
```css
/* Gradient: Orange → Light Orange → Yellow */
background: linear-gradient(to right,
  rgba(255, 152, 0, 0.5),    /* Orange */
  rgba(255, 183, 77, 0.45),  /* Light Orange */
  rgba(255, 224, 130, 0.4)   /* Very Light Orange */
);
border: 1px solid rgba(255, 152, 0, 0.7);
```

### Implementation

#### Canvas
```typescript
// Draw umbra
simulationData.umbraRegions.forEach(region => {
  const umbraGradient = ctx.createLinearGradient(
    region.x, region.y, 
    region.x + region.width, region.y
  );
  umbraGradient.addColorStop(0, 'rgba(139, 0, 0, 0.85)');
  umbraGradient.addColorStop(0.5, 'rgba(75, 0, 130, 0.9)');
  umbraGradient.addColorStop(1, 'rgba(25, 25, 112, 0.85)');
  ctx.fillStyle = umbraGradient;
  ctx.fillRect(region.x, region.y, region.width, region.height);
  
  ctx.strokeStyle = 'rgba(139, 0, 0, 0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(region.x, region.y, region.width, region.height);
});

// Draw penumbra
simulationData.penumbraRegions.forEach(region => {
  const penumbraGradient = ctx.createLinearGradient(
    region.x, region.y,
    region.x + region.width, region.y
  );
  penumbraGradient.addColorStop(0, 'rgba(255, 152, 0, 0.5)');
  penumbraGradient.addColorStop(0.5, 'rgba(255, 183, 77, 0.45)');
  penumbraGradient.addColorStop(1, 'rgba(255, 224, 130, 0.4)');
  ctx.fillStyle = penumbraGradient;
  ctx.fillRect(region.x, region.y, region.width, region.height);
  
  ctx.strokeStyle = 'rgba(255, 152, 0, 0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(region.x, region.y, region.width, region.height);
});
```

#### UI Cards
```tsx
{/* Umbra Card */}
<div 
  className="p-4 rounded-lg border-2 border-red-900"
  style={{ background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.3), rgba(75, 0, 130, 0.3))' }}
>
  <div className="text-red-900 font-semibold">Vùng bóng tối (Umbra)</div>
  <div className="text-2xl font-bold text-red-950">{count}</div>
  <div className="text-xs text-red-800 mt-1">Tối hoàn toàn</div>
</div>

{/* Penumbra Card */}
<div 
  className="p-4 rounded-lg border-2 border-orange-500"
  style={{ background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 224, 130, 0.2))' }}
>
  <div className="text-orange-900 font-semibold">Vùng bóng nửa tối (Penumbra)</div>
  <div className="text-2xl font-bold text-orange-950">{count}</div>
  <div className="text-xs text-orange-800 mt-1">Tối một phần</div>
</div>
```

#### Legend
```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <div 
      className="w-8 h-4 rounded border-2 border-red-900" 
      style={{ background: 'linear-gradient(to right, rgba(139, 0, 0, 0.85), rgba(75, 0, 130, 0.9))' }}
    />
    <span className="font-medium">Bóng tối (Umbra) - Tối hoàn toàn (màu đỏ-tím đậm)</span>
  </div>
  
  <div className="flex items-center gap-2">
    <div 
      className="w-8 h-4 rounded border-2 border-orange-500" 
      style={{ background: 'linear-gradient(to right, rgba(255, 152, 0, 0.5), rgba(255, 224, 130, 0.4))' }}
    />
    <span className="font-medium">Bóng nửa tối (Penumbra) - Tối một phần (màu cam-vàng)</span>
  </div>
</div>
```

### Psychology of Colors
- **Red/Purple**: Danger, absence, complete darkness
- **Orange/Yellow**: Transition, partial light, warning

---

## 📝 Notes

1. **Consistent Spacing:** Sử dụng `space-y-6` cho vertical spacing giữa các sections
2. **Shadow Hierarchy:** `shadow-sm` < `shadow-md` < `shadow-lg` < `shadow-2xl`
3. **Border Width:** `border` (1px) < `border-2` (2px) < `border-4` (4px)
4. **Font Sizes:** `text-sm` < `text-base` < `text-lg` < `text-xl` < `text-2xl` < `text-3xl`
5. **Gradient Direction:** Thường dùng `from-[color]-50 to-[color]-50` cho soft gradients
6. **Charts:** Add when data relationships are important
7. **Completion:** Always track interaction before enabling completion button

---

## 🚀 Next Steps

Khi tạo lab mới:
1. Copy structure từ refraction lab
2. Thay đổi config, interfaces cho phù hợp
3. Implement calculation logic
4. Design canvas visualization
5. Apply color scheme từ design system
6. **Add charts nếu có relationships cần visualize**
7. **Implement completion button với interaction tracking**
8. **Apply shadow colors nếu lab về shadows**
9. Test với checklist
10. Document nếu có pattern mới

---

**Last Updated:** October 22, 2025  
**Version:** 2.0  
**Status:** ✅ Production Ready

**New in v2.0:**
- 📊 Charts & Graphs Pattern
- 🏆 Lab Completion Button Pattern  
- 🎨 Shadow Colors Enhancement Pattern
- 📈 Data Visualization Best Practices

