#!/usr/bin/env python3
"""
MediaPipe Object Detection Service for AeroEduvison
Detects objects in images using MediaPipe Tasks Python API
"""

import os
import sys
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from typing import List, Dict, Any
import json
import base64
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('mediapipe-object-detector')

# Constants
MARGIN = 10  # pixels
ROW_SIZE = 10  # pixels
FONT_SIZE = 1
FONT_THICKNESS = 1
TEXT_COLOR = (255, 0, 0)  # red

# Model path - download from MediaPipe
MODEL_PATH = os.getenv(
    'MEDIAPIPE_MODEL_PATH',
    '/Users/pixibox/Aeroeduvison/python-simulations/mediapipe-models/efficientdet_lite0.tflite'
)


class ObjectDetector:
    """MediaPipe Object Detection wrapper"""
    
    def __init__(self, model_path: str = MODEL_PATH, score_threshold: float = 0.5):
        self.model_path = model_path
        self.score_threshold = score_threshold
        self.detector = None
        self._initialize_detector()
    
    def _initialize_detector(self):
        """Initialize the MediaPipe object detector"""
        try:
            if not os.path.exists(self.model_path):
                logger.error(f"Model file not found: {self.model_path}")
                raise FileNotFoundError(f"Model file not found: {self.model_path}")
            
            base_options = python.BaseOptions(model_asset_path=self.model_path)
            options = vision.ObjectDetectorOptions(
                base_options=base_options,
                score_threshold=self.score_threshold
            )
            self.detector = vision.ObjectDetector.create_from_options(options)
            logger.info(f"Object detector initialized with model: {self.model_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize detector: {e}")
            raise
    
    def detect(self, image_path: str = None, image_bytes: bytes = None) -> Dict[str, Any]:
        """
        Detect objects in an image
        
        Args:
            image_path: Path to the image file, OR
            image_bytes: Image bytes
            
        Returns:
            Dictionary with detections and annotated image
        """
        if not self.detector:
            raise RuntimeError("Detector not initialized")
        
        # Load image
        if image_path:
            image = mp.Image.create_from_file(image_path)
            image_np = cv2.imread(image_path)
        elif image_bytes:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
            )
        else:
            raise ValueError("Either image_path or image_bytes must be provided")
        
        # Run detection
        detection_result = self.detector.detect(image)
        
        # Process results
        detections = []
        for detection in detection_result.detections:
            bbox = detection.bounding_box
            category = detection.categories[0]
            
            detections.append({
                'category': category.category_name,
                'score': float(category.score),
                'bounding_box': {
                    'origin_x': bbox.origin_x,
                    'origin_y': bbox.origin_y,
                    'width': bbox.width,
                    'height': bbox.height
                }
            })
        
        # Create annotated image
        annotated_image = self.visualize(image_np.copy(), detection_result)
        
        # Convert annotated image to base64
        _, buffer = cv2.imencode('.jpg', annotated_image)
        annotated_image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            'success': True,
            'detections': detections,
            'detection_count': len(detections),
            'annotated_image': f'data:image/jpeg;base64,{annotated_image_base64}',
            'image_width': image.width,
            'image_height': image.height
        }
    
    def visualize(self, image: np.ndarray, detection_result) -> np.ndarray:
        """
        Draw bounding boxes on the input image
        
        Args:
            image: The input BGR image
            detection_result: The list of all Detection entities
            
        Returns:
            Image with bounding boxes
        """
        for detection in detection_result.detections:
            # Draw bounding_box
            bbox = detection.bounding_box
            start_point = (bbox.origin_x, bbox.origin_y)
            end_point = (bbox.origin_x + bbox.width, bbox.origin_y + bbox.height)
            cv2.rectangle(image, start_point, end_point, TEXT_COLOR, 3)
            
            # Draw label and score
            category = detection.categories[0]
            category_name = category.category_name
            probability = round(category.score, 2)
            result_text = f'{category_name} ({probability})'
            text_location = (MARGIN + bbox.origin_x, MARGIN + ROW_SIZE + bbox.origin_y)
            cv2.putText(
                image, result_text, text_location,
                cv2.FONT_HERSHEY_PLAIN, FONT_SIZE, TEXT_COLOR, FONT_THICKNESS
            )
        
        return image
    
    def detect_batch(self, image_paths: List[str]) -> List[Dict[str, Any]]:
        """
        Detect objects in multiple images
        
        Args:
            image_paths: List of image file paths
            
        Returns:
            List of detection results
        """
        results = []
        for image_path in image_paths:
            try:
                result = self.detect(image_path=image_path)
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing {image_path}: {e}")
                results.append({
                    'success': False,
                    'error': str(e),
                    'image_path': image_path
                })
        return results


# Global detector instance
_detector: ObjectDetector = None


def get_detector() -> ObjectDetector:
    """Get or create the global detector instance"""
    global _detector
    if _detector is None:
        _detector = ObjectDetector()
    return _detector


def detect_objects(image_path: str = None, image_bytes: bytes = None, score_threshold: float = 0.5) -> Dict[str, Any]:
    """
    Detect objects in an image (convenience function)
    
    Args:
        image_path: Path to image file
        image_bytes: Image bytes
        score_threshold: Confidence threshold
        
    Returns:
        Detection results
    """
    try:
        detector = ObjectDetector(score_threshold=score_threshold)
        return detector.detect(image_path=image_path, image_bytes=image_bytes)
    except Exception as e:
        logger.error(f"Detection error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


# CLI interface
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='MediaPipe Object Detection')
    parser.add_argument('--image', type=str, help='Path to input image')
    parser.add_argument('--output', type=str, help='Path to save annotated image')
    parser.add_argument('--threshold', type=float, default=0.5, help='Score threshold')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    if not args.image:
        print("Error: --image is required")
        sys.exit(1)
    
    result = detect_objects(image_path=args.image, score_threshold=args.threshold)
    
    if args.json:
        # Remove base64 image for JSON output
        output = {k: v for k, v in result.items() if k != 'annotated_image'}
        print(json.dumps(output, indent=2))
    else:
        print(f"Detected {result.get('detection_count', 0)} objects:")
        for det in result.get('detections', []):
            print(f"  - {det['category']}: {det['score']:.2f}")
    
    if args.output and result.get('success'):
        # Save annotated image
        import base64
        img_data = base64.b64decode(result['annotated_image'].split(',')[1])
        with open(args.output, 'wb') as f:
            f.write(img_data)
        print(f"Annotated image saved to: {args.output}")
