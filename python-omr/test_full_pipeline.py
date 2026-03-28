#!/usr/bin/env python3
"""
=============================================================================
TEST FULL PIPELINE - Template-based OMR System
=============================================================================
1. Tạo template chuẩn
2. Tạo ảnh bài thi giả lập (có tô bubble + biến dạng perspective)
3. Chạy pipeline: align → read → grade → visualize
4. Xuất kết quả ra file
=============================================================================
"""

import sys
import os
import json
import time
import numpy as np
import cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from template_config import (
    STD_W, STD_H, TEMPLATE_MARKERS,
    PART1_LAYOUT, SBD_LAYOUT, EXAM_CODE_LAYOUT,
)
from template_generator import save_template_assets, generate_reference_template
from omr_pipeline import process_exam_image


def create_filled_exam(answers_p1=None, sbd_str="385201", exam_code_str="132"):
    """Tạo ảnh phiếu thi đã tô bubble (giả lập bài làm HS)."""
    W, H = STD_W, STD_H

    # Bắt đầu từ template chuẩn
    img = generate_reference_template(draw_bubbles=True, draw_labels=True)

    # Default answers
    if answers_p1 is None:
        answers_p1 = {
            1: "A", 2: "B", 3: "C", 4: "D", 5: "A",
            6: "B", 7: "C", 8: "D", 9: "A", 10: "B",
            11: "C", 12: "D", 13: "A", 14: "B", 15: "C",
            16: "D", 17: "A", 18: "B", 19: "C", 20: "D",
            21: "A", 22: "B", 23: "C", 24: "D", 25: "A",
            26: "B", 27: "C", 28: "D", 29: "A", 30: "B",
            31: "C", 32: "D", 33: "A", 34: "B", 35: "C",
            36: "D", 37: "A", 38: "B", 39: "C", 40: "D",
        }

    # Tô Phần I
    cfg = PART1_LAYOUT
    r = max(6, int(cfg["bubble_r"] * W))
    rows = cfg["rows"]
    y_step = (cfg["y_last"] - cfg["y_first"]) / max(1, rows - 1)

    for group in cfg["groups"]:
        q0 = group["q0"]
        for ri in range(rows):
            q = q0 + ri
            ans = answers_p1.get(q)
            if ans and ans in ["A", "B", "C", "D"]:
                x = int(group[ans] * W)
                y = int((cfg["y_first"] + ri * y_step) * H)
                cv2.circle(img, (x, y), r, (30, 30, 30), -1)

    # Tô SBD
    sbd_cfg = SBD_LAYOUT
    sbd_r = max(4, int(sbd_cfg["bubble_r"] * W))
    sbd_x_step = (sbd_cfg["x_last"] - sbd_cfg["x_first"]) / max(1, sbd_cfg["cols"] - 1)
    sbd_y_step = (sbd_cfg["y_last"] - sbd_cfg["y_first"]) / max(1, sbd_cfg["rows"] - 1)

    for ci, ch in enumerate(sbd_str):
        if ci >= sbd_cfg["cols"]:
            break
        d = int(ch)
        x = int((sbd_cfg["x_first"] + ci * sbd_x_step) * W)
        y = int((sbd_cfg["y_first"] + d * sbd_y_step) * H)
        cv2.circle(img, (x, y), sbd_r, (30, 30, 30), -1)

    # Tô Mã đề
    ec_cfg = EXAM_CODE_LAYOUT
    ec_r = max(4, int(ec_cfg["bubble_r"] * W))
    ec_x_step = (ec_cfg["x_last"] - ec_cfg["x_first"]) / max(1, ec_cfg["cols"] - 1)
    ec_y_step = (ec_cfg["y_last"] - ec_cfg["y_first"]) / max(1, ec_cfg["rows"] - 1)

    for ci, ch in enumerate(exam_code_str):
        if ci >= ec_cfg["cols"]:
            break
        d = int(ch)
        x = int((ec_cfg["x_first"] + ci * ec_x_step) * W)
        y = int((ec_cfg["y_first"] + d * ec_y_step) * H)
        cv2.circle(img, (x, y), ec_r, (30, 30, 30), -1)

    return img, answers_p1


