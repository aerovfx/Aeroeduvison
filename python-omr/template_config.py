"""
=============================================================================
TEMPLATE CONFIG - Cấu hình chuẩn từ MẪU PHIẾU TRẢ LỜI TRẮC NGHIỆM GỐC
=============================================================================
Dữ liệu được trích xuất TRỰC TIẾP từ ảnh template chuẩn đính kèm.

Phân tích visual cho thấy 22 marker đen vuông (■) phân bố:
  - 5 marker dọc cạnh trên PHẦN I (giữa các cột câu hỏi)
  - 2 marker cạnh dưới PHẦN I / trên PHẦN II (trái + phải)
  - 2 marker cạnh dưới PHẦN II / trên PHẦN III (trái + phải)
  - 7 marker dọc cạnh trên PHẦN III (giữa các câu)
  - 6 marker dọc cạnh dưới PHẦN III (+ góc dưới)

Tọa độ dạng tỷ lệ (0.0 - 1.0) so với kích thước phiếu.
=============================================================================
"""

# Kích thước chuẩn hóa đích (pixels) sau khi flatten
STD_W = 1200
STD_H = 1680  # Tỷ lệ ~5:7 (A4 portrait)

# ===========================================================================
# 22 MARKER ĐEN CỐ ĐỊNH (■) - Tọa độ (x_frac, y_frac)
# ===========================================================================
# Được đo trực tiếp từ template gốc đính kèm
#
# Quy ước đặt tên:
#   p1 = PHẦN I, p2 = PHẦN II, p3 = PHẦN III
#   t = top, b = bottom, l = left, r = right
#   c12 = giữa cột 1 và cột 2, ...

TEMPLATE_MARKERS = {
    # ─── HÀNG MARKER TRÊN PHẦN I (y ≈ 0.315) ───
    # 5 marker nằm ngang phía trên bảng 40 câu trắc nghiệm
    # Nằm giữa các cụm cột: |■ Col1-10 ■ Col11-20 ■ Col21-30 ■ Col31-40 ■|
    "p1_t_left":   (0.022, 0.315),   # ■ trái ngoài cùng, trên PHẦN I
    "p1_t_c12":    (0.265, 0.315),   # ■ giữa cột 1-10 và 11-20
    "p1_t_c23":    (0.498, 0.315),   # ■ giữa cột 11-20 và 21-30
    "p1_t_c34":    (0.730, 0.315),   # ■ giữa cột 21-30 và 31-40
    "p1_t_right":  (0.975, 0.315),   # ■ phải ngoài cùng, trên PHẦN I

    # ─── HÀNG MARKER DƯỚI PHẦN I (y ≈ 0.570) ───
    # 2 marker ở 2 bên cạnh dưới PHẦN I
    "p1_b_left":   (0.022, 0.570),   # ■ trái, dưới PHẦN I
    "p1_b_right":  (0.975, 0.570),   # ■ phải, dưới PHẦN I

    # ─── HÀNG MARKER DƯỚI PHẦN II / TRÊN PHẦN III (y ≈ 0.700) ───
    "p2_b_left":   (0.022, 0.700),   # ■ trái, ranh giới PHẦN II-III
    "p2_b_right":  (0.975, 0.700),   # ■ phải, ranh giới PHẦN II-III

    # ─── HÀNG MARKER TRÊN PHẦN III (y ≈ 0.718) ───
    # 7 marker nằm ngang phía trên bảng 6 câu điền số
    # |■ Câu1 ■ Câu2 ■ Câu3 ■ Câu4 ■ Câu5 ■ Câu6 ■|
    "p3_t_left":   (0.022, 0.718),   # ■ trái PHẦN III
    "p3_t_c12":    (0.180, 0.718),   # ■ giữa Câu 1-2
    "p3_t_c23":    (0.345, 0.718),   # ■ giữa Câu 2-3
    "p3_t_c34":    (0.510, 0.718),   # ■ giữa Câu 3-4
    "p3_t_c45":    (0.670, 0.718),   # ■ giữa Câu 4-5
    "p3_t_c56":    (0.835, 0.718),   # ■ giữa Câu 5-6
    "p3_t_right":  (0.975, 0.718),   # ■ phải PHẦN III

    # ─── HÀNG MARKER DƯỚI PHẦN III / ĐÁY PHIẾU (y ≈ 0.980) ───
    # 6 marker dọc cạnh dưới
    "p3_b_left":   (0.022, 0.980),   # ■ góc dưới-trái
    "p3_b_c12":    (0.180, 0.980),   # ■ dưới, giữa Câu 1-2
    "p3_b_c23":    (0.345, 0.980),   # ■ dưới, giữa Câu 2-3
    "p3_b_c34":    (0.510, 0.980),   # ■ dưới, giữa Câu 3-4
    "p3_b_c45":    (0.670, 0.980),   # ■ dưới, giữa Câu 4-5
    "p3_b_right":  (0.975, 0.980),   # ■ góc dưới-phải
}

