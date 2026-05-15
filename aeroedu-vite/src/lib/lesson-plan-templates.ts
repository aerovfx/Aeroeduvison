/**
 * Mẫu giáo án có sẵn theo Công văn 2345/BGDĐT-GDTH (2021)
 *
 * Khung kế hoạch bài dạy chuẩn 4 phần:
 *   I.  YÊU CẦU CẦN ĐẠT (Năng lực đặc thù + Năng lực chung + Phẩm chất)
 *   II. ĐỒ DÙNG DẠY HỌC
 *   III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU (table 2 cột GV vs HS)
 *   IV. ĐIỀU CHỈNH SAU BÀI DẠY
 *
 * Mỗi template trả về HTML compatible với TipTap content (StarterKit + Table).
 */

export interface LessonPlanTemplate {
  id: string
  name: string
  description: string
  icon: string
  /** Default title khi tạo */
  defaultTitle: string
  /** HTML content compat với TipTap */
  content: string
}

// ─── Template 1: Blank (trống) ───────────────────────────────
const TPL_BLANK = '<p></p>'

// ─── Helper: build activity table với 2 cột GV / HS ──────────
function buildActivityTable(rows: { gv: string; hs?: string }[]): string {
  const trs = rows.map(r => `
    <tr>
      <td><p>${r.gv}</p></td>
      <td><p>${r.hs || ''}</p></td>
    </tr>`).join('')
  return `<table>
    <tr>
      <th><p><strong>Hoạt động của Giáo viên</strong></p></th>
      <th><p><strong>Hoạt động của Học sinh</strong></p></th>
    </tr>${trs}
  </table>`
}

// ─── Template 2: CV2345 — Tiếng Việt 4 tiết ──────────────────
const TPL_CV2345_4TIET = `
<h1 style="text-align:center">BÀI ...: [TÊN BÀI]</h1>
<p style="text-align:center"><strong>(4 TIẾT)</strong></p>
<p><strong>Môn:</strong> Tiếng Việt &nbsp;&nbsp; <strong>Lớp:</strong> ... &nbsp;&nbsp; <strong>Tuần:</strong> ... &nbsp;&nbsp; <strong>Ngày dạy:</strong> .../.../...</p>
<hr>

<h2>I. YÊU CẦU CẦN ĐẠT</h2>

<h3>1. Năng lực đặc thù</h3>

<h4>1.1. Đọc</h4>
<ul>
  <li><strong>Đọc kĩ thuật:</strong> .....................................</li>
  <li><strong>Đọc hiểu:</strong>
    <ul>
      <li>Đọc hiểu <em>nội dung</em>: .....................................</li>
      <li>Đọc hiểu <em>hình thức</em>: .....................................</li>
      <li>Đọc <em>liên hệ, so sánh kết nối</em> (nếu có): .....................................</li>
    </ul>
  </li>
</ul>

<h4>1.2. Viết</h4>
<p>Viết chữ viết hoa ........; viết câu ứng dụng .....................................</p>

<h4>1.3. Nói và nghe</h4>
<p>.....................................</p>

<h3>2. Năng lực chung</h3>
<ul>
  <li>Năng lực ........... (biểu hiện)</li>
  <li>Năng lực ........... (biểu hiện)</li>
</ul>

<h3>3. Phẩm chất</h3>
<p>.....................................</p>
<p><em>(Yêu nước / Nhân ái / Chăm chỉ / Trung thực / Trách nhiệm)</em></p>

<h2>II. ĐỒ DÙNG DẠY HỌC</h2>
<ul>
  <li><strong>GV:</strong> .....................................</li>
  <li><strong>HS:</strong> .....................................</li>
</ul>

<h2>III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU</h2>

<h3>TIẾT 1 + 2 — ĐỌC: ...........................</h3>
${buildActivityTable([
  { gv: '<strong>1. Hoạt động mở đầu</strong>' },
  { gv: '<strong>2. Hình thành kiến thức</strong>' },
  { gv: '&nbsp;&nbsp;a. Luyện đọc' },
  { gv: '&nbsp;&nbsp;b. Trả lời câu hỏi' },
  { gv: '<strong>3. Luyện tập, thực hành</strong>' },
  { gv: '&nbsp;&nbsp;a. Luyện đọc lại' },
  { gv: '&nbsp;&nbsp;b. Luyện tập theo văn bản đọc' },
  { gv: '&nbsp;&nbsp;&nbsp;&nbsp;Bài tập 1 của Luyện tập theo văn bản đọc' },
  { gv: '<strong>4. Vận dụng, trải nghiệm</strong>' },
  { gv: '&nbsp;&nbsp;Bài tập 2 của Luyện tập theo văn bản đọc' },
  { gv: '&nbsp;&nbsp;Hoạt động vận dụng khác (nếu có)' },
])}
<p><em>* Điều chỉnh sau bài dạy:</em> .....................................</p>

<h3>TIẾT 3 — VIẾT: ...........................</h3>
${buildActivityTable([
  { gv: '<strong>1. Hoạt động mở đầu</strong>' },
  { gv: '<strong>2. Hoạt động hình thành kiến thức mới</strong>' },
  { gv: '&nbsp;&nbsp;a. Hướng dẫn viết chữ hoa' },
  { gv: '&nbsp;&nbsp;b. Hướng dẫn viết câu ứng dụng' },
  { gv: '<strong>3. Luyện tập, thực hành</strong>' },
  { gv: '<strong>4. Vận dụng, trải nghiệm</strong>' },
])}
<p><em>* Điều chỉnh sau bài dạy:</em> .....................................</p>

<h3>TIẾT 4 — NÓI VÀ NGHE: ...........................</h3>
${buildActivityTable([
  { gv: '<strong>1. Hoạt động mở đầu</strong>' },
  { gv: '<strong>2. Hoạt động hình thành kiến thức mới</strong>' },
  { gv: '<strong>3. Luyện tập, thực hành</strong>' },
  { gv: '<strong>4. Vận dụng, trải nghiệm</strong>' },
])}
<p><em>* Điều chỉnh sau bài dạy:</em> .....................................</p>
`.trim()

