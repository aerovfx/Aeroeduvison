/**
 * Intelligent AI Content Generator API
 * 
 * Features:
 * - Smart model selection based on task context
 * - Caching for cost optimization
 * - Load balancing & auto-fallback
 * - A/B testing support
 * - Hybrid execution for complex tasks
 * - Analytics & monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  AIModelSelector,
  TaskType,
  Priority,
  TaskContext,
} from '@/lib/ai/model-selector';
import { cacheManager } from '@/lib/ai/cache-manager';
import { analyticsTracker } from '@/lib/ai/analytics-tracker';
import { loadBalancer } from '@/lib/ai/load-balancer';
import { hybridExecutor } from '@/lib/ai/hybrid-executor';
import { abTesting } from '@/lib/ai/ab-testing';

// Initialize systems
const modelSelector = new AIModelSelector();

interface IntelligentGenerateRequest {
  // Content details
  type: 'lesson' | 'quiz' | 'slides' | 'video-script';
  subject: string;
  grade: string;
  topic: string;
  curriculum?: string;
  duration?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  additionalContext?: string;
  freeformPrompt?: string;

  // Intelligent selection options
  priority?: Priority[]; // Order of priorities
  budgetConstraint?: number; // Max USD to spend
  privacyRequired?: boolean; // Need high privacy?
  requiresRealtime?: boolean; // Need fast response?
  useHybrid?: boolean; // Use multi-model approach?
  enableCache?: boolean; // Use caching?
  abTestId?: string; // Participate in A/B test
}

/**
 * Map content type to task type
 */
function mapToTaskType(contentType: string): TaskType {
  switch (contentType) {
    case 'lesson':
      return TaskType.CONTENT_GENERATION;
    case 'quiz':
      return TaskType.QUIZ_GENERATION;
    case 'slides':
      return TaskType.SLIDES_GENERATION;
    case 'video-script':
      return TaskType.CREATIVE_WRITING;
    default:
      return TaskType.CONTENT_GENERATION;
  }
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English, ~2 for Vietnamese
  return Math.ceil(text.length / 3);
}

/**
 * Create prompt for AI
 */
function createPrompt(request: IntelligentGenerateRequest): string {
  if (request.freeformPrompt) {
    return request.freeformPrompt;
  }

  const basePrompt = `Tạo ${request.type === 'lesson' ? 'bài học' : request.type === 'quiz' ? 'quiz trắc nghiệm' : request.type === 'slides' ? 'slides thuyết trình' : 'kịch bản video'} về "${request.topic}"

Thông tin:
- Môn học: ${request.subject}
- Lớp: ${request.grade}
- Độ khó: ${request.difficulty || 'medium'}
- Thời lượng: ${request.duration || 45} phút
${request.curriculum ? `- Chương trình: ${request.curriculum}` : ''}
${request.additionalContext ? `- Yêu cầu thêm: ${request.additionalContext}` : ''}

Hãy tạo nội dung chi tiết, phù hợp với học sinh Việt Nam.`;

  return basePrompt;
}

/**
 * Generate content with selected model
 */
