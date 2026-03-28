import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get all courses the user has purchased or enrolled in
    const purchases = await db.purchase.findMany({
      where: { userId },
      select: {
        courseId: true,
        Course: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            Chapter: {
              where: { isPublished: true },
              select: { id: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    })

    // Get user progress for all chapters
    const userProgress = await db.userProgress.findMany({
      where: {
        userId,
        isCompleted: true,
      },
      select: {
        chapterId: true,
        updatedAt: true,
      },
    })

    const completedChapterIds = new Set(userProgress.map((p) => p.chapterId))

    // Build course progress array
    const courses = purchases.map((purchase) => {
      const course = purchase.Course
      const totalChapters = course.Chapter.length
      const chaptersCompleted = course.Chapter.filter((ch) =>
        completedChapterIds.has(ch.id)
      ).length

      // Find the last accessed date from progress records for this course's chapters
      const courseChapterIds = new Set(course.Chapter.map((ch) => ch.id))
      const courseProgressRecords = userProgress.filter((p) =>
        courseChapterIds.has(p.chapterId)
      )
      const lastAccessed =
        courseProgressRecords.length > 0
          ? courseProgressRecords.reduce((latest, p) =>
              p.updatedAt > latest.updatedAt ? p : latest
            ).updatedAt.toISOString()
          : new Date().toISOString()

      return {
        id: course.id,
        title: course.title,
        imageUrl: course.imageUrl,
        chaptersCompleted,
        totalChapters,
        lastAccessed,
      }
    })

    return NextResponse.json({
      success: true,
      courses,
    })
  } catch (error: any) {
    console.error("Courses progress error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses progress" },
      { status: 500 }
    )
  }
}
