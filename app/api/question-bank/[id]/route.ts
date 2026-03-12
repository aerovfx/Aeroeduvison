import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/question-bank/[id] - Get question details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if Question model exists
    if (!prisma.question) {
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED"
        },
        { status: 500 }
      )
    }

    const question = await prisma.question.findUnique({
      where: { id: params.id },
    })

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      question: {
        id: question.id,
        content: question.content,
        type: question.questionType,
        subject: question.subject,
        grade: question.grade,
        difficulty: question.difficulty,
        topic: question.topic,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        learningObjectives: question.learningObjectives,
        keywords: question.keywords,
        tags: question.tags,
        qualityScore: question.qualityScore,
        status: question.status,
        aiGenerated: question.aiGenerated,
        humanReviewed: question.humanReviewed,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error("Error fetching question:", error)
    
    // Check for Prisma schema errors
    if (error.message?.includes("Cannot read properties of undefined") || 
        error.code === "P2001" || 
        error.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED"
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch question" },
      { status: 500 }
    )
  }
}

// PUT /api/question-bank/[id] - Update question
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!prisma.question) {
      return NextResponse.json(
        { error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push", code: "PRISMA_SCHEMA_NOT_SYNCED" },
        { status: 500 }
      )
    }

    const question = await prisma.question.findUnique({
      where: { id: params.id },
    })
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }
    if (question.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own questions" }, { status: 403 })
    }

    const body = await request.json()
    const {
      content,
      type,
      subject,
      grade,
      difficulty,
      cognitiveLevel,
      options,
      correctAnswer,
      explanation,
      topic,
      keywords,
      learningObjectives,
    } = body

    if (!content || !type || !subject || !grade) {
      return NextResponse.json(
        { error: "Missing required fields: content, type, subject, grade" },
        { status: 400 }
      )
    }

    const typeMap: { [key: string]: string } = {
      "TNKQ - Nhiều lựa chọn": "MCQ",
      "TNKQ - Đúng/Sai": "TRUE_FALSE",
      "TNKQ - Trả lời ngắn": "SHORT_ANSWER",
      "Tự luận": "ESSAY",
    }
    const difficultyMap: { [key: string]: string } = {
      "Dễ": "EASY",
      "Trung bình": "MEDIUM",
      "Khó": "HARD",
    }

    const updated = await prisma.question.update({
      where: { id: params.id },
      data: {
        topic: topic || subject,
        subject,
        grade,
        questionType: typeMap[type] || type,
        difficulty: difficultyMap[difficulty] || difficulty?.toUpperCase() || "MEDIUM",
        content,
        options: Array.isArray(options) ? options : [],
        correctAnswer: correctAnswer?.toString() ?? null,
        explanation: explanation ?? "",
        learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : (cognitiveLevel ? [cognitiveLevel] : []),
        keywords: Array.isArray(keywords) ? keywords : [],
        tags: Array.isArray(keywords) ? keywords : [],
      },
    })

    return NextResponse.json({
      success: true,
      question: {
        id: updated.id,
        content: updated.content,
        type: updated.questionType,
        subject: updated.subject,
        grade: updated.grade,
        difficulty: updated.difficulty,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error("Error updating question:", error)
    if (error.code === "P2001" || error.code === "P2021") {
      return NextResponse.json(
        { error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push", code: "PRISMA_SCHEMA_NOT_SYNCED" },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: error.message || "Failed to update question" }, { status: 500 })
  }
}

// DELETE /api/question-bank/[id] - Delete question
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if Question model exists
    if (!prisma.question) {
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED"
        },
        { status: 500 }
      )
    }

    // Check if question exists and belongs to user (or user is admin/teacher)
    const question = await prisma.question.findUnique({
      where: { id: params.id },
    })

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      )
    }

    // Check ownership (only creator or admin can delete)
    if (question.createdBy !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own questions" },
        { status: 403 }
      )
    }

    // Delete question
    await prisma.question.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting question:", error)
    
    // Check for Prisma schema errors
    if (error.message?.includes("Cannot read properties of undefined") || 
        error.code === "P2001" || 
        error.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED"
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to delete question" },
      { status: 500 }
    )
  }
}
