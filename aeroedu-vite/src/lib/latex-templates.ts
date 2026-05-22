/**
 * Static LaTeX templates for teacher documents.
 * Used when creating new project or applying template in editor.
 */

export interface LatexTemplateOption {
  id: string;
  name: string;
  description?: string;
  body: string;
  /**
   * V2 (2026-05-22): metadata mới để hỗ trợ nhóm + AI guide
   */
  /** Nhóm template: 'exam' | 'lesson' | 'admin' | 'research' | 'personal' | 'business' */
  category?: 'exam' | 'lesson' | 'admin' | 'research' | 'personal' | 'business' | 'student';
  /** Đối tượng sử dụng: GV/HS/HC/Sinh viên/Doanh nhân/Tự do */
  audience?: string;
  /** Prompt mẫu để paste vào ChatGPT/Gemini/Claude → AI sinh nội dung
   *  hoàn chỉnh theo định dạng LaTeX dựa trên template này. */
  aiPrompt?: string;
  /** Tags cho search filter */
  tags?: string[];
}

export const LATEX_TEMPLATES: LatexTemplateOption[] = [
  {
    id: "bgd-2025-vatly",
    name: "⭐ Đề chuẩn Bộ GD&ĐT 2025 — Vật lí",
    description: "4 phần · 10 điểm · header 2 cột · mã đề · đánh số trang (giống đề minh hoạ)",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{siunitx}
\\usepackage{xcolor}
\\usepackage{tabularx}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\geometry{a4paper, total={170mm,257mm}, left=20mm, right=20mm, top=18mm, bottom=20mm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot[C]{\\thepage}
\\renewcommand{\\headrulewidth}{0pt}
\\titleformat{\\section}{\\Large\\bfseries\\MakeUppercase}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{14pt}{8pt}

\\begin{document}

% ── Header 2 cột ──
\\begin{tabularx}{\\linewidth}{@{}>{\\centering\\arraybackslash}X@{\\hspace{6mm}}>{\\centering\\arraybackslash}X@{}}
\\textbf{SỞ GD ĐT TP. HỒ CHÍ MINH} & \\textbf{KIỂM TRA CUỐI HỌC KỲ II} \\\\[2pt]
\\textbf{TRƯỜNG THPT PHƯỚC BỬU} & \\textbf{NĂM HỌC 2025 -- 2026} \\\\[2pt]
\\textbf{ĐỀ THI MINH HOẠ SỐ 2} & \\textbf{MÔN: VẬT LÍ 11} \\\\[2pt]
(\\textit{Đề thi có 03 trang}) & \\textit{Thời gian làm bài: 45 phút} \\\\
\\end{tabularx}

\\vspace{4pt}\\hrule\\vspace{8pt}

\\begin{tabularx}{\\linewidth}{@{}X@{\\hspace{6mm}}r@{}}
\\textbf{Họ, tên thí sinh:} \\dotfill\\hspace{0pt} &
\\fbox{\\rule{0pt}{12pt}\\textbf{~Mã đề: 456~}} \\\\[4pt]
\\textbf{Số báo danh:} \\dotfill & \\\\
\\end{tabularx}
\\vspace{6pt}

\\section*{Phần I. Câu trắc nghiệm nhiều lựa chọn (4,0 điểm)}
\\textit{Học sinh trả lời từ câu 1 đến câu 16. Mỗi câu đúng được 0,25 điểm.}

\\begin{enumerate}[leftmargin=1.15cm,label=\\textbf{Câu \\arabic*.},itemsep=6pt]
  \\item (Thay nội dung câu hỏi 1 tại đây.)

    \\textbf{A.}~Đáp án A. \\quad \\textbf{B.}~Đáp án B. \\quad \\textbf{C.}~Đáp án C. \\quad \\textbf{D.}~Đáp án D.
  \\item (Thay nội dung câu hỏi 2 tại đây.)

    \\textbf{A.}~Đáp án A. \\quad \\textbf{B.}~Đáp án B. \\quad \\textbf{C.}~Đáp án C. \\quad \\textbf{D.}~Đáp án D.
\\end{enumerate}

\\section*{Phần II. Trắc nghiệm đúng/sai (2,0 điểm)}
\\textit{Thí sinh chọn Đúng hoặc Sai cho mỗi ý a, b, c, d của các câu sau.}

\\textbf{Câu 1.} (Dẫn đề câu 1.)\\\\
a) Phát biểu a.\\\\
b) Phát biểu b.\\\\
c) Phát biểu c.\\\\
d) Phát biểu d.\\\\

\\textbf{Câu 2.} (Dẫn đề câu 2.)\\\\
a) Phát biểu a.\\\\
b) Phát biểu b.\\\\
c) Phát biểu c.\\\\
d) Phát biểu d.\\\\

\\section*{Phần III. Trả lời ngắn (2,0 điểm)}
\\textit{Mỗi câu trả lời đúng được 0,5 điểm.}

\\textbf{Câu 1:} (Nội dung câu hỏi.) Đáp số là bao nhiêu?\\\\[6pt]
\\textbf{Câu 2:} (Nội dung câu hỏi.) Đáp số là bao nhiêu?\\\\[6pt]
\\textbf{Câu 3:} (Nội dung câu hỏi.) Đáp số là bao nhiêu?\\\\[6pt]
\\textbf{Câu 4:} (Nội dung câu hỏi.) Đáp số là bao nhiêu?\\\\[6pt]

\\section*{Phần IV. Tự luận (2,0 điểm)}

\\textbf{Câu 1 (1,0 điểm):} (Dẫn đề câu tự luận 1.)\\\\
a) Ý thứ nhất.\\\\
b) Ý thứ hai.\\\\[30pt]

\\textbf{Câu 2 (1,0 điểm):} (Dẫn đề câu tự luận 2.)\\\\
a) Ý thứ nhất.\\\\
b) Ý thứ hai.\\\\[30pt]

\\vspace{8pt}\\hrule\\vspace{8pt}
\\begin{center}\\textit{\\large --- HẾT ---}\\end{center}

\\end{document}
`,
  },
  {
    id: "article-vi",
    name: "Article cơ bản (Tiếng Việt)",
    description: "Tài liệu article với babel vietnamese, amsmath, geometry, siunitx",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{siunitx}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\title{Tiêu đề tài liệu}
\\author{Giáo viên: (Tên bạn)}
\\date{}

\\begin{document}
\\maketitle

\\section*{Ghi chú}
Nội dung tài liệu của bạn. Công thức inline: $E = mc^2$. Công thức hiển thị:
\\[
  \\int_0^1 f(x)\\,dx = F(1) - F(0).
\\]

\\section{Nội dung}
Viết thêm tại đây.

\\end{document}
`,
  },
  {
    id: "exam-mcq",
    name: "Đề thi trắc nghiệm",
    description: "Cấu trúc đề thi trắc nghiệm 4 lựa chọn A, B, C, D",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath}
\\usepackage{geometry}
\\usepackage{enumitem}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}

\\title{ĐỀ THI TRẮC NGHIỆM}
\\author{Môn: --- \\quad Khối: --- \\quad Thời gian: --- phút}
\\date{}

\\begin{document}
\\maketitle
\\noindent\\textbf{Họ và tên:} \\underline{\\hspace{5cm}} \\quad \\textbf{SBD:} \\underline{\\hspace{3cm}}

\\bigskip
\\begin{enumerate}[left=0pt]
  \\item Câu 1. Nội dung câu hỏi?
  \\begin{enumerate}[label=\\Alph*.]
    \\item Đáp án A
    \\item Đáp án B
    \\item Đáp án C
    \\item Đáp án D
  \\end{enumerate}

  \\item Câu 2. Câu hỏi tiếp theo?
  \\begin{enumerate}[label=\\Alph*.]
    \\item Đáp án A
    \\item Đáp án B
    \\item Đáp án C
    \\item Đáp án D
  \\end{enumerate}
\\end{enumerate}

\\end{document}
`,
  },
  {
    id: "huong-dan-giai-vat-ly",
    name: "Hướng dẫn giải đề Vật lý",
    description: "Cấu trúc hướng dẫn giải đề (Phần I trắc nghiệm, II đúng/sai, III bài toán)",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{siunitx}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\title{Hướng dẫn giải -- Đề chính thức Vật lý \\\\ Mã đề --- -- Kỳ thi TN THPT ---\\\\[4pt]
\\small (Phần I, II, III -- lời giải chi tiết)}
\\author{Giáo viên: (Tên bạn)}
\\date{}

\\begin{document}
\\maketitle

\\section*{Ghi chú}
\\begin{itemize}
  \\item Tài liệu trình bày đầy đủ \\textbf{Phần I (trắc nghiệm)}, \\textbf{Phần II (đúng/sai)} và \\textbf{Phần III (bài toán)} với các bước giải.
  \\item Mọi số liệu và đề bài lấy theo đề gốc. Ghi rõ từng bước tính toán và cách làm tròn kết quả theo yêu cầu đề.
\\end{itemize}

\\hrule
\\section*{Đáp án tóm tắt}
\\begin{itemize}
  \\item \\textbf{Phần I:} (điền đáp án từng câu).
  \\item \\textbf{Phần II:} (mỗi câu có 4 phát biểu a,b,c,d; ghi Đ/S và lí giải).
  \\item \\textbf{Phần III:} (kết quả cuối cùng từng câu).
\\end{itemize}

\\hrule
\\section*{Phần I -- Trắc nghiệm}
\\begin{enumerate}[left=0pt]
  \\item (Nội dung và đáp án câu 1)
  \\item (Nội dung và đáp án câu 2)
\\end{enumerate}

\\hrule
\\section*{Phần II -- Trắc nghiệm đúng/sai}
\\subsection*{Câu 1}
(Phát biểu a--d và nhận xét Đ/S.)

\\subsection*{Câu 2}
(Phát biểu và giải thích.)

\\hrule
\\section*{Phần III -- Bài toán tính toán}
\\subsection*{Câu 1}
(Dữ liệu, công thức, thay số, kết quả.)

\\subsection*{Câu 2}
(Lời giải chi tiết.)

\\end{document}
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // 10 MẪU THÔNG DỤNG MỚI (5/2026) — bổ sung cho GV soạn nhanh
  // ═══════════════════════════════════════════════════════════════

  {
    id: "de-toan-thpt",
    name: "📐 Đề thi Toán THPT — TT22/2021",
    description: "4 phần chuẩn BGD&ĐT cho Toán: TN nhiều lựa chọn + Đúng/Sai + Trả lời ngắn + Tự luận",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

\\begin{center}
  \\begin{minipage}[t]{0.45\\textwidth}
    \\centering
    \\textbf{SỞ GD\\&ĐT ...} \\\\
    \\textbf{TRƯỜNG THPT ...} \\\\
    \\rule{5cm}{0.4pt}
  \\end{minipage}%
  \\begin{minipage}[t]{0.54\\textwidth}
    \\centering
    \\textbf{ĐỀ KIỂM TRA HỌC KỲ I} \\\\
    \\textbf{NĂM HỌC 2025 -- 2026} \\\\
    \\textbf{MÔN: TOÁN LỚP 11} \\\\
    \\textit{Thời gian làm bài: 90 phút}
  \\end{minipage}
\\end{center}
\\rule{\\textwidth}{0.4pt}

\\section*{PHẦN I (3,0 điểm). Trắc nghiệm nhiều phương án lựa chọn}
\\textit{Học sinh trả lời từ câu 1 đến câu 12.}

\\textbf{Câu 1.} Cho hàm số $f(x) = x^2 - 4x + 3$. Giá trị nhỏ nhất của $f$ trên $\\mathbb{R}$ là:
\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=2cm]
  \\item $-1$    \\item $0$    \\item $1$    \\item $3$
\\end{enumerate}

\\textbf{Câu 2.} Tập nghiệm của phương trình $\\sin x = \\dfrac{1}{2}$ trên $[0, 2\\pi]$ là:
\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=2cm]
  \\item $\\left\\{\\dfrac{\\pi}{6}\\right\\}$
  \\item $\\left\\{\\dfrac{\\pi}{6}, \\dfrac{5\\pi}{6}\\right\\}$
  \\item $\\left\\{\\dfrac{\\pi}{3}, \\dfrac{2\\pi}{3}\\right\\}$
  \\item $\\left\\{\\dfrac{\\pi}{4}\\right\\}$
\\end{enumerate}

\\section*{PHẦN II (2,0 điểm). Trắc nghiệm Đúng/Sai}
\\textit{Mỗi câu có 4 ý a, b, c, d. Chọn Đúng hoặc Sai cho từng ý.}

\\textbf{Câu 1.} Cho parabol $(P): y = x^2 - 2x - 3$.
\\begin{enumerate}[label=\\textbf{\\alph*)}, itemsep=2pt, leftmargin=1cm]
  \\item Đỉnh của $(P)$ có toạ độ $(1, -4)$.
  \\item Trục đối xứng của $(P)$ là $x = 1$.
  \\item $(P)$ cắt trục hoành tại 2 điểm có hoành độ $-1$ và $3$.
  \\item $(P)$ đi qua $M(2, -3)$.
\\end{enumerate}

\\section*{PHẦN III (2,0 điểm). Trả lời ngắn}

\\textbf{Câu 1.} Tổng các nghiệm của $x^2 - 5x + 6 = 0$ bằng \\underline{\\hspace{2cm}}.

\\textbf{Câu 2.} Giá trị $\\lim_{x \\to 2} \\dfrac{x^2 - 4}{x - 2}$ bằng \\underline{\\hspace{2cm}}.

\\section*{PHẦN IV (3,0 điểm). Tự luận}

\\textbf{Bài 1.} (1,5 điểm) Giải phương trình $x^2 - 5x + 6 = 0$.

\\textbf{Bài 2.} (1,5 điểm) Tính diện tích tam giác $ABC$ biết $AB = 5$, $AC = 8$, $\\widehat{BAC} = 60^\\circ$.

\\rule{\\textwidth}{0.4pt}
\\begin{center} \\textit{--- HẾT ---} \\end{center}

\\end{document}
`,
  },

  {
    id: "de-hoa-thpt",
    name: "🧪 Đề thi Hoá học THPT",
    description: "Đề Hoá có công thức phân tử, phản ứng (mhchem), bảng tuần hoàn",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage[version=4]{mhchem}   % Cho công thức hoá học
\\usepackage{geometry}
\\usepackage{enumitem}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

\\begin{center}
  \\textbf{\\Large ĐỀ KIỂM TRA HOÁ HỌC LỚP 12} \\\\
  \\textit{Thời gian: 50 phút — Năm học 2025-2026}
\\end{center}
\\rule{\\textwidth}{0.4pt}

\\section*{PHẦN TRẮC NGHIỆM}

\\textbf{Câu 1.} Công thức phân tử của axit sunfuric là:
\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=2cm]
  \\item \\ce{H2SO3}
  \\item \\ce{H2SO4}
  \\item \\ce{HCl}
  \\item \\ce{HNO3}
\\end{enumerate}

\\textbf{Câu 2.} Cho phản ứng: \\ce{Fe + H2SO4 -> FeSO4 + H2 ^}.
Khi cho 5,6 g \\ce{Fe} tác dụng với dung dịch \\ce{H2SO4} loãng dư, thể tích khí
\\ce{H2} (đktc) thu được là:
\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=2cm]
  \\item 1,12 L
  \\item 2,24 L
  \\item 3,36 L
  \\item 4,48 L
\\end{enumerate}

\\section*{PHẦN TỰ LUẬN}

\\textbf{Bài 1.} Cân bằng phương trình hoá học sau:
\\begin{enumerate}[label=\\alph*),itemsep=4pt]
  \\item \\ce{KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O}
  \\item \\ce{Cu + HNO3 -> Cu(NO3)2 + NO2 + H2O}
  \\item \\ce{Al + H2SO4 -> Al2(SO4)3 + SO2 + H2O}
\\end{enumerate}

\\textbf{Bài 2.} Hoà tan hoàn toàn 8 g hỗn hợp gồm \\ce{Mg} và \\ce{MgO} vào dung
dịch \\ce{HCl} dư thu được 2,24 L khí (đktc). Tính \\% khối lượng mỗi chất trong
hỗn hợp ban đầu.

\\rule{\\textwidth}{0.4pt}
\\begin{center} \\textit{--- HẾT ---} \\end{center}

