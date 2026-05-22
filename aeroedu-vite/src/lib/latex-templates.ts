/**
 * Static LaTeX templates for teacher documents.
 * Used when creating new project or applying template in editor.
 */

export interface LatexTemplateOption {
  id: string;
  name: string;
  description?: string;
  body: string;
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

export function getTemplateById(id: string): LatexTemplateOption | undefined {
  return LATEX_TEMPLATES.find((t) => t.id === id);
}
