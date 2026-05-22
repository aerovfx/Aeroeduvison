/**
 * Lesson Plan Export — chuyển HTML giáo án sang Word (.doc) hoặc PDF
 *
 * Không cần thêm dependency mới:
 *  - Word: dùng "Word HTML" format (Office Open XML format đặc biệt mà
 *    Microsoft Word + LibreOffice + Google Docs đều mở được). File .doc
 *    với MIME `application/vnd.ms-word`.
 *  - PDF: mở popup window với HTML đã wrap print stylesheet, auto-trigger
 *    `window.print()` — user chọn "Save as PDF" trong dialog in của browser.
 *    Đây là cách chuẩn cho HTML phức tạp (bảng, công thức KaTeX, màu sắc,
 *    background colors), không bị lỗi rendering như jspdf.
 *
 * Định dạng theo Nghị định 30/2020/NĐ-CP — văn bản hành chính:
 *  - Times New Roman 13pt
 *  - Lề trên/dưới 2cm, lề trái 3cm, lề phải 2cm
 *  - Giãn dòng 1.5
 *  - Justify (canh đều 2 lề)
 */

const ND30_PAGE_CSS = `
  @page {
    size: A4 portrait;
    margin: 2cm 2cm 2cm 3cm;
  }
  body {
    font-family: "Times New Roman", "Liberation Serif", Times, serif;
    font-size: 13pt;
    line-height: 1.5;
    text-align: justify;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  h1, h2, h3, h4, h5, h6 { font-family: inherit; line-height: 1.35; margin: 14pt 0 8pt; }
  h1 { font-size: 18pt; font-weight: 700; text-align: center; text-transform: uppercase; }
  h2 { font-size: 15pt; font-weight: 700; }
  h3 { font-size: 14pt; font-weight: 700; }
  p { margin: 0 0 6pt; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8pt 0;
    page-break-inside: avoid;
  }
  table td, table th {
    border: 1pt solid #000;
    padding: 6pt 8pt;
    vertical-align: top;
  }
  table th {
    background: #e5e7eb;
    font-weight: 700;
    text-align: center;
  }
  ul, ol { margin: 6pt 0; padding-left: 24pt; }
  li { margin-bottom: 3pt; }
  blockquote {
    margin: 8pt 0; padding: 4pt 12pt;
    border-left: 3pt solid #6b7280;
    color: #374151;
    font-style: italic;
  }
  code {
    font-family: "Courier New", monospace;
    background: #f3f4f6; padding: 1pt 4pt; border-radius: 2pt;
    font-size: 11pt;
  }
  pre {
    background: #f3f4f6; padding: 8pt 12pt; border-radius: 4pt;
    font-family: "Courier New", monospace; font-size: 11pt;
    overflow-x: auto;
  }
  hr { border: none; border-top: 1pt solid #6b7280; margin: 12pt 0; }
  .ProseMirror, .ProseMirror-focused { outline: none !important; }
  /* TipTap Math KaTeX — render giữ nguyên */
  .katex { font-size: 1em; }
  .katex-display { margin: 8pt 0; text-align: center; }
  /* Spreadsheet (custom node) */
  .lp-spreadsheet {
    border: 1pt solid #6b7280;
    border-collapse: collapse;
    margin: 8pt 0;
  }
  .lp-spreadsheet td, .lp-spreadsheet th {
    border: 0.5pt solid #9ca3af;
    padding: 4pt 6pt;
    font-family: "Calibri", "Arial", sans-serif;
    font-size: 11pt;
    min-width: 50pt;
  }
  .lp-spreadsheet th {
    background: #d1d5db;
    text-align: center;
    font-weight: 700;
  }
`

/**
 * Expand các <div data-type="spreadsheet" data-sheet='{...}'> thành <table>
 * đầy đủ với formula đã eval. Gọi trước khi export Word/PDF để chắc chắn
 * spreadsheet hiển thị đúng kể cả khi TipTap renderHTML chưa kịp render.
 */
