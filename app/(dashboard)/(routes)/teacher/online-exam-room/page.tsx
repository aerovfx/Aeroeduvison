"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Clock, Eye, Trash2, Copy, Users, Search,
  BarChart3, Play, Square, KeyRound, ArrowRight,
  Loader2, FileText, Timer, Globe, Lock, LogIn,
  BookOpen, CheckCircle2, AlertTriangle, CalendarClock,
  Zap, ChevronDown, ChevronUp, CalendarPlus, Pencil, Save, X,
} from "lucide-react"
import { toast } from "react-hot-toast"

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

export default function OnlineExamRoomPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<ExamRoom[]>([])
  const [publicRooms, setPublicRooms] = useState<ExamRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [joinCode, setJoinCode] = useState("")
  const [joining, setJoining] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDuration, setNewDuration] = useState(45)
  const [newStart, setNewStart] = useState("")
  const [newEnd, setNewEnd] = useState("")
  const [newIsPublic, setNewIsPublic] = useState(true)
  const [newExamId, setNewExamId] = useState("")

  const [exams, setExams] = useState<{ id: string; title: string; totalQuestions: number; examType: string }[]>([])
  const [examsLoading, setExamsLoading] = useState(false)

  // Schedule management
  interface Schedule {
    id: string
    examId: string
    label: string | null
    activeFrom: string
    activeTo: string
    isActive: boolean
    Exam: { id: string; title: string; totalQuestions: number; examType: string }
  }
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

  // Edit room
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDuration, setEditDuration] = useState(45)
  const [editStart, setEditStart] = useState("")
  const [editEnd, setEditEnd] = useState("")
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [editMaxStudents, setEditMaxStudents] = useState<number | "">("")
  const [editDescription, setEditDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const startEditing = (room: ExamRoom) => {
    const toLocal = (iso: string) => {
      const d = new Date(iso)
      const pad = (n: number) => String(n).padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
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
    if (!selectedId || !editName.trim()) {
      toast.error("Tên phòng thi không được để trống")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/online-exam-room/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          duration: editDuration,
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
    } catch (e: any) {
      toast.error(e.message || "Không thể cập nhật")
    } finally {
      setSaving(false)
    }
  }

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
    } catch {
      setExams([])
    } finally {
      setExamsLoading(false)
    }
  }, [])

  const loadSchedules = useCallback(async (roomId: string) => {
    try {
      setSchedulesLoading(true)
      const res = await fetch(`/api/online-exam-room/${roomId}/schedule`)
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch {
      setSchedules([])
    } finally {
      setSchedulesLoading(false)
    }
  }, [])

  const handleAddSchedule = async () => {
    if (!selectedId || !scheduleExamId || !scheduleFrom || !scheduleTo) {
      toast.error("Vui lòng chọn đề thi, thời gian bắt đầu và kết thúc")
      return
    }
    setAddingSchedule(true)
    try {
      const res = await fetch(`/api/online-exam-room/${selectedId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setScheduleExamId("")
      setScheduleFrom("")
      setScheduleTo("")
      setScheduleLabel("")
      await loadSchedules(selectedId)
    } catch (e: any) {
      toast.error(e.message || "Không thể thêm lịch")
    } finally {
      setAddingSchedule(false)
    }
  }

  const handleActivateSchedule = async (scheduleId: string) => {
    if (!selectedId) return
    if (!confirm("Kích hoạt lịch này sẽ thay toàn bộ câu hỏi hiện tại bằng đề thi mới. Tiếp tục?")) return
    setActivatingSchedule(scheduleId)
    try {
      const res = await fetch(`/api/online-exam-room/${selectedId}/schedule/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Đã kích hoạt: ${data.examTitle} (${data.questionsImported} câu)`)
      await loadSchedules(selectedId)
      await loadRooms()
    } catch (e: any) {
      toast.error(e.message || "Không thể kích hoạt")
    } finally {
      setActivatingSchedule(null)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!selectedId) return
    if (!confirm("Xoá lịch này?")) return
    try {
      await fetch(`/api/online-exam-room/${selectedId}/schedule?scheduleId=${scheduleId}`, { method: "DELETE" })
      toast.success("Đã xoá lịch")
      await loadSchedules(selectedId)
    } catch {
      toast.error("Không thể xoá")
    }
  }

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/online-exam-room")
      const data = await res.json()
      setRooms(data.examRooms || [])
      setPublicRooms(data.publicRooms || [])
    } catch {
      setRooms([])
      setPublicRooms([])
    } finally {
      setLoading(false)
    }
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

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return
    setJoining("code")
    try {
      const res = await fetch("/api/online-exam-room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: joinCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.data.alreadyJoined ? "Đã tham gia trước đó" : "Tham gia thành công!")
      router.push(`/teacher/online-exam-room/${data.data.roomId}/take`)
    } catch (e: any) {
      toast.error(e.message || "Không thể tham gia")
    } finally {
      setJoining(null)
    }
  }

  const handleJoinPublic = async (roomId: string) => {
    setJoining(roomId)
    try {
      const res = await fetch("/api/online-exam-room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Đã vào phòng thi!")
      router.push(`/teacher/online-exam-room/${data.data.roomId}/take`)
    } catch (e: any) {
      toast.error(e.message || "Không thể tham gia")
    } finally {
      setJoining(null)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newStart || !newEnd) {
      toast.error("Vui lòng nhập tên, thời gian bắt đầu và kết thúc")
      return
    }
    if (!newExamId) {
      toast.error("Vui lòng chọn đề thi để gắn vào phòng")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/online-exam-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setShowCreate(false)
      setNewName("")
      setNewExamId("")
      setNewStart("")
      setNewEnd("")
      setNewIsPublic(true)
      await loadRooms()
    } catch (e: any) {
      toast.error(e.message || "Không thể tạo phòng thi")
    } finally {
      setCreating(false)
    }
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

  const filtered = rooms.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (searchQuery.trim() && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const statusLabel = (s: string) =>
    s === "draft" ? "Nháp" : s === "active" ? "Đang thi" : s === "completed" ? "Kết thúc" : s === "cancelled" ? "Huỷ" : s

  const statusColor = (s: string) =>
    s === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : s === "draft" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    : s === "completed" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"

  const selected = rooms.find(r => r.id === selectedId)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Phòng Thi Online</h1>
              <p className="text-xs text-muted-foreground">Tổ chức thi trực tuyến · Công khai hoặc bí mật</p>
            </div>
          </div>
          <button onClick={() => {
              setShowCreate(true)
              if (!newStart) {
                const now = new Date()
                now.setMinutes(now.getMinutes() + (5 - (now.getMinutes() % 5)), 0, 0)
                const toLocal = (d: Date) => {
                  const pad = (n: number) => String(n).padStart(2, "0")
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                }
                setNewStart(toLocal(now))
                const end = new Date(now.getTime() + (newDuration || 45) * 60000)
                setNewEnd(toLocal(end))
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium">
            <Plus className="w-4 h-4" /> Tạo phòng thi
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ═══ PUBLIC ROOMS — direct join ═══ */}
        {publicRooms.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              <h2 className="font-bold text-foreground">Phòng thi công khai — Vào ngay</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {publicRooms.map(room => (
                <div key={room.id}
                  className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10 p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      <h3 className="font-semibold text-foreground text-sm truncate">{room.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{room.Teacher?.name || "Giáo viên"}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {room.duration}p</span>
                      <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {room._count?.participants || 0}</span>
                      <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" /> {room._count?.questions || 0} câu</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColor(room.status)}`}>
                        {statusLabel(room.status)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(room.startTime).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinPublic(room.id)}
                    disabled={joining === room.id}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {joining === room.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Vào thi ngay
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PRIVATE join by code ═══ */}
        <div className="rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-5">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Phòng thi bí mật</h2>
                <p className="text-xs text-muted-foreground">Nhập mã 6 chữ số để tham gia</p>
              </div>
            </div>
            <div className="flex-1 flex gap-2 w-full md:max-w-md">
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Nhập mã..."
                maxLength={6}
                className="flex-1 px-4 py-3 border-2 border-purple-200 dark:border-purple-800 rounded-xl text-center text-2xl font-mono font-black tracking-[0.3em] bg-background text-foreground focus:outline-none focus:border-purple-500 placeholder:text-base placeholder:tracking-normal placeholder:font-normal"
                onKeyDown={e => e.key === "Enter" && handleJoinByCode()}
              />
              <button
                onClick={handleJoinByCode}
                disabled={joinCode.length < 6 || joining === "code"}
                className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40 transition-all flex items-center gap-2 font-medium shrink-0"
              >
                {joining === "code" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Vào thi
              </button>
            </div>
          </div>
        </div>

        {/* ═══ CREATE FORM ═══ */}
        {showCreate && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-lg space-y-5">
            <h3 className="font-bold text-lg text-foreground">Tạo phòng thi mới</h3>

            {/* Step 1: Exam selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Chọn đề thi *
              </label>
              {examsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách đề thi...
                </div>
              ) : exams.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-foreground">Chưa có đề thi nào</p>
                  <p className="text-xs text-muted-foreground mt-1">Bạn cần tạo đề thi trước (trang Đề thi), rồi quay lại đây để mở phòng.</p>
                  <button onClick={() => router.push("/teacher/exams")}
                    className="mt-2 px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600">
                    Đi tạo đề thi
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto pr-1">
                  {exams.map(ex => {
                    const sel = newExamId === ex.id
                    return (
                      <button key={ex.id} onClick={() => {
                        setNewExamId(sel ? "" : ex.id)
                        if (!newName.trim() && !sel) setNewName(ex.title)
                        if (!newDuration && !sel) setNewDuration(45)
                      }}
                        className={`text-left rounded-lg border-2 p-3 transition-all ${
                          sel
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20 ring-1 ring-purple-300"
                            : "border-border hover:border-purple-300 dark:hover:border-purple-700"
                        }`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          {sel && <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />}
                          <span className="text-sm font-semibold text-foreground truncate">{ex.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{ex.totalQuestions} câu hỏi</span>
                          {ex.examType && <span>· {ex.examType}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {newExamId && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã chọn đề thi — câu hỏi sẽ được import tự động
                </p>
              )}
            </div>

            {/* Step 2: Room details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Tên phòng thi *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="VD: Kiểm tra giữa kỳ 2 — Vật lý 10"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Bắt đầu *</label>
                <input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Kết thúc *</label>
                <input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Thời gian làm bài (phút)</label>
                <input type="number" value={newDuration} min={5} step={5} onChange={e => setNewDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm" />
              </div>
              {/* Public / Private toggle */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Chế độ truy cập</label>
                <div className="flex gap-2">
                  <button onClick={() => setNewIsPublic(true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      newIsPublic
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:border-emerald-300"
                    }`}>
                    <Globe className="w-4 h-4" /> Công khai
                  </button>
                  <button onClick={() => setNewIsPublic(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      !newIsPublic
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400"
                        : "border-border text-muted-foreground hover:border-purple-300"
                    }`}>
                    <Lock className="w-4 h-4" /> Bí mật
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {newIsPublic
                    ? "Mọi người đều thấy và có thể vào thi trực tiếp"
                    : "Chỉ những ai có mã 6 số mới vào được"}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowCreate(false); setNewExamId(""); setNewStart(""); setNewEnd("") }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Huỷ</button>
              <button onClick={handleCreate} disabled={creating || !newExamId}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Tạo phòng thi
              </button>
            </div>
          </div>
        )}

        {/* ═══ MY ROOMS + SIDEBAR ═══ */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm phòng thi..."
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background text-foreground" />
              </div>
              <div className="flex gap-1">
                {[
                  { v: "all", l: "Tất cả" }, { v: "draft", l: "Nháp" },
                  { v: "active", l: "Đang thi" }, { v: "completed", l: "Xong" },
                ].map(f => (
                  <button key={f.v} onClick={() => setStatusFilter(f.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === f.v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                    }`}>{f.l}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">Chưa có phòng thi nào</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(room => (
                  <div key={room.id} onClick={() => setSelectedId(room.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                      selectedId === room.id
                        ? "border-purple-400 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/10"
                        : "border-border bg-card hover:border-purple-200 dark:hover:border-purple-900"
                    }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {room.isPublic
                            ? <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            : <Lock className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                          <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(room.status)}`}>
                            {statusLabel(room.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {room.duration}p</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room._count?.participants || 0}</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {room._count?.questions || 0} câu</span>
                          {room.isPublic ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Công khai</span>
                          ) : room.accessCode ? (
                            <button onClick={e => { e.stopPropagation(); copyCode(room.accessCode!) }}
                              className="flex items-center gap-1 font-mono font-bold text-purple-600 dark:text-purple-400 hover:underline">
                              <KeyRound className="w-3 h-3" /> {room.accessCode} <Copy className="w-3 h-3" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {room.status === "draft" && (
                          <button onClick={() => handleStart(room)} title="Mở phòng"
                            className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-600">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {room.status === "active" && (
                          <button onClick={() => handleStop(room)} title="Kết thúc"
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600">
                            <Square className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setSelectedId(room.id); startEditing(room) }} title="Sửa"
                          className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => router.push(`/teacher/online-exam-room/${room.id}/take`)} title="Vào phòng"
                          className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(room.id)} title="Xoá"
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <span className="font-bold text-sm text-foreground">Thống kê</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: "Tổng phòng", v: rooms.length, c: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
                  { l: "Đang thi", v: rooms.filter(r => r.status === "active").length, c: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
                  { l: "Công khai", v: rooms.filter(r => r.isPublic).length, c: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" },
                  { l: "Bí mật", v: rooms.filter(r => !r.isPublic).length, c: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" },
                ].map((s, i) => (
                  <div key={i} className={`rounded-lg p-3 ${s.c}`}>
                    <p className="text-2xl font-black">{s.v}</p>
                    <p className="text-[10px] font-medium opacity-70">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {selected ? (
              <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-card p-5 space-y-3">
                {editing ? (
                  /* ═══ EDIT MODE ═══ */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5 text-blue-500" /> Chỉnh sửa phòng thi
                      </span>
                      <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Tên phòng thi *</label>
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Mô tả</label>
                      <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2}
                        placeholder="Mô tả ngắn (tuỳ chọn)"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs resize-y" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Bắt đầu</label>
                        <input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-[11px]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Kết thúc</label>
                        <input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-[11px]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Thời gian (phút)</label>
                        <input type="number" value={editDuration} min={5} step={5} onChange={e => setEditDuration(Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Số thí sinh tối đa</label>
                        <input type="number" value={editMaxStudents} min={1} onChange={e => setEditMaxStudents(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Không giới hạn"
                          className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Chế độ truy cập</label>
                      <div className="flex gap-2">
                        <button onClick={() => setEditIsPublic(true)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                            editIsPublic
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                              : "border-border text-muted-foreground hover:border-emerald-300"
                          }`}>
                          <Globe className="w-3.5 h-3.5" /> Công khai
                        </button>
                        <button onClick={() => setEditIsPublic(false)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                            !editIsPublic
                              ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400"
                              : "border-border text-muted-foreground hover:border-purple-300"
                          }`}>
                          <Lock className="w-3.5 h-3.5" /> Bí mật
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditing(false)}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted">
                        Huỷ
                      </button>
                      <button onClick={handleSaveEdit} disabled={saving}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ═══ VIEW MODE ═══ */
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {selected.isPublic ? <Globe className="w-4 h-4 text-emerald-500 shrink-0" /> : <Lock className="w-4 h-4 text-purple-500 shrink-0" />}
                        <h3 className="font-bold text-foreground truncate">{selected.name}</h3>
                      </div>
                      <button onClick={() => startEditing(selected)} title="Sửa thông tin"
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-500 shrink-0">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {selected.description && (
                      <p className="text-xs text-muted-foreground">{selected.description}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Trạng thái</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(selected.status)}`}>{statusLabel(selected.status)}</span>
                      </div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Chế độ</span>
                        <span className={`text-xs font-medium ${selected.isPublic ? "text-emerald-600" : "text-purple-600"}`}>
                          {selected.isPublic ? "Công khai" : "Bí mật (mã số)"}
                        </span>
                      </div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Thời gian</span><span className="font-medium text-foreground">{selected.duration} phút</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Thí sinh</span><span className="font-medium text-foreground">{selected._count?.participants || 0}{selected.maxStudents ? ` / ${selected.maxStudents}` : ""}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Câu hỏi</span><span className="font-medium text-foreground">{selected._count?.questions || 0}</span></div>
                      {!selected.isPublic && selected.accessCode && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Mã phòng</span>
                          <button onClick={() => copyCode(selected.accessCode!)}
                            className="font-mono font-black text-lg text-purple-600 dark:text-purple-400 tracking-widest flex items-center gap-1 hover:underline">
                            {selected.accessCode} <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="flex justify-between"><span className="text-muted-foreground">Bắt đầu</span><span className="text-foreground text-xs">{new Date(selected.startTime).toLocaleString("vi-VN")}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Kết thúc</span><span className="text-foreground text-xs">{new Date(selected.endTime).toLocaleString("vi-VN")}</span></div>
                    </div>
                    <button onClick={() => router.push(`/teacher/online-exam-room/${selected.id}/take`)}
                      className="w-full mt-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" /> Vào phòng thi
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {/* ═══ EXAM SCHEDULE ═══ */}
            {selected && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-card p-5 space-y-3">
                <button onClick={() => setShowSchedules(!showSchedules)}
                  className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-sm text-foreground">Lịch đề thi</span>
                    {schedules.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {schedules.length}
                      </span>
                    )}
                  </div>
                  {showSchedules ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showSchedules && (
                  <div className="space-y-3 pt-1">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Lên lịch thay đổi đề thi theo thời gian. Khi kích hoạt, toàn bộ câu hỏi hiện tại sẽ được thay bằng đề mới.
                    </p>

                    {schedulesLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3 justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải...
                      </div>
                    ) : schedules.length === 0 && !showScheduleForm ? (
                      <div className="text-center py-3">
                        <CalendarClock className="w-6 h-6 mx-auto mb-1 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">Chưa có lịch nào</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {schedules.map((sch) => {
                          const now = new Date()
                          const from = new Date(sch.activeFrom)
                          const to = new Date(sch.activeTo)
                          const isCurrent = now >= from && now <= to
                          const isPast = now > to
                          const isFuture = now < from

                          return (
                            <div key={sch.id}
                              className={`rounded-lg border p-3 space-y-1.5 transition-all ${
                                sch.isActive
                                  ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/10"
                                  : isCurrent
                                  ? "border-amber-400 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10"
                                  : isPast
                                  ? "border-border opacity-60"
                                  : "border-border"
                              }`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    {sch.isActive && <Zap className="w-3 h-3 text-emerald-500 shrink-0" />}
                                    <span className="text-xs font-semibold text-foreground truncate">
                                      {sch.label || sch.Exam.title}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {sch.Exam.title} · {sch.Exam.totalQuestions} câu
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {!sch.isActive && !isPast && (
                                    <button onClick={() => handleActivateSchedule(sch.id)}
                                      disabled={activatingSchedule === sch.id}
                                      title="Kích hoạt ngay"
                                      className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-600 disabled:opacity-50">
                                      {activatingSchedule === sch.id
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Zap className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                  <button onClick={() => handleDeleteSchedule(sch.id)}
                                    title="Xoá"
                                    className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                {sch.isActive && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold">
                                    Đang hoạt động
                                  </span>
                                )}
                                {isCurrent && !sch.isActive && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold">
                                    Trong khung giờ
                                  </span>
                                )}
                                {isFuture && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold">
                                    Sắp tới
                                  </span>
                                )}
                                {isPast && (
                                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-bold">
                                    Đã qua
                                  </span>
                                )}
                                <span className="text-muted-foreground">
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
                      <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10 p-3 space-y-2.5">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <CalendarPlus className="w-3.5 h-3.5 text-amber-500" /> Thêm lịch mới
                        </p>

                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Đề thi *</label>
                          {examsLoading ? (
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
                            </div>
                          ) : (
                            <select value={scheduleExamId} onChange={e => setScheduleExamId(e.target.value)}
                              className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-xs">
                              <option value="">— Chọn đề thi —</option>
                              {exams.map(ex => (
                                <option key={ex.id} value={ex.id}>
                                  {ex.title} ({ex.totalQuestions} câu)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Nhãn (tuỳ chọn)</label>
                          <input value={scheduleLabel} onChange={e => setScheduleLabel(e.target.value)}
                            placeholder="VD: Ca 1 — Sáng thứ 2"
                            className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-xs" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Từ *</label>
                            <input type="datetime-local" value={scheduleFrom} onChange={e => setScheduleFrom(e.target.value)}
                              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-[11px]" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Đến *</label>
                            <input type="datetime-local" value={scheduleTo} onChange={e => setScheduleTo(e.target.value)}
                              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-[11px]" />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button onClick={() => { setShowScheduleForm(false); setScheduleExamId(""); setScheduleFrom(""); setScheduleTo(""); setScheduleLabel("") }}
                            className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted">
                            Huỷ
                          </button>
                          <button onClick={handleAddSchedule} disabled={addingSchedule || !scheduleExamId || !scheduleFrom || !scheduleTo}
                            className="flex-1 px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1">
                            {addingSchedule && <Loader2 className="w-3 h-3 animate-spin" />}
                            Thêm lịch
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setShowScheduleForm(true); if (exams.length === 0) void loadExams() }}
                        className="w-full px-3 py-2 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-all flex items-center justify-center gap-1.5">
                        <CalendarPlus className="w-3.5 h-3.5" /> Thêm lịch đề thi
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!selected && (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Chọn phòng thi để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
