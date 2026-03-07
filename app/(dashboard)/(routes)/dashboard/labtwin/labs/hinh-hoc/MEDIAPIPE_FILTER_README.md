# 🔧 MediaPipe Console Filter - Quick Start

## 🚀 Sử dụng nhanh

Thêm dòng này vào **ĐẦU TIÊN** của component file:

```typescript
'use client';

// ⚠️ Import này PHẢI Ở ĐẦU TIÊN
import './mediapipe-console-filter';

// ... rest of imports
```

## ✅ Kết quả

**Trước:**
```
❌ ERROR: INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
❌ ERROR: Graph successfully started running.
```

**Sau:**
```
ℹ️ [MediaPipe Filter] Active - Suppressing INFO/WARNING logs
ℹ️ [MediaPipe Info] INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
ℹ️ [MediaPipe Info] Graph successfully started running.
```

## 📖 Chi tiết

Xem file `/lib/MEDIAPIPE_CONSOLE_FILTER_README.md` để biết thêm chi tiết.

## 🐛 Troubleshooting

1. **Import phải ở đầu tiên** - Trước tất cả imports khác
2. **Clear cache** nếu không hoạt động: `rm -rf .next && npm run dev`
3. **Check file path** - Đảm bảo path đúng

---

**Happy coding!** 🚀✨

