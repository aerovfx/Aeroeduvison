"""
Dataset Loader for Vietnamese Handwriting OCR
Supports: ZIP files, Hugging Face datasets, local folders
"""

import os
import csv
import random
import zipfile
import pandas as pd
import chardet
import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple
import torch
from torch.utils.data import Dataset
import torchvision.transforms as transforms
from PIL import Image
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_from_zip(zip_path: str, extract_dir: str = 'vn_handwritten_images') -> Tuple[List[str], List[str], List[str], List[str]]:
    """
    Load handwritten dataset from ZIP file
    
    Args:
        zip_path: Path to ZIP file
        extract_dir: Directory to extract files
        
    Returns:
        train_images, train_labels, val_images, val_labels
    """
    logger.info(f"Loading dataset from ZIP: {zip_path}")
    
    os.makedirs(extract_dir, exist_ok=True)
    
    # Extract ZIP if not already extracted
    if not any(os.scandir(extract_dir)):
        logger.info("Extracting ZIP file...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        logger.info(f"✅ Extracted to: {extract_dir}")
    else:
        logger.info(f"📦 Using existing folder: {extract_dir}")
    
    # Find CSV file (skip __MACOSX)
    csv_file = None
    for root, dirs, files in os.walk(extract_dir):
        # Skip __MACOSX directory
        if '__MACOSX' in root:
            continue
        for f in files:
            if f.endswith('.csv') and not f.startswith('._'):
                csv_file = os.path.join(root, f)
                break
        if csv_file:
            break
    
    if not csv_file:
        raise FileNotFoundError(f"❌ No CSV file found in {extract_dir}")
    
    logger.info(f"📄 Found CSV: {csv_file}")
    
    # Detect encoding
    with open(csv_file, 'rb') as f:
        raw_data = f.read(50000)
        detected = chardet.detect(raw_data)
        encoding_type = detected['encoding'] or 'utf-8'
    
    logger.info(f"🔍 Detected encoding: {encoding_type}")
    
    # Read CSV
    df = pd.read_csv(csv_file, encoding=encoding_type, on_bad_lines='skip')
    logger.info(f"✅ Loaded {len(df)} rows from CSV")
    
    # Verify columns
    if not {'image', 'label'}.issubset(df.columns):
        logger.error(f"CSV columns: {df.columns.tolist()}")
        raise ValueError("CSV must have 'image' and 'label' columns")
    
    # Build image paths and labels
    base_dir = os.path.dirname(csv_file)
    image_paths = []
    labels = []
    
    for _, row in df.iterrows():
        img_path = os.path.join(base_dir, row['image'])
        if os.path.exists(img_path):
            image_paths.append(img_path)
            labels.append(str(row['label']))
        else:
            logger.warning(f"Image not found: {img_path}")
    
    if len(image_paths) == 0:
        raise ValueError("❌ No valid images found")
    
    logger.info(f"✅ Found {len(image_paths)} valid images")
    
    # Split train/validation (80/20)
    data = list(zip(image_paths, labels))
    random.shuffle(data)
    split_idx = int(len(data) * 0.8)
    
    train_data = data[:split_idx]
    val_data = data[split_idx:]
    
    train_images, train_labels = zip(*train_data) if train_data else ([], [])
    val_images, val_labels = zip(*val_data) if val_data else ([], [])
    
    logger.info(f"📊 Split: {len(train_images)} train, {len(val_images)} val")
    
    return list(train_images), list(train_labels), list(val_images), list(val_labels)


def load_from_huggingface(dataset_name: str = None) -> Tuple[List[str], List[str], List[str], List[str]]:
    """
    Load dataset from Hugging Face
    
    Args:
        dataset_name: HF dataset name (e.g., 'cinnamon/vnondb')
        
    Returns:
        train_images, train_labels, val_images, val_labels
    """
    if not dataset_name:
        logger.info("No Hugging Face dataset specified")
        return [], [], [], []
    
    try:
        from datasets import load_dataset
        
        logger.info(f"Loading from Hugging Face: {dataset_name}")
        dataset = load_dataset(dataset_name, split='train')
        
        image_paths = []
        labels = []
        os.makedirs("hf_images", exist_ok=True)
        
        logger.info(f"Processing {len(dataset)} samples...")
        
        for idx, item in enumerate(dataset):
            # Assume dataset has 'image' (PIL) and 'text' columns
            image = item.get('image')
            label = item.get('text')
            
            if image is None or label is None:
                continue
            
            # Save image locally
            img_path = f"hf_images/img_{idx:06d}.png"
            image.save(img_path)
            image_paths.append(img_path)
            labels.append(str(label))
        
        logger.info(f"✅ Saved {len(image_paths)} images from Hugging Face")
        
        # Split train/validation
        data = list(zip(image_paths, labels))
        random.shuffle(data)
        split_idx = int(len(data) * 0.8)
        
        train_data = data[:split_idx]
        val_data = data[split_idx:]
        
        train_images, train_labels = zip(*train_data) if train_data else ([], [])
        val_images, val_labels = zip(*val_data) if val_data else ([], [])
        
        logger.info(f"📊 HF Split: {len(train_images)} train, {len(val_images)} val")
        
        return list(train_images), list(train_labels), list(val_images), list(val_labels)
        
    except Exception as e:
        logger.error(f"Failed to load Hugging Face dataset: {e}")
        return [], [], [], []


def load_from_folder(folder_path: str, labels_file='labels.json') -> Tuple[List[str], List[str]]:
    """
    Load dataset from folder structure
    
    Args:
        folder_path: Path to folder containing images/ and labels.json
        labels_file: Name of labels file
        
    Returns:
        image_paths, labels
    """
    logger.info(f"Loading from folder: {folder_path}")
    
    images_dir = os.path.join(folder_path, 'images')
    labels_path = os.path.join(folder_path, labels_file)
    
    if not os.path.exists(images_dir):
        raise ValueError(f"Images directory not found: {images_dir}")
    if not os.path.exists(labels_path):
        raise ValueError(f"Labels file not found: {labels_path}")
    
    # Load labels
    import json
    with open(labels_path, 'r', encoding='utf-8') as f:
        labels_dict = json.load(f)
    
    logger.info(f"✅ Loaded {len(labels_dict)} labels")
    
    # Build paths
    image_paths = []
    labels = []
    
    for img_name, label in labels_dict.items():
        img_path = os.path.join(images_dir, img_name)
        if os.path.exists(img_path):
            image_paths.append(img_path)
            labels.append(str(label))
    
    logger.info(f"✅ Found {len(image_paths)} valid images")
    
    return image_paths, labels


class VietnameseHandwritingDataset(Dataset):
    """
    PyTorch Dataset for Vietnamese handwritten text
    """
    
    def __init__(self, 
                 image_paths: List[str], 
                 labels: List[str], 
                 vocab,
                 img_height: int = 32, 
                 img_width: int = 128, 
                 augment: bool = False):
        """
        Args:
            image_paths: List of image file paths
            labels: List of text labels
            vocab: VietnameseVocab instance
            img_height: Target image height
            img_width: Target image width
            augment: Apply data augmentation
        """
        self.image_paths = image_paths
        self.labels = labels
        self.vocab = vocab
        self.img_height = img_height
        self.img_width = img_width
        self.augment = augment
        
        # Base transform
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((img_height, img_width)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485], std=[0.229])
        ])
        
        # Augmentation transform
        self.augmentation = transforms.Compose([
            transforms.RandomRotation(degrees=5),
            transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
            transforms.ColorJitter(brightness=0.2, contrast=0.2)
        ]) if augment else None
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        """
        Returns:
            image: (1, H, W) tensor
            encoded_label: Tensor of character indices
            label_length: Length of label
        """
        # Load image
        img_path = self.image_paths[idx]
        image = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        
        # Handle missing image
        if image is None:
            logger.warning(f"Failed to load: {img_path}, using blank")
            image = np.ones((self.img_height, self.img_width), dtype=np.uint8) * 255
        
        # Apply augmentation
        if self.augment and random.random() > 0.5:
            image = Image.fromarray(image)
            if self.augmentation:
                image = self.augmentation(image)
            image = np.array(image)
        
        # Transform to tensor
        image = self.transform(image)
        
        # Encode label
        label = self.labels[idx]
        encoded_label = torch.tensor(self.vocab.encode(label), dtype=torch.long)
        label_length = len(encoded_label)
        
        return image, encoded_label, label_length


