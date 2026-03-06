"""
Neural Network implementation with PyTorch
For deep learning visualization
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import Dict, List, Callable


class SimpleNN(nn.Module):
    """Simple feedforward neural network"""
    
    def __init__(self, input_size: int, hidden_sizes: List[int], output_size: int):
        super(SimpleNN, self).__init__()
        
        layers = []
        prev_size = input_size
        
        # Hidden layers
        for hidden_size in hidden_sizes:
            layers.append(nn.Linear(prev_size, hidden_size))
            layers.append(nn.ReLU())
            prev_size = hidden_size
        
        # Output layer
        layers.append(nn.Linear(prev_size, output_size))
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)


class NeuralNetworkTrainer:
    """Train neural networks with progress tracking"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Network architecture
        self.input_size = config.get('input_size', 2)
        self.hidden_sizes = config.get('hidden_sizes', [16, 8])
        self.output_size = config.get('output_size', 1)
        self.task_type = config.get('task_type', 'binary_classification')
        
        # Training params
        self.learning_rate = config.get('learning_rate', 0.01)
        self.epochs = config.get('epochs', 100)
        self.batch_size = config.get('batch_size', 32)
        
        # Create model
        self.model = SimpleNN(
            self.input_size,
            self.hidden_sizes,
            self.output_size
        ).to(self.device)
        
        # Loss and optimizer
        if self.task_type == 'binary_classification':
            self.criterion = nn.BCEWithLogitsLoss()
        elif self.task_type == 'multi_classification':
            self.criterion = nn.CrossEntropyLoss()
        else:  # regression
            self.criterion = nn.MSELoss()
        
        self.optimizer = optim.Adam(self.model.parameters(), lr=self.learning_rate)
        
        # Training history
        self.history = {
            'train_loss': [],
            'test_loss': [],
            'train_acc': [],
            'test_acc': [],
            'epochs': []
        }
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray,
              X_test: np.ndarray, y_test: np.ndarray,
              callback: Callable = None) -> Dict:
        """Train the network"""
        
        # Convert to tensors
        X_train_t = torch.FloatTensor(X_train).to(self.device)
        y_train_t = torch.FloatTensor(y_train).to(self.device)
        X_test_t = torch.FloatTensor(X_test).to(self.device)
        y_test_t = torch.FloatTensor(y_test).to(self.device)
        
        # Adjust shapes for binary classification
        if self.task_type == 'binary_classification':
            y_train_t = y_train_t.unsqueeze(1)
            y_test_t = y_test_t.unsqueeze(1)
        
        # Training loop
        for epoch in range(self.epochs):
            # Train mode
            self.model.train()
            
            # Forward pass
            outputs = self.model(X_train_t)
            loss = self.criterion(outputs, y_train_t)
            
            # Backward pass
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()
            
            # Evaluation mode
            self.model.eval()
            with torch.no_grad():
                # Train metrics
                train_outputs = self.model(X_train_t)
                train_loss = self.criterion(train_outputs, y_train_t).item()
                
                # Test metrics
                test_outputs = self.model(X_test_t)
                test_loss = self.criterion(test_outputs, y_test_t).item()
                
                # Calculate accuracy for classification
                if self.task_type in ['binary_classification', 'multi_classification']:
                    if self.task_type == 'binary_classification':
                        train_pred = (torch.sigmoid(train_outputs) > 0.5).float()
                        test_pred = (torch.sigmoid(test_outputs) > 0.5).float()
                    else:
                        train_pred = torch.argmax(train_outputs, dim=1)
                        test_pred = torch.argmax(test_outputs, dim=1)
                    
                    train_acc = (train_pred == y_train_t).float().mean().item()
                    test_acc = (test_pred == y_test_t).float().mean().item()
                else:
                    train_acc = 0
                    test_acc = 0
                
                # Record history
                self.history['train_loss'].append(train_loss)
                self.history['test_loss'].append(test_loss)
                self.history['train_acc'].append(train_acc)
                self.history['test_acc'].append(test_acc)
                self.history['epochs'].append(epoch)
                
                # Callback for real-time updates
                if callback and epoch % 5 == 0:
                    callback({
                        'epoch': epoch,
                        'train_loss': train_loss,
                        'test_loss': test_loss,
                        'train_acc': train_acc,
                        'test_acc': test_acc
                    })
        
        # Final evaluation
        self.model.eval()
        with torch.no_grad():
            # Get predictions
            train_pred = self.model(X_train_t)
            test_pred = self.model(X_test_t)
            
            if self.task_type == 'binary_classification':
                train_pred = (torch.sigmoid(train_pred) > 0.5).float().cpu().numpy()
                test_pred = (torch.sigmoid(test_pred) > 0.5).float().cpu().numpy()
            elif self.task_type == 'multi_classification':
                train_pred = torch.argmax(train_pred, dim=1).cpu().numpy()
                test_pred = torch.argmax(test_pred, dim=1).cpu().numpy()
            else:
                train_pred = train_pred.cpu().numpy()
                test_pred = test_pred.cpu().numpy()
        
        return {
            'history': self.history,
            'final_train_loss': self.history['train_loss'][-1],
            'final_test_loss': self.history['test_loss'][-1],
            'final_train_acc': self.history['train_acc'][-1],
            'final_test_acc': self.history['test_acc'][-1],
            'train_predictions': train_pred.tolist(),
            'test_predictions': test_pred.tolist()
        }
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        self.model.eval()
        with torch.no_grad():
            X_t = torch.FloatTensor(X).to(self.device)
            outputs = self.model(X_t)
            
            if self.task_type == 'binary_classification':
                predictions = (torch.sigmoid(outputs) > 0.5).float()
            elif self.task_type == 'multi_classification':
                predictions = torch.argmax(outputs, dim=1)
            else:
                predictions = outputs
            
            return predictions.cpu().numpy()
    
    def get_decision_boundary(self, X_range: tuple, Y_range: tuple, 
                             resolution: int = 100) -> Dict:
        """Generate decision boundary for visualization"""
        x_min, x_max = X_range
        y_min, y_max = Y_range
        
        xx, yy = np.meshgrid(
            np.linspace(x_min, x_max, resolution),
            np.linspace(y_min, y_max, resolution)
        )
        
        grid_points = np.c_[xx.ravel(), yy.ravel()]
        Z = self.predict(grid_points)
        Z = Z.reshape(xx.shape)
        
        return {
            'x': xx.tolist(),
            'y': yy.tolist(),
            'z': Z.tolist()
        }


