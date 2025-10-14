# Quick Start - OpenCV CRNN OCR

## 🚀 Khởi động nhanh trong 3 bước

### Bước 1: Cài đặt dependencies

```bash
cd python-simulations/ocr-simulation
pip3 install -r requirements.txt
```

### Bước 2: Test pipeline

```bash
python3 test_crnn_model.py
```

Output mong đợi:
```
✅ EAST Text Detector loaded
✅ CRNN Text Recognizer loaded from OpenCV Zoo
🔧 OpenCV CRNN OCR Pipeline initialized
```

### Bước 3: Khởi động API server

```bash
bash start_crnn_api.sh
```

API sẽ chạy tại: http://localhost:8000

## 📝 Test với ảnh

### Command line

```bash
python3 ocr_pipeline_crnn.py path/to/image.jpg
```

### API (với curl)

```bash
curl -X POST "http://localhost:8000/api/ocr/process-sync" \
  -F "file=@student_id.jpg" \
  -F "enable_preprocessing=true"
```

### API (với Python)

```python
import requests

with open('student_id.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        'http://localhost:8000/api/ocr/process-sync',
        files=files
    )
    
result = response.json()
print(result['result']['recognition_results']['full_text'])
```

## 🔧 Tuning parameters

### Tăng độ chính xác

```python
config = CRNNOCRConfig(
    east_confidence_threshold=0.7,      # Cao hơn = chính xác hơn, ít region hơn
    crnn_confidence_threshold=0.5,      # Cao hơn = chỉ lấy kết quả chắc chắn
    enable_preprocessing=True,
    enable_rotation_correction=True,
    enable_noise_removal=True
)
```

### Tăng tốc độ

```python
config = CRNNOCRConfig(
    east_confidence_threshold=0.5,
    crnn_confidence_threshold=0.3,
    enable_preprocessing=True,
    enable_rotation_correction=False,   # Tắt xoay ảnh
    enable_noise_removal=False          # Tắt loại nhiễu
)
```

### Detect nhiều text hơn

```python
config = CRNNOCRConfig(
    east_confidence_threshold=0.1,      # Thấp hơn = detect nhiều hơn
    crnn_confidence_threshold=0.2,      # Thấp hơn = nhận nhiều text hơn
    min_text_size=5                     # Giảm kích thước text tối thiểu
)
```

## 🌐 Switch giữa các OCR modes

```bash
# Mode 1: CRNN (Mặc định - Độ chính xác cao nhất)
export OCR_MODE=crnn
python3 main.py

# Mode 2: EAST + Tesseract (Hỗ trợ nhiều ngôn ngữ)
export OCR_MODE=east
python3 main.py

# Mode 3: Tesseract Only (General purpose)
export OCR_MODE=tesseract
python3 main.py

# Mode 4: Simulation (Demo/Testing)
export OCR_MODE=simulation
python3 main.py
```

## 📊 Xem kết quả

### Browser
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health

### JSON Output
```json
{
  "detection_results": {
    "total_regions": 12,
    "text_regions": [...],
    "detection_method": "EAST + CRNN (OpenCV Zoo)"
  },
  "recognition_results": {
    "full_text": "STUDENT ID\nJohn Doe\n...",
    "total_chars": 250
  },
  "extracted_data": {
    "document_type": "student_id",
    "fields": {
      "student_id": {"value": "12345678", "confidence": 0.85},
      "name": {"value": "John Doe", "confidence": 0.85}
    }
  }
}
```

## ❓ Troubleshooting

### Model không tải được
```bash
# Kiểm tra kết nối internet (model tự động tải)
# Hoặc tải thủ công:
cd models
wget https://github.com/opencv/opencv_zoo/raw/main/models/text_recognition_crnn/text_recognition_CRNN_EN_2023feb_fp16.onnx
```

### EAST model không có
```bash
bash download_east_model.sh
```

### OpenCV issues
```bash
pip3 uninstall opencv-python opencv-contrib-python
pip3 install opencv-python opencv-contrib-python
```

### Permission denied
```bash
chmod +x start_crnn_api.sh test_crnn_model.py
```

## 📚 Tài liệu đầy đủ

Xem `OCR_CRNN_GUIDE.md` để biết thêm chi tiết về:
- API endpoints đầy đủ
- Parameter tuning chi tiết
- Performance optimization
- Architecture details
- Model information

## 🎯 Use Cases

### ✅ Phù hợp với CRNN
- Student ID cards (tiếng Anh)
- Passport (tiếng Anh)
- License plates
- English documents
- Forms with printed text

### ⚠️ Nên dùng EAST + Tesseract
- Vietnamese documents
- Mixed language documents
- Handwritten text
- Special characters

## 💡 Tips

1. **Chất lượng ảnh**: Ảnh càng rõ, kết quả càng tốt (tối thiểu 500x500)
2. **Lighting**: Ánh sáng đều, không bị chói hoặc tối
3. **Góc chụp**: Vuông góc, không bị nghiêng quá 15 độ
4. **Format**: JPG hoặc PNG, dưới 10MB
5. **Background**: Nền đơn giản, tương phản với chữ

---

**Happy OCR-ing! 🎉**


