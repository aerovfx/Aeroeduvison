# 🗑️ Clear Cache & Deploy - Complete Guide

---

## ⚡ **XÓA CACHE NEXT.JS:**

### **Cách 1: Dùng Script (Recommended)**

```bash
cd /Users/vietchung/lmsmath
./scripts/clear-cache.sh
```

**Tự động xóa:**
- ✅ `.next/` folder
- ✅ `node_modules/.cache/`
- ✅ `.turbo/` folder

---

### **Cách 2: Manual Commands**

```bash
cd /Users/vietchung/lmsmath

# Xóa Next.js build cache
rm -rf .next

# Xóa node modules cache
rm -rf node_modules/.cache

# Xóa Turbopack cache (nếu có)
rm -rf .turbo
```

---

### **Cách 3: Nuclear Option (Xóa tất cả và reinstall)**

```bash
cd /Users/vietchung/lmsmath

# Xóa tất cả
rm -rf .next node_modules/.cache .turbo node_modules

# Reinstall
npm install
```

---

## 🚀 **SAU KHI XÓA CACHE - Deploy:**

### **Option A: Deploy Script (Includes Cache Clear)**

```bash
cd /Users/vietchung/lmsmath
./FINAL_DEPLOY_NOW.sh
```

**Script tự động:**
1. ✅ Clear .next cache
2. ✅ Clear node_modules/.cache
3. ✅ Docker build --no-cache (fresh build)
4. ✅ Deploy to Cloud Run

**Timeline:** ~15 minutes

---

### **Option B: Manual Deploy**

```bash
cd /Users/vietchung/lmsmath

# 1. Clear cache
rm -rf .next

# 2. Test build locally (optional)
npm run build

# 3. Deploy
./deploy.sh
```

---

## 📊 **Cache Locations:**

```
Project Root: /Users/vietchung/lmsmath/

Caches:
├── .next/                    ← Next.js build output
│   ├── cache/                ← Build cache
│   ├── static/               ← Static assets
│   ├── server/               ← Server bundles
│   └── standalone/           ← Standalone output
├── node_modules/
│   └── .cache/               ← Node modules cache
│       ├── babel-loader/
│       ├── webpack/
│       └── ...
└── .turbo/                   ← Turbopack cache (if using)
```

---

## 🧪 **Verify Cache Cleared:**

```bash
# Check .next exists
ls -la .next 2>/dev/null || echo "✅ .next cleared"

# Check size
du -sh .next 2>/dev/null || echo "✅ No cache"

# Check node_modules cache
ls -la node_modules/.cache 2>/dev/null || echo "✅ No cache"
```

---

## 🎯 **When to Clear Cache:**

| Situation | Clear | Command |
|-----------|-------|---------|
| Before deploy | ✅ Yes | `rm -rf .next` |
| After code changes | ✅ Yes | `rm -rf .next` |
| After env var changes | ✅ Yes | `rm -rf .next` |
| Build errors | ✅ Yes | `rm -rf .next node_modules/.cache` |
| Switch branches | ✅ Yes | `rm -rf .next` |
| Update dependencies | ✅ Yes | `rm -rf .next node_modules/.cache` |
| Normal development | ❌ No | Auto-handled by Next.js |

---

## 💡 **Pro Tips:**

### **1. Deploy Script Auto-Clears:**

```bash
# FINAL_DEPLOY_NOW.sh already includes:
rm -rf .next
rm -rf node_modules/.cache

# So just run:
./FINAL_DEPLOY_NOW.sh
```

### **2. Add to package.json:**

```json
{
  "scripts": {
    "clean": "rm -rf .next node_modules/.cache .turbo",
    "clean:all": "rm -rf .next node_modules/.cache .turbo node_modules",
    "rebuild": "npm run clean && npm run build"
  }
}
```

Then use:
```bash
npm run clean
npm run clean:all
npm run rebuild
```

### **3. Git Clean:**

```bash
# Remove all ignored files (including .next)
git clean -fdX

# Preview what will be removed
git clean -fdXn
```

---

## 🔍 **Check What's Taking Space:**

```bash
# Check .next size
du -sh .next

# Check node_modules/.cache size
du -sh node_modules/.cache

# Check total
du -sh .next node_modules/.cache .turbo
```

---

## 🎯 **For Your Current Issue:**

**You DON'T need to manually clear!**

**Just run:**

```bash
./FINAL_DEPLOY_NOW.sh
```

**Script handles everything:**
- ✅ Clears .next automatically (line 19-21)
- ✅ Docker build --no-cache (fresh build)
- ✅ No old cache in final image
- ✅ Deploy with correct env vars

---

## 📋 **Quick Commands:**

```bash
# Just clear cache
./scripts/clear-cache.sh

# Clear and restart dev
rm -rf .next && npm run dev

# Clear and rebuild
rm -rf .next && npm run build

# Clear and deploy (RECOMMENDED)
./FINAL_DEPLOY_NOW.sh
```

---

## ✅ **Summary:**

**To clear cache:**
```bash
rm -rf .next
```

**To clear all:**
```bash
rm -rf .next node_modules/.cache .turbo
```

**To deploy (auto-clears):**
```bash
./FINAL_DEPLOY_NOW.sh
```

---

**📖 Full Guide:** `CLEAR_NEXTJS_CACHE.md`

**⚡ Quick Clear:**
```bash
./scripts/clear-cache.sh
```

**🚀 Deploy (auto-clears):**
```bash
./FINAL_DEPLOY_NOW.sh
```

**🎊 Use deploy script - it handles everything!** ✨

