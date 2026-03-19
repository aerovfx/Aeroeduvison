/**
 * Generate LaTeX document content from exam matrix or exam.
 */

const PREAMBLE = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{graphicx}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

%================ HEADER =================
\\begin{center}
\\begin{minipage}[t]{0.45\\textwidth}
\\centering
\\textbf{SỞ GD \\& ĐT TP. HỒ CHÍ MINH} \\\\
\\textbf{TRƯỜNG THPT} \\\\
\\textbf{ĐỀ THI CHÍNH THỨC} \\\\
\\textbf{(Đề thi có 3 trang)}
\\rule{5cm}{0.4pt}
\\end{minipage}
\\begin{minipage}[t]{0.54\\textwidth}
\\centering
\\textbf{KIỂM TRA GIỮA HỌC KỲ II} \\\\
\\textbf{NĂM HỌC 2025 -- 2026} \\\\
\\textbf{MÔN: VẬT LÍ 10} \\\\
\\textit{Thời gian làm bài: 45 phút}
\\end{minipage}
\\end{center}

\\begin{center}
\\begin{minipage}[t]{0.45\\textwidth}
\\textbf{Họ, tên thí sinh: ...............................}\\\\
\\textbf{Số báo danh......................................} \\\\
\\end{minipage}
\\begin{minipage}[t]{0.54\\textwidth}
\\centering
\\framebox[4cm][c]{\\textbf{Mã đề: 102}}
\\end{minipage}
\\end{center}

`;

const END_DOC = "\n\n\\rule{\\textwidth}{0.4pt}\n\\begin{center}\n\\textit{--- HẾT ---}\n\\end{center}\n\\end{document}\n";

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/[#$%&_{}]/g, "\\$&")
    .replace(/\n/g, "\\\\\n");
}

function formatOptions(options: string[], correctIndex: string | null): string {
  return (options || [])
    .slice(0, 4)
    .map((opt, i) => `    \\\\ ${String.fromCharCode(65 + i)}. ${escapeLatex(opt)}`)
    .join(" \\quad ");
}

export interface QuestionForExport {
  id: string;
  content: string;
  options: string[];
  correctAnswer: string | null;
  questionType?: string;
}

export function generateTexFromQuestions(
  title: string,
  subtitle: string,
  questions: QuestionForExport[]
): string {
  const mcqQuestions = questions.filter(q => q.questionType !== 'TRUE_FALSE' && q.questionType !== 'SHORT_ANSWER');
  const tfQuestions = questions.filter(q => q.questionType === 'TRUE_FALSE');
  const shortAnswerQuestions = questions.filter(q => q.questionType === 'SHORT_ANSWER');

  let body = "";

  // PHẦN I - Multiple Choice
  if (mcqQuestions.length > 0) {
    body += `\\section*{PHẦN I. CÂU TRẮC NGHIỆM NHIỀU LỰA CHỌN (4,0 ĐIỂM)}\n`;
    body += `\\textit{Học sinh trả lời từ câu 1 đến câu ${mcqQuestions.length}. Mỗi câu đúng được 0,25 điểm.}\\par\\medskip\n\n`;
    body += `\\begin{enumerate}[left=0pt, label=\\textbf{Câu \\arabic*.}]\n`;
    body += mcqQuestions
      .map((q, i) => `\\item ${escapeLatex(q.content)}${formatOptions(q.options, q.correctAnswer)}`)
      .join("\n\n    ");
    body += `\n\\end{enumerate}\n\n`;
  }

  // PHẦN II - True/False
  if (tfQuestions.length > 0) {
    body += `\\section*{PHẦN II. TRẮC NGHIỆM ĐÚNG/SAI (2,0 ĐIỂM)}\n`;
    body += `\\textit{Thí sinh chọn Đúng hoặc Sai cho mỗi ý a, b, c, d của các câu sau.}\\par\\medskip\n\n`;
    tfQuestions.forEach((q, i) => {
      body += `\\textbf{Câu ${i + 1}.} ${escapeLatex(q.content)}\n`;
      if (q.options && q.options.length >= 4) {
        for (let j = 0; j < 4; j++) {
          body += `\\\\ ${String.fromCharCode(97 + j)}) ${escapeLatex(q.options[j])}\n`;
        }
      }
      body += `\n`;
    });
  }

  // PHẦN III - Short Answer
  if (shortAnswerQuestions.length > 0) {
    body += `\\section*{PHẦN III. TRẢ LỜI NGẮN (2,0 ĐIỂM)}\n`;
    body += `\\textit{Mỗi câu trả lời đúng được 0,5 điểm.}\\par\\medskip\n\n`;
    shortAnswerQuestions.forEach((q, i) => {
      body += `\\textbf{Câu ${i + 1}:} ${escapeLatex(q.content)} \\\\\n`;
    });
  }

  return PREAMBLE + body + END_DOC;
}
