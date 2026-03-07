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
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { cn } from "@/lib/utils"

interface Class {
  id: string
  name: string
  grade: string
  schoolYear: string
  description?: string
  studentCount: number
  createdAt: string
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Quản lý Lớp học</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tạo và quản lý lớp học, thêm học sinh vào lớp
              </p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo Lớp
            </Button>
          </div>

          {/* Search */}
          <div className="max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm lớp học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Chưa có lớp học nào</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo lớp học đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{cls.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>{cls.grade}</span>
                        <span>•</span>
                        <Calendar className="h-4 w-4" />
                        <span>{cls.schoolYear}</span>
                      </div>
                      {cls.description && (
                        <p className="text-sm text-muted-foreground">{cls.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {cls.studentCount} học sinh
                      </span>
                    </div>
                    <Badge variant="outline">{cls.studentCount > 0 ? "Có học sinh" : "Trống"}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/teacher/classes/${cls.id}`)}
                      className="flex-1"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Xem chi tiết
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedClass(cls.id)
                        setIsAddStudentsModalOpen(true)
                      }}
                      className="flex-1"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Thêm HS
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setClassToDelete(cls.id)
                        setDeleteDialogOpen(true)
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo lớp học mới</DialogTitle>
            <DialogDescription>
              Tạo lớp học mới để quản lý học sinh
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tên lớp <span className="text-red-500">*</span>
              </label>
              <Input
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                placeholder="Ví dụ: Lớp 9A1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Khối</label>
                <Select
                  value={newClass.grade}
                  onValueChange={(value) => setNewClass({ ...newClass, grade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={`Khối ${num}`}>
                        Khối {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Năm học</label>
                <Input
                  value={newClass.schoolYear}
                  onChange={(e) => setNewClass({ ...newClass, schoolYear: e.target.value })}
                  placeholder="2025-2026"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Mô tả (tùy chọn)</label>
              <Input
                value={newClass.description}
                onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                placeholder="Mô tả về lớp học..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateClass}>
              Tạo lớp
            </Button>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lớp học này? Tất cả học sinh trong lớp sẽ bị xóa khỏi lớp. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClassToDelete(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => classToDelete && handleDeleteClass(classToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
