import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import {
  QUESTION_TYPE_DISPLAY_TO_DB,
  DIFFICULTY_DISPLAY_TO_DB,
} from "@/lib/constants/question-bank"

// GET /api/question-bank - List questions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const search = searchParams.get("search")
    const subject = searchParams.get("subject")
    const grade = searchParams.get("grade")
    const difficulty = searchParams.get("difficulty")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

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

    // Build where clause for direct Prisma query
    const where: any = {}
    
    if (status && status !== "Tất cả") {
      where.status = status
    }
    
    if (type && type !== "Tất cả loại") {
      where.questionType = QUESTION_TYPE_DISPLAY_TO_DB[type as keyof typeof QUESTION_TYPE_DISPLAY_TO_DB] || type
    }
    
    if (search) {
      // Full-text search across content, topic, subject, explanation, keywords, and tags
      where.OR = [
        { content: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { topic: { contains: search, mode: "insensitive" } },
        { explanation: { contains: search, mode: "insensitive" } },
        { keywords: { hasSome: [search] } },
        { tags: { hasSome: [search] } },
      ]
    }

    if (subject) {
      where.subject = subject
    }

    if (grade) {
      where.grade = grade
    }

    if (difficulty) {
      where.difficulty = DIFFICULTY_DISPLAY_TO_DB[difficulty as keyof typeof DIFFICULTY_DISPLAY_TO_DB] || difficulty.toUpperCase()
    }

    // Use Prisma directly (QuestionBankManager requires Redis which may not be available)
    let questions, total
    try {
      [questions, total] = await Promise.all([
        prisma.question.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.question.count({ where }),
      ])
    } catch (dbError: any) {
      // Check if error is due to missing table
      if (dbError.code === "P2021" || dbError.message?.includes("does not exist") || 
          dbError.message?.includes("relation") || dbError.message?.includes("table")) {
        throw new Error("Database table 'Question' does not exist. Please run: npx prisma db push")
      }
      throw dbError
    }

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.questionType,
        subject: q.subject,
        grade: q.grade,
        difficulty: q.difficulty,
        cognitiveLevel: q.learningObjectives?.[0] || "", // Use first learning objective
        status: q.status,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        createdBy: q.createdBy,
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    })
  } catch (error: any) {
    console.error("Error fetching questions:", error)
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
    })
    
    // Check for Prisma schema errors
    if (error.message?.includes("Cannot read properties of undefined") || 
        error.code === "P2001" || 
        error.code === "P2021" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("relation") ||
        error.message?.includes("table")) {
      return NextResponse.json(
        { 
          error: "Database schema not synced. The 'Question' table does not exist in the database. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED",
          details: error.message
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch questions", code: error.code },
      { status: 500 }
    )
  }
}

// POST /api/question-bank - Create new question
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
      learningObjectives
    } = body

    if (!content || !type || !subject || !grade) {
      return NextResponse.json(
        { error: "Missing required fields: content, type, subject, grade are required" },
        { status: 400 }
      )
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

    // Create question directly with Prisma
    const question = await prisma.question.create({
      data: {
        topic: topic || subject,
        subject,
        grade,
        questionType: QUESTION_TYPE_DISPLAY_TO_DB[type as keyof typeof QUESTION_TYPE_DISPLAY_TO_DB] || type.toUpperCase(),
        difficulty: DIFFICULTY_DISPLAY_TO_DB[difficulty as keyof typeof DIFFICULTY_DISPLAY_TO_DB] || difficulty?.toUpperCase() || "MEDIUM",
        content,
        options: options || [],
        correctAnswer: correctAnswer?.toString(),
        explanation: explanation || "",
        learningObjectives: learningObjectives || (cognitiveLevel ? [cognitiveLevel] : []),
        keywords: keywords || [],
        tags: keywords || [],
        status: "Nháp",
        aiGenerated: false,
        humanReviewed: false,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      question: {
        id: question.id,
        content: question.content,
        type: question.questionType,
        subject: question.subject,
        grade: question.grade,
        difficulty: question.difficulty,
        cognitiveLevel: question.learningObjectives?.[0] || "",
        status: question.status,
        createdAt: question.createdAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error("Error creating question:", error)
    
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
      { error: error.message || "Failed to create question" },
      { status: 500 }
    )
  }
}
