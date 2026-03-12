"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Plus, Calendar, Clock, Users, FileText, Copy, Eye, Trash2,
  Play, Square, Search, Filter, Loader2, CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { NeumorphicCard } from "@/components/ui/neumorphic-card"
import { NeumorphicButton } from "@/components/ui/neumorphic-button"
import { NeumorphicInput } from "@/components/ui/neumorphic-input"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import "@/styles/neumorphic-theme.css"

interface ExamMatrix { id: string; name: string; grade: string; examType: string }
interface ExamRoom {
  id: string; name: string; description: string | null; teacherId: string;
  examMatrixId: string | null; startTime: string; endTime: string;
  duration: number; status: string; isPublic: boolean; accessCode: string | null;
  maxStudents: number | null; instructions: string | null;
  createdAt: string; updatedAt: string; ExamMatrix: ExamMatrix | null;
  participants: any[]; questions: any[]; _count: { participants: number; questions: number }
}

export default function OnlineExamRoomPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [examRooms, setExamRooms] = useState<ExamRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<ExamRoom | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [matrices, setMatrices] = useState<ExamMatrix[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    name: "", description: "", examMatrixId: "", startTime: "", endTime: "",
    duration: 45, isPublic: false, maxStudents: "", instructions: "",
  })

  useEffect(() => {
    if (session?.user) { fetchExamRooms(); fetchMatrices() }
  }, [session, filterStatus])

  const fetchExamRooms = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.append("status", filterStatus)
      const response = await fetch(`/api/online-exam-room?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setExamRooms(data.examRooms || [])
    } catch (error) {
      toast.error("Không thể tải danh sách phòng thi")
    } finally {
      setLoading(false)
    }
  }

  const fetchMatrices = async () => {
    try {
      const response = await fetch("/api/exam-matrices")
      if (response.ok) {
        const data = await response.json()
        setMatrices(data.matrices || [])
      }
    } catch (error) {
      console.error("Error fetching matrices:", error)
    }
  }

  const handleCreateRoom = async () => {
    try {
      const payload = {
        ...formData,
        maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : null,
        description: formData.description || null,
        instructions: formData.instructions || null,
        examMatrixId: formData.examMatrixId || null,
      }
      const response = await fetch("/api/online-exam-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to create")
      toast.success("Đã tạo phòng thi thành công")
      setCreateDialogOpen(false)
      resetForm()
      fetchExamRooms()
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo phòng thi")
    }
  }

  const handleDeleteRoom = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phòng thi này?")) return
    try {
      await fetch(`/api/online-exam-room/${id}`, { method: "DELETE" })
      toast.success("Đã xóa phòng thi")
      fetchExamRooms()
    } catch (error: any) {
      toast.error(error.message || "Không thể xóa phòng thi")
    }
  }

  const handleStartExam = async (room: ExamRoom) => {
    try {
      await fetch(`/api/online-exam-room/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
      toast.success("Đã bắt đầu phòng thi")
      fetchExamRooms()
    } catch (error: any) {
      toast.error(error.message || "Không thể bắt đầu phòng thi")
    }
  }

  const handleEndExam = async (room: ExamRoom) => {
    if (!confirm("Bạn có chắc chắn muốn kết thúc phòng thi này?")) return
    try {
      await fetch(`/api/online-exam-room/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      toast.success("Đã kết thúc phòng thi")
      fetchExamRooms()
    } catch (error: any) {
      toast.error(error.message || "Không thể kết thúc phòng thi")
    }
  }

  const handleCopyAccessCode = (code: string | null) => {
    if (!code) return
    navigator.clipboard.writeText(code)
    toast.success("Đã sao chép mã truy cập")
  }

  const resetForm = () => {
    setFormData({
      name: "", description: "", examMatrixId: "", startTime: "", endTime: "",
      duration: 45, isPublic: false, maxStudents: "", instructions: "",
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
    }
    const labels: Record<string, string> = {
      draft: "Nháp", active: "Đang diễn ra", completed: "Hoàn thành", cancelled: "Đã hủy",
    }
    return <Badge className={`neu-shadow-sm ${badges[status] || ""}`}>{labels[status] || status}</Badge>
  }

  const filteredRooms = examRooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === "all" || room.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: examRooms.length,
    draft: examRooms.filter(r => r.status === "draft").length,
    active: examRooms.filter(r => r.status === "active").length,
    completed: examRooms.filter(r => r.status === "completed").length,
  }

  return (
    <div className="flex flex-col h-full neu-container">
      {/* Header with Gradient Text */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Phòng Thi Trực Tuyến</h1>
              <p className="text-gray-600">Tạo và quản lý các phòng thi trực tuyến chuyên nghiệp</p>
            </div>
            <NeumorphicButton variant="primary" size="lg" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo Phòng Thi
            </NeumorphicButton>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Tổng cộng", value: stats.total, color: "from-blue-500 to-blue-600", icon: FileText },
              { label: "Nháp", value: stats.draft, color: "from-gray-500 to-gray-600", icon: Calendar },
              { label: "Đang diễn ra", value: stats.active, color: "from-green-500 to-green-600", icon: Play },
              { label: "Hoàn thành", value: stats.completed, color: "from-purple-500 to-purple-600", icon: CheckCircle },
            ].map((stat) => (
              <NeumorphicCard key={stat.label} variant="gradient" hover className="text-center p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <stat.icon className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
                  <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <NeumorphicInput
                placeholder="Tìm kiếm phòng thi..."
                icon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px] neu-shadow-sm">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
                <SelectItem value="active">Đang diễn ra</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Exam Rooms Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 neu-shadow" />
                <p className="text-gray-600">Đang tải...</p>
              </div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <NeumorphicCard variant="gradient" size="lg" className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có phòng thi nào</h3>
                  <p className="text-gray-500 mb-4">Bắt đầu bằng cách tạo phòng thi đầu tiên</p>
                  <NeumorphicButton variant="primary" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Phòng Thi
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRooms.map((room) => (
                <NeumorphicCard key={room.id} variant="gradient" hover size="lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg gradient-text">{room.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {room.ExamMatrix?.name || "Không có đề thi"}
                      </p>
                    </div>
                    {getStatusBadge(room.status)}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                      {format(new Date(room.startTime), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2 text-purple-500" />
                      {room.duration} phút
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2 text-green-500" />
                      {room._count.participants} học sinh
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-2 text-orange-500" />
                      {room._count.questions} câu hỏi
                    </div>
                    {room.accessCode && (
                      <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-2 neu-shadow-inner">
                        <span className="text-sm font-mono text-gray-700">Mã: {room.accessCode}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopyAccessCode(room.accessCode)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <NeumorphicButton variant="outline" size="sm" onClick={() => { setSelectedRoom(room); setViewDialogOpen(true); }}>
                      <Eye className="h-3 w-3 mr-1" />
                      Xem
                    </NeumorphicButton>
                    {room.status === "draft" && (
                      <NeumorphicButton variant="primary" size="sm" onClick={() => handleStartExam(room)}>
                        <Play className="h-3 w-3 mr-1" />
                        Bắt đầu
                      </NeumorphicButton>
                    )}
                    {room.status === "active" && (
                      <NeumorphicButton variant="outline" size="sm" className="text-red-600" onClick={() => handleEndExam(room)}>
                        <Square className="h-3 w-3 mr-1" />
                        Kết thúc
                      </NeumorphicButton>
                    )}
                    <NeumorphicButton variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteRoom(room.id)}>
                      <Trash2 className="h-3 w-3" />
                    </NeumorphicButton>
                  </div>
                </NeumorphicCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto neu-card">
          <DialogHeader>
            <DialogTitle className="gradient-text">Tạo Phòng Thi Trực Tuyến</DialogTitle>
            <DialogDescription>Điền thông tin để tạo phòng thi mới cho học sinh</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên phòng thi *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ví dụ: Thi Học Kỳ 1 - Vật Lý 10" className="neu-input" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả ngắn về phòng thi" rows={2} className="neu-input" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="examMatrix">Đề thi (ma trận đề)</Label>
              <Select value={formData.examMatrixId} onValueChange={(value) => setFormData({ ...formData, examMatrixId: value })}>
                <SelectTrigger className="neu-shadow-sm"><SelectValue placeholder="Chọn đề thi từ thư viện" /></SelectTrigger>
                <SelectContent>
                  {matrices.map((matrix) => (
                    <SelectItem key={matrix.id} value={matrix.id}>{matrix.name} - {matrix.grade} - {matrix.examType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Thời gian bắt đầu *</Label>
                <Input id="startTime" type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="neu-input" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">Thời gian kết thúc *</Label>
                <Input id="endTime" type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="neu-input" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Thời gian làm bài (phút)</Label>
              <Input id="duration" type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 45 })} className="neu-input" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instructions">Hướng dẫn làm bài</Label>
              <Textarea id="instructions" value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} placeholder="Hướng dẫn chi tiết cho học sinh khi làm bài" rows={4} className="neu-input" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Công khai</Label>
                <p className="text-sm text-gray-500">Cho phép học sinh tìm thấy phòng thi</p>
              </div>
              <Switch checked={formData.isPublic} onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxStudents">Số lượng học sinh tối đa</Label>
              <Input id="maxStudents" type="number" value={formData.maxStudents} onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })} placeholder="Để trống nếu không giới hạn" className="neu-input" />
            </div>
          </div>

          <DialogFooter>
            <NeumorphicButton variant="outline" onClick={() => setCreateDialogOpen(false)}>Hủy</NeumorphicButton>
            <NeumorphicButton variant="primary" onClick={handleCreateRoom}>Tạo Phòng Thi</NeumorphicButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto neu-card">
          <DialogHeader>
            <DialogTitle className="gradient-text">{selectedRoom?.name}</DialogTitle>
            <DialogDescription>{selectedRoom?.description || "Không có mô tả"}</DialogDescription>
          </DialogHeader>

          {selectedRoom && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 gradient-text">Thông tin chung</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Trạng thái:</span>
                      {getStatusBadge(selectedRoom.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Thời gian:</span>
                      <span>{selectedRoom.duration} phút</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bắt đầu:</span>
                      <span>{format(new Date(selectedRoom.startTime), "dd/MM/yyyy HH:mm", { locale: vi })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kết thúc:</span>
                      <span>{format(new Date(selectedRoom.endTime), "dd/MM/yyyy HH:mm", { locale: vi })}</span>
                    </div>
                    {selectedRoom.accessCode && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Mã truy cập:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{selectedRoom.accessCode}</span>
                          <Button variant="ghost" size="sm" onClick={() => handleCopyAccessCode(selectedRoom.accessCode)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 gradient-text">Thống kê</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Học sinh tham gia:</span>
                      <span className="font-semibold">{selectedRoom._count.participants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Số câu hỏi:</span>
                      <span className="font-semibold">{selectedRoom._count.questions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Đề thi:</span>
                      <span>{selectedRoom.ExamMatrix?.name || "Không có"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRoom.instructions && (
                <div>
                  <h4 className="font-semibold mb-2 gradient-text">Hướng dẫn làm bài</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedRoom.instructions}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2 gradient-text">Danh sách câu hỏi ({selectedRoom._count.questions})</h4>
                <div className="space-y-2">
                  {selectedRoom.questions.map((eq, idx) => (
                    <div key={eq.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg neu-shadow-inner">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="neu-shadow-sm">{idx + 1}</Badge>
                        <span className="text-sm">{eq.Question.content.substring(0, 100)}...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="neu-shadow-sm">{eq.questionType}</Badge>
                        <span className="text-sm text-gray-500">{eq.points} điểm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 gradient-text">Học sinh tham gia ({selectedRoom._count.participants})</h4>
                {selectedRoom.participants.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có học sinh nào tham gia</p>
                ) : (
                  <div className="space-y-2">
                    {selectedRoom.participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg neu-shadow-inner">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center neu-shadow-inner">
                            <span className="text-sm font-semibold text-blue-800">
                              {participant.Student.firstName?.[0] || participant.Student.email[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{participant.Student.firstName} {participant.Student.lastName}</p>
                            <p className="text-xs text-gray-500">{participant.Student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={participant.status === "submitted" ? "default" : "secondary"} className="neu-shadow-sm">
                            {participant.status === "submitted" ? "Đã nộp" : participant.status}
                          </Badge>
                          {participant.score !== null && (
                            <Badge className="bg-green-100 text-green-800 neu-shadow-sm">{participant.score} điểm</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <NeumorphicButton variant="outline" onClick={() => setViewDialogOpen(false)}>Đóng</NeumorphicButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