function expandSpreadsheets(html: string): string {
  if (!html.includes('data-sheet=')) return html
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const sheets = tmp.querySelectorAll('[data-sheet]')
  sheets.forEach(div => {
    const raw = div.getAttribute('data-sheet')
    if (!raw) return
    let data: any
    try { data = JSON.parse(raw) } catch { return }
    if (!data || !data.rows || !data.cols) return
    const rows = Math.min(200, data.rows)
    const cols = Math.min(50, data.cols)
    const cells: Record<string, string> = data.cells || {}

    // Reuse formula engine inline (mini version để không phụ thuộc Spreadsheet
    // module — tránh circular import)
    const colLetter = (idx: number): string => {
      let s = ''; let n = idx
      while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 }
      return s
    }
    const addrToRC = (a: string) => {
      const m = a.toUpperCase().match(/^([A-Z]+)(\d+)$/)
      if (!m) return null
      let n = 0
      for (let i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64)
      return { col: n - 1, row: parseInt(m[2], 10) - 1 }
    }
    const resolveValue = (addr: string, depth = 0, visited = new Set<string>()): number | string => {
      if (depth > 10 || visited.has(addr)) return '#ERR'
      const v = cells[addr] ?? ''
      if (!v.startsWith('=')) {
        if (v.trim() === '') return ''
        const n = Number(v.replace(',', '.'))
        return isNaN(n) ? v : n
      }
      visited.add(addr)
      let work = v.slice(1)
      const fnRegex = /(SUM|AVG|AVERAGE|COUNT|MIN|MAX)\s*\(\s*([A-Z]+\d+)\s*:\s*([A-Z]+\d+)\s*\)/gi
      work = work.replace(fnRegex, (_x, fn, a, b) => {
        const ra = addrToRC(a); const rb = addrToRC(b)
        if (!ra || !rb) return '0'
        const r1 = Math.min(ra.row, rb.row), r2 = Math.max(ra.row, rb.row)
        const c1 = Math.min(ra.col, rb.col), c2 = Math.max(ra.col, rb.col)
        const nums: number[] = []
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
          const x = resolveValue(`${colLetter(c)}${r + 1}`, depth + 1, visited)
          if (typeof x === 'number') nums.push(x)
        }
        const fnUp = fn.toUpperCase()
        if (fnUp === 'SUM')   return String(nums.reduce((s, n) => s + n, 0))
        if (fnUp === 'COUNT') return String(nums.length)
        if (fnUp === 'MIN')   return String(nums.length ? Math.min(...nums) : 0)
        if (fnUp === 'MAX')   return String(nums.length ? Math.max(...nums) : 0)
        return String(nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0)
      })
      work = work.replace(/\b([A-Z]+\d+)\b/g, (_x, addr2) => {
        const x = resolveValue(addr2.toUpperCase(), depth + 1, visited)
        return typeof x === 'number' ? String(x) : '0'
      })
      if (!/^[\s\d+\-*/%().,]+$/.test(work)) return work
      try {
        // eslint-disable-next-line no-new-func
        const r = Function(`"use strict"; return (${work});`)()
        if (typeof r === 'number' && Number.isFinite(r)) return Math.round(r * 10000) / 10000
        return String(r)
      } catch { return '#ERR' }
    }

    // Build HTML table
    let tbl = '<table class="lp-spreadsheet"><tbody>'
    let header = '<tr><th></th>'
    for (let c = 0; c < cols; c++) header += `<th>${colLetter(c)}</th>`
    tbl += header + '</tr>'
    for (let r = 0; r < rows; r++) {
      let tr = `<tr><th>${r + 1}</th>`
      for (let c = 0; c < cols; c++) {
        const addr = `${colLetter(c)}${r + 1}`
        const raw = cells[addr] ?? ''
        const display = raw.startsWith('=') ? resolveValue(addr) : raw
        tr += `<td>${escapeHtml(String(display))}</td>`
      }
      tbl += tr + '</tr>'
    }
    tbl += '</tbody></table>'
    div.innerHTML = tbl
  })
  return tmp.innerHTML
}

/** Sanitize tên file: bỏ ký tự hệ điều hành cấm + giới hạn 80 ký tự */
function safeFileName(s: string): string {
  return (s || 'giao-an')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')      // bỏ dấu tiếng Việt
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')                  // bỏ ký tự cấm
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80)
    || 'giao-an'
}

/**
 * Export HTML giáo án sang file Word .doc
 * (Microsoft Word HTML format — đầy đủ format, mở native trong Word).
 *
 * @param html       Nội dung HTML từ TipTap editor.getHTML()
 * @param title      Tên giáo án (dùng cho filename + thẻ <title>)
 * @param meta       Metadata optional (môn, khối, GV) — append đầu file
 */
