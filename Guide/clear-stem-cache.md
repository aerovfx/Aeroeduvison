# Clear STEM Page Cache - Hướng Dẫn

## 🐛 Vấn Đề
Trang STEM Projects vẫn hiển thị loading "Đang tải dự án STEM..." do browser cache hoặc Next.js cache.

## ✅ Giải Pháp

### Cách 1: Hard Refresh Browser (Khuyến nghị)
1. Truy cập: https://inphysic.com/dashboard/stem
2. Nhấn **Ctrl+Shift+R** (Windows/Linux) hoặc **Cmd+Shift+R** (Mac)
3. Hoặc nhấn **F12** → **Network tab** → tick **Disable cache** → refresh

### Cách 2: Clear Browser Cache
1. **Chrome:** Settings → Privacy → Clear browsing data → Cached images and files
2. **Firefox:** Settings → Privacy → Clear Data → Cached Web Content
3. **Safari:** Develop → Empty Caches

### Cách 3: Incognito/Private Mode
1. Mở browser ở chế độ Incognito/Private
2. Truy cập: https://inphysic.com/dashboard/stem

### Cách 4: Force Cache Clear (Advanced)
```javascript
// Mở DevTools Console (F12) và chạy:
localStorage.removeItem('stem-projects');
localStorage.removeItem('stem-projects-version');
sessionStorage.clear();
location.reload(true);
```

## 🎯 Kết Quả Mong Đợi

Sau khi clear cache, trang sẽ hiển thị:
- ✅ 10 dự án STEM mock
- ✅ Statistics cards (5 metrics)
- ✅ Search và filter
- ✅ Project grid với đầy đủ thông tin

## 📞 Nếu Vẫn Không Hoạt Động

1. **Kiểm tra Console Errors:**
   - Nhấn F12 → Console tab
   - Xem có lỗi JavaScript nào không

2. **Kiểm tra Network:**
   - Nhấn F12 → Network tab
   - Refresh trang
   - Xem có request nào fail không

3. **Test API:**
   ```bash
   curl -I https://inphysic.com/dashboard/stem
   # Expected: HTTP 200
   ```

## 🚀 Deployment Status

- ✅ **Code Fixed:** STEMContext và loading logic đã được fix
- ✅ **Deployed:** New version đã deploy lên Cloud Run
- ✅ **Tests Passing:** All verification tests pass
- ⚠️ **Cache Issue:** Browser/Next.js cache cần clear

---

**Fix đã hoàn tất, chỉ cần clear cache để thấy kết quả!**
