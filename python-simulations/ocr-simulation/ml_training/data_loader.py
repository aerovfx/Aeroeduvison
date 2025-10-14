"""
Data Loader for ML Training
Supports Hugging Face datasets and local data
"""

import numpy as np
import os
from typing import Tuple, Optional
from pathlib import Path
import json

class DataLoader:
    """Load training data from various sources"""
    
    def __init__(self, config):
        self.config = config
        self.data_loaded = False
        
    def load_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Load training data based on configuration
        Returns: (X_train, y_train, X_test, y_test)
        """
        if self.config.data_source == "huggingface":
            return self._load_from_huggingface()
        elif self.config.data_source == "local":
            return self._load_from_local()
        else:
            raise ValueError(f"Unknown data source: {self.config.data_source}")
    
    def _load_from_huggingface(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load data from Hugging Face datasets"""
        try:
            from datasets import load_dataset
            
            print(f"📥 Loading dataset from Hugging Face: {self.config.hf_dataset}")
            
            # Load dataset
            if self.config.hf_dataset == "mnist":
                dataset = load_dataset("mnist")
                train_data = dataset["train"]
                test_data = dataset["test"]
                
                # Convert to numpy
                X_train = np.array([np.array(img) for img in train_data["image"]])
                y_train = np.array(train_data["label"])
                X_test = np.array([np.array(img) for img in test_data["image"]])
                y_test = np.array(test_data["label"])
                
            elif self.config.hf_dataset == "emnist":
                # EMNIST letters subset
                dataset = load_dataset("emnist", "letters")
                train_data = dataset["train"]
                test_data = dataset["test"]
                
                X_train = np.array([np.array(img) for img in train_data["image"]])
                y_train = np.array(train_data["label"])
                X_test = np.array([np.array(img) for img in test_data["image"]])
                y_test = np.array(test_data["label"])
                
            else:
                raise ValueError(f"Unsupported HF dataset: {self.config.hf_dataset}")
            
            print(f"✅ Loaded {len(X_train)} training samples, {len(X_test)} test samples")
            
        except ImportError:
            print("⚠️  Hugging Face 'datasets' not installed. Using synthetic data.")
            return self._generate_synthetic_data()
        except Exception as e:
            print(f"⚠️  Error loading from Hugging Face: {e}")
            print("   Using synthetic data instead.")
            return self._generate_synthetic_data()
        
        return self._preprocess_data(X_train, y_train, X_test, y_test)
    
    def _load_from_local(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load data from local directory"""
        data_path = Path(self.config.data_dir)
        
        # Check for numpy files
        train_file = data_path / f"{self.config.dataset_name}_train.npz"
        test_file = data_path / f"{self.config.dataset_name}_test.npz"
        
        if train_file.exists() and test_file.exists():
            print(f"📂 Loading local data from {data_path}")
            train_data = np.load(train_file)
            test_data = np.load(test_file)
            
            X_train = train_data["X"]
            y_train = train_data["y"]
            X_test = test_data["X"]
            y_test = test_data["y"]
            
            print(f"✅ Loaded {len(X_train)} training samples, {len(X_test)} test samples")
        else:
            print(f"⚠️  Local data not found. Generating synthetic data for demo.")
            return self._generate_synthetic_data()
        
        return self._preprocess_data(X_train, y_train, X_test, y_test)
    
    def _generate_synthetic_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Generate synthetic data for demonstration"""
        print("🎲 Generating synthetic handwriting data for demo...")
        
        h, w, c = self.config.input_shape
        num_train = 1000
        num_test = 200
        
        # Generate random images
        X_train = np.random.rand(num_train, h, w) * 255
        y_train = np.random.randint(0, self.config.num_classes, num_train)
        
        X_test = np.random.rand(num_test, h, w) * 255
        y_test = np.random.randint(0, self.config.num_classes, num_test)
        
        print(f"✅ Generated {num_train} training samples, {num_test} test samples")
        
        return self._preprocess_data(X_train, y_train, X_test, y_test)
    
    def _preprocess_data(self, X_train, y_train, X_test, y_test) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Preprocess data: normalize, reshape, etc."""
        
        # Normalize to [0, 1]
        X_train = X_train.astype('float32') / 255.0
        X_test = X_test.astype('float32') / 255.0
        
        # Reshape to match input_shape
        h, w, c = self.config.input_shape
        if len(X_train.shape) == 3:  # (N, H, W)
            X_train = X_train.reshape(-1, h, w, c)
            X_test = X_test.reshape(-1, h, w, c)
        
        print(f"📊 Data shape: train={X_train.shape}, test={X_test.shape}")
        print(f"📊 Label shape: train={y_train.shape}, test={y_test.shape}")
        print(f"📊 Classes: {self.config.num_classes}")
        
        self.data_loaded = True
        return X_train, y_train, X_test, y_test
    
    def save_local_data(self, X_train, y_train, X_test, y_test):
        """Save data to local directory for future use"""
        data_path = Path(self.config.data_dir)
        data_path.mkdir(parents=True, exist_ok=True)
        
        train_file = data_path / f"{self.config.dataset_name}_train.npz"
        test_file = data_path / f"{self.config.dataset_name}_test.npz"
        
        np.savez_compressed(train_file, X=X_train, y=y_train)
        np.savez_compressed(test_file, X=X_test, y=y_test)
        
        print(f"💾 Saved data to {data_path}")
    
    def apply_augmentation(self, X, y):
        """Apply data augmentation (if enabled)"""
        if not self.config.augmentation:
            return X, y
        
        print("🔄 Applying data augmentation...")
        
        # Simple augmentation: rotation, shift, zoom
        # (In production, use ImageDataGenerator or albumentations)
        augmented_X = []
        augmented_y = []
        
        for img, label in zip(X, y):
            # Original
            augmented_X.append(img)
            augmented_y.append(label)
            
            # Rotated (small angle)
            # Add more augmentations here
        
        return np.array(augmented_X), np.array(augmented_y)