# Nhóm marker theo vị trí (dùng cho matching linh hoạt)
MARKER_GROUPS = {
    "top_row":    ["p1_t_left", "p1_t_c12", "p1_t_c23", "p1_t_c34", "p1_t_right"],
    "mid_row":    ["p1_b_left", "p1_b_right"],
    "mid2_row":   ["p2_b_left", "p2_b_right"],
    "p3_top":     ["p3_t_left", "p3_t_c12", "p3_t_c23", "p3_t_c34", "p3_t_c45", "p3_t_c56", "p3_t_right"],
    "bottom_row": ["p3_b_left", "p3_b_c12", "p3_b_c23", "p3_b_c34", "p3_b_c45", "p3_b_right"],
}

# 4 marker góc chính (dùng cho initial perspective transform)
CORNER_MARKER_NAMES = ["p1_t_left", "p1_t_right", "p3_b_right", "p3_b_left"]

# ===========================================================================
# BỐ CỤC BUBBLE CHÍNH XÁC (đo từ template gốc)
# ===========================================================================

# ─── PHẦN I: 40 câu trắc nghiệm A/B/C/D ───
# 4 cụm cột, mỗi cụm 10 câu, mỗi câu 4 lựa chọn
PART1_LAYOUT = {
    "y_first":  0.342,     # Tâm Y hàng đầu tiên (câu 1, 11, 21, 31)
    "y_last":   0.555,     # Tâm Y hàng cuối cùng (câu 10, 20, 30, 40)
    "rows": 10,
    "bubble_r": 0.0075,    # Bán kính bubble (tỷ lệ theo width)
    "groups": [
        # Cụm câu 1-10
        {
            "q0": 1,
            "A": 0.052, "B": 0.082, "C": 0.112, "D": 0.142,
            "label_x": 0.032,   # X số câu hỏi
        },
        # Cụm câu 11-20
        {
            "q0": 11,
            "A": 0.286, "B": 0.316, "C": 0.346, "D": 0.376,
            "label_x": 0.268,
        },
        # Cụm câu 21-30
        {
            "q0": 21,
            "A": 0.520, "B": 0.550, "C": 0.580, "D": 0.610,
            "label_x": 0.502,
        },
        # Cụm câu 31-40
        {
            "q0": 31,
            "A": 0.752, "B": 0.782, "C": 0.812, "D": 0.842,
            "label_x": 0.735,
        },
    ],
}

# ─── PHẦN II: 8 câu Đúng/Sai (a,b,c,d mỗi câu) ───
PART2_LAYOUT = {
    "y_header": 0.590,     # Y dòng header "Câu X"
    "y_first":  0.618,     # Y tâm mục a)
    "y_last":   0.690,     # Y tâm mục d)
    "sub_count": 4,        # a, b, c, d
    "sub_labels": ["a", "b", "c", "d"],
    "bubble_r": 0.0065,
    "questions": [
        {"q": 1, "dung": 0.048, "sai": 0.078},
        {"q": 2, "dung": 0.148, "sai": 0.178},
        {"q": 3, "dung": 0.268, "sai": 0.298},
        {"q": 4, "dung": 0.368, "sai": 0.398},
        {"q": 5, "dung": 0.510, "sai": 0.540},
        {"q": 6, "dung": 0.618, "sai": 0.648},
        {"q": 7, "dung": 0.738, "sai": 0.768},
        {"q": 8, "dung": 0.858, "sai": 0.888},
    ],
}

