/**
 * SelfStudy — Tự ôn luyện cho HS với 3 chế độ: Flashcard / Quiz / Challenge
 *
 * User: "áp dụng hình thức tự ôn luyện đề của học sinh với flashcard,
 * quiz, thử thách"
 *
 * Flow:
 *   1. Pick subject + grade (header)
 *   2. Pick mode → load N questions từ /api/student/self-study/questions
 *   3. Mode-specific UI:
 *      - flashcard: lật thẻ + rate Easy/Hard/Forgot (SRS localStorage)
 *      - quiz:      10 MCQ, hiện đáp án sau khi submit từng câu
 *      - challenge: 15 MCQ + timer + score + submit cuối → leaderboard
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/services/api'
import {
  Sparkles, Layers, Zap, Trophy, ArrowLeft, ArrowRight, RotateCcw,
  CheckCircle2, XCircle, Clock, Loader2, Crown, Medal, Eye, EyeOff,
  X, Heart, Flag,
} from 'lucide-react'
import toast from 'react-hot-toast'

type Mode = 'flashcard' | 'quiz' | 'challenge'

interface SsQuestion {
  id: string
  order: number
  content: string
  options: string[]
  difficulty: string
  subject: string
  grade: string
  topic: string
  // Flashcard mode only
  answer?: string
  explanation?: string
}

// Subjects + grades — chia 3 cấp:
//   K-5 (Mẫu giáo + Tiểu học): subjects rộng + UI Duolingo XL
//   6-9 (Trung học cơ sở):     subjects khoa học + UI Duolingo
//   10-12 (THPT):              subjects chuyên + UI compact dark
const SUBJECTS_PRIMARY = [
  'Toán', 'Tiếng Việt', 'Tiếng Anh', 'TN&XH', 'Đạo đức', 'Mỹ thuật',
]
const SUBJECTS_MIDDLE = [
  'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học',
  'Lịch sử', 'Địa lí', 'Tin học', 'GDCD',
]
const SUBJECTS_HIGH = [
  'Vật lí', 'Toán', 'Hóa học', 'Sinh học', 'Ngữ văn',
  'Tiếng Anh', 'Lịch sử', 'Địa lí', 'GDKT&PL', 'Tin học',
]
const GRADES_PRIMARY = ['1', '2', '3', '4', '5']
const GRADES_MIDDLE  = ['6', '7', '8', '9']
const GRADES_HIGH    = ['10', '11', '12']
const GRADES = [...GRADES_PRIMARY, ...GRADES_MIDDLE, ...GRADES_HIGH]

// Detect cấp học từ grade
function getLevel(grade: string): 'primary' | 'middle' | 'high' {
  const g = parseInt(grade, 10)
  if (g <= 5) return 'primary'
  if (g <= 9) return 'middle'
  return 'high'
}
function getSubjectsForGrade(grade: string): string[] {
  const lv = getLevel(grade)
  if (lv === 'primary') return SUBJECTS_PRIMARY
  if (lv === 'middle')  return SUBJECTS_MIDDLE
  return SUBJECTS_HIGH
}

const MODE_META: Record<Mode, {
  label: string; emoji: string; color: string; bg: string; border: string;
  desc: string; defaultCount: number;
}> = {
  flashcard: {
    label: 'Flashcard', emoji: '🃏', color: '#a78bfa',
    bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)',
    desc: 'Lật thẻ ôn từng câu — có đáp án và giải thích. Tự đánh giá Dễ/Khó/Quên để SRS lên lịch ôn lại.',
    defaultCount: 20,
  },
  quiz: {
    label: 'Quiz nhanh', emoji: '⚡', color: '#22d3ee',
    bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.35)',
    desc: '10 câu trắc nghiệm random. Hiện đáp án ngay sau khi chọn — phản hồi tức thì để học nhanh.',
    defaultCount: 10,
  },
  challenge: {
    label: 'Thử thách', emoji: '🏆', color: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)',
    desc: '15 câu có giới hạn 15 phút. Tính điểm + xếp hạng tuần — đua với bạn bè!',
    defaultCount: 15,
  },
}

// ── SRS lite (localStorage) ───────────────────────────────────────
const SRS_KEY = 'aero_srs_v1'
type SrsRating = 'forgot' | 'hard' | 'easy'
function rateSrs(qid: string, r: SrsRating) {
  try {
    const raw = localStorage.getItem(SRS_KEY) || '{}'
    const data = JSON.parse(raw) as Record<string, { ef: number; reps: number; interval: number; dueAt: number }>
    const prev = data[qid] || { ef: 2.5, reps: 0, interval: 0, dueAt: Date.now() }
    let ef = prev.ef, reps = prev.reps, interval = prev.interval
    if (r === 'forgot') { reps = 0; interval = 1; ef = Math.max(1.3, ef - 0.2) }
    else if (r === 'hard') { reps += 1; interval = reps <= 1 ? 1 : Math.ceil(interval * 1.2); ef = Math.max(1.3, ef - 0.1) }
    else { reps += 1; interval = reps <= 1 ? 3 : Math.ceil(interval * ef); ef = Math.min(3.0, ef + 0.1) }
    data[qid] = { ef, reps, interval, dueAt: Date.now() + interval * 86400000 }
    localStorage.setItem(SRS_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export default function SelfStudyPage() {
  const [subject, setSubject] = useState(() => localStorage.getItem('ss:subject') || 'Toán')
  const [grade, setGrade] = useState(() => localStorage.getItem('ss:grade') || '3')
  const [mode, setMode] = useState<Mode | null>(null)

  useEffect(() => { localStorage.setItem('ss:subject', subject) }, [subject])
  useEffect(() => { localStorage.setItem('ss:grade', grade) }, [grade])

  // Auto-switch subject nếu chọn grade khác level mà subject hiện tại không tồn tại
  const availableSubjects = getSubjectsForGrade(grade)
  useEffect(() => {
    if (!availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0])
    }
  }, [grade, availableSubjects, subject])

  const level = getLevel(grade)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-cyan-50/40 dark:from-slate-950 dark:via-purple-950/30 dark:to-cyan-950/30">
      {/* Header */}
      <div className="px-4 md:px-8 py-5 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
              Tự ôn luyện
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
              FREE
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            3 chế độ: Flashcard · Quiz nhanh · Thử thách — câu hỏi từ Ngân hàng đề
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Subject + grade picker — grade-aware */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Môn học · {level === 'primary' ? 'Tiểu học' : level === 'middle' ? 'THCS' : 'THPT'}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {availableSubjects.map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    subject === s
                      ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                      : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-purple-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Khối lớp
            </label>
            {/* 3 nhóm: Tiểu học · THCS · THPT */}
            <div className="space-y-1.5">
              {([
                { label: 'Tiểu học', grades: GRADES_PRIMARY, active: 'bg-rose-500 border-rose-500',  hover: 'hover:border-rose-300' },
                { label: 'THCS',     grades: GRADES_MIDDLE,  active: 'bg-amber-500 border-amber-500', hover: 'hover:border-amber-300' },
                { label: 'THPT',     grades: GRADES_HIGH,    active: 'bg-cyan-500 border-cyan-500',  hover: 'hover:border-cyan-300' },
              ] as const).map(group => (
                <div key={group.label} className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 w-16">
                    {group.label}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {group.grades.map(g => (
                      <button key={g} onClick={() => setGrade(g)}
                        className={`px-3 py-1 rounded-lg text-sm font-bold border transition ${
                          grade === g
                            ? `${group.active} text-white shadow-md`
                            : `bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 ${group.hover}`
                        }`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mode session OR mode picker */}
        {mode ? (
          <ModeSession
            mode={mode}
            subject={subject}
            grade={grade}
            onExit={() => setMode(null)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {(['flashcard', 'quiz', 'challenge'] as Mode[]).map(m => {
              const meta = MODE_META[m]
              return (
                <button key={m} onClick={() => setMode(m)}
                  className="text-left p-5 rounded-xl border-2 transition hover:scale-[1.02] hover:shadow-lg"
                  style={{ background: meta.bg, borderColor: meta.border }}>
                  <div className="text-4xl mb-2">{meta.emoji}</div>
                  <h3 className="text-lg font-bold mb-1.5" style={{ color: meta.color }}>
                    {meta.label}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {meta.desc}
                  </p>
                  <div className="mt-3 pt-2 border-t border-current/20 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase" style={{ color: meta.color }}>
                      {meta.defaultCount} câu
                    </span>
                    <span className="text-xs font-bold flex items-center gap-1" style={{ color: meta.color }}>
                      Bắt đầu <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Challenge leaderboard — chỉ hiện khi KHÔNG đang trong session */}
        {!mode && (
          <ChallengeLeaderboard subject={subject} grade={grade} />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// ModeSession — wrapper load câu hỏi + render UI theo mode
// ──────────────────────────────────────────────────────────────────
function ModeSession({ mode, subject, grade, onExit }: {
  mode: Mode; subject: string; grade: string; onExit: () => void;
}) {
  const meta = MODE_META[mode]
  const [questions, setQuestions] = useState<SsQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    api.get<{ items: SsQuestion[] }>(`/student/self-study/questions?subject=${encodeURIComponent(subject)}&grade=${grade}&mode=${mode}&count=${meta.defaultCount}`)
      .then(r => setQuestions(r.data.items || []))
      .catch((e) => {
        toast.error(e?.response?.data?.message || 'Không tải được câu hỏi')
        setQuestions([])
      })
      .finally(() => setLoading(false))
  }, [mode, subject, grade, meta.defaultCount, reloadKey])

  if (loading) {
    return (
      <div className="rounded-xl p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: meta.color }} />
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="rounded-xl p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center">
        <div className="text-5xl mb-2">📚</div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          Chưa có câu hỏi cho {subject} Lớp {grade}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Vui lòng chọn môn/lớp khác hoặc liên hệ GV để bổ sung Ngân hàng câu hỏi
        </p>
        <button onClick={onExit}
          className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white text-sm font-bold hover:bg-slate-300">
          ← Quay lại
        </button>
      </div>
    )
  }

  if (mode === 'flashcard') {
    return <FlashcardMode questions={questions} subject={subject} grade={grade} onExit={onExit} onRestart={() => setReloadKey(k => k + 1)} />
  }
  if (mode === 'quiz') {
    return <QuizMode questions={questions} subject={subject} grade={grade} onExit={onExit} onRestart={() => setReloadKey(k => k + 1)} />
  }
  return <ChallengeMode questions={questions} subject={subject} grade={grade} onExit={onExit} onRestart={() => setReloadKey(k => k + 1)} />
}

// ──────────────────────────────────────────────────────────────────
// FlashcardMode — lật thẻ + SRS rating
// ──────────────────────────────────────────────────────────────────
function FlashcardMode({ questions, onExit, onRestart }: {
  questions: SsQuestion[]; subject: string; grade: string; onExit: () => void; onRestart: () => void;
}) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState<Record<string, SrsRating>>({})
  const q = questions[idx]

  const rate = (r: SrsRating) => {
    rateSrs(q.id, r)
    setReviewed(prev => ({ ...prev, [q.id]: r }))
    setTimeout(() => {
      if (idx < questions.length - 1) { setIdx(idx + 1); setFlipped(false) }
    }, 250)
  }

  const done = Object.keys(reviewed).length === questions.length

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={onExit}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm flex items-center gap-1.5 hover:bg-slate-100">
          <ArrowLeft className="w-3.5 h-3.5" /> Thoát
        </button>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
          🃏 {idx + 1} / {questions.length} · Đã ôn: {Object.keys(reviewed).length}
        </div>
        <button onClick={onRestart}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm flex items-center gap-1.5 hover:bg-slate-100">
          <RotateCcw className="w-3.5 h-3.5" /> Bộ mới
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-400 transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="rounded-xl bg-white dark:bg-slate-900 border-2 border-purple-300 dark:border-purple-500/40 p-6 md:p-10 min-h-[280px] cursor-pointer shadow-lg flex flex-col"
      >
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
            {q.difficulty}
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            {flipped ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {flipped ? 'Đáp án' : 'Bấm để xem đáp án'}
          </span>
        </div>

        {/* Front: câu hỏi + options */}
        <div className="flex-1">
          <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white leading-relaxed mb-4">
            {q.content}
          </p>
          {q.options.length > 0 && (
            <div className="space-y-1.5">
              {q.options.map((opt, i) => (
                <div key={i}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    flipped && (opt === q.answer || String.fromCharCode(65 + i) === q.answer)
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}>
                  <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {flipped && (opt === q.answer || String.fromCharCode(65 + i) === q.answer) && (
                    <CheckCircle2 className="inline w-3.5 h-3.5 ml-2 text-emerald-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Back: giải thích */}
          {flipped && q.explanation && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
              <p className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">💡 Giải thích</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* SRS rating buttons */}
      {flipped && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => rate('forgot')}
            className="py-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm">
            😵 Quên (1 ngày)
          </button>
          <button onClick={() => rate('hard')}
            className="py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
            😐 Khó (3 ngày)
          </button>
          <button onClick={() => rate('easy')}
            className="py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm">
            😎 Dễ (1 tuần)
          </button>
        </div>
      )}

      {/* Done banner */}
      {done && (
        <div className="rounded-xl p-5 bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-center">
          <Trophy className="w-10 h-10 mx-auto mb-2" />
          <h3 className="text-xl font-bold mb-1">🎉 Hoàn thành bộ thẻ!</h3>
          <p className="text-sm opacity-90 mb-3">Đã ôn {questions.length} thẻ · Tiếp tục với bộ mới?</p>
          <button onClick={onRestart}
            className="px-6 py-2 rounded-lg bg-white text-purple-600 font-bold hover:bg-purple-50">
            🃏 Bộ thẻ mới
          </button>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// QuizMode — 10 MCQ, hiện đáp án ngay sau khi chọn
// ──────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────
// QuizMode — Duolingo-style UI cho K-9, compact dark cho 10-12
//
// User: "với cấp mẫu giáo, tiểu học và trung học cơ sở. Các hình thức
// kiểm tra trắc nghiệm áp dụng giao diện như hình đính kèm, dễ đọc và
// chữ lớn nhé"
//
// Ref hình Duolingo:
//   - Top: X close + progress xanh + ❤ 5 hearts
//   - Badge "TỪ VỰNG MỚI" tím
//   - Câu hỏi text rất lớn bold
//   - 3 option cards: numbered (1/2/3) bên phải, light selected blue
//   - Đáp án đúng: card xanh lá + banner "Tuyệt vời!" + nút TIẾP TỤC
//   - Đáp án sai: card đỏ + banner "Sai rồi!" + "BÁO CÁO" + nút TIẾP TỤC
//   - Bottom: BỎ QUA + KIỂM TRA (xanh lá đậm)
// ──────────────────────────────────────────────────────────────────
function QuizMode({ questions, subject, grade, onExit, onRestart }: {
  questions: SsQuestion[]; subject: string; grade: string; onExit: () => void; onRestart: () => void;
}) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState<{ correct: boolean; expected: string } | null>(null)
  const [hearts, setHearts] = useState(5)
  const [results, setResults] = useState<{ qid: string; correct: boolean }[]>([])
  const q = questions[idx]

  // Detect cấp học để render Duolingo-style vs compact
  const isKidsStyle = getLevel(grade) !== 'high'

  // Reset selection khi đổi câu
  useEffect(() => {
    setSelected(null)
    setChecked(null)
  }, [idx])

  // Auto-shortcuts: phím 1/2/3/4 chọn option, Enter để check/tiếp
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        const n = parseInt(e.key, 10) - 1
        if (n < q.options.length && !checked) setSelected(n)
      } else if (e.key === 'Enter') {
        if (checked) {
          if (idx < questions.length - 1) setIdx(idx + 1)
        } else if (selected !== null) {
          handleCheck()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, checked, idx, q.options.length])

  const handleCheck = async () => {
    if (selected === null || checked) return
    const pickedLetter = String.fromCharCode(65 + selected)
    try {
      const { data } = await api.post<{ breakdown: { qid: string; correct: boolean; expected: string }[] }>(
        '/student/self-study/submit',
        { mode: 'quiz', subject, grade, answers: [{ qid: q.id, picked: pickedLetter }], durationSec: 0 }
      )
      const item = data.breakdown[0]
      const correct = !!item?.correct
      setChecked({ correct, expected: item?.expected || '' })
      setResults(prev => [...prev, { qid: q.id, correct }])
      if (!correct) setHearts(h => Math.max(0, h - 1))
    } catch {
      setChecked({ correct: false, expected: '' })
    }
  }

  const handleSkip = () => {
    if (checked) {
      if (idx < questions.length - 1) setIdx(idx + 1)
      else onExit()
      return
    }
    setResults(prev => [...prev, { qid: q.id, correct: false }])
    setHearts(h => Math.max(0, h - 1))
    if (idx < questions.length - 1) setIdx(idx + 1)
    else onExit()
  }

  const handleContinue = () => {
    if (idx < questions.length - 1) setIdx(idx + 1)
    else onExit()
  }

  const correctCount = results.filter(r => r.correct).length
  const allDone = results.length === questions.length

  // ────────────────────────────────────────────────────────────────
  // DUOLINGO STYLE for K-9 (Mẫu giáo / Tiểu học / THCS)
  // ────────────────────────────────────────────────────────────────
  if (isKidsStyle) {
    return (
      <div className="fixed inset-0 z-40 bg-white dark:bg-slate-950 flex flex-col">
        {/* Top bar: X · progress · hearts */}
        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 md:gap-4 max-w-5xl w-full mx-auto">
          <button onClick={onExit}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          {/* Progress bar — chiều cao 16px, rounded-full, fill xanh lá */}
          <div className="flex-1 h-3 md:h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(idx / questions.length) * 100}%`,
                background: 'linear-gradient(180deg, #58cc02, #46a302)',
                boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)',
              }}
            />
          </div>
          {/* Hearts */}
          <div className="flex items-center gap-1 text-base md:text-xl font-black">
            <Heart className="w-5 h-5 md:w-6 md:h-6 text-rose-500 fill-rose-500" strokeWidth={2.5} />
            <span className="text-rose-500">{hearts}</span>
          </div>
        </div>

        {/* Main content — vertically centered */}
        <div className="flex-1 flex flex-col px-4 md:px-6 max-w-5xl w-full mx-auto overflow-y-auto pb-32">
          {/* Badge "TỪ VỰNG MỚI" / "TRẮC NGHIỆM" */}
          <div className="flex items-center justify-center gap-2 mt-4 md:mt-8 mb-4 md:mb-6">
            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
              <span className="text-purple-500 text-base">●</span>
            </div>
            <span className="text-xs md:text-sm font-black uppercase tracking-[0.15em] text-purple-600 dark:text-purple-400">
              Trắc nghiệm
            </span>
          </div>

          {/* Question — big bold */}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-800 dark:text-white text-center leading-tight max-w-3xl mx-auto mb-6 md:mb-10"
            style={{ fontFamily: 'system-ui, -apple-system, "DIN Round Pro", "Nunito", sans-serif' }}>
            {q.content}
          </h2>

          {/* Options — 3 cards */}
          <div className={`grid gap-3 md:gap-4 mx-auto w-full ${
            q.options.length === 2 ? 'grid-cols-2 max-w-2xl' :
            q.options.length === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-3xl' :
            'grid-cols-2 max-w-2xl'
          }`}>
            {q.options.map((opt, i) => {
              const isSelected = selected === i
              const letter = String.fromCharCode(65 + i)
              const isCorrectOpt = checked && (checked.expected === letter || checked.expected === opt)
              const isWrongPick = checked && isSelected && !checked.correct

              // Card state styling
              let bgColor = 'bg-white dark:bg-slate-900'
              let borderColor = 'border-slate-200 dark:border-slate-700'
              let textColor = 'text-slate-700 dark:text-slate-200'
              let numBg = 'border-slate-300 dark:border-slate-600 text-slate-400'
              let bottomShadow = '0 4px 0 rgb(226 232 240)'

              if (checked) {
                if (isCorrectOpt) {
                  bgColor = 'bg-green-100 dark:bg-green-500/20'
                  borderColor = 'border-green-400 dark:border-green-500'
                  textColor = 'text-green-700 dark:text-green-300 font-bold'
                  numBg = 'border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10'
                  bottomShadow = '0 4px 0 rgb(34 197 94)'
                } else if (isWrongPick) {
                  bgColor = 'bg-rose-100 dark:bg-rose-500/20'
                  borderColor = 'border-rose-400 dark:border-rose-500'
                  textColor = 'text-rose-700 dark:text-rose-300'
                  numBg = 'border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-500/10'
                  bottomShadow = '0 4px 0 rgb(244 63 94)'
                }
              } else if (isSelected) {
                bgColor = 'bg-sky-50 dark:bg-sky-500/15'
                borderColor = 'border-sky-400 dark:border-sky-500'
                textColor = 'text-sky-700 dark:text-sky-200 font-bold'
                numBg = 'border-sky-500 text-sky-600 bg-sky-100 dark:bg-sky-500/20'
                bottomShadow = '0 4px 0 rgb(56 189 248)'
              }

              return (
                <button
                  key={i}
                  onClick={() => !checked && setSelected(i)}
                  disabled={!!checked}
                  className={`relative rounded-2xl border-2 ${bgColor} ${borderColor} ${textColor} p-4 md:p-6 flex flex-col items-center justify-between gap-3 md:gap-4 transition-all hover:scale-[1.02] active:translate-y-0.5 disabled:cursor-default disabled:hover:scale-100 min-h-[120px] md:min-h-[160px]`}
                  style={{ boxShadow: bottomShadow }}
                >
                  {/* Big emoji placeholder cho Tiểu học (TODO: image từ DB) */}
                  {getLevel(grade) === 'primary' && (
                    <div className="text-5xl md:text-7xl">
                      {i === 0 ? '🅰️' : i === 1 ? '🅱️' : i === 2 ? '🆎' : '🅾️'}
                    </div>
                  )}

                  {/* Option text — KIDS large */}
                  <span className="text-base md:text-xl font-bold leading-snug text-center flex-1 flex items-center">
                    {opt}
                  </span>

                  {/* Số thứ tự góc phải */}
                  <span className={`absolute bottom-2 right-2 w-6 h-6 md:w-7 md:h-7 rounded-md border-2 ${numBg} flex items-center justify-center text-xs md:text-sm font-bold`}>
                    {i + 1}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Bottom result banner + buttons */}
        <div
          className={`fixed bottom-0 left-0 right-0 ${
            checked
              ? checked.correct
                ? 'bg-green-100 dark:bg-green-500/20 border-t-2 border-green-200 dark:border-green-500/30'
                : 'bg-rose-100 dark:bg-rose-500/20 border-t-2 border-rose-200 dark:border-rose-500/30'
              : 'bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800'
          } transition-colors`}
        >
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
            {checked ? (
              <>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full ${
                    checked.correct ? 'bg-white dark:bg-green-500/30' : 'bg-white dark:bg-rose-500/30'
                  } flex items-center justify-center`}>
                    {checked.correct ? (
                      <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-green-500" strokeWidth={3} />
                    ) : (
                      <X className="w-7 h-7 md:w-8 md:h-8 text-rose-500" strokeWidth={3} />
                    )}
                  </div>
                  <div>
                    <div className={`text-lg md:text-2xl font-black ${
                      checked.correct ? 'text-green-700 dark:text-green-300' : 'text-rose-700 dark:text-rose-300'
                    }`}>
                      {checked.correct ? 'Tuyệt vời!' : 'Sai rồi'}
                    </div>
                    {!checked.correct && checked.expected && (
                      <div className={`text-xs md:text-sm font-bold mt-0.5 ${
                        checked.correct ? 'text-green-700/80 dark:text-green-300/80' : 'text-rose-700/80 dark:text-rose-300/80'
                      }`}>
                        Đáp án đúng: <strong>{checked.expected}</strong>
                      </div>
                    )}
                    <button className={`text-[11px] md:text-xs font-bold uppercase mt-0.5 tracking-wider opacity-70 hover:opacity-100 flex items-center gap-1 ${
                      checked.correct ? 'text-green-700 dark:text-green-300' : 'text-rose-700 dark:text-rose-300'
                    }`}>
                      <Flag className="w-3 h-3" /> Báo cáo
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleContinue}
                  className={`px-6 md:px-10 py-3 md:py-4 rounded-2xl text-base md:text-lg font-black uppercase tracking-wider text-white transition-transform active:translate-y-0.5 ${
                    checked.correct ? 'bg-green-500 hover:bg-green-600' : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                  style={{
                    boxShadow: checked.correct ? '0 4px 0 rgb(22 163 74)' : '0 4px 0 rgb(225 29 72)',
                  }}
                >
                  Tiếp tục
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSkip}
                  className="px-4 md:px-6 py-2.5 md:py-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm md:text-base font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  style={{ boxShadow: '0 3px 0 rgb(203 213 225)' }}
                >
                  Bỏ qua
                </button>
                <button
                  onClick={handleCheck}
                  disabled={selected === null}
                  className="px-6 md:px-10 py-3 md:py-4 rounded-2xl bg-green-500 hover:bg-green-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white text-base md:text-lg font-black uppercase tracking-wider transition active:translate-y-0.5 disabled:cursor-not-allowed"
                  style={{
                    boxShadow: selected === null ? 'none' : '0 4px 0 rgb(22 163 74)',
                  }}
                >
                  Kiểm tra
                </button>
              </>
            )}
          </div>
        </div>

        {/* Done banner — full screen */}
        {allDone && (
          <div className="fixed inset-0 z-50 bg-gradient-to-br from-green-500 to-emerald-600 flex flex-col items-center justify-center text-white p-6">
            <Trophy className="w-24 h-24 md:w-32 md:h-32 mb-4" strokeWidth={2.5} />
            <h2 className="text-4xl md:text-6xl font-black mb-2">🎉 Hoàn thành!</h2>
            <p className="text-xl md:text-2xl font-bold mb-1 opacity-90">
              {correctCount} / {questions.length} câu đúng
            </p>
            <p className="text-base md:text-lg opacity-80 mb-8">
              ({Math.round((correctCount / questions.length) * 100)}%) — {subject} Lớp {grade}
            </p>
            <div className="flex gap-3">
              <button onClick={onRestart}
                className="px-6 py-3 rounded-2xl bg-white text-green-600 font-black uppercase tracking-wider text-sm md:text-base"
                style={{ boxShadow: '0 4px 0 rgba(255,255,255,0.4)' }}>
                Làm lại
              </button>
              <button onClick={onExit}
                className="px-6 py-3 rounded-2xl bg-white/20 backdrop-blur border-2 border-white/30 text-white font-black uppercase tracking-wider text-sm md:text-base">
                Hoàn tất
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────
  // COMPACT STYLE for THPT (Lớp 10-12) — giữ nguyên design cũ
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onExit}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm flex items-center gap-1.5 hover:bg-slate-100">
          <ArrowLeft className="w-3.5 h-3.5" /> Thoát
        </button>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
          ⚡ {idx + 1} / {questions.length} · Đúng: {correctCount}/{results.length}
        </div>
        <button onClick={onRestart}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm flex items-center gap-1.5 hover:bg-slate-100">
          <RotateCcw className="w-3.5 h-3.5" /> Mới
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 md:p-6 shadow-md">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold">
            Câu {idx + 1} · {q.difficulty}
          </span>
        </div>
        <p className="text-base md:text-lg font-bold text-slate-800 dark:text-white leading-relaxed mb-4">
          {q.content}
        </p>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i)
            const isSelected = selected === i
            const isCorrectOpt = checked && (checked.expected === letter || checked.expected === opt)
            const isWrong = checked && isSelected && !checked.correct
            return (
              <button key={i} onClick={() => !checked && setSelected(i)} disabled={!!checked}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm transition flex items-center gap-2 ${
                  !checked
                    ? isSelected
                      ? 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-400 text-cyan-700 dark:text-cyan-200'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 text-slate-700 dark:text-slate-200'
                    : isCorrectOpt
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold'
                      : isWrong
                        ? 'bg-rose-50 dark:bg-rose-500/20 border-rose-400 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                }`}>
                <span className="font-bold">{letter}.</span>
                <span className="flex-1">{opt}</span>
                {checked && isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {checked && isWrong && <XCircle className="w-4 h-4 text-rose-500" />}
              </button>
            )
          })}
        </div>
        {checked && q.explanation && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
            <p className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">💡 Giải thích</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => idx > 0 && setIdx(idx - 1)} disabled={idx === 0}
          className="px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30 text-sm font-bold flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Trước
        </button>
        {!checked ? (
          <button onClick={handleCheck} disabled={selected === null}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-40 text-sm font-bold flex items-center gap-1.5">
            Kiểm tra
          </button>
        ) : idx < questions.length - 1 ? (
          <button onClick={handleContinue}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold flex items-center gap-1.5">
            Tiếp <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="px-5 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold">
            ✓ Hoàn thành — {correctCount}/{questions.length} ({Math.round(correctCount / questions.length * 100)}%)
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// ChallengeMode — 15 MCQ + timer + submit cuối + leaderboard
// ──────────────────────────────────────────────────────────────────
function ChallengeMode({ questions, subject, grade, onExit, onRestart }: {
  questions: SsQuestion[]; subject: string; grade: string; onExit: () => void; onRestart: () => void;
}) {
  const TIME_LIMIT = 15 * 60 // 15 phút
  const [idx, setIdx] = useState(0)
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [startedAt] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const [result, setResult] = useState<{ correct: number; total: number; percentage: number; breakdown: { qid: string; correct: boolean; expected: string }[] } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const q = questions[idx]

  useEffect(() => {
    if (result) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [result])

  const elapsedSec = Math.floor((now - startedAt) / 1000)
  const remainingSec = Math.max(0, TIME_LIMIT - elapsedSec)
  const minutes = Math.floor(remainingSec / 60)
  const seconds = remainingSec % 60

  const submit = useCallback(async () => {
    if (submitting || result) return
    setSubmitting(true)
    try {
      const answers = Object.entries(picks).map(([qid, picked]) => ({ qid, picked }))
      const { data } = await api.post<{ correct: number; total: number; percentage: number; breakdown: { qid: string; correct: boolean; expected: string }[]; message?: string }>(
        '/student/self-study/submit',
        { mode: 'challenge', subject, grade, answers, durationSec: elapsedSec }
      )
      setResult({ correct: data.correct, total: questions.length, percentage: data.percentage, breakdown: data.breakdown })
      toast.success(data.message || `🏆 ${data.correct}/${questions.length} câu đúng`)
    } catch (e) {
      toast.error('Lỗi submit — thử lại')
    } finally {
      setSubmitting(false)
    }
  }, [picks, subject, grade, questions.length, elapsedSec, submitting, result])

  // Auto-submit khi hết giờ
  useEffect(() => {
    if (remainingSec === 0 && !result && !submitting) submit()
  }, [remainingSec, result, submitting, submit])

  if (result) {
    const isPerfect = result.percentage === 100
    const isGood = result.percentage >= 80
    return (
      <div className="rounded-xl p-6 md:p-10 text-center"
        style={{
          background: isPerfect ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                   : isGood ? 'linear-gradient(135deg, #22d3ee, #06b6d4)'
                   : 'linear-gradient(135deg, #64748b, #475569)',
          color: 'white',
        }}>
        {isPerfect ? <Crown className="w-16 h-16 mx-auto mb-3" />
         : isGood ? <Trophy className="w-16 h-16 mx-auto mb-3" />
         : <Medal className="w-16 h-16 mx-auto mb-3" />}
        <h2 className="text-3xl md:text-4xl font-black mb-2">
          {result.percentage}%
        </h2>
        <p className="text-lg font-bold mb-1">
          {result.correct} / {result.total} câu đúng
        </p>
        <p className="text-sm opacity-90 mb-5">
          ⏱ {Math.floor(elapsedSec / 60)}p {elapsedSec % 60}s · {subject} Lớp {grade}
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={onRestart}
            className="px-5 py-2 rounded-lg bg-white text-amber-600 font-bold hover:bg-amber-50 text-sm">
            🔄 Thử thách mới
          </button>
          <button onClick={onExit}
            className="px-5 py-2 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 text-sm border border-white/30">
            Xem leaderboard
          </button>
        </div>
      </div>
    )
  }

  const isTimeUrgent = remainingSec < 60
  const isTimeWarn = remainingSec < 180

  return (
    <div className="space-y-3">
      {/* Top bar with timer */}
      <div className="flex items-center justify-between">
        <button onClick={onExit}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm flex items-center gap-1.5 hover:bg-slate-100">
          <ArrowLeft className="w-3.5 h-3.5" /> Thoát
        </button>
        <div className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm flex items-center gap-1.5 ${
          isTimeUrgent ? 'bg-rose-500 text-white animate-pulse'
                       : isTimeWarn ? 'bg-amber-500 text-white'
                       : 'bg-emerald-500 text-white'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
          🏆 {idx + 1} / {questions.length}
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 p-5 md:p-6 shadow-md">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold">
            Câu {idx + 1} · {q.difficulty}
          </span>
          <span className="text-slate-400">
            Đã chọn: {Object.keys(picks).length}/{questions.length}
          </span>
        </div>
        <p className="text-base md:text-lg font-bold text-slate-800 dark:text-white leading-relaxed mb-4">
          {q.content}
        </p>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i)
            const isPicked = picks[q.id] === letter
            return (
              <button key={i}
                onClick={() => setPicks(p => ({ ...p, [q.id]: letter }))}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm flex items-center gap-2 ${
                  isPicked
                    ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-300 font-bold'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-amber-300 text-slate-700 dark:text-slate-200'
                }`}>
                <span className="font-bold">{letter}.</span>
                <span className="flex-1">{opt}</span>
                {isPicked && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Nav + submit */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => idx > 0 && setIdx(idx - 1)} disabled={idx === 0}
          className="px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30 text-sm font-bold flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Trước
        </button>
        {idx < questions.length - 1 ? (
          <button onClick={() => setIdx(idx + 1)}
            className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-1.5">
            Câu tiếp <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={submit} disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white text-sm font-black flex items-center justify-center gap-1.5 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            Nộp bài — {Object.keys(picks).length}/{questions.length}
          </button>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// ChallengeLeaderboard — Top HS tuần cho Challenge mode
// ──────────────────────────────────────────────────────────────────
interface LbEntry {
  rank: number; userId: string; name: string; avatar: string | null;
  sessions: number; avgScore: number; bestScore: number; isMe: boolean;
}

function ChallengeLeaderboard({ subject, grade }: { subject: string; grade: string }) {
  const [items, setItems] = useState<LbEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<{ items: LbEntry[] }>(`/student/self-study/challenge-leaderboard?subject=${encodeURIComponent(subject)}&grade=${grade}&days=7`)
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [subject, grade])

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
          🏆 Bảng vàng Thử thách tuần — {subject} Lớp {grade}
        </h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
          Chưa có HS nào hoàn thành Thử thách tuần này — bạn là người đầu tiên?
        </p>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 10).map(e => (
            <div key={e.userId}
              className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                e.isMe ? 'bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30' : 'hover:bg-slate-50 dark:hover:bg-white/5'
              }`}>
              <span className="text-xs font-bold w-7 text-center text-slate-600 dark:text-slate-300">
                {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
              </span>
              {e.avatar ? (
                <img src={e.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-[10px] font-bold text-white">
                  {e.name[0]?.toUpperCase() || '?'}
                </div>
              )}
              <span className="text-xs flex-1 truncate text-slate-700 dark:text-slate-200">
                {e.name} {e.isMe && <span className="text-cyan-500 font-bold">(Bạn)</span>}
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {e.bestScore}%
              </span>
              <span className="text-[10px] text-slate-400 w-12 text-right">
                {e.sessions} lượt
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
