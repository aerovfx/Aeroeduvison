import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiLogger } from "@/lib/logging-simple"

interface QuestionInput {
  topic: string
  subject: string
  grade: string
  questionType: string
  difficulty: string
  content: string
  options?: string[]
  correctAnswer: string
  explanation: string
  learningObjectives?: string[]
  keywords?: string[]
  status?: string
}

/**
 * GET /api/questions/[id]
 * Lấy chi tiết một câu hỏi
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const question = await db.question.findUnique({
      where: { id: params.id },
    })

    if (!question) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi" },
        { status: 404 }
      )
    }

    // Check permission
    if (question.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: { question },
    })
  } catch (error: any) {
    apiLogger.error("Get question error", { error: error.message })
    return NextResponse.json(
      { error: error.message || "Không thể lấy câu hỏi" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/questions/[id]
 * Cập nhật một câu hỏi
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: Partial<QuestionInput> & { status?: string } = await req.json()

    // Check if question exists and user has permission
    const existingQuestion = await db.question.findUnique({
      where: { id: params.id },
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi" },
        { status: 404 }
      )
    }

    if (existingQuestion.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const question = await db.question.update({
      where: { id: params.id },
      data: {
        ...body,
        updatedAt: new Date(),
        ...(body.status && {
          reviewedAt: body.status === "Đã duyệt" ? new Date() : null,
          reviewedBy: body.status === "Đã duyệt" ? session.user.id : null,
        }),
      },
    })

    apiLogger.info("Question updated", {
      questionId: params.id,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { question },
    })
  } catch (error: any) {
    apiLogger.error("Update question error", { error: error.message })
    return NextResponse.json(
      { error: error.message || "Không thể cập nhật câu hỏi" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/questions/[id]
 * Xóa một câu hỏi
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if question exists and user has permission
    const existingQuestion = await db.question.findUnique({
      where: { id: params.id },
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi" },
        { status: 404 }
      )
    }

    if (existingQuestion.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.question.delete({
      where: { id: params.id },
    })

    apiLogger.info("Question deleted", {
      questionId: params.id,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: "Đã xóa câu hỏi",
    })
  } catch (error: any) {
    apiLogger.error("Delete question error", { error: error.message })
    return NextResponse.json(
      { error: error.message || "Không thể xóa câu hỏi" },
      { status: 500 }
    )
  }
}
