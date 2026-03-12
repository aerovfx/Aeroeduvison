/**
 * API Route: POST /api/quiz/validate
 * 
 * Validate and correct quiz JSON with detailed feedback
 * Useful for:
 * - Validating manually created quizzes
 * - Correcting AI-generated quiz errors
 * - Testing quiz structure before use
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  validateAndCorectQuiz,
  assessQuizQuality,
  parseAndValidateQuiz,
  Quiz
} from '@/lib/validators/quiz-validator';

interface ValidateRequest {
  quiz: unknown;
  strict?: boolean; // If true, don't attempt correction
}

/**
 * POST: Validate or correct quiz
 */
export async function POST(req: NextRequest) {
  try {
    const body: ValidateRequest = await req.json();

    if (!body.quiz) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing quiz data',
          code: 'MISSING_QUIZ'
        },
        { status: 400 }
      );
    }

    let validatedQuiz: Quiz;
    let corrected = false;
    const errors: string[] = [];

    try {
      // Try parsing if it's a string
      if (typeof body.quiz === 'string') {
        validatedQuiz = parseAndValidateQuiz(body.quiz);
      } else {
        // If strict mode, don't attempt correction
        if (body.strict) {
          validatedQuiz = parseAndValidateQuiz(JSON.stringify(body.quiz));
        } else {
          validatedQuiz = validateAndCorectQuiz(body.quiz);
          corrected = true;
        }
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: (error as Error).message,
          code: 'VALIDATION_FAILED',
          data: body.quiz,
        },
        { status: 422 }
      );
    }

    // Assess quality
    const quality = assessQuizQuality(validatedQuiz);

    return NextResponse.json({
      success: true,
      data: {
        quiz: validatedQuiz,
        quality: {
          score: quality.score,
          isValid: quality.isValid,
          issues: quality.issues,
        },
        validation: {
          passed: true,
          corrected,
          totalQuestions: validatedQuiz.questions.length,
          questionTypes: [...new Set(validatedQuiz.questions.map(q => q.type))],
          difficultyDistribution: {
            easy: validatedQuiz.questions.filter(q => q.difficulty === 'easy').length,
            medium: validatedQuiz.questions.filter(q => q.difficulty === 'medium').length,
            hard: validatedQuiz.questions.filter(q => q.difficulty === 'hard').length,
          },
          estimatedTime: validatedQuiz.metadata?.estimatedTime || (validatedQuiz.questions.length * 1.5),
        },
      },
    });
  } catch (error) {
    console.error('[QUIZ-VALIDATE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Validation error',
        code: 'VALIDATION_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Return validation schema documentation
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    name: 'Quiz Validator API',
    version: '1.0',
    description: 'Validates and corrects quiz JSON structures',
    endpoint: '/api/quiz/validate',
    method: 'POST',
    schema: {
      request: {
        quiz: 'unknown - The quiz object or JSON string to validate',
        strict: 'boolean? - If true, don\'t attempt auto-correction (default: false)',
      },
      response: {
        success: 'boolean',
        data: {
          quiz: 'Validated Quiz object',
          quality: {
            score: 'number 0-100',
            isValid: 'boolean',
            issues: 'string[]',
          },
          validation: {
            passed: 'boolean',
            corrected: 'boolean - Whether data was auto-corrected',
            totalQuestions: 'number',
            questionTypes: 'string[]',
            difficultyDistribution: {
              easy: 'number',
              medium: 'number',
              hard: 'number',
            },
            estimatedTime: 'number - In minutes',
          },
        },
      },
    },
    examples: {
      validRequest: {
        quiz: {
          title: 'Sample Quiz',
          questions: [
            {
              question: 'What is 2+2?',
              type: 'MCQ',
              options: ['3', '4', '5', '6'],
              correctAnswer: 1,
              explanation: '2+2 equals 4',
              difficulty: 'easy',
              tags: ['math', 'basic'],
            }
          ],
          metadata: {
            subject: 'Mathematics',
            grade: '3',
            topic: 'Addition',
            totalQuestions: 1,
          },
        },
      },
    },
  });
}

/**
 * OPTIONS: CORS Support
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
