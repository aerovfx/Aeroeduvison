"""
=============================================================================
VISUALIZER - Hiển thị kết quả OMR trên ảnh phiếu thi
=============================================================================
Tạo overlay hiển thị:
- Marker đen được phát hiện (vòng xanh lá)
- Bubble được tô (vòng xanh lá + fill)
- Bubble trống (vòng xám mỏng)
- Đáp án sai (vòng đỏ nếu so đáp án)
- Thông tin SBD, Mã đề, Tên HS
- Điểm số
=============================================================================
"""

import cv2
import numpy as np
from typing import Dict, List, Optional, Any, Tuple


# Màu sắc (BGR)
COLOR_FILLED = (0, 200, 0)      # Xanh lá - bubble được chọn
COLOR_CORRECT = (0, 255, 0)     # Xanh sáng - đáp án đúng
COLOR_WRONG = (0, 0, 255)       # Đỏ - đáp án sai
COLOR_EMPTY = (180, 180, 180)   # Xám - bubble trống
COLOR_MARKER = (255, 0, 0)      # Xanh dương - marker
COLOR_TEXT = (0, 0, 0)          # Đen - text
COLOR_SECTION = (200, 100, 0)   # Cam - border section
COLOR_INFO_BG = (255, 255, 220) # Vàng nhạt - nền thông tin


def draw_bubble_overlay(
    image: np.ndarray,
    bubble_results: Dict[str, Any],
    answer_key: Optional[Dict] = None,
    show_values: bool = False
) -> np.ndarray:
    """
    Vẽ overlay kết quả đọc bubble lên ảnh.

    Args:
        image: Ảnh flatten (BGR)
        bubble_results: Kết quả từ read_all_bubbles()
        answer_key: Đáp án đúng (optional, để so sánh)
        show_values: Hiển thị giá trị mean lên mỗi bubble

    Returns:
        Ảnh với overlay
    """
    overlay = image.copy()
    if len(overlay.shape) == 2:
        overlay = cv2.cvtColor(overlay, cv2.COLOR_GRAY2BGR)

    # Tạo transparent overlay
    alpha_layer = overlay.copy()

    bubble_map = bubble_results.get("bubble_map", {})

    # === Vẽ Phần I ===
    _draw_part1(alpha_layer, bubble_map.get("part1", []),
                bubble_results.get("part1", {}), answer_key)

    # === Vẽ Phần II ===
    _draw_part2(alpha_layer, bubble_map.get("part2", []),
                bubble_results.get("part2", {}))

    # === Vẽ Phần III ===
    _draw_part3(alpha_layer, bubble_map.get("part3", []),
                bubble_results.get("part3", {}))

    # === Vẽ SBD ===
    _draw_digit_field(alpha_layer, bubble_map.get("sbd", []))

    # === Vẽ Mã đề ===
    _draw_digit_field(alpha_layer, bubble_map.get("exam_code", []))

    # Blend overlay
    result = cv2.addWeighted(overlay, 0.4, alpha_layer, 0.6, 0)

    # === Vẽ thông tin text ===
    _draw_info_panel(result, bubble_results)

    # === Hiển thị mean values nếu cần ===
    if show_values:
        _draw_mean_values(result, bubble_map)

    return result


def _draw_part1(img: np.ndarray, details: List[Dict],
                answers: Dict, answer_key: Optional[Dict]):
    """Vẽ bubble Phần I."""
    for b in details:
        x, y, r = b["x"], b["y"], b["r"]
        q = b["question"]
        filled = b["filled"]

        if filled:
            # Kiểm tra đúng/sai nếu có đáp án
            if answer_key and "part1" in answer_key:
                correct = answer_key["part1"].get(q)
                if correct and b["option"] == correct:
                    color = COLOR_CORRECT
                elif correct:
                    color = COLOR_WRONG
                else:
                    color = COLOR_FILLED
            else:
                color = COLOR_FILLED

            cv2.circle(img, (x, y), r + 2, color, 2)
            cv2.circle(img, (x, y), r - 1, color, -1)
        else:
            cv2.circle(img, (x, y), r, COLOR_EMPTY, 1)


def _draw_part2(img: np.ndarray, details: List[Dict], answers: Dict):
    """Vẽ bubble Phần II."""
    for b in details:
        y, r = b["y"], b["r"]
        answer = b.get("answer")

        for key in ["x_dung", "x_sai"]:
            x = b[key]
            is_dung = (key == "x_dung")
            is_chosen = (answer is True and is_dung) or (answer is False and not is_dung)

            if is_chosen:
                cv2.circle(img, (x, y), r + 2, COLOR_FILLED, 2)
                cv2.circle(img, (x, y), r - 1, COLOR_FILLED, -1)
            else:
                cv2.circle(img, (x, y), r, COLOR_EMPTY, 1)


def _draw_part3(img: np.ndarray, details: List[Dict], answers: Dict):
    """Vẽ bubble Phần III."""
    for b in details:
        x, y, r = b["x"], b["y"], b["r"]
        filled = b["filled"]

        if filled:
            cv2.circle(img, (x, y), r + 1, COLOR_FILLED, 2)
            cv2.circle(img, (x, y), r - 1, COLOR_FILLED, -1)
        else:
            cv2.circle(img, (x, y), r, COLOR_EMPTY, 1)


def _draw_digit_field(img: np.ndarray, details: List[Dict]):
    """Vẽ bubble SBD hoặc Mã đề."""
    for b in details:
        x, y, r = b["x"], b["y"], b["r"]
        filled = b["filled"]

        if filled:
            cv2.circle(img, (x, y), r + 1, COLOR_FILLED, 2)
            cv2.circle(img, (x, y), r - 1, COLOR_FILLED, -1)
        else:
            cv2.circle(img, (x, y), r, COLOR_EMPTY, 1)


