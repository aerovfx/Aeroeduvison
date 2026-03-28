import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/teacher/students/[studentId] - Get single student detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await params

    // Get student data
    const student = await prisma.user.findUnique({
      where: {
        id: studentId,
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
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Get ClassStudent data for metrics
    const classStudent = await prisma.classStudent.findFirst({
      where: {
        studentId: student.id,
      },
      select: {
        averageScore: true,
        attendanceRate: true,
        totalXP: true,
        completedExams: true,
        passedExams: true,
        status: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calculate derived metrics
    const totalXP = classStudent?.totalXP || student.xp || 0
    const averageScore = classStudent?.averageScore || 0
    const progress = averageScore // Use average score as progress indicator
    const lessonsCompleted = classStudent?.completedExams || 0
    const lastActive = student.updatedAt
      ? new Date(student.updatedAt).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "Chưa có dữ liệu"

    // Generate demo metrics (in production, calculate from real data)
    const engagement = Math.min(95, Math.max(50, averageScore + Math.random() * 20))
    const emotion = engagement >= 80 ? "happy" : engagement >= 60 ? "neutral" : "sad"
    const atRisk = engagement < 60 || averageScore < 60
    const streak = Math.floor(Math.random() * 15)

    // Calculate avatar emoji based on gender
    const avatar = student.gender === "Nữ" ? "👩‍🎓" : "👨‍🎓"

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        avatar,
        totalXP,
        progress: Math.round(progress),
        averageScore: Math.round(averageScore),
        lessonsCompleted,
        lastActive,
        emotion,
        atRisk,
        engagement: Math.round(engagement),
        streak,
        idNumber: student.idNumber,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        joinedAt: student.createdAt.toISOString(),
        className: classStudent?.class?.name || "Chưa có lớp",
      },
    })
  } catch (error: any) {
    console.error("Error fetching student detail:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch student detail" },
      { status: 500 }
    )
  }
}
