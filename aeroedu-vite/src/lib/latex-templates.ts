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
];

export function getTemplateById(id: string): LatexTemplateOption | undefined {
  return LATEX_TEMPLATES.find((t) => t.id === id);
}
