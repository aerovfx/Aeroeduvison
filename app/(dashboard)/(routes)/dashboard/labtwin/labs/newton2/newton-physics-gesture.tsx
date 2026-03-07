'use client';

import './mediapipe-console-filter';

import { useEffect, useRef, useState } from 'react';
import { 
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import './newton-physics-gesture.css';
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
import {
  NewtonPhysicsEngine,
  PhysicsObject,
  PhysicsStats,
  Vector3D,
  formatVector,
  getMagnitude
} from './newton-physics-engine';
import {
  GestureRecognizer,
  PhysicsControlRules,
  GestureState,
  HandGesture,
  HandVelocityTracker
} from './hand-gesture-physics';

export default function NewtonPhysicsGesture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Physics engine
  const physicsEngineRef = useRef<NewtonPhysicsEngine | null>(null);
  const physicsObjectRef = useRef<PhysicsObject | null>(null);
  const velocityTrackerRef = useRef<HandVelocityTracker>(new HandVelocityTracker());
  
  // State
  const [cameraActive, setCameraActive] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // AR Overlay State
  const [selectedAR, setSelectedAR] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ARAsset['category']>('christmas');
  const [arPanelOpen, setArPanelOpen] = useState(false);
  
  // Gesture states
  const [leftGesture, setLeftGesture] = useState<GestureState | null>(null);
  const [rightGesture, setRightGesture] = useState<GestureState | null>(null);
  const [leftControl, setLeftControl] = useState<string>('');
  const [rightControl, setRightControl] = useState<string>('');
  
  // Physics stats
  const [physicsStats, setPhysicsStats] = useState<PhysicsStats | null>(null);
  const [baseMass, setBaseMass] = useState(1.0);
  const [currentMass, setCurrentMass] = useState(1.0);
  const [currentForceMultiplier, setCurrentForceMultiplier] = useState(1.0);

  // Last force application time
  const lastForceTimeRef = useRef<number>(0);

  // Initialize Physics Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    physicsEngineRef.current = new NewtonPhysicsEngine(canvas.width, canvas.height);
    
    physicsObjectRef.current = NewtonPhysicsEngine.createObject(
      canvas.width / 2,
      canvas.height / 2,
      baseMass,
      40,
      '#667eea'
    );
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
            setTimeout(async () => {
              try {
                if (videoRef.current) {
                  await videoRef.current.play();
                  setCameraActive(true);
                  setIsInitialized(true);
                }
              } catch (retryError) {
                setErrorMessage('❌ Không thể phát video.');
                setIsStarted(false);
              }
            }, 100);
          }
        };
      }
    } catch (error: any) {
      console.error('Initialization error:', error);
      setIsStarted(false);
      setErrorMessage(`❌ Lỗi: ${error.message}`);
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
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Main detection and physics loop
  useEffect(() => {
    if (!isInitialized || !handLandmarker || !faceLandmarker) return;
    if (!physicsEngineRef.current || !physicsObjectRef.current) return;

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

      // Detect faces for AR
      const faceResults = faceLandmarker.detectForVideo(video, startTime);
      
      if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
        setFaceDetected(true);
        // Mirror face landmarks for drawing (video is already mirrored)
        const faceLandmarks = faceResults.faceLandmarks[0].map(lm => ({
          ...lm,
          x: 1 - lm.x
        }));

        if (selectedAR) {
          const asset = AR_ASSETS.find(a => a.id === selectedAR);
          if (asset) {
            let position;
            
            switch (asset.type) {
              case 'hat':
                position = calculateHatPosition(faceLandmarks, canvas.width, canvas.height);
                // Mirror X position for mirrored video
                position.x = canvas.width - position.x;
                if (asset.id === 'santa-hat') {
                  drawSantaHat(ctx, position);
                } else {
                  drawAROverlay(ctx, asset.type, asset.emoji, position);
                }
                break;
              case 'accessory':
                if (asset.id === 'reindeer-antlers') {
                  position = calculateAntlerPosition(faceLandmarks, canvas.width, canvas.height);
                  position.x = canvas.width - position.x;
                  drawReindeerAntlers(ctx, position);
                } else {
                  position = calculateAntlerPosition(faceLandmarks, canvas.width, canvas.height);
                  position.x = canvas.width - position.x;
                  drawAROverlay(ctx, asset.type, asset.emoji, position);
                }
                break;
              case 'mask':
                position = calculateMaskPosition(faceLandmarks, canvas.width, canvas.height);
                position.x = canvas.width - position.x;
                drawAROverlay(ctx, asset.type, asset.emoji, position);
                break;
              case 'full-face':
                position = calculateFullFacePosition(faceLandmarks, canvas.width, canvas.height);
                position.x = canvas.width - position.x;
                drawAROverlay(ctx, asset.type, asset.emoji, position, 1.5);
                break;
            }
          }
        }
      } else {
        setFaceDetected(false);
      }

      // Detect hands for gestures
      const handResults = handLandmarker.detectForVideo(video, startTime);
      
      if (handResults.landmarks && handResults.landmarks.length > 0) {
        setHandDetected(true);

        let leftHandLandmarks: any = null;
        let rightHandLandmarks: any = null;

        // Identify left and right hands
        handResults.handedness.forEach((hand, index) => {
          if (hand[0].categoryName === 'Left') {
            leftHandLandmarks = handResults.landmarks[index];
          } else {
            rightHandLandmarks = handResults.landmarks[index];
          }
        });

        // Process LEFT HAND - Control mass & force multiplier
        if (leftHandLandmarks) {
          const drawingUtils = new DrawingUtils(ctx);
          
          // Mirror landmarks for drawing (video is already mirrored)
          const mirroredLeftLandmarks = leftHandLandmarks.map(lm => ({
            ...lm,
            x: 1 - lm.x
          }));
          
          // Draw hand skeleton
          drawingUtils.drawConnectors(
            mirroredLeftLandmarks,
            HandLandmarker.HAND_CONNECTIONS,
            { color: '#10b981', lineWidth: 3 }
          );
          drawingUtils.drawLandmarks(
            mirroredLeftLandmarks,
            { color: '#ffffff', fillColor: '#10b981', radius: 4 }
          );

          // Recognize gesture
          const leftGestureState = GestureRecognizer.recognize(leftHandLandmarks);
          setLeftGesture(leftGestureState);

          // Get control parameters
          const control = PhysicsControlRules.getLeftHandControl(leftGestureState.gesture);
          setLeftControl(control.description);

          // Apply mass multiplier
          if (physicsObjectRef.current) {
            physicsObjectRef.current.mass = baseMass * control.massMultiplier;
            setCurrentMass(baseMass * control.massMultiplier);
          }

          // Apply force multiplier
          setCurrentForceMultiplier(control.forceMultiplier);

          // Draw gesture indicator
          const indicator = PhysicsControlRules.getGestureIndicator(leftGestureState.gesture);
          const handX = (1 - leftGestureState.position.x) * canvas.width;
          const handY = leftGestureState.position.y * canvas.height;

          ctx.fillStyle = indicator.color;
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(indicator.emoji, handX, handY - 60);

          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = indicator.color;
          ctx.fillText(indicator.label, handX, handY - 20);
        } else {
          setLeftGesture(null);
          setLeftControl('');
        }

        // Process RIGHT HAND - Control force direction & application
        if (rightHandLandmarks) {
          const drawingUtils = new DrawingUtils(ctx);
          
          // Mirror landmarks for drawing (video is already mirrored)
          const mirroredRightLandmarks = rightHandLandmarks.map(lm => ({
            ...lm,
            x: 1 - lm.x
          }));
          
          // Draw hand skeleton
          drawingUtils.drawConnectors(
            mirroredRightLandmarks,
            HandLandmarker.HAND_CONNECTIONS,
            { color: '#3b82f6', lineWidth: 3 }
          );
          drawingUtils.drawLandmarks(
            mirroredRightLandmarks,
            { color: '#ffffff', fillColor: '#3b82f6', radius: 4 }
          );

          // Recognize gesture
          const rightGestureState = GestureRecognizer.recognize(rightHandLandmarks);
          setRightGesture(rightGestureState);

          // Get control parameters
          const control = PhysicsControlRules.getRightHandControl(
            rightGestureState.gesture,
            rightGestureState.position,
            rightGestureState.direction,
            canvas.width,
            canvas.height
          );
          setRightControl(control.description);

          // Apply force if active
          if (control.forceActive && physicsObjectRef.current && physicsEngineRef.current) {
            const now = Date.now();
            
            // Apply force every 100ms (not every frame)
            if (now - lastForceTimeRef.current > 100) {
              const baseForce = 30; // Base force magnitude
              const force = {
                x: control.forceDirection.x * baseForce * control.forceMagnitude * currentForceMultiplier,
                y: control.forceDirection.y * baseForce * control.forceMagnitude * currentForceMultiplier,
                z: 0
              };

              physicsEngineRef.current.applyForce(physicsObjectRef.current, force);
              lastForceTimeRef.current = now;
            }
          }

          // Draw force direction indicator
          if (control.forceActive) {
            const handX = (1 - rightGestureState.position.x) * canvas.width;
            const handY = rightGestureState.position.y * canvas.height;

            // Draw force arrow
            const arrowLength = 80 * control.forceMagnitude;
            const endX = handX + control.forceDirection.x * arrowLength;
            const endY = handY + control.forceDirection.y * arrowLength;

            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Arrow head
            const angle = Math.atan2(control.forceDirection.y, control.forceDirection.x);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - 15 * Math.cos(angle - Math.PI / 6),
              endY - 15 * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              endX - 15 * Math.cos(angle + Math.PI / 6),
              endY - 15 * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }

          // Draw gesture indicator
          const indicator = PhysicsControlRules.getGestureIndicator(rightGestureState.gesture);
          const handX = (1 - rightGestureState.position.x) * canvas.width;
          const handY = rightGestureState.position.y * canvas.height;

          ctx.fillStyle = indicator.color;
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(indicator.emoji, handX, handY - 60);

          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = indicator.color;
          ctx.fillText(indicator.label, handX, handY - 20);
        } else {
          setRightGesture(null);
          setRightControl('');
        }
      } else {
        setHandDetected(false);
        setLeftGesture(null);
        setRightGesture(null);
      }

      // Update physics
      if (physicsEngineRef.current && physicsObjectRef.current) {
        // Reset velocity if right hand is pinching (stop gesture)
        if (rightGesture?.gesture === 'pinch') {
          physicsObjectRef.current.velocity = { x: 0, y: 0, z: 0 };
        }

        physicsEngineRef.current.update(physicsObjectRef.current);
        
        const stats = physicsEngineRef.current.getStats(physicsObjectRef.current);
        setPhysicsStats(stats);
        
        // Draw physics object
        const obj = physicsObjectRef.current;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(obj.position.x, canvas.height - 10, obj.radius * 0.8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Object
        const gradient = ctx.createRadialGradient(
          obj.position.x - obj.radius * 0.3,
          obj.position.y - obj.radius * 0.3,
          0,
          obj.position.x,
          obj.position.y,
          obj.radius
        );
        gradient.addColorStop(0, '#a855f7');
        gradient.addColorStop(1, '#667eea');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(obj.position.x, obj.position.y, obj.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(
          obj.position.x - obj.radius * 0.3,
          obj.position.y - obj.radius * 0.3,
          obj.radius * 0.4,
          0,
          Math.PI * 2
        );
        ctx.fill();
        
        // Draw velocity vector
        if (getMagnitude(obj.velocity) > 0.5) {
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(obj.position.x, obj.position.y);
          ctx.lineTo(
            obj.position.x + obj.velocity.x * 5,
            obj.position.y + obj.velocity.y * 5
          );
          ctx.stroke();
          
          const angle = Math.atan2(obj.velocity.y, obj.velocity.x);
          ctx.fillStyle = '#00FF00';
          ctx.beginPath();
          ctx.moveTo(
            obj.position.x + obj.velocity.x * 5,
            obj.position.y + obj.velocity.y * 5
          );
          ctx.lineTo(
            obj.position.x + obj.velocity.x * 5 - 10 * Math.cos(angle - Math.PI / 6),
            obj.position.y + obj.velocity.y * 5 - 10 * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            obj.position.x + obj.velocity.x * 5 - 10 * Math.cos(angle + Math.PI / 6),
            obj.position.y + obj.velocity.y * 5 - 10 * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized, handLandmarker, faceLandmarker, selectedAR, rightGesture, currentForceMultiplier]);

  const resetObject = () => {
    if (physicsEngineRef.current && physicsObjectRef.current && canvasRef.current) {
      physicsEngineRef.current.reset(
        physicsObjectRef.current,
        canvasRef.current.width / 2,
        canvasRef.current.height / 2
      );
    }
  };

  const toggleAR = (assetId: string) => {
    setSelectedAR(selectedAR === assetId ? null : assetId);
  };

  const filteredAssets = AR_ASSETS.filter(asset => asset.category === selectedCategory);

  return (
    <div className="newton-physics-container">
      <div className="physics-header">
        <h1>⚛️ Định Luật Newton 2: Điều khiển bằng Cử chỉ Tay</h1>
        <p className="physics-subtitle">🖐️ Tay Trái: Điều chỉnh m, F  |  ☝️ Tay Phải: Hướng lực</p>
      </div>

      <div className="main-layout">
        <div className="left-panel">
          <div className="camera-section">
            <div className="section-header">
              <h2>📷 Camera & Gesture Control</h2>
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
                    <p>Nhấn "Bắt đầu" để khởi động</p>
                    {errorMessage && (
                      <div className="error-message">{errorMessage}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Gesture Guide */}
            {isInitialized && (
              <div className="gesture-guide">
                <div className="gesture-guide-section left-hand">
                  <h4>🖐️ TAY TRÁI - Điều chỉnh thông số</h4>
                  <div className="gesture-list">
                    <div className="gesture-item">✊ Nắm đấm → m × 0.5</div>
                    <div className="gesture-item">✌️ 2 ngón → m × 1.0</div>
                    <div className="gesture-item">🖖 3 ngón → m × 2.0</div>
                    <div className="gesture-item">🖐️ Mở tay → m × 3.0</div>
                    <div className="gesture-item">👍 Ngón cái → F × 2.0</div>
                    <div className="gesture-item">🤏 Nhéo → F × 0.5</div>
                  </div>
                </div>

                <div className="gesture-guide-section right-hand">
                  <h4>☝️ TAY PHẢI - Điều khiển lực</h4>
                  <div className="gesture-list">
                    <div className="gesture-item">☝️ Chỉ trỏ → Hướng ngón</div>
                    <div className="gesture-item">✌️ 2 ngón → Lệch 45°</div>
                    <div className="gesture-item">✊ Nắm đấm → Xuống</div>
                    <div className="gesture-item">🖐️ Mở tay → Lên</div>
                    <div className="gesture-item">👍 Ngón cái → Sang phải</div>
                    <div className="gesture-item">🤏 Nhéo → DỪNG</div>
                  </div>
                </div>
              </div>
            )}

            {/* AR Selector (collapsed by default) */}
            {isInitialized && arPanelOpen && (
              <div className="ar-selector-panel">
                <button 
                  className="ar-toggle-btn"
                  onClick={() => setArPanelOpen(!arPanelOpen)}
                >
                  🎭 Ẩn AR
                </button>

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
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="right-panel">
          <h2>📊 Thông Số Vật Lý</h2>

          {/* Formula */}
          <div className="formula-card">
            <div className="formula-title">Định Luật Newton 2</div>
            <div className="formula-equation">
              <span className="formula-f">F</span>
              <span className="formula-equals">=</span>
              <span className="formula-m">m</span>
              <span className="formula-times">×</span>
              <span className="formula-a">a</span>
            </div>
          </div>

          {/* Current Gesture Controls */}
          <div className="gesture-controls">
            <div className="gesture-control-card left">
              <div className="control-header">
                <span className="control-icon">🖐️</span>
                <span className="control-label">Tay Trái</span>
              </div>
              <div className="control-value">
                {leftGesture ? (
                  <>
                    <span className="gesture-emoji">
                      {PhysicsControlRules.getGestureIndicator(leftGesture.gesture).emoji}
                    </span>
                    <span className="gesture-desc">{leftControl}</span>
                  </>
                ) : (
                  <span className="no-gesture">Không phát hiện</span>
                )}
              </div>
            </div>

            <div className="gesture-control-card right">
              <div className="control-header">
                <span className="control-icon">☝️</span>
                <span className="control-label">Tay Phải</span>
              </div>
              <div className="control-value">
                {rightGesture ? (
                  <>
                    <span className="gesture-emoji">
                      {PhysicsControlRules.getGestureIndicator(rightGesture.gesture).emoji}
                    </span>
                    <span className="gesture-desc">{rightControl}</span>
                  </>
                ) : (
                  <span className="no-gesture">Không phát hiện</span>
                )}
              </div>
            </div>
          </div>

          {/* Physics Stats */}
          {physicsStats && (
            <div className="stats-grid">
              <div className="stat-card force-card">
                <div className="stat-icon">💪</div>
                <div className="stat-label">Lực (F)</div>
                <div className="stat-value">
                  {getMagnitude(physicsStats.force).toFixed(2)} N
                </div>
                <div className="stat-vector">
                  {formatVector(physicsStats.force, 1)}
                </div>
              </div>

              <div className="stat-card mass-card">
                <div className="stat-icon">⚖️</div>
                <div className="stat-label">Khối lượng (m)</div>
                <div className="stat-value">
                  {currentMass.toFixed(2)} kg
                </div>
                <div className="stat-mult">
                  Base: {baseMass.toFixed(1)} kg
                </div>
              </div>

              <div className="stat-card accel-card">
                <div className="stat-icon">🚀</div>
                <div className="stat-label">Gia tốc (a)</div>
                <div className="stat-value">
                  {getMagnitude(physicsStats.acceleration).toFixed(2)} m/s²
                </div>
                <div className="stat-vector">
                  {formatVector(physicsStats.acceleration, 1)}
                </div>
              </div>

              <div className="stat-card velocity-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-label">Vận tốc (v)</div>
                <div className="stat-value">
                  {physicsStats.speed.toFixed(2)} m/s
                </div>
                <div className="stat-vector">
                  {formatVector(physicsStats.velocity, 1)}
                </div>
              </div>
            </div>
          )}

          {/* Status */}
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
              <span className="status-label">Force × :</span>
              <span className="status-value">{currentForceMultiplier.toFixed(1)}×</span>
            </div>
          </div>

          {/* Controls */}
          <div className="control-section">
            {!isStarted ? (
              <button className="btn-start" onClick={startCamera}>
                ▶️ Bắt đầu
              </button>
            ) : (
              <>
                <button className="btn-stop" onClick={stopCamera}>
                  ⏹️ Dừng
                </button>
                <button className="btn-reset" onClick={resetObject}>
                  🔄 Đặt lại vật
                </button>
                {!arPanelOpen && (
                  <button className="btn-ar" onClick={() => setArPanelOpen(true)}>
                    🎭 Mở AR Effects
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

