import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: roomId } = await params

    const examRoom = await db.onlineExamRoom.findUnique({
      where: { id: roomId },
      include: {
        Teacher: { select: { name: true } },
        questions: {
          include: {
            Question: {
              select: { id: true, content: true, options: true, questionType: true, explanation: true },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    })

    if (!examRoom) {
      return NextResponse.json({ error: "Phòng thi không tồn tại" }, { status: 404 })
    }

    const isTeacher = examRoom.teacherId === session.user.id

    const participant = await db.examRoomParticipant.findUnique({
      where: { examRoomId_studentId: { examRoomId: roomId, studentId: session.user.id } },
      include: { answers: true },
    })

    if (!isTeacher && !participant) {
      return NextResponse.json({ error: "Bạn chưa tham gia phòng thi này" }, { status: 403 })
    }

    const questions = examRoom.questions.map(eq => ({
      id: eq.id,
      position: eq.position,
      questionType: eq.questionType,
      points: eq.points,
      content: eq.Question.content,
      options: eq.Question.options,
    }))

    const savedAnswers: Record<string, string> = {}
    if (participant?.answers) {
      for (const a of participant.answers) {
        savedAnswers[a.questionId] = a.answer
      }
    }

    const schedules = await db.examRoomSchedule.findMany({
      where: { examRoomId: roomId },
      include: {
        Exam: { select: { id: true, title: true, totalQuestions: true, examType: true } },
      },
      orderBy: { activeFrom: "asc" },
    })

    const now = new Date()
    const nextSchedules = schedules
      .filter(s => new Date(s.activeFrom) > now)
      .map(s => ({
        id: s.id,
        label: s.label,
        activeFrom: s.activeFrom.toISOString(),
        activeTo: s.activeTo.toISOString(),
        isActive: s.isActive,
        examTitle: s.Exam.title,
        examQuestions: s.Exam.totalQuestions,
      }))

    return NextResponse.json({
      success: true,
      data: {
        examRoom: {
          id: examRoom.id,
          name: examRoom.name,
          description: examRoom.description,
          duration: examRoom.duration,
          status: examRoom.status,
          startTime: examRoom.startTime.toISOString(),
          endTime: examRoom.endTime.toISOString(),
          accessCode: examRoom.accessCode,
          teacherName: examRoom.Teacher?.name || "Giáo viên",
          instructions: examRoom.instructions,
        },
        questions,
        participantId: participant?.id || null,
        participantStatus: participant?.status || (isTeacher ? "teacher" : null),
        savedAnswers,
        isTeacher,
        nextSchedules,
        participantScore: participant?.score ?? null,
      },
    })
  } catch (error: any) {
    console.error("Error loading exam:", error)
    return NextResponse.json({ error: error.message || "Không thể tải đề thi" }, { status: 500 })
  }
}
