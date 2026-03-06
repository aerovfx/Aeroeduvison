/**
 * Enhanced AI Content Generator Service
 * Generates educational content with caching, cost optimization, and quality validation
 */

import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { AIMessage } from '../providers/base-provider';
import {
  buildLessonPrompt,
  buildQuizPrompt,
  buildSlidesPrompt,
  buildVideoScriptPrompt,
  parseContentJSON,
  validateLessonContent,
  validateQuizContent,
  validateSlidesContent,
  validateVideoScriptContent,
  getSystemPrompt,
  estimateTokens,
  type LessonRequest,
  type LessonContent,
  type QuizRequest,
  type QuizContent,
  type SlidesRequest,
  type SlidesContent,
  type VideoScriptRequest,
  type VideoScriptContent,
} from '../prompts/content-generation-prompts';

export interface ContentRequest {
  type: 'lesson' | 'quiz' | 'slides' | 'video-script';
  subject: string;
  grade: string;
  topic: string;
  curriculum?: string;
  duration?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  additionalContext?: string;
  language?: 'vi' | 'en';
}

export interface GenerationOptions {
  aiModel?: string;
  useCache?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface GeneratedLesson {
  title: string;
  objectives: string[];
  content: string;
  keyPoints: string[];
  exercises: string[];
  summary: string;
  metadata?: {
    duration: number;
    difficulty: string;
    grade: string;
    subject: string;
  };
}

export interface GeneratedQuiz {
  title: string;
  questions: Array<{
    question: string;
    type?: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
    learningObjective?: string;
  }>;
  metadata?: {
    subject: string;
    grade: string;
    topic: string;
    totalQuestions: number;
    estimatedTime: number;
  };
}

export interface GeneratedSlides {
  title: string;
  subtitle?: string;
  slides: Array<{
    slideNumber: number;
    title: string;
    content: string[] | string;
    speakerNotes?: string;
    imagePrompt?: string;
    layout?: string;
  }>;
  metadata?: {
    subject: string;
    grade: string;
    topic: string;
    totalSlides: number;
    estimatedTime: number;
  };
}

export interface GeneratedVideoScript {
  title: string;
  hook: string;
  segments: Array<{
    timestamp: string;
    scene: string;
    narration: string;
    visuals: string;
    onScreenText?: string;
  }>;
  callToAction: string;
  metadata?: {
    subject: string;
    grade: string;
    topic: string;
    totalDuration: number;
    tone: string;
  };
}

export class ContentGeneratorService {
  constructor(private aiService: AIServiceOrchestrator) {}

  /**
   * Generate a complete lesson using enhanced prompts
   */
  async generateLesson(request: ContentRequest, options: GenerationOptions = {}): Promise<GeneratedLesson> {
    const lessonRequest: LessonRequest = {
      topic: request.topic,
      subject: request.subject,
      grade: request.grade,
      duration: request.duration,
      difficulty: request.difficulty,
      additionalContext: request.additionalContext,
      language: request.language || 'vi',
      curriculum: request.curriculum,
    };

    const prompt = buildLessonPrompt(lessonRequest);
    const systemPrompt = getSystemPrompt(request.language || 'vi');

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiService.complete({
      messages,
      options: {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 3000,
      },
    });

    // Parse using enhanced parser
    const content = parseContentJSON<LessonContent>(response.content);
    if (!validateLessonContent(content)) {
      // Fallback to simple parsing
      return this.parseLesson(response.content, request);
    }

    return {
      title: content.title,
      objectives: content.objectives,
      content: content.content,
      keyPoints: content.keyPoints,
      exercises: content.exercises,
      summary: content.summary,
      metadata: {
        duration: content.duration,
        difficulty: content.difficulty,
        grade: content.grade,
        subject: content.subject,
      },
    };
  }

