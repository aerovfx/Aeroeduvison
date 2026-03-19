'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import './mediapipe-console-filter';
import './piston-assembly.css';

interface Part {
  id: string;
  name: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  isAssembled: boolean;
  color: number;
  description: string;
  type: 'cylinder' | 'piston' | 'rod' | 'crankshaft' | 'valves';
  size: { width: number; height: number; depth: number };
}

export default function PistonAssemblyPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Parts refs (no longer using Three.js separate container)
  const partsRef = useRef<Part[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  // Camera ref for 3D to 2D projection
  const camera3DRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Hand tracking state
  const handPositionRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const isGrabbingRef = useRef(false);
  const grabbedPartRef = useRef<Part | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [assemblyProgress, setAssemblyProgress] = useState(0);
  
  // Initialize 3D camera and parts
  useEffect(() => {
    // Create a virtual camera for 3D to 2D projection
    const camera = new THREE.PerspectiveCamera(75, 1280 / 720, 0.1, 1000);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);
    camera3DRef.current = camera;
    
    // Create parts (simplified data structure, no Three.js meshes)
    const parts: Part[] = [
      {
        id: 'cylinder',
        name: 'Xi lanh',
        position: new THREE.Vector3(-3, 0, 0),
        targetPosition: new THREE.Vector3(0, 0, 0),
        targetRotation: new THREE.Euler(0, 0, 0),
        isAssembled: false,
        color: 0x4a5568,
        description: 'Khối xi lanh - phần chính của động cơ',
        type: 'cylinder',
        size: { width: 1.6, height: 2, depth: 1.6 }
      },
      {
        id: 'piston',
        name: 'Pittong',
        position: new THREE.Vector3(-3, 2, 0),
        targetPosition: new THREE.Vector3(0, 0.3, 0),
        targetRotation: new THREE.Euler(0, 0, 0),
        isAssembled: false,
        color: 0xff6b6b,
        description: 'Pittong - di chuyển trong xi lanh',
        type: 'piston',
        size: { width: 1.4, height: 0.6, depth: 1.4 }
      },
      {
        id: 'rod',
        name: 'Thanh truyền',
        position: new THREE.Vector3(0, 2, 0),
        targetPosition: new THREE.Vector3(0, -0.5, 0),
        targetRotation: new THREE.Euler(0, 0, 0),
        isAssembled: false,
        color: 0x3b82f6,
        description: 'Thanh truyền - kết nối pittong với trục khuỷu',
        type: 'rod',
        size: { width: 0.2, height: 1.5, depth: 0.2 }
      },
      {
        id: 'crankshaft',
        name: 'Trục khuỷu',
        position: new THREE.Vector3(3, 0, 0),
        targetPosition: new THREE.Vector3(0, -1.5, 0),
        targetRotation: new THREE.Euler(0, 0, 0),
        isAssembled: false,
        color: 0x10b981,
        description: 'Trục khuỷu - chuyển đổi chuyển động tịnh tiến thành quay',
        type: 'crankshaft',
        size: { width: 0.3, height: 0.3, depth: 2 }
      },
      {
        id: 'valves',
        name: 'Van',
        position: new THREE.Vector3(0, 2.5, 0),
        targetPosition: new THREE.Vector3(0, 2.1, 0),
        targetRotation: new THREE.Euler(0, 0, 0),
        isAssembled: false,
        color: 0xf59e0b,
        description: 'Van nạp/xả - điều khiển luồng khí',
        type: 'valves',
        size: { width: 0.3, height: 0.8, depth: 0.3 }
      }
    ];
    
    partsRef.current = parts;
    setParts(parts);
  }, []);
  
  // Function to draw parts overlay on camera canvas
  const drawPartsOverlay = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    if (!camera3DRef.current) return;
    
    const camera = camera3DRef.current;
    const parts = partsRef.current;
    
    // Center of canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight * 0.6; // Lower on screen
    
    // Scale factor for 3D to 2D
    const scale = canvasWidth * 0.8 / 10; // Map 10 units to 80% of canvas width
    
    // Draw ground plane (perspective)
    const planeTopWidth = scale * 6 * 0.6;
    const planeBottomWidth = scale * 6;
    const planeHeight = scale * 3;
    const planeTopY = centerY - planeHeight * 0.2;
    const planeBottomY = centerY + planeHeight * 0.8;
    
    ctx.save();
    
    // Ground plane
    ctx.fillStyle = 'rgba(45, 45, 68, 0.6)';
    ctx.beginPath();
    ctx.moveTo(centerX - planeTopWidth / 2, planeTopY);
    ctx.lineTo(centerX + planeTopWidth / 2, planeTopY);
    ctx.lineTo(centerX + planeBottomWidth / 2, planeBottomY);
    ctx.lineTo(centerX - planeBottomWidth / 2, planeBottomY);
    ctx.closePath();
    ctx.fill();
    
    // Draw grid
    ctx.strokeStyle = 'rgba(113, 128, 150, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const y = planeTopY + (planeBottomY - planeTopY) * t;
      const width = planeTopWidth + (planeBottomWidth - planeTopWidth) * t;
      ctx.beginPath();
      ctx.moveTo(centerX - width / 2, y);
      ctx.lineTo(centerX + width / 2, y);
      ctx.stroke();
    }
    
    // Draw each part
    parts.forEach(part => {
      if (part.isAssembled) return;
      
      // Project 3D position to 2D screen coordinates
      const worldPos = part.position.clone();
      const projected = worldPos.project(camera);
      
      // Convert to canvas coordinates (accounting for mirrored video)
      const screenX = (1 - projected.x) / 2 * canvasWidth; // Mirror X
      const screenY = (-projected.y + 1) / 2 * canvasHeight;
      
      // Check if part is visible (in front of camera)
      if (projected.z > 1) return; // Behind camera
      
      // Draw part based on type
      const partScale = scale * (1 - projected.z * 0.3); // Perspective scaling
      const alpha = Math.max(0.3, 1 - projected.z * 0.5);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      
      // Draw shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(screenX, centerY + partScale * 0.5, partScale * part.size.width * 0.6, partScale * part.size.width * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw part shape
      const colorHex = part.color.toString(16).padStart(6, '0');
      const color = `#${colorHex}`;
      
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      
      switch (part.type) {
        case 'cylinder':
        case 'piston':
        case 'valves':
          // Draw cylinder (simplified)
          const radius = partScale * part.size.width / 2;
          const height = partScale * part.size.height;
          ctx.beginPath();
          ctx.ellipse(screenX, screenY - height / 2, radius, radius * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(screenX, screenY + height / 2, radius, radius * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(screenX - radius, screenY - height / 2, radius * 2, height);
          break;
          
        case 'rod':
        case 'crankshaft':
          // Draw box
          const w = partScale * part.size.width;
          const h = partScale * part.size.height;
          const d = partScale * part.size.depth;
          ctx.fillRect(screenX - w / 2, screenY - h / 2, w, h);
          break;
      }
      
      // Draw guide if near target
      const distance = part.position.distanceTo(part.targetPosition);
      if (distance < 0.5) {
        const targetProj = part.targetPosition.clone().project(camera);
        const targetX = (1 - targetProj.x) / 2 * canvasWidth;
        const targetY = (-targetProj.y + 1) / 2 * canvasHeight;
        
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw target indicator
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(targetX, targetY, partScale * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw name label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(part.name, screenX, screenY - partScale * part.size.height / 2 - 15);
      
      ctx.restore();
    });
    
    ctx.restore();
  };
  
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
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
    grabbedPartRef.current = null;
  };
  
  // Update grabbed part position (runs in detection loop)
  
  // Hand detection loop
  useEffect(() => {
    if (!isInitialized || !handLandmarker || !camera3DRef.current) return;
    
    const detect = () => {
      if (!videoRef.current || !canvasRef.current || !camera3DRef.current) {
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
      
      // Draw 3D parts overlay
      drawPartsOverlay(ctx, canvas.width, canvas.height);
      
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
        
        // Get hand landmarks for gesture detection
        const wrist = landmarks[0];
        const thumb = {
          tip: landmarks[4],
          ip: landmarks[3],
          mcp: landmarks[2]
        };
        const index = {
          tip: landmarks[8],
          pip: landmarks[6],
          mcp: landmarks[5]
        };
        const middle = {
          tip: landmarks[12],
          pip: landmarks[10],
          mcp: landmarks[9]
        };
        const ring = {
          tip: landmarks[16],
          pip: landmarks[14],
          mcp: landmarks[13]
        };
        const pinky = {
          tip: landmarks[20],
          pip: landmarks[18],
          mcp: landmarks[17]
        };
        
        // Check if finger is extended
        const isFingerExtended = (tip: any, pip: any, mcp: any): boolean => {
          const tipToMcp = Math.sqrt(
            Math.pow(tip.x - mcp.x, 2) +
            Math.pow(tip.y - mcp.y, 2) +
            Math.pow(tip.z - mcp.z, 2)
          );
          const pipToMcp = Math.sqrt(
            Math.pow(pip.x - mcp.x, 2) +
            Math.pow(pip.y - mcp.y, 2) +
            Math.pow(pip.z - mcp.z, 2)
          );
          return tipToMcp > pipToMcp * 1.2;
        };
        
        // Detect pointing gesture (only index finger extended)
        const indexExtended = isFingerExtended(index.tip, index.pip, index.mcp);
        const middleExtended = isFingerExtended(middle.tip, middle.pip, middle.mcp);
        const ringExtended = isFingerExtended(ring.tip, ring.pip, ring.mcp);
        const pinkyExtended = isFingerExtended(pinky.tip, pinky.pip, pinky.mcp);
        
        const isPointing = indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
        
        // Get hand position (index finger tip for pointing)
        const indexTip = landmarks[8];
        handPositionRef.current = {
          x: indexTip.x,
          y: indexTip.y,
          z: indexTip.z
        };
        
        const wasGrabbing = isGrabbingRef.current;
        isGrabbingRef.current = isPointing;
        
        // Update grabbed part position when pointing
        if (isGrabbingRef.current && grabbedPartRef.current && handPositionRef.current) {
          const part = grabbedPartRef.current;
          
          // Convert hand position to 3D space
          const worldX = (handPositionRef.current.x - 0.5) * 8; // -4 to 4
          const worldY = -(handPositionRef.current.y - 0.5) * 6 + 2; // -1 to 5
          const worldZ = (handPositionRef.current.z - 0.5) * 4; // -2 to 2
          
          // Smooth movement
          part.position.lerp(new THREE.Vector3(worldX, worldY, worldZ), 0.1);
          
          // Check if part is near target position
          const distance = part.position.distanceTo(part.targetPosition);
          
          if (distance < 0.3) {
            // Auto-assemble if very close
            if (distance < 0.2) {
              part.position.copy(part.targetPosition);
              part.isAssembled = true;
              grabbedPartRef.current = null;
              isGrabbingRef.current = false;
              
              // Update progress
              const assembledCount = partsRef.current.filter(p => p.isAssembled).length;
              const progress = (assembledCount / partsRef.current.length) * 100;
              setAssemblyProgress(progress);
              setParts([...partsRef.current]);
            }
          }
        }
        
        // Pick up part if just started pointing at it
        if (isGrabbingRef.current && !wasGrabbing && camera3DRef.current) {
          // Find nearest part
          const parts = partsRef.current;
          let nearestPart: Part | null = null;
          let minDistance = Infinity;
          
          parts.forEach(part => {
            if (part.isAssembled) return;
            
            // Convert to screen space
            const screenPos = part.position.clone().project(camera3DRef.current!);
            const screenX = (1 - screenPos.x) / 2; // Mirror X
            const screenY = (-screenPos.y + 1) / 2;
            
            const distance = Math.sqrt(
              Math.pow(screenX - indexTip.x, 2) +
              Math.pow(screenY - indexTip.y, 2)
            );
            
            if (distance < minDistance && distance < 0.12) {
              minDistance = distance;
              nearestPart = part;
            }
          });
          
          if (nearestPart) {
            grabbedPartRef.current = nearestPart;
          }
        }
        
        // Release part if stopped pointing
        if (!isGrabbingRef.current && wasGrabbing && grabbedPartRef.current) {
          const part = grabbedPartRef.current;
          
          // Check if should auto-assemble
          const distance = part.position.distanceTo(part.targetPosition);
          if (distance < 0.3) {
            part.position.copy(part.targetPosition);
            part.isAssembled = true;
            
            // Update progress
            const assembledCount = partsRef.current.filter(p => p.isAssembled).length;
            const progress = (assembledCount / partsRef.current.length) * 100;
            setAssemblyProgress(progress);
            setParts([...partsRef.current]);
          }
          
          grabbedPartRef.current = null;
        }
        
        // Draw pointing indicator
        if (isGrabbingRef.current) {
          const canvasX = (1 - indexTip.x) * canvas.width;
          const canvasY = indexTip.y * canvas.height;
          
          // Draw pointing cursor
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(canvasX, canvasY);
          ctx.lineTo(canvasX + 20, canvasY - 20);
          ctx.stroke();
          
          ctx.fillStyle = '#00ff00';
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
          ctx.fill();
          
          if (grabbedPartRef.current) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Đang lắp: ${grabbedPartRef.current.name}`, canvasX, canvasY - 30);
          }
        }
      } else {
        handPositionRef.current = null;
        isGrabbingRef.current = false;
        grabbedPartRef.current = null;
      }
      
      requestAnimationFrame(detect);
    };
    
    detect();
  }, [isInitialized, handLandmarker]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  const assembledCount = parts.filter(p => p.isAssembled).length;
  const totalParts = parts.length;
  const progress = totalParts > 0 ? (assembledCount / totalParts) * 100 : assemblyProgress;
  
  return (
    <div className="piston-assembly-container">
      <div className="assembly-header">
        <h1>🔧 Lắp Ráp Động Cơ Piston</h1>
        <p>Dùng cử chỉ tay để lắp ráp các chi tiết máy với MediaPipe và Three.js</p>
      </div>
      
      <div className="assembly-layout">
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
                <li>👆 Chỉ trỏ (chỉ ngón trỏ) vào chi tiết để chọn</li>
                <li>👉 Di chuyển tay (vẫn chỉ trỏ) để di chuyển chi tiết</li>
                <li>🎯 Đưa chi tiết đến vị trí đúng (có hướng dẫn màu xanh)</li>
                <li>🔄 Thả tay (không chỉ trỏ) để lắp chi tiết vào vị trí</li>
              </ul>
            </div>
          </div>
          
          <div className="parts-list">
            <h3>📦 Danh Sách Chi Tiết</h3>
            <div className="parts-grid">
              {parts.map(part => (
                <div 
                  key={part.id} 
                  className={`part-card ${part.isAssembled ? 'assembled' : ''}`}
                >
                  <div 
                    className="part-color" 
                    style={{ backgroundColor: `#${part.color.toString(16).padStart(6, '0')}` }}
                  />
                  <div className="part-info">
                    <div className="part-name">{part.name}</div>
                    <div className="part-desc">{part.description}</div>
                    <div className="part-status">
                      {part.isAssembled ? '✅ Đã lắp' : '⏳ Chưa lắp'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          <div className="assembly-progress">
            <h3>📊 Tiến Độ Lắp Ráp</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-text">
              {assembledCount} / {totalParts} chi tiết đã lắp ({progress.toFixed(0)}%)
            </div>
            {progress === 100 && (
              <div className="completion-message">
                🎉 Hoàn thành! Động cơ đã được lắp ráp thành công!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

