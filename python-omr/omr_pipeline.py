"""
=============================================================================
OMR PIPELINE - Toàn bộ flow: Ảnh chụp → Flatten → Đọc bubble → Kết quả
=============================================================================
Đây là module chính tích hợp tất cả thành phần:
1. sheet_aligner: Phát hiện marker → Perspective transform → Flatten
2. bubble_reader: Đọc bubble chính xác theo tọa độ template
3. visualizer: Tạo overlay hiển thị kết quả
4. grader: Chấm điểm (nếu có đáp án)
=============================================================================
"""

import cv2
import numpy as np
import json
import time
from typing import Dict, Optional, Any, Tuple

from template_config import (
    STD_W, STD_H, TEMPLATE_MARKERS,
    PART1_LAYOUT, PART2_LAYOUT, PART3_LAYOUT,
    SBD_LAYOUT, EXAM_CODE_LAYOUT, DETECTION_PARAMS,
)
from sheet_aligner import align_exam_sheet, AlignmentResult
from template_generator import generate_reference_template


# ===========================================================================
# BUBBLE READER (dùng tọa độ từ template_config)
# ===========================================================================

def _circle_mean(gray: np.ndarray, cx: int, cy: int, r: int) -> float:
    """Tính brightness trung bình trong vùng tròn Gaussian-weighted."""
    h, w = gray.shape[:2]
    y1 = max(0, cy - r)
    y2 = min(h, cy + r + 1)
    x1 = max(0, cx - r)
    x2 = min(w, cx + r + 1)
    if y1 >= y2 or x1 >= x2:
        return 255.0

    region = gray[y1:y2, x1:x2].astype(np.float64)
    yy, xx = np.ogrid[y1 - cy:y2 - cy, x1 - cx:x2 - cx]
    dist_sq = (xx * xx + yy * yy).astype(np.float64)
    r_sq = float(r * r)
    mask = dist_sq <= r_sq
    weights = np.exp(-dist_sq / (2 * r_sq * 0.5))
    weights[~mask] = 0
    total_w = weights.sum()
    if total_w < 1e-6:
        return 255.0
    return float((region * weights).sum() / total_w)


def _pick_darkest(means: list, threshold: float, min_gap: float = 7.0) -> int:
    """Chọn index tối nhất, trả -1 nếu không đủ rõ."""
    if not means:
        return -1
    indexed = sorted(enumerate(means), key=lambda x: x[1])
    darkest_idx, darkest_val = indexed[0]
    second_val = indexed[1][1] if len(indexed) > 1 else 255.0

    local_thresh = min(threshold, np.mean(means) * 0.85)
    if darkest_val < local_thresh and (second_val - darkest_val) >= min_gap:
        return darkest_idx
    return -1


def read_part1(gray: np.ndarray) -> Tuple[Dict, list]:
    """Đọc 40 câu trắc nghiệm ABCD."""
    H, W = gray.shape[:2]
    cfg = PART1_LAYOUT
    r = max(6, int(cfg["bubble_r"] * W))
    rows = cfg["rows"]
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, rows - 1)

    # Brightness vùng Phần I
    y1p = int(cfg["y_first"] * H)
    y2p = int(cfg["y_last"] * H)
    region_mean = float(gray[max(0, y1p):min(H, y2p), :].mean())
    threshold = region_mean * DETECTION_PARAMS["bubble_dark_ratio"]

    answers = {}
    details = []
    options = ["A", "B", "C", "D"]

    for group in cfg["groups"]:
        q0 = group["q0"]
        xs = [int(group[opt] * W) for opt in options]

        for ri in range(rows):
            q = q0 + ri
            y = int((cfg["y_first"] + ri * y_step) * H)
            means = [_circle_mean(gray, x, y, r) for x in xs]
            chosen = _pick_darkest(means, threshold, DETECTION_PARAMS["bubble_min_gap"])
            answers[q] = options[chosen] if chosen >= 0 else None

            for i, (x, m) in enumerate(zip(xs, means)):
                details.append({
                    "part": 1, "q": q, "opt": options[i],
                    "x": x, "y": y, "r": r,
                    "mean": round(m, 1), "filled": i == chosen,
                })

    return answers, details


