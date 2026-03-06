"""
Advanced OCR Pipeline using EAST Text Detector + Tesseract
Combines deep learning text detection with Tesseract recognition
"""

import cv2
import numpy as np
import pytesseract
from imutils.object_detection import non_max_suppression
import re
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
import json
import os

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

# EAST model path
EAST_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), 
    "models", 
    "frozen_east_text_detection.pb"
)

@dataclass
class OCRConfig:
    """Configuration for OCR processing"""
    min_text_confidence: float = 0.5  # EAST confidence threshold
    min_tesseract_confidence: float = 0.3
    enable_preprocessing: bool = True
    enable_rotation_correction: bool = True
    enable_noise_removal: bool = True
    languages: str = "eng"  # English only (change to "vie+eng" if Vietnamese data installed)
    psm_mode: int = 7  # Treat as single text line for cropped regions
    east_confidence_threshold: float = 0.1
    nms_threshold: float = 0.4  # Non-max suppression threshold


class EASTOCRPipeline:
    """Advanced OCR Pipeline using EAST + Tesseract"""
    
    def __init__(self, config: OCRConfig = None):
        self.config = config or OCRConfig()
        
        # Load EAST model
        if os.path.exists(EAST_MODEL_PATH):
            self.east_model = cv2.dnn.readNet(EAST_MODEL_PATH)
            print("🔧 EAST Text Detector loaded successfully")
        else:
            self.east_model = None
            print("⚠️  EAST model not found, using fallback detection")
        
        print("🔧 EAST + Tesseract OCR Pipeline initialized")
        
    def preprocess_image(self, image: np.ndarray, progress_callback: Optional[Callable] = None) -> np.ndarray:
        """Enhanced image preprocessing"""
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 10, "message": "Image Preprocessing"})
        
        # Keep original for EAST
        original = image.copy()
        
        # Convert to grayscale for preprocessing
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        if self.config.enable_noise_removal:
            if progress_callback:
                progress_callback({"step": "preprocessing", "progress": 13, "message": "Preprocessing - Noise removal"})
            # Denoise
            gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 16, "message": "Preprocessing - Contrast enhancement"})
        
        # Enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 20, "message": "Image Preprocessing Complete"})
        
        return original, enhanced
    
    def detect_text_with_east(
        self, 
        image: np.ndarray,
        progress_callback: Optional[Callable] = None
    ) -> List[tuple]:
        """Detect text regions using EAST model"""
        
        if self.east_model is None:
            return []
        
        if progress_callback:
            progress_callback({"step": "detection", "progress": 25, "message": "EAST Text Detection - Preparing"})
        
        # Prepare image for EAST (multiple of 32)
        height, width = image.shape[:2]
        new_height = (height // 32) * 32
        new_width = (width // 32) * 32
        
        # Get ratio for later scaling back
        h_ratio = height / new_height
        w_ratio = width / new_width
        
        if progress_callback:
            progress_callback({"step": "detection", "progress": 30, "message": "EAST Text Detection - Running model"})
        
        # Create blob
        blob = cv2.dnn.blobFromImage(
            image, 1.0, (new_width, new_height),
            (123.68, 116.78, 103.94), True, False
        )
        
        # Forward pass
        self.east_model.setInput(blob)
        (geometry, scores) = self.east_model.forward(
            self.east_model.getUnconnectedOutLayersNames()
        )
        
        if progress_callback:
            progress_callback({"step": "detection", "progress": 35, "message": "EAST Text Detection - Post-processing"})
        
        # Extract rectangles
        rectangles = []
        confidence_scores = []
        
        for i in range(geometry.shape[2]):
            for j in range(geometry.shape[3]):
                score = scores[0][0][i][j]
                
                if score < self.config.east_confidence_threshold:
                    continue
                
                # Calculate rectangle coordinates
                offset_x = j * 4.0
                offset_y = i * 4.0
                
                angle = geometry[0][4][i][j]
                cos = np.cos(angle)
                sin = np.sin(angle)
                
                h = geometry[0][0][i][j] + geometry[0][2][i][j]
                w = geometry[0][1][i][j] + geometry[0][3][i][j]
                
                # Calculate bounding box
                top_x = int(offset_x + (cos * geometry[0][1][i][j]) + (sin * geometry[0][2][i][j]))
                top_y = int(offset_y - (sin * geometry[0][1][i][j]) + (cos * geometry[0][2][i][j]))
                
                bottom_x = int(offset_x - (cos * geometry[0][3][i][j]) + (sin * geometry[0][0][i][j]))
                bottom_y = int(offset_y - (sin * geometry[0][3][i][j]) - (cos * geometry[0][0][i][j]))
                
                rectangles.append((top_x, top_y, bottom_x, bottom_y))
                confidence_scores.append(float(score))
        
        # Apply non-max suppression
        if len(rectangles) > 0:
            boxes = non_max_suppression(
                np.array(rectangles), 
                probs=confidence_scores,
                overlapThresh=self.config.nms_threshold
            )
            
            # Scale back to original image size
            scaled_boxes = []
            for (x1, y1, x2, y2) in boxes:
                x1 = int(x1 * w_ratio)
                y1 = int(y1 * h_ratio)
                x2 = int(x2 * w_ratio)
                y2 = int(y2 * h_ratio)
                scaled_boxes.append((x1, y1, x2, y2))
            
            if progress_callback:
                progress_callback({
                    "step": "detection", 
                    "progress": 40, 
                    "message": f"EAST - Found {len(scaled_boxes)} text regions"
                })
            
            print(f"🔍 EAST detected {len(scaled_boxes)} text regions")
            return scaled_boxes
        
        return []
    
    def recognize_text_in_regions(
        self,
        image: np.ndarray,
        boxes: List[tuple],
        progress_callback: Optional[Callable] = None
    ) -> List[Dict[str, Any]]:
        """Recognize text in detected regions using Tesseract"""
        
        if progress_callback:
            progress_callback({"step": "recognition", "progress": 50, "message": "Text Recognition"})
        
        text_regions = []
        config = f'--psm {self.config.psm_mode}'
        
        print(f"🔄 Starting OCR on {len(boxes)} detected boxes...")
        
        for idx, (x1, y1, x2, y2) in enumerate(boxes):
            # Add padding
            padding = 5
            x1 = max(0, x1 - padding)
            y1 = max(0, y1 - padding)
            x2 = min(image.shape[1], x2 + padding)
            y2 = min(image.shape[0], y2 + padding)
            
            # Crop region
            roi = image[y1:y2, x1:x2]
            
            if idx < 3:
                print(f"  DEBUG Box {idx}: roi.shape={roi.shape if roi.size > 0 else 'EMPTY'}")
            
            if roi.size == 0:
                if idx < 3:
                    print(f"  SKIP Box {idx}: Empty ROI")
                continue
            
            # OCR on region
            try:
                ocr_data = pytesseract.image_to_data(
                    roi,
                    lang=self.config.languages,
                    config=config,
                    output_type=pytesseract.Output.DICT
                )
                
                # Debug: log first few regions
                if idx < 5:
                    print(f"  Region {idx}: OCR data keys: {ocr_data.keys()}")
                    print(f"  Region {idx}: Texts: {ocr_data['text'][:3]}, Confs: {ocr_data['conf'][:3]}")
                
                # Combine all text in region
                texts = []
                confidences = []
                
                for i in range(len(ocr_data['text'])):
                    text = ocr_data['text'][i].strip()
                    conf = float(ocr_data['conf'][i])
                    
                    # Lower threshold: accept any positive confidence
                    if text and conf >= -1:  # Accept all, even negative conf
                        texts.append(text)
                        confidences.append(max(0.0, conf / 100.0))
                
                if texts:
                    combined_text = ' '.join(texts)
                    avg_confidence = np.mean(confidences) if confidences else 0.0
                    
                    # Detect language
                    has_vietnamese = any(ord(c) > 127 for c in combined_text)
                    language = 'vi' if has_vietnamese else 'en'
                    
                    text_regions.append({
                        'region_id': idx,
                        'bbox': {
                            'x': int(x1),
                            'y': int(y1),
                            'width': int(x2 - x1),
                            'height': int(y2 - y1),
                            'confidence': round(avg_confidence, 3)
                        },
                        'text': combined_text,
                        'confidence': round(avg_confidence, 3),
                        'language': language
                    })
            
            except Exception as e:
                print(f"⚠️  Error recognizing text in region {idx}: {e}")
                continue
            
            # Progress update
            if progress_callback and (idx + 1) % 5 == 0:
                progress = 50 + int((idx + 1) / len(boxes) * 10)
                progress_callback({
                    "step": "recognition",
                    "progress": progress,
                    "message": f"Text Recognition - Processed {idx + 1}/{len(boxes)} regions"
                })
        
        if progress_callback:
            progress_callback({
                "step": "recognition",
                "progress": 60,
                "message": f"Text Recognition - Recognized {len(text_regions)} texts"
            })
        
        print(f"📝 Recognized {len(text_regions)} text regions")
        
        return text_regions
    
    def extract_full_text(self, text_regions: List[Dict]) -> str:
        """Combine all recognized text"""
        lines = []
        for region in sorted(text_regions, key=lambda r: (r['bbox']['y'], r['bbox']['x'])):
            lines.append(region['text'])
        return '\n'.join(lines)
    
    def extract_data_fields(
        self,
        full_text: str,
        text_regions: List[Dict],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Extract structured data from text"""
        
        if progress_callback:
            progress_callback({"step": "extraction", "progress": 70, "message": "Data Extraction"})
        
        extracted_fields = {}
        lines = full_text.split('\n')
        
        if progress_callback:
            progress_callback({"step": "extraction", "progress": 75, "message": "Data Extraction - Pattern matching"})
        
        # Enhanced patterns
        patterns = {
            'full_name': [
                r'(?:Họ tên|Ho ten|Name)[:\s]+([^\n]+)',
                r'(?:Tên|Ten)[:\s]+([^\n]+)'
            ],
            'student_id': [
                r'(?:Mã SV|Ma SV|ID|Student ID)[:\s]+([A-Z0-9]+)',
                r'\b([0-9]{8,10})\b'  # 8-10 digit number
            ],
            'date_of_birth': [
                r'(?:Ngày sinh|Ngay sinh|DOB|Date of Birth)[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
            ],
            'major': [
                r'(?:Ngành học|Nganh hoc|Major|Khoa)[:\s]+([^\n]+)',
            ],
            'year': [
                r'(?:Năm nhập học|Nam nhap hoc|Year)[:\s]+(\d{4})',
                r'\b(20\d{2})\b'  # Year 20XX
            ],
            'university': [
                r'(TRƯỜNG ĐẠI HỌC [^\n]+)',
                r'(TRUONG DAI HOC [^\n]+)',
                r'([A-Z\s]+ University [^\n]+)',
            ],
            'phone': [
                r'(\d{4}\s+\d{4}\s+\d{4})',  # Format: 9704 1800 9363
                r'(\d{10,11})'  # 10-11 digits
            ]
        }
        
        for field_name, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    # Calculate confidence
                    confidence = min(0.95, 0.7 + (len(value) / 100))
                    
                    extracted_fields[field_name] = {
                        'value': value,
                        'confidence': round(confidence, 3),
                        'pattern': pattern
                    }
                    break
        
        if progress_callback:
            progress_callback({"step": "extraction", "progress": 80, "message": "Data Extraction - Completed"})
        
        # Determine document type
        document_type = "unknown"
        text_upper = full_text.upper()
        if 'SINH VIÊN' in text_upper or 'STUDENT' in text_upper:
            document_type = "student_id"
        elif 'BẢNG ĐIỂM' in text_upper or 'TRANSCRIPT' in text_upper:
            document_type = "transcript"
        elif 'CMND' in text_upper or 'CCCD' in text_upper or 'ID CARD' in text_upper:
            document_type = "id_card"
        
        return {
            'document_type': document_type,
            'fields': extracted_fields,
            'raw_lines': lines[:20],
            'total_fields_extracted': len(extracted_fields)
        }
    
    def process_image(
        self,
        image_data: bytes,
        filename: str,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Complete OCR processing pipeline with EAST + Tesseract"""
        
        print(f"🚀 Processing with EAST: {filename}")
        
        # Decode image
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        # Step 1: Preprocess
        original, preprocessed = self.preprocess_image(image, progress_callback)
        
        # Step 2: Detect text with EAST
        boxes = self.detect_text_with_east(original, progress_callback)
        
        # Step 3: Recognize text in regions
        text_regions = self.recognize_text_in_regions(
            preprocessed, boxes, progress_callback
        )
        
        # Step 4: Extract full text
        full_text = self.extract_full_text(text_regions)
        
        # Step 5: Extract structured data
        extracted_data = self.extract_data_fields(
            full_text, text_regions, progress_callback
        )
        
        # Step 6: Generate result
        if progress_callback:
            progress_callback({"step": "output", "progress": 90, "message": "Generating JSON output"})
        
        avg_confidence = np.mean([r['confidence'] for r in text_regions]) if text_regions else 0.0
        
        result = {
            'filename': filename,
            'detection_results': {
                'total_regions': len(text_regions),
                'text_regions': text_regions,
                'average_confidence': round(avg_confidence, 3),
                'detection_method': 'EAST + Tesseract'
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
                'extraction_success_rate': len(extracted_data['fields']) / max(len(extracted_data['raw_lines']), 1)
            }
        }
        
        if progress_callback:
            progress_callback({"step": "output", "progress": 95, "message": "JSON output generated"})
        
        if progress_callback:
            progress_callback({"step": "complete", "progress": 100, "message": "Processing Complete"})
        
        print(f"✅ Processing completed: {filename}")
        
        return result


def process_uploaded_image(
    image_data: bytes,
    filename: str,
    config: OCRConfig = None,
    progress_callback: Optional[Callable] = None
) -> Dict[str, Any]:
    """Main entry point for EAST + Tesseract OCR"""
    
    pipeline = EASTOCRPipeline(config)
    result = pipeline.process_image(image_data, filename, progress_callback)
    
    return result


# Test function
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ocr_pipeline_east.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    # Read image
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    # Process
    config = OCRConfig(
        languages="vie+eng",
        min_text_confidence=0.5,
        enable_preprocessing=True,
        east_confidence_threshold=0.1
    )
    
    result = process_uploaded_image(image_data, image_path, config)
    
    # Print results
    print("\n" + "="*50)
    print("📊 EAST + TESSERACT OCR RESULTS")
    print("="*50)
    print(f"\n🔍 Detection (EAST):")
    print(f"  - Total regions: {result['detection_results']['total_regions']}")
    print(f"  - Average confidence: {result['detection_results']['average_confidence']:.1%}")
    print(f"  - Method: {result['detection_results']['detection_method']}")
    
    print(f"\n📝 Full Text:")
    print(result['recognition_results']['full_text'])
    
    print(f"\n📋 Extracted Data:")
    for field, data in result['extracted_data']['fields'].items():
        print(f"  - {field}: {data['value']} ({data['confidence']:.1%})")
    
    # Save to JSON
    output_file = image_path.replace('.jpg', '_east_result.json').replace('.png', '_east_result.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Saved to: {output_file}")

