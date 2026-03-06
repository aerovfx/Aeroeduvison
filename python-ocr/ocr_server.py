#!/usr/bin/env python3
"""
PaddleOCR FastAPI Server
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from paddleocr_service import process_image_for_ocr
import uvicorn
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="PaddleOCR Service",
    description="OCR service using PaddleOCR",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ PaddleOCR server initialized")

@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "ok",
        "service": "PaddleOCR Service",
        "version": "1.0.0",
        "language": "en (Vietnamese supported)"
    }

@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    """
    Process OCR on uploaded image
    """
    try:
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(400, "File must be an image")
        
        logger.info(f"📄 Processing: {file.filename}")
        
        # Read image bytes
        image_bytes = await file.read()
        
        # Process with PaddleOCR
        ocr_result = process_image_for_ocr(image_bytes)
        
        logger.info(f"✅ Success: {len(ocr_result['text'])} chars, confidence: {ocr_result['confidence']:.1%}")
        
        return JSONResponse(content=ocr_result)
        
    except ValueError as e:
        logger.error(f"❌ Value error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {e}")

if __name__ == "__main__":
    logger.info("🚀 Starting PaddleOCR server on port 8001...")
    logger.info("📖 API docs: http://localhost:8001/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )
