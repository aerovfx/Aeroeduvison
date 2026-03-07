"""
ML Training Engine
Handles model training with real-time progress updates
"""

import tensorflow as tf
from tensorflow import keras
import numpy as np
import time
from typing import Optional, Callable, Dict, Any
from pathlib import Path
import json
from datetime import datetime

class TrainingCallback(keras.callbacks.Callback):
    """Custom callback for real-time progress updates"""
    
    def __init__(self, progress_callback: Optional[Callable] = None):
        super().__init__()
        self.progress_callback = progress_callback
        self.epoch_start_time = None
        self.training_start_time = None
        
    def on_train_begin(self, logs=None):
        self.training_start_time = time.time()
        if self.progress_callback:
            self.progress_callback({
                "status": "started",
                "message": "Training started"
            })
    
    def on_epoch_begin(self, epoch, logs=None):
        self.epoch_start_time = time.time()
        if self.progress_callback:
            self.progress_callback({
                "status": "training",
                "epoch": epoch + 1,
                "message": f"Starting epoch {epoch + 1}"
            })
    
    def on_epoch_end(self, epoch, logs=None):
        epoch_time = time.time() - self.epoch_start_time
        total_time = time.time() - self.training_start_time
        
        if self.progress_callback:
            self.progress_callback({
                "status": "training",
                "epoch": epoch + 1,
                "loss": float(logs.get('loss', 0)),
                "accuracy": float(logs.get('accuracy', 0)),
                "val_loss": float(logs.get('val_loss', 0)) if 'val_loss' in logs else None,
                "val_accuracy": float(logs.get('val_accuracy', 0)) if 'val_accuracy' in logs else None,
                "epoch_time": epoch_time,
                "total_time": total_time,
                "message": f"Epoch {epoch + 1} completed"
            })
    
    def on_train_end(self, logs=None):
        if self.progress_callback:
            self.progress_callback({
                "status": "completed",
                "message": "Training completed",
                "total_time": time.time() - self.training_start_time
            })