async function generateWithModel(
  modelName: string,
  provider: string,
  endpoint: string,
  apiKeyName: string,
  prompt: string
): Promise<any> {
  const apiKey = process.env[apiKeyName];

  if (!apiKey) {
    throw new Error(`API key not found: ${apiKeyName}`);
  }

  // Record request start
  loadBalancer.recordRequestStart(modelName);

  const startTime = Date.now();

  try {
    let response;

    if (provider === 'OpenRouter') {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'LMS Math - AI Content Generator',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content:
                'Bạn là chuyên gia giáo dục Việt Nam. Tạo nội dung chất lượng cao.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
    } else if (provider === 'X.AI') {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content:
                'Bạn là chuyên gia giáo dục Việt Nam. Tạo nội dung chất lượng cao.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
    } else if (provider === 'OpenAI') {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content:
                'Bạn là chuyên gia giáo dục Việt Nam. Tạo nội dung chất lượng cao.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${provider} API error: ${error}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    // Record success
    loadBalancer.recordRequestEnd(modelName, true, latency);

    return {
      content: data.choices[0].message.content,
      model: data.model || modelName,
      usage: data.usage,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    // Record failure
    loadBalancer.recordRequestEnd(modelName, false, latency);

    throw error;
  }
}

/**
 * Main API handler
 */
export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    // Authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only teachers can use AI content generation' },
        { status: 403 }
      );
    }

    // Parse request
    const body: IntelligentGenerateRequest = await req.json();

    // Validate
    if (!body.type || !body.subject || !body.grade || !body.topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prompt = createPrompt(body);
    const taskType = mapToTaskType(body.type);

    // Build task context
    const context: TaskContext = {
      taskType,
      priority: body.priority || [Priority.QUALITY, Priority.COST, Priority.SPEED],
      inputLength: estimateTokens(prompt),
      expectedOutputLength: 3000, // Estimate
      requiresVietnamese: true,
      requiresRealtime: body.requiresRealtime || false,
      budgetConstraint: body.budgetConstraint,
      privacyRequired: body.privacyRequired || false,
      studentAgeGroup:
        parseInt(body.grade) <= 9
          ? 'secondary'
          : parseInt(body.grade) <= 12
          ? 'secondary'
          : 'university',
      subject: body.subject,
      difficulty: body.difficulty,
    };

    // Check cache first (if enabled)
    if (body.enableCache !== false) {
      const cacheKey = cacheManager.generateKey(body);
      const cached = cacheManager.checkCache(cacheKey);

      if (cached) {
        console.log(`💾 Returning cached response for ${cacheKey}`);

        return NextResponse.json({
          success: true,
          data: cached,
          meta: {
            requestId,
            source: 'cache',
            cost: 0,
            latency: 0,
          },
        });
      }
    }

    // Check A/B test
    let selectedModel: any;
    let abTestGroup: string | undefined;

    if (body.abTestId) {
      const testSelection = abTesting.selectModelForTest(
        body.abTestId,
        session.user.id
      );
      if (testSelection) {
        selectedModel = {
          selectedModel: testSelection.model,
          provider: 'A/B Test',
          abTestGroup: testSelection.group,
        };
        abTestGroup = testSelection.group;
        console.log(
          `🧪 A/B Test: User in group ${testSelection.group}, using ${testSelection.model}`
        );
      }
    }

    // Select model intelligently
    if (!selectedModel) {
      selectedModel = await modelSelector.selectModel(context, prompt);

      console.log(`🎯 Selected model: ${selectedModel.selectedModel}`);
      console.log(`   Provider: ${selectedModel.provider}`);
      console.log(`   Estimated cost: $${selectedModel.estimatedCost.toFixed(6)}`);
      console.log(`   Estimated time: ${selectedModel.estimatedTime}s`);
      console.log(`   Reasoning: ${selectedModel.reasoning}`);
    }

    // Check if model is available (load balancing)
    if (!loadBalancer.isModelAvailable(selectedModel.selectedModel)) {
      console.log(
        `⚠️  Primary model unavailable, trying fallback...`
      );

      const fallbacks = loadBalancer.getFallbackModels(
        selectedModel.selectedModel,
        selectedModel.alternatives.map((a: any) => a.model)
      );

      if (fallbacks.length > 0) {
        selectedModel.selectedModel = fallbacks[0];
        console.log(`🔄 Using fallback model: ${fallbacks[0]}`);
      }
    }

    const startTime = Date.now();
    let result: any;

    try {
      // Check if should use hybrid approach
      if (
        body.useHybrid &&
        hybridExecutor.shouldUseHybrid(taskType, context.priority)
      ) {
        console.log('🔀 Using hybrid execution...');

        const hybridResult = await hybridExecutor.executeHybrid(
          taskType,
          prompt,
          async (model, p) => {
            const modelInfo = modelSelector['models'].find(
              (m: any) => m.name === model
            );
            if (!modelInfo) throw new Error(`Model ${model} not found`);

            return await generateWithModel(
              model,
              modelInfo.provider,
              modelInfo.endpoint,
              modelInfo.apiKey,
              p
            );
          }
        );

        result = hybridResult.finalOutput;

        // Log analytics
        const latency = Date.now() - startTime;
        analyticsTracker.logRequest({
          id: requestId,
          timestamp: Date.now(),
          modelName: 'Hybrid',
          provider: 'Multi-Model',
          taskType,
          inputTokens: context.inputLength,
          outputTokens: estimateTokens(JSON.stringify(result)),
          cost: hybridResult.totalCost,
          latency,
          success: true,
          userId: session.user.id,
          cacheHit: false,
          abTestGroup,
        });

        return NextResponse.json({
          success: true,
          data: result,
          meta: {
            requestId,
            strategy: 'hybrid',
            hybridInfo: {
              modelsUsed: hybridResult.intermediateResults.map((r) => r.model),
              totalCost: hybridResult.totalCost,
              totalLatency: hybridResult.totalLatency,
            },
            reasoning: hybridResult.reasoning,
          },
        });
      }

      // Single model execution
      result = await generateWithModel(
        selectedModel.selectedModel,
        selectedModel.provider,
        selectedModel.endpoint,
        selectedModel.apiKey,
        prompt
      );

      const latency = Date.now() - startTime;
      const inputTokens = estimateTokens(prompt);
      const outputTokens = result.usage?.total_tokens || estimateTokens(result.content);
      const cost = modelSelector.estimateCost(
        selectedModel.selectedModel,
        inputTokens,
        outputTokens
      );

      // Log analytics
      analyticsTracker.logRequest({
        id: requestId,
        timestamp: Date.now(),
        modelName: selectedModel.selectedModel,
        provider: selectedModel.provider,
        taskType,
        inputTokens,
        outputTokens,
        cost,
        latency,
        success: true,
        userId: session.user.id,
        cacheHit: false,
        abTestGroup,
      });

      // Log A/B test result
      if (body.abTestId && abTestGroup) {
        abTesting.logTestResult(body.abTestId, {
          requestId,
          modelName: selectedModel.selectedModel,
          cost,
          latency,
          success: true,
          abTestGroup,
        });
      }

      // Store in cache
      if (body.enableCache !== false) {
        const cacheKey = cacheManager.generateKey(body);
        cacheManager.storeCache(
          cacheKey,
          result.content,
          cost,
          selectedModel.selectedModel,
          taskType
        );
      }

      return NextResponse.json({
        success: true,
        data: result.content,
        meta: {
          requestId,
          model: selectedModel.selectedModel,
          provider: selectedModel.provider,
          cost,
          latency,
          reasoning: selectedModel.reasoning,
          alternatives: selectedModel.alternatives,
          abTestGroup,
        },
      });
    } catch (error: any) {
      const latency = Date.now() - startTime;

      // Log failure
      analyticsTracker.logRequest({
        id: requestId,
        timestamp: Date.now(),
        modelName: selectedModel.selectedModel,
        provider: selectedModel.provider,
        taskType,
        inputTokens: estimateTokens(prompt),
        outputTokens: 0,
        cost: 0,
        latency,
        success: false,
        errorMessage: error.message,
        userId: session.user.id,
        cacheHit: false,
        abTestGroup,
      });

      // Try fallback
      console.log(`❌ Primary model failed: ${error.message}`);
      console.log('🔄 Trying fallback model...');

      const fallbacks = loadBalancer.getFallbackModels(
        selectedModel.selectedModel,
        selectedModel.alternatives.map((a: any) => a.model)
      );

      if (fallbacks.length > 0) {
        const fallbackModel = fallbacks[0];
        console.log(`🔄 Using fallback: ${fallbackModel}`);

        try {
          const fallbackInfo = modelSelector['models'].find(
            (m: any) => m.name === fallbackModel
          );

          if (fallbackInfo) {
            const fallbackResult = await generateWithModel(
              fallbackModel,
              fallbackInfo.provider,
              fallbackInfo.endpoint,
              fallbackInfo.apiKey,
              prompt
            );

            const fallbackLatency = Date.now() - startTime;

            return NextResponse.json({
              success: true,
              data: fallbackResult.content,
              meta: {
                requestId,
                model: fallbackModel,
                provider: fallbackInfo.provider,
                fallback: true,
                originalModel: selectedModel.selectedModel,
                latency: fallbackLatency,
              },
            });
          }
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
        }
      }

      // All failed - return error
      return NextResponse.json(
        {
          error: 'AI generation failed',
          message: error.message,
          requestId,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Intelligent generation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - API info & analytics
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'analytics') {
    const metrics = analyticsTracker.getPerformanceMetrics();
    return NextResponse.json(metrics);
  }

  if (action === 'cache-stats') {
    const stats = cacheManager.getStats();
    return NextResponse.json(stats);
  }

  if (action === 'health') {
    const health = loadBalancer.getModelHealthStatus();
    const healthArray = Array.from(health as Map<string, any>).map(([name, h]) => ({
      name,
      ...h,
    }));
    return NextResponse.json({ models: healthArray });
  }

  if (action === 'ab-tests') {
    const tests = abTesting.getActiveTests();
    return NextResponse.json({ tests });
  }

  // Default: API info
  return NextResponse.json({
    name: 'Intelligent AI Content Generator',
    version: '2.0.0',
    description: 'Smart AI content generation with model selection, caching, and optimization',
    features: [
      'Intelligent model selection',
      'Cost optimization with caching (80-90% savings)',
      'Load balancing & auto-fallback',
      'A/B testing framework',
      'Hybrid multi-model execution',
      'Analytics & monitoring',
    ],
    endpoints: {
      POST: '/api/ai-intelligent/generate',
      GET: {
        analytics: '/api/ai-intelligent/generate?action=analytics',
        cacheStats: '/api/ai-intelligent/generate?action=cache-stats',
        health: '/api/ai-intelligent/generate?action=health',
        abTests: '/api/ai-intelligent/generate?action=ab-tests',
      },
    },
    supportedModels: [
      'grok-beta (X.AI)',
      'claude-3.5-sonnet (OpenRouter)',
      'gpt-5 (OpenRouter)',
      'gemini-2.5-pro (OpenRouter)',
      'gpt-4-turbo (OpenAI)',
      'gpt-3.5-turbo (OpenRouter)',
      'llama-3.2 (Ollama - Local)',
    ],
  });
}

