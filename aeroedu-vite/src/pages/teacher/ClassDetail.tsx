import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import {
  ArrowLeft, UserPlus, Search, Trash2, BarChart3,
  TrendingUp, Award, Users, Loader2, CheckCircle,
  GraduationCap, X, AlertTriangle, Download,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

// ── Dark palette ───────────────────────────────────────────────
const D = {
  bg:      '#0d0e17',
  card:    '#10111e',
  card2:   '#161728',
  border:  '#1e2033',
  border2: '#2a2b3d',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  muted2:  '#64748b',
}

// ── Types ──────────────────────────────────────────────────────
interface ClassData {
  id: string
  name: string
  grade: string
  schoolYear: string
  description?: string
}

interface StudentRecord {
  id: string
  studentId: string
  student: {
    id: string
    name: string
    email: string
    idNumber?: string
    dateOfBirth?: string
    gender?: string
  }
  studentNumber?: number
  attendanceRate?: number
  averageScore?: number
  totalXP: number
  completedExams: number
  passedExams: number
  status: string
  enrollmentDate: string
}

interface AllStudent { id: string; name: string; email: string }

// ── Helpers ────────────────────────────────────────────────────
function fmtDate(s?: string) {
  if (!s) return '—'
  try {
    const d = new Date(s)
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  } catch { return s }
}

function avg(arr: (number | undefined | null)[]) {
  const vals = arr.filter(v => v != null) as number[]
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

// ── Stat card ──────────────────────────────────────────────────
function StatCard({ icon, label, value }: {
  icon: React.ReactNode; label: string; value: React.ReactNode
}) {
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}` }}
      className="rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: D.muted }} className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        <span style={{ color: D.muted }} className="text-sm">{label}</span>
      </div>
      <div style={{ color: D.text }} className="text-3xl font-bold">{value}</div>
    </div>
  )
}

// ── Add-students modal ─────────────────────────────────────────
function AddStudentsModal({ open, onClose, classId, onAdded }: {
  open: boolean; onClose: () => void; classId: string; onAdded: () => void
}) {
  const [all, setAll] = useState<AllStudent[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) { setSelected([]); setSearch(''); return }
    setLoading(true)
    // Bug fix: dùng /users/search có sẵn (api có Bearer auth) thay vì
    // /api/users?role=STUDENT (endpoint không tồn tại → 503).
    api.get('/users/search', { params: { q: '@', role: 'STUDENT' } })
      .then(r => setAll(r.data?.users || []))
      .catch(() => setAll([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = all.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const handleAdd = async () => {
    if (!selected.length) return
    setSaving(true)
    try {
      // Convert User picks → ClassStudent rows qua endpoint import có sẵn
      // (mỗi User → 1 row với name+email từ thông tin user).
      const picked = all.filter(u => selected.includes(u.id))
      await api.post(`/classes/${classId}/students/import`, {
        students: picked.map((u, i) => ({
          stt:       i + 1,
          hoTen:     u.name,
          maDinhDanh: '',
          ngaySinh:  '',
          gioiTinh:  '',
          // chú ý: BE import handler chấp nhận field email qua row riêng?
          // hiện tại chỉ name+mssv được lưu. Email bỏ qua, sau dùng /users để link.
        })),
      })
      toast.success(`Đã thêm ${selected.length} học sinh vào lớp`)
      onAdded()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không thể thêm học sinh')
    } finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div style={{ background: D.card, border: `1px solid ${D.border}` }}
        className="relative rounded-2xl w-full max-w-md z-10">
        <div style={{ borderBottom: `1px solid ${D.border}` }}
          className="flex items-center justify-between px-5 py-4">
          <h2 style={{ color: D.text }} className="text-lg font-bold">Thêm học sinh vào lớp</h2>
          <button onClick={onClose}
            style={{ color: D.muted2 }}
            className="p-1 rounded-lg hover:opacity-70">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: D.muted2 }} />
            <input
              type="text" placeholder="Tìm học sinh..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: D.card2, border: `1px solid ${D.border}`, color: D.text }}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none placeholder:text-[#64748b]"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7c3aed' }} />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: D.muted }}>
                Không tìm thấy học sinh
              </p>
            ) : filtered.map(s => (
              <label key={s.id}
                style={{ '--hover': D.card2 } as React.CSSProperties}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--hover)] cursor-pointer">
                <input type="checkbox" checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="w-4 h-4 rounded accent-purple-600" />
                <div>
                  <p style={{ color: D.text }} className="text-sm font-medium">{s.name}</p>
                  <p style={{ color: D.muted2 }} className="text-xs">{s.email}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              style={{ border: `1px solid ${D.border}`, color: D.muted }}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80">
              Hủy
            </button>
            <button onClick={handleAdd} disabled={!selected.length || saving}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Thêm ({selected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Remove confirm ─────────────────────────────────────────────
function RemoveConfirm({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div style={{ background: D.card, border: `1px solid ${D.border}` }}
        className="relative rounded-2xl w-full max-w-sm z-10 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 style={{ color: D.text }} className="text-lg font-bold mb-1">Xóa khỏi lớp?</h3>
        <p style={{ color: D.muted }} className="text-sm mb-5">
          Học sinh <span style={{ color: D.text }} className="font-semibold">{name}</span> sẽ bị xóa khỏi lớp học này.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading}
            style={{ border: `1px solid ${D.border}`, color: D.muted }}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 disabled:opacity-40">
            Hủy
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stats tab content ──────────────────────────────────────────
function StatsTab({ students }: { students: StudentRecord[] }) {
  if (!students.length) {
    return (
      <div style={{ color: D.muted }} className="text-center py-16 text-sm">
        Chưa có dữ liệu thống kê
      </div>
    )
  }

  const buckets = [
    { label: '≥ 9.0 (Xuất sắc)', min: 9,  max: 11, color: '#10b981' },
    { label: '7–8.9 (Giỏi)',      min: 7,  max: 9,  color: '#3b82f6' },
    { label: '5–6.9 (Khá)',       min: 5,  max: 7,  color: '#f59e0b' },
    { label: '< 5 (Yếu)',         min: 0,  max: 5,  color: '#ef4444' },
  ].map(b => ({
    ...b,
    count: students.filter(s => s.averageScore != null && s.averageScore >= b.min && s.averageScore < b.max).length,
  }))

  const withScore = students.filter(s => s.averageScore != null).length
  const passRate = students.length
    ? ((students.filter(s => (s.passedExams || 0) > 0).length / students.length) * 100).toFixed(0)
    : '0'

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div style={{ background: D.card, border: `1px solid ${D.border}` }} className="rounded-xl p-5">
        <h4 style={{ color: D.text }} className="text-sm font-bold mb-4">Phân bố điểm trung bình</h4>
        <div className="space-y-3">
          {buckets.map(b => (
            <div key={b.label}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: D.muted }}>{b.label}</span>
                <span style={{ color: D.text }} className="font-semibold">{b.count} HS</span>
              </div>
              <div style={{ background: D.border }} className="w-full h-1.5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ background: b.color, width: withScore ? `${(b.count / withScore) * 100}%` : '0%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: D.card, border: `1px solid ${D.border}` }} className="rounded-xl p-5">
        <h4 style={{ color: D.text }} className="text-sm font-bold mb-4">Tổng quan</h4>
        <div className="space-y-0">
          {[
            { label: 'Tổng học sinh',        value: `${students.length} HS` },
            { label: 'Đang học',             value: `${students.filter(s => s.status === 'active').length} HS` },
            { label: 'Điểm TB cả lớp',      value: avg(students.map(s => s.averageScore)).toFixed(2) },
            { label: 'Tỷ lệ tham gia TB',   value: `${avg(students.map(s => s.attendanceRate)).toFixed(0)}%` },
            { label: 'Tổng XP tích lũy',    value: `${students.reduce((a, s) => a + (s.totalXP || 0), 0)} XP` },
            { label: 'Tỷ lệ đậu bài kiểm',  value: `${passRate}%` },
          ].map(r => (
            <div key={r.label}
              style={{ borderBottom: `1px solid ${D.border}` }}
              className="flex justify-between items-center py-2.5 last:border-0">
              <span style={{ color: D.muted }} className="text-sm">{r.label}</span>
              <span style={{ color: D.text }} className="text-sm font-semibold">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Attendance bar ─────────────────────────────────────────────
function AttendBar({ rate }: { rate?: number | null }) {
  if (rate == null) return <span style={{ color: D.muted }}>—</span>
  const pct = Math.max(0, Math.min(100, rate))
  const col = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div style={{ background: D.border }} className="w-14 h-1.5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ background: col, width: `${pct}%` }} />
      </div>
      <span style={{ color: D.text }} className="text-sm">{pct.toFixed(0)}%</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function ClassDetailPage() {
  const { id: classId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [classData, setClassData] = useState<ClassData | null>(null)
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [classLoading, setClassLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('students')
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<StudentRecord | null>(null)
  const [removing, setRemoving] = useState(false)

  // Bug fix: dùng api (axios + Bearer interceptor) thay vì raw fetch (không có
  // auth header → 401). Đồng thời BE GET /students giờ trả nested student object.
  const fetchClass = useCallback(async () => {
    if (!classId) return
    setClassLoading(true)
    try {
      const res = await api.get(`/classes/${classId}`)
      setClassData(res.data?.class || res.data)
    } catch {
      toast.error('Không thể tải thông tin lớp học')
    } finally { setClassLoading(false) }
  }, [classId])

  const fetchStudents = useCallback(async () => {
    if (!classId) return
    setStudentsLoading(true)
    try {
      const res = await api.get(`/classes/${classId}/students`)
      setStudents(res.data?.students || [])
    } catch {
      setStudents([])
    } finally { setStudentsLoading(false) }
  }, [classId])

  useEffect(() => { fetchClass(); fetchStudents() }, [fetchClass, fetchStudents])

  const confirmRemove = async () => {
    if (!removeTarget || !classId) return
    setRemoving(true)
    try {
      await api.delete(`/classes/${classId}/students/${removeTarget.studentId}`)
      toast.success(`Đã xóa ${removeTarget.student.name} khỏi lớp`)
      setRemoveTarget(null)
      fetchStudents()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không thể xóa học sinh')
    } finally { setRemoving(false) }
  }

  const filtered = students.filter(s =>
    !search ||
    s.student.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.student.idNumber?.includes(search),  // search by idNumber được, nhưng KHÔNG hiển thị
  )

  // Export danh sách HS ra xlsx — CHỈ trong file export mới có cột "Mã định danh"
  const handleExport = useCallback(() => {
    if (!classData || students.length === 0) {
      toast.error('Không có dữ liệu để xuất')
      return
    }
    const headerRow = [
      'STT', 'Mã định danh Bộ GD&ĐT', 'Họ và tên', 'Email',
      'Ngày sinh', 'Giới tính', 'Điểm TB', 'Tỷ lệ tham gia (%)',
      'XP', 'Trạng thái',
    ]
    const dataRows = students.map((s, i) => [
      i + 1,
      s.student.idNumber || '',
      s.student.name || '',
      s.student.email || '',
      s.student.dateOfBirth ? new Date(s.student.dateOfBirth).toLocaleDateString('vi-VN') : '',
      s.student.gender || '',
      s.averageScore != null ? Number(s.averageScore.toFixed(2)) : '',
      s.attendanceRate != null ? Math.round(s.attendanceRate) : '',
      s.totalXP ?? 0,
      s.status === 'active' ? 'Đang học' : 'Nghỉ',
    ])
    const aoa = [
      [`Danh sách lớp: ${classData.name} — ${classData.grade} — ${classData.schoolYear}`],
      [`Xuất ngày: ${new Date().toLocaleString('vi-VN')}`],
      [`⚠ File này chứa MÃ ĐỊNH DANH CÁ NHÂN — vui lòng bảo mật theo Luật ATTT`],
      [],
      headerRow,
      ...dataRows,
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [
      { wch: 5 }, { wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 14 },
    ]
    // Merge tiêu đề + ngày + cảnh báo
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách HS')
    const safeName = classData.name.replace(/[^\w\d-]+/g, '_')
    const dateStr = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `DanhSach_${safeName}_${dateStr}.xlsx`)
    toast.success(`Đã xuất ${students.length} học sinh ra Excel`)
  }, [classData, students])

  const activeCount = students.filter(s => s.status === 'active').length
  const avgScore    = avg(students.map(s => s.averageScore))
  const avgAttend   = avg(students.map(s => s.attendanceRate))

  // Loading
  if (classLoading) {
    return (
      <div style={{ background: D.bg }} className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} />
      </div>
    )
  }

  if (!classData) {
    return (
      <div style={{ background: D.bg }} className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p style={{ color: D.text }} className="font-medium">Không tìm thấy lớp học</p>
        <button onClick={() => navigate('/teacher/classes')}
          className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700">
          ← Quay lại danh sách
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: D.bg }} className="min-h-screen">

      {/* ── Header ── */}
      <div style={{ borderBottom: `1px solid ${D.border}` }} className="px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/classes')}
              style={{ color: D.muted }}
              className="hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 style={{ color: D.text }} className="text-2xl font-bold">{classData.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ color: D.muted }} className="text-sm flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />{classData.grade}
                </span>
                <span style={{ color: D.border2 }}>•</span>
                <span style={{ color: D.muted }} className="text-sm">{classData.schoolYear}</span>
                {classData.description && (
                  <>
                    <span style={{ color: D.border2 }}>•</span>
                    <span style={{ color: D.muted2 }} className="text-sm">{classData.description}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={students.length === 0}
              title="Xuất Excel — file export sẽ kèm cột Mã định danh"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Thêm học sinh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users />}        label="Tổng số học sinh"   value={students.length} />
          <StatCard icon={<CheckCircle />}  label="Đang học"           value={activeCount} />
          <StatCard icon={<BarChart3 />}    label="Điểm TB lớp"        value={avgScore.toFixed(1)} />
          <StatCard icon={<TrendingUp />}   label="Tỷ lệ tham gia TB"  value={`${avgAttend.toFixed(0)}%`} />
        </div>

        {/* ── Tab bar + search ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Tabs */}
          <div style={{ background: D.card, border: `1px solid ${D.border}` }}
            className="flex gap-1 rounded-xl p-1">
            {[
              { id: 'students', label: 'Danh sách học sinh' },
              { id: 'stats',    label: 'Thống kê' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={tab === t.id
                  ? { background: D.card2, color: D.text }
                  : { color: D.muted }}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all">
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          {tab === 'students' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: D.muted2 }} />
              <input
                type="text" placeholder="Tìm kiếm học sinh..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: D.card, border: `1px solid ${D.border}`, color: D.text }}
                className="pl-9 pr-4 py-2 rounded-xl text-sm w-64 focus:outline-none placeholder:text-[#64748b]"
              />
            </div>
          )}
        </div>

        {/* ── Tab content ── */}
        {tab === 'stats' ? (
          <StatsTab students={students} />
        ) : studentsLoading ? (
          <div style={{ background: D.card, border: `1px solid ${D.border}` }}
            className="rounded-xl flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin mr-3" style={{ color: '#7c3aed' }} />
            <span style={{ color: D.muted }} className="font-medium">Đang tải...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: D.card, border: `1px solid ${D.border}` }}
            className="rounded-xl flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 mb-4" style={{ color: D.muted2 }} />
            <p style={{ color: D.text }} className="font-semibold mb-1">
              {search ? 'Không tìm thấy học sinh' : 'Chưa có học sinh nào trong lớp'}
            </p>
            <p style={{ color: D.muted2 }} className="text-sm mb-5">
              {search ? 'Thử tìm với từ khóa khác' : 'Thêm học sinh vào lớp để bắt đầu'}
            </p>
            {!search && (
              <button onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700">
                <UserPlus className="w-4 h-4" /> Thêm học sinh
              </button>
            )}
          </div>
        ) : (
          /* ── Table ── */
          <div style={{ background: D.card, border: `1px solid ${D.border}` }}
            className="rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                    {[
                      { label: 'STT',          cls: 'w-14 text-center' },
                      { label: 'Họ và tên',    cls: '' },
                      // Cột "Mã định danh" đã ẨN — chỉ xuất hiện trong file Excel khi
                      // teacher bấm nút "Xuất Excel" ở header. Tránh lộ PII trong UI.
                      { label: 'Ngày sinh',    cls: '' },
                      { label: 'Giới tính',    cls: '' },
                      { label: 'Điểm TB',      cls: '' },
                      { label: 'Tham gia',     cls: '' },
                      { label: 'XP',           cls: '' },
                      { label: 'Trạng thái',   cls: '' },
                      { label: 'Hành động',    cls: '' },
                    ].map(h => (
                      <th key={h.label}
                        style={{ color: D.muted2 }}
                        className={`px-4 py-3 text-left text-xs font-semibold whitespace-nowrap ${h.cls}`}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => (
                    <tr key={s.id}
                      style={{ borderBottom: `1px solid ${D.border}` }}
                      className="last:border-0 hover:bg-white/[0.02] transition-colors">
                      {/* STT */}
                      <td style={{ color: D.muted2 }} className="px-4 py-3 text-center text-sm">
                        {s.studentNumber ?? idx + 1}
                      </td>
                      {/* Họ và tên */}
                      <td className="px-4 py-3">
                        <div style={{ color: D.text }} className="font-semibold whitespace-nowrap">{s.student.name}</div>
                        <div style={{ color: D.muted2 }} className="text-xs">{s.student.email}</div>
                      </td>
                      {/* Mã định danh — ẨN khỏi UI (PII), chỉ trong file Excel export */}
                      {/* Ngày sinh */}
                      <td style={{ color: D.muted }} className="px-4 py-3 text-sm whitespace-nowrap">
                        {fmtDate(s.student.dateOfBirth)}
                      </td>
                      {/* Giới tính */}
                      <td style={{ color: D.muted }} className="px-4 py-3 text-sm whitespace-nowrap">
                        {s.student.gender || '—'}
                      </td>
                      {/* Điểm TB */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.averageScore != null ? (
                          <span style={{ color: D.text }} className="flex items-center gap-1.5 font-semibold">
                            <Award className="w-3.5 h-3.5 text-yellow-400" />
                            {s.averageScore.toFixed(1)}
                          </span>
                        ) : <span style={{ color: D.muted }}>—</span>}
                      </td>
                      {/* Tham gia */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <AttendBar rate={s.attendanceRate} />
                      </td>
                      {/* XP */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1" style={{ color: D.text }}>
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-semibold">{s.totalXP ?? 0}</span>
                        </span>
                      </td>
                      {/* Trạng thái */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.status === 'active' ? (
                          <span className="text-emerald-400 text-sm font-medium">Đang học</span>
                        ) : s.status === 'inactive' ? (
                          <span style={{ color: D.muted }} className="text-sm">Nghỉ học</span>
                        ) : (
                          <span className="text-yellow-400 text-sm">Chuyển lớp</span>
                        )}
                      </td>
                      {/* Hành động */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/teacher/student/${s.studentId}`)}
                            title="Xem thống kê"
                            style={{ color: D.muted2 }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRemoveTarget(s)}
                            title="Xóa khỏi lớp"
                            style={{ color: D.muted2 }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer */}
            <div style={{ borderTop: `1px solid ${D.border}`, color: D.muted2 }}
              className="px-4 py-3 text-xs">
              Hiển thị {filtered.length} / {students.length} học sinh
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AddStudentsModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classId={classId!}
        onAdded={() => { setAddOpen(false); fetchStudents() }}
      />

      {removeTarget && (
        <RemoveConfirm
          name={removeTarget.student.name}
          onConfirm={confirmRemove}
          onCancel={() => !removing && setRemoveTarget(null)}
          loading={removing}
        />
      )}
    </div>
  )
}
