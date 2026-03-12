import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const participants = await db.examRoomParticipant.findMany({
      where: { studentId: session.user.id },
      include: {
        ExamRoom: {
          include: {
            Teacher: { select: { name: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    })

    const exams = participants.map((p) => ({
      ...p.ExamRoom,
      teacher: p.ExamRoom.Teacher,
    }))

    return NextResponse.json({ success: true, data: { exams } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
