import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

/**
 * GET /api/teacher/exams - Danh sách đề thi của giáo viên
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const examType = searchParams.get("examType")
    const search = searchParams.get("search")

    if (typeof (prisma as any).exam?.findMany !== "function") {
      return NextResponse.json(
        { error: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push" },
        { status: 500 }
      )
    }

    const where: any = { userId: session.user.id }
    if (status && status !== "Tất cả") where.status = status
    if (examType && examType !== "Tất cả loại") where.examType = examType
    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ]
    }

    const exams = await (prisma as any).exam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        examType: true,
        status: true,
        duration: true,
        totalQuestions: true,
        totalScore: true,
        createdAt: true,
        updatedAt: true,
        matrixId: true,
      },
    })

    return NextResponse.json({
      exams: exams.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description ?? undefined,
        examType: e.examType,
        status: e.status,
        duration: e.duration,
        totalQuestions: e.totalQuestions,
        totalPoints: e.totalScore,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error("Error fetching teacher exams:", error)
    return NextResponse.json(
      { error: error.message || "Không thể tải danh sách đề thi" },
      { status: 500 }
    )
  }
}
