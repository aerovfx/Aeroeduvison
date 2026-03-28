import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { examPrep } from "@/lib/agents/exam-prep"
import { checkAISubscription } from "@/lib/subscription-check"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    // ─── Create from Question Bank ───────────────────────
    if (action === "create") {
      const { subject, grade, examType, questionCount, timeLimit, topic } = body
      const practice = await examPrep.createFromQuestionBank(
        session.user.id,
        subject,
        grade,
        examType,
        questionCount || 30,
        timeLimit || 45,
        topic || undefined
      )

      return NextResponse.json({ success: true, data: { practice } })
    }

    // ─── Create from Teacher Exam ────────────────────────
    if (action === "create_from_exam") {
      const { examId, timeLimit } = body
      const practice = await examPrep.createFromTeacherExam(
        session.user.id,
        examId,
        timeLimit
      )

      return NextResponse.json({ success: true, data: { practice } })
    }

    // ─── Create from Exam Matrix ─────────────────────────
    if (action === "create_from_matrix") {
      const { matrixId, timeLimit } = body
      const practice = await examPrep.createFromExamMatrix(
        session.user.id,
        matrixId,
        timeLimit
      )

      return NextResponse.json({ success: true, data: { practice } })
    }

    // ─── Submit & Grade ──────────────────────────────────
    if (action === "submit") {
      const { practiceId, answers } = body
      const result = await examPrep.gradeAndAnalyze(practiceId, answers)

      return NextResponse.json({ success: true, data: { result } })
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

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")

    // ─── Student Stats ───────────────────────────────────
    if (action === "stats") {
      const stats = await examPrep.getStudentStats(session.user.id)
      return NextResponse.json({ success: true, data: { stats } })
    }

    // ─── Available Teacher Exams ─────────────────────────
    if (action === "teacher_exams") {
      const subject = searchParams.get("subject") || undefined
      const grade = searchParams.get("grade") || undefined
      const data = await examPrep.getAvailableTeacherExams(subject, grade)
      return NextResponse.json({ success: true, data })
    }

    // ─── Available Topics ───────────────────────────────
    if (action === "topics") {
      const subject = searchParams.get("subject") || "Toán học"
      const grade = searchParams.get("grade") || undefined
      const topics = await examPrep.getAvailableTopics(subject, grade)
      return NextResponse.json({ success: true, data: { topics } })
    }

    // ─── History ─────────────────────────────────────────
    if (action === "history") {
      const history = await examPrep.getHistory(session.user.id)
      return NextResponse.json({ success: true, data: { history } })
    }

    // Default: return stats
    const stats = await examPrep.getStudentStats(session.user.id)
    return NextResponse.json({ success: true, data: { stats } })
  } catch (error: any) {
    console.error("Exam prep error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get data" },
      { status: 500 }
    )
  }
}
