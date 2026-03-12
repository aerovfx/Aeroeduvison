import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { examPrep } from "@/lib/agents/exam-prep"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, subject, grade, examType, questionCount, timeLimit, practiceId, answers } = body

    if (action === 'create') {
      const practice = await examPrep.createPracticeExam(
        session.user.id,
        subject,
        grade,
        examType,
        questionCount || 30,
        timeLimit || 45
      )

      return NextResponse.json({
        success: true,
        data: { practice }
      })
    }

    if (action === 'submit') {
      const result = await examPrep.gradeAndAnalyze(practiceId, answers)

      return NextResponse.json({
        success: true,
        data: { result }
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Exam prep error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stats = await examPrep.getStudentStats(session.user.id)

    return NextResponse.json({
      success: true,
      data: { stats }
    })
  } catch (error: any) {
    console.error("Exam prep stats error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get stats" },
      { status: 500 }
    )
  }
}
