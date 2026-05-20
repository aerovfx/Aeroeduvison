/**
 * GradeBook — Sổ điểm chuẩn TT58 (Thông tư 22/2021/TT-BGDĐT sửa đổi 58/2011)
 *
 * Layout matches Bộ GD&ĐT online gradebook:
 *   Header: Khối / Lớp / Môn học / Học kỳ + toggle "Hiển thị ngày sinh, giới tính"
 *           + toggle "Nhảy cột" / "Nhảy dòng" (điều hướng Enter)
 *   Table:  STT | Mã định danh | Họ tên | [Ngày sinh] [Giới tính]
 *           | ĐĐGtx 1..5 | ĐĐGgk | ĐĐGck
 *           | ĐTBmhk1 | ĐTBmhk2 | ĐTBmcn (tự tính)
 *           | Nhận xét tiến bộ HK2 | Nhận xét ghi học bạ
 *
 * Công thức TT58:
 *   ĐTBmhk = (Σ ĐĐGtx + 2 × ĐĐGgk + 3 × ĐĐGck) / (số ĐĐGtx + 5)
 *   ĐTBmcn = (ĐTBmhk1 + 2 × ĐTBmhk2) / 3
 *
 * Lưu auto: debounce 1.5s sau mỗi edit. Batch save cả mảng student rows.
 * Tab navigation: Enter → cell tiếp theo cùng cột (nhảy dòng) hoặc cùng dòng
 * (nhảy cột).
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Save, Plus, X, GraduationCap, BookOpen, Download, Upload, CheckCircle2, AlertCircle, FileJson } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import * as XLSX from 'xlsx'

// ── Import điểm — helpers ─────────────────────────────────────────────────

/** Chuẩn hoá tên HS để so sánh fuzzy: bỏ dấu + lower + trim spaces */
function normalizeName(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Parse 1 cell thành điểm 0-10, trả null nếu trống/sai */
function parseScore(val: unknown): number | null {
  if (val == null || val === '' || val === '-' || val === '—') return null
  const n = Number(String(val).replace(',', '.').trim())
  if (!Number.isFinite(n) || n < 0 || n > 10) return null
  return Math.round(n * 10) / 10   // 1 decimal place
}

export interface ImportedRow {
  studentId: string | null     // ID học sinh match được
  rawName: string              // tên từ file
  rawMssv?: string             // mssv từ file (nếu có)
  grade: {
    ddgtx: (number | null)[]
    ddggk: number | null
    ddgck: number | null
    noteProgress: string
    noteRecord: string
  }
  matched: boolean
}

/**
 * Parse worksheet Excel → ImportedRow[].
 * Tự detect row header bằng cách tìm row chứa keyword "họ" (tên HS).
 * Hỗ trợ tên cột: ĐĐGtx1..5, TX1..5, GK, ĐĐGgk, CK, ĐĐGck, ...
 */
function parseExcelToRows(buf: ArrayBuffer, students: ClassStudent[]): ImportedRow[] {
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Tìm row header (chứa "họ" hoặc "tên")
  let headerRow = -1
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = aoa[i]
    if (row.some(c => /họ|tên|name/i.test(String(c)))) {
      headerRow = i; break
    }
  }
  if (headerRow < 0) return []

  const headers = aoa[headerRow].map(c => String(c).trim().toLowerCase())

  // Map cột theo tên
  const colIdx = (patterns: RegExp[]): number =>
    headers.findIndex(h => patterns.some(p => p.test(h)))

  const nameCol  = colIdx([/họ v?à? ?tên|họ tên|name/i])
  const mssvCol  = colIdx([/mã định danh|mssv|student.?id|ms/i])
  const gkCol    = colIdx([/ĐĐGgk|gk|giữa kỳ|đgk|midterm/i])
  const ckCol    = colIdx([/ĐĐGck|ck|cuối kỳ|đck|final/i])
  const npCol    = colIdx([/tiến bộ|nhận xét.*tiến|progress/i])
  const nrCol    = colIdx([/học bạ|nhận xét.*học bạ|record/i])
  const txCols   = Array.from({ length: 5 }, (_, i) => {
    // "ĐĐGtx1" | "TX1" | "Tx 1" | "1" (khi header đã có "ĐĐGtx" ở merged parent)
    const idx = colIdx([
      new RegExp(`(?:ĐĐGtx|TX|tx)\\s*0*${i + 1}(?:\\D|$)`, 'i'),
    ])
    // Nếu không tìm thấy, thử tìm số thứ tự bare (cột "1" "2" "3")
    if (idx < 0) {
      const bare = headers.findIndex(h => h.trim() === String(i + 1))
      return bare
    }
    return idx
  })

  // Normalise students map: name → id, mssv → id
  const byName = new Map<string, string>()
  const byMssv = new Map<string, string>()
  for (const s of students) {
    byName.set(normalizeName(s.name), s.id)
    if (s.mssv) byMssv.set(s.mssv.trim(), s.id)
  }

  const rows: ImportedRow[] = []
  for (let i = headerRow + 1; i < aoa.length; i++) {
    const row = aoa[i]
    if (!row.some(c => c !== '' && c != null)) continue  // skip empty rows
    const rawName = nameCol >= 0 ? String(row[nameCol] ?? '').trim() : ''
    const rawMssv = mssvCol >= 0 ? String(row[mssvCol] ?? '').trim() : ''
    if (!rawName) continue

    // Match student
    let studentId: string | null = null
    if (rawMssv && byMssv.has(rawMssv)) studentId = byMssv.get(rawMssv)!
    if (!studentId) studentId = byName.get(normalizeName(rawName)) ?? null

    rows.push({
      studentId,
      rawName,
      rawMssv: rawMssv || undefined,
      grade: {
        ddgtx: txCols.map(c => (c >= 0 ? parseScore(row[c]) : null)),
        ddggk: gkCol >= 0 ? parseScore(row[gkCol]) : null,
        ddgck: ckCol >= 0 ? parseScore(row[ckCol]) : null,
        noteProgress: npCol >= 0 ? String(row[npCol] ?? '').trim() : '',
        noteRecord:   nrCol >= 0 ? String(row[nrCol] ?? '').trim() : '',
      },
      matched: !!studentId,
    })
  }
  return rows
}

