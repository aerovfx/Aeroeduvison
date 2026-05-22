import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/services/api"
import {
  Plus, Clock, Eye, Trash2, Copy, Users, Search,
  BarChart3, Play, Square, KeyRound, ArrowRight,
  Loader2, FileText, Timer, Globe, Lock, LogIn,
  BookOpen, CheckCircle2, AlertTriangle, CalendarClock,
  Zap, ChevronDown, ChevronUp, CalendarPlus, Pencil, Save, X,
  Trophy, Medal, Crown,
} from "lucide-react"
import toast from "react-hot-toast"

// ── Dark palette ──────────────────────────────────────────────
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  wall:        'var(--td-wall)',
  topbar:      'var(--td-topbar)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  divider:     'var(--td-divider)',
  grid:        'var(--td-grid)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  muted2:      'var(--td-muted2)',
  purple:      'var(--td-purple)',
  purpleL:     'var(--td-purple-l)',
  purpleHover: 'var(--td-purple-hover)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  rose:        'var(--td-rose)',
  blue:        'var(--td-blue)',
  pink:        'var(--td-pink)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
  greenA:  (a: number) => `rgba(var(--td-green-rgb), ${a})`,
  redA:    (a: number) => `rgba(var(--td-red-rgb), ${a})`,
  cyanA:   (a: number) => `rgba(var(--td-cyan-rgb), ${a})`,
  blueA:   (a: number) => `rgba(var(--td-blue-rgb), ${a})`,
} as const


// ── Types ─────────────────────────────────────────────────────
interface ExamRoom {
  id: string
  name: string
  description?: string
  status: string
  startTime: string
  endTime: string
  duration: number
  accessCode?: string
  isPublic: boolean
  maxStudents?: number
  Teacher?: { id: string; name: string }
  ExamMatrix?: { id: string; name: string; grade: string; examType: string }
  _count?: { participants: number; questions: number }
}

interface Schedule {
  id: string
  examId: string
  label: string | null
  activeFrom: string
  activeTo: string
  isActive: boolean
  Exam: { id: string; title: string; totalQuestions: number; examType: string }
}

// ── Status helpers ─────────────────────────────────────────────
const statusLabel = (s: string) =>
  s === "draft" ? "Nháp"
  : s === "active" ? "Đang thi"
  : s === "completed" ? "Kết thúc"
  : s === "cancelled" ? "Huỷ"
  : s

// ── Time-phase helpers (past / ongoing / upcoming) ─────────────
type TimePhase = 'upcoming' | 'ongoing' | 'past' | 'unscheduled'

function getTimePhase(startISO?: string, endISO?: string, now: number = Date.now()): TimePhase {
  if (!startISO || !endISO) return 'unscheduled'
  const start = new Date(startISO).getTime()
  const end   = new Date(endISO).getTime()
  if (isNaN(start) || isNaN(end)) return 'unscheduled'
  if (now < start) return 'upcoming'
  if (now > end)   return 'past'
  return 'ongoing'
}

// Format khoảng cách thời gian dạng "2 giờ 30 phút" / "3 ngày" / "5 phút"
function formatRelativeDuration(ms: number): string {
  const abs = Math.abs(ms)
  const m = Math.floor(abs / 60_000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d >= 1) return `${d} ngày${h % 24 > 0 ? ` ${h % 24}h` : ''}`
  if (h >= 1) return `${h}h${m % 60 > 0 ? ` ${m % 60}p` : ''}`
  if (m >= 1) return `${m} phút`
  return 'dưới 1 phút'
}

function getTimePhaseLabel(phase: TimePhase, startISO?: string, endISO?: string, now: number = Date.now()): string {
  if (phase === 'unscheduled') return 'Chưa đặt lịch'
  if (phase === 'upcoming' && startISO) {
    return `Bắt đầu sau ${formatRelativeDuration(new Date(startISO).getTime() - now)}`
  }
  if (phase === 'ongoing' && endISO) {
    return `Đang diễn ra · còn ${formatRelativeDuration(new Date(endISO).getTime() - now)}`
  }
  if (phase === 'past' && endISO) {
    return `Kết thúc ${formatRelativeDuration(now - new Date(endISO).getTime())} trước`
  }
  return ''
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(5,150,105,0.2)',   color: '#34d399' },
    draft:     { bg: 'rgba(37,99,235,0.2)',   color: '#60a5fa' },
    completed: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
    cancelled: { bg: 'rgba(239,68,68,0.2)',   color: '#f87171' },
  }
  const c = map[status] ?? map.draft
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '1px 7px', borderRadius: 4,
      fontSize: 10, fontWeight: 700,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {statusLabel(status)}
    </span>
  )
}

