import { useState, useRef, useEffect } from "react"
import {
  Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Trash2, Download,
  ClipboardPaste, Code2, Eraser, Sparkles, Send, Bot,
} from "lucide-react"
import { toast } from "react-hot-toast"
import * as XLSX from "xlsx"
import { api } from "@/services/api"

// ── Template generators ──────────────────────────────────────
// Mẫu mở rộng 2026-05-19: bao quát 3 loại câu chính + LaTeX inline,
// chuẩn đề thi THPT Quốc gia (MCQ A/B/C/D + Đúng-Sai 4 mệnh đề +
// Trả lời ngắn). Cấu trúc khớp parser bên dưới.
const TEMPLATE_HEADERS = [
  'questionType', 'content', 'A', 'B', 'C', 'D', 'correctAnswer',
  'subject', 'grade', 'difficulty', 'topic', 'explanation',
] as const
const TEMPLATE_ROWS = [
  // ─── MCQ: trắc nghiệm A/B/C/D (loại phổ biến nhất) ───
  {
    questionType: 'MCQ',
    content: 'Đơn vị của lực trong hệ SI là?',
    A: 'Newton (N)', B: 'Joule (J)', C: 'Watt (W)', D: 'Pascal (Pa)',
    correctAnswer: 'A', subject: 'Vật lý', grade: 'Khối 10', difficulty: 'easy',
    topic: 'Lực và chuyển động', explanation: 'Lực được đo bằng Newton (N) trong hệ SI.',
  },
  {
    questionType: 'MCQ',
    content: 'Một vật khối lượng $m = 2$ kg chịu lực $F = 10$ N. Gia tốc của vật là?',
    A: '$2$ m/s²', B: '$5$ m/s²', C: '$10$ m/s²', D: '$20$ m/s²',
    correctAnswer: 'B', subject: 'Vật lý', grade: 'Khối 10', difficulty: 'medium',
    topic: 'Định luật II Newton', explanation: '$a = \\dfrac{F}{m} = \\dfrac{10}{2} = 5$ m/s² (định luật II Newton).',
  },
  // ─── MULTIPLE_TF: Đúng/Sai nhiều ý (chuẩn Bộ GD&ĐT) ───
  // Quy ước: A/B/C/D = 4 phát biểu a/b/c/d
  //          correctAnswer = "Đúng,Sai,Đúng,Sai" (CSV) HOẶC "TFTF" (compact)
  {
    questionType: 'MULTIPLE_TF',
    content: 'Cho hàm số $f(x) = \\left(\\dfrac{1}{\\pi}\\right)^{-x} + \\pi x + 1$. Xét tính đúng/sai:',
    A: 'Tập xác định của hàm số là $D = \\mathbb{R}$',
    B: 'Hàm số đồng biến trên khoảng $(e^{-2}; e^{2})$',
    C: '$\\min_{[0;4]} f(x) = 1$',
    D: 'Đồ thị $y=f(x)$ cắt $y=g(x)=\\left(\\dfrac{1}{\\pi^2}\\right)^{x^2-1}+\\pi x+1$ tại 2 điểm có tích hoành độ bằng 1',
    correctAnswer: 'Đúng,Sai,Đúng,Đúng',
    subject: 'Toán học', grade: 'Khối 12', difficulty: 'hard',
    topic: 'Hàm số mũ và logarit',
    explanation: 'a) Đúng — cơ số $1/\\pi>0$. b) Sai — tính đạo hàm thấy hàm đồng biến trên $\\mathbb{R}$. c) Đúng tại $x=0$. d) Đúng — giải $f(x)=g(x)$ đưa về tích nghiệm.',
  },
  // ─── SHORT_ANSWER: trả lời ngắn (số, công thức) ───
  {
    questionType: 'SHORT_ANSWER',
    content: 'Một vật rơi tự do từ độ cao $h = 20$ m, $g = 10$ m/s². Tính thời gian rơi (s).',
    A: '', B: '', C: '', D: '',
    correctAnswer: '2', subject: 'Vật lý', grade: 'Khối 10', difficulty: 'easy',
    topic: 'Rơi tự do', explanation: '$t = \\sqrt{2h/g} = \\sqrt{4} = 2$ s.',
  },
  // ─── MCQ với LaTeX phức tạp (math/chemistry) ───
  {
    questionType: 'MCQ',
    content: 'Phương trình $x^2 - 5x + 6 = 0$ có nghiệm là?',
    A: '$x = 1, x = 6$', B: '$x = 2, x = 3$',
    C: '$x = -2, x = -3$', D: '$x = 0, x = 5$',
    correctAnswer: 'B', subject: 'Toán học', grade: 'Khối 9', difficulty: 'easy',
    topic: 'Phương trình bậc 2',
    explanation: 'Theo Vieta: $x_1 + x_2 = 5, x_1 \\cdot x_2 = 6 \\Rightarrow x = 2, x = 3$.',
  },
]
const TEMPLATE_README = [
  '# HƯỚNG DẪN ĐIỀN MẪU CÂU HỎI — Ngân hàng đề inphysic.com',
  '',
  '## 1. Cột bắt buộc',
  '  - content          : Nội dung câu hỏi (hỗ trợ LaTeX inline $x^2$ và block $$\\int...$$)',
  '  - correctAnswer    : Đáp án đúng (xem mục 3 theo từng loại)',
  '',
  '## 2. Cột tuỳ chọn',
  '  - questionType     : MCQ | MULTIPLE_TF | SHORT_ANSWER | TRUE_FALSE | ESSAY',
  '                       Mặc định: MCQ nếu có A/B/C/D, ESSAY nếu không',
  '  - A, B, C, D       : 4 đáp án (MCQ) HOẶC 4 phát biểu a/b/c/d (MULTIPLE_TF)',
  '  - subject          : "Vật lý" / "Toán học" / "Hóa học" / "Sinh học" / ...',
  '  - grade            : "Khối 10" / "Khối 11" / "Khối 12" (hoặc số "10", "11", "12")',
  '  - difficulty       : easy / medium / hard',
  '                       (= Nhận biết / Thông hiểu / Vận dụng+)',
  '  - topic            : Chủ đề/chương — dùng để filter trong UI',
  '  - explanation      : Lời giải/giải thích (hỗ trợ LaTeX)',
  '',
  '## 3. Quy ước correctAnswer theo từng loại',
  '  - MCQ              : Chữ "A" / "B" / "C" / "D" (1 đáp án đúng)',
  '  - MULTIPLE_TF      : "Đúng,Sai,Đúng,Đúng" (4 giá trị, ngăn cách dấu phẩy)',
  '                       hoặc compact "TFTT" (T=true/Đúng, F=false/Sai)',
  '  - SHORT_ANSWER     : Đáp án ngắn (số, công thức, từ khoá)',
  '  - TRUE_FALSE       : "Đúng" / "Sai" (1 phát biểu)',
  '  - ESSAY            : Để trống, hoặc nhập đáp án mẫu',
  '',
  '## 4. LaTeX trong content/options/explanation',
  '  - Inline:  $x^2$, $\\dfrac{a}{b}$, $\\sqrt{n}$, $\\mathbb{R}$, $\\Omega$',
  '  - Block:   $$\\int_0^1 x^2 dx = \\dfrac{1}{3}$$',
  '  - Hệ thống tự render bằng KaTeX khi hiển thị.',
  '',
  '## 5. Format file hỗ trợ',
  '  - .xlsx / .xls     : Excel (UTF-8 BOM, có sheet Hướng dẫn)',
  '  - .csv             : UTF-8 BOM (mở Excel không lỗi font)',
  '  - .json            : { questions: [...] } hoặc array trực tiếp',
  '  - .md              : Markdown (cú pháp riêng, xem mau-cau-hoi.md)',
  '  - .doc             : Word HTML (mở được trong Word, soạn tiếng Việt)',
  '  - .tex             : LaTeX → AI tự trích xuất (cần subscription)',
  '',
  '## 6. Mẹo soạn nhanh',
  '  - Excel: dán nhiều câu từ Word/PDF vào ô content cũng OK',
  '  - CSV: nếu nội dung có dấu phẩy, dùng dấu " bọc quanh',
  '  - JSON: dùng cho người biết code, dễ generate từ script',
  '  - Word/Markdown: dễ nhất cho GV không quen Excel',
]

function escapeCsvCell(s: string | number | undefined): string {
  const v = String(s ?? '')
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}
function buildCsv(): string {
  const lines = [TEMPLATE_HEADERS.join(',')]
  for (const r of TEMPLATE_ROWS) {
    lines.push(TEMPLATE_HEADERS.map(h => escapeCsvCell((r as Record<string, string>)[h])).join(','))
  }
  return '﻿' + lines.join('\n')  // BOM cho Excel mở UTF-8
}
function buildJson(): string {
  return JSON.stringify({
    _readme: TEMPLATE_README,
    questions: TEMPLATE_ROWS.map(r => ({
      questionType: r.questionType,
      content: r.content,
      // Với MCQ thì options = đáp án; với MULTIPLE_TF thì options = phát biểu
      options: [r.A, r.B, r.C, r.D].filter(Boolean),
      correctAnswer: r.correctAnswer,
      subject: r.subject,
      grade: r.grade,
      difficulty: r.difficulty,
      topic: r.topic,
      explanation: r.explanation,
    })),
  }, null, 2)
}
function buildXlsx(): Blob {
  const wb = XLSX.utils.book_new()
  // Sheet 1: Template
  const wsData = [TEMPLATE_HEADERS as readonly string[], ...TEMPLATE_ROWS.map(r =>
    TEMPLATE_HEADERS.map(h => (r as Record<string, string>)[h] ?? '')
  )]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  // Đặt độ rộng cột cho dễ đọc
  // questionType | content | A | B | C | D | correctAnswer | subject | grade | difficulty | topic | explanation
  ws['!cols'] = [
    { wch: 14 },  // questionType
    { wch: 50 },  // content
    { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 },  // A/B/C/D
    { wch: 16 },  // correctAnswer
    { wch: 14 },  // subject
    { wch: 12 },  // grade
    { wch: 12 },  // difficulty
    { wch: 22 },  // topic
    { wch: 40 },  // explanation
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Câu hỏi')
  // Sheet 2: Hướng dẫn
  const wsHelp = XLSX.utils.aoa_to_sheet(TEMPLATE_README.map(line => [line]))
  wsHelp['!cols'] = [{ wch: 90 }]
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Hướng dẫn')
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
/**
 * buildMarkdown — định dạng người-đọc-được, GV soạn nhanh trong Notepad/VSCode.
 * Cú pháp:
 *   ## Câu N  (hoặc Câu 1:)
 *   [META] type=MCQ | subject=Vật lý | grade=Khối 10 | difficulty=easy | topic=...
 *   Nội dung câu hỏi
 *
 *   A. Đáp án A
 *   B. Đáp án B
 *   C. Đáp án C
 *   D. Đáp án D
 *
 *   ANSWER: A
 *   EXPLAIN: Giải thích ngắn
 *   ---
 */
function buildMarkdown(): string {
  const lines: string[] = []
  lines.push('# Mẫu câu hỏi — inphysic.com Question Bank')
  lines.push('')
  lines.push('> Cú pháp Markdown đơn giản. Mỗi câu cách nhau bằng `---`.')
  lines.push('> Hỗ trợ LaTeX inline: $x^2$ và block: $$\\int x dx$$')
  lines.push('')
  lines.push('---')
  lines.push('')

  TEMPLATE_ROWS.forEach((r, i) => {
    lines.push(`## Câu ${i + 1}`)
    lines.push(`[META] type=${r.questionType} | subject=${r.subject} | grade=${r.grade} | difficulty=${r.difficulty} | topic=${r.topic}`)
    lines.push('')
    lines.push(r.content)
    lines.push('')
    if (r.questionType === 'MCQ' && r.A) {
      lines.push(`A. ${r.A}`)
      lines.push(`B. ${r.B}`)
      lines.push(`C. ${r.C}`)
      lines.push(`D. ${r.D}`)
      lines.push('')
      lines.push(`ANSWER: ${r.correctAnswer}`)
    } else if (r.questionType === 'MULTIPLE_TF') {
      lines.push(`a) ${r.A}`)
      lines.push(`b) ${r.B}`)
      lines.push(`c) ${r.C}`)
      lines.push(`d) ${r.D}`)
      lines.push('')
      lines.push(`ANSWER: ${r.correctAnswer}    # 4 giá trị Đúng/Sai theo thứ tự a→d`)
    } else if (r.questionType === 'SHORT_ANSWER') {
      lines.push(`ANSWER: ${r.correctAnswer}`)
    }
    if (r.explanation) {
      lines.push(`EXPLAIN: ${r.explanation}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  lines.push('# Hướng dẫn chi tiết')
  lines.push('')
  TEMPLATE_README.forEach(l => lines.push(l))

  return lines.join('\n')
}

/**
 * buildDoc — HTML giả lập Word document (.doc). Khi user mở bằng Word
 * sẽ thấy formatted table + tiếng Việt + LaTeX dạng plain $...$ syntax.
 * Trick: prefix với mime header để Word nhận diện là document.
 *
 * KHÔNG dùng docx thật vì cần thêm dep nặng. .doc HTML đủ dùng cho
 * GV xem mẫu + chỉnh sửa rồi paste lại vào form.
 */
function buildDoc(): Blob {
  const escape = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  let rowsHtml = ''
  TEMPLATE_ROWS.forEach((r, i) => {
    rowsHtml += `<tr>
      <td>${i + 1}</td>
      <td>${r.questionType}</td>
      <td>${escape(r.content)}</td>
      <td>${escape(r.A)}</td>
      <td>${escape(r.B)}</td>
      <td>${escape(r.C)}</td>
      <td>${escape(r.D)}</td>
      <td><b>${r.correctAnswer}</b></td>
      <td>${escape(r.subject)} / ${escape(r.grade)}</td>
      <td>${r.difficulty}</td>
      <td>${escape(r.topic)}</td>
      <td>${escape(r.explanation)}</td>
    </tr>`
  })

  const helpHtml = TEMPLATE_README
    .map(l => l.startsWith('# ') ? `<h2>${escape(l.slice(2))}</h2>`
            : l.startsWith('## ') ? `<h3>${escape(l.slice(3))}</h3>`
            : l.startsWith('  ') ? `<p style="margin-left:20px;font-family:Consolas,monospace">${escape(l)}</p>`
            : l ? `<p>${escape(l)}</p>` : '<br/>')
    .join('\n')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8"/>
  <title>Mẫu câu hỏi — inphysic.com</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; }
    h1 { color: #6d28d9; }
    h2 { color: #7c3aed; border-bottom: 2px solid #ddd; padding-bottom: 4px; }
    h3 { color: #4b5563; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 10pt; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
    th { background: #f1f5f9; font-weight: bold; }
    .note { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 8px 12px; margin: 12px 0; }
  </style>
</head>
<body>
  <h1>📘 Mẫu câu hỏi cho ngân hàng đề</h1>
  <p>Đây là mẫu Word (.doc) để giáo viên xem cách điền câu hỏi.<br/>
  Sau khi soạn xong, vui lòng <strong>lưu lại thành .xlsx / .csv / .md</strong> rồi upload tại
  <em>inphysic.com/teacher/question-bank → Import</em>.</p>

  <div class="note">
    <strong>💡 LaTeX support:</strong> gõ <code>$x^2$</code> cho công thức inline,
    <code>$$\\int x dx$$</code> cho block. Hệ thống tự render khi hiển thị.
  </div>

  <h2>5 câu hỏi mẫu (3 loại)</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Loại</th><th>Nội dung</th>
        <th>A</th><th>B</th><th>C</th><th>D</th>
        <th>Đáp án</th><th>Môn/Khối</th><th>Độ khó</th>
        <th>Chủ đề</th><th>Giải thích</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  ${helpHtml}
</body>
</html>`

  return new Blob([html], { type: 'application/msword' })
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (count: number) => void
}

interface ParsedQuestion {
  id: string
  content: string
  options: string[]
  correctAnswer: string
  explanation: string
  subject: string
  grade: string
  topic: string
  difficulty: string
  questionType: string
  selected: boolean
}

const SUBJECT_MAPPING: Record<string, string> = {
  "toán": "Toán học", "toán học": "Toán học", "math": "Toán học",
  "vật lý": "Vật lý", "vật": "Vật lý", "physics": "Vật lý",
  "hóa": "Hóa học", "hoá": "Hóa học", "hóa học": "Hóa học", "chemistry": "Hóa học",
  "sinh": "Sinh học", "sinh học": "Sinh học", "biology": "Sinh học",
  "văn": "Ngữ văn", "ngữ văn": "Ngữ văn",
  "tiếng anh": "Tiếng Anh", "english": "Tiếng Anh",
  "tiếng việt": "Tiếng Việt",
  "lịch sử": "Lịch sử", "sử": "Lịch sử", "history": "Lịch sử",
  "địa lý": "Địa lý", "địa": "Địa lý", "geography": "Địa lý",
  "gdcd": "GDCD", "công dân": "GDCD",
  "tin học": "Tin học", "tin": "Tin học",
}

const GRADE_MAPPING: Record<string, string> = {
  "1": "Khối 1", "2": "Khối 2", "3": "Khối 3", "4": "Khối 4", "5": "Khối 5",
  "6": "Khối 6", "7": "Khối 7", "8": "Khối 8", "9": "Khối 9",
  "10": "Khối 10", "11": "Khối 11", "12": "Khối 12",
  "khối 1": "Khối 1", "khối 2": "Khối 2", "khối 3": "Khối 3",
  "khối 6": "Khối 6", "khối 7": "Khối 7", "khối 8": "Khối 8", "khối 9": "Khối 9",
  "khối 10": "Khối 10", "khối 11": "Khối 11", "khối 12": "Khối 12",
  "lớp 10": "Khối 10", "lớp 11": "Khối 11", "lớp 12": "Khối 12",
}

const DIFFICULTY_MAPPING: Record<string, string> = {
  "dễ": "EASY", "easy": "EASY",
  "trung bình": "MEDIUM", "medium": "MEDIUM",
  "khó": "HARD", "hard": "HARD",
}

function mapSubject(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  const key = raw.toLowerCase().trim()
  return SUBJECT_MAPPING[key] || raw || fallback
}

function mapGrade(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  const key = raw.toLowerCase().trim()
  return GRADE_MAPPING[key] || raw || fallback
}

function mapDifficulty(raw: string | undefined): string {
  if (!raw) return "MEDIUM"
  const key = raw.toLowerCase().trim()
  return DIFFICULTY_MAPPING[key] || "MEDIUM"
}

async function parseJsonFile(text: string): Promise<any[]> {
  const jsonData = JSON.parse(text)
  if (Array.isArray(jsonData)) return jsonData
  if (jsonData.questions && Array.isArray(jsonData.questions)) return jsonData.questions
  if (jsonData.data && Array.isArray(jsonData.data)) return jsonData.data
  return []
}

async function parseCsvFile(text: string): Promise<any[]> {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase())
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || "" })
    return row
  })
}

/**
 * parseMarkdownFile — parse format:
 *   ## Câu N (heading bất kỳ "Câu", "Question", "#") = start new question
 *   [META] type=X | subject=Y | ...                  = optional metadata line
 *   Nội dung câu hỏi (1+ dòng)
 *
 *   A. opt1   |   a) phát biểu 1
 *   B. opt2   |   b) phát biểu 2
 *   ...
 *
 *   ANSWER: <đáp án>
 *   EXPLAIN: <giải thích>
 *   --- (separator hoặc heading mới)
 */
async function parseMarkdownFile(text: string): Promise<any[]> {
  // Split by separator or heading
  const blocks: string[] = []
  let current: string[] = []
  for (const line of text.split('\n')) {
    if (/^---+$/.test(line.trim()) || /^##?\s+(Câu|Question)\b/i.test(line)) {
      if (current.length) { blocks.push(current.join('\n')); current = [] }
      if (/^##?\s+(Câu|Question)/i.test(line)) current.push(line)
    } else {
      current.push(line)
    }
  }
  if (current.length) blocks.push(current.join('\n'))

  const rows: any[] = []
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trimEnd())
    const meta: Record<string, string> = {}
    const opts: string[] = []
    const contentLines: string[] = []
    let answer = ''
    let explain = ''

    for (let raw of lines) {
      const line = raw.trim()
      if (!line) continue
      // Skip headings
      if (/^#+\s/.test(line)) continue

      // [META] line
      const metaMatch = line.match(/^\[META\]\s*(.+)/i)
      if (metaMatch) {
        for (const pair of metaMatch[1].split('|')) {
          const [k, v] = pair.split('=').map(s => s.trim())
          if (k && v) meta[k.toLowerCase()] = v
        }
        continue
      }

      // Option line: A. or A) or a) or a.
      const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/)
      if (optMatch) {
        opts.push(optMatch[2].trim())
        continue
      }

      // ANSWER / EXPLAIN labels
      const ansMatch = line.match(/^ANSWER\s*[:=]\s*(.+?)(?:\s+#.*)?$/i)
      if (ansMatch) { answer = ansMatch[1].trim(); continue }
      const expMatch = line.match(/^EXPLAIN\s*[:=]\s*(.+)/i)
      if (expMatch) { explain = expMatch[1].trim(); continue }

      // Otherwise: content
      contentLines.push(line)
    }

    const content = contentLines.join('\n').trim()
    if (!content) continue

    rows.push({
      questionType: meta.type || meta.questiontype || (opts.length > 0 ? 'MCQ' : 'ESSAY'),
      content,
      options: opts,
      correctAnswer: answer,
      explanation: explain,
      subject: meta.subject || meta.môn,
      grade: meta.grade || meta.khối,
      difficulty: meta.difficulty || meta['độ_khó'],
      topic: meta.topic || meta['chủ_đề'],
    })
  }
  return rows
}

function normalizeQuestion(raw: any, defaultSubject: string, defaultGrade: string): ParsedQuestion {
  const content =
    raw.content || raw.question || raw.nội_dung || raw.câu_hỏi ||
    raw.question_text || raw.questionText || raw.statement || ""

  const options: string[] = []
  if (Array.isArray(raw.options)) {
    options.push(...raw.options)
  } else if (raw.A) {
    ["A", "B", "C", "D"].forEach((letter) => {
      if (raw[letter]) options.push(raw[letter])
    })
  }

  let correctAnswer = String(
    raw.correctAnswer || raw.correct_answer || raw.đáp_án ||
    raw.answer || ""
  ).trim()

  const qType =
    raw.questionType || raw.type
      ? String(raw.questionType || raw.type).toUpperCase()
      : options.length === 4 && /^[A-D]$/i.test(correctAnswer)
      ? "MCQ"
      : options.length > 0
      ? "MCQ"
      : "ESSAY"

  /* Normalize MULTIPLE_TF correctAnswer format:
     - "Đúng,Sai,Đúng,Sai"      → giữ nguyên
     - "TFTT", "tftf"            → expand to "Đúng,Sai,Đúng,Đúng"
     - "T,F,T,T", "True,False,T,T" → normalize từng item */
  if (qType === "MULTIPLE_TF" || qType === "MULTIPLE_TRUE_FALSE") {
    // Compact format TFTT
    if (/^[TFĐS]+$/i.test(correctAnswer) && correctAnswer.length === options.length) {
      correctAnswer = correctAnswer
        .toUpperCase()
        .split('')
        .map(c => (c === 'T' || c === 'Đ') ? 'Đúng' : 'Sai')
        .join(',')
    } else if (correctAnswer.includes(',')) {
      // Comma-separated — normalize từng item
      correctAnswer = correctAnswer
        .split(',')
        .map(s => {
          const v = s.trim().toLowerCase()
          if (['t', 'true', 'đúng', 'dung', '1'].includes(v)) return 'Đúng'
          if (['f', 'false', 'sai', '0'].includes(v)) return 'Sai'
          return s.trim()  // giữ nguyên nếu không nhận diện được
        })
        .join(',')
    }
  }

  return {
    id: `imported-${Date.now()}-${Math.random()}`,
    content: String(content).trim(),
    options: options.map(String),
    correctAnswer,
    explanation: String(raw.explanation || raw.giải_thích || raw.explanationText || "").trim(),
    subject: mapSubject(raw.subject || raw.môn, defaultSubject),
    grade: mapGrade(raw.grade || raw.khối, defaultGrade),
    topic: String(raw.topic || raw.chủ_đề || "").trim(),
    difficulty: mapDifficulty(raw.difficulty || raw.độ_khó || raw.difficultyLevel),
    questionType: ["MCQ", "MULTIPLE_TF", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"].includes(qType) ? qType : "MCQ",
    selected: true,
  }
}

// ── Mẫu JSON ngắn (1 câu MCQ) — dùng làm placeholder hint trong textarea ──
const PASTE_PLACEHOLDER_SHORT = `{
  "questions": [
    {
      "questionType": "MCQ",
      "content": "Đơn vị của lực trong hệ SI là?",
      "options": ["Newton (N)", "Joule (J)", "Watt (W)", "Pascal (Pa)"],
      "correctAnswer": "A",
      "subject": "Vật lý",
      "grade": "Khối 10",
      "difficulty": "easy",
      "topic": "Lực và chuyển động",
      "explanation": "Lực được đo bằng Newton (N) trong hệ SI."
    }
  ]
}`

// ── Mẫu JSON đầy đủ 4 loại câu hỏi chuẩn THPT QG 2025+ ──
// Phần 1 — Trắc nghiệm A/B/C/D (MCQ)
// Phần 2 — Đúng/Sai 4 mệnh đề (MULTIPLE_TF)
// Phần 3 — Trả lời ngắn (SHORT_ANSWER, đáp án thường 4 ký tự số)
// Phần 4 — Tự luận có đáp án (ESSAY)
const PASTE_PLACEHOLDER_FULL = `{
  "questions": [
    {
      "questionType": "MCQ",
      "content": "Một vật khối lượng $m = 2$ kg chịu lực $F = 10$ N. Gia tốc của vật là?",
      "options": ["$2$ m/s²", "$5$ m/s²", "$10$ m/s²", "$20$ m/s²"],
      "correctAnswer": "B",
      "subject": "Vật lý",
      "grade": "Khối 10",
      "difficulty": "medium",
      "topic": "Định luật II Newton",
      "explanation": "$a = \\\\dfrac{F}{m} = 5$ m/s²."
    },
    {
      "questionType": "MULTIPLE_TF",
      "content": "Xét các phát biểu về định luật II Newton:",
      "options": [
        "Gia tốc tỉ lệ thuận với lực tác dụng",
        "Gia tốc tỉ lệ nghịch với khối lượng vật",
        "Hướng gia tốc cùng hướng với lực",
        "Đơn vị gia tốc là $m/s$"
      ],
      "correctAnswer": "Đúng,Đúng,Đúng,Sai",
      "subject": "Vật lý",
      "grade": "Khối 10",
      "difficulty": "medium",
      "topic": "Định luật II Newton",
      "explanation": "a,b,c đúng theo định luật. d sai — đơn vị gia tốc là $m/s^2$. Có thể nhập compact 'TTTF' thay cho 'Đúng,Đúng,Đúng,Sai'."
    },
    {
      "questionType": "SHORT_ANSWER",
      "content": "Tìm 4 chữ số đầu sau dấu phẩy của $\\\\sqrt{2}$ (không có dấu chấm).",
      "options": [],
      "correctAnswer": "1414",
      "subject": "Toán học",
      "grade": "Khối 9",
      "difficulty": "easy",
      "topic": "Căn bậc hai",
      "explanation": "$\\\\sqrt{2} = 1{,}41421356... \\\\Rightarrow$ 4 chữ số đầu = 1414. (Phần 3 đề THPT QG: đáp án 4 ký tự)"
    },
    {
      "questionType": "ESSAY",
      "content": "Giải thích vì sao bầu trời có màu xanh vào ban ngày? (4 điểm)",
      "options": [],
      "correctAnswer": "Ánh sáng Mặt Trời gồm nhiều thành phần bước sóng khác nhau. Khi đi qua khí quyển, ánh sáng bị tán xạ Rayleigh bởi các phân tử khí (chủ yếu N₂ và O₂). Cường độ tán xạ tỉ lệ nghịch với $\\\\lambda^4$, nên ánh sáng xanh (λ ngắn) bị tán xạ mạnh hơn ánh sáng đỏ (λ dài) khoảng 10 lần, làm cho bầu trời ta nhìn lên có màu xanh.",
      "subject": "Vật lý",
      "grade": "Khối 12",
      "difficulty": "medium",
      "topic": "Tán xạ ánh sáng",
      "explanation": "Đáp án mẫu cho GV chấm tự luận tham khảo (key points: tán xạ Rayleigh + tỉ lệ 1/λ⁴ + bước sóng ngắn tán xạ mạnh hơn)."
    }
  ]
}`

// Component chính: 3 bước upload → review → complete + tab paste + tạo câu bằng AI
export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [subject, setSubject] = useState("Vật lý")
  const [grade, setGrade] = useState("Khối 10")
  const [importStep, setImportStep] = useState<"upload" | "review" | "complete">("upload")
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [pastedJson, setPastedJson] = useState("")
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pasteParsing, setPasteParsing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // AI chat generator state
  const [aiTopic, setAiTopic] = useState("")
  const [aiCount, setAiCount] = useState(5)
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed')
  const [aiTypes, setAiTypes] = useState<string[]>(['MCQ'])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiLastResult, setAiLastResult] = useState<{ count: number; provider: string } | null>(null)
  const [aiQuota, setAiQuota] = useState<{
    used: number; limit: number | null; remaining: number | null;
    source: 'admin' | 'paid' | 'free'; unlimited: boolean; resetAt?: string;
  } | null>(null)

  // Load quota on mount để hiển thị "còn N/20 lượt"
  useEffect(() => {
    api.get('/ai/generate-questions/quota')
      .then(r => setAiQuota(r.data))
      .catch(() => {})
  }, [])

  const handleAiGenerate = async () => {
    const topic = aiTopic.trim()
    if (!topic || topic.length < 3) {
      setAiError('Vui lòng nhập chủ đề ít nhất 3 ký tự')
      return
    }
    setAiLoading(true)
    setAiError(null)
    setAiLastResult(null)
    try {
      const { data } = await api.post<{
        questions: any[]; json: string; count: number; provider: string; model: string;
      }>('/ai/generate-questions', {
        topic,
        count: aiCount,
        subject,           // dùng subject của modal
        grade,             // dùng grade của modal
        difficulty: aiDifficulty === 'mixed' ? undefined : aiDifficulty,
        types: aiTypes.length > 0 ? aiTypes : undefined,
      })
      if (!data?.json || !data.count) {
        throw new Error('AI trả về 0 câu hỏi — thử lại với chủ đề rõ ràng hơn')
      }
      // Fill textarea JSON + clear paste error
      setPastedJson(data.json)
      setPasteError(null)
      setAiLastResult({ count: data.count, provider: data.provider })
      // Update quota từ response để hiển thị số lượt còn lại sau gen
      if ((data as any).quota) setAiQuota((data as any).quota)
      toast.success(`AI sinh ${data.count} câu hỏi (${data.provider}). Bấm "Phân tích JSON" để xem trước.`)
    } catch (err: any) {
      const status = err?.response?.status
      const data = err?.response?.data
      // Quota exceeded → update local quota + show clear message
      if (status === 429 && data?.error === 'quota_exceeded') {
        const msg = `${data.message} (${data.used}/${data.limit})`
        setAiError(msg)
        setAiQuota({ used: data.used, limit: data.limit, remaining: 0, source: 'free', unlimited: false, resetAt: data.retryAt })
        toast.error(msg, { duration: 6000 })
      } else {
        const msg = data?.message || data?.error || err?.message || 'Lỗi gọi AI'
        setAiError(msg)
        toast.error(msg)
      }
    } finally {
      setAiLoading(false)
    }
  }

  const toggleAiType = (t: string) => {
    setAiTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const handleFile = async (f: File) => {
    const validExt = /\.(xlsx|xls|csv|json|tex|md|doc|docx)$/i
    if (!validExt.test(f.name)) {
      toast.error("Hỗ trợ: Excel (.xlsx, .xls), CSV, JSON, Markdown (.md), Word (.doc/.docx), LaTeX (.tex)")
      return
    }
    setFile(f)
    setProcessing(true)
    try {
      let rawRows: any[] = []

      if (f.name.endsWith(".tex")) {
        // LaTeX → AI extract via dedicated endpoint
        const text = await f.text()
        const t = toast.loading("AI đang trích xuất câu hỏi từ LaTeX… (~30-60s)")
        try {
          const { api } = await import("@/services/api")
          const res = await api.post<{ success: boolean; data?: { inserted: number; skipped: number; total: number } }>(
            "/teacher/question-bank/import-latex",
            { content: text, subject, grade }
          )
          if (res.data?.success && res.data.data) {
            const { inserted, skipped, total } = res.data.data
            toast.success(`✅ Đã import ${inserted}/${total} câu vào ngân hàng${skipped ? ` (bỏ qua ${skipped})` : ''}`, { id: t, duration: 5000 })
            setSavedCount(inserted)
            onSuccess(inserted)
            setImportStep("complete")
          } else {
            throw new Error("Import thất bại")
          }
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } }; message?: string }
          toast.error(e.response?.data?.error || e.message || "Không trích xuất được câu hỏi", { id: t })
        }
        return
      } else if (f.name.endsWith(".json")) {
        const text = await f.text()
        rawRows = await parseJsonFile(text)
      } else if (f.name.endsWith(".csv")) {
        const text = await f.text()
        rawRows = await parseCsvFile(text)
      } else if (f.name.endsWith(".md")) {
        const text = await f.text()
        rawRows = await parseMarkdownFile(text)
      } else if (f.name.endsWith(".doc") || f.name.endsWith(".docx")) {
        // Word file → backend parse via mammoth/docx-parser (Excel endpoint cũng nhận)
        const formData = new FormData()
        formData.append("file", f)
        formData.append("subject", subject)
        formData.append("grade", grade)
        const res = await fetch("/api/questions/import", { method: "POST", body: formData })
        const data = await res.json()
        if (data.success) {
          rawRows = data.questions || data.data || []
        } else {
          throw new Error(data.error || "Không parse được file Word")
        }
      } else {
        // Excel: send file directly to API for server-side parsing
        const formData = new FormData()
        formData.append("file", f)
        formData.append("subject", subject)
        formData.append("grade", grade)
        const res = await fetch("/api/questions/import", { method: "POST", body: formData })
        const data = await res.json()
        if (data.success) {
          setSavedCount(data.data?.inserted || 0)
          onSuccess(data.data?.inserted || 0)
          setImportStep("complete")
        } else {
          throw new Error(data.error || "Import thất bại")
        }
        return
      }

      if (rawRows.length === 0) {
        toast.error("Không tìm thấy câu hỏi trong file")
        return
      }

      const questions = rawRows
        .filter((r) => r.content || r.question || r.nội_dung || r.câu_hỏi || r.question_text || r.questionText)
        .map((r) => normalizeQuestion(r, subject, grade))

      if (questions.length === 0) {
        toast.error("Không thể phân tích câu hỏi. Kiểm tra định dạng file.")
        return
      }

      setParsedQuestions(questions)
      setImportStep("review")
      toast.success(`Đã phân tích ${questions.length} câu hỏi`)
    } catch (err: any) {
      toast.error(err.message || "Không thể đọc file")
    } finally {
      setProcessing(false)
    }
  }

  const handleSave = async () => {
    const selected = parsedQuestions.filter((q) => q.selected)
    if (selected.length === 0) { toast.error("Vui lòng chọn ít nhất một câu hỏi"); return }

    setSaving(true)
    try {
      // Dùng axios `api` instance để tự động thêm Authorization Bearer header
      // (raw fetch không gửi Bearer → backend 401 Unauthorized)
      const { api } = await import("@/services/api")
      const { data } = await api.post<{
        success: boolean; data?: { inserted: number; failed?: number; total: number; errors?: string[] }
      }>("/questions/batch", { questions: selected })
      const inserted = data.data?.inserted ?? selected.length
      const failed = data.data?.failed ?? 0
      setSavedCount(inserted)
      onSuccess(inserted)
      setImportStep("complete")
      toast.success(
        failed > 0
          ? `Đã import ${inserted}/${selected.length} câu (${failed} lỗi)`
          : `Đã import ${inserted} câu hỏi!`,
        { duration: 4000 }
      )
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number }; message?: string }
      if (e.response?.status === 401) {
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.")
      } else {
        toast.error(e.response?.data?.error || e.message || "Không thể import câu hỏi")
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Parse JSON dán trực tiếp từ clipboard ──
  // Quy trình: validate JSON syntax → parse → normalize → đẩy sang bước review
  // (giống parseJsonFile + handleFile flow, không cần tải file lên server)
  const handlePasteJson = async () => {
    const text = pastedJson.trim()
    if (!text) {
      setPasteError("Vui lòng dán code JSON vào ô bên trên")
      return
    }
    setPasteError(null)
    setPasteParsing(true)
    try {
      const rawRows = await parseJsonFile(text)
      if (rawRows.length === 0) {
        setPasteError("JSON hợp lệ nhưng không tìm thấy câu hỏi. Cấu trúc cần: { questions: [...] } hoặc array trực tiếp.")
        return
      }
      const questions = rawRows
        .filter(r => r.content || r.question || r.nội_dung || r.câu_hỏi || r.question_text || r.questionText)
        .map(r => normalizeQuestion(r, subject, grade))
      if (questions.length === 0) {
        setPasteError("Không có câu hỏi nào có field 'content'. Kiểm tra lại cú pháp.")
        return
      }
      setParsedQuestions(questions)
      setImportStep("review")
      // Breakdown loại câu cho user biết đã parse đúng
      const breakdown = questions.reduce<Record<string, number>>((acc, q) => {
        acc[q.questionType] = (acc[q.questionType] || 0) + 1; return acc
      }, {})
      const breakdownStr = Object.entries(breakdown)
        .map(([type, count]) => `${count} ${type === 'MCQ' ? 'MCQ' :
                                          type === 'MULTIPLE_TF' ? 'Đúng/Sai' :
                                          type === 'SHORT_ANSWER' ? 'Trả lời ngắn' :
                                          type === 'ESSAY' ? 'Tự luận' :
                                          type === 'TRUE_FALSE' ? 'Đ/S' : type}`)
        .join(' · ')
      toast.success(`Đã phân tích ${questions.length} câu (${breakdownStr})`)
      // Cảnh báo nhẹ nếu SHORT_ANSWER không phải 4 ký tự (chuẩn THPT QG)
      const oddShort = questions.filter(q =>
        q.questionType === 'SHORT_ANSWER' &&
        q.correctAnswer &&
        q.correctAnswer.length !== 4
      )
      if (oddShort.length > 0) {
        toast(`💡 ${oddShort.length} câu trả lời ngắn có đáp án ≠ 4 ký tự (chuẩn THPT QG là 4)`, { icon: 'ℹ️', duration: 4500 })
      }
    } catch (err: any) {
      // JSON syntax error — chỉ rõ vị trí nếu có
      const msg = err?.message || "JSON không hợp lệ"
      setPasteError(`Lỗi cú pháp JSON: ${msg}`)
    } finally {
      setPasteParsing(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setParsedQuestions([])
    setImportStep("upload")
    setSavedCount(0)
    setPastedJson("")
    setPasteError(null)
    onClose()
  }

  const toggleSelect = (id: string) =>
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" style={{ background: '#10111e', border: '1px solid #1e2033' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2033]">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-100">Import câu hỏi</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-[#1e2033] rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── Upload Step ── */}
          {importStep === "upload" && (
            <>
              {/* Default subject/grade selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Môn học mặc định</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2b3d] px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#161728] text-slate-200"
                  >
                    {["Toán học","Vật lý","Hóa học","Sinh học","Ngữ văn","Tiếng Anh","Lịch sử","Địa lý","GDCD","Tin học"].map(
                      (s) => <option key={s} value={s}>{s}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Khối mặc định</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2b3d] px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#161728] text-slate-200"
                  >
                    {Array.from({ length: 12 }, (_, i) => `Khối ${i + 1}`).map(
                      (g) => <option key={g} value={g}>{g}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-purple-500 bg-purple-950/20"
                    : "border-[#2a2b3d] hover:border-purple-500 hover:bg-[#161728]"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json,.tex,.md,.doc,.docx"
                  onChange={handleChange}
                  className="hidden"
                />
                {processing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                    <p className="text-sm text-slate-400">Đang xử lý file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-slate-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        Kéo thả file vào đây hoặc <span className="text-purple-600">click để chọn</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hỗ trợ: Excel (.xlsx, .xls), CSV, JSON, LaTeX (.tex)
                        <br />
                        <span className="text-purple-300 font-medium">✨ .tex</span> = upload đề thi LaTeX → AI tự trích xuất câu hỏi vào ngân hàng
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── AI Chat — Tạo câu hỏi tự động bằng AI ── */}
              <div className="relative">
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-[#2a2b3d]" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">hoặc — sinh tự động bằng AI</span>
                  <div className="flex-1 h-px bg-[#2a2b3d]" />
                </div>

                <div className="rounded-xl p-4 space-y-3 border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.08))',
                    borderColor: 'rgba(139,92,246,0.3)',
                  }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}>
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                          AI Tạo câu hỏi tự động
                          {/* Badge provider — DeepSeek primary, Claude fallback */}
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                            style={{
                              background: 'linear-gradient(90deg, rgba(124,58,237,0.25), rgba(6,182,212,0.25))',
                              color: '#e9d5ff',
                              border: '1px solid rgba(139,92,246,0.4)',
                            }}>
                            Claude · DeepSeek
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">Mô tả chủ đề → AI sinh JSON → 1 click import</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {aiLastResult && (
                        <span className="text-[10px] px-2 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                          ✓ Đã sinh {aiLastResult.count} câu
                        </span>
                      )}
                      {aiQuota && (
                        aiQuota.unlimited ? (
                          <span className="text-[10px] px-2 py-1 rounded-full border bg-purple-500/15 border-purple-500/40 text-purple-300 font-bold">
                            ∞ {aiQuota.source === 'admin' ? 'Admin' : 'Gói Pro'}
                          </span>
                        ) : (
                          <>
                            <span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${
                              (aiQuota.remaining ?? 0) === 0
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                : (aiQuota.remaining ?? 0) <= 3
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                            }`} title={aiQuota.resetAt ? `Reset lúc ${new Date(aiQuota.resetAt).toLocaleString('vi-VN')}` : ''}>
                              Còn {aiQuota.remaining}/{aiQuota.limit} lượt
                            </span>
                            {/* Đăng ký — chỉ show cho free user, link tới /payment */}
                            <a
                              href="/payment?plan=pro&feature=quiz_generate"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] px-2.5 py-1 rounded-full font-bold transition-all hover:scale-105 inline-flex items-center gap-1"
                              style={{
                                background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                                color: '#1a1a2e',
                                boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                              }}
                              title="Nâng cấp gói Pro — sinh câu hỏi không giới hạn"
                            >
                              ✨ Đăng ký Pro
                            </a>
                          </>
                        )
                      )}
                    </div>
                  </div>

                  {/* Topic input */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                      Chủ đề / yêu cầu cụ thể
                    </label>
                    <textarea
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      placeholder="VD: Định luật bảo toàn năng lượng — bài tập áp dụng vào con lắc đơn và chuyển động tròn đều..."
                      rows={2}
                      className="w-full bg-[#06070f] border border-[#1e2033] rounded-lg p-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60 resize-y leading-relaxed"
                    />
                  </div>

                  {/* Config row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 mb-1 block uppercase tracking-wide">Số câu</label>
                      <select
                        value={aiCount}
                        onChange={e => setAiCount(Number(e.target.value))}
                        className="w-full bg-[#06070f] border border-[#1e2033] rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/60"
                      >
                        {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} câu</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 mb-1 block uppercase tracking-wide">Độ khó</label>
                      <select
                        value={aiDifficulty}
                        onChange={e => setAiDifficulty(e.target.value as any)}
                        className="w-full bg-[#06070f] border border-[#1e2033] rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/60"
                      >
                        <option value="mixed">Đa dạng</option>
                        <option value="easy">Dễ</option>
                        <option value="medium">Trung bình</option>
                        <option value="hard">Khó</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 mb-1 block uppercase tracking-wide">Loại câu (chọn nhiều)</label>
                      <div className="flex gap-1 flex-wrap">
                        {([
                          { id: 'MCQ', label: 'MCQ' },
                          { id: 'MULTIPLE_TF', label: 'Đúng/Sai' },
                          { id: 'SHORT_ANSWER', label: 'Trả lời ngắn' },
                          { id: 'ESSAY', label: 'Tự luận' },
                        ]).map(({ id, label }) => {
                          const active = aiTypes.includes(id)
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleAiType(id)}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors border ${
                                active
                                  ? 'bg-purple-500/30 border-purple-400 text-purple-200'
                                  : 'bg-[#06070f] border-[#1e2033] text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  {aiError && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-950/30 border border-rose-700/40 text-xs text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {/* Action: generate + tip */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      JSON sinh ra tự động fill xuống ô bên dưới — Bấm <strong className="text-purple-300">"Phân tích JSON"</strong> để import
                    </p>
                    <button
                      type="button"
                      onClick={handleAiGenerate}
                      disabled={aiLoading || !aiTopic.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: aiLoading || !aiTopic.trim()
                          ? '#6b7280'
                          : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                        boxShadow: aiLoading || !aiTopic.trim() ? 'none' : '0 4px 12px rgba(139,92,246,0.4)',
                      }}
                    >
                      {aiLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI đang sinh câu hỏi...</>
                        : <><Send className="w-3.5 h-3.5" /> Sinh câu hỏi bằng AI</>
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Dán JSON trực tiếp (alternative to file upload) ── */}
              <div className="relative">
                {/* "Hoặc" divider */}
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-[#2a2b3d]" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">hoặc — dán JSON sẵn có</span>
                  <div className="flex-1 h-px bg-[#2a2b3d]" />
                </div>

                <div className="bg-[#0c0d1a] border border-[#2a2b3d] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-bold text-slate-200">Dán code JSON trực tiếp</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {pastedJson && (
                        <button
                          type="button"
                          onClick={() => { setPastedJson(""); setPasteError(null) }}
                          className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 px-1.5 py-1 rounded transition-colors"
                          title="Xoá nội dung"
                        >
                          <Eraser className="w-3 h-3" />Xoá
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setPastedJson(PASTE_PLACEHOLDER_SHORT); setPasteError(null) }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 px-1.5 py-1 rounded transition-colors border border-amber-500/30"
                        title="Dán 1 câu MCQ mẫu"
                      >
                        <ClipboardPaste className="w-3 h-3" />1 câu MCQ
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPastedJson(PASTE_PLACEHOLDER_FULL); setPasteError(null) }}
                        className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 px-1.5 py-1 rounded transition-colors border border-fuchsia-500/30 bg-fuchsia-500/10"
                        title="Dán đầy đủ 4 loại câu hỏi: MCQ + Đúng/Sai + Trả lời ngắn + Tự luận"
                      >
                        <ClipboardPaste className="w-3 h-3" />4 loại câu chuẩn THPT
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={pastedJson}
                    onChange={e => { setPastedJson(e.target.value); if (pasteError) setPasteError(null) }}
                    spellCheck={false}
                    placeholder={PASTE_PLACEHOLDER_SHORT}
                    className="w-full h-48 bg-[#06070f] border border-[#1e2033] rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-amber-500/60 font-mono leading-relaxed resize-y"
                    style={{ tabSize: 2 }}
                  />

                  {/* ── Cheat sheet: cú pháp 4 loại câu hỏi ── */}
                  <div className="text-[11px] text-slate-400 space-y-1 bg-[#06070f]/60 border border-[#1e2033] rounded-lg p-2.5">
                    <p className="text-slate-300 font-semibold mb-1.5">💡 Hỗ trợ 4 loại câu — quy ước <code className="text-amber-400">correctAnswer</code>:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      <span><code className="text-blue-400">MCQ</code>: "A" / "B" / "C" / "D" (1 đáp án)</span>
                      <span><code className="text-emerald-400">MULTIPLE_TF</code>: "Đúng,Sai,Đúng,Sai" hoặc "TFTF"</span>
                      <span><code className="text-cyan-400">SHORT_ANSWER</code>: "1414" (4 ký tự số, đề THPT QG)</span>
                      <span><code className="text-fuchsia-400">ESSAY</code>: đáp án mẫu để GV chấm tham khảo</span>
                    </div>
                  </div>

                  {pasteError && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-950/30 border border-rose-700/40 text-xs text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{pasteError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[11px] text-slate-500">
                      Cấu trúc: <code className="text-amber-400 bg-[#161728] px-1 rounded">{`{ "questions": [{ content, options, correctAnswer, ... }] }`}</code>
                    </p>
                    <button
                      type="button"
                      onClick={handlePasteJson}
                      disabled={pasteParsing || !pastedJson.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex-shrink-0"
                    >
                      {pasteParsing
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang phân tích...</>
                        : <><FileText className="w-3.5 h-3.5" /> Phân tích JSON</>
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Format hint + Template download */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700/40 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1.5">📋 Định dạng cột:</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-mono break-all">
                    questionType | content | A | B | C | D | correctAnswer | subject | grade | difficulty | topic | explanation
                  </p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-1">
                    <strong>questionType:</strong> MCQ · MULTIPLE_TF · SHORT_ANSWER · TRUE_FALSE · ESSAY
                    {' '}— Hỗ trợ LaTeX inline <code className="px-1 rounded bg-blue-100 dark:bg-blue-800/40">$x^2$</code> và block <code className="px-1 rounded bg-blue-100 dark:bg-blue-800/40">$$\\int...$$</code>
                  </p>
                </div>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700/30">
                  <p className="text-xs text-blue-700 dark:text-blue-300/80 mb-2">
                    📥 Tải mẫu có sẵn <strong>5 câu hỏi mẫu</strong> (MCQ + Đúng/Sai 4 mệnh đề + Trả lời ngắn) để chỉnh sửa:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        downloadFile(buildXlsx(), 'mau-cau-hoi.xlsx')
                        toast.success('Đã tải mẫu Excel')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadFile(new Blob([buildCsv()], { type: 'text/csv;charset=utf-8' }), 'mau-cau-hoi.csv')
                        toast.success('Đã tải mẫu CSV')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-xs font-semibold hover:bg-cyan-200 dark:hover:bg-cyan-500/25 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadFile(new Blob([buildJson()], { type: 'application/json' }), 'mau-cau-hoi.json')
                        toast.success('Đã tải mẫu JSON')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-500/25 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadFile(new Blob([buildMarkdown()], { type: 'text/markdown;charset=utf-8' }), 'mau-cau-hoi.md')
                        toast.success('Đã tải mẫu Markdown')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/15 border border-fuchsia-300 dark:border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-semibold hover:bg-fuchsia-200 dark:hover:bg-fuchsia-500/25 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadFile(buildDoc(), 'mau-cau-hoi.doc')
                        toast.success('Đã tải mẫu Word')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/15 border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-500/25 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Word (.doc)
                    </button>
                  </div>
                  <ul className="text-[11px] text-blue-700 dark:text-blue-300/70 mt-3 space-y-1 list-disc pl-4">
                    <li><strong>Excel</strong> (.xlsx): 2 sheet (Câu hỏi + Hướng dẫn). Cột rộng sẵn, tiếng Việt OK.</li>
                    <li><strong>CSV</strong>: BOM UTF-8 → mở Excel không lỗi font, gọn nhẹ.</li>
                    <li><strong>JSON</strong>: <code className="px-1 rounded bg-blue-100 dark:bg-blue-800/40">{`{questions:[...]}`}</code> — cho người biết code.</li>
                    <li><strong>Markdown</strong> (.md): cú pháp text rõ, dễ soạn trong Notepad/VS Code.</li>
                    <li><strong>Word</strong> (.doc): xem cách điền bằng Microsoft Word. Sau khi soạn nên save thành Excel hoặc Markdown để upload.</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* ── Review Step ── */}
          {importStep === "review" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">
                    Xem trước ({parsedQuestions.filter((q) => q.selected).length}/
                    {parsedQuestions.length} đã chọn)
                  </h3>
                  <p className="text-sm text-slate-500">Bỏ chọn câu hỏi không muốn import</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setParsedQuestions((p) => p.map((q) => ({ ...q, selected: true })))}
                    className="px-3 py-1.5 border border-[#2a2b3d] text-slate-300 rounded-lg text-xs hover:bg-[#161728]"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => setParsedQuestions((p) => p.map((q) => ({ ...q, selected: false })))}
                    className="px-3 py-1.5 border border-[#2a2b3d] text-slate-300 rounded-lg text-xs hover:bg-[#161728]"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {parsedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 border rounded-xl cursor-pointer transition-all ${
                      q.selected ? "border-purple-600 bg-purple-950/30" : "border-[#1e2033] opacity-60"
                    }`}
                    onClick={() => toggleSelect(q.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          q.selected ? "bg-purple-600 border-purple-600" : "border-[#2a2b3d]"
                        }`}
                      >
                        {q.selected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">
                            {q.questionType}
                          </span>
                          <span className="text-xs bg-[#1e2033] text-slate-400 px-2 py-0.5 rounded-full">
                            {q.subject}
                          </span>
                          <span className="text-xs bg-[#1e2033] text-slate-400 px-2 py-0.5 rounded-full">
                            {q.grade}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            q.difficulty === "EASY" ? "bg-green-900/30 text-green-400" :
                            q.difficulty === "HARD" ? "bg-red-900/30 text-red-400" :
                            "bg-yellow-900/30 text-yellow-400"
                          }`}>
                            {q.difficulty === "EASY" ? "Dễ" : q.difficulty === "HARD" ? "Khó" : "TB"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-100 line-clamp-2">{q.content}</p>
                        {q.options.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {q.options.slice(0, 2).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(" | ")}
                            {q.options.length > 2 && " ..."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1e2033]">
                <button
                  onClick={() => { setImportStep("upload"); setFile(null); setParsedQuestions([]) }}
                  className="px-4 py-2.5 border border-[#2a2b3d] text-slate-300 rounded-xl text-sm hover:bg-[#161728]"
                >
                  Đổi file
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || parsedQuestions.filter((q) => q.selected).length === 0}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang import...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Import {parsedQuestions.filter((q) => q.selected).length} câu hỏi</>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Complete Step ── */}
          {importStep === "complete" && (
            <div className="border border-green-700/40 bg-green-900/10 rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="font-bold text-green-300 text-lg mb-1">Import thành công!</h3>
              <p className="text-green-400 mb-6">
                Đã thêm <strong>{savedCount}</strong> câu hỏi vào ngân hàng
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
