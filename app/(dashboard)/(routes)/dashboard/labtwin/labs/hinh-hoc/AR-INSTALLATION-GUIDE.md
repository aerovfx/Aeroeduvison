# 🎭 AR Overlay System - Installation Guide

Hướng dẫn cài đặt và sử dụng hệ thống AR Overlay với 18 effects!

## 📦 Files Structure

```
app/(dashboard)/(routes)/dashboard/labtwin/labs/hinh-hoc/
├── Scene3DControlWithAR.tsx    # Main component với AR overlay
├── scene-control.css            # Styling cho AR panel
├── mediapipe-console-filter.ts  # Console filter
└── AR-INSTALLATION-GUIDE.md    # This file

lib/
├── ar-assets.ts                 # AR assets configuration (18 effects)
└── ar-overlay-renderer.ts      # AR rendering functions
```

## 🚀 Quick Start

### 1. Import Component

```typescript
import Scene3DControlWithAR from './Scene3DControlWithAR';

export default function YourPage() {
  return <Scene3DControlWithAR />;
}
```

### 2. Dependencies

Đảm bảo các packages sau đã được cài đặt:

```bash
npm install @mediapipe/tasks-vision three
```

### 3. Browser Requirements

- **Chrome/Edge**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (iOS 14+)
- **Mobile**: ✅ Works on modern mobile browsers

## 🎨 AR Effects Available

### 🎄 Christmas (4 effects)
- 🎅 **Santa Hat** - Mũ đỏ truyền thống với pom-pom trắng
- 🦌 **Reindeer Antlers** - Sừng tuần lộc với mũi đỏ Rudolf
- 🧝 **Elf Hat** - Mũ nhọn xanh của yêu tinh
- ⛄ **Snowman** - Biến thành người tuyết

### 🎭 Japanese Masks (4 effects)
- 🦊 **Kitsune Mask** - Mặt nạ cáo truyền thống
- 👹 **Oni Mask** - Mặt nạ quỷ đỏ
- 👺 **Tengu Mask** - Mặt nạ Tengu với mũi dài
- 🎭 **Kabuki Mask** - Mặt nạ kịch Kabuki

### 🎬 Movie Characters (6 effects)
- 🦸‍♂️ **Iron Man** - Mặt nạ Iron Man
- 🕸️ **Spider-Man** - Mặt nạ người nhện
- 🦇 **Batman** - Mặt nạ Batman với tai nhọn
- 💀 **Deadpool** - Mặt nạ Deadpool màu đỏ
- 🃏 **Joker** - Mặt nạ Joker với nụ cười ma quái
- 🎖️ **Stormtrooper** - Mũ bảo hiểm Star Wars

### 😄 Funny/Extra (4 effects)
- 🏴‍☠️ **Pirate Hat** - Mũ cướp biển với đầu lâu
- 👑 **Crown** - Vương miện vàng sang trọng
- 🎊 **Party Hat** - Mũ nón sinh nhật đầy màu sắc
- 🔮 **Wizard Hat** - Mũ phù thủy với ngôi sao

## 🎮 How to Use

### Step 1: Start Camera
1. Click **"▶️ Bắt đầu"** button
2. Cho phép quyền truy cập camera
3. Đợi hệ thống khởi động (5-10 giây)

### Step 2: Select AR Effect
1. Click **"🎭 Chọn AR Effect"** button
2. Chọn category (Giáng Sinh, Nhật Bản, Phim Ảnh, Vui Nhộn)
3. Click vào icon AR effect muốn sử dụng
4. AR overlay sẽ xuất hiện trên khuôn mặt real-time!

### Step 3: Control 3D Cube
- **✋ Tay phải**: Nhéo ngón (thumb + index) để nắm và di chuyển cube
- **✊ Tay trái**: Nắm đấm và di chuyển để xoay cube

## 🔧 Advanced Configuration

### Customize AR Assets

Edit `lib/ar-assets.ts`:

```typescript
export const AR_ASSETS: ARAsset[] = [
  {
    id: 'your-custom-effect',
    name: 'Tên Effect',
    icon: '🎨',
    category: 'funny',
    type: 'hat',
    emoji: '🎨',
    description: 'Mô tả effect'
  },
  // ... thêm effects khác
];
```

### Custom Drawing Functions

Edit `lib/ar-overlay-renderer.ts`:

```typescript
export const drawYourCustomEffect = (
  ctx: CanvasRenderingContext2D,
  position: OverlayPosition
) => {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(position.rotation);
  
  // Your custom drawing code here
  
  ctx.restore();
};
```

### Adjust Position Calculation

```typescript
// Trong ar-overlay-renderer.ts
export const calculateHatPosition = (
  landmarks: any[],
  canvasWidth: number,
  canvasHeight: number
): OverlayPosition => {
  // Adjust multipliers để thay đổi vị trí
  const y = topHead.y * canvasHeight - headWidth * 0.3; // 0.3 = offset
  const width = headWidth * 1.3; // 1.3 = scale factor
  // ...
};
```

## 🐛 Troubleshooting

### Issue: Camera không hoạt động

