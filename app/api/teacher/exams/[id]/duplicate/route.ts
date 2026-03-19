import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

/**
 * POST /api/teacher/exams/[id]/duplicate - Nhân bản đề thi
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (typeof (prisma as any).exam?.findFirst !== "function") {
      return NextResponse.json(
        { error: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push" },
        { status: 500 }
      )
    }

    const { id } = await params

    const sourceExam = await (prisma as any).exam.findFirst({
      where: { id, userId: session.user.id },
      include: {
        examQuestions: {
          select: {
            questionId: true,
            order: true,
            points: true,
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!sourceExam) {
      return NextResponse.json({ error: "Không tìm thấy đề thi" }, { status: 404 })
    }

    const duplicated = await (prisma as any).exam.create({
      data: {
        title: `${sourceExam.title} (Bản sao)`,
        description: sourceExam.description ?? undefined,
        examType: sourceExam.examType,
        duration: sourceExam.duration,
        totalScore: sourceExam.totalScore,
        totalQuestions: sourceExam.totalQuestions,
        status: "Nháp",
        matrixId: sourceExam.matrixId ?? undefined,
        userId: session.user.id,
        examQuestions: {
          create: sourceExam.examQuestions.map((q: any) => ({
            questionId: q.questionId,
            order: q.order,
            points: q.points,
          })),
        },
      },
      select: {
        id: true,
        title: true,
      },
    })

    return NextResponse.json({
      success: true,
      exam: duplicated,
    })
  } catch (error: any) {
    console.error("Error duplicating exam:", error)
    return NextResponse.json(
      { error: error?.message || "Không thể nhân bản đề thi" },
      { status: 500 }
    )
  }
}
