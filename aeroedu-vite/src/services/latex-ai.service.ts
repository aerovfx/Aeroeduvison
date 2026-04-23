/**
 * LaTeX AI Generator Service
 * ──────────────────────────
 * Sinh đề thi dưới định dạng LaTeX sẵn-biên-dịch cho trang
 * /teacher/latex-documents. Ưu tiên gọi backend `/api/latex-projects/ai-generate`
 * (nếu đã tích hợp Gemini/OpenAI/Claude). Nếu backend chưa sẵn sàng, fallback
 * sang trình sinh LaTeX cục bộ dùng ngân hàng câu hỏi mẫu — vẫn trả về tài liệu
 * hoàn chỉnh, không để giáo viên "trắng tay".
 *
 * Thiết kế:
 *   - Input: ExamConfig (môn, khối, chủ đề, số câu theo độ khó, thời gian)
 *   - Output: string LaTeX sẵn để paste vào editor + biên dịch ra PDF
 *   - Fallback tạo file cho mọi môn phổ thông để không bị lỗi
 */

// ── Types ────────────────────────────────────────────────────
export type ExamSubject =
  | 'Toán'
  | 'Vật lý'
  | 'Hoá học'
  | 'Sinh học'
  | 'Ngữ văn'
  | 'Tiếng Anh'
  | 'Lịch sử'
  | 'Địa lý'
  | 'GDCD'
  | 'Tin học'

export type ExamFormat =
  /**
   * Định dạng **chuẩn Bộ GD&ĐT 2025** — chương trình GDPT 2018.
   * Gồm 4 phần, tổng 10 điểm:
   *   · Phần I. TRẮC NGHIỆM NHIỀU LỰA CHỌN (4,0đ) — 16 câu, 0,25đ/câu
   *   · Phần II. TRẮC NGHIỆM ĐÚNG/SAI (2,0đ) — 2 câu, mỗi câu 4 ý a-d
   *   · Phần III. TRẢ LỜI NGẮN (2,0đ) — 4 câu, 0,5đ/câu
   *   · Phần IV. TỰ LUẬN (2,0đ) — 2 câu, mỗi câu 1,0đ (có ý a, b)
   * Có header 2 cột (trường - thông tin đề), khung "Mã đề", đánh số trang,
   * kết thúc bằng "— HẾT —" căn giữa.
   */
  | 'bgd-2025'
  | 'mcq-only'          // 100% trắc nghiệm 4 lựa chọn
  | 'mcq-tf-essay'      // Phần I TN 4 lựa chọn · Phần II Đúng/Sai · Phần III Tự luận
  | 'tn-tl'             // Phần I TN · Phần II Tự luận
  | 'full-essay'        // Hoàn toàn tự luận

export interface DifficultyBreakdown {
  /** Nhận biết (dễ) — NB */
  easy: number
  /** Thông hiểu (trung bình) — TH */
  medium: number
  /** Vận dụng (khó) — VD */
  hard: number
  /** Vận dụng cao — VDC, optional */
  veryHard?: number
}

export interface ExamConfig {
  subject: ExamSubject
  /** Khối 6..12 */
  grade: number
  /** Chủ đề cụ thể, ví dụ "Dao động điều hoà", "Phương trình bậc hai". */
  topics: string[]
  /** Thời gian làm bài (phút) */
  duration: number
  /** Định dạng đề */
  format: ExamFormat
  /** Phân bổ câu hỏi theo độ khó */
  difficulty: DifficultyBreakdown
  /** Tổng điểm, mặc định 10 */
  totalPoints?: number
  /** Tiêu đề tuỳ biến (VD "Đề kiểm tra giữa học kỳ I") */
  title?: string
  /** Tên trường/lớp để in header */
  schoolName?: string
  /** Tên sở GD&ĐT (dòng trên cùng) — VD "SỞ GD ĐT TP. HỒ CHÍ MINH" */
  departmentName?: string
  /** Dòng cuối của khối header trái (VD "ĐỀ THI MINH HỌA SỐ 2") */
  examLabel?: string
  /** Mã đề (VD "456"); không truyền → tự random 3 chữ số */
  examCode?: string
  /** Năm học (VD "2025 – 2026"). Không truyền → tự derive từ năm hiện tại */
  schoolYear?: string
  /** Kỳ thi (VD "KIỂM TRA CUỐI HỌC KỲ II"). */
  examSession?: string
  /** Tên giáo viên soạn đề */
  authorName?: string
  /** Có xuất kèm đáp án không */
  includeAnswerKey?: boolean
  /** Ghi chú đặc biệt (VD "Học sinh không được sử dụng máy tính") */
  notes?: string
}

export interface GenerateResult {
  latex: string
  /** Nguồn sinh: 'ai' nếu backend OK, 'local' nếu dùng fallback */
  source: 'ai' | 'local'
  /** Tổng số câu hỏi đã sinh */
  totalQuestions: number
}

// ── Main API ─────────────────────────────────────────────────
import { api } from '@/services/api'

