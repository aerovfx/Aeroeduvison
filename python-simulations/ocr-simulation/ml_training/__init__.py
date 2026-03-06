"""
ML Training Package
Complete system for training handwriting recognition models
"""

from .config import TrainingConfig, CONFIGS, MNIST_CONFIG, EMNIST_CONFIG, CUSTOM_HANDWRITING_CONFIG
from .data_loader import DataLoader
from .model_builder import ModelBuilder
from .trainer import Trainer, TrainingCallback
from .model_exporter import ModelExporter

__version__ = "1.0.0"

__all__ = [
    "TrainingConfig",
    "CONFIGS",
    "MNIST_CONFIG",
    "EMNIST_CONFIG",
    "CUSTOM_HANDWRITING_CONFIG",
    "DataLoader",
    "ModelBuilder",
    "Trainer",
    "TrainingCallback",
    "ModelExporter",
]