\\end{document}
`,
  },

  {
    id: "bai-giang-co-ban",
    name: "📖 Bài giảng cơ bản (lý thuyết + ví dụ)",
    description: "Khung bài giảng: Mục tiêu, Lý thuyết, Ví dụ minh hoạ, Bài tập về nhà",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage[most]{tcolorbox}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

\\begin{center}
  \\textbf{\\Large BÀI GIẢNG: PHƯƠNG TRÌNH BẬC HAI MỘT ẨN} \\\\
  \\textit{Lớp 9 — Tiết 5}
\\end{center}
\\rule{\\textwidth}{0.4pt}

\\section*{🎯 Mục tiêu bài học}
\\begin{itemize}
  \\item Hiểu định nghĩa phương trình bậc hai một ẩn.
  \\item Áp dụng được công thức nghiệm để giải phương trình.
  \\item Giải được các bài toán thực tế liên quan.
\\end{itemize}

\\section*{📚 1. Lý thuyết}

\\textbf{Định nghĩa:} Phương trình bậc hai một ẩn là phương trình có dạng:
\\[ ax^2 + bx + c = 0 \\quad (a \\neq 0) \\]

\\textbf{Công thức nghiệm:}
\\begin{itemize}
  \\item Tính \\textbf{biệt thức:} $\\Delta = b^2 - 4ac$
  \\item Nếu $\\Delta > 0$: phương trình có 2 nghiệm phân biệt
  \\[ x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} \\]
  \\item Nếu $\\Delta = 0$: phương trình có nghiệm kép $x = -\\dfrac{b}{2a}$
  \\item Nếu $\\Delta < 0$: phương trình vô nghiệm.
\\end{itemize}

\\section*{✏️ 2. Ví dụ minh hoạ}

\\begin{tcolorbox}[colback=blue!5,colframe=blue!50,title=Ví dụ 1]
Giải phương trình $x^2 - 5x + 6 = 0$.

\\textbf{Lời giải.} Ta có $a=1, b=-5, c=6$.
\\[ \\Delta = (-5)^2 - 4 \\cdot 1 \\cdot 6 = 25 - 24 = 1 > 0 \\]
Phương trình có 2 nghiệm phân biệt:
\\[ x_1 = \\frac{5+1}{2} = 3, \\quad x_2 = \\frac{5-1}{2} = 2 \\]
Vậy $S = \\{2, 3\\}$.
\\end{tcolorbox}

\\begin{tcolorbox}[colback=green!5,colframe=green!50,title=Ví dụ 2]
Giải phương trình $4x^2 - 12x + 9 = 0$.

\\textbf{Lời giải.} $\\Delta = 144 - 144 = 0$ → nghiệm kép $x = \\dfrac{12}{8} = \\dfrac{3}{2}$.
\\end{tcolorbox}

\\section*{📝 3. Bài tập về nhà}

\\begin{enumerate}[label=\\textbf{Bài \\arabic*.}]
  \\item Giải các phương trình:
    \\begin{enumerate}[label=\\alph*),itemsep=2pt]
      \\item $x^2 - 7x + 10 = 0$
      \\item $2x^2 + 3x - 2 = 0$
      \\item $x^2 - 4x + 4 = 0$
    \\end{enumerate}
  \\item Tìm $m$ để phương trình $x^2 - 2(m+1)x + m^2 - 1 = 0$ có nghiệm kép.
\\end{enumerate}

\\end{document}
`,
  },

  {
    id: "bai-tap-tu-luyen",
    name: "🎯 Phiếu bài tập tự luyện",
    description: "Phiếu bài tập đơn giản: 1 cột câu hỏi, có chỗ trống điền đáp án",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{8pt}

\\begin{document}

\\begin{center}
  \\textbf{\\Large PHIẾU BÀI TẬP TỰ LUYỆN — TUẦN 1} \\\\
  \\textit{Môn: Toán 9 — GVCN: ...}
\\end{center}

\\vspace{6pt}
\\textbf{Họ và tên:} \\underline{\\hspace{6cm}} \\hfill \\textbf{Lớp:} \\underline{\\hspace{2cm}}

\\rule{\\textwidth}{0.4pt}

\\begin{enumerate}[label=\\textbf{Bài \\arabic*.}, leftmargin=1.2cm]

\\item Tính giá trị các biểu thức sau:
\\begin{enumerate}[label=\\alph*),itemsep=2pt]
  \\item $A = \\sqrt{16} + \\sqrt{25}$
  \\item $B = \\sqrt{36} \\cdot \\sqrt{49}$
  \\item $C = \\sqrt{(-3)^2} - \\sqrt{(-5)^2}$
\\end{enumerate}

\\textbf{Đáp số:} \\underline{\\hspace{12cm}}

\\vspace{4pt}

\\item Giải phương trình $3x - 7 = 2x + 5$.

\\textbf{Đáp số:} $x = $ \\underline{\\hspace{4cm}}

\\vspace{4pt}

\\item So sánh $\\sqrt{17}$ và $4$.

\\textbf{Trả lời:} \\underline{\\hspace{12cm}}

\\vspace{4pt}

\\item Cho hàm số $y = 2x + 1$. Tính:
\\begin{enumerate}[label=\\alph*),itemsep=2pt]
  \\item $y$ khi $x = 3$: \\underline{\\hspace{4cm}}
  \\item $x$ khi $y = 7$: \\underline{\\hspace{4cm}}
\\end{enumerate}

\\item Một hình chữ nhật có chu vi $80$ cm và chiều dài hơn chiều rộng $10$ cm.
Tính diện tích hình chữ nhật.

\\textbf{Đáp số:} \\underline{\\hspace{6cm}} cm$^2$

\\end{enumerate}

\\vspace{12pt}
\\rule{\\textwidth}{0.4pt}
\\textit{Học sinh nộp bài vào đầu tiết tuần sau. Chúc các em làm bài tốt!}

\\end{document}
`,
  },

  {
    id: "bao-cao-thinh-giang",
    name: "📋 Báo cáo thực hành / thí nghiệm",
    description: "Mẫu báo cáo thí nghiệm có mục đích, dụng cụ, tiến trình, kết quả, kết luận",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{graphicx}
\\usepackage{array}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

\\begin{center}
  \\textbf{\\Large BÁO CÁO THỰC HÀNH SỐ 1} \\\\
  \\textbf{ĐO GIA TỐC RƠI TỰ DO}
\\end{center}

\\begin{tabular}{|p{4cm}|p{10cm}|}
  \\hline
  \\textbf{Họ và tên} & ... \\\\
  \\hline
  \\textbf{Lớp} & ... \\\\
  \\hline
  \\textbf{Nhóm} & ... \\\\
  \\hline
  \\textbf{Ngày làm} & .../.../2026 \\\\
  \\hline
\\end{tabular}

\\section*{I. Mục đích}
Đo gia tốc rơi tự do $g$ tại nơi làm thí nghiệm bằng phương pháp đo
thời gian rơi và quãng đường rơi.

\\section*{II. Dụng cụ}
\\begin{enumerate}[label=\\arabic*.,itemsep=2pt]
  \\item Bộ thí nghiệm rơi tự do (cần nam châm điện + sensor).
  \\item Vật rơi (viên bi sắt).
  \\item Thước dây 1\\,m, đồng hồ bấm giây điện tử.
  \\item Giá đỡ.
\\end{enumerate}

\\section*{III. Tiến trình}
\\begin{enumerate}[label=\\textbf{Bước \\arabic*.},itemsep=4pt]
  \\item Lắp ráp dụng cụ theo sơ đồ.
  \\item Đặt quãng đường rơi $s = 1\\,$m, đo thời gian rơi $t$.
  \\item Lặp lại 5 lần, ghi vào bảng.
\\end{enumerate}

\\section*{IV. Kết quả}
\\begin{center}
\\begin{tabular}{|c|c|c|c|}
  \\hline
  Lần đo & $s$ (m) & $t$ (s) & $g = 2s/t^2$ (m/s$^2$) \\\\
  \\hline
  1 & 1.000 & 0.451 & 9.83 \\\\
  2 & 1.000 & 0.452 & 9.79 \\\\
  3 & 1.000 & 0.450 & 9.88 \\\\
  4 & 1.000 & 0.453 & 9.74 \\\\
  5 & 1.000 & 0.451 & 9.83 \\\\
  \\hline
  \\textbf{TB} & & & \\textbf{9.81} \\\\
  \\hline
\\end{tabular}
\\end{center}

\\section*{V. Tính sai số}
\\[ \\bar{g} = \\frac{1}{5}\\sum_{i=1}^{5} g_i = 9.81 \\text{ m/s}^2 \\]
\\[ \\Delta g = \\sqrt{\\frac{\\sum(g_i - \\bar{g})^2}{n(n-1)}} \\approx 0.025 \\text{ m/s}^2 \\]

\\section*{VI. Kết luận}
Gia tốc rơi tự do đo được: $g = (9.81 \\pm 0.03)$ m/s$^2$.

So với giá trị tham chiếu $g = 9.80665$ m/s$^2$, sai số tương đối khoảng
$0.05\\%$ — kết quả rất chính xác.

\\end{document}
`,
  },

  {
    id: "thu-moi-phu-huynh",
    name: "✉️ Thư mời phụ huynh / Thông báo (NĐ 30)",
    description: "Mẫu thư mời họp phụ huynh chuẩn — có tiêu đề, nội dung, lịch họp, ký tên. Định dạng theo Nghị định 30/2020/NĐ-CP (lề 2/2/3/2cm, giãn dòng 1.5, justify).",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry}
\\usepackage{setspace}
% Định dạng theo Nghị định 30/2020/NĐ-CP — văn bản hành chính:
% Lề: trên 2cm, dưới 2cm, trái 3cm, phải 2cm. Giãn dòng 1.5 lines.
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{1cm}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\begin{center}
  \\textbf{TRƯỜNG ...} \\\\
  \\textbf{Số: 001/TB-NHT} \\\\
  \\rule{4cm}{0.4pt}

  \\vspace{2pt}
  \\textbf{CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM} \\\\
  \\textbf{Độc lập -- Tự do -- Hạnh phúc} \\\\
  \\rule{6cm}{0.4pt}
\\end{center}

\\vspace{8pt}
\\hfill \\textit{TP. Hồ Chí Minh, ngày 15 tháng 5 năm 2026}

\\vspace{18pt}
\\begin{center}
  \\textbf{\\Large THƯ MỜI HỌP PHỤ HUYNH HỌC SINH}
\\end{center}

\\vspace{6pt}
\\textit{Kính gửi:} Quý phụ huynh học sinh lớp \\textbf{11A2}.

Nhằm thông báo về tình hình học tập, rèn luyện và kết quả kiểm tra giữa
học kỳ II năm học 2025-2026 của các em, đồng thời trao đổi các vấn đề
cần phối hợp giữa nhà trường và gia đình, Ban Giám hiệu nhà trường trân
trọng kính mời Quý phụ huynh đến tham dự buổi họp:

\\vspace{4pt}
\\begin{itemize}
  \\item \\textbf{Thời gian:} 7h30 -- 11h00, Chủ Nhật ngày 25/05/2026
  \\item \\textbf{Địa điểm:} Phòng 11A2, Tòa nhà A, Trường ...
  \\item \\textbf{Nội dung:} Tổng kết học kỳ II + kế hoạch hè 2026
\\end{itemize}

Sự có mặt của Quý phụ huynh là sự động viên to lớn cho thầy cô và các em
học sinh. Rất mong Quý phụ huynh sắp xếp công việc để tham dự đầy đủ.

Trân trọng cảm ơn!

\\vspace{20pt}
\\hfill \\begin{minipage}{6cm}
  \\centering
  \\textbf{T/M BAN GIÁM HIỆU} \\\\
  \\textbf{HIỆU TRƯỞNG}

  \\vspace{36pt}
  \\textbf{Nguyễn Văn A}
\\end{minipage}

\\end{document}
`,
  },

  {
    id: "danh-sach-lop",
    name: "👥 Danh sách lớp / Bảng điểm",
    description: "Mẫu bảng danh sách HS có STT, họ tên, ngày sinh, điểm các môn",
    body: `\\documentclass[12pt,a4paper,landscape]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry}
\\usepackage{array}
\\usepackage{xcolor}
\\usepackage{colortbl}
\\geometry{top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}
\\definecolor{headblue}{HTML}{2563EB}
\\definecolor{stripe}{HTML}{F1F5F9}

\\begin{document}

\\begin{center}
  \\textbf{\\Large DANH SÁCH LỚP 11A2 — HỌC KỲ II 2025-2026} \\\\
  \\textit{Trường THPT ... — GVCN: ...}
\\end{center}

\\vspace{8pt}

\\begin{center}
\\renewcommand{\\arraystretch}{1.3}
\\begin{tabular}{|>{\\centering\\arraybackslash}m{1cm}|m{4cm}|c|c|c|c|c|c|c|}
  \\hline
  \\rowcolor{headblue}
  \\textcolor{white}{\\textbf{STT}} &
  \\textcolor{white}{\\textbf{Họ và tên}} &
  \\textcolor{white}{\\textbf{Ngày sinh}} &
  \\textcolor{white}{\\textbf{Toán}} &
  \\textcolor{white}{\\textbf{Lý}} &
  \\textcolor{white}{\\textbf{Hoá}} &
  \\textcolor{white}{\\textbf{Văn}} &
  \\textcolor{white}{\\textbf{TB}} &
  \\textcolor{white}{\\textbf{Hạnh kiểm}} \\\\
  \\hline
  1 & Nguyễn Minh Anh   & 12/03/2008 & 9.0 & 8.5 & 8.0 & 8.5 & \\textbf{8.5} & Tốt \\\\ \\hline
  \\rowcolor{stripe}
  2 & Trần Đức Bảo      & 25/06/2008 & 7.5 & 7.0 & 8.5 & 7.0 & \\textbf{7.5} & Khá \\\\ \\hline
  3 & Lê Thị Cẩm        & 10/11/2008 & 8.0 & 9.0 & 8.5 & 9.0 & \\textbf{8.6} & Tốt \\\\ \\hline
  \\rowcolor{stripe}
  4 & Phạm Hoàng Dũng   & 03/02/2008 & 6.5 & 6.0 & 7.0 & 7.5 & \\textbf{6.8} & Khá \\\\ \\hline
  5 & Hoàng Thúy Duyên  & 18/09/2008 & 9.5 & 9.0 & 9.5 & 8.5 & \\textbf{9.1} & Tốt \\\\ \\hline
  % --- Thêm dòng tại đây ---
\\end{tabular}
\\end{center}

\\vspace{12pt}
\\hfill \\begin{minipage}{6cm}
  \\centering
  \\textit{Ngày ... tháng ... năm 2026} \\\\
  \\textbf{GIÁO VIÊN CHỦ NHIỆM}

  \\vspace{36pt}
  \\textbf{...}
\\end{minipage}

\\end{document}
`,
  },

  {
    id: "thoi-khoa-bieu",
    name: "📅 Thời khoá biểu lớp",
    description: "Bảng thời khoá biểu 6 tiết × 6 ngày (T2-T7), có màu phân biệt môn học",
    body: `\\documentclass[12pt,a4paper,landscape]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry}
\\usepackage{array}
\\usepackage{xcolor}
\\usepackage{colortbl}
\\geometry{top=1.5cm,bottom=1.5cm,left=1cm,right=1cm}
\\setlength{\\parindent}{0pt}

\\definecolor{toan}{HTML}{DBEAFE}
\\definecolor{ly}{HTML}{FEE2E2}
\\definecolor{hoa}{HTML}{D1FAE5}
\\definecolor{van}{HTML}{FEF3C7}
\\definecolor{anh}{HTML}{E0E7FF}
\\definecolor{su}{HTML}{F3E8FF}

\\begin{document}

\\begin{center}
  \\textbf{\\Large THỜI KHOÁ BIỂU LỚP 11A2} \\\\
  \\textit{Học kỳ II — Năm học 2025-2026 (áp dụng từ 04/03/2026)}
\\end{center}

\\vspace{8pt}
\\renewcommand{\\arraystretch}{2.2}

\\begin{center}
\\begin{tabular}{|c|c|c|c|c|c|c|}
  \\hline
  \\textbf{Tiết} & \\textbf{Thứ 2} & \\textbf{Thứ 3} & \\textbf{Thứ 4} &
  \\textbf{Thứ 5} & \\textbf{Thứ 6} & \\textbf{Thứ 7} \\\\
  \\hline

  \\textbf{1} \\newline 7h00-7h45 &
  \\cellcolor{toan}Toán &
  \\cellcolor{ly}Vật lý &
  \\cellcolor{hoa}Hoá học &
  \\cellcolor{van}Ngữ văn &
  \\cellcolor{anh}Tiếng Anh &
  \\cellcolor{su}Lịch sử \\\\
  \\hline

  \\textbf{2} \\newline 7h50-8h35 &
  \\cellcolor{toan}Toán &
  \\cellcolor{ly}Vật lý &
  \\cellcolor{hoa}Hoá học &
  \\cellcolor{van}Ngữ văn &
  \\cellcolor{anh}Tiếng Anh &
  \\cellcolor{su}Lịch sử \\\\
  \\hline

  \\textbf{3} \\newline 8h45-9h30 &
  Tin học & GDCD & Sinh học & Toán & Vật lý & Hoá học \\\\
  \\hline

  \\textbf{4} \\newline 9h35-10h20 &
  Tin học & GDCD & Sinh học & Toán & Vật lý & Hoá học \\\\
  \\hline

  \\textbf{5} \\newline 10h30-11h15 &
  Thể dục & Địa lý & Tiếng Anh & Sinh hoạt & Công nghệ & --- \\\\
  \\hline

  \\textbf{6} \\newline 11h20-12h05 &
  Thể dục & Địa lý & Tiếng Anh & Sinh hoạt & Công nghệ & --- \\\\
  \\hline
\\end{tabular}
\\end{center}

\\vspace{8pt}
\\textit{Ghi chú: Học sinh có mặt trước 6h55. Vệ sinh trực nhật theo phân công của lớp trưởng.}