def read_part2(gray: np.ndarray) -> Tuple[Dict, list]:
    """Đọc 8 câu Đúng/Sai."""
    H, W = gray.shape[:2]
    cfg = PART2_LAYOUT
    r = max(5, int(cfg["bubble_r"] * W))
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["sub_count"] - 1)

    y1p = int(cfg["y_first"] * H)
    y2p = int(cfg["y_last"] * H)
    region_mean = float(gray[max(0, y1p):min(H, y2p), :].mean())
    threshold = region_mean * DETECTION_PARAMS["bubble_dark_ratio"]

    answers = {}
    details = []

    for qinfo in cfg["questions"]:
        q = qinfo["q"]
        x_d = int(qinfo["dung"] * W)
        x_s = int(qinfo["sai"] * W)
        answers[q] = {}

        for si, sub in enumerate(cfg["sub_labels"]):
            y = int((cfg["y_first"] + si * y_step) * H)
            m_d = _circle_mean(gray, x_d, y, r)
            m_s = _circle_mean(gray, x_s, y, r)

            min_val = min(m_d, m_s)
            diff = abs(m_d - m_s)
            local_t = min(threshold, (m_d + m_s) / 2 * 0.88)

            if min_val < local_t and diff > 6:
                answers[q][sub] = m_d < m_s  # True = Đúng
            else:
                answers[q][sub] = None

            details.append({
                "part": 2, "q": q, "sub": sub,
                "x_d": x_d, "x_s": x_s, "y": y, "r": r,
                "mean_d": round(m_d, 1), "mean_s": round(m_s, 1),
                "answer": answers[q][sub],
            })

    return answers, details


def read_part3(gray: np.ndarray) -> Tuple[Dict, list]:
    """Đọc 6 câu điền số."""
    H, W = gray.shape[:2]
    cfg = PART3_LAYOUT
    r = max(4, int(cfg["bubble_r"] * W))
    rows = cfg["rows"]
    labels = cfg["row_labels"]
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, rows - 1)

    y1p = int(cfg["y_first"] * H)
    y2p = int(cfg["y_last"] * H)
    region_mean = float(gray[max(0, y1p):min(H, y2p), :].mean())
    threshold = region_mean * DETECTION_PARAMS["bubble_dark_ratio"]

    answers = {}
    details = []

    for qinfo in cfg["questions"]:
        q = qinfo["q"]
        answer_str = ""

        for ci, col_x in enumerate(qinfo["cols"]):
            x = int(col_x * W)
            ys = [int((cfg["y_first"] + ri * y_step) * H) for ri in range(rows)]
            means = [_circle_mean(gray, x, y, r) for y in ys]
            chosen = _pick_darkest(means, threshold, DETECTION_PARAMS["bubble_min_gap"])

            if chosen >= 0:
                answer_str += labels[chosen]

            for ri, (y, m) in enumerate(zip(ys, means)):
                details.append({
                    "part": 3, "q": q, "col": ci, "label": labels[ri],
                    "x": x, "y": y, "r": r,
                    "mean": round(m, 1), "filled": ri == chosen,
                })

        answers[q] = answer_str

    return answers, details


def read_sbd(gray: np.ndarray) -> Tuple[str, list]:
    """Đọc Số Báo Danh."""
    H, W = gray.shape[:2]
    cfg = SBD_LAYOUT
    r = max(5, int(cfg["bubble_r"] * W))
    x_step = (cfg["x_last"] - cfg["x_first"]) / max(1, cfg["cols"] - 1)
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["rows"] - 1)

    x1p = int(cfg["x_first"] * W)
    x2p = int(cfg["x_last"] * W)
    y1p = int(cfg["y_first"] * H)
    y2p = int(cfg["y_last"] * H)
    rm = float(gray[max(0, y1p):min(H, y2p), max(0, x1p):min(W, x2p)].mean())
    threshold = rm * 0.68

    result = ""
    details = []

    for col in range(cfg["cols"]):
        x = int((cfg["x_first"] + col * x_step) * W)
        ys = [int((cfg["y_first"] + d * y_step) * H) for d in range(cfg["rows"])]
        means = [_circle_mean(gray, x, y, r) for y in ys]
        chosen = _pick_darkest(means, threshold, 6)
        if chosen >= 0:
            result += str(chosen)
        for di, (y, m) in enumerate(zip(ys, means)):
            details.append({
                "field": "sbd", "col": col, "digit": di,
                "x": x, "y": y, "r": r, "mean": round(m, 1), "filled": di == chosen,
            })

    return result, details


