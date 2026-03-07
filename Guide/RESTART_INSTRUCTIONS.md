# 🚨 QUAN TRỌNG: Hướng dẫn Restart Server

## ⚠️ Lỗi "Cannot read properties of undefined"

Lỗi này xảy ra do Next.js cache sau khi chuyển từ Server Components sang Client Components.

## ✅ GIẢI PHÁP (Làm theo thứ tự):

### Bước 1: Stop Dev Server
```bash
# Trong terminal đang chạy npm run dev
# Nhấn: Ctrl + C
```

### Bước 2: Clear Next.js Cache
```bash
rm -rf .next
```

### Bước 3: Clear Browser Cache (Optional nhưng recommended)
```
Chrome/Edge:
- Cmd + Shift + Delete (Mac)
- Ctrl + Shift + Delete (Windows)
- Chọn "Cached images and files"
- Clear

Hoặc đơn giản hơn:
- Mở DevTools (F12)
- Right-click nút Refresh
- Chọn "Empty Cache and Hard Reload"
```

### Bước 4: Restart Server
```bash
npm run dev
```

### Bước 5: Hard Refresh Browser
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

---

## 🎯 Test URLs

Sau khi restart, test các URLs sau:

### 1. Main LabTwin:
```
http://localhost:3000/dashboard/labtwin
```
- ✅ Should see Python Simulations section
- ✅ 4 simulation cards
- ✅ No errors

### 2. Labs Index:
```
http://localhost:3000/dashboard/labtwin/labs
```
- ✅ Should load
- ✅ Grid of 4 simulations
- ✅ No webpack errors

### 3. Individual Simulations:
```
http://localhost:3000/dashboard/labtwin/labs/refraction
http://localhost:3000/dashboard/labtwin/labs/projectile
http://localhost:3000/dashboard/labtwin/labs/motion-tracking
http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
```
- ✅ All should load
- ✅ Loading spinner brief
- ✅ Content displays
- ✅ No console errors

### 4. Harmonic Motion - Custom Inputs:
```
http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
```
1. Click "**Tùy chỉnh**"
2. Nhập tham số (A, f, φ)
3. Click "**Tính toán & Vẽ đồ thị**"
4. ✅ Should work!

### 5. Harmonic Motion - Presets:
1. Click "**Chế độ Preset**"
2. Click ⚖️ **Con lắc đơn**
3. ✅ Should highlight and update

---

## 🔍 Troubleshooting

### Nếu vẫn còn lỗi sau restart:

#### 1. Clear node_modules cache:
```bash
rm -rf node_modules/.cache
```

#### 2. Reinstall dependencies:
```bash
npm install
```

#### 3. Clear all caches:
```bash
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

#### 4. Check terminal output:
```bash
# Should see:
✓ Compiled successfully
Ready on http://localhost:3000
```

#### 5. Check browser console:
```
F12 → Console tab
Should be clean, no errors
```

---

## 📋 Quick Checklist

After restart, verify:

- [ ] Dev server running (no errors in terminal)
- [ ] Browser loads without errors
- [ ] `/dashboard/labtwin` page shows Python Simulations
- [ ] `/dashboard/labtwin/labs` shows grid of 4 simulations
- [ ] Can navigate to individual simulation pages
- [ ] Harmonic Motion custom inputs work
- [ ] Harmonic Motion presets clickable
- [ ] No webpack errors
- [ ] No "params" errors
- [ ] Console is clean

---

## 🎯 Expected Console Output (Clean)

```
🔍 [USERMENU] Status: authenticated
🔍 [USERMENU] Session: Object

✅ No errors
✅ No warnings about params
✅ No webpack module errors
```

---

## 🚀 Quick Command

One-liner để clear cache và restart:

```bash
rm -rf .next && npm run dev
```

---

## 📞 Still Having Issues?

### Debug Steps:

1. **Check file existence:**
```bash
./test-python-simulations.sh
# Should show: ✅ Passed: 32
```

2. **Verify data files:**
```bash
ls -la public/labs/
# Should show: index.json and 4 simulation folders
```

3. **Check build output:**
```bash
npm run simulations:build
# Should complete without errors
```

4. **Inspect specific page:**
```bash
# Look for syntax errors
cat app/(dashboard)/(routes)/dashboard/labtwin/labs/harmonic-motion/page.tsx | head -20
```

---

## ✅ Success Indicators

When everything works:

1. ✅ Terminal shows "Compiled successfully"
2. ✅ Browser loads pages instantly
3. ✅ No red errors in console
4. ✅ Simulations are interactive
5. ✅ Custom inputs work
6. ✅ Presets clickable
7. ✅ Animations smooth

---

## 🎉 Final Note

**After clearing cache and restarting, system should work perfectly!**

The issue was Next.js caching the old Server Component structure. 
Once cleared and restarted with new Client Components, all will work fine.

**Good luck! 🚀**


