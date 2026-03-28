import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/learning-path/approval/pending
 * List all learning paths pending review (for teacher dashboard)
 * Must be TEACHER or ADMIN
 *
 * Query params:
 * - limit?: number (default: 20)
 * - offset?: number (default: 0)
 * - status?: 'pending_review' | 'in_review' (filter by status)
 */
export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '20'), 1),
      100
    );
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const statusFilter = url.searchParams.get('status') as
      | 'pending_review'
      | 'in_review'
      | null;

    // Build the where clause
    const whereClause: any = {
      status: {
        in: statusFilter
          ? [statusFilter]
          : ['pending_review', 'in_review', 'needs_revision'],
      },
    };

    // Get total count
    const totalCount = await db.learningPath.count({
      where: whereClause,
    });

    // Fetch learning paths with pagination
    const learningPaths = await db.learningPath.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
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
        createdAt: path.createdAt,
        updatedAt: path.updatedAt,
        student: path.student,
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
      `[APPROVAL_PENDING] Fetched ${learningPaths.length} pending learning paths for user ${session.user.id}`
    );

    return NextResponse.json(
      {
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
    console.error('[APPROVAL_PENDING] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch pending learning paths',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