def read_exam_code(gray: np.ndarray) -> Tuple[str, list]:
    """Đọc Mã đề thi."""
    H, W = gray.shape[:2]
    cfg = EXAM_CODE_LAYOUT
    r = max(5, int(cfg["bubble_r"] * W))
    x_step = (cfg["x_last"] - cfg["x_first"]) / max(1, cfg["cols"] - 1)
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["rows"] - 1)

    x1p = int(cfg["x_first"] * W)
    x2p = int(cfg["x_last"] * W)
    y1p = int(cfg["y_first"] * H)
    y2p = int(cfg["y_last"] * H)
    rm = float(gray[max(0, y1p):min(H, y2p), max(0, x1p):min(W, x2p)].mean())
    threshold = rm * 0.68

    result = ""
    details = []

    for col in range(cfg["cols"]):
        x = int((cfg["x_first"] + col * x_step) * W)
        ys = [int((cfg["y_first"] + d * y_step) * H) for d in range(cfg["rows"])]
        means = [_circle_mean(gray, x, y, r) for y in ys]
        chosen = _pick_darkest(means, threshold, 6)
        if chosen >= 0:
            result += str(chosen)
        for di, (y, m) in enumerate(zip(ys, means)):
            details.append({
                "field": "exam_code", "col": col, "digit": di,
                "x": x, "y": y, "r": r, "mean": round(m, 1), "filled": di == chosen,
            })

    return result, details


# ===========================================================================
# OVERLAY VISUALIZER
# ===========================================================================

def draw_result_overlay(
    aligned: np.ndarray,
    all_details: dict,
    answers: dict,
    answer_key: dict = None,
    show_template: bool = True,
) -> np.ndarray:
    """
    Vẽ overlay kết quả trên ảnh aligned.
    Nếu show_template=True, blend semi-transparent template lên ảnh.
    """
    vis = aligned.copy()
    if len(vis.shape) == 2:
        vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2BGR)

    # Blend template (hiển thị vị trí chuẩn)
    if show_template:
        template = generate_reference_template(draw_bubbles=True, draw_labels=True)
        # Resize template nếu cần
        if template.shape[:2] != vis.shape[:2]:
            template = cv2.resize(template, (vis.shape[1], vis.shape[0]))
        vis = cv2.addWeighted(vis, 0.75, template, 0.25, 0)

    GREEN = (0, 220, 0)
    RED = (0, 0, 255)
    GRAY = (180, 180, 180)
    BLUE = (255, 150, 0)

    # Vẽ Phần I
    for b in all_details.get("part1", []):
        x, y, r = b["x"], b["y"], b["r"]
        if b["filled"]:
            color = GREEN
            if answer_key and "part1" in answer_key:
                correct = answer_key["part1"].get(str(b["q"]))
                if correct and b["opt"] != correct:
                    color = RED
            cv2.circle(vis, (x, y), r + 2, color, 2)
            cv2.circle(vis, (x, y), max(1, r - 2), color, -1)
        else:
            cv2.circle(vis, (x, y), r, GRAY, 1)

    # Vẽ Phần II
    for b in all_details.get("part2", []):
        y, r = b["y"], b["r"]
        answer = b.get("answer")
        for key in ["x_d", "x_s"]:
            x = b[key]
            is_dung = key == "x_d"
            is_chosen = (answer is True and is_dung) or (answer is False and not is_dung)
            if is_chosen:
                cv2.circle(vis, (x, y), r + 1, GREEN, 2)
                cv2.circle(vis, (x, y), max(1, r - 2), GREEN, -1)
            else:
                cv2.circle(vis, (x, y), r, GRAY, 1)

    # Vẽ Phần III
    for b in all_details.get("part3", []):
        x, y, r = b["x"], b["y"], b["r"]
        if b["filled"]:
            cv2.circle(vis, (x, y), r + 1, GREEN, 2)
            cv2.circle(vis, (x, y), max(1, r - 2), GREEN, -1)
        else:
            cv2.circle(vis, (x, y), r, GRAY, 1)

    # Vẽ SBD + Mã đề
    for section in ["sbd", "exam_code"]:
        for b in all_details.get(section, []):
            x, y, r = b["x"], b["y"], b["r"]
            if b["filled"]:
                cv2.circle(vis, (x, y), r + 1, BLUE, 2)
                cv2.circle(vis, (x, y), max(1, r - 2), BLUE, -1)
            else:
                cv2.circle(vis, (x, y), r, GRAY, 1)

    # Info panel
    _draw_info(vis, answers)

    return vis


