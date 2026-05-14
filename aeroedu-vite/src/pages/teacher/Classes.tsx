import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Users, Trash2, UserPlus,
  BarChart3, Calendar, GraduationCap, Loader2, School, X,
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { api } from '@/services/api'

interface Class {
  id: string
  name: string
  grade: string
  schoolYear: string
  description?: string
  studentCount: number
  createdAt: string
}

interface Student {
  id: string
  name: string
  email: string
}

interface ImportStudent {
  stt: number
  hoTen: string
  ngaySinh: string
  gioiTinh: string
  maDinhDanh: string
}

interface ImportResult {
  created: number
  existing: number
  enrolled: number
  skipped: number
}

// ── Mini components ──────────────────────────────────────────
function StatusBadge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'empty'
}) {
  const cls = {
    default: 'bg-purple-50 text-purple-600 border-purple-200',
    success: 'bg-green-50 text-green-600 border-green-200',
    warning: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    empty:   'bg-gray-50 text-gray-600 border-gray-200',
  }[variant]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${cls}`}>
      {children}
    </span>
  )
}

// ── Modal backdrop ───────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg z-10">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── AddStudentsModal (inline replacement) ───────────────────
function AddStudentsModal({
  open,
  onClose,
  classId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  classId: string
  onAdded: () => void
}) {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/users?role=STUDENT')
      .then(r => r.json())
      .then(d => setStudents(d.users || d || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = students.filter(
    s =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const handleAdd = async () => {
    if (!selected.length) return
    setAdding(true)
    try {
      await api.post(`/classes/${classId}/students`, { studentIds: selected })
      toast.success(`Đã thêm ${selected.length} học sinh vào lớp`)
      onAdded()
    } catch {
      toast.error('Không thể thêm học sinh')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Thêm học sinh vào lớp">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm học sinh..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">Không tìm thấy học sinh</p>
          ) : (
            filtered.map(s => (
              <label
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="w-4 h-4 rounded text-purple-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected.length || adding}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {adding && <Loader2 className="w-4 h-4 animate-spin" />}
            Thêm ({selected.length})
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Excel template generator ─────────────────────────────────
// Sinh file mẫu khớp 100% với layout TT58 (Thông tư 58/2011 sửa đổi 22/2021):
//   Rows 1-5: Thông tin trường/năm/môn (giáo viên điền tay)
//   Row 7  : Tiêu đề cột — STT, Mã định danh BộGD&ĐT, Họ tên, Ngày sinh,
//            Giới tính, ĐĐGtx (5 cột), ĐĐGgk, ĐĐGck
//   Row 8  : Sub-header (1,2,3,4,5 cho 5 cột ĐĐGtx)
//   Row 9+ : 3 dòng học sinh mẫu (xoá đi rồi điền danh sách thật)
// → Khi giáo viên download → điền vào → upload lại, parseExcelStudents()
//   match đúng "STT" ở cột A và bắt đầu đọc data từ row 9.
function downloadClassImportTemplate(opts?: {
  className?: string
  schoolName?: string
  schoolYear?: string
  semester?: string
  subject?: string
  teacherName?: string
}) {
  const cls       = opts?.className   || '10A1'
  const subject   = opts?.subject     || 'VẬT LÍ'
  const school    = opts?.schoolName  || 'TRƯỜNG THPT ___________'
  const year      = opts?.schoolYear  || '2025-2026'
  const semester  = opts?.semester    || 'I'
  const teacher   = opts?.teacherName || '___________'

  // 2D array tới sheet — mỗi inner array là 1 row
  const aoa: (string | number | Date | null)[][] = [
    ['SỞ GIÁO DỤC VÀ ĐÀO TẠO ___________'],                                 // row 1
    [school],                                                               // row 2
    ['BẢNG ĐIỂM HỌC KỲ'],                                                   // row 3
    [`Năm học: ${year} - Học kỳ: ${semester}`],                             // row 4
    [`Môn học: ${subject} - GV: ${teacher}`],                               // row 5
    [],                                                                     // row 6 (blank)
    [
      'STT', 'Mã định danh Bộ GD&ĐT', 'Họ và tên', 'Ngày sinh', 'Giới tính',
      'ĐĐGtx', null, null, null, null, 'ĐĐGgk', 'ĐĐGck',                    // row 7
    ],
    [null, null, null, null, null, 1, 2, 3, 4, 5],                          // row 8 (sub-header)
    // Sample students (xoá đi điền lại):
    [1, '7727940812', 'Nguyễn Văn An',     '15/03/2010', 'Nam'],            // row 9
    [2, '7727940813', 'Trần Thị Bình',     '22/07/2010', 'Nữ'],             // row 10
    [3, '7727940814', 'Lê Hoàng Cường',    '08/11/2010', 'Nam'],            // row 11
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Column widths để dễ nhìn khi mở Excel
  ws['!cols'] = [
    { wch: 5  },  // STT
    { wch: 18 },  // Mã định danh
    { wch: 28 },  // Họ và tên
    { wch: 12 },  // Ngày sinh
    { wch: 9  },  // Giới tính
    { wch: 6  }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },  // ĐĐGtx 1-5
    { wch: 7  },  // ĐĐGgk
    { wch: 7  },  // ĐĐGck
  ]

  // Merge cells cho 4 dòng tiêu đề trên (cosmetic — span 12 cột)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } },
    { s: { r: 6, c: 5 }, e: { r: 6, c: 9 } },   // "ĐĐGtx" merge 5 cột
  ]

  // Sheet name dùng làm class name khi import → đặt theo "<Lớp> <Môn>"
  // VD "10A1 Vat li" → parser auto-suy ra "Lớp 10A1"
  const sheetName = `${cls} ${subject.replace(/Í/g,'i').replace(/Ậ/g,'a').toLowerCase().slice(0,20)}`
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Hướng dẫn ngắn ở sheet thứ 2
  const helpRows = [
    ['HƯỚNG DẪN ĐIỀN'],
    [],
    ['1. Sheet "' + sheetName + '" là sheet chính — KHÔNG đổi tên sheet.'],
    ['2. Sửa thông tin lớp/trường ở rows 1-5 cho khớp thực tế.'],
    ['3. Cột bắt buộc khi import: STT, Mã định danh, Họ và tên.'],
    ['4. Mã định danh Bộ GD&ĐT: 10 chữ số do Bộ cấp khi đăng ký HS.'],
    ['5. Ngày sinh: định dạng dd/mm/yyyy (vd 15/03/2010).'],
    ['6. Giới tính: viết "Nam" hoặc "Nữ" (có dấu).'],
    ['7. Các cột ĐĐGtx/gk/ck (điểm) KHÔNG cần điền khi import danh sách —'],
    ['   chỉ dùng khi xuất bảng điểm sau này.'],
    ['8. Xoá 3 dòng học sinh mẫu (rows 9-11) trước khi điền danh sách thật.'],
    [],
    ['Mọi thắc mắc → liên hệ admin@inphysic.com'],
  ]
  const helpWs = XLSX.utils.aoa_to_sheet(helpRows)
  helpWs['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, helpWs, 'Hướng dẫn')

  // Trigger download
  const fileName = `mau-import-lop-${cls}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ── Excel parser ─────────────────────────────────────────────
function parseExcelStudents(file: File): Promise<{ students: ImportStudent[]; className: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

        // Class name from sheet name e.g. "10A6 Vat li" → "Lớp 10A6"
        const className = 'Lớp ' + (sheetName.split(' ')[0] || sheetName)

        // Find header row (row with "STT")
        let dataStart = -1
        for (let i = 0; i < rows.length; i++) {
          if (rows[i] && String(rows[i][0]).trim() === 'STT') {
            dataStart = i + 2 // skip sub-header row
            break
          }
        }
        if (dataStart < 0) throw new Error('Không tìm thấy dòng tiêu đề STT')

        const students: ImportStudent[] = []
        for (let r = dataStart; r < rows.length; r++) {
          const row = rows[r]
          if (!row || row[0] == null) continue
          const sttRaw = String(row[0]).trim()
          if (!sttRaw || isNaN(Number(sttRaw))) continue
          const maDinhDanh = String(row[1] ?? '').trim()
          const hoTen = String(row[2] ?? '').trim()
          const ngaySinhRaw = row[3]
          let ngaySinh = ''
          if (ngaySinhRaw instanceof Date) {
            const d = ngaySinhRaw
            ngaySinh = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
          } else if (ngaySinhRaw) {
            ngaySinh = String(ngaySinhRaw).trim()
          }
          const gioiTinh = String(row[4] ?? '').trim()
          if (!hoTen || !maDinhDanh) continue
          students.push({ stt: Number(sttRaw), hoTen, ngaySinh, gioiTinh, maDinhDanh })
        }
        resolve({ students, className })
      } catch (err: any) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Không thể đọc file'))
    reader.readAsArrayBuffer(file)
  })
}

