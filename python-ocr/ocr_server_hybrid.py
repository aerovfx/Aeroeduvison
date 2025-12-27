#!/usr/bin/env python3
"""
Hybrid OCR Server: PaddleOCR + CRNN
FastAPI server với khả năng nhận dạng chữ viết tay tốt hơn
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from hybrid_ocr import create_hybrid_ocr
import uvicorn
import tempfile
import os
from typing import Dict
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Hybrid OCR Service",
    description="PaddleOCR + CRNN for handwriting recognition",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Hybrid OCR
logger.info("🚀 Initializing Hybrid OCR System...")
hybrid_ocr = create_hybrid_ocr(use_gpu=False)
logger.info("✅ Hybrid OCR ready!")

@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "ok",
        "service": "Hybrid OCR Service",
        "version": "2.0.0",
        "features": {
            "paddle_ocr": True,
            "crnn_handwriting": hybrid_ocr.use_crnn,
            "preprocessing": "opencv",
            "auto_classification": True
        }
    }

@app.post("/ocr")
async def process_ocr(file: UploadFile = File(...)) -> Dict:
    """
    Process OCR với hybrid system
    
    Features:
    - Auto-detect handwriting vs printed
    - Use CRNN for handwriting regions
    - Use PaddleOCR for printed regions
    - OpenCV preprocessing
    """
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(400, "File must be an image")
        
        logger.info(f"📄 Processing: {file.filename}")
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Process with hybrid OCR
            result = hybrid_ocr.process(temp_path)
            
            if 'error' in result:
                logger.error(f"❌ OCR error: {result['error']}")
                return {
                    'success': False,
                    'error': result['error']
                }
            
            # Add metadata
            result['filename'] = file.filename
            result['file_size'] = len(content)
            result['ocr_method'] = 'hybrid'
            
            logger.info(f"✅ Success: {result.get('total_lines', 0)} lines, "
                       f"confidence: {result.get('confidence', 0):.1%}, "
                       f"handwriting: {result.get('stats', {}).get('handwriting_regions', 0)}")
            
            return {
                'success': True,
                'data': result
            }
            
        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(500, f"Processing failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "paddle_ocr": "ready",
        "crnn_model": "ready" if hybrid_ocr.use_crnn else "not_loaded",
        "gpu": False,
        "preprocessing": "opencv_enabled"
    }

if __name__ == "__main__":
    logger.info("🚀 Starting Hybrid OCR server on port 8001...")
    logger.info("📖 API docs: http://localhost:8001/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )

