/**
 * speech.ts — phát âm tiếng Anh bằng Web Speech API (SpeechSynthesis).
 *
 * Vì sao Web Speech API:
 *   - Miễn phí, KHÔNG cần API key / không tốn quota.
 *   - Giọng native chất lượng cao có sẵn trên iOS/macOS/Android/Chrome
 *     (vd "Samantha", "Daniel" — đúng "giọng phát âm như Duolingo").
 *   - Chạy offline (sau khi voice tải).
 *
 * Kiến trúc đơn giản, không phụ thuộc — sau này muốn đổi sang TTS server
 * (ElevenLabs, Google TTS…) chỉ cần thay `speak()`.
 */

let _voices: SpeechSynthesisVoice[] = []
let _ready = false

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Tải danh sách voice (voices nạp bất đồng bộ trên 1 số trình duyệt) */
function loadVoices(): void {
  if (!isSupported()) return
  const grab = () => {
    const v = window.speechSynthesis.getVoices()
    if (v.length) { _voices = v; _ready = true }
  }
  grab()
  // Chrome/Safari đôi khi trả [] lần đầu → nghe sự kiện
  window.speechSynthesis.onvoiceschanged = grab
}

if (isSupported()) loadVoices()

/** Chọn voice tốt nhất cho 1 ngôn ngữ (ưu tiên local + giọng "đẹp" đã biết) */
function pickVoice(lang: 'en' | 'vi'): SpeechSynthesisVoice | undefined {
  if (!_ready) loadVoices()
  const prefix = lang === 'en' ? 'en' : 'vi'
  const candidates = _voices.filter(v => v.lang?.toLowerCase().startsWith(prefix))
  if (!candidates.length) return undefined

  // Ưu tiên giọng native nổi tiếng (Apple/Google) cho tiếng Anh
  const NICE_EN = ['samantha', 'daniel', 'karen', 'moira', 'google us english', 'google uk english']
  if (lang === 'en') {
    const nice = candidates.find(v => NICE_EN.some(n => v.name.toLowerCase().includes(n)))
    if (nice) return nice
    const enUS = candidates.find(v => v.lang.toLowerCase() === 'en-us')
    if (enUS) return enUS
  }
  // Ưu tiên voice local (không cần mạng)
  return candidates.find(v => v.localService) || candidates[0]
}

export interface SpeakOptions {
  lang?: 'en' | 'vi'
  /** tốc độ 0.1–2 (0.7 cho trẻ nhỏ nghe rõ) */
  rate?: number
  /** cao độ 0–2 */
  pitch?: number
  onEnd?: () => void
}

/** Phát âm 1 đoạn text. Tự huỷ câu đang đọc trước đó. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSupported() || !text) return
  try {
    window.speechSynthesis.cancel() // tránh chồng tiếng
    const u = new SpeechSynthesisUtterance(text)
    const lang = opts.lang || 'en'
    u.lang = lang === 'en' ? 'en-US' : 'vi-VN'
    const voice = pickVoice(lang)
    if (voice) u.voice = voice
    u.rate = opts.rate ?? 0.95
    u.pitch = opts.pitch ?? 1
    if (opts.onEnd) u.onend = opts.onEnd
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

/** Phát âm chậm — dùng nút "🐢 nghe chậm" cho trẻ nhỏ tập theo */
export function speakSlow(text: string, lang: 'en' | 'vi' = 'en'): void {
  speak(text, { lang, rate: 0.55 })
}

export function stopSpeaking(): void {
  if (isSupported()) { try { window.speechSynthesis.cancel() } catch { /* ignore */ } }
}

export function ttsSupported(): boolean {
  return isSupported()
}

/** Có voice tiếng Anh không (để ẩn nút phát âm nếu thiết bị thiếu) */
export function hasEnglishVoice(): boolean {
  if (!_ready) loadVoices()
  return _voices.some(v => v.lang?.toLowerCase().startsWith('en'))
}
