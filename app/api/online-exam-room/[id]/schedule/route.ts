import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
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

    const schedules = await db.examRoomSchedule.findMany({
      where: { examRoomId: id },
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
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
  }
}

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
    const { examId, activeFrom, activeTo, label } = body

    if (!examId || !activeFrom || !activeTo) {
      return NextResponse.json(
        { error: "examId, activeFrom and activeTo are required" },
        { status: 400 }
      )
    }

    const from = new Date(activeFrom)
    const to = new Date(activeTo)
    if (to <= from) {
      return NextResponse.json(
        { error: "activeTo must be after activeFrom" },
        { status: 400 }
      )
    }

    const exam = await db.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true },
    })
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    const schedule = await db.examRoomSchedule.create({
      data: {
        examRoomId: id,
        examId,
        label: label || exam.title,
        activeFrom: from,
        activeTo: to,
      },
      include: {
        Exam: {
          select: { id: true, title: true, totalQuestions: true, examType: true },
        },
      },
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 })
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get("scheduleId")
    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 })
    }

    await db.examRoomSchedule.delete({ where: { id: scheduleId } })

    return NextResponse.json({ message: "Schedule deleted" })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 })
  }
}
