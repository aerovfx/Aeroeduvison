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

  // ─── TIKZ PHYSICS / MATH DIAGRAMS ────────────────────────────────────────────
  {
    id: 'tikz-diagrams',
    emoji: '📐',
    title: 'Hình vẽ TikZ (Vật lý / Toán)',
    snippets: [
      {
        label: '⚙️ Packages TikZ (thêm vào preamble)',
        description: 'Dán vào trước \\begin{document}. Bắt buộc để vẽ hình TikZ.',
        code: `% ── Thêm vào PREAMBLE (trước \\begin{document}) ──
\\usepackage{tikz}
\\usetikzlibrary{arrows.meta, decorations.pathmorphing, patterns}
% Tùy chọn (nếu dùng \\begin{axis}):
% \\usepackage{pgfplots}
% \\pgfplotsset{compat=newest}`,
      },
      {
        label: 'Hệ trục Oxy cơ bản',
        description: 'Trục tọa độ vuông góc Oxy với vạch chia, mũi tên, ký hiệu O x y',
        code: `\\begin{tikzpicture}[>=stealth, scale=1]
  % Trục Ox (ngang)
  \\draw[->, thick] (-0.4,0) -- (5.5,0) node[below right] {$x$};
  % Trục Oy (dọc)
  \\draw[->, thick] (0,-0.4) -- (0,4.5) node[left] {$y$};
  % Gốc tọa độ O
  \\node[below left] at (0,0) {$O$};
  % Vạch chia trục x
  \\foreach \\x in {1,2,3,4,5}
    \\draw (\\x,2pt) -- (\\x,-2pt) node[below] {\\small\\x};
  % Vạch chia trục y
  \\foreach \\y in {1,2,3,4}
    \\draw (2pt,\\y) -- (-2pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đường thẳng y = ax + b (hàm bậc nhất)',
        description: 'Đồ thị hàm số bậc nhất, giao điểm 2 trục, nhãn điểm',
        code: `\\begin{tikzpicture}[>=stealth, scale=0.9]
  \\draw[->, thick] (-1.5,0) -- (4.5,0) node[below right] {$x$};
  \\draw[->, thick] (0,-1.5) -- (0,4.5) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  % Đường thẳng y = x + 1 (thay hệ số tùy bài)
  \\draw[thick, blue, domain=-1.2:3.2] plot (\\x, {\\x + 1})
    node[right] {$y = x + 1$};
  % Giao trục Ox: (-1; 0)
  \\filldraw[blue] (-1,0) circle (2pt) node[above left] {$(-1;\\,0)$};
  % Giao trục Oy: (0; 1)
  \\filldraw[blue] (0,1) circle (2pt) node[right] {$(0;\\,1)$};
  % Vạch chia
  \\foreach \\x in {-1,1,2,3}
    \\draw (\\x,1.5pt) -- (\\x,-1.5pt) node[below] {\\small\\x};
  \\foreach \\y in {1,2,3,4}
    \\draw (1.5pt,\\y) -- (-1.5pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đồ thị parabol y = ax²',
        description: 'Đường cong bậc hai với đỉnh tại gốc, đối xứng trục Oy',
        code: `\\begin{tikzpicture}[>=stealth, scale=0.8]
  \\draw[->, thick] (-3.2,0) -- (3.2,0) node[below right] {$x$};
  \\draw[->, thick] (0,-0.4) -- (0,5) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  % Parabol y = x² (thay \\x*\\x bằng 0.5*\\x*\\x để "mở rộng" miệng)
  \\draw[thick, red, domain=-2.2:2.2, smooth, samples=60]
    plot (\\x, {\\x*\\x}) node[right] {$y = x^2$};
  % Điểm đặc biệt
  \\filldraw[red] (1,1) circle (2pt) node[right] {$(1;\\,1)$};
  \\filldraw[red] (-1,1) circle (2pt) node[left] {$(-1;\\,1)$};
  \\filldraw[red] (2,4) circle (2pt) node[right] {$(2;\\,4)$};
  % Trục đối xứng
  \\draw[dashed, gray] (0,-0.2) -- (0,4.5) node[above, gray] {\\small trục đx};
  % Vạch chia
  \\foreach \\x in {-2,-1,1,2}
    \\draw (\\x,1.5pt) -- (\\x,-1.5pt) node[below] {\\small\\x};
  \\foreach \\y in {1,2,3,4}
    \\draw (1.5pt,\\y) -- (-1.5pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đường tròn x² + y² = R²',
        description: 'Vẽ đường tròn tâm O bán kính R với nhãn các điểm trên trục',
        code: `\\begin{tikzpicture}[>=stealth, scale=1]
  \\draw[->, thick] (-2.8,0) -- (2.8,0) node[below right] {$x$};
  \\draw[->, thick] (0,-2.8) -- (0,2.8) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  % Đường tròn tâm O, bán kính R=2 (thay số 2 bằng R thực tế)
  \\draw[thick, blue] (0,0) circle (2);
  % Vẽ bán kính minh họa
  \\draw[->, dashed] (0,0) -- (1.41,1.41) node[midway, above left] {$R$};
  % Điểm trên trục
  \\filldraw (2,0) circle (1.5pt) node[below right] {$(R;\\,0)$};
  \\filldraw (0,2) circle (1.5pt) node[above right] {$(0;\\,R)$};
  \\filldraw (-2,0) circle (1.5pt) node[below left] {$(-R;\\,0)$};
  \\filldraw (0,-2) circle (1.5pt) node[below right] {$(0;\\,-R)$};
  % Vạch chia
  \\foreach \\x in {-2,-1,1,2}
    \\draw (\\x,1.5pt) -- (\\x,-1.5pt) node[below] {\\small\\x};
  \\foreach \\y in {-2,-1,1,2}
    \\draw (1.5pt,\\y) -- (-1.5pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đồ thị Vôn-Ampe I-U (đặc trưng điện trở)',
        description: 'So sánh 2 điện trở R₁, R₂ qua độ dốc. R nhỏ → dốc lớn.',
        code: `\\begin{tikzpicture}[>=stealth, scale=0.8]
  % Hệ trục I-U
  \\draw[->, thick] (-0.5,0) -- (7,0) node[below] {$U\\ (\\text{V})$};
  \\draw[->, thick] (0,-0.5) -- (0,5) node[left] {$I\\ (\\text{A})$};
  \\node[below left] at (0,0) {$O$};
  % Lưới phụ (tùy chọn — xóa dòng này nếu không cần)
  \\draw[help lines, color=gray!25, dashed] (0,0) grid (6.5,4.5);
  % Đường đặc trưng R₁ = 2 Ω (đi qua A(4; 2))
  \\draw[very thick, blue] (0,0) -- (6,3) node[above right] {$R_1$};
  \\draw[dashed, blue!60] (4,0) -- (4,2) -- (0,2);
  \\filldraw[blue] (4,2) circle (2.5pt) node[above left] {$A(4;\\,2)$};
  % Đường đặc trưng R₂ = 4 Ω (đi qua B(6; 1,5))
  \\draw[very thick, red] (0,0) -- (6.5,1.625) node[right] {$R_2$};
  \\draw[dashed, red!60] (6,0) -- (6,1.5) -- (0,1.5);
  \\filldraw[red] (6,1.5) circle (2.5pt) node[above] {$B(6;\\,1{,}5)$};
  % Vạch chia trục U
  \\foreach \\x in {2,4,6}
    \\draw (\\x,1pt) -- (\\x,-1pt) node[below] {\\small\\x};
  % Vạch chia trục I
  \\foreach \\y in {1,2,3,4}
    \\draw (1pt,\\y) -- (-1pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đồ thị s-t (chuyển động thẳng đều)',
        description: 'Độ dốc đường thẳng = vận tốc v. Hai vật so sánh trên cùng hệ trục.',
        code: `\\begin{tikzpicture}[>=stealth, scale=0.9]
  \\draw[->, thick] (-0.3,0) -- (5.5,0) node[below] {$t\\ (\\text{s})$};
  \\draw[->, thick] (0,-0.3) -- (0,5) node[left] {$s\\ (\\text{m})$};
  \\node[below left] at (0,0) {$O$};
  % Vật 1: v₁ = 1 m/s → đường dốc hơn
  \\draw[very thick, blue] (0,0) -- (4,4)
    node[above] {$v_1 = 1\\ \\text{m/s}$};
  % Vật 2: v₂ = 0,5 m/s → đường thoải hơn
  \\draw[very thick, red] (0,0) -- (4,2)
    node[right] {$v_2 = 0{,}5\\ \\text{m/s}$};
  % Điểm đặc biệt: gặp nhau tại t=0 (xuất phát cùng chỗ)
  % Vạch chia
  \\foreach \\x in {1,2,3,4}
    \\draw (\\x,2pt) -- (\\x,-2pt) node[below] {\\small\\x};
  \\foreach \\y in {1,2,3,4}
    \\draw (2pt,\\y) -- (-2pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đồ thị v-t (CDBĐ đều — nhanh dần và chậm dần)',
        description: 'Diện tích hình thang/tam giác dưới đường v-t = quãng đường s',
        code: `\\begin{tikzpicture}[>=stealth, scale=0.9]
  \\draw[->, thick] (-0.3,0) -- (5.5,0) node[below] {$t\\ (\\text{s})$};
  \\draw[->, thick] (0,-0.3) -- (0,5) node[left] {$v\\ (\\text{m/s})$};
  \\node[below left] at (0,0) {$O$};
  % Nhanh dần đều: v₀=0, a=1 m/s² → v = t
  \\draw[very thick, blue] (0,0) -- (4,4)
    node[above left] {$a>0$, nhanh dần};
  % Chậm dần đều: v₀=4 m/s, a=-1 m/s² → v = 4 - t
  \\draw[very thick, red] (0,4) -- (4,0)
    node[below right] {$a<0$, chậm dần};
  % Nhãn v₀ trên trục
  \\node[left] at (0,4) {$v_0$};
  \\draw[dashed, gray] (0,4) -- (0.3,4);
  % Diện tích = quãng đường (bỏ % để hiện)
  % \\fill[red!12] (0,0) -- (0,4) -- (4,0) -- cycle;
  % \\node[red!70] at (1.2,1) {$s = \\frac{1}{2}v_0 t_0$};
  % Vạch chia
  \\foreach \\x in {1,2,3,4}
    \\draw (\\x,2pt) -- (\\x,-2pt) node[below] {\\small\\x};
  \\foreach \\y in {1,2,3,4}
    \\draw (2pt,\\y) -- (-2pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đồ thị dao động điều hòa x(t) = A cos(ωt)',
        description: 'A=biên độ, T=chu kỳ. Trong code: T=4s, A=2cm. Thay số theo bài.',
        code: `\\begin{tikzpicture}[>=stealth, scale=0.85]
  \\draw[->, thick] (-0.3,0) -- (7.5,0) node[below] {$t\\ (\\text{s})$};
  \\draw[->, thick] (0,-2.5) -- (0,2.8) node[left] {$x\\ (\\text{cm})$};
  \\node[below left] at (0,0) {$O$};
  % x = 2·cos(90°·t):  A=2 cm, T=4 s
  % Công thức: cos(360/T * t) với t theo đơn vị trục
  % → 360/4 = 90 → dùng cos(90*\\x)
  \\draw[thick, blue, domain=0:7, smooth, samples=200]
    plot (\\x, {2*cos(90*\\x)})
    node[right] {$x = 2\\cos\\!\\left(\\frac{\\pi}{2}t\\right)$};
  % Biên độ A
  \\draw[dashed, gray] (0,2) node[left] {$A{=}2$} -- (0.2,2);
  \\draw[dashed, gray] (0,-2) node[left] {$-A$} -- (2.2,-2);
  % Chu kỳ T = 4 s
  \\draw[<->, gray!80] (0,-2.35) -- (4,-2.35)
    node[midway, below] {$T = 4\\ \\text{s}$};
  \\draw[dashed, gray!50] (0,-2.35) -- (0,-2.1);
  \\draw[dashed, gray!50] (4,-2.35) -- (4,2.05);
  % Vạch chia t
  \\foreach \\x in {1,2,3,4,5,6,7}
    \\draw (\\x,1.5pt) -- (\\x,-1.5pt) node[below] {\\tiny\\x};
\\end{tikzpicture}`,
      },
      {
        label: 'Quỹ đạo ném xiên (parabol)',
        description: 'Vẽ quỹ đạo, điểm đỉnh ymax, tầm xa L, vector v₀ và góc α',
        code: `\\begin{tikzpicture}[>=stealth, scale=0.9]
  \\draw[->, thick] (-0.3,0) -- (6.5,0) node[below] {$x\\ (\\text{m})$};
  \\draw[->, thick] (0,-0.2) -- (0,3.5) node[left] {$y\\ (\\text{m})$};
  \\node[below left] at (0,0) {$O$};
  % Parabol y = x·tan(α) - g/(2v₀²cos²α)·x²
  % Ví dụ: α=45°, v₀=10 m/s, g=10 → y = x - 0,2x²  % Tầm xa L = v₀²sin(2α)/g = 100·1/10 = 10 → chia tỉ lệ ×0.5
  \\draw[very thick, red, domain=0:5, smooth, samples=80]
    plot (\\x, {\\x - 0.2*\\x*\\x});
  % Điểm đỉnh: x=2.5, y=1.25
  \\filldraw[red] (2.5,1.25) circle (2pt);
  \\draw[dashed, gray] (0,1.25) node[left] {$y_{\\max}$} -- (2.5,1.25);
  \\draw[dashed, gray] (2.5,0) node[below] {$\\frac{L}{2}$} -- (2.5,1.25);
  % Điểm rơi (tầm xa)
  \\filldraw[red] (5,0) circle (2pt) node[below] {$L$};
  % Vector vận tốc ban đầu
  \\draw[->, very thick, blue] (0,0) -- (1.06,1.06)
    node[above right] {$\\vec{v}_0$};
  % Góc alpha
  \\draw (0.7,0) arc (0:45:0.7);
  \\node at (0.85,0.2) {$\\alpha$};
\\end{tikzpicture}`,
      },
      {
        label: 'Mặt phẳng nghiêng + phân tích 3 lực (P, N, F)',
        description: 'Vật trên mặt phẳng nghiêng góc α, vẽ trọng lực P, pháp tuyến N, ma sát F',
        code: `\\begin{tikzpicture}[>=stealth, scale=1.1]
  % Tam giác mặt phẳng nghiêng (góc α=30° ở chân trái)
  \\draw[thick, fill=gray!12]
    (0,0) -- (5,0) -- (5,2.887) -- cycle;
  % Nhãn góc α
  \\draw (1.1,0) arc (0:30:1.1);
  \\node at (1.4,0.25) {$\\alpha$};
  % Vật — hình chữ nhật xoay 30° trên mặt phẳng
  \\begin{scope}[rotate around={30:(2.5,1.44)}]
    \\draw[thick, fill=cyan!25] (2.1,1.3) rectangle (2.9,1.74);
  \\end{scope}
  \\coordinate (M) at (2.5,1.44);  % tâm vật
  % Trọng lực P — thẳng đứng hướng xuống
  \\draw[->, very thick, red] (M) -- +(0,-1.6)
    node[right] {$\\vec{P}$};
  % Phản lực pháp tuyến N — vuông góc mặt phẳng nghiêng
  \\draw[->, very thick, blue] (M) -- +({-sin(30)*1.4},{cos(30)*1.4})
    node[above] {$\\vec{N}$};
  % Lực ma sát F — dọc mặt phẳng, chiều lên (ngược chiều trượt)
  \\draw[->, very thick, green!55!black] (M) -- +({-cos(30)*1.2},{-sin(30)*1.2})
    node[below left] {$\\vec{F}_{ms}$};
\\end{tikzpicture}`,
      },
      {
        label: 'Con lắc lò xo nằm ngang',
        description: 'Hình vẽ lò xo gắn tường, vật m, vị trí cân bằng x=0',
        code: `\\begin{tikzpicture}[>=stealth, scale=1]
  % Tường cứng bên trái
  \\draw[thick] (0,-0.35) -- (0,0.35);
  \\fill[pattern=north east lines, pattern color=gray]
    (-0.2,-0.35) rectangle (0,0.35);
  % Lò xo (zigzag bằng tay — không cần thư viện đặc biệt)
  \\draw[thick] (0,0) -- (0.4,0);
  \\foreach \\i in {0,1,2,3,4,5,6,7}
    \\draw[thick]
      ({0.4 + \\i*0.35},0) -- ({0.4 + \\i*0.35 + 0.175}, 0.3)
                           -- ({0.4 + \\i*0.35 + 0.35}, 0);
  \\draw[thick] ({0.4+8*0.35},0) -- ({0.4+8*0.35+0.4},0);
  % Vật m
  \\coordinate (block) at ({0.4+8*0.35+0.4},0);
  \\draw[thick, fill=orange!30]
    ($(block)+(-0.05,-0.4)$) rectangle ($(block)+(0.7,0.4)$);
  \\node at ($(block)+(0.32,0)$) {$m$};
  % Vị trí cân bằng x=0
  \\draw[dashed, gray] ($(block)+(0.32,-0.5)$) -- ($(block)+(0.32,-0.9)$);
  \\node[below] at ($(block)+(0.32,-0.9)$) {$x = 0$};
  % Lò xo tự nhiên chiều dài l₀
  \\draw[<->] (0,-0.6) -- ($(block)+(-0.05,-0.6)$)
    node[midway, below] {$l_0$};
\\end{tikzpicture}`,
      },
      {
        label: 'Đồ thị lực đàn hồi F = kx (Định luật Hooke)',
        description: 'Đường thẳng qua gốc, độ dốc = độ cứng k [N/m]',
        code: `\\begin{tikzpicture}[>=stealth, scale=1]
  \\draw[->, thick] (-0.3,0) -- (4.5,0) node[below] {$x\\ (\\text{m})$};
  \\draw[->, thick] (0,-0.3) -- (0,4.5) node[left] {$F\\ (\\text{N})$};
  \\node[below left] at (0,0) {$O$};
  % F = kx với k = 1 N/m (thay hệ số 1 bằng k thực tế)
  \\draw[very thick, blue] (0,0) -- (4,4)
    node[above right] {$F = kx$};
  % Điểm đặc biệt (x₁; F₁)
  \\draw[dashed] (2,0) node[below] {$x_1$} -- (2,2) -- (0,2) node[left] {$F_1$};
  \\filldraw[blue] (2,2) circle (2.5pt);
  % Tam giác độ dốc k
  \\draw[<->, gray] (2.5,0.2) -- (3.5,0.2);
  \\draw[<->, gray] (3.5,0.2) -- (3.5,1.2);
  \\node[gray, right] at (3.5,0.7) {$k$};
  % Vạch chia
  \\foreach \\x in {1,2,3,4}
    \\draw (\\x,1.5pt) -- (\\x,-1.5pt) node[below] {\\small\\x};
  \\foreach \\y in {1,2,3,4}
    \\draw (1.5pt,\\y) -- (-1.5pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đồ thị I-U của diode bán dẫn',
        description: 'Đường đặc trưng: chiều thuận bứt phá ở ~0.7V, chiều ngược gần 0',
        code: `\\begin{tikzpicture}[>=stealth, scale=1]
  % Hệ trục
  \\draw[->, thick] (-3,0) -- (3.5,0) node[below] {$U\\ (\\text{V})$};
  \\draw[->, thick] (0,-1.8) -- (0,4.5) node[left] {$I\\ (\\text{mA})$};
  \\node[below left] at (0,0) {$O$};
  % Chiều thuận: gần bằng 0 đến ~0.7V, sau đó tăng nhanh
  \\draw[very thick, blue] (0,0) -- (1.4,0);
  \\draw[very thick, blue, domain=1.4:2.2, smooth, samples=30]
    plot (\\x, {0.5*(\\x-1.4)^2*30});
  \\node[blue, right] at (2.1,3.5) {chiều thuận};
  % Ngưỡng dẫn điện
  \\draw[dashed, gray] (1.4,-0.3) node[below] {\\small$U_{ng}$} -- (1.4,0.1);
  % Chiều ngược: dòng bão hòa nhỏ
  \\draw[very thick, red] (-2.5,0) -- (-0.1,-0.3);
  \\node[red, left] at (-2.3,-0.6) {chiều ngược};
  % Breakdown (đánh thủng)
  \\draw[very thick, red] (-2.5,0) -- (-2.5,-1.5);
  \\draw[dashed, gray] (-2.5,0.2) node[above] {\\small$-U_{đt}$} -- (-2.5,0.1);
  % Vạch chia
  \\foreach \\x in {-2,-1,1,2,3}
    \\draw (\\x,1.5pt) -- (\\x,-1.5pt) node[below] {\\small\\x};
  \\foreach \\y in {1,2,3,4}
    \\draw (1.5pt,\\y) -- (-1.5pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Đường cong chuẩn độ acid-base (Hóa)',
        description: 'pH tăng dần khi thêm dung dịch kiềm, bước nhảy pH ở điểm tương đương',
        code: `\\begin{tikzpicture}[>=stealth, scale=0.85]
  \\draw[->, thick] (-0.3,0) -- (6.5,0) node[below] {$V_{NaOH}\\ (\\text{mL})$};
  \\draw[->, thick] (0,-0.3) -- (0,8.5) node[left] {pH};
  \\node[below left] at (0,0) {$O$};
  % Đường chuẩn độ (mô phỏng sigmoid)
  % Trước điểm tương đương: pH tăng chậm
  \\draw[very thick, blue, domain=0:3, smooth, samples=40]
    plot (\\x, {1.5 + 0.7*\\x});
  % Bước nhảy pH (vùng tương đương) — thêm thủ công 2 điểm
  \\draw[very thick, blue] (3, 3.6) -- (3.2, 3.8);
  \\draw[very thick, blue, domain=3.2:3.8, smooth, samples=20]
    plot (\\x, {4 + 5*(\\x-3.5)});
  \\draw[very thick, blue] (3.8, 6.5) -- (4, 6.8);
  % Sau điểm tương đương: pH tăng chậm
  \\draw[very thick, blue, domain=4:6, smooth, samples=30]
    plot (\\x, {6.8 + 0.4*(\\x-4)});
  % Điểm tương đương (V=3.5mL, pH=7)
  \\filldraw[red] (3.5,7) circle (2.5pt)
    node[right] {\\small điểm t.đ. $(3{,}5;\\ 7)$};
  \\draw[dashed, gray] (3.5,0) node[below] {\\small$V_{t\\!đ}$} -- (3.5,7);
  \\draw[dashed, gray] (0,7) node[left] {7} -- (3.5,7);
  % Vạch chia
  \\foreach \\x in {1,2,3,4,5,6}
    \\draw (\\x,1.5pt) -- (\\x,-1.5pt) node[below] {\\small\\x};
  \\foreach \\y in {2,4,6,8}
    \\draw (1.5pt,\\y) -- (-1.5pt,\\y) node[left] {\\small\\y};
\\end{tikzpicture}`,
      },
      {
        label: 'Phổ vạch phát xạ nguyên tử Hydro (Hóa / Lý)',
        description: 'Các dãy Lyman, Balmer, Paschen — minh họa bằng mũi tên mức năng lượng',
        code: `\\begin{tikzpicture}[>=stealth, scale=1]
  % Trục năng lượng
  \\draw[->, thick] (0,-0.3) -- (0,6.5) node[left] {$E$};
  \\node[left] at (-0.1,-0.2) {$-13{,}6$ eV};
  % Các mức năng lượng n=1..5
  \\foreach \\n/\\y/\\lbl in {
    1/0/{$n=1$\\;($E_1=-13{,}6$ eV)},
    2/2/{$n=2$},
    3/3.4/{$n=3$},
    4/4.1/{$n=4$},
    5/4.6/{$n=5$}}{
    \\draw[thick] (0.3,\\y) -- (4.5,\\y) node[right] {\\small\\lbl};
  }
  % Dãy Lyman (→ n=1): tím/UV — mũi tên màu tím
  \\foreach \\y in {2,3.4,4.1}{
    \\draw[->, very thick, violet!80] (1.2,\\y) -- (1.2,0.1);
  }
  \\node[violet, left] at (1.2,1) {\\small Lyman};
  % Dãy Balmer (→ n=2): khả kiến — mũi tên đỏ
  \\foreach \\y in {3.4,4.1,4.6}{
    \\draw[->, very thick, red] (2.5,\\y) -- (2.5,2.1);
  }
  \\node[red, left] at (2.5,2.7) {\\small Balmer};
  % Dãy Paschen (→ n=3): hồng ngoại
  \\foreach \\y in {4.1,4.6}{
    \\draw[->, very thick, orange] (3.6,\\y) -- (3.6,3.5);
  }
  \\node[orange, right] at (3.7,3.9) {\\small Paschen};
\\end{tikzpicture}`,
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
