"""
=============================================================================
BUBBLE DETECTOR - Phát hiện và đọc bubble trên phiếu đã flatten
=============================================================================
Hoạt động trên ảnh đã được perspective-transform (flatten) theo kích thước
chuẩn STD_WIDTH x STD_HEIGHT.

Thuật toán:
1. Tính tọa độ pixel chính xác từ tỷ lệ config
2. Lấy mẫu vùng tròn tại mỗi vị trí bubble
3. So sánh brightness trung bình → xác định bubble được tô
4. Áp dụng adaptive threshold cục bộ cho từng vùng

Output: Dict chứa kết quả đọc của tất cả các phần (I, II, III, SBD, Mã đề)
=============================================================================
"""

import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from exam_sheet_config import (
    STD_WIDTH, STD_HEIGHT,
    PART1, PART2, PART3, SBD, EXAM_CODE,
    BUBBLE_DETECTION
)


class BubbleResult:
    """Kết quả đọc một bubble."""
    def __init__(self, x: int, y: int, radius: int, mean_val: float,
                 is_filled: bool, label: str = ""):
        self.x = x
        self.y = y
        self.radius = radius
        self.mean_val = mean_val
        self.is_filled = is_filled
        self.label = label


def _region_mean_circle(gray: np.ndarray, cx: int, cy: int, r: int) -> float:
    """Tính giá trị trung bình trong vùng tròn bán kính r."""
    h, w = gray.shape[:2]
    # Tạo mask tròn
    y_min = max(0, cy - r)
    y_max = min(h, cy + r + 1)
    x_min = max(0, cx - r)
    x_max = min(w, cx + r + 1)

    if y_min >= y_max or x_min >= x_max:
        return 255.0

    region = gray[y_min:y_max, x_min:x_max]

    # Tạo circular mask
    yy, xx = np.ogrid[y_min - cy:y_max - cy, x_min - cx:x_max - cx]
    mask = (xx * xx + yy * yy) <= r * r

    if mask.sum() == 0:
        return 255.0

    return float(region[mask].mean())


def _enhanced_region_mean(gray: np.ndarray, cx: int, cy: int, r: int) -> float:
    """
    Tính mean với trọng số Gaussian (center-weighted).
    Bubble tô đậm nhất ở giữa → center-weighted chính xác hơn.
    """
    h, w = gray.shape[:2]
    y_min = max(0, cy - r)
    y_max = min(h, cy + r + 1)
    x_min = max(0, cx - r)
    x_max = min(w, cx + r + 1)

    if y_min >= y_max or x_min >= x_max:
        return 255.0

    region = gray[y_min:y_max, x_min:x_max].astype(np.float64)

    yy, xx = np.ogrid[y_min - cy:y_max - cy, x_min - cx:x_max - cx]
    dist_sq = (xx * xx + yy * yy).astype(np.float64)
    r_sq = float(r * r)

    # Mask tròn
    mask = dist_sq <= r_sq

    # Trọng số Gaussian: center = 1.0, edge = ~0.3
    sigma_sq = r_sq * 0.5
    weights = np.exp(-dist_sq / (2 * sigma_sq))
    weights[~mask] = 0

    total_w = weights.sum()
    if total_w < 1e-6:
        return 255.0

    return float((region * weights).sum() / total_w)


def _local_adaptive_threshold(values: List[float], base_threshold: float,
                               min_gap: float = 8.0) -> int:
    """
    Chọn bubble tối nhất trong danh sách, với adaptive threshold cục bộ.
    Uses a multi-criteria approach to detect light pencil marks:
    1. Traditional threshold check
    2. Relative darkness within the question (gap-based)
    3. Statistical z-score against the question's own distribution

    Returns: index của bubble được chọn, hoặc -1 nếu không có.
    """
    if not values:
        return -1

    indexed = sorted(enumerate(values), key=lambda x: x[1])

    darkest_idx, darkest_val = indexed[0]
    second_val = indexed[1][1] if len(indexed) > 1 else 255.0
    gap = second_val - darkest_val

    # Method 1: Traditional absolute threshold
    local_threshold = min(base_threshold, np.mean(values) * 0.92)
    if darkest_val < local_threshold and gap >= min_gap:
        return darkest_idx

    # Method 2: Relative gap detection for light pencil marks
    # If the darkest bubble is significantly darker than the others,
    # it's likely filled even if above absolute threshold
    mean_others = np.mean([v for i, v in enumerate(values) if i != darkest_idx])
    relative_gap = mean_others - darkest_val

    # For light pencil: gap > 8 pixels AND darkest is at least 3% darker than average
    if relative_gap >= 8.0 and darkest_val < mean_others * 0.97:
        return darkest_idx

    # Method 3: Z-score within question — if one bubble is a clear outlier
    if len(values) >= 3:
        std = np.std(values)
        if std > 2.0:  # avoid division by near-zero
            z_score = (np.mean(values) - darkest_val) / std
            if z_score > 1.8 and gap >= 4.0:
                return darkest_idx

    return -1


