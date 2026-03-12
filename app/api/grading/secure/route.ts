/**
 * Enhanced Grading API with Security
 * Example API route showing integrated security features
 * 
 * Route: app/api/grading/secure/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurityCheck, gradingLimiter, createSecureResponse } from '@/lib/security/middleware';
import { detectPII, redactPII } from '@/lib/security/pii-detection';
import { filterContent } from '@/lib/security/content-filter';
import {
  logEssaySubmission,
  logEssayGraded,
  logContentBlocked,
  logPIIDetected
} from '@/lib/security/audit-logger';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/grading/secure
 * Secured essay submission and grading endpoint
 *
 * Features:
 * - PII detection and redaction
 * - Content filtering (blocks harmful content)
 * - Rate limiting (50 requests per hour)
 * - Audit logging
 * - Input sanitization
 * - Secure response headers
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate and sanitize input with security checks
    const body = await withSecurityCheck(req, 'grading');

    // Check if there was a security error
    if (body instanceof NextResponse) {
      return body;
    }

    const { action, submissionId, rubricId, content, title, userId } = body;

    // 2. Log the action
    const userIdFromHeader = req.headers.get('x-user-id') || userId || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

    // 3. Check for PII and content
    const piiDetected = detectPII(content || '');
    const contentCheck = filterContent(content || '');

    if (piiDetected.length > 0) {
      await logPIIDetected(
        userIdFromHeader,
        ipAddress,
        content,
        piiDetected.map(p => p.type).join(', ')
      );

      return createSecureResponse({
        success: false,
        error: 'Submission contains personal information. Please remove it before submitting.',
        details: `Detected: ${piiDetected.map(p => p.type).join(', ')}`
      }, 400);
    }

    if (contentCheck.isBlocked) {
      await logContentBlocked(
        userIdFromHeader,
        ipAddress,
        contentCheck.categories.join(', ')
      );

      return createSecureResponse({
        success: false,
        error: 'Submission contains inappropriate content. Please revise and resubmit.',
        details: `Blocked categories: ${contentCheck.categories.join(', ')}`
      }, 400);
    }

    // 4. Proceed with action based on 'action' parameter
    if (action === 'submit') {
      // Submit essay for grading

      if (!rubricId || !content) {
        return createSecureResponse({
          success: false,
          error: 'Missing required fields: rubricId, content'
        }, 400);
      }

      // Get or create submission
      const submission = await prisma.studentSubmission.create({
        data: {
          userId: userIdFromHeader,
          rubricId,
          content: redactPII(content), // Store redacted version
          title: title || 'Submission',
          status: 'pending',
          submittedAt: new Date()
        }
      });

      // Log submission
      await logEssaySubmission(userIdFromHeader, submission.id, rubricId);

      return createSecureResponse({
        success: true,
        message: 'Essay submitted successfully',
        submissionId: submission.id,
        status: 'pending',
        securityNotice: contentCheck.warning
          ? `Warning: ${contentCheck.message}`
          : undefined
      }, 201);
    }

    if (action === 'get-results') {
      // Get grading results for submission

      if (!submissionId) {
        return createSecureResponse({
          success: false,
          error: 'Missing required field: submissionId'
        }, 400);
      }

      const submission = await prisma.studentSubmission.findUnique({
        where: { id: submissionId },
        include: { grade: true }
      });

      if (!submission) {
        return createSecureResponse({
          success: false,
          error: 'Submission not found'
        }, 404);
      }

      // Check if grading is complete
      if (!submission.grade) {
        return new NextResponse(null, { status: 204 }); // No content - still grading
      }

      // Redact sensitive information from grade
      const grade = submission.grade;
      return createSecureResponse({
        success: true,
        grade: {
          id: grade.id,
          finalScore: grade.finalScore,
          percentage: grade.percentage,
          status: grade.status,
          feedback: grade.feedback,
          strengths: grade.strengths.filter(s => !detectPII(s).length),
          improvements: grade.improvements.filter(i => !detectPII(i).length),
          recommendations: grade.recommendedConcepts,
          confidenceScore: grade.confidenceScore
        }
      });
    }

    return createSecureResponse({
      success: false,
      error: 'Invalid action'
    }, 400);
  } catch (error: any) {
    console.error('Secure grading error:', error);

    return createSecureResponse({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, 500);
  }
}

/**
 * GET /api/grading/secure
 * Get submission results or analytics with security checks
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const submissionId = searchParams.get('submissionId');

    const userId = req.headers.get('x-user-id') || 'unknown';

    if (action === 'submission' && submissionId) {
      const submission = await prisma.studentSubmission.findUnique({
        where: { id: submissionId },
        include: {
          grade: {
            select: {
              finalScore: true,
              percentage: true,
              status: true,
              gradedAt: true
            }
          }
        }
      });

      if (!submission) {
        return createSecureResponse({
          success: false,
          error: 'Submission not found'
        }, 404);
      }

      // Allow access only to own submissions
      if (submission.userId !== userId) {
        return createSecureResponse({
          success: false,
          error: 'Unauthorized: Cannot access other users submissions'
        }, 403);
      }

      return createSecureResponse({
        success: true,
        submission: {
          id: submission.id,
          title: submission.title,
          submittedAt: submission.submittedAt,
          status: submission.status,
          grade: submission.grade || null
        }
      });
    }

    return createSecureResponse({
      success: false,
      error: 'Invalid query parameters'
    }, 400);
  } catch (error: any) {
    console.error('Secure grading GET error:', error);

    return createSecureResponse({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
}

/**
 * OPTIONS /api/grading/secure
 * CORS preflight with security headers
 */
export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
}
