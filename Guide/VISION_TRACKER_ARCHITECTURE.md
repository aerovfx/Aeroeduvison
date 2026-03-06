# Vision Tracker - AI Attention Monitoring System

## Tổng quan

Vision Tracker là hệ thống theo dõi mức độ tập trung và tương tác của học sinh sử dụng AI Computer Vision. Hệ thống có thể tích hợp với camera giám sát để phân tích real-time attention, emotion, và activity của học sinh trong lớp học.

## Kiến trúc hệ thống

### 1. Frontend (React/Next.js)
```
/dashboard/vision-tracker
├── Camera Control Panel
├── Privacy Settings
├── Real-time Statistics
├── Student Attention Dashboard
├── Heart Map Visualization
└── Alert System
```

### 2. Backend API (Next.js API Routes)
```
/api/vision-tracker/
├── /attention - Ghi nhận và truy xuất dữ liệu attention
├── /consent - Quản lý consent và privacy
└── /heartmap - Dữ liệu heatmap cho classroom
```

### 3. AI Processing Pipeline
```
Camera Input → Face Detection → Tracking → Analysis → Storage
     ↓              ↓              ↓         ↓         ↓
  Webcam/IP    MTCNN/YOLO    DeepSORT   Emotion   Database
  Camera       RetinaFace    Tracking   Recognition
```

## Tính năng chính

### 1. Camera Integration
- **Webcam Support**: Tích hợp webcam trình duyệt cho online class
- **IP Camera**: Hỗ trợ camera IP/ONVIF cho phòng học thật
- **Multi-camera**: Hỗ trợ nhiều camera góc khác nhau
- **Privacy Modes**: 3 chế độ privacy (Off, Anonymous, Full)

### 2. AI Analysis
- **Face Detection**: Phát hiện và tracking khuôn mặt
- **Gaze Estimation**: Ước lượng hướng nhìn và focus
- **Head Pose**: Phân tích tư thế đầu (yaw, pitch, roll)
- **Emotion Recognition**: Nhận diện cảm xúc (focused, confused, bored)
- **Activity Detection**: Phát hiện hoạt động (sitting, standing, away)

### 3. Attention Scoring
```javascript
AttentionScore = w1 * gaze_on_screen + w2 * head_pose_stability + 
                 w3 * emotion_engagement + w4 * activity_level
```

### 4. Privacy & Compliance
- **Consent Management**: Quản lý đồng ý từ phụ huynh/học sinh
- **Data Anonymization**: Sử dụng anonymous IDs
- **Retention Policy**: Tự động xóa dữ liệu theo thời gian
- **Audit Logging**: Ghi log tất cả hoạt động

## API Endpoints

### POST /api/vision-tracker/attention
Ghi nhận sự kiện attention từ AI processing.

**Request:**
```json
{
  "class_id": "math-10A",
  "student_anonymous_id": "s_000123",
  "timestamp": "2024-01-23T08:15:12+07:00",
  "attention_score": 72.4,
  "gaze_on_screen_prob": 0.85,
  "head_pose": {"yaw": -5.2, "pitch": 2.1, "roll": 0.2},
  "activity": "sitting",
  "emotion": "focused"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attention event recorded",
  "event_id": "evt_1705983312000",
  "timestamp": "2024-01-23T08:15:12+07:00"
}
```

### GET /api/vision-tracker/attention
Truy xuất dữ liệu attention với filtering.

**Query Parameters:**
- `class_id`: ID lớp học
- `student_id`: ID học sinh
- `start_time`: Thời gian bắt đầu
- `end_time`: Thời gian kết thúc
- `limit`: Số lượng records

### POST /api/vision-tracker/consent
Quản lý consent của học sinh.

**Request:**
```json
{
  "student_id": "s001",
  "anonymous_id": "s_000123",
  "consent_given": true,
  "parent_consent": true,
  "data_retention_days": 30,
  "consent_type": "camera"
}
```

### GET /api/vision-tracker/heartmap
Lấy dữ liệu heatmap cho classroom visualization.