def _detect_multiple_filled(values: List[float], threshold: float) -> List[int]:
    """Phát hiện nhiều bubble được tô (cho Phần II - Đúng/Sai)."""
    filled = []
    for i, v in enumerate(values):
        if v < threshold:
            filled.append(i)
    return filled


# ===========================================================================
# PHẦN I: 40 Câu trắc nghiệm A/B/C/D
# ===========================================================================
def read_part1(gray: np.ndarray, info: Dict = None) -> Dict[int, Optional[str]]:
    """
    Đọc Phần I: 40 câu trắc nghiệm.
    Returns: {1: "A", 2: "C", 3: None, ...}
    """
    h, w = gray.shape[:2]
    results = {}
    bubble_details = []

    r = max(6, int(PART1["bubble_radius_frac"] * w))
    rows = PART1["rows"]
    y_step = (PART1["y_end"] - PART1["y_start"]) / max(1, rows - 1)

    # Tính brightness trung bình toàn vùng Phần I
    y1 = int(PART1["y_start"] * h)
    y2 = int(PART1["y_end"] * h)
    region = gray[max(0, y1):min(h, y2), :]
    base_brightness = float(region.mean()) if region.size > 0 else 200.0
    threshold = base_brightness * BUBBLE_DETECTION["dark_threshold_ratio"]

    options = ["A", "B", "C", "D"]

    for group in PART1["groups"]:
        q_start = group["q_start"]
        x_positions = [int(group[opt] * w) for opt in options]

        for row_idx in range(rows):
            q = q_start + row_idx
            y = int((PART1["y_start"] + row_idx * y_step) * h)

            means = [_enhanced_region_mean(gray, x, y, r) for x in x_positions]
            chosen = _local_adaptive_threshold(means, threshold, BUBBLE_DETECTION["min_gap"])

            results[q] = options[chosen] if chosen >= 0 else None

            # Lưu chi tiết để visualization
            for i, (x, mean_val) in enumerate(zip(x_positions, means)):
                bubble_details.append({
                    "question": q,
                    "option": options[i],
                    "x": x, "y": y, "r": r,
                    "mean": round(mean_val, 1),
                    "filled": (i == chosen),
                })

    return results, bubble_details


# ===========================================================================
# PHẦN II: 8 Câu Đúng/Sai
# ===========================================================================
def read_part2(gray: np.ndarray) -> Tuple[Dict[int, Dict[str, Optional[bool]]], List]:
    """
    Đọc Phần II: 8 câu Đúng/Sai.
    Returns: {1: {"a": True, "b": False, "c": None, "d": True}, ...}
    """
    h, w = gray.shape[:2]
    results = {}
    bubble_details = []

    r = max(5, int(PART2["bubble_radius_frac"] * w))
    sub_count = PART2["sub_count"]
    y_step = (PART2["y_end"] - PART2["y_start"]) / max(1, sub_count - 1)
    sub_labels = ["a", "b", "c", "d"]

    # Brightness vùng Phần II
    y1 = int(PART2["y_start"] * h)
    y2 = int(PART2["y_end"] * h)
    region = gray[max(0, y1):min(h, y2), :]
    base_brightness = float(region.mean()) if region.size > 0 else 200.0
    threshold = base_brightness * BUBBLE_DETECTION["dark_threshold_ratio"]

    for q_info in PART2["questions"]:
        q = q_info["q"]
        x_dung = int(q_info["dung"] * w)
        x_sai = int(q_info["sai"] * w)
        results[q] = {}

        for si in range(sub_count):
            y = int((PART2["y_start"] + si * y_step) * h)

            mean_dung = _enhanced_region_mean(gray, x_dung, y, r)
            mean_sai = _enhanced_region_mean(gray, x_sai, y, r)

            min_val = min(mean_dung, mean_sai)
            diff = abs(mean_dung - mean_sai)
            local_threshold = min(threshold, (mean_dung + mean_sai) / 2 * 0.88)

            if min_val < local_threshold and diff > 6:
                results[q][sub_labels[si]] = mean_dung < mean_sai  # True = Đúng
            else:
                results[q][sub_labels[si]] = None

            bubble_details.append({
                "question": q,
                "sub": sub_labels[si],
                "x_dung": x_dung, "x_sai": x_sai, "y": y, "r": r,
                "mean_dung": round(mean_dung, 1),
                "mean_sai": round(mean_sai, 1),
                "answer": results[q][sub_labels[si]],
            })

    return results, bubble_details


