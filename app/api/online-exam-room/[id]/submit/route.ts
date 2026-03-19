import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: roomId } = await params
    const { answers } = await req.json()

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: "Dữ liệu bài làm không hợp lệ" }, { status: 400 })
    }

    const room = await db.onlineExamRoom.findUnique({
      where: { id: roomId },
      select: { teacherId: true },
    })
    if (!room) {
      return NextResponse.json({ error: "Phòng thi không tồn tại" }, { status: 404 })
    }

    let participant = await db.examRoomParticipant.findUnique({
      where: { examRoomId_studentId: { examRoomId: roomId, studentId: session.user.id } },
    })

    if (!participant && room.teacherId === session.user.id) {
      participant = await db.examRoomParticipant.create({
        data: { examRoomId: roomId, studentId: session.user.id, status: "taking" },
      })
    }

    if (!participant) {
      return NextResponse.json({ error: "Bạn không tham gia phòng thi này" }, { status: 403 })
    }

    if (participant.status === "submitted") {
      return NextResponse.json({ error: "Bạn đã nộp bài rồi" }, { status: 400 })
    }

    const roomQuestions = await db.examRoomQuestion.findMany({
      where: { examRoomId: roomId },
      include: { Question: { select: { correctAnswer: true, questionType: true } } },
    })

    const questionMap = new Map(roomQuestions.map(rq => [rq.id, rq]))

    let totalScore = 0
    const answerOps = []

    for (const ans of answers) {
      const { questionId, answer } = ans
      if (!questionId || answer === undefined || answer === null) continue

      const rq = questionMap.get(questionId)
      if (!rq) continue

      let isCorrect: boolean | null = null
      let pointsEarned = 0

      const qType = rq.Question.questionType
      const correctAns = rq.Question.correctAnswer

      if (qType === "MCQ" || qType === "SHORT_ANSWER") {
        isCorrect = answer.trim().toUpperCase() === (correctAns || "").trim().toUpperCase()
        pointsEarned = isCorrect ? rq.points : 0
      } else if (qType === "TRUE_FALSE") {
        isCorrect = answer.trim() === (correctAns || "").trim()
        pointsEarned = isCorrect ? rq.points : 0
      } else {
        isCorrect = null
        pointsEarned = 0
      }

      totalScore += pointsEarned

      answerOps.push(
        db.examRoomAnswer.upsert({
          where: { participantId_questionId: { participantId: participant.id, questionId } },
          create: {
            participantId: participant.id,
            questionId,
            answer: String(answer),
            isCorrect,
            pointsEarned,
          },
          update: {
            answer: String(answer),
            isCorrect,
            pointsEarned,
          },
        })
      )
    }

    await db.$transaction([
      ...answerOps,
      db.examRoomParticipant.update({
        where: { id: participant.id },
        data: { status: "submitted", submittedAt: new Date(), score: totalScore },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { score: totalScore, totalQuestions: roomQuestions.length, answeredCount: answerOps.length },
    })
  } catch (error: any) {
    console.error("Error submitting exam:", error)
    return NextResponse.json({ error: error.message || "Không thể nộp bài" }, { status: 500 })
  }
}