// ─── Template 3: CV2345 — Tiếng Việt 6 tiết ──────────────────
const TPL_CV2345_6TIET = `
<h1 style="text-align:center">BÀI ...: [TÊN BÀI]</h1>
<p style="text-align:center"><strong>(6 TIẾT)</strong></p>
<p><strong>Môn:</strong> Tiếng Việt &nbsp;&nbsp; <strong>Lớp:</strong> ... &nbsp;&nbsp; <strong>Tuần:</strong> ... &nbsp;&nbsp; <strong>Ngày dạy:</strong> .../.../...</p>
<hr>

<h2>I. YÊU CẦU CẦN ĐẠT</h2>

<h3>1. Năng lực đặc thù</h3>

<h4>1.1. Đọc</h4>
<ul>
  <li><strong>Đọc kĩ thuật:</strong> .....................................</li>
  <li><strong>Đọc hiểu:</strong>
    <ul>
      <li>Đọc hiểu <em>nội dung</em>: .....................................</li>
      <li>Đọc hiểu <em>hình thức</em>: .....................................</li>
      <li>Đọc <em>liên hệ, so sánh kết nối</em> (nếu có): .....................................</li>
      <li>Đọc <em>mở rộng</em>: .....................................</li>
    </ul>
  </li>
</ul>

<h4>1.2. Viết</h4>
<ul>
  <li>Viết chính tả: .....................................</li>
  <li>Viết đoạn văn: .....................................</li>
</ul>

<h4>1.3. Kiến thức Tiếng Việt</h4>
<ul>
  <li>Phát triển vốn từ: .....................................</li>
</ul>

<h3>2. Năng lực chung</h3>
<ul>
  <li>Năng lực ........... (biểu hiện)</li>
  <li>Năng lực ........... (biểu hiện)</li>
</ul>

<h3>3. Phẩm chất</h3>
<p>.....................................</p>
<p><em>(Yêu nước / Nhân ái / Chăm chỉ / Trung thực / Trách nhiệm)</em></p>

<h2>II. ĐỒ DÙNG DẠY HỌC</h2>
<ul>
  <li><strong>GV:</strong> .....................................</li>
  <li><strong>HS:</strong> .....................................</li>
</ul>

<h2>III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU</h2>

<h3>TIẾT 1 + 2 — ĐỌC: ...........................</h3>
${buildActivityTable([
  { gv: '<strong>1. Hoạt động mở đầu</strong>' },
  { gv: '<strong>2. Hình thành kiến thức</strong>' },
  { gv: '&nbsp;&nbsp;a. Luyện đọc' },
  { gv: '&nbsp;&nbsp;b. Trả lời câu hỏi' },
  { gv: '<strong>3. Luyện tập, thực hành</strong>' },
  { gv: '&nbsp;&nbsp;a. Luyện đọc lại' },
  { gv: '&nbsp;&nbsp;b. Luyện tập theo văn bản đọc' },
  { gv: '<strong>4. Vận dụng, trải nghiệm</strong>' },
  { gv: '&nbsp;&nbsp;Bài tập 2 của Luyện tập theo văn bản đọc' },
  { gv: '&nbsp;&nbsp;Hoạt động vận dụng khác (nếu có)' },
])}
<p><em>* Điều chỉnh sau bài dạy:</em> .....................................</p>

<h3>TIẾT 3 — VIẾT: ...........................</h3>
${buildActivityTable([
  { gv: '<strong>1. Hoạt động mở đầu</strong>' },
  { gv: '<strong>2. Hình thành kiến thức</strong>' },
  { gv: '<strong>3. Luyện tập, thực hành</strong>' },
  { gv: '<strong>4. Vận dụng, trải nghiệm</strong>' },
])}

<h3>TIẾT 4 — LUYỆN TẬP TIẾNG VIỆT (Luyện tập từ / câu / dấu câu …)</h3>
${buildActivityTable([
  { gv: '<strong>1. Hoạt động mở đầu</strong>' },
  { gv: '<strong>2. Hoạt động Luyện tập, thực hành</strong>' },
  { gv: '&nbsp;&nbsp;2.1. Bài 1: ...........................' },
  { gv: '&nbsp;&nbsp;2.2. Bài 2: ...........................' },
  { gv: '&nbsp;&nbsp;2.3. Bài 3: ...........................' },
  { gv: '<strong>3. Vận dụng, trải nghiệm</strong>' },
])}
<p><em>* Điều chỉnh sau bài dạy:</em> .....................................</p>

<h3>TIẾT 5 — VIẾT ĐOẠN VĂN: ...........................</h3>
${buildActivityTable([
  { gv: '<strong>1. Hoạt động mở đầu</strong>' },
  { gv: '<strong>2. Luyện tập, thực hành</strong>' },
  { gv: '&nbsp;&nbsp;2.1. Bài 1: ...........................' },
  { gv: '&nbsp;&nbsp;2.2. Bài 2: ...........................' },
  { gv: '<strong>3. Vận dụng, trải nghiệm</strong>' },
])}
<p><em>* Điều chỉnh sau bài dạy:</em> .....................................</p>

<h3>TIẾT 6 — ĐỌC MỞ RỘNG: ...........................</h3>
<p><em>(Tuỳ Kế hoạch dạy học môn học của từng trường)</em></p>
${buildActivityTable([
  { gv: '<strong>1. Hoạt động mở đầu</strong>' },
  { gv: '<strong>2. Hoạt động Đọc mở rộng</strong>' },
  { gv: '<strong>3. Vận dụng, trải nghiệm</strong>' },
])}
<p><em>* Điều chỉnh sau bài dạy:</em> .....................................</p>
`.trim()

