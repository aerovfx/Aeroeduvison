import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { autoGrading } from "@/lib/agents/auto-grading"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { examRoomId, studentId, action } = body

    // Teacher can grade entire class, students can only grade their own
    if (studentId && studentId !== session.user.id && session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const targetStudentId = studentId || session.user.id

    if (action === 'bulk') {
      // Bulk grade for entire class (teacher only)
      if (session.user.role !== 'TEACHER') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const result = await autoGrading.bulkGradeExam(examRoomId)
      return NextResponse.json({ success: true, data: result })
    } else {
      // Grade individual student
      const result = await autoGrading.gradeExam(examRoomId, targetStudentId)
      return NextResponse.json({ success: true, data: result })
    }
  } catch (error: any) {
    console.error("Auto grading error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to grade exam" },
      { status: 500 }
    )
  }
}