# ─── PHẦN III: 6 câu điền số ───
# Mỗi câu: 1 cột dấu (-), 1 cột dấu phẩy (,), rồi 5 cột số (0-9)
# Tổng = 12 hàng: -, dấu phẩy, 0, 1, 2, ..., 9
PART3_LAYOUT = {
    "y_first":  0.745,     # Y hàng dấu trừ (-)
    "y_last":   0.968,     # Y hàng số 9
    "rows": 12,
    "row_labels": ["-", ",", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    "bubble_r": 0.005,
    "questions": [
        # Mỗi câu có nhiều cột: cột 1 = dấu (-), cột 2 = dấu phẩy, cột 3-7 = chữ số
        # Nhưng thực tế: dấu trừ nằm ở hàng 0, dấu phẩy ở hàng 1
        # Mỗi câu ~5 cột bubble
        {"q": 1, "cols": [0.042, 0.060, 0.078, 0.096, 0.114]},
        {"q": 2, "cols": [0.205, 0.223, 0.241, 0.259, 0.277]},
        {"q": 3, "cols": [0.370, 0.388, 0.406, 0.424, 0.442]},
        {"q": 4, "cols": [0.535, 0.553, 0.571, 0.589, 0.607]},
        {"q": 5, "cols": [0.695, 0.713, 0.731, 0.749, 0.767]},
        {"q": 6, "cols": [0.860, 0.878, 0.896, 0.914, 0.932]},
    ],
}

# ─── SỐ BÁO DANH (7. Số báo danh) ───
SBD_LAYOUT = {
    "x_first": 0.660,      # X cột đầu tiên
    "x_last":  0.810,      # X cột cuối cùng
    "y_first": 0.035,      # Y hàng 0
    "y_last":  0.195,      # Y hàng 9
    "cols": 6,
    "rows": 10,             # 0-9
    "bubble_r": 0.006,
}

# ─── MÃ ĐỀ THI (8. Mã đề thi) ───
EXAM_CODE_LAYOUT = {
    "x_first": 0.875,
    "x_last":  0.960,
    "y_first": 0.035,
    "y_last":  0.195,
    "cols": 3,
    "rows": 10,             # 0-9
    "bubble_r": 0.006,
}

# ─── VÙNG TÊN HỌC SINH (4. Họ và tên thí sinh) ───
STUDENT_NAME_REGION = {
    "x_start": 0.32,
    "y_start": 0.160,
    "x_end":   0.62,
    "y_end":   0.195,
}

# ===========================================================================
# KÍCH THƯỚC MARKER ĐEN CHUẨN (pixels trên ảnh STD_W x STD_H)
# ===========================================================================
MARKER_SIZE_PX = 18          # Cạnh marker ~ 18px trên ảnh 1200x1680
MARKER_SEARCH_RADIUS = 45    # Phạm vi tìm kiếm quanh vị trí kỳ vọng (px)

# ===========================================================================
# CÁC THAM SỐ THUẬT TOÁN
# ===========================================================================
DETECTION_PARAMS = {
    # Marker detection
    "marker_min_area": 80,
    "marker_max_area": 2500,
    "marker_min_aspect": 0.55,
    "marker_max_aspect": 1.8,
    "marker_min_fill": 0.45,
    "marker_min_side": 7,
    "marker_max_brightness": 110,  # Marker phải tối hơn giá trị này

    # Bubble detection
    "bubble_dark_ratio": 0.70,     # threshold = mean_region * ratio
    "bubble_min_gap": 7,           # Khoảng cách min darkest vs 2nd
    "bubble_sample_method": "gaussian",  # gaussian | uniform

    # Template matching
    "match_threshold": 0.55,       # Min correlation cho template match
    "max_offset_tolerance": 0.03,  # Max offset cho phép (tỷ lệ)
}
