/**
 * Advanced Grading API Route
 * POST /api/grading/grade - Grade a submission
 * GET /api/grading/results - Get grades
 * POST /api/grading/rubric - Create rubric
 */

import { NextRequest, NextResponse } from "next/server";
import {
  gradeSubmission,
  createRubric,
  getSubmissionGrade,
  getSubmissionsByRubric,
  calculateRubricAnalytics,
  submitForGrading,
  getRubricWithCriteria,
  reviewGrade,
} from "@/lib/grading/grading-service";
import { getServerSession } from "next-auth/next";

/**
 * POST /api/grading/grade
 * Submit essay for grading or get grading results
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Action 1: Submit essay for grading
    if (action === "submit") {
      const { rubricId, content, title, sessionId, subject, conceptIds } = body;

      if (!rubricId || !content) {
        return NextResponse.json(
          { error: "rubricId and content are required" },
          { status: 400 }
        );
      }

      if (content.length < 50) {
        return NextResponse.json(
          { error: "Submission must be at least 50 characters" },
          { status: 400 }
        );
      }

      // Get user ID from session (pseudo-code, depends on your auth setup)
      const userId = session.user.id || session.user.email;

      const submission = await submitForGrading(userId, rubricId, content, {
        title,
        sessionId,
        subject,
        conceptIds,
      });

      // Start grading asynchronously
      gradeSubmission(submission.id).catch((error) =>
        console.error("Grading error:", error)
      );

      return NextResponse.json({
        success: true,
        submissionId: submission.id,
        status: "pending",
        message: "Submission received and queued for grading (will complete in ~30 seconds)",
      });
    }

    // Action 2: Get grading results
    if (action === "get-results") {
      const { submissionId } = body;

      if (!submissionId) {
        return NextResponse.json(
          { error: "submissionId is required" },
          { status: 400 }
        );
      }

      const grade = await getSubmissionGrade(submissionId);

      if (!grade) {
        return NextResponse.json(
          { error: "Grade not found", status: "not_ready" },
          { status: 204 }
        );
      }

      return NextResponse.json({
        success: true,
        grade,
      });
    }

    // Action 3: Human review of grade
    if (action === "review") {
      const { gradeId, adjustedScore, notes } = body;

      if (!gradeId) {
        return NextResponse.json(
          { error: "gradeId is required" },
          { status: 400 }
        );
      }

      const userId = session.user.id || session.user.email;
      const updated = await reviewGrade(
        gradeId,
        userId,
        adjustedScore,
        notes
      );

      return NextResponse.json({
        success: true,
        message: "Grade reviewed successfully",
        grade: updated,
      });
    }

    // Action 4: Create rubric
    if (action === "create-rubric") {
      const { name, subject, grade, criteria, options } = body;

      if (!name || !subject || !grade || !criteria || criteria.length === 0) {
        return NextResponse.json(
          {
            error:
              "name, subject, grade, and criteria (array) are required",
          },
          { status: 400 }
        );
      }

      const createdRubric = await createRubric(
        name,
        subject,
        grade,
        criteria,
        {
          createdBy: session.user.id || session.user.email,
          ...options,
        }
      );

      return NextResponse.json({
        success: true,
        rubric: createdRubric,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Grading API error:", error);
    return NextResponse.json(
      {
        error: "Grading failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grading/results?rubricId=xxx&userId=yyy
 * Get submissions and grades for a rubric
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const rubricId = url.searchParams.get("rubricId");
    const userId = url.searchParams.get("userId");
    const action = url.searchParams.get("action");

    // Get submissions for rubric
    if (action === "submissions") {
      if (!rubricId) {
        return NextResponse.json(
          { error: "rubricId is required" },
          { status: 400 }
        );
      }

      const submissions = await getSubmissionsByRubric(rubricId, userId);

      return NextResponse.json({
        success: true,
        resultCount: submissions.length,
        submissions,
      });
    }

    // Get rubric analytics
    if (action === "analytics") {
      if (!rubricId) {
        return NextResponse.json(
          { error: "rubricId is required" },
          { status: 400 }
        );
      }

      const analytics = await calculateRubricAnalytics(rubricId);

      return NextResponse.json({
        success: true,
        analytics,
      });
    }

    // Get rubric details
    if (action === "rubric") {
      if (!rubricId) {
        return NextResponse.json(
          { error: "rubricId is required" },
          { status: 400 }
        );
      }

      const rubric = await getRubricWithCriteria(rubricId);

      if (!rubric) {
        return NextResponse.json(
          { error: "Rubric not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        rubric,
      });
    }

    return NextResponse.json(
      { error: 'Missing or invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET grading error:", error);
    return NextResponse.json(
      {
        error: "Failed to get grading results",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/grading/grade
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
