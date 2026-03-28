"""
=============================================================================
TEMPLATE GENERATOR - Tạo ảnh template số chuẩn từ config
=============================================================================
Mục đích:
1. Tạo ảnh template reference pixel-perfect
2. Tạo marker patches để dùng cho template matching
3. Xuất marker map cho alignment

Ảnh template này là "ground truth" - bài làm thực tế sẽ được
warp về khớp với template này.
=============================================================================
"""

import cv2
import numpy as np
import os
import json
from typing import Dict, Tuple, List

from template_config import (
    STD_W, STD_H, TEMPLATE_MARKERS, MARKER_SIZE_PX,
    PART1_LAYOUT, PART2_LAYOUT, PART3_LAYOUT,
    SBD_LAYOUT, EXAM_CODE_LAYOUT,
    CORNER_MARKER_NAMES, MARKER_GROUPS
)


def generate_reference_template(
    draw_bubbles: bool = True,
    draw_labels: bool = True,
    draw_grid: bool = False
) -> np.ndarray:
    """
    Tạo ảnh template chuẩn giống mẫu phiếu gốc.
    Nền trắng/hồng nhạt, marker đen, bubble rỗng.
    """
    W, H = STD_W, STD_H
    # Nền trắng
    img = np.ones((H, W, 3), dtype=np.uint8) * 250

    # ── Vẽ vùng nền hồng nhạt cho các phần ──
    pink = (235, 218, 245)  # BGR: hồng nhạt
    # Phần I
    _fill_rect(img, 0.015, 0.305, 0.985, 0.575, pink)
    # Phần II
    _fill_rect(img, 0.015, 0.580, 0.985, 0.705, pink)
    # Phần III
    _fill_rect(img, 0.015, 0.710, 0.985, 0.985, pink)
    # SBD
    _fill_rect(img, 0.640, 0.010, 0.830, 0.210, (240, 225, 245))
    # Mã đề
    _fill_rect(img, 0.855, 0.010, 0.980, 0.210, (240, 225, 245))

    # ── Vẽ 22 MARKER ĐEN ──
    half = MARKER_SIZE_PX // 2
    for name, (fx, fy) in TEMPLATE_MARKERS.items():
        x = int(fx * W)
        y = int(fy * H)
        cv2.rectangle(img, (x - half, y - half), (x + half, y + half), (0, 0, 0), -1)

    # ── Vẽ bubble PHẦN I ──
    if draw_bubbles:
        _draw_part1_bubbles(img)
        _draw_part2_bubbles(img)
        _draw_part3_bubbles(img)
        _draw_sbd_bubbles(img)
        _draw_exam_code_bubbles(img)

    # ── Vẽ labels ──
    if draw_labels:
        _draw_labels(img)

    # ── Grid lines (debug) ──
    if draw_grid:
        _draw_debug_grid(img)

    return img


def generate_marker_patches() -> Dict[str, np.ndarray]:
    """
    Tạo các patch ảnh nhỏ của marker đen để dùng cho template matching.
    Trả về dict: {marker_name: patch_image}
    """
    patches = {}
    pad = 8  # Padding xung quanh marker
    patch_size = MARKER_SIZE_PX + 2 * pad

    for name in TEMPLATE_MARKERS:
        # Tạo patch: nền trắng + marker đen ở giữa
        patch = np.ones((patch_size, patch_size), dtype=np.uint8) * 240
        half = MARKER_SIZE_PX // 2
        cx = patch_size // 2
        cy = patch_size // 2
        cv2.rectangle(patch,
                      (cx - half, cy - half),
                      (cx + half, cy + half),
                      0, -1)
        patches[name] = patch

    return patches


def generate_composite_marker_patch() -> np.ndarray:
    """
    Tạo một patch marker đen tiêu biểu (dùng chung cho tất cả vị trí).
    """
    pad = 10
    size = MARKER_SIZE_PX + 2 * pad
    patch = np.ones((size, size), dtype=np.uint8) * 235
    half = MARKER_SIZE_PX // 2
    cx = size // 2
    cv2.rectangle(patch, (cx - half, cx - half), (cx + half, cx + half), 10, -1)
    return patch


def get_marker_pixel_positions() -> Dict[str, Tuple[int, int]]:
    """
    Trả về vị trí pixel chính xác của mỗi marker trên ảnh chuẩn.
    """
    return {
        name: (int(fx * STD_W), int(fy * STD_H))
        for name, (fx, fy) in TEMPLATE_MARKERS.items()
    }


def get_corner_pixel_positions() -> List[Tuple[int, int]]:
    """
    Trả về 4 vị trí marker góc (TL, TR, BR, BL) theo pixels.
    """
    positions = get_marker_pixel_positions()
    return [positions[name] for name in CORNER_MARKER_NAMES]


