# Đánh giá Kiến trúc Hệ thống Aeroeduvison

Hệ thống Aeroeduvison hiện đang trong quá trình chuyển đổi kiến trúc mạnh mẽ từ một ứng dụng monolithic (Node.js) sang kiến trúc Microservices hiệu năng cao (Rust). Dưới đây là phân tích chi tiết.

## 1. Mô hình Phân lớp (Layered Architecture)

### Frontend (Giao diện người dùng)
- **Framework**: Next.js 14/15 (App Router).
- **Công nghệ**: React, Tailwind CSS, Lucide Icons, Radix UI.
- **Tính năng**: Dashboard đa vai trò (Admin, Teacher, Student), hệ thống chấm điểm thông minh, lab mô phỏng STEM.

### API Gateway & Routing (Middleware)
- **Pattern**: **Strangler Fig Pattern**.
- **Cơ chế**: `middleware.ts` đóng vai trò là một "nhà phân phối" thông minh (Canary Router).
- **Chiến lược Rollout**: Hỗ trợ Canary Release theo tỷ lệ % (10% -> 25% -> 50% -> 100%) với khả năng tự động rollback nếu service Rust gặp lỗi.

### Backend Services (Đa ngôn ngữ)
- **Node.js (Legacy/Transition)**: Xử lý ~90% logic nghiệp vụ hiện tại qua Bun runtime.
- **Rust Microservices (Modern/High Performance)**:
    - `aero-backend`: Orchestration và logic lõi.
    - `vector-sim-service`: Xử lý vector similarity và OCR grading.
    - `auth-service`: Quản lý danh tính và bảo mật.
    - `camera-iot-service`: Giám sát camera RTSP và Gateway cho các thiết bị IoT (Arduino, Raspberry Pi).
    - Các service khác (Courses, AI, Student, STEM) đang được tách rời.
- **Python Components**: Dành riêng cho OCR (PaddleOCR) và các mô phỏng vật lý/hóa học chuyên sâu.

## 2. Hệ thống AI & Tích hợp Model
- **Model Selector**: Một lớp trừu tượng (`lib/ai/model-selector`) cho phép tự động chọn model tối ưu dựa trên tác vụ (grading, chat, lesson planning).
- **Hybrid Cloud-Edge**: Hỗ trợ cả Cloud API (OpenAI, Gemini, xAI) và Local LLM (Ollama: deepseek-coder, edu-assistant) để đảm bảo tính riêng tư và tiết kiệm chi phí.

## 3. Quản lý Dữ liệu
- **Database**: PostgreSQL (PostGIS/Neon).
- **ORM/Query Builder**: 
    - Node.js: Prisma (schema phức tạp với >1200 dòng, hỗ trợ full-text search).
    - Rust: sqlx (để đạt hiệu năng tối đa).
- **Schema**: Thiết kế chuẩn hóa cao, hỗ trợ đa thực thể (Courses, Exams, STEM Projects, Emotion Tracking).

## 4. Bảo mật & Triển khai
- **Auth**: JWT-based, tích hợp Argon2id cho hashing, hỗ trợ 2FA (đang nâng cấp).
- **Infrastructure**:
    - Dockerized: Mỗi service có Dockerfile riêng.
    - Deployment: Cloud Run (GCP), GitHub Actions + Cloud Build.
- **Performance**: Việc chuyển sang Rust đã giúp cải thiện hiệu năng từ 3x đến 5x cho các tác vụ nặng như Vector Similarity và OCR.

## 5. Kế hoạch Mở rộng: An ninh & YOLO Integration (Phase 5)

Để mở rộng khả năng giám sát từ "Lớp học" ra "Toàn trường", hệ thống sẽ tích hợp thêm **YOLO (v11/v10)** cho các khu vực không gian mở (Sân trường, Hành lang, Cổng trường).

### Mục tiêu mở rộng
- **Quản lý sân trường**: Đếm người quy mô lớn, nhận diện khu vực tập trung đông người bất thường.
- **Cảnh báo Bạo lực học đường**: 
    - Sử dụng **YOLOv11-Pose** để xác định tư thế người.
    - Phân tích các hành vi bất thường (xô đẩy, đánh nhau, té ngã) qua logic Action Recognition.
- **Giám sát an ninh**: Phát hiện người lạ, xâm nhập trái phép vào các giờ giới nghiêm.

### Kiến trúc Kỹ thuật mới
- **YOLO Vision Service (Python/GPU)**: 
    - Triển khai trên **GKE (Google Kubernetes Engine)** hoặc các instance GPU (L4/T4) để đảm bảo xử lý Real-time cho nhiều luồng camera cùng lúc.
    - Tích hợp với `camera-iot-service` (Rust) để nhận diện luồng RTSP và đẩy cảnh báo về Dashboard.
- **Hệ thống Cảnh báo (Alerting System)**: 
    - Tích hợp thông báo đẩy (Push Notification) đến App của Giám thị/Bảo vệ ngay khi AI phát hiện dấu hiệu bạo lực.
    - Tự động ghi lại và lưu trữ các đoạn clip bằng chứng (Cloud Storage).

## 6. Ưu điểm & Thách thức
### Ưu điểm
- **Hiệu năng cao**: Tận dụng triệt để Rust cho các tác vụ tính toán nặng.
- **Linh hoạt**: Khả năng mở rộng tốt nhờ kiến trúc Microservices.
- **An ninh thông minh**: Kết hợp MediaPipe (chi tiết lớp học) và YOLO (giám sát diện rộng) tạo nên hệ thống an ninh 2 lớp hoàn chỉnh.

### Thách thức
- **Độ phức tạp**: Việc quản lý đồng thời Node.js, Rust và Python (với GPU) đòi hỏi quy trình CI/CD và Monitoring chặt chẽ.
- **Chi phí hạ tầng**: Việc vận hành YOLO trên GPU sẽ tăng chi phí vận hành so với MediaPipe trên CPU.

---
**Kết luận**: Aeroeduvison sở hữu một kiến trúc hiện đại, có tầm nhìn xa và tính thực tiễn cao, đặc biệt là trong việc áp dụng AI vào giáo dục và an ninh học đường một cách toàn diện.
