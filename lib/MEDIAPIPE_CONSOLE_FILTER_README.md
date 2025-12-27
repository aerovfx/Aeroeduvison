# 🔧 MediaPipe Console Filter - Installation Guide

## 📋 Vấn đề

MediaPipe sử dụng `console.error()` cho cả INFO messages, khiến Next.js dev overlay hiển thị các thông báo vô hại như errors:

```
❌ ERROR: INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
❌ ERROR: Graph successfully started running.
```

## ✅ Giải pháp

Filter này sẽ:
1. ✨ Chuyển INFO messages → `console.log` với màu xanh đẹp
2. 🔇 Suppress các warnings không cần thiết
3. ❌ Giữ nguyên real errors để debug

## 🚀 Cài đặt

### **Bước 1: File đã có sẵn**

File filter đã được tạo tại:
- `/lib/mediapipe-console-filter.ts` (dùng chung)
- `/app/(dashboard)/(routes)/dashboard/labtwin/labs/hinh-hoc/mediapipe-console-filter.ts` (local)

### **Bước 2: Sử dụng trong component**

Thêm vào **ĐẦU TIÊN** trong component file:

```typescript
'use client';

// ⚠️ Import này PHẢI Ở ĐẦU TIÊN, trước tất cả imports khác
import '@/lib/mediapipe-console-filter';
// hoặc nếu file cùng folder:
// import './mediapipe-console-filter';

import { useEffect, useRef, useState } from 'react';
// ... rest of imports
```

### **Bước 3: Verify**

Khởi động dev server:

```bash
npm run dev
```

Mở console và bạn sẽ thấy:

✅ **Trước:**
```
❌ ERROR: INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
❌ ERROR: Graph successfully started running.
⚠️  WARNING: OpenGL error checking is disabled
```

✅ **Sau:**
```
ℹ️ [MediaPipe Filter] Active - Suppressing INFO/WARNING logs
ℹ️ [MediaPipe Info] INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
ℹ️ [MediaPipe Info] Graph successfully started running.
(Warnings bị suppress hoàn toàn)
```

## 📊 Chi tiết Filter

### **Patterns được suppress:**

```typescript
const suppressPatterns = [
  'INFO:',                                    // All INFO messages
  'Created TensorFlow Lite',                  // XNNPACK delegate
  'XNNPACK delegate',                         // Performance info
  'Sets FaceBlendshapesGraph',               // Graph config
  'Using NORM_RECT without IMAGE_DIMENSIONS', // Internal warnings
  'OpenGL error checking is disabled',        // Performance optimization
  'Graph successfully started running',       // Success messages
  'GL version:',                              // GPU info
  'renderer: WebKit WebGL'                    // Renderer info
];
```

### **Patterns được convert sang console.log:**

```typescript
const infoPatterns = [
  'INFO:',                          // General info
  'Created TensorFlow Lite',        // Initialization info
  'Graph successfully started running' // Success info
];
```

## 🎨 Visual Output

Filter thêm màu sắc để dễ nhận biết:

- 🟢 **[MediaPipe Info]** - Màu xanh lá (#48bb78)
- 🔵 **[MediaPipe Filter]** - Màu tím (#667eea)

## 🔧 Tùy chỉnh

### **Thêm patterns mới:**

Edit `mediapipe-console-filter.ts`:

```typescript
const suppressPatterns = [
  // Existing patterns...
  'Your custom pattern here',
];
```

### **Disable filter trong production:**

Filter tự động tắt warning message trong production. Chỉ INFO logs được giữ lại.

### **Hoàn toàn tắt filter:**

Xóa hoặc comment dòng import:

```typescript
// import '@/lib/mediapipe-console-filter';  // ← Comment để tắt
```

## 🐛 Troubleshooting

### **Filter không hoạt động:**

1. **Kiểm tra import order:**
   ```typescript
   // ✅ ĐÚNG - Import filter TRƯỚC
   import '@/lib/mediapipe-console-filter';
   import { useEffect } from 'react';
   
   // ❌ SAI - Import filter SAU
   import { useEffect } from 'react';
   import '@/lib/mediapipe-console-filter';
   ```

2. **Kiểm tra file path:**
   ```typescript
   // Nếu file cùng folder:
   import './mediapipe-console-filter';
   
   // Nếu file ở folder khác:
   import '@/lib/mediapipe-console-filter';
   // hoặc
   import '../utils/mediapipe-console-filter';
   ```

3. **Clear cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

### **Vẫn thấy errors:**

Kiểm tra error message có khớp patterns không:

```typescript
console.log('Check if message contains:', 
  suppressPatterns.some(p => errorMessage.includes(p))
);
```

## 📝 Notes

### **Performance Impact:**

- **Minimal** - Chỉ kiểm tra string patterns
- **No impact** on MediaPipe performance
- **No impact** on production build

### **Compatibility:**

- ✅ Next.js 13+
- ✅ React 18+
- ✅ TypeScript
- ✅ JavaScript (remove type annotations)

### **Alternative Approaches:**

Nếu không muốn dùng filter này, bạn có thể:

1. **Ignore trong browser:**
   - Mở DevTools → Console → Filter levels
   - Uncheck "Errors" tạm thời

2. **Disable Next.js overlay:**
   ```typescript
   // next.config.js
   module.exports = {
     devIndicators: {
       buildActivity: false,
     },
   };
   ```

## ✨ Kết quả

Sau khi cài đặt, console sẽ sạch sẽ hơn:

```
✅ Console trước filter:
- 50+ error messages (thực ra là INFO)
- Next.js overlay hiện liên tục
- Khó debug real errors

✅ Console sau filter:
- 0 fake errors
- Chỉ có INFO logs với màu đẹp
- Dễ dàng phát hiện real errors
```

## 🎯 Summary

| Trước | Sau |
|-------|-----|
| 50+ console errors | 0 fake errors |
| Next.js overlay spam | Overlay chỉ hiện real errors |
| Khó debug | Dễ debug |
| Console lộn xộn | Console sạch sẽ |

## 📍 File Locations

- **Global filter:** `/lib/mediapipe-console-filter.ts`
- **Local filter:** `/app/(dashboard)/(routes)/dashboard/labtwin/labs/hinh-hoc/mediapipe-console-filter.ts`

## 🔗 Related Files

- `MEDIAPIPE_FIX_GUIDE.md` - General MediaPipe troubleshooting
- `next.config.js` - Webpack configuration for MediaPipe

---

**Happy coding!** 🚀✨

Nếu gặp vấn đề, check lại:
1. ✅ Import order (filter phải import TRƯỚC)
2. ✅ File path đúng
3. ✅ Clear cache (.next folder)

