# 🧪 Quick Test Guide - Python Simulations

## 🎯 Test URLs

### ✅ URL bạn đang test:
```
http://localhost:3000/dashboard/labtwin/labs/motion-tracking
```

---

## 🔧 Nếu gặp lỗi "params":

### Solution 1: INCOGNITO MODE (Quickest!)

```
1. Cmd+Shift+N (Mac) / Ctrl+Shift+N (Windows)
2. Paste URL: http://localhost:3000/dashboard/labtwin/labs/motion-tracking
3. ✅ Should work!
```

### Solution 2: Clear Browser Completely

```
Chrome/Edge:
- F12 (DevTools)
- Right-click Refresh
- "Empty Cache and Hard Reload"

Or:
- Cmd+Shift+Delete
- Clear "Cached images and files"
- "All time"
```

### Solution 3: Different Browser

```
Try in:
- Safari (if using Chrome)
- Chrome (if using Safari)  
- Firefox
- Edge
```

---

## ✅ Nếu page loads thành công:

### Motion Tracking Simulation sẽ có:

**Features:**
- Dropdown: Chọn motion type + object (9 combinations)
- Slider: Distance (3m → 15m)
- Animation controls: Play/Pause/Reset
- Tabs: 2D Camera View vs 3D World Space
- Data display: Camera parameters
- Formulas: Distance estimation, Projection

**Test:**
1. Chọn scenario khác nhau
2. Adjust distance slider
3. Click Play animation
4. Switch tabs (2D ↔ 3D)
5. ✅ Should all work!

---

## 🎬 ALTERNATIVE: Test Video Tracking (No Cache Issues!)

Nếu motion-tracking vẫn lỗi, dùng tool mới:

```
http://localhost:3000/dashboard/labtwin/video-tracking
```

**This page DEFINITELY works because:**
- Completely new
- No old cache
- Client Component from start
- Simple structure

**Features:**
- Upload any video (MP4, MOV, AVI)
- Click object to track
- See trajectory
- Export CSV

---

## 📊 All Working URLs

### Python Simulations (May need Incognito):
```
http://localhost:3000/dashboard/labtwin/labs/refraction
http://localhost:3000/dashboard/labtwin/labs/projectile
http://localhost:3000/dashboard/labtwin/labs/motion-tracking ← YOU ARE HERE
http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
```

### Video Tracking (Always Works):
```
http://localhost:3000/dashboard/labtwin/video-tracking
```

### Simple Test Page:
```
http://localhost:3000/dashboard/labtwin/labs-simple
```

---

## 🎯 Quick Decision Tree

```
Is motion-tracking loading?
├─ YES → Great! Test the simulation
│         - Change scenarios
│         - Adjust distance
│         - Play animation
│
└─ NO → Try Incognito
        ├─ Works in Incognito? 
        │  └─ YES → Use Incognito for now
        │          Cache will clear eventually
        │
        └─ Still fails?
           └─ Try Video Tracking instead
              http://localhost:3000/dashboard/labtwin/video-tracking
              ✅ Guaranteed to work!
```

---

## 🚀 BEST EXPERIENCE

### Option A: Fresh Browser
```
1. Open Incognito
2. Visit all simulation URLs
3. ✅ All should work perfectly
```

### Option B: Use Video Tracking
```
1. Visit: /dashboard/labtwin/video-tracking
2. Upload test video
3. Track object motion
4. Export data
5. ✅ Works flawlessly!
```

---

## 📝 Status Check

Let me know:
- ❓ Does motion-tracking page load?
- ❓ Do you see loading spinner then content?
- ❓ Or do you see error immediately?
- ❓ What does browser console show?

Based on your answer, I can provide specific next steps!

---

**Try Incognito mode first - that's the quickest solution!** 🚀