export const latexAiService = {
  generateExam: async (config: ExamConfig): Promise<GenerateResult> => {
    // 1) Thử gọi backend AI (dùng axios instance có Bearer token)
    try {
      const { data } = await api.post<{ latex?: string; totalQuestions?: number }>(
        '/latex-projects/ai-generate',
        config,
      )
      if (data.latex && typeof data.latex === 'string' && data.latex.trim()) {
        return {
          latex: data.latex,
          source: 'ai',
          totalQuestions: data.totalQuestions ?? computeTotal(config.difficulty),
        }
      }
    } catch {
      /* fall through to local generator */
    }
    // 2) Fallback cục bộ
    const latex = buildExamLatexLocally(config)
    return {
      latex,
      source: 'local',
      totalQuestions: computeTotal(config.difficulty),
    }
  },
}

function computeTotal(d: DifficultyBreakdown): number {
  return (d.easy || 0) + (d.medium || 0) + (d.hard || 0) + (d.veryHard || 0)
}

// ══════════════════════════════════════════════════════════════
// Local LaTeX generator — sinh đề hoàn chỉnh dùng ngân hàng câu mẫu.
// Backend có thể chưa tích hợp AI, nhưng giáo viên vẫn có starter
// LaTeX hoàn chỉnh để chỉnh sửa rồi biên dịch ra PDF.
// ══════════════════════════════════════════════════════════════

