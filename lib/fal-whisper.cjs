/**
 * fal-whisper.cjs — Speech-to-text qua fal.ai Whisper
 *
 * Model: fal-ai/whisper (Whisper large-v3)
 * Endpoint: https://queue.fal.run/fal-ai/whisper
 *
 * Input audio dạng:
 *   - Buffer (raw bytes) → tự convert base64 data URL
 *   - hoặc URL (đã upload sẵn lên storage)
 *
 * ENV: FAL_API_KEY (format "key_id:secret")
 *
 * Public API:
 *   transcribeBuffer(buffer, mimeType, opts) → { text, segments }
 *   transcribeUrl(audioUrl, opts)            → { text, segments }
 */

'use strict';

const FAL_WHISPER_URL = 'https://queue.fal.run/fal-ai/whisper';
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = Number(process.env.FAL_POLL_TIMEOUT_MS) || 180_000;

function getApiKey() {
  const k = process.env.FAL_API_KEY;
  if (!k) throw new Error('FAL_API_KEY env var not set');
  return k;
}

// Map ISO language code → fal.ai whisper language. 'auto' = null (auto-detect).
function normalizeLanguage(lang) {
  if (!lang || lang === 'auto') return null;
  const map = { vi: 'vi', en: 'en', zh: 'zh', ja: 'ja', ko: 'ko', fr: 'fr', de: 'de', es: 'es' };
  return map[lang] || lang;
}

/**
 * Submit + poll fal.ai Whisper queue API.
 * Returns: { text, chunks: [{ timestamp: [start, end], text }] }
 */
async function invokeWhisper(payload) {
  const apiKey = getApiKey();

  const submit = await fetch(FAL_WHISPER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!submit.ok) {
    const text = await submit.text();
    throw new Error(`fal.ai whisper submit failed (${submit.status}): ${text.slice(0, 300)}`);
  }
  const submitJson = await submit.json();
  const requestId = submitJson.request_id;
  if (!requestId) throw new Error(`fal.ai whisper missing request_id: ${JSON.stringify(submitJson).slice(0, 200)}`);

  const responseUrl = submitJson.response_url || `${FAL_WHISPER_URL}/requests/${requestId}`;
  const statusUrl = submitJson.status_url || `${responseUrl}/status`;

  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    // Check status
    const status = await fetch(statusUrl, { headers: { 'Authorization': `Key ${apiKey}` } });
    if (status.ok) {
      const sj = await status.json();
      if (sj.status === 'COMPLETED') {
        // Fetch result
        const result = await fetch(responseUrl, { headers: { 'Authorization': `Key ${apiKey}` } });
        if (result.ok) {
          const data = await result.json();
          return data;
        }
      } else if (sj.status === 'FAILED' || sj.status === 'ERROR') {
        throw new Error(`fal.ai whisper failed: ${JSON.stringify(sj).slice(0, 300)}`);
      }
    }
  }
  throw new Error(`fal.ai whisper timeout after ${POLL_TIMEOUT_MS / 1000}s`);
}

/**
 * Transcribe Buffer audio bytes → text.
 *
 * @param {Buffer} buffer - audio bytes (webm/mp3/wav/etc)
 * @param {string} mimeType - "audio/webm", "audio/mpeg", "audio/wav"
 * @param {object} opts - { language?: 'vi'|'en'|'auto', task?: 'transcribe'|'translate' }
 * @returns {Promise<{ text: string, chunks: Array }>}
 */
async function transcribeBuffer(buffer, mimeType, opts = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('transcribeBuffer: arg phải là Buffer');
  }
  if (buffer.length === 0) {
    throw new Error('transcribeBuffer: buffer rỗng');
  }
  // fal.ai accepts data URL inline
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType || 'audio/webm'};base64,${base64}`;

  const payload = {
    audio_url: dataUrl,
    task: opts.task || 'transcribe',
    chunk_level: 'segment',
    version: '3',
  };
  const lang = normalizeLanguage(opts.language);
  if (lang) payload.language = lang;

  const result = await invokeWhisper(payload);
  return {
    text: result.text || '',
    chunks: Array.isArray(result.chunks) ? result.chunks : [],
    inferred_languages: result.inferred_languages || null,
  };
}

/**
 * Transcribe audio đã có URL (vd: GCS bucket) → text.
 */
async function transcribeUrl(audioUrl, opts = {}) {
  if (!audioUrl) throw new Error('transcribeUrl: audioUrl required');
  const payload = {
    audio_url: audioUrl,
    task: opts.task || 'transcribe',
    chunk_level: 'segment',
    version: '3',
  };
  const lang = normalizeLanguage(opts.language);
  if (lang) payload.language = lang;

  const result = await invokeWhisper(payload);
  return {
    text: result.text || '',
    chunks: Array.isArray(result.chunks) ? result.chunks : [],
    inferred_languages: result.inferred_languages || null,
  };
}

module.exports = { transcribeBuffer, transcribeUrl };
