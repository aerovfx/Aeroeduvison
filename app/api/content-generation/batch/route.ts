/**
 * API Route: POST /api/content-generation/batch
 *
 * Generate multiple pieces of content in parallel
 *
 * Features:
 * - Batch processing (up to 20 items)
 * - Parallel execution with rate limiting
 * - Progress tracking
 * - Error handling per item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ContentGeneratorService, type ContentRequest, type GenerationOptions } from '@/lib/ai/services/content-generator';
import { AIServiceOrchestrator } from '@/lib/ai/ai-service-orchestrator';

// ============================================================================
// TYPES
// ============================================================================

interface BatchRequest {
  requests: Array<ContentRequest & { id?: string }>;
  options?: GenerationOptions;
}

interface BatchResult {
  id?: string;
  success: boolean;
  data?: any;
  error?: string;
  generationTime: number;
}

// ============================================================================
// POST: Batch Generate
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
    const body: BatchRequest = await req.json();

    // 4. Validate requests
    if (!body.requests || !Array.isArray(body.requests) || body.requests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid requests array' },
        { status: 400 }
      );
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 20;
    if (body.requests.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch size exceeds maximum (${MAX_BATCH_SIZE})`,
        },
        { status: 400 }
      );
    }

    // 5. Initialize content generator
    const aiService = new AIServiceOrchestrator();
    const contentGenerator = new ContentGeneratorService(aiService);

    // 6. Process requests in batches of 5 (rate limiting)
    const CONCURRENT_LIMIT = 5;
    const results: BatchResult[] = [];

    for (let i = 0; i < body.requests.length; i += CONCURRENT_LIMIT) {
      const batch = body.requests.slice(i, i + CONCURRENT_LIMIT);

      const batchPromises = batch.map(async (request) => {
        const itemStartTime = Date.now();

        try {
          // Validate individual request
          if (!request.type || !request.topic || !request.subject || !request.grade) {
            throw new Error('Missing required fields');
          }

          // Generate content
          const result = await contentGenerator.generate(request, body.options || {});

          return {
            id: request.id,
            success: true,
            data: result,
            generationTime: Date.now() - itemStartTime,
          };
        } catch (error: any) {
          return {
            id: request.id,
            success: false,
            error: error.message || 'Generation failed',
            generationTime: Date.now() - itemStartTime,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(
        ...batchResults.map((r, idx) => {
          if (r.status === 'fulfilled') {
            return r.value;
          } else {
            return {
              id: batch[idx].id,
              success: false,
              error: r.reason?.message || 'Unknown error',
              generationTime: 0,
            };
          }
        })
      );

      // Rate limiting: wait 1 second between batches
      if (i + CONCURRENT_LIMIT < body.requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalTime = Date.now() - startTime;

    // 7. Calculate summary statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgGenerationTime = results.reduce((sum, r) => sum + r.generationTime, 0) / results.length;

    // 8. Return results
    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful,
          failed,
          totalTime,
          averageGenerationTime: Math.round(avgGenerationTime),
        },
      },
    });

  } catch (error: any) {
    console.error('Batch generation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Batch generation failed',
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
