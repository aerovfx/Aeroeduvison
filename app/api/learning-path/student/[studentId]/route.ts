import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/learning-path/student/[studentId]
 * Get student's learning paths (for student dashboard)
 * Can be accessed by the student themselves, or by a teacher/admin
 *
 * Query params:
 * - limit?: number (default: 20)
 * - offset?: number (default: 0)
 * - status?: string (filter by status)
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
        { error: 'Forbidden. You can only access your own learning paths.' },
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

    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '20'), 1),
      100
    );
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const statusFilter = url.searchParams.get('status');

    // Build where clause
    const whereClause: any = {
      studentId: targetStudentId,
    };

    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    // Get total count
    const totalCount = await db.learningPath.count({
      where: whereClause,
    });

    // Fetch learning paths
    const learningPaths = await db.learningPath.findMany({
      where: whereClause,
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Format response with approval progress
    const formattedPaths = learningPaths.map((path) => {
      const totalSteps = path.approvalSteps.length;
      const approvedSteps = path.approvalSteps.filter(
        (step) => step.status === 'approved'
      ).length;
      const rejectedSteps = path.approvalSteps.filter(
        (step) => step.status === 'rejected'
      ).length;
      const revisionsNeeded = path.approvalSteps.filter(
        (step) => step.status === 'needs_revision'
      ).length;

      return {
        id: path.id,
        title: path.title,
        description: path.description,
        status: path.status,
        progress: path.progress,
        createdAt: path.createdAt,
        updatedAt: path.updatedAt,
        startedAt: path.startedAt,
        completedAt: path.completedAt,
        template: path.template,
        approvalProgress: {
          total: totalSteps,
          approved: approvedSteps,
          rejected: rejectedSteps,
          needsRevision: revisionsNeeded,
          pending: totalSteps - approvedSteps - rejectedSteps - revisionsNeeded,
        },
      };
    });

    console.log(
      `[STUDENT_LEARNING_PATHS] Fetched ${learningPaths.length} learning paths for student ${targetStudentId}`
    );

    return NextResponse.json(
      {
        student,
        learningPaths: formattedPaths,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[STUDENT_LEARNING_PATHS] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch student learning paths',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
