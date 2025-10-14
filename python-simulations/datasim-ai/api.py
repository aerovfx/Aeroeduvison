"""
DataSim.AI API
FastAPI server for ML training and visualization
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import uvicorn
import sys
import json
import asyncio
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import train_and_evaluate, DataGenerator
from neural_network import train_neural_network
from sklearn.model_selection import train_test_split
import numpy as np

app = FastAPI(title="DataSim.AI API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TrainingConfig(BaseModel):
    dataset_type: str = "classification_2d"
    model_type: str = "logistic_regression"
    n_samples: int = 200
    noise: float = 0.1
    n_classes: Optional[int] = 2
    model_params: Optional[Dict] = {}


class NeuralNetConfig(BaseModel):
    dataset_type: str = "classification_2d"
    n_samples: int = 200
    noise: float = 0.1
    n_classes: Optional[int] = 2
    hidden_sizes: List[int] = [16, 8]
    learning_rate: float = 0.01
    epochs: int = 100


@app.get("/")
async def root():
    return {
        "name": "DataSim.AI API",
        "version": "1.0.0",
        "status": "running",
        "description": "Machine Learning Training Visualization System",
        "endpoints": [
            "/train",
            "/train-neural-network",
            "/train-stream",
            "/datasets",
            "/models"
        ]
    }


@app.post("/train")
async def train_model(config: TrainingConfig):
    """Train a machine learning model"""
    try:
        config_dict = config.dict()
        result = train_and_evaluate(config_dict)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train-neural-network")
async def train_nn(config: NeuralNetConfig):
    """Train a neural network with PyTorch"""
    try:
        # Generate dataset
        if config.dataset_type == 'classification_2d':
            X, y = DataGenerator.generate_classification_2d(
                config.n_samples, config.n_classes
            )
        elif config.dataset_type == 'circles':
            X, y = DataGenerator.generate_circles(config.n_samples, config.noise)
        elif config.dataset_type == 'moons':
            X, y = DataGenerator.generate_moons(config.n_samples, config.noise)
        else:
            X, y = DataGenerator.generate_classification_2d(config.n_samples, 2)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train neural network
        nn_config = {
            'hidden_sizes': config.hidden_sizes,
            'learning_rate': config.learning_rate,
            'epochs': config.epochs,
            'task_type': 'binary_classification' if config.n_classes == 2 else 'multi_classification'
        }
        
        result = train_neural_network(nn_config, X_train, y_train, X_test, y_test)
        
        # Add dataset info
        result['dataset'] = {
            'type': config.dataset_type,
            'n_samples': config.n_samples,
            'n_train': len(X_train),
            'n_test': len(X_test),
            'X_train': X_train.tolist(),
            'y_train': y_train.tolist(),
            'X_test': X_test.tolist(),
            'y_test': y_test.tolist()
        }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def training_stream_generator(config: Dict):
    """Generate streaming training updates"""
    # This is a simplified version - real implementation would use callbacks
    
    try:
        result = train_and_evaluate(config)
        
        # Simulate streaming by sending result in chunks
        yield f"data: {json.dumps({'type': 'start', 'config': config})}\n\n"
        await asyncio.sleep(0.1)
        
        yield f"data: {json.dumps({'type': 'progress', 'progress': 50})}\n\n"
        await asyncio.sleep(0.1)
        
        yield f"data: {json.dumps({'type': 'complete', 'result': result})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


@app.post("/train-stream")
async def train_model_stream(config: TrainingConfig):
    """Train model with streaming progress updates"""
    config_dict = config.dict()
    return StreamingResponse(
        training_stream_generator(config_dict),
        media_type="text/event-stream"
    )


@app.get("/datasets")
async def get_datasets():
    """Get available datasets"""
    return {
        "datasets": [
            {
                "id": "linear",
                "name": "Linear Data",
                "description": "Simple linear relationship",
                "type": "regression",
                "icon": "📈"
            },
            {
                "id": "polynomial",
                "name": "Polynomial Data",
                "description": "Non-linear polynomial relationship",
                "type": "regression",
                "icon": "📊"
            },
            {
                "id": "classification_2d",
                "name": "2D Classification",
                "description": "Linearly separable clusters",
                "type": "classification",
                "icon": "🎯"
            },
            {
                "id": "circles",
                "name": "Concentric Circles",
                "description": "Non-linearly separable data",
                "type": "classification",
                "icon": "⭕"
            },
            {
                "id": "moons",
                "name": "Half Moons",
                "description": "Interleaving half circles",
                "type": "classification",
                "icon": "🌙"
            }
        ]
    }


@app.get("/models")
async def get_models():
    """Get available ML models"""
    return {
        "models": [
            {
                "id": "linear_regression",
                "name": "Linear Regression",
                "description": "Fits a linear model to the data",
                "type": "regression",
                "icon": "📏",
                "params": []
            },
            {
                "id": "logistic_regression",
                "name": "Logistic Regression",
                "description": "Linear classifier with sigmoid",
                "type": "classification",
                "icon": "📊",
                "params": [
                    {"name": "C", "type": "float", "default": 1.0, "range": [0.01, 10]}
                ]
            },
            {
                "id": "knn",
                "name": "K-Nearest Neighbors",
                "description": "Classifies based on nearest neighbors",
                "type": "classification",
                "icon": "👥",
                "params": [
                    {"name": "n_neighbors", "type": "int", "default": 5, "range": [1, 20]}
                ]
            },
            {
                "id": "decision_tree",
                "name": "Decision Tree",
                "description": "Tree-based decision making",
                "type": "classification",
                "icon": "🌳",
                "params": [
                    {"name": "max_depth", "type": "int", "default": 5, "range": [1, 20]}
                ]
            },
            {
                "id": "svm",
                "name": "Support Vector Machine",
                "description": "Maximum margin classifier",
                "type": "classification",
                "icon": "🎯",
                "params": [
                    {"name": "kernel", "type": "select", "default": "rbf", "options": ["rbf", "linear", "poly"]},
                    {"name": "C", "type": "float", "default": 1.0, "range": [0.01, 10]}
                ]
            },
            {
                "id": "neural_network",
                "name": "Neural Network",
                "description": "Deep learning with PyTorch",
                "type": "classification",
                "icon": "🧠",
                "params": [
                    {"name": "hidden_sizes", "type": "array", "default": [16, 8]},
                    {"name": "learning_rate", "type": "float", "default": 0.01, "range": [0.001, 0.1]},
                    {"name": "epochs", "type": "int", "default": 100, "range": [10, 500]}
                ]
            }
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    print("🤖 Starting DataSim.AI API...")
    print("📡 Server running on http://localhost:8009")
    print("📚 API docs available at http://localhost:8009/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8009,
        log_level="info"
    )


