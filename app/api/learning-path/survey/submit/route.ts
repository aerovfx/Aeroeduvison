import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/learning-path/survey/submit
 * Submit survey response and create a learning path pending review
 *
 * Body: {
 *   surveyData: any,
 *   assessmentScore?: any,
 *   generatedPath: {
 *     title: string,
 *     description?: string,
 *     goals: string[],
 *     domains: any[],
 *     segments: any[],
 *     weeklyPlan: any[],
 *     metadata?: object
 *   }
 * }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. User must be logged in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { surveyData, assessmentScore, generatedPath } = body;

    // Validate required fields
    if (!surveyData || !generatedPath) {
      return NextResponse.json(
        { error: 'Missing required fields: surveyData and generatedPath' },
        { status: 400 }
      );
    }

    if (!generatedPath.title) {
      return NextResponse.json(
        { error: 'Learning path must have a title' },
        { status: 400 }
      );
    }

    const studentId = session.user.id;

    // Save SurveyResponse
    const surveyResponse = await db.surveyResponse.create({
      data: {
        studentId,
        surveyData,
        assessmentScore: assessmentScore || null,
        status: 'completed',
      },
    });

    // Create LearningPath with status "pending_review"
    const learningPath = await db.learningPath.create({
      data: {
        studentId,
        title: generatedPath.title,
        description: generatedPath.description || '',
        surveyResponseId: surveyResponse.id,
        goals: generatedPath.goals || [],
        domains: generatedPath.domains || [],
        segments: generatedPath.segments || [],
        weeklyPlan: generatedPath.weeklyPlan || [],
        metadata: generatedPath.metadata || {},
        status: 'pending_review',
      },
    });

    // Define approval sections
    const sections = [
      {
        key: 'goals',
        label: 'Mục tiêu',
      },
      {
        key: 'domains',
        label: 'Môn học',
      },
      {
        key: 'segments',
        label: 'Nội dung bài học',
      },
      {
        key: 'weekly_plan',
        label: 'Kế hoạch tuần',
      },
      {
        key: 'overall',
        label: 'Tổng thể',
      },
    ];

    // Create LearningPathApproval records for each section
    // Initially without a teacher assignment - will be assigned during review
    for (const section of sections) {
      await db.learningPathApproval.create({
        data: {
          learningPathId: learningPath.id,
          teacherId: studentId, // Placeholder - will be updated when teacher reviews
          section: section.key,
          sectionLabel: section.label,
          status: 'pending',
        },
      });
    }

    console.log(
      `[SURVEY_SUBMIT] Created learning path ${learningPath.id} for student ${studentId}`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Survey submitted and learning path created successfully',
        learningPathId: learningPath.id,
        surveyResponseId: surveyResponse.id,
        status: 'pending_review',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[SURVEY_SUBMIT] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit survey and create learning path',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