/** Escape ký tự đặc biệt của LaTeX khi ghép chuỗi (TH câu hỏi tự do) */
function esc(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\~{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
}

/** Khung preamble chuẩn dùng Babel tiếng Việt + siunitx + enumitem */
function preamble(): string {
  return [
    '\\documentclass[12pt,a4paper]{article}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage[vietnamese]{babel}',
    '\\usepackage{amsmath,amssymb}',
    '\\usepackage{geometry}',
    '\\usepackage{enumitem}',
    '\\usepackage{siunitx}',
    '\\usepackage{xcolor}',
    '\\usepackage{tabularx}',
    '\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}',
    '\\setlength{\\parindent}{0pt}',
    '\\setlength{\\parskip}{6pt}',
  ].join('\n')
}

/** Phần header đề thi: tên trường, tên môn, thời gian, họ tên... */
function headerBlock(c: ExamConfig): string {
  const title = esc(c.title ?? `ĐỀ KIỂM TRA MÔN ${c.subject.toUpperCase()} — KHỐI ${c.grade}`)
  const school = c.schoolName ? esc(c.schoolName) : ''
  const author = c.authorName ? esc(c.authorName) : ''
  const notes = c.notes ? esc(c.notes) : ''

  return [
    '\\begin{center}',
    school ? `  {\\small ${school}}\\\\[4pt]` : '',
    `  {\\Large\\bfseries ${title}}\\\\[6pt]`,
    `  {\\itshape Thời gian làm bài: ${c.duration} phút (không kể thời gian phát đề)}\\\\[2pt]`,
    author ? `  {\\small Giáo viên soạn: ${author}}\\\\[2pt]` : '',
    '\\end{center}',
    '\\vspace{6pt}',
    '\\noindent\\textbf{Họ và tên:} \\underline{\\hspace{5cm}} \\quad \\textbf{Lớp:} \\underline{\\hspace{2.5cm}} \\quad \\textbf{SBD:} \\underline{\\hspace{2.5cm}}',
    '',
    notes ? `\\noindent\\textit{Lưu ý:} ${notes}\\\\[4pt]` : '',
    '\\hrule',
    '\\vspace{10pt}',
  ]
    .filter(Boolean)
    .join('\n')
}

// ── Ngân hàng câu hỏi mẫu tối thiểu ─────────────────────────
interface SampleQ {
  q: string
  opts: [string, string, string, string]
  /** Index 0..3 là đáp án đúng */
  correct: number
  level: 'NB' | 'TH' | 'VD' | 'VDC'
}

const BANK: Partial<Record<ExamSubject, SampleQ[]>> = {
  'Vật lý': [
    { q: 'Đại lượng vật lí nào sau đây là đại lượng véc-tơ?', opts: ['Thời gian đi.', 'Quãng đường đi được.', 'Tốc độ trung bình.', 'Độ dịch chuyển.'], correct: 3, level: 'NB' },
    { q: 'Đơn vị đo độ dịch chuyển trong hệ SI là:', opts: ['Giây (s).', 'Kilômét trên giờ (km/h).', 'Mét trên giây (m/s).', 'Mét (m).'], correct: 3, level: 'NB' },
    { q: 'Phát biểu nào sau đây đúng về độ dịch chuyển?', opts: ['Độ dịch chuyển luôn lớn hơn quãng đường.', 'Độ dịch chuyển luôn bằng quãng đường.', 'Độ dịch chuyển phụ thuộc vào quỹ đạo.', 'Độ dịch chuyển là véc-tơ nối vị trí đầu và vị trí cuối.'], correct: 3, level: 'NB' },
    { q: 'Một vật chuyển động thẳng đều có phương trình $x = 5 + 2t$ (m). Tốc độ của vật bằng:', opts: ['$5$~m/s.', '$2$~m/s.', '$7$~m/s.', '$10$~m/s.'], correct: 1, level: 'TH' },
    { q: 'Gia tốc rơi tự do tại gần mặt đất thường được lấy xấp xỉ bằng:', opts: ['$1{,}0$~m/s$^2$.', '$9{,}8$~m/s$^2$.', '$15$~m/s$^2$.', '$0{,}98$~m/s$^2$.'], correct: 1, level: 'NB' },
    { q: 'Một ô tô tăng tốc từ $0$~m/s lên $20$~m/s trong $5$~s. Gia tốc trung bình bằng:', opts: ['$2$~m/s$^2$.', '$4$~m/s$^2$.', '$5$~m/s$^2$.', '$100$~m/s$^2$.'], correct: 1, level: 'TH' },
    { q: 'Công thức tính động năng của vật khối lượng $m$, vận tốc $v$ là:', opts: ['$\\tfrac{1}{2}mv^2$.', '$mv^2$.', '$mgh$.', '$mv$.'], correct: 0, level: 'NB' },
    { q: 'Một con lắc đơn có chiều dài $l = 1$~m, dao động tại nơi $g = 9{,}8$~m/s$^2$. Chu kì xấp xỉ:', opts: ['$0{,}50$~s.', '$1{,}0$~s.', '$2{,}0$~s.', '$6{,}28$~s.'], correct: 2, level: 'VD' },
    { q: 'Trong dao động điều hoà, đại lượng nào sau đây luôn hướng về vị trí cân bằng?', opts: ['Vận tốc.', 'Gia tốc.', 'Li độ.', 'Biên độ.'], correct: 1, level: 'TH' },
    { q: 'Định luật II Newton phát biểu: Gia tốc của một vật…', opts: ['Tỉ lệ nghịch với lực tác dụng.', 'Tỉ lệ thuận với khối lượng.', 'Tỉ lệ thuận với hợp lực và tỉ lệ nghịch với khối lượng.', 'Không phụ thuộc vào khối lượng.'], correct: 2, level: 'NB' },
    { q: 'Một vật nặng $2$~kg chịu lực kéo $10$~N theo phương ngang, bỏ qua ma sát. Gia tốc của vật là:', opts: ['$2$~m/s$^2$.', '$5$~m/s$^2$.', '$8$~m/s$^2$.', '$20$~m/s$^2$.'], correct: 1, level: 'TH' },
    { q: 'Một vật ném lên thẳng đứng với vận tốc đầu $20$~m/s, $g = 10$~m/s$^2$. Độ cao cực đại đạt được là:', opts: ['$10$~m.', '$20$~m.', '$40$~m.', '$400$~m.'], correct: 1, level: 'VD' },
  ],
  'Toán': [
    { q: 'Tập xác định của hàm số $y = \\sqrt{x-2}$ là:', opts: ['$[2;+\\infty)$.', '$(2;+\\infty)$.', '$(-\\infty;2]$.', '$(-\\infty;2)$.'], correct: 0, level: 'NB' },
    { q: 'Nghiệm của phương trình $2x - 4 = 0$ là:', opts: ['$x = -2$.', '$x = 0$.', '$x = 2$.', '$x = 4$.'], correct: 2, level: 'NB' },
    { q: 'Đạo hàm của hàm số $y = x^3$ là:', opts: ['$3x^2$.', '$x^2$.', '$3x$.', '$x^4/4$.'], correct: 0, level: 'NB' },
    { q: 'Giá trị nhỏ nhất của hàm số $y = x^2 - 4x + 5$ trên $\\mathbb{R}$ là:', opts: ['$1$.', '$2$.', '$4$.', '$5$.'], correct: 0, level: 'TH' },
    { q: 'Nghiệm của bất phương trình $x^2 - 3x + 2 \\leq 0$ là:', opts: ['$x \\in (1;2)$.', '$x \\in [1;2]$.', '$x \\in (-\\infty;1] \\cup [2;+\\infty)$.', '$x \\in \\mathbb{R}$.'], correct: 1, level: 'TH' },
    { q: 'Tích phân $\\int_0^1 2x\\,dx$ bằng:', opts: ['$0$.', '$1$.', '$2$.', '$\\tfrac{1}{2}$.'], correct: 1, level: 'TH' },
    { q: 'Số phức $z = 3 + 4i$ có mô-đun bằng:', opts: ['$5$.', '$7$.', '$\\sqrt{7}$.', '$25$.'], correct: 0, level: 'NB' },
    { q: 'Trong mặt phẳng $Oxy$, đường tròn $(x-1)^2 + (y+2)^2 = 9$ có tâm và bán kính:', opts: ['$I(1;-2)$, $R = 9$.', '$I(-1;2)$, $R = 3$.', '$I(1;-2)$, $R = 3$.', '$I(1;2)$, $R = 3$.'], correct: 2, level: 'TH' },
    { q: 'Dãy số $u_n = 2n - 1$ là cấp số cộng với công sai:', opts: ['$1$.', '$2$.', '$-1$.', '$n$.'], correct: 1, level: 'NB' },
    { q: 'Cho tam giác đều cạnh $a$. Diện tích tam giác là:', opts: ['$\\tfrac{a^2\\sqrt{3}}{4}$.', '$a^2$.', '$\\tfrac{a^2}{2}$.', '$a^2\\sqrt{2}$.'], correct: 0, level: 'NB' },
    { q: 'Giới hạn $\\lim\\limits_{x\\to 0} \\dfrac{\\sin x}{x}$ bằng:', opts: ['$0$.', '$1$.', '$\\infty$.', 'Không tồn tại.'], correct: 1, level: 'NB' },
    { q: 'Cho $\\log_2 x = 3$. Giá trị của $x$ là:', opts: ['$6$.', '$8$.', '$9$.', '$16$.'], correct: 1, level: 'TH' },
  ],
  'Hoá học': [
    { q: 'Nguyên tố có số hiệu nguyên tử $Z = 11$ là:', opts: ['Natri (Na).', 'Magie (Mg).', 'Nhôm (Al).', 'Silic (Si).'], correct: 0, level: 'NB' },
    { q: 'Liên kết trong phân tử $\\text{HCl}$ là liên kết:', opts: ['Ion.', 'Cộng hoá trị không cực.', 'Cộng hoá trị có cực.', 'Kim loại.'], correct: 2, level: 'NB' },
    { q: 'Số oxi hoá của S trong $\\text{H}_2\\text{SO}_4$ là:', opts: ['$+2$.', '$+4$.', '$+6$.', '$-2$.'], correct: 2, level: 'TH' },
    { q: 'Dung dịch có pH = 2 có môi trường:', opts: ['Axit.', 'Bazơ.', 'Trung tính.', 'Lưỡng tính.'], correct: 0, level: 'NB' },
    { q: 'Chất nào sau đây là chất điện li mạnh?', opts: ['$\\text{CH}_3\\text{COOH}$.', '$\\text{NaCl}$.', '$\\text{NH}_3$.', '$\\text{H}_2\\text{O}$.'], correct: 1, level: 'TH' },
    { q: 'Khí nào sau đây gây hiệu ứng nhà kính mạnh nhất?', opts: ['$\\text{N}_2$.', '$\\text{O}_2$.', '$\\text{CO}_2$.', '$\\text{Ar}$.'], correct: 2, level: 'NB' },
    { q: 'Phản ứng $\\text{NaOH} + \\text{HCl} \\to \\text{NaCl} + \\text{H}_2\\text{O}$ thuộc loại:', opts: ['Trao đổi.', 'Trung hoà.', 'Hoá hợp.', 'Thế.'], correct: 1, level: 'TH' },
    { q: 'Công thức chung của ankan là:', opts: ['$\\text{C}_n\\text{H}_{2n}$.', '$\\text{C}_n\\text{H}_{2n+2}$.', '$\\text{C}_n\\text{H}_{2n-2}$.', '$\\text{C}_n\\text{H}_{2n+1}$.'], correct: 1, level: 'NB' },
    { q: 'Kim loại nào sau đây dẫn điện tốt nhất?', opts: ['Vàng.', 'Nhôm.', 'Bạc.', 'Đồng.'], correct: 2, level: 'NB' },
    { q: 'Khối lượng mol của $\\text{CaCO}_3$ (Ca = 40, C = 12, O = 16) là:', opts: ['$84$~g/mol.', '$100$~g/mol.', '$116$~g/mol.', '$136$~g/mol.'], correct: 1, level: 'TH' },
  ],
  'Sinh học': [
    { q: 'Đơn vị cấu tạo và chức năng của cơ thể sống là:', opts: ['Phân tử.', 'Tế bào.', 'Mô.', 'Cơ quan.'], correct: 1, level: 'NB' },
    { q: 'Bào quan nào thực hiện quang hợp ở thực vật?', opts: ['Ti thể.', 'Lục lạp.', 'Ribôxôm.', 'Lưới nội chất.'], correct: 1, level: 'NB' },
    { q: 'ADN được cấu tạo từ các đơn phân là:', opts: ['Axit amin.', 'Nuclêôtit.', 'Đường đơn.', 'Axit béo.'], correct: 1, level: 'NB' },
    { q: 'Quá trình giảm phân tạo ra:', opts: ['2 tế bào con $2n$.', '4 tế bào con $2n$.', '2 tế bào con $n$.', '4 tế bào con $n$.'], correct: 3, level: 'TH' },
    { q: 'Hệ sinh thái gồm:', opts: ['Quần xã sinh vật.', 'Sinh cảnh.', 'Quần thể sinh vật.', 'Quần xã và sinh cảnh.'], correct: 3, level: 'TH' },
    { q: 'Ở người, cặp nhiễm sắc thể giới tính của nữ là:', opts: ['$XX$.', '$XY$.', '$XO$.', '$YY$.'], correct: 0, level: 'NB' },
  ],
  'Tiếng Anh': [
    { q: 'Choose the correct word: "She \\_\\_\\_ to school every day."', opts: ['go', 'goes', 'going', 'went'], correct: 1, level: 'NB' },
    { q: 'Choose the synonym of "happy":', opts: ['sad', 'angry', 'glad', 'tired'], correct: 2, level: 'NB' },
    { q: 'Which sentence is correct?', opts: ['He don\'t like coffee.', 'He doesn\'t likes coffee.', 'He doesn\'t like coffee.', 'He not like coffee.'], correct: 2, level: 'TH' },
    { q: 'The passive form of "They built the bridge in 2020" is:', opts: ['The bridge is built in 2020.', 'The bridge was built in 2020.', 'The bridge has been built in 2020.', 'The bridge will be built in 2020.'], correct: 1, level: 'TH' },
    { q: 'Choose the best reported speech for: She said, "I am tired."', opts: ['She said that she is tired.', 'She said that she was tired.', 'She said that she tired.', 'She said that she were tired.'], correct: 1, level: 'VD' },
  ],
}

/** Chọn câu hỏi theo độ khó; nếu thiếu, lặp lại nhóm đã có kèm hậu tố. */
function pickQuestions(subject: ExamSubject, diff: DifficultyBreakdown): SampleQ[] {
  const pool = BANK[subject] ?? []
  const result: SampleQ[] = []
  const add = (level: SampleQ['level'], n: number) => {
    if (n <= 0) return
    const candidates = pool.filter((q) => q.level === level)
    const src = candidates.length > 0 ? candidates : pool
    for (let i = 0; i < n; i++) {
      const base = src[i % src.length]
      if (base) result.push({ ...base })
    }
  }
  add('NB', diff.easy || 0)
  add('TH', diff.medium || 0)
  add('VD', diff.hard || 0)
  add('VDC', diff.veryHard || 0)
  return result
}

/** Render khối "Phần I — trắc nghiệm 4 lựa chọn" */
function renderMcqSection(questions: SampleQ[], startIndex = 1): string {
  const header = [
    '\\section*{Phần I. Trắc nghiệm 4 lựa chọn}',
    `\\noindent\\textit{Mỗi câu chỉ chọn 1 đáp án đúng nhất.}`,
    '',
    '\\begin{enumerate}[leftmargin=1.1cm,label=\\textbf{Câu \\arabic*.}]',
  ]
  const body = questions.map((q, i) => {
    const num = startIndex + i
    const _ = num // keep order reference (not printed, numbering auto)
    void _
    const opts = q.opts
      .map((o, j) => `    \\item ${esc(rawOrTex(o))}`)
      .join('\n')
    return [
      `  \\item ${rawOrTex(q.q)}`,
      '    \\begin{enumerate}[label=\\Alph*.,leftmargin=1.2cm,itemsep=2pt]',
      opts,
      '    \\end{enumerate}',
    ].join('\n')
  })
  return [...header, ...body, '\\end{enumerate}'].join('\n')
}

/**
 * Một số chuỗi trong bank đã chứa toán LaTeX (VD `$x = 5 + 2t$`).
 * Chỉ escape nếu chuỗi không bắt đầu bằng $ và không chứa \.
 */
function rawOrTex(s: string): string {
  if (s.includes('$') || s.includes('\\')) return s
  return esc(s)
}

/** Phần II — câu hỏi đúng/sai (mỗi câu gồm 4 phát biểu a,b,c,d) */
function renderTrueFalseSection(count: number, topic: string): string {
  if (count <= 0) return ''
  const header = [
    '\\section*{Phần II. Câu hỏi đúng/sai}',
    '\\noindent\\textit{Mỗi câu có bốn phát biểu a, b, c, d. Học sinh điền Đ (đúng) hoặc S (sai) vào ô trống.}',
    '',
    '\\begin{enumerate}[leftmargin=1.1cm,label=\\textbf{Câu \\arabic*.}]',
  ]
  const body = Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return [
      `  \\item Xét phát biểu về ${esc(topic || 'nội dung đã học')} (câu ${n}):`,
      '    \\begin{enumerate}[label=\\alph*.,leftmargin=1.2cm,itemsep=2pt]',
      '      \\item Phát biểu thứ nhất (Đ/S): \\underline{\\hspace{1.2cm}}',
      '      \\item Phát biểu thứ hai (Đ/S): \\underline{\\hspace{1.2cm}}',
      '      \\item Phát biểu thứ ba (Đ/S): \\underline{\\hspace{1.2cm}}',
      '      \\item Phát biểu thứ tư (Đ/S): \\underline{\\hspace{1.2cm}}',
      '    \\end{enumerate}',
    ].join('\n')
  })
  return [...header, ...body, '\\end{enumerate}'].join('\n')
}

