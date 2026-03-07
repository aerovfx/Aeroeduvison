"""
Vision Tracking Server for Cloud Run
Processes IP camera feed with MediaPipe to track 35-50 people at 15 FPS
Streams results to dashboard via WebSocket
"""

import asyncio
import json
import time
from typing import List, Dict, Any
import cv2
import mediapipe as mp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import os

app = FastAPI(title="Vision Tracking Server")

# CORS for Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MediaPipe setup for multi-person tracking
mp_hands = mp.solutions.hands
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils

# Initialize with high capacity for crowd tracking
hands_detector = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=50,  # Support up to 50 hands (25 people)
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
    model_complexity=0  # Use lighter model for performance
)

face_detector = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=50,  # Support up to 50 faces
    refine_landmarks=False,  # Disable for performance
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Global variables for camera and metrics
camera_url = os.getenv('CAMERA_URL', '0')  # Default to webcam if not specified
target_fps = int(os.getenv('TARGET_FPS', '15'))
active_connections: List[WebSocket] = []
frame_count = 0
start_time = time.time()


def detect_gesture(landmarks: List) -> str:
    """Detect hand gesture from landmarks"""
    if not landmarks or len(landmarks) < 21:
        return 'UNKNOWN'
    
    fingers = []
    
    # Thumb
    fingers.append(landmarks[4].x < landmarks[3].x)
    
    # Other fingers
    for i in range(4):
        fingers.append(landmarks[8 + i * 4].y < landmarks[6 + i * 4].y)
    
    open_fingers = sum(fingers)
    
    if open_fingers == 0:
        return 'FIST'
    elif open_fingers == 5:
        return 'OPEN'
    elif open_fingers == 1 and fingers[1]:
        return 'POINT'
    elif open_fingers == 2 and fingers[1] and fingers[2]:
        return 'PEACE'
    elif open_fingers == 3:
        return 'THREE'
    
    return 'CUSTOM'


def detect_emotion(face_landmarks: List) -> Dict[str, Any]:
    """Simplified emotion detection from face landmarks"""
    if not face_landmarks or len(face_landmarks) < 468:
        return {'emotion': 'NEUTRAL', 'confidence': 0.0}
    
    # Use key facial points for emotion
    left_eyebrow = face_landmarks[70]
    right_eyebrow = face_landmarks[300]
    left_eye = face_landmarks[159]
    right_eye = face_landmarks[386]
    mouth_top = face_landmarks[13]
    mouth_bottom = face_landmarks[14]
    
    brow_raise = abs(left_eyebrow.y - left_eye.y) + abs(right_eyebrow.y - right_eye.y)
    mouth_open = abs(mouth_top.y - mouth_bottom.y)
    
    # Simple emotion classification
    if mouth_open > 0.03:
        return {'emotion': 'SURPRISE', 'confidence': 0.7}
    elif brow_raise > 0.08:
        return {'emotion': 'HAPPY', 'confidence': 0.7}
    elif mouth_top.y > mouth_bottom.y * 0.98:
        return {'emotion': 'SAD', 'confidence': 0.6}
    
    return {'emotion': 'NEUTRAL', 'confidence': 0.5}


def process_frame(frame: np.ndarray) -> Dict[str, Any]:
    """Process single frame with MediaPipe"""
    global frame_count
    
    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process hands
    hands_results = hands_detector.process(rgb_frame)
    
    # Process faces
    face_results = face_detector.process(rgb_frame)
    
    # Build response data
    hands_data = []
    if hands_results.multi_hand_landmarks:
        for idx, hand_landmarks in enumerate(hands_results.multi_hand_landmarks):
            handedness = hands_results.multi_handedness[idx].classification[0]
            
            # Convert landmarks to serializable format
            landmarks_list = [
                {'x': lm.x, 'y': lm.y, 'z': lm.z}
                for lm in hand_landmarks.landmark
            ]
            
            hands_data.append({
                'id': idx,
                'handedness': handedness.label,
                'confidence': handedness.score,
                'landmarks': landmarks_list,
                'gesture': detect_gesture(hand_landmarks.landmark)
            })
    
    faces_data = []
    if face_results.multi_face_landmarks:
        for idx, face_landmarks in enumerate(face_results.multi_face_landmarks):
            # Sample landmarks to reduce data size
            landmarks_sample = [
                {'x': face_landmarks.landmark[i].x, 
                 'y': face_landmarks.landmark[i].y, 
                 'z': face_landmarks.landmark[i].z}
                for i in [10, 70, 300, 159, 386, 13, 14]  # Key points only
            ]
            
            emotion_data = detect_emotion(face_landmarks.landmark)
            
            faces_data.append({
                'id': idx,
                'landmarks': landmarks_sample,
                'emotion': emotion_data['emotion'],
                'confidence': emotion_data['confidence']
            })
    
    frame_count += 1
    current_fps = frame_count / (time.time() - start_time)
    
    return {
        'timestamp': time.time(),
        'fps': round(current_fps, 1),
        'frame_id': frame_count,
        'hands_count': len(hands_data),
        'faces_count': len(faces_data),
        'hands': hands_data[:50],  # Limit to 50
        'faces': faces_data[:50]   # Limit to 50
    }


async def broadcast_tracking_data(data: Dict[str, Any]):
    """Broadcast tracking data to all connected WebSocket clients"""
    if not active_connections:
        return
    
    message = json.dumps(data)
    disconnected = []
    
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception as e:
            print(f"Error sending to client: {e}")
            disconnected.append(connection)
    
    # Remove disconnected clients
    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)


async def camera_processing_loop():
    """Main loop to process camera feed"""
    print(f"Starting camera processing from: {camera_url}")
    
    # Open camera stream
    if camera_url.isdigit():
        cap = cv2.VideoCapture(int(camera_url))
    else:
        cap = cv2.VideoCapture(camera_url)
    
    if not cap.isOpened():
        print(f"ERROR: Could not open camera: {camera_url}")
        return
    
    # Set camera properties for performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, target_fps)
    
    frame_interval = 1.0 / target_fps
    last_process_time = 0
    
    print(f"Camera opened successfully. Target FPS: {target_fps}")
    
    while True:
        current_time = time.time()
        
        # Maintain target FPS
        if current_time - last_process_time < frame_interval:
            await asyncio.sleep(0.001)
            continue
        
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame, retrying...")
            await asyncio.sleep(0.1)
            continue
        
        # Process frame
        try:
            tracking_data = process_frame(frame)
            
            # Broadcast to all connected clients
            if active_connections:
                await broadcast_tracking_data(tracking_data)
            
            last_process_time = current_time
            
        except Exception as e:
            print(f"Error processing frame: {e}")
            await asyncio.sleep(0.1)
    
    cap.release()


@app.on_event("startup")
async def startup_event():
    """Start camera processing on server startup"""
    asyncio.create_task(camera_processing_loop())
    print("Vision Tracking Server started successfully")


@app.websocket("/ws/tracking")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for streaming tracking data"""
    await websocket.accept()
    active_connections.append(websocket)
    
    print(f"Client connected. Total connections: {len(active_connections)}")
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"Client disconnected. Remaining connections: {len(active_connections)}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "camera_url": camera_url,
        "target_fps": target_fps,
        "active_connections": len(active_connections),
        "frames_processed": frame_count,
        "uptime_seconds": time.time() - start_time
    }


@app.get("/health")
async def health_check():
    """Kubernetes/Cloud Run health check"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
