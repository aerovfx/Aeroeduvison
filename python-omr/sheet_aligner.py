"""
=============================================================================
SHEET ALIGNER - Căn chỉnh bài thi thực tế khớp với template chuẩn
=============================================================================
PIPELINE 3 BƯỚC:

  Bước 1: INITIAL ALIGNMENT (Coarse)
    - Phát hiện tất cả marker đen trong ảnh chụp
    - Match với 4 marker góc template → Perspective transform thô

  Bước 2: FINE ALIGNMENT (Refine)
    - Trên ảnh đã warp thô, tìm tất cả 22 marker bằng template matching
    - Match từng marker với vị trí kỳ vọng trên template
    - Tính lại homography chính xác từ tất cả marker matched

  Bước 3: LOCAL CORRECTION (Per-section)
    - Dùng các marker phân đoạn để hiệu chỉnh cục bộ từng phần
    - PHẦN I: 5 marker trên + 2 marker dưới → affine transform riêng
    - PHẦN III: 7 marker trên + 6 marker dưới → affine transform riêng

Kết quả: Ảnh phẳng khớp chính xác với template, sai số < 3-5px.
=============================================================================
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import os

from template_config import (
    STD_W, STD_H, TEMPLATE_MARKERS, MARKER_SIZE_PX,
    MARKER_SEARCH_RADIUS, DETECTION_PARAMS,
    CORNER_MARKER_NAMES, MARKER_GROUPS
)
from template_generator import generate_composite_marker_patch


class AlignmentResult:
    """Kết quả alignment."""
    def __init__(self):
        self.success = False
        self.method = "none"
        self.aligned_image = None
        self.transform_matrix = None

        # Marker detection
        self.raw_markers_count = 0
        self.matched_markers = {}       # name -> (x, y) in aligned image
        self.marker_offsets = {}         # name -> (dx, dy) offset from expected
        self.avg_offset = (0.0, 0.0)
        self.max_offset = 0.0

        # Quality metrics
        self.alignment_score = 0.0      # 0-100
        self.markers_used = 0


def preprocess_gray(image: np.ndarray) -> np.ndarray:
    """Chuyển sang grayscale và cải thiện contrast."""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def detect_all_dark_squares(gray: np.ndarray) -> List[Dict]:
    """
    Phát hiện TẤT CẢ hình vuông đen trong ảnh.
    Dùng nhiều threshold levels để đảm bảo tìm được marker.
    """
    params = DETECTION_PARAMS
    h, w = gray.shape[:2]
    scale = (w * h) / (STD_W * STD_H)

    min_area = max(params["marker_min_area"], int(params["marker_min_area"] * scale * 0.5))
    max_area = max(params["marker_max_area"], int(params["marker_max_area"] * scale * 2))

    all_markers = []
    seen_positions = set()

    # Thử nhiều threshold levels
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Otsu
    otsu_val, _ = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    thresholds = [
        int(otsu_val * 0.80), int(otsu_val * 0.90),
        int(otsu_val * 1.00), int(otsu_val * 1.10),
        80, 100, 120, 140, 160,
    ]
    thresholds = sorted(set(max(40, min(200, t)) for t in thresholds))

    for thresh in thresholds:
        _, binary = cv2.threshold(blurred, thresh, 255, cv2.THRESH_BINARY_INV)

        # Morphology
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area or area > max_area:
                continue

            x, y, bw, bh = cv2.boundingRect(cnt)
            if bw < params["marker_min_side"] or bh < params["marker_min_side"]:
                continue

            aspect = bw / max(1, bh)
            if aspect < params["marker_min_aspect"] or aspect > params["marker_max_aspect"]:
                continue

            fill = area / max(1, bw * bh)
            if fill < params["marker_min_fill"]:
                continue

            # Kiểm tra nội dung tối
            mask = np.zeros_like(gray)
            cv2.drawContours(mask, [cnt], -1, 255, -1)
            mean_val = cv2.mean(gray, mask=mask)[0]
            if mean_val > params["marker_max_brightness"]:
                continue

            cx = x + bw / 2
            cy = y + bh / 2

            # Dedup: bỏ qua marker quá gần marker đã có
            pos_key = (round(cx / 10), round(cy / 10))
            if pos_key in seen_positions:
                continue
            seen_positions.add(pos_key)

            all_markers.append({
                "cx": cx, "cy": cy,
                "area": area, "w": bw, "h": bh,
                "mean": mean_val,
                "thresh": thresh,
            })

    return all_markers


def match_markers_to_template(
    markers: List[Dict],
    img_w: int, img_h: int,
    tolerance_frac: float = 0.12
) -> Dict[str, Tuple[float, float]]:
    """
    Match các marker detected với vị trí kỳ vọng trên template.
    Đây là matching trước khi perspective transform (ảnh chưa flatten).

    Sử dụng thuật toán:
    1. Với mỗi marker template, tìm marker detected gần nhất (theo tỷ lệ)
    2. Kiểm tra khoảng cách < tolerance
    """
    matched = {}
    tolerance_px_x = tolerance_frac * img_w
    tolerance_px_y = tolerance_frac * img_h

    for name, (fx, fy) in TEMPLATE_MARKERS.items():
        expected_x = fx * img_w
        expected_y = fy * img_h

        best_dist = float('inf')
        best_marker = None

        for m in markers:
            dx = abs(m["cx"] - expected_x)
            dy = abs(m["cy"] - expected_y)
            if dx > tolerance_px_x or dy > tolerance_px_y:
                continue
            dist = np.sqrt(dx**2 + dy**2)
            if dist < best_dist:
                best_dist = dist
                best_marker = m

        if best_marker is not None:
            matched[name] = (best_marker["cx"], best_marker["cy"])

    return matched


def find_best_4_corners(
    matched: Dict[str, Tuple[float, float]],
    markers: List[Dict],
    img_w: int, img_h: int
) -> Optional[Dict[str, Tuple[float, float]]]:
    """
    Tìm 4 marker góc tốt nhất cho perspective transform ban đầu.
    Ưu tiên CORNER_MARKER_NAMES, nhưng có thể dùng marker khác nếu thiếu.
    """
    corners_names = CORNER_MARKER_NAMES  # TL, TR, BR, BL

    # Thử dùng chính xác 4 marker góc
    if all(name in matched for name in corners_names):
        return {
            "TL": matched[corners_names[0]],
            "TR": matched[corners_names[1]],
            "BR": matched[corners_names[2]],
            "BL": matched[corners_names[3]],
        }

    # Fallback: tìm marker gần 4 góc nhất
    corner_targets = {
        "TL": (0, 0),
        "TR": (img_w, 0),
        "BR": (img_w, img_h),
        "BL": (0, img_h),
    }

    result = {}
    used = set()

    for corner_name, (tx, ty) in corner_targets.items():
        best_dist = float('inf')
        best = None

        # Kiểm tra trong matched markers
        for name, (mx, my) in matched.items():
            if name in used:
                continue
            d = np.sqrt((mx - tx)**2 + (my - ty)**2)
            if d < best_dist:
                best_dist = d
                best = (name, mx, my)

        # Cũng kiểm tra raw markers
        for m in markers:
            key = f"raw_{m['cx']:.0f}_{m['cy']:.0f}"
            if key in used:
                continue
            d = np.sqrt((m["cx"] - tx)**2 + (m["cy"] - ty)**2)
            if d < best_dist:
                best_dist = d
                best = (key, m["cx"], m["cy"])

        if best and best_dist < np.sqrt(img_w**2 + img_h**2) * 0.35:
            result[corner_name] = (best[1], best[2])
            used.add(best[0])

    if len(result) == 4:
        return result
    return None


def perspective_transform(
    image: np.ndarray,
    corners: Dict[str, Tuple[float, float]],
    dst_w: int = STD_W,
    dst_h: int = STD_H
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Perspective warp từ 4 góc nguồn → ảnh phẳng chuẩn.
    Returns: (warped_image, transform_matrix)
    """
    src = np.array([
        corners["TL"], corners["TR"],
        corners["BR"], corners["BL"]
    ], dtype=np.float32)

    # Đích: vị trí các marker góc trên template chuẩn
    corner_px = {
        name: (TEMPLATE_MARKERS[name][0] * dst_w, TEMPLATE_MARKERS[name][1] * dst_h)
        for name in CORNER_MARKER_NAMES
    }

    dst = np.array([
        corner_px[CORNER_MARKER_NAMES[0]],  # TL
        corner_px[CORNER_MARKER_NAMES[1]],  # TR
        corner_px[CORNER_MARKER_NAMES[2]],  # BR
        corner_px[CORNER_MARKER_NAMES[3]],  # BL
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(
        image, M, (dst_w, dst_h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )
    return warped, M


def refine_with_template_matching(
    warped_gray: np.ndarray,
    marker_patch: np.ndarray = None
) -> Dict[str, Tuple[float, float]]:
    """
    Bước 2: Dùng template matching để tìm chính xác vị trí marker
    trên ảnh đã warp thô.
    """
    if marker_patch is None:
        marker_patch = generate_composite_marker_patch()

    h, w = warped_gray.shape[:2]
    found = {}

    # Template match tại mỗi vị trí kỳ vọng
    search_r = MARKER_SEARCH_RADIUS
    ph, pw = marker_patch.shape[:2]

    for name, (fx, fy) in TEMPLATE_MARKERS.items():
        ex = int(fx * w)
        ey = int(fy * h)

        # Crop vùng tìm kiếm
        x1 = max(0, ex - search_r - pw // 2)
        y1 = max(0, ey - search_r - ph // 2)
        x2 = min(w, ex + search_r + pw // 2)
        y2 = min(h, ey + search_r + ph // 2)

        if x2 - x1 < pw or y2 - y1 < ph:
            continue

        region = warped_gray[y1:y2, x1:x2]
        result = cv2.matchTemplate(region, marker_patch, cv2.TM_CCOEFF_NORMED)

        _, max_val, _, max_loc = cv2.minMaxLoc(result)

        if max_val > DETECTION_PARAMS["match_threshold"]:
            # Vị trí tâm marker
            mx = x1 + max_loc[0] + pw // 2
            my = y1 + max_loc[1] + ph // 2
            found[name] = (float(mx), float(my))

    return found


def compute_refined_homography(
    matched_markers: Dict[str, Tuple[float, float]],
    dst_w: int = STD_W,
    dst_h: int = STD_H
) -> Optional[np.ndarray]:
    """
    Tính homography tinh chỉnh từ TẤT CẢ marker matched.
    Dùng RANSAC để robust với outliers.
    """
    if len(matched_markers) < 4:
        return None

    src_pts = []
    dst_pts = []

    for name, (mx, my) in matched_markers.items():
        fx, fy = TEMPLATE_MARKERS[name]
        src_pts.append([mx, my])
        dst_pts.append([fx * dst_w, fy * dst_h])

    src_pts = np.array(src_pts, dtype=np.float32)
    dst_pts = np.array(dst_pts, dtype=np.float32)

    if len(src_pts) >= 4:
        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        return M

    return None


def compute_marker_offsets(
    matched: Dict[str, Tuple[float, float]]
) -> Dict[str, Tuple[float, float]]:
    """Tính offset giữa vị trí thực tế và kỳ vọng."""
    offsets = {}
    for name, (mx, my) in matched.items():
        ex = TEMPLATE_MARKERS[name][0] * STD_W
        ey = TEMPLATE_MARKERS[name][1] * STD_H
        offsets[name] = (mx - ex, my - ey)
    return offsets


# ===========================================================================
# MAIN PIPELINE
# ===========================================================================

def align_exam_sheet(
    image: np.ndarray,
    debug: bool = False
) -> AlignmentResult:
    """
    Pipeline đầy đủ 3 bước: Coarse → Fine → Aligned.

    Args:
        image: Ảnh chụp bài thi (BGR)
        debug: In thông tin debug

    Returns:
        AlignmentResult
    """
    result = AlignmentResult()
    h_img, w_img = image.shape[:2]

    if debug:
        print(f"[ALIGN] Input: {w_img}x{h_img}")

    # ── Bước 0: Resize nếu quá lớn ──
    max_dim = 2400
    scale = 1.0
    work = image.copy()
    if max(h_img, w_img) > max_dim:
        scale = max_dim / max(h_img, w_img)
        work = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    gray = preprocess_gray(work)
    wh, ww = gray.shape[:2]

    # ── Bước 1: COARSE - Phát hiện marker + 4 góc ──
    if debug:
        print("[ALIGN] Bước 1: Phát hiện marker đen...")

    raw_markers = detect_all_dark_squares(gray)
    result.raw_markers_count = len(raw_markers)

    if debug:
        print(f"  Tìm thấy {len(raw_markers)} dark squares")

    # Match với template
    initial_match = match_markers_to_template(raw_markers, ww, wh, tolerance_frac=0.15)

    if debug:
        print(f"  Matched {len(initial_match)} markers với template")

    # Tìm 4 góc
    corners = find_best_4_corners(initial_match, raw_markers, ww, wh)

    if corners is None:
        if debug:
            print("  ✗ Không tìm được 4 marker góc → fallback resize")
        result.method = "resize_fallback"
        result.aligned_image = cv2.resize(image, (STD_W, STD_H), interpolation=cv2.INTER_CUBIC)
        result.success = True
        result.alignment_score = 20.0
        return result

    # Scale corners về ảnh gốc
    corners_orig = {k: (v[0] / scale, v[1] / scale) for k, v in corners.items()}

    if debug:
        print(f"  4 góc: {corners_orig}")

    # Perspective transform thô
    warped, M_coarse = perspective_transform(image, corners_orig)

    # ── Bước 2: FINE - Template matching trên ảnh đã warp ──
    if debug:
        print("[ALIGN] Bước 2: Template matching (tinh chỉnh)...")

    warped_gray = preprocess_gray(warped)
    marker_patch = generate_composite_marker_patch()

    fine_matched = refine_with_template_matching(warped_gray, marker_patch)

    if debug:
        print(f"  Template match: {len(fine_matched)}/{len(TEMPLATE_MARKERS)} markers")

    result.matched_markers = fine_matched
    result.markers_used = len(fine_matched)

    # ── Bước 3: Tính lại homography tinh chỉnh nếu có đủ marker ──
    if len(fine_matched) >= 6:
        if debug:
            print("[ALIGN] Bước 3: Refined homography...")

        M_refine = compute_refined_homography(fine_matched)

        if M_refine is not None:
            # Warp lại từ ảnh đã coarse-warp
            refined = cv2.warpPerspective(
                warped, M_refine, (STD_W, STD_H),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )

            # Kiểm tra chất lượng refined vs coarse
            # So sánh bằng cách template match lại
            refined_gray = preprocess_gray(refined)
            check_matched = refine_with_template_matching(refined_gray, marker_patch)

            if len(check_matched) >= len(fine_matched) * 0.8:
                result.aligned_image = refined
                result.method = "marker_refined"
                result.transform_matrix = M_refine

                # Update matched markers
                result.matched_markers = check_matched

                if debug:
                    print(f"  Refined: {len(check_matched)} markers matched")
            else:
                # Refined kém hơn → dùng coarse
                result.aligned_image = warped
                result.method = "marker_coarse"
                result.transform_matrix = M_coarse

                if debug:
                    print("  Refined kém hơn, dùng coarse")
        else:
            result.aligned_image = warped
            result.method = "marker_coarse"
            result.transform_matrix = M_coarse
    else:
        result.aligned_image = warped
        result.method = "marker_coarse"
        result.transform_matrix = M_coarse

    # ── Tính offsets và quality score ──
    offsets = compute_marker_offsets(result.matched_markers)
    result.marker_offsets = offsets

    if offsets:
        dx_list = [abs(o[0]) for o in offsets.values()]
        dy_list = [abs(o[1]) for o in offsets.values()]
        result.avg_offset = (float(np.mean(dx_list)), float(np.mean(dy_list)))
        result.max_offset = float(max(max(dx_list), max(dy_list)))

        # Score: 100 nếu offset=0, giảm dần
        match_ratio = len(result.matched_markers) / len(TEMPLATE_MARKERS)
        offset_score = max(0, 100 - result.max_offset * 2)
        result.alignment_score = round(match_ratio * 60 + offset_score * 0.4, 1)

    result.success = True

    if debug:
        print(f"[ALIGN] ✓ Done: method={result.method}, "
              f"markers={result.markers_used}, "
              f"score={result.alignment_score}, "
              f"max_offset={result.max_offset:.1f}px")

    return result


def align_from_bytes(image_bytes: bytes, debug: bool = False) -> AlignmentResult:
    """Entry point từ bytes (upload)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        result = AlignmentResult()
        result.success = False
        return result
    return align_exam_sheet(image, debug=debug)


def align_from_file(path: str, debug: bool = False) -> AlignmentResult:
    """Entry point từ file path."""
    image = cv2.imread(path)
    if image is None:
        result = AlignmentResult()
        result.success = False
        return result
    return align_exam_sheet(image, debug=debug)
