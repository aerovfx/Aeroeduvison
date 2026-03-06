import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const classFilter = searchParams.get('class') || 'all';
    const riskFilter = searchParams.get('risk') || 'all';

    // Build where clause - simplified to avoid Prisma issues
    const where: any = {
      role: 'STUDENT'
    };

    // Note: contains with mode is not supported in all Prisma versions
    // Using simpler query for now
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    console.log('[ADMIN_STUDENTS_API] Fetching students with filters:', { search, classFilter, riskFilter });

    // Fetch students - simple query without relations
    const students = await db.user.findMany({
      where,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    console.log('[ADMIN_STUDENTS_API] Found students:', students.length);

    // For each student, fetch their data separately
    const studentsWithMetrics = await Promise.all(students.map(async (student) => {
      // Fetch purchases
      const purchases = await db.purchase.findMany({
        where: { userId: student.id },
        include: { Course: true }
      });

      // Fetch progress
      const userProgress = await db.userProgress.findMany({
        where: { userId: student.id, isCompleted: true }
      });

      // Fetch chapters count for enrolled courses
      let totalChapters = 0;
      for (const purchase of purchases) {
        const count = await db.chapter.count({
          where: { courseId: purchase.courseId, isPublished: true }
        });
        totalChapters += count;
      }
      
      const completedChapters = userProgress.length;
      const masteryPercentage = totalChapters > 0 
        ? Math.round((completedChapters / totalChapters) * 100) 
        : 0;

      // Calculate XP (simplified - would use XP table in production)
      const currentXP = completedChapters * 100 + purchases.length * 50;

      // Calculate last active
      const lastActive = student.updatedAt;
      const daysSinceActive = Math.floor(
        (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine risk level based on activity and progress
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (daysSinceActive >= 7 || masteryPercentage < 20) {
        riskLevel = 'critical';
      } else if (daysSinceActive >= 5 || masteryPercentage < 40) {
        riskLevel = 'high';
      } else if (daysSinceActive >= 3 || masteryPercentage < 60) {
        riskLevel = 'medium';
      }

      // Calculate emotion score (mock - would use emotion tracking in production)
      const emotionScore = masteryPercentage > 70 ? 8.5 : 
                          masteryPercentage > 50 ? 7.0 :
                          masteryPercentage > 30 ? 5.5 : 4.0;

      // XP change (mock - would track historical XP)
      const xpChange = masteryPercentage > 50 ? 15.3 : -8.5;

      // Get class from first enrolled course (simplified)
      const enrolledClass = (purchases && purchases[0] && purchases[0].Course) 
        ? purchases[0].Course.title 
        : 'No Class';

      return {
        id: student.id,
        name: student.name || 'Unknown',
        email: student.email,
        avatar: student.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST',
        class: enrolledClass,
        currentXP,
        xpChange,
        masteryPercentage,
        emotionScore,
        riskLevel,
        lastActive: daysSinceActive === 0 ? 'Today' :
                   daysSinceActive === 1 ? 'Yesterday' :
                   `${daysSinceActive} days ago`,
        enrolledCourses: purchases.length,
        totalChapters,
        completedChapters
      };
    }));

    // Apply filters
    let filteredStudents = studentsWithMetrics;

    if (classFilter !== 'all') {
      filteredStudents = filteredStudents.filter(s => 
        s.class.toLowerCase().includes(classFilter.toLowerCase())
      );
    }

    if (riskFilter !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.riskLevel === riskFilter);
    }

    return NextResponse.json({
      students: filteredStudents,
      metadata: {
        total: filteredStudents.length,
        filters: { search, class: classFilter, risk: riskFilter }
      }
    });

  } catch (error: any) {
    console.error('[ADMIN_STUDENTS_API] Error:', error);
    console.error('[ADMIN_STUDENTS_API] Stack:', error.stack);
    console.error('[ADMIN_STUDENTS_API] Message:', error.message);
    return NextResponse.json({ 
      error: 'Internal Error', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