/** Phần III — bài toán tự luận */
function renderEssaySection(count: number, topic: string): string {
  if (count <= 0) return ''
  const header = [
    '\\section*{Phần III. Bài toán tự luận}',
    '\\noindent\\textit{Học sinh trình bày đầy đủ lời giải, công thức và kết quả tính toán.}',
    '',
    '\\begin{enumerate}[leftmargin=1.1cm,label=\\textbf{Bài \\arabic*.}]',
  ]
  const body = Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return [
      `  \\item (${n}) Vận dụng kiến thức về ${esc(topic || 'chủ đề đã học')} để giải bài toán sau:`,
      '    \\\\[2pt]',
      '    \\textit{(Giáo viên thay bằng đề bài cụ thể — phần này được sinh mẫu bởi hệ thống.)}',
      '    \\\\[40pt]',
    ].join('\n')
  })
  return [...header, ...body, '\\end{enumerate}'].join('\n')
}

/** Bảng đáp án tóm tắt ở cuối đề */
function renderAnswerKey(mcqs: SampleQ[]): string {
  if (mcqs.length === 0) return ''
  const letters = ['A', 'B', 'C', 'D']
  const rows = mcqs.map((q, i) => `${i + 1}. ${letters[q.correct] ?? '?'}`).join(' \\quad ')
  return [
    '\\vspace{10pt}',
    '\\hrule',
    '\\section*{Đáp án tham khảo (Phần I)}',
    '\\noindent ' + rows,
  ].join('\n')
}