# ===========================================================================
# PHẦN III: 6 Câu điền số
# ===========================================================================
def read_part3(gray: np.ndarray) -> Tuple[Dict[int, str], List]:
    """
    Đọc Phần III: 6 câu điền số.
    Mỗi câu có 5 cột, mỗi cột 12 hàng: -, dấu phẩy, 0-9
    Returns: {1: "-3,25", 2: "17", ...}
    """
    h, w = gray.shape[:2]
    results = {}
    bubble_details = []

    r = max(4, int(PART3["bubble_radius_frac"] * w))
    rows = PART3["rows"]
    row_labels = PART3["row_labels"]
    y_step = (PART3["y_end"] - PART3["y_start"]) / max(1, rows - 1)

    # Brightness vùng Phần III
    y1 = int(PART3["y_start"] * h)
    y2 = int(PART3["y_end"] * h)
    region = gray[max(0, y1):min(h, y2), :]
    base_brightness = float(region.mean()) if region.size > 0 else 200.0
    threshold = base_brightness * BUBBLE_DETECTION["dark_threshold_ratio"]

    for q_info in PART3["questions"]:
        q = q_info["q"]
        answer_str = ""

        for col_idx, x_frac in enumerate(q_info["cols"]):
            x = int(x_frac * w)
            y_positions = [int((PART3["y_start"] + ri * y_step) * h) for ri in range(rows)]

            means = [_enhanced_region_mean(gray, x, y, r) for y in y_positions]
            chosen = _local_adaptive_threshold(means, threshold, BUBBLE_DETECTION["min_gap"])

            if chosen >= 0:
                answer_str += row_labels[chosen]

            for ri, (y, mean_val) in enumerate(zip(y_positions, means)):
                bubble_details.append({
                    "question": q,
                    "col": col_idx,
                    "row_label": row_labels[ri],
                    "x": x, "y": y, "r": r,
                    "mean": round(mean_val, 1),
                    "filled": (ri == chosen),
                })

        results[q] = answer_str

    return results, bubble_details


