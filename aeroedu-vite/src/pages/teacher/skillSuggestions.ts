/**
 * skillSuggestions.ts
 * ---------------------------------------------------------------------------
 * Database các phương pháp + bài tập nâng cao năng lực cho từng kỹ năng trong
 * cây CPD (Continuous Professional Development) của GV và Admin Việt Nam (THPT).
 *
 * Cấu trúc:
 *   - SuggestionMethod: nguồn học tập (khóa học, sách, công cụ, cộng đồng...)
 *   - SuggestionExercise: bài tập áp dụng ngay tại trường, có deliverable
 *   - SKILL_SUGGESTIONS: map skillId → SkillSuggestion (46 skill phủ đủ)
 *
 * Nguyên tắc nội dung:
 *   - Khả thi với GV/Admin trường công lập VN (thời gian eo hẹp, ngân sách hạn chế)
 *   - Ưu tiên nguồn thực: Bộ GD&ĐT, NXB GD VN, Coursera/edX/FUNiX, Claude/ChatGPT,
 *     Canva, Padlet, Quizizz, GeoGebra, Wokwi, OBS, Loom
 *   - Mỗi exercise có deliverable rõ ràng để tự kiểm tra tiến độ
 *
 * Sử dụng:
 *   import { getSuggestion } from './skillSuggestions'
 *   const sug = getSuggestion('tds-ai-tools')
 */

export interface SuggestionMethod {
  type: 'course' | 'book' | 'practice' | 'community' | 'project' | 'tool' | 'video'
  title: string
  description: string // 1-2 câu
  url?: string        // optional link
  duration?: string   // VD "2-4 tuần", "1 tháng"
}

export interface SuggestionExercise {
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: string // VD "30 phút", "1 buổi dạy", "1 tuần"
  steps: string[]       // 3-5 bước cụ thể
  deliverable: string   // sản phẩm cuối
}

export interface SkillSuggestion {
  methods: SuggestionMethod[]
  exercises: SuggestionExercise[]
}

// =============================================================================
// SKILL_SUGGESTIONS
// =============================================================================

