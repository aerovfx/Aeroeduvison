import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { MatrixExamGenerator } from "@/lib/exam-matrix/exam-generator"
import { createSuccessResponse, createErrorResponse } from "@/lib/document-digitization/api-helpers"
import { apiLogger } from "@/lib/logger"

/**
 * POST /api/exams/generate-from-matrix
 * Tạo đề thi từ ma trận
 * Tham khảo: exam.vuonminh.org/matrix?importId=132
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse("Unauthorized", "UNAUTHORIZED"),
        { status: 401 }
      )
    }

    const body = await request.json()
    const { matrixId, title, description, allowDuplicates, useAIForMissing } = body

    if (!matrixId) {
      return NextResponse.json(
        createErrorResponse("Matrix ID is required", "BAD_REQUEST"),
        { status: 400 }
      )
    }

    // Generate exam from matrix
    const result = await MatrixExamGenerator.generateExamFromMatrix(
      matrixId,
      session.user.id,
      {
        title,
        description,
        allowDuplicates,
        useAIForMissing,
      }
    )

    // Return exam data with selected questions
    // Note: Exam model creation will be handled by frontend or separate API
    // This allows flexibility if Exam model structure differs
    
    apiLogger.info("Exam data generated from matrix", {
      matrixId,
      totalQuestions: result.selectedQuestions.length,
      stats: result.stats,
    })

    return NextResponse.json(
      createSuccessResponse({
        examData: result.examData,
        selectedQuestions: result.selectedQuestions,
        missingRequirements: result.missingRequirements,
        stats: result.stats,
        message: result.stats.coverage >= 0.8 
          ? "Đã chọn đủ câu hỏi từ ma trận. Có thể tạo đề thi."
          : "Đã chọn câu hỏi từ ma trận. Một số yêu cầu thiếu câu hỏi.",
        requiresManualCreation: true, // Frontend will handle exam creation
      })
    )
  } catch (error: any) {
    apiLogger.error("Error generating exam from matrix", {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      createErrorResponse(
        error.message || "Failed to generate exam from matrix",
        "INTERNAL_ERROR"
      ),
      { status: 500 }
    )
  }
}

/**
 * GET /api/exams/generate-from-matrix?matrixId=xxx
 * Preview exam generation (không tạo exam, chỉ xem preview)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse("Unauthorized", "UNAUTHORIZED"),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const matrixId = searchParams.get("matrixId")

    if (!matrixId) {
      return NextResponse.json(
        createErrorResponse("Matrix ID is required", "BAD_REQUEST"),
        { status: 400 }
      )
    }

    // Preview exam generation
    const preview = await MatrixExamGenerator.previewExamFromMatrix(
      matrixId,
      session.user.id
    )

    return NextResponse.json(createSuccessResponse(preview))
  } catch (error: any) {
    apiLogger.error("Error previewing exam from matrix", {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      createErrorResponse(
        error.message || "Failed to preview exam from matrix",
        "INTERNAL_ERROR"
      ),
      { status: 500 }
    )
  }
}
