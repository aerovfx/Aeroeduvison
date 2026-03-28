import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const room = await db.onlineExamRoom.findUnique({
      where: { id },
      select: { teacherId: true },
    })
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }
    if (room.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { scheduleId } = body

    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 })
    }

    const schedule = await db.examRoomSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        Exam: {
          include: {
            examQuestions: {
              orderBy: { order: "asc" },
              include: {
                Question: { select: { id: true, questionType: true } },
              },
            },
          },
        },
      },
    })

    if (!schedule || schedule.examRoomId !== id) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      await tx.examRoomQuestion.deleteMany({
        where: { examRoomId: params.id },
      })

      if (schedule.Exam.examQuestions.length > 0) {
        await tx.examRoomQuestion.createMany({
          data: schedule.Exam.examQuestions.map((eq, idx) => ({
            examRoomId: id,
            questionId: eq.questionId,
            position: idx + 1,
            points: Number(eq.points) || 1.0,
            questionType: eq.Question?.questionType || "MCQ",
          })),
        })
      }

      await tx.examRoomSchedule.updateMany({
        where: { examRoomId: id },
        data: { isActive: false },
      })

      await tx.examRoomSchedule.update({
        where: { id: scheduleId },
        data: { isActive: true },
      })
    })

    return NextResponse.json({
      message: "Schedule activated",
      questionsImported: schedule.Exam.examQuestions.length,
      examTitle: schedule.Exam.title,
    })
  } catch (error) {
    console.error("Error activating schedule:", error)
    return NextResponse.json({ error: "Failed to activate schedule" }, { status: 500 })
  }
}
