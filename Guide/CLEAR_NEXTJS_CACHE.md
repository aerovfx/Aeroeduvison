# 🗑️ Xóa Cache Next.js - Complete Guide

---

## ⚡ **QUICK COMMANDS:**

### **Cách 1: Xóa thư mục .next (FASTEST)**

```bash
cd /Users/vietchung/lmsmath
rm -rf .next
```

### **Cách 2: Xóa tất cả cache**

```bash
cd /Users/vietchung/lmsmath
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
```

### **Cách 3: Nuclear option (xóa và reinstall)**

```bash
cd /Users/vietchung/lmsmath
rm -rf .next
rm -rf node_modules
npm install
```

---

## 📁 **Các thư mục cache của Next.js:**

### **1. `.next/` - Main build cache**

```
/Users/vietchung/lmsmath/.next/

Chứa:
- Compiled pages
- Static files
- Server chunks
- Build manifest
- Cache files

Xóa khi:
- Sau khi update code
- Khi gặp lỗi build lạ
- Trước khi deploy
- Khi switch branches
```

**Xóa:**
```bash
rm -rf .next
```

---

### **2. `node_modules/.cache/` - Node modules cache**

```
/Users/vietchung/lmsmath/node_modules/.cache/

Chứa:
- Babel cache
- Webpack cache
- ESLint cache
- Other build tools cache

Xóa khi:
- Sau update dependencies
- Khi build bị lỗi lạ
```

**Xóa:**
```bash
rm -rf node_modules/.cache
```

---

### **3. `.turbo/` - Turbopack cache (nếu dùng)**

```
/Users/vietchung/lmsmath/.turbo/

Xóa khi:
- Dùng Turbopack
- Cache bị corrupt
```

**Xóa:**
```bash
rm -rf .turbo
```

---

## 🔍 **Cache ở đâu trong project:**

```
lmsmath/
├── .next/              ← Next.js build output (XÓA NÀY)
├── node_modules/
│   └── .cache/         ← Dependencies cache (XÓA NÀY)
├── .turbo/             ← Turbopack cache (XÓA nếu có)
├── public/             ← Static files (KHÔNG xóa)
├── app/                ← Source code (KHÔNG xóa)
└── ...
```

---

## 🛠️ **Complete Cache Clear Script:**

**File: `scripts/clear-all-cache.sh`**

```bash
#!/bin/bash

echo "🗑️  Clearing all Next.js cache..."

# Clear Next.js build
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Cleared .next/"
fi

# Clear node modules cache
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✅ Cleared node_modules/.cache/"
fi

# Clear turbo cache
if [ -d ".turbo" ]; then
    rm -rf .turbo
    echo "✅ Cleared .turbo/"
fi

# Clear standalone build
if [ -d ".next/standalone" ]; then
    rm -rf .next/standalone
    echo "✅ Cleared .next/standalone/"
fi

echo ""
echo "🎉 All cache cleared!"
echo ""
echo "Next steps:"
echo "  npm run dev     (for development)"
echo "  npm run build   (for production)"
```

---

## 🚀 **Usage:**

### **Development (Local):**

```bash
# Clear cache
rm -rf .next

# Restart dev server
npm run dev
```

### **Production (Before Deploy):**

```bash
# Clear cache
rm -rf .next

# Build fresh
npm run build

# OR deploy (script clears cache automatically)
./FINAL_DEPLOY_NOW.sh
```

---

## 📊 **When to Clear Cache:**

| Situation | Clear | Reason |
|-----------|-------|--------|
| Update dependencies | ✅ | node_modules/.cache |
| Change env vars | ✅ | .next may have old values |
| Switch git branches | ✅ | Different code state |
| Build errors | ✅ | Cache may be corrupt |
| Before deploy | ✅ | Fresh build |
| After pull/merge | ✅ | Code changed |
| Weird behavior | ✅ | Cache issue |

---

## 🔍 **Verify Cache Cleared:**

```bash
# Check if .next exists
ls -la .next 2>/dev/null || echo "✅ .next cleared"

# Check size before/after
du -sh .next 2>/dev/null || echo "✅ No cache"

# Build fresh
npm run build

# Should see:
# "Creating an optimized production build..."
```

---

## 💡 **Pro Tips:**

### **1. Always clear before deploy:**
```bash
rm -rf .next && ./deploy.sh
```

### **2. Clear on env var changes:**
```bash
# After changing .env.local
rm -rf .next && npm run dev
```

### **3. Add to .gitignore:**
```bash
# .gitignore should have:
.next/
node_modules/.cache/
.turbo/
```

### **4. Use deploy script (auto-clears):**
```bash
# FINAL_DEPLOY_NOW.sh already has:
rm -rf .next
rm -rf node_modules/.cache
```

---

## 🎯 **For Your Current Issue:**

**The deploy script already clears cache!**

```bash
# Just run this:
./FINAL_DEPLOY_NOW.sh

# Script automatically:
# 1. rm -rf .next
# 2. rm -rf node_modules/.cache
# 3. docker build --no-cache
# 4. Deploy fresh build
```

---

## 📋 **Quick Reference:**

```bash
# Clear Next.js build cache
rm -rf .next

# Clear node modules cache
rm -rf node_modules/.cache

# Clear all
rm -rf .next node_modules/.cache .turbo

# Clear and rebuild
rm -rf .next && npm run build

# Clear and restart dev
rm -rf .next && npm run dev

# Clear and deploy
rm -rf .next && ./FINAL_DEPLOY_NOW.sh
```

---

## 🎊 **For Your Deployment:**

**Don't manually clear! Use deploy script:**

```bash
./FINAL_DEPLOY_NOW.sh
```

**Script handles:**
- ✅ Clear .next
- ✅ Clear node_modules/.cache
- ✅ Docker build --no-cache
- ✅ Fresh deployment

**Just run it!** 🚀

---

**📖 Full Guide:** `CLEAR_NEXTJS_CACHE.md`

**⚡ Quick Clear:**
```bash
rm -rf .next
```

**🎯 For Deploy:**
```bash
./FINAL_DEPLOY_NOW.sh  (auto-clears!)
```

