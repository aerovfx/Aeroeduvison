import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const examRoom = await db.onlineExamRoom.findUnique({
      where: { id: params.id },
      include: {
        questions: { include: { Question: { select: { id: true, content: true, options: true, questionType: true } } }, orderBy: { position: "asc" } },
      },
    })

    if (!examRoom) return NextResponse.json({ error: "Phòng thi không tồn tại" }, { status: 404 })

    const participant = await db.examRoomParticipant.findUnique({
      where: { examRoomId_studentId: { examRoomId: params.id, studentId: session.user.id } },
    })

    if (!participant) return NextResponse.json({ error: "Bạn không tham gia phòng thi này" }, { status: 403 })

    const questions = examRoom.questions.map((eq) => ({
      id: eq.id, position: eq.position, questionType: eq.questionType, content: eq.Question.content, options: eq.Question.options, points: eq.points,
    }))

    return NextResponse.json({
      success: true,
      data: {
        examRoom: { id: examRoom.id, name: examRoom.name, description: examRoom.description, duration: examRoom.duration, status: examRoom.status },
        questions, participantId: participant.id,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Không thể tải đề thi" }, { status: 500 })
  }
}
