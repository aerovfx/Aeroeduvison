/**
 * Docs Articles — Toàn bộ nội dung tài liệu hệ thống AeroEduVision.
 *
 * Mỗi article là object {slug, title, category, role, summary, content (JSX)}.
 * Render bởi DocsArticle.tsx. Index hiển thị tổng quan trong DocsIndex.tsx.
 *
 * Quy ước:
 *   - slug: kebab-case (vd "latex-editor")
 *   - role: 'all' | 'student' | 'teacher' | 'admin' — để filter index
 *   - anchor: <h2 id="..."> để DocRef sâu được vào section
 *   - Thuật ngữ phức tạp → bọc <DocRef slug="glossary" anchor="..." />
 */
import type { ReactNode } from 'react'
import { DocRef } from '@/components/docs/DocRef'

export type DocRole = 'all' | 'student' | 'teacher' | 'admin'
export type DocCategory =
  | 'getting-started'
  | 'student'
  | 'teacher'
  | 'ai'
  | 'payment'
  | 'reference'

export interface DocArticle {
  slug: string
  title: string
  category: DocCategory
  role: DocRole
  summary: string
  /** Thời gian đọc ước tính, vd "5 phút" */
  readTime?: string
  content: ReactNode
}

// ── Reusable layout primitives ─────────────────────────────────────────────

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-xl font-semibold text-foreground mt-8 mb-3 pb-2 border-b border-border"
    >
      {children}
    </h2>
  )
}
function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 text-base font-semibold text-foreground mt-5 mb-2">
      {children}
    </h3>
  )
}
function P({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>
}
function Code({ children }: { children: ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[0.85em]">
      {children}
    </code>
  )
}
function Pre({ children }: { children: ReactNode }) {
  return (
    <pre className="my-3 p-3 rounded-lg bg-muted/60 border border-border overflow-x-auto text-xs leading-relaxed font-mono text-foreground">
      {children}
    </pre>
  )
}
function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="text-sm text-muted-foreground leading-relaxed mb-3 space-y-1 list-disc pl-5">
      {children}
    </ul>
  )
}
function Ol({ children }: { children: ReactNode }) {
  return (
    <ol className="text-sm text-muted-foreground leading-relaxed mb-3 space-y-1 list-decimal pl-5">
      {children}
    </ol>
  )
}
function Callout({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'warn' | 'tip'
  children: ReactNode
}) {
  const styles: Record<string, string> = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200',
    warn: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200',
    tip:  'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
  }
  const labels = { info: '💡 Ghi chú', warn: '⚠️ Lưu ý', tip: '✅ Mẹo' }
  return (
    <div className={`my-4 p-3 rounded-lg border text-sm leading-relaxed ${styles[kind]}`}>
      <div className="font-semibold mb-1">{labels[kind]}</div>
      <div>{children}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ARTICLES
// ══════════════════════════════════════════════════════════════════════════

export const ARTICLES: DocArticle[] = [

  // ── Getting started ────────────────────────────────────────────────────
  {
    slug: 'getting-started',
    title: 'Bắt đầu với AeroEduVision',
    category: 'getting-started',
    role: 'all',
    summary: 'Đăng ký, đăng nhập, làm quen giao diện và các vai trò trong hệ thống.',
    readTime: '5 phút',
    content: (
      <>
        <P>
          AeroEduVision là nền tảng giáo dục số kết hợp <DocRef slug="glossary" anchor="lms">LMS</DocRef>,
          {' '}<DocRef slug="glossary" anchor="ai">AI</DocRef> và phân tích học tập. Hệ thống có ba vai trò chính:
          {' '}<strong>Học sinh</strong>, <strong>Giáo viên</strong>, <strong>Quản trị viên</strong>.
        </P>

        <H2 id="signup">Đăng ký tài khoản</H2>
        <Ol>
          <li>Truy cập <Code>/auth/register</Code>.</li>
          <li>Nhập họ tên, email, mật khẩu (≥ 8 ký tự) và xác nhận.</li>
          <li>Nhấn <strong>Đăng ký</strong>. Tài khoản mặc định là vai trò <em>Học sinh</em>.</li>
          <li>Để chuyển sang Giáo viên/Admin, liên hệ admin hoặc dùng mã kích hoạt gói trả phí.</li>
        </Ol>
        <Callout kind="tip">
          Nếu học sinh quét mã <DocRef slug="glossary" anchor="qr">QR</DocRef> đề thi mà chưa có tài khoản,
          hệ thống tự đưa về trang đăng ký rồi quay lại đề thi đó sau khi xác thực.
        </Callout>

        <H2 id="login">Đăng nhập</H2>
        <P>Vào <Code>/auth/login</Code>, nhập email + mật khẩu. Phiên đăng nhập dùng <DocRef slug="glossary" anchor="jwt">JWT</DocRef> hết hạn sau 24 giờ.</P>

        <H2 id="dashboard">Dashboard</H2>
        <P>
          Sau khi đăng nhập bạn vào <Code>/dashboard</Code>. Sidebar bên trái nhóm tính năng theo:
        </P>
        <Ul>
          <li><strong>Tổng quan</strong> — thống kê, thành tích.</li>
          <li><strong>Học tập</strong> — khoá học, AI Tutor, lộ trình.</li>
          <li><strong>Theo dõi</strong> — tiến độ, cảm xúc, bài tập.</li>
          <li><strong>Cửa hàng</strong> — yêu thích, lịch sử mua.</li>
          <li><strong>Lab &amp; Công cụ</strong> — phòng lab ảo, IoT, ghi chú.</li>
        </Ul>

        <H2 id="roles">Vai trò</H2>
        <Ul>
          <li><strong>STUDENT</strong> — truy cập tài nguyên học tập, làm đề, theo dõi tiến độ.</li>
          <li><strong>TEACHER</strong> — tất cả của STUDENT + soạn đề, chấm thi, quản lý lớp.</li>
          <li><strong>ADMIN</strong> — toàn quyền hệ thống: người dùng, gói cước, mô hình AI, IoT.</li>
        </Ul>
      </>
    ),
  },

  // ── Student guide ───────────────────────────────────────────────────────
  {
    slug: 'student-guide',
    title: 'Hướng dẫn dành cho học sinh',
    category: 'student',
    role: 'student',
    summary: 'Học khoá học, làm đề thi, dùng AI Tutor, theo dõi tiến độ.',
    readTime: '7 phút',
    content: (
      <>
        <H2 id="my-courses">Khoá học của tôi</H2>
        <P>
          Tại <Code>/student/my-courses</Code> bạn thấy danh sách khoá học đã đăng ký. Nhấn vào thẻ
          để vào <strong>Course Player</strong> với video, tài liệu, đánh giá và tiến độ.
        </P>

        <H2 id="ai-tutor">AI Tutor</H2>
        <P>
          AI Tutor (<Code>/ai-tutor</Code>) là trợ giảng cá nhân hoá. Hỏi bằng tiếng Việt hoặc tiếng Anh.
          Tính năng giải bài, gợi ý lộ trình, tóm tắt bài giảng. Một số chức năng nâng cao yêu cầu gói
          {' '}<DocRef slug="payment" anchor="plans">Premium</DocRef>.
        </P>

        <H2 id="exam-prep">Ôn thi (Exam Prep)</H2>
        <P>
          Vào <Code>/student/exam-prep</Code> — chia 2 tab:
        </P>
        <Ul>
          <li><strong>Đề thi giáo viên</strong> (mặc định) — đề được giáo viên publish hoặc share qua QR.</li>
          <li><strong>Ngân hàng câu hỏi</strong> — luyện theo chủ đề từ ngân hàng chung.</li>
        </Ul>
        <P>Khi quét QR đề (vd từ giấy in của giáo viên) → vào thẳng đề sau khi đăng nhập.</P>

        <H2 id="exam-modes">5 chế độ làm bài</H2>
        <P>Sau khi chọn 1 đề, bạn thấy 5 chế độ (<DocRef slug="exam-modes">xem chi tiết</DocRef>):</P>
        <Ul>
          <li><strong>Classic</strong> — làm tuần tự, có hẹn giờ và phản hồi ngay.</li>
          <li><strong>Mastery Peak</strong> — leo núi: đúng tiến 1 nấc, sai đứng yên.</li>
          <li><strong>Playground</strong> — chế độ giải trí, không tính điểm (đang phát triển).</li>
          <li><strong>Test</strong> — như thi thật, nộp 1 lần.</li>
          <li><strong>Team</strong> — share link mời bạn bè cùng làm.</li>
        </Ul>

        <H2 id="wishlist">Yêu thích &amp; Lịch sử mua</H2>
        <P>
          Bấm ♡ trên thẻ khoá học để lưu vào <Code>/student/wishlist</Code>. Các đơn hàng đã thanh toán
          xuất hiện ở <Code>/student/purchase-history</Code>.
        </P>

        <H2 id="certificate">Chứng chỉ</H2>
        <P>
          Khi hoàn thành 100% khoá học, hệ thống tự cấp chứng chỉ tại <Code>/student/certificate/:courseId</Code>.
          Chứng chỉ có thể tải PDF và chia sẻ link công khai.
        </P>
      </>
    ),
  },

  // ── Exam modes ──────────────────────────────────────────────────────────
  {
    slug: 'exam-modes',
    title: '5 chế độ làm bài',
    category: 'student',
    role: 'student',
    summary: 'Classic, Mastery Peak, Playground, Test, Team — chọn cách học phù hợp.',
    readTime: '4 phút',
    content: (
      <>
        <P>Mỗi đề có 5 chế độ trải nghiệm. Chọn ở trang <Code>/exam/:examId</Code>.</P>

        <H2 id="classic">Classic</H2>
        <P>Làm tuần tự từng câu, hiển thị đáp án đúng/sai ngay. Phù hợp ôn tập có hướng dẫn.</P>

        <H2 id="mastery">Mastery Peak — leo núi</H2>
        <P>
          Cơ chế gamified: đúng tiến 1 nấc lên đỉnh, sai đứng yên (không tụt). Cuối hành trình
          có animation chinh phục đỉnh.
        </P>
        <Callout kind="tip">Hợp với học sinh hay nản — không trừng phạt khi sai.</Callout>

        <H2 id="playground">Playground</H2>
        <P>
          Mini-game chế độ "đập chuột" trong bài — đáp án bay lên, chọn nhanh. Không tính điểm tổng,
          chỉ để vui (sắp ra mắt).
        </P>

        <H2 id="test">Test</H2>
        <P>
          Như thi thật: 1 lần nộp, hết giờ tự nộp. Không xem đáp án giữa chừng. Dùng cho kiểm tra
          định kỳ, thi thử <DocRef slug="glossary" anchor="thpt">THPT</DocRef>.
        </P>

        <H2 id="team">Team</H2>
        <P>
          Tạo phòng và share link/mã. Cả nhóm cùng làm song song, bảng xếp hạng realtime qua
          {' '}<DocRef slug="glossary" anchor="websocket">WebSocket</DocRef>.
        </P>
      </>
    ),
  },

  // ── Teacher guide ───────────────────────────────────────────────────────
  {
    slug: 'teacher-guide',
    title: 'Hướng dẫn dành cho giáo viên',
    category: 'teacher',
    role: 'teacher',
    summary: 'Soạn đề, ma trận, ngân hàng câu hỏi, chấm thi, quản lý lớp.',
    readTime: '10 phút',
    content: (
      <>
        <H2 id="overview">Tổng quan</H2>
        <P>
          Vai trò Giáo viên có toàn bộ quyền Học sinh + bộ công cụ soạn đề, chấm bài, quản lý lớp.
          Module chính nằm trong các section <strong>Đề thi</strong>, <strong>Chấm thi</strong>,
          {' '}<strong>Nội dung</strong>, <strong>LMS</strong>, <strong>Quản lý</strong>.
        </P>

        <H2 id="exam-flow">Quy trình soạn đề điển hình</H2>
        <Ol>
          <li>
            Tạo <DocRef slug="exam-matrix">ma trận đề</DocRef> tại <Code>/teacher/exam-matrix/create</Code>
            {' '}— xác định chủ đề, mức độ, số câu mỗi phần.
          </li>
          <li>
            Sinh đề từ ma trận: hệ thống tự rút câu hỏi từ <DocRef slug="question-bank">ngân hàng</DocRef> +
            AI bổ sung nếu thiếu.
          </li>
          <li>
            Hoặc soạn thủ công tại <Code>/teacher/exams/create</Code> (kết hợp thêm câu từ ngân hàng theo ma trận).
          </li>
          <li>
            Hoặc upload tệp <DocRef slug="latex-editor">LaTeX</DocRef> tại <Code>/teacher/taodethi</Code> —
            hệ thống biên dịch + parse câu hỏi tự động.
          </li>
          <li>Publish đề + share QR cho học sinh.</li>
        </Ol>

        <H2 id="grading">Chấm thi tự động</H2>
        <P>
          Module <Code>/teacher/exam-grading</Code> chấm trắc nghiệm 100% tự động.
          Bài tự luận dùng <DocRef slug="glossary" anchor="ocr">OCR</DocRef> +
          {' '}<DocRef slug="glossary" anchor="omr">OMR</DocRef> để nhận diện chữ viết tay, gợi ý điểm bằng AI.
        </P>

        <H2 id="online-room">Phòng thi online</H2>
        <P>
          <Code>/teacher/online-exam-room</Code> — tạo phòng, share mã, giám sát realtime
          (số HS online, tiến độ làm bài). Có thể bật camera giám thị từ
          {' '}<Code>/teacher/camera-management</Code>.
        </P>

        <H2 id="classes">Quản lý lớp</H2>
        <P>
          Tại <Code>/teacher/classes</Code> bạn tạo lớp, import danh sách học sinh từ Excel (mẫu sẵn có).
          Trang <Code>/teacher/dashboard</Code> hiển thị tổng quan lớp + cảnh báo HS rủi ro.
        </P>
      </>
    ),
  },

  // ── Exam Matrix ─────────────────────────────────────────────────────────
  {
    slug: 'exam-matrix',
    title: 'Ma trận đề thi',
    category: 'teacher',
    role: 'teacher',
    summary: 'Cấu hình ma trận để tự sinh đề theo chủ đề và mức độ Bloom.',
    readTime: '6 phút',
    content: (
      <>
        <P>
          <strong>Ma trận đề</strong> là bảng quy định số câu hỏi theo từng chủ đề × mức độ.
          Hệ thống dùng ma trận để tự rút câu hỏi từ ngân hàng + AI sinh thêm khi thiếu.
        </P>

        <H2 id="create">Tạo ma trận</H2>
        <Ol>
          <li>Vào <Code>/teacher/exam-matrix/create</Code>.</li>
          <li>Đặt tên ma trận, chọn môn học, tổng số câu, thời gian làm bài.</li>
          <li>Thêm các <strong>Section</strong> (Phần I — Trắc nghiệm, Phần II — Tự luận, …).</li>
          <li>Trong mỗi section, thêm <strong>Topic</strong> (chủ đề) + số câu theo mức độ <DocRef slug="glossary" anchor="bloom">Bloom</DocRef>.</li>
          <li>Lưu — ma trận xuất hiện ở danh sách <Code>/teacher/exam-matrix</Code>.</li>
        </Ol>

        <H2 id="distribution">Phân bổ câu hỏi</H2>
        <P>
          Mỗi topic có 4 ô số câu: <strong>Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao</strong>.
          Tổng tự khớp với số câu của section. Ví dụ Vật lý 12 — chương Dao động cơ:
        </P>
        <Pre>{`Section "Phần I — Trắc nghiệm" (40 câu)
  Topic "Dao động cơ"  → NB:5 TH:3 VD:2 VDC:1  = 11 câu
  Topic "Sóng cơ"      → NB:4 TH:3 VD:2 VDC:0  = 9 câu
  ...`}</Pre>

        <H2 id="generate">Sinh đề từ ma trận</H2>
        <P>
          Sau khi lưu ma trận, nhấn <strong>Sinh đề</strong>. Backend:
        </P>
        <Ul>
          <li>Truy ngân hàng câu hỏi theo mỗi (topic, mức độ), random đủ số.</li>
          <li>Nếu thiếu → AI (Llama/Qwen) sinh thêm câu hỏi mới + đáp án.</li>
          <li>Trả về đề hoàn chỉnh — bạn có thể edit, thêm câu thủ công trước khi publish.</li>
        </Ul>

        <H2 id="edit">Chỉnh sửa ma trận</H2>
        <P>
          Vào <Code>/teacher/exam-matrix/:id/edit</Code> — form pre-fill toàn bộ trạng thái hiện tại.
          Lưu lại sẽ ghi đè (PUT). Khoá học sinh đã làm dựa trên đề cũ không bị ảnh hưởng.
        </P>
      </>
    ),
  },

  // ── LaTeX Editor ────────────────────────────────────────────────────────
  {
    slug: 'latex-editor',
    title: 'Soạn đề bằng LaTeX',
    category: 'teacher',
    role: 'teacher',
    summary: 'Cú pháp LaTeX, template Việt, biên dịch và tự sinh đề từ tài liệu PDF.',
    readTime: '8 phút',
    content: (
      <>
        <P>
          AeroEduVision dùng <DocRef slug="glossary" anchor="tectonic">Tectonic</DocRef> + XeLaTeX để biên dịch
          tài liệu <DocRef slug="glossary" anchor="latex">LaTeX</DocRef> tiếng Việt, hỗ trợ Unicode đầy đủ.
        </P>

        <H2 id="quick-start">Quick start</H2>
        <Ol>
          <li>Vào <Code>/teacher/latex-documents</Code> → <strong>+ Tạo mới</strong>.</li>
          <li>Chọn template "Đề thi Vật lý 12" hoặc dán nội dung của bạn.</li>
          <li>Bấm <strong>Biên dịch</strong> — preview PDF hiện bên phải sau ~5 giây.</li>
          <li>Bấm <strong>Tạo đề thi</strong> để parse câu hỏi tự động và publish.</li>
        </Ol>

        <H2 id="font">Font tiếng Việt</H2>
        <P>
          Hệ thống tự chèn <Code>\usepackage{`{fontspec}`}</Code> + <Code>\setmainfont{`{Latin Modern Roman}`}</Code>.
          KHÔNG dùng <Code>babel[vietnamese]</Code> (xung đột XeLaTeX) — hệ thống tự strip nếu có.
        </P>

        <H2 id="syntax">Cú pháp đề thi chuẩn</H2>
        <Pre>{`\\begin{cauhoi}
Một vật dao động điều hoà với phương trình $x = 4\\cos(2\\pi t)$. Biên độ là:
\\dapan A. 2 cm
\\dapan B. 4 cm
\\dapan C. 8 cm
\\dapan D. 16 cm
\\dapandung{B}
\\loigiai Biên độ là hệ số trước cos, tức 4 cm.
\\end{cauhoi}`}</Pre>
        <P>
          Khi parse, hệ thống nhận diện <Code>cauhoi</Code> environment, các <Code>\dapan</Code>,
          {' '}<Code>\dapandung</Code> và <Code>\loigiai</Code> để tạo câu hỏi + đáp án.
        </P>

        <H2 id="errors">Lỗi biên dịch thường gặp</H2>
        <Ul>
          <li>
            <Code>There's no line here to end</Code> — có <Code>{`\\\\`}</Code> ở đầu dòng vertical mode.
            Hệ thống tự strip nhưng nếu vẫn lỗi → xoá <Code>{`\\\\`}</Code> dư.
          </li>
          <li>
            <Code>Missing $ inserted</Code> — quên <Code>$</Code> bao công thức toán. Bao mọi biến/công thức.
          </li>
          <li>
            <Code>Font ... not found</Code> — font không có trong container. Dùng Latin Modern Roman / Noto Sans.
          </li>
        </Ul>

        <H2 id="from-pdf">Sinh đề từ PDF có sẵn</H2>
        <P>
          Tại <Code>/teacher/taodethi</Code> upload file Word/PDF chứa đề. Hệ thống dùng AI extract
          câu hỏi + đáp án (xem <DocRef slug="ai-tools" anchor="quiz-extract" />).
        </P>

        <H2 id="share">Publish &amp; share QR</H2>
        <P>
          Sau khi <strong>Tạo đề thi</strong> thành công, modal hiện QR + link share. Học sinh quét QR
          (kể cả khi chưa login) → đăng nhập → vào thẳng đề (xem <DocRef slug="qr-exam" />).
        </P>
      </>
    ),
  },

  // ── Question Bank ───────────────────────────────────────────────────────
  {
    slug: 'question-bank',
    title: 'Ngân hàng câu hỏi',
    category: 'teacher',
    role: 'teacher',
    summary: 'Lưu trữ, gắn tag, tái sử dụng câu hỏi xuyên đề thi.',
    readTime: '4 phút',
    content: (
      <>
        <P>
          Ngân hàng câu hỏi (<Code>/teacher/question-bank</Code>) chứa toàn bộ câu hỏi giáo viên đã tạo.
          Tag theo môn, chương, mức độ <DocRef slug="glossary" anchor="bloom">Bloom</DocRef>.
        </P>

        <H2 id="add">Thêm câu hỏi</H2>
        <Ul>
          <li>Tạo thủ công trong UI.</li>
          <li>Import từ Excel (cột: nội dung, A, B, C, D, đáp án, mức độ).</li>
          <li>Tự động khi parse từ LaTeX hoặc PDF.</li>
          <li>AI generate theo chủ đề (gói Premium).</li>
        </Ul>

        <H2 id="reuse">Tái sử dụng trong đề</H2>
        <P>
          Khi tạo đề thủ công (<Code>/teacher/exams/create</Code>), bấm <strong>Thêm từ ngân hàng</strong>
          {' '}— filter theo chủ đề + mức độ, chọn random hoặc cụ thể. Hệ thống chấm điểm xuyên đề:
          xem câu nào dễ/khó qua tỷ lệ đúng trung bình.
        </P>
      </>
    ),
  },

  // ── AI Tools ────────────────────────────────────────────────────────────
  {
    slug: 'ai-tools',
    title: 'Công cụ AI',
    category: 'ai',
    role: 'all',
    summary: 'AI Tutor, sinh câu hỏi, OCR/OMR, số hoá tài liệu, transcript.',
    readTime: '6 phút',
    content: (
      <>
        <P>
          Hệ thống tích hợp nhiều mô hình AI qua <DocRef slug="glossary" anchor="fal">fal.ai</DocRef>:
          Llama 3.3, Qwen 2.5, GPT-OSS, Whisper, Vision models. Một số yêu cầu gói trả phí.
        </P>

        <H2 id="ai-tutor">AI Tutor</H2>
        <P>
          Trợ giảng đa năng tại <Code>/ai-tutor</Code>: giải bài, gợi ý lộ trình, phân tích lỗi sai.
          Hỗ trợ context dài (1M token Claude) cho bài giảng dài.
        </P>

        <H2 id="content-gen">AI Content Generator</H2>
        <P>
          <Code>/teacher/create-module</Code> — sinh nguyên 1 module bài giảng từ outline:
          mục tiêu, slide, bài tập, đáp án. Có thể edit trước khi publish.
        </P>

        <H2 id="digitize">Số hoá tài liệu</H2>
        <P>
          <Code>/teacher/document-digitization</Code> — upload PDF/ảnh → OCR + extract bố cục →
          xuất Markdown hoặc LaTeX. Bước review cho phép sửa trước khi lưu.
        </P>

        <H2 id="quiz-extract">Quiz extraction</H2>
        <P>
          Khi upload đề ở <Code>/teacher/taodethi</Code>, backend:
        </P>
        <Ol>
          <li>OCR tài liệu (Tesseract / Vision API).</li>
          <li>Chunk theo câu hỏi rồi gọi LLM extract JSON.</li>
          <li>Batch 5 câu/lượt + retry để tránh truncate.</li>
          <li>Sanitize JSON + salvage nếu output bị cắt.</li>
        </Ol>

        <H2 id="transcript">Transcript bài giảng</H2>
        <P>
          <Code>/teacher/transcript</Code> upload video → Whisper transcribe + tóm tắt. Học sinh xem
          phụ đề + tìm kiếm trong nội dung video.
        </P>
      </>
    ),
  },

  // ── QR Exam ─────────────────────────────────────────────────────────────
  {
    slug: 'qr-exam',
    title: 'QR code đề thi',
    category: 'student',
    role: 'all',
    summary: 'Quét QR vào thẳng đề thi, kể cả khi chưa đăng nhập.',
    readTime: '3 phút',
    content: (
      <>
        <P>
          Mỗi đề thi sau khi publish có URL riêng + QR. Khi học sinh quét:
        </P>

        <H2 id="flow">Luồng hoạt động</H2>
        <Ol>
          <li>QR → URL dạng <Code>/student/exam-prep?startExam=ID&amp;type=exam</Code>.</li>
          <li>
            Nếu chưa đăng nhập: hệ thống nhớ đường dẫn (kèm query) qua React Router{' '}
            <Code>location.state.from</Code>, đưa về <Code>/auth/login</Code>.
          </li>
          <li>Sau login: chuyển thẳng về URL ban đầu (preserve <DocRef slug="glossary" anchor="querystring">query string</DocRef>).</li>
          <li>Trang Exam Prep detect <Code>?startExam=...</Code> → auto chọn đề và mở 5 chế độ làm bài.</li>
        </Ol>

        <H2 id="print">In QR ra giấy</H2>
        <P>
          Giáo viên có thể tải PDF chứa QR từ modal <strong>Tạo đề thi</strong> hoặc trang chi tiết đề.
          In ra phát cho học sinh — học sinh chỉ cần điện thoại có camera.
        </P>

        <Callout kind="warn">
          QR là deep link — nếu thay đổi URL hoặc xoá đề, QR cũ sẽ dẫn về trang lỗi 404.
        </Callout>
      </>
    ),
  },

  // ── Payment ─────────────────────────────────────────────────────────────
  {
    slug: 'payment',
    title: 'Gói cước &amp; thanh toán',
    category: 'payment',
    role: 'all',
    summary: 'Free, Premium, Pro Annual — mua qua chuyển khoản + mã kích hoạt.',
    readTime: '5 phút',
    content: (
      <>
        <H2 id="plans">Các gói</H2>
        <Ul>
          <li><strong>Free</strong> — học khoá cơ bản, AI Tutor giới hạn câu/ngày.</li>
          <li><strong>Premium tháng</strong> — AI không giới hạn, sinh đề AI, transcript Whisper.</li>
          <li><strong>Pro Annual</strong> — toàn bộ + ưu tiên hỗ trợ + 1M context Claude.</li>
        </Ul>

        <H2 id="how-to-buy">Cách mua</H2>
        <Ol>
          <li>Vào <Code>/pricing</Code>, chọn gói → <strong>Đặt mua</strong>.</li>
          <li>Hệ thống tạo <DocRef slug="glossary" anchor="payment-order">PaymentOrder</DocRef> + hiển thị QR ngân hàng (VietQR).</li>
          <li>Chuyển khoản đúng số tiền + mã <Code>AERO-XXXXXX</Code> trong nội dung.</li>
          <li>Admin nhận thông báo qua Telegram → duyệt → hệ thống gửi mã kích hoạt qua email.</li>
          <li>Vào <Code>/dashboard</Code> nhập mã → tính năng được mở khoá.</li>
        </Ol>

        <H2 id="activation">Mã kích hoạt</H2>
        <P>
          Mỗi đơn hàng sinh 1 mã <DocRef slug="glossary" anchor="entitlement">entitlement</DocRef> riêng,
          có thời hạn (30 hoặc 365 ngày). Mã bị mất → liên hệ admin để tái phát hành.
        </P>

        <H2 id="ai-gating">Yêu cầu gói cho tính năng AI</H2>
        <P>
          Một số endpoint AI kiểm tra entitlement: AI Tutor nâng cao, content generator, quiz extraction.
          Học sinh dùng Free sẽ nhận thông báo upgrade khi đụng giới hạn.
        </P>

        <H2 id="history">Lịch sử mua</H2>
        <P>
          Mọi đơn đã thanh toán xuất hiện ở <Code>/student/purchase-history</Code> — gồm tên gói,
          số tiền, ngày duyệt.
        </P>
      </>
    ),
  },

  // ── Cold-start UX ───────────────────────────────────────────────────────
  {
    slug: 'cold-start',
    title: 'Hiện tượng "cold-start"',
    category: 'reference',
    role: 'all',
    summary: 'Vì sao request đầu tiên đôi khi chậm và banner cam xuất hiện?',
    readTime: '2 phút',
    content: (
      <>
        <P>
          Hệ thống chạy trên <DocRef slug="glossary" anchor="cloud-run">Cloud Run</DocRef> với cấu hình
          {' '}<Code>min-instances=0</Code> để tiết kiệm chi phí. Khi không có request một thời gian,
          container scale về 0 — lần truy cập tiếp theo phải khởi động lại (≈ 3–8 giây).
        </P>

        <H2 id="banner">Banner thông báo</H2>
        <P>
          Khi request đầu tiên vượt 3 giây, một banner cam nhỏ hiện ở đỉnh trang:
          {' '}<em>"Hệ thống đang khởi động… vui lòng đợi 5–10 giây."</em> Sau khi response thành công,
          banner chuyển xanh rồi tự ẩn.
        </P>

        <H2 id="retry">Tự retry</H2>
        <P>
          Axios interceptor tự retry với <DocRef slug="glossary" anchor="backoff">exponential backoff</DocRef>:
          0s, 2s, 4s. Vì thế khi bạn thấy "đang load" lâu, hệ thống đang thử lại — không cần F5.
        </P>

        <Callout kind="info">
          Sau khi container đã warm (~5 phút), mọi request tiếp theo dưới 200ms. Cold-start chỉ ảnh hưởng
          lần đầu trong ngày hoặc sau thời gian dài không dùng.
        </Callout>
      </>
    ),
  },

  // ── Glossary ────────────────────────────────────────────────────────────
  {
    slug: 'glossary',
    title: 'Bảng thuật ngữ',
    category: 'reference',
    role: 'all',
    summary: 'Giải thích các thuật ngữ kỹ thuật xuất hiện trong toàn hệ thống.',
    readTime: '8 phút',
    content: (
      <>
        <P>
          Trang này tổng hợp các thuật ngữ kỹ thuật được dùng trong AeroEduVision. Mọi tham chiếu
          {' '}<Code>{`<DocRef slug="glossary" anchor="..." />`}</Code> trỏ về đây.
        </P>

        <H2 id="ai">AI — Trí tuệ nhân tạo</H2>
        <P>
          Các mô hình tự học từ dữ liệu để dự đoán, sinh nội dung, hiểu ngôn ngữ. AeroEduVision dùng
          Llama, Qwen, GPT-OSS qua provider <DocRef slug="glossary" anchor="fal">fal.ai</DocRef>.
        </P>

        <H2 id="backoff">Backoff (exponential)</H2>
        <P>
          Chiến lược retry: nếu lần thử thứ N thất bại, đợi <Code>2^N</Code> giây trước khi thử lại.
          Giảm tải khi service đang quá tải.
        </P>

        <H2 id="bloom">Bloom (thang đo)</H2>
        <P>
          Phân loại mức độ nhận thức: <strong>Nhận biết — Thông hiểu — Vận dụng — Vận dụng cao</strong>
          {' '}(rút gọn từ thang Bloom 6 bậc). Dùng trong ma trận đề.
        </P>

        <H2 id="cloud-run">Cloud Run</H2>
        <P>
          Dịch vụ chạy container của Google Cloud — tự scale theo lưu lượng, có thể về 0 khi rảnh.
          AeroEduVision deploy phần frontend + auth + payment trên Cloud Run (xem
          {' '}<DocRef slug="cold-start" />).
        </P>

        <H2 id="entitlement">Entitlement</H2>
        <P>
          Quyền sử dụng tính năng kèm theo gói trả phí. Mỗi entitlement có danh sách features,
          ngày hết hạn, gắn với <Code>userId</Code>.
        </P>

        <H2 id="fal">fal.ai</H2>
        <P>
          Nền tảng inference cho mô hình mở (Llama, Qwen, Whisper…). Hệ thống gọi qua REST API,
          có sanitize/salvage JSON để xử lý output bị truncate.
        </P>

        <H2 id="jwt">JWT — JSON Web Token</H2>
        <P>
          Chuỗi mã hoá chứa thông tin user (id, email, role) ký số bằng secret. Frontend lưu trong
          localStorage, gửi qua header <Code>Authorization: Bearer ...</Code>. Hết hạn sau 24h.
        </P>

        <H2 id="latex">LaTeX</H2>
        <P>
          Hệ thống soạn thảo văn bản khoa học, đặc biệt mạnh ở công thức toán. AeroEduVision biên dịch
          bằng <DocRef slug="glossary" anchor="tectonic">Tectonic</DocRef> + XeLaTeX. Xem
          {' '}<DocRef slug="latex-editor">hướng dẫn LaTeX</DocRef>.
        </P>

        <H2 id="lms">LMS — Learning Management System</H2>
        <P>
          Hệ thống quản lý học tập: khoá học, bài giảng, bài tập, theo dõi tiến độ, cấp chứng chỉ.
          AeroEduVision tích hợp LMS riêng + có thể kết nối Moodle/Canvas qua API.
        </P>

        <H2 id="ocr">OCR — Optical Character Recognition</H2>
        <P>
          Nhận dạng chữ từ ảnh/PDF scan. Dùng Tesseract (mã nguồn mở) hoặc Vision API
          cho chất lượng cao hơn. Quan trọng cho chấm tự luận và số hoá tài liệu.
        </P>

        <H2 id="omr">OMR — Optical Mark Recognition</H2>
        <P>
          Nhận dạng dấu tích trên phiếu trắc nghiệm (như đề thi THPT). Tự động chấm bằng cách
          phát hiện ô đã tô.
        </P>

        <H2 id="payment-order">PaymentOrder</H2>
        <P>
          Bản ghi đơn hàng trong Postgres với trạng thái <Code>PENDING / PAID / REJECTED</Code>.
          Khi PAID, hệ thống sinh entitlement + gửi email mã kích hoạt.
        </P>

        <H2 id="qr">QR Code</H2>
        <P>
          Mã vạch 2 chiều chứa URL hoặc dữ liệu. AeroEduVision dùng cho: thanh toán (VietQR), share
          đề thi, điểm danh, đăng nhập nhanh.
        </P>

        <H2 id="querystring">Query string</H2>
        <P>
          Phần URL sau dấu <Code>?</Code>, dạng <Code>key=value&amp;key2=value2</Code>. Dùng để truyền
          tham số (vd <Code>?startExam=abc123</Code>). Khi redirect qua login, hệ thống preserve nguyên
          chuỗi này.
        </P>

        <H2 id="tectonic">Tectonic</H2>
        <P>
          Engine LaTeX hiện đại viết bằng Rust, tự fetch package, build nhanh. Backend AeroEduVision
          gọi Tectonic CLI từ container chuyên dụng để biên dịch.
        </P>

        <H2 id="thpt">THPT</H2>
        <P>
          Trung học Phổ thông — kỳ thi quan trọng cuối lớp 12 ở Việt Nam. Hệ thống có template đề
          theo cấu trúc thi THPT (Phần I trắc nghiệm + Phần II đúng/sai + Phần III ngắn).
        </P>

        <H2 id="websocket">WebSocket</H2>
        <P>
          Giao thức kết nối 2 chiều realtime (khác HTTP request/response). Dùng cho: bảng xếp hạng
          phòng thi, chat lớp, camera giám thị stream.
        </P>
      </>
    ),
  },

  // ── Online Exam Room ────────────────────────────────────────────────────
  {
    slug: 'online-exam-room',
    title: 'Phòng thi online',
    category: 'teacher',
    role: 'teacher',
    summary: 'Tổ chức thi tập trung, giám sát realtime, chấm tự động.',
    readTime: '5 phút',
    content: (
      <>
        <P>
          Vào <Code>/teacher/online-exam-room</Code> để tạo và quản lý phòng thi.
        </P>

        <H2 id="create-room">Tạo phòng</H2>
        <Ol>
          <li>Chọn đề thi từ danh sách đã publish.</li>
          <li>Đặt thời gian bắt đầu, thời gian làm bài.</li>
          <li>Cấu hình: bật/tắt camera, anti-cheat, shuffle câu hỏi.</li>
          <li>Hệ thống sinh mã phòng 6 ký tự + QR.</li>
        </Ol>

        <H2 id="join">Học sinh tham gia</H2>
        <P>
          Học sinh vào <Code>/join</Code> nhập mã phòng, hoặc quét QR. Cần đăng nhập trước.
        </P>

        <H2 id="monitor">Giám sát</H2>
        <P>
          Dashboard giáo viên hiển thị:
        </P>
        <Ul>
          <li>Danh sách HS online + tiến độ % câu đã làm.</li>
          <li>Camera live (nếu bật) — phát hiện gian lận bằng AI.</li>
          <li>Cảnh báo: chuyển tab, mất kết nối, có người thứ 2.</li>
        </Ul>

        <H2 id="results">Kết quả</H2>
        <P>
          Sau khi hết giờ, hệ thống tự chấm + xếp hạng. Báo cáo chi tiết tại
          {' '}<Code>/teacher/exam-reports</Code>.
        </P>
      </>
    ),
  },

  // ── Course player ───────────────────────────────────────────────────────
  {
    slug: 'course-player',
    title: 'Trình phát khoá học',
    category: 'student',
    role: 'student',
    summary: 'Xem video, làm quiz xen kẽ, lưu ghi chú và theo dõi tiến độ.',
    readTime: '3 phút',
    content: (
      <>
        <P>
          Vào <Code>/learning/course/:slug/:courseId</Code> để mở trình phát. Layout 3 cột:
        </P>
        <Ul>
          <li><strong>Trái</strong> — Mục lục chương/bài, hiển thị tiến độ.</li>
          <li><strong>Giữa</strong> — Video / nội dung bài.</li>
          <li><strong>Phải</strong> — Tài liệu đính kèm, ghi chú, hỏi đáp.</li>
        </Ul>

        <H2 id="progress">Tiến độ</H2>
        <P>
          Mỗi bài đánh dấu hoàn thành khi xem ≥ 90% video. Quiz cuối bài phải đạt điểm tối thiểu để
          mở bài tiếp theo (nếu giáo viên cấu hình gating).
        </P>

        <H2 id="notes">Ghi chú</H2>
        <P>
          Ghi chú gắn timestamp video — bấm note → tua đến đúng phút. Đồng bộ qua API
          {' '}<Code>/api/learning/events</Code>.
        </P>

        <H2 id="certificate">Chứng chỉ</H2>
        <P>
          Hoàn thành 100% → tự cấp chứng chỉ. Xem tại
          {' '}<DocRef slug="student-guide" anchor="certificate">Hướng dẫn HS — Chứng chỉ</DocRef>.
        </P>
      </>
    ),
  },

  // ── Privacy / Camera ────────────────────────────────────────────────────
  {
    slug: 'privacy-camera',
    title: 'Quyền riêng tư &amp; camera lớp',
    category: 'reference',
    role: 'all',
    summary: 'Hệ thống dùng camera/cảm biến thế nào, dữ liệu được lưu ra sao.',
    readTime: '4 phút',
    content: (
      <>
        <H2 id="when-on">Khi nào camera bật?</H2>
        <Ul>
          <li>Trong phòng thi online — nếu giáo viên enable anti-cheat.</li>
          <li>Trong lớp học IoT — giáo viên giám sát cảm xúc / điểm danh.</li>
          <li>Học sinh phải cấp quyền browser — có thể từ chối nhưng sẽ bị mark vắng.</li>
        </Ul>

        <H2 id="data">Dữ liệu thu thập</H2>
        <Ul>
          <li><strong>Stream video</strong> — chỉ phát trực tiếp, KHÔNG lưu trừ khi admin bật recording.</li>
          <li><strong>Phân tích cảm xúc</strong> — chỉ lưu kết quả (vui/buồn/tập trung) không lưu khuôn mặt.</li>
          <li><strong>Điểm danh</strong> — embedding khuôn mặt mã hoá, đối chiếu local.</li>
        </Ul>

        <H2 id="opt-out">Từ chối thu thập</H2>
        <P>
          Vào <Code>/student/agent-settings</Code> để tắt phân tích cảm xúc / recording. Một số chức năng
          (chấm thi tập trung) có thể không khả dụng nếu tắt.
        </P>

        <Callout kind="info">
          Toàn bộ dữ liệu cá nhân được mã hoá at-rest. Học sinh có quyền yêu cầu xoá tài khoản
          (GDPR-style) — liên hệ admin.
        </Callout>
      </>
    ),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NEW (2026-05-15): các tính năng mới sau deploy 240-241
  // ══════════════════════════════════════════════════════════════════════════

  // ── Games Hub ─────────────────────────────────────────────────────────────
  {
    slug: 'games-hub',
    title: 'Trò chơi học tập',
    category: 'student',
    role: 'all',
    summary: 'Hub các trò chơi (Pixel Odyssey RPG, Pixel Agents, Kéo Co, Wayground) đã được tách khỏi Lab thí nghiệm.',
    readTime: '5 phút',
    content: (
      <>
        <P>
          Từ tháng 5/2026, các trò chơi đã được <strong>tách khỏi mục Lab thí nghiệm</strong> để dễ
          quản lí. Truy cập qua sidebar <Code>📺 Trò chơi học tập</Code> hoặc URL{' '}
          <Code>/dashboard/games</Code>.
        </P>

        <H2 id="why-split">Vì sao tách Game khỏi Lab?</H2>
        <Ul>
          <li><strong>Lab</strong> = thí nghiệm khoa học (Aerodynamics, Chemistry, Optics...) — focus mô phỏng vật lý/hoá học.</li>
          <li><strong>Game</strong> = trải nghiệm có cốt truyện / luật chơi / điểm số — focus giải trí + học.</li>
          <li>Tách ra giúp HS không bị lẫn lộn, GV dễ chọn công cụ phù hợp tiết học.</li>
        </Ul>

        <H2 id="pixel-odyssey">🌟 Pixel Odyssey — Hành Trình Ánh Sao Lạc</H2>
        <P>
          RPG pixel adventure 4 chương về Kai (16 tuổi) tìm Mira sau khi thiên thạch rơi.
          URL: <Code>/dashboard/games/pixel-odyssey</Code>.
        </P>
        <H3 id="po-controls">Điều khiển</H3>
        <Ul>
          <li><strong>WASD / Mũi tên</strong> — di chuyển 8 hướng</li>
          <li><strong>Space / J</strong> — tấn công bằng Kiếm Ánh Sáng</li>
          <li><strong>E</strong> — nói chuyện NPC (đến gần)</li>
          <li><strong>P</strong> — tạm dừng · <strong>Esc</strong> — đóng dialogue</li>
        </Ul>
        <H3 id="po-flow">Luồng chơi chương 1-2</H3>
        <Ol>
          <li>Spawn ở làng Luneria → gặp Trưởng làng (🧓) để nghe hint.</li>
          <li>Đi về phía Đông → vào portal tím → qua Crater (hố thiên thạch).</li>
          <li>Tìm cô gái phát sáng (Mira ✨) → bấm E → unlock <strong>Star Core</strong>.</li>
          <li>Chương 2 mở → quay về Luneria → 6 shadow creatures spawn → chiến đấu.</li>
          <li>Sau khi clear → gặp Piko (🤖) trong làng để unlock chương 3.</li>
        </Ol>
        <H3 id="po-emotion">Hệ thống cảm xúc 4 trục</H3>
        <Ul>
          <li><strong>Hy vọng</strong> — tăng khi nhặt star</li>
          <li><strong>Tò mò</strong> — tăng khi nói chuyện NPC</li>
          <li><strong>Quyết tâm</strong> — tăng khi đánh enemy → <em>boost damage attack</em></li>
          <li><strong>Sợ hãi</strong> — tăng khi bị đánh</li>
        </Ul>
        <Callout kind="tip">
          Auto-save mỗi 10s vào localStorage. Bấm <Code>Lưu</Code> trong header để lưu manual.
          Bấm <Code>Nhật ký cốt truyện</Code> để xem lại các sự kiện đã ghi.
        </Callout>

        <H2 id="pixel-agents">🤖 Pixel Agents — RPG đa môn</H2>
        <P>
          RPG học qua game — campus 7 toà nhà bộ môn (Toán, Lý, Hoá, Sinh, Văn, Tin, Mỹ thuật).
          Mỗi NPC có personality AI riêng (socratic, fact, creative, strict, confused, hint).
          Trả lời câu hỏi đúng → lên level + nhận coins.
          URL: <Code>/dashboard/games/pixel-agents</Code>.
        </P>

        <H2 id="keo-co">🪢 Kéo Co Kiến Thức</H2>
        <P>
          Quiz đối kháng 2 đội. URL: <Code>/dashboard/games/keo-co</Code>. Hỗ trợ 3 chế độ:
        </P>
        <Ul>
          <li><strong>Lớp học (Classroom)</strong> — GV tạo session → HS scan QR / nhập short code → join → kéo dây bằng kiến thức.</li>
          <li><strong>Live 2 người</strong> — đấu nhanh giữa 2 HS qua link.</li>
          <li><strong>Thách đấu 1v1</strong> — tạo link share, đối thủ chơi xong → so điểm.</li>
        </Ul>
        <H3 id="keo-co-catalog">Danh mục đề thi</H3>
        <P>
          Khi tạo session mới, GV có thể chọn đề từ <strong>danh mục thi đấu</strong> (đã add từ
          {' '}<Code>/teacher/exams</Code> qua nút ⚔️ Swords). Khi chọn đề → auto-fill subject +
          topic + question count.
        </P>
        <H3 id="keo-co-leaderboard">Bảng xếp hạng</H3>
        <P>
          Hiển thị top 10 người chơi cross-session: 🥇🥈🥉 + Wins / Total Played / Win Rate %
          / Total Score. Click header để collapse/expand.
        </P>

        <H2 id="wayground">🎯 Wayground (Beta)</H2>
        <P>
          Sân chơi tự do — GV tạo game theo template (chạy mê cung, đố vui pixel, snake quiz...).
          HS join qua mã 4 chữ số. Đang trong giai đoạn beta.
        </P>

        <H2 id="games-tips">Mẹo chung khi dùng game</H2>
        <Ul>
          <li>Game dạng RPG (Pixel Odyssey/Agents) phù hợp <strong>lúc rảnh</strong> hoặc tiết tự học — không nên giữa bài thi.</li>
          <li>Kéo Co + Wayground phù hợp <strong>15 phút cuối tiết</strong> để củng cố kiến thức.</li>
          <li>Tất cả progress đều save tự động — HS có thể chơi tiếp lần sau từ chỗ dừng.</li>
        </Ul>
      </>
    ),
  },

  // ── Lesson Plan Pro ───────────────────────────────────────────────────────
  {
    slug: 'lesson-plan-pro',
    title: 'Soạn giáo án nâng cao (AI · Word/PDF · Spreadsheet)',
    category: 'teacher',
    role: 'teacher',
    summary: 'AI tạo giáo án LaTeX kiểu Gemini Canvas, tải .doc/.pdf, chèn bảng tính Excel-like với formula.',
    readTime: '8 phút',
    content: (
      <>
        <P>
          Tháng 5/2026 đã ship 3 nâng cấp lớn cho hệ giáo án ở{' '}
          <Code>/teacher/lesson-plans</Code> + <Code>/teacher/lesson-plans/[id]</Code>.
        </P>

        <H2 id="ai-latex">1. AI tạo giáo án LaTeX (kiểu Gemini Canvas)</H2>
        <P>
          Trên trang danh sách giáo án (<Code>/teacher/lesson-plans</Code>), bấm nút{' '}
          <strong>🪄 Tạo bằng AI</strong> (gradient tím-hồng, cạnh nút "Tạo giáo án mới").
          Mở modal 2 cột:
        </P>
        <H3 id="ai-latex-flow">Luồng 3 bước</H3>
        <Ol>
          <li><strong>Chọn template:</strong> 3 mẫu CV2345 builtin (Tiếng Việt 4 tiết, 6 tiết, generic 5 hoạt động) hoặc "Mẫu tự dán" (paste template LaTeX của bạn vào textarea).</li>
          <li><strong>Mô tả yêu cầu:</strong> textarea + 5 prompt suggestion clickable (Vật lí Động lượng, Tiếng Việt lớp 2, Toán PT bậc 2, Hoá Liên kết H, Sinh Quang hợp).</li>
          <li><strong>Sinh + Preview:</strong> AI điền nội dung vào template (giữ nguyên geometry/macro/package theo NĐ 30/2020/NĐ-CP) → preview LaTeX bên phải → "Tạo dự án" → tự navigate đến editor LaTeX.</li>
        </Ol>
        <Callout kind="tip">
          AI sử dụng fal.ai/Claude với system prompt 9 quy tắc: KHÔNG đổi cấu trúc, KHÔNG đổi
          geometry, fill placeholder thực tế, dùng đúng MathJax cho công thức Vật lí/Toán/Hoá.
        </Callout>

        <H2 id="export-doc-pdf">2. Tải về Word + PDF</H2>
        <P>
          Trong editor giáo án (<Code>/teacher/lesson-plans/[id]</Code>), header có 2 nút mới:
        </P>
        <Ul>
          <li><strong>📄 Word</strong> (xanh dương) — tải file <Code>.doc</Code> mở native trong Microsoft Word, Google Docs, LibreOffice. Định dạng theo NĐ 30/2020/NĐ-CP: Times New Roman 13pt, line-height 1.5, justify, lề 2/2/3/2cm.</li>
          <li><strong>🖨️ PDF</strong> (đỏ) — mở popup print dialog. Trong dialog → chọn destination "Save as PDF" để lưu.</li>
        </Ul>
        <Callout kind="info">
          Cả 2 cách export đều giữ nguyên hình thức gốc: bảng (table border đầy đủ),
          công thức KaTeX, bảng tính Excel-like (tự render với formula đã eval). Không cần
          dependency ngoài.
        </Callout>

        <H2 id="spreadsheet">3. Bảng tính Excel-like trong WYSIWYG</H2>
        <P>
          Toolbar editor có icon <strong>📊 Sheet</strong> — bấm → prompt kích thước (mặc định
          5x5, max 200x50) → chèn bảng tính inline trong giáo án.
        </P>
        <H3 id="sheet-features">Tính năng</H3>
        <Ul>
          <li>Header A,B,C... × 1,2,3... giống Excel.</li>
          <li>Click cell → highlight + <strong>formula bar</strong> dưới (input + preview kết quả realtime).</li>
          <li>Double-click → edit inline. Toolbar mini: + Hàng / − Hàng / + Cột / − Cột / 🗑 Xoá.</li>
        </Ul>
        <H3 id="sheet-formulas">Công thức hỗ trợ</H3>
        <Ul>
          <li><Code>=A1+B1</Code> — cộng cell</li>
          <li><Code>=SUM(A1:A5)</Code> — tổng range</li>
          <li><Code>=AVG(A1:B3)</Code> hoặc <Code>=AVERAGE(...)</Code> — trung bình</li>
          <li><Code>=COUNT(A1:A10)</Code> — đếm cell có số</li>
          <li><Code>=MIN(...)</Code> / <Code>=MAX(...)</Code></li>
          <li><Code>=5*3+2</Code> — biểu thức số học thuần</li>
        </Ul>
        <Callout kind="tip">
          Cell có formula → hiển thị <strong>giá trị tính được</strong> (chữ xanh dương đậm).
          Click vào → cell hiện raw formula <Code>=...</Code> trong cell + preview kết quả ở
          formula bar dưới.
        </Callout>

        <H2 id="lp-pro-tips">Mẹo phối hợp 3 tính năng</H2>
        <Ol>
          <li>Bấm 🪄 <strong>Tạo bằng AI</strong> để có khung giáo án nhanh.</li>
          <li>Trong editor, chèn 📊 <strong>Spreadsheet</strong> để liệt kê điểm/bảng so sánh.</li>
          <li>Cuối cùng, 📄 <strong>Tải Word</strong> để gửi tổ trưởng duyệt, hoặc 🖨️ <strong>PDF</strong> để in.</li>
        </Ol>
      </>
    ),
  },

  // ── Knowledge Graph ───────────────────────────────────────────────────────
  {
    slug: 'knowledge-graph',
    title: 'Đồ thị tri thức (Knowledge Graph)',
    category: 'ai',
    role: 'all',
    summary: 'Tìm kiếm liên kết khái niệm, công thức, nghề nghiệp dạng mạng lưới trực quan. Hỗ trợ AI tự động extract entity từ giáo án.',
    readTime: '6 phút',
    content: (
      <>
        <P>
          Đồ thị tri thức là cách <strong>mới</strong> để tìm hiểu kiến thức: thay vì đọc từng
          bài tuyến tính, bạn thấy ngay mạng lưới các khái niệm/công thức/nghề liên quan
          xung quanh chủ đề mình quan tâm.
        </P>
        <P>URL: <Code>/dashboard/knowledge-graph</Code>.</P>

        <H2 id="kg-explore">1. Khám phá graph</H2>
        <H3 id="kg-controls">Điều khiển canvas</H3>
        <Ul>
          <li><strong>Kéo node</strong> — di chuyển</li>
          <li><strong>Double-click node</strong> — ghim/bỏ ghim 📌</li>
          <li><strong>Click node</strong> — mở detail drawer bên phải</li>
          <li><strong>Scroll wheel</strong> — zoom 30% – 300%</li>
          <li><strong>Kéo nền</strong> — pan camera</li>
          <li><strong>Search bar</strong> (header) — tìm fuzzy → click kết quả → graph tự xoay quanh node đó</li>
        </Ul>

        <H3 id="kg-types">10 loại node</H3>
        <Ul>
          <li><strong>Subject</strong> (xanh dương) — Môn học (VD: Vật lí)</li>
          <li><strong>Chapter</strong> (tím) — Chương (VD: Cơ học)</li>
          <li><strong>Topic</strong> (xanh lá) — Chủ đề (VD: Động lượng)</li>
          <li><strong>Concept</strong> (vàng) — Khái niệm (VD: Bảo toàn)</li>
          <li><strong>Formula</strong> (cam) — Công thức (VD: p=mv)</li>
          <li><strong>Question</strong> (đỏ) — Câu hỏi</li>
          <li><strong>Lesson</strong> (cyan) — Bài giảng</li>
          <li><strong>Project</strong> (tím nhạt) — Dự án</li>
          <li><strong>Career</strong> (hồng) — Nghề nghiệp</li>
          <li><strong>Person</strong> (xám) — Người</li>
        </Ul>
        <P>Filter ở sidebar trái — toggle để ẩn/hiện từng loại.</P>

        <H2 id="kg-detail">2. Detail drawer</H2>
        <P>
          Click 1 node → drawer phải hiện mô tả + thuộc tính (VD công thức có unit) +
          danh sách <strong>liên kết</strong> (in/out + relation type tiếng Việt).
        </P>
        <Ul>
          <li>Click 1 liên kết → mở detail drawer của node đó.</li>
          <li>Bấm <strong>"Lấy node này làm tâm"</strong> → graph BFS depth=2 từ node mới.</li>
        </Ul>

        <H2 id="kg-extract">3. AI Extract — auto-sinh entity từ văn bản</H2>
        <P>
          Header có nút <strong>🪄 Trích xuất AI</strong> (gradient cyan-blue). Mở modal 2 tab:
        </P>
        <H3 id="kg-extract-text">Tab 1: Từ văn bản</H3>
        <Ol>
          <li>Paste 1 đoạn văn bản (≥30 chars, max 30k chars).</li>
          <li>Bấm <strong>"Trích xuất bằng AI"</strong>.</li>
          <li>AI trả về: Topics + Concepts + Formulas + Edges (max 8/6/8/12).</li>
          <li>Preview entities → bấm <strong>"Mở graph với node mới"</strong> → graph tự xoay.</li>
        </Ol>
        <H3 id="kg-extract-lp">Tab 2: Từ giáo án</H3>
        <P>
          Dropdown lấy danh sách <Code>LessonPlan</Code> (sort updatedAt DESC). Chọn 1 → AI đọc
          HTML content → trích entities. Tự tạo node Lesson + edges <Code>MENTIONS_TOPIC</Code>{' '}
          từ Lesson đến tất cả Topics/Concepts/Formulas extracted.
        </P>
        <Callout kind="tip">
          <strong>Dedup tự động:</strong> nếu label trùng (case-insensitive) với node đã có,
          AI <em>reuse</em> id thay vì tạo duplicate. Auto-link similarity (≥0.6) cho new
          nodes vs existing same-type nodes. Xem stats banner sau extract.
        </Callout>

        <H2 id="kg-link">4. Link similarity full graph</H2>
        <P>
          Sau extract → bấm nút "Link similarity full graph" để quét toàn bộ nodes (limit 500),
          tạo edges <Code>RELATES_TO</Code> cho cặp same-type có similarity ≥ 0.65.
        </P>

        <H2 id="kg-usecase">Use case thực tế</H2>
        <Ul>
          <li><strong>HS</strong> gõ "động lượng" → graph xoay quanh Topic → thấy <Code>p=mv</Code>, <Code>Bảo toàn</Code>, <Code>Vector</Code>, <Code>Kỹ sư ô tô</Code>, <Code>Game dev</Code>.</li>
          <li><strong>HS</strong> click Career "Kỹ sư điện" → thấy chuỗi Topic dẫn đến: Mạch điện ↔ Điện trường ↔ Cảm ứng điện từ.</li>
          <li><strong>GV</strong> soạn xong giáo án → AI Extract → graph tự lớn theo content GV soạn.</li>
          <li><strong>Admin</strong> xem graph để tìm gaps trong curriculum (concept ít kết nối).</li>
        </Ul>
      </>
    ),
  },

  // ── Scrumboard Guide ──────────────────────────────────────────────────────
  {
    slug: 'scrumboard-guide',
    title: 'Quản lí công việc bằng Scrumboard',
    category: 'reference',
    role: 'all',
    summary: 'Kanban board cá nhân — kéo thả task, hệ thống điểm/XP, save tự động qua localStorage.',
    readTime: '4 phút',
    content: (
      <>
        <P>
          Mỗi vai trò (HS, GV, Admin) có 1 Scrumboard riêng — dữ liệu hoàn toàn tách biệt qua
          localStorage namespace. Không lẫn task giữa các role.
        </P>

        <H2 id="scrum-routes">3 route theo vai trò</H2>
        <Ul>
          <li><strong>HS</strong> — <Code>/dashboard/scrumboard</Code>: Cần làm → Đang học → Ôn tập → Hoàn thành ✓</li>
          <li><strong>GV</strong> — <Code>/teacher/scrumboard</Code>: Cần làm → Đang thực hiện → Chờ duyệt → Hoàn thành ✓</li>
          <li><strong>Admin</strong> — <Code>/admin/scrumboard</Code>: Backlog → Đang xử lý → Review → Đã đóng ✓</li>
        </Ul>

        <H2 id="scrum-subjects">Loại công việc theo role</H2>
        <H3 id="scrum-student">HS (6 môn học)</H3>
        <P>Vật lý, Toán học, Hoá học, Sinh học, Lập trình, Khác.</P>
        <H3 id="scrum-teacher">GV (7 nhóm)</H3>
        <P>Soạn bài, Chấm bài, Quản lý lớp, Họp/Sinh hoạt, Báo cáo, Bồi dưỡng, Khác.</P>
        <H3 id="scrum-admin">Admin (7 nhóm)</H3>
        <P>Vận hành, Hỗ trợ NSD, Hạ tầng IT, Tài chính, Marketing, Pháp lý/Tuân thủ, Khác.</P>

        <H2 id="scrum-actions">Thao tác cơ bản</H2>
        <Ul>
          <li><strong>Tạo task</strong> — bấm "+ Task mới" header hoặc icon "+" trong từng cột.</li>
          <li><strong>Di chuyển</strong> — kéo task giữa các cột (HTML5 drag-drop).</li>
          <li><strong>Edit/Xoá</strong> — click "..." trên card → menu mở ra.</li>
          <li><strong>Lùi/Tiến</strong> — menu có nút mũi tên để di chuyển không cần kéo.</li>
        </Ul>

        <H2 id="scrum-modal">Tạo/Edit task</H2>
        <P>Modal có 6 trường:</P>
        <Ul>
          <li><strong>Tiêu đề*</strong> — bắt buộc</li>
          <li><strong>Mô tả</strong> — chi tiết task</li>
          <li><strong>Loại công việc</strong> — chọn từ list theo role</li>
          <li><strong>Ưu tiên</strong> — Thấp / Trung bình / Cao (color-coded)</li>
          <li><strong>Cột</strong> — chọn vào cột nào</li>
          <li><strong>Điểm thưởng</strong> — XP/điểm 10–500 (HS dùng "XP", GV/Admin dùng "điểm")</li>
          <li><strong>Thẻ</strong> — phân cách dấu phẩy (auto-slugify thành kebab-case)</li>
        </Ul>

        <H2 id="scrum-stats">Thống kê + Progress</H2>
        <P>
          Header hiển thị: tổng task, # xong, # đang làm, +XP/điểm earned. Cuối trang có
          progress bar tổng thể (% task hoàn thành).
        </P>

        <Callout kind="info">
          Dữ liệu lưu localStorage trên trình duyệt. Đổi browser/máy → mất task. Phase 2
          (TBD): sync lên server với endpoint <Code>/api/scrumboard/...</Code>.
        </Callout>
      </>
    ),
  },

  // ── Digital Logic Lab ─────────────────────────────────────────────────────
  {
    slug: 'digital-logic-lab',
    title: 'Lab cổng logic số',
    category: 'student',
    role: 'all',
    summary: 'Mô phỏng cổng AND/OR/NOT/NAND/NOR/XOR/XNOR + INPUT/OUTPUT/CLOCK kéo-thả + nối dây + bảng chân lý tự sinh.',
    readTime: '5 phút',
    content: (
      <>
        <P>
          Trang lab dành cho HS THPT học chương "Đại số Boole" + "Mạch số" (Tin học 11/12).
          URL: <Code>/dashboard/labtwin/digital-logic-lab</Code>.
        </P>

        <H2 id="dl-palette">10 linh kiện trong palette</H2>
        <Ul>
          <li><strong>Cổng cơ bản:</strong> AND, OR, NOT</li>
          <li><strong>Cổng kết hợp:</strong> NAND, NOR, XOR, XNOR</li>
          <li><strong>I/O:</strong> INPUT (toggle 0/1), OUTPUT (đèn LED), CLOCK (xung 1Hz)</li>
        </Ul>

        <H2 id="dl-actions">Thao tác</H2>
        <Ol>
          <li><strong>Click linh kiện</strong> trong palette → thêm vào canvas (vị trí random).</li>
          <li><strong>Kéo gate</strong> → di chuyển trên canvas SVG.</li>
          <li><strong>Nối dây:</strong> click pin OUTPUT (xanh lá, bên phải gate) → click pin INPUT (xanh dương, bên trái gate) → wire bezier curve hiện ra.</li>
          <li><strong>Click INPUT</strong> → toggle 0/1 ngay.</li>
          <li><strong>Click gate</strong> → properties panel (label + xóa).</li>
          <li><strong>Toolbar:</strong> Play/Pause, Mẫu, Bảng chân lý, Export, Import, Clear.</li>
        </Ol>

        <H2 id="dl-presets">6 mẫu chuẩn</H2>
        <Ul>
          <li><strong>XOR cơ bản</strong> — khởi đầu 2 input + 1 cổng</li>
          <li><strong>Half Adder</strong> — Sum + Cout (XOR + AND)</li>
          <li><strong>Full Adder</strong> — Sum + Cout với Cin (2 XOR + 2 AND + 1 OR)</li>
          <li><strong>SR Latch</strong> — bộ nhớ 1 bit (2 NOR feedback)</li>
          <li><strong>2:1 MUX</strong> — chọn A hoặc B theo Sel</li>
          <li><strong>Clock + LED</strong> — đèn nhấp nháy 1Hz</li>
        </Ul>

        <H2 id="dl-truth">Bảng chân lý tự sinh</H2>
        <P>
          Auto-generate cho mạch có 1–4 INPUT và 1–4 OUTPUT. Hiển thị inline ở sidebar phải
          + modal lớn (bấm icon Grid3x3 trong header). 2^n hàng, mỗi hàng eval simulate
          độc lập với input set tương ứng. Highlight ô = 1 màu xanh lá đậm.
        </P>

        <H2 id="dl-engine">Engine mô phỏng</H2>
        <P>
          Iterative propagation tối đa 50 lần — xử lý cả feedback loop (SR latch).
          CLOCK auto-tick mỗi giây. Wire màu xanh lá khi HIGH, xám khi LOW.
        </P>

        <H2 id="dl-storage">Lưu trữ</H2>
        <Ul>
          <li>Auto-save localStorage mỗi khi mạch thay đổi.</li>
          <li>Export <Code>.json</Code> để chia sẻ mạch.</li>
          <li>Import <Code>.json</Code> để load mạch người khác.</li>
          <li>Clear All có confirm prompt.</li>
        </Ul>

        <Callout kind="tip">
          Bắt đầu với mẫu <strong>XOR cơ bản</strong> để hiểu cơ chế nối dây. Sau đó thử
          <strong> Half Adder</strong> để học cách build mạch tính toán. Cuối cùng thử
          <strong> SR Latch</strong> — đây là bước nhảy vọt vì có feedback loop.
        </Callout>
      </>
    ),
  },
]

// ── Helper to query articles ──────────────────────────────────────────────

export function getArticleBySlug(slug: string): DocArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}

export function getArticlesByCategory(category: DocCategory): DocArticle[] {
  return ARTICLES.filter((a) => a.category === category)
}

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  'getting-started': 'Bắt đầu',
  'student':         'Dành cho học sinh',
  'teacher':         'Dành cho giáo viên',
  'ai':              'Công cụ AI',
  'payment':         'Thanh toán',
  'reference':       'Tham khảo',
}

export const CATEGORY_ORDER: DocCategory[] = [
  'getting-started',
  'student',
  'teacher',
  'ai',
  'payment',
  'reference',
]
