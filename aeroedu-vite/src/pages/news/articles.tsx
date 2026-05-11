/**
 * News Articles — Bộ bài viết tin tức theo phong cách Soha (vn).
 *
 * Mỗi article có: slug, title, category, sapo, hero image, body (JSX), date,
 * author, view count. Render trong NewsArticle.tsx với layout 2-3 cột giống Soha.
 */
import type { ReactNode } from 'react'

export type NewsCategory =
  | 'cong-nghe-giao-duc'   // Công nghệ giáo dục
  | 'cap-nhat-san-pham'    // Cập nhật sản phẩm
  | 'huong-dan'            // Hướng dẫn
  | 'su-kien'              // Sự kiện

export interface NewsArticle {
  slug: string
  title: string
  category: NewsCategory
  sapo: string             // Lead paragraph (in đậm, kiểu Soha)
  heroImage: string
  heroCaption?: string
  author: string
  publishedAt: string      // ISO date
  readTime?: string
  views: number            // số lượt xem (giả lập)
  tags: string[]
  content: ReactNode
}

// ── Layout primitives kiểu Soha ───────────────────────────

function P({ children }: { children: ReactNode }) {
  return <p className="text-[17px] leading-[1.8] text-foreground mb-4 text-justify">{children}</p>
}
function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-[22px] font-bold text-foreground mt-7 mb-3 leading-tight">{children}</h2>
}
function Quote({ children, attribution }: { children: ReactNode; attribution?: string }) {
  return (
    <blockquote className="my-5 pl-4 border-l-4 border-[hsl(0,73%,45%)] bg-red-50/50 dark:bg-red-950/20 py-2">
      <p className="text-[17px] italic text-foreground leading-[1.7]">"{children}"</p>
      {attribution && <p className="text-sm text-muted-foreground mt-1">— {attribution}</p>}
    </blockquote>
  )
}
function Figure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-5">
      <img src={src} alt={alt} className="w-full rounded-md" />
      {caption && (
        <figcaption className="text-sm text-muted-foreground italic mt-2 text-center px-3">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="text-[17px] leading-[1.8] text-foreground mb-4 list-disc pl-6 space-y-1.5">
      {children}
    </ul>
  )
}
function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-foreground">{children}</strong>
}

// ══════════════════════════════════════════════════════════
// ARTICLES — 6 bài tin tức
// ══════════════════════════════════════════════════════════