def collate_fn(batch):
    """
    Custom collate function for CTC loss
    
    Args:
        batch: List of (image, encoded_label, label_length)
        
    Returns:
        images: (batch, 1, H, W)
        targets: (sum of label lengths)
        target_lengths: (batch)
    """
    images, targets, target_lengths = zip(*batch)
    
    # Stack images
    images = torch.stack(images, 0)
    
    # Concatenate all targets
    targets = torch.cat(targets, 0)
    
    # Target lengths
    target_lengths = torch.LongTensor(target_lengths)
    
    return images, targets, target_lengths


# Example usage
if __name__ == "__main__":
    from vietnamese_vocab import VietnameseVocab
    
    print("=" * 60)
    print("Testing Dataset Loader")
    print("=" * 60)
    
    # Initialize vocabulary
    vocab = VietnameseVocab()
    
    # Test with sample data
    # Create dummy dataset for testing
    os.makedirs('test_dataset/images', exist_ok=True)
    
    # Create sample label file
    labels = {
        'img_001.jpg': 'Xin chào',
        'img_002.jpg': 'Tiếng Việt'
    }
    
    with open('test_dataset/labels.json', 'w', encoding='utf-8') as f:
        import json
        json.dump(labels, f, ensure_ascii=False, indent=2)
    
    # Create dummy images
    for img_name in labels.keys():
        img = np.ones((32, 128), dtype=np.uint8) * 255
        cv2.imwrite(f'test_dataset/images/{img_name}', img)
    
    # Load dataset
    image_paths, labels_list = load_from_folder('test_dataset')
    
    print(f"\n✅ Loaded {len(image_paths)} samples")
    print(f"Sample: {image_paths[0]} -> {labels_list[0]}")
    
    # Create dataset
    dataset = VietnameseHandwritingDataset(
        image_paths=image_paths,
        labels=labels_list,
        vocab=vocab,
        augment=True
    )
    
    # Test getitem
    image, target, length = dataset[0]
    print(f"\n✅ Dataset test:")
    print(f"   Image shape: {image.shape}")
    print(f"   Target: {target}")
    print(f"   Length: {length}")
    print(f"   Decoded: {vocab.decode(target.tolist())}")