// ─── Template 4: Generic 5 hoạt động (chung cho mọi môn) ──────
const TPL_GENERIC_5HOATDONG = `
<h1 style="text-align:center">KẾ HOẠCH BÀI DẠY</h1>
<p style="text-align:center"><strong>Môn: ........... &nbsp;&nbsp; Lớp: ........... &nbsp;&nbsp; Tiết: ...........</strong></p>
<p style="text-align:center"><em>Ngày dạy: .../.../...</em></p>
<hr>

<h2>I. YÊU CẦU CẦN ĐẠT</h2>

<h3>1. Về kiến thức</h3>
<ul>
  <li>.....................................</li>
  <li>.....................................</li>
</ul>

<h3>2. Về năng lực</h3>
<ul>
  <li><strong>Năng lực chung:</strong> giao tiếp và hợp tác, tự chủ và tự học, giải quyết vấn đề và sáng tạo</li>
  <li><strong>Năng lực đặc thù môn học:</strong> .....................................</li>
</ul>

<h3>3. Về phẩm chất</h3>
<ul>
  <li>.....................................</li>
</ul>

<h2>II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU</h2>
<ul>
  <li><strong>Giáo viên:</strong> SGK, máy chiếu, phiếu học tập, .....................................</li>
  <li><strong>Học sinh:</strong> SGK, vở ghi, dụng cụ học tập, .....................................</li>
</ul>

<h2>III. TIẾN TRÌNH DẠY HỌC</h2>

<h3>1. HOẠT ĐỘNG KHỞI ĐỘNG (5 phút)</h3>
<p><strong>a) Mục tiêu:</strong> Tạo tâm thế, kích thích hứng thú học tập, kết nối kiến thức cũ với bài mới.</p>
<p><strong>b) Nội dung:</strong> .....................................</p>
<p><strong>c) Sản phẩm:</strong> .....................................</p>
<p><strong>d) Tổ chức thực hiện:</strong></p>
${buildActivityTable([
  { gv: '<strong>Bước 1.</strong> Chuyển giao nhiệm vụ: ...' },
  { gv: '<strong>Bước 2.</strong> HS thực hiện nhiệm vụ' },
  { gv: '<strong>Bước 3.</strong> Báo cáo kết quả' },
  { gv: '<strong>Bước 4.</strong> Đánh giá / kết luận' },
])}

<h3>2. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC (25 phút)</h3>
<p><strong>a) Mục tiêu:</strong> .....................................</p>
<p><strong>b) Nội dung:</strong> .....................................</p>
<p><strong>c) Sản phẩm:</strong> .....................................</p>
<p><strong>d) Tổ chức thực hiện:</strong></p>
${buildActivityTable([
  { gv: '<strong>Bước 1.</strong> Chuyển giao nhiệm vụ: ...' },
  { gv: '<strong>Bước 2.</strong> HS thực hiện nhiệm vụ (cá nhân/nhóm)' },
  { gv: '<strong>Bước 3.</strong> Báo cáo, thảo luận' },
  { gv: '<strong>Bước 4.</strong> Đánh giá, kết luận, ghi bảng' },
])}

<h3>3. HOẠT ĐỘNG LUYỆN TẬP (10 phút)</h3>
<p><strong>a) Mục tiêu:</strong> Củng cố, áp dụng kiến thức vừa học.</p>
<p><strong>b) Nội dung:</strong> Bài tập / câu hỏi luyện tập</p>
<p><strong>c) Sản phẩm:</strong> Lời giải bài tập</p>
<p><strong>d) Tổ chức thực hiện:</strong></p>
<ol>
  <li>GV phát phiếu bài tập / chiếu câu hỏi</li>
  <li>HS làm cá nhân hoặc theo cặp đôi</li>
  <li>GV gọi 2-3 HS chữa bài, các HS khác nhận xét</li>
  <li>GV chốt đáp án + lưu ý lỗi sai phổ biến</li>
</ol>

<h3>4. HOẠT ĐỘNG VẬN DỤNG (5 phút)</h3>
<p><strong>a) Mục tiêu:</strong> Vận dụng kiến thức vào tình huống thực tế</p>
<p><strong>b) Nội dung:</strong> .....................................</p>
<p><strong>c) Sản phẩm:</strong> .....................................</p>
<p><strong>d) Tổ chức thực hiện:</strong> .....................................</p>

<h3>5. HƯỚNG DẪN VỀ NHÀ</h3>
<ul>
  <li>Học bài cũ: .....................................</li>
  <li>Làm bài tập: .....................................</li>
  <li>Chuẩn bị bài mới: .....................................</li>
</ul>

<hr>
<p><strong>* IV. ĐIỀU CHỈNH SAU BÀI DẠY</strong></p>
<p>.....................................</p>
`.trim()

