/**
 * storyBgm — nhạc nền điện ảnh TỰ SINH bằng Web Audio (không cần file).
 *
 * Tạo lớp pad hợp âm chậm + bè trầm + lấp lánh, âm lượng nhỏ để lời kể nổi rõ.
 * Hợp âm đổi theo "tông" của hồi (warm/excited/suspense/sad/gentle) → cung bậc
 * cảm xúc khớp truyện. Preset (cinematic/calm/epic) chỉnh độ dày & độ sáng.
 *
 * Dùng:
 *   const bgm = new StoryBgm('cinematic')
 *   bgm.start()            // gọi trong cử chỉ người dùng (nút Bắt đầu)
 *   bgm.setMood('suspense')
 *   bgm.setMuted(true)
 *   bgm.stop()
 */
export type BgmMood = 'warm' | 'gentle' | 'excited' | 'suspense' | 'sad'
export type BgmPreset = 'cinematic' | 'calm' | 'epic'

// Hợp âm (Hz) — 4 nốt pad cho mỗi tông cảm xúc.
const CHORDS: Record<BgmMood, number[]> = {
  warm:     [130.81, 164.81, 196.00, 261.63], // C3 E3 G3 C4 (Đô trưởng — ấm áp)
  gentle:   [110.00, 164.81, 196.00, 246.94], // A2 E3 G3 B3 (dịu nhẹ)
  sad:      [110.00, 130.81, 155.56, 196.00], // A2 C3 Eb3 G3 (thứ — buồn)
  suspense: [110.00, 138.59, 174.61, 207.65], // A2 C#3 F3 G#3 (nghịch — hồi hộp)
  excited:  [130.81, 196.00, 261.63, 392.00], // C3 G3 C4 G4 (quãng năm mở — hùng tráng)
}
const PRESET: Record<BgmPreset, { gain: number; cutoff: number; subGain: number }> = {
  calm:      { gain: 0.05, cutoff: 1100, subGain: 0.04 },
  cinematic: { gain: 0.075, cutoff: 1500, subGain: 0.06 },
  epic:      { gain: 0.095, cutoff: 2000, subGain: 0.09 },
}

export class StoryBgm {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private lp: BiquadFilterNode | null = null
  private voices: { osc: OscillatorNode; gain: GainNode }[] = []
  private sub: { osc: OscillatorNode; gain: GainNode } | null = null
  private swellTimer: ReturnType<typeof setInterval> | null = null
  private started = false
  private muted = false
  private mood: BgmMood = 'warm'
  private preset: BgmPreset

  constructor(preset: BgmPreset = 'cinematic', mood: BgmMood = 'warm') {
    this.preset = PRESET[preset] ? preset : 'cinematic'
    this.mood = CHORDS[mood] ? mood : 'warm'
  }

  start() {
    if (this.started) return
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const cfg = PRESET[this.preset]
      const master = ctx.createGain(); master.gain.value = 0
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cfg.cutoff; lp.Q.value = 0.6
      master.connect(lp).connect(ctx.destination)

      const freqs = CHORDS[this.mood]
      this.voices = freqs.map((f, i) => {
        const osc = ctx.createOscillator(); osc.type = i === 0 ? 'sine' : 'triangle'
        osc.frequency.value = f; osc.detune.value = (i - 1.5) * 4 // hơi lệch cho dày
        const g = ctx.createGain(); g.gain.value = 0
        osc.connect(g).connect(master); osc.start()
        return { osc, gain: g }
      })
      // Bè trầm (sub) tạo chiều sâu điện ảnh
      const subOsc = ctx.createOscillator(); subOsc.type = 'sine'; subOsc.frequency.value = freqs[0] / 2
      const subG = ctx.createGain(); subG.gain.value = 0
      subOsc.connect(subG).connect(master); subOsc.start()
      this.sub = { osc: subOsc, gain: subG }

      this.ctx = ctx; this.master = master; this.lp = lp; this.started = true
      master.gain.setTargetAtTime(this.muted ? 0 : cfg.gain, ctx.currentTime, 2.5)
      this.sub.gain.gain.setTargetAtTime(cfg.subGain, ctx.currentTime, 3)
      this.swell()
      this.swellTimer = setInterval(() => this.swell(), 4200)
    } catch { /* không hỗ trợ WebAudio → bỏ qua */ }
  }

  // Dao động nhẹ âm lượng từng bè → pad "thở", sống động hơn.
  private swell() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.voices.forEach((v, i) => {
      const target = 0.04 + Math.random() * 0.05
      v.gain.gain.setTargetAtTime(target, t, 2.2 + i * 0.4)
    })
  }

  setMood(m: BgmMood) {
    if (!CHORDS[m]) return
    this.mood = m
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const freqs = CHORDS[m]
    this.voices.forEach((v, i) => v.osc.frequency.setTargetAtTime(freqs[i % freqs.length], t, 1.3))
    if (this.sub) this.sub.osc.frequency.setTargetAtTime(freqs[0] / 2, t, 1.3)
  }

  setMuted(b: boolean) {
    this.muted = b
    if (this.master && this.ctx) {
      const g = PRESET[this.preset].gain
      this.master.gain.setTargetAtTime(b ? 0 : g, this.ctx.currentTime, 0.5)
    }
  }
  isMuted() { return this.muted }

  resume() { try { this.ctx?.resume() } catch { /* noop */ } }

  stop() {
    try {
      if (this.swellTimer) { clearInterval(this.swellTimer); this.swellTimer = null }
      const ctx = this.ctx
      if (this.master && ctx) this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
      setTimeout(() => {
        this.voices.forEach((v) => { try { v.osc.stop() } catch { /* noop */ } })
        try { this.sub?.osc.stop() } catch { /* noop */ }
        try { ctx?.close() } catch { /* noop */ }
      }, 600)
      this.started = false
    } catch { /* noop */ }
  }
}
