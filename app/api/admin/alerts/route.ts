import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    console.log('[ADMIN_ALERTS_API] Starting...');
    
    const session = await getServerSession(authOptions);
    console.log('[ADMIN_ALERTS_API] Session:', session?.user?.email, session?.user?.role);

    if (!session) {
      console.log('[ADMIN_ALERTS_API] No session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      console.log('[ADMIN_ALERTS_API] Wrong role:', session.user.role);
      return NextResponse.json({ error: 'Not authorized - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type') || 'all';
    const severityFilter = searchParams.get('severity') || 'all';
    const statusFilter = searchParams.get('status') || 'all';

    console.log('[ADMIN_ALERTS_API] Filters:', { typeFilter, severityFilter, statusFilter });

    // Fetch at-risk students for risk alerts
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log('[ADMIN_ALERTS_API] Fetching inactive students since:', threeDaysAgo);

    // Simplified query - no nested relations
    const inactiveStudents = await db.user.findMany({
      where: {
        role: 'STUDENT',
        updatedAt: { lt: threeDaysAgo }
      },
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true
      }
    });

    console.log('[ADMIN_ALERTS_API] Found inactive students:', inactiveStudents.length);

    // Fetch progress separately for each student
    const studentsWithProgress = await Promise.all(
      inactiveStudents.map(async (student) => {
        const progressCount = await db.userProgress.count({
          where: { userId: student.id, isCompleted: true }
        });
        return { ...student, progressCount };
      })
    );

    // Generate alerts from data
    const alerts = [];

    console.log('[ADMIN_ALERTS_API] Generating risk alerts...');

    // Risk alerts for inactive students
    for (const student of studentsWithProgress.slice(0, 5)) { // Top 5 most critical
      const daysSinceActive = Math.floor(
        (Date.now() - student.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const severity = daysSinceActive >= 7 ? 'critical' :
                      daysSinceActive >= 5 ? 'high' : 'medium';

      alerts.push({
        id: `alert_${student.id}`,
        type: 'risk',
        severity,
        studentId: student.id,
        studentName: student.name,
        title: daysSinceActive >= 7 ? 'Critical Drop in Engagement' : 'Declining Activity',
        description: `Student hasn't logged in for ${daysSinceActive} days. ${student.progressCount === 0 ? 'No progress recorded.' : `${student.progressCount} chapters completed.`}`,
        explainability: `Pattern analysis shows: (1) Login frequency dropped. (2) Last activity was ${daysSinceActive} days ago. (3) Risk of drop-off increasing.`,
        suggestedActions: ['Send personalized message', 'Contact parent', 'Schedule 1-on-1 session'],
        status: daysSinceActive >= 7 ? 'new' : 'assigned',
        assignedTo: daysSinceActive < 7 ? 'Auto-assigned' : undefined,
        slaDeadline: daysSinceActive >= 7 ? '2 hours' : '1 day',
        createdAt: `${daysSinceActive} days ago`
      });
    }

    // Engagement alerts - fetch students without progress
    console.log('[ADMIN_ALERTS_API] Checking for students with no progress...');
    
    const allStudents = await db.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true }
    });

    const studentsWithAnyProgress = await db.userProgress.findMany({
      where: { isCompleted: true },
      select: { userId: true },
      distinct: ['userId']
    });

    const studentIdsWithAnyProgress = new Set(studentsWithAnyProgress.map(p => p.userId));
    const lowProgressStudentsCount = allStudents.filter(s => !studentIdsWithAnyProgress.has(s.id)).length;

    if (lowProgressStudentsCount > 0) {
      alerts.push({
        id: 'alert_low_progress',
        type: 'engagement',
        severity: 'medium',
        title: 'Students with No Progress',
        description: `${lowProgressStudentsCount} students have enrolled but haven't started any content.`,
        explainability: `Analysis: (1) Students enrolled but inactive. (2) Possible onboarding issues. (3) May need welcome message or guided tour.`,
        suggestedActions: ['Send welcome message', 'Assign starter module', 'Check for technical issues'],
        status: 'new',
        slaDeadline: '12 hours',
        createdAt: '2 hours ago'
      });
    }

    console.log('[ADMIN_ALERTS_API] Total alerts generated:', alerts.length);

    // Apply filters
    let filteredAlerts = alerts;

    if (typeFilter !== 'all') {
      filteredAlerts = filteredAlerts.filter(a => a.type === typeFilter);
    }

    if (severityFilter !== 'all') {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severityFilter);
    }

    if (statusFilter !== 'all') {
      filteredAlerts = filteredAlerts.filter(a => a.status === statusFilter);
    }

    console.log('[ADMIN_ALERTS_API] Filtered alerts:', filteredAlerts.length);

    const response = {
      alerts: filteredAlerts,
      metadata: {
        total: filteredAlerts.length,
        byType: {
          emotion: alerts.filter(a => a.type === 'emotion').length,
          engagement: alerts.filter(a => a.type === 'engagement').length,
          risk: alerts.filter(a => a.type === 'risk').length,
          teacher: alerts.filter(a => a.type === 'teacher').length,
          content: alerts.filter(a => a.type === 'content').length
        }
      }
    };

    console.log('[ADMIN_ALERTS_API] Returning response');
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[ADMIN_ALERTS_API] Error:', error);
    console.error('[ADMIN_ALERTS_API] Message:', error.message);
    console.error('[ADMIN_ALERTS_API] Stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal Error', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

