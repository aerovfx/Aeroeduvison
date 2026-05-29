/**
 * Tiện ích xử lý mã TikZ/LaTeX để render bằng tikzjax.
 *
 * tikzjax CHỈ nhận `\usetikzlibrary{...}` + môi trường `\begin{tikzpicture}…
 * \end{tikzpicture}`. KHÔNG nhận `\documentclass`, `\usepackage`,
 * `\begin{document}`, `\end{document}` (mã "standalone" đầy đủ mà GV hay dán).
 * Các helper dưới đây bóc lớp vỏ standalone để feed đúng cho tikzjax, và tách
 * phần văn bản (đề bài) ra khỏi mã hình.
 */

/** HTML (từ TipTap) → plain text, giữ xuống dòng giữa các block. */
export function htmlToPlainText(html: string): string {
  if (!/[<&]/.test(html)) return html // đã là plain text
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const TIKZPICTURE_RE = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/

/** Có chứa mã TikZ không. */
export function hasTikz(raw: string): boolean {
  return TIKZPICTURE_RE.test(raw)
}

/**
 * Chuẩn bị mã cho tikzjax: gom các `\usetikzlibrary{…}` + môi trường
 * tikzpicture, bỏ `\documentclass`/`\usepackage`/`\begin{document}`/
 * `\end{document}`. Trả null nếu không tìm thấy tikzpicture.
 */
export function extractTikzForJax(rawInput: string): string | null {
  const raw = htmlToPlainText(rawInput)
  const pic = raw.match(TIKZPICTURE_RE)
  if (!pic) return null
  const libs = (raw.match(/\\usetikzlibrary\{[^}]*\}/g) || []).join('\n')
  return (libs ? libs + '\n' : '') + pic[0]
}

/**
 * Bỏ toàn bộ phần LaTeX/TikZ (documentclass…tikzpicture…end{document}) khỏi
 * văn bản → còn lại đề bài thuần (nếu có). Dùng để hiển thị text quanh hình.
 */
export function stripTikzAndPreamble(rawInput: string): string {
  return htmlToPlainText(rawInput)
    .replace(TIKZPICTURE_RE, '')
    .replace(/\\documentclass[^\n]*\n?/g, '')
    .replace(/\\usepackage[^\n]*\n?/g, '')
    .replace(/\\usetikzlibrary[^\n]*\n?/g, '')
    .replace(/\\begin\{document\}/g, '')
    .replace(/\\end\{document\}/g, '')
    .replace(/^\s*%.*$/gm, '') // bỏ dòng comment LaTeX
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
