"""
Real OCR Pipeline using Tesseract
Enhanced version with Vietnamese language support
"""

import cv2
import numpy as np
import pytesseract
import re
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
import json

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

@dataclass
class OCRConfig:
    """Configuration for OCR processing"""
    min_text_confidence: float = 0.7
    enable_preprocessing: bool = True
    enable_rotation_correction: bool = True
    enable_noise_removal: bool = True
    languages: str = "vie+eng"  # Vietnamese + English
    psm_mode: int = 3  # Page segmentation mode


class TesseractOCRPipeline:
    """Real OCR Pipeline using Tesseract"""
    
    def __init__(self, config: OCRConfig = None):
        self.config = config or OCRConfig()
        print("🔧 Tesseract OCR Pipeline initialized")
        
    def preprocess_image(self, image: np.ndarray, progress_callback: Optional[Callable] = None) -> np.ndarray:
        """Enhanced image preprocessing with 6-step pipeline"""
        
        # Step 1: Image Normalization
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 10, "message": "1. Image Normalization"})
        
        # Normalize pixel values to 0-255 range
        normalized = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX)
        
        # Step 2: Grayscale Conversion
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 12, "message": "2. Grayscale Conversion"})
        
        if len(normalized.shape) == 3:
            gray = cv2.cvtColor(normalized, cv2.COLOR_BGR2GRAY)
        else:
            gray = normalized.copy()
        
        # Step 3: Image Resizing (if needed for optimal OCR)
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 14, "message": "3. Image Resizing"})
        
        height, width = gray.shape
        # Scale up small images for better OCR
        if height < 500 or width < 500:
            scale_factor = max(500 / height, 500 / width)
            new_height = int(height * scale_factor)
            new_width = int(width * scale_factor)
            gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Step 4: Noise Removal
        if self.config.enable_noise_removal:
            if progress_callback:
                progress_callback({"step": "preprocessing", "progress": 16, "message": "4. Noise Removal"})
            
            # Apply multiple noise reduction techniques
            # 1. Gaussian blur - IMPROVED: (5,5) kernel from CRNN best practices
            gray = cv2.GaussianBlur(gray, (5, 5), 0)
            # 2. Non-local means denoising
            gray = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
            # 3. Morphological operations to remove small noise
            kernel = np.ones((2, 2), np.uint8)
            gray = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
        
        # Step 5: Skew Correction
        if self.config.enable_rotation_correction:
            if progress_callback:
                progress_callback({"step": "preprocessing", "progress": 18, "message": "5. Skew Correction"})
            
            # Detect and correct skew angle
            coords = np.column_stack(np.where(gray > 0))
            if len(coords) > 0:
                angle = cv2.minAreaRect(coords)[-1]
                
                # Adjust angle
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle
                
                # Only correct if skew is significant (> 0.5 degrees)
                if abs(angle) > 0.5:
                    (h, w) = gray.shape
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, angle, 1.0)
                    gray = cv2.warpAffine(gray, M, (w, h), 
                                         flags=cv2.INTER_CUBIC,
                                         borderMode=cv2.BORDER_REPLICATE)
        
        # Step 6: Contrast Enhancement & Binarization
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 19, "message": "6. Contrast Enhancement"})
        
        # CLAHE for adaptive contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Adaptive thresholding - IMPROVED: BINARY_INV from CRNN (white text on black)
        binary = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 4
        )
        
        if progress_callback:
            progress_callback({"step": "preprocessing", "progress": 20, "message": "Preprocessing Complete (6 steps)"})
        
        return binary
    
    def detect_and_recognize_text(
        self, 
        image: np.ndarray, 
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Detect and recognize text using Tesseract"""
        
        if progress_callback:
            progress_callback({"step": "detection", "progress": 30, "message": "Text Detection"})
        
        # Get detailed OCR data
        config = f'--psm {self.config.psm_mode}'
        
        if progress_callback:
            progress_callback({"step": "detection", "progress": 35, "message": "Text Detection - Analyzing regions"})
        
        # Get detailed data with confidence scores
        ocr_data = pytesseract.image_to_data(
            image, 
            lang=self.config.languages,
            config=config,
            output_type=pytesseract.Output.DICT
        )
        
        # Extract text regions with confidence
        text_regions = []
        n_boxes = len(ocr_data['text'])
        
        for i in range(n_boxes):
            conf = float(ocr_data['conf'][i])
            text = ocr_data['text'][i].strip()
            
            if conf > 0 and text:  # Valid text with confidence
                x, y, w, h = ocr_data['left'][i], ocr_data['top'][i], ocr_data['width'][i], ocr_data['height'][i]
                
                text_regions.append({
                    'region_id': len(text_regions),
                    'bbox': {
                        'x': int(x),
                        'y': int(y),
                        'width': int(w),
                        'height': int(h),
                        'confidence': round(conf / 100, 3)
                    },
                    'text': text,
                    'confidence': round(conf / 100, 3),
                    'language': 'vi' if any(ord(c) > 127 for c in text) else 'en'
                })
        
        if progress_callback:
            progress_callback({
                "step": "detection", 
                "progress": 40, 
                "message": f"Text Detection - Found {len(text_regions)} regions"
            })
        
        print(f"🔍 Detected {len(text_regions)} text regions")
        
        # Calculate average confidence
        avg_confidence = np.mean([r['confidence'] for r in text_regions]) if text_regions else 0.0
        
        return {
            'total_regions': len(text_regions),
            'text_regions': text_regions,
            'average_confidence': round(avg_confidence, 3)
        }
    
    def extract_full_text(self, image: np.ndarray) -> str:
        """Extract full text from image"""
        config = f'--psm {self.config.psm_mode}'
        full_text = pytesseract.image_to_string(
            image,
            lang=self.config.languages,
            config=config
        )
        return full_text.strip()
    
    def extract_data_fields(
        self, 
        full_text: str, 
        text_regions: List[Dict],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Enhanced extraction with smart pattern matching"""
        
        if progress_callback:
            progress_callback({"step": "extraction", "progress": 70, "message": "Smart Data Extraction"})
        
        extracted_fields = {}
        lines = full_text.split('\n')
        combined_text = ' '.join([r.get('text', '') for r in text_regions])
        
        if progress_callback:
            progress_callback({"step": "extraction", "progress": 75, "message": "Analyzing text patterns"})
        
        # IMPROVED: Flexible patterns without requiring labels
        
        # 1. University/Institution (look for university-related words)
        university_patterns = [
            r'(TRUONG\s+DAI\s*HOC[^\n]{0,50})',
            r'(TRƯỜNG\s+ĐẠI\s*HỌC[^\n]{0,50})',
            r'([A-Z][a-z]+\s+University[^\n]{0,40})',
            r'(University\s+of\s+[A-Z][a-z]+[^\n]{0,40})',
        ]
        for pattern in university_patterns:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                extracted_fields['university'] = {
                    'value': value,
                    'confidence': 0.95,
                    'source': 'pattern_match'
                }
                break
        
        # 2. Student name (capitalized words after "Student" or between specific markers)
        name_patterns = [
            r'(?:Student|SINH\s*VIEN)[^\n]{0,30}([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',
            r'(?:E\s*:|Name\s*:)[^\n]{0,10}([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',
            r'\b([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b(?=.*(?:Student|SINH))',
        ]
        for pattern in name_patterns:
            match = re.search(pattern, combined_text)
            if match:
                value = match.group(1).strip()
                # Validate: should be 2-4 words, each capitalized
                words = value.split()
                if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
                    extracted_fields['student_name'] = {
                        'value': value,
                        'confidence': 0.85,
                        'source': 'name_pattern'
                    }
                    break
        
        # 3. Date of Birth (flexible date formats)
        dob_patterns = [
            r'\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{4})\b',  # DD/MM/YYYY or DD-MM-YYYY
            r'\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2})\b',   # DD/MM/YY
        ]
        for pattern in dob_patterns:
            match = re.search(pattern, combined_text)
            if match:
                value = match.group(1)
                extracted_fields['date_of_birth'] = {
                    'value': value,
                    'confidence': 0.90,
                    'source': 'date_pattern'
                }
                break
        
        # 4. Student ID (long number sequences)
        id_patterns = [
            r'\b(\d{7,12})\b',  # 7-12 digit sequences (common for student IDs)
            r'([A-Z]{1,2}\d{6,10})',  # Letter + digits
        ]
        # Find all number sequences and pick the most likely student ID
        numbers = []
        for pattern in id_patterns:
            matches = re.findall(pattern, combined_text)
            numbers.extend(matches)
        
        # Filter: student IDs usually 7-10 digits
        valid_ids = [n for n in numbers if 7 <= len(n) <= 10 and n.isdigit()]
        if valid_ids:
            # Pick first valid ID
            extracted_fields['student_id'] = {
                'value': valid_ids[0],
                'confidence': 0.80,
                'source': 'numeric_pattern'
            }
        
        # 5. Major/Department (common majors or words near "Khoa", "Major")
        major_patterns = [
            r'(?:Khoa|Major|Nganh|Ngành)[^\n]{0,5}([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})',
            r'\b(Accounting|Computer\s+Science|Engineering|Business|Mathematics|Physics)\b',
            r'\b(Ke\s*toan|Cong\s*nghe\s*thong\s*tin|Kinh\s*te)\b',
        ]
        for pattern in major_patterns:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                extracted_fields['major'] = {
                    'value': value,
                    'confidence': 0.75,
                    'source': 'major_pattern'
                }
                break
        
        # 6. Phone/ID numbers (sequences of 4+ digits with spaces or dots)
        phone_pattern = r'\b(\d{3,4}\s+\d{3,4}\s+\d{3,4}(?:\s+\d{3,4})?)\b'
        match = re.search(phone_pattern, combined_text)
        if match:
            extracted_fields['contact_number'] = {
                'value': match.group(1),
                'confidence': 0.70,
                'source': 'phone_pattern'
            }
        
        # 7. Location (TP. HCM, Ha Noi, etc.)
        location_patterns = [
            r'\b(TP\.\s*[A-Z]+)\b',
            r'\b(Ha\s*Noi|Ho\s*Chi\s*Minh|Da\s*Nang)\b',
        ]
        for pattern in location_patterns:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                extracted_fields['location'] = {
                    'value': match.group(1),
                    'confidence': 0.85,
                    'source': 'location_pattern'
                }
                break
        
        if progress_callback:
            progress_callback({"step": "extraction", "progress": 80, "message": f"Extracted {len(extracted_fields)} fields"})
        
        # Enhanced document type detection
        document_type = "unknown"
        text_upper = combined_text.upper()
        
        if 'STUDENT' in text_upper or 'SINH' in text_upper:
            document_type = "student_id"
        elif 'TRANSCRIPT' in text_upper or 'BANG DIEM' in text_upper:
            document_type = "transcript"
        elif 'PASSPORT' in text_upper or 'HO CHIEU' in text_upper:
            document_type = "passport"
        elif 'CITIZEN' in text_upper or 'CMND' in text_upper or 'CCCD' in text_upper:
            document_type = "national_id"
        
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
        """Complete OCR processing pipeline"""
        
        print(f"🚀 Processing: {filename}")
        
        # Decode image
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        # Step 1: Preprocess
        preprocessed = self.preprocess_image(image, progress_callback)
        
        # Step 2: Detect and recognize text
        if progress_callback:
            progress_callback({"step": "recognition", "progress": 50, "message": "Text Recognition"})
        
        detection_results = self.detect_and_recognize_text(preprocessed, progress_callback)
        
        if progress_callback:
            progress_callback({"step": "recognition", "progress": 55, "message": "Text Recognition - Processing regions"})
        
        # Extract full text
        full_text = self.extract_full_text(preprocessed)
        
        if progress_callback:
            progress_callback({
                "step": "recognition", 
                "progress": 60, 
                "message": f"Text Recognition - Recognized {detection_results['total_regions']} texts"
            })
        
        print(f"📝 Recognized {detection_results['total_regions']} text regions")
        
        # Step 3: Extract structured data
        extracted_data = self.extract_data_fields(
            full_text,
            detection_results['text_regions'],
            progress_callback
        )
        
        # Step 4: Generate JSON output
        if progress_callback:
            progress_callback({"step": "output", "progress": 90, "message": "Generating JSON output"})
        
        result = {
            'filename': filename,
            'detection_results': detection_results,
            'recognition_results': {
                'full_text': full_text,
                'total_chars': len(full_text),
                'total_lines': len(full_text.split('\n'))
            },
            'extracted_data': extracted_data,
            'quality_metrics': {
                'average_confidence': detection_results['average_confidence'],
                'total_regions': detection_results['total_regions'],
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
    """Main entry point for OCR processing"""
    
    pipeline = TesseractOCRPipeline(config)
    result = pipeline.process_image(image_data, filename, progress_callback)
    
    return result


# Test function
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ocr_pipeline_tesseract.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    # Read image
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    # Process
    config = OCRConfig(
        languages="vie+eng",
        min_text_confidence=0.5,
        enable_preprocessing=True
    )
    
    result = process_uploaded_image(image_data, image_path, config)
    
    # Print results
    print("\n" + "="*50)
    print("📊 OCR RESULTS")
    print("="*50)
    print(f"\n🔍 Detection:")
    print(f"  - Total regions: {result['detection_results']['total_regions']}")
    print(f"  - Average confidence: {result['detection_results']['average_confidence']:.1%}")
    
    print(f"\n📝 Full Text:")
    print(result['recognition_results']['full_text'])
    
    print(f"\n📋 Extracted Data:")
    for field, data in result['extracted_data']['fields'].items():
        print(f"  - {field}: {data['value']} ({data['confidence']:.1%})")
    
    # Save to JSON
    output_file = image_path.replace('.jpg', '_tesseract_result.json').replace('.png', '_tesseract_result.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Saved to: {output_file}")

