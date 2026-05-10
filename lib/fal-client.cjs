/**
 * fal-client.cjs — CommonJS client cho fal.ai any-llm
 *
 * Dành cho:
 *   - server.cjs (Express built-in routes)
 *   - scripts/* (test, batch jobs)
 *   - bất kỳ Node CJS module nào không thể import .ts
 *
 * Cùng API với lib/ai/providers/fal-provider.ts (TypeScript) nhưng plain CJS.
 *
 * ENV:
 *   FAL_API_KEY        — bắt buộc, "key_id:secret"
 *   FAL_DEFAULT_MODEL  — text default, mặc định "anthropic/claude-3.5-sonnet"
 *   FAL_VISION_MODEL   — vision default, mặc định "google/gemini-flash-1.5"
 *
 * Public API:
 *   complete({ messages, model, system, options }) → { content, model, usage, raw }
 *   completeWithVision({ messages, images, model, ... })
 *   extractTextFromImage(imageBase64, mimeType, language)
 */

'use strict';

const FAL_BASE = 'https://queue.fal.run/fal-ai/any-llm';
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90_000;

function getApiKey() {
  const k = process.env.FAL_API_KEY;
  if (!k) throw new Error('FAL_API_KEY env var not set');
  return k;
}

function defaultModel() {
  return process.env.FAL_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';
}

function defaultVisionModel() {
  return process.env.FAL_VISION_MODEL || 'google/gemini-flash-1.5';
}

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

// Fold messages → { systemPrompt, prompt }
function foldMessages(messages) {
  const systems = messages.filter(m => m.role === 'system').map(m => m.content);
  const others = messages.filter(m => m.role !== 'system');
  const prompt = others.map(m =>
    m.role === 'assistant' ? `Assistant: ${m.content}` : m.content
  ).join('\n\n');
  return {
    systemPrompt: systems.length ? systems.join('\n') : null,
    prompt: prompt || systems.join('\n'),
  };
}

// Queue submit + poll
// QUAN TRỌNG: dùng `response_url` từ submit response. Vision endpoint
// (`/any-llm/vision`) trả response_url trỏ về `/any-llm/requests/...`
// (KHÔNG có `/vision`) — nên không thể construct URL từ `endpoint + /requests/<id>`.
async function invoke(endpoint, body) {
  const apiKey = getApiKey();
  const submit = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const text = await submit.text();
    throw new Error(`fal.ai submit failed (${submit.status}): ${text.slice(0, 300)}`);
  }
  const submitJson = await submit.json();
  const requestId = submitJson.request_id;
  if (!requestId) throw new Error(`fal.ai missing request_id: ${JSON.stringify(submitJson).slice(0, 200)}`);
  // Ưu tiên response_url server trả; fallback construct (cho text endpoint).
  const responseUrl = submitJson.response_url || `${endpoint}/requests/${requestId}`;
  const statusUrl = submitJson.status_url || `${responseUrl}/status`;

  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    // Poll response — nếu COMPLETED sẽ có output ngay
    const poll = await fetch(responseUrl, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });
    if (poll.ok) {
      const data = await poll.json();
      if (data.error) throw new Error(`fal.ai error: ${data.error}`);
      if (typeof data.output === 'string' && data.partial !== true) {
        return data.output;
      }
    }
    // Fallback: check status_url
    const status = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });
    if (status.ok) {
      const s = await status.json();
      if (s.status === 'FAILED') {
        throw new Error(`fal.ai request failed: ${JSON.stringify(s).slice(0, 300)}`);
      }
    }
  }
  throw new Error('fal.ai timeout waiting for response');
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Text completion
 *   args: {
 *     messages: [{role:'system'|'user'|'assistant', content:string}],
 *     model?: string,             // overrides default
 *     system?: string,            // shortcut, prepended to system messages
 *   }
 */
