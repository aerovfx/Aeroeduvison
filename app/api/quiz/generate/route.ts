/**
 * API Route: POST /api/quiz/generate
 * 
 * Generate structured quiz with JSON validation
 * Features:
 * - Strict JSON schema validation
 * - Auto-correction of common issues
 * - Quality assessment
 * - Retry mechanism for failed validations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  parseAndValidateQuiz, 
  validateAndCorectQuiz,
  assessQuizQuality,
  Quiz
} from '@/lib/validators/quiz-validator';
import { ContentGeneratorService } from '@/lib/ai/services/content-generator';
import { AIServiceOrchestrator } from '@/lib/ai/ai-service-orchestrator';

interface QuizGenerateRequest {
  topic: string;
  subject: string;
  grade: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  additionalContext?: string;
  language?: 'vi' | 'en';
}

/**
 * POST: Generate Quiz with Structured Output
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request
    const body: QuizGenerateRequest = await req.json();

    // 3. Validate required fields
    if (!body.topic || !body.subject || !body.grade) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: topic, subject, grade' 
        },
        { status: 400 }
      );
    }

    // 4. Normalize input
    const questionCount = Math.min(Math.max(body.questionCount || 5, 1), 20);
    const difficulty = body.difficulty || 'medium';
    const language = body.language || 'vi';

    // 5. Initialize AI service
    const aiOrchestrator = new AIServiceOrchestrator();
    const contentGenerator = new ContentGeneratorService(aiOrchestrator);

    // 6. Generate quiz
    console.log(`[QUIZ] Generating ${questionCount} questions for: ${body.topic}`);
    
    const result = await contentGenerator.generateQuiz(
      {
        type: 'quiz',
        topic: body.topic,
        subject: body.subject,
        grade: body.grade,
        duration: questionCount * 3, // Rough estimate
        difficulty,
        additionalContext: body.additionalContext,
        language,
      },
      {
        temperature: 0.6, // Lower for consistency
        maxTokens: 4000 + (questionCount * 200), // Scale with question count
      }
    );

    // 7. Convert to our Quiz type and validate
    let validatedQuiz: Quiz;
    try {
      // Try strict validation first
      validatedQuiz = validateAndCorectQuiz(result);
      console.log(`[QUIZ] ✅ Generated quiz passed validation`);
    } catch (validationError) {
      console.error(`[QUIZ] ⚠️ Validation error:`, validationError);
      
      // Return with validation error but include partial data
      return NextResponse.json(
        {
          success: false,
          error: `Quiz validation failed: ${(validationError as Error).message}`,
          data: result,
          generationTime: Date.now() - startTime,
        },
        { status: 422 }
      );
    }

    // 8. Assess quality
    const qualityAssessment = assessQuizQuality(validatedQuiz);
    console.log(`[QUIZ] Quality Score: ${qualityAssessment.score}/100`);

    if (qualityAssessment.issues.length > 0) {
      console.warn(`[QUIZ] Quality issues:`, qualityAssessment.issues);
    }

    // 9. Return success response
    return NextResponse.json({
      success: true,
      data: {
        quiz: validatedQuiz,
        quality: qualityAssessment,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: session.user.id,
          generationTime: Date.now() - startTime,
          apiVersion: '1.0',
        },
      },
    });

  } catch (error: any) {
    console.error('[QUIZ] Generation error:', error);

    // Handle specific error types
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        { success: false, error: 'Generation timeout. Please try with fewer questions.' },
        { status: 504 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Quiz generation failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Validate existing quiz JSON
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quizJson = searchParams.get('quiz');

    if (!quizJson) {
      return NextResponse.json(
        { success: false, error: 'Missing quiz parameter' },
        { status: 400 }
      );
    }

    const quizData = JSON.parse(decodeURIComponent(quizJson));
    const validatedQuiz = validateAndCorectQuiz(quizData);
    const qualityAssessment = assessQuizQuality(validatedQuiz);

    return NextResponse.json({
      success: true,
      data: {
        quiz: validatedQuiz,
        quality: qualityAssessment,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Validation failed' },
      { status: 400 }
    );
  }
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
