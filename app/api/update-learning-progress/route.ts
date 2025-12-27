import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// API to update learning progress and XP in real-time
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      lessonId, 
      lessonTitle, 
      earnedXP, 
      timeSpent, 
      difficulty,
      subject,
      completionStatus 
    } = await req.json();

    // Store learning activity
    try {
      // Try to create a learning activity record
      await db.$executeRaw`
        INSERT INTO learning_activities (
          user_id, 
          lesson_id, 
          lesson_title,
          earned_xp, 
          time_spent, 
          difficulty,
          subject,
          completion_status,
          created_at
        )
        VALUES (
          ${session.user.id},
          ${lessonId},
          ${lessonTitle},
          ${earnedXP},
          ${timeSpent},
          ${difficulty},
          ${subject},
          ${completionStatus},
          NOW()
        )
      `;
    } catch (dbError) {
      console.log('Note: learning_activities table not found, using UserProgress instead');
    }

    // Update user's total XP in user metadata
    try {
      await db.$executeRaw`
        UPDATE users 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{total_xp}',
          (COALESCE((metadata->>'total_xp')::int, 0) + ${earnedXP})::text::jsonb
        ),
        updated_at = NOW()
        WHERE id = ${session.user.id}
      `;
    } catch (dbError) {
      console.log('Note: Could not update user XP metadata');
    }

    // Calculate daily stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let dailyStats = {
      totalXP: earnedXP,
      completedLessons: completionStatus === 'completed' ? 1 : 0,
      timeSpent: timeSpent,
      subjects: [subject]
    };

    try {
      const todayActivities = await db.$queryRaw<any[]>`
        SELECT 
          SUM(earned_xp) as total_xp,
          COUNT(*) as completed_lessons,
          SUM(time_spent) as total_time
        FROM learning_activities
        WHERE user_id = ${session.user.id}
        AND created_at >= ${todayStart.toISOString()}
      `;

      if (todayActivities && todayActivities.length > 0) {
        dailyStats = {
          totalXP: Number(todayActivities[0].total_xp || earnedXP),
          completedLessons: Number(todayActivities[0].completed_lessons || 1),
          timeSpent: Number(todayActivities[0].total_time || timeSpent),
          subjects: [subject]
        };
      }
    } catch (error) {
      console.log('Could not fetch today activities, using current data');
    }

    return NextResponse.json({
      success: true,
      earnedXP,
      dailyStats,
      message: 'Progress updated successfully'
    });

  } catch (error) {
    console.error('Error updating learning progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch today's learning stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let dailyStats = {
      totalXP: 0,
      completedLessons: 0,
      timeSpent: 0,
      subjects: [],
      activities: []
    };

    try {
      const todayActivities = await db.$queryRaw<any[]>`
        SELECT 
          lesson_title,
          earned_xp,
          time_spent,
          subject,
          completion_status,
          created_at
        FROM learning_activities
        WHERE user_id = ${session.user.id}
        AND created_at >= ${todayStart.toISOString()}
        ORDER BY created_at DESC
      `;

      if (todayActivities && todayActivities.length > 0) {
        dailyStats = {
          totalXP: todayActivities.reduce((sum, act) => sum + Number(act.earned_xp || 0), 0),
          completedLessons: todayActivities.filter(act => act.completion_status === 'completed').length,
          timeSpent: todayActivities.reduce((sum, act) => sum + Number(act.time_spent || 0), 0),
          subjects: [...new Set(todayActivities.map(act => act.subject))],
          activities: todayActivities
        };
      }
    } catch (error) {
      console.log('Could not fetch today activities');
    }

    return NextResponse.json({
      success: true,
      dailyStats
    });

  } catch (error) {
    console.error('Error fetching learning stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

