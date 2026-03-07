# MediaPipe Camera Frame Freezing - Nguyên nhân và Giải pháp

## 🔴 Các vấn đề phổ biến gây đứng khung hình

### 1. **Video Element không được play()**
**Vấn đề**: Sau khi set `srcObject`, video element cần được gọi `play()` để bắt đầu stream.

**Giải pháp**:
```typescript
const stream = await navigator.mediaDevices.getUserMedia({...});
if (videoRef.current) {
  videoRef.current.srcObject = stream;
  await videoRef.current.play(); // ⚠️ QUAN TRỌNG: Phải await play()
}
```

### 2. **Animation Frame không được cleanup**
**Vấn đề**: Nếu không lưu `requestAnimationFrame` ID và cancel khi unmount, sẽ có nhiều loop chạy đồng thời.

**Giải pháp**:
```typescript
const animationFrameRef = useRef<number | null>(null);

const detect = () => {
  // ... detection code ...
  animationFrameRef.current = requestAnimationFrame(detect);
};

// Cleanup
useEffect(() => {
  return () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
}, []);
```

### 3. **Video readyState check không đúng**
**Vấn đề**: Một số code check `video.readyState !== video.HAVE_ENOUGH_DATA` (4), nhưng nên check `video.readyState >= 2` (HAVE_CURRENT_DATA) để tránh block.

**Giải pháp**:
```typescript
// ❌ SAI
if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
  requestAnimationFrame(detect);
  return;
}

// ✅ ĐÚNG
if (!ctx || video.readyState < 2) { // HAVE_CURRENT_DATA = 2
  requestAnimationFrame(detect);
  return;
}
```

### 4. **Không có throttling cho detection**
**Vấn đề**: Detection loop chạy quá nhanh, gây overload CPU/GPU.

**Giải pháp**:
```typescript
let lastDetectionTime = 0;
const DETECTION_INTERVAL = 33; // ~30fps

const detect = () => {
  const now = performance.now();
  if (now - lastDetectionTime < DETECTION_INTERVAL) {
    requestAnimationFrame(detect);
    return;
  }
  lastDetectionTime = now;
  
  // ... detection code ...
};
```

### 5. **Video element không có event handler**
**Vấn đề**: Không đợi video metadata load xong.

**Giải pháp**:
```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  
  const handleLoadedMetadata = () => {
    // Video đã sẵn sàng
    video.play();
  };
  
  video.addEventListener('loadedmetadata', handleLoadedMetadata);
  
  return () => {
    video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  };
}, []);
```

### 6. **Stream không được stop đúng cách**
**Vấn đề**: Stream tracks không được stop khi unmount.

**Giải pháp**:
```typescript
const stopCamera = () => {
  if (videoRef.current && videoRef.current.srcObject) {
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => {
      track.stop(); // ⚠️ QUAN TRỌNG: Stop từng track
    });
    videoRef.current.srcObject = null;
  }
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }
};
```

### 7. **Video element bị pause**
**Vấn đề**: Video element có thể bị pause do browser policy hoặc tab inactive.

**Giải pháp**:
```typescript
const detect = () => {
  if (!videoRef.current || videoRef.current.paused) {
    // Đảm bảo video đang play
    videoRef.current?.play().catch(console.error);
    requestAnimationFrame(detect);
    return;
  }
  // ... rest of code ...
};
```

## ✅ Template code đúng chuẩn

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export default function MediaPipePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize MediaPipe
  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2
        });
        setHandLandmarker(handLandmarker);
        setIsInitialized(true);
      } catch (err) {
        console.error('Error:', err);
      }
    };
    init();
  }, []);
  
  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // ⚠️ QUAN TRỌNG: Phải await play()
        await videoRef.current.play();
        setIsStarted(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsStarted(false);
  };
  
  // Detection loop
  useEffect(() => {
    if (!isInitialized || !handLandmarker || !isStarted) return;
    
    let lastDetectionTime = 0;
    const DETECTION_INTERVAL = 33; // ~30fps
    
    const detect = () => {
      if (!videoRef.current || !canvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // ⚠️ Check readyState >= 2 (HAVE_CURRENT_DATA)
      if (!ctx || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      
      // ⚠️ Throttle detection
      const now = performance.now();
      if (now - lastDetectionTime < DETECTION_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      lastDetectionTime = now;
      
      // ⚠️ Ensure video is playing
      if (video.paused) {
        video.play().catch(console.error);
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      
      // Clear and draw video
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Detect
      const startTime = performance.now();
      const results = handLandmarker.detectForVideo(video, startTime);
      
      // Process results...
      if (results.landmarks && results.landmarks.length > 0) {
        // ... your code ...
      }
      
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
    
    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isInitialized, handLandmarker, isStarted]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  return (
    <div>
      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline />
      <canvas ref={canvasRef} width={1280} height={720} />
      {!isStarted ? (
        <button onClick={startCamera}>Start</button>
      ) : (
        <button onClick={stopCamera}>Stop</button>
      )}
    </div>
  );
}
```

## 📋 Checklist khi implement MediaPipe

- [ ] Video element có `autoPlay` và `playsInline` attributes
- [ ] Gọi `await video.play()` sau khi set `srcObject`
- [ ] Check `video.readyState >= 2` thay vì `=== 4`
- [ ] Lưu `requestAnimationFrame` ID vào ref
- [ ] Cancel animation frame trong cleanup
- [ ] Stop tất cả stream tracks khi unmount
- [ ] Throttle detection loop (30fps recommended)
- [ ] Check `video.paused` và resume nếu cần
- [ ] Handle errors trong `video.play()`

## 🐛 Debug tips

1. **Check video state**:
```typescript
console.log('Video state:', {
  readyState: video.readyState, // 0-4
  paused: video.paused,
  ended: video.ended,
  currentTime: video.currentTime
});
```

2. **Monitor frame rate**:
```typescript
let frameCount = 0;
let lastFpsTime = performance.now();

const detect = () => {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime > 1000) {
    console.log('FPS:', frameCount);
    frameCount = 0;
    lastFpsTime = now;
  }
  // ...
};
```

3. **Check for memory leaks**:
```typescript
// Trong DevTools Performance tab, check:
// - Animation frame callbacks không tăng liên tục
// - Memory usage không tăng liên tục
// - CPU usage ổn định
```

