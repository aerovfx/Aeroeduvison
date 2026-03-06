'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver
} from '@mediapipe/tasks-vision';
import './mediapipe-console-filter';
import './electric-effect.css';

interface LightningBolt {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  segments: { x: number; y: number }[];
  opacity: number;
  life: number;
  maxLife: number;
}

interface ElectricArc {
  id: string;
  x: number;
  y: number;
  branches: LightningBolt[];
  intensity: number;
  color: string;
}

export default function ElectricEffectPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const animationFrameRef = useRef<number | null>(null);
  const arcsRef = useRef<ElectricArc[]>([]);
  const fingerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastArcTimeRef = useRef<number>(0);
  
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
      animationFrameRef.current = null;
    }
  };
  
  // Create lightning bolt
  const createLightningBolt = (
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number,
    segments: number = 10
  ): LightningBolt => {
    const bolt: LightningBolt = {
      id: Math.random().toString(36).substr(2, 9),
      x: startX,
      y: startY,
      targetX: endX,
      targetY: endY,
      segments: [],
      opacity: 1,
      life: 0,
      maxLife: 20 + Math.random() * 10
    };
    
    // Create jagged path
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startX + dx * t;
      const y = startY + dy * t;
      
      // Add randomness for jagged effect
      const offset = (Math.random() - 0.5) * (distance / segments) * 0.3;
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      
      bolt.segments.push({
        x: x + Math.cos(angle) * offset,
        y: y + Math.sin(angle) * offset
      });
    }
    
    return bolt;
  };
  
  // Create electric arc at position
  const createElectricArc = (x: number, y: number) => {
    const now = Date.now();
    if (now - lastArcTimeRef.current < 100) return; // Throttle
    lastArcTimeRef.current = now;
    
    const colors = ['#00ffff', '#0080ff', '#ff00ff', '#ffff00', '#00ff00'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const arc: ElectricArc = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      branches: [],
      intensity: 0.8 + Math.random() * 0.2,
      color
    };
    
    // Create multiple lightning branches
    const branchCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < branchCount; i++) {
      const angle = (Math.PI * 2 * i) / branchCount + (Math.random() - 0.5) * 0.5;
      const length = 50 + Math.random() * 100;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      
      arc.branches.push(createLightningBolt(x, y, endX, endY, 8 + Math.floor(Math.random() * 5)));
    }
    
    arcsRef.current.push(arc);
    
    // Limit arc count
    if (arcsRef.current.length > 15) {
      arcsRef.current.shift();
    }
  };
  
  // Update arcs
  const updateArcs = () => {
    arcsRef.current = arcsRef.current.filter(arc => {
      arc.intensity -= 0.02;
      
      arc.branches = arc.branches.filter(bolt => {
        bolt.life++;
        bolt.opacity = 1 - (bolt.life / bolt.maxLife);
        return bolt.life < bolt.maxLife;
      });
      
      return arc.intensity > 0 && arc.branches.length > 0;
    });
  };
  
  // Draw lightning bolt
  const drawLightningBolt = (ctx: CanvasRenderingContext2D, bolt: LightningBolt, color: string, intensity: number) => {
    if (bolt.segments.length < 2) return;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = bolt.opacity * intensity;
    
    // Main bolt
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let i = 1; i < bolt.segments.length; i++) {
      ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
    }
    ctx.stroke();
    
    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = bolt.opacity * intensity * 0.5;
    ctx.stroke();
    
    // Core bright line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = bolt.opacity * intensity;
    ctx.stroke();
    
    ctx.restore();
  };
  
  // Draw electric arc
  const drawElectricArc = (ctx: CanvasRenderingContext2D, arc: ElectricArc) => {
    // Draw center point
    ctx.save();
    ctx.fillStyle = arc.color;
    ctx.globalAlpha = arc.intensity;
    ctx.shadowBlur = 20;
    ctx.shadowColor = arc.color;
    ctx.beginPath();
    ctx.arc(arc.x, arc.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw glow
    ctx.globalAlpha = arc.intensity * 0.3;
    ctx.beginPath();
    ctx.arc(arc.x, arc.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw branches
    arc.branches.forEach(bolt => {
      drawLightningBolt(ctx, bolt, arc.color, arc.intensity);
    });
  };
  
  // Helper to draw landmarks manually
  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[], canvas: HTMLCanvasElement) => {
    if (!landmarks || landmarks.length === 0) return;
    
    // Draw landmarks as dots
    landmarks.forEach((landmark: any) => {
      if (!landmark) return;
      const x = (1 - landmark.x) * canvas.width;
      const y = landmark.y * canvas.height;
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw connections - use hardcoded connections array to avoid issues
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],  // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],  // Ring
      [0, 17], [17, 18], [18, 19], [19, 20],  // Pinky
      [5, 9], [9, 13], [13, 17]  // Palm
    ];
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    if (Array.isArray(connections)) {
      connections.forEach((connection: any) => {
        if (!Array.isArray(connection) || connection.length < 2) return;
        const [start, end] = connection;
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        if (startLandmark && endLandmark) {
          ctx.beginPath();
          ctx.moveTo((1 - startLandmark.x) * canvas.width, startLandmark.y * canvas.height);
          ctx.lineTo((1 - endLandmark.x) * canvas.width, endLandmark.y * canvas.height);
          ctx.stroke();
        }
      });
    }
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
          // Draw hand landmarks
          drawLandmarks(ctx, landmarks, canvas);
          
          // Get index finger tip (pointing finger)
          const indexTip = landmarks[8];
          const canvasX = (1 - indexTip.x) * canvas.width;
          const canvasY = indexTip.y * canvas.height;
          
          fingerPositionRef.current = { x: canvasX, y: canvasY };
          
          // Check if finger is extended (pointing gesture)
          const indexPip = landmarks[6];
          const indexMcp = landmarks[5];
          const middleTip = landmarks[12];
          const middlePip = landmarks[10];
          
          const indexExtended = indexTip.y < indexPip.y;
          const middleNotExtended = middleTip.y > middlePip.y;
          
          if (indexExtended && middleNotExtended) {
            // Create electric arc at finger tip
            createElectricArc(canvasX, canvasY);
            
            // Draw finger tip indicator
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffff00';
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      } else {
        fingerPositionRef.current = null;
      }
      
      // Update and draw arcs
      updateArcs();
      arcsRef.current.forEach(arc => {
        drawElectricArc(ctx, arc);
      });
      
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
    <div className="electric-effect-container">
      <div className="header">
        <h1>⚡ Hiệu Ứng Phóng Điện với Hand Tracking</h1>
        <p>Chỉ trỏ ngón tay để tạo hiệu ứng phóng điện</p>
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
              <li>👆 Chỉ trỏ ngón trỏ (chỉ ngón trỏ duỗi)</li>
              <li>⚡ Hiệu ứng phóng điện sẽ xuất hiện tại đầu ngón tay</li>
              <li>✨ Di chuyển ngón tay để tạo nhiều hiệu ứng</li>
              <li>🎨 Màu sắc thay đổi ngẫu nhiên</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h3>⚡ Thông tin:</h3>
            <div className="stats">
              <div className="stat-item">
                <span className="label">Số tia sét:</span>
                <span className="value">{arcsRef.current.length}</span>
              </div>
              <div className="stat-item">
                <span className="label">Trạng thái:</span>
                <span className="value">{isStarted ? 'Đang chạy' : 'Đã dừng'}</span>
              </div>
              <div className="stat-item">
                <span className="label">Vị trí ngón tay:</span>
                <span className="value">
                  {fingerPositionRef.current 
                    ? `${Math.round(fingerPositionRef.current.x)}, ${Math.round(fingerPositionRef.current.y)}`
                    : 'Chưa phát hiện'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

