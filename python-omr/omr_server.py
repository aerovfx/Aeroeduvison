"""
=============================================================================
OMR SERVER - FastAPI endpoint cho hệ thống chấm thi trắc nghiệm
=============================================================================
Endpoints:
  POST /omr/process     - Pipeline đầy đủ: flatten + đọc bubble + overlay
  POST /omr/flatten     - Chỉ flatten ảnh (perspective transform)
  POST /omr/read        - Chỉ đọc bubble (input: ảnh đã flatten)
  POST /omr/grade       - Đọc + chấm điểm (cần đáp án)
  GET  /omr/health      - Health check
  GET  /omr/template    - Trả về template phiếu thi chuẩn
=============================================================================
"""

import io
import json
import time
import traceback
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from marker_detector import detect_and_flatten
from bubble_detector import read_all_bubbles
from visualizer import (
    draw_bubble_overlay, draw_markers_debug,
    create_comparison_view
)
from exam_sheet_config import STD_WIDTH, STD_HEIGHT

app = FastAPI(
    title="AeroEdu OMR Service",
    description="Hệ thống chấm thi trắc nghiệm tự động với marker-based alignment",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/omr/health")
async def health_check():
    return {"status": "ok", "service": "omr", "version": "2.0.0"}


@app.post("/omr/process")
async def process_exam_sheet(
    image: UploadFile = File(...),
    debug: bool = Form(False),
    return_overlay: bool = Form(True),
    return_flattened: bool = Form(False),
    answer_key: Optional[str] = Form(None),
):
    """
    Pipeline đầy đủ:
    1. Nhận ảnh bài thi (chụp/scan)
    2. Phát hiện marker đen → perspective transform → flatten
    3. Đọc tất cả bubble (Phần I, II, III, SBD, Mã đề)
    4. Tạo overlay hiển thị kết quả
    5. Trả về JSON kết quả + ảnh overlay

    Args:
        image: File ảnh bài thi
        debug: Bật chế độ debug (thêm thông tin markers)
        return_overlay: Trả thêm ảnh overlay (base64)
        return_flattened: Trả thêm ảnh flatten (base64)
        answer_key: JSON đáp án đúng (optional)
    """
    start = time.time()

    try:
        # Đọc ảnh
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(400, "Không thể đọc file ảnh")

        original = img.copy()

        # Bước 1: Flatten
        t1 = time.time()
        flattened, flatten_info = detect_and_flatten(
            image_np=img, debug=debug
        )
        flatten_time = time.time() - t1

        # Bước 2: Đọc bubble
        t2 = time.time()
        bubble_results = read_all_bubbles(flattened)
        read_time = time.time() - t2

        # Parse answer key nếu có
        ak = None
        if answer_key:
            try:
                ak = json.loads(answer_key)
            except json.JSONDecodeError:
                pass

        # Bước 3: Chấm điểm nếu có đáp án
        grade_result = None
        if ak:
            grade_result = _grade_answers(bubble_results, ak)

        # Bước 4: Tạo overlay
        overlay_b64 = None
        if return_overlay:
            overlay_img = draw_bubble_overlay(
                flattened, bubble_results,
                answer_key=ak,
                show_values=debug
            )
            _, buf = cv2.imencode('.jpg', overlay_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
            import base64
            overlay_b64 = base64.b64encode(buf.tobytes()).decode()

        flattened_b64 = None
        if return_flattened:
            _, buf = cv2.imencode('.jpg', flattened, [cv2.IMWRITE_JPEG_QUALITY, 90])
            import base64
            flattened_b64 = base64.b64encode(buf.tobytes()).decode()

        # Debug: marker info
        debug_b64 = None
        if debug:
            debug_img = draw_markers_debug(original, {}, flatten_info)
            _, buf = cv2.imencode('.jpg', debug_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            import base64
            debug_b64 = base64.b64encode(buf.tobytes()).decode()

        total_time = time.time() - start

        response = {
            "success": True,
            "data": {
                "examCode": bubble_results["exam_code"],
                "studentId": bubble_results["sbd"],
                "part1": bubble_results["part1"],
                "part2": bubble_results["part2"],
                "part3": bubble_results["part3"],
                "confidence": bubble_results["confidence"],
            },
            "flatten": {
                "method": flatten_info["method"],
                "markersFound": flatten_info["markers_found"],
                "cornersDetected": flatten_info["corners_detected"],
                "sectionMarkersMatched": flatten_info.get("section_markers_matched", 0),
                "avgOffset": {
                    "x": round(flatten_info.get("avg_offset_x", 0), 2),
                    "y": round(flatten_info.get("avg_offset_y", 0), 2),
                },
                "maxOffset": round(flatten_info.get("max_offset", 0), 2),
            },
            "timing": {
                "flattenMs": round(flatten_time * 1000, 1),
                "readMs": round(read_time * 1000, 1),
                "totalMs": round(total_time * 1000, 1),
            },
        }

        if grade_result:
            response["grade"] = grade_result

        if overlay_b64:
            response["overlay"] = overlay_b64

        if flattened_b64:
            response["flattened"] = flattened_b64

        if debug_b64:
            response["debug_markers"] = debug_b64

        return JSONResponse(response)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            {"success": False, "error": str(e)},
            status_code=500
        )


@app.post("/omr/flatten")
async def flatten_only(
    image: UploadFile = File(...),
):
    """Chỉ flatten ảnh, trả về ảnh JPEG."""
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(400, "Không thể đọc file ảnh")

    flattened, info = detect_and_flatten(image_np=img)

    _, buf = cv2.imencode('.jpg', flattened, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return Response(
        content=buf.tobytes(),
        media_type="image/jpeg",
        headers={
            "X-OMR-Method": info["method"],
            "X-OMR-Markers": str(info["markers_found"]),
        }
    )


@app.post("/omr/read")
async def read_only(
    image: UploadFile = File(...),
):
    """Đọc bubble từ ảnh đã flatten."""
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(400, "Không thể đọc file ảnh")

    results = read_all_bubbles(img)

    # Bỏ bubble_map chi tiết cho response nhẹ hơn
    results.pop("bubble_map", None)

    return JSONResponse({"success": True, "data": results})


@app.post("/omr/grade")
async def grade_exam(
    image: UploadFile = File(...),
    answer_key: str = Form(...),
):
    """Đọc + chấm điểm bài thi."""
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(400, "Không thể đọc file ảnh")

    try:
        ak = json.loads(answer_key)
    except json.JSONDecodeError:
        raise HTTPException(400, "answer_key không phải JSON hợp lệ")

    flattened, flatten_info = detect_and_flatten(image_np=img)
    results = read_all_bubbles(flattened)
    grade = _grade_answers(results, ak)

    # Tạo overlay
    overlay_img = draw_bubble_overlay(flattened, results, answer_key=ak)
    _, buf = cv2.imencode('.jpg', overlay_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    import base64
    overlay_b64 = base64.b64encode(buf.tobytes()).decode()

    return JSONResponse({
        "success": True,
        "data": {
            "examCode": results["exam_code"],
            "studentId": results["sbd"],
            "part1": results["part1"],
            "part2": results["part2"],
            "part3": results["part3"],
        },
        "grade": grade,
        "overlay": overlay_b64,
        "flatten": {
            "method": flatten_info["method"],
            "markersFound": flatten_info["markers_found"],
        }
    })


def _grade_answers(results: dict, answer_key: dict) -> dict:
    """
    Chấm điểm theo quy tắc:
    - Phần I: 0.25 điểm/câu đúng (40 câu = 10 điểm max)
    - Phần II: Theo số đáp án đúng trong mỗi câu
        1 đúng: 0.1, 2 đúng: 0.25, 3 đúng: 0.5, 4 đúng: 1.0
    - Phần III: 0.5 điểm/câu đúng (6 câu = 3 điểm max nếu 0.5, hoặc 0.25 mỗi câu)
    """
    grade = {
        "part1": {"correct": 0, "wrong": 0, "blank": 0, "score": 0.0, "details": {}},
        "part2": {"correct": 0, "partial": 0, "wrong": 0, "score": 0.0, "details": {}},
        "part3": {"correct": 0, "wrong": 0, "blank": 0, "score": 0.0, "details": {}},
        "total": 0.0,
    }

    # === Phần I ===
    ak_p1 = answer_key.get("part1", {})
    for q, student_ans in results.get("part1", {}).items():
        q_key = str(q)
        correct = ak_p1.get(q_key) or ak_p1.get(int(q_key)) if q_key in ak_p1 or int(q_key) in ak_p1 else None

        if correct is None:
            continue

        if student_ans is None:
            grade["part1"]["blank"] += 1
            grade["part1"]["details"][q_key] = "blank"
        elif student_ans == correct:
            grade["part1"]["correct"] += 1
            grade["part1"]["score"] += 0.25
            grade["part1"]["details"][q_key] = "correct"
        else:
            grade["part1"]["wrong"] += 1
            grade["part1"]["details"][q_key] = f"wrong ({student_ans} vs {correct})"

    # === Phần II ===
    ak_p2 = answer_key.get("part2", {})
    for q, student_subs in results.get("part2", {}).items():
        q_key = str(q)
        correct_subs = ak_p2.get(q_key, {})
        if not correct_subs:
            continue

        n_correct_in_q = 0
        for sub, student_val in student_subs.items():
            correct_val = correct_subs.get(sub)
            if correct_val is not None and student_val == correct_val:
                n_correct_in_q += 1

        score_map = {0: 0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0}
        q_score = score_map.get(n_correct_in_q, 0)
        grade["part2"]["score"] += q_score
        if n_correct_in_q == 4:
            grade["part2"]["correct"] += 1
        elif n_correct_in_q > 0:
            grade["part2"]["partial"] += 1
        else:
            grade["part2"]["wrong"] += 1
        grade["part2"]["details"][q_key] = {
            "correct_count": n_correct_in_q,
            "score": q_score,
        }

    # === Phần III ===
    ak_p3 = answer_key.get("part3", {})
    for q, student_val in results.get("part3", {}).items():
        q_key = str(q)
        correct = ak_p3.get(q_key) or ak_p3.get(int(q_key)) if q_key in ak_p3 or int(q_key) in ak_p3 else None

        if correct is None:
            continue

        if not student_val:
            grade["part3"]["blank"] += 1
            grade["part3"]["details"][q_key] = "blank"
        elif student_val.strip() == str(correct).strip():
            grade["part3"]["correct"] += 1
            grade["part3"]["score"] += 0.25
            grade["part3"]["details"][q_key] = "correct"
        else:
            grade["part3"]["wrong"] += 1
            grade["part3"]["details"][q_key] = f"wrong ({student_val} vs {correct})"

    grade["total"] = round(
        grade["part1"]["score"] + grade["part2"]["score"] + grade["part3"]["score"],
        2
    )
    grade["part1"]["score"] = round(grade["part1"]["score"], 2)
    grade["part2"]["score"] = round(grade["part2"]["score"], 2)
    grade["part3"]["score"] = round(grade["part3"]["score"], 2)

    return grade


@app.get("/omr/template")
async def get_template_info():
    """Trả về thông tin template phiếu thi chuẩn."""
    from exam_sheet_config import MARKERS, PART1, PART2, PART3, SBD, EXAM_CODE
    return {
        "std_width": STD_WIDTH,
        "std_height": STD_HEIGHT,
        "markers": MARKERS,
        "layout": {
            "part1": PART1,
            "part2": PART2,
            "part3": PART3,
            "sbd": SBD,
            "exam_code": EXAM_CODE,
        }
    }


# =====================================================================
# TEXT DETECTION & OCR ENDPOINTS (Deep Learning-inspired)
# =====================================================================

@app.post("/omr/detect-text")
async def detect_text_regions_endpoint(
    image: UploadFile = File(...),
    min_confidence: float = Form(0.3),
    multi_scale: bool = Form(True),
    draw_overlay: bool = Form(False),
):
    """
    Phát hiện vùng chữ trong ảnh phiếu thi bằng Text Detection
    (CTPN/EAST-inspired: MSER + Morphological + Gradient-based).

    Args:
        image: File ảnh phiếu thi
        min_confidence: Ngưỡng confidence tối thiểu [0-1]
        multi_scale: Bật multi-scale detection (chậm hơn nhưng chính xác hơn)
        draw_overlay: Trả thêm ảnh overlay với các vùng text được đánh dấu
    """
    start = time.time()
    try:
        from text_detector import TextDetector

        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Không thể đọc file ảnh")

        detector = TextDetector(
            min_confidence=min_confidence,
            multi_scale=multi_scale,
        )

        # Detect text regions
        regions = detector.detect(img)

        # Exam-specific structured detection
        exam_regions = detector.detect_exam_regions(img)

        result = {
            "success": True,
            "regions": [r.to_dict() for r in regions],
            "exam_structure": exam_regions,
            "stats": {
                "total_regions": len(regions),
                "by_type": {},
                "processing_ms": round((time.time() - start) * 1000, 1),
            }
        }

        # Count by type
        for r in regions:
            t = r.region_type
            result["stats"]["by_type"][t] = result["stats"]["by_type"].get(t, 0) + 1

        # Overlay image
        if draw_overlay:
            overlay_img = detector.draw_detections(img, regions)
            _, buf = cv2.imencode('.jpg', overlay_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
            import base64
            result["overlay"] = base64.b64encode(buf.tobytes()).decode()

        return JSONResponse(result)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.post("/omr/ocr")
async def ocr_exam_sheet(
    image: UploadFile = File(...),
    flatten_first: bool = Form(True),
):
    """
    OCR phiếu thi: nhận diện thông tin học sinh, mã đề, SBD.
    Kết hợp Text Detection (CTPN/EAST-inspired) + Tesseract OCR.

    Args:
        image: File ảnh phiếu thi
        flatten_first: Flatten ảnh trước khi OCR (recommended)
    """
    start = time.time()
    try:
        from ocr_reader import ExamOCRReader, ExamSheetEnhancer

        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Không thể đọc file ảnh")

        # Optionally flatten first for better OCR
        if flatten_first:
            flattened, _ = detect_and_flatten(image_np=img)
            work_img = flattened
        else:
            work_img = img

        # Run OCR directly on the flattened image
        # (per-ROI enhancement happens inside the reader methods)
        reader = ExamOCRReader()
        ocr_result = reader.read_full_sheet(work_img)

        ocr_result["timing_ms"] = round((time.time() - start) * 1000, 1)
        return JSONResponse({"success": True, **ocr_result})

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.post("/omr/process-full")
async def process_full_with_ocr(
    image: UploadFile = File(...),
    answer_key: Optional[str] = Form(None),
    enable_ocr: bool = Form(True),
    debug: bool = Form(False),
):
    """
    Pipeline đầy đủ tích hợp Deep Learning:
    1. Flatten ảnh (marker-based alignment)
    2. Text Detection (CTPN/EAST-inspired)
    3. OCR (Tesseract) → SBD, Tên HS, Mã đề
    4. Bubble detection → đáp án
    5. Chấm điểm (nếu có đáp án)
    6. Tạo overlay visualization

    Đây là endpoint chính tích hợp tất cả DL techniques.
    """
    start = time.time()
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Không thể đọc file ảnh")

        # Step 1: Flatten
        t1 = time.time()
        flattened, flatten_info = detect_and_flatten(image_np=img, debug=debug)
        flatten_ms = round((time.time() - t1) * 1000, 1)

        # Step 2: Text Detection + OCR
        ocr_data = None
        text_regions_data = None
        ocr_ms = 0
        if enable_ocr:
            try:
                from text_detector import TextDetector
                from ocr_reader import ExamOCRReader, ExamSheetEnhancer

                t2 = time.time()
                # Text detection
                detector = TextDetector(min_confidence=0.3)
                text_regions = detector.detect(flattened)
                text_regions_data = {
                    "count": len(text_regions),
                    "regions": [r.to_dict() for r in text_regions[:50]],  # limit
                }

                # OCR for exam info
                enhanced = ExamSheetEnhancer.enhance_for_ocr(flattened)
                reader = ExamOCRReader()
                ocr_data = reader.read_exam_info(enhanced).to_dict()
                ocr_ms = round((time.time() - t2) * 1000, 1)
            except Exception as ocr_err:
                print(f"[OCR warning] {ocr_err}")
                ocr_data = {"error": str(ocr_err)}

        # Step 3: Bubble detection
        t3 = time.time()
        bubble_results = read_all_bubbles(flattened)
        bubble_ms = round((time.time() - t3) * 1000, 1)

        # Step 4: Grade if answer key provided
        ak = None
        grade_result = None
        if answer_key:
            try:
                ak = json.loads(answer_key)
                grade_result = _grade_answers(bubble_results, ak)
            except json.JSONDecodeError:
                pass

        # Step 5: Overlay
        overlay_img = draw_bubble_overlay(
            flattened, bubble_results,
            answer_key=ak,
            show_values=debug
        )
        _, buf = cv2.imencode('.jpg', overlay_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        import base64
        overlay_b64 = base64.b64encode(buf.tobytes()).decode()

        total_ms = round((time.time() - start) * 1000, 1)

        response = {
            "success": True,
            "data": {
                "examCode": bubble_results["exam_code"],
                "studentId": bubble_results["sbd"],
                "part1": bubble_results["part1"],
                "part2": bubble_results["part2"],
                "part3": bubble_results["part3"],
                "confidence": bubble_results["confidence"],
            },
            "ocr": ocr_data,
            "text_detection": text_regions_data,
            "flatten": {
                "method": flatten_info["method"],
                "markersFound": flatten_info["markers_found"],
                "cornersDetected": flatten_info["corners_detected"],
            },
            "timing": {
                "flattenMs": flatten_ms,
                "ocrMs": ocr_ms,
                "bubbleMs": bubble_ms,
                "totalMs": total_ms,
            },
            "overlay": overlay_b64,
        }

        if grade_result:
            response["grade"] = grade_result

        return JSONResponse(response)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