// ── Input helper ───────────────────────────────────────────────
function DInput(props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  const { className = "", style, ...rest } = props
  return (
    <input
      className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${className}`}
      style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.text, ...style }}
      {...rest}
    />
  )
}

function DLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-medium" style={{ color: D.muted }}>{children}</label>
}

// ═════════════════════════════════════════════════════════════
export default function OnlineExamRoomPage() {
  const navigate = useNavigate()

  const [rooms, setRooms] = useState<ExamRoom[]>([])
  const [publicRooms, setPublicRooms] = useState<ExamRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  // Filter theo TRẠNG THÁI (status do GV set): all/draft/active/completed/cancelled
  const [statusFilter, setStatusFilter] = useState("all")
  // Filter theo THỜI GIAN (tính từ startTime/endTime so với now):
  //   'all' | 'upcoming' (sẽ thi) | 'ongoing' (đang thi) | 'past' (đã thi)
  const [phaseFilter, setPhaseFilter] = useState<'all' | TimePhase>('all')
  // Tick mỗi 30s để countdown trên UI tự cập nhật mà không cần reload
  const [nowTick, setNowTick] = useState(Date.now())

  const [joinCode, setJoinCode] = useState("")
  const [joining, setJoining] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDuration, setNewDuration] = useState(45)
  const [newStart, setNewStart] = useState("")
  const [newEnd, setNewEnd] = useState("")
  const [newIsPublic, setNewIsPublic] = useState(true)
  const [newExamId, setNewExamId] = useState("")

  // Exams list
  const [exams, setExams] = useState<{ id: string; title: string; totalQuestions: number; examType: string }[]>([])
  const [examsLoading, setExamsLoading] = useState(false)

  // Schedules
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleExamId, setScheduleExamId] = useState("")
  const [scheduleFrom, setScheduleFrom] = useState("")
  const [scheduleTo, setScheduleTo] = useState("")
  const [scheduleLabel, setScheduleLabel] = useState("")
  const [addingSchedule, setAddingSchedule] = useState(false)
  const [activatingSchedule, setActivatingSchedule] = useState<string | null>(null)
  const [showSchedules, setShowSchedules] = useState(false)

  // Edit
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDuration, setEditDuration] = useState(45)
  const [editStart, setEditStart] = useState("")
  const [editEnd, setEditEnd] = useState("")
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [editMaxStudents, setEditMaxStudents] = useState<number | "">("")
  const [editDescription, setEditDescription] = useState("")
  const [saving, setSaving] = useState(false)

  // ── API helpers ────────────────────────────────────────────
  const toLocal = (iso: string | Date) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/online-exam-room')
      // Backend trả về cả `rooms` (naming cũ) lẫn `examRooms` (naming mới) —
      // FE check cả 2 + cả wrapper {success, data: {...}} từ Rust microservice.
      const myRooms = data.examRooms || data.rooms || data.data?.examRooms || data.data?.rooms || []
      const publicArr = data.publicRooms || data.data?.publicRooms || []
      setRooms(myRooms)
      setPublicRooms(publicArr)
    } catch (e: any) {
      const status = e?.response?.status
      if (status !== 503 && status !== 502) {
        // silence unavailable service; show other errors in console
        console.error('loadRooms error', e)
      }
      setRooms([]); setPublicRooms([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadExams = useCallback(async () => {
    try {
      setExamsLoading(true)
      const { data } = await api.get('/exams', { params: { limit: 100 } })
      const list = data.success ? (data.data?.exams || []) : (data.exams || [])
      setExams(Array.isArray(list) ? list.map((e: any) => ({
        id: e.id, title: e.title || "Không tên",
        totalQuestions: e.totalQuestions || e._count?.examQuestions || 0,
        examType: e.examType || "",
      })) : [])
    } catch { setExams([]) }
    finally { setExamsLoading(false) }
  }, [])

  const loadSchedules = useCallback(async (roomId: string) => {
    try {
      setSchedulesLoading(true)
      const { data } = await api.get(`/online-exam-room/${roomId}/schedule`)
      setSchedules(data.schedules || data.data?.schedules || [])
    } catch (e: any) {
      const status = e?.response?.status
      if (status !== 503 && status !== 502) console.error('loadSchedules error', e)
      setSchedules([])
    } finally { setSchedulesLoading(false) }
  }, [])

  useEffect(() => { void loadRooms() }, [loadRooms])

  // Auto-poll mỗi 30s để GV thấy ngay khi có HS tham gia phòng thi mà
  // không phải bấm "làm mới". Pause khi tab off-focus để không tốn tài
  // nguyên server. Tách khỏi load đầu tiên (đã chạy ở effect trên).
  useEffect(() => {
    const POLL_MS = 30_000
    let timer: number | undefined
    const tick = () => {
      if (document.visibilityState === 'visible') void loadRooms()
      timer = window.setTimeout(tick, POLL_MS)
    }
    timer = window.setTimeout(tick, POLL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void loadRooms()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadRooms])

  useEffect(() => { if (showCreate) void loadExams() }, [showCreate, loadExams])
  useEffect(() => {
    if (selectedId) {
      void loadSchedules(selectedId)
      if (exams.length === 0) void loadExams()
    } else {
      setSchedules([])
      setShowSchedules(false)
    }
    setEditing(false)
  }, [selectedId, loadSchedules, loadExams, exams.length])

  // ── Actions ────────────────────────────────────────────────
  const startEditing = (room: ExamRoom) => {
    setEditName(room.name)
    setEditDuration(room.duration)
    setEditStart(toLocal(room.startTime))
    setEditEnd(toLocal(room.endTime))
    setEditIsPublic(room.isPublic)
    setEditMaxStudents(room.maxStudents ?? "")
    setEditDescription(room.description ?? "")
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedId || !editName.trim()) { toast.error("Tên phòng thi không được để trống"); return }
    setSaving(true)
    try {
      await api.put(`/online-exam-room/${selectedId}`, {
        name: editName.trim(), duration: editDuration,
        startTime: editStart ? new Date(editStart).toISOString() : undefined,
        endTime: editEnd ? new Date(editEnd).toISOString() : undefined,
        isPublic: editIsPublic,
        maxStudents: editMaxStudents === "" ? null : Number(editMaxStudents),
        description: editDescription.trim() || null,
      })
      toast.success("Đã cập nhật phòng thi")
      setEditing(false)
      await loadRooms()
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "Không thể cập nhật")
    } finally { setSaving(false) }
  }

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return
    setJoining("code")
    try {
      const { data } = await api.post('/online-exam-room/join', { accessCode: joinCode.trim() })
      const res = data.data ?? data
      toast.success(res.alreadyJoined ? "Đã tham gia trước đó" : "Tham gia thành công!")
      navigate(`/teacher/online-exam-room/${res.roomId}/take`)
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "Không thể tham gia")
    } finally { setJoining(null) }
  }

  const handleJoinPublic = async (roomId: string) => {
    setJoining(roomId)
    try {
      const { data } = await api.post('/online-exam-room/join', { roomId })
      const res = data.data ?? data
      toast.success("Đã vào phòng thi!")
      navigate(`/teacher/online-exam-room/${res.roomId}/take`)
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "Không thể tham gia")
    } finally { setJoining(null) }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newStart || !newEnd) { toast.error("Vui lòng nhập tên, thời gian bắt đầu và kết thúc"); return }
    if (!newExamId) { toast.error("Vui lòng chọn đề thi để gắn vào phòng"); return }
    setCreating(true)
    try {
      const { data } = await api.post('/online-exam-room', {
        name: newName.trim(),
        startTime: new Date(newStart).toISOString(),
        endTime: new Date(newEnd).toISOString(),
        duration: newDuration,
        isPublic: newIsPublic,
        examId: newExamId,
      })
      const room = data.examRoom ?? data.data ?? data
      const msg = newIsPublic
        ? "Phòng thi công khai đã tạo — Ai cũng có thể vào!"
        : `Phòng thi bí mật đã tạo — Mã: ${room?.accessCode ?? ''}`
      toast.success(msg)
      setShowCreate(false); setNewName(""); setNewExamId(""); setNewStart(""); setNewEnd("")
      await loadRooms()
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "Không thể tạo phòng thi")
    } finally { setCreating(false) }
  }

  const handleStart = async (room: ExamRoom) => {
    try {
      await api.put(`/online-exam-room/${room.id}`, { status: "active" })
      toast.success("Đã mở phòng thi!")
      await loadRooms()
    } catch (e: any) { toast.error(e.response?.data?.error || "Lỗi") }
  }

  const handleStop = async (room: ExamRoom) => {
    try {
      await api.put(`/online-exam-room/${room.id}`, { status: "completed" })
      toast.success("Đã kết thúc phòng thi")
      await loadRooms()
    } catch (e: any) { toast.error(e.response?.data?.error || "Lỗi") }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá phòng thi này?")) return
    try {
      await api.delete(`/online-exam-room/${id}`)
      toast.success("Đã xoá")
      if (selectedId === id) setSelectedId(null)
      await loadRooms()
    } catch (e: any) { toast.error(e.response?.data?.error || "Lỗi") }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Đã sao chép mã: ${code}`)
  }

  const handleAddSchedule = async () => {
    if (!selectedId || !scheduleExamId || !scheduleFrom || !scheduleTo) {
      toast.error("Vui lòng chọn đề thi, thời gian bắt đầu và kết thúc"); return
    }
    setAddingSchedule(true)
    try {
      await api.post(`/online-exam-room/${selectedId}/schedule`, {
        examId: scheduleExamId,
        activeFrom: new Date(scheduleFrom).toISOString(),
        activeTo: new Date(scheduleTo).toISOString(),
        label: scheduleLabel.trim() || undefined,
      })
      toast.success("Đã thêm lịch đề thi")
      setShowScheduleForm(false)
      setScheduleExamId(""); setScheduleFrom(""); setScheduleTo(""); setScheduleLabel("")
      await loadSchedules(selectedId)
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "Không thể thêm lịch")
    } finally { setAddingSchedule(false) }
  }

  const handleActivateSchedule = async (scheduleId: string) => {
    if (!selectedId) return
    if (!confirm("Kích hoạt lịch này sẽ thay toàn bộ câu hỏi hiện tại bằng đề thi mới. Tiếp tục?")) return
    setActivatingSchedule(scheduleId)
    try {
      const { data } = await api.post(`/online-exam-room/${selectedId}/schedule/activate`, { scheduleId })
      toast.success(`Đã kích hoạt: ${data.examTitle} (${data.questionsImported} câu)`)
      await loadSchedules(selectedId)
      await loadRooms()
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "Không thể kích hoạt")
    } finally { setActivatingSchedule(null) }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!selectedId) return
    if (!confirm("Xoá lịch này?")) return
    try {
      await api.delete(`/online-exam-room/${selectedId}/schedule`, { params: { scheduleId } })
      toast.success("Đã xoá lịch")
      await loadSchedules(selectedId)
    } catch (e: any) { toast.error(e.response?.data?.error || "Không thể xoá") }
  }

  // Tick countdown mỗi 30s cho text "còn 5 phút" / "bắt đầu sau 2h" tự cập nhật
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  // ── Computed ───────────────────────────────────────────────
  // Đếm số phòng theo từng pha (cho badge số trên tab)
  const phaseCounts = (() => {
    const c = { all: rooms.length, upcoming: 0, ongoing: 0, past: 0, unscheduled: 0 }
    for (const r of rooms) {
      const p = getTimePhase(r.startTime, r.endTime, nowTick)
      c[p]++
    }
    return c
  })()

  // Filter + sort: ongoing trước (cần monitor gấp), rồi upcoming asc theo startTime,
  // rồi past desc theo endTime (gần nhất lên đầu).
  const filtered = rooms
    .filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (phaseFilter !== "all" && getTimePhase(r.startTime, r.endTime, nowTick) !== phaseFilter) return false
      if (searchQuery.trim() && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const pa = getTimePhase(a.startTime, a.endTime, nowTick)
      const pb = getTimePhase(b.startTime, b.endTime, nowTick)
      const order: Record<TimePhase, number> = { ongoing: 0, upcoming: 1, unscheduled: 2, past: 3 }
      if (order[pa] !== order[pb]) return order[pa] - order[pb]
      // Cùng pha: ongoing/upcoming → sort start asc, past → sort end desc
      const aStart = new Date(a.startTime || 0).getTime()
      const bStart = new Date(b.startTime || 0).getTime()
      const aEnd   = new Date(a.endTime || 0).getTime()
      const bEnd   = new Date(b.endTime || 0).getTime()
      if (pa === 'past') return bEnd - aEnd
      return aStart - bStart
    })

  const selected = rooms.find(r => r.id === selectedId)

  const openCreate = () => {
    setShowCreate(true)
    if (!newStart) {
      const now = new Date()
      now.setMinutes(now.getMinutes() + (5 - (now.getMinutes() % 5)), 0, 0)
      setNewStart(toLocal(now))
      setNewEnd(toLocal(new Date(now.getTime() + (newDuration || 45) * 60000)))
    }
  }

  // ── Shared styles ──────────────────────────────────────────
  const cardStyle = { background: D.card, border: `1px solid ${D.border}`, borderRadius: 12 }

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}` }} className="sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: D.text }}>
                Phòng Thi Online
                <span
                  title="Danh sách phòng + số HS tự cập nhật mỗi 30 giây"
                  className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.35)',
                  }}
                >
                  <style>{`@keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#34d399', animation: 'pulseDot 1.5s ease-in-out infinite',
                  }} />
                  Live
                </span>
              </h1>
              <p className="text-xs" style={{ color: D.muted }}>Tổ chức thi trực tuyến · Công khai hoặc bí mật · Cập nhật tự động</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: D.purple, color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
            onMouseLeave={e => (e.currentTarget.style.background = D.purple)}
          >
            <Plus className="w-4 h-4" /> Tạo phòng thi
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* ── Bảng vàng thành tích — top HS theo điểm + thời gian ── */}
        <LeaderboardSection exams={exams} />

        {/* ── Public rooms ────────────────────────────────── */}
        {publicRooms.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" style={{ color: '#34d399' }} />
              <h2 className="font-bold text-sm" style={{ color: D.text }}>Phòng thi công khai — Vào ngay</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {publicRooms.map(room => (
                <div key={room.id} className="rounded-xl p-4 space-y-3"
                  style={{ border: '1px solid rgba(5,150,105,0.4)', background: 'rgba(5,150,105,0.07)' }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: '#34d399' }} />
                      <h3 className="font-semibold text-sm truncate" style={{ color: D.text }}>{room.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: D.muted }}>
                      <span>{room.Teacher?.name || "Giáo viên"}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {room.duration}p</span>
                      <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {room._count?.participants || 0}</span>
                      <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" /> {room._count?.questions || 0} câu</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={room.status} />
                      <span className="text-[10px]" style={{ color: D.muted }}>
                        {new Date(room.startTime).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinPublic(room.id)}
                    disabled={joining === room.id}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    style={{ background: '#059669', color: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#047857')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#059669')}
                  >
                    {joining === room.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Vào thi ngay
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Join by code ─────────────────────────────────── */}
        <div className="rounded-2xl p-5"
          style={{ border: '2px dashed rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.06)' }}>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.25)' }}>
                <Lock className="w-5 h-5" style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h2 className="font-bold" style={{ color: D.text }}>Phòng thi bí mật</h2>
                <p className="text-xs" style={{ color: D.muted }}>Nhập mã 6 chữ số để tham gia</p>
              </div>
            </div>
            <div className="flex-1 flex gap-2 w-full md:max-w-md">
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Nhập mã..."
                maxLength={6}
                onKeyDown={e => e.key === "Enter" && handleJoinByCode()}
                className="flex-1 px-4 py-3 rounded-xl text-center text-2xl font-mono font-black tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: D.card2,
                  border: `2px solid ${D.border2}`,
                  color: D.text,
                }}
              />
              <button
                onClick={handleJoinByCode}
                disabled={joinCode.length < 6 || joining === "code"}
                className="px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40 shrink-0"
                style={{ background: D.purple, color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
                onMouseLeave={e => (e.currentTarget.style.background = D.purple)}
              >
                {joining === "code" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Vào thi
              </button>
            </div>
          </div>
        </div>

        {/* ── Create form ──────────────────────────────────── */}
        {showCreate && (
          <div className="rounded-xl p-6 space-y-5 shadow-lg" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg" style={{ color: D.text }}>Tạo phòng thi mới</h3>
              <button onClick={() => { setShowCreate(false); setNewExamId(""); setNewStart(""); setNewEnd("") }}
                className="p-1.5 rounded-lg transition-colors" style={{ color: D.muted }}
                onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Exam selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase flex items-center gap-1.5" style={{ color: D.muted }}>
                <BookOpen className="w-3.5 h-3.5" /> Chọn đề thi *
              </label>
              {examsLoading ? (
                <div className="flex items-center gap-2 text-sm py-3" style={{ color: D.muted }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách đề thi...
                </div>
              ) : exams.length === 0 ? (
                <div className="rounded-lg p-4 text-center"
                  style={{ border: '2px dashed rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.07)' }}>
                  <AlertTriangle className="w-6 h-6 mx-auto mb-1" style={{ color: '#f59e0b' }} />
                  <p className="text-sm font-medium" style={{ color: D.text }}>Chưa có đề thi nào</p>
                  <p className="text-xs mt-1" style={{ color: D.muted }}>Bạn cần tạo đề thi trước (trang Đề thi), rồi quay lại đây để mở phòng.</p>
                  <button onClick={() => navigate("/teacher/exams")}
                    className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ background: '#f59e0b' }}>
                    Đi tạo đề thi
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto pr-1">
                  {exams.map(ex => {
                    const sel = newExamId === ex.id
                    return (
                      <button key={ex.id}
                        onClick={() => {
                          setNewExamId(sel ? "" : ex.id)
                          if (!newName.trim() && !sel) setNewName(ex.title)
                        }}
                        className="text-left rounded-lg p-3 transition-all"
                        style={{
                          border: sel ? '2px solid #7c3aed' : `2px solid ${D.border}`,
                          background: sel ? 'rgba(124,58,237,0.12)' : D.card2,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          {sel && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#a78bfa' }} />}
                          <span className="text-sm font-semibold truncate" style={{ color: D.text }}>{ex.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]" style={{ color: D.muted }}>
                          <span>{ex.totalQuestions} câu hỏi</span>
                          {ex.examType && <span>· {ex.examType}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {newExamId && (
                <p className="text-xs flex items-center gap-1" style={{ color: '#34d399' }}>
                  <CheckCircle2 className="w-3 h-3" /> Đã chọn đề thi — câu hỏi sẽ được import tự động
                </p>
              )}
            </div>

            {/* Room details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <DLabel>Tên phòng thi *</DLabel>
                <DInput value={newName} onChange={e => setNewName(e.target.value)} placeholder="VD: Kiểm tra giữa kỳ 2 — Vật lý 10" />
              </div>
              <div className="space-y-1">
                <DLabel>Bắt đầu *</DLabel>
                <DInput type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <DLabel>Kết thúc *</DLabel>
                <DInput type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <DLabel>Thời gian làm bài (phút)</DLabel>
                <DInput type="number" value={newDuration} min={5} step={5} onChange={e => setNewDuration(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <DLabel>Chế độ truy cập</DLabel>
                <div className="flex gap-2">
                  {[
                    { val: true,  icon: Globe, label: "Công khai", active: 'rgba(5,150,105,0.2)', activeBorder: '#059669', activeColor: '#34d399' },
                    { val: false, icon: Lock,  label: "Bí mật",    active: 'rgba(124,58,237,0.2)', activeBorder: D.purple, activeColor: '#a78bfa' },
                  ].map(opt => {
                    const isSel = newIsPublic === opt.val
                    return (
                      <button key={String(opt.val)} onClick={() => setNewIsPublic(opt.val)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                          border: `2px solid ${isSel ? opt.activeBorder : D.border}`,
                          background: isSel ? opt.active : 'transparent',
                          color: isSel ? opt.activeColor : D.muted,
                        }}
                      >
                        <opt.icon className="w-4 h-4" /> {opt.label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px]" style={{ color: D.muted }}>
                  {newIsPublic ? "Mọi người đều thấy và có thể vào thi trực tiếp" : "Chỉ những ai có mã 6 số mới vào được"}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowCreate(false); setNewExamId(""); setNewStart(""); setNewEnd("") }}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{ border: `1px solid ${D.border}`, color: D.muted, background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >Huỷ</button>
              <button onClick={handleCreate} disabled={creating || !newExamId}
                className="px-4 py-2 text-sm rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                style={{ background: D.purple, color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
                onMouseLeave={e => (e.currentTarget.style.background = D.purple)}
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Tạo phòng thi
              </button>
            </div>
          </div>
        )}

        {/* ── My rooms + Sidebar ───────────────────────────── */}
        <div className="grid grid-cols-12 gap-6">

          {/* Left col */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* ── Time-phase tabs (Sắp diễn ra / Đang diễn ra / Đã thi) ── */}
            <div className="flex items-center gap-1 flex-wrap rounded-xl p-1"
              style={{ background: D.card2, border: `1px solid ${D.border}` }}>
              {([
                { v: 'all',      l: 'Tất cả',        c: phaseCounts.all,      icon: CalendarClock, color: D.text },
                { v: 'ongoing',  l: 'Đang diễn ra',  c: phaseCounts.ongoing,  icon: Zap,           color: '#34d399' },
                { v: 'upcoming', l: 'Sắp diễn ra',   c: phaseCounts.upcoming, icon: CalendarPlus,  color: '#60a5fa' },
                { v: 'past',     l: 'Đã kết thúc',   c: phaseCounts.past,     icon: CheckCircle2,  color: '#94a3b8' },
              ] as const).map(t => {
                const sel = phaseFilter === t.v
                const Icon = t.icon
                const isPulse = t.v === 'ongoing' && phaseCounts.ongoing > 0
                return (
                  <button key={t.v} onClick={() => setPhaseFilter(t.v)}
                    className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: sel ? (t.v === 'ongoing' ? 'rgba(5,150,105,0.18)' : t.v === 'upcoming' ? 'rgba(37,99,235,0.18)' : t.v === 'past' ? 'rgba(148,163,184,0.18)' : 'rgba(124,58,237,0.18)') : 'transparent',
                      color: sel ? t.color : D.muted,
                      border: `1px solid ${sel ? t.color : 'transparent'}`,
                    }}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isPulse ? 'animate-pulse' : ''}`} />
                    <span>{t.l}</span>
                    {t.c > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{
                          background: sel ? t.color + '33' : D.card,
                          color: sel ? t.color : D.muted2,
                        }}>{t.c}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: D.muted }} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm phòng thi..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ background: D.card2, border: `1px solid ${D.border}`, color: D.text }}
                />
              </div>
              <div className="flex gap-1">
                {[
                  { v: "all", l: "Tất cả" }, { v: "draft", l: "Nháp" },
                  { v: "active", l: "Đang thi" }, { v: "completed", l: "Xong" },
                ].map(f => (
                  <button key={f.v} onClick={() => setStatusFilter(f.v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: statusFilter === f.v ? D.text : 'transparent',
                      color: statusFilter === f.v ? D.bg : D.muted,
                    }}
                  >{f.l}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2" style={{ color: D.muted }}>
                <Loader2 className="w-5 h-5 animate-spin" /> Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(148,163,184,0.3)' }} />
                <p className="font-medium" style={{ color: D.muted }}>
                  {phaseFilter === 'ongoing'  ? 'Không có phòng nào đang diễn ra' :
                   phaseFilter === 'upcoming' ? 'Không có phòng nào sắp diễn ra' :
                   phaseFilter === 'past'     ? 'Chưa có phòng nào đã kết thúc' :
                   'Chưa có phòng thi nào'}
                </p>
                {phaseFilter !== 'all' && (
                  <button onClick={() => setPhaseFilter('all')}
                    className="mt-3 text-xs underline" style={{ color: '#a78bfa' }}>
                    Xem tất cả phòng
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* GROUPED BY PHASE — luôn hiển thị 3 sections (nếu phaseFilter=all)
                    để user thấy đồng thời các phòng đã/đang/sẽ thi. Khi user chọn
                    tab cụ thể → chỉ hiện section đó. */}
                {(['ongoing', 'upcoming', 'past', 'unscheduled'] as TimePhase[]).map(sectionPhase => {
                  // Khi user filter 1 phase cụ thể → chỉ render section đó
                  if (phaseFilter !== 'all' && phaseFilter !== sectionPhase) return null
                  const sectionRooms = filtered.filter(r =>
                    getTimePhase(r.startTime, r.endTime, nowTick) === sectionPhase
                  )
                  if (sectionRooms.length === 0) return null

                  const sectionMeta = sectionPhase === 'ongoing'
                    ? { label: '🟢 Đang diễn ra', color: '#34d399', desc: 'Cần monitor gấp' }
                    : sectionPhase === 'upcoming'
                    ? { label: '🔵 Sắp diễn ra', color: '#60a5fa', desc: 'Sẵn sàng cho thi sắp tới' }
                    : sectionPhase === 'past'
                    ? { label: '⚪ Đã kết thúc', color: '#94a3b8', desc: 'Xem kết quả + bảng điểm' }
                    : { label: '🕒 Chưa đặt lịch', color: '#fbbf24', desc: 'Phòng nháp chưa có thời gian' }

                  return (
                    <div key={sectionPhase} className="space-y-2">
                      <div className="flex items-center justify-between px-1 py-1 sticky top-0 z-10"
                           style={{ background: D.bg }}>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold" style={{ color: sectionMeta.color }}>
                            {sectionMeta.label}
                          </h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: sectionMeta.color + '22', color: sectionMeta.color }}>
                            {sectionRooms.length}
                          </span>
                          <span className="text-[10px]" style={{ color: D.muted2 }}>
                            · {sectionMeta.desc}
                          </span>
                        </div>
                      </div>
                      {sectionRooms.map(room => {
                  const phase = getTimePhase(room.startTime, room.endTime, nowTick)
                  const phaseLabel = getTimePhaseLabel(phase, room.startTime, room.endTime, nowTick)
                  const phaseStyle =
                    phase === 'ongoing'  ? { bg: 'rgba(5,150,105,0.18)',   color: '#34d399', icon: Zap } :
                    phase === 'upcoming' ? { bg: 'rgba(37,99,235,0.18)',   color: '#60a5fa', icon: CalendarClock } :
                    phase === 'past'     ? { bg: 'rgba(148,163,184,0.18)', color: '#94a3b8', icon: CheckCircle2 } :
                                           { bg: 'rgba(245,158,11,0.18)',  color: '#fbbf24', icon: AlertTriangle }
                  const PhaseIcon = phaseStyle.icon
                  return (
                  <div key={room.id} onClick={() => setSelectedId(room.id)}
                    className="rounded-xl p-4 cursor-pointer transition-all"
                    style={{
                      border: `1px solid ${selectedId === room.id ? 'rgba(124,58,237,0.6)' : (phase === 'ongoing' ? 'rgba(5,150,105,0.35)' : D.border)}`,
                      background: selectedId === room.id ? 'rgba(124,58,237,0.08)' : D.card,
                    }}
                    onMouseEnter={e => { if (selectedId !== room.id) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)' }}
                    onMouseLeave={e => { if (selectedId !== room.id) e.currentTarget.style.borderColor = phase === 'ongoing' ? 'rgba(5,150,105,0.35)' : D.border }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {room.isPublic
                            ? <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: '#34d399' }} />
                            : <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: '#a78bfa' }} />
                          }
                          <h3 className="font-semibold truncate" style={{ color: D.text }}>{room.name}</h3>
                          <StatusBadge status={room.status} />
                          {/* Time-phase badge với countdown */}
                          {phase !== 'unscheduled' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ background: phaseStyle.bg, color: phaseStyle.color, whiteSpace: 'nowrap' }}>
                              <PhaseIcon className={`w-2.5 h-2.5 ${phase === 'ongoing' ? 'animate-pulse' : ''}`} />
                              {phaseLabel}
                            </span>
                          )}
                        </div>
                        {/* Lịch thi (ngày giờ) — hiển thị compact */}
                        {room.startTime && room.endTime && (
                          <div className="flex items-center gap-1.5 text-[11px] mb-1" style={{ color: D.muted2 }}>
                            <CalendarClock className="w-3 h-3" />
                            <span>
                              {new Date(room.startTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              {' → '}
                              {new Date(room.endTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs" style={{ color: D.muted }}>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {room.duration}p</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room._count?.participants || 0}</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {room._count?.questions || 0} câu</span>
                          {room.isPublic ? (
                            <span className="font-medium" style={{ color: '#34d399' }}>Công khai</span>
                          ) : room.accessCode ? (
                            <button onClick={e => { e.stopPropagation(); copyCode(room.accessCode!) }}
                              className="flex items-center gap-1 font-mono font-bold hover:underline"
                              style={{ color: '#a78bfa' }}>
                              <KeyRound className="w-3 h-3" /> {room.accessCode} <Copy className="w-3 h-3" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {room.status === "draft" && (
                          <button onClick={() => handleStart(room)} title="Mở phòng"
                            className="p-2 rounded-lg transition-colors" style={{ color: '#34d399' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(5,150,105,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><Play className="w-4 h-4" /></button>
                        )}
                        {room.status === "active" && (
                          <button onClick={() => handleStop(room)} title="Kết thúc"
                            className="p-2 rounded-lg transition-colors" style={{ color: '#f87171' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><Square className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => { setSelectedId(room.id); startEditing(room) }} title="Sửa"
                          className="p-2 rounded-lg transition-colors" style={{ color: '#60a5fa' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        ><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => navigate(`/teacher/online-exam-room/${room.id}/take`)} title="Vào phòng"
                          className="p-2 rounded-lg transition-colors" style={{ color: '#a78bfa' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        ><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(room.id)} title="Xoá"
                          className="p-2 rounded-lg transition-colors" style={{ color: '#f87171' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        ><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                  )
                })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right col */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* Stats */}
            <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4" style={{ color: '#a78bfa' }} />
                <span className="font-bold text-sm" style={{ color: D.text }}>Thống kê</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: "Tổng phòng",   v: rooms.length,           bg: 'rgba(124,58,237,0.2)',  c: '#a78bfa', click: () => setPhaseFilter('all') },
                  { l: "Đang diễn ra", v: phaseCounts.ongoing,    bg: 'rgba(5,150,105,0.2)',   c: '#34d399', click: () => setPhaseFilter('ongoing') },
                  { l: "Sắp diễn ra",  v: phaseCounts.upcoming,   bg: 'rgba(37,99,235,0.2)',   c: '#60a5fa', click: () => setPhaseFilter('upcoming') },
                  { l: "Đã kết thúc",  v: phaseCounts.past,       bg: 'rgba(148,163,184,0.2)', c: '#94a3b8', click: () => setPhaseFilter('past') },
                ].map(s => (
                  <button key={s.l} onClick={s.click}
                    className="rounded-lg p-3 text-left hover:brightness-110 transition-all"
                    style={{ background: s.bg, border: '1px solid transparent' }}>
                    <p className="text-2xl font-black" style={{ color: s.c }}>{s.v}</p>
                    <p className="text-[10px] font-medium" style={{ color: s.c, opacity: 0.75 }}>{s.l}</p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: D.border }}>
                {[
                  { l: "Công khai",  v: rooms.filter(r => r.isPublic).length,  bg: 'rgba(20,184,166,0.15)', c: '#2dd4bf' },
                  { l: "Bí mật",    v: rooms.filter(r => !r.isPublic).length, bg: 'rgba(139,92,246,0.15)', c: '#c4b5fd' },
                ].map(s => (
                  <div key={s.l} className="rounded-lg p-2.5" style={{ background: s.bg }}>
                    <p className="text-lg font-bold" style={{ color: s.c }}>{s.v}</p>
                    <p className="text-[10px] font-medium" style={{ color: s.c, opacity: 0.75 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            {selected ? (
              <div className="rounded-xl p-5 space-y-3"
                style={{ ...cardStyle, border: '1px solid rgba(124,58,237,0.4)' }}>
                {editing ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm flex items-center gap-1.5" style={{ color: D.text }}>
                        <Pencil className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} /> Chỉnh sửa phòng thi
                      </span>
                      <button onClick={() => setEditing(false)} className="p-1 rounded" style={{ color: D.muted }}
                        onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      ><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-1"><DLabel>Tên phòng thi *</DLabel>
                      <DInput value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1"><DLabel>Mô tả</DLabel>
                      <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2}
                        placeholder="Mô tả ngắn (tuỳ chọn)"
                        className="w-full px-3 py-2 rounded-lg text-xs resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.text }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><DLabel>Bắt đầu</DLabel>
                        <DInput type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)} className="text-[11px]" />
                      </div>
                      <div className="space-y-1"><DLabel>Kết thúc</DLabel>
                        <DInput type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="text-[11px]" />
                      </div>
                      <div className="space-y-1"><DLabel>Thời gian (phút)</DLabel>
                        <DInput type="number" value={editDuration} min={5} step={5} onChange={e => setEditDuration(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1"><DLabel>Số thí sinh tối đa</DLabel>
                        <DInput type="number" value={editMaxStudents}
                          onChange={e => setEditMaxStudents(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Không giới hạn" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <DLabel>Chế độ truy cập</DLabel>
                      <div className="flex gap-2">
                        {[
                          { val: true,  icon: Globe, label: "Công khai", active: 'rgba(5,150,105,0.2)',   ab: '#059669', ac: '#34d399' },
                          { val: false, icon: Lock,  label: "Bí mật",    active: 'rgba(124,58,237,0.2)', ab: D.purple,  ac: '#a78bfa' },
                        ].map(opt => {
                          const isSel = editIsPublic === opt.val
                          return (
                            <button key={String(opt.val)} onClick={() => setEditIsPublic(opt.val)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all"
                              style={{
                                border: `2px solid ${isSel ? opt.ab : D.border}`,
                                background: isSel ? opt.active : 'transparent',
                                color: isSel ? opt.ac : D.muted,
                              }}
                            >
                              <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditing(false)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg transition-colors"
                        style={{ border: `1px solid ${D.border}`, color: D.muted, background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >Huỷ</button>
                      <button onClick={handleSaveEdit} disabled={saving}
                        className="flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        style={{ background: '#2563eb', color: '#fff' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {selected.isPublic
                          ? <Globe className="w-4 h-4 shrink-0" style={{ color: '#34d399' }} />
                          : <Lock className="w-4 h-4 shrink-0" style={{ color: '#a78bfa' }} />
                        }
                        <h3 className="font-bold truncate" style={{ color: D.text }}>{selected.name}</h3>
                      </div>
                      <button onClick={() => startEditing(selected)} title="Sửa thông tin"
                        className="p-1.5 rounded-lg transition-colors shrink-0" style={{ color: '#60a5fa' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      ><Pencil className="w-3.5 h-3.5" /></button>
                    </div>
                    {selected.description && (
                      <p className="text-xs" style={{ color: D.muted }}>{selected.description}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      {[
                        { l: "Trạng thái", v: <StatusBadge status={selected.status} /> },
                        { l: "Chế độ", v: <span className="text-xs font-medium" style={{ color: selected.isPublic ? '#34d399' : '#a78bfa' }}>
                            {selected.isPublic ? "Công khai" : "Bí mật (mã số)"}
                          </span>
                        },
                        { l: "Thời gian", v: <span className="font-medium" style={{ color: D.text }}>{selected.duration} phút</span> },
                        { l: "Thí sinh", v: <span className="font-medium" style={{ color: D.text }}>
                            {selected._count?.participants || 0}{selected.maxStudents ? ` / ${selected.maxStudents}` : ""}
                          </span>
                        },
                        { l: "Câu hỏi", v: <span className="font-medium" style={{ color: D.text }}>{selected._count?.questions || 0}</span> },
                      ].map(row => (
                        <div key={row.l} className="flex justify-between items-center">
                          <span style={{ color: D.muted }}>{row.l}</span>
                          {row.v}
                        </div>
                      ))}
                      {!selected.isPublic && selected.accessCode && (
                        <div className="flex justify-between items-center">
                          <span style={{ color: D.muted }}>Mã phòng</span>
                          <button onClick={() => copyCode(selected.accessCode!)}
                            className="font-mono font-black text-lg tracking-widest flex items-center gap-1 hover:underline"
                            style={{ color: '#a78bfa' }}>
                            {selected.accessCode} <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span style={{ color: D.muted }}>Bắt đầu</span>
                        <span className="text-xs" style={{ color: D.text }}>
                          {new Date(selected.startTime).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: D.muted }}>Kết thúc</span>
                        <span className="text-xs" style={{ color: D.text }}>
                          {new Date(selected.endTime).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/teacher/online-exam-room/${selected.id}/take`)}
                      className="w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      style={{ background: D.purple, color: '#fff' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
                      onMouseLeave={e => (e.currentTarget.style.background = D.purple)}
                    >
                      <Eye className="w-4 h-4" /> Vào phòng thi
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-xl p-6 text-center" style={cardStyle}>
                <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(148,163,184,0.3)' }} />
                <p className="text-sm" style={{ color: D.muted }}>Chọn phòng thi để xem chi tiết</p>
              </div>
            )}

            {/* Schedule panel */}
            {selected && (
              <div className="rounded-xl p-5 space-y-3"
                style={{ ...cardStyle, border: '1px solid rgba(245,158,11,0.35)' }}>
                <button onClick={() => setShowSchedules(!showSchedules)}
                  className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" style={{ color: '#f59e0b' }} />
                    <span className="font-bold text-sm" style={{ color: D.text }}>Lịch đề thi</span>
                    {schedules.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                        {schedules.length}
                      </span>
                    )}
                  </div>
                  {showSchedules
                    ? <ChevronUp className="w-4 h-4" style={{ color: D.muted }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: D.muted }} />
                  }
                </button>

                {showSchedules && (
                  <div className="space-y-3 pt-1">
                    <p className="text-[10px] leading-relaxed" style={{ color: D.muted }}>
                      Lên lịch thay đổi đề thi theo thời gian. Khi kích hoạt, toàn bộ câu hỏi hiện tại sẽ được thay bằng đề mới.
                    </p>

                    {schedulesLoading ? (
                      <div className="flex items-center justify-center gap-2 text-xs py-3" style={{ color: D.muted }}>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải...
                      </div>
                    ) : schedules.length === 0 && !showScheduleForm ? (
                      <div className="text-center py-3">
                        <CalendarClock className="w-6 h-6 mx-auto mb-1" style={{ color: 'rgba(148,163,184,0.3)' }} />
                        <p className="text-xs" style={{ color: D.muted }}>Chưa có lịch nào</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {schedules.map(sch => {
                          const now = new Date()
                          const from = new Date(sch.activeFrom)
                          const to = new Date(sch.activeTo)
                          const isCurrent = now >= from && now <= to
                          const isPast = now > to
                          const isFuture = now < from
                          return (
                            <div key={sch.id} className="rounded-lg border p-3 space-y-1.5 transition-all"
                              style={{
                                border: sch.isActive ? '1px solid rgba(5,150,105,0.5)'
                                  : isCurrent ? '1px solid rgba(245,158,11,0.5)'
                                  : `1px solid ${D.border}`,
                                background: sch.isActive ? 'rgba(5,150,105,0.08)'
                                  : isCurrent ? 'rgba(245,158,11,0.06)'
                                  : 'transparent',
                                opacity: isPast && !sch.isActive ? 0.6 : 1,
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    {sch.isActive && <Zap className="w-3 h-3 shrink-0" style={{ color: '#34d399' }} />}
                                    <span className="text-xs font-semibold truncate" style={{ color: D.text }}>
                                      {sch.label || sch.Exam.title}
                                    </span>
                                  </div>
                                  <p className="text-[10px] truncate" style={{ color: D.muted }}>
                                    {sch.Exam.title} · {sch.Exam.totalQuestions} câu
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {!sch.isActive && !isPast && (
                                    <button onClick={() => handleActivateSchedule(sch.id)}
                                      disabled={activatingSchedule === sch.id}
                                      title="Kích hoạt ngay"
                                      className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                                      style={{ color: '#34d399' }}
                                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(5,150,105,0.2)')}
                                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                      {activatingSchedule === sch.id
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Zap className="w-3.5 h-3.5" />
                                      }
                                    </button>
                                  )}
                                  <button onClick={() => handleDeleteSchedule(sch.id)} title="Xoá"
                                    className="p-1.5 rounded-md transition-colors"
                                    style={{ color: '#f87171' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                  ><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] flex-wrap">
                                {sch.isActive && (
                                  <span className="px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: 'rgba(5,150,105,0.2)', color: '#34d399' }}>
                                    Đang hoạt động
                                  </span>
                                )}
                                {isCurrent && !sch.isActive && (
                                  <span className="px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                    Trong khung giờ
                                  </span>
                                )}
                                {isFuture && (
                                  <span className="px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: 'rgba(37,99,235,0.2)', color: '#60a5fa' }}>
                                    Sắp tới
                                  </span>
                                )}
                                {isPast && (
                                  <span className="px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: 'rgba(100,116,139,0.2)', color: D.muted }}>
                                    Đã qua
                                  </span>
                                )}
                                <span style={{ color: D.muted }}>
                                  {from.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  {" → "}
                                  {to.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add schedule form */}
                    {showScheduleForm ? (
                      <div className="rounded-lg p-3 space-y-2.5"
                        style={{ border: '1px dashed rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.05)' }}>
                        <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: D.text }}>
                          <CalendarPlus className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} /> Thêm lịch mới
                        </p>
                        <div className="space-y-1">
                          <DLabel>Đề thi *</DLabel>
                          {examsLoading ? (
                            <div className="text-xs flex items-center gap-1.5 py-1" style={{ color: D.muted }}>
                              <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
                            </div>
                          ) : (
                            <select value={scheduleExamId} onChange={e => setScheduleExamId(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                              style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.text }}>
                              <option value="">— Chọn đề thi —</option>
                              {exams.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.title} ({ex.totalQuestions} câu)</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="space-y-1">
                          <DLabel>Nhãn (tuỳ chọn)</DLabel>
                          <DInput value={scheduleLabel} onChange={e => setScheduleLabel(e.target.value)}
                            placeholder="VD: Ca 1 — Sáng thứ 2" className="text-xs" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1"><DLabel>Từ *</DLabel>
                            <DInput type="datetime-local" value={scheduleFrom} onChange={e => setScheduleFrom(e.target.value)} className="text-[11px]" />
                          </div>
                          <div className="space-y-1"><DLabel>Đến *</DLabel>
                            <DInput type="datetime-local" value={scheduleTo} onChange={e => setScheduleTo(e.target.value)} className="text-[11px]" />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => { setShowScheduleForm(false); setScheduleExamId(""); setScheduleFrom(""); setScheduleTo(""); setScheduleLabel("") }}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
                            style={{ border: `1px solid ${D.border}`, color: D.muted, background: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >Huỷ</button>
                          <button onClick={handleAddSchedule}
                            disabled={addingSchedule || !scheduleExamId || !scheduleFrom || !scheduleTo}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                            style={{ background: '#d97706', color: '#fff' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#b45309')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#d97706')}
                          >
                            {addingSchedule && <Loader2 className="w-3 h-3 animate-spin" />}
                            Thêm lịch
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setShowScheduleForm(true); if (exams.length === 0) void loadExams() }}
                        className="w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                        style={{ border: '2px dashed rgba(245,158,11,0.4)', color: '#f59e0b', background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.07)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" /> Thêm lịch đề thi
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>{/* /right col */}
        </div>{/* /grid */}
      </div>{/* /main */}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// LeaderboardSection — Bảng vàng thành tích
// Lấy data từ GET /api/teacher/leaderboard?examId=...
// Hiển thị: podium top 3 + table top 4-20
// ──────────────────────────────────────────────────────────────────
interface LbEntry {
  rank: number
  id: string
  studentName: string
  studentImage?: string | null
  score: number
  percentage: number
  durationSec: number | null
  completedAt: string | null
  examTitle: string
  examId: string
  source: 'individual' | 'group'
}

function LeaderboardSection({
  exams,
}: {
  exams: { id: string; title: string; totalQuestions: number; examType: string }[]
}) {
  const [items, setItems] = useState<LbEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('')   // '' = tất cả
  const [collapsed, setCollapsed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('examId', filter)
      params.set('limit', '20')
      const { data } = await api.get<{ items: LbEntry[] }>(`/teacher/leaderboard?${params.toString()}`)
      setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const top3 = items.slice(0, 3)
  const rest = items.slice(3, 20)

  const fmtDur = (s: number | null) => {
    if (!s) return '—'
    const m = Math.floor(s / 60)
    const ss = s % 60
    if (m === 0) return `${ss}s`
    return `${m}p${ss > 0 ? ` ${ss}s` : ''}`
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5" style={{ color: '#fbbf24' }} />
    if (rank === 2) return <Medal className="w-5 h-5" style={{ color: '#cbd5e1' }} />
    if (rank === 3) return <Medal className="w-5 h-5" style={{ color: '#fb923c' }} />
    return <span style={{ color: D.muted, fontSize: 13, fontWeight: 700 }}>#{rank}</span>
  }
  const podiumStyle = (rank: number): React.CSSProperties => {
    if (rank === 1) return {
      background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.08))',
      border: '2px solid rgba(251,191,36,0.5)', transform: 'scale(1.05)',
    }
    if (rank === 2) return {
      background: 'linear-gradient(135deg, rgba(203,213,225,0.15), rgba(148,163,184,0.05))',
      border: '2px solid rgba(203,213,225,0.4)',
    }
    return {
      background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(234,88,12,0.05))',
      border: '2px solid rgba(251,146,60,0.4)',
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(180deg, rgba(251,191,36,0.08), transparent)',
      border: '1px solid rgba(251,191,36,0.25)',
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="font-bold text-base" style={{ color: D.text }}>
              🏆 Bảng vàng thành tích
            </h2>
            <p className="text-xs" style={{ color: D.muted }}>
              {items.length > 0
                ? `Top ${items.length} học sinh xuất sắc · Sắp xếp theo điểm + thời gian`
                : 'Chưa có dữ liệu — học sinh sẽ xuất hiện sau khi nộp bài'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <select
              value={filter}
              onChange={(e) => { e.stopPropagation(); setFilter(e.target.value) }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: D.card2, border: `1px solid ${D.border2}`,
                color: D.text, padding: '6px 10px', borderRadius: 8,
                fontSize: 12, minWidth: 180,
              }}
            >
              <option value="">Tất cả đề thi</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4" style={{ color: D.muted }} /> : <ChevronUp className="w-4 h-4" style={{ color: D.muted }} />}
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 pb-5">
          {loading ? (
            <div className="py-12 text-center" style={{ color: D.muted }}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Đang tải bảng vàng…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center" style={{ color: D.muted }}>
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có học sinh nào làm bài. Khi có kết quả, bảng vàng sẽ xuất hiện.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Podium top 3 */}
              {top3.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* Re-order: rank 2 (left), rank 1 (center, scaled), rank 3 (right) */}
                  {[top3[1], top3[0], top3[2]].filter(Boolean).map(p => (
                    <div
                      key={p.id}
                      className="rounded-xl p-4 text-center"
                      style={podiumStyle(p.rank)}
                    >
                      <div className="flex justify-center mb-2">{rankIcon(p.rank)}</div>
                      <div className="text-3xl font-black mb-1" style={{
                        color: p.rank === 1 ? '#fbbf24' : p.rank === 2 ? '#cbd5e1' : '#fb923c',
                      }}>
                        {p.score.toFixed(1)}
                      </div>
                      <p className="font-bold text-sm mb-0.5 truncate" style={{ color: D.text }}>
                        {p.studentName}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: D.muted }}>{p.examTitle}</p>
                      <div className="mt-2 flex items-center justify-center gap-3 text-[11px]" style={{ color: D.muted }}>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtDur(p.durationSec)}
                        </span>
                        <span>·</span>
                        <span>{p.source === 'group' ? 'Phòng live' : 'Cá nhân'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rest as a table */}
              {rest.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
                  <div className="grid grid-cols-[36px_1fr_140px_70px_90px_110px] gap-2 px-3 py-2 text-[10px] font-bold uppercase"
                    style={{ background: D.card2, color: D.muted, letterSpacing: '0.05em' }}>
                    <div>#</div>
                    <div>Học sinh</div>
                    <div>Đề thi</div>
                    <div className="text-right">Điểm</div>
                    <div className="text-right">Thời gian</div>
                    <div className="text-right">Nguồn</div>
                  </div>
                  {rest.map(p => (
                    <div
                      key={p.id}
                      className="grid grid-cols-[36px_1fr_140px_70px_90px_110px] gap-2 px-3 py-2 items-center border-t"
                      style={{ borderColor: D.border, color: D.text }}
                    >
                      <div className="text-xs font-bold" style={{ color: D.muted }}>#{p.rank}</div>
                      <div className="flex items-center gap-2 min-w-0">
                        {p.studentImage ? (
                          <img src={p.studentImage} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {p.studentName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm truncate">{p.studentName}</span>
                      </div>
                      <div className="text-xs truncate" style={{ color: D.muted }}>{p.examTitle}</div>
                      <div className={`text-right text-sm font-bold ${
                        p.score >= 8 ? 'text-emerald-400' : p.score >= 5 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {p.score.toFixed(1)}
                      </div>
                      <div className="text-right text-xs" style={{ color: D.muted }}>{fmtDur(p.durationSec)}</div>
                      <div className="text-right">
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-md"
                          style={{
                            background: p.source === 'group' ? 'rgba(124,58,237,0.15)' : 'rgba(34,197,94,0.12)',
                            color: p.source === 'group' ? '#a78bfa' : '#34d399',
                          }}>
                          {p.source === 'group' ? 'Phòng live' : 'Cá nhân'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