function topicsLine(topics: string[]): string {
  const t = (topics || []).filter(Boolean)
  if (t.length === 0) return ''
  return `\\textbf{Phạm vi kiến thức:} ${t.map(esc).join(' · ')}.\\\\`
}

// ══════════════════════════════════════════════════════════════
// Chuẩn Bộ GD&ĐT 2025 (chương trình GDPT 2018)
// 4 phần · tổng 10 điểm · header 2 cột · mã đề · đánh số trang
// ══════════════════════════════════════════════════════════════

/** Preamble riêng cho chuẩn BGD 2025 — dùng fancyhdr + titlesec + tabularx. */
function preambleBgd2025(): string {
  return [
    '\\documentclass[12pt,a4paper]{article}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage[vietnamese]{babel}',
    '\\usepackage{amsmath,amssymb}',
    '\\usepackage{geometry}',
    '\\usepackage{enumitem}',
    '\\usepackage{siunitx}',
    '\\usepackage{xcolor}',
    '\\usepackage{tabularx}',
    '\\usepackage{fancyhdr}',
    '\\usepackage{titlesec}',
    '\\usepackage{etoolbox}',
    '\\geometry{a4paper, total={170mm,257mm}, left=20mm, right=20mm, top=18mm, bottom=20mm}',
    '\\setlength{\\parindent}{0pt}',
    '\\setlength{\\parskip}{4pt}',
    '% Đánh số trang căn giữa',
    '\\pagestyle{fancy}',
    '\\fancyhf{}',
    '\\fancyfoot[C]{\\thepage}',
    '\\renewcommand{\\headrulewidth}{0pt}',
    '% Section in hoa size lớn — giống đề minh hoạ Bộ GD',
    '\\titleformat{\\section}{\\Large\\bfseries\\MakeUppercase}{}{0pt}{}',
    '\\titlespacing*{\\section}{0pt}{14pt}{8pt}',
  ].join('\n')
}

