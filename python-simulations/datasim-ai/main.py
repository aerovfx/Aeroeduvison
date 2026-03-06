"""
DataSim.AI - Machine Learning Visualization System
Interactive ML training for educational purposes
"""

import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, mean_squared_error, r2_score
import json
from typing import Dict, List, Tuple, Optional
import random


class DataGenerator:
    """Generate various datasets for ML training"""
    
    @staticmethod
    def generate_linear(n_samples: int = 100, noise: float = 0.1) -> Tuple[np.ndarray, np.ndarray]:
        """Generate linear regression data"""
        X = np.random.rand(n_samples, 1) * 10
        y = 2.5 * X.ravel() + 5 + np.random.randn(n_samples) * noise
        return X, y
    
    @staticmethod
    def generate_polynomial(n_samples: int = 100, degree: int = 2, noise: float = 0.5) -> Tuple[np.ndarray, np.ndarray]:
        """Generate polynomial data"""
        X = np.random.rand(n_samples, 1) * 10 - 5
        y = 0.5 * X.ravel()**degree + np.random.randn(n_samples) * noise
        return X, y
    
    @staticmethod
    def generate_classification_2d(n_samples: int = 200, n_classes: int = 2, 
                                   separation: float = 1.5) -> Tuple[np.ndarray, np.ndarray]:
        """Generate 2D classification data"""
        if n_classes == 2:
            # Binary classification - two clusters
            n_per_class = n_samples // 2
            
            # Class 0 - cluster around (-2, -2)
            X0 = np.random.randn(n_per_class, 2) * 0.8 + np.array([-separation, -separation])
            y0 = np.zeros(n_per_class)
            
            # Class 1 - cluster around (2, 2)
            X1 = np.random.randn(n_per_class, 2) * 0.8 + np.array([separation, separation])
            y1 = np.ones(n_per_class)
            
            X = np.vstack([X0, X1])
            y = np.concatenate([y0, y1])
            
        elif n_classes == 3:
            # Multi-class - three clusters
            n_per_class = n_samples // 3
            
            X0 = np.random.randn(n_per_class, 2) * 0.6 + np.array([0, 2])
            X1 = np.random.randn(n_per_class, 2) * 0.6 + np.array([-1.5, -1])
            X2 = np.random.randn(n_per_class, 2) * 0.6 + np.array([1.5, -1])
            
            X = np.vstack([X0, X1, X2])
            y = np.concatenate([
                np.zeros(n_per_class),
                np.ones(n_per_class),
                np.full(n_per_class, 2)
            ])
        else:
            # Default to binary
            return DataGenerator.generate_classification_2d(n_samples, 2, separation)
        
        # Shuffle
        indices = np.random.permutation(len(X))
        return X[indices], y[indices]
    
    @staticmethod
    def generate_circles(n_samples: int = 200, noise: float = 0.1) -> Tuple[np.ndarray, np.ndarray]:
        """Generate concentric circles (non-linear separable)"""
        n_per_class = n_samples // 2
        
        # Inner circle (class 0)
        theta = np.random.rand(n_per_class) * 2 * np.pi
        r = np.random.rand(n_per_class) * 1.0
        X0 = np.column_stack([r * np.cos(theta), r * np.sin(theta)])
        X0 += np.random.randn(n_per_class, 2) * noise
        y0 = np.zeros(n_per_class)
        
        # Outer circle (class 1)
        theta = np.random.rand(n_per_class) * 2 * np.pi
        r = 2.0 + np.random.rand(n_per_class) * 1.0
        X1 = np.column_stack([r * np.cos(theta), r * np.sin(theta)])
        X1 += np.random.randn(n_per_class, 2) * noise
        y1 = np.ones(n_per_class)
        
        X = np.vstack([X0, X1])
        y = np.concatenate([y0, y1])
        
        indices = np.random.permutation(len(X))
        return X[indices], y[indices]
    
    @staticmethod
    def generate_moons(n_samples: int = 200, noise: float = 0.1) -> Tuple[np.ndarray, np.ndarray]:
        """Generate two interleaving half circles"""
        from sklearn.datasets import make_moons
        return make_moons(n_samples=n_samples, noise=noise)


