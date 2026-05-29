/**
 * PixelAgentsArena — "Pixel Agents: Đấu Trí" (Quiz Battle).
 * Route: /dashboard/games/pixel-agents
 *
 * Game trắc nghiệm phong cách arcade: đặc vụ pixel trả lời câu hỏi để hạ gục
 * bot địch. Câu hỏi lấy từ NGÂN HÀNG ĐỀ (/api/questions):
 *   - Học sinh: lọc theo trình độ (khối lớp) + môn chọn.
 *   - Giáo viên: câu hỏi theo MÔN HỌ DẠY (nghề của họ).
 * Có bộ câu hỏi dự phòng tích hợp nếu ngân hàng trống → game luôn chơi được.
 */
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { MathText } from '@/components/common/MathText'
import {
  Swords, Heart, Zap, RotateCcw, ArrowLeft, Bot, Crown, Loader2, Target,
} from 'lucide-react'

// ─── Môn học + giá trị DB ───────────────────────────────────────────────────
const SUBJECTS: { label: string; db: string; emoji: string }[] = [
  { label: 'Toán', db: 'Toán', emoji: '➗' },
  { label: 'Vật lí', db: 'Vật lí', emoji: '⚛️' },
  { label: 'Hoá học', db: 'Hoá học', emoji: '🧪' },
  { label: 'Sinh học', db: 'Sinh học', emoji: '🧬' },
  { label: 'Tiếng Anh', db: 'Tiếng Anh', emoji: '🔤' },
  { label: 'Ngữ văn', db: 'Ngữ văn', emoji: '📖' },
]
const DIFFS: { label: string; db: string; color: string }[] = [
  { label: 'Tất cả', db: '', color: '#7c5cff' },
  { label: 'Dễ', db: 'easy', color: '#22c55e' },
  { label: 'Vừa', db: 'medium', color: '#f5b301' },
  { label: 'Khó', db: 'hard', color: '#ff6b4a' },
]

interface GameQ { content: string; options: string[]; correctIdx: number }

const norm = (s: string) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

// Chuẩn hoá 1 câu hỏi từ ngân hàng → GameQ (chỉ nhận MCQ giải được đáp án).
function normalizeQ(raw: any): GameQ | null {
  const content = String(raw?.content || '').trim()
  let opts: string[] = Array.isArray(raw?.options)
    ? raw.options.map((o: any) => typeof o === 'string' ? o : (o?.text ?? o?.content ?? o?.label ?? '')).map((s: any) => String(s).trim()).filter(Boolean)
    : []
  if (!content || opts.length < 2) return null
  const ans = String(raw?.answer ?? raw?.correctAnswer ?? '').trim()
  let correctIdx = opts.findIndex(o => norm(o) === norm(ans))
  if (correctIdx < 0) {
    const up = ans.toUpperCase()
    if (/^[A-H]$/.test(up)) correctIdx = up.charCodeAt(0) - 65
    else if (/^\d+$/.test(ans)) correctIdx = parseInt(ans, 10) - 1
  }
  if (correctIdx < 0 || correctIdx >= opts.length) return null
  if (opts.length > 4) opts = opts.slice(0, 4)
  if (correctIdx >= opts.length) return null
  return { content, options: opts, correctIdx }
}

function shuffle<T>(a: T[]): T[] { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[x[i], x[j]] = [x[j], x[i]] } return x }

