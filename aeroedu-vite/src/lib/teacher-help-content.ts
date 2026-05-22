/**
 * Teacher Help Content — nguồn data trung tâm cho hệ thống hướng dẫn
 *
 * Cấu trúc:
 *   teacherHelp[moduleKey] = {
 *     title, summary, sections: [{ heading, content, tip? }],
 *     tooltips: { tipKey: 'Nội dung tooltip ngắn' },
 *   }
 *
 * Cách dùng:
 *   1. TAB drawer:   <TeacherHelpDrawer moduleKey="exams-list" />
 *   2. Tooltip:      <HelpTooltip moduleKey="exams-list" tipKey="duration" />
 *
 * Thêm module mới: chỉ thêm 1 entry, không sửa component.
 */

export interface HelpSection {
  heading: string
  content: string  // Plain text với \n cho xuống dòng
  tip?: string     // 💡 highlighted tip box
}

export interface HelpEntry {
  title: string
  summary: string         // 1-2 câu mô tả module
  sections: HelpSection[]
  tooltips: Record<string, string>  // tipKey → short text
}

export const teacherHelp: Record<string, HelpEntry> = {

  // ───── Tạo đề thi (Wayground style) ─────
  'taodethi': {
    title: 'Hướng dẫn Tạo đề thi từ PDF',
    summary: 'Trang này giúp bạn upload PDF bài tập/đề mẫu, AI sẽ trích xuất hoặc sinh câu hỏi tự động.',
    sections: [
      {
        heading: 'Bước 1 — Chọn loại tài liệu',
        content: 'Hiện tại chỉ "Đề kiểm tra" hoạt động. Các loại Video / Bài trình bày / Thẻ học sẽ ra mắt sau.',
      },
      {
        heading: 'Bước 2 — Upload PDF',
        content: 'Hỗ trợ file PDF ≤ 25MB. Có thể kéo-thả hoặc click chọn. Tự động gợi ý tiêu đề từ tên file.',
        tip: 'PDF có chữ rõ (không bị scan mờ) sẽ cho kết quả AI trích xuất chính xác hơn nhiều.',
      },
      {
        heading: 'Bước 3 — Chế độ AI',
        content: 'Có 2 chế độ:\n• "Trích xuất câu hỏi có sẵn" — dùng khi PDF đã có sẵn câu hỏi (đề thi mẫu, đề ôn).\n• "Sinh câu hỏi mới bằng AI" — dùng khi PDF là tài liệu lý thuyết, muốn AI sinh câu hỏi dựa trên nội dung.',
      },
      {
        heading: 'Bước 4 — Tuỳ chỉnh metadata',
        content: 'Đặt tiêu đề, môn học, khối lớp, ngôn ngữ, thời gian. Các thông tin này sẽ lưu vào ngân hàng đề.',
      },
      {
        heading: 'Bước 5 — Xem lại & Xuất bản',
        content: 'Sau khi AI xử lý (10-60 giây), bạn xem lại từng câu, edit nếu cần, chọn đáp án đúng, rồi bấm "Xuất bản" để lưu vào ngân hàng đề.',
        tip: 'Có thể tick "Hiện đáp án" để review nhanh. Bấm "Lại từ đầu" để upload PDF khác.',
      },
    ],
    tooltips: {
      'upload-pdf': 'Kéo-thả file PDF vào đây hoặc click để chọn. Tối đa 25MB.',
      'extract-mode': 'Chọn "Trích xuất" nếu PDF đã có câu hỏi sẵn. "Sinh AI" nếu PDF là tài liệu lý thuyết.',
      'language': 'Ngôn ngữ đầu ra của câu hỏi. Chọn English nếu dạy môn Tiếng Anh.',
      'duration': 'Thời gian làm bài mặc định khi học sinh nhận đề.',
      'publish': 'Lưu đề vào ngân hàng. Sau đó có thể gán cho lớp tại trang Đề thi.',
    },
  },

  // ───── Danh sách đề thi ─────
  'exams-list': {
    title: 'Hướng dẫn Quản lý đề thi',
    summary: 'Xem, chỉnh sửa, xuất bản và gán đề thi cho học sinh.',
    sections: [
      {
        heading: 'Tạo đề mới',
        content: 'Bấm "Tạo đề thi" để vào trang Wayground (/teacher/taodethi). Hoặc tạo thủ công từ Question Bank.',
      },
      {
        heading: 'Gán đề cho học sinh',
        content: 'Click vào 1 đề → trang chi tiết → tab "Học sinh". Chọn lớp/cá nhân, set deadline.',
      },
      {
        heading: 'Theo dõi kết quả',
        content: 'Sau khi học sinh nộp, vào tab "Kết quả" để xem điểm, phân tích chi tiết từng câu.',
        tip: 'Bấm "Xuất Excel" để tải bảng điểm có MÃ ĐỊNH DANH (chú ý bảo mật theo Luật ATTT 86/2015).',
      },
    ],
    tooltips: {
      'create-exam': 'Tạo đề mới: upload PDF → AI extract, hoặc thêm thủ công từ Ngân hàng câu hỏi.',
      'assign': 'Gán đề cho lớp/học sinh cụ thể, set deadline và thời gian làm.',
      'qr-code': 'Quét QR để học sinh vào nhanh đề thi trên điện thoại.',
      'duplicate': 'Sao chép đề (giữ nguyên câu hỏi, đổi metadata).',
    },
  },

  // ───── Ngân hàng câu hỏi ─────
  'question-bank': {
    title: 'Hướng dẫn Ngân hàng câu hỏi',
    summary: 'Tổ chức câu hỏi theo Môn → Chương → Bài → Từ khoá, tái sử dụng trong nhiều đề thi.',
    sections: [
      {
        heading: 'Thêm câu hỏi',
        content: 'Có 3 cách:\n• Nhập tay (form chi tiết)\n• Import từ PDF/Wayground (bấm Import)\n• Tạo từ LaTeX editor (cho công thức Vật lí/Toán phức tạp)',
      },
      {
        heading: 'Phân loại',
        content: 'Mỗi câu nên có: Môn (Vật lí), Chương (3.Dao động), Bài (3.2 Sóng cơ), Từ khoá (sóng dọc, sóng ngang, lambda). Phân loại tốt giúp search + filter nhanh.',
      },
      {
        heading: 'Tái sử dụng',
        content: 'Vào trang Đề thi → "Thêm câu từ ngân hàng" → tìm theo từ khoá → kéo-thả vào đề.',
        tip: 'Multi-select bằng Ctrl+Click để add nhiều câu cùng lúc.',
      },
    ],
    tooltips: {
      'taxonomy': 'Hệ thống phân loại 4 cấp: Môn → Chương → Bài → Từ khoá.',
      'import': 'Import câu từ file (PDF, Word, Wayground export).',
      'fix-latex': 'Auto-fix các lỗi LaTeX phổ biến (\\frac thiếu {}, math mode...).',
      'difficulty': 'Độ khó: Dễ / TB / Khó. Dùng cho thuật toán adaptive learning của HS.',
    },
  },

  // ───── Tạo ma trận đề ─────
  'exam-matrix': {
    title: 'Hướng dẫn Ma trận đề',
    summary: 'Mỗi lần GV bấm "Phát đề", hệ thống tự random câu theo cấu trúc (vd: 5 câu Chương 1 Dễ + 3 câu Chương 2 TB).',
    sections: [
      {
        heading: 'Khái niệm ma trận đề',
        content: 'Ma trận = template cấu trúc đề, KHÔNG phải đề cụ thể. Khi HS bắt đầu, system sẽ random từ Ngân hàng câu hỏi theo template để mỗi HS có đề khác nhau.',
        tip: 'Chống gian lận: 2 HS ngồi cạnh nhau nhận đề khác nhau.',
      },
      {
        heading: 'Thiết kế ma trận',
        content: 'Khai báo từng "ô" (cell): Chương / Bài / Độ khó / Số câu. System sẽ chọn ngẫu nhiên đủ số câu cho từng ô từ Ngân hàng.',
      },
      {
        heading: 'Yêu cầu Ngân hàng',
        content: 'Ngân hàng phải có ĐỦ câu cho mỗi ô (ví dụ ô "Chương 1 Dễ x 5 câu" thì Ngân hàng cần ≥ 5 câu Chương 1 Dễ — tốt hơn là ≥ 15 để random thật sự).',
      },
    ],
    tooltips: {
      'cell': 'Mỗi ô = filter (Chương + Bài + Độ khó) + số câu cần random.',
      'random-each-attempt': 'Mỗi HS, mỗi lần bắt đầu sẽ nhận đề random KHÁC NHAU theo cùng template.',
      'pool-size': 'Số câu khả dụng trong Ngân hàng cho filter này. Nên ≥ 3× số câu cần random.',
    },
  },

  // ───── Báo cáo đề thi ─────
  'exam-reports': {
    title: 'Hướng dẫn Báo cáo đề thi',
    summary: 'Phân tích chi tiết kết quả: điểm trung bình, phân phối, câu khó/dễ nhất, học sinh top/bottom.',
    sections: [
      {
        heading: 'Bộ lọc',
        content: 'Lọc theo: Lớp / Khoảng thời gian / Loại đề. Báo cáo cập nhật real-time.',
      },
      {
        heading: 'Biểu đồ phân tích',
        content: 'Cột "Phân phối điểm" cho biết bao nhiêu HS đạt 8-10, 6.5-7.9, 5-6.4, dưới 5. Nếu lệch trái nhiều → đề có thể quá khó.',
        tip: 'Câu có >70% HS sai → xem lại nội dung câu hỏi hoặc đáp án.',
      },
      {
        heading: 'Xuất báo cáo',
        content: 'Bấm "Xuất Excel" để tải bảng điểm. File chứa MÃ ĐỊNH DANH HS — cẩn thận chia sẻ.',
      },
    ],
    tooltips: {
      'pass-rate': '% học sinh đạt từ 5 điểm trở lên.',
      'difficulty-index': 'Độ khó thực tế của câu (= tỉ lệ HS làm sai). >70% = câu quá khó.',
      'discrimination': 'Mức độ phân loại HS giỏi/yếu của câu. > 0.3 = câu tốt.',
    },
  },

  // ───── Chấm bài tự động ─────
  'exam-grading': {
    title: 'Hướng dẫn Chấm bài OCR',
    summary: 'Scan/chụp ảnh phiếu trả lời → AI đọc đáp án HS đã tô → so với key → trả điểm.',
    sections: [
      {
        heading: 'Bước 1 — Tạo Answer Key',
        content: 'Khai báo đáp án từng câu cho đề (Phần 1 trắc nghiệm A/B/C/D, Phần 2 đúng/sai, Phần 3 trả lời ngắn). Lưu cùng metadata: tên đề, lớp, ngày, phòng.',
      },
      {
        heading: 'Bước 2 — Upload phiếu',
        content: 'Mỗi HS = 1 phiếu trả lời. Chụp/scan rõ nét (>1080p). Hệ thống OCR + match với key + xuất điểm.',
        tip: 'Phiếu in bằng máy in tốt sẽ OCR chính xác >95%. Phiếu viết tay hoặc bị bẩn có thể sai nhiều.',
      },
      {
        heading: 'Bước 3 — Review kết quả',
        content: 'Sau OCR, bạn xem lại từng phiếu. Có thể edit tên HS, mã định danh nếu OCR sai. Bấm "Lưu" để lưu vào DB.',
      },
    ],
    tooltips: {
      'answer-key': 'Đáp án chuẩn để hệ thống so sánh. Phải khai báo TRƯỚC khi upload phiếu.',
      'ocr-confidence': 'Độ tin cậy OCR (0-100%). <80% nên review thủ công.',
      'student-id': 'Mã định danh HS (10-12 chữ số). KHÔNG hiển thị trên UI — bảo mật theo Luật ATTT 86/2015.',
    },
  },

  // ───── Quản lý lớp học ─────
  'classes': {
    title: 'Hướng dẫn Quản lý lớp',
    summary: 'Tạo lớp, mời học sinh, gán bài tập, theo dõi tiến độ.',
    sections: [
      {
        heading: 'Tạo lớp mới',
        content: 'Bấm "+ Tạo lớp" → đặt tên (vd "11A2 — Vật lí — HK1 2026"), chọn môn, mô tả ngắn. Lớp sẽ có mã 6 ký tự để HS join.',
      },
      {
        heading: 'Mời học sinh',
        content: 'Có 3 cách:\n• Chia sẻ mã lớp (6 ký tự) — HS nhập tại /student/join\n• Gửi link mời (có hạn dùng)\n• In QR code để dán bảng lớp\n• Thêm thủ công từ danh sách HS hệ thống',
        tip: 'QR code có thể tải PNG để in. HS quét bằng camera điện thoại → vào thẳng trang join.',
      },
      {
        heading: 'Approval flow',
        content: 'Mặc định HS join phải được GV approve (tránh người lạ vào lớp). Xem & duyệt tại trang Student Requests.',
      },
    ],
    tooltips: {
      'class-code': 'Mã 6 ký tự để HS join. Dạng AB12CD, không phân biệt hoa/thường.',
      'invite-link': 'Link mời có hash, hạn dùng configurable. An toàn hơn share mã lớp.',
      'qr-code': 'Quét QR = mở app + tự động fill mã lớp. Tiện cho HS mobile-first.',
    },
  },

  // ───── Tổ chức thi trực tuyến ─────
  'online-exam-room': {
    title: 'Hướng dẫn Phòng thi trực tuyến',
    summary: 'Tổ chức thi đồng loạt nhiều HS, có giám sát camera, anti-cheat watermark.',
    sections: [
      {
        heading: 'Tạo phiên thi',
        content: 'Chọn đề + lớp + thời gian bắt đầu/kết thúc. HS sẽ thấy đếm ngược trên dashboard.',
      },
      {
        heading: 'Anti-cheat',
        content: 'Bật:\n• Camera permission — HS phải bật webcam, GV xem live\n• Watermark — đè tên HS lên màn hình (chống chụp lén)\n• Block copy/paste, Ctrl+C disabled\n• Tab visibility tracking — đếm số lần switch tab',
        tip: 'HS bị mất kết nối <60s, hệ thống tự cho phép resume. >60s = báo GV duyệt.',
      },
      {
        heading: 'Giám sát',
        content: 'Tab "Live" hiển thị grid camera của tất cả HS đang thi. Click vào 1 ô để xem chi tiết + chat riêng với HS đó.',
      },
    ],
    tooltips: {
      'webcam-permission': 'HS phải cấp quyền camera trước khi vào phòng thi. Không bật = không thi được.',
      'watermark': 'Tên HS đè mờ trên video/text — chống screen record + chụp ảnh chia sẻ.',
      'tab-switch': 'Đếm số lần HS chuyển tab. >3 lần = flag suspicious.',
    },
  },

  // ───── Camera Management ─────
  'camera-management': {
    title: 'Hướng dẫn Quản lý Camera',
    summary: 'Cấu hình camera lớp học (vật lí hoặc webcam HS) cho giám sát thi trực tuyến.',
    sections: [
      {
        heading: 'Camera vật lí (IP cam lớp học)',
        content: 'Khai báo IP/RTSP stream của camera lớp học. Hệ thống sẽ record + AI phân tích hoạt động lớp.',
      },
      {
        heading: 'Webcam học sinh',
        content: 'Khi tạo phiên thi trực tuyến, mỗi HS bật webcam trên máy của họ. GV xem grid live tại trang Online Exam Room.',
        tip: 'Webcam HS cần permission browser. Lần đầu cấp xong sẽ remember cho lần sau.',
      },
    ],
    tooltips: {
      'rtsp': 'Real Time Streaming Protocol — chuẩn streaming của hầu hết IP camera.',
      'recording': 'Bật để lưu video phiên thi. Lưu trữ 30 ngày rồi tự xoá.',
    },
  },

  // ───── LaTeX Documents ─────
  'latex-documents': {
    title: 'Hướng dẫn LaTeX Editor',
    summary: 'Soạn tài liệu LaTeX (đề thi, bài giảng Vật lí/Toán) với compile real-time.',
    sections: [
      {
        heading: 'Tạo document',
        content: 'Có template mẫu sẵn: Đề thi 4 phần (chuẩn Bộ GD&ĐT), Bài giảng, Worksheet... Hoặc tạo blank.',
      },
      {
        heading: 'Compile',
        content: 'Bấm Compile (hoặc Cmd+Enter) để render LaTeX → PDF. Server xelatex/tectonic Rust backend, compile <3s cho doc 10 trang.',
        tip: 'Lỗi LaTeX hiển thị inline. Click vào để jump tới dòng lỗi.',
      },
      {
        heading: 'AI hỗ trợ',
        content: 'Bấm "AI Exam Dialog" để generate câu hỏi từ ý tưởng. Hoặc dùng AI Subscription Gate để tóm tắt + dịch.',
      },
    ],
    tooltips: {
      'compile': 'Render LaTeX → PDF. Phím tắt: Cmd+Enter (Mac), Ctrl+Enter (Win).',
      'template': 'Template chuẩn Bộ GD&ĐT: đề 4 phần, đáp án, ma trận tự sinh.',
      'ai-assist': 'AI dùng Claude để generate câu hỏi từ prompt tiếng Việt.',
    },
  },

}

/**
 * Lấy entry safely — trả về null nếu module chưa có content.
 */
export function getHelpEntry(moduleKey: string): HelpEntry | null {
  return teacherHelp[moduleKey] ?? null
}

/**
 * Lấy tooltip text cho 1 tip key trong module.
 */
export function getTooltip(moduleKey: string, tipKey: string): string | null {
  return teacherHelp[moduleKey]?.tooltips?.[tipKey] ?? null
}

/**
 * Search across all modules — return list of matching entries.
 */
export function searchHelp(query: string): Array<{ moduleKey: string; entry: HelpEntry }> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: Array<{ moduleKey: string; entry: HelpEntry }> = []
  for (const [moduleKey, entry] of Object.entries(teacherHelp)) {
    const haystack = [
      entry.title,
      entry.summary,
      ...entry.sections.map(s => `${s.heading} ${s.content} ${s.tip ?? ''}`),
      ...Object.values(entry.tooltips),
    ].join(' ').toLowerCase()
    if (haystack.includes(q)) results.push({ moduleKey, entry })
  }
  return results
}