// ─── Export tất cả templates ─────────────────────────────────
export const LESSON_PLAN_TEMPLATES: LessonPlanTemplate[] = [
  {
    id: 'blank',
    name: 'Trống',
    description: 'Bắt đầu từ trang trắng, tự soạn theo ý',
    icon: '📝',
    defaultTitle: 'Giáo án mới',
    content: TPL_BLANK,
  },
  {
    id: 'cv2345-4tiet',
    name: 'CV2345 — Tiếng Việt 4 tiết',
    description: 'Khung kế hoạch bài dạy chuẩn Công văn 2345/BGDĐT — bài Tiếng Việt 4 tiết (Đọc + Viết + Nói nghe)',
    icon: '📚',
    defaultTitle: 'Giáo án Tiếng Việt — 4 tiết',
    content: TPL_CV2345_4TIET,
  },
  {
    id: 'cv2345-6tiet',
    name: 'CV2345 — Tiếng Việt 6 tiết',
    description: 'Khung CV2345 cho bài Tiếng Việt 6 tiết (Đọc + Viết + Luyện tập + Đoạn văn + Mở rộng)',
    icon: '📖',
    defaultTitle: 'Giáo án Tiếng Việt — 6 tiết',
    content: TPL_CV2345_6TIET,
  },
  {
    id: 'generic-5hoatdong',
    name: 'Khung 5 hoạt động (mọi môn)',
    description: 'Khởi động → Hình thành KT → Luyện tập → Vận dụng → Hướng dẫn về nhà. Phù hợp Toán/Lý/Hoá/Sinh/Sử/Địa/Anh/...',
    icon: '🎯',
    defaultTitle: 'Giáo án theo khung 5 hoạt động',
    content: TPL_GENERIC_5HOATDONG,
  },
]

export function getTemplateById(id: string): LessonPlanTemplate | undefined {
  return LESSON_PLAN_TEMPLATES.find(t => t.id === id)
}
