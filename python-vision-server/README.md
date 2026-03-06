# Vision Tracking Server

Server-side multi-person tracking system using Python MediaPipe on Cloud Run.

## Features

- 🎥 **IP Camera Support**: RTSP/HTTP/Webcam input
- 👥 **Multi-Person Tracking**: Up to 50 hands + 50 faces
- 🚀 **Real-time Streaming**: WebSocket at 15 FPS
- ☁️ **Cloud Run Ready**: Containerized deployment
- 🎯 **Gesture & Emotion**: Hand gestures + facial emotion detection

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server (webcam)
python app.py

# Run with IP camera
CAMERA_URL="rtsp://camera-ip/stream" python app.py

# Test WebSocket
wscat -c ws://localhost:8080/ws/tracking
```

### Docker

```bash
# Build
docker build -t vision-tracker .

# Run (webcam)
docker run -p 8080:8080 vision-tracker

# Run (IP camera)
docker run -p 8080:8080 \
  -e CAMERA_URL="rtsp://192.168.1.100/stream" \
  -e TARGET_FPS=15 \
  vision-tracker
```

### Deploy to Cloud Run

```bash
# Set your project
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# Deploy
chmod +x deploy.sh
./deploy.sh "rtsp://your-camera-ip/stream"
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CAMERA_URL` | `0` | Camera source (0=webcam, RTSP URL, HTTP URL) |
| `TARGET_FPS` | `15` | Target frames per second |
| `PORT` | `8080` | Server port |

## API Endpoints

### Health Check
```bash
GET /
GET /health
```

### WebSocket Tracking
```bash
WS /ws/tracking
```

**Message Format:**
```json
{
  "timestamp": 1234567890.123,
  "fps": 15.2,
  "frame_id": 450,
  "hands_count": 12,
  "faces_count": 6,
  "hands": [
    {
      "id": 0,
      "handedness": "Left",
      "confidence": 0.95,
      "landmarks": [{"x": 0.5, "y": 0.3, "z": 0.1}, ...],
      "gesture": "PEACE"
    }
  ],
  "faces": [
    {
      "id": 0,
      "landmarks": [{"x": 0.5, "y": 0.4, "z": 0.05}, ...],
      "emotion": "HAPPY",
      "confidence": 0.75
    }
  ]
}
```

## Performance

### Cloud Run Configuration

Recommended specs for 35-50 people:
- **CPU**: 8 vCPUs
- **Memory**: 16 GB
- **Timeout**: 3600s (1 hour)
- **Concurrency**: 80
- **Cost**: ~$0.20/hour (~$150/month 24/7)

### Optimization Tips

1. **Reduce Resolution**: 1280x720 instead of 1920x1080
2. **Lower Model Complexity**: `model_complexity=0` for hands
3. **Disable Refinement**: `refine_landmarks=False` for faces
4. **Frame Skipping**: Adjust `TARGET_FPS` based on load

## Supported Camera Formats

- **Webcam**: `CAMERA_URL=0` (or `1`, `2`, etc.)
- **RTSP**: `CAMERA_URL=rtsp://192.168.1.100:554/stream`
- **HTTP/MJPEG**: `CAMERA_URL=http://192.168.1.100:8080/video`
- **File**: `CAMERA_URL=/path/to/video.mp4`

## Troubleshooting

### Camera Connection Issues

```bash
# Test camera locally first
ffplay rtsp://camera-ip/stream

# Check camera format
ffprobe rtsp://camera-ip/stream
```

### Performance Issues

- Reduce `TARGET_FPS` to 10 or 8
- Lower camera resolution
- Increase Cloud Run CPU allocation
- Consider GPU-enabled alternatives (Vertex AI, GKE)

### WebSocket Connection

```bash
# Test connection
wscat -c wss://your-service-url/ws/tracking

# Monitor logs
gcloud run logs read vision-tracking-server --limit 50
```

## Dashboard Integration

Update your Next.js dashboard to connect:

```typescript
const ws = new WebSocket('wss://your-cloud-run-url/ws/tracking')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log(`FPS: ${data.fps}, Hands: ${data.hands_count}, Faces: ${data.faces_count}`)
  // Render tracking data
}
```

## License

MIT
