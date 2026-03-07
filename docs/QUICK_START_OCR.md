# 🚀 Quick Start - Khởi Động OCR Service

## ⚡ Khởi Động Nhanh (1 phút)

### Bước 1: Kiểm tra OCR Service có đang chạy

```bash
# Test OCR service
curl http://localhost:8001/health

# Hoặc test với một ảnh
curl -X POST http://localhost:8001/ocr \
  -F "file=@test-image.jpg"
```

### Bước 2: Khởi động OCR Service

**Option A: Python Script (Đơn giản nhất)**

```bash
cd python-ocr
python ocr_server.py
```

**Option B: FastAPI/Uvicorn**

```bash
cd python-ocr
uvicorn ocr_server:app --host 0.0.0.0 --port 8001
```

**Option C: Docker (Nếu có)**

```bash
docker-compose up ocr-service
```

### Bước 3: Xác nhận đang chạy

Bạn sẽ thấy output như:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
```

---

## 🔍 Kiểm Tra Nhanh

Sau khi khởi động, test ngay:

```bash
# Test health endpoint
curl http://localhost:8001/health

# Expected: {"status": "ok"} hoặc tương tự
```

---

## ⚠️ Lỗi Thường Gặp

### Lỗi: "Connection refused"

**Nguyên nhân:** OCR service chưa chạy

**Giải pháp:**
```bash
# 1. Kiểm tra port 8001
lsof -i :8001

# 2. Nếu port bị chiếm, kill process
kill -9 <PID>

# 3. Khởi động lại OCR service
cd python-ocr && python ocr_server.py
```

### Lỗi: "Module not found"

**Nguyên nhân:** Thiếu Python dependencies

**Giải pháp:**
```bash
cd python-ocr
pip install -r requirements.txt
# Hoặc
pip install paddleocr opencv-python pillow fastapi uvicorn
```

### Lỗi: "Port already in use"

**Giải pháp:**
```bash
# Tìm process đang dùng port 8001
lsof -i :8001

# Kill process
kill -9 <PID>

# Hoặc đổi port trong code
# OCR_SERVER_URL=http://localhost:8002
```

---

## 📝 Sau Khi Khởi Động

1. ✅ OCR service đang chạy tại `http://localhost:8001`
2. ✅ Quay lại trang review document
3. ✅ Click "Số hóa lại"
4. ✅ Document sẽ được xử lý thành công!

---

## 🔄 Auto-Start (Tùy chọn)

Để tự động khởi động OCR service khi start server:

**Mac/Linux:**
```bash
# Thêm vào ~/.bashrc hoặc ~/.zshrc
alias start-ocr='cd /path/to/Aeroeduvision/python-ocr && python ocr_server.py &'
```

**Windows:**
Tạo file `start-ocr.bat`:
```batch
cd python-ocr
python ocr_server.py
```

---

## 💡 Tips

- **Giữ terminal mở** khi OCR service đang chạy
- **Check logs** nếu có lỗi
- **Test với ảnh nhỏ trước** để đảm bảo hoạt động
- **Port 8001** là mặc định, có thể đổi trong `.env`

---

## 📚 Tài Liệu Đầy Đủ

Xem thêm: [OCR_SERVICE_SETUP.md](./OCR_SERVICE_SETUP.md)
