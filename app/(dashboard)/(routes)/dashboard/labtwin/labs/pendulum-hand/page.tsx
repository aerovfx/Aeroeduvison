'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import './mediapipe-console-filter';
import './pendulum-hand.css';

export default function PendulumHandPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Camera ref for 3D to 2D projection
  const camera3DRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Physics state
  const pendulumStateRef = useRef({
    angle: Math.PI / 4, // Initial angle (45 degrees)
    angularVelocity: 0,
    length: 2.0, // Pendulum length in meters
    gravity: 9.81,
    damping: 0.995, // Air resistance
    mass: 1.0
  });
  
  // Hand tracking state
  const handPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isGrabbingRef = useRef(false);
  
  // Initialize 3D camera for projection
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Create a virtual camera for 3D to 2D projection
    const camera = new THREE.PerspectiveCamera(75, 1280 / 720, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);
    camera3DRef.current = camera;
  }, []);
  
  // Initialize MediaPipe
  const startCamera = async () => {
    if (isStarted) return;
    
    setIsStarted(true);
    setError(null);
    
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      
      const hands = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      setHandLandmarker(hands);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              setIsInitialized(true);
            }
          } catch (playError) {
            setTimeout(async () => {
              try {
                if (videoRef.current) {
                  await videoRef.current.play();
                  setIsInitialized(true);
                }
              } catch (retryError) {
                setError('❌ Không thể phát video.');
                setIsStarted(false);
              }
            }, 100);
          }
        };
      }
    } catch (error: any) {
      console.error('Initialization error:', error);
      setIsStarted(false);
      if (error.name === 'NotAllowedError') {
        setError('❌ Quyền truy cập camera bị từ chối.');
      } else if (error.name === 'NotFoundError') {
        setError('❌ Không tìm thấy camera.');
      } else {
        setError(`❌ Lỗi: ${error.message}`);
      }
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsInitialized(false);
    setIsStarted(false);
    handPositionRef.current = null;
    isGrabbingRef.current = false;
  };
  
  // Physics update loop (runs continuously)
  useEffect(() => {
    if (!isInitialized) return;
    
    const updatePhysics = () => {
      const state = pendulumStateRef.current;
      const dt = 0.016; // ~60fps
      
      // If hand is grabbing, apply force
      if (isGrabbingRef.current && handPositionRef.current) {
        // Calculate desired angle based on hand position
        const handX = handPositionRef.current.x;
        const handY = handPositionRef.current.y;
        
        // Convert hand position to 3D space
        const worldX = (handX - 0.5) * 4; // -2 to 2
        const worldY = -(handY - 0.5) * 4; // -2 to 2
        
        // Calculate desired angle
        const desiredAngle = Math.atan2(worldX, worldY + 3); // +3 to account for pivot height
        const angleDiff = desiredAngle - state.angle;
        
        // Apply torque to move towards desired angle
        const torque = angleDiff * 50; // Spring constant
        state.angularVelocity += torque * dt;
      } else {
        // Normal pendulum physics
        // Angular acceleration: α = -(g/L) * sin(θ)
        const angularAcceleration = -(state.gravity / state.length) * Math.sin(state.angle);
        state.angularVelocity += angularAcceleration * dt;
      }
      
      // Apply damping
      state.angularVelocity *= state.damping;
      
      // Update angle
      state.angle += state.angularVelocity * dt;
      
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };
    
    animationFrameRef.current = requestAnimationFrame(updatePhysics);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isInitialized]);
  
  // Draw pendulum overlay on canvas
  const drawPendulumOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!camera3DRef.current) return;
    
    const state = pendulumStateRef.current;
    const camera = camera3DRef.current;
    
    // Calculate pendulum position
    const pivotPos = new THREE.Vector3(0, 3, 0);
    const bobX = state.length * Math.sin(state.angle);
    const bobY = -state.length * Math.cos(state.angle);
    const bobPos = new THREE.Vector3(bobX, 3 + bobY, 0);
    
    // Project 3D to 2D
    const pivotScreen = pivotPos.clone().project(camera);
    const bobScreen = bobPos.clone().project(camera);
    
    const pivotX = (1 - pivotScreen.x) / 2 * canvas.width;
    const pivotY = (-pivotScreen.y + 1) / 2 * canvas.height;
    const bobX2D = (1 - bobScreen.x) / 2 * canvas.width;
    const bobY2D = (-bobScreen.y + 1) / 2 * canvas.height;
    
    ctx.save();
    
    // Draw string (rope)
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX2D, bobY2D);
    ctx.stroke();
    
    // Draw pivot point
    ctx.fillStyle = '#888888';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#888888';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bob (weight) with glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff6b6b';
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(bobX2D, bobY2D, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw glow effect
    ctx.shadowBlur = 30;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(bobX2D, bobY2D, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw core bright circle
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bobX2D, bobY2D, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };
  
  // Hand detection loop
  useEffect(() => {
    if (!isInitialized || !handLandmarker) return;
    
    const detect = () => {
      if (!videoRef.current || !canvasRef.current) {
        requestAnimationFrame(detect);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState < 2) {
        requestAnimationFrame(detect);
        return;
      }
      
      const startTime = performance.now();
      
      // Clear and draw video (mirrored)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Draw pendulum overlay
      drawPendulumOverlay(ctx, canvas);
      
      // Detect hands
      const handResults = handLandmarker.detectForVideo(video, startTime);
      
      if (handResults.landmarks && handResults.landmarks.length > 0) {
        const landmarks = handResults.landmarks[0];
        const drawingUtils = new DrawingUtils(ctx);
        
        // Mirror landmarks for drawing
        const mirroredLandmarks = landmarks.map(lm => ({
          ...lm,
          x: 1 - lm.x
        }));
        
        // Draw hand skeleton
        drawingUtils.drawConnectors(
          mirroredLandmarks,
          HandLandmarker.HAND_CONNECTIONS,
          { color: '#00ff00', lineWidth: 3 }
        );
        drawingUtils.drawLandmarks(
          mirroredLandmarks,
          { color: '#ffffff', fillColor: '#00ff00', radius: 4 }
        );
        
        // Get hand position (index finger tip)
        const indexTip = landmarks[8];
        handPositionRef.current = {
          x: indexTip.x,
          y: indexTip.y
        };
        
        // Check if pinching (thumb and index close)
        const thumbTip = landmarks[4];
        const indexTip2 = landmarks[8];
        const pinchDistance = Math.sqrt(
          Math.pow(thumbTip.x - indexTip2.x, 2) +
          Math.pow(thumbTip.y - indexTip2.y, 2) +
          Math.pow(thumbTip.z - indexTip2.z, 2)
        );
        
        isGrabbingRef.current = pinchDistance < 0.05;
        
        // Draw grab indicator
        if (isGrabbingRef.current) {
          const canvasX = (1 - indexTip.x) * canvas.width;
          const canvasY = indexTip.y * canvas.height;
          
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 15, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Đang nắm', canvasX, canvasY - 25);
        }
      } else {
        handPositionRef.current = null;
        isGrabbingRef.current = false;
      }
      
      requestAnimationFrame(detect);
    };
    
    detect();
  }, [isInitialized, handLandmarker]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return (
    <div className="pendulum-hand-container">
      <div className="pendulum-header">
        <h1>🔄 Con Lắc Điều Khiển bằng Tay</h1>
        <p>Nắm và kéo con lắc bằng cử chỉ tay với MediaPipe</p>
      </div>
      
      <div className="pendulum-layout">
        <div className="left-panel">
          <div className="camera-section">
            <div className="section-header">
              <h2>📷 Camera & Hand Tracking</h2>
            </div>
            
            <div className="video-container">
              <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline />
              <canvas 
                ref={canvasRef} 
                width={1280} 
                height={720}
                style={{ display: isInitialized ? 'block' : 'none', width: '100%', height: '100%' }}
              />
              
              {!isInitialized && (
                <div className="camera-placeholder">
                  <div className="placeholder-content">
                    <div className="placeholder-icon">📹</div>
                    <h3>Camera chưa được kích hoạt</h3>
                    <p>Nhấn "Bắt đầu" để khởi động</p>
                    {error && <div className="error-message">{error}</div>}
                  </div>
                </div>
              )}
            </div>
            
            <div className="controls">
              {!isStarted ? (
                <button className="btn-start" onClick={startCamera}>
                  ▶️ Bắt đầu
                </button>
              ) : (
                <button className="btn-stop" onClick={stopCamera}>
                  ⏹️ Dừng
                </button>
              )}
            </div>
            
            <div className="instructions">
              <h3>📖 Hướng dẫn:</h3>
              <ul>
                <li>🖐️ Giơ tay trước camera</li>
                <li>🤏 Chụm ngón cái và ngón trỏ để "nắm" con lắc</li>
                <li>👆 Di chuyển tay để kéo con lắc</li>
                <li>🔄 Thả tay để con lắc dao động tự do</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          <div className="physics-info">
            <h3>📊 Thông Số Vật Lý</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Góc:</span>
                <span className="info-value">
                  {(pendulumStateRef.current.angle * 180 / Math.PI).toFixed(1)}°
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Vận tốc góc:</span>
                <span className="info-value">
                  {pendulumStateRef.current.angularVelocity.toFixed(2)} rad/s
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Chiều dài:</span>
                <span className="info-value">
                  {pendulumStateRef.current.length.toFixed(1)} m
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Trạng thái:</span>
                <span className="info-value">
                  {isGrabbingRef.current ? '🖐️ Đang nắm' : '🔄 Tự do'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

