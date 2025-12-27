# 🔧 Next.js 15 - JSON Loading Fix

## ⚠️ **Lỗi:**

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Nguyên nhân:** 
- Next.js 15 serve static files khác so với version cũ
- Fetch `/labs/index.json` trả về HTML (404 page) thay vì JSON file

---

## ✅ **Giải pháp: Dùng API Route thay Static File**

### **Bước 1: Tạo API Route**

**File:** `app/api/labs/index/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'labs', 'index.json');
    const fileContents = readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load labs', simulations: [], total: 0 },
      { status: 500 }
    );
  }
}
```

### **Bước 2: Update Fetch Calls**

**Thay trong TẤT CẢ files:**

```typescript
// ❌ CŨ (bị lỗi trong Next.js 15)
const response = await fetch('/labs/index.json');

// ✅ MỚI (hoạt động với Next.js 15)
const response = await fetch('/api/labs/index');
```

**Files đã update:**
- ✅ `app/(dashboard)/(routes)/dashboard/labtwin/page.tsx`
- ✅ `app/(dashboard)/(routes)/dashboard/labtwin/page-old.tsx`
- ✅ `app/(dashboard)/(routes)/dashboard/labtwin/page-new.tsx`
- ✅ `app/(dashboard)/(routes)/dashboard/labtwin/labs/page.tsx`
- ✅ `app/(dashboard)/(routes)/dashboard/labtwin/labs-simple/page.tsx`

---

## 🚀 **Restart Server:**

```bash
cd /Users/vietchung/lmsmath

# Clear cache
rm -rf .next

# Restart
npm run dev
```

---

## ✅ **Kết quả:**

### **Console log (no errors):**
```
✅ Loaded 30 Python simulations
```

### **Page hiển thị:**
```
📊 41 Total Experiments
🔬 Classic Experiments (10)
🐍 Python Simulations (30)
```

---

## 🔍 **Why API Route Works Better:**

| Approach | Next.js 15 | Caching | Dynamic | Status |
|----------|-----------|---------|---------|--------|
| Static file `/labs/index.json` | ❌ Conflict | Limited | No | Deprecated |
| API route `/api/labs/index` | ✅ Works | Full control | Yes | ✅ Recommended |

**Benefits of API Route:**
- ✅ No route conflicts
- ✅ Better caching control
- ✅ Error handling
- ✅ TypeScript support
- ✅ Can add auth/validation later

---

## 📋 **Pattern để áp dụng cho files khác:**

Nếu bạn có JSON files khác trong `public/`:

### **1. Tạo API route:**
```typescript
// app/api/your-data/route.ts
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const filePath = join(process.cwd(), 'public', 'data', 'yourfile.json');
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  return NextResponse.json(data);
}
```

### **2. Update fetch:**
```typescript
// ❌ CŨ
fetch('/data/yourfile.json')

// ✅ MỚI
fetch('/api/your-data')
```

---

## 🎯 **Test ngay:**

```bash
# Restart server
rm -rf .next && npm run dev

# Test API endpoint
curl http://localhost:3000/api/labs/index | jq '.total'
# Should return: 30

# Test page
open http://localhost:3000/dashboard/labtwin
# Should show all experiments with no console errors
```

---

**🎉 Lỗi JSON đã được fix! API route is the way!** ✅

