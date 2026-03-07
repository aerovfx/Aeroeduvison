"""
Data Preprocessing Pipeline for OCR Training
Handles image augmentation, normalization, and dataset preparation
"""

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import albumentations as A
from albumentations.pytorch import ToTensorV2
import os
import json
from typing import List, Tuple, Dict
import random


class OCRDataPreprocessor:
    """
    Preprocessing pipeline for OCR training data
    
    Features:
    - Image normalization
    - Augmentation (rotation, noise, blur, etc.)
    - Aspect ratio preservation
    - Bounding box extraction
    """
    
    def __init__(self, target_height=32, target_width=128):
        self.target_height = target_height
        self.target_width = target_width
        
        # Augmentation pipeline
        self.augmentation = A.Compose([
            # Geometric transforms
            A.Rotate(limit=5, p=0.3),  # Small rotation
            A.ShiftScaleRotate(
                shift_limit=0.0625,
                scale_limit=0.1,
                rotate_limit=5,
                p=0.3
            ),
            
            # Perspective & distortion
            A.Perspective(scale=(0.05, 0.1), p=0.2),
            A.ElasticTransform(alpha=50, sigma=5, p=0.2),
            
            # Brightness & contrast
            A.RandomBrightnessContrast(
                brightness_limit=0.2,
                contrast_limit=0.2,
                p=0.5
            ),
            
            # Noise
            A.GaussNoise(var_limit=(10.0, 50.0), p=0.3),
            A.ISONoise(p=0.2),
            
            # Blur
            A.GaussianBlur(blur_limit=(3, 5), p=0.2),
            A.MotionBlur(blur_limit=3, p=0.2),
            
            # Quality degradation (simulate low-quality scans)
            A.ImageCompression(quality_lower=75, quality_upper=100, p=0.3),
            
            # Shadow & lighting
            A.RandomShadow(p=0.2),
        ])
    
    def resize_with_aspect_ratio(self, image: np.ndarray) -> np.ndarray:
        """
        Resize image while preserving aspect ratio
        Pads with white to reach target size
        """
        h, w = image.shape[:2]
        
        # Calculate scaling factor
        scale = self.target_height / h
        new_w = int(w * scale)
        
        # Resize
        if new_w > self.target_width:
            # Image is too wide, scale by width instead
            scale = self.target_width / w
            new_h = int(h * scale)
            resized = cv2.resize(image, (self.target_width, new_h))
        else:
            resized = cv2.resize(image, (new_w, self.target_height))
        
        # Create canvas
        canvas = np.ones((self.target_height, self.target_width), dtype=np.uint8) * 255
        
        # Place resized image on canvas
        h_resized, w_resized = resized.shape[:2]
        y_offset = (self.target_height - h_resized) // 2
        x_offset = (self.target_width - w_resized) // 2
        
        canvas[y_offset:y_offset+h_resized, x_offset:x_offset+w_resized] = resized
        
        return canvas
    
    def preprocess_image(self, image: np.ndarray, augment=False) -> np.ndarray:
        """
        Preprocess image for OCR
        
        Args:
            image: Input image (numpy array)
            augment: Apply augmentation (for training)
            
        Returns:
            Preprocessed image
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        
        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11, 2
        )
        
        # Apply augmentation if requested
        if augment:
            # Convert to 3 channel for albumentations
            binary_3ch = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
            augmented = self.augmentation(image=binary_3ch)
            binary = cv2.cvtColor(augmented['image'], cv2.COLOR_RGB2GRAY)
        
        # Resize with aspect ratio preservation
        resized = self.resize_with_aspect_ratio(binary)
        
        # Normalize to [-1, 1]
        normalized = (resized.astype(np.float32) / 127.5) - 1.0
        
        return normalized
    
    def extract_text_lines(self, image: np.ndarray) -> List[np.ndarray]:
        """
        Extract individual text lines from image
        Useful for preprocessing test papers
        
        Args:
            image: Input image
            
        Returns:
            List of line images
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Threshold
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Get bounding boxes
        bboxes = [cv2.boundingRect(c) for c in contours]
        
        # Filter small boxes and sort by y-coordinate (top to bottom)
        bboxes = [(x, y, w, h) for x, y, w, h in bboxes if w > 20 and h > 10]
        bboxes = sorted(bboxes, key=lambda b: b[1])
        
        # Extract line images
        lines = []
        for x, y, w, h in bboxes:
            line_img = gray[y:y+h, x:x+w]
            lines.append(line_img)
        
        return lines
    
    def create_dataset_from_images(self, 
                                   input_dir: str, 
                                   output_dir: str,
                                   labels_dict: Dict[str, str]):
        """
        Prepare dataset for training
        
        Args:
            input_dir: Directory with raw images
            output_dir: Directory to save processed images
            labels_dict: Dictionary mapping filenames to text labels
        """
        os.makedirs(os.path.join(output_dir, 'images'), exist_ok=True)
        
        processed_labels = {}
        
        print(f"Processing {len(labels_dict)} images...")
        
        for img_name, label in labels_dict.items():
            try:
                # Load image
                img_path = os.path.join(input_dir, img_name)
                image = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                
                if image is None:
                    print(f"Warning: Could not load {img_name}")
                    continue
                
                # Preprocess
                processed = self.preprocess_image(image, augment=False)
                
                # Convert back to uint8 for saving
                processed_uint8 = ((processed + 1.0) * 127.5).astype(np.uint8)
                
                # Save
                output_path = os.path.join(output_dir, 'images', img_name)
                cv2.imwrite(output_path, processed_uint8)
                
                processed_labels[img_name] = label
                
            except Exception as e:
                print(f"Error processing {img_name}: {e}")
        
        # Save labels
        labels_path = os.path.join(output_dir, 'labels.json')
        with open(labels_path, 'w', encoding='utf-8') as f:
            json.dump(processed_labels, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Processed {len(processed_labels)} images")
        print(f"✅ Saved to {output_dir}")


# Data Augmentation Examples
def create_synthetic_data(text: str, 
                         font_paths: List[str],
                         output_dir: str,
                         num_samples=100):
    """
    Generate synthetic training data from text
    Useful for augmenting small datasets
    
    Args:
        text: Sample text to render
        font_paths: List of font file paths
        output_dir: Directory to save synthetic images
        num_samples: Number of samples to generate
    """
    from PIL import ImageFont, ImageDraw
    
    os.makedirs(os.path.join(output_dir, 'images'), exist_ok=True)
    labels = {}
    
    print(f"Generating {num_samples} synthetic samples...")
    
    for i in range(num_samples):
        # Random font
        font_path = random.choice(font_paths)
        font_size = random.randint(20, 32)
        font = ImageFont.truetype(font_path, font_size)
        
        # Create image
        img_width = random.randint(128, 256)
        img = Image.new('L', (img_width, 32), color=255)
        draw = ImageDraw.Draw(img)
        
        # Random position
        x = random.randint(0, 20)
        y = random.randint(0, 5)
        
        # Draw text
        draw.text((x, y), text, font=font, fill=0)
        
        # Random augmentation
        if random.random() > 0.5:
            img = img.filter(ImageFilter.GaussianBlur(random.uniform(0.5, 1.5)))
        
        if random.random() > 0.5:
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(random.uniform(0.8, 1.2))
        
        # Save
        img_name = f"synthetic_{i:04d}.jpg"
        img_path = os.path.join(output_dir, 'images', img_name)
        img.save(img_path)
        
        labels[img_name] = text
    
    # Save labels
    with open(os.path.join(output_dir, 'labels.json'), 'w', encoding='utf-8') as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Generated {num_samples} synthetic samples")


if __name__ == "__main__":
    print("OCR Data Preprocessing Pipeline")
    print("=" * 60)
    
    # Test preprocessing
    preprocessor = OCRDataPreprocessor(target_height=32, target_width=128)
    
    # Test with sample image
    test_img = np.random.randint(0, 255, (50, 200), dtype=np.uint8)
    processed = preprocessor.preprocess_image(test_img, augment=True)
    
    print(f"Input shape: {test_img.shape}")
    print(f"Output shape: {processed.shape}")
    print(f"Output range: [{processed.min():.2f}, {processed.max():.2f}]")
    print("✅ Preprocessing pipeline ready!")

