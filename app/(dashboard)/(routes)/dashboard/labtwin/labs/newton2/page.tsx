'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  HandLandmarker,
  FilesetResolver,
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import { Camera, Hand, Gauge, TrendingUp, Play, StopCircle, RotateCcw, Info } from 'lucide-react';
import NeumorphicThemeProvider from '@/components/theme/NeumorphicThemeProvider';
import { 
  GestureRecognizer, 
  PhysicsControlRules, 
  HandVelocityTracker,
  type HandGesture,
  type GestureState 
} from './gesture-recognizer';

// Import console filter if exists, otherwise create inline
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    if (
      message.includes('TensorFlow Lite') ||
      message.includes('XNNPACK delegate') ||
      message.includes('GL version') ||
      message.includes('OpenGL error checking') ||
      message.includes('Graph successfully started') ||
      message.includes('INFO:')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

interface PhysicsState {
  velocity: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  force: { x: number; y: number; z: number };
}

export default function Newton2Page() {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // MediaPipe refs
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  
  // Removed Three.js refs - no longer needed
  
  // Physics state
  const physicsStateRef = useRef<PhysicsState>({
    velocity: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
    force: { x: 0, y: 0, z: 0 }
  });
  
  // Track hand position for velocity calculation
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Gesture recognition
  const velocityTracker = useRef(new HandVelocityTracker());
  const leftHandGestureRef = useRef<GestureState | null>(null);
  const rightHandGestureRef = useRef<GestureState | null>(null);
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [currentForce, setCurrentForce] = useState({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [currentVelocity, setCurrentVelocity] = useState({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [currentAcceleration, setCurrentAcceleration] = useState({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [kineticEnergy, setKineticEnergy] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [mass, setMass] = useState(1.5); // Base mass in kg (adjustable via slider)
  const [leftHandGesture, setLeftHandGesture] = useState<HandGesture>('none');
  const [rightHandGesture, setRightHandGesture] = useState<HandGesture>('none');
  const [leftHandDescription, setLeftHandDescription] = useState('');
  const [rightHandDescription, setRightHandDescription] = useState('');
  
  // Physics constants
  const FRICTION_COEFFICIENT = 0.95; // Friction on horizontal plane
  const MAX_VELOCITY = 10.0; // Maximum velocity limit
  const FORCE_MULTIPLIER = 5.0; // Base force multiplier
  
  // Function to draw ground plane and 3D box overlay on camera canvas
  const drawBoxOverlay = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    const state = physicsStateRef.current;
    
    // Map 3D position to 2D canvas coordinates
    // Box 3D space: -10 to 10 (x, z), centered at (0, 0)
    // Canvas space: 0 to canvasWidth (x), 0 to canvasHeight (y)
    
    // Center of canvas (where box should appear when at 3D origin)
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight * 0.7; // Lower on screen to simulate ground
    
    // Scale factor: map 3D units to pixels
    // 3D space is -10 to 10 (20 units total), map to ~70% of canvas width
    const scale = (canvasWidth * 0.7) / 20;
    const planeSize = scale * 20; // Full plane size in pixels
    
    ctx.save();
    
    // Draw ground plane (perspective view - trapezoid)
    const planeTopWidth = planeSize * 0.6; // Narrower at top (farther)
    const planeBottomWidth = planeSize; // Wider at bottom (closer)
    const planeHeight = planeSize * 0.4;
    const planeTopY = centerY - planeHeight * 0.3;
    const planeBottomY = centerY + planeHeight * 0.7;
    
    // Ground plane fill
    ctx.fillStyle = 'rgba(74, 85, 104, 0.6)'; // Semi-transparent gray
    ctx.beginPath();
    ctx.moveTo(centerX - planeTopWidth / 2, planeTopY);
    ctx.lineTo(centerX + planeTopWidth / 2, planeTopY);
    ctx.lineTo(centerX + planeBottomWidth / 2, planeBottomY);
    ctx.lineTo(centerX - planeBottomWidth / 2, planeBottomY);
    ctx.closePath();
    ctx.fill();
    
    // Draw grid lines on plane (perspective grid)
    ctx.strokeStyle = 'rgba(113, 128, 150, 0.4)';
    ctx.lineWidth = 1;
    const gridLines = 6;
    
    // Horizontal lines (parallel to camera view)
    for (let i = 0; i <= gridLines; i++) {
      const t = i / gridLines;
      const y = planeTopY + (planeBottomY - planeTopY) * t;
      const width = planeTopWidth + (planeBottomWidth - planeTopWidth) * t;
      
      ctx.beginPath();
      ctx.moveTo(centerX - width / 2, y);
      ctx.lineTo(centerX + width / 2, y);
      ctx.stroke();
    }
    
    // Vertical lines (converging to center point at top)
    for (let i = 0; i <= gridLines; i++) {
      const t = i / gridLines;
      const topX = centerX - planeTopWidth / 2 + (planeTopWidth / gridLines) * i;
      const bottomX = centerX - planeBottomWidth / 2 + (planeBottomWidth / gridLines) * i;
      
      ctx.beginPath();
      ctx.moveTo(topX, planeTopY);
      ctx.lineTo(bottomX, planeBottomY);
      ctx.stroke();
    }
    
    // Convert 3D position to 2D for display
    // IMPORTANT: Video is mirrored (scale -1, 1), but box is drawn AFTER the mirror
    // So we're drawing in the mirrored coordinate space
    // To match hand movement: when hand moves right on screen -> box moves right on screen
    // Since canvas is mirrored, we need to think about what "right" means
    // Let's try: position.x > 0 -> box appears on right side of screen (after mirror)
    // So: box2DX = centerX + (position.x * scale) - but wait, canvas is mirrored...
    // Actually, since we draw AFTER mirror, the coordinate system is already mirrored
    // So: position.x > 0 -> box2DX should be > centerX to appear on right
    // But after mirror, right side has LOWER X values
    // Let's test: box2DX = centerX + (position.x * scale) and see if it works
    const box2DX = centerX + (state.position.x * scale); // Try same direction first
    const box2DY = centerY - (state.position.z * scale); // Z in 3D is Y in 2D (inverted: forward = up on screen)
    
    // Box size in pixels (1 unit in 3D = scale pixels)
    const boxSize = scale * 1; // 1 unit box
    
    // Shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(box2DX, centerY + boxSize * 0.3, boxSize * 0.8, boxSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Box color (match 3D box color)
    const boxColor = '#667eea';
    const boxColorLight = '#818cf8';
    const boxColorDark = '#4c63d2';
    
    // Draw box with 3D perspective (isometric projection)
    // Top face
    ctx.fillStyle = boxColorLight;
    ctx.beginPath();
    ctx.moveTo(box2DX, box2DY - boxSize * 0.5);
    ctx.lineTo(box2DX + boxSize * 0.4, box2DY - boxSize * 0.7);
    ctx.lineTo(box2DX + boxSize * 0.4 + boxSize, box2DY - boxSize * 0.7);
    ctx.lineTo(box2DX + boxSize, box2DY - boxSize * 0.5);
    ctx.closePath();
    ctx.fill();
    
    // Right face
    ctx.fillStyle = boxColor;
    ctx.beginPath();
    ctx.moveTo(box2DX + boxSize, box2DY - boxSize * 0.5);
    ctx.lineTo(box2DX + boxSize * 0.4 + boxSize, box2DY - boxSize * 0.7);
    ctx.lineTo(box2DX + boxSize * 0.4 + boxSize, box2DY + boxSize * 0.3);
    ctx.lineTo(box2DX + boxSize, box2DY + boxSize * 0.5);
    ctx.closePath();
    ctx.fill();
    
    // Left face
    ctx.fillStyle = boxColorDark;
    ctx.beginPath();
    ctx.moveTo(box2DX, box2DY - boxSize * 0.5);
    ctx.lineTo(box2DX + boxSize, box2DY - boxSize * 0.5);
    ctx.lineTo(box2DX + boxSize, box2DY + boxSize * 0.5);
    ctx.lineTo(box2DX, box2DY + boxSize * 0.5);
    ctx.closePath();
    ctx.fill();
    
    // Draw edges for better visibility
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    
    // Top edges
    ctx.beginPath();
    ctx.moveTo(box2DX, box2DY - boxSize * 0.5);
    ctx.lineTo(box2DX + boxSize * 0.4, box2DY - boxSize * 0.7);
    ctx.lineTo(box2DX + boxSize * 0.4 + boxSize, box2DY - boxSize * 0.7);
    ctx.lineTo(box2DX + boxSize, box2DY - boxSize * 0.5);
    ctx.stroke();
    
    // Vertical edges
    ctx.beginPath();
    ctx.moveTo(box2DX, box2DY - boxSize * 0.5);
    ctx.lineTo(box2DX, box2DY + boxSize * 0.5);
    ctx.moveTo(box2DX + boxSize, box2DY - boxSize * 0.5);
    ctx.lineTo(box2DX + boxSize, box2DY + boxSize * 0.5);
    ctx.moveTo(box2DX + boxSize * 0.4 + boxSize, box2DY - boxSize * 0.7);
    ctx.lineTo(box2DX + boxSize * 0.4 + boxSize, box2DY + boxSize * 0.3);
    ctx.stroke();
    
    // Bottom edges
    ctx.beginPath();
    ctx.moveTo(box2DX, box2DY + boxSize * 0.5);
    ctx.lineTo(box2DX + boxSize, box2DY + boxSize * 0.5);
    ctx.lineTo(box2DX + boxSize * 0.4 + boxSize, box2DY + boxSize * 0.3);
    ctx.stroke();
    
    // Draw velocity indicator (arrow showing direction)
    const velMag = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
    if (velMag > 0.1) {
      const velX = state.velocity.x;
      const velZ = state.velocity.z;
      const arrowLength = Math.min(velMag * scale * 2, boxSize * 3);
      const arrowAngle = Math.atan2(-velZ, velX); // Same direction as hand (no mirror)
      
      ctx.strokeStyle = '#ff6b6b';
      ctx.fillStyle = '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(box2DX, box2DY);
      ctx.lineTo(
        box2DX + Math.cos(arrowAngle) * arrowLength,
        box2DY + Math.sin(arrowAngle) * arrowLength
      );
      ctx.stroke();
      
      // Arrowhead
      const headLength = 10;
      const headAngle = Math.PI / 6;
      ctx.beginPath();
      const arrowEndX = box2DX + Math.cos(arrowAngle) * arrowLength;
      const arrowEndY = box2DY + Math.sin(arrowAngle) * arrowLength;
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX - headLength * Math.cos(arrowAngle - headAngle),
        arrowEndY - headLength * Math.sin(arrowAngle - headAngle)
      );
      ctx.lineTo(
        arrowEndX - headLength * Math.cos(arrowAngle + headAngle),
        arrowEndY - headLength * Math.sin(arrowAngle + headAngle)
      );
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
  };
  
  // Physics update loop
  useEffect(() => {
    const physicsUpdate = () => {
      const state = physicsStateRef.current;
      const dt = 0.016; // ~60fps
      
      // Get effective mass from left hand gesture
      const leftControl = leftHandGestureRef.current 
        ? PhysicsControlRules.getLeftHandControl(leftHandGestureRef.current.gesture)
        : { massMultiplier: 1.0, forceMultiplier: 1.0, description: '' };
      
      const effectiveMass = mass * leftControl.massMultiplier;
      
      // Get force from right hand gesture
      const rightControl = rightHandGestureRef.current
        ? PhysicsControlRules.getRightHandControl(
            rightHandGestureRef.current.gesture,
            rightHandGestureRef.current.position,
            rightHandGestureRef.current.direction,
            canvasRef.current?.width || 640,
            canvasRef.current?.height || 480
          )
        : { forceDirection: { x: 0, y: 0 }, forceActive: false, forceMagnitude: 0, description: '' };
      
      // Apply force if active
      if (rightControl.forceActive) {
        const forceMagnitude = rightControl.forceMagnitude * leftControl.forceMultiplier * FORCE_MULTIPLIER;
        state.force.x = rightControl.forceDirection.x * forceMagnitude;
        state.force.z = rightControl.forceDirection.y * forceMagnitude; // Y in 2D becomes Z in 3D
      } else {
        state.force.x = 0;
        state.force.z = 0;
      }
      
      // Apply Newton's 2nd Law: F = ma, so a = F/m
      const accelerationX = state.force.x / effectiveMass;
      const accelerationZ = state.force.z / effectiveMass;
      
      // Update velocity with acceleration
      state.velocity.x += accelerationX * dt;
      state.velocity.z += accelerationZ * dt;
      
      // Apply friction (only on horizontal plane, so only x and z)
      state.velocity.x *= FRICTION_COEFFICIENT;
      state.velocity.z *= FRICTION_COEFFICIENT;
      
      // Clamp velocity (only X and Z since Y is always 0 on horizontal plane)
      const velMag = Math.sqrt(
        state.velocity.x ** 2 + 
        state.velocity.z ** 2
      );
      if (velMag > MAX_VELOCITY) {
        const scale = MAX_VELOCITY / velMag;
        state.velocity.x *= scale;
        state.velocity.z *= scale;
      }
      
      // Update position
      state.position.x += state.velocity.x * dt;
      state.position.y += state.velocity.y * dt;
      state.position.z += state.velocity.z * dt;
      
      // Keep box on plane (y = 0.5)
      state.position.y = 0.5;
      state.velocity.y = 0; // No vertical movement on horizontal plane
      
      // Boundary constraints (keep box within plane bounds)
      const planeSize = 10; // Half size of plane
      state.position.x = Math.max(-planeSize, Math.min(planeSize, state.position.x));
      state.position.z = Math.max(-planeSize, Math.min(planeSize, state.position.z));
      
      // If box hits boundary, reverse velocity component
      if (Math.abs(state.position.x) >= planeSize) {
        state.velocity.x *= -0.5; // Bounce with energy loss
        state.position.x = Math.sign(state.position.x) * planeSize;
      }
      if (Math.abs(state.position.z) >= planeSize) {
        state.velocity.z *= -0.5;
        state.position.z = Math.sign(state.position.z) * planeSize;
      }
      
      // Calculate acceleration (a = F/m)
      const accelX = accelerationX;
      const accelZ = accelerationZ;
      const accelMag = Math.sqrt(accelX ** 2 + accelZ ** 2);
      
      // Calculate kinetic energy (KE = 0.5 * m * v²)
      const ke = 0.5 * effectiveMass * (velMag ** 2);
      
      // Update UI
      setCurrentVelocity({
        x: state.velocity.x,
        y: state.velocity.y,
        z: state.velocity.z,
        magnitude: velMag
      });
      
      setCurrentAcceleration({
        x: accelX,
        y: 0,
        z: accelZ,
        magnitude: accelMag
      });
      
      setKineticEnergy(ke);
      
      // Update force display
      const forceMag = Math.sqrt(state.force.x ** 2 + state.force.z ** 2);
      setCurrentForce({
        x: state.force.x,
        y: 0,
        z: state.force.z,
        magnitude: forceMag
      });
      
      requestAnimationFrame(physicsUpdate);
    };
    
    const animationId = requestAnimationFrame(physicsUpdate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  // Initialize MediaPipe
  const initializeMediaPipe = async () => {
    if (isStarted) return;
    setIsStarted(true);
    setError(null);
    
    // Set canvas size
    if (canvasRef.current) {
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Initializing MediaPipe Vision...');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      console.log('MediaPipe Vision initialized');
      
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
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      console.log('Camera access granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              console.log('Video playing');
              
              setIsStreaming(true);
              setIsInitialized(true);
              setIsLoading(false);
              console.log('Initialization complete');
            }
          } catch (err: any) {
            console.warn('Video playback delayed:', err);
            setTimeout(async () => {
              try {
                if (videoRef.current) {
                  await videoRef.current.play();
                  setIsStreaming(true);
                  setIsInitialized(true);
                  setIsLoading(false);
                }
              } catch (retryErr) {
                console.error('Video play failed:', retryErr);
                setError('Không thể phát video');
                setIsLoading(false);
                setIsStarted(false);
              }
            }, 100);
          }
        };
      }
    } catch (error: any) {
      console.error('Initialization error:', error);
      setIsLoading(false);
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
    
    // Reset physics
    physicsStateRef.current = {
      velocity: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
      force: { x: 0, y: 0, z: 0 }
    };
  };
  
  const handleReset = () => {
    physicsStateRef.current = {
      velocity: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
      force: { x: 0, y: 0, z: 0 }
    };
    setCurrentForce({ x: 0, y: 0, z: 0, magnitude: 0 });
    setCurrentVelocity({ x: 0, y: 0, z: 0, magnitude: 0 });
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup video handlers
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
        videoRef.current.srcObject = null;
      }
      
      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Cancel animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Detection loop
  useEffect(() => {
    if (!isInitialized || !handLandmarkerRef.current) return;
    
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
      
      const startTime = performance.now();
      
      // Clear and draw video (mirrored)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Draw 3D box overlay on camera feed
      drawBoxOverlay(ctx, canvas.width, canvas.height);
      
      const drawingUtils = new DrawingUtils(ctx);
      
      // Detect hands
      if (handLandmarkerRef.current) {
        const handResults = handLandmarkerRef.current.detectForVideo(video, startTime);
        
        if (handResults.landmarks && handResults.landmarks.length > 0) {
          setHandDetected(true);
          
          // Reset gesture states
          leftHandGestureRef.current = null;
          rightHandGestureRef.current = null;
          
          // Process each hand for gesture recognition
          handResults.landmarks.forEach((landmarks, index) => {
            // Recognize gesture
            const gestureState = GestureRecognizer.recognize(landmarks);
            
            // Track velocity
            const velocity = velocityTracker.current.track(
              `hand-${index}`,
              { x: gestureState.position.x, y: gestureState.position.y }
            );
            gestureState.velocity = velocity;
            
            // Determine if left or right hand based on position
            // Left hand typically on left side of screen (x < 0.5), right hand on right (x > 0.5)
            const isLeftHand = gestureState.position.x < 0.5;
            
            if (isLeftHand) {
              leftHandGestureRef.current = gestureState;
              setLeftHandGesture(gestureState.gesture);
              const leftControl = PhysicsControlRules.getLeftHandControl(gestureState.gesture);
              setLeftHandDescription(leftControl.description);
            } else {
              rightHandGestureRef.current = gestureState;
              setRightHandGesture(gestureState.gesture);
              const rightControl = PhysicsControlRules.getRightHandControl(
                gestureState.gesture,
                gestureState.position,
                gestureState.direction,
                canvas.width,
                canvas.height
              );
              setRightHandDescription(rightControl.description);
            }
            
            // Draw hand with gesture indicator
            const mirroredLandmarks = landmarks.map(lm => ({
              ...lm,
              x: 1 - lm.x
            }));
            
            // Get gesture indicator
            const indicator = PhysicsControlRules.getGestureIndicator(gestureState.gesture);
            
            // Draw hand
            drawingUtils.drawConnectors(
              mirroredLandmarks,
              HandLandmarker.HAND_CONNECTIONS,
              { color: indicator.color, lineWidth: 3 }
            );
            drawingUtils.drawLandmarks(
              mirroredLandmarks,
              { color: indicator.color, fillColor: indicator.color, lineWidth: 2, radius: 4 }
            );
            
            // Draw gesture indicator text
            const wristCanvasX = (1 - gestureState.position.x) * canvas.width;
            const wristCanvasY = gestureState.position.y * canvas.height;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(wristCanvasX - 30, wristCanvasY - 40, 60, 30);
            ctx.fillStyle = indicator.color;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(indicator.emoji, wristCanvasX, wristCanvasY - 20);
            
            // Draw force direction arrow for right hand
            if (!isLeftHand && gestureState.gesture !== 'none' && gestureState.gesture !== 'pinch') {
              const rightControl = PhysicsControlRules.getRightHandControl(
                gestureState.gesture,
                gestureState.position,
                gestureState.direction,
                canvas.width,
                canvas.height
              );
              
              if (rightControl.forceActive) {
                const arrowLength = 50;
                const arrowX = wristCanvasX + rightControl.forceDirection.x * arrowLength;
                const arrowY = wristCanvasY + rightControl.forceDirection.y * arrowLength;
                
                ctx.strokeStyle = indicator.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(wristCanvasX, wristCanvasY);
                ctx.lineTo(arrowX, arrowY);
                ctx.stroke();
                
                // Arrowhead
                const angle = Math.atan2(arrowY - wristCanvasY, arrowX - wristCanvasX);
                ctx.fillStyle = indicator.color;
                ctx.beginPath();
                ctx.moveTo(arrowX, arrowY);
                ctx.lineTo(
                  arrowX - 10 * Math.cos(angle - Math.PI / 6),
                  arrowY - 10 * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                  arrowX - 10 * Math.cos(angle + Math.PI / 6),
                  arrowY - 10 * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();
              }
            }
          });
          
          // If no hands detected, reset gestures
          if (handResults.landmarks.length === 0) {
            leftHandGestureRef.current = null;
            rightHandGestureRef.current = null;
            setLeftHandGesture('none');
            setRightHandGesture('none');
            setLeftHandDescription('');
            setRightHandDescription('');
          }
        } else {
          setHandDetected(false);
          leftHandGestureRef.current = null;
          rightHandGestureRef.current = null;
          setLeftHandGesture('none');
          setRightHandGesture('none');
          setLeftHandDescription('');
          setRightHandDescription('');
          
          // Reset velocity tracker
          velocityTracker.current.reset('hand-0');
          velocityTracker.current.reset('hand-1');
        }
        
        // Gesture recognition complete
      }
      
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized]);
  
  return (
    <NeumorphicThemeProvider>
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

        .three-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 700px;
          max-height: 900px;
          border-radius: 20px;
          overflow: hidden;
          background: #1a1a2e;
          box-shadow: 
            inset 10px 10px 20px rgba(0, 0, 0, 0.6),
            inset -10px -10px 20px rgba(255, 255, 255, 0.1);
        }

        .three-container canvas {
          width: 100%;
          height: 100%;
          display: block;
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

        .physics-value {
          font-size: 1.2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .physics-label {
          font-size: 0.75rem;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .vector-display {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%);
          border-radius: 12px;
          box-shadow: 
            inset 4px 4px 8px rgba(163, 177, 198, 0.5),
            inset -4px -4px 8px rgba(255, 255, 255, 0.7);
        }

        .vector-component {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
        }

        .vector-component-label {
          color: #4a5568;
          font-weight: 600;
        }

        .vector-component-value {
          color: #667eea;
          font-weight: 700;
        }
      `}</style>
      
      <div className="neu-container">
        <div className="neu-header">
          <h1>⚡ Định luật Newton 2</h1>
          <p>Mô phỏng tương tác lực và chuyển động của vật thể trên mặt phẳng nằm ngang</p>
        </div>

        <div className="neu-bento-grid">
          {/* Camera View */}
          <div className="neu-bento-item neu-item-large">
            <div className="neu-item-title">
              <div className="neu-title-icon">📹</div>
              <span>Camera & Hand Tracking</span>
            </div>
            <div className="neu-video-container">
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
              
              {!isStreaming && (
                <div className="neu-overlay-placeholder">
                  <div className="neu-overlay-content">
                    <Camera />
                    <p style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600 }}>Camera chưa được kích hoạt</p>
                    <p style={{ fontSize: '0.9rem', color: '#cbd5e0' }}>Nhấn "Bắt đầu" để khởi động camera</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Panel */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">📊</div>
              <span>Trạng thái</span>
            </div>
            <div>
              <div className="neu-status-item">
                <span className="neu-status-label">Camera:</span>
                <span className={`neu-status-value ${isStreaming ? 'active' : ''}`}>
                  {isStreaming ? 'Hoạt động' : 'Tắt'}
                </span>
              </div>
              <div className="neu-status-item">
                <span className="neu-status-label">Tay phát hiện:</span>
                <span className={`neu-status-value ${handDetected ? 'active' : ''}`}>
                  {handDetected ? 'Có' : 'Không'}
                </span>
              </div>
            </div>
          </div>

          {/* Left Hand Gesture */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">👈</div>
              <span>Tay trái</span>
            </div>
            <div className="neu-data-display">
              <div className="neu-data-row" style={{ marginBottom: '10px' }}>
                <span className="neu-data-label">Cử chỉ:</span>
                <span className="neu-data-value" style={{ fontSize: '1.5rem' }}>
                  {PhysicsControlRules.getGestureIndicator(leftHandGesture).emoji}
                </span>
              </div>
              <div className="neu-data-row" style={{ fontSize: '0.85rem', color: '#718096' }}>
                <span>{leftHandDescription || 'Không có cử chỉ'}</span>
              </div>
            </div>
          </div>

          {/* Right Hand Gesture */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">👉</div>
              <span>Tay phải</span>
            </div>
            <div className="neu-data-display">
              <div className="neu-data-row" style={{ marginBottom: '10px' }}>
                <span className="neu-data-label">Cử chỉ:</span>
                <span className="neu-data-value" style={{ fontSize: '1.5rem' }}>
                  {PhysicsControlRules.getGestureIndicator(rightHandGesture).emoji}
                </span>
              </div>
              <div className="neu-data-row" style={{ fontSize: '0.85rem', color: '#718096' }}>
                <span>{rightHandDescription || 'Không có cử chỉ'}</span>
              </div>
            </div>
          </div>

          {/* Formula Display */}
          <div className="neu-bento-item neu-item-full">
            <div className="neu-item-title">
              <div className="neu-title-icon">⚛️</div>
              <span>Định Luật Newton 2</span>
            </div>
            <div style={{ 
              padding: '20px', 
              background: 'linear-gradient(145deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              borderRadius: '16px',
              textAlign: 'center',
              border: '2px solid rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '10px' }}>
                <span style={{ color: '#f56565' }}>F</span>
                <span style={{ margin: '0 10px', color: '#4a5568' }}>=</span>
                <span style={{ color: '#48bb78' }}>m</span>
                <span style={{ margin: '0 10px', color: '#4a5568' }}>×</span>
                <span style={{ color: '#4299e1' }}>a</span>
              </div>
              <div style={{ fontSize: '1rem', color: '#718096', marginBottom: '15px' }}>
                Lực = Khối lượng × Gia tốc
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.9rem' }}>
                  <span style={{ color: '#f56565', fontWeight: 700 }}>F</span>
                  <span style={{ color: '#718096' }}> = {currentForce.magnitude.toFixed(2)} N</span>
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  <span style={{ color: '#48bb78', fontWeight: 700 }}>m</span>
                  <span style={{ color: '#718096' }}> = {
                    (mass * (leftHandGestureRef.current 
                      ? PhysicsControlRules.getLeftHandControl(leftHandGestureRef.current?.gesture || 'none').massMultiplier 
                      : 1.0)).toFixed(2)
                  } kg</span>
                  {leftHandGestureRef.current && leftHandGesture !== 'none' && (
                    <span style={{ fontSize: '0.75rem', color: '#a0aec0', marginLeft: '5px', display: 'block' }}>
                      (base: {mass.toFixed(2)} × {PhysicsControlRules.getLeftHandControl(leftHandGesture).massMultiplier.toFixed(1)})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  <span style={{ color: '#4299e1', fontWeight: 700 }}>a</span>
                  <span style={{ color: '#718096' }}> = {currentAcceleration.magnitude.toFixed(2)} m/s²</span>
                </div>
              </div>
            </div>
          </div>

          {/* Force Display */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">💪</div>
              <span>Lực (F)</span>
            </div>
            <div className="neu-data-display">
              <div className="neu-data-row">
                <span className="neu-data-label"><Gauge size={16} /> Tổng:</span>
                <span className="neu-data-value magnitude" style={{ color: '#f56565' }}>{currentForce.magnitude.toFixed(2)} N</span>
              </div>
              <div className="neu-data-row">
                <span className="neu-data-label">Fx:</span>
                <span className="neu-data-value">{currentForce.x.toFixed(2)}</span>
              </div>
              <div className="neu-data-row">
                <span className="neu-data-label">Fz:</span>
                <span className="neu-data-value">{currentForce.z.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Mass Display & Control */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">⚖️</div>
              <span>Khối lượng (m)</span>
            </div>
            <div className="neu-data-display">
              <div className="neu-data-row" style={{ marginBottom: '15px' }}>
                <span className="neu-data-label">Giá trị:</span>
                <span className="neu-data-value" style={{ color: '#48bb78', fontSize: '1.1rem' }}>{mass.toFixed(2)} kg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={mass}
                onChange={(e) => setMass(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%)',
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.5)'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#718096', marginTop: '5px' }}>
                <span>0.5 kg</span>
                <span>5.0 kg</span>
              </div>
            </div>
          </div>

          {/* Acceleration Display */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">🚀</div>
              <span>Gia tốc (a)</span>
            </div>
            <div className="neu-data-display">
              <div className="neu-data-row">
                <span className="neu-data-label"><TrendingUp size={16} /> Tổng:</span>
                <span className="neu-data-value magnitude" style={{ color: '#4299e1' }}>{currentAcceleration.magnitude.toFixed(2)} m/s²</span>
              </div>
              <div className="neu-data-row">
                <span className="neu-data-label">ax:</span>
                <span className="neu-data-value">{currentAcceleration.x.toFixed(2)}</span>
              </div>
              <div className="neu-data-row">
                <span className="neu-data-label">az:</span>
                <span className="neu-data-value">{currentAcceleration.z.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Velocity Display */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">⚡</div>
              <span>Vận tốc (v)</span>
            </div>
            <div className="neu-data-display">
              <div className="neu-data-row">
                <span className="neu-data-label"><TrendingUp size={16} /> Tổng:</span>
                <span className="neu-data-value magnitude">{currentVelocity.magnitude.toFixed(2)} m/s</span>
              </div>
              <div className="neu-data-row">
                <span className="neu-data-label">vx:</span>
                <span className="neu-data-value">{currentVelocity.x.toFixed(2)}</span>
              </div>
              <div className="neu-data-row">
                <span className="neu-data-label">vz:</span>
                <span className="neu-data-value">{currentVelocity.z.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Kinetic Energy Display */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">⚡</div>
              <span>Động năng (KE)</span>
            </div>
            <div className="neu-data-display">
              <div className="neu-data-row">
                <span className="neu-data-label">KE = ½mv²:</span>
                <span className="neu-data-value magnitude" style={{ color: '#ed8936' }}>{kineticEnergy.toFixed(2)} J</span>
              </div>
              <div className="neu-data-row" style={{ fontSize: '0.75rem', color: '#718096', marginTop: '8px' }}>
                <span>½ × {mass.toFixed(2)} × ({currentVelocity.magnitude.toFixed(2)})²</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="neu-bento-item neu-item-medium">
            <div className="neu-item-title">
              <div className="neu-title-icon">🎮</div>
              <span>Điều khiển</span>
            </div>
            {!isStarted ? (
              <button className="neu-button neu-button-success" onClick={initializeMediaPipe} disabled={isLoading}>
                <Play size={20} /> Bắt đầu
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
                    <button className="neu-button neu-button-danger" onClick={handleStop}>
                      <StopCircle size={20} /> Dừng Camera
                    </button>
                    <button className="neu-button neu-button-primary" onClick={handleReset}>
                      <RotateCcw size={20} /> Đặt lại vị trí
                    </button>
                  </>
                )}
              </>
            )}
            
            {error && (
              <div className="error-message">{error}</div>
            )}
          </div>

          {/* Instructions */}
          <div className="neu-bento-item neu-item-full">
            <div className="neu-item-title">
              <div className="neu-title-icon">📖</div>
              <span>Hướng dẫn</span>
            </div>
            <div className="neu-instructions">
              <ul>
                <li><Hand size={18} /> <strong>Tay trái - Điều chỉnh thông số:</strong>
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    <li>✊ Nắm đấm: Khối lượng NHỎ (m × 0.5)</li>
                    <li>✌️ Chữ V: Khối lượng TRUNG BÌNH (m × 1.0)</li>
                    <li>🖖 3 ngón: Khối lượng LỚN (m × 2.0)</li>
                    <li>🖐️ Bàn tay mở: Khối lượng RẤT LỚN (m × 3.0)</li>
                    <li>👍 Ngón cái lên: LỰC MẠNH (F × 2.0)</li>
                    <li>🤏 Nhéo: LỰC YẾU (F × 0.5)</li>
                  </ul>
                </li>
                <li><Gauge size={18} /> <strong>Tay phải - Điều khiển lực:</strong>
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    <li>☝️ Chỉ trỏ: Tạo lực theo hướng ngón trỏ</li>
                    <li>✌️ Chữ V: Lực lệch 45° sang phải</li>
                    <li>✊ Nắm đấm: Lực mạnh xuống</li>
                    <li>🖐️ Bàn tay mở: Lực mạnh lên</li>
                    <li>👍 Ngón cái lên: Lực sang phải</li>
                    <li>🤏 Nhéo: DỪNG lực (reset velocity)</li>
                  </ul>
                </li>
                <li><TrendingUp size={18} /> <strong>Ma sát:</strong> Vật thể sẽ dần dừng lại do ma sát trên mặt phẳng (hệ số ma sát: 0.95)</li>
                <li><Info size={18} /> <strong>Theo dõi:</strong> Xem cử chỉ tay và các thông số vật lý real-time ở các panel bên phải</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </NeumorphicThemeProvider>
  );
}