\\end{document}
`,
  },

  {
    id: "de-trac-nghiem-100-cau",
    name: "🔢 Đề trắc nghiệm 100% (50 câu)",
    description: "Đề thi 50 câu trắc nghiệm 4 lựa chọn, dùng multicols cho 2 cột tiết kiệm giấy",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{multicol}
\\geometry{top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

\\setlist[enumerate]{itemsep=0pt, parsep=2pt}

\\begin{document}

\\begin{center}
  \\textbf{\\Large ĐỀ KIỂM TRA TRẮC NGHIỆM} \\\\
  \\textbf{50 CÂU — 60 PHÚT — MÔN TIẾNG ANH 12} \\\\
  \\textit{Mã đề: 123}
\\end{center}

\\textbf{Họ và tên:} \\dotfill \\hspace{6pt} \\textbf{SBD:} \\dotfill
\\hrule
\\vspace{6pt}

\\begin{multicols}{2}
\\begin{enumerate}[label=\\textbf{Câu \\arabic*.}, leftmargin=1.2cm]

\\item Choose the word whose underlined part is pronounced differently:
\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=1cm]
  \\item w\\underline{a}lk
  \\item t\\underline{a}lk
  \\item h\\underline{a}ll
  \\item b\\underline{a}ck
\\end{enumerate}

\\item Choose the best answer:
"\\,If I \\underline{\\hspace{1.5cm}} you, I would study harder."
\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=1cm]
  \\item am   \\item was   \\item were   \\item be
\\end{enumerate}

\\item She \\underline{\\hspace{1.5cm}} English for 5 years.
\\begin{enumerate}[label=\\textbf{\\Alph*.}, itemsep=0pt, leftmargin=1cm]
  \\item learns
  \\item is learning
  \\item has learned
  \\item learned
\\end{enumerate}

% ... Thêm các câu khác từ Câu 4 đến Câu 50 ở đây ...

\\end{enumerate}
\\end{multicols}

\\vspace{8pt}
\\hrule
\\begin{center} \\textit{--- HẾT ---} \\end{center}

\\end{document}
`,
  },

  {
    id: "ke-hoach-bai-day",
    name: "📋 Kế hoạch bài dạy (Giáo án — NĐ 30)",
    description: "Mẫu giáo án chuẩn BGD&ĐT: thông tin tiết học, mục tiêu, hoạt động dạy-học, đánh giá. Định dạng theo Nghị định 30/2020/NĐ-CP (lề 2/2/3/2cm, giãn dòng 1.5).",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry}
\\usepackage{array}
\\usepackage{enumitem}
% Nghị định 30/2020/NĐ-CP — lề chuẩn văn bản hành chính:
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

\\begin{center}
  \\textbf{\\Large KẾ HOẠCH BÀI DẠY} \\\\
  \\textbf{(Giáo án)}
\\end{center}

\\vspace{4pt}
\\begin{tabular}{|p{4cm}|p{11cm}|}
  \\hline
  \\textbf{Tên bài}       & Phương trình bậc hai một ẩn \\\\
  \\hline
  \\textbf{Môn / Lớp}     & Toán / Lớp 9 \\\\
  \\hline
  \\textbf{Tiết PPCT}     & 51 -- 52 (2 tiết) \\\\
  \\hline
  \\textbf{Ngày dạy}      & 20/05/2026 \\\\
  \\hline
  \\textbf{Giáo viên}     & ... \\\\
  \\hline
\\end{tabular}

\\section*{I. MỤC TIÊU BÀI HỌC}

\\textbf{1. Kiến thức:}
\\begin{itemize}
  \\item Hiểu được định nghĩa phương trình bậc hai một ẩn.
  \\item Nắm được công thức nghiệm và cách giải.
\\end{itemize}

\\textbf{2. Kỹ năng:}
\\begin{itemize}
  \\item Giải được phương trình bậc hai bằng công thức nghiệm.
  \\item Áp dụng vào bài toán thực tế.
\\end{itemize}

\\textbf{3. Thái độ:}
\\begin{itemize}
  \\item Cẩn thận trong tính toán, hợp tác trong nhóm.
\\end{itemize}

\\textbf{4. Năng lực hình thành:}
\\begin{itemize}
  \\item Tư duy logic, tính toán, giải quyết vấn đề.
\\end{itemize}

\\section*{II. CHUẨN BỊ}
\\textbf{Giáo viên:} SGK, máy chiếu, phiếu bài tập. \\\\
\\textbf{Học sinh:} SGK, vở ghi, máy tính casio.

\\section*{III. HOẠT ĐỘNG DẠY HỌC}

\\begin{tabular}{|p{1cm}|p{4cm}|p{6cm}|p{4cm}|}
  \\hline
  \\textbf{TG} & \\textbf{Hoạt động GV} & \\textbf{Hoạt động HS} & \\textbf{Nội dung ghi bảng} \\\\
  \\hline
  5' & \\textit{Khởi động:} Đặt câu hỏi nhắc lại PT bậc 1 đã học &
        Trả lời cá nhân & — \\\\
  \\hline
  20' & \\textit{Hình thành kiến thức:} Trình bày dạng tổng quát + công thức nghiệm &
        Ghi chép, đặt câu hỏi & I. Định nghĩa \\newline II. Công thức nghiệm \\\\
  \\hline
  15' & \\textit{Luyện tập:} Yêu cầu HS giải VD 1, 2 trên bảng &
        Lên bảng làm, các em khác làm vào vở & VD 1, VD 2 \\\\
  \\hline
  5'  & \\textit{Củng cố:} Yêu cầu HS phát biểu lại công thức &
        Phát biểu cá nhân & — \\\\
  \\hline
\\end{tabular}

\\section*{IV. ĐÁNH GIÁ}
\\begin{itemize}
  \\item HS làm được bài tập 1, 2 trang 45 SGK.
  \\item HS phát biểu được công thức nghiệm và biệt thức $\\Delta$.
\\end{itemize}

\\section*{V. DẶN DÒ}
Học bài + làm bài tập 3, 4, 5 trang 46 SGK. Đọc trước bài "Định lý Viète".

