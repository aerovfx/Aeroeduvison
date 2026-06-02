/**
 * translations-extra.ts — Từ điển VI→EN bổ sung cho bộ dịch tự động (autoTranslate).
 * Khoá = chuỗi tiếng Việt nguyên cụm (đã trim). Mở rộng dần để phủ thêm UI.
 * (305 cặp khác đã có sẵn trong translations vi/en của LanguageContext.)
 */
export const EXTRA_VI_EN: Record<string, string> = {
  // ── Hành động / nút chung ──
  'Lưu': 'Save', 'Lưu lại': 'Save', 'Huỷ': 'Cancel', 'Hủy': 'Cancel', 'Xoá': 'Delete', 'Xóa': 'Delete',
  'Sửa': 'Edit', 'Thêm': 'Add', 'Thêm mới': 'Add new', 'Tạo': 'Create', 'Tạo mới': 'Create new',
  'Đóng': 'Close', 'Mở': 'Open', 'Quay lại': 'Back', '← Quay lại': '← Back', 'Tiếp': 'Next', 'Tiếp tục': 'Continue',
  'Tiếp theo': 'Next', 'Trước': 'Previous', 'Xong': 'Done', 'Hoàn thành': 'Complete', 'Hoàn tác': 'Undo',
  'Áp dụng': 'Apply', 'Xác nhận': 'Confirm', 'Gửi': 'Send', 'Tìm': 'Search', 'Tìm kiếm': 'Search',
  'Lọc': 'Filter', 'Sắp xếp': 'Sort', 'Tải lên': 'Upload', 'Tải xuống': 'Download', 'Tải về': 'Download',
  'Xuất': 'Export', 'Nhập': 'Import', 'Xem': 'View', 'Xem thêm': 'See more', 'Xem chi tiết': 'View details',
  'Chỉnh sửa': 'Edit', 'Sao chép': 'Copy', 'Dán': 'Paste', 'Chọn': 'Select', 'Chọn tất cả': 'Select all',
  'Làm lại': 'Retry', 'Thử lại': 'Try again', 'Bắt đầu': 'Start', 'Kết thúc': 'Finish', 'Thoát': 'Exit',
  'Đăng nhập': 'Log in', 'Đăng xuất': 'Log out', 'Đăng ký': 'Sign up', 'Cài đặt': 'Settings',
  'Trang chủ': 'Home', 'Bảng điều khiển': 'Dashboard', 'Hồ sơ': 'Profile', 'Tài khoản': 'Account',
  'Thông báo': 'Notifications', 'Trợ giúp': 'Help', 'Giới thiệu': 'About', 'Liên hệ': 'Contact',

  // ── Trạng thái / thông báo ──
  'Đang tải…': 'Loading…', 'Đang tải...': 'Loading...', 'Đang xử lý…': 'Processing…',
  'Đang lưu…': 'Saving…', 'Đã lưu': 'Saved', 'Thành công': 'Success', 'Thất bại': 'Failed',
  'Lỗi': 'Error', 'Có lỗi xảy ra': 'An error occurred', 'Không có dữ liệu': 'No data',
  'Chưa có dữ liệu': 'No data yet', 'Trống': 'Empty', 'Hoạt động': 'Active', 'Tạm dừng': 'Paused',
  'Đang chờ': 'Pending', 'Đang hoạt động': 'Active', 'Trực tuyến': 'Online', 'Ngoại tuyến': 'Offline',
  'Bắt buộc': 'Required', 'Tuỳ chọn': 'Optional', 'Mặc định': 'Default',

  // ── Giáo dục / vai trò ──
  'Học sinh': 'Student', 'Giáo viên': 'Teacher', 'Phụ huynh': 'Parent', 'Quản trị': 'Admin',
  'Lớp học': 'Class', 'Lớp': 'Class', 'Môn học': 'Subject', 'Khối': 'Grade', 'Bài học': 'Lesson',
  'Bài tập': 'Assignment', 'Bài thi': 'Exam', 'Đề thi': 'Exam', 'Câu hỏi': 'Question', 'Đáp án': 'Answer',
  'Điểm': 'Score', 'Điểm số': 'Score', 'Kết quả': 'Result', 'Tiến độ': 'Progress', 'Khoá học': 'Course',
  'Ngân hàng câu hỏi': 'Question Bank', 'Ngân hàng đề': 'Exam Bank', 'Tạo đề thi': 'Create Exam',
  'Hướng nghiệp': 'Career Guidance', 'Điểm chuẩn': 'Admission Score', 'Trường': 'University', 'Ngành': 'Major',

  // ── Drone / game ──
  'Nhiệm vụ': 'Missions', 'Thách đấu': 'Challenge', 'Tạo phòng': 'Create Room', 'Tham gia phòng': 'Join Room',
  'Mã phòng': 'Room Code', 'Tên phi công': 'Pilot Name', 'Bản đồ': 'Map', 'Bản đồ thật': 'Real Map',
  'Bản đồ dựng sẵn': 'Preset Map', 'Cấp độ': 'Level', 'Cấp': 'Level', 'Tốc độ': 'Speed', 'Độ cao': 'Altitude',
  'Pin': 'Battery', 'Máu': 'HP', 'Đạn': 'Ammo', 'Tầm bay': 'Range', 'Điểm màn': 'Run Score', 'Tổng': 'Total',
  'Trạm sạc': 'Charging Station', 'Mục tiêu': 'Target', 'Đối thủ': 'Opponent', 'Về đích': 'Finish',
  'Hạ gục': 'Knocked Down', 'Vào bay': 'Fly', 'Rời phòng': 'Leave Room', 'Phòng đầy': 'Room Full',
  'Bay lên độ cao 5m và giữ ổn định trong 10 giây': 'Climb to 5m and hold steady for 10 seconds',
  'Cất cánh': 'Take Off', 'Vòng đầu': 'First Gate', 'Ba vòng zigzag': 'Three Zigzag Gates',
  'Tốc độ trial': 'Time Trial', 'Giao hàng': 'Cargo Delivery', 'Chọn cấp độ': 'Select Level',
  'Chọn chế độ chơi': 'Choose game mode', 'Chọn mẫu drone': 'Choose drone model',
  'Quét để tham gia': 'Scan to join', 'Copy link mời': 'Copy invite link', 'Đã copy link': 'Link copied',

  // ── Đồ thị / lab ──
  'Đồ thị': 'Graph', 'Vẽ đồ thị': 'Plot Graph', 'Hàm số': 'Function', 'Dựng hình': 'Construct',
  'Điểm mới': 'New Point', 'Đoạn thẳng': 'Segment', 'Đường thẳng': 'Line', 'Đa giác': 'Polygon',
  'Đường tròn': 'Circle', 'Trung điểm': 'Midpoint', 'Giao điểm': 'Intersection', 'Song song': 'Parallel',
  'Vuông góc': 'Perpendicular', 'Đo góc': 'Measure Angle', 'Di chuyển': 'Move', 'Đo': 'Measure',
  'Xoá hình': 'Clear', 'Mẫu nhanh': 'Quick Presets', 'Phòng thí nghiệm': 'Laboratory', 'Thí nghiệm': 'Experiment',

  // ── Thời gian ──
  'Hôm nay': 'Today', 'Hôm qua': 'Yesterday', 'Tuần này': 'This week', 'Tháng này': 'This month',
  'phút': 'min', 'giây': 'sec', 'giờ': 'h', 'ngày': 'day', 'tuần': 'week', 'tháng': 'month', 'năm': 'year',
}
