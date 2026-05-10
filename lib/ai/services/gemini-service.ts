/**
 * Gemini Service - Unified interface for all Gemini AI operations
 * Provides easy access to Gemini for all services in the system
 */

import { GeminiProvider, GeminiVisionInput } from '../providers/gemini-provider';
import { FalProvider } from '../providers/fal-provider';
import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { AIMessage } from '../providers/base-provider';

// Provider có cùng interface vision/OCR mà GeminiService cần.
// Cả GeminiProvider lẫn FalProvider implement đủ: complete, completeWithVision,
// extractTextFromImage, isAvailable.
type VisionCapableProvider = GeminiProvider | FalProvider;

export class GeminiService {
  private static provider: VisionCapableProvider;
  private static orchestrator: AIServiceOrchestrator;

  /**
   * Initialize Gemini service
   */
  static initialize() {
    this.provider = this.buildProvider();
    this.orchestrator = new AIServiceOrchestrator({
      preferredProvider: 'gemini',
      fallbackEnabled: true,
      cacheEnabled: true,
      rateLimitEnabled: true,
    });
  }

  /**
   * Get provider instance — fal.ai khi AI_PREFERRED_PROVIDER=fal hoặc khi
   * không có GEMINI_API_KEY nhưng có FAL_API_KEY.
   */
  static getProvider(): VisionCapableProvider {
    if (!this.provider) this.provider = this.buildProvider();
    return this.provider;
  }

  private static buildProvider(): VisionCapableProvider {
    const pref = (process.env.AI_PREFERRED_PROVIDER || '').toLowerCase();
    const hasFal = !!process.env.FAL_API_KEY;
    const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
    if ((pref === 'fal' && hasFal) || (!hasGemini && hasFal)) {
      return new FalProvider();
    }
    return new GeminiProvider();
  }

  /**
   * Generate text completion using Gemini
   */
  static async generateText(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
      userId?: string;
    }
  ): Promise<string> {
    const messages: AIMessage[] = [];
    
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await this.orchestrator.complete({
      messages,
      options: {
        model: options?.model || 'gemini-2.0-flash-exp',
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 4000,
      },
      userId: options?.userId,
    });

    return response.content;
  }

  /**
   * Extract text from image (OCR)
   */
  static async extractTextFromImage(
    imageData: string, // Base64
    mimeType: string = 'image/jpeg',
    language: string = 'vi'
  ): Promise<string> {
    return await this.getProvider().extractTextFromImage(imageData, mimeType, language);
  }

  /**
   * Analyze image with text prompt
   */
  static async analyzeImage(
    imageData: string, // Base64
    prompt: string,
    mimeType: string = 'image/jpeg',
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const imageInput: GeminiVisionInput = {
      mimeType,
      data: imageData,
    };

    const response = await this.getProvider().completeWithVision(
      [{ role: 'user', content: prompt }],
      [imageInput],
      {
        temperature: options?.temperature ?? 0.4,
        maxTokens: options?.maxTokens ?? 8000,
      }
    );

    return response.content;
  }

  /**
   * Generate structured JSON from prompt
   */
  static async generateJSON<T>(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      schema?: string; // JSON schema description
    }
  ): Promise<T> {
    const systemPrompt = options?.systemPrompt || 
      'You are a helpful assistant. Always respond with valid JSON only, no markdown, no explanations.';
    
    const fullPrompt = options?.schema
      ? `${prompt}\n\nReturn JSON matching this schema: ${options.schema}`
      : prompt;

    const response = await this.generateText(fullPrompt, {
      systemPrompt,
      temperature: options?.temperature ?? 0.3, // Lower for structured output
      maxTokens: 8000,
    });

    // Parse JSON
    let jsonText = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      console.error('Failed to parse JSON from Gemini:', error);
      console.error('Response:', jsonText.substring(0, 500));
      throw new Error('Invalid JSON response from Gemini');
    }
  }

  /**
   * Check if Gemini is available
   */
  static async isAvailable(): Promise<boolean> {
    return await this.getProvider().isAvailable();
  }
}

// Initialize on module load
GeminiService.initialize();