class Trainer:
    """ML Training Engine"""
    
    def __init__(self, model: keras.Model, config, progress_callback: Optional[Callable] = None):
        self.model = model
        self.config = config
        self.progress_callback = progress_callback
        self.history = None
        self.training_id = None
        self.is_training = False
        
    def train(
        self, 
        X_train: np.ndarray, 
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Train the model with real-time progress updates
        """
        self.is_training = True
        self.training_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        print("=" * 60)
        print(f"🚀 Starting Training: {self.training_id}")
        print("=" * 60)
        print(f"📊 Dataset: {len(X_train)} training samples")
        if X_val is not None:
            print(f"📊 Validation: {len(X_val)} samples")
        print(f"🎯 Model: {self.config.model_type}")
        print(f"📈 Epochs: {self.config.epochs}")
        print(f"🔢 Batch size: {self.config.batch_size}")
        print(f"📉 Learning rate: {self.config.learning_rate}")
        print("=" * 60)
        
        # Prepare validation data
        validation_data = None
        if X_val is not None and y_val is not None:
            validation_data = (X_val, y_val)
        elif self.config.validation_split > 0:
            # Split from training data
            split_idx = int(len(X_train) * (1 - self.config.validation_split))
            X_val = X_train[split_idx:]
            y_val = y_train[split_idx:]
            X_train = X_train[:split_idx]
            y_train = y_train[:split_idx]
            validation_data = (X_val, y_val)
        
        # Setup callbacks
        callbacks = [
            TrainingCallback(self.progress_callback)
        ]
        
        # Early stopping
        if self.config.early_stopping_patience > 0:
            callbacks.append(
                keras.callbacks.EarlyStopping(
                    monitor='val_loss' if validation_data else 'loss',
                    patience=self.config.early_stopping_patience,
                    restore_best_weights=True,
                    verbose=1
                )
            )
        
        # Model checkpoint
        checkpoint_path = Path(self.config.checkpoint_dir) / f"{self.training_id}_best.h5"
        callbacks.append(
            keras.callbacks.ModelCheckpoint(
                filepath=str(checkpoint_path),
                monitor='val_loss' if validation_data else 'loss',
                save_best_only=self.config.save_best_only,
                verbose=1
            )
        )
        
        # TensorBoard
        if self.config.tensorboard:
            log_dir = Path(self.config.log_dir) / self.training_id
            callbacks.append(
                keras.callbacks.TensorBoard(
                    log_dir=str(log_dir),
                    histogram_freq=1,
                    write_graph=True,
                    write_images=True
                )
            )
        
        # Learning rate scheduler
        callbacks.append(
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss' if validation_data else 'loss',
                factor=0.5,
                patience=2,
                min_lr=1e-7,
                verbose=1
            )
        )
        
        # Train model
        try:
            start_time = time.time()
            
            self.history = self.model.fit(
                X_train, y_train,
                batch_size=self.config.batch_size,
                epochs=self.config.epochs,
                validation_data=validation_data,
                callbacks=callbacks,
                verbose=self.config.verbose
            )
            
            training_time = time.time() - start_time
            
            print("\n" + "=" * 60)
            print("✅ Training completed successfully!")
            print(f"⏱️  Total time: {training_time:.2f}s")
            print("=" * 60)
            
            # Evaluate on validation set
            results = {}
            if validation_data:
                val_loss, val_acc = self.model.evaluate(X_val, y_val, verbose=0)
                results = {
                    "val_loss": float(val_loss),
                    "val_accuracy": float(val_acc)
                }
                print(f"📊 Final Validation Loss: {val_loss:.4f}")
                print(f"📊 Final Validation Accuracy: {val_acc:.4f}")
            
            # Save final model
            model_path = Path(self.config.output_dir) / f"{self.training_id}_{self.config.model_name}.h5"
            self.model.save(str(model_path))
            print(f"💾 Model saved to: {model_path}")
            
            # Save training history
            history_path = Path(self.config.output_dir) / f"{self.training_id}_history.json"
            with open(history_path, 'w') as f:
                history_dict = {
                    k: [float(v) for v in vals] 
                    for k, vals in self.history.history.items()
                }
                json.dump(history_dict, f, indent=2)
            print(f"📝 Training history saved to: {history_path}")
            
            # Save training metadata
            metadata = {
                "training_id": self.training_id,
                "config": {
                    "model_type": self.config.model_type,
                    "num_classes": self.config.num_classes,
                    "epochs": self.config.epochs,
                    "batch_size": self.config.batch_size,
                    "learning_rate": self.config.learning_rate,
                    "dataset": self.config.dataset_name
                },
                "results": results,
                "training_time": training_time,
                "model_path": str(model_path),
                "checkpoint_path": str(checkpoint_path),
                "timestamp": datetime.now().isoformat()
            }
            
            metadata_path = Path(self.config.output_dir) / f"{self.training_id}_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            print("=" * 60)
            
            return {
                "success": True,
                "training_id": self.training_id,
                "model_path": str(model_path),
                "results": results,
                "training_time": training_time,
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"\n❌ Training failed: {e}")
            if self.progress_callback:
                self.progress_callback({
                    "status": "failed",
                    "message": f"Training failed: {str(e)}"
                })
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            self.is_training = False
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """Evaluate model on test set"""
        print("\n🧪 Evaluating model on test set...")
        
        loss, accuracy = self.model.evaluate(X_test, y_test, verbose=0)
        
        print(f"📊 Test Loss: {loss:.4f}")
        print(f"📊 Test Accuracy: {accuracy:.4f}")
        
        return {
            "test_loss": float(loss),
            "test_accuracy": float(accuracy)
        }
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        return self.model.predict(X)
    
    def predict_classes(self, X: np.ndarray) -> np.ndarray:
        """Predict class labels"""
        predictions = self.predict(X)
        return np.argmax(predictions, axis=1)
    
    def get_training_summary(self) -> Dict[str, Any]:
        """Get summary of training"""
        if not self.history:
            return {"error": "No training history available"}
        
        history_dict = {
            k: [float(v) for v in vals]
            for k, vals in self.history.history.items()
        }
        
        return {
            "training_id": self.training_id,
            "epochs_completed": len(self.history.epoch),
            "history": history_dict,
            "final_metrics": {
                k: float(v[-1]) for k, v in self.history.history.items()
            }
        }
    
    def stop_training(self):
        """Stop training (for future implementation with threading)"""
        self.is_training = False
        print("⏹️  Training stop requested")


# Example usage and testing
if __name__ == "__main__":
    from config import MNIST_CONFIG
    from data_loader import DataLoader
    from model_builder import ModelBuilder
    
    print("=" * 60)
    print("🧪 Testing Trainer")
    print("=" * 60)
    
    # Load data
    print("\n📥 Loading data...")
    loader = DataLoader(MNIST_CONFIG)
    X_train, y_train, X_test, y_test = loader.load_data()
    
    # Build model
    print("\n🏗️  Building model...")
    builder = ModelBuilder(MNIST_CONFIG)
    model = builder.build_cnn()
    
    # Create trainer
    def progress_callback(info):
        if info["status"] == "training":
            print(f"   Epoch {info['epoch']}: loss={info['loss']:.4f}, acc={info['accuracy']:.4f}")
    
    trainer = Trainer(model, MNIST_CONFIG, progress_callback=progress_callback)
    
    # Train (with fewer epochs for demo)
    MNIST_CONFIG.epochs = 2
    print("\n🚀 Starting training...")
    result = trainer.train(X_train, y_train)
    
    if result["success"]:
        print(f"\n✅ Training successful!")
        print(f"   Model: {result['model_path']}")
        print(f"   Time: {result['training_time']:.2f}s")
        
        # Evaluate
        test_results = trainer.evaluate(X_test, y_test)
        print(f"\n🧪 Test results:")
        print(f"   Accuracy: {test_results['test_accuracy']:.4f}")
    
    print("\n" + "=" * 60)
    print("✅ Trainer test complete!")
    print("=" * 60)

