# 🔧 Workaround: "params" Error - Solutions

## 🐛 Error Persisting

Nếu lỗi **"Cannot assign to read only property 'params'"** vẫn tiếp tục sau khi:
- Clear cache
- Restart server
- Chuyển sang Client Components

## 🎯 SOLUTION OPTIONS

### Option 1: Test Simple Version (RECOMMENDED FIRST)

Tôi đã tạo version đơn giản không dùng shadcn components:

```
http://localhost:3000/dashboard/labtwin/labs-simple
```

**Nếu page này hoạt động:**
→ Vấn đề là do shadcn UI components conflict
→ Cần rebuild hoặc update shadcn

**Nếu page này vẫn lỗi:**
→ Vấn đề sâu hơn trong Next.js routing
→ Thử Option 2

---

### Option 2: Move Labs ra ngoài Dashboard Route

Tạo labs pages ngoài dashboard route để tránh nested routing issues:

```bash
# Tạo structure mới
mkdir -p app/labs/refraction
mkdir -p app/labs/projectile
mkdir -p app/labs/motion-tracking
mkdir -p app/labs/harmonic-motion
```

Copy pages sang:
```bash
# Copy các files
cp app/\(dashboard\)/\(routes\)/dashboard/labtwin/labs/refraction/page.tsx app/labs/refraction/
cp app/\(dashboard\)/\(routes\)/dashboard/labtwin/labs/projectile/page.tsx app/labs/projectile/
# ... và các files khác
```

Update links:
```tsx
// Thay vì
href="/dashboard/labtwin/labs/refraction"

// Dùng
href="/labs/refraction"
```

---

### Option 3: Downgrade Component Complexity

Simplify `labs/page.tsx` - remove all shadcn components:

```tsx
"use client"

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LabsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/labs/index.json')
      .then(r => r.json())
      .then(setData);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1>Python Simulations</h1>
      {data.simulations.map((sim: any) => (
        <div key={sim.id} className="border p-4 mb-4">
          <h2>{sim.name}</h2>
          <Link href={`/dashboard/labtwin/labs/${sim.id}`}>
            Start
          </Link>
        </div>
      ))}
    </div>
  );
}
```

---

### Option 4: Use Direct Access (QUICKEST)

**Bypass `/labs` index page, truy cập trực tiếp:**

```
✅ http://localhost:3000/dashboard/labtwin/labs/refraction
✅ http://localhost:3000/dashboard/labtwin/labs/projectile
✅ http://localhost:3000/dashboard/labtwin/labs/motion-tracking
✅ http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
```

Và update main LabTwin page để link trực tiếp thay vì qua `/labs`:

```tsx
// Trong /dashboard/labtwin/page.tsx
<Link href={`/dashboard/labtwin/labs/${sim.id}`}>
  Bắt đầu
</Link>
```

**Skip trang index `/labs` hoàn toàn!**

---

### Option 5: Nuclear Option - Fresh Install

Nếu tất cả đều fail:

```bash
# 1. Backup important files
cp -r python-simulations ~/backup-python-simulations
cp -r public/labs ~/backup-labs
cp -r components/simulations ~/backup-components

# 2. Clean install
rm -rf .next
rm -rf node_modules
npm install

# 3. Restart
npm run dev
```

---

## 🎯 RECOMMENDED FLOW

### Step 1: Test Simple Page
```
http://localhost:3000/dashboard/labtwin/labs-simple
```

✅ **If works** → Problem is shadcn components  
❌ **If fails** → Problem is routing

### Step 2: Based on Step 1

**If shadcn is the issue:**
```bash
# Update shadcn components
npx shadcn-ui@latest add card button badge
```

**If routing is the issue:**
- Use Option 4 (Direct Access)
- Or Option 2 (Move outside dashboard)

### Step 3: Test Direct Links

Update main LabTwin page to link directly:

```tsx
// In /dashboard/labtwin/page.tsx
// Change Link to direct simulation pages
<Link href="/dashboard/labtwin/labs/refraction">
  Refraction
</Link>
```

---

## 🔍 Debug Commands

### Check if files are correct:
```bash
./test-python-simulations.sh
# Should show 32/32 passed
```

### Check data files:
```bash
ls -la public/labs/
cat public/labs/index.json | head -20
```

### Check for syntax errors:
```bash
npm run lint
```

### Check TypeScript:
```bash
npm run type-check
```

---

## ✅ QUICKEST WORKING SOLUTION

**Dùng trực tiếp URL của từng simulation:**

### Update LabTwin Main Page:

File: `/app/(dashboard)/(routes)/dashboard/labtwin/page.tsx`

Change the Python Simulations cards to link directly:

```tsx
<Link href={`/dashboard/labtwin/labs/refraction`}>
  <Button>Khúc xạ ánh sáng</Button>
</Link>

<Link href={`/dashboard/labtwin/labs/projectile`}>
  <Button>Chuyển động ném xiên</Button>
</Link>

<Link href={`/dashboard/labtwin/labs/motion-tracking`}>
  <Button>Motion Tracking</Button>
</Link>

<Link href={`/dashboard/labtwin/labs/harmonic-motion`}>
  <Button>Dao động điều hòa</Button>
</Link>
```

**Advantages:**
- ✅ Bypass problematic `/labs` index page
- ✅ Direct access works
- ✅ Simpler navigation
- ✅ Less code to debug

---

## 📊 Testing Matrix

| URL | Expected | Status |
|-----|----------|--------|
| `/dashboard/labtwin` | Main page | ? |
| `/dashboard/labtwin/labs-simple` | Simple index | Test this first |
| `/dashboard/labtwin/labs` | Full index | Has error |
| `/dashboard/labtwin/labs/refraction` | Simulation | Should work |
| `/dashboard/labtwin/labs/projectile` | Simulation | Should work |
| `/dashboard/labtwin/labs/motion-tracking` | Simulation | Should work |
| `/dashboard/labtwin/labs/harmonic-motion` | Simulation | Should work |

---

## 🎯 Action Plan

1. **Test simple page first:**
   ```
   http://localhost:3000/dashboard/labtwin/labs-simple
   ```

2. **If simple works, test direct simulation URLs:**
   ```
   http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
   ```

3. **If both work:**
   - Problem is `/labs/page.tsx` complexity
   - Use simple version or direct links

4. **Report results:**
   - Simple page works? Yes/No
   - Direct links work? Yes/No
   - Then we know what to fix

---

## 💡 Pro Tip

**Skip the broken `/labs` index page entirely!**

Users can access simulations from:
- Main LabTwin page cards (already has direct links)
- Direct URLs
- Bookmarks

The `/labs` index page is nice-to-have but not essential.

---

**Test simple page and let me know results! 🚀**


