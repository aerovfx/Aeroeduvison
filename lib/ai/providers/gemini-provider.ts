/**
 * Google Gemini Provider Implementation
 * Supports Gemini Pro, Gemini Pro Vision, and other Google AI models
 * Includes Vision API support for image analysis and OCR
 */

import {
  AIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse
} from './base-provider';

export interface GeminiVisionInput {
  mimeType: string;
  data: string; // Base64 encoded image
}

export interface GeminiVisionOptions extends AICompletionOptions {
  images?: GeminiVisionInput[];
}

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini';
  private apiKey: string;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options?.model || this.getDefaultModel();

    // Convert messages to Gemini format
    const contents = this.convertMessagesToGeminiFormat(messages);

    const response = await fetch(
      `${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 4000,
            topP: options?.topP ?? 1,
            stopSequences: options?.stop,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const candidate = data.candidates[0];
    const content = candidate.content.parts[0].text;

    // Estimate token usage (Gemini doesn't provide exact counts)
    const promptTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
    const completionTokens = this.estimateTokens(content);

    return {
      id: `gemini-${Date.now()}`,
      content,
      model,
      finishReason: this.mapFinishReason(candidate.finishReason),
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      metadata: {
        safetyRatings: candidate.safetyRatings,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseURL}/models?key=${this.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash-exp';
  }

  /**
   * Generate completion with vision support (for images/OCR)
   */
  async completeWithVision(
    messages: AIMessage[],
    images: GeminiVisionInput[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options?.model || 'gemini-2.0-flash-exp';

    // Convert messages to Gemini format with images
    const contents = this.convertMessagesToGeminiFormatWithImages(messages, images);

    const response = await fetch(
      `${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature ?? 0.4, // Lower for OCR/analysis
            maxOutputTokens: options?.maxTokens ?? 8000,
            topP: options?.topP ?? 0.95,
            stopSequences: options?.stop,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini Vision API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini Vision API');
    }

    const candidate = data.candidates[0];
    const content = candidate.content.parts[0].text;

    // Estimate token usage
    const promptTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
    const completionTokens = this.estimateTokens(content);
    // Add image tokens (rough estimate: ~85 tokens per image)
    const imageTokens = images.length * 85;

    return {
      id: `gemini-vision-${Date.now()}`,
      content,
      model,
      finishReason: this.mapFinishReason(candidate.finishReason),
      usage: {
        promptTokens: promptTokens + imageTokens,
        completionTokens,
        totalTokens: promptTokens + imageTokens + completionTokens,
      },
      metadata: {
        safetyRatings: candidate.safetyRatings,
        imagesProcessed: images.length,
      },
    };
  }

  /**
   * Extract text from image (OCR)
   */
  async extractTextFromImage(
    imageData: string, // Base64
    mimeType: string = 'image/jpeg',
    language?: string
  ): Promise<string> {
    const prompt = language === 'vi' 
      ? 'Hãy trích xuất toàn bộ văn bản từ hình ảnh này. Giữ nguyên định dạng, xuống dòng, và cấu trúc. Chỉ trả về văn bản, không giải thích thêm.'
      : 'Extract all text from this image. Preserve formatting, line breaks, and structure. Return only the text, no explanations.';

    const imageInput: GeminiVisionInput = {
      mimeType,
      data: imageData,
    };

    const response = await this.completeWithVision(
      [{ role: 'user', content: prompt }],
      [imageInput],
      {
        temperature: 0.1, // Very low for accurate OCR
        maxTokens: 8000,
      }
    );

    return response.content;
  }

  estimateCost(promptTokens: number, completionTokens: number): number {
    // Gemini pricing (as of 2025)
    // Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
    // Pro: $0.25 per 1M input tokens, $0.50 per 1M output tokens
    // Using Flash pricing (default model)
    const model = process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash-exp';
    const isFlash = model.includes('flash');
    
    const promptCost = isFlash 
      ? (promptTokens / 1_000_000) * 0.075
      : (promptTokens / 1_000_000) * 0.25;
    const completionCost = isFlash
      ? (completionTokens / 1_000_000) * 0.30
      : (completionTokens / 1_000_000) * 0.50;

    return promptCost + completionCost;
  }

  private convertMessagesToGeminiFormat(messages: AIMessage[]) {
    // Handle system messages by prepending to first user message
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    const converted = otherMessages.map((message, index) => {
      const parts: any[] = [{ text: message.content }];
      
      // Prepend system message to first user message
      if (index === 0 && systemMessages.length > 0) {
        const systemText = systemMessages.map(m => m.content).join('\n');
        parts[0].text = `${systemText}\n\n${message.content}`;
      }
      
      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });
    
    return converted;
  }

  private convertMessagesToGeminiFormatWithImages(
    messages: AIMessage[],
    images: GeminiVisionInput[]
  ) {
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    return otherMessages.map((message, index) => {
      const parts: any[] = [];
      
      // Add images to first user message
      if (index === 0 && images.length > 0) {
        parts.push(...images.map(img => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        })));
      }
      
      // Add text
      let text = message.content;
      if (index === 0 && systemMessages.length > 0) {
        const systemText = systemMessages.map(m => m.content).join('\n');
        text = `${systemText}\n\n${message.content}`;
      }
      parts.push({ text });
      
      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });
  }

  private mapFinishReason(reason: string): AICompletionResponse['finishReason'] {
    const mapping: Record<string, AICompletionResponse['finishReason']> = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
      'OTHER': 'stop',
    };

    return mapping[reason] || 'stop';
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
