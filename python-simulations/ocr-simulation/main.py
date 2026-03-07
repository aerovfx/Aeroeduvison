"""
FastAPI Backend for Next.js 15 OCR Application
Endpoints: Upload, Process, Real-time Progress via WebSocket
"""

from fastapi import FastAPI, File, UploadFile, WebSocket, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import asyncio
import json
from datetime import datetime
import uuid
from pathlib import Path

# Import OCR pipelines
import os

# Choose OCR mode: "crnn" for OpenCV CRNN (BEST), "east" for EAST+Tesseract, "tesseract" for Tesseract only, "simulation" for demo
OCR_MODE = os.getenv("OCR_MODE", "crnn")  # Default to OpenCV CRNN

if OCR_MODE == "crnn":
    print("🔧 Using OpenCV Zoo CRNN Model (BEST - High Accuracy)")
    from ocr_pipeline_crnn import (
        process_uploaded_image,
        CRNNOCRPipeline as OCRPipeline,
        CRNNOCRConfig as OCRConfig
    )
elif OCR_MODE == "east":
    print("🔧 Using EAST Text Detector + Tesseract OCR")
    from ocr_pipeline_east import (
        process_uploaded_image,
        EASTOCRPipeline as OCRPipeline,
        OCRConfig
    )
elif OCR_MODE == "tesseract":
    print("🔧 Using Tesseract OCR")
    from ocr_pipeline_tesseract import (
        process_uploaded_image,
        TesseractOCRPipeline as OCRPipeline,
        OCRConfig
    )
else:
    print("🔧 Using SIMULATION OCR (for demo)")
    from ocr_pipeline_v2 import (
        process_uploaded_image,
        EnhancedOCRPipeline as OCRPipeline,
        OCRConfig
    )

app = FastAPI(
    title="OCR & ML Training API",
    description="Enhanced OCR Pipeline + ML Model Training API for Next.js 15",
    version="2.1.0"
)

# Include ML Training routes
# Note: Disabled temporarily due to TensorFlow compatibility on macOS Apple Silicon
# To enable: pip3 install tensorflow-macos tensorflow-metal
ML_TRAINING_ENABLED = False  # Set to True after installing tensorflow-macos

if ML_TRAINING_ENABLED:
    try:
        from ml_training.api_routes import router as ml_router
        app.include_router(ml_router)
        print("✅ ML Training API routes loaded")
    except ImportError as e:
        print(f"⚠️  ML Training routes not available: {e}")
else:
    print("⚠️  ML Training disabled (install tensorflow-macos to enable)")

# CORS Configuration for Next.js 15
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://your-nextjs-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active processing tasks
processing_tasks: Dict[str, Dict[str, Any]] = {}

# WebSocket connections for real-time progress
active_connections: Dict[str, WebSocket] = {}

class OCRRequest(BaseModel):
    """OCR processing request"""
    enable_preprocessing: bool = True
    enable_rotation_correction: bool = True
    enable_noise_removal: bool = True
    min_confidence: float = 0.7
    language: str = "vi+en"

class OCRResponse(BaseModel):
    """OCR processing response"""
    task_id: str
    status: str
    message: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "OCR API",
        "version": "2.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "active_tasks": len(processing_tasks),
        "active_connections": len(active_connections),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/ocr/upload", response_model=OCRResponse)
async def upload_and_process(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    enable_preprocessing: bool = True,
    enable_rotation_correction: bool = True,
    enable_noise_removal: bool = True,
    min_confidence: float = 0.7
):
    """
    Upload and process image for OCR
    Returns task_id for tracking progress
    """
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Only images allowed."
        )
    
    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB."
        )
    
    # Generate task ID
    task_id = str(uuid.uuid4())
    
    # Create OCR config
    config = OCRConfig(
        min_text_confidence=min_confidence,
        enable_preprocessing=enable_preprocessing,
        enable_rotation_correction=enable_rotation_correction,
        enable_noise_removal=enable_noise_removal
    )
    
    # Initialize task
    processing_tasks[task_id] = {
        "status": "processing",
        "filename": file.filename,
        "created_at": datetime.now().isoformat(),
        "progress": 0,
        "result": None,
        "error": None
    }
    
    # Process in background
    background_tasks.add_task(
        process_image_task,
        task_id,
        contents,
        file.filename,
        config
    )
    
    return OCRResponse(
        task_id=task_id,
        status="processing",
        message=f"Processing started for {file.filename}"
    )

async def process_image_task(
    task_id: str,
    image_data: bytes,
    filename: str,
    config: OCRConfig
):
    """Background task to process image"""
    
    def progress_callback(progress_data: Dict):
        """Callback for progress updates"""
        processing_tasks[task_id]["progress"] = progress_data["progress"]
        
        # Send to WebSocket if connected
        if task_id in active_connections:
            asyncio.create_task(
                active_connections[task_id].send_json(progress_data)
            )
    
    try:
        # Process image
        result = process_uploaded_image(
            image_data,
            filename,
            config,
            progress_callback
        )
        
        # Update task
        processing_tasks[task_id]["status"] = "completed"
        processing_tasks[task_id]["result"] = result
        processing_tasks[task_id]["progress"] = 100
        
    except Exception as e:
        processing_tasks[task_id]["status"] = "failed"
        processing_tasks[task_id]["error"] = str(e)
        processing_tasks[task_id]["progress"] = 0

