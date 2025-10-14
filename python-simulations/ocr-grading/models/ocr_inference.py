"""
OCR Inference Engine
Supports both CRNN and Transformer models
Optimized for production use with custom trained models
"""

import torch
import torch.nn as nn
import cv2
import numpy as np
from PIL import Image
import os
from typing import Dict, List, Optional
import logging

from crnn_architecture import CRNN, VIETNAMESE_ALPHABET
from transformer_ocr import TransformerOCR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OCRInferenceEngine:
    """
    Production-ready OCR inference engine
    Supports custom trained models
    """
    
    def __init__(self, 
                 model_path: str,
                 model_type='crnn',
                 device='cuda' if torch.cuda.is_available() else 'cpu',
                 alphabet=VIETNAMESE_ALPHABET):
        """
        Initialize inference engine
        
        Args:
            model_path: Path to trained model checkpoint (.pth)
            model_type: 'crnn' or 'transformer'
            device: 'cuda' or 'cpu'
            alphabet: Character alphabet
        """
        self.device = device
        self.alphabet = alphabet
        self.model_type = model_type
        
        # Create character mappings
        self.char2idx = {char: idx + 1 for idx, char in enumerate(alphabet)}
        self.idx2char = {idx: char for char, idx in self.char2idx.items()}
        self.idx2char[0] = ''  # CTC blank
        
        # Load model
        logger.info(f"Loading {model_type.upper()} model from {model_path}...")
        self.model = self._load_model(model_path, model_type)
        self.model.eval()
        
        logger.info(f"✅ Model loaded successfully on {device}")
        logger.info(f"✅ Alphabet size: {len(alphabet)}")
    
    def _load_model(self, model_path: str, model_type: str):
        """Load trained model from checkpoint"""
        checkpoint = torch.load(model_path, map_location=self.device)
        
        if model_type == 'crnn':
            model = CRNN(
                img_height=32,
                num_channels=1,
                num_classes=len(self.alphabet) + 1,
                hidden_size=256
            )
        elif model_type == 'transformer':
            model = TransformerOCR(
                img_height=32,
                img_width=128,
                num_channels=1,
                num_classes=len(self.alphabet) + 4,
                d_model=512,
                nhead=8
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Load state dict
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
        else:
            model.load_state_dict(checkpoint)
        
        model = model.to(self.device)
        model.eval()
        
        return model
    
    def preprocess_image(self, image: np.ndarray) -> torch.Tensor:
        """
        Preprocess image for inference
        
        Args:
            image: Input image (numpy array)
            
        Returns:
            Preprocessed tensor (1, 1, H, W)
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Resize to target size while preserving aspect ratio
        h, w = gray.shape
        scale = 32 / h
        new_w = int(w * scale)
        
        if new_w > 128:
            # Too wide, use fixed width
            resized = cv2.resize(gray, (128, 32))
        else:
            # Add padding
            resized = cv2.resize(gray, (new_w, 32))
            canvas = np.ones((32, 128), dtype=np.uint8) * 255
            canvas[:, :new_w] = resized
            resized = canvas
        
        # Normalize to [-1, 1]
        normalized = (resized.astype(np.float32) / 127.5) - 1.0
        
        # Convert to tensor
        tensor = torch.from_numpy(normalized).unsqueeze(0).unsqueeze(0)  # (1, 1, H, W)
        
        return tensor.to(self.device)
    
    def decode_ctc(self, outputs: torch.Tensor) -> List[str]:
        """
        Decode CTC outputs to text
        
        Args:
            outputs: (seq_len, batch, num_classes)
            
        Returns:
            List of decoded texts
        """
        _, preds = outputs.max(2)  # (seq_len, batch)
        preds = preds.transpose(1, 0)  # (batch, seq_len)
        
        decoded_texts = []
        
        for pred in preds:
            pred = pred.cpu().numpy()
            
            # Remove duplicates and blanks (CTC decoding)
            decoded_indices = []
            prev_idx = -1
            
            for idx in pred:
                if idx != 0 and idx != prev_idx:  # Not blank and not duplicate
                    decoded_indices.append(idx)
                prev_idx = idx
            
            # Convert indices to characters
            text = ''.join([self.idx2char.get(idx, '') for idx in decoded_indices])
            decoded_texts.append(text)
        
        return decoded_texts
    
    def recognize(self, image: np.ndarray) -> Dict:
        """
        Recognize text from image
        
        Args:
            image: Input image (numpy array)
            
        Returns:
            Dictionary with recognized text and metadata
        """
        with torch.no_grad():
            # Preprocess
            tensor = self.preprocess_image(image)
            
            # Forward pass
            if self.model_type == 'crnn':
                outputs = self.model(tensor)  # (seq_len, batch, num_classes)
                
                # Decode
                texts = self.decode_ctc(outputs)
                text = texts[0]
                
                # Calculate confidence (mean of top probabilities)
                probs = torch.softmax(outputs, dim=2)
                confidence = probs.max(2)[0].mean().item() * 100
                
            elif self.model_type == 'transformer':
                outputs = self.model(tensor)  # (batch, seq_len, num_classes)
                
                # Decode (simplified - in practice use beam search)
                _, preds = outputs.max(2)
                pred = preds[0].cpu().numpy()
                
                # Convert to text (remove special tokens)
                text = ''.join([self.idx2char.get(idx, '') for idx in pred if idx > 3])
                
                # Calculate confidence
                probs = torch.softmax(outputs, dim=2)
                confidence = probs.max(2)[0].mean().item() * 100
            
            return {
                'text': text,
                'confidence': confidence,
                'word_count': len(text.split()),
                'engine': f'{self.model_type}_custom',
                'model_path': 'custom_trained'
            }
    
    def recognize_from_file(self, image_path: str) -> Dict:
        """
        Recognize text from image file
        
        Args:
            image_path: Path to image
            
        Returns:
            Recognition results
        """
        # Load image (supports HEIC via pillow-heif)
        try:
            from pillow_heif import register_heif_opener
            register_heif_opener()
            
            pil_image = Image.open(image_path)
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            image = np.array(pil_image)
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        except:
            image = cv2.imread(image_path)
        
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        return self.recognize(image)


# Example usage
if __name__ == "__main__":
    print("=" * 60)
    print("OCR Inference Engine Test")
    print("=" * 60)
    
    # Check if model exists
    model_path = "checkpoints/best_model.pth"
    
    if os.path.exists(model_path):
        print(f"\n✅ Found model: {model_path}")
        
        # Initialize engine
        engine = OCRInferenceEngine(
            model_path=model_path,
            model_type='crnn',
            alphabet=VIETNAMESE_ALPHABET
        )
        
        # Test with sample image
        test_image = "test_sample.jpg"
        if os.path.exists(test_image):
            result = engine.recognize_from_file(test_image)
            
            print(f"\n📝 OCR Result:")
            print(f"   Text: {result['text']}")
            print(f"   Confidence: {result['confidence']:.2f}%")
            print(f"   Words: {result['word_count']}")
            print(f"   Engine: {result['engine']}")
        else:
            print(f"\n⚠️  Test image not found: {test_image}")
    else:
        print(f"\n⚠️  Model not found: {model_path}")
        print("Train a model first using:")
        print("  python training/train_crnn.py --dataset your_dataset/")