def save_template_assets(output_dir: str):
    """
    Lưu tất cả assets cần thiết:
    - template.png: Ảnh template chuẩn
    - template_markers_only.png: Chỉ có marker (nền trắng)
    - marker_patch.png: Patch marker tiêu biểu
    - marker_positions.json: Tọa độ tất cả marker
    - bubble_positions.json: Tọa độ tất cả bubble
    """
    os.makedirs(output_dir, exist_ok=True)

    # 1. Template đầy đủ
    template = generate_reference_template(draw_bubbles=True, draw_labels=True)
    cv2.imwrite(os.path.join(output_dir, "template.png"), template)

    # 2. Template chỉ có marker
    markers_only = generate_reference_template(draw_bubbles=False, draw_labels=False)
    cv2.imwrite(os.path.join(output_dir, "template_markers_only.png"), markers_only)

    # 3. Marker patch
    patch = generate_composite_marker_patch()
    cv2.imwrite(os.path.join(output_dir, "marker_patch.png"), patch)

    # 4. Marker positions
    marker_px = get_marker_pixel_positions()
    marker_data = {
        "std_size": {"w": STD_W, "h": STD_H},
        "markers_frac": {k: {"x": v[0], "y": v[1]} for k, v in TEMPLATE_MARKERS.items()},
        "markers_px": {k: {"x": v[0], "y": v[1]} for k, v in marker_px.items()},
        "corner_names": CORNER_MARKER_NAMES,
        "groups": MARKER_GROUPS,
    }
    with open(os.path.join(output_dir, "marker_positions.json"), "w") as f:
        json.dump(marker_data, f, indent=2)

    # 5. Bubble positions
    bubble_data = _compute_all_bubble_positions()
    with open(os.path.join(output_dir, "bubble_positions.json"), "w") as f:
        json.dump(bubble_data, f, indent=2, ensure_ascii=False)

    print(f"✓ Template assets saved to: {output_dir}")
    return template


# ─────────────── Internal helpers ───────────────

def _fill_rect(img, x1f, y1f, x2f, y2f, color):
    H, W = img.shape[:2]
    cv2.rectangle(img,
                  (int(x1f * W), int(y1f * H)),
                  (int(x2f * W), int(y2f * H)),
                  color, -1)


def _draw_part1_bubbles(img):
    H, W = img.shape[:2]
    cfg = PART1_LAYOUT
    r = max(5, int(cfg["bubble_r"] * W))
    rows = cfg["rows"]
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, rows - 1)

    for group in cfg["groups"]:
        for opt in ["A", "B", "C", "D"]:
            x = int(group[opt] * W)
            for ri in range(rows):
                y = int((cfg["y_first"] + ri * y_step) * H)
                cv2.circle(img, (x, y), r, (160, 130, 180), 1)


def _draw_part2_bubbles(img):
    H, W = img.shape[:2]
    cfg = PART2_LAYOUT
    r = max(4, int(cfg["bubble_r"] * W))
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["sub_count"] - 1)

    for q in cfg["questions"]:
        for si in range(cfg["sub_count"]):
            y = int((cfg["y_first"] + si * y_step) * H)
            x_d = int(q["dung"] * W)
            x_s = int(q["sai"] * W)
            cv2.circle(img, (x_d, y), r, (160, 130, 180), 1)
            cv2.circle(img, (x_s, y), r, (160, 130, 180), 1)


def _draw_part3_bubbles(img):
    H, W = img.shape[:2]
    cfg = PART3_LAYOUT
    r = max(3, int(cfg["bubble_r"] * W))
    rows = cfg["rows"]
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, rows - 1)

    for q in cfg["questions"]:
        for col_x in q["cols"]:
            x = int(col_x * W)
            for ri in range(rows):
                y = int((cfg["y_first"] + ri * y_step) * H)
                cv2.circle(img, (x, y), r, (160, 130, 180), 1)


def _draw_sbd_bubbles(img):
    H, W = img.shape[:2]
    cfg = SBD_LAYOUT
    r = max(4, int(cfg["bubble_r"] * W))
    x_step = (cfg["x_last"] - cfg["x_first"]) / max(1, cfg["cols"] - 1)
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["rows"] - 1)

    for col in range(cfg["cols"]):
        x = int((cfg["x_first"] + col * x_step) * W)
        for row in range(cfg["rows"]):
            y = int((cfg["y_first"] + row * y_step) * H)
            cv2.circle(img, (x, y), r, (160, 130, 180), 1)


def _draw_exam_code_bubbles(img):
    H, W = img.shape[:2]
    cfg = EXAM_CODE_LAYOUT
    r = max(4, int(cfg["bubble_r"] * W))
    x_step = (cfg["x_last"] - cfg["x_first"]) / max(1, cfg["cols"] - 1)
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["rows"] - 1)

    for col in range(cfg["cols"]):
        x = int((cfg["x_first"] + col * x_step) * W)
        for row in range(cfg["rows"]):
            y = int((cfg["y_first"] + row * y_step) * H)
            cv2.circle(img, (x, y), r, (160, 130, 180), 1)


