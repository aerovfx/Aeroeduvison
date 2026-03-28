'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import './mediapipe-console-filter';
import './color-picker-3d.css';

export default function ColorPicker3DPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Camera ref for 3D to 2D projection
  const camera3DRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectRef = useRef<THREE.Mesh | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ff6b9d');
  const animationFrameRef = useRef<number | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  
  // Initialize 3D camera and object
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Create a virtual camera for 3D to 2D projection
    const camera = new THREE.PerspectiveCamera(75, 1280 / 720, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera3DRef.current = camera;
    
    // Create 3D object (faceted gem)
    const geometry = new THREE.OctahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: selectedColor,
      metalness: 0.7,
      roughness: 0.3,
      emissive: selectedColor,
      emissiveIntensity: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    objectRef.current = mesh;
    
    // Animation loop for rotation
    const animate = () => {
      if (mesh) {
        rotationRef.current.x += 0.01;
        rotationRef.current.y += 0.01;
        mesh.rotation.x = rotationRef.current.x;
        mesh.rotation.y = rotationRef.current.y;
      }
      requestAnimationFrame(animate);
    };
    animate();
  }, []);
  
  // Update object color
  useEffect(() => {
    if (objectRef.current) {
      const material = objectRef.current.material as THREE.MeshStandardMaterial;
      material.color.set(selectedColor);
      material.emissive.set(selectedColor);
    }
  }, [selectedColor]);
  
  // Draw 3D object overlay on canvas
  const draw3DObjectOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!camera3DRef.current || !objectRef.current) return;
    
    const camera = camera3DRef.current;
    const mesh = objectRef.current;
    
    // Project 3D object to 2D
    const worldPos = new THREE.Vector3(0, 0, 0);
    const screenPos = worldPos.clone().project(camera);
    
    const screenX = (1 - screenPos.x) / 2 * canvas.width;
    const screenY = (-screenPos.y + 1) / 2 * canvas.height;
    const scale = 50; // Size of object on screen
    
    ctx.save();
    
    // Draw object as a simplified representation
    // Since we can't easily render 3D mesh to 2D canvas, we'll draw a stylized version
    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, scale);
    gradient.addColorStop(0, selectedColor);
    gradient.addColorStop(0.5, selectedColor + '80');
    gradient.addColorStop(1, selectedColor + '00');
    
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 20;
    ctx.shadowColor = selectedColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY, scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw faceted edges (simplified)
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + rotationRef.current.y;
      const x1 = screenX + Math.cos(angle) * scale * 0.7;
      const y1 = screenY + Math.sin(angle) * scale * 0.7;
      const x2 = screenX + Math.cos(angle) * scale;
      const y2 = screenY + Math.sin(angle) * scale;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    ctx.restore();
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
  
  // Color wheel
  const getColorFromWheel = (x: number, y: number, centerX: number, centerY: number, radius: number): string => {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > radius) return selectedColor;
    
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
    const saturation = distance / radius;
    const lightness = 0.5;
    
    const hue = normalizedAngle * 360;
    return `hsl(${hue}, ${saturation * 100}%, ${lightness * 100}%)`;
  };
  
  // Detection loop
  useEffect(() => {
    if (!isInitialized || !handLandmarker || !isStarted) return;
    
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
      
      // Draw video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Draw 3D object overlay
      draw3DObjectOverlay(ctx, canvas);
      
      // Detect hands
      const startTime = performance.now();
      const handResults = handLandmarker.detectForVideo(video, startTime);
      
      if (handResults.landmarks && handResults.landmarks.length > 0) {
        handResults.landmarks.forEach((landmarks) => {
          // Get index finger tip
          const indexTip = landmarks[8];
          const canvasX = (1 - indexTip.x) * canvas.width;
          const canvasY = indexTip.y * canvas.height;
          
          // Draw color wheel (top right)
          const wheelX = canvas.width - 150;
          const wheelY = 150;
          const wheelRadius = 100;
          
          // Draw color wheel
          for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
            for (let r = 0; r < wheelRadius; r += 2) {
              const x = wheelX + Math.cos(angle) * r;
              const y = wheelY + Math.sin(angle) * r;
              const hue = (angle / (Math.PI * 2)) * 360;
              const saturation = r / wheelRadius;
              
              ctx.fillStyle = `hsl(${hue}, ${saturation * 100}%, 50%)`;
              ctx.fillRect(x, y, 2, 2);
            }
          }
          
          // Check if pointing at color wheel
          const distance = Math.sqrt(
            Math.pow(canvasX - wheelX, 2) + Math.pow(canvasY - wheelY, 2)
          );
          
          if (distance < wheelRadius) {
            const color = getColorFromWheel(canvasX, canvasY, wheelX, wheelY, wheelRadius);
            setSelectedColor(color);
            
            // Draw indicator
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 10, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Draw hand tracking
          ctx.fillStyle = '#00ff00';
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
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
  }, [isInitialized, handLandmarker, isStarted, selectedColor]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  return (
    <div className="color-picker-container">
      <div className="header">
        <h1>🎨 3D Color Picker với Hand Tracking</h1>
        <p>Chỉ trỏ vào bánh xe màu để thay đổi màu đối tượng 3D</p>
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
        
        <div className="right-panel">
          <div className="info-card">
            <h3>📖 Hướng dẫn:</h3>
            <ul>
              <li>🖐️ Giơ tay trước camera</li>
              <li>👆 Chỉ trỏ vào bánh xe màu (góc trên phải)</li>
              <li>🎨 Màu sẽ thay đổi theo vị trí ngón tay</li>
              <li>💎 Đối tượng 3D sẽ cập nhật màu real-time</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h3>🎨 Màu hiện tại:</h3>
            <div 
              className="color-preview"
              style={{ backgroundColor: selectedColor }}
            ></div>
            <div className="color-value">{selectedColor}</div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

