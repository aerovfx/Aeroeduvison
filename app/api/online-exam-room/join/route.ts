import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { accessCode, roomId } = body

    let room: {
      id: string; name: string; status: string; isPublic: boolean
      maxStudents: number | null; _count: { participants: number }
    } | null = null

    if (roomId && typeof roomId === "string") {
      room = await db.onlineExamRoom.findUnique({
        where: { id: roomId },
        select: {
          id: true, name: true, status: true, isPublic: true,
          maxStudents: true, _count: { select: { participants: true } },
        },
      })

      if (!room) {
        return NextResponse.json({ error: "Không tìm thấy phòng thi" }, { status: 404 })
      }

      const isOwner = await db.onlineExamRoom.findFirst({
        where: { id: roomId, teacherId: session.user.id },
        select: { id: true },
      })

      if (!room.isPublic && !isOwner) {
        return NextResponse.json({ error: "Phòng thi này không công khai. Cần nhập mã truy cập." }, { status: 403 })
      }
    } else if (accessCode && typeof accessCode === "string") {
      room = await db.onlineExamRoom.findUnique({
        where: { accessCode: accessCode.trim() },
        select: {
          id: true, name: true, status: true, isPublic: true,
          maxStudents: true, _count: { select: { participants: true } },
        },
      })

      if (!room) {
        return NextResponse.json({ error: "Không tìm thấy phòng thi với mã này" }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: "Cần nhập mã phòng thi hoặc chọn phòng công khai" }, { status: 400 })
    }

    if (room.status === "completed" || room.status === "cancelled") {
      return NextResponse.json({ error: "Phòng thi đã kết thúc hoặc bị huỷ" }, { status: 400 })
    }

    if (room.maxStudents && room._count.participants >= room.maxStudents) {
      return NextResponse.json({ error: "Phòng thi đã đầy" }, { status: 400 })
    }

    const existing = await db.examRoomParticipant.findUnique({
      where: { examRoomId_studentId: { examRoomId: room.id, studentId: session.user.id } },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        data: { roomId: room.id, participantId: existing.id, alreadyJoined: true },
      })
    }

    const participant = await db.examRoomParticipant.create({
      data: { examRoomId: room.id, studentId: session.user.id, status: "joined" },
    })

    return NextResponse.json({
      success: true,
      data: { roomId: room.id, participantId: participant.id, alreadyJoined: false },
    })
  } catch (error: any) {
    console.error("Error joining exam room:", error)
    return NextResponse.json({ error: error.message || "Không thể tham gia phòng thi" }, { status: 500 })
  }
}
