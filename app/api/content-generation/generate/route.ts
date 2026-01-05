/**
 * API Route: POST /api/content-generation/generate
 *
 * Generate educational content (lessons, quizzes, slides, video scripts)
 *
 * Features:
 * - Multi-model AI support
 * - Intelligent caching
 * - Cost optimization
 * - Quality validation
 * - Progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ContentGeneratorService, type ContentRequest, type GenerationOptions } from '@/lib/ai/services/content-generator';
import { AIServiceOrchestrator } from '@/lib/ai/ai-service-orchestrator';

// ============================================================================
// TYPES
// ============================================================================

interface GenerateRequestBody extends ContentRequest {
  options?: GenerationOptions;
}

// ============================================================================
// POST: Generate Content
// ============================================================================

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

    // 2. Validate user role (teachers only)
    const user = session.user as any;
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only teachers can generate content' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body: GenerateRequestBody = await req.json();

    // 4. Validate required fields
    if (!body.type || !body.topic || !body.subject || !body.grade) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: type, topic, subject, grade',
        },
        { status: 400 }
      );
    }

    // 5. Validate content type
    const validTypes = ['lesson', 'quiz', 'slides', 'video-script'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid content type. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 6. Create content request
    const contentRequest: ContentRequest = {
      type: body.type,
      topic: body.topic,
      subject: body.subject,
      grade: body.grade,
      curriculum: body.curriculum || 'Vietnam GDPT 2018',
      duration: body.duration,
      difficulty: body.difficulty || 'medium',
      additionalContext: body.additionalContext,
      language: body.language || 'vi',
    };

    // 7. Create generation options
    const options: GenerationOptions = {
      aiModel: body.options?.aiModel,
      useCache: body.options?.useCache !== false, // Default: true
      temperature: body.options?.temperature,
      maxTokens: body.options?.maxTokens,
    };

    // 8. Initialize content generator
    const aiService = new AIServiceOrchestrator();
    const contentGenerator = new ContentGeneratorService(aiService);

    // 9. Generate content based on type
    let result: any;
    switch (contentRequest.type) {
      case 'lesson':
        result = await contentGenerator.generateLesson(contentRequest, options);
        break;
      case 'quiz':
        result = await contentGenerator.generateQuiz(contentRequest, options);
        break;
      case 'slides':
        result = await contentGenerator.generateSlides(contentRequest, options);
        break;
      case 'video-script':
        result = await contentGenerator.generateVideoScript(contentRequest, options);
        break;
      default:
        throw new Error(`Unsupported content type: ${contentRequest.type}`);
    }

    const generationTime = Date.now() - startTime;

    // 10. Return success response
    return NextResponse.json({
      success: true,
      data: {
        content: result,
        metadata: {
          type: contentRequest.type,
          generationTime,
          generatedAt: new Date().toISOString(),
          generatedBy: user.id,
        },
      },
    });

  } catch (error: any) {
    console.error('Content generation error:', error);

    // Handle specific error types
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Generation timeout. Please try with shorter content.',
        },
        { status: 504 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Content generation failed',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS: CORS Support
// ============================================================================

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
