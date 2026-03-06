import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/teacher/students - Get students with demo data for teacher dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all students (or students in teacher's classes)
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        idNumber: true,
        dateOfBirth: true,
        gender: true,
        xp: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 100, // Limit for performance
    })

    // Get ClassStudent data for demo metrics
    const classStudents = await prisma.classStudent.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
      },
      select: {
        studentId: true,
        averageScore: true,
        attendanceRate: true,
        totalXP: true,
        completedExams: true,
        passedExams: true,
        status: true,
      },
    })

    // Create a map of studentId to ClassStudent data
    const studentMetricsMap = new Map()
    classStudents.forEach(cs => {
      studentMetricsMap.set(cs.studentId, cs)
    })

    // Combine student data with metrics
    const studentsWithMetrics = students.map(student => {
      const metrics = studentMetricsMap.get(student.id)
      
      // Generate demo data if not in class
      const averageScore = metrics?.averageScore ?? (Math.random() * 30 + 60) // 60-90
      const attendanceRate = metrics?.attendanceRate ?? (Math.random() * 20 + 75) // 75-95
      const totalXP = metrics?.totalXP ?? student.xp ?? Math.floor(Math.random() * 500 + 500) // 500-1000
      const completedExams = metrics?.completedExams ?? Math.floor(Math.random() * 5 + 3) // 3-8
      const passedExams = metrics?.passedExams ?? Math.floor(completedExams * 0.8) // 80% pass rate
      
      // Calculate improvement (random for demo)
      const improvement = Math.floor(Math.random() * 20 - 5) // -5 to +15
      
      // Calculate progress (based on completed exams)
      const progress = Math.min(100, Math.round((completedExams / 10) * 100))
      
      // Determine emotion based on score
      let emotion: 'happy' | 'neutral' | 'sad' = 'neutral'
      if (averageScore >= 85) emotion = 'happy'
      else if (averageScore < 65) emotion = 'sad'
      
      // Determine if at risk
      const atRisk = averageScore < 60 || attendanceRate < 70
      
      // Calculate engagement
      const engagement = Math.round((averageScore * 0.5) + (attendanceRate * 0.3) + (Math.random() * 20))
      
      // Calculate streak (random for demo)
      const streak = Math.floor(Math.random() * 15)
      
      // Calculate last active (random for demo)
      const daysAgo = Math.floor(Math.random() * 7)
      let lastActive = ''
      if (daysAgo === 0) lastActive = 'Hôm nay'
      else if (daysAgo === 1) lastActive = '1 ngày trước'
      else lastActive = `${daysAgo} ngày trước`

      return {
        id: student.id,
        name: student.name || "Chưa có tên",
        email: student.email,
        avatar: student.gender === "Nam" ? "👨‍🎓" : "👩‍🎓",
        totalXP: totalXP,
        progress: progress,
        averageScore: Math.round(averageScore),
        improvement: improvement,
        attendanceRate: Math.round(attendanceRate),
        completedExams: completedExams,
        passedExams: passedExams,
        lessonsCompleted: completedExams, // Use exams as lessons for demo
        lastActive: lastActive,
        emotion: emotion,
        atRisk: atRisk,
        engagement: Math.min(100, engagement),
        streak: streak,
        status: metrics?.status || "active",
      }
    })

    // Sort by average score (descending) for top performers
    studentsWithMetrics.sort((a, b) => b.averageScore - a.averageScore)

    return NextResponse.json({
      students: studentsWithMetrics,
    })
  } catch (error: any) {
    console.error("Error fetching teacher students:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch students" },
      { status: 500 }
    )
  }
}
