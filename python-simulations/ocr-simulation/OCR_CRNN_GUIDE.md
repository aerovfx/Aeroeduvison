# OCR với OpenCV Zoo CRNN Model

## Tổng quan

Pipeline OCR mới sử dụng **OpenCV Zoo CRNN Model** - một trong những model text recognition chính xác nhất hiện nay.

### Công nghệ

- **Text Detection**: EAST (Efficient and Accurate Scene Text detector)
- **Text Recognition**: CRNN (Convolutional Recurrent Neural Network) từ OpenCV Zoo
- **Model**: `text_recognition_CRNN_EN_2023feb_fp16.onnx`
- **Source**: [opencv/opencv_zoo](https://github.com/opencv/opencv_zoo/tree/main/models/text_recognition_crnn)

## Ưu điểm

✅ **Độ chính xác cao**: CRNN được train trên dataset lớn, cho kết quả tốt hơn Tesseract  
✅ **Tốc độ nhanh**: Sử dụng ONNX runtime, tối ưu cho inference  
✅ **Không cần cài đặt Tesseract**: Hoàn toàn dựa trên OpenCV  
✅ **Hỗ trợ tiếng Anh tốt**: Đặc biệt phù hợp cho ID card, passport, student ID  
✅ **Auto-download model**: Tự động tải model khi chạy lần đầu  

## Cài đặt

### 1. Yêu cầu hệ thống

```bash
- Python 3.8+
- OpenCV 4.5+
- NumPy
```

### 2. Cài đặt dependencies

```bash
cd python-simulations/ocr-simulation
pip3 install -r requirements.txt
```

### 3. Tải EAST model (nếu chưa có)

```bash
bash download_east_model.sh
```

CRNN model sẽ tự động tải về khi chạy lần đầu.

## Sử dụng

### Cách 1: Chạy API Server

```bash
# Sử dụng script có sẵn
bash start_crnn_api.sh

# Hoặc set environment variable
export OCR_MODE=crnn
python3 main.py
```

API sẽ chạy tại: `http://localhost:8000`

### Cách 2: Sử dụng trực tiếp trong Python

```python
from ocr_pipeline_crnn import process_uploaded_image, CRNNOCRConfig

# Đọc ảnh
with open('image.jpg', 'rb') as f:
    image_data = f.read()

# Cấu hình
config = CRNNOCRConfig(
    east_confidence_threshold=0.5,      # Ngưỡng tin cậy cho EAST
    crnn_confidence_threshold=0.3,      # Ngưỡng tin cậy cho CRNN
    enable_preprocessing=True,           # Bật tiền xử lý ảnh
    enable_rotation_correction=True,     # Tự động xoay ảnh
    enable_noise_removal=True            # Loại bỏ nhiễu
)

# Xử lý
result = process_uploaded_image(image_data, 'image.jpg', config)

# Kết quả
print(f"Detected: {result['detection_results']['total_regions']} regions")
print(f"Full text: {result['recognition_results']['full_text']}")
print(f"Extracted data: {result['extracted_data']['fields']}")
```

### Cách 3: Test từ command line

```bash
python3 ocr_pipeline_crnn.py path/to/image.jpg
```

## API Endpoints

### 1. Upload và xử lý đồng bộ

```bash
curl -X POST "http://localhost:8000/api/ocr/process-sync" \
  -F "file=@student_id.jpg" \
  -F "enable_preprocessing=true" \
  -F "min_confidence=0.3"
```

### 2. Upload và xử lý bất đồng bộ

```bash
# Upload
curl -X POST "http://localhost:8000/api/ocr/upload" \
  -F "file=@student_id.jpg"

# Kết quả sẽ trả về task_id
# Kiểm tra trạng thái
curl "http://localhost:8000/api/ocr/status/{task_id}"
```

### 3. Sử dụng advanced endpoint

```bash
curl -X POST "http://localhost:8000/api/ocr/advanced" \
  -F "file=@student_id.jpg"
```

## Cấu trúc Output

```json
{
  "filename": "student_id.jpg",
  "detection_results": {
    "total_regions": 15,
    "text_regions": [
      {
        "region_id": 0,
        "bbox": {"x": 10, "y": 20, "width": 100, "height": 30},
        "text": "student id",
        "confidence": 0.95,
        "language": "en",
        "method": "CRNN (OpenCV Zoo)"
      }
    ],
    "average_confidence": 0.87,
    "detection_method": "EAST + CRNN (OpenCV Zoo)"
  },
  "recognition_results": {
    "full_text": "STUDENT ID\nJohn Doe\n12345678\n...",
    "total_chars": 250,
    "total_lines": 12
  },
  "extracted_data": {
    "document_type": "student_id",
    "fields": {
      "student_id": {"value": "12345678", "confidence": 0.85},
      "name": {"value": "John Doe", "confidence": 0.85},
      "university": {"value": "Example University", "confidence": 0.85}
    },
    "total_fields_extracted": 3
  },
  "quality_metrics": {
    "average_confidence": 0.87,
    "total_regions": 15,
    "extraction_success_rate": 0.2
  }
}
```

## So sánh các OCR Modes

| Mode | Detection | Recognition | Độ chính xác | Tốc độ | Use Case |
|------|-----------|-------------|--------------|--------|----------|
| **crnn** | EAST | OpenCV CRNN | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | English documents, IDs |
| **east** | EAST | Tesseract | ⭐⭐⭐⭐ | ⭐⭐⭐ | Mixed languages |
| **tesseract** | Contours | Tesseract | ⭐⭐⭐ | ⭐⭐ | General purpose |
| **simulation** | Mock | Mock | ⭐⭐ | ⭐⭐⭐⭐⭐ | Demo/Testing |

## Tuning Parameters

### Detection (EAST)

```python
config = CRNNOCRConfig(
    east_confidence_threshold=0.5,  # Giảm để detect nhiều hơn (0.1-0.9)
    east_nms_threshold=0.4,         # Non-max suppression (0.2-0.6)
    min_text_size=10                # Kích thước text tối thiểu (pixels)
)
```

### Recognition (CRNN)

```python
config = CRNNOCRConfig(
    crnn_confidence_threshold=0.3,  # Ngưỡng tin cậy (0.1-0.9)
    crnn_input_width=100,           # Chiều rộng input CRNN
    crnn_input_height=32            # Chiều cao input CRNN
)
```

### Preprocessing

```python
config = CRNNOCRConfig(
    enable_preprocessing=True,       # Bật tiền xử lý
    enable_rotation_correction=True, # Tự động xoay ảnh
    enable_noise_removal=True        # Loại bỏ nhiễu
)
```

## Troubleshooting

### 1. Model không tải được

**Lỗi**: `Failed to download CRNN model`

**Giải pháp**:
```bash
# Tải thủ công
cd python-simulations/ocr-simulation/models
wget https://github.com/opencv/opencv_zoo/raw/main/models/text_recognition_crnn/text_recognition_CRNN_EN_2023feb_fp16.onnx
```

### 2. OpenCV không hỗ trợ ONNX

**Lỗi**: `OpenCV was built without ONNX support`

**Giải pháp**:
```bash
# Cài lại OpenCV với ONNX support
pip3 uninstall opencv-python
pip3 install opencv-python opencv-contrib-python
```

### 3. Độ chính xác thấp

**Giải pháp**:
- Tăng chất lượng ảnh đầu vào
- Điều chỉnh `enable_preprocessing=True`
- Giảm `crnn_confidence_threshold` để nhận nhiều kết quả hơn
- Tăng `east_confidence_threshold` để detect chính xác hơn

### 4. Không detect được text

**Giải pháp**:
- Giảm `east_confidence_threshold` xuống 0.1-0.3
- Kiểm tra ảnh có text rõ ràng không
- Thử tăng độ tương phản của ảnh

## Performance Tips

1. **Ảnh đầu vào**: 
   - Độ phân giải tối thiểu: 500x500 pixels
   - Format: JPG, PNG
   - Kích thước tối đa: 10MB

2. **Tối ưu tốc độ**:
   - Giảm `crnn_input_width` xuống 80 (mặc định 100)
   - Tắt `enable_rotation_correction` nếu ảnh không bị nghiêng
   - Tắt `enable_noise_removal` nếu ảnh đã clean

3. **Tối ưu độ chính xác**:
   - Bật tất cả preprocessing options
   - Tăng `crnn_input_width` lên 120-150
   - Giảm `crnn_confidence_threshold` xuống 0.2

## Model Information

### CRNN Model Details

- **File**: `text_recognition_CRNN_EN_2023feb_fp16.onnx`
- **Size**: ~1.3 MB
- **Input**: (1, 1, 32, 100) - grayscale image
- **Output**: (sequence_length, 1, num_classes) - character probabilities
- **Charset**: `0123456789abcdefghijklmnopqrstuvwxyz`
- **Framework**: ONNX (optimized for OpenCV DNN)
- **Precision**: FP16 (half precision)

### EAST Model Details

- **File**: `frozen_east_text_detection.pb`
- **Size**: ~100 MB
- **Input**: (N, 3, H, W) - RGB image (H, W must be multiples of 32)
- **Output**: Text region bounding boxes with confidence scores
- **Framework**: TensorFlow frozen graph

## Next Steps

1. ✅ Tích hợp CRNN model vào pipeline
2. ✅ Auto-download model
3. ✅ API endpoints
4. 🔄 Thêm hỗ trợ tiếng Việt (cần model CRNN Vietnamese)
5. 🔄 Batch processing
6. 🔄 GPU acceleration

## References

- [OpenCV Zoo CRNN Model](https://github.com/opencv/opencv_zoo/tree/main/models/text_recognition_crnn)
- [EAST Paper](https://arxiv.org/abs/1704.03155)
- [CRNN Paper](https://arxiv.org/abs/1507.05717)
- [OpenCV DNN Module](https://docs.opencv.org/4.x/d2/d58/tutorial_table_of_content_dnn.html)

## Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs tại console output
2. Xem API docs tại `http://localhost:8000/docs`
3. Kiểm tra file requirements.txt đã cài đủ dependencies chưa

---

**Version**: 1.0.0  
**Last Updated**: 2024-10-12  
**Author**: AI Assistant


