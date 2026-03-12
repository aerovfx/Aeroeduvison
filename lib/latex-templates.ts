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
