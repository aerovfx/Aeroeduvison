"""
FastAPI Server for OCR Auto-Grading System
Pipeline: OCR -> LLM -> Grading
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import json
import logging
from datetime import datetime
import asyncio

from ocr_engine import OCREngine
from llm_grader import LLMGrader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="OCR Auto-Grading API",
    description="Automatic grading system using OCR and LLM",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR and LLM (lazy loading to avoid startup delays)
ocr_engine = None
llm_grader = LLMGrader(model='demo')  # Default to demo mode

def get_ocr_engine():
    """Lazy load Tesseract OCR engine"""
    global ocr_engine
    if ocr_engine is None:
        logger.info("Initializing Tesseract OCR engine...")
        ocr_engine = OCREngine(language='vie+eng')
        logger.info("✅ Tesseract OCR engine ready")
    return ocr_engine

# Models
class Answer(BaseModel):
    question_number: int
    question: str
    correct_answer: str
    max_points: int = 10

class GradingRequest(BaseModel):
    answers: List[Answer]
    use_llm: bool = True
    llm_model: str = 'demo'  # 'demo', 'grok', 'openai'

class OCRResult(BaseModel):
    text: str
    confidence: float
    word_count: int
    engine: str

# Endpoints

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "OCR Auto-Grading API",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "ocr": "/ocr",
            "grade": "/grade",
            "auto_grade": "/auto-grade",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "ocr_engine": "ready",
        "llm_grader": "ready",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/ocr", response_model=OCRResult)
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from uploaded image using OCR
    
    Args:
        file: Image file (JPG, PNG, etc.)
        
    Returns:
        Extracted text and metadata
    """
    try:
        # Read file
        contents = await file.read()
        
        # Perform OCR (lazy load)
        engine = get_ocr_engine()
        result = engine.extract_text_from_bytes(contents)
        
        logger.info(f"OCR completed: {result['word_count']} words, {result['confidence']:.2f}% confidence")
        
        return OCRResult(**result)
        
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

@app.post("/grade")
async def grade_answer(
    student_answer: str = Form(...),
    correct_answer: str = Form(...),
    question: str = Form(...),
    max_points: int = Form(10),
    use_llm: bool = Form(True),
    llm_model: str = Form('demo')
):
    """
    Grade a single answer
    
    Args:
        student_answer: Student's answer text
        correct_answer: Correct answer/rubric
        question: Question text
        max_points: Maximum points for this question
        use_llm: Use LLM for grading
        llm_model: LLM model to use ('demo', 'grok', 'openai')
        
    Returns:
        Grading result with score and feedback
    """
    try:
        # Initialize grader with specified model
        grader = LLMGrader(model=llm_model if use_llm else 'demo')
        
        # Grade answer
        result = await grader.grade_with_llm(
            student_answer=student_answer,
            correct_answer=correct_answer,
            question=question,
            max_points=max_points
        )
        
        logger.info(f"Grading completed: {result['score']}/{max_points} points")
        
        return result
        
    except Exception as e:
        logger.error(f"Grading error: {e}")
        raise HTTPException(status_code=500, detail=f"Grading failed: {str(e)}")