\\end{document}
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // V2 (2026-05-22): 6 templates MỚI cho văn bản phổ biến + AI prompts
  // Các loại văn bản giáo viên/hành chính/sinh viên/cá nhân thường dùng,
  // kèm prompt để paste vào ChatGPT/Gemini/Claude sinh nội dung tự động.
  // ═══════════════════════════════════════════════════════════════
  {
    id: "don-xin-nghi-phep",
    name: "📝 Đơn xin nghỉ phép (NĐ 30/2020)",
    description: "Đơn xin nghỉ phép theo Nghị định 30 — đầy đủ Quốc hiệu, tiêu ngữ, lề chuẩn 2/2/3/2cm",
    category: "admin",
    audience: "GV / NV hành chính",
    tags: ["đơn từ", "hành chính", "nghỉ phép"],
    aiPrompt: `Hãy viết đơn xin nghỉ phép bằng LaTeX dùng template article tiếng Việt (babel vietnamese), tuân thủ Nghị định 30/2020/NĐ-CP.

THÔNG TIN CỦA TÔI (thay đổi cho phù hợp):
- Họ tên: [Tên đầy đủ]
- Chức vụ: [VD: Giáo viên Toán]
- Đơn vị: [VD: Tổ Toán – Tin, Trường THPT XYZ]
- Lý do: [VD: ốm, đám cưới em ruột, hiếu hỉ...]
- Thời gian: từ DD/MM/YYYY đến DD/MM/YYYY (tổng X ngày)
- Người thay thế: [Tên đồng nghiệp đã sắp xếp dạy thay nếu là GV]

YÊU CẦU:
1. Quốc hiệu, Tiêu ngữ giữa trang
2. Số:.../ĐXNP-[viết tắt đơn vị] (tự tạo)
3. Tên đơn vị cấp trên — Đơn vị trực tiếp ở góc trái
4. Địa danh + ngày tháng ở góc phải
5. Tên đơn IN HOA in đậm căn giữa: "ĐƠN XIN NGHỈ PHÉP"
6. Kính gửi: [BGH/Hiệu trưởng/Trưởng phòng]
7. Phần thân ngắn gọn, lịch sự, có "Xin chân thành cảm ơn"
8. Ký tên (chừa 3-5 dòng trống), Họ tên ghi rõ
9. Dùng \\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm} và \\linespread{1.5}

XUẤT RA: 1 đoạn code LaTeX hoàn chỉnh bắt đầu \\documentclass và kết thúc \\end{document}, KHÔNG kèm giải thích.`,
    body: `\\documentclass[13pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry}
% Nghị định 30/2020/NĐ-CP — lề chuẩn 2/2/3/2cm
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{1.27cm}
\\setlength{\\parskip}{4pt}

\\begin{document}

% Quốc hiệu — Tiêu ngữ
\\begin{center}
  \\textbf{CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM}\\\\
  \\textbf{Độc lập -- Tự do -- Hạnh phúc}\\\\
  \\rule{4cm}{0.4pt}
\\end{center}

% Số văn bản + địa danh
\\noindent
\\begin{minipage}[t]{0.5\\textwidth}
\\textbf{TRƯỜNG THPT [TÊN TRƯỜNG]}\\\\
\\textbf{TỔ [TÊN TỔ CHUYÊN MÔN]}\\\\
\\textit{Số:} ......../ĐXNP-[VIẾT TẮT]
\\end{minipage}%
\\begin{minipage}[t]{0.5\\textwidth}
\\raggedleft
\\textit{[Địa danh], ngày .... tháng .... năm 20....}
\\end{minipage}

\\vspace{12pt}

\\begin{center}
  \\Large\\textbf{ĐƠN XIN NGHỈ PHÉP}
\\end{center}

\\vspace{6pt}
\\noindent\\textbf{Kính gửi:} Ban Giám hiệu Trường THPT [Tên trường].

\\medskip

Tôi tên là: [Họ và tên đầy đủ]\\\\
Chức vụ: [Giáo viên môn ...... / Nhân viên ......]\\\\
Đơn vị công tác: [Tên tổ / phòng ban]

\\medskip

Nay tôi làm đơn này kính xin Ban Giám hiệu cho tôi được nghỉ phép từ ngày [DD/MM/YYYY] đến hết ngày [DD/MM/YYYY], tổng cộng [....] ngày.

\\medskip

\\textbf{Lý do:} [Nêu lý do ngắn gọn, lịch sự — ốm, việc gia đình hệ trọng, hiếu hỉ...]

\\medskip

Trong thời gian tôi nghỉ, tôi đã sắp xếp đồng chí [Tên đồng nghiệp] dạy thay các tiết của tôi (\\textit{nếu là GV}) hoặc bàn giao công việc cho đồng chí [Tên người nhận bàn giao] (\\textit{nếu là NV}).

\\medskip

Tôi xin cam đoan trở lại làm việc đúng thời hạn và hoàn thành tốt công việc được giao.

Tôi xin chân thành cảm ơn!

\\vspace{20pt}

\\begin{minipage}[t]{0.5\\textwidth}
\\centering
\\textit{Ý kiến của Tổ trưởng}\\\\[60pt]
[Họ tên]
\\end{minipage}%
\\begin{minipage}[t]{0.5\\textwidth}
\\centering
\\textbf{Người làm đơn}\\\\
\\textit{(Ký, ghi rõ họ tên)}\\\\[60pt]
[HỌ TÊN ĐẦY ĐỦ]
\\end{minipage}

\\end{document}
`,
  },
  {
    id: "bao-cao-skkn",
    name: "🏆 Sáng kiến kinh nghiệm (SKKN)",
    description: "Mẫu SKKN chuẩn cho GV — 5 phần: Lý do, Thực trạng, Giải pháp, Hiệu quả, Kết luận",
    category: "research",
    audience: "GV phổ thông",
    tags: ["SKKN", "nghiên cứu", "GV"],
    aiPrompt: `Hãy viết một Sáng kiến Kinh nghiệm (SKKN) hoàn chỉnh bằng LaTeX cho GV phổ thông Việt Nam, dùng template article tiếng Việt.

CHỦ ĐỀ CỦA TÔI: [VD: "Sử dụng AI Claude/ChatGPT trong việc soạn đề trắc nghiệm Vật lí 11"]
MÔN/KHỐI: [VD: Vật lí 11]
ĐỐI TƯỢNG: [HS THPT khối 11 trường THPT XYZ, năm học 2025-2026]
GV: [Họ tên, chức vụ]

CẤU TRÚC YÊU CẦU (5 phần lớn, mỗi phần đánh số La Mã):
I. ĐẶT VẤN ĐỀ
   1.1. Lý do chọn đề tài
   1.2. Mục đích và nhiệm vụ nghiên cứu
   1.3. Đối tượng, phạm vi nghiên cứu
   1.4. Phương pháp nghiên cứu

II. THỰC TRẠNG VẤN ĐỀ
   2.1. Khảo sát thực trạng (có số liệu cụ thể)
   2.2. Nguyên nhân hạn chế

III. GIẢI PHÁP THỰC HIỆN
   3.1. Cơ sở lý luận
   3.2. Mô tả giải pháp (chi tiết các bước, có hình minh hoạ nếu cần)
   3.3. Quy trình áp dụng

IV. HIỆU QUẢ ÁP DỤNG
   4.1. Kết quả định lượng (bảng so sánh trước/sau với % cải tiến)
   4.2. Kết quả định tính (phản hồi HS, đồng nghiệp)

V. KẾT LUẬN VÀ KIẾN NGHỊ
   5.1. Kết luận
   5.2. Kiến nghị (cho BGH, Sở GD, đồng nghiệp)

YÊU CẦU:
- Lề: top=2cm,bottom=2cm,left=3cm,right=2cm (NĐ 30/2020)
- Linespread 1.5, font 13pt, có \\tableofcontents
- Có bảng (tabular) so sánh số liệu ở phần IV
- Tài liệu tham khảo cuối bài (5-10 mục)
- Tổng độ dài 15-25 trang

XUẤT RA: code LaTeX hoàn chỉnh, KHÔNG kèm giải thích.`,
    body: `\\documentclass[13pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb,siunitx}
\\usepackage{geometry}
\\usepackage{array,tabularx,booktabs}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{1.27cm}
\\titleformat{\\section}{\\Large\\bfseries}{\\thesection.}{8pt}{}

\\begin{document}

\\begin{center}
  \\textbf{SỞ GD\\&ĐT [TỈNH/TP]}\\\\
  \\textbf{TRƯỜNG THPT [TÊN TRƯỜNG]}\\\\[20pt]

  {\\Huge\\textbf{SÁNG KIẾN KINH NGHIỆM}}\\\\[14pt]

  {\\Large\\textbf{[TÊN ĐỀ TÀI SÁNG KIẾN — VIẾT IN HOA, BOLD]}}\\\\[40pt]

  \\begin{tabular}{rl}
    Tác giả: & [Họ và tên đầy đủ]\\\\[4pt]
    Chức vụ: & [Giáo viên môn ......]\\\\[4pt]
    Tổ: & [Tên tổ chuyên môn]\\\\[4pt]
    Năm học: & 20.... -- 20....
  \\end{tabular}
\\end{center}

\\vfill
\\begin{center}
  \\textit{[Tên địa phương], tháng .... năm 20....}
\\end{center}

\\newpage
\\tableofcontents
\\newpage

\\section{ĐẶT VẤN ĐỀ}

\\subsection*{1.1. Lý do chọn đề tài}
[Nêu bối cảnh giáo dục hiện nay, vấn đề tồn tại, vì sao đề tài này cần thiết. Trích Nghị quyết 29-NQ/TW, chương trình GDPT 2018 nếu phù hợp.]

\\subsection*{1.2. Mục đích và nhiệm vụ nghiên cứu}
[Mục đích: 1-2 câu chính. Nhiệm vụ: 3-4 ý cụ thể.]

\\subsection*{1.3. Đối tượng, phạm vi nghiên cứu}
\\begin{itemize}[leftmargin=*]
  \\item \\textbf{Đối tượng:} [HS lớp.... khối....]
  \\item \\textbf{Phạm vi:} [Trường THPT ...., năm học 20....]
\\end{itemize}

\\subsection*{1.4. Phương pháp nghiên cứu}
[Quan sát, phỏng vấn, thực nghiệm sư phạm, thống kê so sánh.]

\\section{THỰC TRẠNG VẤN ĐỀ}

\\subsection*{2.1. Khảo sát thực trạng}
[Số liệu khảo sát ban đầu — bảng/biểu đồ. Trước khi áp dụng SKKN, kết quả HS như thế nào?]

\\subsection*{2.2. Nguyên nhân hạn chế}
\\begin{enumerate}[label=\\arabic*),leftmargin=*]
  \\item [Nguyên nhân 1: ...]
  \\item [Nguyên nhân 2: ...]
  \\item [Nguyên nhân 3: ...]
\\end{enumerate}

\\section{GIẢI PHÁP THỰC HIỆN}

\\subsection*{3.1. Cơ sở lý luận}
[Lý thuyết nền tảng — Bloom's Taxonomy, dạy học tích cực, Differentiated Instruction...]

\\subsection*{3.2. Mô tả giải pháp}
[Mô tả chi tiết từng bước. Có thể chia thành 3-5 giải pháp con.]

\\subsubsection*{Giải pháp 1: [Tên]}
[Mô tả + cách làm]

\\subsubsection*{Giải pháp 2: [Tên]}
[Mô tả + cách làm]

\\subsection*{3.3. Quy trình áp dụng}
[Các bước triển khai trong 1 năm học.]

\\section{HIỆU QUẢ ÁP DỤNG}

\\subsection*{4.1. Kết quả định lượng}

\\begin{table}[h]
\\centering
\\caption{So sánh kết quả trước và sau khi áp dụng SKKN}
\\begin{tabularx}{\\linewidth}{X|c|c|c}
\\toprule
\\textbf{Tiêu chí} & \\textbf{Trước} & \\textbf{Sau} & \\textbf{\\% cải tiến}\\\\
\\midrule
HS Giỏi (\\%) & ... & ... & ...\\\\
HS Khá (\\%) & ... & ... & ...\\\\
HS TB (\\%)  & ... & ... & ...\\\\
HS Yếu (\\%) & ... & ... & ...\\\\
ĐTB lớp     & ... & ... & ...\\\\
\\bottomrule
\\end{tabularx}
\\end{table}

\\subsection*{4.2. Kết quả định tính}
[Phản hồi HS qua khảo sát, ý kiến đồng nghiệp dự giờ, BGH đánh giá.]

\\section{KẾT LUẬN VÀ KIẾN NGHỊ}

\\subsection*{5.1. Kết luận}
[Tóm tắt 3-4 ý chính SKKN đã giải quyết được vấn đề.]

\\subsection*{5.2. Kiến nghị}
\\begin{itemize}[leftmargin=*]
  \\item \\textbf{Với BGH nhà trường:} [...]
  \\item \\textbf{Với Sở GD\\&ĐT:} [...]
  \\item \\textbf{Với đồng nghiệp:} [...]
\\end{itemize}

\\vspace{10pt}\\hrule\\vspace{8pt}

\\section*{TÀI LIỆU THAM KHẢO}
\\begin{enumerate}[label={[\\arabic*]}]
  \\item Bộ Giáo dục và Đào tạo (2018). \\textit{Chương trình giáo dục phổ thông tổng thể}.
  \\item [Tên tác giả] ([Năm]). \\textit{[Tên sách / bài báo]}. NXB / Tạp chí.
  \\item ...
\\end{enumerate}

\\end{document}
`,
  },
  {
    id: "bien-ban-hop",
    name: "📋 Biên bản họp (NĐ 30/2020)",
    description: "Biên bản cuộc họp tổ/họp BGH/họp PH — chuẩn văn bản hành chính",
    category: "admin",
    audience: "GV / Thư ký",
    tags: ["biên bản", "họp", "hành chính"],
    aiPrompt: `Viết một Biên bản cuộc họp bằng LaTeX theo Nghị định 30/2020/NĐ-CP.

THÔNG TIN CỤ THỂ:
- Đơn vị: Trường THPT [Tên]
- Tên cuộc họp: [VD: Họp tổ Toán-Tin tháng 11/2025]
- Thời gian: [HH:MM ngày DD/MM/YYYY]
- Địa điểm: [Phòng họp số .... hoặc Online qua Zoom/Meet]
- Chủ trì: [Họ tên + chức vụ]
- Thư ký: [Họ tên + chức vụ]
- Thành phần tham dự: [Liệt kê N người + có giấy mời, vắng X người có lý do]

NỘI DUNG CUỘC HỌP (cụ thể hoá theo chủ đề của tôi):
[VD: 1. Tổng kết kết quả thi giữa kỳ I; 2. Triển khai kế hoạch ôn thi học sinh giỏi; 3. Bàn về việc áp dụng AI vào soạn đề]

Mỗi nội dung cần có:
- Người trình bày
- Tóm tắt báo cáo
- Ý kiến đóng góp của các thành viên (nêu ít nhất 3-4 ý kiến)
- Kết luận của chủ trì

CUỐI BIÊN BẢN:
- Tổng kết các nhiệm vụ được giao (bảng: Người chịu trách nhiệm | Việc | Deadline)
- Cuộc họp kết thúc lúc HH:MM cùng ngày
- Chữ ký Chủ trì + Thư ký

YÊU CẦU LATEX:
- Lề chuẩn 2/2/3/2cm (NĐ 30)
- Linespread 1.5
- Có Quốc hiệu Tiêu ngữ trên cùng
- Số biên bản: ..../BB-[viết tắt đơn vị]

XUẤT: code LaTeX hoàn chỉnh không kèm giải thích.`,
    body: `\\documentclass[13pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry}
\\usepackage{array,tabularx,booktabs}
\\usepackage{enumitem}
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{1.27cm}

\\begin{document}

\\noindent
\\begin{minipage}[t]{0.5\\textwidth}
\\centering
\\textbf{TRƯỜNG THPT [TÊN TRƯỜNG]}\\\\
\\textbf{TỔ [TÊN TỔ]}\\\\
\\rule{4cm}{0.4pt}\\\\
\\textit{Số: ......./BB-[VIẾT TẮT]}
\\end{minipage}%
\\begin{minipage}[t]{0.5\\textwidth}
\\centering
\\textbf{CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM}\\\\
\\textbf{Độc lập -- Tự do -- Hạnh phúc}\\\\
\\rule{4cm}{0.4pt}\\\\
\\textit{[Địa danh], ngày .... tháng .... năm 20....}
\\end{minipage}

\\vspace{18pt}

\\begin{center}
  \\Large\\textbf{BIÊN BẢN HỌP}\\\\[4pt]
  \\large\\textit{[Tên cuộc họp]}
\\end{center}

\\vspace{6pt}

\\noindent\\textbf{Thời gian:} ..... giờ ..... ngày ....../....../20.....

\\noindent\\textbf{Địa điểm:} [Phòng họp / Online qua Zoom-Meet]

\\noindent\\textbf{Chủ trì cuộc họp:} [Họ tên — Chức vụ]

\\noindent\\textbf{Thư ký:} [Họ tên — Chức vụ]

\\noindent\\textbf{Thành phần tham dự:}
\\begin{itemize}[leftmargin=*,nosep]
  \\item Có mặt: \\textbf{[N]} đồng chí (\\textit{có danh sách điểm danh kèm theo})
  \\item Vắng mặt: \\textbf{[X]} đồng chí — \\textit{[có/không lý do]}
\\end{itemize}

\\vspace{8pt}

\\section*{I. NỘI DUNG CUỘC HỌP}

\\subsection*{1. [Nội dung 1]}
\\textbf{Người trình bày:} [Họ tên]

[Tóm tắt nội dung trình bày...]

\\textbf{Ý kiến thảo luận:}
\\begin{itemize}[leftmargin=*]
  \\item Đ/c [Tên]: [Nội dung ý kiến]
  \\item Đ/c [Tên]: [Nội dung ý kiến]
\\end{itemize}

\\textbf{Kết luận:} [Chủ trì kết luận về nội dung này]

\\subsection*{2. [Nội dung 2]}
[Tương tự như trên]

\\section*{II. CÁC NHIỆM VỤ ĐƯỢC GIAO}

\\begin{tabularx}{\\linewidth}{c|X|c|c}
\\toprule
\\textbf{TT} & \\textbf{Nội dung công việc} & \\textbf{Phụ trách} & \\textbf{Hạn}\\\\
\\midrule
1 & [Công việc 1] & [Tên] & [DD/MM]\\\\
2 & [Công việc 2] & [Tên] & [DD/MM]\\\\
3 & [Công việc 3] & [Tên] & [DD/MM]\\\\
\\bottomrule
\\end{tabularx}

\\vspace{12pt}

Cuộc họp kết thúc vào hồi ..... giờ ..... cùng ngày. Biên bản đã được đọc lại trước toàn thể thành viên dự họp và nhất trí thông qua.

\\vspace{20pt}

\\begin{minipage}[t]{0.5\\textwidth}
\\centering
\\textbf{THƯ KÝ}\\\\
\\textit{(Ký, ghi rõ họ tên)}\\\\[60pt]
[Họ tên]
\\end{minipage}%
\\begin{minipage}[t]{0.5\\textwidth}
\\centering
\\textbf{CHỦ TRÌ CUỘC HỌP}\\\\
\\textit{(Ký, ghi rõ họ tên, đóng dấu nếu có)}\\\\[60pt]
[Họ tên — Chức vụ]
\\end{minipage}

\\end{document}
`,
  },
  {
    id: "cv-tieng-viet",
    name: "👤 CV tiếng Việt — chuyên nghiệp",
    description: "Sơ yếu lý lịch / CV — 1 cột, font Times, in trên A4 lề chuẩn",
    category: "personal",
    audience: "GV / SV / NV",
    tags: ["CV", "xin việc", "cá nhân"],
    aiPrompt: `Hãy viết một CV (Curriculum Vitae) tiếng Việt chuyên nghiệp bằng LaTeX cho tôi.

THÔNG TIN BẢN THÂN:
- Họ tên: [Tên đầy đủ]
- Ngày sinh: DD/MM/YYYY
- Địa chỉ: [Tỉnh/TP]
- Điện thoại: 0xxxxxxxxx
- Email: [email]
- LinkedIn/GitHub: [nếu có]
- Mục tiêu nghề nghiệp: [1-2 câu rõ ràng]

HỌC VẤN: [Liệt kê 2-3 bậc học từ gần nhất, có GPA + chuyên ngành]

KINH NGHIỆM LÀM VIỆC: [Liệt kê 3-5 công việc từ gần nhất, mỗi job 3-4 bullet thành tích đo đếm được — VD: "Tăng tỷ lệ đỗ ĐH của lớp từ 75\\% lên 92\\%"]

KỸ NĂNG:
- Chuyên môn: [VD: Soạn giáo án theo GDPT 2018, dùng AI trong dạy học]
- Mềm: [Thuyết trình, làm việc nhóm, mentoring]
- Ngoại ngữ: [Tiếng Anh IELTS X.X / TOEIC]
- Tin học: [MS Office, Google Workspace, Claude AI, etc.]

CHỨNG CHỈ: [Liệt kê 3-5 chứng chỉ liên quan]

HOẠT ĐỘNG / THÀNH TÍCH: [Giải thưởng, dự án ngoại khoá]

NGƯỜI THAM CHIẾU: [2 người, có sđt + email]

YÊU CẦU LATEX:
- Font Times New Roman (mathptmx), 11pt, A4
- Lề: top=1.5cm, bottom=1.5cm, left=2cm, right=2cm (gọn hơn NĐ 30 vì CV)
- Tên IN HOA căn giữa, size lớn (\\Huge); contact info căn giữa dưới
- Mỗi section có gạch chân (\\hrule), tiêu đề IN HOA
- Bullet point bằng \\item trong itemize
- Không cần ảnh thẻ (sẽ paste sau)
- Tổng 1-2 trang

XUẤT: code LaTeX hoàn chỉnh.`,
    body: `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{mathptmx}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\geometry{top=1.5cm,bottom=1.5cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{3pt}
\\titleformat{\\section}{\\large\\bfseries\\MakeUppercase}{}{0pt}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{10pt}{6pt}
\\renewcommand{\\labelitemi}{\\textbullet}

\\begin{document}

\\begin{center}
  {\\Huge\\textbf{[HỌ VÀ TÊN ĐẦY ĐỦ]}}\\\\[6pt]
  \\textit{[Chức danh/Mục tiêu — VD: Giáo viên Vật lí THPT]}\\\\[4pt]
  📞 0xxxxxxxxx \\quad ✉ name@example.com \\quad 📍 [Tỉnh/TP] \\quad 🔗 linkedin.com/in/...
\\end{center}

\\section{MỤC TIÊU NGHỀ NGHIỆP}
[1-2 câu súc tích — VD: "Trở thành GV Vật lí cốt cán trong 3-5 năm tới, ứng dụng AI vào dạy học giúp HS đạt kết quả tối ưu."]

\\section{HỌC VẤN}
\\textbf{[Tên Trường ĐH/CĐ]} \\hfill \\textit{20....~--~20....}\\\\
[Khoa — Chuyên ngành] | GPA: [X.X/4.0 hoặc X.X/10]\\\\
\\textit{Đề tài tốt nghiệp:} [Tên đề tài]

\\medskip

\\textbf{[Trường THPT]} \\hfill \\textit{20....~--~20....}\\\\
HS giỏi 3 năm liền — Đạt giải [...] Olympic [...]

\\section{KINH NGHIỆM LÀM VIỆC}

\\textbf{[Tên Trường/Cơ quan]} \\hfill \\textit{[MM/YYYY -- nay]}\\\\
\\textit{[Vị trí]}
\\begin{itemize}[leftmargin=*,nosep]
  \\item [Thành tích 1 — có số liệu, VD: "Dạy 6 lớp Vật lí 11, ĐTBm 7.8/10"]
  \\item [Thành tích 2 — VD: "Hướng dẫn 5 HS đạt giải HSG cấp tỉnh môn Vật lí"]
  \\item [Thành tích 3 — VD: "Soạn 200+ đề trắc nghiệm cho Ngân hàng câu hỏi tổ"]
\\end{itemize}

\\medskip

\\textbf{[Cơ quan trước đó]} \\hfill \\textit{[MM/YYYY -- MM/YYYY]}\\\\
\\textit{[Vị trí]}
\\begin{itemize}[leftmargin=*,nosep]
  \\item [Thành tích...]
  \\item [Thành tích...]
\\end{itemize}

\\section{KỸ NĂNG}
\\begin{itemize}[leftmargin=*,nosep]
  \\item \\textbf{Chuyên môn:} [VD: GDPT 2018, ra đề trắc nghiệm 4-phần, chấm rubric, STEAM]
  \\item \\textbf{Công cụ AI:} [Claude AI, ChatGPT, Gemini — dùng cho soạn đề/feedback]
  \\item \\textbf{Phần mềm:} [MS Office, Google Workspace, LMS inphysic, Notion, LaTeX]
  \\item \\textbf{Mềm:} Thuyết trình, mentoring đồng nghiệp, quản lý lớp, work-life balance
  \\item \\textbf{Ngoại ngữ:} Tiếng Anh — [IELTS X.X / TOEIC XXX]
\\end{itemize}

\\section{CHỨNG CHỈ \\& KHOÁ HỌC}
\\begin{itemize}[leftmargin=*,nosep]
  \\item Chứng chỉ Tin học IC3 / MOS (20....)
  \\item Chứng chỉ Bồi dưỡng GV theo CT GDPT 2018 (Bộ GD)
  \\item [Tên khoá] — Coursera/edX (20....)
\\end{itemize}

\\section{HOẠT ĐỘNG \\& THÀNH TÍCH}
\\begin{itemize}[leftmargin=*,nosep]
  \\item [Giải thưởng / Bằng khen — kèm cấp + năm]
  \\item [Báo cáo SKKN cấp Trường/Tỉnh — đề tài]
  \\item [Hoạt động ngoại khoá — Câu lạc bộ HS, Đoàn]
\\end{itemize}

\\section{NGƯỜI THAM CHIẾU}
\\begin{itemize}[leftmargin=*,nosep]
  \\item \\textbf{[Họ tên]} — [Chức vụ] tại [Đơn vị] | ☎ 0xx... | ✉ ...@...
  \\item \\textbf{[Họ tên]} — [Chức vụ] tại [Đơn vị] | ☎ 0xx... | ✉ ...@...
\\end{itemize}

\\end{document}
`,
  },
  {
    id: "ke-hoach-tuan",
    name: "📅 Kế hoạch dạy học tuần",
    description: "Bảng kế hoạch tuần: Thứ × Tiết × Lớp × Nội dung + ghi chú đồng nghiệp",
    category: "lesson",
    audience: "GV phổ thông",
    tags: ["kế hoạch", "tuần", "lịch dạy"],
    aiPrompt: `Tạo Kế hoạch dạy học TUẦN bằng LaTeX cho GV phổ thông Việt Nam.

THÔNG TIN:
- Họ tên GV: [...]
- Môn dạy: [VD: Vật lí]
- Tuần thứ: [VD: 12, từ DD/MM/YYYY đến DD/MM/YYYY]
- Năm học: 2025-2026
- Học kỳ: I/II

DANH SÁCH LỚP TÔI PHỤ TRÁCH:
- Lớp [11A1] — [Tổng X tiết/tuần]
- Lớp [11A2] — [Tổng X tiết/tuần]
- Lớp [12B1] — [Tổng X tiết/tuần]
... (liệt kê tất cả)

LỊCH DẠY TRONG TUẦN (theo thời khoá biểu): [VD:
  Thứ 2: tiết 1 lớp 11A1, tiết 3 lớp 12B1
  Thứ 3: tiết 2 lớp 11A2, tiết 5 lớp 11A1
  ...]

NỘI DUNG TỪNG TIẾT (theo PPCT):
[VD:
  Tiết 1 lớp 11A1 - Thứ 2: Bài 7 Định luật Ohm - Phần 1 lý thuyết
  Tiết 3 lớp 12B1 - Thứ 2: Bài 12 Dao động điều hoà - Bài tập
  ...]

YÊU CẦU LATEX:
- Bảng tabularx 5 cột: Thứ | Tiết | Lớp | Tên bài | Phương pháp/Phương tiện
- Một bảng riêng cho mỗi thứ trong tuần
- Có dòng cộng dồn: tổng tiết tuần, tiết lý thuyết, tiết bài tập, tiết kiểm tra
- Phần ghi chú cuối: kế hoạch họp tổ, dự giờ, chấm bài
- Cuối có chỗ ký Tổ trưởng + GV
- Lề chuẩn NĐ 30 (3cm trái)
- A4 ngang (\\usepackage{lscape} hoặc geometry landscape)

XUẤT: code LaTeX hoàn chỉnh.`,
    body: `\\documentclass[12pt,a4paper,landscape]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry}
\\usepackage{array,tabularx,booktabs,longtable}
\\usepackage{xcolor}
\\geometry{top=1.5cm,bottom=1.5cm,left=2cm,right=2cm,landscape}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\begin{center}
  \\textbf{KẾ HOẠCH DẠY HỌC TUẦN}\\\\
  \\textit{Giáo viên: [Họ và tên] \\quad Môn: [Tên môn] \\quad Tuần [....] (từ [DD/MM] đến [DD/MM])}\\\\
  \\textit{Năm học: 20....~--~20.... \\quad Học kỳ: [I/II]}
\\end{center}

\\vspace{6pt}

\\begin{tabularx}{\\linewidth}{|c|c|c|X|X|X|}
\\hline
\\rowcolor{gray!20}
\\textbf{Thứ} & \\textbf{Tiết} & \\textbf{Lớp} & \\textbf{Tên bài/Nội dung} & \\textbf{Phương pháp \\& phương tiện} & \\textbf{Ghi chú}\\\\
\\hline
\\multirow{3}{*}{\\textbf{Hai}}
  & 1 & 11A1 & Bài [N]: [Tên bài]                           & Trực quan + Lab AnalogCircuit  & ----\\\\\\cline{2-6}
  & 3 & 12B1 & Bài [N]: [Tên bài]                           & Bài tập + Slide                & ----\\\\\\cline{2-6}
  & 5 & 11A2 & Ôn tập chương [N]                            & Kahoot quiz                    & ----\\\\
\\hline
\\multirow{2}{*}{\\textbf{Ba}}
  & 2 & 11A1 & Bài [N+1]: [Tên]                             & Thí nghiệm ảo + Lab            & Dự giờ\\\\\\cline{2-6}
  & 4 & 12B1 & Bài tập chương [N]                           & Giải đề trên Question Bank     & ----\\\\
\\hline
\\textbf{Tư}
  & 1 & 11A2 & Bài [N]: [Tên]                                & Thảo luận nhóm                 & ----\\\\
\\hline
\\multirow{2}{*}{\\textbf{Năm}}
  & 3 & 11A1 & Bài [N+1]: [Tên]                             & Giảng giải + ví dụ             & ----\\\\\\cline{2-6}
  & 5 & 12B1 & Bài [N+2]: [Tên]                             & Bài tập + Video YouTube        & ----\\\\
\\hline
\\textbf{Sáu}
  & 2 & 11A2 & Kiểm tra 15 phút (Phần I trắc nghiệm)         & QuestionBank + giấy             & Chấm cuối ngày\\\\
\\hline
\\textbf{Bảy}
  & 1 & 12B1 & Ôn tập + chữa bài                            & Slide + bảng                   & Tự chọn\\\\
\\hline
\\end{tabularx}

\\vspace{10pt}

\\noindent\\textbf{TỔNG KẾT TUẦN:}
\\begin{itemize}
  \\item Tổng số tiết dạy: \\textbf{[X]} tiết (trong đó: lý thuyết [..], bài tập [..], kiểm tra [..])
  \\item Số lớp phụ trách: \\textbf{[N]} lớp
  \\item Bài kiểm tra/đánh giá: [...]
  \\item Họp tổ chuyên môn: [Thứ ..., giờ ..., chủ đề ...]
  \\item Dự giờ đồng nghiệp: [Thứ ..., tiết ..., GV ...]
  \\item Khác: [...]
\\end{itemize}

\\vspace{16pt}

\\begin{minipage}[t]{0.5\\textwidth}
\\centering
\\textit{Duyệt của Tổ trưởng chuyên môn}\\\\[40pt]
[Họ tên]
\\end{minipage}%
\\begin{minipage}[t]{0.5\\textwidth}
\\centering
\\textbf{Giáo viên lập kế hoạch}\\\\[40pt]
[Họ tên]
\\end{minipage}

\\end{document}
`,
  },
  {
    id: "de-cuong-on-tap",
    name: "📚 Đề cương ôn tập (HKI/HKII)",
    description: "Tổng hợp lý thuyết + dạng bài + bài tập tự luyện cho HS ôn thi cuối kỳ",
    category: "lesson",
    audience: "GV phổ thông",
    tags: ["đề cương", "ôn tập", "ôn thi"],
    aiPrompt: `Soạn một Đề cương ôn tập bằng LaTeX cho HS THPT chuẩn bị thi cuối kỳ.

THÔNG TIN:
- Môn: [VD: Vật lí]
- Khối: [VD: 11]
- Học kỳ: [I/II]
- Năm học: 2025-2026
- Phạm vi nội dung: [Liệt kê các chương/bài có trong đề cương]
- Cấu trúc đề kiểm tra cuối kỳ: [VD: 40 câu MCQ + 4 câu Đ/S + 6 câu trả lời ngắn + 4 câu tự luận, thời gian 90 phút, 10 điểm]

NỘI DUNG ĐỀ CƯƠNG GỒM 3 PHẦN:

PHẦN A. KIẾN THỨC TRỌNG TÂM
Với MỖI chương/bài, liệt kê:
- Các khái niệm cốt lõi (gạch đầu dòng, có công thức bằng MathJax/LaTeX)
- Định luật/định lý quan trọng
- Sơ đồ tư duy ngắn gọn (mô tả bằng text)

PHẦN B. CÁC DẠNG BÀI TẬP THƯỜNG GẶP
Với mỗi dạng:
- Tên dạng (VD: Dạng 1 - Tính cường độ dòng điện trong mạch hỗn hợp)
- Phương pháp giải (3-5 bước)
- Bài tập mẫu có lời giải chi tiết
- 2-3 bài tập tự luyện kèm đáp án ngắn

PHẦN C. ĐỀ TỰ LUYỆN
- 1 đề mẫu đầy đủ 4 phần như cấu trúc thật, có đáp án ở cuối

YÊU CẦU LATEX:
- Dùng amsmath, amssymb, siunitx cho công thức Vật lí
- Có \\tableofcontents
- Mỗi chương là một \\section, mỗi dạng bài là \\subsection
- Đáp án để cuối tài liệu trong \\section*{ĐÁP ÁN}
- Lề chuẩn 2/2/3/2cm, font 12pt, linespread 1.3
- Tổng độ dài 15-30 trang
- Có hộp tô màu (\\fbox hoặc tcolorbox) cho công thức quan trọng

XUẤT: code LaTeX hoàn chỉnh.`,
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb,siunitx}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{tcolorbox}
\\geometry{top=2cm,bottom=2cm,left=2.5cm,right=2cm}
\\linespread{1.3}
\\setlength{\\parindent}{1.27cm}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\begin{center}
  \\textbf{TRƯỜNG THPT [TÊN]}\\\\
  \\textbf{TỔ [TÊN TỔ]}\\\\[14pt]
  {\\Huge\\textbf{ĐỀ CƯƠNG ÔN TẬP CUỐI KỲ [I/II]}}\\\\[6pt]
  {\\Large\\textbf{MÔN [TÊN MÔN] -- KHỐI [....]}}\\\\[4pt]
  \\textit{Năm học 20....~--~20....}
