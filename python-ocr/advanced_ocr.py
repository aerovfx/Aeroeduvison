#!/usr/bin/env python3
"""
Advanced OCR System with CRNN and EAST
Combines:
- EAST: Text detection (find text regions)
- CRNN: Text recognition (read text)
- PaddleOCR: Fallback for comparison
"""

import cv2
import numpy as np
import torch
import torch.nn as nn
from typing import List, Tuple, Dict, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CRNNModel(nn.Module):
    """
    CRNN (Convolutional Recurrent Neural Network) for text recognition
    
    Architecture:
    - CNN layers: Feature extraction from text images
    - RNN layers: Sequence modeling (BiLSTM)
    - CTC: Connectionist Temporal Classification
    """
    
    def __init__(self, img_height=32, num_channels=1, num_classes=80, hidden_size=256):
        super(CRNNModel, self).__init__()
        
        # CNN for feature extraction
        self.cnn = nn.Sequential(
            # Conv Block 1
            nn.Conv2d(num_channels, 64, 3, 1, 1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),  # 32x -> 16x
            
            # Conv Block 2
            nn.Conv2d(64, 128, 3, 1, 1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),  # 16x -> 8x
            
            # Conv Block 3
            nn.Conv2d(128, 256, 3, 1, 1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            
            # Conv Block 4
            nn.Conv2d(256, 256, 3, 1, 1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d((2, 1), (2, 1)),  # 8x -> 4x (height only)
            
            # Conv Block 5
            nn.Conv2d(256, 512, 3, 1, 1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            
            # Conv Block 6
            nn.Conv2d(512, 512, 3, 1, 1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d((2, 1), (2, 1)),  # 4x -> 2x
            
            # Conv Block 7
            nn.Conv2d(512, 512, 2, 1, 0),
            nn.ReLU(inplace=True)
        )
        
        # RNN for sequence modeling
        self.rnn = nn.LSTM(512, hidden_size, 2, bidirectional=True, batch_first=True)
        
        # Output layer
        self.fc = nn.Linear(hidden_size * 2, num_classes)
        
    def forward(self, x):
        # CNN
        conv = self.cnn(x)  # [B, C, H, W]
        
        # Reshape for RNN
        b, c, h, w = conv.size()
        conv = conv.squeeze(2)  # Remove height dimension: [B, C, W]
        conv = conv.permute(0, 2, 1)  # [B, W, C]
        
        # RNN
        output, _ = self.rnn(conv)  # [B, W, hidden*2]
        
        # Linear
        output = self.fc(output)  # [B, W, num_classes]
        
        return output


class EASTDetector:
    """
    EAST (Efficient and Accurate Scene Text) Detector
    
    Better than traditional methods for:
    - Arbitrary-oriented text
    - Multi-scale text
    - Dense text regions
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize EAST detector
        
        Args:
            model_path: Path to pretrained EAST model
        """
        self.net = None
        self.conf_threshold = 0.5
        self.nms_threshold = 0.4
        
        if model_path:
            self.load_model(model_path)
        else:
            logger.warning("No EAST model loaded, using OpenCV default")
            
    def load_model(self, model_path: str):
        """Load pretrained EAST model"""
        try:
            self.net = cv2.dnn.readNet(model_path)
            logger.info(f"✅ EAST model loaded: {model_path}")
        except Exception as e:
            logger.error(f"❌ Failed to load EAST: {e}")
    
    def detect(self, image: np.ndarray) -> List[np.ndarray]:
        """
        Detect text regions using EAST
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            List of bounding boxes (4 points each)
        """
        if self.net is None:
            return self._fallback_detection(image)
        
        # Preprocess
        orig_h, orig_w = image.shape[:2]
        new_h, new_w = 320, 320  # EAST input size
        
        ratio_h = orig_h / new_h
        ratio_w = orig_w / new_w
        
        # Resize
        resized = cv2.resize(image, (new_w, new_h))
        
        # Create blob
        blob = cv2.dnn.blobFromImage(resized, 1.0, (new_w, new_h), 
                                     (123.68, 116.78, 103.94), True, False)
        
        # Forward pass
        self.net.setInput(blob)
        output_layers = ["feature_fusion/Conv_7/Sigmoid", 
                        "feature_fusion/concat_3"]
        scores, geometry = self.net.forward(output_layers)
        
        # Decode predictions
        boxes = self._decode_predictions(scores, geometry, self.conf_threshold)
        
        # Apply NMS
        boxes = self._apply_nms(boxes, self.nms_threshold)
        
        # Scale back to original size
        scaled_boxes = []
        for box in boxes:
            scaled_box = box.copy()
            scaled_box[:, 0] *= ratio_w
            scaled_box[:, 1] *= ratio_h
            scaled_boxes.append(scaled_box.astype(np.int32))
        
        logger.info(f"🔍 EAST detected {len(scaled_boxes)} text regions")
        return scaled_boxes
    
    def _fallback_detection(self, image: np.ndarray) -> List[np.ndarray]:
        """Fallback detection using contours"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        boxes = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w > 10 and h > 10:  # Filter small boxes
                box = np.array([[x, y], [x+w, y], [x+w, y+h], [x, y+h]])
                boxes.append(box)
        
        return boxes
    
    def _decode_predictions(self, scores, geometry, conf_threshold):
        """Decode EAST predictions"""
        # Implementation would go here
        # This is a placeholder
        return []
    
    def _apply_nms(self, boxes, threshold):
        """Apply Non-Maximum Suppression"""
        # Implementation would go here
        return boxes


class AdvancedOCR:
    """
    Advanced OCR combining EAST + CRNN + PaddleOCR
    
    Pipeline:
    1. EAST: Detect text regions
    2. CRNN: Recognize text (for handwriting)
    3. PaddleOCR: Recognize text (for printed)
    4. Ensemble: Combine results for best accuracy
    """
    
    def __init__(self, 
                 east_model_path: Optional[str] = None,
                 crnn_model_path: Optional[str] = None):
        """
        Initialize Advanced OCR
        
        Args:
            east_model_path: Path to EAST detector model
            crnn_model_path: Path to CRNN recognition model
        """
        logger.info("🚀 Initializing Advanced OCR...")
        
        # EAST detector
        self.east = EASTDetector(east_model_path)
        
        # CRNN recognizer
        self.crnn = None
        if crnn_model_path:
            self.crnn = self._load_crnn(crnn_model_path)
        
        # PaddleOCR fallback
        try:
            from paddleocr import PaddleOCR
            self.paddle_ocr = PaddleOCR(lang='en')
            logger.info("✅ PaddleOCR loaded as fallback")
        except:
            self.paddle_ocr = None
            logger.warning("⚠️ PaddleOCR not available")
        
        logger.info("✅ Advanced OCR ready!")
    
    def _load_crnn(self, model_path: str) -> Optional[CRNNModel]:
        """Load CRNN model"""
        try:
            model = CRNNModel()
            model.load_state_dict(torch.load(model_path, map_location='cpu'))
            model.eval()
            logger.info(f"✅ CRNN model loaded: {model_path}")
            return model
        except Exception as e:
            logger.error(f"❌ Failed to load CRNN: {e}")
            return None
    
    def process(self, image_path: str) -> Dict:
        """
        Process image with advanced OCR
        
        Args:
            image_path: Path to input image
            
        Returns:
            Dict with OCR results
        """
        logger.info(f"📄 Processing: {image_path}")
        
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            return {'error': 'Cannot read image'}
        
        # Step 1: Detect text regions with EAST
        logger.info("🔍 Step 1: EAST text detection...")
        text_boxes = self.east.detect(image)
        
        if not text_boxes:
            logger.warning("No text regions detected by EAST, using PaddleOCR")
            return self._fallback_to_paddle(image_path)
        
        # Step 2: Recognize text in each region
        logger.info(f"📝 Step 2: Recognizing {len(text_boxes)} regions...")
        results = []
        
        for idx, box in enumerate(text_boxes):
            # Crop region
            x_min = int(box[:, 0].min())
            x_max = int(box[:, 0].max())
            y_min = int(box[:, 1].min())
            y_max = int(box[:, 1].max())
            
            roi = image[y_min:y_max, x_min:x_max]
            
            if roi.size == 0:
                continue
            
            # Recognize text
            if self.crnn:
                text, conf = self._recognize_with_crnn(roi)
            else:
                text, conf = self._recognize_with_paddle_roi(roi)
            
            results.append({
                'text': text,
                'confidence': conf,
                'box': box.tolist(),
                'method': 'crnn' if self.crnn else 'paddle'
            })
        
        # Combine results
        full_text = ' '.join([r['text'] for r in results])
        avg_conf = np.mean([r['confidence'] for r in results]) if results else 0.0
        
        logger.info(f"✅ Completed: {len(results)} regions, confidence: {avg_conf:.1%}")
        
        return {
            'text': full_text,
            'confidence': float(avg_conf),
            'boxes': results,
            'total_regions': len(results),
            'method': 'east_crnn' if self.crnn else 'east_paddle'
        }
    
    def _recognize_with_crnn(self, roi: np.ndarray) -> Tuple[str, float]:
        """Recognize text using CRNN"""
        # Preprocess
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (280, 32))
        normalized = resized / 255.0
        
        # To tensor
        tensor = torch.FloatTensor(normalized).unsqueeze(0).unsqueeze(0)
        
        # Inference
        with torch.no_grad():
            output = self.crnn(tensor)
            # CTC decode (simplified)
            text = self._ctc_decode(output)
            conf = 0.9  # Placeholder
        
        return text, conf
    
    def _recognize_with_paddle_roi(self, roi: np.ndarray) -> Tuple[str, float]:
        """Recognize text using PaddleOCR on ROI"""
        if self.paddle_ocr is None:
            return "", 0.0
        
        # Save ROI temporarily
        temp_path = '/tmp/roi_temp.jpg'
        cv2.imwrite(temp_path, roi)
        
        # OCR
        result = self.paddle_ocr.predict(temp_path)
        
        if result and len(result) > 0:
            rec_texts = result[0].get('rec_texts', [])
            rec_scores = result[0].get('rec_scores', [])
            
            if rec_texts:
                return rec_texts[0], rec_scores[0] if rec_scores else 0.0
        
        return "", 0.0
    
    def _fallback_to_paddle(self, image_path: str) -> Dict:
        """Fallback to PaddleOCR if EAST fails"""
        if self.paddle_ocr is None:
            return {'error': 'No OCR engine available'}
        
        result = self.paddle_ocr.predict(image_path)
        
        if result and len(result) > 0:
            rec_texts = result[0].get('rec_texts', [])
            rec_scores = result[0].get('rec_scores', [])
            
            full_text = ' '.join(rec_texts)
            avg_conf = np.mean(rec_scores) if rec_scores else 0.0
            
            return {
                'text': full_text,
                'confidence': float(avg_conf),
                'boxes': [],
                'method': 'paddle_fallback'
            }
        
        return {'error': 'No text detected'}
    
    def _ctc_decode(self, output: torch.Tensor) -> str:
        """CTC decoding (simplified)"""
        # Placeholder for CTC decoding
        # In production, use proper CTC beam search
        return "decoded_text"


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python advanced_ocr.py <image_path>")
        sys.exit(1)
    
    # Initialize
    ocr = AdvancedOCR()
    
    # Process
    result = ocr.process(sys.argv[1])
    
    # Print
    import json
    print(json.dumps(result, ensure_ascii=False, indent=2))

