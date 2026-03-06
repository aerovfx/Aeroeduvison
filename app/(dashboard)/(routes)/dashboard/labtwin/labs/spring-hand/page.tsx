'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import './mediapipe-console-filter';
import './spring-hand.css';

export default function SpringHandPage() {
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
  const springStateRef = useRef({
    position: 0, // Displacement from equilibrium (0 = equilibrium)
    velocity: 0,
    equilibrium: 0, // Natural length position
    springConstant: 50, // k (N/m)
    damping: 0.9, // Damping coefficient
    mass: 1.0,
    naturalLength: 1.0 // Natural length of spring
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
      const state = springStateRef.current;
      const dt = 0.016; // ~60fps
      
      // If hand is grabbing, apply force
      if (isGrabbingRef.current && handPositionRef.current) {
        // Calculate desired position based on hand
        const handY = handPositionRef.current.y;
        const desiredPosition = -(handY - 0.5) * 3; // Map to -1.5 to 1.5
        
        // Apply spring force to move towards desired position
        const displacement = desiredPosition - state.position;
        const force = displacement * state.springConstant;
        const acceleration = force / state.mass;
        state.velocity += acceleration * dt;
      } else {
        // Normal spring physics: F = -kx (Hooke's Law)
        const restoringForce = -state.springConstant * state.position;
        const acceleration = restoringForce / state.mass;
        state.velocity += acceleration * dt;
      }
      
      // Apply damping
      state.velocity *= state.damping;
      
      // Update position
      state.position += state.velocity * dt;
      
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
  
  // Draw spring overlay on canvas
  const drawSpringOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!camera3DRef.current) return;
    
    const state = springStateRef.current;
    const camera = camera3DRef.current;
    
    // Calculate spring positions
    const fixedPos = new THREE.Vector3(0, 3, 0);
    const currentLength = state.naturalLength + state.position;
    const massPos = new THREE.Vector3(0, 3 - currentLength, 0);
    
    // Project 3D to 2D
    const fixedScreen = fixedPos.clone().project(camera);
    const massScreen = massPos.clone().project(camera);
    
    const fixedX = (1 - fixedScreen.x) / 2 * canvas.width;
    const fixedY = (-fixedScreen.y + 1) / 2 * canvas.height;
    const massX = (1 - massScreen.x) / 2 * canvas.width;
    const massY = (-massScreen.y + 1) / 2 * canvas.height;
    
    ctx.save();
    
    // Draw fixed point (ceiling)
    ctx.fillStyle = '#888888';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#888888';
    ctx.fillRect(fixedX - 15, fixedY - 5, 30, 10);
    
    // Draw spring coils
    const numCoils = 20;
    const coilSpacing = (massY - fixedY) / numCoils;
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#4a90e2';
    
    for (let i = 0; i < numCoils; i++) {
      const y = fixedY + (i * coilSpacing);
      const coilRadius = 15;
      const coilX = fixedX + Math.sin(i * 0.5) * 5; // Slight wave effect
      
      ctx.beginPath();
      ctx.arc(coilX, y, coilRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw mass (weight) with glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff6b6b';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(massX - 20, massY - 20, 40, 40);
    
    // Draw glow effect
    ctx.shadowBlur = 30;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(massX - 25, massY - 25, 50, 50);
    
    // Draw core bright square
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(massX - 10, massY - 10, 20, 20);
    
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
      
      // Draw spring overlay
      drawSpringOverlay(ctx, canvas);
      
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
        
        // Get hand position (palm center)
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        handPositionRef.current = {
          x: (wrist.x + middleMCP.x) / 2,
          y: (wrist.y + middleMCP.y) / 2
        };
        
        // Check if pinching
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const pinchDistance = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) +
          Math.pow(thumbTip.y - indexTip.y, 2) +
          Math.pow(thumbTip.z - indexTip.z, 2)
        );
        
        isGrabbingRef.current = pinchDistance < 0.05;
        
        // Draw grab indicator
        if (isGrabbingRef.current) {
          const canvasX = (1 - handPositionRef.current.x) * canvas.width;
          const canvasY = handPositionRef.current.y * canvas.height;
          
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 15, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Đang kéo', canvasX, canvasY - 25);
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
    <div className="spring-hand-container">
      <div className="spring-header">
        <h1>🔗 Lò Xo Điều Khiển bằng Tay</h1>
        <p>Kéo và thả lò xo bằng cử chỉ tay với MediaPipe</p>
      </div>
      
      <div className="spring-layout">
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
                <li>🤏 Chụm ngón cái và ngón trỏ để "nắm" lò xo</li>
                <li>👆 Di chuyển tay lên/xuống để kéo/đẩy lò xo</li>
                <li>🔄 Thả tay để lò xo dao động tự do</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          <div className="physics-info">
            <h3>📊 Thông Số Vật Lý</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Độ dãn:</span>
                <span className="info-value">
                  {(springStateRef.current.position * 100).toFixed(1)} cm
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Vận tốc:</span>
                <span className="info-value">
                  {springStateRef.current.velocity.toFixed(2)} m/s
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Hệ số lò xo:</span>
                <span className="info-value">
                  {springStateRef.current.springConstant} N/m
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Trạng thái:</span>
                <span className="info-value">
                  {isGrabbingRef.current ? '🖐️ Đang kéo' : '🔄 Tự do'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

