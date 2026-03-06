# Hướng Dẫn Cấu Hình OCR Service

## 🐛 Vấn Đề

Khi số hóa tài liệu, bạn có thể gặp lỗi:
```
Xử lý thất bại
Không thể trích xuất text từ tài liệu. OCR service có thể không khả dụng hoặc file không hợp lệ.
```

Điều này xảy ra khi **OCR service không đang chạy**.

---

## ✅ Giải Pháp

### Cách 1: Khởi Động OCR Service (Python)

OCR service thường chạy trên port **8001**. Để khởi động:

```bash
# Di chuyển vào thư mục OCR service
cd python-ocr

# Khởi động service (tùy thuộc vào file bạn có)
# Option 1: Nếu có ocr_server.py
python ocr_server.py

# Option 2: Nếu có FastAPI service
uvicorn ocr_server:app --host 0.0.0.0 --port 8001

# Option 3: Nếu có docker-compose
docker-compose up ocr-service
```

### Cách 2: Kiểm Tra OCR Service Có Đang Chạy

```bash
# Kiểm tra port 8001
curl http://localhost:8001/health

# Hoặc test OCR endpoint
curl -X POST http://localhost:8001/ocr \
  -F "file=@test-image.jpg"
```

### Cách 3: Cấu Hình Environment Variables

Đảm bảo file `.env` có:

```env
# OCR Service URL
OCR_SERVER_URL=http://localhost:8001

# Hoặc nếu OCR service chạy ở nơi khác
OCR_SERVER_URL=http://your-ocr-server:8001
```

---

## 🔍 Kiểm Tra Logs

Nếu vẫn gặp lỗi, kiểm tra:

1. **Server logs** (Next.js):
   ```bash
   # Xem logs trong terminal chạy Next.js
   # Tìm dòng có "OCR error" hoặc "OCR service not available"
   ```

2. **Processing logs** (trong database):
   - Vào trang review của document
   - Tab "Log xử lý"
   - Xem log có stage "error" để biết chi tiết

3. **OCR Service logs**:
   ```bash
   # Xem logs của OCR service Python
   # Tìm lỗi kết nối hoặc dependency issues
   ```

---

## 🛠️ Troubleshooting

### Lỗi: "Connection refused"

**Nguyên nhân:** OCR service không chạy

**Giải pháp:**
```bash
# 1. Kiểm tra port 8001 có bị chiếm không
lsof -i :8001

# 2. Khởi động OCR service
cd python-ocr
python ocr_server.py
```

### Lỗi: "Module not found" (Python)

**Nguyên nhân:** Thiếu dependencies

**Giải pháp:**
```bash
cd python-ocr
pip install -r requirements.txt
# Hoặc
pip install paddleocr opencv-python pillow
```

### Lỗi: "Timeout"

**Nguyên nhân:** OCR service quá chậm hoặc không phản hồi

**Giải pháp:**
- Tăng timeout trong code (hiện tại 30s)
- Kiểm tra tài nguyên server (CPU, RAM)
- Giảm kích thước ảnh nếu quá lớn

---

## 📝 Tạm Thời Bỏ Qua OCR

Nếu OCR service không khả dụng và bạn muốn tiếp tục làm việc:

1. **Upload document** vẫn hoạt động (file được lưu)
2. **Status sẽ là "Lỗi"** thay vì "Hoàn tất"
3. **Có thể số hóa lại** sau khi OCR service sẵn sàng:
   - Click button "Số hóa lại" trên trang review
   - Hoặc click "Số hóa với AI" trên trang list

---

## 🚀 Production Setup

Trong môi trường production, OCR service nên:

1. **Chạy như một service riêng** (Docker container, systemd service)
2. **Có health check endpoint** để monitor
3. **Có auto-restart** khi crash
4. **Có load balancing** nếu xử lý nhiều requests

Ví dụ với Docker:

```yaml
# docker-compose.yml
services:
  ocr-service:
    image: your-ocr-image
    ports:
      - "8001:8001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 📞 Liên Hệ

Nếu vẫn gặp vấn đề:
1. Kiểm tra logs chi tiết
2. Xem processing logs trong database
3. Kiểm tra network connectivity giữa Next.js và OCR service
