import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get all exam participations for this student
    const participants = await db.examRoomParticipant.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        status: true,
        score: true,
        submittedAt: true,
        joinedAt: true,
        ExamRoom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    })

    const submitted = participants.filter((p) => p.status === "submitted")
    const totalExams = submitted.length
    const scores = submitted
      .map((p) => p.score)
      .filter((s): s is number => s !== null)

    const averageScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0

    // Recent exams (last 5)
    const recentExams = submitted.slice(0, 5).map((p) => ({
      id: p.id,
      title: p.ExamRoom?.name || "Bài kiểm tra",
      score: p.score,
      submittedAt: p.submittedAt?.toISOString() || p.joinedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      count: totalExams,
      avgScore: averageScore,
      highestScore,
      lowestScore,
      recentExams,
    })
  } catch (error: any) {
    console.error("Exam stats error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch exam stats" },
      { status: 500 }
    )
  }
}