/**
 * Parse JSON → ImportedRow[].
 * Hỗ trợ 3 format:
 *  1. Array gốc: [{name, ddgtx, ddggk, ddgck, ...}]
 *  2. Object: {students:[...]}
 *  3. Simple: [{hoTen | name, TX1..TX5, GK, CK, ...}]
 */
function parseJsonToRows(text: string, students: ClassStudent[]): ImportedRow[] {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return [] }

  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as {students?: unknown}).students)
      ? (raw as {students: unknown[]}).students
      : []

  const byName = new Map<string, string>()
  const byMssv = new Map<string, string>()
  for (const s of students) {
    byName.set(normalizeName(s.name), s.id)
    if (s.mssv) byMssv.set(s.mssv.trim(), s.id)
  }

  return arr.map(item => {
    const o = item as Record<string, unknown>
    const rawName = String(o.name ?? o.hoTen ?? o.họTên ?? o['Họ tên'] ?? o['Họ và tên'] ?? '').trim()
    const rawMssv = String(o.mssv ?? o.maDinhDanh ?? o['Mã định danh'] ?? '').trim()

    let studentId: string | null = null
    if (rawMssv && byMssv.has(rawMssv)) studentId = byMssv.get(rawMssv)!
    if (!studentId) studentId = byName.get(normalizeName(rawName)) ?? null

    // ddgtx từ array hoặc các key TX1..TX5
    let ddgtx: (number | null)[]
    if (Array.isArray(o.ddgtx)) {
      ddgtx = (o.ddgtx as unknown[]).slice(0, 5).map(parseScore)
      while (ddgtx.length < 5) ddgtx.push(null)
    } else {
      ddgtx = Array.from({ length: 5 }, (_, i) =>
        parseScore(o[`TX${i+1}`] ?? o[`ĐĐGtx${i+1}`] ?? o[`tx${i+1}`] ?? null)
      )
    }

    return {
      studentId,
      rawName,
      rawMssv: rawMssv || undefined,
      grade: {
        ddgtx,
        ddggk: parseScore(o.ddggk ?? o.GK ?? o.gk ?? o['Giữa kỳ'] ?? null),
        ddgck: parseScore(o.ddgck ?? o.CK ?? o.ck ?? o['Cuối kỳ'] ?? null),
        noteProgress: String(o.noteProgress ?? o['Nhận xét tiến bộ'] ?? o.nhanXetTienBo ?? '').trim(),
        noteRecord:   String(o.noteRecord   ?? o['Nhận xét học bạ'] ?? o.nhanXetHocBa ?? '').trim(),
      },
      matched: !!studentId,
    }
  }).filter(r => r.rawName)
}

interface ClassInfo {
  id: string
  name: string
  grade: string
  schoolYear: string
}

interface ClassStudent {
  id: string
  stt: number | null
  mssv: string | null
  name: string
  dob: string | null
  gender: string | null
}

interface GradeRow {
  ddgtx: (number | null)[]
  ddggk: number | null
  ddgck: number | null
  noteProgress: string
  noteRecord: string
}

const NUM_TX = 5  // ĐĐGtx có tối đa 5 cột theo TT22/2021

function emptyGrade(): GradeRow {
  return { ddgtx: Array(NUM_TX).fill(null), ddggk: null, ddgck: null, noteProgress: '', noteRecord: '' }
}

function computeDTBmhk(g: GradeRow): number | null {
  const tx = g.ddgtx.filter((x): x is number => x !== null && Number.isFinite(x))
  if (tx.length === 0 || g.ddggk == null || g.ddgck == null) return null
  const num = tx.reduce((s, x) => s + x, 0) + 2 * g.ddggk + 3 * g.ddgck
  const den = tx.length + 5
  return Math.round((num / den) * 10) / 10
}

function fmtScore(n: number | null): string {
  if (n === null || n === undefined) return ''
  return n.toFixed(1).replace(/\.0$/, '')
}

