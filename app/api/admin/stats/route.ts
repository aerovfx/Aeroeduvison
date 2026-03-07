import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get real data from database
    const [
      totalUsers,
      totalCourses,
      publishedCourses,
      draftCourses,
      totalPurchases,
      activeUsers,
      totalAttachments
    ] = await Promise.all([
      db.user.count({ where: { schoolId: user.schoolId } }),
      db.course.count({ where: { schoolId: user.schoolId } }),
      db.course.count({ where: { schoolId: user.schoolId, isPublished: true } }),
      db.course.count({ where: { schoolId: user.schoolId, isPublished: false } }),
      db.purchase.count(),
      db.user.count({ where: { schoolId: user.schoolId, role: "STUDENT" } }),
      db.attachment.count()
    ]);

    // Calculate revenue from purchases
    const purchasesWithAmount = await db.purchase.findMany({
      select: { course: { select: { price: true } } }
    });
    const totalRevenue = purchasesWithAmount.reduce((sum, purchase) => 
      sum + (purchase.course?.price || 0), 0
    );

    // Get course enrollment statistics
    const coursesWithStudents = await db.course.findMany({
      select: { 
        _count: { 
          select: { purchases: true } 
        } 
      }
    });
    const totalStudents = coursesWithStudents.reduce((sum, course) => 
      sum + course._count.purchases, 0
    );

    // Calculate average rating (mock for now since we don't have rating system)
    const averageRating = 4.7;
    
    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        teachers: await db.user.count({ where: { role: "TEACHER" } }),
        admins: await db.user.count({ where: { role: "ADMIN" } })
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: draftCourses,
        archived: 0, // Not available in current schema
        totalStudents,
        totalRevenue,
        averageRating,
        totalPurchases
      },
      modules: {
        quizzes: 0, // Mock - Quiz model not in schema yet
        assignments: 0, // Mock - Assignment model not in schema yet
        videos: await db.attachment.count({ where: { course: { schoolId: user.schoolId } } }),
        attachments: totalAttachments,
        learningPaths: 0, // Mock - LearningPath model not in schema yet
        liveChats: 0, // Mock - ChatRoom model not in schema yet
        competitions: 0, // Mock - Competition model not in schema yet
        stemProjects: 0, // Mock - STEMProject model not in schema yet
        calendar: 0 // Mock - CalendarEvent model not in schema yet
      }
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin statistics" },
      { status: 500 }
    );
  }
}
