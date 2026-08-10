'use strict';

/**
 * ai-provider.cjs — gọi Ollama local làm fallback khi DeepSeek/Anthropic
 * không cấu hình hoặc không gọi được (offline/desktop/on-premise).
 *
 * Không thay thế logic DeepSeek/Anthropic hiện có ở từng route — chỉ thêm
 * MỘT nhánh cuối cùng để thử trước khi trả lỗi "ai_unavailable". Khi
 * OLLAMA_URL không được cấu hình, mọi hàm ở đây throw ngay (không tốn thời
 * gian mạng) nên hành vi cloud hiện tại không đổi.
 *
 * Ollama expose sẵn endpoint tương thích /api/chat (không phải OpenAI-style
 * /v1/chat/completions) nên dùng thẳng format native của nó:
 *   POST {OLLAMA_URL}/api/chat  { model, messages, stream }
 */

const OLLAMA_URL = (process.env.OLLAMA_URL || '').replace(/\/+$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 120000;

function isOllamaConfigured() {
  return !!OLLAMA_URL;
}

function toOllamaMessages(messages) {
  return messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
}

/**
 * Gọi Ollama không stream. messages: [{role, content}] (có thể gồm 'system').
 * Trả { text, provider:'ollama', model }. Throw nếu OLLAMA_URL chưa cấu hình,
 * timeout, hoặc HTTP lỗi — gọi nơi dùng tự bắt và fallback tiếp/trả lỗi.
 */
async function callOllama(messages, opts = {}) {
  if (!OLLAMA_URL) throw new Error('OLLAMA_URL chưa cấu hình');
  const model = opts.model || OLLAMA_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: toOllamaMessages(messages),
        stream: false,
        options: { temperature: opts.temperature ?? 0.7, num_predict: opts.maxTokens ?? 1200 },
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Ollama HTTP ${resp.status}: ${text.slice(0, 200)}`);
    }
    const json = await resp.json();
    const text = (json?.message?.content || '').trim();
    if (!text) throw new Error('Ollama trả về nội dung rỗng');
    return { text, provider: 'ollama', model };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Gọi Ollama streaming và ghi thẳng SSE format tương thích OpenAI
 * (`data: {choices:[{delta:{content}}]}\n\n` ... `data: [DONE]\n\n`) vào
 * `res` — khớp format /api/ark-bot/chat đang dùng nên FE không cần đổi gì.
 * Trả về model đã dùng khi thành công; throw trước khi ghi byte đầu nếu lỗi
 * (để nơi gọi còn kịp fallback/trả JSON lỗi thay vì SSE dở dang).
 */
async function streamOllamaToSSE(messages, opts, res) {
  if (!OLLAMA_URL) throw new Error('OLLAMA_URL chưa cấu hình');
  const model = opts.model || OLLAMA_MODEL;
  const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: toOllamaMessages(messages),
      stream: true,
      options: { temperature: opts.temperature ?? 0.7, num_predict: opts.maxTokens ?? 1200 },
    }),
  });
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Ollama HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      const delta = obj?.message?.content;
      if (delta) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
      if (obj?.done) { res.write('data: [DONE]\n\n'); return model; }
    }
  }
  res.write('data: [DONE]\n\n');
  return model;
}

module.exports = { isOllamaConfigured, callOllama, streamOllamaToSSE, OLLAMA_MODEL };