// Câu hỏi dự phòng (khi ngân hàng trống) — kiến thức phổ thông an toàn.
const FALLBACK: Record<string, GameQ[]> = {
  'Toán': [
    { content: '2 + 3 × 4 = ?', options: ['20', '14', '24', '9'], correctIdx: 1 },
    { content: 'Số nào là số nguyên tố?', options: ['9', '15', '17', '21'], correctIdx: 2 },
    { content: 'Diện tích hình vuông cạnh 5 là?', options: ['10', '20', '25', '15'], correctIdx: 2 },
  ],
  'Vật lí': [
    { content: 'Đơn vị của lực là gì?', options: ['Jun (J)', 'Niu-tơn (N)', 'Oát (W)', 'Pa-xcan (Pa)'], correctIdx: 1 },
    { content: 'Tốc độ ánh sáng trong chân không ≈ ?', options: ['3×10⁸ m/s', '3×10⁶ m/s', '340 m/s', '1500 m/s'], correctIdx: 0 },
  ],
  'Hoá học': [
    { content: 'Công thức hoá học của nước là?', options: ['CO₂', 'H₂O', 'O₂', 'NaCl'], correctIdx: 1 },
    { content: 'Khí nào chiếm nhiều nhất trong không khí?', options: ['Oxi', 'Cacbonic', 'Nitơ', 'Hidro'], correctIdx: 2 },
  ],
  'Tiếng Anh': [
    { content: '"Apple" nghĩa là gì?', options: ['Quả cam', 'Quả táo', 'Quả chuối', 'Quả nho'], correctIdx: 1 },
    { content: 'Past tense of "go"?', options: ['goed', 'gone', 'went', 'going'], correctIdx: 2 },
  ],
  '_': [
    { content: 'Thủ đô của Việt Nam là?', options: ['TP.HCM', 'Đà Nẵng', 'Hà Nội', 'Huế'], correctIdx: 2 },
    { content: '1 giờ có bao nhiêu phút?', options: ['100', '60', '24', '360'], correctIdx: 1 },
  ],
}

const MAX_HP = 3