@app.get("/api/ocr/status/{task_id}", response_model=OCRResponse)
async def get_task_status(task_id: str):
    """Get processing status for a task"""
    
    if task_id not in processing_tasks:
        raise HTTPException(
            status_code=404,
            detail=f"Task {task_id} not found"
        )
    
    task = processing_tasks[task_id]
    
    return OCRResponse(
        task_id=task_id,
        status=task["status"],
        message=f"Task is {task['status']}",
        result=task.get("result"),
        error=task.get("error")
    )

@app.websocket("/api/ocr/ws/{task_id}")
async def websocket_progress(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time progress updates"""
    
    await websocket.accept()
    active_connections[task_id] = websocket
    
    try:
        while True:
            # Keep connection alive and check task status
            if task_id in processing_tasks:
                task = processing_tasks[task_id]
                
                # Send current status
                await websocket.send_json({
                    "task_id": task_id,
                    "status": task["status"],
                    "progress": task.get("progress", 0),
                    "timestamp": datetime.now().isoformat()
                })
                
                # Close if completed or failed
                if task["status"] in ["completed", "failed"]:
                    break
            
            await asyncio.sleep(0.5)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if task_id in active_connections:
            del active_connections[task_id]
        await websocket.close()

@app.post("/api/ocr/process-sync")
async def process_sync(
    file: UploadFile = File(...),
    enable_preprocessing: bool = True,
    enable_rotation_correction: bool = True,
    enable_noise_removal: bool = True,
    min_confidence: float = 0.7
):
    """
    Synchronous processing - wait for result
    Use this for smaller files or when you don't need progress tracking
    """
    
    # Validate file
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type"
        )
    
    contents = await file.read()
    
    # Create config
    config = OCRConfig(
        min_text_confidence=min_confidence,
        enable_preprocessing=enable_preprocessing,
        enable_rotation_correction=enable_rotation_correction,
        enable_noise_removal=enable_noise_removal
    )
    
    try:
        # Process immediately
        result = process_uploaded_image(
            contents,
            file.filename,
            config
        )
        
        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "result": result
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )

@app.delete("/api/ocr/task/{task_id}")
async def delete_task(task_id: str):
    """Delete a completed task"""
    
    if task_id not in processing_tasks:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )
    
    del processing_tasks[task_id]
    
    return {"message": f"Task {task_id} deleted"}

@app.get("/api/ocr/tasks")
async def list_tasks(
    status: Optional[str] = None,
    limit: int = 50
):
    """List all tasks with optional filtering"""
    
    tasks = []
    for task_id, task_data in list(processing_tasks.items())[:limit]:
        if status is None or task_data["status"] == status:
            tasks.append({
                "task_id": task_id,
                "status": task_data["status"],
                "filename": task_data["filename"],
                "progress": task_data.get("progress", 0),
                "created_at": task_data["created_at"]
            })
    
    return {
        "total": len(tasks),
        "tasks": tasks
    }

@app.post("/api/ocr/debug")
async def process_debug(
    file: UploadFile = File(...),
):
    """
    Debug OCR endpoint with detailed logging and visualization
    Returns bounding boxes visualization and step-by-step validation
    """
    
    # Validate file
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type"
        )
    
    contents = await file.read()
    
    try:
        # Import debug pipeline
        from ocr_debug_enhanced import process_uploaded_image as debug_process
        
        # Process with debug mode
        result = debug_process(
            contents,
            file.filename
        )
        
        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "result": result,
            "debug_mode": True
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Debug processing failed: {str(e)}"
        )

@app.post("/api/ocr/advanced")
async def process_advanced(
    file: UploadFile = File(...),
):
    """
    Advanced OCR endpoint with complete pipeline:
    1. Text Detection (EAST)
    2. Text Recognition (CRNN + Tesseract)
    3. Restructuring (Layout analysis)
    4. ID Data Extraction (Pattern matching)
    """
    
    # Validate file
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type"
        )
    
    contents = await file.read()
    
    try:
        # Import advanced pipeline
        from ocr_pipeline_advanced import process_uploaded_image as advanced_process
        
        # Process with advanced pipeline
        result = advanced_process(
            contents,
            file.filename
        )
        
        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "result": result,
            "pipeline": "advanced"
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Advanced processing failed: {str(e)}"
        )

# Cleanup old tasks periodically
@app.on_event("startup")
async def startup_event():
    """Startup tasks"""
    print("🚀 OCR API started")
    print("📡 WebSocket support enabled")
    print("🔄 CORS configured for Next.js")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("👋 Shutting down OCR API")
    processing_tasks.clear()
    active_connections.clear()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )