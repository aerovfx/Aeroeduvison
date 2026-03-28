"""
=============================================================================
PHIẾU TRẢ LỜI TRẮC NGHIỆM - CẤU HÌNH BỐ CỤC CHUẨN
=============================================================================
Dựa trên phân tích mẫu phiếu chuẩn Bộ GD&ĐT:
- Kích thước chuẩn hóa sau flatten: 1200 x 1700 px
- Tọa độ được tính theo tỷ lệ (0-1) so với kích thước chuẩn
- 14+ marker đen vuông cố định dùng làm mốc định vị

Cấu trúc phiếu:
  ┌─────────────────────────────────────────┐
  │  HEADER: Tiêu đề + Thông tin thí sinh  │ SBD  MĐT
  │  ■ (markers góc trên)                  │ ■    ■
  ├─────────────────────────────────────────┤
  │  ■ PHẦN I: 40 câu trắc nghiệm ABCD  ■ │
  │    (4 cột x 10 hàng)                   │
  ├─■──────────────────────────────────── ■─┤
  │  PHẦN II: 8 câu Đúng/Sai (a,b,c,d)    │
  ├─■──────────────────────────────────── ■─┤
  │  ■ PHẦN III: 6 câu điền số           ■ │
  │    (-, dấu phẩy, 0-9 x 5 cột)         │
  └─■──────────────────────────────────── ■─┘
=============================================================================
"""

# Kích thước chuẩn hóa (pixels)
STD_WIDTH = 1200
STD_HEIGHT = 1700

# ===========================================================================
# MARKER ĐÁNH DẤU CỐ ĐỊNH (■) - Tọa độ tỷ lệ (0-1)
# ===========================================================================
# Các marker đen vuông (~15x15px trên ảnh 1200x1700) nằm cố định trên phiếu
# Dùng để: (1) Phát hiện phiếu, (2) Perspective transform, (3) Căn chỉnh chính xác

MARKERS = {
    # === 4 MARKER GÓC NGOÀI (dùng cho perspective transform chính) ===
    "corner_TL": (0.018, 0.155),   # Góc trên-trái (cạnh header)
    "corner_TR": (0.975, 0.155),   # Góc trên-phải
    "corner_BL": (0.018, 0.975),   # Góc dưới-trái
    "corner_BR": (0.975, 0.975),   # Góc dưới-phải

    # === MARKER PHẦN I (cạnh bảng trắc nghiệm 40 câu) ===
    "p1_TL": (0.018, 0.262),      # Trên-trái Phần I
    "p1_TR": (0.975, 0.262),      # Trên-phải Phần I
    "p1_BL": (0.018, 0.565),      # Dưới-trái Phần I
    "p1_BR": (0.975, 0.565),      # Dưới-phải Phần I

    # === MARKER PHẦN II ===
    "p2_BL": (0.018, 0.735),      # Dưới-trái Phần II
    "p2_BR": (0.975, 0.735),      # Dưới-phải Phần II

    # === MARKER PHẦN III ===
    "p3_TL": (0.018, 0.755),      # Trên-trái Phần III
    "p3_TR": (0.975, 0.755),      # Trên-phải Phần III
    "p3_BL": (0.018, 0.975),      # = corner_BL
    "p3_BR": (0.975, 0.975),      # = corner_BR

    # === MARKER SBD / MÃ ĐỀ THI ===
    "sbd_TL": (0.625, 0.018),     # Trên-trái vùng SBD
    "sbd_BR": (0.82, 0.208),      # Dưới-phải vùng SBD
    "mdt_TL": (0.86, 0.018),      # Trên-trái vùng Mã đề
    "mdt_BR": (0.975, 0.145),     # Dưới-phải vùng Mã đề
}

# 4 marker góc chính cho perspective transform
CORNER_MARKERS = ["corner_TL", "corner_TR", "corner_BR", "corner_BL"]

# ===========================================================================
# PHẦN I: 40 CÂU TRẮC NGHIỆM (4 cột x 10 hàng, mỗi câu A/B/C/D)
# ===========================================================================
PART1 = {
    "y_start": 0.280,     # Y đầu tiên (câu 1, 11, 21, 31)
    "y_end":   0.555,     # Y cuối cùng (câu 10, 20, 30, 40)
    "rows": 10,
    "bubble_radius_frac": 0.008,  # Bán kính bubble ~10px
    "groups": [
        # Cột 1: Câu 1-10
        {"q_start": 1,  "A": 0.078, "B": 0.115, "C": 0.153, "D": 0.190},
        # Cột 2: Câu 11-20
        {"q_start": 11, "A": 0.310, "B": 0.348, "C": 0.385, "D": 0.423},
        # Cột 3: Câu 21-30
        {"q_start": 21, "A": 0.548, "B": 0.585, "C": 0.623, "D": 0.660},
        # Cột 4: Câu 31-40
        {"q_start": 31, "A": 0.783, "B": 0.820, "C": 0.858, "D": 0.895},
    ]
}

# ===========================================================================
# PHẦN II: 8 CÂU ĐÚNG/SAI (mỗi câu có 4 mục a, b, c, d)
# ===========================================================================
PART2 = {
    "y_header": 0.610,    # Y dòng header "Câu X / Đúng / Sai"
    "y_start":  0.638,    # Y mục a)
    "y_end":    0.725,    # Y mục d)
    "sub_count": 4,       # a, b, c, d
    "bubble_radius_frac": 0.007,
    "questions": [
        {"q": 1, "dung": 0.052, "sai": 0.088},
        {"q": 2, "dung": 0.168, "sai": 0.205},
        {"q": 3, "dung": 0.278, "sai": 0.315},
        {"q": 4, "dung": 0.393, "sai": 0.428},
        {"q": 5, "dung": 0.520, "sai": 0.555},
        {"q": 6, "dung": 0.632, "sai": 0.668},
        {"q": 7, "dung": 0.742, "sai": 0.778},
        {"q": 8, "dung": 0.852, "sai": 0.888},
    ]
}

# ===========================================================================
# PHẦN III: 6 CÂU ĐIỀN SỐ (dấu -, dấu phẩy, 0-9 mỗi cột)
# ===========================================================================
PART3 = {
    "y_start": 0.790,     # Y hàng dấu trừ (-)
    "y_end":   0.960,     # Y hàng số 9
    "rows": 12,           # -, dấu phẩy, 0, 1, 2, ..., 9
    "row_labels": ["-", ",", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    "bubble_radius_frac": 0.006,
    "questions": [
        # Mỗi câu có 5 cột bubble (5 chữ số)
        {"q": 1, "cols": [0.048, 0.068, 0.088, 0.108, 0.128]},
        {"q": 2, "cols": [0.198, 0.218, 0.238, 0.258, 0.278]},
        {"q": 3, "cols": [0.352, 0.372, 0.392, 0.412, 0.432]},
        {"q": 4, "cols": [0.518, 0.538, 0.558, 0.578, 0.598]},
        {"q": 5, "cols": [0.685, 0.705, 0.725, 0.745, 0.765]},
        {"q": 6, "cols": [0.852, 0.872, 0.892, 0.912, 0.932]},
    ]
}

# ===========================================================================
# SỐ BÁO DANH (6 cột x 10 hàng, 0-9)
# ===========================================================================
SBD = {
    "x_start": 0.648,
    "x_end":   0.808,
    "y_start": 0.028,
    "y_end":   0.205,
    "cols": 6,
    "digits": 10,  # 0-9
}

# ===========================================================================
# MÃ ĐỀ THI (3 cột x 10 hàng, 0-9)
# ===========================================================================
EXAM_CODE = {
    "x_start": 0.870,
    "x_end":   0.962,
    "y_start": 0.028,
    "y_end":   0.145,
    "cols": 3,
    "digits": 10,  # 0-9
}

# ===========================================================================
# VÙNG TÊN HỌC SINH (cho OCR)
# ===========================================================================
STUDENT_NAME = {
    "x_start": 0.40,
    "y_start": 0.168,
    "x_end":   0.82,
    "y_end":   0.228,
}

# ===========================================================================
# CÁC THAM SỐ PHÁT HIỆN MARKER
# ===========================================================================
MARKER_DETECTION = {
    "min_area": 120,       # Diện tích tối thiểu (pixels²)
    "max_area": 3000,      # Diện tích tối đa
    "min_aspect": 0.65,    # Tỷ lệ cạnh min (gần vuông)
    "max_aspect": 1.55,    # Tỷ lệ cạnh max
    "min_fill":  0.50,     # Tỷ lệ fill tối thiểu
    "min_side":  8,        # Cạnh ngắn nhất (px)
}

# ===========================================================================
# THAM SỐ BUBBLE DETECTION
# ===========================================================================
BUBBLE_DETECTION = {
    "dark_threshold_ratio": 0.88,   # Ngưỡng tối = brightness_trung_bình * ratio (0.88 cho bút chì nhạt)
    "min_gap": 5,                    # Khoảng cách min giữa darkest và 2nd darkest (giảm cho pencil nhạt)
    "adaptive_window": 51,           # Window cho adaptive threshold
    "adaptive_C": 12,                # Hằng số trừ cho adaptive threshold
}