export default function PixelAgentsArena() {
  const navigate = useNavigate()
  const me = useMemo(() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } }, [])
  const role = String(me.role || 'STUDENT').toUpperCase()
  const isTeacher = role === 'TEACHER' || role === 'ADMIN'
  const myGrade = me.grade || me.classGrade || ''
  const mySubject = me.subject || me.teachingSubject || ''

  const [phase, setPhase] = useState<'intro' | 'loading' | 'playing' | 'result'>('intro')
  const [subject, setSubject] = useState<string>(() => {
    if (isTeacher && mySubject) { const m = SUBJECTS.find(s => norm(s.db) === norm(mySubject)); if (m) return m.db }
    return SUBJECTS[0].db
  })
  const [diff, setDiff] = useState('')
  const [deck, setDeck] = useState<GameQ[]>([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [hp, setHp] = useState(MAX_HP)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [hit, setHit] = useState(false) // enemy shake

  // Âm phản hồi nhẹ
  const beep = useCallback((ok: boolean) => {
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination)
      o.type = ok ? 'triangle' : 'sawtooth'; o.frequency.value = ok ? 740 : 160
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.15, ac.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25); o.start(); o.stop(ac.currentTime + 0.26)
    } catch { /* ignore */ }
  }, [])

  async function start() {
    setPhase('loading')
    let qs: GameQ[] = []
    try {
      const params = new URLSearchParams({ subject, limit: '40' })
      if (diff) params.set('difficulty', diff)
      if (!isTeacher && myGrade) params.set('grade', String(myGrade))
      const { data } = await api.get(`/questions?${params.toString()}`)
      const list = data?.data?.questions || data?.questions || []
      qs = list.map(normalizeQ).filter(Boolean) as GameQ[]
      // Không đủ → nới lỏng (bỏ grade + difficulty)
      if (qs.length < 5) {
        const { data: d2 } = await api.get(`/questions?subject=${encodeURIComponent(subject)}&limit=40`)
        const l2 = d2?.data?.questions || d2?.questions || []
        qs = l2.map(normalizeQ).filter(Boolean) as GameQ[]
      }
    } catch { /* dùng fallback */ }
    if (qs.length < 5) qs = [...(FALLBACK[subject] || []), ...FALLBACK['_']]
    const finalDeck = shuffle(qs).slice(0, 10)
    setDeck(finalDeck)
    setIdx(0); setPicked(null); setHp(MAX_HP); setScore(0); setCombo(0); setMaxCombo(0); setCorrectCount(0)
    setPhase('playing')
  }

  function answer(i: number) {
    if (picked !== null) return
    setPicked(i)
    const q = deck[idx]
    const ok = i === q.correctIdx
    beep(ok)
    if (ok) {
      const c = combo + 1
      setCombo(c); setMaxCombo(m => Math.max(m, c))
      setScore(s => s + 100 * c)
      setCorrectCount(n => n + 1)
      setHit(true); setTimeout(() => setHit(false), 350)
    } else {
      setCombo(0)
      setHp(h => h - 1)
    }
  }

  function next() {
    const q = deck[idx]
    const wasWrong = picked !== null && picked !== q.correctIdx
    const newHp = hp
    if ((wasWrong && newHp <= 0) || idx + 1 >= deck.length) { setPhase('result'); return }
    setIdx(i => i + 1); setPicked(null)
  }

  // Auto end khi hết máu
  useEffect(() => { if (phase === 'playing' && hp <= 0 && picked !== null) { /* chờ bấm Tiếp */ } }, [hp, phase, picked])

  // ── INTRO ──────────────────────────────────────────────
  if (phase === 'intro' || phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-white relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at top,#2a1c5e,#0a0f24 60%,#05060f)' }}>
        <button onClick={() => navigate('/student/games')} className="absolute top-5 left-5 opacity-70 hover:opacity-100 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Games
        </button>
        <div className="text-6xl mb-3 animate-bounce">🕹️</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ background: 'linear-gradient(90deg,#7c5cff,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          PIXEL AGENTS · ĐẤU TRÍ
        </h1>
        <p className="opacity-70 mb-2 text-center max-w-md">Trả lời trắc nghiệm để hạ gục bot địch. Combo càng cao điểm càng lớn!</p>
        <p className="text-xs mb-6 px-3 py-1 rounded-full" style={{ background: 'rgba(124,92,255,0.18)', color: '#c4b5fd' }}>
          {isTeacher ? '👩‍🏫 Câu hỏi theo môn bạn dạy' : `🎓 Câu hỏi theo trình độ${myGrade ? ` lớp ${myGrade}` : ''}`}
        </p>

        <div className="w-full max-w-md space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Môn học</div>
            <div className="grid grid-cols-3 gap-2">
              {SUBJECTS.map(s => (
                <button key={s.db} onClick={() => setSubject(s.db)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: subject === s.db ? 'rgba(124,92,255,0.25)' : 'rgba(255,255,255,0.05)', border: `2px solid ${subject === s.db ? '#7c5cff' : 'transparent'}` }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Độ khó</div>
            <div className="grid grid-cols-4 gap-2">
              {DIFFS.map(d => (
                <button key={d.db} onClick={() => setDiff(d.db)}
                  className="py-2 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: diff === d.db ? `${d.color}33` : 'rgba(255,255,255,0.05)', border: `2px solid ${diff === d.db ? d.color : 'transparent'}`, color: diff === d.db ? d.color : '#fff' }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={start} disabled={phase === 'loading'}
            className="w-full py-4 rounded-2xl font-extrabold text-lg inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg,#7c5cff,#22d3ee)' }}>
            {phase === 'loading' ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang nạp câu hỏi…</> : <><Swords className="w-5 h-5" /> Bắt đầu trận đấu</>}
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────
  if (phase === 'result') {
    const total = deck.length
    const acc = total ? Math.round((correctCount / total) * 100) : 0
    const xp = correctCount * 10 + maxCombo * 5
    const win = hp > 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-white text-center"
        style={{ background: 'radial-gradient(ellipse at top,#2a1c5e,#0a0f24 60%,#05060f)' }}>
        <div className="text-6xl mb-3">{win ? '🏆' : '💥'}</div>
        <h2 className="text-3xl font-extrabold mb-1">{win ? 'Hạ gục bot địch!' : 'Hết máu rồi!'}</h2>
        <p className="opacity-70 mb-6">Đúng {correctCount}/{total} câu · Combo cao nhất x{maxCombo}</p>
        <div className="flex gap-3 mb-7">
          {[['Điểm', score, '#22d3ee'], ['Chính xác', `${acc}%`, '#22c55e'], ['XP', `+${xp}`, '#f5b301']].map(([l, v, c]) => (
            <div key={String(l)} className="px-5 py-4 rounded-2xl" style={{ background: `${c}1f`, border: `1px solid ${c}55` }}>
              <div className="text-2xl font-extrabold" style={{ color: c as string }}>{v}</div>
              <div className="text-xs opacity-70 mt-1">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setPhase('intro')} className="px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2" style={{ background: 'linear-gradient(90deg,#7c5cff,#22d3ee)' }}>
            <RotateCcw className="w-4 h-4" /> Chơi lại
          </button>
          <button onClick={() => navigate('/student/games')} className="px-5 py-3 rounded-xl font-bold border" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Về games</button>
        </div>
      </div>
    )
  }

  // ── PLAYING ────────────────────────────────────────────
  const q = deck[idx]
  const enemyHpPct = Math.max(0, Math.round(((deck.length - idx) / deck.length) * 100))
  return (
    <div className="min-h-screen flex flex-col text-white" style={{ background: 'radial-gradient(ellipse at top,#2a1c5e,#0a0f24 60%,#05060f)' }}>
      {/* HUD */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_HP }).map((_, i) => (
              <Heart key={i} className="w-6 h-6" fill={i < hp ? '#ff4b4b' : 'transparent'} style={{ color: i < hp ? '#ff4b4b' : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
          <div className="font-extrabold inline-flex items-center gap-1" style={{ color: '#22d3ee' }}>
            <Zap className="w-4 h-4" /> {score}
          </div>
          {combo > 1 && <div className="font-extrabold text-sm px-2 py-0.5 rounded-full animate-pulse" style={{ background: '#f5b30133', color: '#f5b301' }}>COMBO x{combo}</div>}
          <div className="text-sm opacity-70">Câu {idx + 1}/{deck.length}</div>
        </div>
        {/* Enemy */}
        <div className="flex flex-col items-center my-3">
          <div className={`text-6xl ${hit ? 'animate-ping' : ''}`} style={{ transition: 'transform .2s', transform: hit ? 'scale(1.2) rotate(-8deg)' : 'none' }}>🤖</div>
          <div className="w-48 h-2.5 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${enemyHpPct}%`, background: 'linear-gradient(90deg,#ff6b4a,#ff4b4b)' }} />
          </div>
          <div className="text-[10px] uppercase tracking-wide opacity-50 mt-1 inline-flex items-center gap-1"><Bot className="w-3 h-3" /> Bug Bot</div>
        </div>
      </div>

      {/* Câu hỏi */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pb-6">
        <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <MathText as="div" className="text-lg font-semibold leading-snug">{q.content}</MathText>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.options.map((opt, i) => {
            const isPicked = picked === i
            const isCorrect = i === q.correctIdx
            let bg = 'rgba(255,255,255,0.05)', border = 'rgba(255,255,255,0.12)', color = '#fff'
            if (picked !== null && isCorrect) { bg = 'rgba(34,197,94,0.18)'; border = '#22c55e'; color = '#86efac' }
            else if (isPicked && !isCorrect) { bg = 'rgba(255,75,75,0.15)'; border = '#ff4b4b'; color = '#fca5a5' }
            return (
              <button key={i} disabled={picked !== null} onClick={() => answer(i)}
                className="px-4 py-4 rounded-2xl text-left font-semibold transition-colors flex items-center gap-3"
                style={{ background: bg, border: `2px solid ${border}`, color }}>
                <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(124,92,255,0.25)', color: '#c4b5fd' }}>{String.fromCharCode(65 + i)}</span>
                <MathText as="span">{opt}</MathText>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer: feedback + next */}
      {picked !== null && (
        <div className="w-full" style={{ background: picked === q.correctIdx ? 'rgba(34,197,94,0.12)' : 'rgba(255,75,75,0.1)', borderTop: `2px solid ${picked === q.correctIdx ? '#22c55e' : '#ff4b4b'}` }}>
          <div className="max-w-2xl mx-auto w-full px-4 py-4 flex items-center justify-between gap-4">
            <div className="font-extrabold inline-flex items-center gap-2" style={{ color: picked === q.correctIdx ? '#22c55e' : '#ff4b4b' }}>
              {picked === q.correctIdx ? <><Target className="w-5 h-5" /> Trúng đích! +{100 * combo}</> : <>Trượt rồi 😵 — đáp án: {String.fromCharCode(65 + q.correctIdx)}</>}
            </div>
            <button onClick={next} className="px-6 py-3 rounded-2xl font-extrabold inline-flex items-center gap-2 shrink-0"
              style={{ background: picked === q.correctIdx ? 'linear-gradient(90deg,#7c5cff,#22d3ee)' : '#ff4b4b' }}>
              {idx + 1 >= deck.length || hp <= 0 ? <><Crown className="w-5 h-5" /> Kết thúc</> : <><Swords className="w-5 h-5" /> Tiếp</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