/** Sinh mã đề 3 chữ số ngẫu nhiên 100..999 */
function randomExamCode(): string {
  return String(100 + Math.floor(Math.random() * 900))
}

/** Suy ra năm học (VD "2025 – 2026") từ năm hiện tại */
function deriveSchoolYear(): string {
  const now = new Date()
  // Năm học bắt đầu tháng 9
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return `${y} -- ${y + 1}`
}

/** Header 2 cột kiểu đề minh hoạ Bộ GD */
function headerBlockBgd(c: ExamConfig, totalPages: number): string {
  const dept = esc(c.departmentName ?? 'SỞ GD ĐT TP. HỒ CHÍ MINH')
  const school = esc(c.schoolName ?? 'TRƯỜNG THPT PHƯỚC BỬU')
  const label = esc(c.examLabel ?? 'ĐỀ THI MINH HOẠ')
  const session = esc(c.examSession ?? 'KIỂM TRA CUỐI HỌC KỲ')
  const year = esc(c.schoolYear ?? deriveSchoolYear())
  const subj = esc(`MÔN: ${c.subject.toUpperCase().replace('VẬT LÝ', 'VẬT LÍ')} ${c.grade}`)
  const code = esc(c.examCode ?? randomExamCode())

  return [
    '% ── Header 2 cột ──',
    '\\begin{tabularx}{\\linewidth}{@{}>{\\centering\\arraybackslash}X@{\\hspace{6mm}}>{\\centering\\arraybackslash}X@{}}',
    `\\textbf{${dept}} & \\textbf{${session}} \\\\[2pt]`,
    `\\textbf{${school}} & \\textbf{NĂM HỌC ${year}} \\\\[2pt]`,
    `\\textbf{${label}} & \\textbf{${subj}} \\\\[2pt]`,
    `(\\textit{Đề thi có ${totalPages} trang}) & \\textit{Thời gian làm bài: ${c.duration} phút} \\\\`,
    '\\end{tabularx}',
    '',
    '\\vspace{4pt}\\hrule\\vspace{8pt}',
    '',
    '\\begin{tabularx}{\\linewidth}{@{}X@{\\hspace{6mm}}r@{}}',
    '\\textbf{Họ, tên thí sinh:} \\dotfill\\hspace{0pt} &',
    `\\fbox{\\rule{0pt}{12pt}\\textbf{~Mã đề: ${code}~}} \\\\[4pt]`,
    '\\textbf{Số báo danh:} \\dotfill & \\\\',
    '\\end{tabularx}',
    '\\vspace{6pt}',
  ].join('\n')
}