class MLTrainer:
    """Train machine learning models with visualization data"""
    
    def __init__(self, model_type: str, params: Dict = None):
        self.model_type = model_type
        self.params = params or {}
        self.model = None
        self.scaler = StandardScaler()
        self.history = {
            'loss': [],
            'accuracy': [],
            'iterations': []
        }
    
    def create_model(self):
        """Create model based on type"""
        if self.model_type == 'linear_regression':
            self.model = LinearRegression()
            
        elif self.model_type == 'logistic_regression':
            self.model = LogisticRegression(
                max_iter=self.params.get('max_iter', 1000),
                C=self.params.get('C', 1.0)
            )
            
        elif self.model_type == 'knn':
            self.model = KNeighborsClassifier(
                n_neighbors=self.params.get('n_neighbors', 5)
            )
            
        elif self.model_type == 'decision_tree':
            self.model = DecisionTreeClassifier(
                max_depth=self.params.get('max_depth', 5),
                random_state=42
            )
            
        elif self.model_type == 'svm':
            self.model = SVC(
                kernel=self.params.get('kernel', 'rbf'),
                C=self.params.get('C', 1.0),
                gamma=self.params.get('gamma', 'scale')
            )
        
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
    
    def train(self, X: np.ndarray, y: np.ndarray, 
              test_size: float = 0.2) -> Dict:
        """Train model and return results"""
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        # Scale data for some models
        if self.model_type in ['logistic_regression', 'svm', 'knn']:
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
        else:
            X_train_scaled = X_train
            X_test_scaled = X_test
        
        # Create and train model
        self.create_model()
        self.model.fit(X_train_scaled, y_train)
        
        # Predictions
        y_pred_train = self.model.predict(X_train_scaled)
        y_pred_test = self.model.predict(X_test_scaled)
        
        # Calculate metrics
        is_classification = self.model_type != 'linear_regression'
        
        if is_classification:
            train_score = accuracy_score(y_train, y_pred_train)
            test_score = accuracy_score(y_test, y_pred_test)
            metric_name = 'accuracy'
        else:
            train_score = r2_score(y_train, y_pred_train)
            test_score = r2_score(y_test, y_pred_test)
            metric_name = 'r2_score'
            
            # Also calculate MSE for regression
            train_mse = mean_squared_error(y_train, y_pred_train)
            test_mse = mean_squared_error(y_test, y_pred_test)
        
        # Prepare results
        result = {
            'model_type': self.model_type,
            'train_score': float(train_score),
            'test_score': float(test_score),
            'metric_name': metric_name,
            'n_samples': len(X),
            'n_train': len(X_train),
            'n_test': len(X_test),
            'n_features': X.shape[1],
            'params': self.params
        }
        
        if not is_classification:
            result['train_mse'] = float(train_mse)
            result['test_mse'] = float(test_mse)
        
        # Generate decision boundary if 2D classification
        if is_classification and X.shape[1] == 2:
            result['decision_boundary'] = self.get_decision_boundary(X)
        
        # Get predictions for all data points
        if self.model_type in ['logistic_regression', 'svm', 'knn']:
            X_all_scaled = self.scaler.transform(X)
        else:
            X_all_scaled = X
        
        y_pred_all = self.model.predict(X_all_scaled)
        
        result['predictions'] = {
            'train': {
                'X': X_train.tolist(),
                'y_true': y_train.tolist(),
                'y_pred': y_pred_train.tolist()
            },
            'test': {
                'X': X_test.tolist(),
                'y_true': y_test.tolist(),
                'y_pred': y_pred_test.tolist()
            },
            'all': {
                'X': X.tolist(),
                'y_true': y.tolist(),
                'y_pred': y_pred_all.tolist()
            }
        }
        
        return result
    
    def get_decision_boundary(self, X: np.ndarray, resolution: int = 100) -> Dict:
        """Generate decision boundary visualization data"""
        # Create mesh
        x_min, x_max = X[:, 0].min() - 1, X[:, 0].max() + 1
        y_min, y_max = X[:, 1].min() - 1, X[:, 1].max() + 1
        
        xx, yy = np.meshgrid(
            np.linspace(x_min, x_max, resolution),
            np.linspace(y_min, y_max, resolution)
        )
        
        # Predict on mesh
        mesh_points = np.c_[xx.ravel(), yy.ravel()]
        
        if self.model_type in ['logistic_regression', 'svm', 'knn']:
            mesh_points = self.scaler.transform(mesh_points)
        
        Z = self.model.predict(mesh_points)
        Z = Z.reshape(xx.shape)
        
        return {
            'x': xx.tolist(),
            'y': yy.tolist(),
            'z': Z.tolist(),
            'x_range': [float(x_min), float(x_max)],
            'y_range': [float(y_min), float(y_max)]
        }


def train_and_evaluate(config: Dict) -> Dict:
    """Main function to train model and return results"""
    
    # Parse config
    dataset_type = config.get('dataset_type', 'linear')
    model_type = config.get('model_type', 'linear_regression')
    n_samples = config.get('n_samples', 200)
    noise = config.get('noise', 0.1)
    model_params = config.get('model_params', {})
    
    # Generate data
    if dataset_type == 'linear':
        X, y = DataGenerator.generate_linear(n_samples, noise)
    elif dataset_type == 'polynomial':
        X, y = DataGenerator.generate_polynomial(n_samples, degree=2, noise=noise)
    elif dataset_type == 'classification_2d':
        n_classes = config.get('n_classes', 2)
        X, y = DataGenerator.generate_classification_2d(n_samples, n_classes)
    elif dataset_type == 'circles':
        X, y = DataGenerator.generate_circles(n_samples, noise)
    elif dataset_type == 'moons':
        X, y = DataGenerator.generate_moons(n_samples, noise)
    else:
        X, y = DataGenerator.generate_classification_2d(n_samples)
    
    # Train model
    trainer = MLTrainer(model_type, model_params)
    result = trainer.train(X, y)
    
    # Add dataset info
    result['dataset_type'] = dataset_type
    result['dataset_params'] = {
        'n_samples': n_samples,
        'noise': noise
    }
    
    return result


if __name__ == "__main__":
    # Test with classification
    config = {
        'dataset_type': 'classification_2d',
        'model_type': 'logistic_regression',
        'n_samples': 200,
        'noise': 0.1,
        'n_classes': 2
    }
    
    print("🤖 Training Machine Learning Model...")
    result = train_and_evaluate(config)
    
    print(f"\n✅ Training complete!")
    print(f"   Model: {result['model_type']}")
    print(f"   Train accuracy: {result['train_score']:.3f}")
    print(f"   Test accuracy: {result['test_score']:.3f}")
    print(f"   Samples: {result['n_samples']} ({result['n_train']} train, {result['n_test']} test)")



