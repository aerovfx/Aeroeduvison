"""
=============================================================================
MARKER DETECTOR + PERSPECTIVE TRANSFORM (LÀM PHẲNG PHIẾU THI)
=============================================================================
Pipeline:
1. Tiền xử lý ảnh (grayscale, blur, threshold)
2. Phát hiện contour hình vuông đen (marker)
3. Xác định 4 marker góc chính
4. Tính homography matrix
5. Perspective warp → ảnh phẳng chuẩn

Marker đen vuông (~12-20px) nằm cố định tại 4 góc phiếu,
cho phép xác định chính xác vị trí phiếu ngay cả khi:
- Phiếu bị nghiêng / xoay
- Phiếu bị cong / gấp nhẹ
- Ảnh chụp từ góc xiên
=============================================================================
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict
from exam_sheet_config import (
    STD_WIDTH, STD_HEIGHT,
    MARKER_DETECTION, MARKERS, CORNER_MARKERS
)


class MarkerCandidate:
    """Một marker đen vuông được phát hiện."""
    def __init__(self, cx: float, cy: float, area: float,
                 w: float, h: float, contour: np.ndarray):
        self.cx = cx
        self.cy = cy
        self.area = area
        self.w = w
        self.h = h
        self.contour = contour

    def __repr__(self):
        return f"Marker(cx={self.cx:.1f}, cy={self.cy:.1f}, area={self.area:.0f})"


def preprocess_for_markers(image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Tiền xử lý ảnh để phát hiện marker đen.
    Returns: (gray, binary) images
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    # Loại bỏ nhiễu nhưng giữ cạnh
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Adaptive threshold để xử lý ánh sáng không đều
    binary_adaptive = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 51, 12
    )

    # Otsu threshold cho trường hợp ánh sáng đồng đều
    _, binary_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Kết hợp cả 2 phương pháp
    binary = cv2.bitwise_or(binary_adaptive, binary_otsu)

    # Morphology để làm sạch
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    return gray, binary


def find_square_markers(binary: np.ndarray, gray: np.ndarray) -> List[MarkerCandidate]:
    """
    Tìm tất cả các hình vuông đen có thể là marker.
    Lọc theo: diện tích, tỷ lệ cạnh, tỷ lệ fill, độ vuông.
    """
    cfg = MARKER_DETECTION
    h_img, w_img = binary.shape[:2]

    # Scale thresholds theo kích thước ảnh
    scale = (w_img * h_img) / (STD_WIDTH * STD_HEIGHT)
    min_area = max(cfg["min_area"], int(cfg["min_area"] * scale * 0.5))
    max_area = max(cfg["max_area"], int(cfg["max_area"] * scale * 1.5))

    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    markers = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area or area > max_area:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        if w < cfg["min_side"] or h < cfg["min_side"]:
            continue

        aspect = w / max(1, h)
        if aspect < cfg["min_aspect"] or aspect > cfg["max_aspect"]:
            continue

        fill = area / max(1, w * h)
        if fill < cfg["min_fill"]:
            continue

        # Kiểm tra xấp xỉ polygon → nên gần 4 cạnh (vuông)
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
        if len(approx) < 4 or len(approx) > 8:
            continue

        # Kiểm tra nội dung bên trong phải tối (marker đen)
        mask = np.zeros_like(gray)
        cv2.drawContours(mask, [cnt], -1, 255, -1)
        mean_val = cv2.mean(gray, mask=mask)[0]
        if mean_val > 120:  # Không đủ tối
            continue

        cx = x + w / 2
        cy = y + h / 2
        markers.append(MarkerCandidate(cx, cy, area, w, h, cnt))

    return markers


def find_corner_markers(
    markers: List[MarkerCandidate],
    img_w: int,
    img_h: int
) -> Optional[Dict[str, Tuple[float, float]]]:
    """
    Từ danh sách markers, chọn 4 marker gần 4 góc ảnh nhất.
    Returns dict: {"TL": (x,y), "TR": (x,y), "BR": (x,y), "BL": (x,y)}
    """
    if len(markers) < 4:
        return None

    # Lọc markers ở vùng biên (< 30% từ mỗi cạnh)
    edge_zone = 0.30
    edge_markers = [m for m in markers if (
        m.cx < img_w * edge_zone or m.cx > img_w * (1 - edge_zone) or
        m.cy < img_h * edge_zone or m.cy > img_h * (1 - edge_zone)
    )]

    pool = edge_markers if len(edge_markers) >= 4 else markers

    # Sắp xếp theo khoảng cách đến mỗi góc
    def dist_to_corner(m, cx, cy):
        return np.sqrt((m.cx - cx)**2 + (m.cy - cy)**2)

    corners_target = {
        "TL": (0, 0),
        "TR": (img_w, 0),
        "BR": (img_w, img_h),
        "BL": (0, img_h),
    }

    best_score = -1
    best_combo = None

    # Lấy top-K candidates cho mỗi góc
    K = min(8, len(pool))
    candidates = {}
    for name, (cx, cy) in corners_target.items():
        sorted_pool = sorted(pool, key=lambda m: dist_to_corner(m, cx, cy))
        candidates[name] = sorted_pool[:K]

    # Brute-force tìm tổ hợp tốt nhất
    for tl in candidates["TL"]:
        for tr in candidates["TR"]:
            if tr is tl:
                continue
            # Kiểm tra TL phải nằm bên trái TR
            if tl.cx >= tr.cx:
                continue

            for br in candidates["BR"]:
                if br is tl or br is tr:
                    continue
                if br.cx <= tl.cx:
                    continue

                for bl in candidates["BL"]:
                    if bl is tl or bl is tr or bl is br:
                        continue
                    # Kiểm tra hình học cơ bản
                    if not (tl.cx < tr.cx and bl.cx < br.cx and
                            tl.cy < bl.cy and tr.cy < br.cy):
                        continue

                    # Tính score
                    pts = np.array([
                        [tl.cx, tl.cy], [tr.cx, tr.cy],
                        [br.cx, br.cy], [bl.cx, bl.cy]
                    ], dtype=np.float32)
                    area = cv2.contourArea(pts)
                    area_ratio = area / (img_w * img_h)

                    if area_ratio < 0.15:  # Quá nhỏ
                        continue

                    # Score: ưu tiên diện tích lớn + hình dạng gần chữ nhật
                    top_len = np.linalg.norm(pts[1] - pts[0])
                    bot_len = np.linalg.norm(pts[2] - pts[3])
                    left_len = np.linalg.norm(pts[3] - pts[0])
                    right_len = np.linalg.norm(pts[2] - pts[1])

                    shape_penalty = (
                        abs(top_len - bot_len) / max(1, top_len + bot_len) +
                        abs(left_len - right_len) / max(1, left_len + right_len)
                    )

                    corner_dist = (
                        dist_to_corner(tl, 0, 0) +
                        dist_to_corner(tr, img_w, 0) +
                        dist_to_corner(br, img_w, img_h) +
                        dist_to_corner(bl, 0, img_h)
                    ) / np.sqrt(img_w**2 + img_h**2)

                    marker_size_bonus = np.sqrt(
                        tl.area + tr.area + br.area + bl.area
                    )

                    score = (area_ratio * 200
                             - shape_penalty * 50
                             - corner_dist * 5
                             + marker_size_bonus * 0.1)

                    if score > best_score:
                        best_score = score
                        best_combo = {
                            "TL": (tl.cx, tl.cy),
                            "TR": (tr.cx, tr.cy),
                            "BR": (br.cx, br.cy),
                            "BL": (bl.cx, bl.cy),
                        }

    return best_combo


def compute_perspective_transform(
    corners: Dict[str, Tuple[float, float]],
    dst_width: int = STD_WIDTH,
    dst_height: int = STD_HEIGHT
) -> np.ndarray:
    """
    Tính perspective transform matrix từ 4 marker góc → ảnh phẳng chuẩn.
    """
    src_pts = np.array([
        corners["TL"],
        corners["TR"],
        corners["BR"],
        corners["BL"],
    ], dtype=np.float32)

    # Vị trí đích: 4 góc của ảnh chuẩn (có padding nhỏ cho marker)
    pad_x = dst_width * 0.018
    pad_y = dst_height * 0.015
    dst_pts = np.array([
        [pad_x, pad_y],
        [dst_width - pad_x, pad_y],
        [dst_width - pad_x, dst_height - pad_y],
        [pad_x, dst_height - pad_y],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    return M


def flatten_exam_sheet(
    image: np.ndarray,
    dst_width: int = STD_WIDTH,
    dst_height: int = STD_HEIGHT,
    debug: bool = False
) -> Tuple[np.ndarray, Dict]:
    """
    Pipeline đầy đủ: phát hiện marker → perspective transform → ảnh phẳng.

    Args:
        image: Ảnh đầu vào (BGR hoặc grayscale)
        dst_width: Chiều rộng ảnh đích
        dst_height: Chiều cao ảnh đích
        debug: Nếu True, trả thêm thông tin debug

    Returns:
        (flattened_image, info_dict)
    """
    info = {
        "success": False,
        "markers_found": 0,
        "corners_detected": False,
        "method": "none",
        "markers": [],
        "corners": None,
        "transform_matrix": None,
    }

    h_img, w_img = image.shape[:2]

    # Bước 1: Resize nếu ảnh quá lớn (giữ ratio)
    max_dim = 2400
    scale = 1.0
    proc_img = image.copy()
    if max(h_img, w_img) > max_dim:
        scale = max_dim / max(h_img, w_img)
        proc_img = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    # Bước 2: Tiền xử lý
    gray, binary = preprocess_for_markers(proc_img)

    # Bước 3: Tìm marker
    markers = find_square_markers(binary, gray)
    info["markers_found"] = len(markers)
    info["markers"] = [(m.cx / scale, m.cy / scale, m.area / (scale**2)) for m in markers]

    if debug:
        print(f"[OMR] Tìm thấy {len(markers)} marker candidates")

    # Bước 4: Xác định 4 góc
    proc_h, proc_w = proc_img.shape[:2]
    corners = find_corner_markers(markers, proc_w, proc_h)

    if corners is not None:
        # Scale corners về kích thước ảnh gốc
        corners_original = {
            k: (v[0] / scale, v[1] / scale)
            for k, v in corners.items()
        }
        info["corners_detected"] = True
        info["corners"] = corners_original
        info["method"] = "marker_perspective"

        if debug:
            print(f"[OMR] 4 góc marker: {corners_original}")

        # Bước 5: Perspective transform
        M = compute_perspective_transform(corners_original, dst_width, dst_height)
        info["transform_matrix"] = M.tolist()

        flattened = cv2.warpPerspective(
            image, M, (dst_width, dst_height),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        info["success"] = True
        return flattened, info

    # Fallback: Nếu không tìm được 4 marker góc → thử contour lớn nhất
    if debug:
        print("[OMR] Không tìm đủ 4 marker góc, thử fallback contour...")

    flattened_fb, info_fb = _fallback_contour_flatten(image, gray, binary, scale, dst_width, dst_height)
    if info_fb["success"]:
        info.update(info_fb)
        return flattened_fb, info

    # Fallback cuối: chỉ resize
    info["method"] = "resize_only"
    flattened = cv2.resize(image, (dst_width, dst_height), interpolation=cv2.INTER_CUBIC)
    return flattened, info


def _fallback_contour_flatten(
    original: np.ndarray,
    gray: np.ndarray,
    binary: np.ndarray,
    scale: float,
    dst_w: int,
    dst_h: int
) -> Tuple[np.ndarray, Dict]:
    """Fallback: tìm contour hình chữ nhật lớn nhất (viền phiếu)."""
    info = {"success": False, "method": "contour_fallback"}

    # Tìm cạnh bằng Canny
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=2)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return original, info

    # Lấy contour lớn nhất
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    h_img, w_img = gray.shape[:2]
    min_sheet_area = w_img * h_img * 0.2

    for cnt in contours[:5]:
        area = cv2.contourArea(cnt)
        if area < min_sheet_area:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if len(approx) == 4:
            # Sắp xếp 4 đỉnh
            pts = approx.reshape(4, 2).astype(np.float32)
            rect = order_points(pts)

            corners_orig = {
                "TL": (rect[0][0] / scale, rect[0][1] / scale),
                "TR": (rect[1][0] / scale, rect[1][1] / scale),
                "BR": (rect[2][0] / scale, rect[2][1] / scale),
                "BL": (rect[3][0] / scale, rect[3][1] / scale),
            }

            M = compute_perspective_transform(corners_orig, dst_w, dst_h)
            flattened = cv2.warpPerspective(
                original, M, (dst_w, dst_h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            info["success"] = True
            info["method"] = "contour_perspective"
            info["corners"] = corners_orig
            return flattened, info

    return original, info


def order_points(pts: np.ndarray) -> np.ndarray:
    """Sắp xếp 4 điểm theo thứ tự: TL, TR, BR, BL."""
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1)

    rect[0] = pts[np.argmin(s)]     # TL: x+y nhỏ nhất
    rect[2] = pts[np.argmax(s)]     # BR: x+y lớn nhất
    rect[1] = pts[np.argmin(d)]     # TR: y-x nhỏ nhất
    rect[3] = pts[np.argmax(d)]     # BL: y-x lớn nhất

    return rect


def refine_with_section_markers(
    flattened: np.ndarray,
    initial_info: Dict
) -> Tuple[np.ndarray, Dict]:
    """
    Tinh chỉnh thêm bằng cách phát hiện marker phân đoạn (section markers)
    trong ảnh đã flatten. Dùng các marker nằm giữa các phần (I, II, III)
    để hiệu chỉnh lại tọa độ cục bộ.

    Returns: (refined_image_or_same, updated_info)
    """
    gray = cv2.cvtColor(flattened, cv2.COLOR_BGR2GRAY) if len(flattened.shape) == 3 else flattened.copy()
    _, binary = preprocess_for_markers(flattened)
    markers = find_square_markers(binary, gray)

    h, w = flattened.shape[:2]

    # Tìm marker ở các vị trí kỳ vọng
    expected = {}
    for name, (ex, ey) in MARKERS.items():
        px, py = ex * w, ey * h
        # Tìm marker gần nhất
        best_dist = float('inf')
        best_m = None
        for m in markers:
            d = np.sqrt((m.cx - px)**2 + (m.cy - py)**2)
            if d < best_dist and d < w * 0.05:  # Trong phạm vi 5% chiều rộng
                best_dist = d
                best_m = m
        if best_m:
            expected[name] = (best_m.cx, best_m.cy)

    initial_info["section_markers_matched"] = len(expected)
    initial_info["section_markers"] = {
        k: {"x": v[0], "y": v[1]} for k, v in expected.items()
    }

    # Tính offset trung bình để hiệu chỉnh
    offsets_x = []
    offsets_y = []
    for name, (mx, my) in expected.items():
        ex, ey = MARKERS[name]
        offsets_x.append(mx - ex * w)
        offsets_y.append(my - ey * h)

    if offsets_x:
        initial_info["avg_offset_x"] = float(np.mean(offsets_x))
        initial_info["avg_offset_y"] = float(np.mean(offsets_y))
        initial_info["max_offset"] = float(max(
            max(abs(x) for x in offsets_x),
            max(abs(y) for y in offsets_y)
        ))

    return flattened, initial_info


# ===================== ENTRY POINT =====================

def detect_and_flatten(
    image_path: str = None,
    image_bytes: bytes = None,
    image_np: np.ndarray = None,
    debug: bool = False
) -> Tuple[np.ndarray, Dict]:
    """
    Entry point chính - nhận ảnh từ nhiều nguồn.

    Args:
        image_path: Đường dẫn file ảnh
        image_bytes: Bytes ảnh (từ upload)
        image_np: Numpy array (BGR)
        debug: In thông tin debug

    Returns:
        (flattened_image, info_dict)
    """
    if image_np is not None:
        image = image_np
    elif image_bytes is not None:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif image_path is not None:
        image = cv2.imread(image_path)
    else:
        raise ValueError("Phải cung cấp image_path, image_bytes, hoặc image_np")

    if image is None:
        raise ValueError("Không thể đọc ảnh")

    # Bước 1: Flatten
    flattened, info = flatten_exam_sheet(image, STD_WIDTH, STD_HEIGHT, debug=debug)

    # Bước 2: Tinh chỉnh bằng section markers
    flattened, info = refine_with_section_markers(flattened, info)

    if debug:
        print(f"[OMR] Method: {info['method']}")
        print(f"[OMR] Markers: {info['markers_found']}")
        print(f"[OMR] Section markers matched: {info.get('section_markers_matched', 0)}")

    return flattened, info