**Response:**
```json
{
  "success": true,
  "data": {
    "class_id": "math-10A",
    "timestamp": "2024-01-23T08:15:12+07:00",
    "students": [
      {
        "student_id": "s001",
        "anonymous_id": "s_000123",
        "position": {"x": 20, "y": 30},
        "attention_score": 85,
        "energy_level": 90,
        "emotion": "focused",
        "activity": "sitting"
      }
    ],
    "class_statistics": {
      "total_students": 25,
      "consent_students": 20,
      "average_attention": 78,
      "low_attention_count": 3,
      "high_attention_count": 12
    }
  }
}
```

## Công nghệ sử dụng

### Frontend
- **React/Next.js**: UI framework
- **Tailwind CSS**: Styling
- **Recharts**: Data visualization
- **Canvas API**: Real-time drawing
- **WebRTC**: Camera streaming

### Backend
- **Next.js API Routes**: REST API
- **TypeScript**: Type safety
- **JSON**: Data format
- **Mock Database**: Development (sẽ thay bằng PostgreSQL)

### AI/ML (Production)
- **OpenCV**: Computer vision
- **MediaPipe**: Pose estimation
- **RetinaFace**: Face detection
- **DeepSORT**: Object tracking
- **TensorFlow/PyTorch**: Model inference

### Infrastructure
- **Edge Computing**: Local processing
- **Cloud Processing**: Heavy AI tasks
- **Redis**: Real-time caching
- **InfluxDB**: Time-series data
- **PostgreSQL**: Relational data

## Privacy & Security

### 1. Data Protection
- **Encryption**: AES-256 cho data at rest
- **Anonymization**: Không lưu raw images
- **Consent Tracking**: Audit trail cho mọi consent
- **Data Minimization**: Chỉ lưu metadata cần thiết

### 2. Compliance
- **GDPR**: Quyền xóa, truy cập, portability
- **COPPA**: Bảo vệ trẻ em dưới 13 tuổi
- **FERPA**: Bảo vệ thông tin giáo dục
- **Local Laws**: Tuân thủ luật địa phương

### 3. Technical Safeguards
- **Access Control**: Role-based permissions
- **Audit Logging**: Ghi log mọi hoạt động
- **Data Retention**: Tự động xóa theo policy
- **Secure Transmission**: HTTPS/TLS

## Triển khai Production

### 1. Edge Processing
```bash
# Camera capture
ffmpeg -i rtsp://camera_ip/stream -f image2 -vf fps=1/2 frame_%04d.jpg

# AI inference
python inference.py --input frame_0001.jpg --output results.json

# Send to cloud
curl -X POST /api/vision-tracker/attention -d @results.json
```

### 2. Cloud Processing
```bash
# Docker deployment
docker run -d --name vision-tracker \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  vision-tracker:latest
```

### 3. Monitoring
- **Health Checks**: `/api/health`
- **Metrics**: Prometheus + Grafana
- **Logs**: ELK Stack
- **Alerts**: Slack/Email notifications

## Roadmap

### Phase 1 (Current)
- ✅ Basic camera integration
- ✅ Privacy controls
- ✅ Mock AI processing
- ✅ Dashboard UI

### Phase 2 (Next 2 months)
- 🔄 Real AI models integration
- 🔄 Multi-camera support
- 🔄 Real-time streaming
- 🔄 Advanced analytics

### Phase 3 (Next 6 months)
- 📋 Mobile app integration
- 📋 Parent portal
- 📋 Advanced reporting
- 📋 Machine learning insights

## Best Practices

### 1. Development
- **Test với mock data** trước khi tích hợp AI thật
- **Implement privacy by design**
- **Use TypeScript** cho type safety
- **Write comprehensive tests**

### 2. Deployment
- **Start với pilot nhỏ** (1-2 lớp)
- **Monitor performance** và accuracy
- **Get explicit consent** từ tất cả stakeholders
- **Regular security audits**

### 3. Usage
- **Train teachers** cách sử dụng hệ thống
- **Communicate benefits** cho phụ huynh
- **Provide opt-out options**
- **Regular review** của privacy policies

## Troubleshooting

### Common Issues
1. **Camera permission denied**: Check browser settings
2. **Low accuracy**: Improve lighting conditions
3. **High latency**: Optimize processing pipeline
4. **Privacy concerns**: Review consent management

### Performance Optimization
- **Frame sampling**: Process 1 frame/2 seconds
- **Model quantization**: Reduce model size
- **Edge processing**: Local inference
- **Caching**: Redis for frequent queries

---

*Tài liệu này sẽ được cập nhật thường xuyên khi hệ thống phát triển.*

