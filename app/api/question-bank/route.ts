import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

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
      // Map UI type to database type
      const typeMap: { [key: string]: string } = {
        "TNKQ - Nhiều lựa chọn": "MCQ",
        "TNKQ - Đúng/Sai": "TRUE_FALSE",
        "TNKQ - Trả lời ngắn": "SHORT_ANSWER",
        "Tự luận": "ESSAY",
      }
      where.questionType = typeMap[type] || type
    }
    
    if (search) {
      // Use OR for full-text search
      where.OR = [
        { content: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { topic: { contains: search, mode: "insensitive" } },
        { explanation: { contains: search, mode: "insensitive" } },
      ]
    }

    if (subject) {
      where.subject = subject
    }

    if (grade) {
      where.grade = grade
    }

    if (difficulty) {
      const difficultyMap: { [key: string]: string } = {
        "Dễ": "EASY",
        "Trung bình": "MEDIUM",
        "Khó": "HARD",
      }
      where.difficulty = difficultyMap[difficulty] || difficulty.toUpperCase()
    }

    // Use Prisma directly (QuestionBankManager requires Redis which may not be available)
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.question.count({ where }),
    ])

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
      { error: error.message || "Failed to fetch questions" },
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

    // Map UI type to database type
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

    // Create question directly with Prisma
    const question = await prisma.question.create({
      data: {
        topic: topic || subject,
        subject,
        grade,
        questionType: typeMap[type] || type.toUpperCase(),
        difficulty: difficultyMap[difficulty] || difficulty?.toUpperCase() || "MEDIUM",
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
