"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  UserPlus,
  BarChart3,
  Calendar,
  GraduationCap,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddStudentsToClassModal } from "@/components/class-management/add-students-modal"
import { ClassStudentStats } from "@/components/class-management/student-stats"
import { toast } from "react-hot-toast"
import "@/styles/neumorphic-theme.css"

interface Class {
  id: string
  name: string
  grade: string
  schoolYear: string
  description?: string
  studentCount: number
  createdAt: string
}

// Neumorphic Button Component
function NeuButton({
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
  const baseStyles = {
    default: "var(--neu-button-bg)",
    primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    danger: "linear-gradient(135deg, #f56565 0%, #c53030 100%)",
    ghost: "transparent",
  }

  const sizeStyles = {
    default: "px-4 py-2",
    sm: "px-3 py-1.5 text-sm",
    icon: "p-2",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizeStyles[size]} ${className} transition-all duration-300 flex items-center justify-center gap-2 font-semibold rounded-xl`}
      style={{
        background: variant === "ghost" ? "transparent" : baseStyles[variant],
        color: variant === "primary" || variant === "danger" ? "white" : "var(--neu-text-primary)",
        border: variant === "ghost" ? "none" : "1px solid var(--neu-border)",
        boxShadow: variant === "ghost" ? "none" : `
          6px 6px 12px var(--neu-shadow-dark),
          -6px -6px 12px var(--neu-shadow-light),
          inset 1px 1px 2px var(--neu-shadow-inset-dark)
        `,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (variant !== "ghost" && !disabled) {
          e.currentTarget.style.transform = "translateY(-2px)"
          e.currentTarget.style.boxShadow = `
            8px 8px 16px var(--neu-shadow-dark),
            -8px -8px 16px var(--neu-shadow-light)
          `
        }
      }}
      onMouseLeave={(e) => {
        if (variant !== "ghost" && !disabled) {
          e.currentTarget.style.transform = "translateY(0)"
          e.currentTarget.style.boxShadow = `
            6px 6px 12px var(--neu-shadow-dark),
            -6px -6px 12px var(--neu-shadow-light),
            inset 1px 1px 2px var(--neu-shadow-inset-dark)
          `
        }
      }}
    >
      {children}
    </button>
  )
}

// Neumorphic Input Component
function NeuInput({
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
      className={`${className} w-full px-4 py-2.5 rounded-xl transition-all duration-300`}
      style={{
        background: "var(--neu-input-bg)",
        color: "var(--neu-text-primary)",
        border: "1px solid var(--neu-border)",
        boxShadow: `
          inset 4px 4px 8px var(--neu-shadow-inset-dark),
          inset -4px -4px 8px var(--neu-shadow-inset-light)
        `,
        outline: "none",
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `
          inset 6px 6px 12px var(--neu-shadow-inset-dark),
          inset -6px -6px 12px var(--neu-shadow-inset-light),
          0 0 0 3px var(--neu-input-focus-ring)
        `
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = `
          inset 4px 4px 8px var(--neu-shadow-inset-dark),
          inset -4px -4px 8px var(--neu-shadow-inset-light)
        `
      }}
    />
  )
}

// Neumorphic Card Component
function NeuCard({ children, className = "", hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`${className} transition-all duration-400`}
      style={{
        background: "var(--neu-card-bg)",
        borderRadius: "24px",
        padding: "24px",
        boxShadow: `
          10px 10px 20px var(--neu-shadow-dark),
          -10px -10px 20px var(--neu-shadow-light),
          inset 1px 1px 2px var(--neu-shadow-inset-dark)
        `,
        border: "1px solid var(--neu-border)",
        ...(hover && {
          ":hover": {
            transform: "translateY(-4px)",
            background: "var(--neu-card-hover-bg)",
          },
        }),
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.transform = "translateY(-4px)"
          e.currentTarget.style.boxShadow = `
            14px 14px 28px var(--neu-shadow-dark),
            -14px -14px 28px var(--neu-shadow-light)
          `
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.transform = "translateY(0)"
          e.currentTarget.style.boxShadow = `
            10px 10px 20px var(--neu-shadow-dark),
            -10px -10px 20px var(--neu-shadow-light),
            inset 1px 1px 2px var(--neu-shadow-inset-dark)
          `
        }
      }}
    >
      {children}
    </div>
  )
}

// Neumorphic Badge Component
function NeuBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "empty" }) {
  const variants = {
    default: { bg: "rgba(102, 126, 234, 0.15)", color: "var(--neu-accent-primary)", border: "rgba(102, 126, 234, 0.3)" },
    success: { bg: "rgba(72, 187, 120, 0.15)", color: "var(--neu-accent-success)", border: "rgba(72, 187, 120, 0.3)" },
    warning: { bg: "rgba(237, 137, 54, 0.15)", color: "var(--neu-accent-warning)", border: "rgba(237, 137, 54, 0.3)" },
    empty: { bg: "rgba(160, 174, 192, 0.15)", color: "var(--neu-text-muted)", border: "rgba(160, 174, 192, 0.3)" },
  }

  return (
    <span
      className="px-3 py-1 rounded-lg text-xs font-bold"
      style={{
        background: variants[variant].bg,
        color: variants[variant].color,
        border: `1px solid ${variants[variant].border}`,
        boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)",
      }}
    >
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
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #e8ebf0 0%, #d8dee8 50%, #e0e5ec 100%)",
        backgroundSize: "200% 200%",
        animation: "gradientShift 15s ease infinite",
        padding: "24px 32px",
      }}
    >
      {/* Header */}
      <div
        className="neu-header mb-8"
        style={{ animation: "fadeIn 0.8s ease-out" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              style={{
                width: "52px",
                height: "52px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px rgba(255,255,255,0.9)",
              }}
            >
              <School className="h-7 w-7" />
            </div>
            <div>
              <h1
                className="text-3xl font-bold"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-1px",
                }}
              >
                Quản lý Lớp học
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--neu-text-secondary)", fontWeight: 500 }}
              >
                Tạo và quản lý lớp học, thêm học sinh vào lớp
              </p>
            </div>
          </div>
          <NeuButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Tạo Lớp
          </NeuButton>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"
              style={{ color: "var(--neu-text-muted)" }}
            />
            <NeuInput
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
        <div
          className="flex items-center justify-center py-16"
          style={{
            background: "var(--neu-card-bg)",
            borderRadius: "20px",
            padding: "32px",
            boxShadow: "inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)",
            border: "1px solid var(--neu-border)",
          }}
        >
          <Loader2
            className="h-10 w-10 animate-spin mr-3"
            style={{ color: "var(--neu-accent-primary)" }}
          />
          <span style={{ color: "var(--neu-text-secondary)", fontWeight: 500 }}>Đang tải danh sách lớp...</span>
        </div>
      ) : filteredClasses.length === 0 ? (
        <NeuCard hover={false} className="text-center">
          <div className="flex flex-col items-center justify-center py-12">
            <div
              style={{
                width: "80px",
                height: "80px",
                background: "linear-gradient(145deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.05) 100%)",
                borderRadius: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
              }}
            >
              <Users className="h-10 w-10" style={{ color: "var(--neu-accent-primary)" }} />
            </div>
            <p className="text-lg font-semibold mb-2" style={{ color: "var(--neu-text-primary)" }}>
              Chưa có lớp học nào
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--neu-text-secondary)" }}>
              Tạo lớp học đầu tiên để bắt đầu quản lý
            </p>
            <NeuButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo lớp học đầu tiên
            </NeuButton>
          </div>
        </NeuCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => (
            <NeuCard key={cls.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3
                    className="text-lg font-bold mb-3"
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {cls.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                    <span
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{
                        background: "rgba(102, 126, 234, 0.1)",
                        color: "var(--neu-accent-primary)",
                        boxShadow: "inset 2px 2px 4px rgba(102, 126, 234, 0.15), inset -2px -2px 4px rgba(255,255,255,0.5)",
                      }}
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      {cls.grade}
                    </span>
                    <span style={{ color: "var(--neu-text-muted)" }}>•</span>
                    <span
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{
                        background: "rgba(118, 75, 162, 0.1)",
                        color: "var(--neu-accent-secondary)",
                        boxShadow: "inset 2px 2px 4px rgba(118, 75, 162, 0.15), inset -2px -2px 4px rgba(255,255,255,0.5)",
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {cls.schoolYear}
                    </span>
                  </div>
                  {cls.description && (
                    <p className="text-sm mt-2" style={{ color: "var(--neu-text-secondary)" }}>
                      {cls.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: "1px solid var(--neu-border)" }}>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" style={{ color: "var(--neu-accent-info)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--neu-text-primary)" }}>
                    {cls.studentCount} học sinh
                  </span>
                </div>
                <NeuBadge variant={cls.studentCount > 0 ? "success" : "empty"}>
                  {cls.studentCount > 0 ? "Có học sinh" : "Trống"}
                </NeuBadge>
              </div>

              <div className="flex items-center gap-2">
                <NeuButton
                  variant="default"
                  size="sm"
                  onClick={() => router.push(`/teacher/classes/${cls.id}`)}
                  className="flex-1 text-xs"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Xem chi tiết
                </NeuButton>
                <NeuButton
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setSelectedClass(cls.id)
                    setIsAddStudentsModalOpen(true)
                  }}
                  className="flex-1 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Thêm HS
                </NeuButton>
                <NeuButton
                  variant="danger"
                  size="icon"
                  onClick={() => {
                    setClassToDelete(cls.id)
                    setDeleteDialogOpen(true)
                  }}
                  className="w-10 h-10 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </NeuButton>
              </div>
            </NeuCard>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent
          style={{
            background: "var(--neu-card-bg)",
            borderRadius: "24px",
            border: "1px solid var(--neu-border)",
            boxShadow: `
              20px 20px 40px var(--neu-shadow-dark),
              -20px -20px 40px var(--neu-shadow-light),
              inset 1px 1px 2px var(--neu-shadow-inset-dark)
            `,
            color: "var(--neu-text-primary)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontSize: "1.5rem",
                fontWeight: "700",
              }}
            >
              Tạo lớp học mới
            </DialogTitle>
            <DialogDescription style={{ color: "var(--neu-text-secondary)" }}>
              Tạo lớp học mới để quản lý học sinh
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-bold mb-2 block" style={{ color: "var(--neu-text-primary)" }}>
                Tên lớp <span className="text-red-500">*</span>
              </label>
              <NeuInput
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                placeholder="Ví dụ: Lớp 9A1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold mb-2 block" style={{ color: "var(--neu-text-primary)" }}>Khối</label>
                <Select
                  value={newClass.grade}
                  onValueChange={(value) => setNewClass({ ...newClass, grade: value })}
                >
                  <SelectTrigger
                    style={{
                      background: "var(--neu-input-bg)",
                      color: "var(--neu-text-primary)",
                      border: "1px solid var(--neu-border)",
                      borderRadius: "12px",
                      boxShadow: "inset 3px 3px 6px var(--neu-shadow-inset-dark), inset -3px -3px 6px var(--neu-shadow-inset-light)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "var(--neu-card-bg)",
                      border: "1px solid var(--neu-border)",
                      borderRadius: "12px",
                      boxShadow: "8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light)",
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={`Khối ${num}`} style={{ color: "var(--neu-text-primary)" }}>
                        Khối {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-bold mb-2 block" style={{ color: "var(--neu-text-primary)" }}>Năm học</label>
                <NeuInput
                  value={newClass.schoolYear}
                  onChange={(e) => setNewClass({ ...newClass, schoolYear: e.target.value })}
                  placeholder="2025-2026"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold mb-2 block" style={{ color: "var(--neu-text-primary)" }}>Mô tả (tùy chọn)</label>
              <NeuInput
                value={newClass.description}
                onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                placeholder="Mô tả về lớp học..."
              />
            </div>
          </div>
          <DialogFooter>
            <NeuButton variant="default" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </NeuButton>
            <NeuButton variant="primary" onClick={handleCreateClass}>
              Tạo lớp
            </NeuButton>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent
          style={{
            background: "var(--neu-card-bg)",
            borderRadius: "24px",
            border: "1px solid var(--neu-border)",
            boxShadow: `
              20px 20px 40px var(--neu-shadow-dark),
              -20px -20px 40px var(--neu-shadow-light)
            `,
            color: "var(--neu-text-primary)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle
              style={{
                background: "linear-gradient(135deg, #f56565 0%, #c53030 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontSize: "1.3rem",
                fontWeight: "700",
              }}
            >
              Xác nhận xóa
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--neu-text-secondary)" }}>
              Bạn có chắc chắn muốn xóa lớp học này? Tất cả học sinh trong lớp sẽ bị xóa khỏi lớp. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <NeuButton variant="default" onClick={() => setClassToDelete(null)}>
              Hủy
            </NeuButton>
            <NeuButton variant="danger" onClick={() => classToDelete && handleDeleteClass(classToDelete)}>
              Xóa
            </NeuButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
