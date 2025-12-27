'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver
} from '@mediapipe/tasks-vision';
import './mediapipe-console-filter';
import './bubble-effect.css';

interface Bubble {
  id: string;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  opacity: number;
  hue: number;
}

export default function BubbleEffectPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const bubblesRef = useRef<Bubble[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  // Helper to draw landmarks manually
  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[], canvas: HTMLCanvasElement) => {
    // Draw landmarks as dots
    landmarks.forEach((landmark: any) => {
      const x = (1 - landmark.x) * canvas.width;
      const y = landmark.y * canvas.height;
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw connections
    const connections = HandLandmarker.HAND_CONNECTIONS;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      const startLandmark = landmarks[start];
      const endLandmark = landmarks[end];
      if (startLandmark && endLandmark) {
        ctx.beginPath();
        ctx.moveTo((1 - startLandmark.x) * canvas.width, startLandmark.y * canvas.height);
        ctx.lineTo((1 - endLandmark.x) * canvas.width, endLandmark.y * canvas.height);
        ctx.stroke();
      }
    });
  };
  
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
  
  // Create bubble at position
  const createBubble = (x: number, y: number) => {
    const bubble: Bubble = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      radius: 20 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      opacity: 0.3 + Math.random() * 0.4,
      hue: Math.random() * 360
    };
    bubblesRef.current.push(bubble);
    
    // Limit bubble count
    if (bubblesRef.current.length > 50) {
      bubblesRef.current.shift();
    }
  };
  
  // Update bubbles
  const updateBubbles = (canvas: HTMLCanvasElement) => {
    bubblesRef.current = bubblesRef.current.filter(bubble => {
      bubble.x += bubble.vx;
      bubble.y += bubble.vy;
      bubble.radius += 0.1;
      bubble.opacity -= 0.005;
      
      // Remove if too large or transparent
      if (bubble.radius > 150 || bubble.opacity <= 0) {
        return false;
      }
      
      // Bounce off edges
      if (bubble.x - bubble.radius < 0 || bubble.x + bubble.radius > canvas.width) {
        bubble.vx *= -1;
      }
      if (bubble.y - bubble.radius < 0 || bubble.y + bubble.radius > canvas.height) {
        bubble.vy *= -1;
      }
      
      return true;
    });
  };
  
  // Draw bubbles
  const drawBubbles = (ctx: CanvasRenderingContext2D) => {
    bubblesRef.current.forEach(bubble => {
      ctx.save();
      
      // Create gradient
      const gradient = ctx.createRadialGradient(
        bubble.x - bubble.radius * 0.3,
        bubble.y - bubble.radius * 0.3,
        0,
        bubble.x,
        bubble.y,
        bubble.radius
      );
      
      gradient.addColorStop(0, `hsla(${bubble.hue}, 70%, 80%, ${bubble.opacity})`);
      gradient.addColorStop(0.5, `hsla(${bubble.hue}, 70%, 70%, ${bubble.opacity * 0.6})`);
      gradient.addColorStop(1, `hsla(${bubble.hue}, 70%, 60%, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add highlight
      ctx.fillStyle = `hsla(${bubble.hue}, 100%, 100%, ${bubble.opacity * 0.5})`;
      ctx.beginPath();
      ctx.arc(
        bubble.x - bubble.radius * 0.3,
        bubble.y - bubble.radius * 0.3,
        bubble.radius * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      ctx.restore();
    });
  };
  
  // Detection loop
  useEffect(() => {
    if (!isInitialized || !handLandmarker || !isStarted) return;
    
    const detect = () => {
      if (!videoRef.current || !canvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(detect);
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
      
      // Draw video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Detect hands
      const startTime = performance.now();
      const handResults = handLandmarker.detectForVideo(video, startTime);
      
      if (handResults.landmarks && handResults.landmarks.length > 0) {
        handResults.landmarks.forEach((landmarks) => {
          // Draw hand landmarks manually
          drawLandmarks(ctx, landmarks, canvas);
          
          // Create bubbles at fingertips
          const fingertips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
          fingertips.forEach(tipIndex => {
            const tip = landmarks[tipIndex];
            const canvasX = (1 - tip.x) * canvas.width;
            const canvasY = tip.y * canvas.height;
            
            // Create bubble occasionally
            if (Math.random() > 0.7) {
              createBubble(canvasX, canvasY);
            }
          });
          
          // Create bubbles at palm center
          const wrist = landmarks[0];
          const middleMcp = landmarks[9];
          const palmX = (1 - (wrist.x + middleMcp.x) / 2) * canvas.width;
          const palmY = ((wrist.y + middleMcp.y) / 2) * canvas.height;
          
          if (Math.random() > 0.8) {
            createBubble(palmX, palmY);
          }
        });
      }
      
      // Update and draw bubbles
      updateBubbles(canvas);
      drawBubbles(ctx);
      
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
    <div className="bubble-effect-container">
      <div className="header">
        <h1>🫧 Hiệu Ứng Bong Bóng với Hand Tracking</h1>
        <p>Di chuyển tay để tạo bong bóng đầy màu sắc</p>
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
              <li>👆 Di chuyển các ngón tay</li>
              <li>🫧 Bong bóng sẽ xuất hiện tại đầu ngón tay</li>
              <li>✨ Bong bóng sẽ nổi và phát sáng</li>
              <li>🎨 Màu sắc thay đổi tự động</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h3>🎨 Thông tin:</h3>
            <div className="stats">
              <div className="stat-item">
                <span className="label">Số bong bóng:</span>
                <span className="value">{bubblesRef.current.length}</span>
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

