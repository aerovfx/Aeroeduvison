import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

/**
 * GET /api/teacher/exams/[id] - Chi tiết đề thi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (typeof (prisma as any).exam?.findFirst !== "function") {
      return NextResponse.json(
        { error: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push" },
        { status: 500 }
      )
    }
    const exam = await (prisma as any).exam.findFirst({
      where: { id, userId: session.user.id },
      include: {
        examQuestions: {
          include: { Question: true },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!exam) {
      return NextResponse.json({ error: "Không tìm thấy đề thi" }, { status: 404 })
    }

    return NextResponse.json({
      ...exam,
      totalPoints: exam.totalScore,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
      examQuestions: exam.examQuestions.map((eq) => ({
        ...eq,
        question: eq.Question,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching exam:", error)
    return NextResponse.json(
      { error: error.message || "Không thể tải đề thi" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teacher/exams/[id] - Xóa đề thi
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (typeof (prisma as any).exam?.findFirst !== "function") {
      return NextResponse.json(
        { error: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push" },
        { status: 500 }
      )
    }
    const exam = await (prisma as any).exam.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!exam) {
      return NextResponse.json({ error: "Không tìm thấy đề thi" }, { status: 404 })
    }
    await (prisma as any).exam.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting exam:", error)
    return NextResponse.json(
      { error: error.message || "Không thể xóa đề thi" },
      { status: 500 }
    )
  }
}
