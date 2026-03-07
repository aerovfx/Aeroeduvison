'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import './mediapipe-console-filter';
import './object-recognition-ar.css';

interface DetectedObject {
  id: string;
  name: string;
  emoji: string;
  position: { x: number; y: number };
  confidence: number;
  color: string;
}

const OBJECTS = [
  { id: 'hotdog', name: 'Hot Dog', emoji: '🌭', color: '#ff6b6b' },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', color: '#ff4757' },
  { id: 'rice', name: 'Rice Bowl', emoji: '🍚', color: '#ffa502' },
  { id: 'latte', name: 'Matcha Latte', emoji: '🍵', color: '#2ed573' },
  { id: 'apple', name: 'Apple', emoji: '🍎', color: '#ff3838' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', color: '#ff6348' },
  { id: 'burger', name: 'Burger', emoji: '🍔', color: '#ffa502' },
  { id: 'cake', name: 'Cake', emoji: '🎂', color: '#ff6b9d' },
];

export default function ObjectRecognitionARPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const handPositionRef = useRef<{ x: number; y: number } | null>(null);
  
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
      
      // Detect hands
      const startTime = performance.now();
      const handResults = handLandmarker.detectForVideo(video, startTime);
      
      const newObjects: DetectedObject[] = [];
      
      if (handResults.landmarks && handResults.landmarks.length > 0) {
        handResults.landmarks.forEach((landmarks, handIndex) => {
          // Get palm center
          const wrist = landmarks[0];
          const middleMcp = landmarks[9];
          const palmCenter = {
            x: (wrist.x + middleMcp.x) / 2,
            y: (wrist.y + middleMcp.y) / 2
          };
          
          // Convert to canvas coordinates
          const canvasX = (1 - palmCenter.x) * canvas.width;
          const canvasY = palmCenter.y * canvas.height;
          
          handPositionRef.current = { x: canvasX, y: canvasY };
          
          // Simulate object detection based on hand position
          // In real implementation, this would use an object detection model
          const objectIndex = Math.floor(Math.random() * OBJECTS.length);
          const object = OBJECTS[objectIndex];
          
          // Check if hand is open (palm detection)
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];
          const ringTip = landmarks[16];
          const pinkyTip = landmarks[20];
          
          const fingersExtended = [
            thumbTip.x < landmarks[3].x, // Thumb
            indexTip.y < landmarks[6].y, // Index
            middleTip.y < landmarks[10].y, // Middle
            ringTip.y < landmarks[14].y, // Ring
            pinkyTip.y < landmarks[18].y // Pinky
          ];
          
          const openFingers = fingersExtended.filter(f => f).length;
          
          if (openFingers >= 4) {
            // Palm open - detect object
            newObjects.push({
              id: `${object.id}-${handIndex}`,
              name: object.name,
              emoji: object.emoji,
              position: { x: canvasX, y: canvasY },
              confidence: 0.85 + Math.random() * 0.15,
              color: object.color
            });
            
            // Draw grid on palm
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            const gridSize = 40;
            for (let i = -1; i <= 1; i++) {
              for (let j = -1; j <= 1; j++) {
                ctx.strokeRect(
                  canvasX + i * gridSize - gridSize / 2,
                  canvasY + j * gridSize - gridSize / 2,
                  gridSize,
                  gridSize
                );
              }
            }
          }
        });
      }
      
      // Draw detected objects floating around hands
      newObjects.forEach(obj => {
        // Draw floating emoji
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(obj.emoji, obj.position.x, obj.position.y - 60);
        
        ctx.shadowColor = 'transparent';
        
        // Draw label box
        const labelWidth = ctx.measureText(obj.name).width + 20;
        const labelHeight = 30;
        
        ctx.fillStyle = obj.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(
          obj.position.x - labelWidth / 2,
          obj.position.y - 30,
          labelWidth,
          labelHeight
        );
        
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(obj.name, obj.position.x, obj.position.y - 15);
        
        // Draw confidence
        ctx.fillStyle = obj.confidence > 0.9 ? '#2ed573' : '#ffa502';
        ctx.font = '12px Arial';
        ctx.fillText(
          `${(obj.confidence * 100).toFixed(0)}%`,
          obj.position.x,
          obj.position.y + 10
        );
      });
      
      setDetectedObjects(newObjects);
      
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
    <div className="object-recognition-container">
      <div className="header">
        <h1>🍔 Nhận Diện Đối Tượng với AR</h1>
        <p>Giơ tay mở lòng bàn tay để nhận diện đối tượng</p>
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
              <li>👋 Mở lòng bàn tay (4-5 ngón duỗi)</li>
              <li>🍔 Hệ thống sẽ nhận diện đối tượng</li>
              <li>✨ Đối tượng sẽ hiển thị dạng AR overlay</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h3>🔍 Đối tượng đã nhận diện:</h3>
            <div className="detected-list">
              {detectedObjects.length === 0 ? (
                <p className="empty-state">Chưa có đối tượng nào được nhận diện</p>
              ) : (
                detectedObjects.map(obj => (
                  <div key={obj.id} className="detected-item" style={{ borderColor: obj.color }}>
                    <span className="emoji">{obj.emoji}</span>
                    <div className="info">
                      <div className="name">{obj.name}</div>
                      <div className="confidence" style={{ color: obj.color }}>
                        {(obj.confidence * 100).toFixed(0)}% chắc chắn
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="info-card">
            <h3>📚 Đối tượng có thể nhận diện:</h3>
            <div className="objects-grid">
              {OBJECTS.map(obj => (
                <div key={obj.id} className="object-item">
                  <span className="emoji">{obj.emoji}</span>
                  <span className="name">{obj.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