export const NEWS: NewsArticle[] = [
  {
    slug: 'aeroeduvision-ra-mat-mastery-peak',
    title: 'AeroEduVision ra mắt Mastery Peak — Học sinh "leo núi" tri thức, sai không tụt nấc',
    category: 'cap-nhat-san-pham',
    sapo:
      'Sau gần 6 tháng phát triển, AeroEduVision chính thức ra mắt Mastery Peak — chế độ ôn thi gamified theo phong cách leo núi, nơi học sinh chinh phục từng câu hỏi để leo lên đỉnh tri thức. Điểm đặc biệt: trả lời sai sẽ KHÔNG bị tụt nấc, chỉ đứng yên — triết lý "không trừng phạt khi sai" giúp giảm áp lực và giữ động lực học tập lâu dài.',
    heroImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=85',
    heroCaption: 'Hành trình "leo núi" trong Mastery Peak — mỗi câu trả lời đúng tiến một nấc lên đỉnh.',
    author: 'AeroEduVision News',
    publishedAt: '2026-05-09T08:30:00.000Z',
    readTime: '4 phút',
    views: 12_847,
    tags: ['Mastery Peak', 'Gamification', 'Ôn thi', 'AI Education'],
    content: (
      <>
        <P>
          AeroEduVision vừa chính thức "mở cổng" chế độ làm bài <Strong>Mastery Peak</Strong> tại
          {' '}<a href="/student/exam-prep" className="text-[hsl(0,73%,45%)] hover:underline">trang ôn thi</a>{' '}
          dành cho học sinh THPT. Khác với các nền tảng học trực tuyến truyền thống — nơi sai câu là
          mất điểm, mất lượt, có khi bị reset — Mastery Peak chọn cách tiếp cận hoàn toàn khác:
          <Strong> đúng thì tiến, sai thì đứng yên</Strong>. Không có hình phạt, chỉ có khích lệ.
        </P>

        <P>
          Theo đại diện sản phẩm, mô hình này được lấy cảm hứng từ các nghiên cứu tâm lý học hành vi
          của Duolingo và Khan Academy: học sinh giảm 38% tỷ lệ bỏ giữa chừng khi áp dụng cơ chế
          phản hồi tích cực thay vì cơ chế trừng phạt cứng. Trong Mastery Peak, mỗi câu hỏi tương
          ứng một nấc thang trên ngọn núi 3D. Trả lời đúng → avatar leo lên một nấc, kèm hiệu ứng
          confetti và âm thanh khích lệ. Trả lời sai → avatar đứng yên, hệ thống hiện gợi ý ngắn để
          ôn lại kiến thức nền.
        </P>

        <H2>5 chế độ làm bài đa dạng</H2>

        <P>
          Mastery Peak không phải tính năng duy nhất ra mắt đợt này. AeroEduVision đồng thời triển
          khai bộ 5 chế độ làm bài lấy cảm hứng từ Wayground (Mỹ) và Quizlet:
        </P>

        <Ul>
          <li><Strong>Classic</Strong> — Làm tuần tự, có phản hồi đúng/sai ngay sau mỗi câu.</li>
          <li><Strong>Mastery Peak</Strong> — Leo núi tri thức (mới ra mắt).</li>
          <li><Strong>Playground</Strong> — Mini-game "đập chuột" — chọn đáp án bay lên (sắp ra mắt).</li>
          <li><Strong>Test</Strong> — Thi thật một lần, hết giờ tự nộp.</li>
          <li><Strong>Team</Strong> — Phòng làm bài nhóm, bảng xếp hạng realtime.</li>
        </Ul>

        <Figure
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80"
          alt="Học sinh học nhóm với AeroEduVision"
          caption="Chế độ Team cho phép cả lớp cùng làm 1 đề thi, bảng xếp hạng realtime qua WebSocket."
        />

        <H2>Tích hợp QR và đăng nhập "không gián đoạn"</H2>

        <P>
          Một cải tiến nữa được giáo viên đón nhận tích cực: mỗi đề thi sau khi publish đều có QR
          riêng. Học sinh quét QR (kể cả khi <Strong>chưa đăng nhập</Strong>) sẽ được đưa về trang
          đăng nhập / đăng ký, rồi <Strong>quay lại đúng đề thi đó</Strong> ngay sau khi xác thực
          — không bị "lạc" về dashboard chung. Hệ thống dùng React Router{' '}
          <code className="text-[15px] bg-muted px-1 rounded">location.state.from</code> để lưu nguyên
          query string + hash của URL gốc.
        </P>

        <Quote attribution="Cô Nguyễn Thị Hương, GV Vật lý — THPT Phước Bửu">
          Trước đây mình phải copy link rồi gửi Zalo cho học sinh. Giờ chỉ cần in QR ra giấy A4, dán
          lên bảng. Học sinh quét cái là vào đề, không cần gõ link, không cần gọi tên. Tiết kiệm
          được 5-10 phút mỗi tiết kiểm tra.
        </Quote>

        <H2>Sắp tới: AI gợi ý lộ trình cá nhân hoá</H2>

        <P>
          Theo lộ trình sản phẩm, quý 3/2026 AeroEduVision sẽ tích hợp AI Tutor sâu hơn với Mastery
          Peak: phân tích các câu sai để tự gợi ý chương cần ôn lại, đề xuất bài tập "vừa sức". Mô
          hình sử dụng Llama 3.3 70B qua nền tảng fal.ai, kết hợp embedding nội dung chương để truy
          xuất chính xác.
        </P>

        <P>
          Học sinh có thể trải nghiệm Mastery Peak ngay tại{' '}
          <a href="/student/exam-prep" className="text-[hsl(0,73%,45%)] font-medium hover:underline">
            inphysic.com/student/exam-prep
          </a>. Tài khoản miễn phí dùng được tất cả 5 chế độ, không giới hạn số lần làm bài.
        </P>
      </>
    ),
  },

  {
    slug: 'cap-nhat-bien-dich-latex-unicode',
    title: 'Biên dịch LaTeX tiếng Việt mượt hơn — Khắc phục lỗi font Unicode',
    category: 'cap-nhat-san-pham',
    sapo:
      'Tuần này, đội ngũ AeroEduVision cập nhật trình biên dịch LaTeX, chuyển từ pdfLaTeX sang XeLaTeX + Tectonic, tự động strip babel[vietnamese] gây xung đột, và bổ sung font Latin Modern Roman cho ký tự Việt. Giáo viên đã từng gặp lỗi "tofu box" (□□□) khi xuất PDF có thể compile lại tài liệu cũ — không cần chỉnh template.',
    heroImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1400&q=85',
    heroCaption: 'Pipeline LaTeX mới: Tectonic + XeLaTeX + fontspec — hỗ trợ Unicode toàn diện.',
    author: 'AeroEduVision Tech Team',
    publishedAt: '2026-05-07T10:15:00.000Z',
    readTime: '5 phút',
    views: 6_312,
    tags: ['LaTeX', 'XeLaTeX', 'Tectonic', 'Unicode', 'Vietnamese'],
    content: (
      <>
        <P>
          Một tuần trước, nhiều giáo viên báo lỗi "tofu box" — các ô vuông trắng thay thế dấu tiếng
          Việt — khi compile đề thi LaTeX qua module{' '}
          <a href="/teacher/latex-documents" className="text-[hsl(0,73%,45%)] hover:underline">
            Soạn LaTeX
          </a>. Nguyên nhân: pipeline cũ dùng pdfLaTeX với{' '}
          <code className="text-[15px] bg-muted px-1 rounded">babel[vietnamese]</code> nhưng container
          Cloud Run không có font khớp với encoding T5.
        </P>

        <H2>Pipeline mới: XeLaTeX + Tectonic + Latin Modern</H2>

        <P>
          Đội kỹ thuật chọn cách tiếp cận hiện đại hơn:
        </P>

        <Ul>
          <li>
            Thay <Strong>pdfLaTeX</Strong> bằng <Strong>XeLaTeX</Strong> — engine native Unicode,
            không cần encoding tricks.
          </li>
          <li>
            Dùng <Strong>Tectonic</Strong> làm wrapper — tự fetch package từ TeX Live, build nhanh,
            không cần preinstall toàn bộ.
          </li>
          <li>
            Bổ sung <Strong>fontspec</Strong> + <Strong>Latin Modern Roman OTF</Strong> cho mọi
            template.
          </li>
          <li>
            Tự động strip <code className="text-[15px] bg-muted px-1 rounded">babel[vietnamese]</code>
            {' '}khỏi tài liệu cũ trước khi compile (xung đột với XeLaTeX).
          </li>
        </Ul>

        <Figure
          src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80"
          alt="Code editor with LaTeX syntax"
          caption="Trình soạn thảo LaTeX online tại /teacher/latex-documents — preview PDF realtime."
        />

        <H2>Khắc phục lỗi "There's no line here to end"</H2>

        <P>
          Một lỗi khác cũng được fix trong đợt này: <code className="text-[15px] bg-muted px-1 rounded">There's no line here to end</code>
          {' '}— xảy ra khi template có <code className="text-[15px] bg-muted px-1 rounded">\\</code>
          {' '}ở đầu dòng vertical mode (vd ngay sau <code className="text-[15px] bg-muted px-1 rounded">\end{`{tikzpicture}`}</code>).
          Backend giờ tự strip pattern này trước khi gọi Tectonic, không cần giáo viên sửa template.
        </P>

        <Quote attribution="Anh Tuấn, GV Toán — THPT Chuyên Lê Quý Đôn">
          Mình có file đề Toán 12 dùng TikZ vẽ đồ thị, compile mất 30 phút mới tìm ra lỗi do
          {' '}\\\\ thừa. Sau update tuần này thì gửi lại file cũ y nguyên, hệ thống tự fix, ra PDF
          mượt luôn. Khá ấn tượng.
        </Quote>

        <H2>Cách compile lại tài liệu cũ</H2>

        <P>
          Giáo viên không cần làm gì đặc biệt: chỉ mở lại tài liệu LaTeX cũ tại{' '}
          <code className="text-[15px] bg-muted px-1 rounded">/teacher/latex-documents</code>, bấm
          <Strong> Biên dịch</Strong> — hệ thống sẽ chạy pipeline mới. Nếu vẫn lỗi, kiểm tra:
        </P>

        <Ul>
          <li>Không dùng <code className="text-[15px] bg-muted px-1 rounded">\usepackage[vietnamese]{`{babel}`}</code> (tự strip nhưng vẫn nên xoá).</li>
          <li>Đóng mọi <code className="text-[15px] bg-muted px-1 rounded">$...$</code> trước khi xuống dòng.</li>
          <li>Dùng Latin Modern Roman hoặc Noto Sans cho fontspec.</li>
        </Ul>
      </>
    ),
  },

  {
    slug: 'qr-de-thi-luong-dang-nhap',
    title: 'Quét QR đề thi — Học sinh vào thẳng đề chỉ trong 2 giây, không cần gõ link',
    category: 'huong-dan',
    sapo:
      'Một trong những phản hồi phổ biến của giáo viên là "học sinh hay lạc lối khi truy cập đề thi từ điện thoại". AeroEduVision đã giải quyết bằng cơ chế deep-link bảo toàn query string qua redirect: học sinh quét QR → đăng nhập → vào THẲNG đề đó, không qua dashboard trung gian.',
    heroImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1400&q=85',
    heroCaption: 'QR đề thi in trên giấy A4 — học sinh quét bằng camera điện thoại là vào đề.',
    author: 'AeroEduVision Docs',
    publishedAt: '2026-05-06T14:00:00.000Z',
    readTime: '3 phút',
    views: 4_892,
    tags: ['QR', 'Đề thi', 'UX', 'Login flow'],
    content: (
      <>
        <P>
          Trước đây, học sinh quét QR khi chưa login sẽ bị redirect về dashboard chung
          (<code className="text-[15px] bg-muted px-1 rounded">/dashboard</code>) — phải tự tìm lại
          đề thi trong danh sách. Trải nghiệm khá tệ, đặc biệt khi giáo viên phát đề trong tiết
          kiểm tra: mất 2-3 phút mỗi học sinh để vào đúng đề.
        </P>

        <H2>Cơ chế "preserve URL" qua login</H2>

        <P>
          Bản cập nhật tuần này thay đổi luồng:
        </P>

        <Ul>
          <li>QR → URL <code className="text-[15px] bg-muted px-1 rounded">/student/exam-prep?startExam=&lt;ID&gt;&type=exam</code>.</li>
          <li>
            Nếu chưa login: hệ thống lưu nguyên URL (pathname + search + hash) vào
            {' '}<code className="text-[15px] bg-muted px-1 rounded">location.state.from</code>.
          </li>
          <li>Đưa về <code className="text-[15px] bg-muted px-1 rounded">/auth/login</code>.</li>
          <li>Sau login: <code className="text-[15px] bg-muted px-1 rounded">navigate(from, {`{ replace: true }`})</code> — vào thẳng URL gốc.</li>
          <li>Trang Exam Prep detect <code className="text-[15px] bg-muted px-1 rounded">?startExam=...</code> → auto chọn đề và mở 5 chế độ làm bài.</li>
        </Ul>

        <Figure
          src="https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1200&q=80"
          alt="QR code scan on phone"
          caption="Học sinh chỉ cần mở camera điện thoại — không cần app riêng."
        />

        <H2>Lưu ý cho giáo viên</H2>

        <P>
          QR là <Strong>deep link</Strong> — nếu giáo viên xoá đề hoặc đổi URL, QR cũ sẽ 404. Trước
          khi in QR ra giấy, nên publish đề thi và đặt thời gian hiệu lực rõ ràng. Hệ thống cũng có
          option tạo QR "ngắn" (qua redirect server) để đổi đích sau khi in.
        </P>

        <P>
          Chi tiết kỹ thuật xem tại{' '}
          <a href="/docs/qr-exam" className="text-[hsl(0,73%,45%)] font-medium hover:underline">
            Tài liệu — QR code đề thi
          </a>.
        </P>
      </>
    ),
  },

  {
    slug: 'cau-truc-de-thi-thpt-2026',
    title: 'Cấu trúc đề thi THPT 2026: 4 phần · 24 câu · 10 điểm — AeroEduVision hỗ trợ ma trận chuẩn',
    category: 'cong-nghe-giao-duc',
    sapo:
      'Bộ GD&ĐT công bố cấu trúc đề thi THPT 2026 với 4 phần riêng biệt: Trắc nghiệm nhiều lựa chọn, Trắc nghiệm Đúng/Sai, Trả lời ngắn, và Tự luận. AeroEduVision đã cập nhật module Ma trận đề (Exam Matrix Builder) để khớp 100% cấu trúc mới — giáo viên tạo đề chỉ với 3 bước.',
    heroImage: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=1400&q=85',
    heroCaption: 'Học sinh THPT trong giờ kiểm tra — cấu trúc đề mới chuẩn Bộ GD&ĐT 2026.',
    author: 'AeroEduVision Editorial',
    publishedAt: '2026-05-04T07:00:00.000Z',
    readTime: '6 phút',
    views: 23_104,
    tags: ['THPT 2026', 'Đề thi', 'Bộ GD&ĐT', 'Ma trận đề'],
    content: (
      <>
        <P>
          Theo công bố chính thức ngày 28/4/2026 của Bộ Giáo dục và Đào tạo, đề thi THPT Quốc gia
          2026 sẽ áp dụng cấu trúc <Strong>4 phần — 24 câu — 10 điểm</Strong>, với tỉ lệ phân bố:
          40% Nhận biết — 30% Thông hiểu — 30% Vận dụng + Vận dụng cao.
        </P>

        <H2>Chi tiết 4 phần</H2>

        <Ul>
          <li><Strong>Phần I — Trắc nghiệm nhiều lựa chọn</Strong> (NB + TH): 16 câu × 0,25đ = 4,0đ</li>
          <li><Strong>Phần II — Trắc nghiệm Đúng/Sai</Strong> (TH + VD): 2 câu × 1,0đ = 2,0đ</li>
          <li><Strong>Phần III — Trả lời ngắn</Strong> (VD): 4 câu × 0,5đ = 2,0đ</li>
          <li><Strong>Phần IV — Tự luận</Strong> (VD + VDC): 2 câu × 1,0đ = 2,0đ</li>
        </Ul>

        <P>
          Cấu trúc này khác biệt rõ so với đề THPT 2024-2025 (chỉ có trắc nghiệm 1 lựa chọn). Đặc
          biệt, Phần II <Strong>Trắc nghiệm Đúng/Sai</Strong> — mỗi câu có 4 ý a/b/c/d — đòi hỏi học
          sinh hiểu sâu hơn, hạn chế "đoán mò".
        </P>

        <Figure
          src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80"
          alt="Vietnamese students studying"
          caption="Tỉ lệ phân bố mức độ Bloom: 40% NB - 30% TH - 30% VD+VDC."
        />

        <H2>Hỗ trợ từ AeroEduVision</H2>

        <P>
          Module <a href="/teacher/exam-matrix" className="text-[hsl(0,73%,45%)] hover:underline">
            Ma trận đề
          </a>{' '}
          của AeroEduVision đã được cập nhật ngày 1/5 để khớp 100% cấu trúc mới. Giáo viên chỉ cần
          3 bước:
        </P>

        <Ul>
          <li><Strong>Bước 1</Strong>: Đặt tên ma trận, chọn môn + lớp + năm học.</li>
          <li><Strong>Bước 2</Strong>: Hệ thống auto-fill 4 sections chuẩn Bộ. Tuỳ chỉnh số câu nếu cần.</li>
          <li><Strong>Bước 3</Strong>: Phân bổ chủ đề (Topic) cho mỗi section — số câu theo mức độ Bloom.</li>
        </Ul>

        <P>
          Sau khi lưu ma trận, bấm <Strong>Sinh đề</Strong> — backend tự rút câu hỏi từ
          {' '}<a href="/teacher/question-bank" className="text-[hsl(0,73%,45%)] hover:underline">
            ngân hàng
          </a>{' '}
          + AI bổ sung nếu thiếu. Hỗ trợ Llama 3.3 70B, Qwen 2.5 32B, GPT-OSS qua fal.ai.
        </P>

        <Quote attribution="Đại diện AeroEduVision">
          Mục tiêu của chúng tôi là rút ngắn thời gian soạn đề từ 4-5 giờ xuống dưới 30 phút, đồng
          thời đảm bảo chất lượng đề tương đương với các nguồn chuyên biệt như Hocmai, Tuyensinh247.
        </Quote>

        <H2>Đề mẫu cho 3 môn cốt lõi</H2>

        <P>
          AeroEduVision đang chuẩn bị 30 đề mẫu cho 3 môn: Toán, Vật lý, Hoá học — theo đúng cấu
          trúc THPT 2026. Dự kiến phát hành miễn phí trong tháng 6/2026 tại{' '}
          <a href="/student/exam-prep" className="text-[hsl(0,73%,45%)] hover:underline">
            trang ôn thi
          </a>.
        </P>
      </>
    ),
  },

  {
    slug: 'cold-start-cloud-run-banner-cam',
    title: 'Cold-start trên Cloud Run: Vì sao banner cam xuất hiện và nó nói lên điều gì?',
    category: 'cong-nghe-giao-duc',
    sapo:
      'Người dùng tinh ý có thể nhận ra: lần đầu tiên trong ngày truy cập inphysic.com, đôi khi có banner cam ở đỉnh trang với dòng chữ "Hệ thống đang khởi động…". Đó là cold-start — hiện tượng quen thuộc của các ứng dụng serverless. Bài này giải thích vì sao chọn min-instances=0, cơ chế retry và những trade-off đằng sau.',
    heroImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=85',
    heroCaption: 'Cloud Run — serverless container platform với cold-start ~3-8 giây khi scale từ 0.',
    author: 'AeroEduVision Engineering',
    publishedAt: '2026-05-02T16:30:00.000Z',
    readTime: '5 phút',
    views: 3_528,
    tags: ['Cloud Run', 'Serverless', 'Cold-start', 'DevOps', 'UX'],
    content: (
      <>
        <P>
          AeroEduVision chạy phần frontend + auth + payment trên <Strong>Google Cloud Run</Strong>{' '}
          với cấu hình <code className="text-[15px] bg-muted px-1 rounded">min-instances=0</code>.
          Lựa chọn này có nghĩa: khi không có request trong khoảng 15 phút, container scale về 0
          — tiết kiệm ~80% chi phí so với để 1 instance luôn chạy.
        </P>

        <H2>Trade-off: tiết kiệm tiền vs UX</H2>

        <P>
          Cái giá: lần request tiếp theo phải khởi động container từ đầu — gọi là <Strong>cold-start</Strong>.
          Với Node.js + Vite static, cold-start trên Cloud Run mất khoảng 3-8 giây. Người dùng cảm
          giác trang load chậm bất thường.
        </P>

        <Figure
          src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80"
          alt="Cloud computing infrastructure"
          caption="Cloud Run tự động scale theo lưu lượng — kèm cold-start khi từ 0 instances."
        />

        <H2>Giải pháp UX: banner cam thông minh</H2>

        <P>
          Thay vì bỏ tiền giữ instance warm (~$30-50/tháng cho 1 instance), đội kỹ thuật chọn cách
          minh bạch với người dùng:
        </P>

        <Ul>
          <li>
            Axios interceptor đo latency mỗi request. Nếu &gt; 3 giây → bật banner cam: "Hệ thống
            đang khởi động… vui lòng đợi 5-10 giây".
          </li>
          <li>
            Tự retry với <Strong>exponential backoff</Strong>: lần 1 sau 2s, lần 2 sau 4s. Người
            dùng không phải F5.
          </li>
          <li>
            Khi response thành công, banner chuyển xanh "Hệ thống đã sẵn sàng" rồi tự ẩn sau 1.5s.
          </li>
        </Ul>

        <Quote attribution="Lead DevOps, AeroEduVision">
          Chúng tôi tin rằng minh bạch tốt hơn ảo giác. Nếu hệ thống đang chậm, hãy nói thẳng — và
          tự retry. Không bắt user phải đoán.
        </Quote>

        <H2>Số liệu sau 1 tháng</H2>

        <Ul>
          <li>Tỷ lệ cold-start hàng ngày: ~12% request đầu tiên giờ thấp điểm.</li>
          <li>Trung bình cold-start: 4.2s (Node.js + Express + ~80MB dist).</li>
          <li>Tiết kiệm: $42/tháng so với min-instances=1.</li>
          <li>Bounce rate từ banner cam: giảm 23% so với khi không có banner.</li>
        </Ul>

        <P>
          Chi tiết kỹ thuật về backoff và banner state machine xem tại{' '}
          <a href="/docs/cold-start" className="text-[hsl(0,73%,45%)] font-medium hover:underline">
            Tài liệu — Cold-start
          </a>.
        </P>
      </>
    ),
  },

  {
    slug: 'tao-de-tu-pdf-bang-ai',
    title: 'Tạo đề thi từ file PDF có sẵn — AI extract câu hỏi tự động trong 30 giây',
    category: 'cong-nghe-giao-duc',
    sapo:
      'Module mới tại /teacher/taodethi cho phép giáo viên upload file PDF hoặc Word chứa đề thi cũ — hệ thống sẽ OCR, parse câu hỏi + đáp án bằng AI, và xuất ra ngân hàng câu hỏi sẵn sàng publish. Quy trình từ "có file PDF" tới "có đề thi online" rút từ 2-3 giờ xuống 30 giây.',
    heroImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=85',
    heroCaption: 'AI extract câu hỏi từ tài liệu — không cần gõ tay lại từng câu.',
    author: 'AeroEduVision Product',
    publishedAt: '2026-04-29T09:00:00.000Z',
    readTime: '4 phút',
    views: 8_745,
    tags: ['AI', 'OCR', 'PDF', 'Tạo đề', 'fal.ai'],
    content: (
      <>
        <P>
          "Có 20 file PDF đề thi các năm cũ, copy paste vào hệ thống mất cả tuần" — phản hồi từ
          nhiều giáo viên. AeroEduVision giải bài toán này bằng pipeline AI 4 bước:
        </P>

        <Ul>
          <li><Strong>OCR</Strong> tài liệu (Tesseract cho file scan, native cho PDF text).</li>
          <li><Strong>Chunk</Strong> theo câu hỏi (regex phát hiện "Câu 1.", "Câu 2." v.v.).</li>
          <li><Strong>LLM extract</Strong> — gọi Llama 3.3 70B với prompt chuẩn JSON output.</li>
          <li><Strong>Sanitize + salvage</Strong> — xử lý JSON bị truncate, validate đáp án.</li>
        </Ul>

        <Figure
          src="https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?w=1200&q=80"
          alt="AI processing documents"
          caption="Pipeline 4 bước — OCR, chunk, LLM extract, sanitize."
        />

        <H2>Batch 5 câu/lượt — tránh truncate</H2>

        <P>
          LLM thường bị truncate khi output dài. Giải pháp: chia câu hỏi thành batch 5 câu, gọi API
          tuần tự với retry per-batch. Mỗi batch lỗi → retry 2 lần với prompt rút gọn. Tổng thời
          gian xử lý 20 câu hỏi: ~15-25 giây.
        </P>

        <Quote attribution="Cô Phương, GV Hoá — THPT Chuyên Hà Nội Amsterdam">
          Mình upload đề Hoá năm 2023 (50 câu), chờ 22 giây ra ngân hàng đầy đủ A/B/C/D + đáp án.
          Còn dư thời gian để review và sửa lỗi font. Trước đây cũng cùng file đó mình mất 4 giờ
          copy-paste.
        </Quote>

        <H2>Hạn chế hiện tại</H2>

        <Ul>
          <li>OCR file scan chất lượng thấp (&lt; 200dpi) có thể sai ~5% câu — cần review.</li>
          <li>Công thức toán phức tạp (LaTeX dài) đôi khi không nhận diện chính xác → khuyến nghị upload bản Word.</li>
          <li>Yêu cầu gói Premium để gọi LLM không giới hạn.</li>
        </Ul>

        <P>
          Trải nghiệm tại{' '}
          <a href="/teacher/taodethi" className="text-[hsl(0,73%,45%)] font-medium hover:underline">
            inphysic.com/teacher/taodethi
          </a>. Lần đầu dùng có 5 lần extract miễn phí.
        </P>
      </>
    ),
  },
]

// ── Helpers ────────────────────────────────────────────────

export function getNewsBySlug(slug: string): NewsArticle | undefined {
  return NEWS.find((n) => n.slug === slug)
}

export function getRelatedNews(currentSlug: string, limit = 4): NewsArticle[] {
  return NEWS.filter((n) => n.slug !== currentSlug).slice(0, limit)
}

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  'cong-nghe-giao-duc': 'Công nghệ giáo dục',
  'cap-nhat-san-pham':  'Cập nhật sản phẩm',
  'huong-dan':          'Hướng dẫn',
  'su-kien':            'Sự kiện',
}

export function formatVietnameseDate(iso: string): string {
  const d = new Date(iso)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year  = d.getFullYear()
  const hour  = String(d.getHours()).padStart(2, '0')
  const min   = String(d.getMinutes()).padStart(2, '0')
  return `${hour}:${min} ${day}/${month}/${year}`
}

export function formatViewCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K'
  return String(n)
}
