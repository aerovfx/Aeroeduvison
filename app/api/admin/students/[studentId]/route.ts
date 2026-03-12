import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { studentId } = await params;

    const student = await db.user.findUnique({
      where: { id: studentId, role: 'STUDENT' }
    });

    if (!student) {
      return new NextResponse('Student not found', { status: 404 });
    }

    const [purchases, userProgress] = await Promise.all([
      db.purchase.findMany({
        where: { userId: studentId },
        include: {
          Course: {
            include: {
              Chapter: {
                where: { isPublished: true },
                orderBy: { position: 'asc' }
              }
            }
          }
        }
      }),
      db.userProgress.findMany({
        where: { userId: studentId },
        include: { Chapter: true }
      })
    ]);

    const totalChapters = purchases.reduce(
      (sum, p) => sum + (p.Course?.Chapter?.length ?? 0),
      0
    );
    const completedChapters = userProgress.filter(p => p.isCompleted).length;
    const masteryPercentage = totalChapters > 0
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0;

    const currentXP = completedChapters * 100 + purchases.length * 50;

    const daysSinceActive = Math.floor(
      (Date.now() - student.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (daysSinceActive >= 7 || masteryPercentage < 20) {
      riskLevel = 'critical';
    } else if (daysSinceActive >= 5 || masteryPercentage < 40) {
      riskLevel = 'high';
    } else if (daysSinceActive >= 3 || masteryPercentage < 60) {
      riskLevel = 'medium';
    }

    const plgSkills = [
      {
        name: 'Mathematics',
        mastery: masteryPercentage / 100,
        status: masteryPercentage > 80 ? 'mastered' : masteryPercentage > 50 ? 'learning' : 'struggling',
        nextReview: '3 days',
        predictedGain: 0.15
      },
      {
        name: 'Problem Solving',
        mastery: (masteryPercentage + 10) / 100,
        status: masteryPercentage > 70 ? 'mastered' : masteryPercentage > 40 ? 'learning' : 'review',
        nextReview: '5 days',
        predictedGain: 0.12
      }
    ];

    const firstProgress = userProgress[0];
    const timeline = [
      {
        id: '1',
        type: 'quiz',
        title: `Completed ${firstProgress?.Chapter?.title ?? 'Chapter'}`,
        timestamp: firstProgress?.updatedAt?.toISOString() ?? new Date().toISOString(),
        xpGained: 100
      },
      {
        id: '2',
        type: 'login',
        title: 'Started Learning Session',
        timestamp: student.updatedAt.toISOString()
      }
    ];

    const aiSuggestions: Array<{ id: string; type: string; title: string; description: string; confidence: number; action: string }> = [];
    if (daysSinceActive >= 3) {
      aiSuggestions.push({
        id: '1',
        type: 'alert',
        title: 'Low Engagement Alert',
        description: `Student hasn't logged in for ${daysSinceActive} days. Consider sending a check-in message.`,
        confidence: 0.87,
        action: 'Send Message'
      });
    }
    if (masteryPercentage < 50) {
      aiSuggestions.push({
        id: '2',
        type: 'suggestion',
        title: 'Recommend Support',
        description: 'Mastery is below 50%. Assign targeted review materials.',
        confidence: 0.82,
        action: 'Assign Module'
      });
    }

    const courseChapterIds = (p: typeof purchases[0]) =>
      (p.Course?.Chapter ?? []).map(ch => ch.id);

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        avatar: student.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() ?? 'ST',
        class: purchases[0]?.Course?.title ?? 'No Class',
        currentXP,
        masteryPercentage,
        emotionScore: masteryPercentage > 70 ? 8.5 : masteryPercentage > 50 ? 7.0 : 5.5,
        riskLevel,
        lastActive: daysSinceActive === 0 ? 'Today' :
          daysSinceActive === 1 ? 'Yesterday' :
            `${daysSinceActive} days ago`,
        enrolledCourses: purchases.length
      },
      plgSkills,
      timeline,
      aiSuggestions,
      courses: purchases.map(p => ({
        id: p.Course.id,
        title: p.Course.title,
        totalChapters: (p.Course?.Chapter ?? []).length,
        completedChapters: userProgress.filter(
          prog => prog.isCompleted && courseChapterIds(p).includes(prog.chapterId)
        ).length
      }))
    });
  } catch (error) {
    console.error('[ADMIN_STUDENT_DETAIL_API]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

