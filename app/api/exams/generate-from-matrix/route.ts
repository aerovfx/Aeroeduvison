import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { MatrixExamGenerator } from "@/lib/exam-matrix/exam-generator"
import { createSuccessResponse, createErrorResponse } from "@/lib/document-digitization/api-helpers"
import { apiLogger } from "@/lib/logging-simple"

/**
 * POST /api/exams/generate-from-matrix
 * Tạo đề thi từ ma trận
 * Tham khảo: exam.vuonminh.org/matrix?importId=132
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return createErrorResponse({ message: "Unauthorized", code: "UNAUTHORIZED" }, 401)
    }

    const body = await request.json()
    const { matrixId, title, description, allowDuplicates, useAIForMissing } = body

    if (!matrixId) {
      return NextResponse.json(
        createErrorResponse({ message: "Matrix ID is required", code: "BAD_REQUEST" }, 400)
      )
    }

    // Generate exam from matrix (tự động chọn câu hỏi từ ngân hàng theo ma trận)
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

    if (result.selectedQuestions.length === 0) {
      return createSuccessResponse({
        examId: null,
        examData: result.examData,
        selectedQuestions: [],
        missingRequirements: result.missingRequirements,
        stats: result.stats,
        message:
          "Không tìm thấy câu hỏi phù hợp trong ngân hàng đề. " +
          "Vui lòng thêm câu hỏi vào ngân hàng hoặc kiểm tra lại cấu hình ma trận " +
          `(loại: ${result.examData.examType}, khối: ${result.missingRequirements.map((r) => r.grade).join(", ")}).`,
      })
    }

    const pointsPerQuestion = result.examData.totalScore / result.selectedQuestions.length

    if (typeof (prisma as any).exam?.create !== "function") {
      return createErrorResponse(
        { message: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push", code: "SCHEMA_NOT_SYNCED" },
        500
      )
    }

    const exam = await (prisma as any).exam.create({
      data: {
        title: result.examData.title,
        description: result.examData.description ?? undefined,
        examType: result.examData.examType,
        duration: result.examData.duration,
        totalScore: result.examData.totalScore,
        totalQuestions: result.selectedQuestions.length,
        status: "Nháp",
        matrixId,
        userId: session.user.id,
        examQuestions: {
          create: result.selectedQuestions.map((q: { id: string }, idx: number) => ({
            questionId: q.id,
            order: idx + 1,
            points: pointsPerQuestion,
          })),
        },
      },
      include: {
        examQuestions: true,
      },
    })

    apiLogger.info("Exam created from matrix", {
      matrixId,
      examId: exam.id,
      totalQuestions: result.selectedQuestions.length,
      stats: result.stats,
    })

    return createSuccessResponse({
      examId: exam.id,
        examData: result.examData,
        selectedQuestions: result.selectedQuestions,
        missingRequirements: result.missingRequirements,
        stats: result.stats,
        message:
          result.stats.coverage >= 0.8
            ? "Đã tạo đề thi từ ma trận. Hệ thống đã tự động chọn câu hỏi từ ngân hàng theo yêu cầu ma trận."
            : "Đã tạo đề thi với số câu hỏi có sẵn. Một số yêu cầu thiếu câu hỏi trong ngân hàng.",
    })
  } catch (error: any) {
    apiLogger.error("Error generating exam from matrix", {
      error: error.message,
      stack: error.stack,
    })

    return createErrorResponse(
      {
        message: error.message || "Failed to generate exam from matrix",
        code: "INTERNAL_ERROR",
      },
      500
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
      return createErrorResponse({ message: "Unauthorized", code: "UNAUTHORIZED" }, 401)
    }

    const { searchParams } = new URL(request.url)
    const matrixId = searchParams.get("matrixId")

    if (!matrixId) {
      return NextResponse.json(
        createErrorResponse({ message: "Matrix ID is required", code: "BAD_REQUEST" }, 400)
      )
    }

    // Preview exam generation
    const preview = await MatrixExamGenerator.previewExamFromMatrix(
      matrixId,
      session.user.id
    )

    return createSuccessResponse(preview)
  } catch (error: any) {
    apiLogger.error("Error previewing exam from matrix", {
      error: error.message,
      stack: error.stack,
    })

    return createErrorResponse(
      {
        message: error.message || "Failed to preview exam from matrix",
        code: "INTERNAL_ERROR",
      },
      500
    )
  }
}