def distort_perspective(img, intensity=0.06):
    """Giả lập ảnh chụp từ góc xiên."""
    h, w = img.shape[:2]
    pad = 120
    bg = np.ones((h + 2 * pad, w + 2 * pad, 3), dtype=np.uint8) * 170
    bg[pad:pad + h, pad:pad + w] = img

    dx = w * intensity
    dy = h * intensity
    src = np.array([
        [pad, pad],
        [pad + w, pad],
        [pad + w, pad + h],
        [pad, pad + h],
    ], dtype=np.float32)
    dst = np.array([
        [pad + dx * 0.4, pad + dy * 0.8],
        [pad + w - dx * 0.7, pad + dy * 0.2],
        [pad + w - dx * 0.2, pad + h - dy * 0.5],
        [pad + dx * 0.6, pad + h - dy * 0.1],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(src, dst)
    result = cv2.warpPerspective(bg, M, (w + 2 * pad, h + 2 * pad))

    # Thêm nhiễu nhẹ
    noise = np.random.normal(0, 3, result.shape).astype(np.int16)
    result = np.clip(result.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return result


def run_test(image_path=None):
    print("=" * 70)
    print("  TEST FULL OMR PIPELINE (Template-based)")
    print("=" * 70)

    out_dir = os.path.join(os.path.dirname(__file__), "test_output")
    os.makedirs(out_dir, exist_ok=True)

    # 1. Tạo template assets
    print("\n📐 Bước 1: Tạo template assets...")
    assets_dir = os.path.join(os.path.dirname(__file__), "template_assets")
    save_template_assets(assets_dir)

    if image_path and os.path.exists(image_path):
        print(f"\n📷 Dùng ảnh thật: {image_path}")
        test_image = cv2.imread(image_path)
        known_answers = None
    else:
        # 2. Tạo ảnh bài thi giả lập
        print("\n✏️  Bước 2: Tạo ảnh bài thi giả lập (tô bubble + biến dạng)...")
        filled, known_answers_p1 = create_filled_exam()
        cv2.imwrite(os.path.join(out_dir, "01_filled_clean.jpg"), filled)

        distorted = distort_perspective(filled, intensity=0.06)
        cv2.imwrite(os.path.join(out_dir, "02_distorted.jpg"), distorted)
        test_image = distorted
        known_answers = {"part1": {str(k): v for k, v in known_answers_p1.items()}}
        print(f"  ✓ Ảnh biến dạng: {distorted.shape[1]}x{distorted.shape[0]}")

    # 3. Chạy pipeline
    print("\n🔄 Bước 3: Chạy OMR pipeline...")
    result = process_exam_image(
        image=test_image,
        answer_key=known_answers,
        debug=True,
    )

    if not result["success"]:
        print(f"  ❌ Pipeline thất bại: {result.get('error')}")
        return

    # 4. In kết quả
    print(f"\n{'─' * 50}")
    print("📊 KẾT QUẢ:")
    print(f"{'─' * 50}")

    ans = result["answers"]
    align = result["alignment"]
    conf = result["confidence"]
    timing = result["timing"]

    print(f"  SBD:     {ans['sbd']}")
    print(f"  Mã đề:   {ans['exam_code']}")
    print(f"  Phần I:  {conf['part1']}% detected")
    print(f"  Phần II: {conf['part2']}% detected")
    print(f"  Phần III:{conf['part3']}% detected")

    print(f"\n  Alignment:")
    print(f"    Method:  {align['method']}")
    print(f"    Markers: {align['markers_matched']}/{align['total_markers']} matched")
    print(f"    Score:   {align['score']}")
    print(f"    Offset:  avg=({align['avg_offset']['x']:.1f}, {align['avg_offset']['y']:.1f}) max={align['max_offset']:.1f}px")

    print(f"\n  Timing:")
    print(f"    Align:   {timing['align_ms']:.0f}ms")
    print(f"    Read:    {timing['read_ms']:.0f}ms")
    print(f"    Viz:     {timing['viz_ms']:.0f}ms")
    print(f"    TOTAL:   {timing['total_ms']:.0f}ms")

    if result.get("grade"):
        g = result["grade"]
        print(f"\n  📝 Chấm điểm:")
        print(f"    Phần I:  {g['part1']['correct']}/40 đúng = {g['part1']['score']}đ")
        print(f"    Phần II: {g['part2']['correct']} full + {g['part2']['partial']} partial = {g['part2']['score']}đ")
        print(f"    Phần III:{g['part3']['correct']}/6 đúng = {g['part3']['score']}đ")
        print(f"    ═══ TỔNG: {g['total']}đ ═══")

    # Chi tiết Phần I
    print(f"\n  Phần I chi tiết:")
    p1 = ans["part1"]
    for row_start in range(1, 41, 10):
        line = "    "
        for q in range(row_start, min(row_start + 10, 41)):
            a = p1.get(q, "-")
            line += f"{q:2d}:{a or '-'} "
        print(line)

    # 5. Lưu outputs
    print(f"\n💾 Lưu output...")
    images = result["images"]
    if images.get("aligned") is not None:
        cv2.imwrite(os.path.join(out_dir, "03_aligned.jpg"), images["aligned"])
    if images.get("overlay") is not None:
        cv2.imwrite(os.path.join(out_dir, "04_overlay.jpg"), images["overlay"])
    if images.get("debug") is not None:
        cv2.imwrite(os.path.join(out_dir, "05_debug.jpg"), images["debug"])

    # JSON
    json_result = {k: v for k, v in result.items() if k != "images" and k != "details"}
    with open(os.path.join(out_dir, "result.json"), "w", encoding="utf-8") as f:
        json.dump(json_result, f, ensure_ascii=False, indent=2, default=str)

    print(f"  ✓ Output saved to: {out_dir}/")
    print(f"    03_aligned.jpg  - Ảnh đã flatten (căn chỉnh marker)")
    print(f"    04_overlay.jpg  - Kết quả overlay (bubble detected)")
    print(f"    05_debug.jpg    - Debug (marker positions)")
    print(f"    result.json     - Kết quả JSON")

    print(f"\n{'=' * 70}")
    print(f"  ✅ HOÀN TẤT - Pipeline chạy thành công!")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else None
    run_test(path)
