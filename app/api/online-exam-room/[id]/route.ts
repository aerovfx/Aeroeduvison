import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const examRoom = await db.onlineExamRoom.findUnique({
      where: { id: params.id },
      include: {
        ExamMatrix: true,
        Teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            Student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            answers: {
              select: {
                id: true,
                questionId: true,
                answer: true,
                isCorrect: true,
                pointsEarned: true,
              },
            },
          },
        },
        questions: {
          include: {
            Question: {
              select: {
                id: true,
                content: true,
                questionType: true,
                options: true,
                correctAnswer: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
        schedules: {
          include: {
            Exam: {
              select: {
                id: true,
                title: true,
                totalQuestions: true,
                examType: true,
              },
            },
          },
          orderBy: { activeFrom: "asc" },
        },
      },
    })

    if (!examRoom) {
      return NextResponse.json({ error: "Exam room not found" }, { status: 404 })
    }

    if (examRoom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ examRoom })
  } catch (error) {
    console.error("Error fetching exam room:", error)
    return NextResponse.json(
      { error: "Failed to fetch exam room" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      startTime,
      endTime,
      duration,
      status,
      isPublic,
      maxStudents,
    } = body

    const existingRoom = await db.onlineExamRoom.findUnique({
      where: { id: params.id },
    })

    if (!existingRoom) {
      return NextResponse.json({ error: "Exam room not found" }, { status: 404 })
    }

    if (existingRoom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updatedRoom = await db.onlineExamRoom.update({
      where: { id: params.id },
      data: {
        name,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        duration,
        status,
        isPublic,
        maxStudents,
      },
    })

    return NextResponse.json({ examRoom: updatedRoom })
  } catch (error) {
    console.error("Error updating exam room:", error)
    return NextResponse.json(
      { error: "Failed to update exam room" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingRoom = await db.onlineExamRoom.findUnique({
      where: { id: params.id },
    })

    if (!existingRoom) {
      return NextResponse.json({ error: "Exam room not found" }, { status: 404 })
    }

    if (existingRoom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.onlineExamRoom.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Exam room deleted" })
  } catch (error) {
    console.error("Error deleting exam room:", error)
    return NextResponse.json(
      { error: "Failed to delete exam room" },
      { status: 500 }
    )
  }
}
