/**
 * LatexSnippetsPanel — Bảng gợi ý cú pháp LaTeX cho GV không quen code
 *
 * Hiển thị dạng dropdown floating với 7 nhóm snippet:
 *   📝 Tiêu đề / Header
 *   📐 Toán cơ bản
 *   📊 Toán nâng cao (giải tích, ma trận)
 *   📋 Danh sách & câu hỏi
 *   📑 Bảng biểu
 *   🎨 Định dạng văn bản
 *   📊 Đề thi 4 phần (BGD&ĐT)
 *
 * Mỗi snippet hiển thị:
 *   - Tên ngắn (Vietnamese)
 *   - Preview LaTeX code (font mono, dim)
 *   - Click → gọi onInsert(latexCode) để insert vào editor
 */
import { useState } from 'react'
import { X, Search, Copy, Check } from 'lucide-react'

interface Snippet {
  label: string
  description?: string
  code: string
}

interface SnippetCategory {
  id: string
  emoji: string
  title: string
  snippets: Snippet[]
}

const CATEGORIES: SnippetCategory[] = [
  {
    id: 'header',
    emoji: '📝',
    title: 'Tiêu đề / Header',
    snippets: [
      {
        label: 'Header 2 cột (trường + đề)',
        description: 'Dùng cho trang đầu của đề kiểm tra',
        code: `\\begin{center}
  \\begin{minipage}[t]{0.45\\textwidth}
    \\centering
    \\textbf{TRƯỜNG ...} \\\\
    \\textbf{Tổ ...} \\\\
    \\rule{5cm}{0.4pt}
  \\end{minipage}%
  \\begin{minipage}[t]{0.54\\textwidth}
    \\centering
    \\textbf{ĐỀ KIỂM TRA — ĐỀ SỐ 1} \\\\
    \\textbf{NĂM HỌC 2025 -- 2026} \\\\
    \\textbf{MÔN: ... LỚP ...} \\\\
    \\textit{Thời gian làm bài: 90 phút}
  \\end{minipage}
\\end{center}
\\rule{\\textwidth}{0.4pt}`,
      },
      {
        label: 'Tiêu đề lớn căn giữa',
        code: `\\begin{center}
  \\textbf{\\Large TIÊU ĐỀ Ở ĐÂY}
\\end{center}`,
      },
      {
        label: 'Section (đánh số tự động)',
        code: `\\section{Tên mục}`,
      },
      {
        label: 'Section* (không đánh số)',
        code: `\\section*{Tên mục}`,
      },
      {
        label: 'Đường ngang phân cách',
        code: `\\rule{\\textwidth}{0.4pt}`,
      },
      {
        label: 'Khoảng trắng dọc',
        code: `\\vspace{1cm}`,
      },
    ],
  },

  {
    id: 'math-basic',
    emoji: '📐',
    title: 'Toán cơ bản',
    snippets: [
      { label: 'Công thức inline ($...$)', code: `$x^2 + 2x + 1$` },
      { label: 'Công thức 1 dòng (display)', code: `\\[ x^2 + 2x + 1 = 0 \\]` },
      { label: 'Phân số', code: `\\frac{a}{b}` },
      { label: 'Căn bậc 2', code: `\\sqrt{x}` },
      { label: 'Căn bậc n', code: `\\sqrt[3]{x}` },
      { label: 'Mũ', code: `x^{n+1}` },
      { label: 'Chỉ số dưới', code: `a_{n}` },
      { label: 'Phương trình bậc 2 (công thức nghiệm)', code: `x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}` },
      {
        label: 'Hệ phương trình',
        code: `\\begin{equation*}
  \\begin{cases}
    2x + y = 5 \\\\
    x - 3y = -1
  \\end{cases}
\\end{equation*}`,
      },
      { label: 'Ký hiệu π / ∞ / ±', code: `\\pi, \\infty, \\pm` },
      { label: 'Phép nhân (× / ·)', code: `a \\times b, a \\cdot b` },
      { label: 'Phép chia (÷)', code: `a \\div b` },
      { label: 'Bằng / Khác / ≤ / ≥', code: `=, \\neq, \\leq, \\geq` },
      { label: 'Xấp xỉ ≈', code: `\\approx` },
      { label: 'Hy Lạp (α β γ Δ)', code: `\\alpha, \\beta, \\gamma, \\Delta` },
    ],
  },

  {
    id: 'math-advanced',
    emoji: '📊',
    title: 'Toán nâng cao (giải tích, ma trận)',
    snippets: [
      { label: 'Giới hạn lim', code: `\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1` },
      { label: 'Đạo hàm dy/dx', code: `\\frac{dy}{dx}` },
      { label: 'Tích phân', code: `\\int_a^b f(x) \\, dx` },
      { label: 'Tích phân kép', code: `\\iint_D f(x,y) \\, dA` },
      { label: 'Tổng Sigma', code: `\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}` },
      { label: 'Tích Pi', code: `\\prod_{i=1}^{n} a_i` },
      { label: 'Vector mũi tên', code: `\\vec{a}, \\overrightarrow{AB}` },
      {
        label: 'Ma trận 2x2 ngoặc tròn',
        code: `\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}`,
      },
      {
        label: 'Ma trận 2x2 ngoặc vuông',
        code: `\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}`,
      },
      {
        label: 'Định thức',
        code: `\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}`,
      },
      {
        label: 'Align nhiều dòng (theo dấu =)',
        code: `\\begin{align}
  (a+b)^2 &= a^2 + 2ab + b^2 \\\\
  (a-b)^2 &= a^2 - 2ab + b^2
\\end{align}`,
      },
      { label: 'sin / cos / tan', code: `\\sin x, \\cos x, \\tan x` },
      { label: 'sin² x + cos² x = 1', code: `\\sin^2 x + \\cos^2 x = 1` },
    ],
  },

  {
    id: 'lists',
    emoji: '📋',
    title: 'Danh sách & câu hỏi',
    snippets: [
      {
        label: 'Liệt kê có gạch đầu dòng',
        code: `\\begin{itemize}
  \\item Mục 1
  \\item Mục 2
  \\item Mục 3
\\end{itemize}`,
      },
      {
        label: 'Liệt kê đánh số 1, 2, 3',
        code: `\\begin{enumerate}
  \\item Câu 1
  \\item Câu 2
  \\item Câu 3
\\end{enumerate}`,
      },
      {
        label: 'Đánh số chữ a) b) c) d)',
        code: `\\begin{enumerate}[label=(\\alph*)]
  \\item Trường hợp a
  \\item Trường hợp b
  \\item Trường hợp c
  \\item Trường hợp d
\\end{enumerate}`,
      },
      {
        label: 'Câu hỏi với "Câu 1.", "Câu 2." in đậm',
        code: `\\begin{enumerate}[left=0pt, label=\\textbf{Câu \\arabic*.}]
  \\item Nội dung câu 1...
  \\item Nội dung câu 2...
\\end{enumerate}`,
      },
      {
        label: '4 lựa chọn A B C D (trắc nghiệm)',
        code: `\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=2cm]
  \\item Phương án 1
  \\item Phương án 2
  \\item Phương án 3
  \\item Phương án 4
\\end{enumerate}`,
      },
    ],
  },

  {
    id: 'tables',
    emoji: '📑',
    title: 'Bảng biểu',
    snippets: [
      {
        label: 'Bảng 3 cột có viền',
        code: `\\begin{tabular}{|c|l|r|}
  \\hline
  STT & Học sinh & Điểm \\\\
  \\hline
  1 & Nguyễn A & 9.5 \\\\
  2 & Trần B & 8.0 \\\\
  \\hline
\\end{tabular}`,
      },
      {
        label: 'Bảng đẹp với booktabs',
        code: `\\begin{tabular}{lcc}
  \\toprule
  Học sinh & Toán & Văn \\\\
  \\midrule
  Nguyễn A & 9.0 & 8.5 \\\\
  Trần B & 7.5 & 9.0 \\\\
  \\bottomrule
\\end{tabular}`,
      },
      {
        label: 'Bảng có gộp ô (multicolumn)',
        code: `\\begin{tabular}{|c|c|c|}
  \\hline
  \\multicolumn{3}{|c|}{\\textbf{TIÊU ĐỀ BẢNG}} \\\\
  \\hline
  Cột A & Cột B & Cột C \\\\
  \\hline
  1 & 2 & 3 \\\\
  \\hline
\\end{tabular}`,
      },
    ],
  },

  {
    id: 'format',
    emoji: '🎨',
    title: 'Định dạng văn bản',
    snippets: [
      { label: 'In đậm', code: `\\textbf{văn bản}` },
      { label: 'In nghiêng', code: `\\textit{văn bản}` },
      { label: 'Gạch chân', code: `\\underline{văn bản}` },
      { label: 'Cỡ chữ to (Large)', code: `{\\Large văn bản to}` },
      { label: 'Cỡ chữ nhỏ', code: `{\\small văn bản nhỏ}` },
      { label: 'Căn giữa', code: `\\begin{center}\nvăn bản căn giữa\n\\end{center}` },
      { label: 'Xuống dòng (cùng đoạn)', code: `\\\\` },
      { label: 'Sang trang mới', code: `\\newpage` },
      { label: 'Khoảng trắng giữa các đoạn', code: `\\bigskip` },
      { label: 'Ô trống điền vào (gạch dưới)', code: `\\underline{\\hspace{2cm}}` },
      {
        label: 'Khung "Lời giải" có màu',
        code: `\\begin{tcolorbox}[colback=blue!5,colframe=blue!50,title=Lời giải]
  Bước 1: ...
  Bước 2: ...
\\end{tcolorbox}`,
      },
    ],
  },

  {
    id: 'exam-4-parts',
    emoji: '🎓',
    title: 'Đề thi 4 phần (BGD&ĐT)',
    snippets: [
      {
        label: 'PHẦN I — Trắc nghiệm 4 lựa chọn',
        code: `\\section*{PHẦN I (3,0 điểm) — Câu trắc nghiệm nhiều phương án lựa chọn}
\\textit{Học sinh trả lời từ câu 1 đến câu 12. Mỗi câu chỉ chọn 1 phương án đúng.}

\\textbf{Câu 1.} Nội dung câu hỏi...
\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=2cm]
  \\item Phương án A
  \\item Phương án B
  \\item Phương án C
  \\item Phương án D
\\end{enumerate}`,
      },
      {
        label: 'PHẦN II — Đúng/Sai 4 ý',
        code: `\\section*{PHẦN II (2,0 điểm) — Câu trắc nghiệm Đúng/Sai}
\\textit{Học sinh trả lời từ câu 1 đến câu 4. Mỗi câu có 4 ý a, b, c, d.}

\\textbf{Câu 1.} Cho dữ kiện ...
\\begin{enumerate}[label=\\textbf{\\alph*)}, itemsep=2pt, leftmargin=1cm]
  \\item Mệnh đề a
  \\item Mệnh đề b
  \\item Mệnh đề c
  \\item Mệnh đề d
\\end{enumerate}`,
      },
      {
        label: 'PHẦN III — Trả lời ngắn',
        code: `\\section*{PHẦN III (2,0 điểm) — Câu hỏi trả lời ngắn}

\\textbf{Câu 1.} Tổng các nghiệm của phương trình $x^2 - 5x + 6 = 0$ bằng \\underline{\\hspace{2cm}}.

\\textbf{Câu 2.} Giá trị của $\\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}$ bằng \\underline{\\hspace{2cm}}.`,
      },
      {
        label: 'PHẦN IV — Tự luận',
        code: `\\section*{PHẦN IV (3,0 điểm) — Tự luận}

\\textbf{Bài 1.} (1,5 điểm) Giải phương trình
\\[ x^2 - 5x + 6 = 0 \\]

\\textbf{Lời giải.}
Ta có $\\Delta = b^2 - 4ac = 25 - 24 = 1 > 0$.

Phương trình có 2 nghiệm phân biệt:
\\[ x_1 = 3, \\quad x_2 = 2 \\]

Vậy tập nghiệm $S = \\{2, 3\\}$.`,
      },
      {
        label: 'Footer "--- HẾT ---"',
        code: `\\rule{\\textwidth}{0.4pt}
\\begin{center} \\textit{--- HẾT ---} \\end{center}`,
      },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
  /** Callback khi user click 1 snippet — text sẽ được insert vào editor tại cursor */
  onInsert: (code: string) => void
}

export default function LatexSnippetsPanel({ open, onClose, onInsert }: Props) {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id)
  const [search, setSearch] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null)

  if (!open) return null

  const cat = CATEGORIES.find(c => c.id === activeCat) || CATEGORIES[0]
  const filtered = search.trim()
    ? CATEGORIES.flatMap(c =>
        c.snippets
          .filter(s => s.label.toLowerCase().includes(search.toLowerCase())
                    || s.code.toLowerCase().includes(search.toLowerCase()))
          .map(s => ({ ...s, _cat: c }))
      )
    : null

  const handleClick = (code: string, key: string) => {
    onInsert(code)
    setCopiedIdx(key)
    setTimeout(() => setCopiedIdx(null), 1200)
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0f1016', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, width: '100%', maxWidth: 880, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>
              📚 Mẫu LaTeX nhanh
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0' }}>
              Click 1 mẫu → tự chèn vào editor tại vị trí con trỏ. Không cần gõ tay!
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', padding: 6,
          }}><X size={20} /></button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.4)',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm mẫu... (vd: phân số, tích phân, bảng, đề thi)"
              style={{
                width: '100%', padding: '8px 12px 8px 32px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Body — sidebar tabs + snippet list */}
        {filtered ? (
          // Search mode — flat list
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {filtered.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 32 }}>
                Không tìm thấy mẫu nào phù hợp với "{search}"
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((s, i) => (
                  <SnippetCard key={`${s._cat.id}-${i}`}
                    snippet={s}
                    catLabel={`${s._cat.emoji} ${s._cat.title}`}
                    copied={copiedIdx === `${s._cat.id}-${i}`}
                    onClick={() => handleClick(s.code, `${s._cat.id}-${i}`)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Sidebar categories */}
            <div style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.06)',
              overflowY: 'auto', padding: '8px 0', flexShrink: 0 }}>
              {CATEGORIES.map(c => (
                <button key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 16px',
                    background: c.id === activeCat ? 'rgba(124,58,237,0.15)' : 'transparent',
                    border: 'none', cursor: 'pointer', color: c.id === activeCat ? '#a78bfa' : 'rgba(255,255,255,0.7)',
                    fontSize: 13, fontWeight: c.id === activeCat ? 700 : 500,
                    borderLeft: c.id === activeCat ? '3px solid #7c3aed' : '3px solid transparent',
                  }}>
                  <span style={{ marginRight: 8 }}>{c.emoji}</span>{c.title}
                  <span style={{ float: 'right', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {c.snippets.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Snippet list of active category */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cat.snippets.map((s, i) => (
                  <SnippetCard key={`${cat.id}-${i}`}
                    snippet={s}
                    copied={copiedIdx === `${cat.id}-${i}`}
                    onClick={() => handleClick(s.code, `${cat.id}-${i}`)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
          💡 Mẹo: Đặt con trỏ vào vị trí muốn chèn trước, rồi mở panel này và click mẫu.
          {' '}Snippet sẽ được chèn ngay tại vị trí con trỏ.
        </div>
      </div>
    </div>
  )
}

function SnippetCard({ snippet, catLabel, copied, onClick }: {
  snippet: Snippet
  catLabel?: string
  copied: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: copied ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 10, padding: 12, transition: 'all 0.15s',
    }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)' }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
            {snippet.label}
          </div>
          {catLabel && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>
              {catLabel}
            </div>
          )}
          {snippet.description && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
              {snippet.description}
            </div>
          )}
        </div>
        {copied ? (
          <span style={{ color: '#4ade80', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={12} /> Đã chèn
          </span>
        ) : (
          <Copy size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
        )}
      </div>
      <pre style={{
        margin: 0, padding: '8px 10px', background: '#0a0a14',
        border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6,
        color: 'rgba(167,139,250,0.85)', fontSize: 11,
        fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflow: 'hidden',
        maxHeight: 80, lineHeight: 1.4,
      }}>{snippet.code.length > 200 ? snippet.code.slice(0, 200) + '...' : snippet.code}</pre>
    </button>
  )
}
