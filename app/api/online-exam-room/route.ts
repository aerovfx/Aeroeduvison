import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const examRooms = await db.onlineExamRoom.findMany({
      where: {
        teacherId: session.user.id,
        ...(status && { status }),
      },
      include: {
        ExamMatrix: {
          select: {
            id: true,
            name: true,
            grade: true,
            examType: true,
          },
        },
        participants: {
          select: {
            id: true,
            status: true,
            Student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        questions: {
          select: {
            id: true,
            position: true,
            points: true,
            questionType: true,
            Question: {
              select: {
                id: true,
                content: true,
                questionType: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
        _count: {
          select: {
            participants: true,
            questions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ examRooms })
  } catch (error) {
    console.error("Error fetching exam rooms:", error)
    return NextResponse.json(
      { error: "Failed to fetch exam rooms" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log('Creating exam room with body:', body)

    const {
      name,
      description,
      examMatrixId,
      startTime,
      endTime,
      duration,
      isPublic,
      maxStudents,
      instructions,
      questionIds,
    } = body

    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Name, start time, and end time are required" },
        { status: 400 }
      )
    }

    const accessCode = Math.floor(100000 + Math.random() * 900000).toString()

    const examRoom = await db.onlineExamRoom.create({
      data: {
        name,
        description,
        teacherId: session.user.id,
        examMatrixId: examMatrixId || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: duration || 45,
        isPublic: isPublic || false,
        maxStudents: maxStudents || null,
        instructions: instructions || null,
        accessCode,
        status: "draft",
      },
    })

    if (questionIds && questionIds.length > 0) {
      await db.examRoomQuestion.createMany({
        data: questionIds.map((questionId: string, index: number) => ({
          examRoomId: examRoom.id,
          questionId,
          position: index + 1,
          points: 1.0,
          questionType: "MCQ",
        })),
      })

      const questions = await db.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, questionType: true },
      })

      for (const question of questions) {
        await db.examRoomQuestion.updateMany({
          where: {
            examRoomId: examRoom.id,
            questionId: question.id,
          },
          data: {
            questionType: question.questionType,
          },
        })
      }
    }

    const completeExamRoom = await db.onlineExamRoom.findUnique({
      where: { id: examRoom.id },
      include: {
        ExamMatrix: true,
        questions: {
          include: {
            Question: {
              select: {
                id: true,
                content: true,
                questionType: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    })

    return NextResponse.json({ examRoom: completeExamRoom })
  } catch (error: any) {
    console.error("Error creating exam room:", error)
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    return NextResponse.json(
      { error: error.message || "Failed to create exam room" },
      { status: 500 }
    )
  }
}