\\end{center}

\\vspace{10pt}

\\noindent\\textbf{Cấu trúc đề thi cuối kỳ:}
\\begin{itemize}[nosep]
  \\item Phần I (4,0 đ): [X] câu trắc nghiệm 4 lựa chọn
  \\item Phần II (2,0 đ): [Y] câu trắc nghiệm Đúng/Sai 4 mệnh đề
  \\item Phần III (2,0 đ): [Z] câu trả lời ngắn
  \\item Phần IV (2,0 đ): [W] câu tự luận
  \\item Thời gian: [....] phút
\\end{itemize}

\\tableofcontents
\\newpage

\\section{PHẦN A. KIẾN THỨC TRỌNG TÂM}

\\subsection{Chương 1: [Tên chương]}

\\begin{itemize}[leftmargin=*]
  \\item Khái niệm 1: [Định nghĩa]
  \\item Khái niệm 2: [Định nghĩa]
\\end{itemize}

\\textbf{Công thức cốt lõi:}
\\begin{tcolorbox}[colback=blue!5,colframe=blue!50!black,title=Công thức]
\\begin{align*}
F &= ma \\\\
W &= F \\cdot s \\cdot \\cos\\alpha \\\\
E &= \\frac{1}{2}mv^2
\\end{align*}
\\end{tcolorbox}

\\subsection{Chương 2: [Tên chương]}
[Tương tự như chương 1...]

\\section{PHẦN B. CÁC DẠNG BÀI TẬP}

\\subsection{Dạng 1: [Tên dạng — VD: Tính cường độ dòng điện]}

\\textbf{Phương pháp:}
\\begin{enumerate}[leftmargin=*]
  \\item Bước 1: [...]
  \\item Bước 2: [...]
  \\item Bước 3: [...]
\\end{enumerate}

\\textbf{Ví dụ minh hoạ:} Cho mạch điện có $\\xi = \\SI{12}{V}$, $r = \\SI{1}{\\ohm}$, $R = \\SI{5}{\\ohm}$. Tính cường độ dòng điện qua mạch.

\\textit{Lời giải:}
$$I = \\frac{\\xi}{R + r} = \\frac{12}{5 + 1} = \\SI{2}{A}$$

\\textbf{Bài tập tự luyện:}
\\begin{enumerate}[leftmargin=*]
  \\item [Đề bài tự luyện 1...]  \\textit{(ĐS: ...)}
  \\item [Đề bài tự luyện 2...]  \\textit{(ĐS: ...)}
\\end{enumerate}

\\subsection{Dạng 2: [Tên dạng]}
[Tương tự...]

\\section{PHẦN C. ĐỀ TỰ LUYỆN}

\\subsection*{Đề số 1}

\\textbf{Phần I.} Trắc nghiệm 4 lựa chọn (4,0 đ)
\\begin{enumerate}[leftmargin=*,label=\\textbf{Câu \\arabic*.}]
  \\item [Câu hỏi 1...]\\\\
    A. ... \\quad B. ... \\quad C. ... \\quad D. ...
  \\item [Câu hỏi 2...]
\\end{enumerate}

\\textbf{Phần II.} Trắc nghiệm Đúng/Sai (2,0 đ) \\\\
\\textbf{Câu 1.} [Dẫn đề]
\\begin{enumerate}[label=\\alph*),leftmargin=*]
  \\item [Phát biểu a]
  \\item [Phát biểu b]
  \\item [Phát biểu c]
  \\item [Phát biểu d]
\\end{enumerate}

\\textbf{Phần III.} Trả lời ngắn (2,0 đ)\\\\
\\textbf{Câu 1.} [Đề bài...] Đáp số là bao nhiêu?

\\textbf{Phần IV.} Tự luận (2,0 đ)\\\\
\\textbf{Câu 1.} [Đề bài tự luận]

\\vspace{20pt}\\hrule\\vspace{10pt}

\\section*{ĐÁP ÁN ĐỀ TỰ LUYỆN SỐ 1}

\\textbf{Phần I.} 1-A, 2-B, 3-C, ...

\\textbf{Phần II.} Câu 1: aT, bF, cT, dF

\\textbf{Phần III.} Câu 1: [đáp số]

\\textbf{Phần IV.} Câu 1: [Lời giải chi tiết]

