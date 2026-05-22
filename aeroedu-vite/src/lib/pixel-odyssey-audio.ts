/**
 * Pixel Odyssey Audio — procedural chiptune dùng Web Audio API
 *
 * Tự sinh nhạc nền + SFX bằng oscillator (sine/square/triangle/sawtooth) —
 * không tải file ngoài, không phụ thuộc asset. Mỗi map / chapter có nhịp
 * + scale khác nhau để tạo cảm giác (calm Luneria vs tense Crater + Shadow).
 *
 * Nguyên lý:
 *   - Pentatonic / minor scale → chord progression đơn giản
 *   - Lead voice (square wave) chơi melody loop ~16 notes
 *   - Bass voice (triangle) chơi root note theo chord
 *   - Lookahead scheduler (50ms tick, 100ms lookahead) tránh jitter
 *   - SFX dùng oscillator + envelope: attack swing, pickup, levelup,
 *     enemy hit, damage taken, chapter advance jingle
 *
 * Public API:
 *   - audio.init()                     khởi tạo context (gọi sau user gesture)
 *   - audio.setMuted(bool) / .isMuted()
 *   - audio.playBgm(track: 'luneria'|'crater'|'battle'|'silent')
 *   - audio.stopBgm()
 *   - audio.sfxAttack() / .sfxHit() / .sfxPickup() / .sfxLevelUp() /
 *     .sfxDamage() / .sfxChapter() / .sfxDialogue()
 */

type Track = 'luneria' | 'crater' | 'battle' | 'silent'

interface NoteEvent {
  freq: number       // Hz, 0 = rest
  duration: number   // beats
  velocity?: number  // 0-1
}

// ─── Note frequency table ───────────────────────────────────────
// Standard A4 = 440Hz, equal temperament. Function tính freq từ MIDI note num.
const noteFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

// Helpful MIDI constants
const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57, B3 = 59
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71
const C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81

// ─── Track definitions (original melodies tự nghĩ) ──────────────
/**
 * Mỗi track = { bpm, lead (melody), bass (root line) }.
 * Note 0 = rest. Tổng beats = lead.reduce(d).
 */
interface TrackDef {
  bpm: number
  lead: NoteEvent[]
  bass: NoteEvent[]
  leadWave: OscillatorType
  bassWave: OscillatorType
}

// Luneria — calm wandering melody (pentatonic A minor)
const TRACK_LUNERIA: TrackDef = {
  bpm: 92,
  leadWave: 'square',
  bassWave: 'triangle',
  lead: [
    // Phrase 1 (4 bars)
    { freq: noteFreq(A4), duration: 1 },
    { freq: noteFreq(C5), duration: 0.5 },
    { freq: noteFreq(E5), duration: 0.5 },
    { freq: noteFreq(D5), duration: 1 },
    { freq: noteFreq(C5), duration: 1 },
    { freq: noteFreq(A4), duration: 0.5 },
    { freq: noteFreq(G4), duration: 0.5 },
    { freq: noteFreq(A4), duration: 2 },
    // Phrase 2
    { freq: noteFreq(E5), duration: 1 },
    { freq: noteFreq(D5), duration: 0.5 },
    { freq: noteFreq(C5), duration: 0.5 },
    { freq: noteFreq(D5), duration: 1 },
    { freq: noteFreq(E5), duration: 1 },
    { freq: noteFreq(A5), duration: 1 },
    { freq: noteFreq(G5), duration: 1 },
    { freq: noteFreq(E5), duration: 2 },
  ],
  bass: [
    // Am — Dm — G — C progression
    { freq: noteFreq(A3 - 12), duration: 4 },
    { freq: noteFreq(D3 - 12), duration: 4 },
    { freq: noteFreq(G3 - 12), duration: 4 },
    { freq: noteFreq(C3 - 12), duration: 4 },
  ],
}

// Crater — eerie ambient (whole tone bits + low drone)
const TRACK_CRATER: TrackDef = {
  bpm: 70,
  leadWave: 'sawtooth',
  bassWave: 'triangle',
  lead: [
    { freq: noteFreq(E4), duration: 2 },
    { freq: noteFreq(F4), duration: 1 },
    { freq: noteFreq(G4), duration: 1 },
    { freq: noteFreq(A4), duration: 3 },
    { freq: 0, duration: 1 },
    { freq: noteFreq(B4), duration: 2 },
    { freq: noteFreq(A4), duration: 1 },
    { freq: noteFreq(G4), duration: 1 },
    { freq: noteFreq(F4), duration: 3 },
    { freq: 0, duration: 1 },
  ],
  bass: [
    { freq: noteFreq(A3 - 24), duration: 8 },
    { freq: noteFreq(F3 - 24), duration: 8 },
  ],
}

