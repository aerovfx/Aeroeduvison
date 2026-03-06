"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft,
  UserPlus,
  Search,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  Award,
  Calendar,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
}

interface ClassStudent {
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

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string

  const [classData, setClassData] = useState<Class | null>(null)
  const [students, setStudents] = useState<ClassStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddStudentsModalOpen, setIsAddStudentsModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null)

  useEffect(() => {
    if (classId) {
      fetchClassData()
      fetchStudents()
    }
  }, [classId])

  const fetchClassData = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}`)
      if (!response.ok) throw new Error("Failed to fetch class")
      
      const data = await response.json()
      setClassData(data.class)
    } catch (error: any) {
      console.error("Error fetching class:", error)
      toast.error("Không thể tải thông tin lớp học")
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/classes/${classId}/students`)
      if (!response.ok) throw new Error("Failed to fetch students")
      
      const data = await response.json()
      setStudents(data.students || [])
    } catch (error: any) {
      console.error("Error fetching students:", error)
      toast.error("Không thể tải danh sách học sinh")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveStudent = async (studentId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to remove student")
      
      toast.success("Đã xóa học sinh khỏi lớp")
      fetchStudents()
    } catch (error: any) {
      console.error("Error removing student:", error)
      toast.error("Không thể xóa học sinh")
    }
  }

  const filteredStudents = students.filter((student) => {
    if (searchQuery) {
      return (
        student.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student.idNumber?.includes(searchQuery)
      )
    }
    return true
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      transferred: "bg-yellow-100 text-yellow-800",
    }
    return variants[status] || "bg-gray-100 text-gray-800"
  }

  if (!classData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{classData.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>{classData.grade}</span>
                <span>•</span>
                <span>{classData.schoolYear}</span>
                {classData.description && (
                  <>
                    <span>•</span>
                    <span>{classData.description}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button onClick={() => setIsAddStudentsModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Thêm học sinh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b bg-gray-50 px-6 py-4">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              Tổng số học sinh
            </div>
            <div className="text-2xl font-bold">{students.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Đang học
            </div>
            <div className="text-2xl font-bold">
              {students.filter(s => s.status === "active").length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              Điểm TB lớp
            </div>
            <div className="text-2xl font-bold">
              {students.length > 0
                ? (students.reduce((sum, s) => sum + (s.averageScore || 0), 0) / students.length).toFixed(1)
                : "0.0"}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Tỷ lệ tham gia TB
            </div>
            <div className="text-2xl font-bold">
              {students.length > 0
                ? (students.reduce((sum, s) => sum + (s.attendanceRate || 0), 0) / students.length).toFixed(0)
                : "0"}%
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-4">
          <Tabs defaultValue="students" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="students">Danh sách học sinh</TabsTrigger>
                <TabsTrigger value="stats">Thống kê</TabsTrigger>
              </TabsList>
              <div className="max-w-md flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm học sinh..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <TabsContent value="students" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    {searchQuery ? "Không tìm thấy học sinh" : "Chưa có học sinh nào trong lớp"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsAddStudentsModalOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Thêm học sinh
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">STT</TableHead>
                        <TableHead>Họ và tên</TableHead>
                        <TableHead>Mã định danh</TableHead>
                        <TableHead>Ngày sinh</TableHead>
                        <TableHead>Giới tính</TableHead>
                        <TableHead>Điểm TB</TableHead>
                        <TableHead>Tham gia</TableHead>
                        <TableHead>XP</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student, index) => (
                        <TableRow key={student.id} className="hover:bg-muted/50">
                          <TableCell className="text-center">
                            {student.studentNumber || index + 1}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{student.student.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {student.student.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {student.student.idNumber || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {student.student.dateOfBirth
                                ? formatDate(student.student.dateOfBirth)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {student.student.gender || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {student.averageScore !== null && student.averageScore !== undefined ? (
                                <>
                                  <Award className="h-4 w-4 text-yellow-600" />
                                  <span className="font-medium">{student.averageScore.toFixed(1)}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.attendanceRate !== null && student.attendanceRate !== undefined ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={cn(
                                      "h-2 rounded-full",
                                      student.attendanceRate >= 80
                                        ? "bg-green-600"
                                        : student.attendanceRate >= 60
                                        ? "bg-yellow-600"
                                        : "bg-red-600"
                                    )}
                                    style={{ width: `${student.attendanceRate}%` }}
                                  />
                                </div>
                                <span className="text-sm">{student.attendanceRate.toFixed(0)}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{student.totalXP}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", getStatusBadge(student.status))}>
                              {student.status === "active" ? "Đang học" : 
                               student.status === "inactive" ? "Nghỉ học" : "Chuyển lớp"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedStudent(student)
                                  router.push(`/teacher/student/${student.studentId}`)
                                }}
                                title="Xem chi tiết"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveStudent(student.studentId)}
                                title="Xóa khỏi lớp"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats">
              <ClassStudentStats classId={classId} students={students} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Students Modal */}
      <AddStudentsToClassModal
        isOpen={isAddStudentsModalOpen}
        onClose={() => setIsAddStudentsModalOpen(false)}
        classId={classId}
        onStudentsAdded={() => {
          fetchStudents()
          setIsAddStudentsModalOpen(false)
        }}
      />
    </div>
  )
}
