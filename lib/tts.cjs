/**
 * lib/tts.cjs — Google Cloud Text-to-Speech cho mascot Aero (VI + EN).
 *
 * GET /api/tts?lang=vi|en&text=...  → audio/mpeg (MP3).
 *
 * Xác thực (theo thứ tự):
 *   1. GOOGLE_TTS_API_KEY  → REST ?key=
 *   2. GOOGLE_CLOUD_CREDENTIALS / ADC (service account) → Bearer token
 *      (giống Storage; chỉ cần BẬT API "Cloud Text-to-Speech")
 *   Không có → 501 (client tự fallback giọng trình duyệt).
 *
 * Cache MP3 trong RAM theo (lang|text) để khỏi gọi lại tốn phí.
 */
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const cache = new Map() // key → Buffer
const MAX_CACHE = 300

let _auth = null
function getAuth() {
  if (_auth) return _auth
  try {
    const { GoogleAuth } = require('google-auth-library')
    const opts = { scopes: 'https://www.googleapis.com/auth/cloud-platform' }
    if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      try { opts.credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) } catch { /* ignore */ }
    }
    _auth = new GoogleAuth(opts)
  } catch { _auth = null }
  return _auth
}

async function synthesize(text, lang) {
  const isEn = lang === 'en'
  const body = {
    input: { text },
    voice: { languageCode: isEn ? 'en-US' : 'vi-VN', name: isEn ? 'en-US-Wavenet-D' : 'vi-VN-Wavenet-A' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05, pitch: 2.0 },
  }
  let url = ENDPOINT
  const headers = { 'Content-Type': 'application/json' }
  const key = process.env.GOOGLE_TTS_API_KEY
  if (key) {
    url += '?key=' + encodeURIComponent(key)
  } else {
    const auth = getAuth()
    if (!auth) throw new Error('no_auth')
    const client = await auth.getClient()
    const tk = await client.getAccessToken()
    const token = (tk && tk.token) || tk
    if (!token) throw new Error('no_token')
    headers.Authorization = 'Bearer ' + token
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('tts_http_' + res.status + ': ' + (await res.text()).slice(0, 160))
  const j = await res.json()
  if (!j.audioContent) throw new Error('no_audio')
  return Buffer.from(j.audioContent, 'base64')
}

async function handler(req, res) {
  try {
    const text = String(req.query.text || '').slice(0, 400).trim()
    const lang = req.query.lang === 'en' ? 'en' : 'vi'
    if (!text) return res.status(400).json({ error: 'missing_text' })
    const ck = lang + '|' + text
    if (cache.has(ck)) {
      res.set('Content-Type', 'audio/mpeg')
      res.set('Cache-Control', 'public, max-age=86400')
      return res.send(cache.get(ck))
    }
    const buf = await synthesize(text, lang)
    cache.set(ck, buf)
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value)
    res.set('Content-Type', 'audio/mpeg')
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(buf)
  } catch (e) {
    res.status(501).json({ error: 'tts_unavailable', detail: String((e && e.message) || e).slice(0, 200) })
  }
}

module.exports = { handler, synthesize }
