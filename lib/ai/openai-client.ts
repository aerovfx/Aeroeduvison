/**
 * lib/ai/openai-client.ts
 *
 * Centralized AI client cho AeroEduVision.
 * Thay thế Ollama (local LLM) + Qdrant (vector DB) bằng cloud AI API.
 *
 * Priority order (tự động chọn):
 *   1. OPENROUTER_API_KEY  → OpenRouter (proxy tới GPT-4o, Claude, Gemini...)
 *   2. OPENAI_API_KEY      → OpenAI trực tiếp
 *
 * Env vars:
 *   OPENROUTER_API_KEY      — OpenRouter key (sk-or-v1-...)   ← ưu tiên
 *   OPENAI_API_KEY          — OpenAI key (sk-...)             ← fallback
 *   OPENAI_BASE_URL         — optional custom base (Azure, proxy...)
 *   OPENAI_DEFAULT_MODEL    — chat model   (default: gpt-4o-mini via OpenRouter)
 *   OPENAI_VISION_MODEL     — vision model (default: gpt-4o   via OpenRouter)
 *   OPENAI_EMBEDDING_MODEL  — embed model  (default: text-embedding-3-small)
 *
 * OpenRouter base URL: https://openrouter.ai/api/v1
 * OpenRouter models:   openai/gpt-4o-mini, openai/gpt-4o, etc.
 */

import OpenAI from 'openai';

// ── OpenAI-compatible client (supports OpenRouter) ────────────────────────────

let _client: OpenAI | null = null;

function buildClient(): OpenAI {
  // 1. Try OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    return new OpenAI({
      apiKey: openrouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://aeroedu.vn',
        'X-Title': 'AeroEduVision',
      },
      maxRetries: 2,
      timeout: 60_000,
    });
  }

  // 2. Try OpenAI directly
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAI({
      apiKey: openaiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      maxRetries: 2,
      timeout: 60_000,
    });
  }

  throw new Error(
    '[AI] No API key found. Set OPENROUTER_API_KEY or OPENAI_API_KEY in Cloud Run env vars.\n' +
    '  → gcloud run services update edu --region=asia-southeast1 \\\n' +
    '      --set-env-vars="OPENROUTER_API_KEY=sk-or-v1-..."'
  );
}

export function getOpenAIClient(): OpenAI {
  if (!_client) _client = buildClient();
  return _client;
}

// Expose which provider is active (for logging)
export function getActiveProvider(): 'openrouter' | 'openai' | 'fal' | 'none' {
  // shouldUseFal() chưa định nghĩa ở scope này, copy logic ngắn:
  const pref = (process.env.AI_PREFERRED_PROVIDER || '').toLowerCase();
  if (pref === 'fal' && process.env.FAL_API_KEY) return 'fal';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.FAL_API_KEY) return 'fal';
  return 'none';
}

// ── Model helpers ──────────────────────────────────────────────────────────────

// When using OpenRouter, prefix with "openai/" for GPT models
// or use other providers like "anthropic/claude-3-5-sonnet", etc.
export const DEFAULT_CHAT_MODEL =
  process.env.OPENAI_DEFAULT_MODEL ||
  (process.env.OPENROUTER_API_KEY ? 'openai/gpt-4o-mini' : 'gpt-4o-mini');

export const DEFAULT_VISION_MODEL =
  process.env.OPENAI_VISION_MODEL ||
  (process.env.OPENROUTER_API_KEY ? 'openai/gpt-4o' : 'gpt-4o');

export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

// ── fal.ai routing flag ────────────────────────────────────────────────────────
// Khi AI_PREFERRED_PROVIDER=fal HOẶC chỉ FAL_API_KEY có sẵn, route chat &
// vision qua fal.ai (any-llm). Cho phép dự án chạy hoàn toàn trên fal mà không
// cần OpenAI/OpenRouter key.
function shouldUseFal(): boolean {
  const pref = (process.env.AI_PREFERRED_PROVIDER || '').toLowerCase();
  if (pref === 'fal') return !!process.env.FAL_API_KEY;
  // Auto: dùng fal khi không có OpenAI/OpenRouter nhưng có fal
  if (pref === 'auto' || !pref) {
    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && process.env.FAL_API_KEY) {
      return true;
    }
  }
  return false;
}

// ── Chat completion ────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  // Route qua fal.ai nếu được cấu hình (xem shouldUseFal())
  if (shouldUseFal()) {
    const { FalProvider } = await import('./providers/fal-provider');
    const fal = new FalProvider();
    const res = await fal.complete(messages, {
      model: opts?.model,
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
    });
    return res.content;
  }

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: opts?.model ?? DEFAULT_CHAT_MODEL,
    messages,
    temperature: opts?.temperature ?? 0.3,
    max_tokens: opts?.maxTokens ?? 2048,
  });
  return response.choices[0]?.message?.content ?? '';
}

// ── Vision (image → text) ──────────────────────────────────────────────────────

export async function visionCompletion(
  imageData: string | Buffer,
  prompt: string,
  opts?: {
    model?: string;
    detail?: 'low' | 'high' | 'auto';
    maxTokens?: number;
  }
): Promise<string> {
  // Detect mime + convert to base64 first (cùng logic dùng cho cả 2 nhánh)
  let base64: string;
  let mimeType = 'image/jpeg';
  if (Buffer.isBuffer(imageData)) {
    if (imageData[0] === 0x89 && imageData[1] === 0x50) mimeType = 'image/png';
    else if (imageData[0] === 0xff && imageData[1] === 0xd8) mimeType = 'image/jpeg';
    else if (imageData[0] === 0x47 && imageData[1] === 0x49) mimeType = 'image/gif';
    else if (imageData[0] === 0x52 && imageData[4] === 0x57) mimeType = 'image/webp';
    base64 = imageData.toString('base64');
  } else {
    if (imageData.startsWith('data:')) {
      const match = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) { mimeType = match[1]; base64 = match[2]; }
      else { base64 = imageData.split(',')[1] ?? imageData; }
    } else {
      base64 = imageData;
    }
  }

  // Route qua fal.ai nếu được cấu hình
  if (shouldUseFal()) {
    const { FalProvider } = await import('./providers/fal-provider');
    const fal = new FalProvider();
    const res = await fal.completeWithVision(
      [{ role: 'user', content: prompt }],
      [{ mimeType, data: base64 }],
      { model: opts?.model, maxTokens: opts?.maxTokens },
    );
    return res.content;
  }

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: opts?.model ?? DEFAULT_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
              detail: opts?.detail ?? 'high',
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
    max_tokens: opts?.maxTokens ?? 2000,
  });

  return response.choices[0]?.message?.content ?? '';
}

// ── Text embedding ─────────────────────────────────────────────────────────────

export async function getEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  // Note: OpenRouter does NOT support embeddings — use OpenAI directly if needed
  // If only OpenRouter key is set, this will fail gracefully in simple-rag.ts
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

// ── Cosine similarity helper ───────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
