/**
 * kgAudio — Music + SFX manager cho Knowledge Graph.
 *
 * 1. BGM (background music): 3 track instrumental free-to-use lưu trên GCS.
 *    HTML5 <audio> với loop tự động chuyển bài.
 * 2. SFX (sound effects): Web Audio API synthesis (không cần asset).
 *    - bubblePop: pop ngắn 80Hz square wave
 *    - whoosh: white-noise hi-pass low-pass envelope
 *    - chime: 3 nốt cô + lan tỏa reverb
 *
 * Singleton AudioContext cho SFX (1 lần tạo). User preferences lưu LS:
 * - kg:audio:enabled (bool, default false vì autoplay policy)
 * - kg:audio:volume  (0-1, default 0.5)
 * - kg:audio:track   (index 0-2)
 */

const GCS = 'https://storage.googleapis.com/aeroedu-media-extreme-lattice-491123-p2/audio/kg-bgm'

export const KG_TRACKS = [
  { id: 'sunset',  title: 'Aventure — Sunset',           url: `${GCS}/aventure-sunset.mp3`,            duration: '~3:30', mood: '🌅 dịu nhẹ buổi tối' },
  { id: 'florida', title: 'Hoffy Beats — Florida Keys',  url: `${GCS}/hoffy-florida-keys.mp3`,         duration: '~3:42', mood: '🌴 nhiệt đới thư giãn' },
  { id: 'garden',  title: 'Aventure — A Beautiful Garden', url: `${GCS}/aventure-beautiful-garden.mp3`, duration: '~3:18', mood: '🌸 vườn tươi mát' },
] as const

const LS_ENABLED = 'kg:audio:enabled'
const LS_VOLUME  = 'kg:audio:volume'
const LS_TRACK   = 'kg:audio:track'

export function loadAudioPref() {
  if (typeof window === 'undefined') {
    return { enabled: false, volume: 0.45, trackIdx: 0 }
  }
  return {
    enabled:  localStorage.getItem(LS_ENABLED) === '1',
    volume:   parseFloat(localStorage.getItem(LS_VOLUME) || '0.45'),
    trackIdx: parseInt(localStorage.getItem(LS_TRACK) || '0', 10) || 0,
  }
}
export function saveAudioPref(p: { enabled?: boolean; volume?: number; trackIdx?: number }) {
  if (typeof window === 'undefined') return
  if (p.enabled  !== undefined) localStorage.setItem(LS_ENABLED, p.enabled ? '1' : '0')
  if (p.volume   !== undefined) localStorage.setItem(LS_VOLUME, String(p.volume))
  if (p.trackIdx !== undefined) localStorage.setItem(LS_TRACK, String(p.trackIdx))
}

/* ───────── SFX synth — Web Audio API ───────── */

let _ctx: AudioContext | null = null
function ctx() {
  if (typeof window === 'undefined') return null
  if (!_ctx) {
    const W: any = window
    const AC = W.AudioContext || W.webkitAudioContext
    if (!AC) return null
    _ctx = new AC()
  }
  // Resume nếu suspended (autoplay policy)
  if (_ctx && _ctx.state === 'suspended') _ctx.resume().catch(() => {})
  return _ctx
}

/** Pop sound — như bong bóng vỡ. Sweep từ 800Hz → 100Hz trong 250ms. */
export function sfxBubblePop(volume = 0.4) {
  const c = ctx(); if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, t)
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.25)
  const gain = c.createGain()
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.3)
}

/** Hover whoosh — short noise burst */
export function sfxWhoosh(volume = 0.15) {
  const c = ctx(); if (!c) return
  const t = c.currentTime
  // Generate short white noise buffer
  const buf = c.createBuffer(1, c.sampleRate * 0.12, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2000
  filter.Q.value = 1
  const gain = c.createGain()
  gain.gain.value = volume
  src.connect(filter).connect(gain).connect(c.destination)
  src.start(t)
}

/** Chime — focus center, 3 notes ascending C-E-G chord */
export function sfxChime(volume = 0.25) {
  const c = ctx(); if (!c) return
  const t = c.currentTime
  ;[523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const gain = c.createGain()
    const start = t + i * 0.05
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume * 0.6, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6)
    osc.connect(gain).connect(c.destination)
    osc.start(start)
    osc.stop(start + 0.65)
  })
}
