import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { AutoMatrixGenerator } from "@/lib/exam-matrix/auto-matrix-generator"
import { apiLogger } from "@/lib/logging-simple"

interface TopicInput {
  name: string
  content?: string
  weight?: number
}

interface GenerateRequest {
  name: string
  grade: string
  examType: string
  duration: number
  totalScore: number
  totalQuestions: number
  topics: TopicInput[]
  variantCount?: number
}

/**
 * POST /api/exam-matrices/auto-generate
 * Tự động tạo ma trận với tỉ lệ 40-30-30 cognitive level
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body: GenerateRequest = await req.json()
    
    const {
      name,
      grade,
      examType,
      duration,
      totalScore,
      totalQuestions,
      topics,
      variantCount = 3,
    } = body

    // Validate input
    if (!name || !grade || !examType) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      )
    }

    if (!topics || topics.length === 0) {
      return NextResponse.json(
        { error: "Cần ít nhất một đơn vị kiến thức" },
        { status: 400 }
      )
    }

    // Generate matrix variants
    const variants = AutoMatrixGenerator.generateMatrixVariants(
      topics,
      totalScore,
      totalQuestions,
      variantCount
    )

    // Validate each variant
    const validatedVariants = variants.map((variant, index) => {
      const validation = AutoMatrixGenerator.validateCognitiveRatio(variant)
      
      return {
        variantIndex: index,
        matrix: variant,
        validation,
        isCompliant: validation.valid,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        matrixName: name,
        grade,
        examType,
        duration,
        totalScore,
        totalQuestions,
        variants: validatedVariants,
      },
    })
  } catch (error: any) {
    apiLogger.error("Auto-generate matrix error", {
      error: error.message,
      stack: error.stack,
    })
    
    return NextResponse.json(
      { error: error.message || "Không thể tạo ma trận" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/exam-matrices/auto-generate/save
 * Lưu ma trận đã chọn vào database
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    
    const {
      name,
      grade,
      examType,
      duration,
      totalScore,
      totalQuestions,
      variantIndex,
      topics,
    } = body

    // Validate
    if (!name || !grade || !examType || !topics) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      )
    }

    // Generate the selected variant
    const matrix = AutoMatrixGenerator.generateMatrix(
      topics,
      totalScore,
      totalQuestions
    )

    // Create matrix in database
    const createdMatrix = await db.examMatrix.create({
      data: {
        name,
        grade,
        examType,
        duration,
        totalScore,
        totalQuestions: matrix.totalQuestions,
        type: "Tạo mới",
        status: "Hoàn tất",
        userId: session.user.id,
        topics: {
          create: matrix.topics.map((topic) => ({
            order: topic.order,
            topic: topic.topic,
            content: topic.content,
            percentageScore: topic.percentageScore,
            distributions: {
              create: topic.distributions.map((dist) => ({
                questionType: dist.questionType,
                cognitiveLevel: dist.cognitiveLevel,
                count: dist.count,
              })),
            },
          })),
        },
      },
      include: {
        topics: {
          include: {
            distributions: true,
          },
        },
      },
    })

    apiLogger.info("Matrix auto-generated and saved", {
      matrixId: createdMatrix.id,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        matrix: createdMatrix,
      },
    })
  } catch (error: any) {
    apiLogger.error("Save auto-generated matrix error", {
      error: error.message,
      stack: error.stack,
    })
    
    return NextResponse.json(
      { error: error.message || "Không thể lưu ma trận" },
      { status: 500 }
    )
  }
}
