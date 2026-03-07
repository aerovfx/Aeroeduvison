import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/exam-matrices - List matrices with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const examType = searchParams.get("examType")

    const where: any = {
      userId: session.user.id,
    }

    if (status && status !== "Tất cả") {
      where.status = status
    }

    if (examType && examType !== "Tất cả loại đề") {
      where.examType = examType
    }

    let matrices
    try {
      matrices = await prisma.examMatrix.findMany({
        where,
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
        orderBy: {
          createdAt: "desc",
        },
      })
    } catch (dbError: any) {
      console.error("Database query error:", dbError)
      // Check if it's a schema error
      if (dbError.message?.includes("Unknown arg") || 
          dbError.message?.includes("does not exist") ||
          dbError.message?.includes("model") ||
          dbError.code === "P2001" ||
          dbError.code === "P2021") {
        throw new Error("Database schema chưa được cập nhật. Vui lòng chạy: npx prisma db push")
      }
      throw dbError
    }

    return NextResponse.json({
      matrices: matrices.map((matrix) => ({
        id: matrix.id,
        name: matrix.name,
        grade: matrix.grade,
        examType: matrix.examType,
        type: matrix.type,
        status: matrix.status,
        totalQuestions: matrix.totalQuestions,
        createdAt: matrix.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error("Error fetching matrices:", error)
    console.error("Error stack:", error.stack)
    
    // Check if it's a database schema error
    if (error.message?.includes("Unknown arg") || 
        error.message?.includes("does not exist") ||
        error.message?.includes("model") ||
        error.code === "P2001") {
      return NextResponse.json(
        { 
          error: "Database schema chưa được cập nhật. Vui lòng chạy: npx prisma db push",
          details: process.env.NODE_ENV === "development" ? error.message : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch matrices",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/exam-matrices - Create new matrix
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, grade, examType, duration, totalScore, topics } = body

    if (!name || !grade || !examType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Calculate total questions
    const totalQuestions = topics.reduce((sum: number, topic: any) => {
      return sum + (topic.distributions?.reduce((topicSum: number, dist: any) => {
        return topicSum + (dist.count || 0)
      }, 0) || 0)
    }, 0)

    // Create matrix with topics and distributions
    const matrix = await prisma.examMatrix.create({
      data: {
        name,
        grade,
        examType,
        duration: duration || 45,
        totalScore: totalScore || 10,
        totalQuestions,
        type: "Tạo mới",
        status: "Hoàn tất",
        userId: session.user.id,
        topics: {
          create: topics.map((topic: any, index: number) => ({
            order: index + 1,
            topic: topic.topic,
            content: topic.content || "",
            percentageScore: 0, // Will be calculated
            distributions: {
              create: (topic.distributions || []).map((dist: any) => ({
                questionType: dist.questionType,
                cognitiveLevel: dist.cognitiveLevel,
                count: dist.count || 0,
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

    // Calculate and update percentage scores
    for (const topic of matrix.topics) {
      const topicTotal = topic.distributions.reduce(
        (sum, dist) => sum + dist.count,
        0
      )
      const percentage = totalQuestions > 0
        ? Math.round((topicTotal / totalQuestions) * 100)
        : 0

      await prisma.matrixTopic.update({
        where: { id: topic.id },
        data: { percentageScore: percentage },
      })
    }

    return NextResponse.json({
      success: true,
      matrix: {
        id: matrix.id,
        name: matrix.name,
        grade: matrix.grade,
        examType: matrix.examType,
        totalQuestions: matrix.totalQuestions,
      },
    })
  } catch (error: any) {
    console.error("Error creating matrix:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create matrix" },
      { status: 500 }
    )
  }
}
