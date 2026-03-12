/**
 * Generate LaTeX document content from exam matrix or exam.
 */

const PREAMBLE = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath}
\\usepackage{geometry}
\\usepackage{enumitem}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}

\\begin{document}
`;

const END_DOC = "\n\\end{document}\n";

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/[#$%&_{}]/g, "\\$&")
    .replace(/\n/g, "\\\\\n");
}

function formatOptions(options: string[], correctIndex: string | null): string {
  const labels = ["A", "B", "C", "D"];
  return (options || [])
    .slice(0, 4)
    .map((opt, i) => `    \\item ${escapeLatex(opt)}`)
    .join("\n");
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
  const body = questions
    .map((q, i) => {
      const opts = formatOptions(q.options, q.correctAnswer ?? null);
      return `  \\item ${escapeLatex(q.content)}\n  \\begin{enumerate}[label=\\Alph*.]\n${opts}\n  \\end{enumerate}`;
    })
    .join("\n\n");
  return (
    PREAMBLE +
    `\\title{${escapeLatex(title)}}\n\\author{${escapeLatex(subtitle)}}\n\\date{}\n\n\\maketitle\n\n` +
    `\\begin{enumerate}[left=0pt]\n${body}\n\\end{enumerate}\n` +
    END_DOC
  );
}