export function exportLessonPlanToWord(
  html: string,
  title: string,
  meta?: { subject?: string; grade?: string; teacher?: string },
): void {
  const safeTitle = (title || 'Giáo án').slice(0, 200)
  const metaLine = [
    meta?.subject && `Môn: ${meta.subject}`,
    meta?.grade && `Khối: ${meta.grade}`,
    meta?.teacher && `GV: ${meta.teacher}`,
  ].filter(Boolean).join(' · ')

  // Expand spreadsheet nodes thành <table> đầy đủ với formula đã eval
  const expandedHtml = expandSpreadsheets(html)

  const docHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(safeTitle)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotPromptForConvert/>
      <w:DoNotShowInsertionsAndDeletions/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>${ND30_PAGE_CSS}</style>
</head>
<body>
  <h1>${escapeHtml(safeTitle)}</h1>
  ${metaLine ? `<p style="text-align:center;font-style:italic;color:#374151;margin-bottom:14pt">${escapeHtml(metaLine)}</p>` : ''}
  <hr />
  ${expandedHtml}
</body>
</html>`

  // BOM (Byte Order Mark) giúp Word đọc đúng UTF-8
  const blob = new Blob(['﻿', docHtml], {
    type: 'application/vnd.ms-word;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeFileName(safeTitle)}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/**
 * Export HTML giáo án sang PDF qua print dialog của browser.
 *
 * Mở popup window với HTML đã wrap print CSS, auto-call window.print() →
 * user chọn "Save as PDF" trong dialog. Cross-browser, không lib, hỗ trợ
 * đầy đủ table/màu/KaTeX/spreadsheet.
 */
export function exportLessonPlanToPdf(
  html: string,
  title: string,
  meta?: { subject?: string; grade?: string; teacher?: string },
): void {
  const safeTitle = (title || 'Giáo án').slice(0, 200)
  const metaLine = [
    meta?.subject && `Môn: ${meta.subject}`,
    meta?.grade && `Khối: ${meta.grade}`,
    meta?.teacher && `GV: ${meta.teacher}`,
  ].filter(Boolean).join(' · ')

  const expandedHtml = expandSpreadsheets(html)

  const printHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(safeTitle)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
  <style>
    ${ND30_PAGE_CSS}
    /* Toolbar khi xem trong popup window — ẩn khi print */
    .lp-print-toolbar {
      position: fixed; top: 0; left: 0; right: 0;
      background: #1f2937; color: #fff; padding: 10px 16px;
      display: flex; gap: 12px; align-items: center; justify-content: space-between;
      font-family: -apple-system, system-ui, sans-serif; font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 999;
    }
    .lp-print-toolbar button {
      background: #7c3aed; color: #fff; border: none; padding: 6px 14px;
      border-radius: 6px; cursor: pointer; font-weight: 600;
    }
    .lp-print-content { padding: 70px 24px 24px; max-width: 21cm; margin: 0 auto; }
    @media print {
      .lp-print-toolbar { display: none !important; }
      .lp-print-content { padding: 0 !important; max-width: none !important; }
    }
  </style>
</head>
<body>
  <div class="lp-print-toolbar">
    <span>📄 ${escapeHtml(safeTitle)} — Chọn "Lưu thành PDF" trong dialog in</span>
    <div>
      <button onclick="window.print()">🖨️ In / Lưu PDF</button>
      <button onclick="window.close()" style="background:#374151;margin-left:6px">Đóng</button>
    </div>
  </div>
  <div class="lp-print-content">
    <h1>${escapeHtml(safeTitle)}</h1>
    ${metaLine ? `<p style="text-align:center;font-style:italic;color:#374151;margin-bottom:14pt">${escapeHtml(metaLine)}</p>` : ''}
    <hr />
    ${expandedHtml}
  </div>
  <script>
    // Tự bật print dialog sau 800ms cho KaTeX CSS load xong
    setTimeout(function () { window.print(); }, 800);
  </script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=900,height=900,toolbar=no,location=no,menubar=no')
  if (!w) {
    // Popup blocker — fallback: download HTML để user mở rồi tự in
    const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeFileName(safeTitle)}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
    alert('Trình duyệt chặn popup. Đã tải file HTML — mở rồi bấm Ctrl+P để in PDF.')
    return
  }
  w.document.open()
  w.document.write(printHtml)
  w.document.close()
}

/** Escape HTML cho an toàn (đề phòng title chứa <, >) */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