# ===========================================================================
# SỐ BÁO DANH
# ===========================================================================
def read_sbd(gray: np.ndarray) -> Tuple[str, List]:
    """Đọc Số Báo Danh (6 chữ số)."""
    h, w = gray.shape[:2]
    result = ""
    bubble_details = []

    cols = SBD["cols"]
    digits = SBD["digits"]
    r = max(5, int(0.007 * w))

    x_step = (SBD["x_end"] - SBD["x_start"]) / max(1, cols - 1)
    y_step = (SBD["y_end"] - SBD["y_start"]) / max(1, digits - 1)

    # Brightness vùng SBD
    x1 = int(SBD["x_start"] * w)
    x2 = int(SBD["x_end"] * w)
    y1 = int(SBD["y_start"] * h)
    y2 = int(SBD["y_end"] * h)
    region = gray[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
    base_brightness = float(region.mean()) if region.size > 0 else 200.0
    threshold = base_brightness * 0.68

    for col in range(cols):
        x = int((SBD["x_start"] + col * x_step) * w)
        y_positions = [int((SBD["y_start"] + d * y_step) * h) for d in range(digits)]

        means = [_enhanced_region_mean(gray, x, y, r) for y in y_positions]
        chosen = _local_adaptive_threshold(means, threshold, 6)

        if chosen >= 0:
            result += str(chosen)

        for di, (y, mean_val) in enumerate(zip(y_positions, means)):
            bubble_details.append({
                "field": "sbd",
                "col": col, "digit": di,
                "x": x, "y": y, "r": r,
                "mean": round(mean_val, 1),
                "filled": (di == chosen),
            })

    return result, bubble_details


# ===========================================================================
# MÃ ĐỀ THI
# ===========================================================================
def read_exam_code(gray: np.ndarray) -> Tuple[str, List]:
    """Đọc Mã đề thi (3 chữ số)."""
    h, w = gray.shape[:2]
    result = ""
    bubble_details = []

    cols = EXAM_CODE["cols"]
    digits = EXAM_CODE["digits"]
    r = max(5, int(0.007 * w))

    x_step = (EXAM_CODE["x_end"] - EXAM_CODE["x_start"]) / max(1, cols - 1)
    y_step = (EXAM_CODE["y_end"] - EXAM_CODE["y_start"]) / max(1, digits - 1)

    x1 = int(EXAM_CODE["x_start"] * w)
    x2 = int(EXAM_CODE["x_end"] * w)
    y1 = int(EXAM_CODE["y_start"] * h)
    y2 = int(EXAM_CODE["y_end"] * h)
    region = gray[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
    base_brightness = float(region.mean()) if region.size > 0 else 200.0
    threshold = base_brightness * 0.68

    for col in range(cols):
        x = int((EXAM_CODE["x_start"] + col * x_step) * w)
        y_positions = [int((EXAM_CODE["y_start"] + d * y_step) * h) for d in range(digits)]

        means = [_enhanced_region_mean(gray, x, y, r) for y in y_positions]
        chosen = _local_adaptive_threshold(means, threshold, 6)

        if chosen >= 0:
            result += str(chosen)

        for di, (y, mean_val) in enumerate(zip(y_positions, means)):
            bubble_details.append({
                "field": "exam_code",
                "col": col, "digit": di,
                "x": x, "y": y, "r": r,
                "mean": round(mean_val, 1),
                "filled": (di == chosen),
            })

    return result, bubble_details


# ===========================================================================
# PIPELINE ĐỌC TOÀN BỘ PHIẾU
# ===========================================================================
def read_all_bubbles(flattened_image: np.ndarray) -> Dict[str, Any]:
    """
    Đọc toàn bộ bubble trên phiếu đã flatten.

    Args:
        flattened_image: Ảnh đã được perspective-transform (BGR hoặc grayscale)

    Returns:
        Dict chứa:
        - part1: {1: "A", 2: "B", ...}
        - part2: {1: {"a": True, ...}, ...}
        - part3: {1: "-3,25", ...}
        - sbd: "123456"
        - exam_code: "132"
        - bubble_map: Chi tiết vị trí + giá trị tất cả bubble
        - confidence: Thống kê tin cậy
    """
    if len(flattened_image.shape) == 3:
        gray = cv2.cvtColor(flattened_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = flattened_image.copy()

    # Cải thiện contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Đọc từng phần
    part1, p1_details = read_part1(gray)
    part2, p2_details = read_part2(gray)
    part3, p3_details = read_part3(gray)
    sbd, sbd_details = read_sbd(gray)
    exam_code, ec_details = read_exam_code(gray)

    # Thống kê confidence
    p1_filled = sum(1 for v in part1.values() if v is not None)
    p2_filled = sum(1 for q in part2.values()
                    for v in q.values() if v is not None)
    p3_filled = sum(1 for v in part3.values() if v)

    confidence = {
        "part1": round(p1_filled / 40 * 100, 1),
        "part2": round(p2_filled / 32 * 100, 1),
        "part3": round(p3_filled / 6 * 100, 1),
        "sbd": len(sbd),
        "exam_code": len(exam_code),
        "overall": round(
            (p1_filled / 40 * 40 +
             len(exam_code) / 3 * 30 +
             len(sbd) / 6 * 20 +
             p3_filled / 6 * 10), 1
        ),
    }

    return {
        "part1": part1,
        "part2": part2,
        "part3": part3,
        "sbd": sbd,
        "exam_code": exam_code,
        "bubble_map": {
            "part1": p1_details,
            "part2": p2_details,
            "part3": p3_details,
            "sbd": sbd_details,
            "exam_code": ec_details,
        },
        "confidence": confidence,
    }