// Battle — fast aggressive (after shadows appear)
const TRACK_BATTLE: TrackDef = {
  bpm: 140,
  leadWave: 'square',
  bassWave: 'sawtooth',
  lead: [
    { freq: noteFreq(A4), duration: 0.5 },
    { freq: noteFreq(A4), duration: 0.5 },
    { freq: noteFreq(E5), duration: 1 },
    { freq: noteFreq(D5), duration: 0.5 },
    { freq: noteFreq(C5), duration: 0.5 },
    { freq: noteFreq(B4), duration: 1 },
    { freq: noteFreq(A4), duration: 0.5 },
    { freq: noteFreq(G4), duration: 0.5 },
    { freq: noteFreq(A4), duration: 2 },
    { freq: noteFreq(E5), duration: 1 },
    { freq: noteFreq(F5), duration: 0.5 },
    { freq: noteFreq(E5), duration: 0.5 },
    { freq: noteFreq(D5), duration: 1 },
    { freq: noteFreq(C5), duration: 1 },
  ],
  bass: [
    { freq: noteFreq(A3 - 12), duration: 2 },
    { freq: noteFreq(A3 - 12), duration: 2 },
    { freq: noteFreq(F3 - 12), duration: 2 },
    { freq: noteFreq(G3 - 12), duration: 2 },
  ],
}

const TRACKS: Record<Track, TrackDef | null> = {
  luneria: TRACK_LUNERIA,
  crater: TRACK_CRATER,
  battle: TRACK_BATTLE,
  silent: null,
}

const MUTED_KEY = 'inphysic_pixel_odyssey_muted'

