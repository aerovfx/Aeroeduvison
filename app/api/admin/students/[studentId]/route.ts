import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { studentId } = params;

    // Fetch student with full details
    const student = await db.user.findUnique({
      where: { id: studentId },
      include: {
        purchases: {
          include: {
            course: {
              include: {
                chapters: {
                  where: { isPublished: true },
                  orderBy: { position: 'asc' }
                }
              }
            }
          }
        },
        userProgress: {
          include: {
            chapter: true
          }
        }
      }
    });

    if (!student) {
      return new NextResponse('Student not found', { status: 404 });
    }

    // Calculate metrics
    const totalChapters = student.purchases.reduce((sum, purchase) => 
      sum + (purchase.course?.chapters?.length || 0), 0
    );
    const completedChapters = student.userProgress.filter(p => p.isCompleted).length;
    const masteryPercentage = totalChapters > 0 
      ? Math.round((completedChapters / totalChapters) * 100) 
      : 0;

    const currentXP = completedChapters * 100 + student.purchases.length * 50;

    // Calculate risk level
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

    // Mock PLG skills (would use PLG API in production)
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

    // Mock timeline (would use interaction logs in production)
    const timeline = [
      {
        id: '1',
        type: 'quiz',
        title: `Completed ${student.userProgress[0]?.chapter?.title || 'Chapter'}`,
        timestamp: student.userProgress[0]?.updatedAt?.toISOString() || new Date().toISOString(),
        xpGained: 100
      },
      {
        id: '2',
        type: 'login',
        title: 'Started Learning Session',
        timestamp: student.updatedAt.toISOString()
      }
    ];

    // Mock AI suggestions
    const aiSuggestions = [];
    
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

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        avatar: student.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST',
        class: student.purchases[0]?.course?.title || 'No Class',
        currentXP,
        masteryPercentage,
        emotionScore: masteryPercentage > 70 ? 8.5 : masteryPercentage > 50 ? 7.0 : 5.5,
        riskLevel,
        lastActive: daysSinceActive === 0 ? 'Today' : 
                   daysSinceActive === 1 ? 'Yesterday' :
                   `${daysSinceActive} days ago`,
        enrolledCourses: student.purchases.length
      },
      plgSkills,
      timeline,
      aiSuggestions,
      courses: student.purchases.map(p => ({
        id: p.course.id,
        title: p.course.title,
        totalChapters: p.course.chapters.length,
        completedChapters: student.userProgress.filter(
          prog => prog.isCompleted && 
          p.course.chapters.some(ch => ch.id === prog.chapterId)
        ).length
      }))
    });

  } catch (error) {
    console.error('[ADMIN_STUDENT_DETAIL_API]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