def train_neural_network(config: Dict, X_train: np.ndarray, y_train: np.ndarray,
                        X_test: np.ndarray, y_test: np.ndarray) -> Dict:
    """Train neural network and return comprehensive results"""
    
    # Create trainer
    nn_config = {
        'input_size': X_train.shape[1],
        'hidden_sizes': config.get('hidden_sizes', [16, 8]),
        'output_size': 1 if len(np.unique(y_train)) == 2 else len(np.unique(y_train)),
        'task_type': config.get('task_type', 'binary_classification'),
        'learning_rate': config.get('learning_rate', 0.01),
        'epochs': config.get('epochs', 100),
        'batch_size': config.get('batch_size', 32)
    }
    
    trainer = NeuralNetworkTrainer(nn_config)
    
    # Train
    result = trainer.train(X_train, y_train, X_test, y_test)
    
    # Add decision boundary if 2D
    if X_train.shape[1] == 2:
        x_min, x_max = X_train[:, 0].min() - 1, X_train[:, 0].max() + 1
        y_min, y_max = X_train[:, 1].min() - 1, X_train[:, 1].max() + 1
        result['decision_boundary'] = trainer.get_decision_boundary(
            (x_min, x_max), (y_min, y_max)
        )
    
    result['model_architecture'] = {
        'input_size': nn_config['input_size'],
        'hidden_sizes': nn_config['hidden_sizes'],
        'output_size': nn_config['output_size'],
        'total_parameters': sum(p.numel() for p in trainer.model.parameters())
    }
    
    return result