@app.post("/auto-grade")
async def auto_grade(
    file: UploadFile = File(...),
    answer_key: str = Form(...),
    use_llm: bool = Form(True),
    llm_model: str = Form('demo')
):
    """
    Automatic grading pipeline: OCR -> LLM -> Grade
    
    Args:
        file: Scanned test paper image
        answer_key: JSON string with correct answers
        use_llm: Use LLM for intelligent grading
        llm_model: LLM model to use
        
    Returns:
        Complete grading report
    """
    try:
        logger.info("=" * 60)
        logger.info("Starting Auto-Grading Pipeline")
        logger.info("=" * 60)
        
        # Step 1: OCR - Extract text from image
        logger.info("Step 1: Performing OCR...")
        contents = await file.read()
        engine = get_ocr_engine()
        ocr_result = engine.extract_text_from_bytes(contents)
        
        logger.info(f"OCR Result: {ocr_result['word_count']} words, {ocr_result['confidence']:.2f}% confidence")
        logger.info(f"Extracted text: {ocr_result['text'][:200]}...")
        
        # Step 2: Parse answer key
        logger.info("\nStep 2: Parsing answer key...")
        try:
            answer_key_data = json.loads(answer_key)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid answer key JSON format")
        
        # Step 3: Extract student answers from OCR text
        logger.info("\nStep 3: Extracting student answers...")
        student_text = ocr_result['text']
        
        # Parse student answers (basic implementation)
        import re
        student_answers = {}
        
        # Try to match patterns like "Câu 1: answer" or "1. answer"
        patterns = [
            r'(?:Câu|câu)\s*(\d+)[:\.\s]+(.+?)(?=(?:Câu|câu)\s*\d+|$)',
            r'(\d+)[:\.\s]+(.+?)(?=\d+[:\.\s]|$)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, student_text, re.DOTALL | re.IGNORECASE)
            for match in matches:
                q_num = int(match.group(1))
                answer = match.group(2).strip()
                if answer and q_num not in student_answers:
                    student_answers[q_num] = answer
        
        logger.info(f"Extracted {len(student_answers)} student answers")
        
        # Step 4: LLM Grading
        logger.info("\nStep 4: Grading with LLM...")
        grader = LLMGrader(model=llm_model if use_llm else 'demo')
        
        grading_tasks = []
        for item in answer_key_data:
            q_num = item.get('question_number', 0)
            student_ans = student_answers.get(q_num, '[No answer detected]')
            
            grading_tasks.append({
                'question': item.get('question', f'Câu {q_num}'),
                'student_answer': student_ans,
                'correct_answer': item.get('correct_answer', ''),
                'max_points': item.get('max_points', 10)
            })
        
        # Grade all answers
        grading_results = await grader.grade_multiple_answers(grading_tasks)
        
        # Step 5: Calculate total score
        logger.info("\nStep 5: Calculating total score...")
        summary = grader.calculate_total_score(grading_results)
        
        logger.info(f"\n" + "=" * 60)
        logger.info(f"Grading Complete!")
        logger.info(f"Total Score: {summary['total_score']}/{summary['max_score']} ({summary['percentage']:.1f}%)")
        logger.info(f"Grade: {summary['grade']}")
        logger.info("=" * 60)
        
        # Return complete result
        return {
            "status": "success",
            "ocr_result": {
                "text": ocr_result['text'],
                "confidence": ocr_result['confidence'],
                "word_count": ocr_result['word_count']
            },
            "student_answers": student_answers,
            "grading_summary": summary,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Auto-grading error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Auto-grading failed: {str(e)}")

@app.post("/batch-grade")
async def batch_grade(
    files: List[UploadFile] = File(...),
    answer_key: str = Form(...),
    use_llm: bool = Form(True),
    llm_model: str = Form('demo')
):
    """
    Batch grading for multiple test papers
    
    Args:
        files: List of test paper images
        answer_key: JSON string with correct answers
        use_llm: Use LLM for grading
        llm_model: LLM model to use
        
    Returns:
        Batch grading results
    """
    try:
        logger.info(f"Starting batch grading for {len(files)} papers...")
        
        results = []
        
        for i, file in enumerate(files):
            logger.info(f"\nProcessing paper {i + 1}/{len(files)}: {file.filename}")
            
            # Grade individual paper
            contents = await file.read()
            
            # Create temporary file-like object for auto_grade
            from io import BytesIO
            
            class FakeUpload:
                def __init__(self, content, filename):
                    self.file = BytesIO(content)
                    self.filename = filename
                
                async def read(self):
                    return self.file.read()
            
            fake_file = FakeUpload(contents, file.filename)
            
            result = await auto_grade(
                file=fake_file,
                answer_key=answer_key,
                use_llm=use_llm,
                llm_model=llm_model
            )
            
            result['paper_number'] = i + 1
            result['filename'] = file.filename
            results.append(result)
        
        # Calculate batch statistics
        total_scores = [r['grading_summary']['percentage'] for r in results]
        avg_score = sum(total_scores) / len(total_scores) if total_scores else 0
        
        return {
            "status": "success",
            "total_papers": len(files),
            "results": results,
            "statistics": {
                "average_score": round(avg_score, 1),
                "highest_score": max(total_scores) if total_scores else 0,
                "lowest_score": min(total_scores) if total_scores else 0
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Batch grading error: {e}")
        raise HTTPException(status_code=500, detail=f"Batch grading failed: {str(e)}")

# Run server
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('PORT', 8014))
    
    logger.info(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║        OCR AUTO-GRADING API SERVER                       ║
    ╚══════════════════════════════════════════════════════════╝
    
    🚀 Server starting on: http://localhost:{port}
    📚 API Docs: http://localhost:{port}/docs
    🔬 OCR Engine: EasyOCR
    🤖 LLM Grader: Ready
    
    Endpoints:
    - POST /ocr - Extract text from image
    - POST /grade - Grade single answer
    - POST /auto-grade - Full pipeline (OCR + LLM + Grade)
    - POST /batch-grade - Batch grading
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

