import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

/**
 * GET /api/exams
 * Legacy-compatible endpoint for pages still using /api/exams.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (typeof (prisma as any).exam?.findMany !== "function") {
      return NextResponse.json(
        { success: false, error: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limitRaw = parseInt(searchParams.get("limit") || "50", 10)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50

    const exams = await (prisma as any).exam.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        examType: true,
        duration: true,
        totalQuestions: true,
        status: true,
        createdAt: true,
      },
    })

    const mapped = exams.map((exam: any) => ({
      id: String(exam.id),
      title: String(exam.title || "Untitled exam"),
      subject: "Vật lý",
      examType: String(exam.examType || "N/A"),
      duration: Number(exam.duration || 0),
      totalQuestions: Number(exam.totalQuestions || 0),
      status: String(exam.status || "Nháp"),
      createdAt: exam.createdAt?.toISOString?.() || new Date().toISOString(),
    }))

    return NextResponse.json({
      success: true,
      exams: mapped,
      data: { exams: mapped },
    })
  } catch (error: any) {
    console.error("Error listing exams:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list exams" },
      { status: 500 }
    )
  }
}