export const SKILL_SUGGESTIONS: Record<string, SkillSuggestion> = {
  // ───────────────────────────────────────────────────────────────────────────
  // TEACHER TREE — CHUYÊN MÔN & KIẾN THỨC (TCE)
  // ───────────────────────────────────────────────────────────────────────────

  // Chương trình GDPT 2018
  'tce-curriculum2018': {
    methods: [
      {
        type: 'book',
        title: 'Thông tư 32/2018/TT-BGDĐT — CTGDPT tổng thể',
        description: 'Văn bản gốc Bộ GD&ĐT ban hành chương trình GDPT 2018. Đọc kỹ phần định hướng + chương trình môn của mình.',
        url: 'https://moet.gov.vn',
        duration: '1 tuần đọc kỹ',
      },
      {
        type: 'course',
        title: 'Bồi dưỡng Mô-đun ETEP (Module 1-9)',
        description: 'Khóa bồi dưỡng GV phổ thông bắt buộc qua hệ thống taphuan.csdl.edu.vn. Mô-đun 1-3 về CT mới, 4-9 về phương pháp.',
        url: 'https://taphuan.csdl.edu.vn',
        duration: '3-6 tháng',
      },
      {
        type: 'community',
        title: 'Nhóm Zalo/FB GV cùng môn theo CT 2018',
        description: 'Tìm và tham gia nhóm GV cùng bộ môn (VD "Vật lí THPT CT 2018"). Trao đổi kế hoạch dạy, phân phối chương trình, đề kiểm tra.',
        duration: 'liên tục',
      },
      {
        type: 'video',
        title: 'Kênh YouTube "Bộ Giáo dục và Đào tạo"',
        description: 'Video giới thiệu CT mới do tác giả viết SGK trình bày. Xem theo môn của mình + so sánh với CT 2006.',
        duration: '5-10 giờ',
      },
    ],
    exercises: [
      {
        title: 'Lập bảng so sánh CT 2006 vs CT 2018 môn của mình',
        difficulty: 'easy',
        estimatedTime: '2-3 giờ',
        steps: [
          'Mở 2 PDF chương trình môn (2006 + 2018) cạnh nhau',
          'Tạo bảng Excel 3 cột: Mục tiêu / Nội dung / Đánh giá',
          'Liệt kê 10 điểm khác biệt lớn nhất',
          'Đánh dấu nội dung MỚI hoàn toàn (chưa từng dạy)',
        ],
        deliverable: '1 file Excel so sánh + ghi chú điểm cần học thêm',
      },
      {
        title: 'Soạn 1 KHBD (kế hoạch bài dạy) đúng mẫu công văn 5512',
        difficulty: 'medium',
        estimatedTime: '1 buổi (4 tiếng)',
        steps: [
          'Chọn 1 bài trong SGK mới của lớp mình dạy',
          'Áp dụng đúng 4 mục: Mục tiêu / Thiết bị / Tiến trình / Phụ lục',
          'Xác định 3-4 năng lực + phẩm chất cụ thể cần phát triển',
          'Đưa GV trong tổ góp ý, chỉnh sửa',
        ],
        deliverable: '1 KHBD chuẩn 5512 + bình luận từ tổ chuyên môn',
      },
    ],
  },

  // Chuyên sâu nội dung bộ môn
  'tce-content-depth': {
    methods: [
      {
        type: 'book',
        title: 'Sách chuyên khảo + tham khảo NXB Giáo dục VN',
        description: 'Đọc song song SGK mới + sách chuyên khảo Đại học (VD: "Cơ học lý thuyết" cho GV Lí, "Hóa học vô cơ" Hoàng Nhâm cho GV Hóa).',
        duration: '6-12 tháng',
      },
      {
        type: 'course',
        title: 'Khóa MOOC chuyên ngành trên Coursera/edX',
        description: 'Coursera có Physics/Chemistry/Math từ MIT, Caltech, Stanford. Học miễn phí, audit mode. Cải thiện kiến thức gốc.',
        url: 'https://coursera.org',
        duration: '4-8 tuần/khóa',
      },
      {
        type: 'community',
        title: 'Diễn đàn Vật lí/Hóa/Toán/Sinh online VN',
        description: 'VD: vatliphothong.vn, hoahoc24h.com. Đọc thảo luận của GV cấp III và HS giỏi để bắt kịp các câu hỏi khó.',
        duration: 'hàng tuần',
      },
      {
        type: 'tool',
        title: 'Wolfram Alpha + GeoGebra Calculator',
        description: 'Công cụ kiểm chứng phép tính, vẽ đồ thị, mô phỏng. Dùng khi gặp bài tập lạ hoặc khi muốn mở rộng cho HS giỏi.',
        url: 'https://wolframalpha.com',
        duration: 'tra cứu khi cần',
      },
    ],
    exercises: [
      {
        title: 'Giải lại đề thi HSG cấp Tỉnh 3 năm gần nhất',
        difficulty: 'hard',
        estimatedTime: '2-3 tuần',
        steps: [
          'Tải đề + đáp án HSG Tỉnh môn mình (3 năm)',
          'Tự giải KHÔNG xem đáp án trong 90 phút',
          'Đối chiếu, ghi nhận câu sai/mất nhiều thời gian',
          'Tổng hợp 5 chủ đề mình còn yếu nhất',
        ],
        deliverable: 'Bảng 5 chủ đề yếu + kế hoạch tự bồi dưỡng từng chủ đề',
      },
      {
        title: 'Viết 1 chuyên đề mở rộng cho 1 chương SGK',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Chọn 1 chương mình thấy nông trong SGK',
          'Đào sâu kiến thức từ sách chuyên khảo + nguồn web học thuật',
          'Viết 5-7 trang Word: lý thuyết mở rộng + 10 bài tập nâng cao',
          'Dùng cho HS khá giỏi hoặc đội tuyển HSG',
        ],
        deliverable: '1 chuyên đề Word 5-7 trang + 10 bài tập có lời giải',
      },
    ],
  },

  // Liên môn (STEM, STEAM)
  'tce-cross-subject': {
    methods: [
      {
        type: 'book',
        title: '"Giáo dục STEM trong nhà trường" — NXB ĐHSP',
        description: 'Sách hướng dẫn thiết kế bài dạy STEM theo CT 2018, có ví dụ minh họa cho THCS/THPT.',
        duration: '2-3 tuần',
      },
      {
        type: 'course',
        title: 'Khóa "STEM Education" trên FUNiX/edX',
        description: 'Khóa miễn phí giới thiệu Engineering Design Process + cách tích hợp Toán-Lý-Hóa-Công nghệ.',
        url: 'https://funix.edu.vn',
        duration: '4-6 tuần',
      },
      {
        type: 'community',
        title: 'CLB STEM Việt Nam (FB group)',
        description: 'Cộng đồng GV STEM trao đổi project, thiết bị, cuộc thi. Có nhiều bộ kit Arduino/micro:bit giá rẻ.',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'Tinkercad + Wokwi (mô phỏng mạch)',
        description: 'Mô phỏng Arduino/ESP32 miễn phí trên trình duyệt. Phù hợp khi trường không có kit phần cứng.',
        url: 'https://wokwi.com',
        duration: 'tra cứu khi cần',
      },
    ],
    exercises: [
      {
        title: 'Thiết kế 1 dự án STEM liên môn 4 tiết',
        difficulty: 'medium',
        estimatedTime: '1 tuần soạn + 4 tiết dạy',
        steps: [
          'Chọn chủ đề có 2-3 môn (VD "Hệ thống tưới tự động" = Lí + Sinh + Công nghệ)',
          'Bám sát quy trình 5E: Engage-Explore-Explain-Elaborate-Evaluate',
          'Liệt kê vật liệu giá <100k/nhóm (chai nhựa, ống, cảm biến rẻ)',
          'Phối hợp với GV môn khác chia sẻ tiết dạy',
        ],
        deliverable: '1 kế hoạch dự án STEM 4 tiết + danh mục vật liệu',
      },
      {
        title: 'Tổ chức 1 buổi STEM Day quy mô lớp',
        difficulty: 'easy',
        estimatedTime: '1 buổi (3 tiếng)',
        steps: [
          'Chia lớp thành 4-5 nhóm, mỗi nhóm 1 thử thách (VD: chế tạo tên lửa nước, cầu giấy chịu lực)',
          'Mỗi thử thách giới hạn 30 phút + 5 phút thuyết trình',
          'Đánh giá theo rubric đơn giản: sáng tạo / hiệu quả / teamwork',
          'Chụp ảnh + viết bài đăng fanpage trường',
        ],
        deliverable: '1 báo cáo + 10 ảnh hoạt động + rubric chấm',
      },
    ],
  },

  // Đánh giá theo TT58, TT22, TT26
  'tce-tt58': {
    methods: [
      {
        type: 'book',
        title: 'Thông tư 22/2021/TT-BGDĐT (THCS+THPT CT 2018)',
        description: 'Văn bản chính thức về đánh giá HS THCS/THPT theo CT 2018. Đọc kỹ điều 5-10 về đánh giá thường xuyên/định kỳ.',
        url: 'https://moet.gov.vn',
        duration: '3-5 ngày',
      },
      {
        type: 'video',
        title: 'Webinar Cục NGCBQLGD về đánh giá CT 2018',
        description: 'Tìm trên YouTube các webinar do Cục Nhà giáo tổ chức. Giải thích cách quy đổi điểm + nhận xét NL/PC.',
        duration: '5-8 giờ',
      },
      {
        type: 'practice',
        title: 'Thực hành nhập điểm trên SMAS/VnEdu',
        description: 'Phần mềm quản lý trường thực tế. Tập nhập đủ 4 loại điểm: thường xuyên (ĐĐGtx), giữa kỳ, cuối kỳ, ĐTBmcn.',
        duration: '1 học kỳ',
      },
      {
        type: 'community',
        title: 'Nhóm GV chủ nhiệm chia sẻ mẫu sổ điểm',
        description: 'Trao đổi mẫu nhận xét NL/PC, cách phân loại HS theo 4 mức Tốt-Khá-Đạt-Chưa đạt.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Xây bộ rubric đánh giá thường xuyên cho 1 lớp',
        difficulty: 'medium',
        estimatedTime: '2-3 giờ',
        steps: [
          'Chọn 1 lớp + xác định 4-5 hoạt động đánh giá thường xuyên trong học kỳ',
          'Mỗi hoạt động viết rubric 3 mức (Đạt/Tốt/Xuất sắc) trong 1 bảng',
          'Gửi rubric cho HS đầu kỳ để minh bạch tiêu chí',
          'Cuối kỳ, tổng hợp xem rubric có cần điều chỉnh không',
        ],
        deliverable: '1 file Excel rubric 4-5 hoạt động + biên bản tổ chuyên môn duyệt',
      },
      {
        title: 'Viết 30 nhận xét NL/PC theo mẫu TT22',
        difficulty: 'easy',
        estimatedTime: '2 giờ',
        steps: [
          'Lấy 30 HS bất kỳ trong lớp',
          'Mỗi HS viết 2 câu: 1 câu về năng lực, 1 câu về phẩm chất',
          'Tránh dùng từ chung chung "ngoan, chăm chỉ" — phải cụ thể',
          'So với mẫu của đồng nghiệp, học cách diễn đạt tích cực',
        ],
        deliverable: '1 file Word 30 nhận xét + lưu thành mẫu tham khảo',
      },
    ],
  },

  // Nghiên cứu khoa học GD
  'tce-research': {
    methods: [
      {
        type: 'book',
        title: '"Phương pháp nghiên cứu khoa học giáo dục" — Phạm Viết Vượng',
        description: 'Sách kinh điển ngành SP. Hướng dẫn thiết kế đề tài, công cụ điều tra, phân tích số liệu.',
        duration: '1 tháng',
      },
      {
        type: 'practice',
        title: 'Viết 1 SKKN (sáng kiến kinh nghiệm) cấp trường',
        description: 'Theo mẫu của Sở GD. Tập trung vào 1 giải pháp cụ thể giải quyết vấn đề thực tế trong lớp/trường.',
        duration: '3-6 tháng',
      },
      {
        type: 'tool',
        title: 'Google Forms + Google Sheets',
        description: 'Công cụ miễn phí để khảo sát HS/GV và phân tích kết quả. Đủ dùng cho NCKH cấp trường/quận.',
        url: 'https://forms.google.com',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Tham gia Hội thảo NCKH cấp Sở GD',
        description: 'Mỗi năm Sở thường tổ chức 1-2 hội thảo. Đăng ký báo cáo hoặc tham dự để học cách viết + trình bày.',
        duration: '1-2 lần/năm',
      },
    ],
    exercises: [
      {
        title: 'Lập đề cương 1 SKKN ngắn (5 trang)',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Chọn 1 vấn đề HS gặp khó khăn (VD: HS yếu phần Động học)',
          'Viết đề cương: Lý do / Mục tiêu / Nội dung / Phương pháp / Dự kiến kết quả',
          'Đề xuất giải pháp khả thi, có thể đo lường',
          'Gửi tổ chuyên môn góp ý',
        ],
        deliverable: '1 đề cương SKKN 5 trang được tổ duyệt',
      },
      {
        title: 'Khảo sát + phân tích kết quả 1 phương pháp dạy',
        difficulty: 'medium',
        estimatedTime: '2-3 tuần',
        steps: [
          'Áp dụng 1 PP mới (VD: học theo nhóm) trong 4 tiết',
          'Trước & sau: làm bài kiểm tra ngắn 10 câu',
          'So sánh điểm trung bình + viết 1 trang phân tích',
          'Vẽ biểu đồ cột bằng Excel/Sheets',
        ],
        deliverable: '1 báo cáo 2 trang + biểu đồ Excel',
      },
    ],
  },

  // Cập nhật kiến thức (đọc paper, dự hội thảo)
  'tce-update': {
    methods: [
      {
        type: 'community',
        title: 'Theo dõi tạp chí "Giáo dục" + "Khoa học giáo dục"',
        description: '2 tạp chí chính của Bộ GD&ĐT. Đọc bản online miễn phí, mỗi tháng chọn 1-2 bài liên quan môn mình.',
        url: 'https://tapchigiaoduc.edu.vn',
        duration: 'hàng tháng',
      },
      {
        type: 'community',
        title: 'Đăng ký newsletter Edutopia / TES.com',
        description: 'Newsletter quốc tế cập nhật xu hướng giáo dục mới (UK/US). Dùng Claude/Google Translate để đọc nhanh.',
        url: 'https://edutopia.org',
        duration: 'hàng tuần',
      },
      {
        type: 'video',
        title: 'Kênh TED-Ed + TED Talks Education',
        description: 'Xem 1 video 15-20 phút mỗi tuần. Lấy ý tưởng đổi mới cho lớp học.',
        url: 'https://ed.ted.com',
        duration: 'hàng tuần',
      },
      {
        type: 'tool',
        title: 'Google Scholar Alert theo từ khóa môn',
        description: 'Đặt alert tự động cho từ khóa như "physics education Vietnam". Nhận email mỗi khi có paper mới.',
        url: 'https://scholar.google.com',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Đọc 4 paper/tháng + viết tóm tắt 1 trang',
        difficulty: 'easy',
        estimatedTime: '4 giờ/tháng',
        steps: [
          'Mỗi tuần chọn 1 paper từ Google Scholar / tạp chí GD',
          'Đọc abstract + kết luận, lướt phương pháp',
          'Viết 5-7 dòng tóm tắt + 1 ý áp dụng được',
          'Lưu vào Notion/OneNote chung của tổ chuyên môn',
        ],
        deliverable: 'Thư viện 4 tóm tắt/tháng + 4 ý có thể áp dụng',
      },
      {
        title: 'Tổ chức 1 buổi seminar chia sẻ tổ chuyên môn',
        difficulty: 'medium',
        estimatedTime: '1 tuần chuẩn bị',
        steps: [
          'Chọn 1 chủ đề "nóng" (VD: AI trong dạy học)',
          'Tổng hợp từ 3-5 nguồn (paper, video, web)',
          'Soạn slide 10-15 trang + chuẩn bị Q&A',
          'Trình bày 30 phút + thảo luận 30 phút',
        ],
        deliverable: '1 slide + biên bản thảo luận của tổ',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TEACHER TREE — PHƯƠNG PHÁP SƯ PHẠM (TP)
  // ───────────────────────────────────────────────────────────────────────────

  // Thiết kế bài dạy
  'tp-lesson-design': {
    methods: [
      {
        type: 'book',
        title: '"Thiết kế bài dạy hiệu quả" — NXB GD VN',
        description: 'Hướng dẫn thiết kế bài dạy theo CT 2018, có mẫu KHBD chi tiết cho từng môn.',
        duration: '2-3 tuần',
      },
      {
        type: 'course',
        title: 'Mô-đun 4 ETEP — Xây dựng KHBD',
        description: 'Khóa bồi dưỡng GV cốt cán trên taphuan.csdl.edu.vn. Hướng dẫn chi tiết theo công văn 5512.',
        url: 'https://taphuan.csdl.edu.vn',
        duration: '4-6 tuần',
      },
      {
        type: 'tool',
        title: 'Mẫu KHBD inphysic.com — Lesson Plan Editor',
        description: 'Soạn KHBD trực tuyến chuẩn 5512 ngay trong hệ thống. Có AI gợi ý mục tiêu + hoạt động.',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Thư viện KHBD mẫu trên violet.vn / vndoc.vn',
        description: 'Tải KHBD mẫu của GV cả nước theo CT 2018. Tham khảo cấu trúc, KHÔNG copy nguyên.',
        url: 'https://violet.vn',
        duration: 'tra cứu khi cần',
      },
    ],
    exercises: [
      {
        title: 'Soạn KHBD 1 bài với 3 phương án hoạt động',
        difficulty: 'medium',
        estimatedTime: '3-4 giờ',
        steps: [
          'Chọn 1 bài SGK mới',
          'Thiết kế 3 hoạt động khác nhau cho cùng mục tiêu (VD: thảo luận / thực hành / trò chơi)',
          'Ước lượng thời gian + chuẩn bị mỗi phương án',
          'Chọn phương án phù hợp nhất với lớp + giải thích lý do',
        ],
        deliverable: '1 KHBD + 3 phương án + ghi chú chọn phương án nào',
      },
      {
        title: 'Cải tiến 1 KHBD cũ theo phản hồi HS',
        difficulty: 'easy',
        estimatedTime: '2 giờ',
        steps: [
          'Chọn 1 KHBD từng dạy mà HS không hứng thú',
          'Khảo sát nhanh 5 HS: phần nào chán, phần nào hay',
          'Thay 1-2 hoạt động trung tâm bằng PP tích cực hơn',
          'Dạy lại + so sánh sự tham gia của HS',
        ],
        deliverable: '1 KHBD v2 + biên bản so sánh trước/sau',
      },
    ],
  },

  // Phương pháp tích cực
  'tp-active-learning': {
    methods: [
      {
        type: 'book',
        title: '"Dạy học tích cực" — Trần Bá Hoành',
        description: 'Sách nền tảng về PP tích cực ở VN. Hướng dẫn 12 kỹ thuật cụ thể (think-pair-share, gallery walk...).',
        duration: '1 tháng',
      },
      {
        type: 'video',
        title: 'Kênh YouTube "Edutopia" + "Cult of Pedagogy"',
        description: 'Video 5-10 phút mỗi kỹ thuật dạy học tích cực, có phụ đề. Xem trước khi áp dụng.',
        url: 'https://youtube.com/@edutopia',
        duration: 'hàng tuần',
      },
      {
        type: 'tool',
        title: 'Padlet + Mentimeter + Kahoot',
        description: 'Padlet để brainstorm; Mentimeter để hỏi nhanh; Kahoot để chơi trắc nghiệm. Tất cả có gói miễn phí.',
        url: 'https://padlet.com',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Khóa Active Learning trên Coursera (UCL/Yale)',
        description: 'Khóa "Powerful Teaching Tools" hoặc "Learning How to Learn" — audit miễn phí.',
        url: 'https://coursera.org',
        duration: '4-6 tuần',
      },
    ],
    exercises: [
      {
        title: 'Áp dụng kỹ thuật Think-Pair-Share trong 1 tuần',
        difficulty: 'easy',
        estimatedTime: '5 tiết dạy',
        steps: [
          'Mỗi tiết, dành 5-7 phút cho 1 vòng Think-Pair-Share',
          'Đặt 1 câu hỏi mở, HS suy nghĩ 1 phút',
          'Cặp đôi thảo luận 2 phút',
          'Mời 2-3 cặp chia sẻ trước lớp',
          'Cuối tuần, hỏi HS thấy có ích không',
        ],
        deliverable: 'Nhật ký 5 tiết + phản hồi HS (Google Form)',
      },
      {
        title: 'Tổ chức 1 tiết Flipped Classroom',
        difficulty: 'hard',
        estimatedTime: '1 tuần',
        steps: [
          'Quay video 10 phút giảng lý thuyết bài tiếp theo (Loom/OBS)',
          'Gửi HS xem trước + làm Google Form 5 câu',
          'Trong tiết: không giảng lại, chỉ làm bài tập + thảo luận khó',
          'So sánh điểm bài kiểm tra với lớp song song',
        ],
        deliverable: '1 video + 1 form + 1 báo cáo so sánh điểm',
      },
    ],
  },

  // Phân hóa
  'tp-differentiation': {
    methods: [
      {
        type: 'book',
        title: '"How to Differentiate Instruction" — Carol Ann Tomlinson',
        description: 'Sách kinh điển về dạy học phân hóa. Đọc bản dịch hoặc tóm tắt trên blog GV VN.',
        duration: '3-4 tuần',
      },
      {
        type: 'tool',
        title: 'inphysic.com — Adaptive Quiz + Learning Path',
        description: 'Hệ thống tự động phân nhóm HS theo năng lực + đề xuất bài luyện riêng. Dùng dashboard GV để theo dõi.',
        duration: 'liên tục',
      },
      {
        type: 'video',
        title: 'Khóa "Differentiated Instruction" trên FutureLearn',
        description: 'Khóa miễn phí 4 tuần, có case study cho lớp đa trình độ.',
        url: 'https://futurelearn.com',
        duration: '4 tuần',
      },
      {
        type: 'practice',
        title: 'Thử mô hình "3 mức bài tập" mỗi tiết',
        description: 'Cuối mỗi tiết, đưa 3 bài tập: cơ bản / vận dụng / nâng cao. HS tự chọn mức phù hợp.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Thiết kế 1 bài tập 3 cấp độ cho 1 chủ đề',
        difficulty: 'medium',
        estimatedTime: '2-3 giờ',
        steps: [
          'Chọn 1 chủ đề trong tuần',
          'Viết 3 bài tập: A (nhận biết) — B (vận dụng) — C (vận dụng cao)',
          'Mỗi bài có barem chấm rõ ràng',
          'Phát cho HS, để HS tự chọn mức (có thể chọn nhiều mức)',
        ],
        deliverable: '1 phiếu bài tập 3 cấp + bảng thống kê HS chọn mức nào',
      },
      {
        title: 'Phân nhóm HS theo năng lực + giao nhiệm vụ riêng 1 tiết',
        difficulty: 'medium',
        estimatedTime: '1 tiết dạy',
        steps: [
          'Dựa điểm bài kiểm tra gần nhất, chia lớp 3 nhóm (yếu/trung bình/khá-giỏi)',
          'Mỗi nhóm 1 nhiệm vụ riêng cùng chủ đề',
          'GV xoay vòng 3 nhóm, mỗi nhóm 10-12 phút',
          'Kết thúc: mỗi nhóm trình bày 3 phút',
        ],
        deliverable: '1 KHBD phân hóa + ảnh sản phẩm 3 nhóm',
      },
    ],
  },

  // Đánh giá quá trình
  'tp-formative': {
    methods: [
      {
        type: 'book',
        title: '"Embedded Formative Assessment" — Dylan Wiliam',
        description: 'Sách kinh điển về đánh giá quá trình. Có 5 chiến lược cụ thể áp dụng trong tiết học.',
        duration: '1 tháng',
      },
      {
        type: 'tool',
        title: 'Quizizz + Kahoot + Google Forms',
        description: 'Tạo quiz nhanh để kiểm tra hiểu bài. Quizizz có chế độ "report card" thống kê chi tiết.',
        url: 'https://quizizz.com',
        duration: 'liên tục',
      },
      {
        type: 'practice',
        title: 'Exit Ticket cuối mỗi tiết',
        description: 'Cuối tiết, HS viết 3 câu: học được gì / còn thắc mắc / muốn học thêm. Mất 2 phút.',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Khóa "Assessment for Learning" trên edX',
        description: 'Khóa miễn phí từ University of Oxford. Có chứng chỉ trả phí.',
        url: 'https://edx.org',
        duration: '6 tuần',
      },
    ],
    exercises: [
      {
        title: 'Áp dụng "Exit Ticket" 5 tiết liên tiếp',
        difficulty: 'easy',
        estimatedTime: '5 tiết + 30p phân tích',
        steps: [
          'In sẵn phiếu Exit Ticket 3 câu hỏi',
          'Cuối mỗi tiết HS làm 2 phút, nộp lại',
          'Tối về đọc nhanh, ghi nhận 3 vấn đề lặp lại',
          'Tiết sau bắt đầu bằng giải đáp 3 vấn đề đó',
        ],
        deliverable: '5 bộ exit ticket + 1 nhật ký cải tiến tiết dạy',
      },
      {
        title: 'Tổ chức 1 phiên đồng đẳng (peer feedback)',
        difficulty: 'medium',
        estimatedTime: '1 tiết dạy',
        steps: [
          'HS làm 1 bài tập viết (đoạn văn / bài giải)',
          'Đổi bài cho bạn cùng bàn, dùng rubric 3 mức để đánh giá',
          'Mỗi HS ghi 1 điểm mạnh + 1 đề xuất cải thiện',
          'GV thu rubric, kiểm tra mức độ nghiêm túc',
        ],
        deliverable: '1 rubric đồng đẳng + 30 phiếu phản hồi mẫu',
      },
    ],
  },

  // Dạy học STEM
  'tp-stem': {
    methods: [
      {
        type: 'book',
        title: '"Tổ chức hoạt động STEM trong trường phổ thông" — Bộ GD&ĐT',
        description: 'Tài liệu chính thức Bộ GD ban hành. Có quy trình 5 bước + ví dụ minh họa từng cấp.',
        duration: '2-3 tuần',
      },
      {
        type: 'community',
        title: 'CLB STEM Việt Nam + nhóm STEAM for VN',
        description: 'FB group lớn, chia sẻ project, mẫu kit giá rẻ, video minh họa.',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'Tinkercad + Wokwi + Scratch',
        description: 'Mô phỏng mạch điện tử + lập trình block. Miễn phí, không cần phần cứng.',
        url: 'https://wokwi.com',
        duration: 'liên tục',
      },
      {
        type: 'project',
        title: 'Tham gia cuộc thi KHKT cấp Tỉnh',
        description: 'Mỗi năm Sở GD tổ chức. Hướng dẫn 1 HS làm dự án 3-4 tháng. Học cách mentor + viết báo cáo NCKH.',
        duration: '3-6 tháng',
      },
    ],
    exercises: [
      {
        title: 'Thiết kế 1 chủ đề STEM 4 tiết theo 5E',
        difficulty: 'medium',
        estimatedTime: '1 tuần soạn',
        steps: [
          'Chọn chủ đề thực tế (VD: "Năng lượng mặt trời cho đèn LED")',
          'Viết 5 hoạt động theo 5E: Engage / Explore / Explain / Elaborate / Evaluate',
          'Chuẩn bị vật liệu giá rẻ (<150k/nhóm)',
          'Tổ chuyên môn dự giờ + góp ý',
        ],
        deliverable: '1 KHBD STEM 4 tiết + danh mục vật liệu + video dự giờ',
      },
      {
        title: 'Hướng dẫn 1 nhóm HS làm dự án mini 2 tuần',
        difficulty: 'hard',
        estimatedTime: '2 tuần (mỗi ngày 30 phút)',
        steps: [
          'Chọn 4-5 HS hứng thú, chia nhóm',
          'Đề tài đơn giản (VD: "Hệ thống tưới rau tự động")',
          'Hỗ trợ tuần 1: thiết kế + mua vật liệu; tuần 2: lắp ráp + thử nghiệm',
          'Cuối kỳ HS trình bày trước lớp 10 phút',
        ],
        deliverable: '1 sản phẩm + 1 báo cáo PDF + 1 video 5 phút',
      },
    ],
  },

  // Quản lý lớp học
  'tp-classroom-mgmt': {
    methods: [
      {
        type: 'book',
        title: '"Teach Like a Champion" — Doug Lemov',
        description: 'Sách nổi tiếng với 49 kỹ thuật quản lý lớp + dạy hiệu quả. Có bản dịch + nhiều tóm tắt trên YouTube.',
        duration: '1-2 tháng',
      },
      {
        type: 'video',
        title: 'Kênh YouTube "Teach Like a Champion" official',
        description: 'Video minh họa từng kỹ thuật (Cold Call, No Opt Out, Strong Voice...). Xem 1 kỹ thuật/tuần.',
        url: 'https://youtube.com/@TeachLikeAChampion',
        duration: 'hàng tuần',
      },
      {
        type: 'practice',
        title: 'Thiết lập "lớp ước" với HS đầu năm',
        description: 'Tuần đầu, cùng HS xây 5-7 quy tắc lớp. Dán to lên tường. Tham chiếu liên tục khi có vi phạm.',
        duration: '1 tuần đầu năm',
      },
      {
        type: 'community',
        title: 'Khóa "Classroom Management" trên Coursera',
        description: 'Khóa của Commonwealth Education Trust. Audit miễn phí, có chứng chỉ trả phí.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
    ],
    exercises: [
      {
        title: 'Thiết kế "nội quy lớp" theo PP cộng tác với HS',
        difficulty: 'easy',
        estimatedTime: '1 tiết sinh hoạt',
        steps: [
          'Đầu tiết, đặt câu hỏi: "Lớp mình cần gì để học vui và an toàn?"',
          'HS thảo luận nhóm 4 → đề xuất 5 quy tắc',
          'Cả lớp bỏ phiếu chọn 7 quy tắc cuối',
          'In ra, mỗi HS ký xác nhận + dán to lên tường',
        ],
        deliverable: '1 poster nội quy có chữ ký HS + ảnh dán tường',
      },
      {
        title: 'Theo dõi 1 HS "khó" trong 2 tuần',
        difficulty: 'medium',
        estimatedTime: '2 tuần',
        steps: [
          'Chọn 1 HS hay quậy / mất tập trung',
          'Mỗi tiết, ghi nhật ký 3 dòng: hành vi / phản ứng GV / kết quả',
          'Cuối tuần 1: gặp riêng HS nghe lý do',
          'Tuần 2: áp dụng 1-2 giải pháp + so sánh',
        ],
        deliverable: '1 nhật ký 2 tuần + 1 báo cáo case study cho tổ',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TEACHER TREE — KỸ NĂNG SỐ (TDS)
  // ───────────────────────────────────────────────────────────────────────────

  // Sử dụng LMS / EdTech
  'tds-lms': {
    methods: [
      {
        type: 'practice',
        title: 'Thành thạo inphysic.com — toàn bộ tính năng GV',
        description: 'Hệ thống LMS chính của trường. Học đủ: tạo lớp / soạn bài / giao bài tập / chấm điểm / theo dõi tiến độ.',
        duration: '2-4 tuần',
      },
      {
        type: 'video',
        title: 'Tutorial Google Classroom + Microsoft Teams',
        description: '2 LMS phổ biến VN. Xem playlist tutorial chính chủ trên YouTube. Mỗi LMS 2-3 giờ là thành thạo.',
        url: 'https://youtube.com/@GoogleEDU',
        duration: '5-6 giờ',
      },
      {
        type: 'community',
        title: 'Nhóm "Google for Education Vietnam" + Microsoft Educator',
        description: 'Cộng đồng GV chia sẻ cách dùng LMS hiệu quả. Có chứng chỉ MIE Expert / Google Certified Educator miễn phí.',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'Padlet + Nearpod + Pear Deck',
        description: 'Bổ sung LMS truyền thống bằng tools tương tác. Tất cả có gói miễn phí cho GV.',
        url: 'https://padlet.com',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Tạo 1 lớp trên inphysic.com + giao 3 hoạt động',
        difficulty: 'easy',
        estimatedTime: '2 giờ',
        steps: [
          'Đăng nhập GV → Tạo lớp → Thêm 5 HS thật',
          'Tải lên 1 video bài giảng + 1 PDF tài liệu',
          'Giao 1 bài tập trắc nghiệm 10 câu + 1 bài tự luận',
          'Theo dõi 1 tuần: ai làm, điểm bao nhiêu, ai chưa nộp',
        ],
        deliverable: '1 lớp thật trên inphysic + báo cáo 1 tuần',
      },
      {
        title: 'Đạt chứng chỉ Google Certified Educator Level 1',
        difficulty: 'medium',
        estimatedTime: '2-3 tuần',
        steps: [
          'Hoàn thành Fundamentals Training (miễn phí, ~13 unit)',
          'Đăng ký thi (10 USD, được sponsor cho GV VN)',
          'Thi online 3 giờ, trả lời + thực hành thật trên Google Workspace',
          'Đỗ → có chứng chỉ + huy hiệu LinkedIn',
        ],
        deliverable: '1 chứng chỉ Google Certified Educator Level 1',
      },
    ],
  },

  // Công cụ AI hỗ trợ giảng dạy (đặc biệt chi tiết)
  'tds-ai-tools': {
    methods: [
      {
        type: 'tool',
        title: 'Claude.ai (Anthropic) — soạn bài, chấm bài, gợi ý',
        description: 'AI mạnh nhất hiện tại cho tiếng Việt. Dùng để soạn đề, viết rubric, trả lời thắc mắc HS, tạo case study STEM. Gói miễn phí đủ dùng.',
        url: 'https://claude.ai',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'ChatGPT (OpenAI) — brainstorm, dịch, soạn email',
        description: 'Thay thế / bổ sung Claude. GPT-4 cho kết quả tốt khi cần kiểm chứng. Dùng cho phụ đề video, dịch tài liệu, tóm tắt paper.',
        url: 'https://chat.openai.com',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'Canva AI Magic — slide, infographic, video tự động',
        description: 'Tài khoản Canva Edu miễn phí cho GV. Magic Design tạo slide từ prompt, Magic Write soạn nội dung, Magic Video làm video bài giảng.',
        url: 'https://canva.com/education',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'Quizizz AI + Magic School AI — tạo quiz, lesson plan',
        description: 'Quizizz AI tạo quiz từ PDF/Word trong 30 giây. Magic School chuyên cho GV: 60+ tool (lesson plan, IEP, rubric, feedback).',
        url: 'https://magicschool.ai',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Nhóm "AI for Teachers Vietnam" + khóa "AI Essentials for Teachers" (Coursera)',
        description: 'Nhóm FB chia sẻ prompt mẫu hàng ngày. Khóa Coursera (free audit) dạy framework prompt cho GV.',
        url: 'https://coursera.org',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Dùng Claude soạn 10 câu MCQ trong 15 phút',
        difficulty: 'easy',
        estimatedTime: '15 phút',
        steps: [
          'Mở claude.ai, dán prompt: "Bạn là GV [môn] THPT VN. Soạn 10 câu MCQ chương [X] theo CT 2018. Mỗi câu 4 đáp án + đáp án đúng + giải thích ngắn."',
          'Đọc kết quả, sửa 2-3 câu chưa chuẩn (sai đáp án, từ ngữ máy)',
          'Dán vào Word/Quizizz để in/đăng',
          'So sánh thời gian vs soạn tay (~2 giờ)',
        ],
        deliverable: '1 đề 10 câu MCQ chuẩn + ghi nhận tiết kiệm thời gian',
      },
      {
        title: 'Dùng Canva AI tạo infographic tóm tắt 1 chương',
        difficulty: 'easy',
        estimatedTime: '30 phút',
        steps: [
          'Liệt kê 5-7 ý chính của 1 chương',
          'Mở Canva → Magic Design → nhập prompt "infographic [chủ đề] cho HS lớp [X]"',
          'Chỉnh sửa: thay text, đổi màu phù hợp môn',
          'Tải PDF/PNG, gửi HS qua LMS hoặc in dán lớp',
        ],
        deliverable: '1 infographic A4 + chia sẻ cho HS',
      },
      {
        title: 'Dùng Claude tạo rubric chấm bài viết theo 4 tiêu chí',
        difficulty: 'medium',
        estimatedTime: '20 phút',
        steps: [
          'Prompt Claude: "Viết rubric chấm bài viết [chủ đề] cho HS lớp [X], 4 tiêu chí, mỗi tiêu chí 4 mức (Chưa đạt → Xuất sắc)"',
          'Xem mẫu, điều chỉnh tiêu chí cho phù hợp môn/HS',
          'Áp dụng chấm 5 bài thực tế',
          'Hỏi 5 HS có hiểu rubric không, điều chỉnh diễn đạt',
        ],
        deliverable: '1 rubric chuẩn + 5 bài đã chấm theo rubric',
      },
    ],
  },

  // Tạo nội dung số (video, slide)
  'tds-content-creation': {
    methods: [
      {
        type: 'tool',
        title: 'Canva Edu (free cho GV) — slide, poster, infographic',
        description: 'Tài khoản miễn phí khi đăng ký bằng email .edu hoặc xác minh GV. Có hàng nghìn template.',
        url: 'https://canva.com/education',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'CapCut + Loom + OBS Studio — quay/biên tập video',
        description: 'CapCut: biên tập video trên điện thoại miễn phí. Loom: quay màn hình + webcam nhanh. OBS: live stream chuyên nghiệp.',
        url: 'https://capcut.com',
        duration: 'liên tục',
      },
      {
        type: 'video',
        title: 'Playlist "Video Lessons" — Kênh Cult of Pedagogy',
        description: 'Hướng dẫn quay bài giảng ngắn 5-10 phút hiệu quả. Cả tips ánh sáng + âm thanh giá rẻ.',
        url: 'https://youtube.com/@cultofpedagogy',
        duration: '3-5 giờ',
      },
      {
        type: 'community',
        title: 'Khóa "Video Production for Teachers" trên FUNiX/Coursera',
        description: 'Hướng dẫn từ A-Z: viết kịch bản → quay → biên tập → đăng. Có chứng chỉ.',
        url: 'https://funix.edu.vn',
        duration: '4-6 tuần',
      },
    ],
    exercises: [
      {
        title: 'Quay 1 video bài giảng 5 phút bằng Loom',
        difficulty: 'easy',
        estimatedTime: '1 giờ (viết kịch bản + quay + edit)',
        steps: [
          'Chọn 1 chủ đề nhỏ HS hay quên (VD: công thức Newton II)',
          'Viết kịch bản 5 phút trên giấy',
          'Mở Loom → share screen + webcam → quay 1 take',
          'Đăng lên LMS, theo dõi lượt xem + bình luận HS',
        ],
        deliverable: '1 video 5 phút có 80% HS xem + 3 bình luận',
      },
      {
        title: 'Thiết kế 1 slide PowerPoint 10 trang chuẩn 3-color',
        difficulty: 'medium',
        estimatedTime: '2-3 giờ',
        steps: [
          'Chọn 3 màu chủ đạo (VD: xanh dương / trắng / vàng)',
          'Dùng Canva template, mỗi slide 1 ý chính + ảnh minh họa',
          'Giảm chữ <30 từ/slide, dùng font Arial/Roboto',
          'Trình bày thử cho 1 đồng nghiệp + nhận góp ý',
        ],
        deliverable: '1 slide PPT 10 trang + biên bản góp ý',
      },
    ],
  },

  // Phân tích dữ liệu HS
  'tds-data-analytics': {
    methods: [
      {
        type: 'tool',
        title: 'Excel/Google Sheets — PivotTable + biểu đồ',
        description: 'Học PivotTable là kỹ năng quan trọng nhất. Đủ để phân tích điểm số, tần suất sai câu, theo dõi tiến độ HS.',
        duration: '1 tuần',
      },
      {
        type: 'practice',
        title: 'Dashboard GV trên inphysic.com',
        description: 'Hệ thống tự tổng hợp: điểm trung bình lớp / câu sai nhiều nhất / HS yếu nhất. Đọc dashboard 5 phút mỗi tuần.',
        duration: 'liên tục',
      },
      {
        type: 'video',
        title: 'Khóa "Excel for Teachers" trên YouTube + Udemy',
        description: 'Tìm khóa miễn phí trên YouTube hoặc Udemy (giảm giá còn ~250k). Tập trung PivotTable + VLOOKUP + biểu đồ.',
        duration: '10-15 giờ',
      },
      {
        type: 'community',
        title: 'Nhóm FB "GV thông minh với dữ liệu"',
        description: 'Cộng đồng GV VN chia sẻ template Excel + Google Sheets cho lớp học.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Tạo PivotTable phân tích điểm 1 lớp/1 học kỳ',
        difficulty: 'medium',
        estimatedTime: '2 giờ',
        steps: [
          'Nhập điểm 4 cột: HS / Bài KT1 / Bài KT2 / Cuối kỳ',
          'Insert → PivotTable → kéo HS vào Rows, bài KT vào Values',
          'Tính trung bình, max, min, độ lệch chuẩn',
          'Vẽ 1 biểu đồ cột so sánh 3 bài kiểm tra',
        ],
        deliverable: '1 file Excel có PivotTable + biểu đồ + 3 nhận xét',
      },
      {
        title: 'Tìm 5 câu HS sai nhiều nhất trong 1 đề + cải tiến',
        difficulty: 'easy',
        estimatedTime: '1 giờ',
        steps: [
          'Mở dashboard inphysic → chọn 1 đề đã chấm',
          'Lọc 5 câu có % đúng thấp nhất',
          'Phân tích vì sao sai (kiến thức / từ ngữ / lừa)',
          'Soạn 1 bài giảng bổ sung 5 phút cho 5 câu đó',
        ],
        deliverable: '1 báo cáo 5 câu + 1 video/slide bổ sung',
      },
    ],
  },

  // Dạy học online
  'tds-online-teaching': {
    methods: [
      {
        type: 'book',
        title: '"The Online Teaching Survival Guide" — Boettcher & Conrad',
        description: 'Cẩm nang dạy online toàn diện. Có bản dịch + tóm tắt trên blog GV VN.',
        duration: '3 tuần',
      },
      {
        type: 'video',
        title: 'Tutorial Zoom + Google Meet chính chủ',
        description: 'Học hết tính năng: breakout rooms, polls, whiteboard, share screen. Mỗi platform 2-3 giờ.',
        url: 'https://learning.zoom.us',
        duration: '5-6 giờ',
      },
      {
        type: 'practice',
        title: 'Quy tắc 3-2-1 cho lớp online',
        description: 'Mỗi 15 phút: 3 phút giảng / 2 phút HS làm / 1 phút check hiểu. Tránh giảng thẳng 45 phút HS sẽ "tắt camera".',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Khóa "Online Teaching" trên Coursera (UC Irvine)',
        description: 'Khóa 4 tuần, audit miễn phí. Có thực hành thiết kế khóa online.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
    ],
    exercises: [
      {
        title: 'Dạy 1 tiết online 45 phút theo quy tắc 3-2-1',
        difficulty: 'medium',
        estimatedTime: '1 tiết + 1 giờ soạn',
        steps: [
          'Chia 45 phút thành 5 block 9 phút',
          'Mỗi block: 5p giảng / 3p HS làm / 1p chat check',
          'Dùng Mentimeter polls 2-3 lần để HS tương tác',
          'Cuối tiết, hỏi HS thấy có khác lớp trước không',
        ],
        deliverable: '1 KHBD online 45 phút + recording + phản hồi HS',
      },
      {
        title: 'Tổ chức 1 buổi học breakout room (Zoom)',
        difficulty: 'easy',
        estimatedTime: '1 tiết',
        steps: [
          'Chia 30 HS thành 6 phòng nhỏ (5 HS/phòng)',
          'Giao mỗi phòng 1 nhiệm vụ trong 15 phút',
          'GV xoay vòng vào từng phòng quan sát',
          'Quay lại phòng chính: mỗi phòng cử đại diện báo cáo 2 phút',
        ],
        deliverable: '1 KHBD breakout + 6 sản phẩm nhóm + ảnh chụp màn hình',
      },
    ],
  },

  // An toàn thông tin cho HS
  'tds-security': {
    methods: [
      {
        type: 'book',
        title: 'Luật An toàn thông tin mạng 86/2015/QH13 + Luật ATM',
        description: 'Đọc kỹ điều về bảo vệ dữ liệu cá nhân HS. Liên quan trực tiếp công việc GV/Admin.',
        url: 'https://moj.gov.vn',
        duration: '1 tuần',
      },
      {
        type: 'practice',
        title: 'Dùng Google Workspace / OneDrive cho lớp',
        description: 'Lưu dữ liệu HS trên drive trường, KHÔNG dùng email/Drive cá nhân. Bật xác thực 2 bước.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Cybersecurity for Educators" trên Coursera',
        description: 'Khóa miễn phí. Tập trung: phishing / mật khẩu / GDPR / bảo vệ trẻ em online.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
      {
        type: 'community',
        title: 'Nhóm "An toàn mạng cho học đường VN"',
        description: 'FB group cập nhật cảnh báo lừa đảo nhắm HS / GV, mẫu công văn của Bộ.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Audit cách lưu trữ dữ liệu HS của bản thân',
        difficulty: 'easy',
        estimatedTime: '1 giờ',
        steps: [
          'Liệt kê tất cả nơi lưu dữ liệu HS (Drive cá nhân? Zalo? máy tính?)',
          'Đánh dấu nơi nào có MÃ ĐỊNH DANH HS (Bộ GD&ĐT, 10-12 số)',
          'Chuyển hết vào Drive trường + xóa khỏi nơi cá nhân',
          'Bật xác thực 2 bước cho tài khoản trường',
        ],
        deliverable: '1 checklist + screenshot 2FA đã bật',
      },
      {
        title: 'Tổ chức 1 tiết dạy "An toàn mạng" cho lớp',
        difficulty: 'medium',
        estimatedTime: '1 tiết + 1 giờ soạn',
        steps: [
          'Chuẩn bị 5 case thực tế: lừa đảo / lộ thông tin / bullying online',
          'HS thảo luận nhóm 4: phải làm gì trong từng case?',
          'Chốt lại 5 quy tắc vàng (KHÔNG share OTP, KHÔNG add lạ, báo người lớn...)',
          'HS ký cam kết tuân thủ',
        ],
        deliverable: '1 KHBD + 5 case + 30 cam kết HS',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TEACHER TREE — PHÁT TRIỂN NGHỀ NGHIỆP (TPD)
  // ───────────────────────────────────────────────────────────────────────────

  // Giao tiếp với phụ huynh & HS
  'tpd-communication': {
    methods: [
      {
        type: 'book',
        title: '"Crucial Conversations" — Kerry Patterson',
        description: 'Sách kinh điển về giao tiếp khó. Có bản dịch tiếng Việt. Áp dụng tốt khi gặp phụ huynh khó tính.',
        duration: '1 tháng',
      },
      {
        type: 'community',
        title: 'Khóa "Hành vi giao tiếp với phụ huynh" — Sở GD',
        description: 'Sở GD/Phòng GD thường mở khóa ngắn 2-3 buổi. Đăng ký qua trường.',
        duration: '2-3 buổi',
      },
      {
        type: 'practice',
        title: 'Thực hành "I-message" thay vì "You-message"',
        description: 'Thay "Em hư quá" bằng "Cô lo khi thấy em không nộp bài". Áp dụng cả với HS và phụ huynh.',
        duration: 'liên tục',
      },
      {
        type: 'video',
        title: 'TED Talk "Active listening" + "Nonviolent communication"',
        description: 'Video 10-15 phút mỗi cái. Học cách lắng nghe sâu trước khi phản ứng.',
        url: 'https://ted.com',
        duration: '1-2 giờ',
      },
    ],
    exercises: [
      {
        title: 'Họp phụ huynh: thử kỹ thuật "Khen 3 — Góp ý 1"',
        difficulty: 'easy',
        estimatedTime: '1 buổi họp PH',
        steps: [
          'Trước buổi họp, mỗi HS chuẩn bị 3 điểm mạnh + 1 điểm cần cải thiện',
          'Khi nói chuyện với PH, luôn bắt đầu bằng 3 điểm mạnh',
          'Sau đó nêu 1 điểm cần cải thiện cụ thể + giải pháp',
          'Quan sát phản ứng PH so với họp trước',
        ],
        deliverable: '1 bảng 30 HS x 4 ý + nhật ký phản ứng PH',
      },
      {
        title: 'Xử lý 1 case khiếu nại của phụ huynh',
        difficulty: 'hard',
        estimatedTime: '2-3 buổi gặp',
        steps: [
          'Lắng nghe trọn vẹn không cắt lời (10-15 phút)',
          'Tóm tắt lại để PH thấy mình hiểu',
          'Cùng PH tìm 2-3 giải pháp khả thi',
          'Hẹn 2 tuần sau review tiến độ',
        ],
        deliverable: '1 biên bản case + giải pháp + kết quả 2 tuần sau',
      },
    ],
  },

  // Mentor đồng nghiệp
  'tpd-mentoring': {
    methods: [
      {
        type: 'book',
        title: '"The Mentor\'s Guide" — Lois J. Zachary',
        description: 'Sách hướng dẫn mentor chuyên sâu. Khung 4 giai đoạn: Prepare / Negotiate / Enable / Closure.',
        duration: '3 tuần',
      },
      {
        type: 'practice',
        title: 'Đăng ký làm GV hướng dẫn sinh viên SP',
        description: 'Các trường SP gửi SV về thực tập 2-3 tháng. Đăng ký làm GV hướng dẫn để rèn kỹ năng mentor.',
        duration: '2-3 tháng',
      },
      {
        type: 'community',
        title: 'Tham gia mạng lưới GV cốt cán cấp Tỉnh',
        description: 'Nếu được chọn, sẽ mentor GV trong huyện/tỉnh. Đăng ký qua tổ chuyên môn → BGH.',
        duration: '1-2 năm',
      },
      {
        type: 'course',
        title: 'Khóa "Mentoring Teachers" trên Coursera',
        description: 'Khóa của University of London. Audit miễn phí, có chứng chỉ trả phí.',
        url: 'https://coursera.org',
        duration: '5 tuần',
      },
    ],
    exercises: [
      {
        title: 'Mentor 1 GV mới trong 1 tháng',
        difficulty: 'medium',
        estimatedTime: '4 buổi 1 giờ',
        steps: [
          'Buổi 1: hỏi mục tiêu + khó khăn của GV mới',
          'Buổi 2: dự giờ 1 tiết của họ, ghi quan sát',
          'Buổi 3: feedback theo mô hình "Glow & Grow" (1 điểm sáng + 1 cần phát triển)',
          'Buổi 4: cùng review tiến bộ',
        ],
        deliverable: '1 nhật ký mentor 4 buổi + biên bản dự giờ',
      },
      {
        title: 'Tổ chức 1 buổi peer-observation chéo trong tổ',
        difficulty: 'easy',
        estimatedTime: '1 tuần',
        steps: [
          'Tổ chia thành các cặp GV',
          'Mỗi cặp dự giờ chéo 1 tiết của nhau',
          'Dùng phiếu quan sát: 1 điểm hay + 1 đề xuất',
          'Cuối tuần, tổ họp 30 phút chia sẻ',
        ],
        deliverable: '1 phiếu quan sát mẫu + biên bản họp tổ',
      },
    ],
  },

  // Tự phản tỉnh (reflection)
  'tpd-reflection': {
    methods: [
      {
        type: 'book',
        title: '"The Reflective Practitioner" — Donald Schön',
        description: 'Sách nền tảng về phản tỉnh trong nghề. Đọc tóm tắt + tập viết nhật ký phản tỉnh.',
        duration: '2 tuần',
      },
      {
        type: 'practice',
        title: 'Viết nhật ký dạy học 5 phút/ngày',
        description: 'Mỗi tối, viết 3 dòng: tiết nào tốt nhất / điều gì làm tốt / điều gì làm khác lần sau. Dùng Notion/sổ tay.',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'Khung Gibbs Reflective Cycle (6 bước)',
        description: 'Description → Feelings → Evaluation → Analysis → Conclusion → Action Plan. In ra dán bàn làm việc.',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Đăng ký podcast "Cult of Pedagogy" + "TeachLab"',
        description: 'Podcast 30-45 phút mỗi tuần. Nghe khi lái xe / nấu ăn. Kích thích phản tỉnh.',
        url: 'https://cultofpedagogy.com',
        duration: 'hàng tuần',
      },
    ],
    exercises: [
      {
        title: 'Viết nhật ký Gibbs cho 1 tiết "khó" trong tuần',
        difficulty: 'easy',
        estimatedTime: '30 phút',
        steps: [
          'Chọn tiết khó nhất tuần (HS quậy / KHBD lệch / sự cố)',
          'Viết theo 6 bước Gibbs (mỗi bước 3-5 dòng)',
          'Đặc biệt chú ý Action Plan: lần sau làm gì khác',
          'Lưu vào folder cố định để xem lại sau 3 tháng',
        ],
        deliverable: '1 trang nhật ký Gibbs',
      },
      {
        title: 'Review 3 tháng nhật ký + rút 3 bài học lớn',
        difficulty: 'medium',
        estimatedTime: '2 giờ',
        steps: [
          'Cuối học kỳ, đọc lại toàn bộ nhật ký 3 tháng',
          'Highlight các pattern lặp lại (vấn đề / giải pháp)',
          'Viết 3 bài học lớn nhất + cam kết áp dụng kỳ sau',
          'Chia sẻ tổ chuyên môn 5 phút',
        ],
        deliverable: '1 trang "3 bài học từ 3 tháng" + slide chia sẻ',
      },
    ],
  },

  // Cân bằng cảm xúc & sức khỏe
  'tpd-wellbeing': {
    methods: [
      {
        type: 'book',
        title: '"Burnout: Bí mật giải tỏa căng thẳng" — Emily & Amelia Nagoski',
        description: 'Sách dễ đọc về cơ chế burnout của nghề chăm sóc (như GV). Có chương về kỹ thuật giải tỏa nhanh.',
        duration: '2 tuần',
      },
      {
        type: 'tool',
        title: 'App Calm + Headspace (mindfulness)',
        description: 'Thiền 10 phút/ngày trước khi đi dạy. Cả hai app đều có gói miễn phí cơ bản.',
        url: 'https://calm.com',
        duration: 'liên tục',
      },
      {
        type: 'practice',
        title: 'Quy tắc "Không email/Zalo sau 21h"',
        description: 'Đặt giờ tắt thông báo. Phụ huynh sẽ học cách tôn trọng nếu mình kiên trì.',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'CLB sức khỏe GV (đi bộ / yoga / cầu lông)',
        description: 'Mỗi trường thường có CLB. Nếu chưa, tự rủ 3-5 GV lập nhóm tập 2 lần/tuần.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Thực hành 21 ngày "5 phút thiền sáng"',
        difficulty: 'easy',
        estimatedTime: '21 ngày x 5 phút',
        steps: [
          'Đặt báo thức sớm hơn 10 phút',
          'Mở app Calm/Headspace, chọn "Daily Calm"',
          'Ngồi yên 5 phút theo hướng dẫn',
          'Ghi nhật ký 1 dòng cảm xúc trong ngày',
        ],
        deliverable: '21 dòng nhật ký cảm xúc + tự đánh giá thay đổi',
      },
      {
        title: 'Audit "energy drain" trong 1 tuần',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Mỗi tối viết 3 cột: HOẠT ĐỘNG / NĂNG LƯỢNG +/- / DỰ ĐỊNH',
          'Cuối tuần xác định 3 hoạt động "drain" nhất',
          'Lên kế hoạch giảm/ủy quyền/thay đổi 1 trong 3',
          'Theo dõi tuần sau xem có khá hơn không',
        ],
        deliverable: '1 bảng audit + 1 hành động cụ thể',
      },
    ],
  },

  // Lãnh đạo tổ chuyên môn
  'tpd-leadership': {
    methods: [
      {
        type: 'book',
        title: '"Leaders Eat Last" — Simon Sinek',
        description: 'Sách về lãnh đạo phụng sự, phù hợp với vai trò Tổ trưởng. Có bản dịch tiếng Việt.',
        duration: '3 tuần',
      },
      {
        type: 'practice',
        title: 'Đăng ký làm Tổ trưởng / Tổ phó chuyên môn',
        description: 'Bước đầu tiên để lãnh đạo. Học qua thực tế: họp tổ / phân công / báo cáo BGH.',
        duration: '1-3 năm',
      },
      {
        type: 'course',
        title: 'Khóa "Educational Leadership" trên Coursera',
        description: 'Khóa từ Johns Hopkins / U Michigan. Audit miễn phí, chứng chỉ trả phí.',
        url: 'https://coursera.org',
        duration: '6-8 tuần',
      },
      {
        type: 'community',
        title: 'Mạng lưới Tổ trưởng các trường trong cụm',
        description: 'Họp cụm 1-2 lần/học kỳ. Học cách điều hành tổ từ các trường lớn.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Điều hành 1 buổi họp tổ chuyên môn hiệu quả',
        difficulty: 'medium',
        estimatedTime: '1 buổi (90 phút)',
        steps: [
          'Trước họp 2 ngày: gửi agenda + tài liệu để GV đọc trước',
          'Trong họp: timekeeper 1 GV; mỗi mục giới hạn thời gian',
          'Cuối mỗi mục: chốt 3-4 action items (ai làm gì khi nào)',
          'Sau họp 1 ngày: gửi biên bản tóm tắt + action items',
        ],
        deliverable: '1 agenda + biên bản + action items rõ ràng',
      },
      {
        title: 'Khởi xướng 1 sáng kiến của tổ trong học kỳ',
        difficulty: 'hard',
        estimatedTime: '1 học kỳ',
        steps: [
          'Khảo sát tổ: vấn đề lớn nhất hiện tại là gì?',
          'Cùng tổ chọn 1 vấn đề + thiết kế giải pháp 3 tháng',
          'Phân vai trò + theo dõi tiến độ hàng tuần',
          'Cuối kỳ: báo cáo BGH + chia sẻ trong hội đồng',
        ],
        deliverable: '1 báo cáo sáng kiến + slide chia sẻ',
      },
    ],
  },

  // Kế hoạch CPD cá nhân
  'tpd-cpd-plan': {
    methods: [
      {
        type: 'book',
        title: '"7 thói quen của người thành đạt" — Stephen Covey',
        description: 'Sách kinh điển. Chương "Khẩn cấp vs Quan trọng" áp dụng tốt cho lập kế hoạch CPD.',
        duration: '1 tháng',
      },
      {
        type: 'tool',
        title: 'Notion / Trello để theo dõi CPD',
        description: 'Tạo board "Năm học 2026" với 4 cột: Mục tiêu / Đang học / Hoàn thành / Reflection.',
        url: 'https://notion.so',
        duration: 'liên tục',
      },
      {
        type: 'practice',
        title: 'Mẫu CPD Plan của Cục NGCBQLGD',
        description: 'Cục có mẫu kế hoạch tự bồi dưỡng theo Thông tư 19. Mỗi GV phải nộp đầu năm.',
        url: 'https://moet.gov.vn',
        duration: '1 tuần đầu năm',
      },
      {
        type: 'community',
        title: 'Hệ thống Professional KG inphysic.com',
        description: 'Cây kỹ năng tự đánh giá, đề xuất kế hoạch cá nhân, theo dõi tiến độ 5 năm.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Lập CPD Plan 1 năm theo mô hình SMART',
        difficulty: 'medium',
        estimatedTime: '2-3 giờ',
        steps: [
          'Liệt kê 5 năng lực muốn phát triển trong năm',
          'Mỗi năng lực viết 1 mục tiêu SMART (Specific, Measurable, Achievable, Relevant, Time-bound)',
          'Phân chia theo quý: Q1 làm gì / Q2 / Q3 / Q4',
          'In ra dán bàn làm việc + review mỗi quý',
        ],
        deliverable: '1 file CPD Plan 5 mục tiêu SMART + timeline',
      },
      {
        title: 'Review giữa năm + điều chỉnh CPD Plan',
        difficulty: 'easy',
        estimatedTime: '1 giờ',
        steps: [
          'Cuối học kỳ 1, mở lại CPD Plan',
          'Đánh giá: hoàn thành bao nhiêu %? Lý do trễ?',
          'Điều chỉnh mục tiêu Q3-Q4 cho thực tế hơn',
          'Chia sẻ với 1 mentor / Tổ trưởng để được góp ý',
        ],
        deliverable: '1 báo cáo review giữa năm + plan v2',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ADMIN TREE — QUẢN LÝ GIÁO DỤC (AME)
  // ───────────────────────────────────────────────────────────────────────────

  // Giám sát chương trình
  'ame-curriculum-oversight': {
    methods: [
      {
        type: 'book',
        title: 'Thông tư 32/2018 + Công văn 5512 + Công văn 4612',
        description: 'Bộ văn bản nền tảng. Admin cần thuộc lòng để giám sát + duyệt KHBD GV.',
        url: 'https://moet.gov.vn',
        duration: '2-3 tuần',
      },
      {
        type: 'practice',
        title: 'Dự giờ chéo + duyệt KHBD định kỳ',
        description: 'Mỗi tháng dự giờ 3-5 GV. Duyệt 100% KHBD đầu năm. Có biểu mẫu phản hồi cụ thể.',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'Hệ thống quản lý kế hoạch dạy inphysic.com',
        description: 'BGH có dashboard xem KHBD của tất cả GV + theo dõi tiến độ chương trình theo tuần.',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Hội nghị Hiệu trưởng cấp Tỉnh',
        description: 'Sở GD tổ chức 2-3 lần/năm. Học cách các trường khác triển khai CT 2018.',
        duration: '2-3 lần/năm',
      },
    ],
    exercises: [
      {
        title: 'Audit tiến độ chương trình giữa kỳ 1',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Tổng hợp lịch báo giảng của tất cả GV',
          'Đối chiếu với phân phối chương trình chuẩn',
          'Đánh dấu GV chậm tiến độ (>2 tuần)',
          'Gặp riêng từng GV chậm để hỗ trợ',
        ],
        deliverable: '1 báo cáo audit + danh sách GV cần hỗ trợ',
      },
      {
        title: 'Duyệt KHBD 1 tổ chuyên môn theo rubric',
        difficulty: 'medium',
        estimatedTime: '1 ngày',
        steps: [
          'Lấy KHBD của 10 GV trong tổ',
          'Dùng rubric 5 tiêu chí (mục tiêu / phương pháp / đánh giá / 5512 / sáng tạo)',
          'Cho điểm + viết feedback 5-10 dòng/KHBD',
          'Gặp Tổ trưởng feedback tổng + cách cải tiến',
        ],
        deliverable: '10 phiếu duyệt + 1 biên bản tổ',
      },
    ],
  },

  // Đánh giá GV
  'ame-teacher-eval': {
    methods: [
      {
        type: 'book',
        title: 'Thông tư 20/2018/TT-BGDĐT (Chuẩn nghề nghiệp GV)',
        description: 'Văn bản gốc về Chuẩn nghề nghiệp GV: 5 tiêu chuẩn, 15 tiêu chí. Đọc kỹ minh chứng từng mức.',
        url: 'https://moet.gov.vn',
        duration: '1 tuần',
      },
      {
        type: 'practice',
        title: 'Đánh giá GV cuối năm theo TT20',
        description: 'Áp dụng quy trình: GV tự đánh giá → Tổ đánh giá → BGH đánh giá. Tổng hợp hồ sơ.',
        duration: '1 tháng cuối năm',
      },
      {
        type: 'tool',
        title: 'Dashboard đánh giá GV inphysic.com',
        description: 'Hệ thống tự tổng hợp minh chứng: KHBD / dự giờ / điểm HS / SKKN. Giúp đánh giá khách quan.',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Khóa "Performance Management" trên Coursera',
        description: 'Khóa của Cornell University. Áp dụng được cho quản lý GV.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
    ],
    exercises: [
      {
        title: 'Thiết kế phiếu dự giờ chuẩn cho năm học',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Tham khảo phiếu dự giờ Sở GD + thầy/cô giỏi',
          'Thiết kế phiếu 5 mục: Mục tiêu / PP / Hoạt động / Đánh giá / Đề xuất',
          'Mỗi mục có 3 cấp đánh giá rõ ràng',
          'Pilot với 3 GV → điều chỉnh',
        ],
        deliverable: '1 phiếu dự giờ chuẩn + tài liệu hướng dẫn sử dụng',
      },
      {
        title: 'Đánh giá GV theo 360 độ (HS + đồng nghiệp + BGH)',
        difficulty: 'hard',
        estimatedTime: '1 tháng',
        steps: [
          'Chọn 5 GV thí điểm',
          'Khảo sát ẩn danh: 30 HS / 5 đồng nghiệp / 1 BGH cho mỗi GV',
          'Tổng hợp điểm + feedback theo 3 chiều',
          'Gặp riêng từng GV chia sẻ kết quả',
        ],
        deliverable: '5 báo cáo 360 + biên bản trao đổi cá nhân',
      },
    ],
  },

  // Tuyển dụng GV
  'ame-recruitment': {
    methods: [
      {
        type: 'book',
        title: 'Luật Viên chức 58/2010 + Nghị định 115 (tuyển viên chức)',
        description: 'Văn bản gốc về tuyển dụng GV trường công. Admin cần nắm quy trình + hồ sơ.',
        url: 'https://moj.gov.vn',
        duration: '2 tuần',
      },
      {
        type: 'practice',
        title: 'Quy trình 4 bước phỏng vấn GV',
        description: '1) Sàng lọc CV / 2) Bài viết chuyên môn / 3) Dạy thử 1 tiết / 4) Phỏng vấn động lực + giá trị.',
        duration: 'mỗi đợt tuyển',
      },
      {
        type: 'tool',
        title: 'Mẫu rubric phỏng vấn + chấm dạy thử',
        description: 'Tự thiết kế hoặc tham khảo Sở GD. Mỗi tiêu chí 4 mức để giảm chủ quan.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Hiring & Onboarding" trên Coursera/edX',
        description: 'Khóa của LinkedIn Learning / Wharton. Áp dụng được cho tuyển dụng GV.',
        url: 'https://coursera.org',
        duration: '3-4 tuần',
      },
    ],
    exercises: [
      {
        title: 'Thiết kế quy trình onboarding GV mới (1 tháng)',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Liệt kê 10 việc GV mới cần biết tuần 1 (LMS / quy chế / lớp...)',
          'Phân công 1 mentor + lịch gặp hàng tuần',
          'Tuần 2-4: tham dự + dự giờ + feedback',
          'Cuối tháng: review + điều chỉnh quy trình',
        ],
        deliverable: '1 checklist onboarding 4 tuần + phân công mentor',
      },
      {
        title: 'Phỏng vấn 1 ứng viên GV theo rubric',
        difficulty: 'easy',
        estimatedTime: '90 phút (45p dạy thử + 45p PV)',
        steps: [
          'Trước PV: gửi đề bài dạy thử + tiêu chí trước 1 tuần',
          'Ngày PV: 45p dự dạy thử + chấm theo rubric 5 tiêu chí',
          '45p phỏng vấn: 3 câu chuyên môn + 3 câu giá trị/động lực',
          'Sau PV: 1 ngày họp hội đồng thống nhất kết quả',
        ],
        deliverable: '1 hồ sơ ứng viên đầy đủ rubric + biên bản hội đồng',
      },
    ],
  },

  // Pháp luật giáo dục
  'ame-school-law': {
    methods: [
      {
        type: 'book',
        title: 'Luật Giáo dục 43/2019/QH14 + Điều lệ trường THPT',
        description: 'Bộ luật + điều lệ trường (TT32/2020). 2 văn bản bắt buộc đối với Admin.',
        url: 'https://moj.gov.vn',
        duration: '1 tháng',
      },
      {
        type: 'community',
        title: 'Hội nghị Phổ biến PL giáo dục cấp Tỉnh',
        description: 'Sở GD tổ chức cập nhật văn bản mới. Bắt buộc tham gia với Admin.',
        duration: '2-4 lần/năm',
      },
      {
        type: 'tool',
        title: 'Website moet.gov.vn + thuvienphapluat.vn',
        description: 'Bookmark 2 trang này. Mọi văn bản mới đều có. Đăng ký email alert văn bản mới.',
        url: 'https://thuvienphapluat.vn',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Quản lý nhà nước về giáo dục" — HV Quản lý GD',
        description: 'Khóa bồi dưỡng dành cho cán bộ quản lý trường. Bắt buộc cho Hiệu trưởng.',
        duration: '3-6 tháng',
      },
    ],
    exercises: [
      {
        title: 'Audit hồ sơ pháp lý của trường',
        difficulty: 'medium',
        estimatedTime: '2 tuần',
        steps: [
          'Liệt kê 20 loại hồ sơ trường phải có theo Điều lệ + TT',
          'Đối chiếu thực tế: cái nào đủ, cái nào thiếu',
          'Lập kế hoạch hoàn thiện 3 tháng',
          'Báo cáo Sở GD nếu có khó khăn',
        ],
        deliverable: '1 báo cáo audit + kế hoạch hoàn thiện',
      },
      {
        title: 'Xử lý 1 vụ kỷ luật HS theo đúng quy trình',
        difficulty: 'hard',
        estimatedTime: '2-3 tuần',
        steps: [
          'Họp hội đồng kỷ luật theo đúng thành phần TT08',
          'Lấy đầy đủ minh chứng + cho HS/PH bảo vệ',
          'Quyết định hình thức kỷ luật phù hợp pháp luật',
          'Lưu hồ sơ đầy đủ + theo dõi HS sau kỷ luật',
        ],
        deliverable: '1 bộ hồ sơ kỷ luật đầy đủ pháp lý',
      },
    ],
  },

  // Lập kế hoạch chiến lược
  'ame-strategic-plan': {
    methods: [
      {
        type: 'book',
        title: '"Good to Great" — Jim Collins',
        description: 'Sách kinh điển về xây tổ chức xuất sắc. Có bản dịch. Áp dụng được cho trường học.',
        duration: '1 tháng',
      },
      {
        type: 'tool',
        title: 'SWOT + OKR framework cho trường học',
        description: 'SWOT để đánh giá hiện trạng, OKR để đặt mục tiêu quý/năm. Có nhiều template miễn phí.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Strategic Planning for Schools" trên Coursera',
        description: 'Khóa của University of Michigan. Audit miễn phí, chứng chỉ trả phí.',
        url: 'https://coursera.org',
        duration: '5 tuần',
      },
      {
        type: 'community',
        title: 'Mạng lưới Hiệu trưởng cụm trường',
        description: 'Họp 2-4 lần/năm. Học cách các trường lập kế hoạch + chia sẻ best practices.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Lập kế hoạch chiến lược 5 năm cho trường',
        difficulty: 'hard',
        estimatedTime: '2-3 tháng',
        steps: [
          'Phân tích SWOT cùng BGH + Tổ trưởng (2 buổi)',
          'Xác định 3-5 mục tiêu chiến lược + KPI',
          'Phân kỳ thực hiện 5 năm (mỗi năm 1 milestone)',
          'Báo cáo Sở GD + công bố cho GV/PH',
        ],
        deliverable: '1 tài liệu chiến lược 5 năm + slide công bố',
      },
      {
        title: 'Triển khai OKR học kỳ cho 1 phòng ban',
        difficulty: 'medium',
        estimatedTime: '1 học kỳ',
        steps: [
          'Cùng tổ chọn 1 Objective + 3 Key Results',
          'Mỗi 2 tuần: check-in 15 phút theo dõi % KR',
          'Cuối kỳ: review + chấm điểm 0-100',
          'Rút kinh nghiệm cho kỳ sau',
        ],
        deliverable: '1 OKR sheet + 7 biên bản check-in',
      },
    ],
  },

  // Kiểm định chất lượng
  'ame-accreditation': {
    methods: [
      {
        type: 'book',
        title: 'Thông tư 18/2018/TT-BGDĐT (Kiểm định CLGD THCS+THPT)',
        description: 'Văn bản gốc về 5 tiêu chuẩn + 28 tiêu chí kiểm định. Bắt buộc với Hiệu trưởng.',
        url: 'https://moet.gov.vn',
        duration: '2-3 tuần',
      },
      {
        type: 'practice',
        title: 'Tự đánh giá theo TT18 mỗi năm',
        description: 'Trường tự đánh giá định kỳ → có hồ sơ minh chứng → trình Sở thẩm định.',
        duration: '1 năm/chu kỳ',
      },
      {
        type: 'community',
        title: 'Hội thảo Kiểm định Sở GD',
        description: 'Sở tổ chức trước đợt kiểm định. Học mẹo hoàn thiện hồ sơ + minh chứng.',
        duration: '1-2 lần/năm',
      },
      {
        type: 'tool',
        title: 'Phần mềm KĐCL của Bộ + biểu mẫu Sở',
        description: 'Có phần mềm chính thức để nhập + tính điểm các tiêu chí. Tải từ moet.gov.vn.',
        url: 'https://moet.gov.vn',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Tự đánh giá trường theo 5 tiêu chuẩn TT18',
        difficulty: 'hard',
        estimatedTime: '2 tháng',
        steps: [
          'Thành lập Hội đồng tự đánh giá (đủ thành phần)',
          'Mỗi tiêu chuẩn giao 1 nhóm thu thập minh chứng',
          'Họp tổng kết, chấm điểm từng tiêu chí',
          'Viết báo cáo + lưu hồ sơ minh chứng',
        ],
        deliverable: '1 báo cáo tự đánh giá + hồ sơ minh chứng 5 tiêu chuẩn',
      },
      {
        title: 'Cải thiện 1 tiêu chí đang yếu trong 1 học kỳ',
        difficulty: 'medium',
        estimatedTime: '1 học kỳ',
        steps: [
          'Chọn 1 tiêu chí điểm thấp (VD: 4.3 cơ sở vật chất)',
          'Lập kế hoạch cải thiện cụ thể + ngân sách',
          'Triển khai từng tháng có báo cáo',
          'Đánh giá lại cuối kỳ',
        ],
        deliverable: '1 kế hoạch + báo cáo cải thiện tiêu chí',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ADMIN TREE — PHÂN TÍCH DỮ LIỆU (ADA)
  // ───────────────────────────────────────────────────────────────────────────

  // Đọc dữ liệu giáo dục
  'ada-data-reading': {
    methods: [
      {
        type: 'book',
        title: '"Data-Driven Decision Making" — Cohen & Spillane',
        description: 'Sách hướng dẫn lãnh đạo trường dùng dữ liệu. Có bản tóm tắt + nhiều bài blog tiếng Việt.',
        duration: '3 tuần',
      },
      {
        type: 'practice',
        title: 'Dashboard Admin trên inphysic.com',
        description: 'Hiệu trưởng có dashboard tổng: % HS đậu / điểm TB lớp / GV nào dạy hiệu quả nhất. Đọc 10 phút/tuần.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Data Literacy for Educators" trên Coursera',
        description: 'Khóa của University of Pennsylvania. Học cách đọc/phê phán dữ liệu giáo dục.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
      {
        type: 'tool',
        title: 'Public dashboard moet.gov.vn (số liệu thống kê GD)',
        description: 'Bộ GD công khai nhiều báo cáo + dữ liệu. So sánh trường mình với mặt bằng tỉnh/cả nước.',
        url: 'https://moet.gov.vn',
        duration: 'hàng tháng',
      },
    ],
    exercises: [
      {
        title: 'Đọc + phân tích 1 báo cáo PISA/TIMSS quốc tế',
        difficulty: 'medium',
        estimatedTime: '3 giờ',
        steps: [
          'Tải báo cáo PISA gần nhất của VN (PDF tiếng Việt)',
          'Đọc Executive Summary + chương VN',
          'Viết 1 trang tóm tắt: VN đứng thứ mấy / điểm mạnh / điểm yếu',
          'Liên hệ điểm yếu PISA với điểm yếu trường mình',
        ],
        deliverable: '1 trang tóm tắt + 3 hành động cho trường',
      },
      {
        title: 'Phân tích điểm thi cuối kỳ toàn trường',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Tổng hợp điểm tất cả lớp + môn',
          'Tính trung bình / phương sai / phân bố theo môn',
          'So sánh với năm trước + với trường khác cùng cụm',
          'Trình bày BGH + đề xuất 3 hành động',
        ],
        deliverable: '1 báo cáo phân tích + slide trình bày',
      },
    ],
  },

  // KPI theo dõi
  'ada-kpi-tracking': {
    methods: [
      {
        type: 'book',
        title: '"Measure What Matters" — John Doerr (về OKR)',
        description: 'Sách kinh điển về OKR. Có bản dịch tiếng Việt. Áp dụng tốt cho trường học.',
        duration: '3 tuần',
      },
      {
        type: 'tool',
        title: 'Google Sheets + Looker Studio (miễn phí)',
        description: 'Sheets nhập dữ liệu, Looker để vẽ dashboard. Miễn phí, đủ cho trường vừa và nhỏ.',
        url: 'https://lookerstudio.google.com',
        duration: 'liên tục',
      },
      {
        type: 'practice',
        title: 'Bộ 10 KPI chuẩn cho trường THPT VN',
        description: 'Tỷ lệ HS đậu / điểm TB lớp / tỷ lệ HSG / % GV đạt CN / số SKKN... Tham khảo Sở GD.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "KPI Design" trên Coursera/Udemy',
        description: 'Khóa ngắn 3-4 tuần. Học cách thiết kế KPI SMART.',
        url: 'https://coursera.org',
        duration: '3-4 tuần',
      },
    ],
    exercises: [
      {
        title: 'Thiết kế bộ 10 KPI cho trường + dashboard',
        difficulty: 'hard',
        estimatedTime: '1 tháng',
        steps: [
          'Cùng BGH chọn 10 KPI ưu tiên',
          'Mỗi KPI: định nghĩa / nguồn dữ liệu / tần suất / mục tiêu',
          'Xây dashboard Google Sheets + Looker Studio',
          'Họp BGH mỗi tháng review',
        ],
        deliverable: '1 KPI sheet + 1 dashboard online',
      },
      {
        title: 'Theo dõi 1 KPI giảm sút + lập hành động phục hồi',
        difficulty: 'medium',
        estimatedTime: '2 tháng',
        steps: [
          'Phát hiện 1 KPI giảm (VD: tỷ lệ HS đậu giảm 5%)',
          'Phân tích nguyên nhân (đề khó? GV chuyển công tác? COVID?)',
          'Lập kế hoạch 2 tháng phục hồi với 3 hành động cụ thể',
          'Theo dõi tuần, báo cáo BGH',
        ],
        deliverable: '1 báo cáo root-cause + kế hoạch phục hồi',
      },
    ],
  },

  // Excel/Pivot/Power BI
  'ada-excel-analytics': {
    methods: [
      {
        type: 'course',
        title: 'Khóa "Excel Skills for Business" trên Coursera (Macquarie)',
        description: 'Khóa 4 mức từ Beginner → Expert. Audit miễn phí, chứng chỉ trả phí.',
        url: 'https://coursera.org',
        duration: '6 tháng (full track)',
      },
      {
        type: 'video',
        title: 'Kênh YouTube "ExcelIsFun" + "Leila Gharani"',
        description: 'Hàng nghìn video miễn phí. Tập trung PivotTable + Power Query + Power BI.',
        url: 'https://youtube.com/@ExcelIsFun',
        duration: 'hàng tuần',
      },
      {
        type: 'tool',
        title: 'Power BI Desktop (miễn phí cho Windows)',
        description: 'Tải miễn phí từ Microsoft. Dùng để xây dashboard chuyên nghiệp từ dữ liệu Excel.',
        url: 'https://powerbi.microsoft.com',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Nhóm FB "Excel cho người không IT" + "Power BI Vietnam"',
        description: 'Cộng đồng giúp đỡ. Đăng câu hỏi sẽ có người trả lời trong vài giờ.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Xây dashboard Excel theo dõi điểm 6 môn x 12 lớp',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Tạo sheet dữ liệu thô: HS / Lớp / Môn / Điểm',
          'PivotTable: trung bình điểm theo lớp x môn',
          'Insert Slicer để lọc theo lớp / khối',
          'Vẽ 3 biểu đồ: cột so sánh / line trend / heat map',
        ],
        deliverable: '1 file Excel có 3 chart + 2 slicer',
      },
      {
        title: 'Tạo dashboard Power BI từ dữ liệu trường',
        difficulty: 'hard',
        estimatedTime: '2 tuần',
        steps: [
          'Export dữ liệu HS/điểm/lớp từ SMAS/VnEdu',
          'Import vào Power BI Desktop',
          'Thiết kế 3 trang: Tổng quan / Theo lớp / Theo môn',
          'Publish lên Power BI Service (gói miễn phí)',
        ],
        deliverable: '1 dashboard Power BI 3 trang + link share',
      },
    ],
  },

  // Báo cáo cho Sở GD
  'ada-reporting': {
    methods: [
      {
        type: 'book',
        title: 'Hệ thống mẫu báo cáo của Sở GD&ĐT',
        description: 'Sở có bộ mẫu báo cáo định kỳ (tháng / quý / năm). Lưu trữ + cập nhật khi có thay đổi.',
        duration: 'liên tục',
      },
      {
        type: 'practice',
        title: 'Thực hành 1 báo cáo/tháng với cấu trúc chuẩn',
        description: '6 mục: Hiện trạng / Số liệu / Phân tích / Kiến nghị / Kế hoạch / Phụ lục.',
        duration: 'hàng tháng',
      },
      {
        type: 'course',
        title: 'Khóa "Business Writing" trên Coursera (UC Berkeley)',
        description: 'Khóa miễn phí. Học cách viết ngắn gọn, rõ ràng, có cấu trúc.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
      {
        type: 'tool',
        title: 'Template Word + slide template của trường',
        description: 'Xây template chuẩn để tiết kiệm thời gian. Có header / footer / format thống nhất.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Viết báo cáo tháng theo cấu trúc 6 mục',
        difficulty: 'medium',
        estimatedTime: '4 giờ',
        steps: [
          'Tổng hợp số liệu trong tháng (HS / GV / hoạt động)',
          'Viết 6 mục, mỗi mục ngắn gọn 5-10 dòng',
          'Đính kèm phụ lục (bảng / biểu đồ)',
          'Gửi BGH review trước khi nộp Sở',
        ],
        deliverable: '1 báo cáo Word 4-6 trang + phụ lục',
      },
      {
        title: 'Trình bày báo cáo cuối kỳ trước hội đồng',
        difficulty: 'hard',
        estimatedTime: '2 tuần chuẩn bị + 1 buổi trình bày',
        steps: [
          'Viết báo cáo Word 10-15 trang',
          'Chuyển thành slide 15-20 trang (1 slide / 1 ý)',
          'Tập trình bày 15-20 phút + 10 phút Q&A',
          'Trình bày, ghi nhận góp ý, chỉnh sửa',
        ],
        deliverable: '1 báo cáo Word + slide + biên bản hội đồng',
      },
    ],
  },

  // AI để phân tích xu hướng
  'ada-ai-insights': {
    methods: [
      {
        type: 'tool',
        title: 'Claude.ai để phân tích dữ liệu CSV',
        description: 'Upload CSV/Excel lên Claude → hỏi câu phân tích bằng tiếng Việt. Claude trả về insight + biểu đồ.',
        url: 'https://claude.ai',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'ChatGPT Advanced Data Analysis (gói Plus)',
        description: 'Upload Excel, GPT tự chạy Python phân tích + vẽ chart. Cần gói Plus ~500k/tháng.',
        url: 'https://chat.openai.com',
        duration: 'liên tục',
      },
      {
        type: 'practice',
        title: 'AI Dashboard trên inphysic.com',
        description: 'Hệ thống có AI tự nhận diện: HS nguy cơ tụt hạng / câu sai phổ biến / GV cần hỗ trợ. Đọc weekly.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "AI for Education Leaders" trên Coursera',
        description: 'Khóa của Cornell. Áp dụng AI vào quản lý trường + ra quyết định.',
        url: 'https://coursera.org',
        duration: '5 tuần',
      },
    ],
    exercises: [
      {
        title: 'Dùng Claude phân tích 1 file điểm Excel',
        difficulty: 'easy',
        estimatedTime: '30 phút',
        steps: [
          'Export điểm 1 khối lớp ra Excel/CSV',
          'Upload lên Claude (Pro/Free đều được)',
          'Prompt: "Phân tích phân bố điểm + nêu 5 insight + 3 hành động đề xuất"',
          'Verify lại 2-3 con số quan trọng',
        ],
        deliverable: '1 báo cáo insight từ Claude + verify',
      },
      {
        title: 'Dùng AI dự đoán HS nguy cơ trượt cuối kỳ',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Lấy dữ liệu điểm giữa kỳ + chuyên cần',
          'Upload lên Claude/inphysic AI Dashboard',
          'Yêu cầu nhận diện HS có ≥3 yếu tố rủi ro',
          'Lập kế hoạch hỗ trợ riêng cho từng HS',
        ],
        deliverable: '1 danh sách HS nguy cơ + 1 kế hoạch hỗ trợ',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ADMIN TREE — PHÁT TRIỂN TỔ CHỨC (AOD)
  // ───────────────────────────────────────────────────────────────────────────

  // Văn hóa trường học
  'aod-school-culture': {
    methods: [
      {
        type: 'book',
        title: '"Shaping School Culture" — Deal & Peterson',
        description: 'Sách kinh điển về xây văn hóa trường. Có bản dịch tóm tắt trên blog quản lý GD VN.',
        duration: '1 tháng',
      },
      {
        type: 'practice',
        title: 'Tổ chức 1 sự kiện văn hóa/tháng',
        description: 'VD: Tháng 9 chào tựu trường, Tháng 11 ngày Nhà giáo, Tháng 3 Ngày phụ nữ... Có chương trình rõ.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Building Positive School Culture" trên Coursera',
        description: 'Khóa của Vanderbilt University. Audit miễn phí.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
      {
        type: 'community',
        title: 'Mạng lưới Hiệu trưởng trường tư + công thành công',
        description: 'Học hỏi cách các trường có văn hóa mạnh xây dựng (Vinschool, Olympia, Quốc Tế Á Châu...).',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Khảo sát văn hóa trường (anonymous survey)',
        difficulty: 'medium',
        estimatedTime: '2 tuần',
        steps: [
          'Thiết kế Google Form 15 câu (GV + HS + PH)',
          'Gửi ẩn danh, đảm bảo riêng tư',
          'Tổng hợp, vẽ biểu đồ điểm mạnh / yếu',
          'Họp BGH + GV phản hồi kết quả + lên kế hoạch cải thiện',
        ],
        deliverable: '1 báo cáo khảo sát + kế hoạch cải thiện 3 tháng',
      },
      {
        title: 'Xây bộ giá trị cốt lõi của trường',
        difficulty: 'hard',
        estimatedTime: '2-3 tháng',
        steps: [
          'Workshop BGH + Tổ trưởng: brainstorm 20 giá trị',
          'Bỏ phiếu chọn 5 giá trị cốt lõi',
          'Triển khai: poster lớp, slogan trường, đưa vào KPI',
          'Quý 2 + 4 review + điều chỉnh',
        ],
        deliverable: '1 bộ 5 giá trị + poster + plan triển khai',
      },
    ],
  },

  // Quản lý thay đổi
  'aod-change-mgmt': {
    methods: [
      {
        type: 'book',
        title: '"Leading Change" — John Kotter (8 bước)',
        description: 'Sách kinh điển. Có bản dịch + có thể tìm bản tóm tắt 30 phút trên Blinkist.',
        duration: '3 tuần',
      },
      {
        type: 'practice',
        title: 'Áp dụng Kotter 8 bước cho 1 sáng kiến lớn',
        description: 'VD: chuyển sang LMS mới / triển khai CT 2018 / chuyển dạy 2 buổi. Có khung 8 bước rõ.',
        duration: '6-12 tháng',
      },
      {
        type: 'course',
        title: 'Khóa "Leading Change" trên Coursera (Kotter chính chủ)',
        description: 'Khóa của Kotter\'s firm. Audit miễn phí.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
      {
        type: 'community',
        title: 'Hội Hiệu trưởng VN + nhóm "Change Management for Schools"',
        description: 'Học từ các trường đã trải qua thay đổi lớn (chuyển CT mới, sáp nhập, đổi mô hình...).',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Lập kế hoạch chuyển đổi 1 chương trình (Kotter 8 bước)',
        difficulty: 'hard',
        estimatedTime: '1 tháng',
        steps: [
          'Bước 1-3: tạo sự cấp thiết + liên minh + tầm nhìn',
          'Bước 4-6: truyền thông + ủy quyền + chiến thắng ngắn hạn',
          'Bước 7-8: duy trì + thể chế hóa',
          'Mỗi bước: viết ra ai làm gì khi nào',
        ],
        deliverable: '1 plan 8 bước + timeline + danh sách stakeholders',
      },
      {
        title: 'Xử lý 1 sự kháng cự của GV với thay đổi',
        difficulty: 'medium',
        estimatedTime: '2-3 buổi gặp',
        steps: [
          'Gặp riêng, lắng nghe lý do kháng cự (đừng phán xét)',
          'Phân loại: lo ngại kỹ năng / lợi ích / niềm tin',
          'Đề xuất giải pháp riêng cho từng loại',
          'Theo dõi 1 tháng + chia sẻ thành công nhỏ',
        ],
        deliverable: '1 case study + giải pháp + kết quả 1 tháng',
      },
    ],
  },

  // Giao tiếp cộng đồng (PH, HS, GV)
  'aod-community': {
    methods: [
      {
        type: 'book',
        title: '"Schools and Communities" — Mavis Sanders',
        description: 'Sách về xây dựng partnership với cộng đồng. Có bản tóm tắt online.',
        duration: '3 tuần',
      },
      {
        type: 'practice',
        title: 'Fanpage trường + nhóm Zalo PH cấp trường',
        description: 'Cập nhật tuần. Phân công 1 người phụ trách. Có quy chế đăng/duyệt.',
        duration: 'liên tục',
      },
      {
        type: 'tool',
        title: 'Mailchimp / Sendinblue gửi newsletter PH',
        description: 'Gửi bản tin tháng cho PH. Miễn phí <500 người. Theo dõi tỷ lệ mở.',
        url: 'https://mailchimp.com',
        duration: 'liên tục',
      },
      {
        type: 'community',
        title: 'Khóa "Community Engagement" trên Coursera',
        description: 'Khóa của Johns Hopkins University. Audit miễn phí.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
    ],
    exercises: [
      {
        title: 'Xây kế hoạch truyền thông 1 học kỳ',
        difficulty: 'medium',
        estimatedTime: '1 tuần',
        steps: [
          'Liệt kê 20 sự kiện trong kỳ (lễ / thi / hội thảo...)',
          'Mỗi sự kiện: 3 kênh đăng (fanpage / zalo / web)',
          'Phân công người chụp + viết + duyệt',
          'Quy chế thời gian: trước / trong / sau sự kiện',
        ],
        deliverable: '1 kế hoạch truyền thông 1 học kỳ + lịch đăng',
      },
      {
        title: 'Tổ chức 1 buổi "Town Hall" với PH',
        difficulty: 'hard',
        estimatedTime: '1 tháng chuẩn bị + 1 buổi',
        steps: [
          'Khảo sát PH: 3 chủ đề muốn thảo luận nhất',
          'Mời 100-200 PH, chuẩn bị ăn nhẹ',
          'BGH trình bày 30 phút + Q&A 60 phút',
          'Sau buổi: gửi tổng kết + action items cho mọi PH',
        ],
        deliverable: '1 biên bản Town Hall + danh sách action items',
      },
    ],
  },

  // Giải quyết xung đột
  'aod-conflict-mgmt': {
    methods: [
      {
        type: 'book',
        title: '"Difficult Conversations" — Stone, Patton, Heen',
        description: 'Sách kinh điển. Có bản dịch tiếng Việt. Khung 3 cuộc trò chuyện trong 1 vấn đề khó.',
        duration: '3 tuần',
      },
      {
        type: 'practice',
        title: 'Quy trình 5 bước xử lý mâu thuẫn',
        description: '1) Lắng nghe / 2) Hiểu sự việc / 3) Tìm nhu cầu chung / 4) Brainstorm giải pháp / 5) Thỏa thuận.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Conflict Resolution Skills" trên Coursera (UC Irvine)',
        description: 'Khóa miễn phí audit. Có chứng chỉ trả phí.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
      {
        type: 'community',
        title: 'Trainer mediation cấp Tỉnh',
        description: 'Sở/Phòng GD có chương trình đào tạo hòa giải. Đăng ký qua trường.',
        duration: '3-5 ngày',
      },
    ],
    exercises: [
      {
        title: 'Hòa giải 1 mâu thuẫn giữa 2 GV',
        difficulty: 'hard',
        estimatedTime: '3-5 buổi gặp',
        steps: [
          'Gặp riêng từng bên nghe góc nhìn',
          'Gặp chung, đặt nguyên tắc giao tiếp tôn trọng',
          'Tìm điểm chung + nhu cầu sâu xa',
          'Đề xuất giải pháp + thỏa thuận viết',
          'Theo dõi 1 tháng',
        ],
        deliverable: '1 biên bản hòa giải + thỏa thuận chữ ký',
      },
      {
        title: 'Xử lý khiếu nại PH theo SOP',
        difficulty: 'medium',
        estimatedTime: '1-2 tuần',
        steps: [
          'Tiếp nhận khiếu nại bằng văn bản + cảm ơn',
          'Điều tra trong 7 ngày: nghe các bên + xem minh chứng',
          'Trả lời PH bằng văn bản trong 15 ngày',
          'Lưu hồ sơ + cải tiến quy trình',
        ],
        deliverable: '1 SOP xử lý khiếu nại + 1 case study',
      },
    ],
  },

  // Đổi mới sáng tạo
  'aod-innovation': {
    methods: [
      {
        type: 'book',
        title: '"The Innovator\'s DNA" — Christensen, Dyer, Gregersen',
        description: 'Sách về 5 kỹ năng đổi mới. Có bản dịch + tóm tắt.',
        duration: '3 tuần',
      },
      {
        type: 'practice',
        title: 'Triển khai 1 sáng kiến/học kỳ',
        description: 'VD: lớp học STEM / chiều thứ 7 CLB / dạy 2 buổi. Mỗi sáng kiến có MVP + đo lường.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Design Thinking for Education" trên IDEO U',
        description: 'Khóa trả phí (~99 USD). Có nhiều bản miễn phí trên YouTube + workshop của IDEO.',
        url: 'https://ideou.com',
        duration: '5 tuần',
      },
      {
        type: 'community',
        title: 'Tham quan các trường đổi mới (Vinschool, Olympia, FPT School)',
        description: 'Xin tham quan 1-2 trường/năm. Học cách họ tổ chức, đầu tư, đo lường.',
        duration: '1-2 lần/năm',
      },
    ],
    exercises: [
      {
        title: 'Tổ chức 1 hackathon GV "Ý tưởng đổi mới lớp học"',
        difficulty: 'medium',
        estimatedTime: '1 ngày',
        steps: [
          'Mời 30-50 GV, chia 5-7 nhóm',
          'Buổi sáng: brainstorm + chọn 1 ý tưởng',
          'Buổi chiều: prototype + chuẩn bị pitch',
          'Tối: pitch 5 phút, hội đồng chọn 3 ý tưởng để hỗ trợ triển khai',
        ],
        deliverable: '5-7 ý tưởng + 3 được chọn hỗ trợ',
      },
      {
        title: 'Triển khai MVP 1 sáng kiến trong 1 lớp',
        difficulty: 'hard',
        estimatedTime: '1 tháng',
        steps: [
          'Chọn 1 ý tưởng + 1 lớp tự nguyện thí điểm',
          'Định nghĩa MVP nhỏ nhất (VD: 4 tiết)',
          'Triển khai + thu phản hồi HS/GV',
          'Quyết định scale hay dừng + lý do',
        ],
        deliverable: '1 MVP report + quyết định scale/dừng',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ADMIN TREE — LÃNH ĐẠO & GIAO TIẾP (ALC)
  // ───────────────────────────────────────────────────────────────────────────

  // Phong cách lãnh đạo
  'alc-leadership-style': {
    methods: [
      {
        type: 'book',
        title: '"Primal Leadership" — Daniel Goleman (6 phong cách)',
        description: 'Sách kinh điển về 6 phong cách: Visionary / Coaching / Affiliative / Democratic / Pacesetting / Commanding. Có bản dịch.',
        duration: '3 tuần',
      },
      {
        type: 'tool',
        title: 'Test miễn phí "Leadership Style Quiz" (MindTools)',
        description: 'Làm test 15 phút để biết phong cách chủ đạo + phụ. Có nhiều phiên bản miễn phí online.',
        url: 'https://mindtools.com',
        duration: '15 phút',
      },
      {
        type: 'course',
        title: 'Khóa "Leadership in 21st Century Organizations" — Coursera',
        description: 'Khóa của Copenhagen Business School. Audit miễn phí.',
        url: 'https://coursera.org',
        duration: '6 tuần',
      },
      {
        type: 'community',
        title: 'Coaching 1-1 với cựu hiệu trưởng/lãnh đạo GD',
        description: 'Tìm mentor qua mạng lưới Hiệu trưởng cụm. Mỗi tháng 1 buổi coaching 1 giờ.',
        duration: '6-12 tháng',
      },
    ],
    exercises: [
      {
        title: 'Tự đánh giá + xin feedback 360 phong cách',
        difficulty: 'medium',
        estimatedTime: '2 tuần',
        steps: [
          'Làm 2-3 bài test phong cách online',
          'Xin feedback ẩn danh từ 10 đồng nghiệp / cấp dưới',
          'So sánh: mình nghĩ vs người khác nhìn',
          'Chọn 1 phong cách cần rèn thêm trong 3 tháng',
        ],
        deliverable: '1 báo cáo tự đánh giá + plan rèn 1 phong cách',
      },
      {
        title: 'Thử áp dụng phong cách "Coaching" trong 1 tháng',
        difficulty: 'medium',
        estimatedTime: '1 tháng',
        steps: [
          'Chọn 3 GV để "coach" thay vì chỉ đạo',
          'Mỗi tuần gặp 30 phút, hỏi nhiều hơn nói',
          'Dùng câu hỏi GROW (Goal-Reality-Options-Will)',
          'Cuối tháng: hỏi 3 GV thấy khác trước thế nào',
        ],
        deliverable: '1 nhật ký coaching + phản hồi 3 GV',
      },
    ],
  },

  // Giao tiếp với cấp trên & GV
  'alc-communication': {
    methods: [
      {
        type: 'book',
        title: '"Just Listen" — Mark Goulston',
        description: 'Sách về lắng nghe sâu. Có bản dịch tiếng Việt.',
        duration: '2 tuần',
      },
      {
        type: 'practice',
        title: 'Quy tắc 80/20: nghe 80% nói 20%',
        description: 'Trong họp / 1-1 với GV / báo cáo cấp trên. Đếm thời gian thực tế.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Effective Communication" trên Coursera (UC Boulder)',
        description: 'Khóa 4 tuần audit miễn phí. Có thực hành thuyết trình + viết.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
      {
        type: 'community',
        title: 'CLB Toastmasters tại địa phương',
        description: 'Rèn nói trước đám đông + lãnh đạo. Phí ~500k/năm. Có ở hầu hết tỉnh thành.',
        url: 'https://toastmasters.org',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Theo dõi tỷ lệ "nói vs nghe" trong 1 tuần',
        difficulty: 'easy',
        estimatedTime: '1 tuần',
        steps: [
          'Trong 10 cuộc họp/trò chuyện, ước lượng % mình nói',
          'Mục tiêu: <30% trong họp với cấp dưới',
          'Mỗi lần nói, hỏi: có thực sự cần thiết không?',
          'Cuối tuần đánh giá + đặt mục tiêu tuần sau',
        ],
        deliverable: '1 bảng theo dõi 10 cuộc + nhận xét',
      },
      {
        title: 'Thuyết trình 1 báo cáo trước hội đồng GV',
        difficulty: 'medium',
        estimatedTime: '1 tuần chuẩn bị',
        steps: [
          'Viết script: mở (30s) - thân (5 phút) - kết (30s)',
          'Tập trước gương 3 lần',
          'Tập trước 1-2 đồng nghiệp + xin góp ý',
          'Trình bày, quay video lại để review',
        ],
        deliverable: '1 video thuyết trình + tự review 3 điểm cải thiện',
      },
    ],
  },

  // Trí tuệ cảm xúc (EQ)
  'alc-emotional-intel': {
    methods: [
      {
        type: 'book',
        title: '"Emotional Intelligence" — Daniel Goleman',
        description: 'Sách nền tảng về EQ. Có bản dịch tiếng Việt rất phổ biến.',
        duration: '1 tháng',
      },
      {
        type: 'tool',
        title: 'Test EQ-i 2.0 hoặc MSCEIT (online)',
        description: 'Có nhiều phiên bản miễn phí. Đánh giá 5 thành tố EQ. Làm 30 phút.',
        duration: '30 phút',
      },
      {
        type: 'practice',
        title: 'Thiền + nhật ký cảm xúc',
        description: 'Mỗi tối viết 3 dòng: cảm xúc nổi bật / nguyên nhân / phản ứng tốt hơn lần sau.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Inspiring Leadership through EI" — Coursera (Case Western)',
        description: 'Khóa 19 tuần (có thể audit ngắn). Của Richard Boyatzis — đồng tác giả với Goleman.',
        url: 'https://coursera.org',
        duration: '6-19 tuần',
      },
    ],
    exercises: [
      {
        title: 'Nhật ký cảm xúc 30 ngày',
        difficulty: 'easy',
        estimatedTime: '30 ngày x 5 phút',
        steps: [
          'Mỗi tối viết 3 dòng: cảm xúc / trigger / phản ứng',
          'Cuối tuần xem lại, đánh dấu pattern',
          'Tuần 3-4: thử kỹ thuật STOP (Stop-Take breath-Observe-Proceed) khi bị kích động',
          'Cuối tháng tự đánh giá thay đổi',
        ],
        deliverable: '30 dòng nhật ký + 1 trang tổng kết',
      },
      {
        title: 'Xử lý 1 tình huống căng thẳng cao bằng EQ',
        difficulty: 'hard',
        estimatedTime: '1-2 buổi gặp',
        steps: [
          'Khi gặp tình huống căng (PH gây gổ, GV cãi nhau...): hít thở 5 giây trước phản hồi',
          'Đặt tên cảm xúc của mình + của đối tác',
          'Lắng nghe sâu 5-10 phút không phản bác',
          'Đề xuất giải pháp khi cả 2 đã hạ nhiệt',
        ],
        deliverable: '1 case study + reflection 1 trang',
      },
    ],
  },

  // Ra quyết định
  'alc-decision-making': {
    methods: [
      {
        type: 'book',
        title: '"Thinking, Fast and Slow" — Daniel Kahneman',
        description: 'Sách kinh điển về 2 hệ thống tư duy + biases. Có bản dịch.',
        duration: '2 tháng',
      },
      {
        type: 'tool',
        title: 'Khung quyết định: Decision Matrix + Pre-mortem',
        description: 'Matrix để chấm điểm các option. Pre-mortem: tưởng tượng quyết định thất bại, vì sao?',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "Decision Making" trên Coursera (Wharton)',
        description: 'Khóa của Wharton Business School. Audit miễn phí.',
        url: 'https://coursera.org',
        duration: '4 tuần',
      },
      {
        type: 'practice',
        title: 'Quy tắc "Sleep on it" cho quyết định lớn',
        description: 'Không quyết định lớn ngay trong ngày. Ngủ 1 đêm, suy nghĩ lại. Tránh bias cảm xúc.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Áp dụng Decision Matrix cho 1 quyết định',
        difficulty: 'easy',
        estimatedTime: '1 giờ',
        steps: [
          'Chọn 1 quyết định sắp tới (VD: chọn LMS / tuyển GV)',
          'Liệt kê 3-5 phương án',
          'Định nghĩa 5 tiêu chí + trọng số',
          'Chấm điểm 1-5 mỗi phương án x tiêu chí, tính tổng',
        ],
        deliverable: '1 file Excel matrix + quyết định cuối',
      },
      {
        title: 'Pre-mortem cho 1 sáng kiến lớn',
        difficulty: 'medium',
        estimatedTime: '2 giờ',
        steps: [
          'Họp đội 4-6 người',
          'Đặt tình huống: "6 tháng nữa sáng kiến thất bại, vì sao?"',
          'Mỗi người viết 5 lý do trong 10 phút',
          'Tổng hợp top 10 rủi ro + lập kế hoạch giảm thiểu',
        ],
        deliverable: '1 báo cáo pre-mortem + kế hoạch giảm rủi ro',
      },
    ],
  },

  // Phát triển nghề nghiệp liên tục (Admin)
  'alc-cpd': {
    methods: [
      {
        type: 'book',
        title: '"The Learning Leader" — Michael Roberto',
        description: 'Sách về lãnh đạo học hỏi suốt đời. Có bản tóm tắt online.',
        duration: '3 tuần',
      },
      {
        type: 'community',
        title: 'Hội Hiệu trưởng Việt Nam + chương trình ILA Leadership',
        description: 'Tham gia hội nghị + workshop. Có nhiều chương trình tài trợ bởi Bộ GD / WB.',
        duration: 'liên tục',
      },
      {
        type: 'course',
        title: 'Khóa "School Leadership" trên Harvard X / Coursera',
        description: 'Harvard có chương trình "Certificate in School Management" (trả phí). Coursera nhiều khóa miễn phí.',
        url: 'https://hbsp.harvard.edu',
        duration: '6 tháng - 2 năm',
      },
      {
        type: 'tool',
        title: 'Hệ thống Professional KG inphysic.com (Admin tree)',
        description: 'Cây kỹ năng dành riêng cho Admin. Tự đánh giá + đề xuất lộ trình 5 năm.',
        duration: 'liên tục',
      },
    ],
    exercises: [
      {
        title: 'Lập CPD Plan 5 năm cho vị trí lãnh đạo',
        difficulty: 'hard',
        estimatedTime: '1 tuần',
        steps: [
          'Liệt kê 10 năng lực cần có cho vị trí 5 năm sau',
          'Đánh giá hiện tại 0-100% từng năng lực',
          'Chọn top 5 gap → kế hoạch học tập từng năm',
          'In dán bàn + review hàng quý',
        ],
        deliverable: '1 CPD Plan 5 năm + lịch review quý',
      },
      {
        title: 'Tham gia 1 chương trình lãnh đạo cấp Tỉnh/QG',
        difficulty: 'hard',
        estimatedTime: '6-12 tháng',
        steps: [
          'Tìm chương trình của Sở GD / Học viện QLGD / WB / VVOB',
          'Đăng ký + xin thư giới thiệu',
          'Cam kết tham gia đầy đủ + hoàn thành project tốt nghiệp',
          'Chia sẻ kiến thức lại cho BGH + cụm trường',
        ],
        deliverable: '1 chứng chỉ + 1 project + 1 buổi chia sẻ',
      },
    ],
  },
}

// =============================================================================
// HELPER
// =============================================================================

/**
 * Lấy gợi ý phương pháp + bài tập cho 1 skillId.
 * Trả undefined nếu chưa có entry cho skill đó.
 */
export function getSuggestion(skillId: string): SkillSuggestion | undefined {
  return SKILL_SUGGESTIONS[skillId]
}
