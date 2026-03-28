import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { MatrixProcessService } from "@/lib/exam-matrix/matrix-process-service"
import { createSuccessResponse, createErrorResponse } from "@/lib/document-digitization/api-helpers"
import { apiLogger } from "@/lib/logging-simple"

/**
 * POST /api/exam-matrices/[id]/process
 * Process matrix: OCR + AI Analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        }),
        { status: 401 }
      )
    }

    const { id: matrixId } = await params

    // Process matrix
    const result = await MatrixProcessService.processMatrix({
      matrixId,
      userId: session.user.id,
    })

    if (!result.success) {
      return NextResponse.json(
        createErrorResponse({
          code: "PROCESSING_FAILED",
          message: result.error || "Failed to process matrix",
        }),
        { status: 500 }
      )
    }

    apiLogger.info("Matrix processed successfully", {
      matrixId,
      executionTime: result.executionTime,
      topicsCount: result.topics?.length || 0,
    })

    return NextResponse.json(
      createSuccessResponse({
        matrixId: result.matrixId,
        executionTime: result.executionTime,
        topicsCount: result.topics?.length || 0,
        message: "Ma trận đã được xử lý thành công",
      })
    )
  } catch (error: any) {
    apiLogger.error("Error processing matrix", {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      createErrorResponse({
        code: "INTERNAL_ERROR",
        message: error.message || "Failed to process matrix",
      }),
      { status: 500 }
    )
  }
}
