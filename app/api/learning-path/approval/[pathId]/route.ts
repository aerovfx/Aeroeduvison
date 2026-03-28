import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/learning-path/approval/[pathId]
 * Get learning path with all approval steps (for teacher review page)
 * Must be TEACHER or ADMIN role
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. User must be logged in.' },
        { status: 401 }
      );
    }

    // Check if user is TEACHER or ADMIN
    const userRole = session.user.role as string;
    if (!['TEACHER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden. Only teachers and admins can access this.' },
        { status: 403 }
      );
    }

    const { pathId } = await params;

    // Fetch learning path with related data
    const learningPath = await db.learningPath.findUnique({
      where: { id: pathId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        surveyResponse: {
          select: {
            id: true,
            surveyData: true,
            assessmentScore: true,
            createdAt: true,
          },
        },
        approvalSteps: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!learningPath) {
      return NextResponse.json(
        { error: 'Learning path not found' },
        { status: 404 }
      );
    }

    // Calculate approval progress
    const totalSteps = learningPath.approvalSteps.length;
    const approvedSteps = learningPath.approvalSteps.filter(
      (step) => step.status === 'approved'
    ).length;
    const rejectedSteps = learningPath.approvalSteps.filter(
      (step) => step.status === 'rejected'
    ).length;
    const revisionsNeeded = learningPath.approvalSteps.filter(
      (step) => step.status === 'needs_revision'
    ).length;

    console.log(
      `[APPROVAL_GET] Fetched learning path ${pathId} for review by user ${session.user.id}`
    );

    return NextResponse.json(
      {
        learningPath: {
          id: learningPath.id,
          title: learningPath.title,
          description: learningPath.description,
          status: learningPath.status,
          progress: learningPath.progress,
          createdAt: learningPath.createdAt,
          updatedAt: learningPath.updatedAt,
          goals: learningPath.goals,
          domains: learningPath.domains,
          segments: learningPath.segments,
          weeklyPlan: learningPath.weeklyPlan,
          metadata: learningPath.metadata,
        },
        student: learningPath.student,
        surveyResponse: learningPath.surveyResponse,
        approvalSteps: learningPath.approvalSteps,
        approvalProgress: {
          total: totalSteps,
          approved: approvedSteps,
          rejected: rejectedSteps,
          needsRevision: revisionsNeeded,
          pending: totalSteps - approvedSteps - rejectedSteps - revisionsNeeded,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[APPROVAL_GET] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch learning path approval data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
