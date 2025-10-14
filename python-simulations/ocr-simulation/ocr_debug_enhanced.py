"""
Enhanced OCR Pipeline with Debug & Visualization
Implements comprehensive debugging as per recommendations:
1. Detailed logging of OCR engine output
2. Bounding box visualization
3. Step-by-step pipeline validation
4. Quality metrics tracking
"""

import cv2
import numpy as np
import pytesseract
from typing import Dict, Any, List, Optional, Tuple
import json
from pathlib import Path
import base64

# Configure Tesseract
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

class OCRDebugPipeline:
    """Enhanced OCR with comprehensive debugging"""
    
    def __init__(self, debug_mode=True):
        self.debug_mode = debug_mode
        self.debug_info = {
            'preprocessing_steps': [],
            'ocr_raw_output': [],
            'bounding_boxes': [],
            'quality_checks': []
        }
        
    def log_debug(self, step: str, message: str, data: Any = None):
        """Log debug information"""
        if self.debug_mode:
            entry = {
                'step': step,
                'message': message,
                'data': data
            }
            print(f"🔍 DEBUG [{step}]: {message}")
            if step == 'preprocessing':
                self.debug_info['preprocessing_steps'].append(entry)
            elif step == 'ocr':
                self.debug_info['ocr_raw_output'].append(entry)
            elif step == 'quality':
                self.debug_info['quality_checks'].append(entry)
    
    def preprocess_with_validation(self, image: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """Preprocessing với validation từng bước"""
        
        validation_results = {
            'original_shape': image.shape,
            'original_dtype': str(image.dtype),
            'steps_applied': []
        }
        
        self.log_debug('preprocessing', f'Original image shape: {image.shape}')
        
        # Step 1: Grayscale conversion
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            self.log_debug('preprocessing', 'Converted to grayscale')
            validation_results['steps_applied'].append('grayscale')
        else:
            gray = image.copy()
            
        # Step 2: Check image quality
        mean_intensity = np.mean(gray)
        std_intensity = np.std(gray)
        
        self.log_debug('quality', f'Mean intensity: {mean_intensity:.2f}')
        self.log_debug('quality', f'Std intensity: {std_intensity:.2f}')
        
        validation_results['mean_intensity'] = float(mean_intensity)
        validation_results['std_intensity'] = float(std_intensity)
        
        # Quality checks
        if mean_intensity < 50:
            self.log_debug('quality', '⚠️  Image too dark', 'warning')
        elif mean_intensity > 200:
            self.log_debug('quality', '⚠️  Image too bright', 'warning')
            
        if std_intensity < 20:
            self.log_debug('quality', '⚠️  Low contrast', 'warning')
        
        # Step 3: Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        self.log_debug('preprocessing', 'Applied denoising')
        validation_results['steps_applied'].append('denoise')
        
        # Step 4: Contrast enhancement (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        self.log_debug('preprocessing', 'Applied CLAHE contrast enhancement')
        validation_results['steps_applied'].append('clahe')
        
        # Step 5: Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            enhanced, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        self.log_debug('preprocessing', 'Applied adaptive thresholding')
        validation_results['steps_applied'].append('threshold')
        
        # Check if binary has enough content
        white_pixels = np.sum(binary == 255)
        black_pixels = np.sum(binary == 0)
        white_ratio = white_pixels / binary.size
        
        self.log_debug('quality', f'White/Black ratio: {white_ratio:.2%}')
        validation_results['white_ratio'] = float(white_ratio)
        
        if white_ratio > 0.95:
            self.log_debug('quality', '⚠️  Too much white (possible overexposure)', 'warning')
        elif white_ratio < 0.05:
            self.log_debug('quality', '⚠️  Too much black (possible underexposure)', 'warning')
        
        return binary, validation_results
    
    def detect_and_visualize_boxes(
        self, 
        image: np.ndarray,
        preprocessed: np.ndarray
    ) -> Tuple[List[Dict], np.ndarray]:
        """
        Detect text boxes and create visualization image
        Returns: (text_regions, visualization_image)
        """
        
        self.log_debug('ocr', 'Starting Tesseract detection...')
        
        # Get detailed OCR data
        ocr_data = pytesseract.image_to_data(
            preprocessed,
            lang='eng',
            config='--psm 3',
            output_type=pytesseract.Output.DICT
        )
        
        # Log raw OCR output (first 5 entries)
        self.log_debug('ocr', f'Total OCR entries: {len(ocr_data["text"])}')
        
        sample_data = []
        for i in range(min(5, len(ocr_data['text']))):
            if ocr_data['text'][i].strip():
                sample_data.append({
                    'text': ocr_data['text'][i],
                    'conf': ocr_data['conf'][i],
                    'bbox': (ocr_data['left'][i], ocr_data['top'][i], 
                            ocr_data['width'][i], ocr_data['height'][i])
                })
        
        self.log_debug('ocr', 'Sample OCR output (first 5):', sample_data)
        
        # Create visualization image (RGB)
        if len(image.shape) == 2:
            vis_image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            vis_image = image.copy()
        
        text_regions = []
        valid_count = 0
        low_conf_count = 0
        
        for i in range(len(ocr_data['text'])):
            text = ocr_data['text'][i].strip()
            conf = float(ocr_data['conf'][i])
            
            if not text:
                continue
            
            x = ocr_data['left'][i]
            y = ocr_data['top'][i]
            w = ocr_data['width'][i]
            h = ocr_data['height'][i]
            
            # Draw bounding box
            if conf >= 50:
                color = (0, 255, 0)  # Green for high confidence
                valid_count += 1
            elif conf >= 20:
                color = (0, 165, 255)  # Orange for medium confidence
                valid_count += 1
            else:
                color = (0, 0, 255)  # Red for low confidence
                low_conf_count += 1
            
            cv2.rectangle(vis_image, (x, y), (x + w, y + h), color, 2)
            
            # Add text label
            label = f"{text[:10]} ({conf:.0f}%)"
            cv2.putText(vis_image, label, (x, y - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            
            # Language detection
            has_vietnamese = any(ord(c) > 127 for c in text)
            language = 'vi' if has_vietnamese else 'en'
            
            region = {
                'region_id': len(text_regions),
                'text': text,
                'confidence': round(conf / 100.0, 3),
                'bbox': {'x': x, 'y': y, 'width': w, 'height': h},
                'language': language
            }
            text_regions.append(region)
        
        self.log_debug('ocr', f'✅ Valid regions (conf >= 20%): {valid_count}')
        self.log_debug('ocr', f'⚠️  Low confidence regions (conf < 20%): {low_conf_count}')
        
        self.debug_info['bounding_boxes'] = {
            'total_boxes': len(text_regions),
            'high_confidence': valid_count,
            'low_confidence': low_conf_count
        }
        
        return text_regions, vis_image
    
    def process_image(
        self, 
        image_data: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """Process image with full debugging"""
        
        print(f"\n{'='*70}")
        print(f"🔍 DEBUG MODE: Processing {filename}")
        print(f"{'='*70}\n")
        
        # Decode image
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return {'error': 'Failed to decode image'}
        
        self.log_debug('preprocessing', f'Image loaded: {filename}')
        
        # Step 1: Preprocessing with validation
        preprocessed, validation = self.preprocess_with_validation(image)
        
        # Step 2: Detect text and create visualization
        text_regions, vis_image = self.detect_and_visualize_boxes(image, preprocessed)
        
        # Step 3: Calculate quality metrics
        if text_regions:
            avg_confidence = np.mean([r['confidence'] for r in text_regions])
            high_conf_count = sum(1 for r in text_regions if r['confidence'] >= 0.5)
            success_rate = high_conf_count / len(text_regions)
        else:
            avg_confidence = 0.0
            success_rate = 0.0
        
        self.log_debug('quality', f'Average confidence: {avg_confidence * 100:.1f}%')
        self.log_debug('quality', f'Success rate: {success_rate * 100:.1f}%')
        
        # Encode visualization image
        _, buffer = cv2.imencode('.jpg', vis_image)
        vis_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Full result
        result = {
            'filename': filename,
            'detection_results': {
                'total_regions': len(text_regions),
                'text_regions': text_regions,
                'average_confidence': round(avg_confidence, 3),
                'detection_method': 'Tesseract + Debug'
            },
            'quality_metrics': {
                'average_confidence': round(avg_confidence, 3),
                'total_regions': len(text_regions),
                'extraction_success_rate': round(success_rate, 3),
                'preprocessing_quality': validation
            },
            'visualization': {
                'image_base64': vis_base64,
                'format': 'jpeg',
                'description': 'Bounding boxes: Green (>=50%), Orange (20-50%), Red (<20%)'
            },
            'debug_info': self.debug_info if self.debug_mode else None
        }
        
        print(f"\n{'='*70}")
        print(f"✅ Processing complete")
        print(f"{'='*70}\n")
        
        return result


def process_uploaded_image(
    image_data: bytes,
    filename: str,
    config=None,
    progress_callback=None
) -> Dict[str, Any]:
    """Main entry point for debug OCR processing"""
    
    pipeline = OCRDebugPipeline(debug_mode=True)
    return pipeline.process_image(image_data, filename)

