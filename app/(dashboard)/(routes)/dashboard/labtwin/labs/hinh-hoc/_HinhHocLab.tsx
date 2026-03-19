'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { 
  HandLandmarker,
  PoseLandmarker,
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import { Camera } from 'lucide-react';
import './mediapipe-console-filter';

interface GestureState {
  isPinching: boolean;
  isFist: boolean;
  pinchStrength: number;
  fistStrength: number;
}

export default function HinhHocPage() {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // MediaPipe refs
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  
  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const camera3DRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectGroupRef = useRef<THREE.Group | null>(null);
  const cornerSpheresRef = useRef<THREE.Mesh[]>([]);
  const scaleHandlesRef = useRef<THREE.Mesh[]>([]);
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShape, setSelectedShape] = useState<'box' | 'sphere' | 'torus'>('box');
  const [objectColor, setObjectColor] = useState('#4a9eff');
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [pinchStrength, setPinchStrength] = useState(0);
  const [fistStrength, setFistStrength] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  
  // Gesture tracking refs
  const cubePositionRef = useRef({ x: 0, y: 0, z: 0 });
  const cubeRotationRef = useRef({ x: 0, y: 0 });
  const cubeScaleRef = useRef({ x: 1, y: 1, z: 1 });
  const isScalingRef = useRef(false);
  const scalingAxisRef = useRef<'x' | 'y' | 'z' | null>(null);
  const scaleStartDistanceRef = useRef(0);
  
  // Calculate pinch strength (thumb to index finger)
  const calculatePinch = useCallback((landmarks: any[]): number => {
    if (!landmarks || landmarks.length < 9) return 0;
    
    const thumb = landmarks[4];
    const index = landmarks[8];
    
    const distance = Math.sqrt(
      Math.pow(thumb.x - index.x, 2) +
      Math.pow(thumb.y - index.y, 2) +
      Math.pow(thumb.z - index.z, 2)
    );
    
    // Normalize to 0-100%
    return Math.max(0, Math.min(100, (1 - distance * 10) * 100));
  }, []);
  
  // Calculate fist strength (all fingers closed)
  // Improved: Check if fingers are bent (not just close to palm)
  const calculateFist = useCallback((landmarks: any[]): number => {
    if (!landmarks || landmarks.length < 21) return 0;
    
    // Check if fingers are bent by comparing tip to middle joint
    // For a fist, tip should be lower (higher Y value) than middle joint
    const fingerChecks = [
      { tip: 8, middle: 6 },   // Index finger
      { tip: 12, middle: 10 },  // Middle finger
      { tip: 16, middle: 14 },  // Ring finger
      { tip: 20, middle: 18 }   // Pinky
    ];
    
    let bentCount = 0;
    fingerChecks.forEach(({ tip, middle }) => {
      // Finger is bent if tip Y > middle Y (inverted Y coordinate)
      if (landmarks[tip].y > landmarks[middle].y) {
        bentCount++;
      }
    });
    
    // Also check thumb (simplified: thumb tip should be close to index base)
    const thumbTip = landmarks[4];
    const indexBase = landmarks[5];
    const thumbDistance = Math.sqrt(
      Math.pow(thumbTip.x - indexBase.x, 2) +
      Math.pow(thumbTip.y - indexBase.y, 2)
    );
    const thumbBent = thumbDistance < 0.15; // Thumb is bent if close to index
    
    // Fist strength: percentage of fingers that are bent
    const fistStrength = ((bentCount + (thumbBent ? 1 : 0)) / 5) * 100;
    
    return Math.max(0, Math.min(100, fistStrength));
  }, []);
  
  // Detect gestures
  const detectGestures = useCallback((landmarks: any[]): GestureState => {
    const pinchStrength = calculatePinch(landmarks);
    const fistStrength = calculateFist(landmarks);
    
    // Lower threshold for more responsive interaction
    // Pinch: thumb and index finger close together (50% threshold)
    // Fist: at least 3-4 fingers bent (50% threshold = 2.5 fingers)
    return {
      isPinching: pinchStrength > 50,
      isFist: fistStrength > 50, // Lower threshold: 50% = at least 2.5 fingers bent
      pinchStrength,
      fistStrength
    };
  }, [calculatePinch, calculateFist]);
  
  // Initialize MediaPipe
  const initializeMediaPipe = useCallback(async () => {
    // Suppress MediaPipe/TensorFlow console messages
    const originalConsoleError = console.error;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      // Suppress MediaPipe/TensorFlow info messages that are logged as errors
      if (
        message.includes('TensorFlow Lite') ||
        message.includes('XNNPACK delegate') ||
        message.includes('GL version') ||
        message.includes('OpenGL error checking') ||
        message.includes('Graph successfully started') ||
        message.includes('NORM_RECT without IMAGE_DIMENSIONS') ||
        message.includes('FaceBlendshapesGraph acceleration')
      ) {
        return; // Suppress these messages
      }
      originalConsoleError.apply(console, args);
    };
    
    console.info = (...args: any[]) => {
      const message = args.join(' ');
      // Suppress MediaPipe/TensorFlow info messages
      if (
        message.includes('TensorFlow Lite') ||
        message.includes('XNNPACK delegate') ||
        message.includes('GL version') ||
        message.includes('OpenGL error checking')
      ) {
        return; // Suppress these messages
      }
      originalConsoleInfo.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      // Suppress MediaPipe warnings that are not critical
      if (
        message.includes('NORM_RECT without IMAGE_DIMENSIONS') ||
        message.includes('OpenGL error checking') ||
        message.includes('FaceBlendshapesGraph acceleration')
      ) {
        return; // Suppress these warnings
      }
      originalConsoleWarn.apply(console, args);
    };
    
    // Wait a bit for refs to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available', {
        video: !!videoRef.current,
        canvas: !!canvasRef.current
      });
      setError('Video hoặc canvas chưa sẵn sàng. Vui lòng thử lại.');
      setIsLoading(false);
      // Restore console
      console.error = originalConsoleError;
      console.info = originalConsoleInfo;
      console.warn = originalConsoleWarn;
      return;
    }
    
    // Set canvas size
    if (canvasRef.current) {
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initializing MediaPipe Vision...');
      
      // Initialize MediaPipe Vision
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      console.log('MediaPipe Vision initialized');
      
      // Create hand landmarker
      console.log('Creating hand landmarker...');
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
      handLandmarkerRef.current = hands;
      console.log('Hand landmarker created');
      
      // Create pose landmarker
      console.log('Creating pose landmarker...');
      const pose = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minPoseTrackingConfidence: 0.5
      });
      poseLandmarkerRef.current = pose;
      console.log('Pose landmarker created');
      
      // Create face landmarker
      console.log('Creating face landmarker...');
      const face = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false
      });
      faceLandmarkerRef.current = face;
      console.log('Face landmarker created');
      
      // Get camera stream
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'  // Front camera
        }
      });
      console.log('Camera access granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Đợi metadata load xong trước khi play để tránh lỗi "play() interrupted"
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              console.log('Video playing');
        
        // Resize Three.js canvas when video loads
              if (threeCanvasRef.current && rendererRef.current && camera3DRef.current) {
            const video = videoRef.current;
            const videoRect = video.getBoundingClientRect();
            const displayWidth = videoRect.width;
            const displayHeight = videoRect.height;
            
            threeCanvasRef.current.width = displayWidth;
            threeCanvasRef.current.height = displayHeight;
            threeCanvasRef.current.style.width = `${displayWidth}px`;
            threeCanvasRef.current.style.height = `${displayHeight}px`;
            rendererRef.current.setSize(displayWidth, displayHeight);
            camera3DRef.current.aspect = displayWidth / displayHeight;
            camera3DRef.current.updateProjectionMatrix();
          }
              
              setIsStreaming(true);
              setIsInitialized(true);
              setIsLoading(false);
              setIsStarted(true);
              console.log('Initialization complete');
            }
          } catch (err: any) {
            console.warn('Video playback delayed:', err);
            // Retry after a short delay
            setTimeout(async () => {
              try {
                if (videoRef.current) {
        await videoRef.current.play();
                  console.log('Video playing (retry)');
                  
                  if (threeCanvasRef.current && rendererRef.current && camera3DRef.current) {
                    const video = videoRef.current;
                    const videoRect = video.getBoundingClientRect();
                    const displayWidth = videoRect.width;
                    const displayHeight = videoRect.height;
                    
                    threeCanvasRef.current.width = displayWidth;
                    threeCanvasRef.current.height = displayHeight;
                    threeCanvasRef.current.style.width = `${displayWidth}px`;
                    threeCanvasRef.current.style.height = `${displayHeight}px`;
                    rendererRef.current.setSize(displayWidth, displayHeight);
                    camera3DRef.current.aspect = displayWidth / displayHeight;
                    camera3DRef.current.updateProjectionMatrix();
      }
      
      setIsStreaming(true);
      setIsInitialized(true);
      setIsLoading(false);
      setIsStarted(true);
                  console.log('Initialization complete (retry)');
                }
              } catch (retryErr) {
                console.error('Video play failed:', retryErr);
              }
            }, 100);
          }
        };
      }
      
      // Restore console after successful initialization
      console.error = originalConsoleError;
      console.info = originalConsoleInfo;
      console.warn = originalConsoleWarn;
    } catch (error: any) {
      // Restore console on error
      console.error = originalConsoleError;
      console.info = originalConsoleInfo;
      console.warn = originalConsoleWarn;
      
      console.error('Error initializing MediaPipe:', error);
      setIsLoading(false);
      setIsStarted(false);
      
      // Show user-friendly error message
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission denied')) {
        setError('❌ Quyền truy cập camera bị từ chối. Vui lòng cho phép quyền camera trong cài đặt trình duyệt.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError' || error.message?.includes('NotFound')) {
        setError('❌ Không tìm thấy camera. Vui lòng kết nối camera.');
      } else if (error.message?.includes('getUserMedia')) {
        setError('❌ Không thể truy cập camera. Vui lòng kiểm tra cài đặt trình duyệt.');
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(`❌ Lỗi: ${errorMessage}`);
      }
    }
  }, []);
  
  // Detection and control loop
  useEffect(() => {
    if (!isInitialized || !handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;
    
    const detect = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(detect);
      return;
    }
    
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const startTime = performance.now();
      
      // Clear and draw video (mirrored)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Helper function to mirror landmarks (flip X coordinate)
      const mirrorLandmarks = (landmarks: any[]): any[] => {
        return landmarks.map(landmark => ({
          ...landmark,
          x: 1 - landmark.x // Mirror X coordinate
        }));
      };
      
      const drawingUtils = new DrawingUtils(ctx);
      
      // Detect hands
      if (handLandmarkerRef.current) {
        const handResults = handLandmarkerRef.current.detectForVideo(video, startTime);
        
        if (handResults.landmarks && handResults.landmarks.length > 0) {
          setHandDetected(true);
          
          // Process hands
          // MediaPipe detects handedness based on hand structure (thumb position), not screen position
          // So "Left" means left hand in real world, "Right" means right hand in real world
          let rightHandLandmarks: any = null;
          let leftHandLandmarks: any = null;
          
          handResults.handedness.forEach((hand, index) => {
            // MediaPipe handedness is based on hand structure, not mirroring
            if (hand[0].categoryName === 'Right') {
              // Right hand in real world
              rightHandLandmarks = handResults.landmarks[index];
            } else if (hand[0].categoryName === 'Left') {
              // Left hand in real world
              leftHandLandmarks = handResults.landmarks[index];
            }
          });
          
          // Right hand: Pinch to grab and move
          if (rightHandLandmarks) {
            // Mirror landmarks to match mirrored video
            const mirroredRightHand = mirrorLandmarks(rightHandLandmarks);
            // Draw hand with gradient colors (like reference code)
            drawingUtils.drawConnectors(
              mirroredRightHand,
              HandLandmarker.HAND_CONNECTIONS,
              { color: '#667eea', lineWidth: 3 }
            );
            drawingUtils.drawLandmarks(
              mirroredRightHand,
              { color: '#764ba2', fillColor: '#667eea', lineWidth: 2, radius: 4 }
            );
            
            const gestures = detectGestures(rightHandLandmarks);
            setPinchStrength(gestures.pinchStrength);
            setIsGrabbing(gestures.isPinching);
            
            // Control cube position or scale with pinch
            if (gestures.isPinching) {
              const thumb = rightHandLandmarks[4];
              const index = rightHandLandmarks[8];
              
              const midpoint = {
                x: (thumb.x + index.x) / 2,
                y: (thumb.y + index.y) / 2,
                z: (thumb.z + index.z) / 2
              };
              
              // Map hand position to 3D space
              const mirroredX = 1 - midpoint.x;
              const targetX = (mirroredX - 0.5) * 6;
              const targetY = -(midpoint.y - 0.5) * 6;
              const targetZ = -5 + midpoint.z * 3;
              
              if (objectGroupRef.current && camera3DRef.current && rendererRef.current) {
                // Check if pinch is near any scale handle
                let nearestHandle: THREE.Mesh | null = null;
                let minDistance = Infinity;
                const pinchWorldPos = new THREE.Vector3(targetX, targetY, targetZ);
                
                // Project 3D handles to screen space and check distance
                scaleHandlesRef.current.forEach((handle) => {
                  // Get handle world position
                  const handleWorldPos = new THREE.Vector3();
                  handle.getWorldPosition(handleWorldPos);
                  
                  // Add object position offset
                  handleWorldPos.add(objectGroupRef.current!.position);
                  
                  // Calculate distance in 3D space
                  const distance = pinchWorldPos.distanceTo(handleWorldPos);
                  
                  if (distance < 1.5 && distance < minDistance) { // Threshold for handle detection
                    minDistance = distance;
                    nearestHandle = handle;
                  }
                });
                
                // If near a scale handle, scale the object
                if (nearestHandle && nearestHandle.userData.axis) {
                  const axis = nearestHandle.userData.axis as 'x' | 'y' | 'z';
                  
                  // Initialize scaling if just started
                  if (!isScalingRef.current) {
                    isScalingRef.current = true;
                    scalingAxisRef.current = axis;
                    // Store initial scale value for this axis
                    (nearestHandle.userData as any).initialScale = cubeScaleRef.current[axis];
                    
                    // Calculate initial distance along the axis from object center
                    const objectCenter = objectGroupRef.current.position;
                    const handleWorldPos = new THREE.Vector3();
                    nearestHandle.getWorldPosition(handleWorldPos);
                    handleWorldPos.add(objectCenter);
                    
                    // Get axis direction vector
                    const axisDir = new THREE.Vector3();
                    if (axis === 'x') axisDir.set(1, 0, 0);
                    else if (axis === 'y') axisDir.set(0, 1, 0);
                    else if (axis === 'z') axisDir.set(0, 0, 1);
                    
                    // Project handle position onto axis
                    const handleToCenter = handleWorldPos.clone().sub(objectCenter);
                    const initialProjectedDistance = handleToCenter.dot(axisDir);
                    scaleStartDistanceRef.current = Math.abs(initialProjectedDistance);
                  }
                  
                  // Calculate current distance along the axis
                  const objectCenter = objectGroupRef.current.position;
                  
                  // Get axis direction vector
                  const axisDir = new THREE.Vector3();
                  if (axis === 'x') axisDir.set(1, 0, 0);
                  else if (axis === 'y') axisDir.set(0, 1, 0);
                  else if (axis === 'z') axisDir.set(0, 0, 1);
                  
                  // Project pinch position onto axis
                  const pinchToCenter = pinchWorldPos.clone().sub(objectCenter);
                  const currentProjectedDistance = Math.abs(pinchToCenter.dot(axisDir));
                  
                  // Calculate scale factor based on distance change along the axis
                  const scaleFactor = currentProjectedDistance / scaleStartDistanceRef.current;
                  const initialScale = (nearestHandle.userData as any).initialScale || 1;
                  const newScale = initialScale * scaleFactor;
                  
                  // Update scale for the specific axis (clamp between 0.3 and 3)
                  if (axis === 'x') {
                    cubeScaleRef.current.x = Math.max(0.3, Math.min(3, newScale));
                  } else if (axis === 'y') {
                    cubeScaleRef.current.y = Math.max(0.3, Math.min(3, newScale));
                  } else if (axis === 'z') {
                    cubeScaleRef.current.z = Math.max(0.3, Math.min(3, newScale));
                  }
                  
                  // Update scale
                  objectGroupRef.current.scale.set(
                    cubeScaleRef.current.x,
                    cubeScaleRef.current.y,
                    cubeScaleRef.current.z
                  );
                  
                  // Highlight the active handle
                  const handleColor = axis === 'x' ? '#FF0000' : axis === 'y' ? '#00FF00' : '#0000FF';
                  const gradient = ctx.createRadialGradient(
                    (1 - midpoint.x) * canvas.width,
                    midpoint.y * canvas.height,
                    0,
                    (1 - midpoint.x) * canvas.width,
                    midpoint.y * canvas.height,
                    20
                  );
                  gradient.addColorStop(0, `rgba(${axis === 'x' ? '255,0,0' : axis === 'y' ? '0,255,0' : '0,0,255'}, 0.9)`);
                  gradient.addColorStop(0.5, `rgba(${axis === 'x' ? '255,0,0' : axis === 'y' ? '0,255,0' : '0,0,255'}, 0.6)`);
                  gradient.addColorStop(1, `rgba(${axis === 'x' ? '255,0,0' : axis === 'y' ? '0,255,0' : '0,0,255'}, 0)`);
                  
                  ctx.fillStyle = gradient;
                  ctx.beginPath();
                  ctx.arc(
                    (1 - midpoint.x) * canvas.width,
                    midpoint.y * canvas.height,
                    20,
                    0,
                    2 * Math.PI
                  );
                  ctx.fill();
                  
                  // Inner dot
                  ctx.fillStyle = handleColor;
                  ctx.beginPath();
                  ctx.arc(
                    (1 - midpoint.x) * canvas.width,
                    midpoint.y * canvas.height,
                    8,
                    0,
                    2 * Math.PI
                  );
                  ctx.fill();
                } else {
                  // Not near a handle, move the object instead
                  isScalingRef.current = false;
                  scalingAxisRef.current = null;
                  
                  // Smooth interpolation for smooth movement
                  const lerpFactor = 0.25;
                  const dx = targetX - cubePositionRef.current.x;
                  const dy = targetY - cubePositionRef.current.y;
                  const dz = targetZ - cubePositionRef.current.z;
                  
                  // Only update if change is significant
                  if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 || Math.abs(dz) > 0.01) {
                    cubePositionRef.current = {
                      x: cubePositionRef.current.x + dx * lerpFactor,
                      y: cubePositionRef.current.y + dy * lerpFactor,
                      z: cubePositionRef.current.z + dz * lerpFactor
                    };
                  } else {
                    cubePositionRef.current = { x: targetX, y: targetY, z: targetZ };
                  }
                  
                  objectGroupRef.current.position.set(
                    cubePositionRef.current.x,
                    cubePositionRef.current.y,
                    cubePositionRef.current.z
                  );
                  
                  // Highlight control point with gradient (yellow for move)
                  const gradient = ctx.createRadialGradient(
                    (1 - midpoint.x) * canvas.width,
                    midpoint.y * canvas.height,
                    0,
                    (1 - midpoint.x) * canvas.width,
                    midpoint.y * canvas.height,
                    15
                  );
                  gradient.addColorStop(0, 'rgba(255, 255, 0, 0.9)');
                  gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.6)');
                  gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
                  
                  ctx.fillStyle = gradient;
                  ctx.beginPath();
                  ctx.arc(
                    (1 - midpoint.x) * canvas.width,
                    midpoint.y * canvas.height,
                    15,
                    0,
                    2 * Math.PI
                  );
                  ctx.fill();
                  
                  // Inner dot
                  ctx.fillStyle = '#FFFF00';
                  ctx.beginPath();
                  ctx.arc(
                    (1 - midpoint.x) * canvas.width,
                    midpoint.y * canvas.height,
                    6,
                    0,
                    2 * Math.PI
                  );
                  ctx.fill();
                }
              }
              
              // Highlight control point with gradient
              const gradient = ctx.createRadialGradient(
                (1 - midpoint.x) * canvas.width,
                midpoint.y * canvas.height,
                0,
                (1 - midpoint.x) * canvas.width,
                midpoint.y * canvas.height,
                15
              );
              gradient.addColorStop(0, 'rgba(255, 255, 0, 0.9)');
              gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.6)');
              gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
              
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(
                (1 - midpoint.x) * canvas.width, // Mirror X
                midpoint.y * canvas.height,
                15,
                0,
                2 * Math.PI
              );
              ctx.fill();
              
              // Inner dot
              ctx.fillStyle = '#FFFF00';
              ctx.beginPath();
              ctx.arc(
                (1 - midpoint.x) * canvas.width,
                midpoint.y * canvas.height,
                6,
                0,
                2 * Math.PI
              );
              ctx.fill();
            }
          }
          
          // Left hand: Fist to rotate
          if (leftHandLandmarks) {
            // Mirror landmarks to match mirrored video
            const mirroredLeftHand = mirrorLandmarks(leftHandLandmarks);
            // Draw hand with gradient colors (like reference code)
            drawingUtils.drawConnectors(
              mirroredLeftHand,
              HandLandmarker.HAND_CONNECTIONS,
              { color: '#4299e1', lineWidth: 3 }
            );
            drawingUtils.drawLandmarks(
              mirroredLeftHand,
              { color: '#3182ce', fillColor: '#4299e1', lineWidth: 2, radius: 4 }
            );
            
            const gestures = detectGestures(leftHandLandmarks);
            setFistStrength(gestures.fistStrength);
            setIsRotating(gestures.isFist);
            
            // Control cube rotation with fist (smooth interpolation)
            if (gestures.isFist && objectGroupRef.current) {
              const wrist = leftHandLandmarks[0];
              
              // Map hand position to rotation
              // Note: Video is mirrored, so we mirror X coordinate to match screen display
              // When hand moves right on screen → object rotates around Y axis
              // x position → Y rotation (mirrored to match screen)
              // y position → X rotation (hand up = positive rotation)
              const mirroredX = 1 - wrist.x;
              // Increase rotation range for more visible rotation (π * 3 = 540 degrees range)
              const targetRotationX = (wrist.y - 0.5) * Math.PI * 3;  // -1.5π to 1.5π (vertical movement)
              const targetRotationY = (mirroredX - 0.5) * Math.PI * 3; // -1.5π to 1.5π (horizontal, mirrored)
              
              // Smooth interpolation for rotation
              // Use higher lerp factor for more responsive rotation
              const lerpFactor = 0.4; // More responsive rotation
              const dRotX = targetRotationX - cubeRotationRef.current.x;
              const dRotY = targetRotationY - cubeRotationRef.current.y;
              
              // Only update if change is significant (prevents micro-rotations)
              if (Math.abs(dRotX) > 0.01 || Math.abs(dRotY) > 0.01) {
                cubeRotationRef.current = {
                  x: cubeRotationRef.current.x + dRotX * lerpFactor,
                  y: cubeRotationRef.current.y + dRotY * lerpFactor
                };
              } else {
                // Snap to target if very close to prevent infinite interpolation
                cubeRotationRef.current = { x: targetRotationX, y: targetRotationY };
              }
              
              objectGroupRef.current.rotation.set(
                cubeRotationRef.current.x,
                cubeRotationRef.current.y,
                0
              );
              
              // Highlight control point with gradient
              const gradient = ctx.createRadialGradient(
                (1 - wrist.x) * canvas.width,
                wrist.y * canvas.height,
                0,
                (1 - wrist.x) * canvas.width,
                wrist.y * canvas.height,
                15
              );
              gradient.addColorStop(0, 'rgba(0, 255, 255, 0.9)');
              gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.6)');
              gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
              
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(
                (1 - wrist.x) * canvas.width, // Mirror X
                wrist.y * canvas.height,
                15,
                0,
                2 * Math.PI
              );
              ctx.fill();
              
              // Inner dot
              ctx.fillStyle = '#00FFFF';
              ctx.beginPath();
              ctx.arc(
                (1 - wrist.x) * canvas.width,
                wrist.y * canvas.height,
                6,
                0,
                2 * Math.PI
              );
              ctx.fill();
            }
          }
        } else {
          setHandDetected(false);
          setIsGrabbing(false);
          setIsRotating(false);
          // Reset scaling state when hand is not detected
          isScalingRef.current = false;
          scalingAxisRef.current = null;
          // Stop interpolation when no hands detected
          // Keep current position, don't interpolate to origin
        }
      }
      
      // Detect pose (skeleton)
      if (poseLandmarkerRef.current) {
        try {
          const poseResults = poseLandmarkerRef.current.detectForVideo(video, startTime);
          
          if (poseResults.landmarks && poseResults.landmarks.length > 0) {
            setPoseDetected(true);
            
            // Draw pose skeleton with increased transparency to see character better
            poseResults.landmarks.forEach(landmarks => {
              // Mirror landmarks to match mirrored video
              const mirroredPose = mirrorLandmarks(landmarks);
              // Try to draw connections if available
              try {
                if ((PoseLandmarker as any).POSE_CONNECTIONS) {
                  drawingUtils.drawConnectors(
                    mirroredPose,
                    (PoseLandmarker as any).POSE_CONNECTIONS,
                    { color: 'rgba(102, 126, 234, 0.4)', lineWidth: 2.5 }
                  );
                }
              } catch (e) {
                // If connections not available, just draw landmarks
              }
              drawingUtils.drawLandmarks(
                mirroredPose,
                { color: 'rgba(118, 75, 162, 0.4)', fillColor: 'rgba(102, 126, 234, 0.4)', lineWidth: 1.5, radius: 3 }
              );
            });
          } else {
            setPoseDetected(false);
          }
        } catch (error) {
          // Pose detection failed, continue
          setPoseDetected(false);
        }
      }
      
      // Detect face
      if (faceLandmarkerRef.current) {
        try {
          const faceResults = faceLandmarkerRef.current.detectForVideo(video, startTime);
          
          if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
            setFaceDetected(true);
            
            // Draw full face mesh wireframe wrap for facial tracking (like reference image)
            faceResults.faceLandmarks.forEach(landmarks => {
              // Mirror landmarks to match mirrored video
              const mirroredFace = mirrorLandmarks(landmarks);
              // Try to draw connections if available
              try {
                // Draw full face mesh tesselation - main wireframe grid with increased transparency
                // This creates the complete mesh grid covering the entire face
                if ((FaceLandmarker as any).FACEMESH_TESSELATION) {
                  drawingUtils.drawConnectors(
                    mirroredFace,
                    (FaceLandmarker as any).FACEMESH_TESSELATION,
                    { color: 'rgba(66, 153, 225, 0.35)', lineWidth: 1.2 }
                  );
                }
                
                // Draw face landmarks (points) with increased transparency
                // This adds the vertices/nodes of the mesh for better tracking visualization
                drawingUtils.drawLandmarks(
                  mirroredFace,
                  { 
                    color: 'rgba(66, 153, 225, 0.35)', 
                    fillColor: 'rgba(66, 153, 225, 0.35)',
                    lineWidth: 0.4,
                    radius: 1.2
                  }
                );
                
                // Draw face oval outline with increased transparency
                if ((FaceLandmarker as any).FACEMESH_FACE_OVAL) {
                  drawingUtils.drawConnectors(
                    mirroredFace,
                    (FaceLandmarker as any).FACEMESH_FACE_OVAL,
                    { color: 'rgba(102, 126, 234, 0.5)', lineWidth: 2.5 }
                  );
                }
                
                // Draw left eye with increased transparency
                if ((FaceLandmarker as any).FACEMESH_LEFT_EYE) {
                  drawingUtils.drawConnectors(
                    mirroredFace,
                    (FaceLandmarker as any).FACEMESH_LEFT_EYE,
                    { color: 'rgba(66, 153, 225, 0.4)', lineWidth: 1.5 }
                  );
                }
                
                // Draw right eye with increased transparency
                if ((FaceLandmarker as any).FACEMESH_RIGHT_EYE) {
                  drawingUtils.drawConnectors(
                    mirroredFace,
                    (FaceLandmarker as any).FACEMESH_RIGHT_EYE,
                    { color: 'rgba(66, 153, 225, 0.4)', lineWidth: 1.5 }
                  );
                }
                
                // Draw left eyebrow with increased transparency
                if ((FaceLandmarker as any).FACEMESH_LEFT_EYEBROW) {
                  drawingUtils.drawConnectors(
                    mirroredFace,
                    (FaceLandmarker as any).FACEMESH_LEFT_EYEBROW,
                    { color: 'rgba(102, 126, 234, 0.4)', lineWidth: 1.5 }
                  );
                }
                
                // Draw right eyebrow with increased transparency
                if ((FaceLandmarker as any).FACEMESH_RIGHT_EYEBROW) {
                  drawingUtils.drawConnectors(
                    mirroredFace,
                    (FaceLandmarker as any).FACEMESH_RIGHT_EYEBROW,
                    { color: 'rgba(102, 126, 234, 0.4)', lineWidth: 1.5 }
                  );
                }
                
                // Draw lips with increased transparency
                if ((FaceLandmarker as any).FACEMESH_LIPS) {
                  drawingUtils.drawConnectors(
                    mirroredFace,
                    (FaceLandmarker as any).FACEMESH_LIPS,
                    { color: 'rgba(66, 153, 225, 0.4)', lineWidth: 1.5 }
                  );
                }
              } catch (e) {
                // If connections not available, just draw landmarks
                console.warn('Face mesh connection not available:', e);
              }
            });
          } else {
            setFaceDetected(false);
          }
    } catch (error) {
          // Face detection failed, continue
          setFaceDetected(false);
        }
      }
      
      // Draw instructions overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 400, 80);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('✋ Tay phải: Nhéo để di chuyển khối', 20, 35);
      ctx.fillText('✊ Tay trái: Nắm đấm để xoay khối', 20, 65);
      
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized, detectGestures]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!threeCanvasRef.current) return;
    
    // Scene setup with transparent background
    const scene = new THREE.Scene();
    scene.background = null; // Transparent for overlay
    sceneRef.current = scene;
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      16 / 9, // Default aspect (will be updated)
      0.1,
      1000
    );
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    camera3DRef.current = camera;
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(threeCanvasRef.current.clientWidth, threeCanvasRef.current.clientHeight);
    renderer.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    renderer.setClearColor(0x000000, 0); // Transparent background
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.3);
    fillLight.position.set(-5, -5, -5);
    scene.add(fillLight);
    
    // Create initial object
    createObject(scene, selectedShape, objectColor);
    
    // Animation loop with error handling
    let animationId: number | null = null;
    const animate = () => {
      try {
        animationId = requestAnimationFrame(animate);
        
        // Update cube from refs
        if (objectGroupRef.current) {
          objectGroupRef.current.position.set(
            cubePositionRef.current.x,
            cubePositionRef.current.y,
            cubePositionRef.current.z
          );
          
          // Rotate slowly when not being controlled
          if (!isGrabbing && !isRotating) {
            objectGroupRef.current.rotation.y += 0.005;
          } else {
            objectGroupRef.current.rotation.set(
              cubeRotationRef.current.x,
              cubeRotationRef.current.y,
              0
            );
          }
      }
      
      if (rendererRef.current && camera3DRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, camera3DRef.current);
        }
      } catch (error) {
        console.error('Error in Three.js animation loop:', error);
        // Stop animation on error to prevent hanging
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      }
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!threeCanvasRef.current || !camera3DRef.current || !rendererRef.current) return;
      
      let width: number;
      let height: number;
      
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const videoRect = videoRef.current.getBoundingClientRect();
        width = videoRect.width || threeCanvasRef.current.clientWidth;
        height = videoRect.height || threeCanvasRef.current.clientHeight;
      } else {
        width = threeCanvasRef.current.clientWidth;
        height = threeCanvasRef.current.clientHeight;
      }
      
      if (width > 0 && height > 0) {
        threeCanvasRef.current.width = width;
        threeCanvasRef.current.height = height;
        threeCanvasRef.current.style.width = `${width}px`;
        threeCanvasRef.current.style.height = `${height}px`;
      camera3DRef.current.aspect = width / height;
      camera3DRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
      }
    };
    
    // Add resize listeners
    if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
    }
    
    let resizeObserver: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && videoRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(videoRef.current);
    }
    
    // Cleanup function
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      // Cleanup video handlers
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
      }
      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      // Cancel animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isGrabbing, isRotating]);
  
  // Update object when shape or color changes
  useEffect(() => {
    if (sceneRef.current && isInitialized) {
      createObject(sceneRef.current, selectedShape, objectColor);
      // Reset position when shape changes
      cubePositionRef.current = { x: 0, y: 0, z: 0 };
      cubeRotationRef.current = { x: 0, y: 0 };
      cubeScaleRef.current = { x: 1, y: 1, z: 1 };
      isScalingRef.current = false;
      scalingAxisRef.current = null;
      if (objectGroupRef.current) {
        objectGroupRef.current.position.set(0, 0, 0);
        objectGroupRef.current.rotation.set(0, 0, 0);
        objectGroupRef.current.scale.set(1, 1, 1);
      }
    }
  }, [selectedShape, objectColor, isInitialized]);
  
  // Create 3D object with wireframe and corner spheres
  const createObject = (scene: THREE.Scene, shape: 'box' | 'sphere' | 'torus', color: string) => {
    // Remove old object group
    if (objectGroupRef.current) {
      scene.remove(objectGroupRef.current);
      objectGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    // Create group for object and corner spheres
    const group = new THREE.Group();
    objectGroupRef.current = group;
    
    let geometry: THREE.BufferGeometry;
    let corners: THREE.Vector3[] = [];
    
    switch (shape) {
      case 'box':
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const halfSize = 0.75;
        corners = [
          new THREE.Vector3(-halfSize, -halfSize, -halfSize),
          new THREE.Vector3(halfSize, -halfSize, -halfSize),
          new THREE.Vector3(halfSize, halfSize, -halfSize),
          new THREE.Vector3(-halfSize, halfSize, -halfSize),
          new THREE.Vector3(-halfSize, -halfSize, halfSize),
          new THREE.Vector3(halfSize, -halfSize, halfSize),
          new THREE.Vector3(halfSize, halfSize, halfSize),
          new THREE.Vector3(-halfSize, halfSize, halfSize),
        ];
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(1, 32, 32);
        corners = [
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(-1, 0, 0),
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, -1),
        ];
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
        corners = [
          new THREE.Vector3(1.4, 0, 0),
          new THREE.Vector3(-1.4, 0, 0),
          new THREE.Vector3(0, 1.4, 0),
          new THREE.Vector3(0, -1.4, 0),
        ];
        break;
    }
    
    // Convert hex color to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Create wireframe material
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(r, g, b),
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, wireframeMaterial);
    mesh.position.set(0, 0, 0);
    group.add(mesh);
    
    // Add yellow corner spheres
    cornerSpheresRef.current = [];
    corners.forEach((corner) => {
      const sphereGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00, // Yellow
        transparent: true,
        opacity: 0.9
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(corner);
      group.add(sphere);
      cornerSpheresRef.current.push(sphere);
    });
    
    // Add scale handles (red spheres on X, Y, Z axes)
    scaleHandlesRef.current = [];
    const handleSize = 0.12;
    const handleDistance = 1.2; // Distance from center
    
    // X-axis handles (left and right)
    const xHandles = [
      new THREE.Vector3(-handleDistance, 0, 0), // Left
      new THREE.Vector3(handleDistance, 0, 0)  // Right
    ];
    
    // Y-axis handles (top and bottom)
    const yHandles = [
      new THREE.Vector3(0, handleDistance, 0), // Top
      new THREE.Vector3(0, -handleDistance, 0) // Bottom
    ];
    
    // Z-axis handles (front and back)
    const zHandles = [
      new THREE.Vector3(0, 0, handleDistance),  // Front
      new THREE.Vector3(0, 0, -handleDistance)  // Back
    ];
    
    // Create X-axis handles (red)
    xHandles.forEach((pos, index) => {
      const handleGeometry = new THREE.SphereGeometry(handleSize, 16, 16);
      const handleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000, // Red for X-axis
        transparent: true,
        opacity: 0.8
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.copy(pos);
      handle.userData = { axis: 'x', index };
      group.add(handle);
      scaleHandlesRef.current.push(handle);
    });
    
    // Create Y-axis handles (green)
    yHandles.forEach((pos, index) => {
      const handleGeometry = new THREE.SphereGeometry(handleSize, 16, 16);
      const handleMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF00, // Green for Y-axis
        transparent: true,
        opacity: 0.8
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.copy(pos);
      handle.userData = { axis: 'y', index };
      group.add(handle);
      scaleHandlesRef.current.push(handle);
    });
    
    // Create Z-axis handles (blue)
    zHandles.forEach((pos, index) => {
      const handleGeometry = new THREE.SphereGeometry(handleSize, 16, 16);
      const handleMaterial = new THREE.MeshBasicMaterial({
        color: 0x0000FF, // Blue for Z-axis
        transparent: true,
        opacity: 0.8
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.copy(pos);
      handle.userData = { axis: 'z', index };
      group.add(handle);
      scaleHandlesRef.current.push(handle);
    });
    
    // Apply initial scale
    group.scale.set(
      cubeScaleRef.current.x,
      cubeScaleRef.current.y,
      cubeScaleRef.current.z
    );
    
    group.position.set(0, 0, 0);
    scene.add(group);
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  const handleStart = async () => {
    if (isStarted) return;
    setIsStarted(true);
    setError(null);
    await initializeMediaPipe();
  };
  
  const handleStop = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      // Cleanup event handlers
      videoRef.current.onloadedmetadata = null;
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsInitialized(false);
    setIsStarted(false);
    setHandDetected(false);
    setPoseDetected(false);
    setFaceDetected(false);
    setPinchStrength(0);
    setFistStrength(0);
    // Reset scaling state
    isScalingRef.current = false;
    scalingAxisRef.current = null;
  };
  
  const handleReset = () => {
    cubePositionRef.current = { x: 0, y: 0, z: 0 };
    cubeRotationRef.current = { x: 0, y: 0 };
    cubeScaleRef.current = { x: 1, y: 1, z: 1 };
    isScalingRef.current = false;
    scalingAxisRef.current = null;
    if (objectGroupRef.current) {
      objectGroupRef.current.position.set(0, 0, 0);
      objectGroupRef.current.rotation.set(0, 0, 0);
      objectGroupRef.current.scale.set(1, 1, 1);
    }
  };
  
  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #e0e5ec 0%, #d8dee8 50%, #e0e5ec 100%);
          background-size: 200% 200%;
          animation: gradientShift 15s ease infinite;
          color: #4a5568;
          overflow-x: hidden;
          padding: 20px;
          min-height: 100vh;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .container {
          max-width: 1600px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          animation: fadeIn 0.8s ease-out;
        }

        .header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
          letter-spacing: -1px;
        }

        .header p {
          color: #718096;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 20px;
          animation: fadeIn 1s ease-out 0.2s both;
        }

        .bento-item {
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border-radius: 28px;
          padding: 28px;
          box-shadow: 
            14px 14px 28px rgba(163, 177, 198, 0.7),
            -14px -14px 28px rgba(255, 255, 255, 0.95),
            inset 2px 2px 4px rgba(163, 177, 198, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: visible;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .bento-item.item-small,
        .bento-item.item-medium {
          padding: 16px;
          border-radius: 20px;
        }

        .bento-item:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 
            18px 18px 36px rgba(163, 177, 198, 0.8),
            -18px -18px 36px rgba(255, 255, 255, 1),
            inset 1px 1px 2px rgba(163, 177, 198, 0.1);
        }

        .item-large {
          grid-column: span 12;
          grid-row: span 2;
        }

        .item-medium {
          grid-column: span 3;
          grid-row: span 1;
        }

        .item-small {
          grid-column: span 2;
        }

        .item-wide {
          grid-column: span 12;
        }

        .item-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 16px;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .item-small .item-title,
        .item-medium .item-title {
          font-size: 0.7rem;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }

        .title-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          box-shadow: 
            6px 6px 12px rgba(102, 126, 234, 0.4),
            -4px -4px 8px rgba(255, 255, 255, 0.9),
            inset 2px 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .item-small .title-icon,
        .item-medium .title-icon {
          width: 28px;
          height: 28px;
          font-size: 14px;
          border-radius: 10px;
        }

        .title-icon:hover {
          transform: scale(1.1);
          box-shadow: 
            8px 8px 16px rgba(102, 126, 234, 0.5),
            -6px -6px 12px rgba(255, 255, 255, 1);
        }

        #videoCanvas, #threeCanvas {
          width: 100%;
          height: 100%;
          border-radius: 20px;
          background: #d1d9e6;
          min-height: 600px;
          max-height: 800px;
          box-shadow: 
            inset 10px 10px 20px rgba(163, 177, 198, 0.6),
            inset -10px -10px 20px rgba(255, 255, 255, 0.8);
          position: relative;
          overflow: hidden;
        }

        #videoElement {
          display: none;
        }

        .video-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 700px;
          max-height: 900px;
          border-radius: 20px;
          overflow: hidden;
          background: #d1d9e6;
          box-shadow: 
            inset 10px 10px 20px rgba(163, 177, 198, 0.6),
            inset -10px -10px 20px rgba(255, 255, 255, 0.8);
        }

        .video-container video,
        .video-container canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border-radius: 12px;
          margin-bottom: 8px;
          box-shadow: 
            inset 4px 4px 8px rgba(163, 177, 198, 0.5),
            inset -4px -4px 8px rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .status-label {
          font-size: 0.85rem;
          color: #4a5568;
          font-weight: 600;
        }

        .status-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #667eea;
          padding: 4px 12px;
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border-radius: 8px;
          box-shadow: 
            2px 2px 4px rgba(163, 177, 198, 0.5),
            -2px -2px 4px rgba(255, 255, 255, 0.7);
        }

        .status-value.active {
          color: #48bb78;
        }

        .btn-start, .btn-stop, .btn-reset {
          width: 100%;
          padding: 14px 24px;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 12px;
          box-shadow: 
            6px 6px 12px rgba(163, 177, 198, 0.5),
            -4px -4px 8px rgba(255, 255, 255, 0.7);
        }

        .btn-start {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        }

        .btn-start:hover {
          transform: translateY(-2px);
          box-shadow: 
            8px 8px 16px rgba(72, 187, 120, 0.6),
            -6px -6px 12px rgba(255, 255, 255, 0.8);
        }

        .btn-stop {
          background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
        }

        .btn-stop:hover {
          transform: translateY(-2px);
          box-shadow: 
            8px 8px 16px rgba(245, 101, 101, 0.6),
            -6px -6px 12px rgba(255, 255, 255, 0.8);
        }

        .btn-reset {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .btn-reset:hover {
          transform: translateY(-2px);
          box-shadow: 
            8px 8px 16px rgba(102, 126, 234, 0.6),
            -6px -6px 12px rgba(255, 255, 255, 0.8);
        }

        .shape-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .shape-btn {
          padding: 20px;
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          font-size: 2rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 
            4px 4px 8px rgba(163, 177, 198, 0.5),
            -4px -4px 8px rgba(255, 255, 255, 0.7);
        }

        .shape-btn:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 
            6px 6px 12px rgba(163, 177, 198, 0.6),
            -6px -6px 12px rgba(255, 255, 255, 0.8);
        }

        .shape-btn.selected {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;
          box-shadow: 
            0 0 20px rgba(102, 126, 234, 0.5),
            inset 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .color-picker {
          width: 100%;
          height: 60px;
          border-radius: 16px;
          cursor: pointer;
          border: 3px solid rgba(255, 255, 255, 0.5);
          box-shadow: 
            inset 4px 4px 8px rgba(163, 177, 198, 0.5),
            inset -4px -4px 8px rgba(255, 255, 255, 0.7);
        }

        .instructions {
          padding: 16px;
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border-radius: 16px;
          box-shadow: 
            inset 4px 4px 8px rgba(163, 177, 198, 0.5),
            inset -4px -4px 8px rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .instructions-item {
          display: flex;
          align-items: start;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 0.85rem;
          color: #4a5568;
          line-height: 1.6;
        }

        .instructions-item:last-child {
          margin-bottom: 0;
        }

        .instructions-item strong {
          color: #667eea;
          font-weight: 700;
        }

        .initialization-status {
          margin-bottom: 16px;
        }

        .status-success, .status-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 600;
        }

        .status-success {
          background: linear-gradient(145deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 161, 105, 0.1) 100%);
          color: #48bb78;
          box-shadow: 
            inset 2px 2px 4px rgba(72, 187, 120, 0.2),
            inset -2px -2px 4px rgba(255, 255, 255, 0.3);
        }

        .status-loading {
          background: linear-gradient(145deg, rgba(237, 137, 54, 0.1) 0%, rgba(221, 120, 30, 0.1) 100%);
          color: #ed8936;
          box-shadow: 
            inset 2px 2px 4px rgba(237, 137, 54, 0.2),
            inset -2px -2px 4px rgba(255, 255, 255, 0.3);
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-indicator.active {
          background: #48bb78;
          box-shadow: 0 0 10px #48bb78;
          animation: pulse 2s ease-in-out infinite;
        }

        .status-indicator.loading {
          background: #ed8936;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }

        .error-message {
          padding: 12px 16px;
          background: linear-gradient(145deg, rgba(245, 101, 101, 0.1) 0%, rgba(197, 48, 48, 0.1) 100%);
          border: 1px solid rgba(245, 101, 101, 0.3);
          border-radius: 12px;
          color: #fc8181;
          font-size: 0.85rem;
          margin-top: 12px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .overlay-instructions {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          padding: 12px 20px;
          border-radius: 12px;
          color: white;
          font-size: 0.85rem;
          z-index: 30;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .overlay-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 20px;
          z-index: 10;
        }

        .overlay-placeholder-content {
          text-align: center;
          color: white;
          padding: 40px;
        }

        .overlay-placeholder-content svg {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
        }
      `}</style>
      
      <div className="container">
        <div className="header">
          <h1>📐 Hình học 3D</h1>
          <p>Điều khiển đối tượng 3D bằng cử chỉ tay với MediaPipe và Three.js</p>
        </div>
        
        <div className="bento-grid">
          {/* Main Video & 3D Scene */}
          <div className="bento-item item-large">
            <div className="item-title">
              <div className="title-icon">📹</div>
                  <span>Camera & 3D Scene</span>
            </div>
            <div className="video-container">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ display: isStreaming ? 'block' : 'none' }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{ display: isStreaming ? 'block' : 'none' }}
                  />
                  <canvas
                    ref={threeCanvasRef}
                    style={{ display: isStreaming ? 'block' : 'none' }}
                  />
                  
                  {isStreaming && (
                <div className="overlay-instructions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#fbbf24' }}>🟡</span>
                          <span>Tay phải: Nhéo để di chuyển khối</span>
                        </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#22d3ee' }}>🔵</span>
                          <span>Tay trái: Nắm đấm để xoay khối</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!isStreaming && (
                <div className="overlay-placeholder">
                  <div className="overlay-placeholder-content">
                    <Camera />
                    <p style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600 }}>Camera chưa được kích hoạt</p>
                    <p style={{ fontSize: '0.9rem', color: '#cbd5e0' }}>Nhấn "Bắt đầu" để khởi động camera</p>
                      </div>
                    </div>
                  )}
                </div>
          </div>
          
          {/* Controls Row - Below Camera */}
          {/* Status Panel */}
          <div className="bento-item item-medium">
            <div className="item-title">
              <div className="title-icon">📊</div>
              <span>Trạng thái</span>
            </div>
            <div>
              <div className="status-item">
                <span className="status-label">Camera:</span>
                <span className={`status-value ${isStreaming ? 'active' : ''}`}>
                    {isStreaming ? 'Hoạt động' : 'Tắt'}
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
                <span className={`status-value ${isGrabbing ? 'active' : ''}`}>
                    {Math.round(pinchStrength)}%
                </span>
                </div>
              <div className="status-item">
                <span className="status-label">Fist (Rotate):</span>
                <span className={`status-value ${isRotating ? 'active' : ''}`}>
                    {Math.round(fistStrength)}%
                </span>
                </div>
              <div className="status-item">
                <span className="status-label">Khung xương:</span>
                <span className={`status-value ${poseDetected ? 'active' : ''}`}>
                    {poseDetected ? 'Có' : 'Không'}
                </span>
                </div>
              <div className="status-item">
                <span className="status-label">Khuôn mặt:</span>
                <span className={`status-value ${faceDetected ? 'active' : ''}`}>
                    {faceDetected ? 'Có' : 'Không'}
                </span>
                </div>
            </div>
          </div>
            
            {/* Controls */}
          <div className="bento-item item-medium">
            <div className="item-title">
              <div className="title-icon">🎮</div>
              <span>Điều khiển</span>
            </div>
                {!isStarted ? (
                  <button className="btn-start" onClick={handleStart} disabled={isLoading}>
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

                    {isInitialized && (
                      <>
                        <button className="btn-stop" onClick={handleStop}>
                          ⏹️ Dừng Camera
                        </button>
                        <button className="btn-reset" onClick={handleReset}>
                          🔄 Đặt lại vị trí
                        </button>
                    </>
                  )}
                  </>
                )}
                
                {error && (
                  <div className="error-message">{error}</div>
                )}
          </div>
            
            {/* Shape Selection */}
          <div className="bento-item item-medium">
            <div className="item-title">
              <div className="title-icon">📦</div>
              <span>Hình dạng</span>
            </div>
            <div className="shape-selector">
              <button
                className={`shape-btn ${selectedShape === 'box' ? 'selected' : ''}`}
                    onClick={() => setSelectedShape('box')}
              >
                📦
              </button>
              <button
                className={`shape-btn ${selectedShape === 'sphere' ? 'selected' : ''}`}
                    onClick={() => setSelectedShape('sphere')}
              >
                ⚪
              </button>
              <button
                className={`shape-btn ${selectedShape === 'torus' ? 'selected' : ''}`}
                    onClick={() => setSelectedShape('torus')}
                  >
                    🍩
              </button>
                </div>
          </div>
            
            {/* Color Picker */}
          <div className="bento-item item-medium">
            <div className="item-title">
              <div className="title-icon">🎨</div>
                  <span>Màu sắc</span>
            </div>
                <input
                  type="color"
                  value={objectColor}
                  onChange={(e) => setObjectColor(e.target.value)}
              className="color-picker"
                />
          </div>
            
            {/* Instructions */}
          <div className="bento-item item-wide">
            <div className="item-title">
              <div className="title-icon">📖</div>
              <span>Hướng dẫn</span>
            </div>
            <div className="instructions">
              <div className="instructions-item">
                <span>👉</span>
                  <p><strong>Tay phải:</strong> Pinch (ngón cái + ngón trỏ) để di chuyển đối tượng</p>
                </div>
              <div className="instructions-item">
                <span>👊</span>
                  <p><strong>Tay trái:</strong> Nắm tay để xoay đối tượng</p>
                </div>
              <div className="instructions-item">
                <span>🎨</span>
                  <p>Chọn hình dạng và màu sắc ở bên phải</p>
                </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
