/**
 * exportReport — Export tabular data sang 4 format: CSV, JSON, Excel, Word.
 *
 * KHÔNG dùng package mới — chỉ tận dụng:
 *   - xlsx (đã có) cho .xlsx
 *   - Blob + a.download cho mọi format khác
 *   - Word dùng HTML-as-.doc trick: Word/LibreOffice/Pages đều mở được
 *     file .doc chứa HTML thuần.
 *
 * Usage:
 *   import { exportData } from '@/lib/exportReport'
 *
 *   exportData({
 *     format: 'csv',
 *     filename: 'analytics-routes',
 *     sheets: [
 *       {
 *         name: 'Top Routes',
 *         columns: [
 *           { key: 'path',     label: 'Đường dẫn' },
 *           { key: 'views',    label: 'Lượt xem', type: 'number' },
 *           { key: 'bounceRate', label: 'Bounce %', type: 'percent' },
 *         ],
 *         rows: [{ path: '/student/exam-prep', views: 1234, bounceRate: 0.42 }],
 *       },
 *     ],
 *     meta: { title: 'Báo cáo analytics — Hôm nay' },
 *   })
 */

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'docx'

export interface ColumnDef {
  key: string
  label: string
  /** Type hint để format đúng (date → ISO, percent → 50%, number → 1,234) */
  type?: 'string' | 'number' | 'percent' | 'date' | 'duration_ms' | 'currency_vnd'
}

export interface SheetData {
  /** Tên sheet/section (dùng cho Excel sheet name, Word section heading) */
  name: string
  columns: ColumnDef[]
  rows: Array<Record<string, any>>
}

export interface ExportOptions {
  format: ExportFormat
  /** Filename không có extension — extension thêm tự động theo format */
  filename: string
  sheets: SheetData[]
  /** Optional metadata cho header/footer (chỉ Word + Excel dùng) */
  meta?: {
    title?: string
    subtitle?: string
    generatedAt?: string   // ISO; default = now
    authorName?: string
  }
}

/* ── Public API ──────────────────────────────────────── */

export async function exportData(opts: ExportOptions): Promise<void> {
  switch (opts.format) {
    case 'csv':  return exportCsv(opts)
    case 'json': return exportJson(opts)
    case 'xlsx': return exportXlsx(opts)
    case 'docx': return exportDoc(opts)
  }
}

/* ── Helpers ─────────────────────────────────────────── */

function formatCell(value: any, type?: ColumnDef['type']): string {
  if (value === null || value === undefined) return ''
  switch (type) {
    case 'number':
      return Number.isFinite(Number(value))
        ? new Intl.NumberFormat('vi-VN').format(Number(value))
        : String(value)
    case 'percent':
      if (typeof value === 'number') {
        return (value > 1 ? value : value * 100).toFixed(1) + '%'
      }
      return String(value)
    case 'date':
      try {
        const d = new Date(value)
        return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      } catch { return String(value) }
    case 'duration_ms':
      if (!Number.isFinite(Number(value))) return String(value)
      const ms = Number(value)
      if (ms < 1000) return ms + 'ms'
      const sec = Math.round(ms / 1000)
      if (sec < 60) return sec + 's'
      const min = Math.floor(sec / 60)
      return `${min}p ${sec % 60}s`
    case 'currency_vnd':
      return new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ'
    default:
      return String(value)
  }
}

