"""
Advanced OCR Pipeline using OpenCV Zoo CRNN Model
- Text Detection: EAST Detector
- Text Recognition: CRNN (OpenCV Zoo)
- High accuracy for English text recognition

Model: text_recognition_CRNN_EN_2023feb_fp16.onnx
Source: https://github.com/opencv/opencv_zoo/tree/main/models/text_recognition_crnn
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass
import re
import os
import urllib.request

# Model URLs
CRNN_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/text_recognition_crnn/text_recognition_CRNN_EN_2023feb_fp16.onnx"
EAST_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "frozen_east_text_detection.pb")
CRNN_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "text_recognition_CRNN_EN_2023feb_fp16.onnx")

# Character set for CRNN model (English)
CRNN_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz"


@dataclass
class CRNNOCRConfig:
    """Configuration for CRNN OCR pipeline"""
    # Detection
    east_confidence_threshold: float = 0.5
    east_nms_threshold: float = 0.4
    min_text_size: int = 10
    
    # Recognition
    crnn_confidence_threshold: float = 0.3
    crnn_input_width: int = 100
    crnn_input_height: int = 32
    
    # Preprocessing
    enable_preprocessing: bool = True
    enable_rotation_correction: bool = True
    enable_noise_removal: bool = True
    
    # ID Extraction
    extract_patterns: bool = True


class CRNNOCRPipeline:
    """
    Advanced OCR Pipeline using OpenCV Zoo CRNN
    - EAST for text detection
    - CRNN for text recognition
    - Pattern-based data extraction
    """
    
    def __init__(self, config: CRNNOCRConfig = None):
        self.config = config or CRNNOCRConfig()
        self.east_model = None
        self.crnn_model = None
        
        # Load EAST model
        if os.path.exists(EAST_MODEL_PATH):
            try:
                self.east_model = cv2.dnn.readNet(EAST_MODEL_PATH)
                print("✅ EAST Text Detector loaded")
            except Exception as e:
                print(f"⚠️  EAST model error: {e}")
        else:
            print("⚠️  EAST model not found at:", EAST_MODEL_PATH)
        
        # Load CRNN model
        self._load_crnn_model()
        
        print("🔧 OpenCV CRNN OCR Pipeline initialized")
    
    def _load_crnn_model(self):
        """Load or download CRNN model"""
        
        # Download if not exists
        if not os.path.exists(CRNN_MODEL_PATH):
            print("📥 Downloading CRNN model from OpenCV Zoo...")
            try:
                os.makedirs(os.path.dirname(CRNN_MODEL_PATH), exist_ok=True)
                urllib.request.urlretrieve(CRNN_MODEL_URL, CRNN_MODEL_PATH)
                print("✅ CRNN model downloaded successfully")
            except Exception as e:
                print(f"❌ Failed to download CRNN model: {e}")
                return
        
        # Load model
        try:
            self.crnn_model = cv2.dnn.readNetFromONNX(CRNN_MODEL_PATH)
            print("✅ CRNN Text Recognizer loaded from OpenCV Zoo")
        except Exception as e:
            print(f"❌ Failed to load CRNN model: {e}")
    
    # ==========================================
    # PREPROCESSING
    # ==========================================
    
    def preprocess_image(
        self, 
        image: np.ndarray, 
        progress_callback: Optional[Callable] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Enhanced image preprocessing"""
        
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 10, "message": "Image Preprocessing"})
        
        original = image.copy()
        
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        if self.config.enable_noise_removal:
            if progress_callback:
                progress_callback({"step": "preprocessing", "progress": 13, "message": "Noise removal"})
            gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Enhance contrast
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 16, "message": "Contrast enhancement"})
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Skew correction
        if self.config.enable_rotation_correction:
            if progress_callback:
                progress_callback({"step": "preprocessing", "progress": 18, "message": "Skew correction"})
            enhanced = self._correct_skew(enhanced)
        
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 20, "message": "Preprocessing complete"})
        
        return original, enhanced
    
    def _correct_skew(self, image: np.ndarray) -> np.ndarray:
        """Detect and correct image skew"""
        coords = np.column_stack(np.where(image > 0))
        if len(coords) == 0:
            return image
        
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        
        if abs(angle) > 0.5:
            (h, w) = image.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            return cv2.warpAffine(
                image, M, (w, h), 
                flags=cv2.INTER_CUBIC, 
                borderMode=cv2.BORDER_REPLICATE
            )
        
        return image
    
    # ==========================================
    # TEXT DETECTION (EAST)
    # ==========================================
    
    def detect_text_east(
        self, 
        image: np.ndarray, 
        progress_callback: Optional[Callable] = None
    ) -> List[Tuple[int, int, int, int]]:
        """Detect text regions using EAST"""
        
        if progress_callback:
            progress_callback({"step": "detection", "progress": 30, "message": "EAST text detection"})
        
        if self.east_model is None:
            return self._detect_text_contours(image)
        
        (H, W) = image.shape[:2] if len(image.shape) == 2 else image.shape[:2]
        
        # EAST requires dimensions to be multiples of 32
        new_H = (H // 32) * 32
        new_W = (W // 32) * 32
        rW = W / float(new_W)
        rH = H / float(new_H)
        
        # Prepare input
        if len(image.shape) == 2:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            image_rgb = image
        
        blob = cv2.dnn.blobFromImage(
            image_rgb, 1.0, (new_W, new_H),
            (123.68, 116.78, 103.94), 
            swapRB=True, crop=False
        )
        
        # Forward pass
        self.east_model.setInput(blob)
        (scores, geometry) = self.east_model.forward([
            "feature_fusion/Conv_7/Sigmoid",
            "feature_fusion/concat_3"
        ])
        
        # Decode predictions
        boxes = self._decode_east_predictions(scores, geometry)
        
        # Scale back to original size
        scaled_boxes = []
        for (x1, y1, x2, y2) in boxes:
            x1 = int(x1 * rW)
            y1 = int(y1 * rH)
            x2 = int(x2 * rW)
            y2 = int(y2 * rH)
            scaled_boxes.append((x1, y1, x2, y2))
        
        if progress_callback:
            progress_callback({
                "step": "detection", 
                "progress": 40, 
                "message": f"Detected {len(scaled_boxes)} text regions"
            })
        
        print(f"🔍 EAST detected {len(scaled_boxes)} text regions")
        return scaled_boxes
    
    def _decode_east_predictions(self, scores, geometry):
        """Decode EAST model predictions"""
        (numRows, numCols) = scores.shape[2:4]
        rects = []
        confidences = []
        
        for y in range(numRows):
            scoresData = scores[0, 0, y]
            xData0 = geometry[0, 0, y]
            xData1 = geometry[0, 1, y]
            xData2 = geometry[0, 2, y]
            xData3 = geometry[0, 3, y]
            
            for x in range(numCols):
                if scoresData[x] < self.config.east_confidence_threshold:
                    continue
                
                (offsetX, offsetY) = (x * 4.0, y * 4.0)
                h = xData0[x] + xData2[x]
                w = xData1[x] + xData3[x]
                
                endX = int(offsetX + w)
                endY = int(offsetY + h)
                startX = int(offsetX - xData1[x])
                startY = int(offsetY - xData0[x])
                
                rects.append((startX, startY, endX, endY))
                confidences.append(float(scoresData[x]))
        
        # Apply NMS
        if len(rects) > 0:
            boxes = self._non_max_suppression(np.array(rects), confidences)
            return boxes
        
        return []
    
    def _non_max_suppression(self, boxes, confidences):
        """Apply Non-Maximum Suppression"""
        if len(boxes) == 0:
            return []
        
        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]
        
        areas = (x2 - x1 + 1) * (y2 - y1 + 1)
        indices = np.argsort(confidences)[::-1]
        
        keep = []
        while len(indices) > 0:
            i = indices[0]
            keep.append(i)
            
            xx1 = np.maximum(x1[i], x1[indices[1:]])
            yy1 = np.maximum(y1[i], y1[indices[1:]])
            xx2 = np.minimum(x2[i], x2[indices[1:]])
            yy2 = np.minimum(y2[i], y2[indices[1:]])
            
            w = np.maximum(0, xx2 - xx1 + 1)
            h = np.maximum(0, yy2 - yy1 + 1)
            
            overlap = (w * h) / areas[indices[1:]]
            indices = indices[np.where(overlap <= self.config.east_nms_threshold)[0] + 1]
        
        return [tuple(boxes[i]) for i in keep]
    
    def _detect_text_contours(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Fallback: Contour-based detection"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        boxes = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w > self.config.min_text_size and h > self.config.min_text_size:
                boxes.append((x, y, x + w, y + h))
        
        return boxes
    
    # ==========================================
    # TEXT RECOGNITION (CRNN)
    # ==========================================
    
    def recognize_text_crnn(
        self,
        image: np.ndarray,
        boxes: List[Tuple],
        progress_callback: Optional[Callable] = None
    ) -> List[Dict]:
        """Recognize text using OpenCV Zoo CRNN model"""
        
        if progress_callback:
            progress_callback({"step": "recognition", "progress": 50, "message": "CRNN text recognition"})
        
        if self.crnn_model is None:
            print("⚠️  CRNN model not available, cannot recognize text")
            return []
        
        text_regions = []
        
        print(f"🔄 Starting CRNN recognition on {len(boxes)} boxes...")
        
        for idx, (x1, y1, x2, y2) in enumerate(boxes):
            # Add padding
            padding = 5
            x1 = max(0, x1 - padding)
            y1 = max(0, y1 - padding)
            x2 = min(image.shape[1], x2 + padding)
            y2 = min(image.shape[0], y2 + padding)
            
            # Extract ROI
            roi = image[y1:y2, x1:x2]
            
            if roi.size == 0:
                continue
            
            try:
                # Recognize text with CRNN
                text, confidence = self._recognize_roi_with_crnn(roi)
                
                if text and confidence >= self.config.crnn_confidence_threshold:
                    text_regions.append({
                        'region_id': idx,
                        'bbox': {
                            'x': int(x1),
                            'y': int(y1),
                            'width': int(x2 - x1),
                            'height': int(y2 - y1)
                        },
                        'text': text,
                        'confidence': round(confidence, 3),
                        'language': 'en',
                        'method': 'CRNN (OpenCV Zoo)'
                    })
                    
                    if idx < 5:
                        print(f"  Region {idx}: '{text}' (conf: {confidence:.2f})")
            
            except Exception as e:
                print(f"⚠️  Error recognizing region {idx}: {e}")
                continue
            
            # Progress update
            if progress_callback and (idx + 1) % 10 == 0:
                progress = 50 + int((idx + 1) / len(boxes) * 20)
                progress_callback({
                    "step": "recognition",
                    "progress": progress,
                    "message": f"Recognized {idx + 1}/{len(boxes)} regions"
                })
        
        if progress_callback:
            progress_callback({
                "step": "recognition",
                "progress": 70,
                "message": f"CRNN recognition complete: {len(text_regions)} texts"
            })
        
        print(f"📝 CRNN recognized {len(text_regions)} text regions")
        return text_regions
    
    def _recognize_roi_with_crnn(self, roi: np.ndarray) -> Tuple[str, float]:
        """Recognize text in ROI using CRNN model"""
        
        # Ensure grayscale
        if len(roi.shape) == 3:
            roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        # Resize to CRNN input size
        roi_resized = cv2.resize(
            roi, 
            (self.config.crnn_input_width, self.config.crnn_input_height),
            interpolation=cv2.INTER_CUBIC
        )
        
        # Normalize
        roi_normalized = roi_resized.astype(np.float32) / 255.0
        
        # Create blob (1, 1, height, width)
        blob = cv2.dnn.blobFromImage(
            roi_normalized,
            scalefactor=1.0,
            size=(self.config.crnn_input_width, self.config.crnn_input_height),
            mean=0,
            swapRB=False,
            crop=False
        )
        
        # Forward pass
        self.crnn_model.setInput(blob)
        output = self.crnn_model.forward()
        
        # Decode output
        text, confidence = self._decode_crnn_output(output)
        
        return text, confidence
    
    def _decode_crnn_output(self, output: np.ndarray) -> Tuple[str, float]:
        """
        Decode CRNN output using CTC decoding
        Output shape: (sequence_length, batch_size, num_classes)
        """
        
        # Get output shape
        if len(output.shape) == 3:
            # Shape: (sequence_length, batch_size, num_classes)
            sequence_length = output.shape[0]
        elif len(output.shape) == 2:
            # Shape: (sequence_length, num_classes)
            sequence_length = output.shape[0]
            output = output[np.newaxis, :, :]
        else:
            return "", 0.0
        
        # Get predictions for each time step
        predictions = []
        confidences = []
        
        for t in range(sequence_length):
            if len(output.shape) == 3:
                probs = output[t, 0, :]
            else:
                probs = output[t, :]
            
            # Get character with max probability
            char_idx = np.argmax(probs)
            confidence = probs[char_idx]
            
            # CTC blank label is typically 0 or last index
            if char_idx > 0 and char_idx <= len(CRNN_CHARSET):
                predictions.append(char_idx - 1)
                confidences.append(confidence)
        
        # CTC decoding: remove consecutive duplicates
        decoded = []
        prev_idx = -1
        for idx in predictions:
            if idx != prev_idx:
                decoded.append(idx)
                prev_idx = idx
        
        # Convert to text
        text = ''.join([CRNN_CHARSET[idx] for idx in decoded if 0 <= idx < len(CRNN_CHARSET)])
        
        # Calculate average confidence
        avg_confidence = np.mean(confidences) if confidences else 0.0
        
        return text, float(avg_confidence)
    
    # ==========================================
    # DATA EXTRACTION
    # ==========================================
    
    def extract_data_fields(
        self,
        full_text: str,
        text_regions: List[Dict],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Extract structured data using pattern matching"""
        
        if progress_callback:
            progress_callback({"step": "extraction", "progress": 80, "message": "Data extraction"})
        
        extracted_fields = {}
        
        # Patterns for common fields
        patterns = {
            'student_id': [
                r'\b([A-Z0-9]{8,12})\b',
                r'ID[:\s]+([A-Z0-9]+)'
            ],
            'name': [
                r'Name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)',
            ],
            'date_of_birth': [
                r'DOB[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            ],
            'university': [
                r'([A-Z][a-z]+ University)',
            ],
            'phone': [
                r'(\d{3}[-\s]?\d{3}[-\s]?\d{4})',
            ],
            'email': [
                r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
            ]
        }
        
        for field_name, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    extracted_fields[field_name] = {
                        'value': value,
                        'confidence': 0.85,
                        'pattern': pattern
                    }
                    break
        
        if progress_callback:
            progress_callback({"step": "extraction", "progress": 90, "message": "Extraction complete"})
        
        # Detect document type
        document_type = "unknown"
        text_upper = full_text.upper()
        if 'STUDENT' in text_upper or 'UNIVERSITY' in text_upper:
            document_type = "student_id"
        elif 'ID CARD' in text_upper or 'IDENTITY' in text_upper:
            document_type = "id_card"
        
        return {
            'document_type': document_type,
            'fields': extracted_fields,
            'total_fields_extracted': len(extracted_fields)
        }
    
    # ==========================================
    # MAIN PIPELINE
    # ==========================================
    
    def process_image(
        self,
        image_data: bytes,
        filename: str,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Complete OCR Pipeline with OpenCV Zoo CRNN:
        1. Preprocessing
        2. Text Detection (EAST)
        3. Text Recognition (CRNN)
        4. Data Extraction
        """
        
        print(f"🚀 Processing with OpenCV CRNN: {filename}")
        
        # Decode image
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        # Step 1: Preprocessing
        original, preprocessed = self.preprocess_image(image, progress_callback)
        
        # Step 2: Text Detection (EAST)
        boxes = self.detect_text_east(original, progress_callback)
        
        # Step 3: Text Recognition (CRNN)
        text_regions = self.recognize_text_crnn(preprocessed, boxes, progress_callback)
        
        # Step 4: Extract full text
        full_text = '\n'.join([
            r['text'] for r in sorted(
                text_regions, 
                key=lambda x: (x['bbox']['y'], x['bbox']['x'])
            )
        ])
        
        # Step 5: Data Extraction
        extracted_data = self.extract_data_fields(full_text, text_regions, progress_callback)
        
        # Calculate metrics
        avg_confidence = np.mean([r['confidence'] for r in text_regions]) if text_regions else 0.0
        
        result = {
            'filename': filename,
            'detection_results': {
                'total_regions': len(text_regions),
                'text_regions': text_regions,
                'average_confidence': round(avg_confidence, 3),
                'detection_method': 'EAST + CRNN (OpenCV Zoo)'
            },
            'recognition_results': {
                'full_text': full_text,
                'total_chars': len(full_text),
                'total_lines': len(full_text.split('\n'))
            },
            'extracted_data': extracted_data,
            'quality_metrics': {
                'average_confidence': round(avg_confidence, 3),
                'total_regions': len(text_regions),
                'extraction_success_rate': round(
                    len(extracted_data['fields']) / max(len(text_regions), 1), 3
                )
            }
        }
        
        if progress_callback:
            progress_callback({"step": "complete", "progress": 100, "message": "Processing complete"})
        
        print(f"✅ OpenCV CRNN processing completed: {filename}")
        return result


def process_uploaded_image(
    image_data: bytes,
    filename: str,
    config: CRNNOCRConfig = None,
    progress_callback: Optional[Callable] = None
) -> Dict[str, Any]:
    """Main entry point for OpenCV CRNN OCR"""
    
    pipeline = CRNNOCRPipeline(config)
    result = pipeline.process_image(image_data, filename, progress_callback)
    
    return result


# Test function
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python ocr_pipeline_crnn.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    # Read image
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    # Process
    config = CRNNOCRConfig(
        enable_preprocessing=True,
        east_confidence_threshold=0.5,
        crnn_confidence_threshold=0.3
    )
    
    result = process_uploaded_image(image_data, image_path, config)
    
    # Print results
    print("\n" + "="*60)
    print("📊 OPENCV CRNN OCR RESULTS")
    print("="*60)
    print(f"\n🔍 Detection:")
    print(f"  Method: {result['detection_results']['detection_method']}")
    print(f"  Total regions: {result['detection_results']['total_regions']}")
    print(f"  Average confidence: {result['detection_results']['average_confidence']:.1%}")
    
    print(f"\n📝 Full Text:")
    print(result['recognition_results']['full_text'])
    
    print(f"\n📋 Extracted Data:")
    for field, data in result['extracted_data']['fields'].items():
        print(f"  {field}: {data['value']} ({data['confidence']:.1%})")
    
    # Save to JSON
    output_file = image_path.replace('.jpg', '_crnn_result.json').replace('.png', '_crnn_result.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Saved to: {output_file}")


