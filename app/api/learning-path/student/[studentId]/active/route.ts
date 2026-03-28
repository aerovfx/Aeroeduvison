import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/learning-path/student/[studentId]/active
 * Get student's active/approved learning path
 * Can be accessed by the student themselves, or by a teacher/admin
 *
 * Returns the most recent approved learning path that they can study
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. User must be logged in.' },
        { status: 401 }
      );
    }

    const { studentId: targetStudentId } = await params
    const userRole = session.user.role as string;

    // Students can only access their own learning paths
    // Teachers and admins can access any student's paths
    if (session.user.id !== targetStudentId && !['TEACHER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden. You can only access your own active learning path.' },
        { status: 403 }
      );
    }

    // Verify student exists
    const student = await db.user.findUnique({
      where: { id: targetStudentId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Find the active/approved learning path
    // Priority: active > approved (most recent first)
    const activePath = await db.learningPath.findFirst({
      where: {
        studentId: targetStudentId,
        status: {
          in: ['active', 'approved'],
        },
      },
      include: {
        template: {
          select: {
            id: true,
            title: true,
          },
        },
        approvalSteps: {
          select: {
            id: true,
            section: true,
            status: true,
            sectionLabel: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], // active comes first
    });

    if (!activePath) {
      return NextResponse.json(
        {
          message: 'No active or approved learning path found for this student',
          activePath: null,
          student,
        },
        { status: 200 }
      );
    }

    // Calculate approval progress
    const totalSteps = activePath.approvalSteps.length;
    const approvedSteps = activePath.approvalSteps.filter(
      (step) => step.status === 'approved'
    ).length;

    console.log(
      `[ACTIVE_LEARNING_PATH] Fetched active learning path ${activePath.id} for student ${targetStudentId}`
    );

    return NextResponse.json(
      {
        activePath: {
          id: activePath.id,
          title: activePath.title,
          description: activePath.description,
          status: activePath.status,
          progress: activePath.progress,
          createdAt: activePath.createdAt,
          updatedAt: activePath.updatedAt,
          startedAt: activePath.startedAt,
          completedAt: activePath.completedAt,
          goals: activePath.goals,
          domains: activePath.domains,
          segments: activePath.segments,
          weeklyPlan: activePath.weeklyPlan,
          metadata: activePath.metadata,
          template: activePath.template,
          approvalSteps: activePath.approvalSteps,
          approvalProgress: {
            total: totalSteps,
            approved: approvedSteps,
            pending: totalSteps - approvedSteps,
          },
        },
        student,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[ACTIVE_LEARNING_PATH] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch active learning path',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
