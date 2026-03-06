"use client"

import { useState, useEffect } from "react"
import { Search, Check, X, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  name: string
  email: string
  idNumber?: string
  dateOfBirth?: string
  gender?: string
  role: string
}

interface AddStudentsToClassModalProps {
  isOpen: boolean
  onClose: () => void
  classId: string
  onStudentsAdded?: () => void
}

export function AddStudentsToClassModal({
  isOpen,
  onClose,
  classId,
  onStudentsAdded,
}: AddStudentsToClassModalProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [classStudents, setClassStudents] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      fetchAvailableStudents()
      fetchClassStudents()
    }
  }, [isOpen, classId])

  const fetchAvailableStudents = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/students?role=STUDENT")
      if (!response.ok) throw new Error("Failed to fetch students")
      
      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error("Error fetching students:", error)
      toast.error("Không thể tải danh sách học sinh")
    } finally {
      setLoading(false)
    }
  }

  const fetchClassStudents = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/students`)
      if (!response.ok) throw new Error("Failed to fetch class students")
      
      const data = await response.json()
      const studentIds = new Set((data.students || []).map((s: any) => s.studentId))
      setClassStudents(studentIds)
    } catch (error) {
      console.error("Error fetching class students:", error)
    }
  }

  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleSelectAll = () => {
    const availableStudents = filteredStudents.filter(
      (s) => !classStudents.has(s.id)
    )
    if (selectedStudents.size === availableStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(availableStudents.map((s) => s.id)))
    }
  }

  const handleAddStudents = async () => {
    if (selectedStudents.size === 0) {
      toast.error("Vui lòng chọn ít nhất một học sinh")
      return
    }

    setAdding(true)
    try {
      const response = await fetch(`/api/classes/${classId}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add students")
      }

      toast.success(`Đã thêm ${selectedStudents.size} học sinh vào lớp`)
      setSelectedStudents(new Set())
      onStudentsAdded?.()
      onClose()
    } catch (error: any) {
      console.error("Error adding students:", error)
      toast.error(error.message || "Không thể thêm học sinh")
    } finally {
      setAdding(false)
    }
  }

  const filteredStudents = students.filter((student) => {
    if (searchQuery) {
      return (
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.idNumber?.includes(searchQuery)
      )
    }
    return true
  })

  const availableStudents = filteredStudents.filter(
    (s) => !classStudents.has(s.id)
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Thêm học sinh vào lớp</DialogTitle>
          <DialogDescription>
            Chọn học sinh từ danh sách để thêm vào lớp học
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : availableStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Không tìm thấy học sinh"
                    : "Tất cả học sinh đã được thêm vào lớp hoặc chưa có học sinh nào"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        availableStudents.length > 0 &&
                        selectedStudents.size === availableStudents.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      Chọn tất cả ({availableStudents.length})
                    </span>
                  </div>
                  <Badge variant="outline">
                    Đã chọn: {selectedStudents.size}
                  </Badge>
                </div>
                {availableStudents.map((student) => (
                  <div
                    key={student.id}
                    className={cn(
                      "p-4 hover:bg-gray-50 transition-colors",
                      selectedStudents.has(student.id) && "bg-blue-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => handleToggleStudent(student.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {student.email}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          {student.idNumber && (
                            <span>Mã: {student.idNumber}</span>
                          )}
                          {student.dateOfBirth && (
                            <span>
                              Sinh: {new Date(student.dateOfBirth).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                          {student.gender && <span>{student.gender}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={adding}>
            Hủy
          </Button>
          <Button
            onClick={handleAddStudents}
            disabled={selectedStudents.size === 0 || adding}
          >
            {adding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang thêm...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Thêm {selectedStudents.size > 0 ? `${selectedStudents.size} ` : ""}học sinh
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
