/**
 * LanguageContext — Tiếng Việt / English bilingual system
 * Persists to localStorage key 'lang'
 */
import React, { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'vi' | 'en'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

// ─── Translation table ────────────────────────────────────────────────────────

export const translations: Record<Language, Record<string, string>> = {
  vi: {
    // ── Navbar ────────────────────────────────────────────────
    search:             'Tìm kiếm...',
    searchPlaceholder:  'Tìm kiếm trang, tính năng...',
    noResults:          'Không tìm thấy kết quả',
    notifications:      'Thông báo',
    profile:            'Hồ sơ cá nhân',
    settings:           'Cài đặt',
    logout:             'Đăng xuất',
    loading:            'Đang tải...',
    language:           'Ngôn ngữ',
    vietnamese:         'Tiếng Việt',
    english:            'English',

    // ── Sidebar — section titles ──────────────────────────────
    sectionOverview:    'Tổng quan',
    sectionLearning:    'Học tập',
    sectionTracking:    'Theo dõi',
    sectionLabsTools:   'Labs & Công cụ',
    sectionSettings:    'Cài đặt',
    sectionSystem:      'Hệ thống',
    sectionMonitor:     'Giám sát',
    sectionOperations:  'Vận hành',
    sectionExam:        'Ra đề & Kiểm tra',
    sectionGrading:     'Chấm thi & Báo cáo',
    sectionContent:     'Soạn bài & AI',
    sectionLMS:         'Khoá học LMS',
    sectionManage:      'Quản lý',

    // ── Sidebar — Student routes ──────────────────────────────
    routeDashboard:     'Dashboard',
    routeAnalytics:     'Phân tích',
    routeAchievements:  'Thành tích',
    routeAiTutor:       'Gia Sư AI',
    routeLearningPath:  'Lộ trình học',
    routeExamPrep:      'Ôn thi',
    routeSelfStudy:     'Tự ôn luyện',
    routeCareer:        'Hướng nghiệp',
    routeProgress:      'Tiến độ',
    routeEmotion:       'Cảm xúc',
    routeAssignments:   'Bài tập',
    routeGraph:         'Vẽ đồ thị',
    routeLabTwin:       'LabTwin',
    routeAura:          'Aura',
    routeCircuit:       'IoT',
    routeStem:          'STEM Projects',
    routeNotes:         'Ghi chú',
    routeScrum:         'Scrum Board',
    routeContacts:      'Danh bạ',

    // ── Sidebar — Teacher routes ──────────────────────────────
    routeAiDashboard:   'AI Dashboard',
    routeClassMgmt:     'Quản lý lớp',
    routeEmotionMap:    'Bản đồ cảm xúc',
    routeExamMatrix:    'Ma trận đề',
    routeQuestionBank:  'Ngân hàng câu hỏi',
    routeExams:         'Đề thi',
    routeOnlineExam:    'Phòng thi online',
    routeExamGrading:   'Chấm thi',
    routeExamReports:   'Báo cáo thi',
    routeAiContent:     'AI Content Gen',
    routeDigitize:      'Số hóa tài liệu',
    routeLatex:         'Soạn LaTeX',
    routeTranscript:    'Transcript',
    routePathBuilder:   'Learning Paths',
    routeMyCourses:     'Khoá học của tôi',
    routeCreateCourse:  'Tạo khoá học',
    routeClasses:       'Lớp học',
    routeCameraClass:   'Camera lớp',
    routeEnvironment:   'Môi trường',
    routeCalendar:      'Lịch trình',
    routeApiKeys:       'API Keys',
    routeProfKG:        'Cây tri thức GV',
    routeKnowledgeGraph:'Cây tri thức',
    // Student extras
    routeForYou:        'Dành cho bạn',
    routeDaily:         'Hôm nay',
    routeMyTeachers:    'GV của tôi',
    routeExamRooms:     'Phòng thi',
    routePixelGames:    'Game Pixel',
    routeSchedule:      'Thời khoá biểu',
    routeGames:         'Game học tập',
    routeWishlist:      'Yêu thích',
    routePurchase:      'Lịch sử mua',
    // Teacher extras
    routeSprint:        'Sprint AI',
    routeTaodethi:      'Tạo đề thi',
    routeLessonPlans:   'Giáo án',
    routeStudentRequests:'Yêu cầu HS',
    routeGradeBook:     'Sổ điểm',
    routeNewsCompose:   'Soạn tin',
    // Admin extras
    routeAdminUsers:    'Quản lý người dùng',
    routeInsights:      'Thông tin chuyên sâu',
    routeAdminPayments: 'Thanh toán',
    routeRsExperiments: 'A/B Reco',
    routeNewsReview:    'Duyệt tin',
    // Common
    routeDocs:          'Tài liệu',
    routeNews:          'Tin tức',
    // Section headers
    sectionStore:       'Cửa hàng',
    sectionHelp:        'Trợ giúp',

    // ── Sidebar — Admin routes ────────────────────────────────
    routeAdminOverview: 'Tổng quan',
    routeStudents:      'Học sinh',
    routeTeachers:      'Giáo viên',
    routeAtRisk:        'Cảnh báo rủi ro',
    routeAgents:        'Chat Agents',
    routeCamera:        'Camera trường',
    routeIoT:           'IoT Gateway',
    routeAdminEmotion:    'Cảm xúc',
    routeContent:         'Nội dung',
    routeAdminCategories: 'Danh mục',
    routeOperations:      'Vận hành',
    routeModels:        'AI Models',
    routeAdminSettings: 'Cài đặt',

    // ── Sidebar — Collapse ────────────────────────────────────
    collapse:           'Thu gọn',
    expand:             'Mở rộng',

    // ── Auth pages ────────────────────────────────────────────
    loginTitle:         'Đăng nhập',
    loginSubtitle:      'Chào mừng trở lại!',
    loginButton:        'Đăng nhập',
    loginLoading:       'Đang đăng nhập...',
    loginNoAccount:     'Chưa có tài khoản?',
    loginRegisterLink:  'Đăng ký ngay',
    loginError:         'Email hoặc mật khẩu không đúng',
    loginOrContinue:    'Hoặc tiếp tục với',
    loginWithGoogle:    'Đăng nhập với Google',
    loginGoogleLoading: 'Đang kết nối Google...',
    loginGoogleError:   'Đăng nhập Google thất bại, vui lòng thử lại',

    registerTitle:      'Tạo tài khoản',
    registerSubtitle:   'Bắt đầu hành trình học tập của bạn',
    registerButton:     'Đăng ký',
    registerLoading:    'Đang tạo tài khoản...',
    registerHasAccount: 'Đã có tài khoản?',
    registerLoginLink:  'Đăng nhập',
    registerError:      'Đăng ký thất bại. Vui lòng thử lại.',

    forgotTitle:        'Quên mật khẩu',
    forgotSubtitle:     'Nhập email để nhận link đặt lại mật khẩu',
    forgotButton:       'Gửi link đặt lại',
    forgotLoading:      'Đang gửi...',
    forgotSuccess:      'Kiểm tra email của bạn để đặt lại mật khẩu.',
    forgotBackToLogin:  'Quay lại đăng nhập',

    resetTitle:         'Đặt lại mật khẩu',
    resetSubtitle:      'Tạo mật khẩu mới cho tài khoản của bạn',
    resetButton:        'Đặt lại mật khẩu',
    resetSuccess:       'Mật khẩu đã được cập nhật. Đang chuyển hướng...',

    // ── Form fields ───────────────────────────────────────────
    fieldEmail:         'Email',
    fieldPassword:      'Mật khẩu',
    fieldNewPassword:   'Mật khẩu mới',
    fieldConfirmPwd:    'Xác nhận mật khẩu',
    fieldFullName:      'Họ và tên',
    fieldName:          'Tên',
    fieldPhone:         'Số điện thoại',
    fieldRole:          'Vai trò',

    forgotPassword:     'Quên mật khẩu?',
    showPassword:       'Hiện mật khẩu',
    hidePassword:       'Ẩn mật khẩu',

    // ── Validation ────────────────────────────────────────────
    validEmail:         'Email không hợp lệ',
    validPwdMin6:       'Mật khẩu tối thiểu 6 ký tự',
    validPwdMin8:       'Mật khẩu tối thiểu 8 ký tự',
    validPwdMatch:      'Mật khẩu không khớp',
    validNameMin2:      'Tên tối thiểu 2 ký tự',

    // ── Common UI actions ─────────────────────────────────────
    save:               'Lưu',
    saveChanges:        'Lưu thay đổi',
    cancel:             'Huỷ',
    confirm:            'Xác nhận',
    delete:             'Xoá',
    edit:               'Chỉnh sửa',
    add:                'Thêm',
    create:             'Tạo mới',
    close:              'Đóng',
    back:               'Quay lại',
    next:               'Tiếp theo',
    submit:             'Gửi',
    export:             'Xuất',
    import:             'Nhập',
    refresh:            'Làm mới',
    filter:             'Lọc',
    sort:               'Sắp xếp',
    searchAction:       'Tìm kiếm',
    viewAll:            'Xem tất cả',
    learnMore:          'Tìm hiểu thêm',
    download:           'Tải xuống',
    upload:             'Tải lên',
    retry:              'Thử lại',
    apply:              'Áp dụng',
    reset:              'Đặt lại',
    enable:             'Bật',
    disable:            'Tắt',
    connect:            'Kết nối',
    disconnect:         'Ngắt kết nối',

    // ── Status labels ─────────────────────────────────────────
    active:             'Hoạt động',
    inactive:           'Không hoạt động',
    online:             'Trực tuyến',
    offline:            'Ngoại tuyến',
    pending:            'Đang chờ',
    completed:          'Hoàn thành',
    failed:             'Thất bại',
    error:              'Lỗi',
    success:            'Thành công',
    warning:            'Cảnh báo',
    unknown:            'Không xác định',
    normal:             'Bình thường',

    // ── Admin Overview ────────────────────────────────────────
    adminOverviewTitle:     'Bảng điều khiển',
    adminOverviewSubtitle:  'Tổng quan hệ thống theo thời gian thực',
    totalStudents:          'Tổng học sinh',
    totalTeachers:          'Tổng giáo viên',
    activeClasses:          'Lớp đang học',
    systemLoad:             'Tải hệ thống',
    engagementRate:         'Tỷ lệ tương tác',
    atRiskStudents:         'Học sinh có nguy cơ',
    recentActivity:         'Hoạt động gần đây',
    systemHealth:           'Sức khỏe hệ thống',
    networkLoad:            'Tải mạng',
    securityLogs:           'Nhật ký bảo mật',
    moduleStatus:           'Trạng thái module',
    liveMetrics:            'Chỉ số thời gian thực',

    // ── Admin IoT ─────────────────────────────────────────────
    iotTitle:           'IoT Gateway Hub',
    iotSubtitle:        'Quản lý thiết bị IoT toàn trường',
    totalDevices:       'Tổng thiết bị',
    onlineDevices:      'Đang kết nối',
    offlineDevices:     'Mất kết nối',
    alertDevices:       'Cảnh báo',
    mqttConfig:         'Cấu hình MQTT',
    deviceName:         'Tên thiết bị',
    deviceType:         'Loại',
    deviceStatus:       'Trạng thái',
    deviceLocation:     'Vị trí',
    capabilities:       'Khả năng',
    lastSeen:           'Lần cuối',
    actions:            'Thao tác',
    noDevices:          'Không tìm thấy thiết bị',
    searchDevices:      'Tìm kiếm thiết bị...',

    // ── Admin Operations ──────────────────────────────────────
    opsTitle:           'Trung tâm Vận hành',
    opsSubtitle:        'Giám sát & điều hành hệ thống',
    cpuUsage:           'CPU',
    ramUsage:           'RAM',
    latency:            'Độ trễ',
    fps:                'FPS',
    automations:        'Tự động hóa',
    runAutomation:      'Chạy',
    runningAutomation:  'Đang chạy...',
    backup:             'Sao lưu dữ liệu',
    backupNow:          'Sao lưu ngay',
    backupHistory:      'Lịch sử sao lưu',
    importData:         'Nhập dữ liệu',
    dropFiles:          'Kéo thả file vào đây hoặc',
    browseFiles:        'chọn file',
    importHistory:      'Lịch sử nhập',
    restore:            'Khôi phục',
    backupSize:         'Kích thước',
    backupDate:         'Ngày sao lưu',
    backupType:         'Loại',

    // ── Admin Camera ──────────────────────────────────────────
    cameraTitle:        'Trung tâm Giám sát',
    cameraSubtitle:     'Theo dõi camera toàn trường',
    allCameras:         'Tất cả camera',
    addCamera:          'Thêm camera',
    recordingMode:      'Chế độ ghi hình',
    liveView:           'Xem trực tiếp',
    recordings:         'Ghi hình',
    fullscreen:         'Toàn màn hình',
    ptzControl:         'Điều khiển PTZ',
    noSignal:           'Không có tín hiệu',
    cameraOnline:       'Camera hoạt động',
    cameraOffline:      'Camera ngoại tuyến',
    gridSize:           'Kích thước lưới',

    // ── Admin Emotion ─────────────────────────────────────────
    emotionTitle:       'Cảm xúc & Mức độ tương tác',
    emotionSubtitle:    'Giám sát trạng thái cảm xúc học sinh',
    engagementHeatmap:  'Bản đồ tương tác',
    emotionDist:        'Phân bố cảm xúc',
    classSnapshots:     'Ảnh chụp lớp học',
    today:              'Hôm nay',
    yesterday:          'Hôm qua',
    thisWeek:           'Tuần này',

    // ── Admin Content ─────────────────────────────────────────
    contentTitle:       'Nội dung & Chương trình',
    contentSubtitle:    'Quản lý và đánh giá chất lượng nội dung học tập',
    allContent:         'Tất cả',
    approved:           'Đã duyệt',
    draft:              'Bản nháp',
    review:             'Chờ duyệt',
    quality:            'Chất lượng',
    aiSuggestion:       'Gợi ý AI',
    viewSuggestion:     'Xem gợi ý',
    hideSuggestion:     'Ẩn gợi ý',
    views:              'Lượt xem',
    completionRate:     'Tỷ lệ hoàn thành',
    searchContent:      'Tìm kiếm nội dung...',
    sortByDate:         'Ngày cập nhật',
    sortByQuality:      'Chất lượng',
    sortByViews:        'Lượt xem',

    // ── Dashboard Home ────────────────────────────────────────
    welcomeBack:        'Chào mừng trở lại',
    overallProgress:    'Tổng quan & Tiến độ học tập',
    learningStreak:     'Chuỗi học liên tiếp',
    totalXP:            'Tổng XP',
    currentLevel:       'Cấp độ hiện tại',
    xpToNext:           'XP lên cấp tiếp',
    todayGoal:          'Mục tiêu hôm nay',
    continueLearn:      'Tiếp tục học',
    myCompetencies:     'Năng lực của tôi',
    recentCourses:      'Khoá học gần đây',
    upcomingEvents:     'Sự kiện sắp tới',

    // ── Page Fallback ─────────────────────────────────────────
    pageBuilding:       'Trang đang được xây dựng',
    pageSoon:           'Tính năng này sẽ sớm ra mắt.',
    goHome:             'Về trang chủ',

    // ── Error states ──────────────────────────────────────────
    notFound:           'Không tìm thấy trang',
    unauthorized:       'Bạn không có quyền truy cập trang này',
    serverError:        'Lỗi máy chủ, vui lòng thử lại sau',
    networkError:       'Lỗi kết nối mạng',
    backendUnavailable: 'Hệ thống xác thực đang bảo trì, vui lòng thử lại sau ít phút',
  },

  en: {
    // ── Navbar ────────────────────────────────────────────────
    search:             'Search...',
    searchPlaceholder:  'Search pages, features...',
    noResults:          'No results found',
    notifications:      'Notifications',
    profile:            'Profile',
    settings:           'Settings',
    logout:             'Log out',
    loading:            'Loading...',
    language:           'Language',
    vietnamese:         'Tiếng Việt',
    english:            'English',

    // ── Sidebar — section titles ──────────────────────────────
    sectionOverview:    'Overview',
    sectionLearning:    'Learning',
    sectionTracking:    'Tracking',
    sectionLabsTools:   'Labs & Tools',
    sectionSettings:    'Settings',
    sectionSystem:      'System',
    sectionMonitor:     'Monitoring',
    sectionOperations:  'Operations',
    sectionExam:        'Exams & Testing',
    sectionGrading:     'Grading & Reports',
    sectionContent:     'Content & AI',
    sectionLMS:         'LMS Courses',
    sectionManage:      'Management',

    // ── Sidebar — Student routes ──────────────────────────────
    routeDashboard:     'Dashboard',
    routeAnalytics:     'Analytics',
    routeAchievements:  'Achievements',
    routeAiTutor:       'AI Tutor',
    routeLearningPath:  'Learning Path',
    routeExamPrep:      'Exam Prep',
    routeSelfStudy:     'Self-study',
    routeCareer:        'Career Guidance',
    routeProgress:      'Progress',
    routeEmotion:       'Emotion',
    routeAssignments:   'Assignments',
    routeGraph:         'Graph',
    routeLabTwin:       'LabTwin',
    routeAura:          'Aura',
    routeCircuit:       'IoT',
    routeStem:          'STEM Projects',
    routeNotes:         'Notes',
    routeScrum:         'Scrum Board',
    routeContacts:      'Contacts',

    // ── Sidebar — Teacher routes ──────────────────────────────
    routeAiDashboard:   'AI Dashboard',
    routeClassMgmt:     'Class Management',
    routeEmotionMap:    'Emotion Map',
    routeExamMatrix:    'Exam Matrix',
    routeQuestionBank:  'Question Bank',
    routeExams:         'Exams',
    routeOnlineExam:    'Online Exam Room',
    routeExamGrading:   'Exam Grading',
    routeExamReports:   'Exam Reports',
    routeAiContent:     'AI Content Gen',
    routeDigitize:      'Digitize Documents',
    routeLatex:         'LaTeX Editor',
    routeTranscript:    'Transcript',
    routePathBuilder:   'Learning Paths',
    routeMyCourses:     'My Courses',
    routeCreateCourse:  'Create Course',
    routeClasses:       'Classes',
    routeCameraClass:   'Class Cameras',
    routeEnvironment:   'Environment',
    routeCalendar:      'Calendar',
    routeApiKeys:       'API Keys',
    routeProfKG:        'Teacher KG',
    routeKnowledgeGraph:'Knowledge Graph',
    // Student extras
    routeForYou:        'For You',
    routeDaily:         'Today',
    routeMyTeachers:    'My Teachers',
    routeExamRooms:     'Exam Rooms',
    routePixelGames:    'Pixel Games',
    routeSchedule:      'Schedule',
    routeGames:         'Learning Games',
    routeWishlist:      'Wishlist',
    routePurchase:      'Purchase History',
    // Teacher extras
    routeSprint:        'Sprint AI',
    routeTaodethi:      'Exam Creator',
    routeLessonPlans:   'Lesson Plans',
    routeStudentRequests:'Student Requests',
    routeGradeBook:     'Grade Book',
    routeNewsCompose:   'Compose News',
    // Admin extras
    routeAdminUsers:    'Users',
    routeInsights:      'Insights',
    routeAdminPayments: 'Payments',
    routeRsExperiments: 'A/B Reco',
    routeNewsReview:    'News Review',
    // Common
    routeDocs:          'Docs',
    routeNews:          'News',
    // Section headers
    sectionStore:       'Store',
    sectionHelp:        'Help',

    // ── Sidebar — Admin routes ────────────────────────────────
    routeAdminOverview: 'Overview',
    routeStudents:      'Students',
    routeTeachers:      'Teachers',
    routeAtRisk:        'At-Risk Alerts',
    routeAgents:        'Chat Agents',
    routeCamera:        'School Cameras',
    routeIoT:           'IoT Gateway',
    routeAdminEmotion:    'Emotion',
    routeContent:         'Content',
    routeAdminCategories: 'Categories',
    routeOperations:      'Operations',
    routeModels:        'AI Models',
    routeAdminSettings: 'Settings',

    // ── Sidebar — Collapse ────────────────────────────────────
    collapse:           'Collapse',
    expand:             'Expand',

    // ── Auth pages ────────────────────────────────────────────
    loginTitle:         'Sign in',
    loginSubtitle:      'Welcome back!',
    loginButton:        'Sign in',
    loginLoading:       'Signing in...',
    loginNoAccount:     "Don't have an account?",
    loginRegisterLink:  'Sign up',
    loginError:         'Invalid email or password',
    loginOrContinue:    'Or continue with',
    loginWithGoogle:    'Sign in with Google',
    loginGoogleLoading: 'Connecting to Google...',
    loginGoogleError:   'Google sign-in failed, please try again',

    registerTitle:      'Create account',
    registerSubtitle:   'Start your learning journey',
    registerButton:     'Create account',
    registerLoading:    'Creating account...',
    registerHasAccount: 'Already have an account?',
    registerLoginLink:  'Sign in',
    registerError:      'Registration failed. Please try again.',

    forgotTitle:        'Forgot password',
    forgotSubtitle:     'Enter your email to receive a reset link',
    forgotButton:       'Send reset link',
    forgotLoading:      'Sending...',
    forgotSuccess:      'Check your email to reset your password.',
    forgotBackToLogin:  'Back to sign in',

    resetTitle:         'Reset password',
    resetSubtitle:      'Create a new password for your account',
    resetButton:        'Reset password',
    resetSuccess:       'Password updated. Redirecting...',

    // ── Form fields ───────────────────────────────────────────
    fieldEmail:         'Email',
    fieldPassword:      'Password',
    fieldNewPassword:   'New password',
    fieldConfirmPwd:    'Confirm password',
    fieldFullName:      'Full name',
    fieldName:          'Name',
    fieldPhone:         'Phone number',
    fieldRole:          'Role',

    forgotPassword:     'Forgot password?',
    showPassword:       'Show password',
    hidePassword:       'Hide password',

    // ── Validation ────────────────────────────────────────────
    validEmail:         'Invalid email',
    validPwdMin6:       'Password must be at least 6 characters',
    validPwdMin8:       'Password must be at least 8 characters',
    validPwdMatch:      'Passwords do not match',
    validNameMin2:      'Name must be at least 2 characters',

    // ── Common UI actions ─────────────────────────────────────
    save:               'Save',
    saveChanges:        'Save changes',
    cancel:             'Cancel',
    confirm:            'Confirm',
    delete:             'Delete',
    edit:               'Edit',
    add:                'Add',
    create:             'Create',
    close:              'Close',
    back:               'Back',
    next:               'Next',
    submit:             'Submit',
    export:             'Export',
    import:             'Import',
    refresh:            'Refresh',
    filter:             'Filter',
    sort:               'Sort',
    searchAction:       'Search',
    viewAll:            'View all',
    learnMore:          'Learn more',
    download:           'Download',
    upload:             'Upload',
    retry:              'Retry',
    apply:              'Apply',
    reset:              'Reset',
    enable:             'Enable',
    disable:            'Disable',
    connect:            'Connect',
    disconnect:         'Disconnect',

    // ── Status labels ─────────────────────────────────────────
    active:             'Active',
    inactive:           'Inactive',
    online:             'Online',
    offline:            'Offline',
    pending:            'Pending',
    completed:          'Completed',
    failed:             'Failed',
    error:              'Error',
    success:            'Success',
    warning:            'Warning',
    unknown:            'Unknown',
    normal:             'Normal',

    // ── Admin Overview ────────────────────────────────────────
    adminOverviewTitle:     'Command Center',
    adminOverviewSubtitle:  'Real-time system overview',
    totalStudents:          'Total Students',
    totalTeachers:          'Total Teachers',
    activeClasses:          'Active Classes',
    systemLoad:             'System Load',
    engagementRate:         'Engagement Rate',
    atRiskStudents:         'At-Risk Students',
    recentActivity:         'Recent Activity',
    systemHealth:           'System Health',
    networkLoad:            'Network Load',
    securityLogs:           'Security Logs',
    moduleStatus:           'Module Status',
    liveMetrics:            'Live Metrics',

    // ── Admin IoT ─────────────────────────────────────────────
    iotTitle:           'IoT Gateway Hub',
    iotSubtitle:        'Manage all school IoT devices',
    totalDevices:       'Total Devices',
    onlineDevices:      'Online',
    offlineDevices:     'Offline',
    alertDevices:       'Alerts',
    mqttConfig:         'MQTT Config',
    deviceName:         'Device Name',
    deviceType:         'Type',
    deviceStatus:       'Status',
    deviceLocation:     'Location',
    capabilities:       'Capabilities',
    lastSeen:           'Last Seen',
    actions:            'Actions',
    noDevices:          'No devices found',
    searchDevices:      'Search devices...',

    // ── Admin Operations ──────────────────────────────────────
    opsTitle:           'Operations Center',
    opsSubtitle:        'Monitor & manage system operations',
    cpuUsage:           'CPU',
    ramUsage:           'RAM',
    latency:            'Latency',
    fps:                'FPS',
    automations:        'Automations',
    runAutomation:      'Run',
    runningAutomation:  'Running...',
    backup:             'Data Backup',
    backupNow:          'Backup Now',
    backupHistory:      'Backup History',
    importData:         'Import Data',
    dropFiles:          'Drag & drop files here or',
    browseFiles:        'browse files',
    importHistory:      'Import History',
    restore:            'Restore',
    backupSize:         'Size',
    backupDate:         'Date',
    backupType:         'Type',

    // ── Admin Camera ──────────────────────────────────────────
    cameraTitle:        'Surveillance Command Center',
    cameraSubtitle:     'Monitor all school cameras',
    allCameras:         'All cameras',
    addCamera:          'Add camera',
    recordingMode:      'Recording mode',
    liveView:           'Live view',
    recordings:         'Recordings',
    fullscreen:         'Fullscreen',
    ptzControl:         'PTZ Control',
    noSignal:           'No signal',
    cameraOnline:       'Camera online',
    cameraOffline:      'Camera offline',
    gridSize:           'Grid size',

    // ── Admin Emotion ─────────────────────────────────────────
    emotionTitle:       'Emotion & Engagement Monitor',
    emotionSubtitle:    'Track student emotional states',
    engagementHeatmap:  'Engagement Heatmap',
    emotionDist:        'Emotion Distribution',
    classSnapshots:     'Class Snapshots',
    today:              'Today',
    yesterday:          'Yesterday',
    thisWeek:           'This week',

    // ── Admin Content ─────────────────────────────────────────
    contentTitle:       'Content & Curriculum',
    contentSubtitle:    'Manage and evaluate learning content quality',
    allContent:         'All',
    approved:           'Approved',
    draft:              'Draft',
    review:             'Under Review',
    quality:            'Quality',
    aiSuggestion:       'AI Suggestion',
    viewSuggestion:     'View suggestion',
    hideSuggestion:     'Hide suggestion',
    views:              'Views',
    completionRate:     'Completion rate',
    searchContent:      'Search content...',
    sortByDate:         'Date updated',
    sortByQuality:      'Quality',
    sortByViews:        'Views',

    // ── Dashboard Home ────────────────────────────────────────
    welcomeBack:        'Welcome back',
    overallProgress:    'Overview & Learning Progress',
    learningStreak:     'Learning Streak',
    totalXP:            'Total XP',
    currentLevel:       'Current Level',
    xpToNext:           'XP to next level',
    todayGoal:          "Today's Goal",
    continueLearn:      'Continue Learning',
    myCompetencies:     'My Competencies',
    recentCourses:      'Recent Courses',
    upcomingEvents:     'Upcoming Events',

    // ── Page Fallback ─────────────────────────────────────────
    pageBuilding:       'Page under construction',
    pageSoon:           'This feature will be available soon.',
    goHome:             'Go home',

    // ── Error states ──────────────────────────────────────────
    notFound:           'Page not found',
    unauthorized:       'You do not have access to this page',
    serverError:        'Server error, please try again later',
    networkError:       'Network connection error',
    backendUnavailable: 'Auth service is under maintenance, please try again in a few minutes',
  },
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageSt] = useState<Language>('vi')

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lang')
    if (saved === 'vi' || saved === 'en') setLanguageSt(saved)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageSt(lang)
    localStorage.setItem('lang', lang)
  }

  const t = (key: string): string =>
    translations[language][key] ?? key

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>')
  return ctx
}
