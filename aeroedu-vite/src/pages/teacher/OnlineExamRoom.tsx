import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus, Clock, Eye, Trash2, Copy, Users, Search,
  BarChart3, Play, Square, KeyRound, ArrowRight,
  Loader2, FileText, Timer, Globe, Lock, LogIn,
  BookOpen, CheckCircle2, AlertTriangle, CalendarClock,
  Zap, ChevronDown, ChevronUp, CalendarPlus, Pencil, Save, X,
} from "lucide-react"
import toast from "react-hot-toast"

// ── Dark palette ──────────────────────────────────────────────
const D = {
  bg:      '#0d0e17',
  card:    '#10111e',
  card2:   '#161728',
  border:  '#1e2033',
  border2: '#2a2b3d',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  purple:  '#7c3aed',
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
  const [statusFilter, setStatusFilter] = useState("all")

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
      const res = await fetch("/api/online-exam-room")
      const data = await res.json()
      setRooms(data.examRooms || [])
      setPublicRooms(data.publicRooms || [])
    } catch {
      setRooms([]); setPublicRooms([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadExams = useCallback(async () => {
    try {
      setExamsLoading(true)
      const res = await fetch("/api/exams?limit=100")
      const data = await res.json()
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
      const res = await fetch(`/api/online-exam-room/${roomId}/schedule`)
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch { setSchedules([]) }
    finally { setSchedulesLoading(false) }
  }, [])

  useEffect(() => { void loadRooms() }, [loadRooms])
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
      const res = await fetch(`/api/online-exam-room/${selectedId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(), duration: editDuration,
          startTime: editStart ? new Date(editStart).toISOString() : undefined,
          endTime: editEnd ? new Date(editEnd).toISOString() : undefined,
          isPublic: editIsPublic,
          maxStudents: editMaxStudents === "" ? null : Number(editMaxStudents),
          description: editDescription.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Đã cập nhật phòng thi")
      setEditing(false)
      await loadRooms()
    } catch (e: any) { toast.error(e.message || "Không thể cập nhật") }
    finally { setSaving(false) }
  }

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return
    setJoining("code")
    try {
      const res = await fetch("/api/online-exam-room/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: joinCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.data.alreadyJoined ? "Đã tham gia trước đó" : "Tham gia thành công!")
      navigate(`/teacher/online-exam-room/${data.data.roomId}/take`)
    } catch (e: any) { toast.error(e.message || "Không thể tham gia") }
    finally { setJoining(null) }
  }

  const handleJoinPublic = async (roomId: string) => {
    setJoining(roomId)
    try {
      const res = await fetch("/api/online-exam-room/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Đã vào phòng thi!")
      navigate(`/teacher/online-exam-room/${data.data.roomId}/take`)
    } catch (e: any) { toast.error(e.message || "Không thể tham gia") }
    finally { setJoining(null) }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newStart || !newEnd) { toast.error("Vui lòng nhập tên, thời gian bắt đầu và kết thúc"); return }
    if (!newExamId) { toast.error("Vui lòng chọn đề thi để gắn vào phòng"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/online-exam-room", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          startTime: new Date(newStart).toISOString(),
          endTime: new Date(newEnd).toISOString(),
          duration: newDuration,
          isPublic: newIsPublic,
          examId: newExamId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const msg = newIsPublic
        ? "Phòng thi công khai đã tạo — Ai cũng có thể vào!"
        : `Phòng thi bí mật đã tạo — Mã: ${data.examRoom?.accessCode}`
      toast.success(msg)
      setShowCreate(false); setNewName(""); setNewExamId(""); setNewStart(""); setNewEnd("")
      await loadRooms()
    } catch (e: any) { toast.error(e.message || "Không thể tạo phòng thi") }
    finally { setCreating(false) }
  }

  const handleStart = async (room: ExamRoom) => {
    try {
      await fetch(`/api/online-exam-room/${room.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
      toast.success("Đã mở phòng thi!")
      await loadRooms()
    } catch { toast.error("Lỗi") }
  }

  const handleStop = async (room: ExamRoom) => {
    try {
      await fetch(`/api/online-exam-room/${room.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      toast.success("Đã kết thúc phòng thi")
      await loadRooms()
    } catch { toast.error("Lỗi") }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá phòng thi này?")) return
    try {
      await fetch(`/api/online-exam-room/${id}`, { method: "DELETE" })
      toast.success("Đã xoá")
      if (selectedId === id) setSelectedId(null)
      await loadRooms()
    } catch { toast.error("Lỗi") }
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
      const res = await fetch(`/api/online-exam-room/${selectedId}/schedule`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: scheduleExamId,
          activeFrom: new Date(scheduleFrom).toISOString(),
          activeTo: new Date(scheduleTo).toISOString(),
          label: scheduleLabel.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Đã thêm lịch đề thi")
      setShowScheduleForm(false)
      setScheduleExamId(""); setScheduleFrom(""); setScheduleTo(""); setScheduleLabel("")
      await loadSchedules(selectedId)
    } catch (e: any) { toast.error(e.message || "Không thể thêm lịch") }
    finally { setAddingSchedule(false) }
  }

  const handleActivateSchedule = async (scheduleId: string) => {
    if (!selectedId) return
    if (!confirm("Kích hoạt lịch này sẽ thay toàn bộ câu hỏi hiện tại bằng đề thi mới. Tiếp tục?")) return
    setActivatingSchedule(scheduleId)
    try {
      const res = await fetch(`/api/online-exam-room/${selectedId}/schedule/activate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Đã kích hoạt: ${data.examTitle} (${data.questionsImported} câu)`)
      await loadSchedules(selectedId)
      await loadRooms()
    } catch (e: any) { toast.error(e.message || "Không thể kích hoạt") }
    finally { setActivatingSchedule(null) }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!selectedId) return
    if (!confirm("Xoá lịch này?")) return
    try {
      await fetch(`/api/online-exam-room/${selectedId}/schedule?scheduleId=${scheduleId}`, { method: "DELETE" })
      toast.success("Đã xoá lịch")
      await loadSchedules(selectedId)
    } catch { toast.error("Không thể xoá") }
  }

  // ── Computed ───────────────────────────────────────────────
  const filtered = rooms.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (searchQuery.trim() && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
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
              <h1 className="text-xl font-bold" style={{ color: D.text }}>Phòng Thi Online</h1>
              <p className="text-xs" style={{ color: D.muted }}>Tổ chức thi trực tuyến · Công khai hoặc bí mật</p>
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
                <p className="font-medium" style={{ color: D.muted }}>Chưa có phòng thi nào</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(room => (
                  <div key={room.id} onClick={() => setSelectedId(room.id)}
                    className="rounded-xl p-4 cursor-pointer transition-all"
                    style={{
                      border: `1px solid ${selectedId === room.id ? 'rgba(124,58,237,0.6)' : D.border}`,
                      background: selectedId === room.id ? 'rgba(124,58,237,0.08)' : D.card,
                    }}
                    onMouseEnter={e => { if (selectedId !== room.id) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)' }}
                    onMouseLeave={e => { if (selectedId !== room.id) e.currentTarget.style.borderColor = D.border }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {room.isPublic
                            ? <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: '#34d399' }} />
                            : <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: '#a78bfa' }} />
                          }
                          <h3 className="font-semibold truncate" style={{ color: D.text }}>{room.name}</h3>
                          <StatusBadge status={room.status} />
                        </div>
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
                ))}
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
                  { l: "Tổng phòng", v: rooms.length,                              bg: 'rgba(124,58,237,0.2)',  c: '#a78bfa' },
                  { l: "Đang thi",   v: rooms.filter(r => r.status==="active").length, bg: 'rgba(5,150,105,0.2)',  c: '#34d399' },
                  { l: "Công khai",  v: rooms.filter(r => r.isPublic).length,       bg: 'rgba(20,184,166,0.2)', c: '#2dd4bf' },
                  { l: "Bí mật",    v: rooms.filter(r => !r.isPublic).length,       bg: 'rgba(139,92,246,0.2)', c: '#c4b5fd' },
                ].map(s => (
                  <div key={s.l} className="rounded-lg p-3" style={{ background: s.bg }}>
                    <p className="text-2xl font-black" style={{ color: s.c }}>{s.v}</p>
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