\\end{document}
`,
  },
];

// ═══════════════════════════════════════════════════════════════
// 3 MẪU GIÁO ÁN LATEX (5/2026) — chuyển từ HTML lesson-plan-templates
// User: "tôi muốn 1 kiểu soạn giáo án với latex như soạn đề"
// ═══════════════════════════════════════════════════════════════

LATEX_TEMPLATES.push(
  {
    id: "lesson-plan-cv2345-4tiet",
    name: "📋 Giáo án CV2345 — Tiếng Việt 4 tiết (LaTeX, NĐ 30)",
    description: "Khung CV2345/BGDĐT — Tiếng Việt 4 tiết. Định dạng NĐ 30/2020/NĐ-CP: lề 2/2/3/2cm, giãn dòng 1.5, justify. Bảng 2 cột GV/HS qua tabularx.",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage{titlesec}
% Định dạng theo Nghị định 30/2020/NĐ-CP — văn bản hành chính:
% Khổ A4, lề trên/dưới 2cm, lề trái 3cm, lề phải 2cm
% Giãn dòng 1.5 lines, khoảng cách đoạn 6pt, canh đều 2 lề (justify mặc định)
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
\\titleformat{\\section}{\\large\\bfseries\\MakeUppercase}{\\thesection.}{0.5em}{}
\\titleformat{\\subsection}{\\normalsize\\bfseries}{\\thesubsection.}{0.5em}{}
\\renewcommand{\\thesection}{\\Roman{section}}
\\setlist[itemize]{topsep=2pt,itemsep=2pt,leftmargin=1.2cm}
\\setlist[enumerate]{topsep=2pt,itemsep=2pt,leftmargin=1.2cm}

\\begin{document}

\\begin{center}
{\\large\\bfseries BÀI ...: [TÊN BÀI]} \\\\[2pt]
\\textbf{(4 TIẾT)} \\\\[4pt]
\\textbf{Môn:} Tiếng Việt \\quad \\textbf{Lớp:} ... \\quad \\textbf{Tuần:} ... \\quad \\textbf{Ngày dạy:} .../.../...
\\end{center}
\\rule{\\textwidth}{0.4pt}

\\section{Yêu cầu cần đạt}

\\subsection{Năng lực đặc thù}

\\textbf{1.1. Đọc}
\\begin{itemize}
  \\item \\textbf{Đọc kĩ thuật:} .....................................
  \\item \\textbf{Đọc hiểu:}
  \\begin{itemize}
    \\item Đọc hiểu \\textit{nội dung}: .....................................
    \\item Đọc hiểu \\textit{hình thức}: .....................................
    \\item Đọc \\textit{liên hệ, so sánh kết nối} (nếu có): .....................................
  \\end{itemize}
\\end{itemize}

\\textbf{1.2. Viết}\\\\
Viết chữ viết hoa ........; viết câu ứng dụng .....................................

\\textbf{1.3. Nói và nghe}\\\\
.....................................

\\subsection{Năng lực chung}
\\begin{itemize}
  \\item Năng lực ........... (biểu hiện)
  \\item Năng lực ........... (biểu hiện)
\\end{itemize}

\\subsection{Phẩm chất}
.....................................

\\textit{(Yêu nước / Nhân ái / Chăm chỉ / Trung thực / Trách nhiệm)}

\\section{Đồ dùng dạy học}
\\begin{itemize}
  \\item \\textbf{GV:} .....................................
  \\item \\textbf{HS:} .....................................
\\end{itemize}

\\section{Các hoạt động dạy học chủ yếu}

\\subsection*{TIẾT 1 + 2 — ĐỌC: ...........................}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{1. Hoạt động mở đầu} & \\\\ \\hline
\\textbf{2. Hình thành kiến thức} & \\\\
\\hspace{0.5cm}a. Luyện đọc & \\\\
\\hspace{0.5cm}b. Trả lời câu hỏi & \\\\ \\hline
\\textbf{3. Luyện tập, thực hành} & \\\\
\\hspace{0.5cm}a. Luyện đọc lại & \\\\
\\hspace{0.5cm}b. Luyện tập theo văn bản đọc & \\\\
\\hspace{0.5cm}\\quad Bài tập 1 của Luyện tập theo văn bản đọc & \\\\ \\hline
\\textbf{4. Vận dụng, trải nghiệm} & \\\\
\\hspace{0.5cm}Bài tập 2 của Luyện tập theo văn bản đọc & \\\\
\\hspace{0.5cm}Hoạt động vận dụng khác (nếu có) & \\\\ \\hline
\\end{tabularx}

\\textit{* Điều chỉnh sau bài dạy:} .....................................

\\subsection*{TIẾT 3 — VIẾT: ...........................}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{1. Hoạt động mở đầu} & \\\\ \\hline
\\textbf{2. Hoạt động hình thành kiến thức mới} & \\\\
\\hspace{0.5cm}a. Hướng dẫn viết chữ hoa & \\\\
\\hspace{0.5cm}b. Hướng dẫn viết câu ứng dụng & \\\\ \\hline
\\textbf{3. Luyện tập, thực hành} & \\\\ \\hline
\\textbf{4. Vận dụng, trải nghiệm} & \\\\ \\hline
\\end{tabularx}

\\textit{* Điều chỉnh sau bài dạy:} .....................................

\\subsection*{TIẾT 4 — NÓI VÀ NGHE: ...........................}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{1. Hoạt động mở đầu} & \\\\ \\hline
\\textbf{2. Hoạt động hình thành kiến thức mới} & \\\\ \\hline
\\textbf{3. Luyện tập, thực hành} & \\\\ \\hline
\\textbf{4. Vận dụng, trải nghiệm} & \\\\ \\hline
\\end{tabularx}

\\textit{* Điều chỉnh sau bài dạy:} .....................................

\\end{document}
`,
  },
  {
    id: "lesson-plan-cv2345-6tiet",
    name: "📖 Giáo án CV2345 — Tiếng Việt 6 tiết (LaTeX, NĐ 30)",
    description: "Khung CV2345 mở rộng cho bài Tiếng Việt 6 tiết: Đọc + Viết + Luyện tập từ/câu + Đoạn văn + Đọc mở rộng. Định dạng NĐ 30/2020/NĐ-CP.",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage{titlesec}
% Nghị định 30/2020/NĐ-CP: lề 2/2/3/2cm, giãn dòng 1.5, paragraph 6pt
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
\\titleformat{\\section}{\\large\\bfseries\\MakeUppercase}{\\thesection.}{0.5em}{}
\\titleformat{\\subsection}{\\normalsize\\bfseries}{\\thesubsection.}{0.5em}{}
\\renewcommand{\\thesection}{\\Roman{section}}

\\begin{document}

\\begin{center}
{\\large\\bfseries BÀI ...: [TÊN BÀI]} \\\\[2pt]
\\textbf{(6 TIẾT)} \\\\[4pt]
\\textbf{Môn:} Tiếng Việt \\quad \\textbf{Lớp:} ... \\quad \\textbf{Tuần:} ... \\quad \\textbf{Ngày dạy:} .../.../...
\\end{center}
\\rule{\\textwidth}{0.4pt}

\\section{Yêu cầu cần đạt}

\\subsection{Năng lực đặc thù}

\\textbf{1.1. Đọc}
\\begin{itemize}
  \\item \\textbf{Đọc kĩ thuật:} .....................................
  \\item \\textbf{Đọc hiểu:}
  \\begin{itemize}
    \\item Đọc hiểu \\textit{nội dung}: .....................................
    \\item Đọc hiểu \\textit{hình thức}: .....................................
    \\item Đọc \\textit{liên hệ, so sánh kết nối} (nếu có): .....................................
    \\item Đọc \\textit{mở rộng}: .....................................
  \\end{itemize}
\\end{itemize}

\\textbf{1.2. Viết}
\\begin{itemize}
  \\item Viết chính tả: .....................................
  \\item Viết đoạn văn: .....................................
\\end{itemize}

\\textbf{1.3. Kiến thức Tiếng Việt}
\\begin{itemize}
  \\item Phát triển vốn từ: .....................................
\\end{itemize}

\\subsection{Năng lực chung}
\\begin{itemize}
  \\item Năng lực ........... (biểu hiện)
  \\item Năng lực ........... (biểu hiện)
\\end{itemize}

\\subsection{Phẩm chất}
.....................................\\\\
\\textit{(Yêu nước / Nhân ái / Chăm chỉ / Trung thực / Trách nhiệm)}

\\section{Đồ dùng dạy học}
\\begin{itemize}
  \\item \\textbf{GV:} .....................................
  \\item \\textbf{HS:} .....................................
\\end{itemize}

\\section{Các hoạt động dạy học chủ yếu}

\\subsection*{TIẾT 1 + 2 — ĐỌC: ...........................}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{1. Hoạt động mở đầu} & \\\\ \\hline
\\textbf{2. Hình thành kiến thức} & \\\\
\\hspace{0.5cm}a. Luyện đọc & \\\\
\\hspace{0.5cm}b. Trả lời câu hỏi & \\\\ \\hline
\\textbf{3. Luyện tập, thực hành} & \\\\
\\hspace{0.5cm}a. Luyện đọc lại & \\\\
\\hspace{0.5cm}b. Luyện tập theo văn bản đọc & \\\\ \\hline
\\textbf{4. Vận dụng, trải nghiệm} & \\\\ \\hline
\\end{tabularx}

\\textit{* Điều chỉnh sau bài dạy:} .....................................

\\subsection*{TIẾT 3 — VIẾT: ...........................}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{1. Hoạt động mở đầu} & \\\\ \\hline
\\textbf{2. Hình thành kiến thức} & \\\\ \\hline
\\textbf{3. Luyện tập, thực hành} & \\\\ \\hline
\\textbf{4. Vận dụng, trải nghiệm} & \\\\ \\hline
\\end{tabularx}

\\subsection*{TIẾT 4 — LUYỆN TẬP TIẾNG VIỆT (Luyện tập từ / câu / dấu câu)}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{1. Hoạt động mở đầu} & \\\\ \\hline
\\textbf{2. Hoạt động Luyện tập, thực hành} & \\\\
\\hspace{0.5cm}2.1. Bài 1: ........................... & \\\\
\\hspace{0.5cm}2.2. Bài 2: ........................... & \\\\
\\hspace{0.5cm}2.3. Bài 3: ........................... & \\\\ \\hline
\\textbf{3. Vận dụng, trải nghiệm} & \\\\ \\hline
\\end{tabularx}

\\textit{* Điều chỉnh sau bài dạy:} .....................................

\\subsection*{TIẾT 5 — VIẾT ĐOẠN VĂN: ...........................}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{1. Hoạt động mở đầu} & \\\\ \\hline
\\textbf{2. Luyện tập, thực hành} & \\\\
\\hspace{0.5cm}2.1. Bài 1: ........................... & \\\\
\\hspace{0.5cm}2.2. Bài 2: ........................... & \\\\ \\hline
\\textbf{3. Vận dụng, trải nghiệm} & \\\\ \\hline
\\end{tabularx}

\\textit{* Điều chỉnh sau bài dạy:} .....................................

\\subsection*{TIẾT 6 — ĐỌC MỞ RỘNG: ...........................}

\\textit{(Tuỳ Kế hoạch dạy học môn học của từng trường)}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{1. Hoạt động mở đầu} & \\\\ \\hline
\\textbf{2. Hoạt động Đọc mở rộng} & \\\\ \\hline
\\textbf{3. Vận dụng, trải nghiệm} & \\\\ \\hline
\\end{tabularx}

\\textit{* Điều chỉnh sau bài dạy:} .....................................

\\end{document}
`,
  },
  {
    id: "lesson-plan-5hoatdong",
    name: "🎯 Giáo án Khung 5 hoạt động (LaTeX, mọi môn — NĐ 30)",
    description: "Khung 5 hoạt động chuẩn BGD&ĐT phù hợp Toán/Lý/Hoá/Sinh/Sử/Địa/Anh: Khởi động → Hình thành KT → Luyện tập → Vận dụng → Hướng dẫn về nhà. Định dạng theo Nghị định 30/2020/NĐ-CP.",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage{titlesec}
\\usepackage{xcolor}
% Nghị định 30/2020/NĐ-CP: lề chuẩn văn bản hành chính
% Khổ A4 dọc, lề trên/dưới 2cm, trái 3cm, phải 2cm
% Giãn dòng 1.5, khoảng cách đoạn 6pt, canh đều 2 lề
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
\\titleformat{\\section}{\\large\\bfseries\\MakeUppercase}{\\thesection.}{0.5em}{}
\\renewcommand{\\thesection}{\\Roman{section}}

\\begin{document}

\\begin{center}
{\\Large\\bfseries KẾ HOẠCH BÀI DẠY} \\\\[4pt]
\\textbf{Môn: ........... \\quad Lớp: ........... \\quad Tiết: ...........} \\\\[2pt]
\\textit{Ngày dạy: .../.../...}
\\end{center}
\\rule{\\textwidth}{0.4pt}

\\section{Yêu cầu cần đạt}

\\subsection*{1. Về kiến thức}
\\begin{itemize}
  \\item .....................................
  \\item .....................................
\\end{itemize}

\\subsection*{2. Về năng lực}
\\begin{itemize}
  \\item \\textbf{Năng lực chung:} giao tiếp và hợp tác, tự chủ và tự học, giải quyết vấn đề và sáng tạo
  \\item \\textbf{Năng lực đặc thù môn học:} .....................................
\\end{itemize}

\\subsection*{3. Về phẩm chất}
\\begin{itemize}
  \\item .....................................
\\end{itemize}

\\section{Thiết bị dạy học và học liệu}
\\begin{itemize}
  \\item \\textbf{Giáo viên:} SGK, máy chiếu, phiếu học tập, .....................................
  \\item \\textbf{Học sinh:} SGK, vở ghi, dụng cụ học tập, .....................................
\\end{itemize}

\\section{Tiến trình dạy học}

\\subsection*{1. HOẠT ĐỘNG KHỞI ĐỘNG (5 phút)}
\\textbf{a) Mục tiêu:} Tạo tâm thế, kích thích hứng thú học tập, kết nối kiến thức cũ với bài mới.\\\\
\\textbf{b) Nội dung:} .....................................\\\\
\\textbf{c) Sản phẩm:} .....................................\\\\
\\textbf{d) Tổ chức thực hiện:}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{Bước 1.} Chuyển giao nhiệm vụ: ... & \\\\ \\hline
\\textbf{Bước 2.} HS thực hiện nhiệm vụ & \\\\ \\hline
\\textbf{Bước 3.} Báo cáo kết quả & \\\\ \\hline
\\textbf{Bước 4.} Đánh giá / kết luận & \\\\ \\hline
\\end{tabularx}

\\subsection*{2. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC (25 phút)}
\\textbf{a) Mục tiêu:} .....................................\\\\
\\textbf{b) Nội dung:} .....................................\\\\
\\textbf{c) Sản phẩm:} .....................................\\\\
\\textbf{d) Tổ chức thực hiện:}

\\begin{tabularx}{\\textwidth}{|>{\\raggedright\\arraybackslash}X|>{\\raggedright\\arraybackslash}X|}
\\hline
\\textbf{Hoạt động của Giáo viên} & \\textbf{Hoạt động của Học sinh} \\\\
\\hline
\\textbf{Bước 1.} Chuyển giao nhiệm vụ: ... & \\\\ \\hline
\\textbf{Bước 2.} HS thực hiện nhiệm vụ (cá nhân/nhóm) & \\\\ \\hline
\\textbf{Bước 3.} Báo cáo, thảo luận & \\\\ \\hline
\\textbf{Bước 4.} Đánh giá, kết luận, ghi bảng & \\\\ \\hline
\\end{tabularx}

\\subsection*{3. HOẠT ĐỘNG LUYỆN TẬP (10 phút)}
\\textbf{a) Mục tiêu:} Củng cố, áp dụng kiến thức vừa học.\\\\
\\textbf{b) Nội dung:} Bài tập / câu hỏi luyện tập\\\\
\\textbf{c) Sản phẩm:} Lời giải bài tập\\\\
\\textbf{d) Tổ chức thực hiện:}
\\begin{enumerate}
  \\item GV phát phiếu bài tập / chiếu câu hỏi
  \\item HS làm cá nhân hoặc theo cặp đôi
  \\item GV gọi 2-3 HS chữa bài, các HS khác nhận xét
  \\item GV chốt đáp án + lưu ý lỗi sai phổ biến
\\end{enumerate}

\\subsection*{4. HOẠT ĐỘNG VẬN DỤNG (5 phút)}
\\textbf{a) Mục tiêu:} Vận dụng kiến thức vào tình huống thực tế\\\\
\\textbf{b) Nội dung:} .....................................\\\\
\\textbf{c) Sản phẩm:} .....................................\\\\
\\textbf{d) Tổ chức thực hiện:} .....................................

\\subsection*{5. HƯỚNG DẪN VỀ NHÀ}
\\begin{itemize}
  \\item Học bài cũ: .....................................
  \\item Làm bài tập: .....................................
  \\item Chuẩn bị bài mới: .....................................
\\end{itemize}

\\rule{\\textwidth}{0.4pt}

\\textbf{* IV. ĐIỀU CHỈNH SAU BÀI DẠY}\\\\
.....................................

\\end{document}
`,
  },
  // ────────────────────────────────────────────────────────────────
  // V2 (2026-05-22): Templates có đáp án GẠCH CHÂN — auto-detect
  // Đáp án đúng được wrap trong \underline{...} → parser scan PDF
  // text qua pdftotext + regex sẽ tự nhận biết đáp án nào đúng,
  // giảm 90% thao tác nhập tay phiếu đáp án cho GV.
  // ────────────────────────────────────────────────────────────────
  {
    id: "de-mcq-da-gach-chan",
    name: "✅ Đề trắc nghiệm + đáp án (gạch chân)",
    description: "Mẫu đề 4 lựa chọn ABCD với đáp án ĐÚNG được gạch chân (\\underline). Hệ thống tự nhận diện đáp án — KHÔNG cần nhập tay phiếu trả lời.",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{siunitx}
\\geometry{a4paper, total={170mm,257mm}, left=20mm, right=20mm, top=18mm, bottom=20mm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

% ─── HƯỚNG DẪN GIÁO VIÊN ──────────────────────────────────────────
% Đáp án ĐÚNG được wrap trong \\underline{...} — hệ thống tự nhận diện.
% VD: \\textbf{\\underline{A.}}~Đáp án A.   → A là đáp án đúng
% VD: \\textbf{B.}~Đáp án B.                → B là đáp án sai
%
% Sau khi biên dịch PDF + bấm "Tạo đề" → phiếu đáp án tự điền sẵn,
% GV chỉ cần kiểm tra lại + ấn lưu.
% ─────────────────────────────────────────────────────────────────

\\begin{document}

\\begin{center}
  \\textbf{\\Large ĐỀ KIỂM TRA} \\\\[2pt]
  \\textbf{Môn: ----- \\quad Lớp: ----- \\quad Thời gian: 45 phút}
\\end{center}

\\vspace{6pt}\\hrule\\vspace{8pt}

\\textbf{Họ và tên:} \\dotfill \\quad \\textbf{SBD:} \\dotfill

\\vspace{8pt}

\\section*{Phần I. Trắc nghiệm 4 lựa chọn (đáp án đúng gạch chân)}

\\begin{enumerate}[leftmargin=1.15cm,label=\\textbf{Câu \\arabic*.},itemsep=8pt]
  \\item Cho hàm số $y = x^2 - 4x + 3$. Đỉnh parabol có toạ độ là?

    \\textbf{A.}~$(1; 0)$ \\quad
    \\textbf{\\underline{B.}}~$(2; -1)$ \\quad
    \\textbf{C.}~$(-2; 1)$ \\quad
    \\textbf{D.}~$(0; 3)$

  \\item Phương trình $x^2 - 5x + 6 = 0$ có tổng các nghiệm bằng?

    \\textbf{A.}~$-5$ \\quad
    \\textbf{\\underline{B.}}~$5$ \\quad
    \\textbf{C.}~$6$ \\quad
    \\textbf{D.}~$-6$

  \\item Đạo hàm của $f(x) = \\sin(2x)$ tại $x = \\dfrac{\\pi}{4}$ bằng?

    \\textbf{A.}~$1$ \\quad
    \\textbf{B.}~$-1$ \\quad
    \\textbf{\\underline{C.}}~$0$ \\quad
    \\textbf{D.}~$2$

  \\item Một vật rơi tự do với $g = 9{,}8$ \\si{m/s^2}. Sau \\SI{3}{s}, vận tốc vật bằng?

    \\textbf{A.}~\\SI{19{,}6}{m/s} \\quad
    \\textbf{B.}~\\SI{14{,}7}{m/s} \\quad
    \\textbf{C.}~\\SI{34{,}3}{m/s} \\quad
    \\textbf{\\underline{D.}}~\\SI{29{,}4}{m/s}
\\end{enumerate}

\\vspace{12pt}\\hrule\\vspace{6pt}
\\begin{center}\\textit{--- HẾT ---}\\end{center}

\\end{document}
`,
  },
  {
    id: "bgd-2025-vatly-da-gach-chan",
    name: "⭐✅ Đề BGD 2025 — Vật lí + đáp án gạch chân",
    description: "Mẫu chuẩn Bộ GD 4 phần (TN ABCD · Đúng/Sai · TLN · Tự luận) với đáp án ĐÚNG được gạch chân. Hệ thống tự nhận diện đáp án PHẦN I + PHẦN II, GV chỉ điền phần III + IV thủ công.",
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{siunitx}
\\usepackage{tabularx}
\\usepackage{fancyhdr}
\\geometry{a4paper, total={170mm,257mm}, left=20mm, right=20mm, top=18mm, bottom=20mm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot[C]{\\thepage}
\\renewcommand{\\headrulewidth}{0pt}

% ─── HƯỚNG DẪN ──────────────────────────────────────────────────
% PHẦN I — Đáp án đúng wrap \\underline{\\textbf{X.}}
% PHẦN II — Phát biểu ĐÚNG wrap \\underline{...} cả dòng,
%            phát biểu SAI để nguyên (không gạch chân)
% PHẦN III + IV — gõ tay tại trang đáp án (số/biểu thức quá đa dạng)
% ────────────────────────────────────────────────────────────────

\\begin{document}

\\begin{tabularx}{\\linewidth}{@{}>{\\centering\\arraybackslash}X@{\\hspace{6mm}}>{\\centering\\arraybackslash}X@{}}
\\textbf{SỞ GD ĐT TP. HỒ CHÍ MINH} & \\textbf{KIỂM TRA CUỐI HỌC KỲ II} \\\\[2pt]
\\textbf{TRƯỜNG THPT MINH HOẠ}     & \\textbf{NĂM HỌC 2025 -- 2026}    \\\\[2pt]
\\textbf{ĐỀ THI MINH HOẠ}           & \\textbf{MÔN: VẬT LÍ 11}          \\\\[2pt]
(\\textit{Đề thi có 03 trang})     & \\textit{Thời gian: 45 phút}      \\\\
\\end{tabularx}

\\vspace{4pt}\\hrule\\vspace{8pt}

\\begin{tabularx}{\\linewidth}{@{}X@{\\hspace{6mm}}r@{}}
\\textbf{Họ, tên thí sinh:} \\dotfill\\hspace{0pt} &
\\fbox{\\rule{0pt}{12pt}\\textbf{~Mã đề: 456~}} \\\\[4pt]
\\textbf{Số báo danh:} \\dotfill & \\\\
\\end{tabularx}

\\vspace{6pt}

\\section*{Phần I. Trắc nghiệm 4 lựa chọn (4,0 điểm) — Đáp án đúng gạch chân}

\\begin{enumerate}[leftmargin=1.15cm,label=\\textbf{Câu \\arabic*.},itemsep=6pt]
  \\item Một dòng điện chạy qua dây dẫn có cường độ \\SI{2}{A} trong \\SI{5}{s}. Điện lượng đã chuyển qua tiết diện dây là?

    \\textbf{A.}~\\SI{2{,}5}{C} \\quad
    \\textbf{\\underline{B.}}~\\SI{10}{C} \\quad
    \\textbf{C.}~\\SI{7}{C} \\quad
    \\textbf{D.}~\\SI{3}{C}

  \\item Đại lượng đặc trưng cho khả năng tích điện của tụ điện là?

    \\textbf{A.}~Hiệu điện thế \\quad
    \\textbf{\\underline{B.}}~Điện dung \\quad
    \\textbf{C.}~Năng lượng \\quad
    \\textbf{D.}~Điện trở

  \\item Suất điện động $\\xi = \\SI{12}{V}$, điện trở trong $r = \\SI{1}{\\ohm}$, mạch ngoài $R = \\SI{5}{\\ohm}$. Cường độ dòng điện trong mạch?

    \\textbf{A.}~\\SI{1{,}5}{A} \\quad
    \\textbf{B.}~\\SI{3}{A} \\quad
    \\textbf{\\underline{C.}}~\\SI{2}{A} \\quad
    \\textbf{D.}~\\SI{2{,}4}{A}
\\end{enumerate}

\\section*{Phần II. Trắc nghiệm đúng/sai (2,0 điểm)}
\\textit{Phát biểu ĐÚNG được \\underline{gạch chân}, phát biểu SAI để nguyên.}

\\textbf{Câu 1.} Khi mắc song song 2 điện trở $R_1 = \\SI{6}{\\ohm}$ và $R_2 = \\SI{3}{\\ohm}$:\\\\
a) \\underline{Điện trở tương đương $R_{td} = \\SI{2}{\\ohm}$.}\\\\
b) Cường độ dòng qua $R_1$ lớn hơn qua $R_2$.\\\\
c) \\underline{Hiệu điện thế trên 2 điện trở bằng nhau.}\\\\
d) Tổng dòng điện 2 nhánh bằng dòng mạch chính khi mắc nối tiếp.\\\\

\\textbf{Câu 2.} Về định luật Ohm cho toàn mạch:\\\\
a) \\underline{Cường độ dòng tỉ lệ thuận với suất điện động.}\\\\
b) Điện trở trong tăng làm dòng điện tăng.\\\\
c) \\underline{Khi $R$ ngoài $= 0$, mạch bị đoản mạch.}\\\\
d) Định luật chỉ đúng cho mạch điện một chiều có nguồn lý tưởng.\\\\

\\section*{Phần III. Trả lời ngắn (2,0 điểm)}
\\textit{Mỗi câu 0,5 điểm — GV nhập đáp án thủ công khi tạo phiếu.}

\\textbf{Câu 1.} Cho mạch gồm pin $\\xi = \\SI{6}{V}$, $r = \\SI{0{,}5}{\\ohm}$ mắc với điện trở ngoài $R = \\SI{5{,}5}{\\ohm}$. Cường độ dòng điện qua mạch bằng bao nhiêu (\\si{A})?\\\\[8pt]

\\textbf{Câu 2.} Một tụ điện $C = \\SI{10}{\\micro F}$ được nạp đến hiệu điện thế \\SI{20}{V}. Điện tích trên tụ là bao nhiêu (\\si{\\micro C})?\\\\[8pt]

\\section*{Phần IV. Tự luận (2,0 điểm)}

\\textbf{Câu 1 (1,0đ).} Một dây dẫn có điện trở \\SI{4}{\\ohm}, được mắc nối tiếp với một điện trở khác và một nguồn điện có suất điện động \\SI{9}{V}, điện trở trong \\SI{1}{\\ohm}. Biết hiệu điện thế giữa 2 đầu dây dẫn là \\SI{4}{V}. Tính:\\\\
a) Cường độ dòng điện qua mạch.\\\\
b) Điện trở của điện trở thứ hai.\\\\[40pt]

\\textbf{Câu 2 (1,0đ).} Trình bày cấu tạo + nguyên lý hoạt động của pin Volta.\\\\[40pt]

\\vspace{8pt}\\hrule\\vspace{6pt}
\\begin{center}\\textit{--- HẾT ---}\\end{center}

\\end{document}
`,
  },
);

