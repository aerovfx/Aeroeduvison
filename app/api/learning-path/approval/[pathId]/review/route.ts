import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/learning-path/approval/[pathId]/review
 * Teacher reviews a specific section
 * Must be TEACHER or ADMIN
 *
 * Body: {
 *   section: string,
 *   status: 'approved' | 'needs_revision' | 'rejected',
 *   teacherNotes?: string,
 *   modifications?: object
 * }
 */
export async function POST(
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
        { error: 'Forbidden. Only teachers and admins can review learning paths.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { section, status, teacherNotes, modifications } = body;
    const { pathId } = await params;

    // Validate required fields
    if (!section || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: section, status' },
        { status: 400 }
      );
    }

    if (!['approved', 'needs_revision', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: approved, needs_revision, rejected' },
        { status: 400 }
      );
    }

    // Verify learning path exists
    const learningPath = await db.learningPath.findUnique({
      where: { id: pathId },
    });

    if (!learningPath) {
      return NextResponse.json(
        { error: 'Learning path not found' },
        { status: 404 }
      );
    }

    // Find the approval record for this section
    const approval = await db.learningPathApproval.findUnique({
      where: {
        learningPathId_section: {
          learningPathId: pathId,
          section: section,
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: `Approval record for section "${section}" not found` },
        { status: 404 }
      );
    }

    // Get the current content of this section for originalData
    const sectionData: Record<string, any> = {
      goals: learningPath.goals,
      domains: learningPath.domains,
      segments: learningPath.segments,
      weekly_plan: learningPath.weeklyPlan,
      overall: {
        title: learningPath.title,
        description: learningPath.description,
      },
    };

    // Update LearningPathApproval
    const updatedApproval = await db.learningPathApproval.update({
      where: { id: approval.id },
      data: {
        teacherId: session.user.id, // Assign the teacher who is reviewing
        status: status,
        teacherNotes: teacherNotes || null,
        modifications: modifications || null,
        originalData: sectionData[section] || null,
        reviewedAt: new Date(),
      },
    });

    // Check if all sections are now approved or if any are rejected/needs_revision
    const allApprovals = await db.learningPathApproval.findMany({
      where: { learningPathId: pathId },
    });

    const allApproved = allApprovals.every((a) => a.status === 'approved');
    const anyRejected = allApprovals.some((a) => a.status === 'rejected');
    const anyNeedsRevision = allApprovals.some(
      (a) => a.status === 'needs_revision'
    );

    let newPathStatus = learningPath.status;

    if (allApproved) {
      newPathStatus = 'approved';
    } else if (anyRejected) {
      newPathStatus = 'rejected';
    } else if (anyNeedsRevision) {
      newPathStatus = 'needs_revision';
    } else {
      newPathStatus = 'in_review';
    }

    // Update LearningPath status if needed
    if (newPathStatus !== learningPath.status) {
      await db.learningPath.update({
        where: { id: pathId },
        data: { status: newPathStatus },
      });
    }

    console.log(
      `[APPROVAL_REVIEW] Teacher ${session.user.id} reviewed section "${section}" of learning path ${pathId}. New status: ${status}`
    );

    return NextResponse.json(
      {
        success: true,
        message: `Section "${section}" reviewed successfully`,
        approval: updatedApproval,
        learningPathStatus: newPathStatus,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[APPROVAL_REVIEW] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to review learning path section',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