def _draw_info_panel(img: np.ndarray, results: Dict):
    """Vẽ bảng thông tin kết quả."""
    h, w = img.shape[:2]

    # Panel ở góc dưới-trái
    panel_h = 90
    panel_w = 350
    panel_x = 10
    panel_y = h - panel_h - 10

    # Nền panel
    cv2.rectangle(img,
                  (panel_x, panel_y),
                  (panel_x + panel_w, panel_y + panel_h),
                  COLOR_INFO_BG, -1)
    cv2.rectangle(img,
                  (panel_x, panel_y),
                  (panel_x + panel_w, panel_y + panel_h),
                  (100, 100, 100), 1)

    # Text thông tin
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.45
    line_h = 18

    sbd = results.get("sbd", "---")
    exam_code = results.get("exam_code", "---")
    conf = results.get("confidence", {})

    texts = [
        f"SBD: {sbd}  |  Ma de: {exam_code}",
        f"Phan I: {conf.get('part1', 0)}% | Phan II: {conf.get('part2', 0)}%",
        f"Phan III: {conf.get('part3', 0)}% | Overall: {conf.get('overall', 0)}%",
        f"Answers: {sum(1 for v in results.get('part1', {}).values() if v)}/40 detected",
    ]

    for i, text in enumerate(texts):
        cv2.putText(img, text,
                    (panel_x + 8, panel_y + 18 + i * line_h),
                    font, font_scale, COLOR_TEXT, 1, cv2.LINE_AA)


def _draw_mean_values(img: np.ndarray, bubble_map: Dict):
    """Hiển thị giá trị mean trên mỗi bubble (debug mode)."""
    font = cv2.FONT_HERSHEY_SIMPLEX

    for section in bubble_map.values():
        if not isinstance(section, list):
            continue
        for b in section:
            x, y = b.get("x", 0), b.get("y", 0)
            mean = b.get("mean", 0)
            if b.get("filled"):
                cv2.putText(img, f"{mean:.0f}",
                            (x - 8, y - b.get("r", 5) - 3),
                            font, 0.25, (0, 0, 200), 1, cv2.LINE_AA)


def draw_markers_debug(
    image: np.ndarray,
    markers_info: Dict,
    flattened_info: Dict
) -> np.ndarray:
    """
    Vẽ debug view hiển thị tất cả marker được phát hiện.
    """
    debug_img = image.copy()
    if len(debug_img.shape) == 2:
        debug_img = cv2.cvtColor(debug_img, cv2.COLOR_GRAY2BGR)

    # Vẽ tất cả marker candidates
    for mx, my, area in flattened_info.get("markers", []):
        r = max(3, int(np.sqrt(area / np.pi)))
        cv2.circle(debug_img, (int(mx), int(my)), r + 5, (255, 200, 0), 2)
        cv2.circle(debug_img, (int(mx), int(my)), 2, (0, 0, 255), -1)

    # Vẽ 4 góc chính
    corners = flattened_info.get("corners")
    if corners:
        pts = [corners["TL"], corners["TR"], corners["BR"], corners["BL"]]
        for i, (cx, cy) in enumerate(pts):
            label = ["TL", "TR", "BR", "BL"][i]
            cv2.circle(debug_img, (int(cx), int(cy)), 15, COLOR_MARKER, 3)
            cv2.putText(debug_img, label,
                        (int(cx) + 18, int(cy) - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_MARKER, 2)

        # Vẽ đường nối 4 góc
        pts_arr = np.array([(int(x), int(y)) for x, y in pts], dtype=np.int32)
        cv2.polylines(debug_img, [pts_arr], True, COLOR_MARKER, 2)

    # Vẽ section markers
    section_markers = flattened_info.get("section_markers", {})
    for name, pos in section_markers.items():
        x, y = int(pos["x"]), int(pos["y"])
        cv2.circle(debug_img, (x, y), 8, (0, 255, 255), 2)
        cv2.putText(debug_img, name,
                    (x + 10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 200, 200), 1)

    # Info text
    method = flattened_info.get("method", "unknown")
    n_markers = flattened_info.get("markers_found", 0)
    n_section = flattened_info.get("section_markers_matched", 0)
    cv2.putText(debug_img,
                f"Method: {method} | Markers: {n_markers} | Sections: {n_section}",
                (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

    return debug_img


def create_comparison_view(
    original: np.ndarray,
    flattened: np.ndarray,
    overlay: np.ndarray,
    max_height: int = 900
) -> np.ndarray:
    """
    Tạo ảnh so sánh 3 bước: Gốc → Flatten → Overlay.
    """
    def resize_to_height(img, target_h):
        h, w = img.shape[:2]
        scale = target_h / h
        new_w = int(w * scale)
        return cv2.resize(img, (new_w, target_h))

    imgs = [original, flattened, overlay]
    # Convert to BGR if needed
    bgr_imgs = []
    for img in imgs:
        if len(img.shape) == 2:
            bgr_imgs.append(cv2.cvtColor(img, cv2.COLOR_GRAY2BGR))
        else:
            bgr_imgs.append(img)

    resized = [resize_to_height(img, max_height) for img in bgr_imgs]

    # Labels
    labels = ["Original", "Flattened", "Result"]
    for img, label in zip(resized, labels):
        cv2.putText(img, label, (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

    # Nối ngang
    return np.hstack(resized)
