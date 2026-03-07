'use client';

// Import console filter first to suppress MediaPipe logs
import './mediapipe-console-filter';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import './scene-control.css';

interface GestureState {
  isPinching: boolean;
  isFist: boolean;
  pinchStrength: number;
  fistStrength: number;
}

export default function Scene3DControl() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  
  // State
  const [cameraActive, setCameraActive] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [pinchGrab, setPinchGrab] = useState(0);
  const [fistRotate, setFistRotate] = useState(0);
  const [frameEnabled, setFrameEnabled] = useState(false);
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Gesture tracking
  const lastPinchRef = useRef({ x: 0, y: 0, z: 0 });
  const cubePositionRef = useRef({ x: 0, y: 0, z: -5 });
  const cubeRotationRef = useRef({ x: 0, y: 0 });

  // Calculate pinch strength (distance between thumb and index finger)
  const calculatePinch = (landmarks: any[]): number => {
    if (!landmarks || landmarks.length < 9) return 0;
    
    const thumb = landmarks[4];
    const index = landmarks[8];
    
    const distance = Math.sqrt(
      Math.pow(thumb.x - index.x, 2) + 
      Math.pow(thumb.y - index.y, 2) + 
      Math.pow(thumb.z - index.z, 2)
    );
    
    // Normalize to 0-100%
    const normalized = Math.max(0, Math.min(100, (1 - distance * 10) * 100));
    return normalized;
  };

  // Calculate fist strength
  const calculateFist = (landmarks: any[]): number => {
    if (!landmarks || landmarks.length < 21) return 0;
    
    const palm = landmarks[0];
    const fingerTips = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
    
    let totalDistance = 0;
    fingerTips.forEach(tipIndex => {
      const tip = landmarks[tipIndex];
      const distance = Math.sqrt(
        Math.pow(tip.x - palm.x, 2) + 
        Math.pow(tip.y - palm.y, 2)
      );
      totalDistance += distance;
    });
    
    const avgDistance = totalDistance / fingerTips.length;
    // When fist is closed, fingers are close to palm
    const normalized = Math.max(0, Math.min(100, (1 - avgDistance * 5) * 100));
    return normalized;
  };

  // Detect gestures
  const detectGestures = (landmarks: any[]): GestureState => {
    const pinchStrength = calculatePinch(landmarks);
    const fistStrength = calculateFist(landmarks);
    
    return {
      isPinching: pinchStrength > 70,
      isFist: fistStrength > 70,
      pinchStrength,
      fistStrength
    };
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!sceneContainerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      sceneContainerRef.current.clientWidth / sceneContainerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      sceneContainerRef.current.clientWidth,
      sceneContainerRef.current.clientHeight
    );
    sceneContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x667eea,
      shininess: 100
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cubeRef.current = cube;

    // Create wireframe if enabled
    const wireframeGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffffff,
      linewidth: 2
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    cube.add(wireframe);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Update cube from refs
      if (cubeRef.current) {
        cubeRef.current.position.set(
          cubePositionRef.current.x,
          cubePositionRef.current.y,
          cubePositionRef.current.z
        );
        cubeRef.current.rotation.set(
          cubeRotationRef.current.x,
          cubeRotationRef.current.y,
          0
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!sceneContainerRef.current) return;
      
      camera.aspect = sceneContainerRef.current.clientWidth / sceneContainerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        sceneContainerRef.current.clientWidth,
        sceneContainerRef.current.clientHeight
      );
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // Initialize MediaPipe and Camera (called by button click)
  const startCamera = async () => {
    if (isStarted) return;
    
    setIsStarted(true);
    setErrorMessage('');

    try {
      // Initialize MediaPipe Vision
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Create hand landmarker
      const hands = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      setHandLandmarker(hands);

      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video metadata to load before playing
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              setCameraActive(true);
              setIsInitialized(true);
            }
          } catch (playError) {
            console.warn('Video play delayed, retrying...', playError);
            // Retry after a short delay
            setTimeout(async () => {
              try {
                if (videoRef.current) {
                  await videoRef.current.play();
                  setCameraActive(true);
                  setIsInitialized(true);
                }
              } catch (retryError) {
                setErrorMessage('❌ Không thể phát video. Vui lòng thử lại.');
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
        setErrorMessage('❌ Quyền truy cập camera bị từ chối. Vui lòng cho phép quyền camera trong cài đặt trình duyệt.');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('❌ Không tìm thấy camera. Vui lòng kết nối camera.');
      } else {
        setErrorMessage(`❌ Lỗi: ${error.message}`);
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    setIsInitialized(false);
    setIsStarted(false);
    setHandDetected(false);
    setPinchGrab(0);
    setFistRotate(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Detection and control loop
  useEffect(() => {
    if (!isInitialized || !handLandmarker) return;

    const detect = () => {
      if (!videoRef.current || !canvasRef.current) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      const startTime = performance.now();

      // Clear and draw video (mirrored)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Detect hands
      const results = handLandmarker.detectForVideo(video, startTime);
      
      if (results.landmarks && results.landmarks.length > 0) {
        setHandDetected(true);

        // Process right hand (for pinch/grab)
        let rightHandLandmarks: any = null;
        let leftHandLandmarks: any = null;

        results.handedness.forEach((hand, index) => {
          if (hand[0].categoryName === 'Right') {
            rightHandLandmarks = results.landmarks[index];
          } else {
            leftHandLandmarks = results.landmarks[index];
          }
        });

        // Right hand: Pinch to grab and move
        if (rightHandLandmarks) {
          const drawingUtils = new DrawingUtils(ctx);
          
          // Draw hand
          drawingUtils.drawConnectors(
            rightHandLandmarks,
            HandLandmarker.HAND_CONNECTIONS,
            { color: '#00FF00', lineWidth: 2 }
          );
          drawingUtils.drawLandmarks(
            rightHandLandmarks,
            { color: '#FF0000', fillColor: '#00FF00', radius: 3 }
          );

          const gestures = detectGestures(rightHandLandmarks);
          setPinchGrab(Math.round(gestures.pinchStrength));

          // Control cube position with pinch
          if (gestures.isPinching) {
            const thumb = rightHandLandmarks[4];
            const index = rightHandLandmarks[8];
            
            const midpoint = {
              x: (thumb.x + index.x) / 2,
              y: (thumb.y + index.y) / 2,
              z: (thumb.z + index.z) / 2
            };

            // Map hand position to 3D space
            // x: 0-1 (left to right) -> -3 to 3
            // y: 0-1 (top to bottom) -> 3 to -3 (inverted)
            // z: depth -> -2 to -8
            cubePositionRef.current = {
              x: (midpoint.x - 0.5) * 6,
              y: -(midpoint.y - 0.5) * 6,
              z: -5 + midpoint.z * 3
            };

            // Highlight control point
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(
              (1 - midpoint.x) * canvas.width, // Mirror X
              midpoint.y * canvas.height,
              10,
              0,
              2 * Math.PI
            );
            ctx.fill();
          }
        }

        // Left hand: Fist to rotate
        if (leftHandLandmarks) {
          const drawingUtils = new DrawingUtils(ctx);
          
          // Draw hand
          drawingUtils.drawConnectors(
            leftHandLandmarks,
            HandLandmarker.HAND_CONNECTIONS,
            { color: '#0088FF', lineWidth: 2 }
          );
          drawingUtils.drawLandmarks(
            leftHandLandmarks,
            { color: '#FF0000', fillColor: '#0088FF', radius: 3 }
          );

          const gestures = detectGestures(leftHandLandmarks);
          setFistRotate(Math.round(gestures.fistStrength));

          // Control cube rotation with fist + hand movement
          if (gestures.isFist) {
            const wrist = leftHandLandmarks[0];
            
            // Map hand position to rotation
            // x position -> Y rotation
            // y position -> X rotation
            cubeRotationRef.current = {
              x: (wrist.y - 0.5) * Math.PI * 2,
              y: (wrist.x - 0.5) * Math.PI * 2
            };

            // Highlight control point
            ctx.fillStyle = 'cyan';
            ctx.beginPath();
            ctx.arc(
              (1 - wrist.x) * canvas.width, // Mirror X
              wrist.y * canvas.height,
              10,
              0,
              2 * Math.PI
            );
            ctx.fill();
          }
        }

        // Draw instructions
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('✋ Tay phải: Nhéo để di chuyển khối', 10, 30);
        ctx.fillText('✊ Tay trái: Nắm đấm để xoay khối', 10, 60);

      } else {
        setHandDetected(false);
        setPinchGrab(0);
        setFistRotate(0);
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized, handLandmarker]);

  // Reset position
  const resetPosition = () => {
    cubePositionRef.current = { x: 0, y: 0, z: -5 };
    cubeRotationRef.current = { x: 0, y: 0 };
  };

  return (
    <div className="scene-control-container">
      <div className="scene-header">
        <h1>📦 Khám phá hình học 3D và điều khiển đối tượng bằng cử chỉ tay với MediaPipe và Three.js</h1>
      </div>

      <div className="main-layout">
        {/* Left: Camera & 3D Scene */}
        <div className="left-panel">
          <div className="camera-section">
            <div className="section-header">
              <h2>📷 Camera & 3D Scene</h2>
            </div>
            
            <div className="video-canvas-container">
              <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline />
              <canvas 
                ref={canvasRef} 
                width={640} 
                height={480}
                style={{ display: isInitialized ? 'block' : 'none' }}
              />
              
              {!isInitialized && (
                <div className="camera-placeholder">
                  <div className="placeholder-content">
                    <div className="placeholder-icon">📹</div>
                    <h3>Camera chưa được kích hoạt</h3>
                    <p>Nhấn "Bắt đầu" để khởi động camera</p>
                    {errorMessage && (
                      <div className="error-message">{errorMessage}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="scene-3d" ref={sceneContainerRef} />
          </div>
        </div>

        {/* Right: Status Panel */}
        <div className="right-panel">
          <h2>Trạng thái</h2>

          <div className="status-group">
            <div className="status-item">
              <span className="status-label">Camera:</span>
              <span className={`status-value ${cameraActive ? 'active' : ''}`}>
                {cameraActive ? 'Hoạt động' : 'Tắt'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Tay phát hiện:</span>
              <span className={`status-value ${handDetected ? 'active' : ''}`}>
                {handDetected ? 'Có' : 'Không'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Pinch (Grab):</span>
              <span className="status-value">{pinchGrab}%</span>
            </div>

            <div className="status-item">
              <span className="status-label">Fist (Rotate):</span>
              <span className="status-value">{fistRotate}%</span>
            </div>

            <div className="status-item">
              <span className="status-label">Khung xương:</span>
              <span className="status-value">
                {frameEnabled ? 'Có' : 'Không'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Khuôn mặt:</span>
              <span className="status-value">
                {faceEnabled ? 'Có' : 'Không'}
              </span>
            </div>
          </div>

          <div className="control-section">
            <h3>Điều khiển</h3>
            
            {!isStarted ? (
              <button className="btn-start" onClick={startCamera}>
                ▶️ Bắt đầu
              </button>
            ) : (
              <>
                <div className="initialization-status">
                  {isInitialized ? (
                    <div className="status-success">
                      <span className="status-indicator active"></span>
                      Đã khởi động
                    </div>
                  ) : (
                    <div className="status-loading">
                      <span className="status-indicator loading"></span>
                      Đang khởi động...
                    </div>
                  )}
                </div>

                <button className="btn-stop" onClick={stopCamera}>
                  ⏹️ Dừng Camera
                </button>

                <button className="btn-reset" onClick={resetPosition}>
                  🔄 Đặt lại vị trí
                </button>
              </>
            )}

            <div className="instructions">
              <h4>📖 Hướng dẫn:</h4>
              <ul>
                <li>✋ <strong>Tay phải</strong>: Nhéo ngón (thumb + index) để nắm và di chuyển khối</li>
                <li>✊ <strong>Tay trái</strong>: Nắm đấm và di chuyển để xoay khối</li>
                <li>🎯 Di chuyển tay để điều khiển trong không gian 3D</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

