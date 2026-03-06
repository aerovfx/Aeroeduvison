"""
FastAPI Routes for ML Training
Provides REST API endpoints for training management
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import asyncio
import uuid
from pathlib import Path
import json
from datetime import datetime

# Import training components
from .config import TrainingConfig, CONFIGS
from .data_loader import DataLoader
from .model_builder import ModelBuilder
from .trainer import Trainer
from .model_exporter import ModelExporter

# Create router
router = APIRouter(prefix="/api/ml", tags=["ml-training"])

# Training state storage (in-memory, use Redis/DB for production)
training_jobs: Dict[str, Dict[str, Any]] = {}
active_websockets: Dict[str, List[WebSocket]] = {}


# ============================================================================
# Request/Response Models
# ============================================================================

class TrainingRequest(BaseModel):
    """Request to start training"""
    config_preset: str = "mnist"  # "mnist", "emnist", "custom"
    custom_config: Optional[Dict[str, Any]] = None
    
class TrainingResponse(BaseModel):
    """Response from training start"""
    training_id: str
    status: str
    message: str

class TrainingStatus(BaseModel):
    """Current training status"""
    training_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ModelInfo(BaseModel):
    """Model information"""
    model_id: str
    name: str
    created_at: str
    config: Dict[str, Any]
    results: Optional[Dict[str, Any]] = None
    file_path: str


# ============================================================================
# Training Management
# ============================================================================

async def run_training_job(training_id: str, config: TrainingConfig):
    """Background task to run training"""
    
    try:
        # Update status
        training_jobs[training_id]["status"] = "running"
        training_jobs[training_id]["started_at"] = datetime.now().isoformat()
        
        # Progress callback to update state
        def progress_callback(info: Dict[str, Any]):
            training_jobs[training_id]["progress"] = info
            
            # Send to all connected WebSockets
            if training_id in active_websockets:
                for ws in active_websockets[training_id]:
                    try:
                        asyncio.create_task(ws.send_json(info))
                    except:
                        pass
        
        # 1. Load data
        training_jobs[training_id]["progress"] = {
            "status": "loading_data",
            "message": "Loading dataset..."
        }
        
        loader = DataLoader(config)
        X_train, y_train, X_test, y_test = loader.load_data()
        
        # 2. Build model
        training_jobs[training_id]["progress"] = {
            "status": "building_model",
            "message": "Building model architecture..."
        }
        
        builder = ModelBuilder(config)
        model = builder.build_model()
        
        # 3. Train
        trainer = Trainer(model, config, progress_callback=progress_callback)
        result = trainer.train(X_train, y_train)
        
        # 4. Evaluate
        if result["success"]:
            test_results = trainer.evaluate(X_test, y_test)
            result["test_results"] = test_results
        
        # Update final status
        training_jobs[training_id]["status"] = "completed" if result["success"] else "failed"
        training_jobs[training_id]["result"] = result
        training_jobs[training_id]["completed_at"] = datetime.now().isoformat()
        
        # Final progress update
        progress_callback({
            "status": "completed" if result["success"] else "failed",
            "message": "Training completed!" if result["success"] else f"Training failed: {result.get('error')}",
            "final_results": result
        })
        
    except Exception as e:
        training_jobs[training_id]["status"] = "failed"
        training_jobs[training_id]["error"] = str(e)
        training_jobs[training_id]["completed_at"] = datetime.now().isoformat()
        
        # Error update
        if training_id in active_websockets:
            error_info = {
                "status": "failed",
                "message": f"Training failed: {str(e)}"
            }
            for ws in active_websockets[training_id]:
                try:
                    asyncio.create_task(ws.send_json(error_info))
                except:
                    pass


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/train/start", response_model=TrainingResponse)
async def start_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks
):
    """Start a new training job"""
    
    # Get configuration
    if request.config_preset in CONFIGS:
        config = CONFIGS[request.config_preset]
    elif request.custom_config:
        config = TrainingConfig(**request.custom_config)
    else:
        raise HTTPException(status_code=400, detail="Invalid configuration")
    
    # Generate training ID
    training_id = str(uuid.uuid4())
    
    # Initialize job state
    training_jobs[training_id] = {
        "training_id": training_id,
        "status": "pending",
        "config": config,
        "created_at": datetime.now().isoformat(),
        "progress": None,
        "result": None,
        "error": None
    }
    
    # Start training in background
    background_tasks.add_task(run_training_job, training_id, config)
    
    return TrainingResponse(
        training_id=training_id,
        status="pending",
        message="Training job started"
    )


@router.get("/train/status/{training_id}", response_model=TrainingStatus)
async def get_training_status(training_id: str):
    """Get status of a training job"""
    
    if training_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    job = training_jobs[training_id]
    
    return TrainingStatus(
        training_id=training_id,
        status=job["status"],
        progress=job.get("progress"),
        error=job.get("error")
    )


@router.post("/train/stop/{training_id}")
async def stop_training(training_id: str):
    """Stop a training job (not fully implemented yet)"""
    
    if training_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    # TODO: Implement graceful stop
    training_jobs[training_id]["status"] = "stopped"
    
    return {"message": "Training stop requested"}


@router.get("/train/list")
async def list_training_jobs():
    """List all training jobs"""
    
    jobs = []
    for training_id, job in training_jobs.items():
        jobs.append({
            "training_id": training_id,
            "status": job["status"],
            "created_at": job["created_at"],
            "config_name": job["config"].dataset_name
        })
    
    return {"jobs": jobs}


# ============================================================================
# WebSocket for Real-time Progress
# ============================================================================

@router.websocket("/ws/training/{training_id}")
async def training_progress_websocket(websocket: WebSocket, training_id: str):
    """WebSocket endpoint for real-time training progress"""
    
    await websocket.accept()
    
    # Add to active connections
    if training_id not in active_websockets:
        active_websockets[training_id] = []
    active_websockets[training_id].append(websocket)
    
    try:
        # Send initial status
        if training_id in training_jobs:
            await websocket.send_json({
                "status": "connected",
                "training_status": training_jobs[training_id]["status"],
                "message": "Connected to training progress stream"
            })
        else:
            await websocket.send_json({
                "status": "error",
                "message": "Training job not found"
            })
            return
        
        # Keep connection alive and send periodic updates
        while True:
            # Wait for messages (or just keep alive)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
            except asyncio.TimeoutError:
                # Send heartbeat
                if training_id in training_jobs:
                    current_progress = training_jobs[training_id].get("progress")
                    if current_progress:
                        await websocket.send_json(current_progress)
                continue
            
            # Check if training is complete
            if training_id in training_jobs:
                status = training_jobs[training_id]["status"]
                if status in ["completed", "failed", "stopped"]:
                    await websocket.send_json({
                        "status": status,
                        "message": f"Training {status}",
                        "final": True
                    })
                    break
    
    except WebSocketDisconnect:
        pass
    
    finally:
        # Remove from active connections
        if training_id in active_websockets:
            active_websockets[training_id].remove(websocket)
            if not active_websockets[training_id]:
                del active_websockets[training_id]


# ============================================================================
# Model Management
# ============================================================================

@router.get("/models")
async def list_models():
    """List all trained models"""
    
    models_dir = Path("ml_training/models")
    if not models_dir.exists():
        return {"models": []}
    
    models = []
    for model_file in models_dir.glob("*_handwriting_model.h5"):
        # Try to load metadata
        training_id = model_file.stem.split("_handwriting_model")[0]
        metadata_file = models_dir / f"{training_id}_metadata.json"
        
        if metadata_file.exists():
            with open(metadata_file) as f:
                metadata = json.load(f)
                models.append({
                    "model_id": training_id,
                    "name": model_file.name,
                    "created_at": metadata.get("timestamp"),
                    "config": metadata.get("config"),
                    "results": metadata.get("results"),
                    "file_path": str(model_file)
                })
    
    return {"models": models}


@router.get("/models/{model_id}")
async def get_model_info(model_id: str):
    """Get detailed information about a model"""
    
    models_dir = Path("ml_training/models")
    model_file = models_dir / f"{model_id}_handwriting_model.h5"
    metadata_file = models_dir / f"{model_id}_metadata.json"
    
    if not model_file.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Load metadata
    metadata = {}
    if metadata_file.exists():
        with open(metadata_file) as f:
            metadata = json.load(f)
    
    # Get model info using exporter
    try:
        exporter = ModelExporter(str(model_file))
        model_info = exporter.get_model_info()
    except:
        model_info = {}
    
    return {
        "model_id": model_id,
        "metadata": metadata,
        "model_info": model_info
    }


@router.get("/models/{model_id}/download")
async def download_model(model_id: str, format: str = "h5"):
    """Download a trained model in specified format"""
    
    models_dir = Path("ml_training/models")
    model_file = models_dir / f"{model_id}_handwriting_model.h5"
    
    if not model_file.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    
    if format == "h5":
        return FileResponse(
            path=str(model_file),
            filename=model_file.name,
            media_type="application/octet-stream"
        )
    else:
        # Export to requested format
        exporter = ModelExporter(str(model_file))
        
        export_dir = models_dir / f"{model_id}_exports"
        export_dir.mkdir(exist_ok=True)
        
        if format == "tflite":
            export_path = exporter.export_tflite(export_dir / f"{model_id}.tflite")
        elif format == "onnx":
            export_path = exporter.export_onnx(export_dir / f"{model_id}.onnx")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
        return FileResponse(
            path=export_path,
            filename=Path(export_path).name,
            media_type="application/octet-stream"
        )


@router.delete("/models/{model_id}")
async def delete_model(model_id: str):
    """Delete a trained model"""
    
    models_dir = Path("ml_training/models")
    model_file = models_dir / f"{model_id}_handwriting_model.h5"
    metadata_file = models_dir / f"{model_id}_metadata.json"
    history_file = models_dir / f"{model_id}_history.json"
    
    if not model_file.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Delete files
    model_file.unlink()
    if metadata_file.exists():
        metadata_file.unlink()
    if history_file.exists():
        history_file.unlink()
    
    return {"message": "Model deleted successfully"}


@router.post("/models/{model_id}/export")
async def export_model_all_formats(model_id: str):
    """Export model to all formats (H5, TFLite, ONNX)"""
    
    models_dir = Path("ml_training/models")
    model_file = models_dir / f"{model_id}_handwriting_model.h5"
    
    if not model_file.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Export to all formats
    exporter = ModelExporter(str(model_file))
    export_dir = models_dir / f"{model_id}_exports"
    
    results = exporter.export_all(output_dir=export_dir)
    
    return {
        "message": "Model exported to all formats",
        "exports": results
    }


# ============================================================================
# Dataset Management
# ============================================================================

@router.get("/datasets")
async def list_datasets():
    """List available datasets"""
    
    return {
        "presets": [
            {
                "id": "mnist",
                "name": "MNIST Digits",
                "description": "Handwritten digits 0-9",
                "classes": 10,
                "source": "huggingface"
            },
            {
                "id": "emnist",
                "name": "EMNIST Letters",
                "description": "Handwritten letters A-Z",
                "classes": 26,
                "source": "huggingface"
            },
            {
                "id": "custom",
                "name": "Custom Dataset",
                "description": "Custom handwriting dataset",
                "classes": 62,
                "source": "local"
            }
        ]
    }

