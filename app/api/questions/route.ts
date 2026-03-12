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
 * GET /api/questions
 * Lấy danh sách câu hỏi với filter
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const subject = searchParams.get("subject")
    const grade = searchParams.get("grade")
    const questionType = searchParams.get("questionType")
    const status = searchParams.get("status")
    const topic = searchParams.get("topic")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: any = {
      createdBy: session.user.id,
    }

    if (subject) where.subject = subject
    if (grade) where.grade = grade
    if (questionType) where.questionType = questionType
    if (status) where.status = status
    if (topic) where.topic = { contains: topic, mode: "insensitive" }

    const [questions, total] = await Promise.all([
      db.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.question.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        questions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    apiLogger.error("Get questions error", { error: error.message })
    return NextResponse.json(
      { error: error.message || "Không thể lấy danh sách câu hỏi" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/questions
 * Tạo câu hỏi mới (thủ công hoặc AI)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: QuestionInput = await req.json()

    // Validate required fields
    const requiredFields = ["topic", "subject", "grade", "questionType", "difficulty", "content", "correctAnswer"]
    const missingFields = requiredFields.filter(field => !body[field as keyof QuestionInput])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Thiếu các trường bắt buộc: ${missingFields.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate question type
    const validQuestionTypes = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"]
    if (!validQuestionTypes.includes(body.questionType)) {
      return NextResponse.json(
        { error: "Loại câu hỏi không hợp lệ" },
        { status: 400 }
      )
    }

    // Validate difficulty
    const validDifficulties = ["EASY", "MEDIUM", "HARD"]
    if (!validDifficulties.includes(body.difficulty)) {
      return NextResponse.json(
        { error: "Độ khó không hợp lệ" },
        { status: 400 }
      )
    }

    // For MCQ and TRUE_FALSE, options are required
    if ((body.questionType === "MCQ" || body.questionType === "TRUE_FALSE") && (!body.options || body.options.length === 0)) {
      return NextResponse.json(
        { error: "Câu hỏi trắc nghiệm cần có phương án lựa chọn" },
        { status: 400 }
      )
    }

    const question = await db.question.create({
      data: {
        ...body,
        options: body.options || [],
        learningObjectives: body.learningObjectives || [body.topic],
        keywords: body.keywords || [body.topic, body.subject],
        status: body.status || "Nháp",
        aiGenerated: false,
        humanReviewed: false,
        createdBy: session.user.id,
        qualityScore: null,
      },
    })

    apiLogger.info("Question created", {
      questionId: question.id,
      userId: session.user.id,
      type: body.questionType,
    })

    return NextResponse.json({
      success: true,
      data: { question },
    })
  } catch (error: any) {
    apiLogger.error("Create question error", {
      error: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      { error: error.message || "Không thể tạo câu hỏi" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/questions
 * Cập nhật nhiều câu hỏi (bulk update)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { questionIds, status } = body

    if (!questionIds || !Array.isArray(questionIds) || !status) {
      return NextResponse.json(
        { error: "Thiếu thông tin cập nhật" },
        { status: 400 }
      )
    }

    const result = await db.question.updateMany({
      where: {
        id: { in: questionIds },
        createdBy: session.user.id,
      },
      data: {
        status,
        reviewedAt: status === "Đã duyệt" ? new Date() : null,
        reviewedBy: status === "Đã duyệt" ? session.user.id : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        updated: result.count,
      },
    })
  } catch (error: any) {
    apiLogger.error("Bulk update questions error", { error: error.message })
    return NextResponse.json(
      { error: error.message || "Không thể cập nhật câu hỏi" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/questions
 * Xóa nhiều câu hỏi
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { questionIds } = body

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json(
        { error: "Thiếu danh sách câu hỏi cần xóa" },
        { status: 400 }
      )
    }

    const result = await db.question.deleteMany({
      where: {
        id: { in: questionIds },
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        deleted: result.count,
      },
    })
  } catch (error: any) {
    apiLogger.error("Delete questions error", { error: error.message })
    return NextResponse.json(
      { error: error.message || "Không thể xóa câu hỏi" },
      { status: 500 }
    )
  }
}
