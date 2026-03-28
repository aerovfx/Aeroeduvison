#!/usr/bin/env python3
"""
=============================================================================
TEST SCRIPT - Kiểm tra toàn bộ pipeline OMR
=============================================================================
Có thể chạy:
  python test_omr.py                    # Test với ảnh mẫu tự tạo
  python test_omr.py /path/to/image.jpg  # Test với ảnh thật
=============================================================================
"""

import sys
import os
import json
import time
import numpy as np
import cv2

# Thêm thư mục hiện tại vào path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from exam_sheet_config import (
    STD_WIDTH, STD_HEIGHT, MARKERS,
    PART1, PART2, PART3, SBD, EXAM_CODE
)
from marker_detector import detect_and_flatten
from bubble_detector import read_all_bubbles
from visualizer import draw_bubble_overlay, draw_markers_debug


def generate_test_sheet() -> np.ndarray:
    """Tạo ảnh phiếu thi mẫu để test."""
    W, H = STD_WIDTH, STD_HEIGHT
    img = np.ones((H, W, 3), dtype=np.uint8) * 245  # Nền trắng nhẹ

    # Vẽ các marker đen vuông
    marker_size = 16
    for name, (fx, fy) in MARKERS.items():
        x = int(fx * W)
        y = int(fy * H)
        half = marker_size // 2
        cv2.rectangle(img,
                      (x - half, y - half),
                      (x + half, y + half),
                      (0, 0, 0), -1)

    # Vẽ bubble Phần I (vòng tròn rỗng)
    r = int(PART1["bubble_radius_frac"] * W)
    rows = PART1["rows"]
    y_step = (PART1["y_end"] - PART1["y_start"]) / max(1, rows - 1)

    for group in PART1["groups"]:
        for opt in ["A", "B", "C", "D"]:
            x = int(group[opt] * W)
            for ri in range(rows):
                y = int((PART1["y_start"] + ri * y_step) * H)
                cv2.circle(img, (x, y), r, (200, 150, 150), 1)

    # Tô một số bubble mẫu (giả lập bài làm)
    test_answers = {1: "A", 2: "B", 5: "C", 10: "D", 15: "A", 25: "B", 35: "C"}
    for q, ans in test_answers.items():
        group_idx = (q - 1) // 10
        row = (q - 1) % 10
        if group_idx < len(PART1["groups"]):
            group = PART1["groups"][group_idx]
            x = int(group[ans] * W)
            y = int((PART1["y_start"] + row * y_step) * H)
            cv2.circle(img, (x, y), r, (40, 40, 40), -1)  # Tô đen

    # Vẽ bubble SBD (mẫu: 123456)
    sbd_cols = SBD["cols"]
    sbd_digits = SBD["digits"]
    sbd_x_step = (SBD["x_end"] - SBD["x_start"]) / max(1, sbd_cols - 1)
    sbd_y_step = (SBD["y_end"] - SBD["y_start"]) / max(1, sbd_digits - 1)
    sbd_r = int(0.007 * W)

    test_sbd = "123456"
    for col in range(sbd_cols):
        x = int((SBD["x_start"] + col * sbd_x_step) * W)
        for d in range(sbd_digits):
            y = int((SBD["y_start"] + d * sbd_y_step) * H)
            cv2.circle(img, (x, y), sbd_r, (200, 150, 150), 1)
            # Tô bubble đáp án
            if col < len(test_sbd) and d == int(test_sbd[col]):
                cv2.circle(img, (x, y), sbd_r, (40, 40, 40), -1)

    # Vẽ text tiêu đề
    cv2.putText(img, "PHIEU TRA LOI TRAC NGHIEM", (W // 4, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img, "PHAN I", (20, int(PART1["y_start"] * H) - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(img, "PHAN II", (20, int(PART2["y_start"] * H) - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(img, "PHAN III", (20, int(PART3["y_start"] * H) - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

    return img


def simulate_perspective_distortion(img: np.ndarray, intensity: float = 0.08) -> np.ndarray:
    """Giả lập ảnh bị nghiêng/méo (để test flatten)."""
    h, w = img.shape[:2]

    # Thêm background
    bg = np.ones((h + 200, w + 200, 3), dtype=np.uint8) * 160
    bg[100:100 + h, 100:100 + w] = img

    # Tọa độ gốc (4 góc ảnh)
    src = np.array([
        [100, 100],
        [100 + w, 100],
        [100 + w, 100 + h],
        [100, 100 + h],
    ], dtype=np.float32)

    # Tọa độ biến dạng
    dx = w * intensity
    dy = h * intensity
    dst = np.array([
        [100 + dx * 0.5, 100 + dy],
        [100 + w - dx, 100 + dy * 0.3],
        [100 + w - dx * 0.3, 100 + h - dy * 0.5],
        [100 + dx, 100 + h],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(src, dst)
    distorted = cv2.warpPerspective(bg, M, (w + 200, h + 200))

    return distorted


def test_pipeline(image_path: str = None):
    """Chạy test toàn bộ pipeline."""
    print("=" * 60)
    print("TEST OMR PIPELINE - Hệ thống chấm thi trắc nghiệm")
    print("=" * 60)

    # Bước 0: Tạo hoặc đọc ảnh test
    if image_path and os.path.exists(image_path):
        print(f"\n[1/5] Đọc ảnh từ: {image_path}")
        original = cv2.imread(image_path)
        if original is None:
            print(f"  ❌ Không thể đọc file: {image_path}")
            return
    else:
        print("\n[1/5] Tạo ảnh phiếu thi mẫu...")
        clean_sheet = generate_test_sheet()
        print(f"  ✓ Phiếu mẫu: {clean_sheet.shape[1]}x{clean_sheet.shape[0]}")

        print("\n[2/5] Giả lập biến dạng perspective...")
        original = simulate_perspective_distortion(clean_sheet, intensity=0.07)
        print(f"  ✓ Ảnh biến dạng: {original.shape[1]}x{original.shape[0]}")

    # Bước 1: Flatten
    print("\n[3/5] Phát hiện marker + Perspective Transform (Flatten)...")
    t0 = time.time()
    flattened, flatten_info = detect_and_flatten(image_np=original, debug=True)
    t_flatten = time.time() - t0

    print(f"  ✓ Method: {flatten_info['method']}")
    print(f"  ✓ Markers tìm thấy: {flatten_info['markers_found']}")
    print(f"  ✓ Corners detected: {flatten_info['corners_detected']}")
    print(f"  ✓ Section markers matched: {flatten_info.get('section_markers_matched', 0)}")
    print(f"  ✓ Kết quả: {flattened.shape[1]}x{flattened.shape[0]}")
    print(f"  ⏱ Thời gian: {t_flatten * 1000:.1f}ms")

    if flatten_info.get("avg_offset_x") is not None:
        print(f"  ✓ Avg offset: x={flatten_info['avg_offset_x']:.1f}px, y={flatten_info['avg_offset_y']:.1f}px")
        print(f"  ✓ Max offset: {flatten_info.get('max_offset', 0):.1f}px")

    # Bước 2: Đọc bubble
    print("\n[4/5] Đọc bubble (tất cả các phần)...")
    t0 = time.time()
    results = read_all_bubbles(flattened)
    t_read = time.time() - t0

    print(f"  ✓ SBD: {results['sbd']}")
    print(f"  ✓ Mã đề: {results['exam_code']}")
    print(f"  ✓ Phần I: {sum(1 for v in results['part1'].values() if v)}/40 câu detected")
    p2_count = sum(1 for q in results['part2'].values() for v in q.values() if v is not None)
    print(f"  ✓ Phần II: {p2_count}/32 mục detected")
    print(f"  ✓ Phần III: {sum(1 for v in results['part3'].values() if v)}/6 câu detected")
    print(f"  ✓ Confidence: {results['confidence']}")
    print(f"  ⏱ Thời gian: {t_read * 1000:.1f}ms")

    # In đáp án Phần I
    print("\n  Phần I chi tiết:")
    for q in range(1, 41):
        ans = results['part1'].get(q)
        if ans:
            print(f"    Câu {q:2d}: {ans}", end="  ")
            if q % 10 == 0:
                print()
    print()

    # Bước 3: Tạo visualization
    print("\n[5/5] Tạo visualization overlay...")
    t0 = time.time()
    overlay = draw_bubble_overlay(flattened, results, show_values=True)
    debug_img = draw_markers_debug(original, {}, flatten_info)
    t_viz = time.time() - t0
    print(f"  ⏱ Thời gian: {t_viz * 1000:.1f}ms")

    # Lưu kết quả
    output_dir = os.path.dirname(os.path.abspath(__file__))
    cv2.imwrite(os.path.join(output_dir, "test_original.jpg"), original)
    cv2.imwrite(os.path.join(output_dir, "test_flattened.jpg"), flattened)
    cv2.imwrite(os.path.join(output_dir, "test_overlay.jpg"), overlay)
    cv2.imwrite(os.path.join(output_dir, "test_markers_debug.jpg"), debug_img)

    # Lưu JSON
    result_json = {
        "sbd": results["sbd"],
        "exam_code": results["exam_code"],
        "part1": {str(k): v for k, v in results["part1"].items()},
        "part2": {str(k): {sk: sv for sk, sv in v.items()} for k, v in results["part2"].items()},
        "part3": {str(k): v for k, v in results["part3"].items()},
        "confidence": results["confidence"],
        "flatten": {
            "method": flatten_info["method"],
            "markers_found": flatten_info["markers_found"],
            "corners_detected": flatten_info["corners_detected"],
        },
        "timing": {
            "flatten_ms": round(t_flatten * 1000, 1),
            "read_ms": round(t_read * 1000, 1),
            "viz_ms": round(t_viz * 1000, 1),
            "total_ms": round((t_flatten + t_read + t_viz) * 1000, 1),
        }
    }
    with open(os.path.join(output_dir, "test_results.json"), "w", encoding="utf-8") as f:
        json.dump(result_json, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"✅ TỔNG KẾT:")
    print(f"  Tổng thời gian: {(t_flatten + t_read + t_viz) * 1000:.1f}ms")
    print(f"  Files đã lưu:")
    print(f"    - test_original.jpg       (ảnh gốc/biến dạng)")
    print(f"    - test_flattened.jpg       (ảnh đã flatten)")
    print(f"    - test_overlay.jpg         (ảnh overlay kết quả)")
    print(f"    - test_markers_debug.jpg   (debug markers)")
    print(f"    - test_results.json        (kết quả JSON)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    test_pipeline(image_path)
