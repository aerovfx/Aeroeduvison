'use client';

// Import console filter first to suppress MediaPipe logs
import './mediapipe-console-filter';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import './scene-control.css';
import { AR_ASSETS, ARAsset, CATEGORY_LABELS } from '@/lib/ar-assets';
import {
  calculateHatPosition,
  calculateAntlerPosition,
  calculateMaskPosition,
  calculateFullFacePosition,
  drawAROverlay,
  drawSantaHat,
  drawReindeerAntlers
} from '@/lib/ar-overlay-renderer';

interface GestureState {
  isPinching: boolean;
  isFist: boolean;
  pinchStrength: number;
  fistStrength: number;
}

export default function Scene3DControlWithAR() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  
  // State
  const [cameraActive, setCameraActive] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [pinchGrab, setPinchGrab] = useState(0);
  const [fistRotate, setFistRotate] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // AR Overlay State
  const [selectedAR, setSelectedAR] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ARAsset['category']>('christmas');
  const [arPanelOpen, setArPanelOpen] = useState(false);
  
  // Gesture tracking
  const cubePositionRef = useRef({ x: 0, y: 0, z: -5 });
  const cubeRotationRef = useRef({ x: 0, y: 0 });

  // Calculate pinch strength
  const calculatePinch = (landmarks: any[]): number => {
    if (!landmarks || landmarks.length < 9) return 0;
    
    const thumb = landmarks[4];
    const index = landmarks[8];
    
    const distance = Math.sqrt(
      Math.pow(thumb.x - index.x, 2) + 
      Math.pow(thumb.y - index.y, 2) + 
      Math.pow(thumb.z - index.z, 2)
    );
    
    const normalized = Math.max(0, Math.min(100, (1 - distance * 10) * 100));
    return normalized;
  };

  // Calculate fist strength
  const calculateFist = (landmarks: any[]): number => {
    if (!landmarks || landmarks.length < 21) return 0;
    
    const palm = landmarks[0];
    const fingerTips = [4, 8, 12, 16, 20];
    
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      sceneContainerRef.current.clientWidth / sceneContainerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      sceneContainerRef.current.clientWidth,
      sceneContainerRef.current.clientHeight
    );
    sceneContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x667eea,
      shininess: 100
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cubeRef.current = cube;

    const wireframeGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffffff,
      linewidth: 2
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    cube.add(wireframe);

    const animate = () => {
      requestAnimationFrame(animate);

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

  // Initialize MediaPipe
  const startCamera = async () => {
    if (isStarted) return;
    
    setIsStarted(true);
    setErrorMessage('');

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Initialize Hand Landmarker
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

      // Initialize Face Landmarker
      const faces = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      setFaceLandmarker(faces);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              setCameraActive(true);
              setIsInitialized(true);
            }
          } catch (playError) {
            console.warn('Video play delayed, retrying...', playError);
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
        setErrorMessage('❌ Quyền truy cập camera bị từ chối.');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('❌ Không tìm thấy camera.');
      } else {
        setErrorMessage(`❌ Lỗi: ${error.message}`);
      }
    }
  };

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
    setFaceDetected(false);
    setPinchGrab(0);
    setFistRotate(0);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Detection loop with AR overlay
  useEffect(() => {
    if (!isInitialized || !handLandmarker || !faceLandmarker) return;

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

      // Detect faces for AR overlay
      const faceResults = faceLandmarker.detectForVideo(video, startTime);
      
      if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
        setFaceDetected(true);
        const faceLandmarks = faceResults.faceLandmarks[0];

        // Draw AR overlay if selected
        if (selectedAR) {
          const asset = AR_ASSETS.find(a => a.id === selectedAR);
          if (asset) {
            let position;
            
            switch (asset.type) {
              case 'hat':
                position = calculateHatPosition(faceLandmarks, canvas.width, canvas.height);
                if (asset.id === 'santa-hat') {
                  drawSantaHat(ctx, position);
                } else {
                  drawAROverlay(ctx, asset.type, asset.emoji, position);
                }
                break;
              case 'accessory':
                if (asset.id === 'reindeer-antlers') {
                  position = calculateAntlerPosition(faceLandmarks, canvas.width, canvas.height);
                  drawReindeerAntlers(ctx, position);
                } else {
                  position = calculateAntlerPosition(faceLandmarks, canvas.width, canvas.height);
                  drawAROverlay(ctx, asset.type, asset.emoji, position);
                }
                break;
              case 'mask':
                position = calculateMaskPosition(faceLandmarks, canvas.width, canvas.height);
                drawAROverlay(ctx, asset.type, asset.emoji, position);
                break;
              case 'full-face':
                position = calculateFullFacePosition(faceLandmarks, canvas.width, canvas.height);
                drawAROverlay(ctx, asset.type, asset.emoji, position, 1.5);
                break;
            }
          }
        }
      } else {
        setFaceDetected(false);
      }

      // Detect hands
      const handResults = handLandmarker.detectForVideo(video, startTime);
      
      if (handResults.landmarks && handResults.landmarks.length > 0) {
        setHandDetected(true);

        let rightHandLandmarks: any = null;
        let leftHandLandmarks: any = null;

        handResults.handedness.forEach((hand, index) => {
          if (hand[0].categoryName === 'Right') {
            rightHandLandmarks = handResults.landmarks[index];
          } else {
            leftHandLandmarks = handResults.landmarks[index];
          }
        });

        // Right hand: Pinch to grab and move
        if (rightHandLandmarks) {
          const drawingUtils = new DrawingUtils(ctx);
          
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

          if (gestures.isPinching) {
            const thumb = rightHandLandmarks[4];
            const index = rightHandLandmarks[8];
            
            const midpoint = {
              x: (thumb.x + index.x) / 2,
              y: (thumb.y + index.y) / 2,
              z: (thumb.z + index.z) / 2
            };

            cubePositionRef.current = {
              x: (midpoint.x - 0.5) * 6,
              y: -(midpoint.y - 0.5) * 6,
              z: -5 + midpoint.z * 3
            };

            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(
              (1 - midpoint.x) * canvas.width,
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

          if (gestures.isFist) {
            const wrist = leftHandLandmarks[0];
            
            cubeRotationRef.current = {
              x: (wrist.y - 0.5) * Math.PI * 2,
              y: (wrist.x - 0.5) * Math.PI * 2
            };

            ctx.fillStyle = 'cyan';
            ctx.beginPath();
            ctx.arc(
              (1 - wrist.x) * canvas.width,
              wrist.y * canvas.height,
              10,
              0,
              2 * Math.PI
            );
            ctx.fill();
          }
        }
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
  }, [isInitialized, handLandmarker, faceLandmarker, selectedAR]);

  const resetPosition = () => {
    cubePositionRef.current = { x: 0, y: 0, z: -5 };
    cubeRotationRef.current = { x: 0, y: 0 };
  };

  const toggleAR = (assetId: string) => {
    setSelectedAR(selectedAR === assetId ? null : assetId);
  };

  const filteredAssets = AR_ASSETS.filter(asset => asset.category === selectedCategory);

  return (
    <div className="scene-control-container">
      <div className="scene-header">
        <h1>📦 Khám phá AR, 3D và điều khiển đối tượng bằng cử chỉ tay</h1>
      </div>

      <div className="main-layout">
        <div className="left-panel">
          <div className="camera-section">
            <div className="section-header">
              <h2>📷 Camera & AR Overlay</h2>
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

            {/* AR Overlay Selector */}
            {isInitialized && (
              <div className="ar-selector-panel">
                <button 
                  className="ar-toggle-btn"
                  onClick={() => setArPanelOpen(!arPanelOpen)}
                >
                  {arPanelOpen ? '🎭 Ẩn AR' : '🎭 Chọn AR Effect'}
                </button>

                {arPanelOpen && (
                  <div className="ar-panel">
                    <div className="ar-categories">
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(key as ARAsset['category'])}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="ar-assets-grid">
                      {filteredAssets.map(asset => (
                        <button
                          key={asset.id}
                          className={`ar-asset-btn ${selectedAR === asset.id ? 'selected' : ''}`}
                          onClick={() => toggleAR(asset.id)}
                          title={asset.description}
                        >
                          <span className="ar-emoji">{asset.emoji}</span>
                          <span className="ar-name">{asset.name}</span>
                        </button>
                      ))}
                    </div>

                    {selectedAR && (
                      <div className="ar-selected-info">
                        <span className="ar-info-icon">✨</span>
                        <span className="ar-info-text">
                          {AR_ASSETS.find(a => a.id === selectedAR)?.description}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="scene-3d" ref={sceneContainerRef} />
          </div>
        </div>

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
              <span className="status-label">Mặt phát hiện:</span>
              <span className={`status-value ${faceDetected ? 'active' : ''}`}>
                {faceDetected ? 'Có' : 'Không'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Tay phát hiện:</span>
              <span className={`status-value ${handDetected ? 'active' : ''}`}>
                {handDetected ? 'Có' : 'Không'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">AR Effect:</span>
              <span className="status-value">
                {selectedAR ? AR_ASSETS.find(a => a.id === selectedAR)?.emoji : 'Không'}
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
                <li>🎭 <strong>AR Effects</strong>: Nhấn "Chọn AR Effect" để thêm hiệu ứng vào mặt</li>
                <li>✋ <strong>Tay phải</strong>: Nhéo ngón để di chuyển khối 3D</li>
                <li>✊ <strong>Tay trái</strong>: Nắm đấm để xoay khối 3D</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

