'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import './mediapipe-console-filter';
import './ripple-effect.css';

interface Ripple {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  speed: number;
}

export default function RippleEffectPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const ripplesRef = useRef<Ripple[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize MediaPipe
  useEffect(() => {
    const initializeMediaPipe = async () => {
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
        console.error('Error initializing MediaPipe:', err);
        setError('Không thể khởi tạo MediaPipe. Vui lòng thử lại.');
      }
    };
    
    initializeMediaPipe();
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
        // ⚠️ QUAN TRỌNG: Phải await play() để video bắt đầu stream
        await videoRef.current.play();
        setIsStarted(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStarted(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  // Create ripple
  const createRipple = (x: number, y: number) => {
    const ripple: Ripple = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      radius: 0,
      maxRadius: 200 + Math.random() * 100,
      opacity: 0.8,
      speed: 2 + Math.random() * 2
    };
    ripplesRef.current.push(ripple);
    
    // Limit ripple count
    if (ripplesRef.current.length > 20) {
      ripplesRef.current.shift();
    }
  };
  
  // Update ripples
  const updateRipples = () => {
    ripplesRef.current = ripplesRef.current.filter(ripple => {
      ripple.radius += ripple.speed;
      ripple.opacity -= 0.01;
      
      if (ripple.radius > ripple.maxRadius || ripple.opacity <= 0) {
        return false;
      }
      
      return true;
    });
  };
  
  // Draw ripples
  const drawRipples = (ctx: CanvasRenderingContext2D) => {
    ripplesRef.current.forEach(ripple => {
      ctx.save();
      
      // Create gradient
      const gradient = ctx.createRadialGradient(
        ripple.x,
        ripple.y,
        ripple.radius * 0.5,
        ripple.x,
        ripple.y,
        ripple.radius
      );
      
      gradient.addColorStop(0, `rgba(255, 255, 255, ${ripple.opacity * 0.3})`);
      gradient.addColorStop(0.5, `rgba(100, 200, 255, ${ripple.opacity * 0.2})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner circle
      ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.opacity * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    });
  };
  
  // Apply ripple distortion to video
  const applyRippleDistortion = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ) => {
    // Create temporary canvas for distortion
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;
    
    // Draw video to temp canvas
    tempCtx.save();
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    tempCtx.restore();
    
    // Apply ripple distortion
    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    ripplesRef.current.forEach(ripple => {
      if (ripple.radius < 10) return;
      
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const dx = x - ripple.x;
          const dy = y - ripple.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < ripple.radius && distance > ripple.radius - 20) {
            const angle = Math.atan2(dy, dx);
            const distortion = Math.sin((ripple.radius - distance) / 5) * 5;
            const newX = Math.round(x + Math.cos(angle) * distortion);
            const newY = Math.round(y + Math.sin(angle) * distortion);
            
            if (newX >= 0 && newX < canvas.width && newY >= 0 && newY < canvas.height) {
              const srcIndex = (y * canvas.width + x) * 4;
              const dstIndex = (newY * canvas.width + newX) * 4;
              
              newData[dstIndex] = data[srcIndex];
              newData[dstIndex + 1] = data[srcIndex + 1];
              newData[dstIndex + 2] = data[srcIndex + 2];
              newData[dstIndex + 3] = data[srcIndex + 3];
            }
          }
        }
      }
    });
    
    const newImageData = new ImageData(newData, canvas.width, canvas.height);
    ctx.putImageData(newImageData, 0, 0);
  };
  
  // Detection loop
  useEffect(() => {
    if (!isInitialized || !handLandmarker || !isStarted) return;
    
    let lastRippleTime = 0;
    
    const detect = () => {
      if (!videoRef.current || !canvasRef.current) {
        requestAnimationFrame(detect);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // ⚠️ Fix: Check readyState >= 2 (HAVE_CURRENT_DATA) thay vì === 4 để tránh block
      if (!ctx || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      
      // ⚠️ Fix: Đảm bảo video đang play
      if (video.paused) {
        video.play().catch(console.error);
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw video with ripple distortion
      applyRippleDistortion(ctx, video, canvas);
      
      // Detect hands
      const startTime = performance.now();
      const handResults = handLandmarker.detectForVideo(video, startTime);
      
      if (handResults.landmarks && handResults.landmarks.length > 0) {
        handResults.landmarks.forEach((landmarks) => {
          // Get palm center
          const wrist = landmarks[0];
          const middleMcp = landmarks[9];
          const palmX = (1 - (wrist.x + middleMcp.x) / 2) * canvas.width;
          const palmY = ((wrist.y + middleMcp.y) / 2) * canvas.height;
          
          // Create ripple when hand moves
          const now = Date.now();
          if (now - lastRippleTime > 300) {
            createRipple(palmX, palmY);
            lastRippleTime = now;
          }
        });
      }
      
      // Update and draw ripples
      updateRipples();
      drawRipples(ctx);
      
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
    
    // ⚠️ Fix: Cleanup animation frame
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isInitialized, handLandmarker, isStarted]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  return (
    <div className="ripple-effect-container">
      <div className="header">
        <h1>🌊 Hiệu Ứng Ripple với Hand Gestures</h1>
        <p>Vẫy tay để tạo hiệu ứng sóng nước trên video</p>
      </div>
      
      <div className="main-layout">
        <div className="camera-section">
          <div className="video-container">
            <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline />
            <canvas 
              ref={canvasRef} 
              width={1280} 
              height={720}
              style={{ display: isInitialized ? 'block' : 'none', width: '100%', height: '100%' }}
            />
            
            {!isInitialized && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Đang khởi tạo MediaPipe...</p>
              </div>
            )}
            
            {error && (
              <div className="error-overlay">
                <p>❌ {error}</p>
              </div>
            )}
          </div>
          
          <div className="controls">
            {!isStarted ? (
              <button onClick={startCamera} className="btn btn-primary">
                ▶️ Bắt đầu Camera
              </button>
            ) : (
              <button onClick={stopCamera} className="btn btn-danger">
                ⏹️ Dừng Camera
              </button>
            )}
          </div>
        </div>
        
        <div className="info-panel">
          <div className="info-card">
            <h3>📖 Hướng dẫn:</h3>
            <ul>
              <li>🖐️ Giơ tay trước camera</li>
              <li>👋 Vẫy tay để tạo sóng</li>
              <li>🌊 Hiệu ứng ripple sẽ lan tỏa từ lòng bàn tay</li>
              <li>✨ Video sẽ bị biến dạng như nhìn qua nước</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h3>🌊 Thông tin:</h3>
            <div className="stats">
              <div className="stat-item">
                <span className="label">Số sóng:</span>
                <span className="value">{ripplesRef.current.length}</span>
              </div>
              <div className="stat-item">
                <span className="label">Trạng thái:</span>
                <span className="value">{isStarted ? 'Đang chạy' : 'Đã dừng'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