export default function GradeBook() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [students, setStudents] = useState<ClassStudent[]>([])
  const [grades, setGrades] = useState<Record<string, GradeRow>>({})

  const grade    = searchParams.get('grade')    || ''     // 'Khối 10'
  const classId  = searchParams.get('classId')  || ''
  const subject  = searchParams.get('subject')  || ''
  const semester = searchParams.get('semester') || 'HK2'
  /** ctx=SCHOOL | CENTER — phân biệt hệ thống chấm điểm (2026-05-20) */
  const ctxType  = searchParams.get('ctx') === 'CENTER' ? 'CENTER' : 'SCHOOL'

  const [showDob, setShowDob] = useState(false)
  const [tabMode, setTabMode] = useState<'col' | 'row'>('col')  // mặc định nhảy cột
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [dirty, setDirty]     = useState(false)
  const [addSubjOpen, setAddSubjOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Export sổ điểm xlsx (CHỈ trong file export mới có cột Mã định danh) ──
  const handleExportGradebook = useCallback(() => {
    if (!classId || !subject || students.length === 0) {
      toast.error('Chưa có dữ liệu để xuất')
      return
    }
    const className = classes.find(c => c.id === classId)?.name || ''
    const schoolYear = classes.find(c => c.id === classId)?.schoolYear || ''
    // Header rows: title + meta + cảnh báo + spacer + col headers
    const txCols = Array.from({ length: NUM_TX }, (_, i) => `ĐĐGtx${i + 1}`)
    const colHeaders = [
      'STT', 'Mã định danh Bộ GD&ĐT', 'Họ và tên', 'Ngày sinh', 'Giới tính',
      ...txCols, 'ĐĐGgk', 'ĐĐGck',
      `ĐTBm${semester === 'HK1' ? 'hk1' : 'hk2'}`, 'ĐTBmcn',
      `Nhận xét sự tiến bộ (${semester})`, 'Nhận xét ghi học bạ',
    ]
    const dataRows = students.map((s, i) => {
      const g = grades[s.id] || emptyGrade()
      const dtb = computeDTBmhk(g)
      return [
        s.stt ?? i + 1,
        s.mssv || '',
        s.name || '',
        s.dob || '',
        s.gender || '',
        ...g.ddgtx.map(v => (v == null ? '' : v)),
        g.ddggk ?? '',
        g.ddgck ?? '',
        dtb != null ? Number(dtb.toFixed(2)) : '',
        semester === 'HK2' && dtb != null ? Number(dtb.toFixed(2)) : '',
        g.noteProgress || '',
        g.noteRecord || '',
      ]
    })
    const aoa = [
      [`SỔ ĐIỂM — ${subject} — ${className} — ${schoolYear} — ${semester === 'HK1' ? 'Học kỳ 1' : 'Học kỳ 2'}`],
      [`Xuất ngày: ${new Date().toLocaleString('vi-VN')}`],
      [`⚠ File chứa MÃ ĐỊNH DANH CÁ NHÂN HS — bảo mật theo Luật ATTT 86/2015`],
      [],
      colHeaders,
      ...dataRows,
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [
      { wch: 5 },   // STT
      { wch: 22 },  // Mã định danh
      { wch: 28 },  // Họ tên
      { wch: 12 },  // Ngày sinh
      { wch: 8 },   // Giới tính
      ...Array(NUM_TX).fill({ wch: 8 }),  // ĐĐGtx
      { wch: 8 }, { wch: 8 },  // ĐĐGgk, ĐĐGck
      { wch: 10 }, { wch: 10 }, // ĐTBmhk, ĐTBmcn
      { wch: 35 }, { wch: 35 },  // Nhận xét
    ]
    const totalCols = colHeaders.length
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sổ điểm')
    const safeClass = (className || classId).replace(/[^\w\d-]+/g, '_')
    const safeSubj = subject.replace(/[^\w\d-]+/g, '_')
    const dateStr = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `SoDiem_${safeClass}_${safeSubj}_${semester}_${dateStr}.xlsx`)
    toast.success(`Đã xuất sổ điểm ${students.length} HS`)
  }, [classId, subject, semester, students, grades, classes])

  // ── Load lớp của teacher (chỉ 1 lần)
  useEffect(() => {
    api.get<{ classes: ClassInfo[] }>('/classes')
      .then(r => setClasses(r.data?.classes || []))
      .catch(() => setClasses([]))
  }, [])

  // ── Filter classes theo khối
  const filteredClasses = useMemo(() =>
    classes.filter(c => !grade || c.grade === grade),
  [classes, grade])

  // ── Load subjects khi đổi class
  useEffect(() => {
    if (!classId) { setSubjects([]); return }
    api.get<{ subjects: string[] }>(`/classes/${classId}/subjects`)
      .then(r => setSubjects(r.data?.subjects || []))
      .catch(() => setSubjects([]))
  }, [classId])

  // ── Load students + grades khi đủ class+subject+semester
  const loadGradebook = useCallback(async () => {
    if (!classId || !subject || !semester) {
      setStudents([])
      setGrades({})
      return
    }
    setLoading(true)
    try {
      const res = await api.get<{
        students: ClassStudent[]
        grades: Record<string, GradeRow>
      }>('/teacher/gradebook', { params: { classId, subject, semester } })
      setStudents(res.data?.students || [])
      // Fill missing students with empty grade rows
      const gMap = { ...(res.data?.grades || {}) }
      for (const s of res.data?.students || []) {
        if (!gMap[s.id]) gMap[s.id] = emptyGrade()
        // Đảm bảo ddgtx có đủ NUM_TX cột
        while (gMap[s.id].ddgtx.length < NUM_TX) gMap[s.id].ddgtx.push(null)
      }
      setGrades(gMap)
      setDirty(false)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không tải được sổ điểm')
      setStudents([])
      setGrades({})
    } finally {
      setLoading(false)
    }
  }, [classId, subject, semester])

  useEffect(() => { loadGradebook() }, [loadGradebook])

  // ── Sync URL params helper
  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    // reset downstream params when upstream changes
    if (key === 'grade')   { p.delete('classId'); p.delete('subject') }
    if (key === 'classId') { p.delete('subject') }
    setSearchParams(p, { replace: true })
  }

  // ── Save (debounced auto + manual)
  const saveAll = useCallback(async () => {
    if (!classId || !subject) return
    setSaving(true)
    try {
      const rows = Object.entries(grades).map(([studentId, g]) => ({
        studentId,
        ddgtx: g.ddgtx,
        ddggk: g.ddggk,
        ddgck: g.ddgck,
        noteProgress: g.noteProgress,
        noteRecord:   g.noteRecord,
      }))
      await api.post('/teacher/gradebook', { classId, subject, semester, rows })
      setDirty(false)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }, [classId, subject, semester, grades])

  const scheduleAutoSave = useCallback(() => {
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveAll() }, 1500)
  }, [saveAll])

  // ── Cell update helpers
  const updateScore = (sid: string, field: 'ddggk' | 'ddgck', val: string) => {
    const num = val === '' ? null : Math.max(0, Math.min(10, Number(val)))
    setGrades(g => ({ ...g, [sid]: { ...g[sid], [field]: Number.isFinite(num as number) ? num : null } }))
    scheduleAutoSave()
  }
  const updateTx = (sid: string, idx: number, val: string) => {
    const num = val === '' ? null : Math.max(0, Math.min(10, Number(val)))
    setGrades(g => {
      const tx = [...g[sid].ddgtx]
      tx[idx] = Number.isFinite(num as number) ? num : null
      return { ...g, [sid]: { ...g[sid], ddgtx: tx } }
    })
    scheduleAutoSave()
  }
  const updateNote = (sid: string, field: 'noteProgress' | 'noteRecord', val: string) => {
    setGrades(g => ({ ...g, [sid]: { ...g[sid], [field]: val } }))
    scheduleAutoSave()
  }

  // ── Tab/Enter navigation: focus next cell by data-cell="r-c"
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const nextR = tabMode === 'row' ? r + 1 : r
    const nextC = tabMode === 'col' ? c + 1 : c
    const nextEl = document.querySelector<HTMLInputElement>(`[data-cell="${nextR}-${nextC}"]`)
    nextEl?.focus()
    nextEl?.select()
  }

  // ── Add subject handler
  const handleAddSubject = async () => {
    const s = newSubject.trim()
    if (!s || !classId) return
    try {
      await api.post(`/classes/${classId}/subjects`, { subject: s })
      toast.success(`Đã thêm môn "${s}"`)
      setSubjects(prev => [...prev, s])
      setAddSubjOpen(false)
      setNewSubject('')
      updateParam('subject', s)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không thêm được môn')
    }
  }

  // ── Derived: list of unique grades (khối) from teacher's classes
  const allGrades = useMemo(() => {
    const set = new Set(classes.map(c => c.grade).filter(Boolean))
    return Array.from(set).sort()
  }, [classes])

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* ── CENTER class notice banner ── */}
      {ctxType === 'CENTER' && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <span className="text-base">🏫</span>
          <div>
            <span className="font-semibold">Lớp trung tâm:</span>{' '}
            Bảng điểm này dành cho lớp học ở <strong>trung tâm</strong> (không phải trường chính thức).
            Điểm được ghi theo tiêu chí của trung tâm, không áp dụng công thức TT58 Bộ GD&ĐT.
            Phần <em>Nhận xét tiến bộ</em> có thể dùng để ghi khen thưởng hoặc phản hồi cá nhân hóa.
          </div>
        </div>
      )}

      {/* ── Header bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SelectLabel label="Khối">
            <select
              value={grade}
              onChange={e => updateParam('grade', e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Tất cả</option>
              {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </SelectLabel>

          <SelectLabel label="Lớp">
            <select
              value={classId}
              onChange={e => updateParam('classId', e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[120px]"
            >
              <option value="">-- Chọn lớp --</option>
              {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </SelectLabel>

          <SelectLabel label="Môn học">
            <div className="flex items-center gap-1">
              <select
                value={subject}
                onChange={e => updateParam('subject', e.target.value)}
                disabled={!classId}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[140px] disabled:bg-gray-100"
              >
                <option value="">-- Chọn môn --</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={() => setAddSubjOpen(true)}
                disabled={!classId}
                title="Thêm môn vào lớp này"
                className="p-1.5 rounded text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </SelectLabel>

          <SelectLabel label="Học kỳ">
            <select
              value={semester}
              onChange={e => updateParam('semester', e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="HK1">Học kỳ 1</option>
              <option value="HK2">Học kỳ 2</option>
            </select>
          </SelectLabel>

          {/* Toggles */}
          <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showDob}
              onChange={e => setShowDob(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            Hiển thị ngày sinh, giới tính
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="tabMode"
              checked={tabMode === 'col'}
              onChange={() => setTabMode('col')}
              className="w-4 h-4 accent-blue-600"
            />
            Nhảy cột
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="tabMode"
              checked={tabMode === 'row'}
              onChange={() => setTabMode('row')}
              className="w-4 h-4 accent-blue-600"
            />
            Nhảy dòng
          </label>

          {/* Save status + Export */}
          <div className="ml-auto flex items-center gap-2 text-sm">
            {saving ? (
              <span className="flex items-center gap-1.5 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />Đang lưu...
              </span>
            ) : dirty ? (
              <button
                onClick={saveAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
              >
                <Save className="w-3.5 h-3.5" />Lưu ngay
              </button>
            ) : (
              <span className="text-green-600 text-xs">✓ Đã lưu</span>
            )}
            <button
              onClick={() => setImportOpen(true)}
              disabled={!classId || !subject || students.length === 0}
              title="Import điểm từ file Excel (.xlsx) hoặc JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" />Import điểm
            </button>
            <button
              onClick={handleExportGradebook}
              disabled={!subject || students.length === 0}
              title="Xuất sổ điểm Excel — file export sẽ kèm cột Mã định danh BộGD&ĐT"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />Xuất Excel
            </button>
          </div>
        </div>

        {user?.name && subject && (
          <p className="text-sm text-gray-700 mt-3 font-semibold">
            <BookOpen className="inline w-4 h-4 mr-1 text-blue-600" />
            Giáo viên bộ môn: <span className="font-normal">{user.name}</span>
          </p>
        )}
      </div>

      {/* ── Empty state ── */}
      {!classId || !subject ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-700 font-semibold mb-1">Chọn lớp và môn học để bắt đầu nhập điểm</p>
          <p className="text-sm text-gray-500">
            {classes.length === 0
              ? 'Bạn chưa có lớp nào. Hãy tạo lớp ở trang /teacher/classes trước.'
              : !classId
                ? 'Chọn khối → lớp ở thanh trên.'
                : 'Chọn môn học để hiện sổ điểm — bấm + để thêm môn mới vào lớp này.'}
          </p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-3" />
          <p className="text-gray-600">Đang tải sổ điểm...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-700 font-semibold mb-1">Lớp này chưa có học sinh</p>
          <p className="text-sm text-gray-500">Vào <a className="text-blue-600 underline" href="/teacher/classes">/teacher/classes</a> để import danh sách.</p>
        </div>
      ) : (
        /* ── Grade table ── */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-700 text-white sticky top-0">
                <tr>
                  <Th rowSpan={2} className="w-12 text-center">STT</Th>
                  {/* Cột "Mã định danh Bộ GD&ĐT" đã ẨN khỏi UI (PII).
                      Chỉ xuất hiện khi teacher bấm "Xuất Excel" ở toolbar. */}
                  <Th rowSpan={2} className="min-w-[180px]">Họ tên</Th>
                  {showDob && (
                    <>
                      <Th rowSpan={2} className="w-24">Ngày sinh</Th>
                      <Th rowSpan={2} className="w-16">G.tính</Th>
                    </>
                  )}
                  <Th colSpan={NUM_TX} className="text-center border-l border-blue-500">ĐĐGtx</Th>
                  <Th rowSpan={2} className="w-16 text-center border-l border-blue-500">ĐĐGgk</Th>
                  <Th rowSpan={2} className="w-16 text-center">ĐĐGck</Th>
                  <Th rowSpan={2} className="w-20 text-center border-l border-blue-500">ĐTBmhk{semester === 'HK1' ? '1' : '2'}</Th>
                  <Th rowSpan={2} className="w-20 text-center">ĐTBmcn</Th>
                  <Th rowSpan={2} className="min-w-[200px]">Nhận xét sự tiến bộ ({semester})</Th>
                  <Th rowSpan={2} className="min-w-[200px]">Nhận xét ghi học bạ</Th>
                </tr>
                <tr>
                  {Array.from({ length: NUM_TX }, (_, i) => (
                    <Th key={i} className={`w-14 text-center text-xs ${i === 0 ? 'border-l border-blue-500' : ''}`}>
                      {i + 1}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, r) => {
                  const g = grades[s.id] || emptyGrade()
                  const dtb = computeDTBmhk(g)
                  // Force consistent contrast (như sổ điểm Excel/Bộ GD&ĐT) —
                  // KHÔNG để theme dark mode override gây trắng-trên-trắng vô hình.
                  // Pattern: zebra row light-gray vs white, text always slate-900.
                  const rowBg = r % 2 ? 'bg-slate-100' : 'bg-white'
                  return (
                    <tr key={s.id} className={`${rowBg} text-slate-900`}>
                      <td className={`${rowBg} px-2 py-1.5 text-center text-slate-500 border border-slate-300`}>{s.stt ?? r + 1}</td>
                      {/* Cột mssv ẨN — chỉ trong file Excel export */}
                      <td className={`${rowBg} px-2 py-1.5 font-semibold text-slate-900 border border-slate-300`}>{s.name}</td>
                      {showDob && (
                        <>
                          <td className={`${rowBg} px-2 py-1.5 text-xs text-slate-600 border border-slate-300`}>{s.dob || '—'}</td>
                          <td className={`${rowBg} px-2 py-1.5 text-xs text-center border border-slate-300`}>
                            <span className={`px-1.5 rounded font-semibold ${s.gender === 'Nữ' ? 'text-pink-600 bg-pink-50' : 'text-blue-600 bg-blue-50'}`}>
                              {s.gender || '—'}
                            </span>
                          </td>
                        </>
                      )}
                      {/* ĐĐGtx 1..5 — bg trắng đều cho dễ thấy điểm */}
                      {Array.from({ length: NUM_TX }, (_, i) => (
                        <td key={i} className="p-0 border border-slate-300 bg-white">
                          <ScoreCell
                            value={fmtScore(g.ddgtx[i])}
                            data-cell={`${r}-${i}`}
                            onChange={(v) => updateTx(s.id, i, v)}
                            onKeyDown={(e) => handleKeyDown(e, r, i)}
                          />
                        </td>
                      ))}
                      {/* ĐĐGgk — vàng nhẹ phân biệt cột giữa kỳ */}
                      <td className="p-0 border border-slate-300 bg-amber-50">
                        <ScoreCell
                          value={fmtScore(g.ddggk)}
                          data-cell={`${r}-${NUM_TX}`}
                          onChange={(v) => updateScore(s.id, 'ddggk', v)}
                          onKeyDown={(e) => handleKeyDown(e, r, NUM_TX)}
                          highlight="amber"
                        />
                      </td>
                      {/* ĐĐGck — cam đậm hơn phân biệt cột cuối kỳ */}
                      <td className="p-0 border border-slate-300 bg-orange-100">
                        <ScoreCell
                          value={fmtScore(g.ddgck)}
                          data-cell={`${r}-${NUM_TX + 1}`}
                          onChange={(v) => updateScore(s.id, 'ddgck', v)}
                          onKeyDown={(e) => handleKeyDown(e, r, NUM_TX + 1)}
                          highlight="orange"
                        />
                      </td>
                      {/* ĐTBmhk auto — cell tô màu theo điểm để dễ thấy phân loại */}
                      <td className={`px-2 py-2 text-center font-bold text-base border border-slate-300 ${
                        dtb == null      ? 'bg-slate-50    text-slate-300'  :
                        dtb >= 8         ? 'bg-green-100   text-green-700'  :
                        dtb >= 6.5       ? 'bg-blue-100    text-blue-700'   :
                        dtb >= 5         ? 'bg-yellow-100  text-yellow-700' :
                                           'bg-red-100     text-red-700'
                      }`}>
                        {dtb != null ? dtb.toFixed(1) : '—'}
                      </td>
                      {/* ĐTBmcn */}
                      <td className={`${rowBg} px-2 py-1.5 text-center font-semibold text-slate-500 border border-slate-300`}>
                        {semester === 'HK2' && dtb != null ? dtb.toFixed(1) : '—'}
                      </td>
                      {/* Notes — bg trắng để text đen rõ ràng */}
                      <td className="p-0 border border-slate-300 bg-white">
                        <textarea
                          value={g.noteProgress}
                          onChange={e => updateNote(s.id, 'noteProgress', e.target.value)}
                          rows={1}
                          className="w-full px-2 py-1.5 text-xs border-0 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-blue-50 resize-y"
                        />
                      </td>
                      <td className="p-0 border border-slate-300 bg-white">
                        <textarea
                          value={g.noteRecord}
                          onChange={e => updateNote(s.id, 'noteRecord', e.target.value)}
                          rows={1}
                          className="w-full px-2 py-1.5 text-xs border-0 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-blue-50 resize-y"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex items-center justify-between">
            <span>Tổng {students.length} học sinh • Auto-save 1.5s sau mỗi sửa</span>
            <span className="text-gray-400">
              ĐTBmhk = (Σ ĐĐGtx + 2·ĐĐGgk + 3·ĐĐGck) / (n+5) — TT22/2021
            </span>
          </div>
        </div>
      )}

      {/* ── Import điểm modal ── */}
      {importOpen && (
        <GradeImportModal
          students={students}
          currentSubject={subject}
          currentSemester={semester}
          onClose={() => setImportOpen(false)}
          onApply={(rows) => {
            setGrades(prev => {
              const next = { ...prev }
              for (const r of rows) {
                if (!r.matched || !r.studentId) continue
                const existing = next[r.studentId] || emptyGrade()
                // Merge: chỉ ghi đè field nào có giá trị trong file
                const mergedTx = [...existing.ddgtx]
                r.grade.ddgtx.forEach((v, i) => { if (v != null) mergedTx[i] = v })
                next[r.studentId] = {
                  ddgtx: mergedTx,
                  ddggk: r.grade.ddggk ?? existing.ddggk,
                  ddgck: r.grade.ddgck ?? existing.ddgck,
                  noteProgress: r.grade.noteProgress || existing.noteProgress,
                  noteRecord:   r.grade.noteRecord   || existing.noteRecord,
                }
              }
              return next
            })
            scheduleAutoSave()
            setImportOpen(false)
            const matched = rows.filter(r => r.matched).length
            toast.success(`Đã import điểm cho ${matched}/${rows.length} học sinh`)
          }}
        />
      )}

      {/* ── Add subject modal ── */}
      {addSubjOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddSubjOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Thêm môn vào lớp</h3>
              <button onClick={() => setAddSubjOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Bạn dạy thêm môn nào ở lớp này? VD: Toán, Hoá, Sinh, ...
            </p>
            <input
              type="text"
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
              placeholder="Tên môn học"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setAddSubjOpen(false)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >Huỷ</button>
              <button
                onClick={handleAddSubject}
                disabled={!newSubject.trim()}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm font-semibold"
              >Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Subcomponents ────────────────────────────────────────────
function SelectLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold text-gray-700">{label}:</span>
      {children}
    </div>
  )
}

function Th({ children, className = '', ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th {...rest} className={`px-2 py-2 font-semibold text-xs whitespace-nowrap ${className}`}>
      {children}
    </th>
  )
}

interface ScoreCellProps {
  value: string
  onChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  'data-cell': string
  /** Tone bg cho cột đặc biệt (ĐĐGgk vàng / ĐĐGck cam) */
  highlight?: 'amber' | 'orange'
}
function ScoreCell({ value, onChange, onKeyDown, 'data-cell': dataCell, highlight }: ScoreCellProps) {
  // Bg explicit để KHÔNG bị dark mode override → text-on-text invisible.
  // Pattern màu: empty cell có placeholder chấm "·" để biết đó là ô nhập.
  const bgCls = highlight === 'amber'  ? 'bg-amber-50'   :
                highlight === 'orange' ? 'bg-orange-100' :
                                         'bg-white'
  // Khi có giá trị → in đậm + tô màu theo điểm để đọc 1 phát thấy ngay
  const num = value === '' ? null : Number(value)
  const valueColor =
    num == null || isNaN(num) ? 'text-slate-400' :
    num >= 8                  ? 'text-green-700 font-bold' :
    num >= 6.5                ? 'text-blue-700  font-semibold' :
    num >= 5                  ? 'text-amber-700 font-semibold' :
                                'text-red-700   font-bold'
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      placeholder="·"
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={e => e.target.select()}
      data-cell={dataCell}
      className={`w-full h-full px-1 py-1.5 text-center border-0 text-sm
        ${bgCls} ${valueColor}
        placeholder:text-slate-300 placeholder:font-light
        focus:outline-none focus:bg-blue-100 focus:ring-2 focus:ring-blue-400 focus:ring-inset focus:text-slate-900 focus:font-bold
        transition-colors`}
    />
  )
}

// ── GradeImportModal ──────────────────────────────────────────────────────

function GradeImportModal({
  students,
  currentSubject,
  currentSemester,
  onClose,
  onApply,
}: {
  students: ClassStudent[]
  currentSubject: string
  currentSemester: string
  onClose: () => void
  onApply: (rows: ImportedRow[]) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportedRow[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState('')

  const matchedCount = rows?.filter(r => r.matched).length ?? 0
  const totalCount   = rows?.length ?? 0

  // ── Download template Excel (điền sẵn tên HS, để trống điểm) ──
  const downloadTemplate = () => {
    const headers = [
      'STT', 'Họ và tên',
      'ĐĐGtx1', 'ĐĐGtx2', 'ĐĐGtx3', 'ĐĐGtx4', 'ĐĐGtx5',
      'ĐĐGgk', 'ĐĐGck',
      'Nhận xét sự tiến bộ', 'Nhận xét ghi học bạ',
    ]
    const dataRows = students.map((s, i) => [
      s.stt ?? i + 1, s.name, '', '', '', '', '', '', '', '', '',
    ])
    const aoa = [
      [`TEMPLATE NHẬP ĐIỂM — ${currentSubject} — ${currentSemester === 'HK1' ? 'Học kỳ 1' : 'Học kỳ 2'}`],
      [`Điền điểm vào các cột ĐĐGtx1..5, ĐĐGgk, ĐĐGck. Để trống = không có điểm.`],
      [`Thang điểm 0–10. Chấp nhận số thập phân (dấu chấm hoặc phẩy).`],
      [],
      headers,
      ...dataRows,
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [
      { wch: 5 }, { wch: 30 },
      ...Array(5).fill({ wch: 10 }),
      { wch: 10 }, { wch: 10 },
      { wch: 35 }, { wch: 35 },
    ]
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Nhập điểm')
    XLSX.writeFile(wb, `Template_Diem_${currentSubject}_${currentSemester}.xlsx`)
    toast.success('Đã tải template — điền điểm rồi import lại')
  }

  // ── Parse file khi chọn ──
  const handleFile = async (file: File) => {
    setFileName(file.name)
    setParsing(true)
    setRows(null)
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text()
        const parsed = parseJsonToRows(text, students)
        setRows(parsed)
      } else {
        // Excel (.xlsx, .xls, .csv)
        const buf = await file.arrayBuffer()
        const parsed = parseExcelToRows(buf, students)
        setRows(parsed)
      }
    } catch (e) {
      toast.error('Không đọc được file — kiểm tra lại định dạng')
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import điểm từ Excel / JSON</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Môn: <strong>{currentSubject}</strong> — {currentSemester === 'HK1' ? 'Học kỳ 1' : 'Học kỳ 2'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Step 1 — Download template + Upload */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Template download */}
            <div className="flex-1 border border-violet-200 bg-violet-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-violet-800 mb-1">① Tải template Excel</p>
              <p className="text-xs text-violet-600 mb-3">
                File đã điền sẵn danh sách {students.length} HS, để trống cột điểm.
              </p>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Tải template ({students.length} HS)
              </button>
            </div>
            {/* File upload */}
            <div className="flex-1 border-2 border-dashed border-gray-300 hover:border-violet-400 rounded-xl p-4 text-center transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  <span className="text-xs text-gray-500">Đang phân tích file...</span>
                </div>
              ) : fileName ? (
                <div className="flex flex-col items-center gap-1 py-2">
                  {fileName.endsWith('.json')
                    ? <FileJson className="w-6 h-6 text-orange-500" />
                    : <Download className="w-6 h-6 text-emerald-500" />}
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]">{fileName}</span>
                  <span className="text-[11px] text-violet-600 mt-0.5">Nhấp để đổi file</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">② Kéo thả hoặc nhấp để chọn file</p>
                  <p className="text-xs text-gray-400">.xlsx · .xls · .csv · .json</p>
                </div>
              )}
            </div>
          </div>

          {/* JSON format hint */}
          <details className="text-xs text-gray-500 cursor-pointer">
            <summary className="flex items-center gap-1.5 font-medium text-gray-600 hover:text-gray-800">
              <FileJson className="w-3.5 h-3.5" />Định dạng JSON được hỗ trợ
            </summary>
            <pre className="mt-2 bg-gray-50 rounded-lg p-3 text-[10px] overflow-x-auto leading-relaxed border border-gray-200">{`[
  {
    "name": "Nguyễn Văn A",
    "ddgtx": [8.5, 7, null, null, null],
    "ddggk": 8,
    "ddgck": 7.5,
    "noteProgress": "Tiến bộ tốt"
  },
  { "name": "Trần Thị B", "TX1": 9, "TX2": 8, "GK": 8.5, "CK": 9 }
]`}</pre>
          </details>

          {/* Preview table */}
          {rows !== null && (
            <div>
              {/* Summary bar */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-3 ${
                matchedCount === totalCount
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : matchedCount === 0
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {matchedCount === totalCount
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <AlertCircle className="w-4 h-4" />}
                Tìm thấy {matchedCount}/{totalCount} học sinh khớp
                {matchedCount < totalCount && (
                  <span className="ml-1 text-xs font-normal">
                    — {totalCount - matchedCount} tên không khớp (kiểm tra chính tả)
                  </span>
                )}
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Học sinh</th>
                        {Array.from({ length: 5 }, (_, i) => (
                          <th key={i} className="px-1.5 py-2 text-center font-semibold w-12">TX{i+1}</th>
                        ))}
                        <th className="px-1.5 py-2 text-center font-semibold w-12">GK</th>
                        <th className="px-1.5 py-2 text-center font-semibold w-12">CK</th>
                        <th className="px-2 py-2 text-center font-semibold w-16">Khớp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={`border-t border-gray-100 ${r.matched ? '' : 'bg-red-50'}`}>
                          <td className="px-3 py-1.5 font-medium text-gray-800 max-w-[180px] truncate">
                            {r.rawName}
                          </td>
                          {r.grade.ddgtx.map((v, j) => (
                            <td key={j} className="px-1.5 py-1.5 text-center text-gray-600">
                              {v != null ? (
                                <span className={`font-semibold ${
                                  v >= 8 ? 'text-green-700' : v >= 6.5 ? 'text-blue-700' :
                                  v >= 5 ? 'text-amber-700' : 'text-red-700'
                                }`}>{v}</span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                          <td className="px-1.5 py-1.5 text-center">
                            {r.grade.ddggk != null ? (
                              <span className="font-semibold text-amber-700">{r.grade.ddggk}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-1.5 py-1.5 text-center">
                            {r.grade.ddgck != null ? (
                              <span className="font-semibold text-orange-700">{r.grade.ddgck}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {r.matched
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              : <span className="text-red-500 text-[10px] font-bold">✗ Ko khớp</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unmatched warning */}
              {matchedCount < totalCount && (
                <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <strong>Tên không khớp:</strong>{' '}
                  {rows.filter(r => !r.matched).map(r => `"${r.rawName}"`).join(', ')}.
                  Kiểm tra chính tả hoặc copy đúng tên từ sổ điểm.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            Chỉ ghi đè các ô có giá trị trong file — ô trống sẽ giữ nguyên điểm cũ
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={() => rows && onApply(rows)}
              disabled={!rows || matchedCount === 0}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold"
            >
              Áp dụng ({matchedCount} HS)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
