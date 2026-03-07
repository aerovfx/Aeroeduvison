import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = session.user.id;

    // Get teacher's courses
    const teacherCourses = await db.course.findMany({
      where: { userId: teacherId },
      include: {
        _count: {
          select: {
            purchases: true,
            chapters: true
          }
        }
      }
    });

    // Calculate statistics for teacher's courses
    const totalStudents = teacherCourses.reduce((sum, course) => 
      sum + course._count.purchases, 0
    );

    const publishedCourses = teacherCourses.filter(c => c.isPublished).length;
    const draftCourses = teacherCourses.filter(c => !c.isPublished).length;
    const totalRevenue = teacherCourses.reduce((sum, course) => 
      sum + (course._count.purchases * (course.price || 0)), 0
    );

    // Get recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEnrollments = await db.purchase.count({
      where: {
        course: { userId: teacherId },
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    // Get pending assignments for teacher's courses
    const pendingAssignments = 0; // Placeholder since assignment model doesn't exist

    // Calculate average rating (mock for now)
    const averageRating = 4.7;

    // Get student growth data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyEnrollments = await db.purchase.groupBy({
      by: ['createdAt'],
      where: {
        course: { userId: teacherId },
        createdAt: { gte: sixMonthsAgo }
      },
      _count: { id: true }
    });

    // Get active students (students who have made progress in last 30 days)
    const activeStudents = await db.userProgress.count({
      where: {
        chapter: {
          course: { userId: teacherId }
        },
        updatedAt: { gte: thirtyDaysAgo }
      }
    });

    return NextResponse.json({
      overview: {
        totalStudents,
        totalCourses: teacherCourses.length,
        totalRevenue,
        averageRating,
        completionRate: 78, // Mock for now
        activeStudents,
        newEnrollments: recentEnrollments,
        pendingAssignments
      },
      courses: {
        total: teacherCourses.length,
        published: publishedCourses,
        draft: draftCourses,
        archived: 0, // Placeholder since isArchived doesn't exist
        totalStudents,
        totalRevenue
      },
      coursePerformance: teacherCourses.map(course => ({
        name: course.title,
        students: course._count.purchases,
        revenue: course._count.purchases * (course.price || 0),
        completion: 75, // Mock completion rate
        rating: 4.5 // Mock rating
      }))
    });
  } catch (error) {
    console.error("Error fetching teacher stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch teacher statistics" },
      { status: 500 }
    );
  }
}

