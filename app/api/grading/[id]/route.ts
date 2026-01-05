/**
 * GET /api/grading/[id]
 * Get grading result by submission ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/grading/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const submissionId = params.id;

    // 2. Fetch submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            course: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // 3. Authorization check
    const isStudent = submission.studentId === session.user.id;
    const isTeacher = session.user.role === 'TEACHER' || session.user.role === 'ADMIN';

    if (!isStudent && !isTeacher) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this submission' },
        { status: 403 }
      );
    }

    // 4. Parse AI grading result
    const aiGradingResult = submission.aiGradingResult as any;

    // 5. Format response
    const response = {
      success: true,
      data: {
        submission: {
          id: submission.id,
          content: submission.content,
          submittedAt: submission.submittedAt,
          gradedAt: submission.gradedAt,
          status: submission.status,
        },
        student: isTeacher ? submission.student : undefined,
        assignment: {
          id: submission.assignment.id,
          title: submission.assignment.title,
          description: submission.assignment.description,
          subject: submission.assignment.course.subject,
          gradeLevel: submission.assignment.course.gradeLevel,
        },
        grading: {
          score: submission.score,
          percentage: submission.score ? (submission.score / 10) * 100 : 0,
          grade: scoreToGrade(submission.score || 0),
          confidence: submission.confidence,
          feedback: submission.feedback,
          criteriaScores: aiGradingResult?.criteriaScores || [],
          strengths: aiGradingResult?.strengths || [],
          improvements: aiGradingResult?.improvements || [],
          suggestions: aiGradingResult?.suggestions || [],
        },
        review: {
          needsReview: submission.status === 'PENDING_REVIEW',
          reviewedBy: submission.reviewedBy,
          reviewNotes: submission.reviewNotes,
        },
        metadata: {
          attempts: await getSubmissionAttempts(
            submission.assignmentId,
            submission.studentId
          ),
          classAverage: await getClassAverage(submission.assignmentId),
          percentile: await getPercentile(
            submission.assignmentId,
            submission.score || 0
          ),
        },
      },
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Get grading error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to fetch grading result',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/grading/[id]
 * Update grading result (teacher only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Authorization - teachers only
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only teachers can update grades' },
        { status: 403 }
      );
    }

    const submissionId = params.id;

    // 3. Parse request body
    const body = await req.json();
    const { score, feedback, status, reviewNotes } = body;

    // 4. Validate
    if (score !== undefined && (score < 0 || score > 10)) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 10' },
        { status: 400 }
      );
    }

    // 5. Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: score !== undefined ? score : undefined,
        feedback: feedback !== undefined ? feedback : undefined,
        status: status !== undefined ? status : undefined,
        reviewNotes: reviewNotes !== undefined ? reviewNotes : undefined,
        reviewedBy: session.user.id,
        gradedAt: new Date(),
      },
      include: {
        assignment: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`✅ Updated submission ${submissionId} by ${session.user.name}`);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedSubmission.id,
        score: updatedSubmission.score,
        feedback: updatedSubmission.feedback,
        status: updatedSubmission.status,
        gradedAt: updatedSubmission.gradedAt,
      },
    });

  } catch (error: any) {
    console.error('❌ Update grading error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to update grading',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grading/[id]
 * Delete submission (student only, before grading)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const submissionId = params.id;

    // 2. Fetch submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // 3. Authorization - only student who submitted
    if (submission.studentId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own submissions' },
        { status: 403 }
      );
    }

    // 4. Check if already graded
    if (submission.status === 'GRADED') {
      return NextResponse.json(
        { error: 'Cannot delete graded submission' },
        { status: 400 }
      );
    }

    // 5. Delete
    await prisma.submission.delete({
      where: { id: submissionId },
    });

    console.log(`🗑️  Deleted submission ${submissionId}`);

    return NextResponse.json({
      success: true,
      message: 'Submission deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Delete submission error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to delete submission',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get submission attempts count
 */
async function getSubmissionAttempts(
  assignmentId: string,
  studentId: string
): Promise<number> {
  return await prisma.submission.count({
    where: {
      assignmentId,
      studentId,
    },
  });
}

/**
 * Helper: Get class average for assignment
 */
async function getClassAverage(assignmentId: string): Promise<number> {
  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId,
      status: 'GRADED',
      score: { not: null },
    },
    select: {
      score: true,
    },
  });

  if (submissions.length === 0) return 0;

  const total = submissions.reduce((sum, s) => sum + (s.score || 0), 0);
  return total / submissions.length;
}

/**
 * Helper: Get percentile for score
 */
async function getPercentile(
  assignmentId: string,
  score: number
): Promise<number> {
  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId,
      status: 'GRADED',
      score: { not: null },
    },
    select: {
      score: true,
    },
  });

  if (submissions.length === 0) return 0;

  const belowCount = submissions.filter(s => (s.score || 0) < score).length;
  return (belowCount / submissions.length) * 100;
}

/**
 * Helper: Score to grade
 */
function scoreToGrade(score: number): string {
  if (score >= 9) return 'A';
  if (score >= 7) return 'B';
  if (score >= 5) return 'C';
  if (score >= 3) return 'D';
  return 'F';
}
