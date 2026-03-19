"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  Users,
  Trash2,
  UserPlus,
  BarChart3,
  Calendar,
  GraduationCap,
  Loader2,
  School
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddStudentsToClassModal } from "@/components/class-management/add-students-modal"
import { toast } from "react-hot-toast"

interface Class {
  id: string
  name: string
  grade: string
  schoolYear: string
  description?: string
  studentCount: number
  createdAt: string
}

// AI Native button
function ActionButton({
  children,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "primary" | "danger" | "ghost"
  size?: "default" | "sm" | "icon"
  className?: string
  disabled?: boolean
}) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-sm" : size === "icon" ? "p-2" : "px-4 py-2"
  const variantClass =
    variant === "primary" ? "ai-button-primary text-white" :
    variant === "danger" ? "bg-[hsl(var(--destructive))] text-white border-none hover:opacity-90" :
    variant === "ghost" ? "bg-transparent border-transparent hover:bg-white/5" :
    "ai-button text-gray-900"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClass} ${variantClass} ${className} rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

// AI Native input
function NativeInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`ai-input neu-input w-full px-4 py-2.5 rounded-xl ${className}`}
    />
  )
}

// AI Native badge
function StatusBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "empty" }) {
  const variantClass = {
    default: "bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200",
    success: "bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200",
    warning: "bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-[hsl(var(--warning)/0.3)]",
    empty: "bg-white/5 text-gray-600 border-gray-200",
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variantClass[variant]}`}>
      {children}
    </span>
  )
}

export default function ClassesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAddStudentsModalOpen, setIsAddStudentsModalOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<string | null>(null)

  // Create class form
  const [newClass, setNewClass] = useState({
    name: "",
    grade: "Khối 9",
    schoolYear: "2025-2026",
    description: "",
  })

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/classes")
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch classes")
      }

      const data = await response.json()
      setClasses(data.classes || [])
    } catch (error: any) {
      console.error("Error fetching classes:", error)
      toast.error(error.message || "Không thể tải danh sách lớp học")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClass = async () => {
    if (!newClass.name.trim()) {
      toast.error("Vui lòng nhập tên lớp")
      return
    }

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newClass),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create class")
      }

      toast.success("Đã tạo lớp học thành công")
      setIsCreateModalOpen(false)
      setNewClass({ name: "", grade: "Khối 9", schoolYear: "2025-2026", description: "" })
      fetchClasses()
    } catch (error: any) {
      console.error("Error creating class:", error)
      toast.error(error.message || "Không thể tạo lớp học")
    }
  }

  const handleDeleteClass = async (id: string) => {
    try {
      const response = await fetch(`/api/classes/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete class")

      toast.success("Đã xóa lớp học")
      fetchClasses()
      setDeleteDialogOpen(false)
      setClassToDelete(null)
    } catch (error: any) {
      console.error("Error deleting class:", error)
      toast.error(error.message || "Không thể xóa lớp học")
    }
  }

  const filteredClasses = classes.filter((cls) => {
    if (searchQuery) {
      return (
        cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.schoolYear.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return true
  })

  return (
    <div className="neu-container min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* AI Native Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "var(--gradient-primary)", boxShadow: "var(--glow-primary)" }}>
              <School className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-purple-600 tracking-tight">Quản lý Lớp học</h1>
              <p className="text-sm text-gray-600 mt-0.5">Tạo và quản lý lớp học, thêm học sinh vào lớp</p>
            </div>
          </div>
          <ActionButton className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Tạo Lớp
          </ActionButton>
        </div>

        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
            <NativeInput
              placeholder="Tìm kiếm lớp học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>
        </div>
      </div>

      {/* Classes List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 glass-panel rounded-xl">
          <Loader2 className="h-10 w-10 animate-spin mr-3 text-purple-600" />
          <span className="text-gray-600 font-medium">Đang tải danh sách lớp...</span>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 rounded-2xl p-8 text-center">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-[hsl(var(--primary)/0.15)] border border-purple-200">
              <Users className="h-10 w-10 text-purple-600" />
            </div>
            <p className="text-lg font-semibold mb-2 text-gray-900">Chưa có lớp học nào</p>
            <p className="text-sm mb-6 text-gray-600">Tạo lớp học đầu tiên để bắt đầu quản lý</p>
            <ActionButton className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo lớp học đầu tiên
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-100 rounded-2xl p-6 transition-all duration-300 hover:border-[hsl(var(--primary)/0.2)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-3 text-purple-600 truncate">{cls.name}</h3>
                  <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--primary)/0.12)] text-purple-600 border border-[hsl(var(--primary)/0.2)]">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                      {cls.grade}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--secondary)/0.12)] text-[hsl(var(--secondary))] border border-[hsl(var(--secondary)/0.2)]">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {cls.schoolYear}
                    </span>
                  </div>
                  {cls.description && (
                    <p className="text-sm mt-2 text-gray-600 line-clamp-2">{cls.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-bold text-gray-900">{cls.studentCount} học sinh</span>
                </div>
                <StatusBadge variant={cls.studentCount > 0 ? "success" : "empty"}>
                  {cls.studentCount > 0 ? "Có học sinh" : "Trống"}
                </StatusBadge>
              </div>

              <div className="flex items-center gap-2">
                <ActionButton className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700" size="sm" onClick={() => router.push(`/teacher/classes/${cls.id}`)} className="flex-1 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Xem chi tiết
                </ActionButton>
                <ActionButton
                  className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                  size="sm"
                  onClick={() => {
                    setSelectedClass(cls.id)
                    setIsAddStudentsModalOpen(true)
                  }}
                  className="flex-1 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Thêm HS
                </ActionButton>
                <ActionButton
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  size="icon"
                  onClick={() => {
                    setClassToDelete(cls.id)
                    setDeleteDialogOpen(true)
                  }}
                  className="shrink-0 w-10 h-10 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal — AI Native */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="glass-panel border-gray-200 rounded-2xl shadow-[var(--shadow-xl)] text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-purple-600 text-xl font-bold">Tạo lớp học mới</DialogTitle>
            <DialogDescription className="text-gray-600">Tạo lớp học mới để quản lý học sinh</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-bold mb-2 block text-gray-900">
                Tên lớp <span className="text-red-600">*</span>
              </label>
              <NativeInput
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                placeholder="Ví dụ: Lớp 9A1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold mb-2 block text-gray-900">Khối</label>
                <Select value={newClass.grade} onValueChange={(value) => setNewClass({ ...newClass, grade: value })}>
                  <SelectTrigger className="ai-input neu-input border-gray-200 rounded-xl bg-[hsl(var(--input-background))] text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-gray-200 rounded-xl">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={`Khối ${num}`} className="text-gray-900">
                        Khối {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-bold mb-2 block text-gray-900">Năm học</label>
                <NativeInput
                  value={newClass.schoolYear}
                  onChange={(e) => setNewClass({ ...newClass, schoolYear: e.target.value })}
                  placeholder="2025-2026"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold mb-2 block text-gray-900">Mô tả (tùy chọn)</label>
              <NativeInput
                value={newClass.description}
                onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                placeholder="Mô tả về lớp học..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <ActionButton className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700" onClick={() => setIsCreateModalOpen(false)}>Hủy</ActionButton>
            <ActionButton className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" onClick={handleCreateClass}>Tạo lớp</ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Students Modal */}
      {selectedClass && (
        <AddStudentsToClassModal
          isOpen={isAddStudentsModalOpen}
          onClose={() => {
            setIsAddStudentsModalOpen(false)
            setSelectedClass(null)
          }}
          classId={selectedClass}
          onStudentsAdded={() => {
            fetchClasses()
            setIsAddStudentsModalOpen(false)
            setSelectedClass(null)
          }}
        />
      )}

      {/* Delete Confirmation — AI Native */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-panel border-gray-200 rounded-2xl shadow-[var(--shadow-xl)] text-gray-900 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 text-xl font-bold">Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Bạn có chắc chắn muốn xóa lớp học này? Tất cả học sinh trong lớp sẽ bị xóa khỏi lớp. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <ActionButton className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700" onClick={() => { setDeleteDialogOpen(false); setClassToDelete(null); }}>Hủy</ActionButton>
            <ActionButton className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600" onClick={() => classToDelete && handleDeleteClass(classToDelete)}>Xóa</ActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
