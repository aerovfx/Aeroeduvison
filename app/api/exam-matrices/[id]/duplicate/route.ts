import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

/**
 * POST /api/exam-matrices/[id]/duplicate
 * Duplicate (nhân bản) an exam matrix
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const matrixId = params.id

    // Fetch original matrix with all relations
    const originalMatrix = await prisma.examMatrix.findUnique({
      where: { id: matrixId },
      include: {
        topics: {
          include: {
            distributions: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    })

    if (!originalMatrix) {
      return NextResponse.json(
        { error: "Matrix not found" },
        { status: 404 }
      )
    }

    if (originalMatrix.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Create duplicate matrix
    const duplicatedMatrix = await prisma.examMatrix.create({
      data: {
        name: `${originalMatrix.name} (Bản sao)`,
        grade: originalMatrix.grade,
        examType: originalMatrix.examType,
        duration: originalMatrix.duration,
        totalScore: originalMatrix.totalScore,
        totalQuestions: originalMatrix.totalQuestions,
        type: originalMatrix.type,
        status: originalMatrix.status === "Hoàn tất" ? "Hoàn tất" : "Hàng đợi",
        originalFileUrl: originalMatrix.originalFileUrl,
        digitizedFileUrl: originalMatrix.digitizedFileUrl,
        userId: session.user.id,
        // Copy topics and distributions
        topics: {
          create: originalMatrix.topics.map((topic) => ({
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

    return NextResponse.json({
      success: true,
      matrix: {
        id: duplicatedMatrix.id,
        name: duplicatedMatrix.name,
        status: duplicatedMatrix.status,
      },
      message: "Đã nhân bản ma trận thành công",
    })
  } catch (error: any) {
    console.error("Duplicate matrix error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to duplicate matrix" },
      { status: 500 }
    )
  }
}