/** Chuẩn hoá chuỗi câu hỏi: nếu không chứa TeX-escape thì escape, ngược lại giữ nguyên. */
function q(s: string): string { return rawOrTex(s) }

/** Phần I — 16 câu trắc nghiệm, 4 lựa chọn inline A. B. C. D. */
function renderMcqBgd(mcqs: SampleQ[]): string {
  const header = [
    '\\section*{Phần I. Câu trắc nghiệm nhiều lựa chọn (4,0 điểm)}',
    `\\textit{Học sinh trả lời từ câu 1 đến câu ${mcqs.length}. Mỗi câu đúng được 0,25 điểm.}`,
    '',
    '\\begin{enumerate}[leftmargin=1.15cm,label=\\textbf{Câu \\arabic*.},itemsep=6pt]',
  ]
  const body = mcqs.map((qq) => {
    // Inline 4 đáp án — phân cách bằng \quad, để LaTeX tự wrap theo chiều rộng
    const opts = qq.opts.map((o, i) => `\\textbf{${String.fromCharCode(65 + i)}.}~${q(o)}`).join(' \\quad ')
    return [
      `  \\item ${q(qq.q)}`,
      '',
      `    ${opts}`,
    ].join('\n')
  })
  return [...header, ...body, '\\end{enumerate}'].join('\n')
}

/** Phần II — Trắc nghiệm Đúng/Sai. Mỗi câu có 4 ý a,b,c,d là phát biểu dài. */
function renderTrueFalseBgd(count: number, topic: string): string {
  if (count <= 0) return ''
  const stems = buildTrueFalseStems(count, topic)
  const lines: string[] = []
  lines.push('\\section*{Phần II. Trắc nghiệm đúng/sai (2,0 điểm)}')
  lines.push('\\textit{Thí sinh chọn Đúng hoặc Sai cho mỗi ý a, b, c, d của các câu sau.}')
  lines.push('')
  stems.forEach((stem, i) => {
    lines.push(`\\textbf{Câu ${i + 1}.} ${stem.stem}\\\\`)
    stem.items.forEach((it, k) => {
      const mark = String.fromCharCode(97 + k) // a, b, c, d
      lines.push(`${mark}) ${it}\\\\`)
    })
    lines.push('')
  })
  return lines.join('\n')
}

interface TfStem { stem: string; items: string[] }
function buildTrueFalseStems(count: number, topic: string): TfStem[] {
  const t = topic || 'nội dung đã học'
  const base: TfStem[] = [
    {
      stem: `Xét một phát biểu về ${esc(t)}.`,
      items: [
        'Phát biểu thứ nhất liên quan đến định nghĩa của đại lượng.',
        'Phát biểu thứ hai liên quan đến đơn vị đo trong hệ SI.',
        'Phát biểu thứ ba liên quan đến biểu thức tính.',
        'Phát biểu thứ tư liên quan đến ứng dụng thực tế.',
      ],
    },
    {
      stem: `Xét tình huống thực nghiệm về ${esc(t)}.`,
      items: [
        'Câu phát biểu về đại lượng cho trước.',
        'Kết quả tính được khi thay số theo dữ kiện.',
        'Công thức / định luật vận dụng để giải.',
        'Nhận xét về hiện tượng khi thay đổi một tham số.',
      ],
    },
  ]
  const result: TfStem[] = []
  for (let i = 0; i < count; i++) result.push(base[i % base.length])
  return result
}

/** Phần III — Trả lời ngắn (4 câu, 0,5đ/câu, thí sinh điền số). */
function renderShortAnswerBgd(count: number, topic: string): string {
  if (count <= 0) return ''
  const lines: string[] = []
  lines.push('\\section*{Phần III. Trả lời ngắn (2,0 điểm)}')
  lines.push(`\\textit{Mỗi câu trả lời đúng được 0,5 điểm.}`)
  lines.push('')
  const prompts = buildShortAnswerPrompts(count, topic)
  prompts.forEach((p, i) => {
    lines.push(`\\textbf{Câu ${i + 1}:} ${p}\\\\[6pt]`)
  })
  return lines.join('\n')
}

function buildShortAnswerPrompts(count: number, topic: string): string[] {
  const t = topic || 'nội dung đã học'
  const samples = [
    `Dựa theo dữ kiện đề bài liên quan đến ${esc(t)}, hãy tính đại lượng được hỏi và cho biết giá trị là bao nhiêu?`,
    `Vận dụng công thức của ${esc(t)} để tính kết quả yêu cầu. Giá trị cuối cùng bằng bao nhiêu (làm tròn đến 2 chữ số sau dấu phẩy)?`,
    `Một tình huống thực tế về ${esc(t)} cho các dữ kiện ban đầu. Đáp số của bài toán là bao nhiêu?`,
    `Dựa theo đồ thị / bảng số liệu về ${esc(t)}, xác định giá trị cần tìm là bao nhiêu?`,
  ]
  return Array.from({ length: count }, (_, i) => samples[i % samples.length])
}

