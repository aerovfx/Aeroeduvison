"use client"

import { BarChart3, TrendingUp, Award, Users, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ClassStudent {
  id: string
  student: {
    name: string
  }
  attendanceRate?: number
  averageScore?: number
  totalXP: number
  completedExams: number
  passedExams: number
}

interface ClassStudentStatsProps {
  classId: string
  students: ClassStudent[]
}

export function ClassStudentStats({ classId, students }: ClassStudentStatsProps) {
  const stats = {
    total: students.length,
    averageScore:
      students.length > 0
        ? students.reduce((sum, s) => sum + (s.averageScore || 0), 0) / students.length
        : 0,
    averageAttendance:
      students.length > 0
        ? students.reduce((sum, s) => sum + (s.attendanceRate || 0), 0) / students.length
        : 0,
    totalXP: students.reduce((sum, s) => sum + s.totalXP, 0),
    totalExams: students.reduce((sum, s) => sum + s.completedExams, 0),
    passedExams: students.reduce((sum, s) => sum + s.passedExams, 0),
  }

  const passRate =
    stats.totalExams > 0 ? (stats.passedExams / stats.totalExams) * 100 : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Điểm trung bình lớp</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            Từ {stats.total} học sinh
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tỷ lệ tham gia TB</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageAttendance.toFixed(0)}%</div>
          <p className="text-xs text-muted-foreground">
            Trung bình lớp
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng XP</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalXP.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            XP trung bình: {stats.total > 0 ? Math.round(stats.totalXP / stats.total) : 0}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng số bài thi</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalExams}</div>
          <p className="text-xs text-muted-foreground">
            Đã hoàn thành
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tỷ lệ đạt</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{passRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.passedExams}/{stats.totalExams} bài thi
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng số học sinh</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            Trong lớp học
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