function escapeCsv(s: string): string {
  // Quote nếu có comma, quote, hoặc newline
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

function nowIso(): string { return new Date().toISOString() }

/* ── CSV ─────────────────────────────────────────────── */

function exportCsv(opts: ExportOptions): void {
  // BOM ﻿ để Excel mở UTF-8 đúng dấu tiếng Việt
  let csv = '﻿'
  for (let i = 0; i < opts.sheets.length; i++) {
    const sheet = opts.sheets[i]
    if (i > 0) csv += '\n\n'
    if (opts.sheets.length > 1) {
      csv += `# ${sheet.name}\n`
    }
    csv += sheet.columns.map(c => escapeCsv(c.label)).join(',') + '\n'
    for (const row of sheet.rows) {
      csv += sheet.columns
        .map(c => escapeCsv(formatCell(row[c.key], c.type)))
        .join(',') + '\n'
    }
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${opts.filename}.csv`)
}

/* ── JSON ────────────────────────────────────────────── */

function exportJson(opts: ExportOptions): void {
  const data = {
    meta: {
      title: opts.meta?.title || opts.filename,
      generatedAt: opts.meta?.generatedAt || nowIso(),
      ...(opts.meta || {}),
    },
    sheets: opts.sheets.map(s => ({
      name: s.name,
      columns: s.columns,
      rows: s.rows,
    })),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `${opts.filename}.json`)
}

/* ── Excel (.xlsx) ───────────────────────────────────── */

async function exportXlsx(opts: ExportOptions): Promise<void> {
  // Dynamic import để xlsx (~600KB) không vào main bundle
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  for (const sheet of opts.sheets) {
    const aoa: any[][] = []
    // Optional title row
    if (opts.meta?.title && sheet === opts.sheets[0]) {
      aoa.push([opts.meta.title])
      if (opts.meta?.subtitle) aoa.push([opts.meta.subtitle])
      aoa.push([`Xuất lúc: ${formatCell(opts.meta?.generatedAt || nowIso(), 'date')}`])
      aoa.push([])  // blank row
    }
    // Header
    aoa.push(sheet.columns.map(c => c.label))
    // Body — preserve types cho Excel (number → number, không string)
    for (const row of sheet.rows) {
      aoa.push(sheet.columns.map(c => {
        const v = row[c.key]
        if (v === null || v === undefined) return ''
        // Excel hiểu native number cho cột number — giữ raw value
        if (c.type === 'number' && Number.isFinite(Number(v))) return Number(v)
        if (c.type === 'percent' && typeof v === 'number') return v > 1 ? v / 100 : v
        if (c.type === 'date') {
          try { return new Date(v) } catch { return String(v) }
        }
        return formatCell(v, c.type)
      }))
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    // Column widths — auto theo header length + 5
    ws['!cols'] = sheet.columns.map(c => ({ wch: Math.max(c.label.length + 4, 12) }))
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))  // 31 char Excel limit
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, `${opts.filename}.xlsx`)
}

/* ── Word (.doc HTML) ────────────────────────────────── */

function exportDoc(opts: ExportOptions): void {
  // HTML-as-.doc: Word / LibreOffice / Pages đều mở được file .doc chứa HTML
  // Lý do dùng .doc thay vì .docx: không cần thêm package docx 1MB, mọi
  // máy đều mở được, format giữ được table + style.
  const meta = opts.meta || {}
  const generatedAt = formatCell(meta.generatedAt || nowIso(), 'date')

  let body = ''
  if (meta.title) body += `<h1 style="font-size:24pt;font-family:Arial">${escapeHtml(meta.title)}</h1>`
  if (meta.subtitle) body += `<p style="color:#666;font-size:11pt">${escapeHtml(meta.subtitle)}</p>`
  body += `<p style="color:#888;font-size:9pt;font-style:italic">Xuất lúc: ${generatedAt}${meta.authorName ? ` · bởi ${escapeHtml(meta.authorName)}` : ''}</p>`
  body += `<hr/>`

  for (const sheet of opts.sheets) {
    body += `<h2 style="font-size:16pt;color:#7c3aed;margin-top:20pt">${escapeHtml(sheet.name)}</h2>`
    body += `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:Arial;font-size:10pt">`
    // Header row
    body += `<tr style="background:#7c3aed;color:white;font-weight:bold">`
    for (const c of sheet.columns) {
      body += `<th style="text-align:left;padding:8px">${escapeHtml(c.label)}</th>`
    }
    body += `</tr>`
    // Body rows — alternating bg
    for (let i = 0; i < sheet.rows.length; i++) {
      const row = sheet.rows[i]
      body += `<tr style="background:${i % 2 === 0 ? '#f9f9f9' : 'white'}">`
      for (const c of sheet.columns) {
        const v = formatCell(row[c.key], c.type)
        const align = (c.type === 'number' || c.type === 'percent' || c.type === 'currency_vnd' || c.type === 'duration_ms') ? 'right' : 'left'
        body += `<td style="padding:6px;text-align:${align}">${escapeHtml(v)}</td>`
      }
      body += `</tr>`
    }
    body += `</table>`
    body += `<p style="font-size:9pt;color:#888;margin-top:6pt">Tổng số: <b>${sheet.rows.length}</b> dòng</p>`
  }

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(meta.title || opts.filename)}</title>
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
</head>
<body>${body}</body>
</html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  downloadBlob(blob, `${opts.filename}.doc`)
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