/** Phần IV — Tự luận (2 câu × 1,0đ, mỗi câu có ý a) và b)). */
function renderFreeResponseBgd(count: number, topic: string): string {
  if (count <= 0) return ''
  const lines: string[] = []
  lines.push('\\section*{Phần IV. Tự luận (2,0 điểm)}')
  lines.push('')
  const t = topic || 'chủ đề đã học'
  for (let i = 0; i < count; i++) {
    lines.push(`\\textbf{Câu ${i + 1} (1,0 điểm):} Vận dụng kiến thức về ${esc(t)} để giải bài toán sau (giáo viên thay bằng đề cụ thể).\\\\`)
    lines.push('a) Xác định đại lượng thứ nhất được hỏi.\\\\')
    lines.push('b) Tính toán đại lượng thứ hai.\\\\[30pt]')
  }
  return lines.join('\n')
}

/** Khối "— HẾT —" kết thúc đề chuẩn BGD */
function footerHet(): string {
  return [
    '',
    '\\vspace{8pt}\\hrule\\vspace{8pt}',
    '\\begin{center}\\textit{\\large --- HẾT ---}\\end{center}',
  ].join('\n')
}

/**
 * Sinh LaTeX theo chuẩn Bộ GD&ĐT 2025 (4 phần).
 * Bỏ qua các `difficulty` của config và dùng cố định:
 *   Phần I: 16 câu (MCQ) · Phần II: 2 câu (Đ/S) · Phần III: 4 câu (TLN) · Phần IV: 2 câu (TL)
 * Tuy nhiên, nếu người dùng set `difficulty.easy + medium + hard + veryHard`
 * lớn hơn 16, ta vẫn nhận đủ số câu MCQ đó (linh hoạt).
 */
function buildBgd2025(config: ExamConfig): string {
  const totalMcq = Math.max(16, computeTotal(config.difficulty))
  const diff: DifficultyBreakdown = computeTotal(config.difficulty) >= 16
    ? config.difficulty
    : { easy: 6, medium: 6, hard: 3, veryHard: 1 } // 16 câu mặc định
  const mcqs = pickQuestions(config.subject, diff).slice(0, totalMcq)
  const topic = (config.topics ?? [])[0] ?? ''

  // Đề minh hoạ chuẩn → 3 trang; nếu quá nhiều câu thì tự tính lại
  const estimatedPages = 3

  const lines: string[] = []
  lines.push(preambleBgd2025())
  lines.push('')
  lines.push('\\begin{document}')
  lines.push(headerBlockBgd(config, estimatedPages))
  lines.push(renderMcqBgd(mcqs))
  lines.push(renderTrueFalseBgd(2, topic))
  lines.push(renderShortAnswerBgd(4, topic))
  lines.push(renderFreeResponseBgd(2, topic))
  lines.push(footerHet())

  if (config.includeAnswerKey && mcqs.length > 0) {
    lines.push('\\newpage')
    lines.push(renderAnswerKey(mcqs))
  }

  lines.push('\\end{document}')
  lines.push('')
  return lines.join('\n')
}

export function buildExamLatexLocally(config: ExamConfig): string {
  // Chuẩn Bộ GD&ĐT 2025 — dùng generator riêng có header 2 cột + 4 phần
  if (config.format === 'bgd-2025') return buildBgd2025(config)

  const mcqs = pickQuestions(config.subject, config.difficulty)
  const topic = (config.topics ?? [])[0] ?? ''
  const lines: string[] = []
  lines.push(preamble())
  lines.push('')
  lines.push('\\begin{document}')
  lines.push(headerBlock(config))
  if ((config.topics?.length ?? 0) > 0) lines.push(topicsLine(config.topics))

  switch (config.format) {
    case 'mcq-only': {
      lines.push(renderMcqSection(mcqs))
      break
    }
    case 'mcq-tf-essay': {
      // Chia 60% MCQ · 20% đúng-sai · 20% tự luận
      const total = mcqs.length
      const tfCount = Math.max(1, Math.round(total * 0.25))
      const essayCount = Math.max(1, Math.round(total * 0.2))
      lines.push(renderMcqSection(mcqs))
      lines.push(renderTrueFalseSection(tfCount, topic))
      lines.push(renderEssaySection(essayCount, topic))
      break
    }
    case 'tn-tl': {
      const essayCount = Math.max(1, Math.round(mcqs.length * 0.25))
      lines.push(renderMcqSection(mcqs))
      lines.push(renderEssaySection(essayCount, topic))
      break
    }
    case 'full-essay': {
      const essayCount = Math.max(3, mcqs.length)
      lines.push(renderEssaySection(essayCount, topic))
      break
    }
  }

  if (config.includeAnswerKey && mcqs.length > 0) {
    lines.push(renderAnswerKey(mcqs))
  }

  lines.push('')
  lines.push('\\vspace{12pt}')
  lines.push('\\hrule')
  lines.push('\\begin{center}\\footnotesize --- HẾT ---\\\\ (Giáo viên coi thi không giải thích gì thêm) \\end{center}')
  lines.push('\\end{document}')
  lines.push('')
  return lines.join('\n')
}