async function complete(args = {}) {
  const messages = (args.messages || []).slice();
  if (args.system) messages.unshift({ role: 'system', content: args.system });
  const model = args.model || defaultModel();
  const { systemPrompt, prompt } = foldMessages(messages);

  const output = await invoke(FAL_BASE, {
    model,
    prompt,
    ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
  });

  const promptTokens = estimateTokens(prompt + (systemPrompt || ''));
  const completionTokens = estimateTokens(output);
  return {
    content: output,
    model,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

/**
 * Upload binary buffer → fal CDN, returns public URL.
 * fal.ai vision endpoints chỉ chấp nhận image_url là HTTP URL (không nhận
 * data:base64 inline). Nên gọi uploadFile() trước cho ảnh local.
 *
 *   buf:      Buffer hoặc Uint8Array
 *   mimeType: 'image/jpeg' | 'image/png' | 'application/pdf' | ...
 *   fileName: optional, mặc định 'upload.<ext>'
 *
 * Return: URL string
 */
async function uploadFile(buf, mimeType, fileName) {
  const apiKey = getApiKey();
  const ext = (mimeType.split('/')[1] || 'bin').replace('jpeg', 'jpg');
  const name = fileName || `upload-${Date.now()}.${ext}`;

  // Step 1: request signed upload URL
  const init = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
    method: 'POST',
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_type: mimeType, file_name: name }),
  });
  if (!init.ok) {
    const text = await init.text();
    throw new Error(`fal.ai upload init failed (${init.status}): ${text.slice(0, 200)}`);
  }
  const { upload_url, file_url } = await init.json();
  if (!upload_url || !file_url) throw new Error('fal.ai upload init: missing upload_url/file_url');

  // Step 2: PUT file to signed URL
  const put = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: buf,
  });
  if (!put.ok) {
    const text = await put.text();
    throw new Error(`fal.ai upload PUT failed (${put.status}): ${text.slice(0, 200)}`);
  }

  return file_url;
}

/**
 * Vision completion (1+ images)
 *   args: {
 *     messages, model, system,
 *     images: [{ mimeType, data, url? }]
 *       — data = base64 (sẽ tự upload lên fal CDN); HOẶC truyền sẵn `url` HTTP.
 *   }
 */
async function completeWithVision(args = {}) {
  const messages = (args.messages || []).slice();
  if (args.system) messages.unshift({ role: 'system', content: args.system });
  const images = args.images || [];
  if (!images.length) throw new Error('completeWithVision requires images[]');
  const model = args.model || defaultVisionModel();
  const { systemPrompt, prompt } = foldMessages(messages);

  const responses = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    let imgUrl = img.url;
    if (!imgUrl) {
      // fal vision không nhận data:URL; phải upload ảnh local lên fal CDN trước.
      const buf = Buffer.from(img.data, 'base64');
      imgUrl = await uploadFile(buf, img.mimeType);
    }
    const out = await invoke(`${FAL_BASE}/vision`, {
      model,
      prompt,
      image_url: imgUrl,
      ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
    });
    responses.push(images.length > 1 ? `=== Image ${i + 1} ===\n${out}` : out);
  }
  const content = responses.join('\n\n');
  return {
    content,
    model,
    usage: {
      promptTokens: estimateTokens(prompt + (systemPrompt || '')) + images.length * 85,
      completionTokens: estimateTokens(content),
      totalTokens: 0,
    },
  };
}

/**
 * OCR helper — extract text from image
 *   imageBase64: base64 string (no data: prefix)
 *   mimeType:    'image/jpeg' | 'image/png' | ...
 *   language:    'vi' | 'en' (default 'en')
 */
async function extractTextFromImage(imageBase64, mimeType = 'image/jpeg', language = 'en') {
  const prompt = language === 'vi'
    ? 'Hãy trích xuất toàn bộ văn bản từ hình ảnh này. Giữ nguyên định dạng, xuống dòng, và cấu trúc. Chỉ trả về văn bản, không giải thích thêm.'
    : 'Extract all text from this image. Preserve formatting, line breaks, and structure. Return only the text, no explanations.';
  const r = await completeWithVision({
    messages: [{ role: 'user', content: prompt }],
    images: [{ mimeType, data: imageBase64 }],
  });
  return r.content;
}

module.exports = {
  complete,
  completeWithVision,
  extractTextFromImage,
  uploadFile,
  // exposed cho test
  _internal: { invoke, foldMessages, defaultModel, defaultVisionModel },
};