  /**
   * Generate a quiz using enhanced prompts
   */
  async generateQuiz(request: ContentRequest, options: GenerationOptions = {}): Promise<GeneratedQuiz> {
    const quizRequest: QuizRequest = {
      topic: request.topic,
      subject: request.subject,
      grade: request.grade,
      questionCount: request.duration ? Math.floor(request.duration / 3) : 10,
      difficulty: request.difficulty,
      questionTypes: ['MCQ'], // Default to MCQ
      additionalContext: request.additionalContext,
      language: request.language || 'vi',
    };

    const prompt = buildQuizPrompt(quizRequest);
    const systemPrompt = getSystemPrompt(request.language || 'vi');

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiService.complete({
      messages,
      options: {
        temperature: options.temperature || 0.6, // Lower for consistent questions
        maxTokens: options.maxTokens || 4000,
      },
    });

    // Parse using enhanced parser
    const content = parseContentJSON<QuizContent>(response.content);
    if (!validateQuizContent(content)) {
      // Fallback to simple parsing
      return this.parseQuiz(response.content, request);
    }

    return {
      title: content.title,
      questions: content.questions.map(q => ({
        question: q.question,
        type: q.type,
        options: q.options || [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: q.tags,
        learningObjective: q.learningObjective,
      })),
      metadata: content.metadata,
    };
  }

  /**
   * Generate presentation slides using enhanced prompts
   */
  async generateSlides(request: ContentRequest, options: GenerationOptions = {}): Promise<GeneratedSlides> {
    const slidesRequest: SlidesRequest = {
      topic: request.topic,
      subject: request.subject,
      grade: request.grade,
      slideCount: request.duration ? Math.floor(request.duration / 2) : 10,
      duration: request.duration || 20,
      additionalContext: request.additionalContext,
      language: request.language || 'vi',
    };

    const prompt = buildSlidesPrompt(slidesRequest);
    const systemPrompt = getSystemPrompt(request.language || 'vi');

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiService.complete({
      messages,
      options: {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 3500,
      },
    });

    // Parse using enhanced parser
    const content = parseContentJSON<SlidesContent>(response.content);
    if (!validateSlidesContent(content)) {
      // Fallback to simple parsing
      return this.parseSlides(response.content, request);
    }

    return {
      title: content.title,
      subtitle: content.subtitle,
      slides: content.slides.map(s => ({
        slideNumber: s.slideNumber,
        title: s.title,
        content: s.content,
        speakerNotes: s.speakerNotes,
        imagePrompt: s.imagePrompt,
        layout: s.layout,
      })),
      metadata: content.metadata,
    };
  }

  /**
   * Generate video script using enhanced prompts
   */
  async generateVideoScript(request: ContentRequest, options: GenerationOptions = {}): Promise<GeneratedVideoScript> {
    const videoRequest: VideoScriptRequest = {
      topic: request.topic,
      subject: request.subject,
      grade: request.grade,
      duration: request.duration || 5,
      tone: 'enthusiastic',
      additionalContext: request.additionalContext,
      language: request.language || 'vi',
    };

    const prompt = buildVideoScriptPrompt(videoRequest);
    const systemPrompt = getSystemPrompt(request.language || 'vi');

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiService.complete({
      messages,
      options: {
        temperature: options.temperature || 0.8, // Higher for creative scripts
        maxTokens: options.maxTokens || 4000,
      },
    });

    // Parse using enhanced parser
    const content = parseContentJSON<VideoScriptContent>(response.content);
    if (!validateVideoScriptContent(content)) {
      throw new Error('Invalid video script structure');
    }

    return {
      title: content.title,
      hook: content.hook,
      segments: content.segments,
      callToAction: content.callToAction,
      metadata: content.metadata,
    };
  }

  /**
   * Generate content based on type (unified interface)
   */
  async generate(request: ContentRequest, options: GenerationOptions = {}): Promise<any> {
    switch (request.type) {
      case 'lesson':
        return this.generateLesson(request, options);
      case 'quiz':
        return this.generateQuiz(request, options);
      case 'slides':
        return this.generateSlides(request, options);
      case 'video-script':
        return this.generateVideoScript(request, options);
      default:
        throw new Error(`Unknown content type: ${request.type}`);
    }
  }

  // ========================================================================
  // FALLBACK PARSERS (for backwards compatibility)
  // ========================================================================

  /**
   * Parse lesson response
   */
  private parseLesson(content: string, request: ContentRequest): GeneratedLesson {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || `${request.topic} - ${request.subject}`,
          objectives: parsed.objectives || [],
          content: parsed.content || content,
          keyPoints: parsed.keyPoints || [],
          exercises: parsed.exercises || [],
          summary: parsed.summary || '',
        };
      }
    } catch (e) {
      console.error('Failed to parse lesson JSON:', e);
    }

    // Fallback: return content as-is
    return {
      title: `${request.topic} - ${request.subject}`,
      objectives: [],
      content,
      keyPoints: [],
      exercises: [],
      summary: '',
    };
  }

  /**
   * Parse quiz response
   */
  private parseQuiz(content: string, request: ContentRequest): GeneratedQuiz {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || `Quiz về ${request.topic}`,
          questions: parsed.questions || [],
        };
      }
    } catch (e) {
      console.error('Failed to parse quiz JSON:', e);
    }

    // Fallback
    return {
      title: `Quiz về ${request.topic}`,
      questions: [],
    };
  }

  /**
   * Parse slides response
   */
  private parseSlides(content: string, request: ContentRequest): GeneratedSlides {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || `${request.topic} - ${request.subject}`,
          slides: parsed.slides || [],
        };
      }
    } catch (e) {
      console.error('Failed to parse slides JSON:', e);
    }

    // Fallback
    return {
      title: `${request.topic} - ${request.subject}`,
      slides: [],
    };
  }
}
