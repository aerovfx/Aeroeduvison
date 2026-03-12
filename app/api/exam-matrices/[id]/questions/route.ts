import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

/**
 * POST /api/exam-matrices/[id]/questions - Thêm câu hỏi vào ma trận đề
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: matrixId } = await params
    const body = await request.json()
    const questionId = body?.questionId

    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json(
        { error: "questionId là bắt buộc" },
        { status: 400 }
      )
    }

    const matrix = await prisma.examMatrix.findFirst({
      where: { id: matrixId, userId: session.user.id },
    })
    if (!matrix) {
      return NextResponse.json(
        { error: "Không tìm thấy ma trận đề hoặc không có quyền" },
        { status: 404 }
      )
    }

    const question = await prisma.question.findFirst({
      where: { id: questionId },
    })
    if (!question) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi" },
        { status: 404 }
      )
    }

    await prisma.matrixSelectedQuestion.upsert({
      where: {
        matrixId_questionId: { matrixId, questionId },
      },
      create: { matrixId, questionId },
      update: {},
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error adding question to matrix:", error)
    return NextResponse.json(
      { error: error.message || "Lỗi khi thêm câu hỏi vào ma trận" },
      { status: 500 }
    )
  }
}
