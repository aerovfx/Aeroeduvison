# 🔧 Fix DevTools Blocking - Step by Step with Screenshots Guide

---

## 🚨 **YOUR EXACT ERROR:**

```
Request was blocked by DevTools: "https://inphysic.com/_next/static/..."
```

**This is 100% DevTools setting! NOT a code issue!**

---

## ✅ **FIX IN 6 STEPS (30 seconds):**

---

### **STEP 1: Open DevTools**

```
Press: F12
OR: Right-click → Inspect
OR: Cmd+Option+I (Mac)
```

---

### **STEP 2: Click "Network" Tab**

```
Look at top of DevTools panel
Tabs: Elements | Console | Sources | Network | ...
Click: Network
```

---

### **STEP 3: Find Request Blocking Icon**

```
Look at toolbar INSIDE Network tab (top area)
Find icon that looks like: 🚫 (circle with line through it)
OR text that says: "Request blocking"

Usually located:
- Top-right area of Network tab
- Next to filter input box
- Between "Preserve log" and other icons
```

---

### **STEP 4: Click The Icon**

```
Click the 🚫 icon
→ A panel will slide down from top
→ Panel title: "Request blocking"
```

---

### **STEP 5: UNCHECK The Box**

```
Inside the panel, you'll see:

☐ Enable request blocking    ← UNCHECK THIS!

Make sure the box is EMPTY (no checkmark)
```

---

### **STEP 6: Close Panel & Refresh**

```
1. Click outside the panel OR click X to close it
2. Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Win)
```

---

## ✅ **DONE! Page Should Load Now**

---

## 🔍 **Can't Find The Icon? Alternative:**

### **Via Settings:**

```
1. DevTools open (F12)
2. Click Settings icon ⚙️ (top-right corner of DevTools)
3. Left sidebar → Click "Network"
4. Find checkbox: "Enable request blocking"
5. UNCHECK it
6. Close Settings (X)
7. Refresh page (F5)
```

---

## 🧪 **Verify It's Fixed:**

### **Test in Console:**

```javascript
// F12 → Console tab → Paste this:
fetch('/_next/static/css/test.css')
  .then(() => console.log('✅ Requests working!'))
  .catch(() => console.log('❌ Still blocked'));
```

### **Check Network Tab:**

```
After refresh, Network tab should show:
✅ All files loading (green, 200 OK)
✅ No red lines
✅ No "blocked by DevTools" text
```

---

## 🎯 **If Still Blocked:**

### **Try Incognito Mode:**

```
1. Cmd+Shift+N (Mac) / Ctrl+Shift+N (Win)
2. Go to: https://inphysic.com
3. If works → DevTools setting in regular browser
4. If fails → Check extensions
```

### **Check Extensions:**

```
chrome://extensions
→ Disable all (especially Adblock Plus)
→ Refresh page
→ Should work
```

### **Nuclear Option - Reset DevTools:**

```
DevTools → Settings ⚙️ → Scroll to bottom
→ "Restore defaults and reload"
→ Confirm
```

---

## 📊 **Visual Guide:**

```
DevTools Window
┌─────────────────────────────────────────────┐
│ Elements | Console | Sources | Network | ... │  ← Tabs
├─────────────────────────────────────────────┤
│ Network Tab Content:                         │
│ ┌─────────────────────────────────────────┐ │
│ │ [Filter] [🚫] [⚙️] ...                  │ │  ← Toolbar
│ │      ↑                                   │ │
│ │   THIS ICON!                             │ │
│ │                                          │ │
│ │ Click this → Panel opens:                │ │
│ │ ┌────────────────────────────────────┐  │ │
│ │ │ Request blocking                   │  │ │
│ │ │ ☐ Enable request blocking          │  │ │  ← UNCHECK!
│ │ │                                     │  │ │
│ │ │ + Add pattern                       │  │ │
│ │ └────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 💡 **Key Points:**

1. **This is BROWSER issue, not code!**
   - Your code is correct ✅
   - Your deployment is successful ✅
   - Just DevTools setting ❌

2. **Cookie clearing doesn't fix this**
   - Different issue
   - Blocking happens before cookies

3. **Must disable request blocking**
   - Only solution
   - Takes 30 seconds

---

## 🎊 **After Fixing DevTools:**

**Then you can focus on env vars:**
```
https://console.cloud.google.com/run
→ Set NEXTAUTH_URL=https://inphysic.com
→ Deploy
→ Test
```

---

## 🚀 **PRIORITY ORDER:**

```
1. Fix DevTools blocking (30 sec) ← DO THIS FIRST!
2. Clear cookies (utility page)
3. Set env vars (Console UI, 5 min)
4. Test login
5. Success! ✅
```

---

**📖 Full Guide:** `FIX_DEVTOOLS_STEP_BY_STEP.md`

**⚡ Quick Fix:**
```
F12 → Network → Find 🚫 icon → Uncheck "Enable request blocking" → Refresh
```

**🎯 DO THIS FIRST before anything else!** ✅

