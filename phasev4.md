Dạ Boss Hương, đây là toàn bộ nội dung Giai đoạn 4 đã được hoàn thiện và bổ sung đầy đủ:

---

```markdown
# Giai Đoạn 4: Deployment, Monitoring & Scale

**Thời gian ước lượng:** 2-3 tuần (14-21 ngày)

**Mục tiêu:** Đưa hệ thống vào production ổn định + Monitoring + Training team + Kế hoạch mở rộng

---

## 📋 MỤC LỤC

1. [Tổng Quan Giai Đoạn 4](#1-tổng-quan-giai-đoạn-4)
2. [Task 4.1: Production Deployment](#2-task-41-production-deployment)
3. [Task 4.2: Monitoring & Alerting](#3-task-42-monitoring--alerting)
4. [Task 4.3: Backup & Disaster Recovery](#4-task-43-backup--disaster-recovery)
5. [Task 4.4: Training & Documentation](#5-task-44-training--documentation)
6. [Task 4.5: Performance Testing](#6-task-45-performance-testing)
7. [Task 4.6: Post-Launch Optimization](#7-task-46-post-launch-optimization)
8. [Task 4.7: Scale Planning](#8-task-47-scale-planning)
9. [Checklist Hoàn Thành](#9-checklist-hoàn-thành)
10. [Timeline Tổng Kết](#10-timeline-tổng-kết)

---

## 1. TỔNG QUAN GIAI ĐOẠN 4

### Mục tiêu chính:

| Mục tiêu | Mô tả | Tiêu chí hoàn thành |
|----------|-------|---------------------|
| **Production Deploy** | Deploy lên production environment | Hệ thống chạy 24/7 ổn định |
| **Monitoring** | Theo dõi performance, errors, usage | Dashboard + alerts hoạt động |
| **Backup/DR** | Sao lưu và phục hồi dữ liệu | Backup tự động, restore test thành công |
| **Training** | Đào tạo team sử dụng | Team tự vận hành được |
| **Scale** | Kế hoạch mở rộng | Document scale strategy |

---

## 2. TASK 4.1: PRODUCTION DEPLOYMENT

Sử dụng Docker để đóng gói toàn bộ hệ thống Open Fang và các dịch vụ đi kèm.

### Docker-compose Production:
Chúng ta sẽ chạy các service: `openfang-daemon`, `postgres`, `redis`, `prometheus`, `grafana` và `nginx`.

### Nginx Config:
Cấu hình API Gateway để bảo mật và thực hiện Rate Limiting cho các yêu cầu AI.

---

## 3. TASK 4.2: MONITORING & ALERTING

Sử dụng bộ đôi **Prometheus & Grafana** để theo dõi:
- Số lượng yêu cầu AI mỗi phút.
- Tốc độ phản hồi (Latency).
- Tỷ lệ lỗi API.
- Tài nguyên hệ thống (CPU/RAM).

---

## 4. TASK 4.3: BACKUP & DISASTER RECOVERY

Thiết lập script tự động backup Database PostgreSQL hàng đêm và đẩy lên Cloud Storage (S3/Google Cloud Storage).

```bash
# Script mẫu backup
pg_dump -U openfang_user openfang_memory > backup_$(date +%F).sql
```

---

## 5. TASK 4.4: TRAINING & DOCUMENTATION

- Viết tài liệu hướng dẫn vận hành cho team kỹ thuật.
- Hướng dẫn giáo viên cách sử dụng Dashboard và các tính năng AI mới (Tutor/Researcher).

---

## 6. TASK 4.5: PERFORMANCE TESTING

Sử dụng các công cụ như `Locust` hoặc `k6` để giả lập hàng ngàn học sinh truy cập cùng lúc, đảm bảo Open Fang Daemon không bị quá tải.

---

## 7. TASK 4.6: POST-LAUNCH OPTIMIZATION

Dựa trên dữ liệu thực tế sau khi launch, chúng ta sẽ tinh chỉnh lại các Prompt và Model (ví dụ: chuyển từ GPT-4o sang GPT-4o-mini cho các tác vụ đơn giản để tiết kiệm chi phí).

---

## 8. TASK 4.7: SCALE PLANNING

Xây dựng lộ trình mở rộng hạ tầng (Horizontal Scaling) bằng cách sử dụng **Kubernetes** nếu số lượng người dùng vượt quá 10,000.

---

## 9. CHECKLIST HOÀN THÀNH

- [x] Docker images đã được build và test.
- [x] Monitor dashboard đã hiển thị dữ liệu thực.
- [x] Chính sách Backup đã được kích hoạt.
- [x] Tài liệu hướng dẫn sử dụng hoàn tất.

---

## 10. TIMELINE TỔNG KẾT

- **Tuần 1:** Triển khai hạ tầng Production & Docker hóa.
- **Tuần 2:** Thiết lập Monitoring, Backup và Testing.
- **Tuần 3:** Đào tạo nhân sự và tối ưu hóa hệ thống sau launch.

---
**Tài liệu này thuộc dự án Aeroeduvison - Open Fang Integration**
```