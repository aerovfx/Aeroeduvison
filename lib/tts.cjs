/**
 * lib/tts.cjs — Google Cloud Text-to-Speech (VI + EN) cho mascot Aero và
 * trình đọc truyện thiếu nhi.
 *
 * GET /api/tts?lang=vi|en&text=...[&tone=gentle|warm|excited|suspense|sad][&plain=1]
 *   → audio/mpeg (MP3).
 *
 * GIỌNG TRUYỀN CẢM (mặc định BẬT):
 *   • Dùng voice Neural2 (tự nhiên & biểu cảm hơn Wavenet).
 *   • Bọc SSML: thêm ngắt nghỉ theo dấu câu (kể chuyện có nhịp), nhấn nhẹ lời
 *     thoại trong ngoặc kép, và prosody (rate/pitch) theo "tông cảm xúc" của hồi.
 *   • Fallback 3 tầng: Neural2+SSML → Wavenet+SSML → Wavenet+text thuần — nên
 *     vẫn chạy kể cả khi project chưa bật voice Neural2.
 *   • plain=1 → tắt biểu cảm (text thuần, dùng cho nội dung kỹ thuật).
 *
 * Xác thực: GOOGLE_TTS_API_KEY (?key=) → ADC/service account (Bearer).
 * Cache MP3 trong RAM theo (lang|mode|tone|text).
 */
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const cache = new Map() // key → Buffer
const MAX_CACHE = 400

const VI_VOICE = process.env.GOOGLE_TTS_VOICE_VI || 'vi-VN-Neural2-A'
const EN_VOICE = process.env.GOOGLE_TTS_VOICE_EN || 'en-US-Neural2-F'
const VI_WAVENET = 'vi-VN-Wavenet-A'
const EN_WAVENET = 'en-US-Wavenet-D'

// Tông cảm xúc cho kể chuyện. ssmlRate/ssmlPitch dùng cho SSML prosody;
// rate/pitch (số) dùng cho fallback text thuần.
const TONES = {
  gentle:   { ssmlRate: '93%',  ssmlPitch: '+1st',   rate: 0.93, pitch: 1.5 },   // nhẹ nhàng (mặc định)
  warm:     { ssmlRate: '96%',  ssmlPitch: '+0.5st', rate: 0.96, pitch: 0.5 },   // ấm áp — mở đầu
  excited:  { ssmlRate: '108%', ssmlPitch: '+3st',   rate: 1.06, pitch: 3.0 },    // vui/hào hứng
  suspense: { ssmlRate: '90%',  ssmlPitch: '-1st',   rate: 0.9,  pitch: -1.0 },   // hồi hộp — cao trào
  sad:      { ssmlRate: '85%',  ssmlPitch: '-2st',   rate: 0.85, pitch: -2.0 },   // buồn
}

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// Dựng SSML kể chuyện: ngắt nghỉ theo dấu câu + nhấn lời thoại + prosody theo tông.
function buildSSML(text, toneKey) {
  const t = TONES[toneKey] || TONES.gentle
  let body = escXml(text)
  // Nhấn nhẹ cụm trong ngoặc kép “...” hoặc "..." (lời thoại nhân vật)
  body = body.replace(/[“"]([^”"]{1,140})[”"]/g, '<emphasis level="moderate">“$1”</emphasis>')
  // Ngắt dài sau câu kết, ngắt vừa sau dấu phẩy/chấm phẩy/gạch (tạo nhịp kể)
  body = body
    .replace(/([.!?…])(\s|$)/g, '$1<break time="480ms"/>$2')
    .replace(/([,;:–—])(\s)/g, '$1<break time="240ms"/>$2')
  return `<speak><prosody rate="${t.ssmlRate}" pitch="${t.ssmlPitch}">${body}</prosody></speak>`
}

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

// Gọi API 1 lần với body cho sẵn → Buffer MP3.
async function _post(body) {
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

/**
 * synthesize(text, lang, opts)
 *   opts.expressive (mặc định true) · opts.tone · opts.voice
 * Thử lần lượt nhiều cấu hình để luôn ra audio kể cả khi voice Neural2 chưa bật.
 */
async function synthesize(text, lang, opts = {}) {
  const isEn = lang === 'en'
  const expressive = opts.expressive !== false
  const toneKey = TONES[opts.tone] ? opts.tone : 'gentle'
  const t = TONES[toneKey]
  const lc = isEn ? 'en-US' : 'vi-VN'
  const primary = opts.voice || (isEn ? EN_VOICE : VI_VOICE)
  const wavenet = isEn ? EN_WAVENET : VI_WAVENET

  const attempts = []
  if (expressive) {
    const ssml = buildSSML(text, toneKey)
    attempts.push({ input: { ssml }, voice: { languageCode: lc, name: primary }, audioConfig: { audioEncoding: 'MP3' } })
    attempts.push({ input: { ssml }, voice: { languageCode: lc, name: wavenet }, audioConfig: { audioEncoding: 'MP3' } })
  }
  // Tầng cuối: text thuần + Wavenet (luôn tương thích)
  attempts.push({ input: { text }, voice: { languageCode: lc, name: wavenet }, audioConfig: { audioEncoding: 'MP3', speakingRate: t.rate, pitch: t.pitch } })

  let lastErr
  for (const body of attempts) {
    try { return await _post(body) } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('tts_failed')
}

async function handler(req, res) {
  try {
    const text = String(req.query.text || '').slice(0, 600).trim()
    const lang = req.query.lang === 'en' ? 'en' : 'vi'
    const expressive = String(req.query.plain || '') !== '1'
    const tone = TONES[req.query.tone] ? String(req.query.tone) : 'gentle'
    if (!text) return res.status(400).json({ error: 'missing_text' })
    const ck = `${lang}|${expressive ? 'x:' + tone : 'p'}|${text}`
    if (cache.has(ck)) {
      res.set('Content-Type', 'audio/mpeg')
      res.set('Cache-Control', 'public, max-age=86400')
      return res.send(cache.get(ck))
    }
    const buf = await synthesize(text, lang, { expressive, tone })
    cache.set(ck, buf)
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value)
    res.set('Content-Type', 'audio/mpeg')
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(buf)
  } catch (e) {
    res.status(501).json({ error: 'tts_unavailable', detail: String((e && e.message) || e).slice(0, 200) })
  }
}

module.exports = { handler, synthesize, TONES }
