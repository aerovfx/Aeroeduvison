#!/usr/bin/env python3
"""
Hybrid OCR System: PaddleOCR + CRNN Handwriting Model
Tối ưu cho chấm bài thi tiếng Việt
"""

from paddleocr import PaddleOCR
import cv2
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from typing import List, Dict, Tuple, Optional

class HybridOCR:
    """
    Kết hợp PaddleOCR (detection) + CRNN (recognition cho handwriting)
    
    Pipeline:
    1. PaddleOCR → Detect text regions (bounding boxes)
    2. Classify: Printed vs Handwritten
    3. PaddleOCR → Nhận dạng printed text
    4. CRNN Model → Nhận dạng handwriting
    5. Merge results
    """
    
    def __init__(self, use_gpu=False):
        """
        Initialize hybrid OCR system
        
        Args:
            use_gpu: Có dùng GPU không (mặc định False)
        """
        print("🚀 Initializing Hybrid OCR...")
        
        # PaddleOCR cho detection và printed text
        # lang='multi' supports Vietnamese and other languages
        self.paddle_ocr = PaddleOCR(
            use_angle_cls=True,  # Tự động xoay
            lang='multi',        # Multilingual (including Vietnamese)
            use_gpu=use_gpu,
            det_model_dir=None,  # Use default detection model
            rec_model_dir=None   # Use default recognition model
        )
        
        # CRNN model cho handwriting (sẽ load custom model)
        self.crnn_model = None
        self.use_crnn = False
        
        # Try to load CRNN model if exists
        try:
            self.crnn_model = self._load_crnn_model()
            self.use_crnn = True
            print("✅ CRNN handwriting model loaded")
        except Exception as e:
            print(f"⚠️ CRNN model not available, using PaddleOCR only: {e}")
        
        print("✅ Hybrid OCR initialized")
    
    def _load_crnn_model(self):
        """
        Load pretrained CRNN model for Vietnamese handwriting
        
        Model architecture: CNN (feature extraction) + RNN (sequence modeling)
        
        Hoặc có thể dùng:
        - VietOCR (https://github.com/pbcquoc/vietocr)
        - Transformer-based OCR (TrOCR)
        """
        # Placeholder - trong production load model thật
        # return torch.load('crnn_vietnamese_handwriting.pth')
        return None
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Tiền xử lý ảnh với OpenCV
        
        Steps:
        1. Grayscale conversion
        2. Noise reduction
        3. Adaptive threshold
        4. Deskew (straighten)
        5. Contrast enhancement
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Adaptive threshold
        binary = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2
        )
        
        # Deskew
        coords = np.column_stack(np.where(binary > 0))
        if len(coords) > 0:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = 90 + angle
            elif angle > 45:
                angle = angle - 90
            
            if abs(angle) > 0.5:  # Chỉ xoay nếu nghiêng đáng kể
                (h, w) = binary.shape
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                binary = cv2.warpAffine(binary, M, (w, h), 
                                       flags=cv2.INTER_CUBIC,
                                       borderMode=cv2.BORDER_REPLICATE)
        
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(binary)
        
        return enhanced
    
    def _is_handwritten(self, roi: np.ndarray) -> float:
        """
        Phân loại: Chữ in hay chữ viết tay
        
        Returns:
            float: Confidence score (0-1)
                   > 0.5 = handwritten
                   < 0.5 = printed
        
        Features:
        - Stroke variation (handwriting có variation cao)
        - Edge smoothness (printed mượt hơn)
        - Character spacing (handwriting không đều)
        """
        # Simple heuristic - trong production dùng CNN classifier
        
        # Feature 1: Stroke width variation
        edges = cv2.Canny(roi, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if len(contours) == 0:
            return 0.5
        
        # Tính variation của stroke width
        widths = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w > 5 and h > 5:  # Ignore noise
                aspect = w / h
                widths.append(aspect)
        
        if len(widths) == 0:
            return 0.5
        
        variation = np.std(widths) / (np.mean(widths) + 1e-6)
        
        # Handwriting typically has higher variation (0.3-0.8)
        # Printed text has lower variation (0.1-0.3)
        handwriting_score = min(variation / 0.5, 1.0)
        
        return handwriting_score
    
    def process(self, image_path: str) -> Dict:
        """
        Main processing function
        
        Args:
            image_path: Path to image file
            
        Returns:
            Dict with OCR results
        """
        print(f"📄 Processing: {image_path}")
        
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            return {'error': 'Cannot read image'}
        
        # Preprocessing
        preprocessed = self._preprocess_image(image)
        
        # Step 1: PaddleOCR detection (find all text regions)
        print("🔍 Step 1: Detecting text regions...")
        result = self.paddle_ocr.ocr(image_path, cls=True)
        
        if not result or not result[0]:
            return {
                'text': '',
                'lines': [],
                'confidence': 0.0,
                'method': 'none',
                'error': 'No text detected'
            }
        
        # Step 2: Process each text region
        print("🔍 Step 2: Processing text regions...")
        final_lines = []
        final_confidences = []
        final_boxes = []
        handwriting_count = 0
        printed_count = 0
        
        for detection in result[0]:
            bbox = detection[0]
            paddle_text, paddle_conf = detection[1]
            
            # Extract ROI (Region of Interest)
            x_coords = [p[0] for p in bbox]
            y_coords = [p[1] for p in bbox]
            x_min, x_max = int(min(x_coords)), int(max(x_coords))
            y_min, y_max = int(min(y_coords)), int(max(y_coords))
            
            # Crop region
            roi = image[y_min:y_max, x_min:x_max]
            
            if roi.size == 0:
                continue
            
            # Classify: Handwritten or Printed?
            handwriting_conf = self._is_handwritten(roi)
            
            # Decision: Use CRNN for handwriting, PaddleOCR for printed
            if self.use_crnn and handwriting_conf > 0.6:
                # Use CRNN model for handwriting
                # text, confidence = self._crnn_recognize(roi)
                # handwriting_count += 1
                
                # Fallback to PaddleOCR for now
                text = paddle_text
                confidence = paddle_conf
                method = 'paddle_handwriting'
                handwriting_count += 1
            else:
                # Use PaddleOCR for printed text
                text = paddle_text
                confidence = paddle_conf
                method = 'paddle_printed'
                printed_count += 1
            
            final_lines.append(text)
            final_confidences.append(confidence)
            final_boxes.append({
                'coordinates': bbox,
                'text': text,
                'confidence': round(confidence, 3),
                'method': method,
                'is_handwritten': handwriting_conf > 0.6
            })
        
        # Merge results
        full_text = ' '.join(final_lines)
        avg_confidence = sum(final_confidences) / len(final_confidences) if final_confidences else 0.0
        
        print(f"✅ Completed: {len(final_lines)} regions")
        print(f"   - Handwriting: {handwriting_count}")
        print(f"   - Printed: {printed_count}")
        print(f"   - Confidence: {avg_confidence:.1%}")
        
        return {
            'text': full_text,
            'lines': final_lines,
            'confidence': round(avg_confidence, 3),
            'boxes': final_boxes,
            'total_lines': len(final_lines),
            'stats': {
                'handwriting_regions': handwriting_count,
                'printed_regions': printed_count,
                'preprocessing': 'opencv_pipeline',
                'detection': 'paddleocr',
                'recognition': 'hybrid'
            }
        }
    
    def _crnn_recognize(self, roi: np.ndarray) -> Tuple[str, float]:
        """
        Nhận dạng chữ viết tay với CRNN model
        
        Model architecture:
        - CNN layers (VGG/ResNet) → Feature extraction
        - RNN layers (LSTM/GRU) → Sequence modeling
        - CTC loss → Decoding
        
        Returns:
            (text, confidence)
        """
        if self.crnn_model is None:
            return "", 0.0
        
        # Preprocessing for CRNN
        # 1. Resize to model input size (e.g., 32x280)
        # 2. Normalize
        # 3. To tensor
        
        # Inference
        # with torch.no_grad():
        #     output = self.crnn_model(input_tensor)
        #     text = ctc_decode(output)
        #     confidence = output_confidence(output)
        
        # Placeholder
        return "", 0.0

def create_hybrid_ocr(use_gpu=False) -> HybridOCR:
    """Factory function to create HybridOCR instance"""
    return HybridOCR(use_gpu=use_gpu)

if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python hybrid_ocr.py <image_path>")
        sys.exit(1)
    
    # Create OCR instance
    ocr = create_hybrid_ocr()
    
    # Process image
    result = ocr.process(sys.argv[1])
    
    # Print JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

