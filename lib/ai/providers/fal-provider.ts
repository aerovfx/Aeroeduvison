/**
 * fal.ai Provider Implementation
 *
 * fal.ai cho phép gọi nhiều LLM (Anthropic Claude, Google Gemini, OpenAI GPT)
 * qua MỘT API key duy nhất bằng endpoint `fal-ai/any-llm`. Provider này adapt
 * fal.ai vào interface `AIProvider` chung của project.
 *
 * Endpoints sử dụng:
 *   - Text:   POST  https://queue.fal.run/fal-ai/any-llm
 *   - Vision: POST  https://queue.fal.run/fal-ai/any-llm/vision
 *
 * fal là queue-based (async): submit → poll request_id → get output.
 * Provider này wrap toàn bộ pattern đó thành await đơn lẻ giống các provider khác.
 *
 * ENV:
 *   FAL_API_KEY        — bắt buộc, format "key_id:secret"
 *   FAL_DEFAULT_MODEL  — optional, mặc định "anthropic/claude-3.5-sonnet"
 *   FAL_VISION_MODEL   — optional, mặc định "google/gemini-flash-1.5"
 */

import {
  AIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse,
} from './base-provider';

// Re-use cùng shape input như GeminiProvider để các call site có thể swap dễ
export interface FalVisionInput {
  mimeType: string;
  data: string; // Base64-encoded image (no data: prefix)
}

export interface FalVisionOptions extends AICompletionOptions {
  images?: FalVisionInput[];
}

const FAL_BASE = 'https://queue.fal.run/fal-ai/any-llm';
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90_000;

interface FalSubmitResponse {
  request_id: string;
  status?: string;
  output?: string;
  error?: string;
}

interface FalResultResponse {
  output?: string;
  reasoning?: string | null;
  partial?: boolean;
  error?: string | null;
}