**Solution:**
1. Kiểm tra quyền camera trong browser settings
2. Đảm bảo không có ứng dụng khác đang dùng camera
3. Thử refresh page và cho phép quyền lại

### Issue: AR overlay không hiển thị

**Solution:**
1. Đảm bảo face được phát hiện (check status panel)
2. Kiểm tra đã chọn AR effect chưa
3. Thử chọn AR effect khác
4. Kiểm tra console logs để xem có lỗi không

### Issue: Performance chậm

**Solution:**
1. Giảm resolution camera (640x480 thay vì 1280x720)
2. Tắt các AR effects phức tạp
3. Đóng các tab browser khác
4. Sử dụng GPU delegate (đã được enable mặc định)

### Issue: AR overlay bị lệch vị trí

**Solution:**
1. Điều chỉnh multipliers trong position calculation functions
2. Kiểm tra face landmarks có đúng không
3. Thử với lighting tốt hơn
4. Đảm bảo face được nhìn thẳng vào camera

## 📊 Performance Tips

### Optimize for Mobile

```typescript
// Trong Scene3DControlWithAR.tsx
const stream = await navigator.mediaDevices.getUserMedia({
  video: { 
    width: { ideal: 480 },  // Giảm resolution
    height: { ideal: 360 },
    facingMode: 'user'
  }
});
```

### Reduce Face Landmarks

```typescript
// Chỉ dùng essential landmarks
const essentialLandmarks = [
  landmarks[10],  // Forehead
  landmarks[1],   // Nose
  landmarks[152], // Chin
  landmarks[234], // Left temple
  landmarks[454]  // Right temple
];
```

## 🎯 Best Practices

1. **Lighting**: Đảm bảo đủ ánh sáng để face detection tốt
2. **Distance**: Giữ khoảng cách 50-100cm từ camera
3. **Angle**: Nhìn thẳng vào camera để tracking chính xác
4. **Background**: Background đơn giản giúp detection tốt hơn
5. **Performance**: Đóng các tab không cần thiết

## 🔮 Future Enhancements

### Planned Features:
- [ ] Multiple face tracking (hiện tại: 1 face)
- [ ] AR effect animations
- [ ] Custom AR effect upload
- [ ] AR effect presets/saved configurations
- [ ] Performance metrics dashboard
- [ ] AR effect intensity slider
- [ ] Face filters (beauty, color effects)

### How to Contribute:
1. Fork repository
2. Add new AR effects to `ar-assets.ts`
3. Implement custom drawing functions if needed
4. Test on multiple devices
5. Submit pull request

## 📚 API Reference

### AR Assets Interface

```typescript
interface ARAsset {
  id: string;                    // Unique identifier
  name: string;                   // Display name
  icon: string;                   // Icon emoji
  category: 'christmas' | 'japanese' | 'movie' | 'funny';
  type: 'hat' | 'mask' | 'accessory' | 'full-face';
  emoji: string;                  // Emoji for overlay
  description: string;            // Description text
}
```

### Overlay Position Interface

```typescript
interface OverlayPosition {
  x: number;      // X coordinate (center)
  y: number;      // Y coordinate (center)
  width: number;   // Width in pixels
  height: number;  // Height in pixels
  rotation: number; // Rotation in radians
}
```

### Helper Functions

```typescript
// Get assets by category
getAssetsByCategory('christmas'): ARAsset[]

// Get asset by ID
getAssetById('santa-hat'): ARAsset | undefined

// Calculate positions
calculateHatPosition(landmarks, width, height): OverlayPosition
calculateMaskPosition(landmarks, width, height): OverlayPosition
calculateFullFacePosition(landmarks, width, height): OverlayPosition

// Draw overlays
drawAROverlay(ctx, type, emoji, position, scale?): void
drawSantaHat(ctx, position): void
drawReindeerAntlers(ctx, position): void
```

## 🎉 Examples

### Example 1: Add Custom Christmas Effect

```typescript
// In lib/ar-assets.ts
{
  id: 'christmas-lights',
  name: 'Đèn Giáng Sinh',
  icon: '💡',
  category: 'christmas',
  type: 'accessory',
  emoji: '💡',
  description: 'Đèn Giáng Sinh nhấp nháy trên đầu'
}
```

### Example 2: Custom Drawing Function

```typescript
// In lib/ar-overlay-renderer.ts
export const drawChristmasLights = (
  ctx: CanvasRenderingContext2D,
  position: OverlayPosition
) => {
  ctx.save();
  ctx.translate(position.x, position.y);
  
  // Draw lights
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * position.width * 0.2;
    ctx.fillStyle = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'][i];
    ctx.beginPath();
    ctx.arc(x, 0, position.width * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
};
```

## 📞 Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console logs
2. Xem troubleshooting section
3. Kiểm tra browser compatibility
4. Tạo issue với thông tin:
   - Browser version
   - OS version
   - Error messages
   - Steps to reproduce

## 🎊 Credits

- **MediaPipe**: Face & Hand tracking
- **Three.js**: 3D graphics
- **AR Assets**: Custom designed emojis & effects

---

**Happy AR Overlaying! 🎭✨**