// ── Import Modal ──────────────────────────────────────────────
function ImportModal({
  open, onClose, onDone,
}: { open: boolean; onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<{ students: ImportStudent[]; className: string } | null>(null)
  const [fileName, setFileName] = useState('')
  const [classId, setClassId] = useState('')
  const [classGrade, setClassGrade] = useState('Khối 10')
  const [classYear, setClassYear] = useState('2025-2026')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const reset = () => {
    setParsed(null); setFileName(''); setClassId('')
    setClassGrade('Khối 10'); setClassYear('2025-2026')
    setImporting(false); setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    try {
      setFileName(file.name)
      const data = await parseExcelStudents(file)
      setParsed(data)
      setResult(null)
      // Guess grade from class name e.g. "Lớp 10A6" → "Khối 10"
      const m = data.className.match(/\d+/)
      if (m) setClassGrade(`Khối ${m[0]}`)
    } catch (err: any) {
      toast.error('Lỗi đọc file: ' + err.message)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    if (!parsed || !parsed.students.length) return
    setImporting(true)
    try {
      let targetClassId = classId
      // Create class if no existing class selected
      if (!targetClassId) {
        const res = await api.post('/classes', {
          name: parsed.className,
          grade: classGrade,
          schoolYear: classYear,
          description: `Import từ file ${fileName}`,
        })
        targetClassId = res.data.class?.id || res.data.id
      }

      // Call bulk import API
      const importRes = await api.post<{ message: string; results: ImportResult }>(
        `/classes/${targetClassId}/students/import`,
        { students: parsed.students }
      )
      setResult(importRes.data.results)
      toast.success(importRes.data.message || 'Import thành công!')
      onDone()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Import từ Excel</h2>
              <p className="text-xs text-gray-500">File bảng điểm TT58 (xlsx)</p>
            </div>
          </div>
          <button onClick={() => { reset(); onClose() }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          {!parsed ? (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/40 transition-all group"
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-purple-300 group-hover:text-purple-500 transition-colors" />
                <p className="font-semibold text-gray-700 mb-1">Kéo thả file Excel vào đây</p>
                <p className="text-sm text-gray-500">hoặc click để chọn file .xlsx</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {/* Tải file mẫu — giúp giáo viên chưa có file TT58 sẵn */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Chưa có file?</p>
                    <p className="text-xs text-gray-600">
                      Tải mẫu Excel chuẩn TT58 (Bộ GD&ĐT) — gồm các cột STT, Mã định
                      danh, Họ tên, Ngày sinh, Giới tính.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    try {
                      downloadClassImportTemplate({})
                      toast.success('Đã tải file mẫu — mở Excel, điền danh sách rồi upload lại')
                    } catch (err: any) {
                      toast.error('Lỗi tạo file mẫu: ' + err.message)
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Tải mẫu
                </button>
              </div>
            </>
          ) : result ? (
            /* Result */
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <h3 className="font-bold text-green-700 text-base">Import thành công!</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tài khoản mới tạo', value: result.created, color: 'text-purple-600' },
                  { label: 'Đã tồn tại', value: result.existing, color: 'text-blue-600' },
                  { label: 'Đăng ký vào lớp', value: result.enrolled, color: 'text-green-600' },
                  { label: 'Đã trong lớp', value: result.skipped, color: 'text-gray-500' },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-lg p-3 border border-green-100">
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Preview */
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{fileName}</span>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
                  {parsed.students.length} học sinh
                </span>
              </div>

              {/* Class info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Thông tin lớp</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tên lớp</label>
                    <input
                      type="text"
                      value={parsed.className}
                      onChange={e => setParsed(p => p ? { ...p, className: e.target.value } : p)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Khối</label>
                    <select
                      value={classGrade}
                      onChange={e => setClassGrade(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={`Khối ${n}`}>Khối {n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Năm học</label>
                    <input
                      type="text"
                      value={classYear}
                      onChange={e => setClassYear(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </div>
              </div>

              {/* Student preview table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Xem trước danh sách</p>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white border-b border-gray-100">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold w-8">#</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold">Họ và tên</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold">Ngày sinh</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold">Giới tính</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.students.map((s, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-400">{s.stt}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-800">{s.hoTen}</td>
                          <td className="px-3 py-1.5 text-gray-500">{s.ngaySinh}</td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              s.gioiTinh === 'Nữ' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                            }`}>{s.gioiTinh}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Sẽ tạo tài khoản học sinh mới và thêm vào lớp. Mật khẩu mặc định: <strong>phuocbuu2025</strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          {result ? (
            <>
              <button onClick={() => { reset() }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Import file khác
              </button>
              <button onClick={() => { reset(); onClose() }} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">
                Đóng
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { reset(); onClose() }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Hủy
              </button>
              {parsed && !result && (
                <button
                  onClick={handleImport}
                  disabled={importing || !parsed.students.length}
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importing ? 'Đang import...' : `Import ${parsed.students.length} học sinh`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function ClassesPage() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [addStudentsOpen, setAddStudentsOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<string | null>(null)

  const [newClass, setNewClass] = useState({
    name: '',
    grade: 'Khối 9',
    schoolYear: '2025-2026',
    description: '',
  })

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const res = await api.get<{ classes: Class[] }>('/classes')
      setClasses(res.data?.classes || [])
    } catch {
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newClass.name.trim()) {
      toast.error('Vui lòng nhập tên lớp')
      return
    }
    try {
      await api.post('/classes', newClass)
      toast.success('Đã tạo lớp học thành công')
      setCreateOpen(false)
      setNewClass({ name: '', grade: 'Khối 9', schoolYear: '2025-2026', description: '' })
      fetchClasses()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không thể tạo lớp học')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/classes/${id}`)
      toast.success('Đã xóa lớp học')
      setDeleteOpen(false)
      setClassToDelete(null)
      fetchClasses()
    } catch {
      toast.error('Không thể xóa lớp học')
    }
  }

  const filtered = classes.filter(
    c =>
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.grade.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30 px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/25">
              <School className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-purple-600 tracking-tight">
                Quản lý Lớp học
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Tạo và quản lý lớp học, thêm học sinh vào lớp
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-50 transition-colors shadow-sm"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Tạo Lớp
            </button>
          </div>
        </div>
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm lớp học..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <Loader2 className="h-10 w-10 animate-spin mr-3 text-purple-600" />
          <span className="text-gray-600 font-medium">Đang tải danh sách lớp...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-purple-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-2">Chưa có lớp học nào</p>
          <p className="text-sm text-gray-500 mb-6">Tạo lớp học đầu tiên để bắt đầu quản lý</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Tạo lớp học đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(cls => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-purple-200 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-purple-600 truncate mb-3">{cls.name}</h3>
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {cls.grade}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                      <Calendar className="h-3.5 w-3.5" />
                      {cls.schoolYear}
                    </span>
                  </div>
                  {cls.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{cls.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Users className="h-4 w-4 text-blue-600" />
                  {cls.studentCount} học sinh
                </div>
                <StatusBadge variant={cls.studentCount > 0 ? 'success' : 'empty'}>
                  {cls.studentCount > 0 ? 'Có học sinh' : 'Trống'}
                </StatusBadge>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Xem chi tiết
                </button>
                <button
                  onClick={() => {
                    setSelectedClass(cls.id)
                    setAddStudentsOpen(true)
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Thêm HS
                </button>
                <button
                  onClick={() => {
                    setClassToDelete(cls.id)
                    setDeleteOpen(true)
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => fetchClasses()}
      />

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo lớp học mới">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">
              Tên lớp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newClass.name}
              onChange={e => setNewClass({ ...newClass, name: e.target.value })}
              placeholder="Ví dụ: Lớp 9A1"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Khối</label>
              <select
                value={newClass.grade}
                onChange={e => setNewClass({ ...newClass, grade: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={`Khối ${n}`}>
                    Khối {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Năm học</label>
              <input
                type="text"
                value={newClass.schoolYear}
                onChange={e => setNewClass({ ...newClass, schoolYear: e.target.value })}
                placeholder="2025-2026"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Mô tả (tùy chọn)</label>
            <input
              type="text"
              value={newClass.description}
              onChange={e => setNewClass({ ...newClass, description: e.target.value })}
              placeholder="Mô tả về lớp học..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700"
            >
              Tạo lớp
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Students Modal */}
      {selectedClass && (
        <AddStudentsModal
          open={addStudentsOpen}
          onClose={() => {
            setAddStudentsOpen(false)
            setSelectedClass(null)
          }}
          classId={selectedClass}
          onAdded={() => {
            fetchClasses()
            setAddStudentsOpen(false)
            setSelectedClass(null)
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Xác nhận xóa">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn xóa lớp học này? Tất cả học sinh trong lớp sẽ bị xóa khỏi lớp.
            Hành động này không thể hoàn tác.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDeleteOpen(false)
                setClassToDelete(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={() => classToDelete && handleDelete(classToDelete)}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600"
            >
              Xóa
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