export class FalProvider implements AIProvider {
  name = 'fal.ai';
  private apiKey: string;
  private textEndpoint = FAL_BASE;
  private visionEndpoint = `${FAL_BASE}/vision`;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FAL_API_KEY || '';
  }

  // ─────────────────────────────────────────────────────────────
  // AIProvider interface — text completion
  // ─────────────────────────────────────────────────────────────
  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse> {
    if (!this.apiKey) throw new Error('fal.ai API key not configured (FAL_API_KEY)');

    const model = options?.model || this.getDefaultModel();
    const { systemPrompt, prompt } = this.foldMessages(messages);

    const output = await this.invoke(this.textEndpoint, {
      model,
      prompt,
      ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
    });

    const promptTokens = this.estimateTokens(prompt + (systemPrompt || ''));
    const completionTokens = this.estimateTokens(output);

    return {
      id: `fal-${Date.now()}`,
      content: output,
      model,
      finishReason: 'stop',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      metadata: { provider: 'fal.ai' },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Vision completion (parity với GeminiProvider.completeWithVision)
  // ─────────────────────────────────────────────────────────────
  async completeWithVision(
    messages: AIMessage[],
    images: FalVisionInput[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse> {
    if (!this.apiKey) throw new Error('fal.ai API key not configured');
    if (!images.length) throw new Error('completeWithVision requires at least 1 image');

    const model = options?.model || process.env.FAL_VISION_MODEL || 'google/gemini-flash-1.5';
    const { systemPrompt, prompt } = this.foldMessages(messages);

    // fal-ai/any-llm/vision chỉ nhận 1 image_url tại một thời điểm.
    // Nếu nhiều ảnh: gọi tuần tự rồi nối kết quả với phân cách rõ ràng.
    const responses: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const imgUrl = `data:${img.mimeType};base64,${img.data}`;
      const out = await this.invoke(this.visionEndpoint, {
        model,
        prompt,
        image_url: imgUrl,
        ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
      });
      responses.push(images.length > 1 ? `=== Image ${i + 1} ===\n${out}` : out);
    }
    const content = responses.join('\n\n');

    const promptTokens = this.estimateTokens(prompt + (systemPrompt || ''));
    const completionTokens = this.estimateTokens(content);
    const imageTokens = images.length * 85;

    return {
      id: `fal-vision-${Date.now()}`,
      content,
      model,
      finishReason: 'stop',
      usage: {
        promptTokens: promptTokens + imageTokens,
        completionTokens,
        totalTokens: promptTokens + imageTokens + completionTokens,
      },
      metadata: { provider: 'fal.ai', imagesProcessed: images.length },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // OCR helper (parity với GeminiProvider.extractTextFromImage)
  // ─────────────────────────────────────────────────────────────
  async extractTextFromImage(
    imageData: string,
    mimeType: string = 'image/jpeg',
    language?: string
  ): Promise<string> {
    const prompt = language === 'vi'
      ? 'Hãy trích xuất toàn bộ văn bản từ hình ảnh này. Giữ nguyên định dạng, xuống dòng, và cấu trúc. Chỉ trả về văn bản, không giải thích thêm.'
      : 'Extract all text from this image. Preserve formatting, line breaks, and structure. Return only the text, no explanations.';

    const res = await this.completeWithVision(
      [{ role: 'user', content: prompt }],
      [{ mimeType, data: imageData }],
      { temperature: 0.1, maxTokens: 8000 },
    );
    return res.content;
  }

  // ─────────────────────────────────────────────────────────────
  // Availability
  // ─────────────────────────────────────────────────────────────
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    // fal.ai không có /health endpoint công khai. Thử submit nhanh prompt 1 token,
    // nhưng sẽ tính phí — tránh. Thay vào đó kiểm tra format key đủ chặt.
    return /^[\w-]+:[\w]+$/.test(this.apiKey);
  }

  getDefaultModel(): string {
    return process.env.FAL_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';
  }

  // ─────────────────────────────────────────────────────────────
  // Cost estimation
  // ─────────────────────────────────────────────────────────────
  estimateCost(promptTokens: number, completionTokens: number): number {
    const model = this.getDefaultModel();
    // fal.ai pass-through pricing — số liệu lấy từ docs Q1/2026
    // (nguồn: fal.ai/models/fal-ai/any-llm)
    let inPer1M = 3.0, outPer1M = 15.0; // default Claude 3.5 Sonnet
    if (/claude-3\.5-haiku/.test(model)) { inPer1M = 0.8; outPer1M = 4.0; }
    else if (/claude-3-opus/.test(model)) { inPer1M = 15; outPer1M = 75; }
    else if (/gemini-flash/.test(model))  { inPer1M = 0.075; outPer1M = 0.3; }
    else if (/gemini-pro/.test(model))    { inPer1M = 1.25; outPer1M = 5.0; }
    else if (/gpt-4o-mini/.test(model))   { inPer1M = 0.15; outPer1M = 0.6; }
    else if (/gpt-4o/.test(model))        { inPer1M = 2.5; outPer1M = 10; }
    return (promptTokens / 1_000_000) * inPer1M
         + (completionTokens / 1_000_000) * outPer1M;
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: fold AIMessage[] → { systemPrompt, prompt }
  // (any-llm chỉ nhận `prompt` + `system_prompt`)
  // ─────────────────────────────────────────────────────────────
  private foldMessages(messages: AIMessage[]): { systemPrompt: string | null; prompt: string } {
    const systems = messages.filter(m => m.role === 'system').map(m => m.content);
    const others = messages.filter(m => m.role !== 'system');
    const prompt = others.map(m =>
      m.role === 'assistant' ? `Assistant: ${m.content}` : m.content
    ).join('\n\n');
    return {
      systemPrompt: systems.length ? systems.join('\n') : null,
      prompt: prompt || (systems.join('\n') || ''),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: queue-based invoke (submit + poll)
  // QUAN TRỌNG: dùng `response_url` từ submit response — vision endpoint
  // trả response_url trỏ về `/any-llm/requests/...` (KHÔNG có `/vision`).
  // ─────────────────────────────────────────────────────────────
  private async invoke(endpoint: string, body: Record<string, unknown>): Promise<string> {
    const submit = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!submit.ok) {
      const text = await submit.text();
      throw new Error(`fal.ai submit failed (${submit.status}): ${text.slice(0, 300)}`);
    }
    const submitJson = await submit.json() as FalSubmitResponse & { response_url?: string; status_url?: string };
    const requestId = submitJson.request_id;
    if (!requestId) throw new Error(`fal.ai: missing request_id (${JSON.stringify(submitJson).slice(0, 200)})`);
    const responseUrl = submitJson.response_url || `${endpoint}/requests/${requestId}`;

    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      const poll = await fetch(responseUrl, {
        headers: { 'Authorization': `Key ${this.apiKey}` },
      });
      if (!poll.ok) continue;
      const data = await poll.json() as FalResultResponse;
      if (data.error) throw new Error(`fal.ai error: ${data.error}`);
      if (typeof data.output === 'string' && data.partial !== true) {
        return data.output;
      }
    }
    throw new Error('fal.ai: timeout waiting for response');
  }

  private estimateTokens(text: string): number {
    return Math.ceil((text || '').length / 4);
  }
}
