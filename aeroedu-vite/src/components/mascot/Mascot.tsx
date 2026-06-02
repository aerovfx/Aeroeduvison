/**
 * Mascot "Aero" — mini drone-bot biểu cảm, gương mặt của trợ lý AeroEdu.
 *
 * P1: nổi góc dưới-trái, bồng bềnh + nháy mắt, bong bóng thoại, chào theo trang,
 *     click để mở trợ lý AI, thu nhỏ/ẩn (nhớ trong phiên).
 * P2: phản ứng sự kiện học tập qua MascotBus (đúng/sai/hoàn thành/lên cấp…) +
 *     confetti khi ăn mừng.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { mascot, type MascotEvent, type MascotPayload } from './MascotBus'
import { burstConfetti } from './confetti'

type Mood = 'idle' | 'happy' | 'sad' | 'think' | 'celebrate'
type Anim = '' | 'aero-jump' | 'aero-shake'

const REACTIONS: Record<MascotEvent, { mood: Mood; text: string; anim?: Anim; confetti?: boolean }> = {
  welcome: { mood: 'happy', text: 'Chào bạn! Mình là Aero 🛸' },
  correct: { mood: 'happy', text: 'Chuẩn luôn! ✨', anim: 'aero-jump' },
  wrong: { mood: 'sad', text: 'Thử lại nhé, gần đúng rồi!', anim: 'aero-shake' },
  lessonDone: { mood: 'celebrate', text: 'Hoàn thành bài học! 🎉', anim: 'aero-jump', confetti: true },
  levelUp: { mood: 'celebrate', text: 'Lên cấp rồi! 🚀', anim: 'aero-jump', confetti: true },
  hint: { mood: 'think', text: 'Gợi ý: đọc kỹ lại đề nhé 💡' },
  idle: { mood: 'idle', text: 'Cố lên, bạn làm tốt lắm!' },
  celebrate: { mood: 'celebrate', text: 'Tuyệt vời! 🎉', anim: 'aero-jump', confetti: true },
  sad: { mood: 'sad', text: 'Không sao, mình thử lại!', anim: 'aero-shake' },
  think: { mood: 'think', text: 'Để mình nghĩ xem… 🤔' },
}

const ROUTE_GREETING: { match: RegExp; text: string }[] = [
  { match: /\/student\/career/, text: 'Cùng khám phá nghề phù hợp nhé!' },
  { match: /\/(student|dashboard)\/(math|english|ai)/, text: 'Học vui nha, có mình ở đây!' },
  { match: /\/exam|\/quiz/, text: 'Bình tĩnh làm bài, bạn làm được!' },
  { match: /graph-lab|labtwin|aura/, text: 'Khám phá phòng lab thôi nào!' },
  { match: /\/(dashboard|student)$/, text: 'Chào mừng quay lại! 👋' },
]

const EYES: Record<Mood, { pupilY: number; sparkle: boolean; brow: 'none' | 'happy' | 'sad' }> = {
  idle: { pupilY: 0, sparkle: false, brow: 'none' },
  happy: { pupilY: -1.5, sparkle: false, brow: 'happy' },
  celebrate: { pupilY: -1.5, sparkle: true, brow: 'happy' },
  think: { pupilY: 1, sparkle: false, brow: 'none' },
  sad: { pupilY: 2, sparkle: false, brow: 'sad' },
}
const LED: Record<Mood, string> = { idle: '#22d3ee', happy: '#34d399', celebrate: '#fbbf24', think: '#a78bfa', sad: '#fb923c' }

// ── Phát giọng nói: ưu tiên Google Cloud TTS (/api/tts), fallback Web Speech ──
let _ttsAudio: HTMLAudioElement | null = null
let _ttsBlocked = false // /api/tts trả 501 → khỏi gọi lại, dùng luôn trình duyệt
async function googleTTS(text: string, lang: 'vi' | 'en'): Promise<boolean> {
  if (_ttsBlocked) return false
  try {
    const res = await fetch(`/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`)
    if (!res.ok) { if (res.status === 501) _ttsBlocked = true; return false }
    if (!(res.headers.get('content-type') || '').includes('audio')) return false
    const url = URL.createObjectURL(await res.blob())
    if (_ttsAudio) { try { _ttsAudio.pause() } catch { /* */ } }
    _ttsAudio = new Audio(url)
    _ttsAudio.onended = () => URL.revokeObjectURL(url)
    await _ttsAudio.play()
    return true
  } catch { return false }
}
function webSpeech(text: string, lang: 'vi' | 'en') {
  try {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'en' ? 'en-US' : 'vi-VN'
    u.rate = 1.05; u.pitch = 1.25
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}
async function speakOut(text: string) {
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang') === 'en') ? 'en' : 'vi'
  const clean = text.replace(/[^\p{L}\p{N} .,!?…]/gu, '').trim()
  if (!clean) return
  const ok = await googleTTS(clean, lang)
  if (!ok) webSpeech(clean, lang)
}

export default function Mascot() {
  const [pathname, setPathname] = useState(typeof window !== 'undefined' ? window.location.pathname : '')
  const [mood, setMood] = useState<Mood>('idle')
  const [bubble, setBubble] = useState<string | null>(null)
  const [anim, setAnim] = useState<Anim>('')
  const [blink, setBlink] = useState(false)
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('aero_hidden') === '1')
  const [pos, setPos] = useState<{ dx: number; dy: number }>(() => {
    try { return JSON.parse(localStorage.getItem('aero_pos') || '') || { dx: 0, dy: 0 } } catch { return { dx: 0, dy: 0 } }
  })
  const [voice, setVoice] = useState(() => localStorage.getItem('aero_voice') === '1')
  const drag = useRef<{ x0: number; y0: number; dx0: number; dy0: number; moved: boolean } | null>(null)
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivity = useRef(Date.now())

  const say = useCallback((text: string, ms = 4200) => {
    setBubble(text)
    lastActivity.current = Date.now()
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    bubbleTimer.current = setTimeout(() => setBubble(null), ms)
    // Giọng nói (tuỳ chọn): Google TTS → fallback giọng trình duyệt
    if (voice) speakOut(text)
  }, [voice])

  const react = useCallback((event: MascotEvent, payload: MascotPayload = {}) => {
    const r = REACTIONS[event]
    setMood(r.mood)
    say(payload.text || r.text, payload.durationMs || 4200)
    if (r.anim) {
      setAnim(r.anim)
      if (animTimer.current) clearTimeout(animTimer.current)
      animTimer.current = setTimeout(() => setAnim(''), 750)
    }
    if (r.confetti) burstConfetti(0.12, 0.82)
    // về idle sau vài giây
    setTimeout(() => setMood((m) => (m === r.mood ? 'idle' : m)), 4500)
  }, [say])

  // Lắng nghe sự kiện học tập
  useEffect(() => mascot.on(react), [react])

  // Nháy mắt định kỳ
  useEffect(() => {
    const id = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 130) }, 3200 + Math.random() * 1500)
    return () => clearInterval(id)
  }, [])

  // Chào lần đầu
  useEffect(() => {
    const h = new Date().getHours()
    const hi = h < 11 ? 'Chào buổi sáng! ☀️' : h < 18 ? 'Chào buổi chiều! 🛸' : 'Chào buổi tối! 🌙'
    setMood('happy')
    say(hi, 4000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Theo dõi điều hướng (không cần Router context)
  useEffect(() => {
    const check = () => setPathname(window.location.pathname)
    const id = setInterval(check, 1200)
    window.addEventListener('popstate', check)
    return () => { clearInterval(id); window.removeEventListener('popstate', check) }
  }, [])

  // Chào theo trang
  useEffect(() => {
    const g = ROUTE_GREETING.find((r) => r.match.test(pathname))
    if (g) { lastActivity.current = Date.now(); say(g.text, 3500) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Động viên khi rảnh (chỉ trang học tập)
  useEffect(() => {
    const id = setInterval(() => {
      const learning = /\/(student|dashboard|exam|quiz|labs)/.test(window.location.pathname)
      if (learning && Date.now() - lastActivity.current > 70000) react('idle')
    }, 30000)
    return () => clearInterval(id)
  }, [react])

  const openAssistant = () => {
    say('Mình mở trợ lý AI cho bạn nhé! 💬', 2500)
    window.dispatchEvent(new CustomEvent('aero:open-assistant'))
  }
  // Kéo-thả để di chuyển; nếu không kéo (chỉ chạm) thì mở trợ lý
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x0: e.clientX, y0: e.clientY, dx0: pos.dx, dy0: pos.dy, moved: false }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const ndx = d.dx0 + (e.clientX - d.x0)
    const ndy = d.dy0 + (e.clientY - d.y0)
    if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) > 4) d.moved = true
    setPos({
      dx: Math.max(0, Math.min(window.innerWidth - 120, ndx)),
      dy: Math.max(-(window.innerHeight - 180), Math.min(20, ndy)),
    })
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved) { try { localStorage.setItem('aero_pos', JSON.stringify(pos)) } catch { /* */ } }
    else openAssistant()
  }
  const toggleVoice = (e: React.MouseEvent) => {
    e.stopPropagation()
    setVoice((v) => { const n = !v; localStorage.setItem('aero_voice', n ? '1' : '0'); return n })
  }
  const hide = (e: React.MouseEvent) => { e.stopPropagation(); setHidden(true); sessionStorage.setItem('aero_hidden', '1') }
  const show = () => { setHidden(false); sessionStorage.removeItem('aero_hidden'); say('Mình quay lại rồi! 🛸', 2500) }

  if (hidden) {
    return (
      <button onClick={show} title="Hiện mascot Aero" style={{
        position: 'fixed', bottom: 84, left: 14, zIndex: 45, width: 42, height: 42, borderRadius: '50%',
        border: '1px solid rgba(34,211,238,0.5)', background: 'rgba(8,30,38,0.85)', cursor: 'pointer', fontSize: 20,
      }}>🛸</button>
    )
  }

  const e = EYES[mood]
  return (
    <div style={{ position: 'fixed', bottom: 76, left: 14, zIndex: 45, pointerEvents: 'none', transform: `translate(${pos.dx}px, ${pos.dy}px)` }}>
      <style>{`
        @keyframes aero-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes aero-jump { 0%{transform:translateY(0)} 30%{transform:translateY(-18px) scale(1.05)} 60%{transform:translateY(2px)} 100%{transform:translateY(0)} }
        @keyframes aero-shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
        @keyframes aero-rotor { to{transform:rotate(360deg)} }
        @keyframes aero-pop { 0%{transform:scale(.6);opacity:0} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* Bong bóng thoại */}
      {bubble && (
        <div style={{
          position: 'absolute', bottom: 92, left: 0, maxWidth: 220, padding: '8px 12px',
          background: 'rgba(8,30,38,0.94)', color: '#e2faff', border: '1px solid rgba(34,211,238,0.45)',
          borderRadius: 14, fontSize: 13, lineHeight: 1.4, fontWeight: 600, pointerEvents: 'none',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)', animation: 'aero-pop .18s ease-out',
        }}>
          {bubble}
          <div style={{ position: 'absolute', bottom: -6, left: 24, width: 12, height: 12, background: 'rgba(8,30,38,0.94)', borderRight: '1px solid rgba(34,211,238,0.45)', borderBottom: '1px solid rgba(34,211,238,0.45)', transform: 'rotate(45deg)' }} />
        </div>
      )}

      {/* Mascot SVG — kéo để di chuyển, chạm để mở trợ lý */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ width: 84, height: 84, cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none', pointerEvents: 'auto', animation: anim ? `${anim} .7s ease` : 'aero-float 3s ease-in-out infinite' }}
      >
        <button onClick={toggleVoice} title="Bật/tắt giọng nói" style={{ position: 'absolute', top: -2, left: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(15,23,42,0.7)', color: voice ? '#22d3ee' : '#64748b', fontSize: 10, cursor: 'pointer', lineHeight: '16px', pointerEvents: 'auto' }}>{voice ? '🔊' : '🔈'}</button>
        <button onClick={hide} title="Ẩn" style={{ position: 'absolute', top: -2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', fontSize: 11, cursor: 'pointer', lineHeight: '16px', pointerEvents: 'auto' }}>×</button>
        <svg width="84" height="84" viewBox="0 0 100 100">
          {/* Cánh quạt (4 góc, quay) */}
          {([[20, 30], [80, 30], [20, 56], [80, 56]] as [number, number][]).map(([cx, cy], i) => (
            <g key={i} style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'aero-rotor .25s linear infinite' }}>
              <ellipse cx={cx} cy={cy} rx="14" ry="4" fill="#22d3ee" opacity="0.35" />
            </g>
          ))}
          {/* Tay đỡ động cơ */}
          <line x1="30" y1="44" x2="20" y2="33" stroke="#155e63" strokeWidth="3" />
          <line x1="70" y1="44" x2="80" y2="33" stroke="#155e63" strokeWidth="3" />
          <line x1="30" y1="50" x2="20" y2="56" stroke="#155e63" strokeWidth="3" />
          <line x1="70" y1="50" x2="80" y2="56" stroke="#155e63" strokeWidth="3" />
          {/* Thân */}
          <ellipse cx="50" cy="50" rx="24" ry="20" fill="#0e7490" stroke="#22d3ee" strokeWidth="2.5" />
          <ellipse cx="50" cy="46" rx="19" ry="14" fill="#0b1620" />
          {/* Anten + đèn nháy */}
          <line x1="50" y1="30" x2="50" y2="22" stroke="#22d3ee" strokeWidth="2" />
          <circle cx="50" cy="20" r="3" fill={LED[mood]} />
          {/* Mắt */}
          {blink ? (
            <>
              <line x1="38" y1="46" x2="46" y2="46" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="54" y1="46" x2="62" y2="46" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="42" cy="46" r="5.5" fill="#e2faff" />
              <circle cx="58" cy="46" r="5.5" fill="#e2faff" />
              <circle cx={42} cy={46 + e.pupilY} r="2.6" fill="#0b1620" />
              <circle cx={58} cy={46 + e.pupilY} r="2.6" fill="#0b1620" />
              {e.sparkle && <><circle cx="44" cy="44" r="1.1" fill="#fff" /><circle cx="60" cy="44" r="1.1" fill="#fff" /></>}
              {e.brow === 'happy' && <><path d="M37 41 q5 -3 10 0" stroke="#7dd3fc" strokeWidth="1.6" fill="none" /><path d="M53 41 q5 -3 10 0" stroke="#7dd3fc" strokeWidth="1.6" fill="none" /></>}
              {e.brow === 'sad' && <><path d="M37 40 q5 2 10 0" stroke="#fb923c" strokeWidth="1.6" fill="none" /><path d="M53 40 q5 2 10 0" stroke="#fb923c" strokeWidth="1.6" fill="none" /></>}
            </>
          )}
          {/* Miệng */}
          {mood === 'sad'
            ? <path d="M44 58 q6 -4 12 0" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeLinecap="round" />
            : <path d="M44 56 q6 5 12 0" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeLinecap="round" />}
          {/* Đèn LED dưới thân (pin) */}
          <circle cx="42" cy="62" r="1.6" fill="#34d399" />
          <circle cx="50" cy="63" r="1.6" fill="#34d399" />
          <circle cx="58" cy="62" r="1.6" fill="#fbbf24" />
        </svg>
      </div>
    </div>
  )
}
