"""
ML Training Configuration
Defines training parameters, model architecture, and data sources
"""

from dataclasses import dataclass
from typing import Optional, List
import os

@dataclass
class TrainingConfig:
    """Configuration for ML model training"""
    
    # Model parameters
    model_type: str = "cnn"  # "cnn", "resnet", "efficientnet"
    num_classes: int = 10  # 0-9 digits or custom classes
    input_shape: tuple = (28, 28, 1)  # (height, width, channels)
    
    # Training parameters
    batch_size: int = 32
    epochs: int = 10
    learning_rate: float = 0.001
    validation_split: float = 0.2
    early_stopping_patience: int = 3
    
    # Data parameters
    data_source: str = "local"  # "local" or "huggingface"
    dataset_name: str = "mnist"  # "mnist", "emnist", custom name
    data_dir: str = "ml_training/data"
    augmentation: bool = True
    
    # Hugging Face parameters
    hf_dataset: Optional[str] = None  # e.g., "mnist" from HF
    hf_split: str = "train"
    
    # Checkpoint parameters
    checkpoint_dir: str = "ml_training/checkpoints"
    save_best_only: bool = True
    save_frequency: int = 1  # Save every N epochs
    
    # Output parameters
    output_dir: str = "ml_training/models"
    model_name: str = "handwriting_model"
    export_format: List[str] = None  # ["h5", "tflite", "onnx"]
    
    # Logging
    log_dir: str = "ml_training/logs"
    tensorboard: bool = True
    verbose: int = 1
    
    def __post_init__(self):
        if self.export_format is None:
            self.export_format = ["h5", "tflite"]
        
        # Create directories
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.checkpoint_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.log_dir, exist_ok=True)


# Predefined configurations
MNIST_CONFIG = TrainingConfig(
    model_type="cnn",
    num_classes=10,
    dataset_name="mnist",
    data_source="huggingface",
    hf_dataset="mnist",
    epochs=10,
    batch_size=128
)

EMNIST_CONFIG = TrainingConfig(
    model_type="cnn",
    num_classes=26,  # A-Z
    dataset_name="emnist-letters",
    data_source="huggingface",
    hf_dataset="emnist",
    epochs=15,
    batch_size=64
)

CUSTOM_HANDWRITING_CONFIG = TrainingConfig(
    model_type="resnet",
    num_classes=62,  # 0-9, A-Z, a-z
    dataset_name="custom-handwriting",
    data_source="local",
    epochs=20,
    batch_size=32,
    learning_rate=0.0001
)

# Configuration presets
CONFIGS = {
    "mnist": MNIST_CONFIG,
    "emnist": EMNIST_CONFIG,
    "custom": CUSTOM_HANDWRITING_CONFIG
}