// ═══════════════════════════════════════════════════════════════
// V3 (2026-05-22): 6 mẫu hướng dẫn AI thêm theo yêu cầu user
// "thêm nhiều mẫu hướng dẫn khác Hướng dẫn dùng AI tạo văn bản LaTeX"
// ═══════════════════════════════════════════════════════════════

LATEX_TEMPLATES.push(
  {
    id: "de-thi-hoc-ky-4-phan-da-gach-chan",
    name: "🎯 Đề thi học kỳ 4 phần (đáp án gạch chân — AI sinh từ ý)",
    description: "AI sinh đề thi học kỳ chuẩn BGD 2025 từ chỉ vài keyword chương + dạng bài. Đáp án ĐÚNG được auto-gạch chân để system tự nhận diện.",
    category: "exam",
    audience: "GV THCS/THPT",
    tags: ["đề thi", "học kỳ", "4 phần", "đáp án gạch chân", "AI sinh tự động"],
    aiPrompt: `Tôi cần soạn đề thi học kỳ chuẩn BGD 2025 — 4 phần — với đáp án ĐÚNG được gạch chân tự động bằng \\underline{} để hệ thống parser tự nhận diện đáp án.

THÔNG TIN ĐỀ:
- Môn: [VD: Vật lí]
- Khối: [VD: 11]
- Học kỳ: [I/II]
- Thời gian: [VD: 45 phút / 90 phút]
- Tỉ lệ điểm: 4-2-2-2 (đúng theo BGD)
- Trường: [Tên trường]
- Mã đề: 456 (hoặc bạn tự đặt)

NỘI DUNG TÔI MUỐN ĐỀ KIỂM TRA (chỉ cần liệt kê chương + dạng bài chính):
[VD:
- Chương 1 Dòng điện không đổi: định luật Ohm cho toàn mạch, ghép nguồn nối tiếp/song song
- Chương 2 Điện trường: tụ điện, năng lượng tụ
- Chương 3 Dòng điện trong môi trường: bán dẫn, điện phân
- Câu tự luận: Mạch hỗn hợp + Định lý Kirchhoff
]

CẤU TRÚC BẮT BUỘC:
PHẦN I (4,0đ): 16 câu trắc nghiệm 4 lựa chọn (mỗi câu 0.25đ)
  → Đáp án ĐÚNG wrap \\textbf{\\underline{X.}}~ (X = A/B/C/D)
  → Phân bổ: 8 câu Nhận biết-Hiểu, 6 câu Vận dụng, 2 câu Vận dụng cao
  → Đa dạng chương (5-6 câu/chương)

PHẦN II (2,0đ): 4 câu trắc nghiệm Đúng/Sai 4 mệnh đề (mỗi mệnh đề 0.125đ)
  → Phát biểu ĐÚNG wrap \\underline{...} cả dòng
  → Phát biểu SAI để nguyên
  → Mỗi câu nên có 2-3 mệnh đề Đúng và 1-2 mệnh đề Sai

PHẦN III (2,0đ): 6 câu trả lời ngắn (số / biểu thức)
  → KHÔNG gạch chân đáp án (GV sẽ nhập tay phiếu)
  → Mỗi câu kết quả là 1 con số có đơn vị SI

PHẦN IV (2,0đ): 4 câu tự luận
  → Câu 1-2 (0.5đ mỗi câu): Giải bài toán có sẵn cách
  → Câu 3 (1.0đ): Vận dụng nguyên lý
  → KHÔNG cần đáp án (GV sẽ chấm rubric)

YÊU CẦU TECHNICAL LATEX:
- Header 2 cột chuẩn BGD: SỞ GD + Trường // Đề thi + Năm học + Môn + Mã đề
- Bookmark: \\usepackage{geometry,enumitem,amsmath,amssymb,siunitx,tabularx,fancyhdr}
- \\geometry{a4paper,total={170mm,257mm},left=20mm,right=20mm,top=18mm,bottom=20mm}
- Font 12pt, parskip 4pt
- Đánh số trang chân trang giữa
- Cuối có "--- HẾT ---"
- Hỗ trợ tiếng Việt: babel vietnamese, inputenc utf8

XUẤT RA: 1 file LaTeX hoàn chỉnh từ \\documentclass đến \\end{document},
KHÔNG kèm giải thích, KHÔNG markdown code fence.

Sau khi nhận code, tôi sẽ paste vào /teacher/latex-documents → bấm
"📄 Tạo đề PDF" → hệ thống tự detect đáp án PHẦN I + II từ \\underline{}
và pre-fill phiếu đáp án (giảm 90% thao tác thủ công).`,
    body: `% Template này CHỈ là khung — dùng AI prompt để sinh đề đầy đủ
\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb,siunitx,enumitem,geometry,tabularx,fancyhdr}
\\geometry{a4paper,total={170mm,257mm},left=20mm,right=20mm,top=18mm,bottom=20mm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}
\\pagestyle{fancy}\\fancyhf{}\\fancyfoot[C]{\\thepage}\\renewcommand{\\headrulewidth}{0pt}

\\begin{document}
\\begin{center}
\\textbf{[TRƯỜNG / SỞ GD]}\\\\
\\textbf{KIỂM TRA HỌC KỲ [I/II] -- NĂM HỌC 2025--2026}\\\\
\\textbf{Môn: [...]} \\quad Khối: [...] \\quad Thời gian: [...] phút
\\end{center}

\\vspace{4pt}\\hrule\\vspace{8pt}

\\section*{Phần I. Trắc nghiệm (4,0 điểm)}

\\begin{enumerate}[leftmargin=1.15cm,label=\\textbf{Câu \\arabic*.}]
  \\item [Câu hỏi 1 ...]\\\\
    \\textbf{A.}~Đáp án A \\quad
    \\textbf{\\underline{B.}}~Đáp án B \\quad
    \\textbf{C.}~Đáp án C \\quad
    \\textbf{D.}~Đáp án D
  % Thêm 15 câu nữa qua AI prompt
\\end{enumerate}

% ── PHẦN II/III/IV xem trong AI prompt ──

\\vspace{8pt}\\hrule
\\begin{center}\\textit{--- HẾT ---}\\end{center}
\\end{document}
`,
  },
  {
    id: "so-ke-hoach-hoat-dong",
    name: "📅 Sổ kế hoạch hoạt động (sự kiện / ngoại khoá)",
    description: "Sổ tay lập kế hoạch chi tiết cho 1 hoạt động: mục tiêu, ngân sách, timeline, phân công, rủi ro. Dùng cho ngày hội STEM, dã ngoại, văn nghệ...",
    category: "admin",
    audience: "GV chủ nhiệm / Đoàn / TPT",
    tags: ["kế hoạch", "hoạt động", "sự kiện", "ngoại khoá", "STEM"],
    aiPrompt: `Hãy giúp tôi viết Sổ kế hoạch cho một hoạt động bằng LaTeX, theo chuẩn văn bản hành chính NĐ 30/2020.

THÔNG TIN HOẠT ĐỘNG:
- Tên hoạt động: [VD: "Ngày hội STEM 2026 — Khám phá AI và Robot"]
- Đơn vị tổ chức: [Trường THPT XYZ + Tổ Lý-Hoá-Tin]
- Ngày tổ chức: [DD/MM/YYYY]
- Địa điểm: [Sân trường / Hội trường / Online]
- Đối tượng tham gia: [Số lượng + lớp/khối]
- Mục tiêu chính: [2-3 mục tiêu rõ ràng, đo được]

CẤU TRÚC SỔ KẾ HOẠCH (BẮT BUỘC 8 mục):

1. MỤC ĐÍCH - YÊU CẦU
   - Mục đích: 2-3 ý chính
   - Yêu cầu cụ thể (đo được): VD "100% HS khối 10-11 tham gia"

2. THỜI GIAN, ĐỊA ĐIỂM, ĐỐI TƯỢNG
   - Bảng cụ thể

3. NỘI DUNG CHƯƠNG TRÌNH (BẢNG TIMELINE chi tiết theo giờ)
   - VD: 7:30-8:00 Đón tiếp + check-in
         8:00-8:30 Khai mạc + văn nghệ chào mừng
         8:30-10:00 Vòng thi sơ loại 5 đội (4 phòng song song)
         10:00-10:15 Giải lao
         ... đến hết hoạt động

4. PHÂN CÔNG NHIỆM VỤ (BẢNG: TT | Họ tên | Chức vụ | Nhiệm vụ | Deadline)
   - Tối thiểu 8-12 người trong ban tổ chức

5. DỰ TRÙ KINH PHÍ (BẢNG: TT | Nội dung | Số lượng | Đơn giá | Thành tiền)
   - Bao gồm: vật tư, giải thưởng, ăn nhẹ, marketing, dự phòng 10%
   - Tổng cộng + ghi rõ nguồn (kinh phí trường / xã hội hoá / phụ huynh tài trợ)

6. CƠ SỞ VẬT CHẤT - TRANG THIẾT BỊ (Liệt kê: âm thanh, máy chiếu, bàn ghế, sân...)

7. AN TOÀN - RỦI RO (BẢNG: Rủi ro | Mức độ | Biện pháp phòng ngừa | Xử lý khi xảy ra)
   - VD: Mưa - Trung bình - Có lều bạt dự phòng - Chuyển hoạt động vào hội trường
   - VD: HS bị thương - Thấp - Có y tế trực - Sơ cứu + báo PH ngay

8. ĐÁNH GIÁ - TỔNG KẾT
   - Hình thức: khảo sát Google Form sau sự kiện
   - Tiêu chí đánh giá: số HS tham gia, mức độ hài lòng (≥4/5), số sản phẩm ra mắt

YÊU CẦU LATEX:
- Lề chuẩn NĐ 30: top=2cm, bottom=2cm, left=3cm, right=2cm
- Linespread 1.5, font 13pt
- Quốc hiệu Tiêu ngữ trên cùng + Số văn bản (.../KH-[viết tắt])
- Có chỗ ký Hiệu trưởng + Tổ trưởng + Người lập kế hoạch
- \\usepackage{geometry,array,tabularx,booktabs,longtable,xcolor}
- Bảng tabularx full-width cho timeline + phân công + ngân sách

XUẤT RA: code LaTeX hoàn chỉnh, KHÔNG kèm giải thích.`,
    body: `\\documentclass[13pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry,array,tabularx,booktabs,longtable}
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{1.27cm}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\noindent\\begin{minipage}[t]{0.5\\textwidth}\\centering
\\textbf{TRƯỜNG THPT [...]}\\\\
\\textbf{TỔ [...]}\\\\\\rule{4cm}{0.4pt}\\\\
\\textit{Số: ...../KH-[...]}
\\end{minipage}%
\\begin{minipage}[t]{0.5\\textwidth}\\centering
\\textbf{CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM}\\\\
\\textbf{Độc lập -- Tự do -- Hạnh phúc}\\\\\\rule{4cm}{0.4pt}\\\\
\\textit{[Địa danh], ngày .... tháng .... năm 20....}
\\end{minipage}

\\vspace{18pt}
\\begin{center}\\Large\\textbf{KẾ HOẠCH}\\\\\\large\\textit{Tổ chức [TÊN HOẠT ĐỘNG]}\\end{center}

\\vspace{6pt}

\\section*{I. MỤC ĐÍCH -- YÊU CẦU}
\\textbf{1. Mục đích:} [Ý 1...] [Ý 2...] [Ý 3...]\\\\
\\textbf{2. Yêu cầu:} [Yêu cầu đo được 1...] [Yêu cầu 2...]

\\section*{II. THỜI GIAN, ĐỊA ĐIỂM, ĐỐI TƯỢNG}
\\begin{itemize}
  \\item \\textbf{Thời gian:} ngày ....../....../20.....
  \\item \\textbf{Địa điểm:} [...]
  \\item \\textbf{Đối tượng:} [Số lượng + lớp]
\\end{itemize}

\\section*{III. NỘI DUNG CHƯƠNG TRÌNH}
\\begin{tabularx}{\\linewidth}{|c|c|X|c|}
\\hline
\\textbf{TT} & \\textbf{Thời gian} & \\textbf{Nội dung} & \\textbf{Phụ trách}\\\\\\hline
1 & 7:30 -- 8:00 & Đón tiếp + check-in & [Tên]\\\\\\hline
2 & 8:00 -- 8:30 & Khai mạc & [Tên]\\\\\\hline
% AI sẽ điền tiếp...
\\end{tabularx}

\\section*{IV. PHÂN CÔNG NHIỆM VỤ}
% AI sẽ tạo bảng

\\section*{V. DỰ TRÙ KINH PHÍ}
% AI sẽ tạo bảng

\\section*{VI. CƠ SỞ VẬT CHẤT}
% Liệt kê

\\section*{VII. AN TOÀN -- RỦI RO}
% Bảng phân tích

\\section*{VIII. ĐÁNH GIÁ -- TỔNG KẾT}
% Tiêu chí đo

\\vspace{20pt}
\\begin{minipage}[t]{0.5\\textwidth}\\centering
\\textbf{HIỆU TRƯỞNG}\\\\(Phê duyệt)\\\\[60pt][Họ tên]
\\end{minipage}%
\\begin{minipage}[t]{0.5\\textwidth}\\centering
\\textbf{NGƯỜI LẬP KẾ HOẠCH}\\\\(Ký, ghi rõ họ tên)\\\\[60pt][Họ tên]
\\end{minipage}

\\end{document}
`,
  },
  {
    id: "phieu-danh-gia-tt22",
    name: "✅ Phiếu đánh giá HS theo TT22/2021",
    description: "Phiếu đánh giá HS theo Thông tư 22/2021: phẩm chất + năng lực + nhận xét chi tiết. Dùng cuối kỳ/cuối năm.",
    category: "admin",
    audience: "GV chủ nhiệm",
    tags: ["đánh giá", "TT22", "học bạ", "chủ nhiệm"],
    aiPrompt: `Tạo Phiếu đánh giá học sinh theo Thông tư 22/2021/TT-BGDĐT bằng LaTeX.

THÔNG TIN HS:
- Họ tên: [...]
- Lớp: [...]
- Học kỳ: [I/II], năm học [20.... -- 20....]
- GV chủ nhiệm: [...]

CẤU TRÚC PHIẾU (theo TT22/2021):

PHẦN A. ĐÁNH GIÁ PHẨM CHẤT CHỦ YẾU (5 phẩm chất, mỗi cái 3 mức: Tốt/Đạt/Cần cố gắng)
1. Yêu nước
2. Nhân ái
3. Chăm chỉ
4. Trung thực
5. Trách nhiệm

PHẦN B. ĐÁNH GIÁ NĂNG LỰC (3 NL chung + 7 NL chuyên môn)
NL Chung:
1. Tự chủ và tự học
2. Giao tiếp và hợp tác
3. Giải quyết vấn đề và sáng tạo

NL Chuyên môn (chọn các môn HS học):
4. NL Ngôn ngữ
5. NL Tính toán
6. NL Khoa học
7. NL Công nghệ
8. NL Tin học
9. NL Thẩm mỹ
10. NL Thể chất

PHẦN C. ĐIỂM TỔNG KẾT CÁC MÔN HỌC (BẢNG: Môn | Điểm TBm HKI | Điểm TBm HKII | Điểm TBm Cả năm | Xếp loại)
- Tự sinh 12 môn THPT chuẩn: Toán, Lý, Hoá, Sinh, Văn, Sử, Địa, GDCD, Tin, CN, Anh, GDQP

PHẦN D. KẾT QUẢ RÈN LUYỆN
- Hạnh kiểm: Tốt/Khá/TB/Yếu
- Học lực: Giỏi/Khá/TB/Yếu/Kém
- Danh hiệu: HS Giỏi/HS Tiên tiến/...

PHẦN E. NHẬN XÉT CỦA GV CHỦ NHIỆM (3-5 dòng nhận xét tích cực + 1-2 ý cần cải thiện)

PHẦN F. CHỮ KÝ
- HS, GVCN, Hiệu trưởng, Phụ huynh

YÊU CẦU LATEX:
- Lề chuẩn NĐ 30
- Có ô tick (\\Box / \\CheckedBox) cho 3 mức Tốt/Đạt/Cần cố gắng
- Bảng điểm tabularx full-width
- Phù hợp in A4 1 trang (compact font 11-12pt)
- Header có logo trường (placeholder) + tên trường + năm học

XUẤT: code LaTeX hoàn chỉnh.`,
    body: `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry,array,tabularx,booktabs,wasysym}
\\geometry{top=1.5cm,bottom=1.5cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{3pt}

\\begin{document}

\\begin{center}
\\textbf{SỞ GD\\&ĐT [...]} \\quad \\textbf{TRƯỜNG THPT [...]}\\\\[4pt]
\\Large\\textbf{PHIẾU ĐÁNH GIÁ HỌC SINH}\\\\
\\normalsize\\textit{(Theo Thông tư 22/2021/TT-BGDĐT)}\\\\
\\textit{Học kỳ [I/II] -- Năm học 20.... -- 20....}
\\end{center}

\\vspace{6pt}
\\noindent\\textbf{Họ và tên:} [...] \\hfill \\textbf{Lớp:} [...] \\hfill \\textbf{GVCN:} [...]

\\section*{A. ĐÁNH GIÁ PHẨM CHẤT CHỦ YẾU}
\\begin{tabularx}{\\linewidth}{|X|c|c|c|}\\hline
\\textbf{Phẩm chất} & \\textbf{Tốt} & \\textbf{Đạt} & \\textbf{Cần cố gắng}\\\\\\hline
1. Yêu nước     & $\\Box$ & $\\Box$ & $\\Box$\\\\\\hline
2. Nhân ái      & $\\Box$ & $\\Box$ & $\\Box$\\\\\\hline
3. Chăm chỉ     & $\\Box$ & $\\Box$ & $\\Box$\\\\\\hline
4. Trung thực   & $\\Box$ & $\\Box$ & $\\Box$\\\\\\hline
5. Trách nhiệm  & $\\Box$ & $\\Box$ & $\\Box$\\\\\\hline
\\end{tabularx}

% AI sẽ generate phần B/C/D/E/F theo yêu cầu

\\end{document}
`,
  },
  {
    id: "noi-quy-lop-hoc",
    name: "📋 Nội quy lớp học (GVCN)",
    description: "Nội quy lớp học chuẩn — 10 quy định + cam kết HS + hình thức xử lý vi phạm",
    category: "admin",
    audience: "GV chủ nhiệm",
    tags: ["nội quy", "chủ nhiệm", "lớp học"],
    aiPrompt: `Soạn Nội quy lớp học bằng LaTeX, ngắn gọn 1-2 trang, phù hợp dán bảng tin lớp.

THÔNG TIN:
- Lớp: [VD: 11A1]
- Trường: [Tên trường]
- GVCN: [Tên]
- Năm học: 20.... -- 20....

YÊU CẦU NỘI QUY (10 điều, ngôn ngữ HS dễ hiểu):

1. ĐI HỌC
   - Đến đúng giờ (trước 7h sáng)
   - Nghỉ học phải có đơn + chữ ký PH
   - Mặc đồng phục theo quy định

2. HỌC TẬP
   - Mang đủ sách vở + dụng cụ
   - Làm bài tập + chuẩn bị bài trước khi đến lớp
   - Phát biểu xây dựng bài, không nói chuyện riêng

3. KỶ LUẬT TRONG LỚP
   - Tôn trọng GV + bạn bè
   - Không sử dụng điện thoại trong giờ học (trừ khi GV yêu cầu)
   - Không ăn quà vặt trong giờ

4. AN TOÀN
   - Không chạy đùa hành lang/cầu thang
   - Không mang vật dụng nguy hiểm
   - Báo ngay GV khi bị thương / có sự cố

5. VỆ SINH
   - Trực nhật đúng lịch
   - Không xả rác bừa
   - Bảo quản tài sản chung lớp

6. ĐOÀN KẾT
   - Giúp đỡ bạn học yếu hơn
   - Không bắt nạt / kỳ thị
   - Hoà nhập với bạn mới

7. HOẠT ĐỘNG NGOẠI KHOÁ
   - Tham gia đầy đủ
   - Có thái độ tích cực
   - Đại diện danh dự lớp khi thi đấu

8. SỬ DỤNG INTERNET / AI
   - Dùng có trách nhiệm
   - Không gian lận khi làm bài
   - Không chia sẻ tài liệu mật

9. QUAN HỆ VỚI PH + GV
   - Trung thực khi báo cáo kết quả
   - Tích cực phản hồi feedback
   - Cùng PH tham dự họp lớp

10. CAM KẾT CÁ NHÂN
    - Mỗi HS cam kết tuân thủ và ký tên vào cuối nội quy

HÌNH THỨC XỬ LÝ VI PHẠM (3 mức):
- Lần 1: Nhắc nhở
- Lần 2: Cảnh cáo + báo PH
- Lần 3: Hạ hạnh kiểm + báo BGH

YÊU CẦU LATEX:
- 1-2 trang A4, font 12pt readable
- Mỗi điều có icon emoji đầu dòng để vui mắt
- Hộp tô màu (\\fbox / tcolorbox) cho phần cam kết
- Cuối có chỗ ký GVCN + Lớp trưởng + 30 dòng cho HS ký

XUẤT: code LaTeX hoàn chỉnh.`,
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry,enumitem,tcolorbox}
\\geometry{top=1.5cm,bottom=1.5cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\begin{center}
\\textbf{TRƯỜNG THPT [...]}\\\\
\\Large\\textbf{NỘI QUY LỚP HỌC}\\\\
\\normalsize\\textit{Lớp [11A1] -- Năm học 20....--20....}\\\\
\\textit{GVCN: [...]}
\\end{center}

\\vspace{8pt}\\hrule\\vspace{8pt}

\\begin{enumerate}[label=\\textbf{Điều \\arabic*.}]
  \\item 🕐 \\textbf{Đi học đúng giờ} -- Có mặt trước 7h00, mặc đồng phục.
  \\item 📚 \\textbf{Học tập nghiêm túc} -- Đủ sách vở, làm bài tập, phát biểu xây dựng.
  % AI sẽ generate 8 điều còn lại theo prompt
\\end{enumerate}

\\begin{tcolorbox}[colback=red!5,colframe=red!50!black,title=Hình thức xử lý vi phạm]
\\begin{itemize}
  \\item Lần 1: Nhắc nhở
  \\item Lần 2: Cảnh cáo + báo PH
  \\item Lần 3: Hạ hạnh kiểm + báo BGH
\\end{itemize}
\\end{tcolorbox}

\\vspace{14pt}
\\begin{tcolorbox}[colback=blue!5,colframe=blue!50!black,title=Cam kết của học sinh]
Tôi cam kết tuân thủ đầy đủ 10 điều nội quy trên và chịu trách nhiệm trước GVCN, BGH nhà trường về mọi hành vi của mình.

\\vspace{8pt}
\\textbf{Người cam kết}\\\\(Họ tên + chữ ký)\\\\\\rule{6cm}{0.4pt}
\\end{tcolorbox}

\\end{document}
`,
  },
  {
    id: "bao-cao-thuc-tap-su-pham",
    name: "📖 Báo cáo thực tập sư phạm (SV)",
    description: "Báo cáo thực tập 8 tuần dành cho SV sư phạm — đầy đủ phần A-H + chữ ký GV hướng dẫn",
    category: "research",
    audience: "Sinh viên sư phạm",
    tags: ["thực tập", "sư phạm", "sinh viên", "báo cáo"],
    aiPrompt: `Viết Báo cáo thực tập sư phạm cuối khoá bằng LaTeX cho SV ngành sư phạm.

THÔNG TIN SV:
- Họ tên: [...]
- MSSV: [...]
- Khoa: [...] (VD: Sư phạm Vật lí)
- Trường ĐH: [...]
- Năm 4 - Khoá [...]

ĐỊA ĐIỂM THỰC TẬP:
- Trường: [...]
- Lớp thực tập: [...]
- GV hướng dẫn (giáo viên ở trường THPT): [...]
- Thời gian thực tập: từ DD/MM đến DD/MM (8 tuần)

NỘI DUNG BÁO CÁO (8 phần A-H):

A. LỜI CẢM ƠN (1 đoạn ngắn)

B. ĐẶC ĐIỂM TÌNH HÌNH NHÀ TRƯỜNG
- Quy mô, đội ngũ, cơ sở vật chất
- Truyền thống, thành tích nổi bật

C. KẾ HOẠCH THỰC TẬP CHI TIẾT
- Tuần 1: Làm quen + dự giờ
- Tuần 2-4: Dự giờ + chuẩn bị bài
- Tuần 5-7: Dạy thử + dạy chính thức
- Tuần 8: Tổng kết

D. NỘI DUNG GIẢNG DẠY
Bảng các tiết đã dạy:
| Tuần | Lớp | Bài | Loại tiết | GV dự giờ | Điểm |

E. CÔNG TÁC CHỦ NHIỆM
- Tổ chức sinh hoạt lớp
- Tham gia hoạt động ngoại khoá
- Liên hệ với phụ huynh

F. NHỮNG BÀI HỌC KINH NGHIỆM (chia 3 mục):
1. Về chuyên môn (5 ý)
2. Về phương pháp sư phạm (5 ý)
3. Về xử lý tình huống (3 case study cụ thể)

G. KIẾN NGHỊ
- Với nhà trường thực tập
- Với khoa/trường ĐH
- Với bản thân

H. ĐÁNH GIÁ TỔNG KẾT
- Điểm rèn luyện: [tự đánh giá]
- Điểm chuyên môn: [...]
- Xếp loại: Giỏi/Khá/TB

YÊU CẦU LATEX:
- 20-30 trang, font 13pt, linespread 1.5
- Có \\tableofcontents + đánh số trang
- Bảng dạy + bảng dự giờ chi tiết
- Phụ lục: photo ảnh chứng nhận + giáo án mẫu
- Chữ ký: SV + GV hướng dẫn THPT + Hiệu trưởng + Cán bộ chỉ đạo ĐH

XUẤT: code LaTeX hoàn chỉnh.`,
    body: `\\documentclass[13pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry,tabularx,booktabs,enumitem}
\\geometry{top=2cm,bottom=2cm,left=3cm,right=2cm}
\\linespread{1.5}
\\setlength{\\parindent}{1.27cm}

\\begin{document}

\\begin{center}
\\textbf{TRƯỜNG ĐẠI HỌC [...]}\\\\
\\textbf{KHOA [SƯ PHẠM ...]}\\\\[20pt]
{\\Huge\\textbf{BÁO CÁO THỰC TẬP SƯ PHẠM}}\\\\[8pt]
\\Large\\textbf{Năm học 20.... -- 20....}\\\\[30pt]

\\begin{tabular}{rl}
SV thực hiện: & [...]\\\\
MSSV: & [...]\\\\
Khoa: & [...]\\\\
Trường thực tập: & [...]\\\\
GVHD ở trường: & [...]\\\\
GVHD ở khoa: & [...]
\\end{tabular}
\\end{center}

\\vfill\\begin{center}[Địa danh], tháng .... năm 20....\\end{center}
\\newpage
\\tableofcontents
\\newpage

% AI sẽ sinh đầy đủ 8 phần A-H theo prompt

\\end{document}
`,
  },
  {
    id: "ke-hoach-chu-nhiem-thang",
    name: "📅 Kế hoạch chủ nhiệm tháng (GVCN)",
    description: "Kế hoạch tháng cho GVCN: hoạt động tuần × HS cá biệt × tổ chức ngoại khoá × kết nối PH",
    category: "admin",
    audience: "GV chủ nhiệm",
    tags: ["chủ nhiệm", "kế hoạch tháng", "GVCN"],
    aiPrompt: `Soạn Kế hoạch chủ nhiệm tháng [Tháng X/20YY] bằng LaTeX cho GVCN.

THÔNG TIN:
- GVCN: [...]
- Lớp: [...]
- Tháng: [VD: 10/2025]
- Năm học: 2025-2026

NỘI DUNG KH (6 mục):

I. ĐÁNH GIÁ THÁNG TRƯỚC
- Ưu điểm (3 ý)
- Hạn chế (2 ý)
- Bài học rút ra (2 ý)

II. MỤC TIÊU THÁNG NÀY (SMART)
- Học tập: [đo được, VD "ĐTBm lớp ≥ 7.2"]
- Hạnh kiểm: [VD "≤ 2 HS bị nhắc nhở/tháng"]
- Hoạt động: [VD "100% HS tham gia ngày hội STEM 15/10"]

III. KẾ HOẠCH HOẠT ĐỘNG THEO TUẦN (Bảng: Tuần | Hoạt động chính | Người phụ trách | Kết quả mong đợi)
- 4-5 tuần trong tháng

IV. THEO DÕI HỌC SINH CẦN QUAN TÂM (Bảng cá biệt)
- HS yếu học tập (3-5 em): tên + điểm yếu + biện pháp
- HS có hành vi cần điều chỉnh (1-3 em): tên + biểu hiện + hướng xử lý
- HS xuất sắc cần phát huy (3-5 em): tên + thế mạnh + bồi dưỡng

V. KẾT NỐI PHỤ HUYNH
- Lịch họp PH: [...]
- Báo cáo tuần qua nhóm Zalo PH
- Cá nhân: liên hệ PH của HS cá biệt

VI. KIỂM TRA - ĐÁNH GIÁ
- Kiểm tra giữa tháng: [Ngày + cách]
- Tổng kết cuối tháng: tự đánh giá + báo cáo TBM

YÊU CẦU LATEX:
- A4, font 12pt, lề NĐ 30
- 3 bảng tabularx full-width cho mục III, IV
- Có chỗ ký GVCN + Tổ trưởng + BGH
- Compact 2-3 trang max

XUẤT: code LaTeX hoàn chỉnh.`,
    body: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{geometry,tabularx,booktabs,enumitem}
\\geometry{top=1.8cm,bottom=1.8cm,left=2.5cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{5pt}

\\begin{document}

\\begin{center}
\\textbf{TRƯỜNG THPT [...]}\\\\
\\Large\\textbf{KẾ HOẠCH CHỦ NHIỆM THÁNG [.../20....]}\\\\
\\normalsize\\textit{Lớp [...] -- GVCN: [...]}
\\end{center}

\\section*{I. ĐÁNH GIÁ THÁNG TRƯỚC}
% AI generate

\\section*{II. MỤC TIÊU THÁNG NÀY}
% AI generate

\\section*{III. KẾ HOẠCH THEO TUẦN}
\\begin{tabularx}{\\linewidth}{|c|X|c|c|}\\hline
\\textbf{Tuần} & \\textbf{Hoạt động} & \\textbf{Phụ trách} & \\textbf{KQ mong đợi}\\\\\\hline
% AI fill 4-5 rows
\\end{tabularx}

\\section*{IV. HỌC SINH CẦN QUAN TÂM}
% Bảng cá biệt

\\section*{V. KẾT NỐI PHỤ HUYNH}
% List

\\section*{VI. KIỂM TRA -- ĐÁNH GIÁ}
% Lịch + cách

\\vspace{16pt}
\\noindent\\begin{minipage}[t]{0.5\\textwidth}\\centering
\\textit{Duyệt Tổ trưởng}\\\\[40pt][Tên]
\\end{minipage}%
\\begin{minipage}[t]{0.5\\textwidth}\\centering
\\textbf{GVCN}\\\\[40pt][Tên]
\\end{minipage}

\\end{document}
`,
  },
);

export function getTemplateById(id: string): LatexTemplateOption | undefined {
  return LATEX_TEMPLATES.find((t) => t.id === id);
}