def draw_alignment_debug(
    original: np.ndarray,
    aligned: np.ndarray,
    alignment: AlignmentResult
) -> np.ndarray:
    """
    Tạo ảnh debug hiển thị marker detection + alignment quality.
    """
    debug = aligned.copy()
    if len(debug.shape) == 2:
        debug = cv2.cvtColor(debug, cv2.COLOR_GRAY2BGR)

    # Vẽ vị trí kỳ vọng (xanh dương) vs thực tế (xanh lá)
    H, W = debug.shape[:2]
    for name, (fx, fy) in TEMPLATE_MARKERS.items():
        ex, ey = int(fx * W), int(fy * H)
        # Kỳ vọng
        cv2.drawMarker(debug, (ex, ey), (255, 100, 0), cv2.MARKER_CROSS, 15, 1)

        # Thực tế
        if name in alignment.matched_markers:
            mx, my = alignment.matched_markers[name]
            mx, my = int(mx), int(my)
            cv2.circle(debug, (mx, my), 8, (0, 255, 0), 2)
            cv2.line(debug, (ex, ey), (mx, my), (0, 200, 255), 1)

            # Offset text
            dx, dy = alignment.marker_offsets.get(name, (0, 0))
            if abs(dx) > 2 or abs(dy) > 2:
                cv2.putText(debug, f"{dx:+.0f},{dy:+.0f}",
                            (mx + 10, my - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 0, 255), 1)
        else:
            cv2.putText(debug, "?", (ex + 5, ey - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)

    # Info
    cv2.putText(debug,
                f"Method: {alignment.method} | Markers: {alignment.markers_used}/{len(TEMPLATE_MARKERS)} | "
                f"Score: {alignment.alignment_score} | MaxOff: {alignment.max_offset:.1f}px",
                (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

    return debug


def _draw_info(img, answers):
    H, W = img.shape[:2]
    panel_h, panel_w = 80, 380
    px, py = 10, H - panel_h - 10
    cv2.rectangle(img, (px, py), (px + panel_w, py + panel_h), (255, 255, 230), -1)
    cv2.rectangle(img, (px, py), (px + panel_w, py + panel_h), (100, 100, 100), 1)

    font = cv2.FONT_HERSHEY_SIMPLEX
    fs = 0.42
    sbd = answers.get("sbd", "---")
    ec = answers.get("exam_code", "---")
    p1_count = sum(1 for v in answers.get("part1", {}).values() if v is not None)
    p2_count = sum(1 for q in answers.get("part2", {}).values() for v in q.values() if v is not None)

    texts = [
        f"SBD: {sbd}  |  Ma de: {ec}",
        f"Phan I: {p1_count}/40 | Phan II: {p2_count}/32",
        f"Phan III: {sum(1 for v in answers.get('part3', {}).values() if v)}/6",
    ]
    for i, t in enumerate(texts):
        cv2.putText(img, t, (px + 8, py + 20 + i * 22), font, fs, (0, 0, 0), 1, cv2.LINE_AA)


# ===========================================================================
# FULL PIPELINE
# ===========================================================================

def process_exam_image(
    image: np.ndarray = None,
    image_path: str = None,
    image_bytes: bytes = None,
    answer_key: dict = None,
    debug: bool = False,
) -> dict:
    """
    PIPELINE CHÍNH: Ảnh bài thi → Kết quả hoàn chỉnh.

    Returns dict:
        success, answers, alignment_info, overlay_image, timing, grade (nếu có đáp án)
    """
    t_start = time.time()

    # Load image
    if image is not None:
        img = image
    elif image_bytes is not None:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif image_path is not None:
        img = cv2.imread(image_path)
    else:
        return {"success": False, "error": "No image provided"}

    if img is None:
        return {"success": False, "error": "Cannot read image"}

    # ── STEP 1: ALIGN ──
    t1 = time.time()
    alignment = align_exam_sheet(img, debug=debug)
    t_align = time.time() - t1

    if not alignment.success or alignment.aligned_image is None:
        return {"success": False, "error": "Alignment failed"}

    aligned = alignment.aligned_image

    # ── STEP 2: READ BUBBLES ──
    t2 = time.time()
    gray = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY) if len(aligned.shape) == 3 else aligned.copy()
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    p1, d1 = read_part1(gray)
    p2, d2 = read_part2(gray)
    p3, d3 = read_part3(gray)
    sbd, d_sbd = read_sbd(gray)
    ec, d_ec = read_exam_code(gray)
    t_read = time.time() - t2

    answers = {
        "part1": p1, "part2": p2, "part3": p3,
        "sbd": sbd, "exam_code": ec,
    }
    all_details = {
        "part1": d1, "part2": d2, "part3": d3,
        "sbd": d_sbd, "exam_code": d_ec,
    }

    # ── STEP 3: OVERLAY ──
    t3 = time.time()
    overlay = draw_result_overlay(aligned, all_details, answers, answer_key)
    debug_img = draw_alignment_debug(img, aligned, alignment) if debug else None
    t_viz = time.time() - t3

    # ── STEP 4: GRADE (optional) ──
    grade = None
    if answer_key:
        grade = grade_answers(answers, answer_key)

    t_total = time.time() - t_start

    return {
        "success": True,
        "answers": answers,
        "alignment": {
            "method": alignment.method,
            "markers_found": alignment.raw_markers_count,
            "markers_matched": alignment.markers_used,
            "total_markers": len(TEMPLATE_MARKERS),
            "score": alignment.alignment_score,
            "avg_offset": {"x": round(alignment.avg_offset[0], 1), "y": round(alignment.avg_offset[1], 1)},
            "max_offset": round(alignment.max_offset, 1),
        },
        "confidence": {
            "part1": round(sum(1 for v in p1.values() if v) / 40 * 100, 1),
            "part2": round(sum(1 for q in p2.values() for v in q.values() if v is not None) / 32 * 100, 1),
            "part3": round(sum(1 for v in p3.values() if v) / 6 * 100, 1),
            "sbd_digits": len(sbd),
            "exam_code_digits": len(ec),
        },
        "timing": {
            "align_ms": round(t_align * 1000, 1),
            "read_ms": round(t_read * 1000, 1),
            "viz_ms": round(t_viz * 1000, 1),
            "total_ms": round(t_total * 1000, 1),
        },
        "images": {
            "aligned": aligned,
            "overlay": overlay,
            "debug": debug_img,
        },
        "details": all_details,
        "grade": grade,
    }


def grade_answers(answers: dict, answer_key: dict) -> dict:
    """Chấm điểm theo quy tắc chuẩn."""
    grade = {
        "part1": {"correct": 0, "wrong": 0, "blank": 0, "score": 0.0},
        "part2": {"correct": 0, "partial": 0, "wrong": 0, "score": 0.0},
        "part3": {"correct": 0, "wrong": 0, "blank": 0, "score": 0.0},
        "total": 0.0,
    }

    # Part 1: 0.25đ/câu
    ak1 = answer_key.get("part1", {})
    for q, ans in answers.get("part1", {}).items():
        correct = ak1.get(str(q)) or ak1.get(q)
        if correct is None:
            continue
        if ans is None:
            grade["part1"]["blank"] += 1
        elif ans == correct:
            grade["part1"]["correct"] += 1
            grade["part1"]["score"] += 0.25
        else:
            grade["part1"]["wrong"] += 1

    # Part 2: 0.1/0.25/0.5/1.0 theo số đúng
    ak2 = answer_key.get("part2", {})
    for q, subs in answers.get("part2", {}).items():
        csubs = ak2.get(str(q), {})
        if not csubs:
            continue
        n = sum(1 for s, v in subs.items() if csubs.get(s) is not None and v == csubs[s])
        score = {0: 0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0}.get(n, 0)
        grade["part2"]["score"] += score
        if n == 4:
            grade["part2"]["correct"] += 1
        elif n > 0:
            grade["part2"]["partial"] += 1
        else:
            grade["part2"]["wrong"] += 1

    # Part 3: 0.25đ/câu
    ak3 = answer_key.get("part3", {})
    for q, ans in answers.get("part3", {}).items():
        correct = ak3.get(str(q)) or ak3.get(q)
        if correct is None:
            continue
        if not ans:
            grade["part3"]["blank"] += 1
        elif ans.strip() == str(correct).strip():
            grade["part3"]["correct"] += 1
            grade["part3"]["score"] += 0.25
        else:
            grade["part3"]["wrong"] += 1

    grade["total"] = round(sum(grade[p]["score"] for p in ["part1", "part2", "part3"]), 2)
    for p in ["part1", "part2", "part3"]:
        grade[p]["score"] = round(grade[p]["score"], 2)

    return grade