def _draw_labels(img):
    H, W = img.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX

    # Tiêu đề
    cv2.putText(img, "PHIEU TRA LOI TRAC NGHIEM",
                (int(0.15 * W), int(0.020 * H)),
                font, 0.7, (0, 0, 0), 2)

    # Phần I
    cv2.putText(img, "PHAN I",
                (int(0.022 * W), int(0.300 * H)),
                font, 0.45, (0, 0, 0), 1)

    # Phần II
    cv2.putText(img, "PHAN II",
                (int(0.022 * W), int(0.585 * H)),
                font, 0.45, (0, 0, 0), 1)

    # Phần III
    cv2.putText(img, "PHAN III",
                (int(0.022 * W), int(0.715 * H)),
                font, 0.45, (0, 0, 0), 1)


def _draw_debug_grid(img):
    H, W = img.shape[:2]
    # Grid lines mỗi 10%
    for i in range(1, 10):
        x = int(i * 0.1 * W)
        y = int(i * 0.1 * H)
        cv2.line(img, (x, 0), (x, H), (200, 200, 200), 1)
        cv2.line(img, (0, y), (W, y), (200, 200, 200), 1)
        cv2.putText(img, f"{i*10}%", (x + 2, 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (150, 150, 150), 1)
        cv2.putText(img, f"{i*10}%", (2, y - 3),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (150, 150, 150), 1)


def _compute_all_bubble_positions() -> dict:
    """Tính tọa độ pixel chính xác cho tất cả bubble."""
    W, H = STD_W, STD_H
    result = {"part1": {}, "part2": {}, "part3": {}, "sbd": {}, "exam_code": {}}

    # Part 1
    cfg = PART1_LAYOUT
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["rows"] - 1)
    for group in cfg["groups"]:
        for ri in range(cfg["rows"]):
            q = group["q0"] + ri
            y = int((cfg["y_first"] + ri * y_step) * H)
            result["part1"][str(q)] = {
                opt: {"x": int(group[opt] * W), "y": y}
                for opt in ["A", "B", "C", "D"]
            }

    # Part 2
    cfg = PART2_LAYOUT
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["sub_count"] - 1)
    for qinfo in cfg["questions"]:
        q = qinfo["q"]
        result["part2"][str(q)] = {}
        for si, sub in enumerate(cfg["sub_labels"]):
            y = int((cfg["y_first"] + si * y_step) * H)
            result["part2"][str(q)][sub] = {
                "dung": {"x": int(qinfo["dung"] * W), "y": y},
                "sai": {"x": int(qinfo["sai"] * W), "y": y},
            }

    # Part 3
    cfg = PART3_LAYOUT
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["rows"] - 1)
    for qinfo in cfg["questions"]:
        q = qinfo["q"]
        result["part3"][str(q)] = {}
        for ci, col_x in enumerate(qinfo["cols"]):
            x = int(col_x * W)
            col_data = {}
            for ri, label in enumerate(cfg["row_labels"]):
                y = int((cfg["y_first"] + ri * y_step) * H)
                col_data[label] = {"x": x, "y": y}
            result["part3"][str(q)][f"col{ci}"] = col_data

    # SBD
    cfg = SBD_LAYOUT
    x_step = (cfg["x_last"] - cfg["x_first"]) / max(1, cfg["cols"] - 1)
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["rows"] - 1)
    for col in range(cfg["cols"]):
        x = int((cfg["x_first"] + col * x_step) * W)
        for row in range(cfg["rows"]):
            y = int((cfg["y_first"] + row * y_step) * H)
            result["sbd"][f"c{col}_d{row}"] = {"x": x, "y": y}

    # Exam code
    cfg = EXAM_CODE_LAYOUT
    x_step = (cfg["x_last"] - cfg["x_first"]) / max(1, cfg["cols"] - 1)
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, cfg["rows"] - 1)
    for col in range(cfg["cols"]):
        x = int((cfg["x_first"] + col * x_step) * W)
        for row in range(cfg["rows"]):
            y = int((cfg["y_first"] + row * y_step) * H)
            result["exam_code"][f"c{col}_d{row}"] = {"x": x, "y": y}

    return result


if __name__ == "__main__":
    output_dir = os.path.join(os.path.dirname(__file__), "template_assets")
    template = save_template_assets(output_dir)
    print(f"Template size: {template.shape[1]}x{template.shape[0]}")

    # Cũng lưu template có grid debug
    debug = generate_reference_template(draw_bubbles=True, draw_labels=True, draw_grid=True)
    cv2.imwrite(os.path.join(output_dir, "template_debug_grid.png"), debug)
    print("✓ Debug grid template saved")