class PixelOdysseyAudio {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private muted = false
  private currentTrack: Track = 'silent'
  private schedulerTimer: number | null = null
  private nextNoteTime = 0
  private leadIdx = 0
  private bassIdx = 0
  private leadOffset = 0  // elapsed beats trong note hiện tại
  private bassOffset = 0

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTED_KEY) === 'true'
    } catch {/* noop */}
  }

  init() {
    if (this.ctx) return
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return
      this.ctx = new Ctx()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.muted ? 0 : 0.6
      this.masterGain.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.22
      this.musicGain.connect(this.masterGain)
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.5
      this.sfxGain.connect(this.masterGain)
    } catch (e) {
      console.warn('[pixel-audio] init failed:', (e as Error).message)
    }
  }

  isMuted() { return this.muted }
  setMuted(m: boolean) {
    this.muted = m
    try { localStorage.setItem(MUTED_KEY, String(m)) } catch {/* noop */}
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
      this.masterGain.gain.linearRampToValueAtTime(
        m ? 0 : 0.6,
        this.ctx.currentTime + 0.1,
      )
    }
  }
  toggleMute() {
    this.setMuted(!this.muted)
    return this.muted
  }

  playBgm(track: Track) {
    if (!this.ctx) this.init()
    if (!this.ctx || !this.musicGain) return
    if (this.ctx.state === 'suspended') this.ctx.resume()
    if (track === this.currentTrack) return
    this.stopBgm()
    this.currentTrack = track
    if (track === 'silent' || !TRACKS[track]) return
    // Reset cursors
    this.leadIdx = 0; this.bassIdx = 0
    this.leadOffset = 0; this.bassOffset = 0
    this.nextNoteTime = this.ctx.currentTime + 0.1
    this.scheduler()
  }

  stopBgm() {
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer)
      this.schedulerTimer = null
    }
    this.currentTrack = 'silent'
  }

  private scheduler = () => {
    if (!this.ctx || this.currentTrack === 'silent') return
    const def = TRACKS[this.currentTrack]
    if (!def) return
    const secPerBeat = 60 / def.bpm
    // Schedule notes up to 100ms ahead
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      // Lead voice
      const leadNote = def.lead[this.leadIdx]
      if (leadNote && leadNote.freq > 0) {
        this.scheduleNote(leadNote.freq, this.nextNoteTime, leadNote.duration * secPerBeat * 0.9,
          def.leadWave, leadNote.velocity ?? 0.4, true)
      }
      // Bass voice — sync at beat boundary
      const bassNote = def.bass[this.bassIdx]
      if (bassNote && bassNote.freq > 0) {
        this.scheduleNote(bassNote.freq, this.nextNoteTime, leadNote.duration * secPerBeat * 0.95,
          def.bassWave, bassNote.velocity ?? 0.3, true)
      }
      this.nextNoteTime += leadNote.duration * secPerBeat
      this.bassOffset += leadNote.duration
      this.leadIdx = (this.leadIdx + 1) % def.lead.length
      // Advance bass cursor when current bass note duration covered
      if (this.bassOffset >= (bassNote?.duration || 1)) {
        this.bassOffset = 0
        this.bassIdx = (this.bassIdx + 1) % def.bass.length
      }
    }
    this.schedulerTimer = window.setTimeout(this.scheduler, 50)
  }

  private scheduleNote(
    freq: number, when: number, duration: number,
    wave: OscillatorType, velocity: number, music: boolean,
  ) {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = wave
    osc.frequency.value = freq
    // ADSR envelope (attack 5ms, decay 30ms, sustain 70%, release rest)
    const attackEnd = when + 0.005
    const decayEnd = when + 0.035
    const sustainEnd = when + duration - 0.05
    const noteEnd = when + duration
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(velocity, attackEnd)
    gain.gain.linearRampToValueAtTime(velocity * 0.7, decayEnd)
    gain.gain.setValueAtTime(velocity * 0.7, Math.max(decayEnd, sustainEnd))
    gain.gain.linearRampToValueAtTime(0.0001, noteEnd)
    osc.connect(gain)
    gain.connect(music ? this.musicGain : this.sfxGain)
    osc.start(when)
    osc.stop(noteEnd + 0.05)
  }

  // ─── SFX ─────────────────────────────────────────────────────
  sfxAttack() {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    // Sword swing — high pitched whoosh (sawtooth pitch sweep down)
    this.scheduleSfxSweep(noteFreq(C5), noteFreq(C4), t, 0.15, 'sawtooth', 0.25)
  }
  sfxHit() {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    // Enemy hit — crunchy noise burst (square wave high)
    this.scheduleSfxSweep(noteFreq(G4), noteFreq(D4), t, 0.12, 'square', 0.4)
  }
  sfxPickup() {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    // Star pickup — arpeggio rising (3 notes)
    this.scheduleNote(noteFreq(C5), t,        0.08, 'square', 0.4, false)
    this.scheduleNote(noteFreq(E5), t + 0.06, 0.08, 'square', 0.4, false)
    this.scheduleNote(noteFreq(G5), t + 0.12, 0.15, 'square', 0.45, false)
  }
  sfxLevelUp() {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    // Level up — triumphant 4-note arpeggio
    this.scheduleNote(noteFreq(C5), t,        0.1, 'square', 0.45, false)
    this.scheduleNote(noteFreq(E5), t + 0.08, 0.1, 'square', 0.45, false)
    this.scheduleNote(noteFreq(G5), t + 0.16, 0.1, 'square', 0.45, false)
    this.scheduleNote(noteFreq(C5 + 12), t + 0.24, 0.3, 'square', 0.5, false)
  }
  sfxDamage() {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    // Damage taken — descending growl
    this.scheduleSfxSweep(noteFreq(A4), noteFreq(A3), t, 0.25, 'sawtooth', 0.35)
  }
  sfxChapter() {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    // Chapter advance — mystical 3-note rise + sustain
    this.scheduleNote(noteFreq(A4), t,        0.2, 'triangle', 0.4, false)
    this.scheduleNote(noteFreq(C5), t + 0.18, 0.2, 'triangle', 0.4, false)
    this.scheduleNote(noteFreq(E5), t + 0.36, 0.5, 'triangle', 0.5, false)
  }
  sfxDialogue() {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    // Dialogue open — small blip
    this.scheduleNote(noteFreq(F5), t, 0.08, 'square', 0.25, false)
  }

  private scheduleSfxSweep(
    fromFreq: number, toFreq: number, when: number, duration: number,
    wave: OscillatorType, velocity: number,
  ) {
    if (!this.ctx || !this.sfxGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = wave
    osc.frequency.setValueAtTime(fromFreq, when)
    osc.frequency.exponentialRampToValueAtTime(toFreq, when + duration)
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(velocity, when + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration)
    osc.connect(gain)
    gain.connect(this.sfxGain)
    osc.start(when)
    osc.stop(when + duration + 0.05)
  }
}

// Singleton instance — share across page mount/unmount
export const pixelOdysseyAudio = new PixelOdysseyAudio()
