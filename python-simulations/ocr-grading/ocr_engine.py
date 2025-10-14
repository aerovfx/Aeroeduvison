"""
OCR Engine for Handwritten Text Recognition
Supports both Tesseract and EasyOCR
"""

import cv2
import numpy as np
from PIL import Image
import pytesseract
from typing import List, Dict, Tuple
import logging
import os
from pillow_heif import register_heif_opener

# Register HEIF/HEIC format support
register_heif_opener()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OCREngine:
    """
    OCR Engine using Tesseract OCR (github.com/tesseract-ocr)
    Fast, accurate, and reliable for both print and handwriting
    """
    
    def __init__(self, language='vie+eng'):
        """
        Initialize Tesseract OCR engine
        
        Args:
            language: Language(s) for OCR (vie+eng for Vietnamese and English)
        """
        self.language = language
        
        logger.info("Initializing Tesseract OCR (github.com/tesseract-ocr)...")
        
        # Configure Tesseract with multiple modes for different scenarios
        self.tesseract_configs = {
            'handwriting': r'--oem 1 --psm 6 -l vie+eng',  # LSTM + Uniform block
            'print': r'--oem 3 --psm 6 -l vie+eng',  # Default + Uniform block
            'sparse': r'--oem 3 --psm 11 -l vie+eng',  # Sparse text
            'single_line': r'--oem 3 --psm 7 -l vie+eng',  # Single line
            'auto': r'--oem 3 --psm 3 -l vie+eng',  # Fully automatic
        }
        self.current_config = 'auto'
        
        # Check if Tesseract is available
        try:
            version = pytesseract.get_tesseract_version()
            logger.info(f"✅ Tesseract version: {version}")
            logger.info(f"✅ Language: {language}")
            logger.info(f"✅ Mode: {self.current_config}")
        except Exception as e:
            logger.error(f"❌ Tesseract not found: {e}")
            logger.error("Install Tesseract:")
            logger.error("  macOS: brew install tesseract tesseract-lang")
            logger.error("  Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-vie")
            logger.error("  Windows: Download from github.com/tesseract-ocr/tesseract")
            raise RuntimeError("Tesseract OCR is required but not installed")
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for better OCR results
        
        Args:
            image: Input image as numpy array
            
        Returns:
            Preprocessed image
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Apply bilateral filter to reduce noise while keeping edges sharp
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            denoised, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 
            11, 2
        )
        
        # Morphological operations to clean up
        kernel = np.ones((1, 1), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return cleaned
    
    def extract_text_tesseract(self, image: np.ndarray, mode='auto') -> Dict[str, any]:
        """
        Extract text using Tesseract OCR (github.com/tesseract-ocr)
        
        Args:
            image: Preprocessed image
            mode: OCR mode ('auto', 'handwriting', 'print', 'sparse', 'single_line')
            
        Returns:
            Dictionary with text and confidence
        """
        try:
            config = self.tesseract_configs.get(mode, self.tesseract_configs['auto'])
            
            # Method 1: Get detailed data with bounding boxes
            data = pytesseract.image_to_data(
                image, 
                config=config,
                output_type=pytesseract.Output.DICT
            )
            
            # Filter out low confidence results
            texts = []
            confidences = []
            bboxes = []
            
            for i in range(len(data['text'])):
                conf = int(data['conf'][i])
                if conf > 30:  # Confidence threshold (30% minimum)
                    text = data['text'][i].strip()
                    if text:
                        texts.append(text)
                        confidences.append(conf)
                        bboxes.append({
                            'x': data['left'][i],
                            'y': data['top'][i],
                            'w': data['width'][i],
                            'h': data['height'][i]
                        })
            
            # Method 2: Also get full text for better sentence structure
            full_text_raw = pytesseract.image_to_string(image, config=config)
            
            # Combine results - prefer structured extraction but use full text as fallback
            if texts:
                full_text = ' '.join(texts)
            else:
                full_text = full_text_raw.strip()
                texts = full_text.split()
            
            avg_confidence = np.mean(confidences) if confidences else 50.0
            
            logger.info(f"Tesseract extracted {len(texts)} words with {avg_confidence:.1f}% confidence")
            
            return {
                'text': full_text,
                'confidence': float(avg_confidence),
                'word_count': len(texts),
                'engine': 'tesseract',
                'version': str(pytesseract.get_tesseract_version()),
                'mode': mode,
                'bboxes': bboxes[:10]  # First 10 bboxes for debugging
            }
            
        except Exception as e:
            logger.error(f"Tesseract OCR error: {e}")
            return {
                'text': '',
                'confidence': 0.0,
                'word_count': 0,
                'engine': 'tesseract',
                'error': str(e)
            }
    
    
    def extract_text_from_image(self, image_path: str) -> Dict[str, any]:
        """
        Main method to extract text from image
        Supports: JPG, PNG, HEIC/HEIF (iOS), PDF
        
        Args:
            image_path: Path to image file
            
        Returns:
            Extraction results
        """
        logger.info(f"Processing image: {image_path}")
        
        # Load image (supports HEIC/HEIF automatically via pillow-heif)
        try:
            # Try loading with PIL first (handles HEIC/HEIF)
            pil_image = Image.open(image_path)
            # Convert to RGB if needed
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            # Convert PIL to numpy array for OpenCV
            image = np.array(pil_image)
            # Convert RGB to BGR for OpenCV
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.warning(f"PIL failed, trying cv2: {e}")
            # Fallback to cv2 (for standard formats)
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
        
        # Preprocess
        processed = self.preprocess_image(image)
        
        # Extract text using Tesseract
        result = self.extract_text_tesseract(processed, mode=self.current_config)
        
        logger.info(f"Tesseract extracted {result['word_count']} words with {result['confidence']:.2f}% confidence")
        
        return result
    
    def extract_text_from_bytes(self, image_bytes: bytes) -> Dict[str, any]:
        """
        Extract text from image bytes
        Supports: JPG, PNG, HEIC/HEIF (iOS), WebP
        
        Args:
            image_bytes: Image as bytes
            
        Returns:
            Extraction results
        """
        # Try loading with PIL first (handles HEIC/HEIF)
        try:
            from io import BytesIO
            pil_image = Image.open(BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # Convert PIL to numpy array for OpenCV
            image = np.array(pil_image)
            # Convert RGB to BGR for OpenCV
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            
            logger.info(f"Loaded image via PIL: {pil_image.format} format, size: {pil_image.size}")
        except Exception as e:
            logger.warning(f"PIL loading failed, trying cv2: {e}")
            # Fallback to cv2 for standard formats
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Could not decode image from bytes")
        
        # Preprocess
        processed = self.preprocess_image(image)
        
        # Extract text using Tesseract
        result = self.extract_text_tesseract(processed, mode=self.current_config)
        
        return result
    
    def extract_answers_from_test(self, image_path: str) -> List[Dict[str, any]]:
        """
        Extract structured answers from test paper
        
        Args:
            image_path: Path to test paper image
            
        Returns:
            List of extracted answers with question numbers
        """
        # Extract all text
        result = self.extract_text_from_image(image_path)
        text = result['text']
        
        # Parse answers (basic implementation)
        answers = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Try to identify question number and answer
            # Format: "Câu 1: answer" or "1. answer" or "Q1: answer"
            import re
            
            patterns = [
                r'(?:Câu|câu)\s*(\d+)[:\.\s]+(.+)',
                r'(\d+)[:\.\s]+(.+)',
                r'Q(\d+)[:\.\s]+(.+)',
            ]
            
            for pattern in patterns:
                match = re.match(pattern, line)
                if match:
                    q_num = int(match.group(1))
                    answer = match.group(2).strip()
                    answers.append({
                        'question': q_num,
                        'answer': answer
                    })
                    break
        
        return answers


# Example usage
if __name__ == "__main__":
    # Test Tesseract OCR engine
    logger.info("Testing Tesseract OCR Engine...")
    
    try:
        ocr = OCREngine(language='vie+eng')
        logger.info("✅ OCR Engine initialized")
        
        # Example test with sample image
        test_image = "test_paper.jpg"
        
        if os.path.exists(test_image):
            result = ocr.extract_text_from_image(test_image)
            
            print(f"\n📝 OCR Results:")
            print(f"   Text: {result['text'][:100]}...")
            print(f"   Confidence: {result['confidence']:.2f}%")
            print(f"   Word count: {result['word_count']}")
            print(f"   Engine: {result['engine']}")
            print(f"   Version: {result.get('version', 'N/A')}")
        else:
            logger.info(f"Test image {test_image} not found")
            logger.info("To test:")
            logger.info("1. Place a test image as 'test_paper.jpg'")
            logger.info("2. Run: python ocr_engine.py")
    
    except Exception as e:
        logger.error(f"Test failed: {e}")
        logger.error("Make sure Tesseract is installed:")
        logger.error("  macOS: brew install tesseract tesseract-lang")
        logger.error("  Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-vie")

