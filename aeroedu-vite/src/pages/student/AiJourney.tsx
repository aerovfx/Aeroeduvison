/**
 * AiJourney — màn chính module AI: HÀNH TRÌNH AI từ máy giải mã đến tương lai.
 * Route: /student/ai
 * Dòng thời gian: Bombe/Turing → IBM/Dartmouth → Deep Learning → CNN →
 * Transformer → LLM → Lượng tử → AGI. Mỗi chặng 1 bài; khoá tuần tự.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Heart, Star, Lock, Check, Cpu, Play, Layers } from 'lucide-react'
import { JOURNEY, aiStats, allLessonsInOrder } from '@/lib/ai/curriculum'
import { getProgress, lessonStars, isLessonDone } from '@/lib/ai/progress'
import MusicToggle from '@/components/common/MusicToggle'

export default function AiJourney() {
  const navigate = useNavigate()
  const progress = getProgress()
  const stats = useMemo(() => aiStats(), [])
  const flat = useMemo(() => allLessonsInOrder(), [])
  const doneCount = flat.filter(l => isLessonDone(l.id)).length
  const travelledPct = Math.round((doneCount / flat.length) * 100)

  const isUnlocked = (lessonId: string) => {
    const i = flat.findIndex(l => l.id === lessonId)
    return i <= 0 || isLessonDone(flat[i - 1].id)
  }

  return (
    <div className="min-h-screen pb-16 relative" style={{ background: 'radial-gradient(ellipse at top,#0b1e3a,#0a1228 55%,#070a14)', color: '#e8f0ff' }}>
      <MusicToggle top={68} right={14} zIndex={40} />

      <div className="sticky top-0 z-20 backdrop-blur" style={{ background: 'rgba(7,10,20,0.72)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-lg">
              <Cpu className="w-6 h-6" style={{ color: '#22d3ee' }} /> Hành trình AI
            </div>
            <div className="flex items-center gap-3 font-bold text-sm">
              <span className="inline-flex items-center gap-1" style={{ color: '#ff9600' }}><Flame className="w-5 h-5" /> {progress.streakDays}</span>
              <span className="inline-flex items-center gap-1" style={{ color: '#22d3ee' }}>⭐ {progress.xp}</span>
              <span className="inline-flex items-center gap-1" style={{ color: '#ff4b4b' }}><Heart className="w-5 h-5" fill="#ff4b4b" /> {progress.hearts}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: `${travelledPct}%`, background: 'linear-gradient(90deg,#22d3ee,#7c5cff)' }} />
            </div>
            <span className="opacity-80 whitespace-nowrap">🚀 {travelledPct}% · {doneCount}/{flat.length} chặng</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <p className="text-center text-sm opacity-75 mt-4 mb-4">
          Du hành theo dòng lịch sử công nghệ: từ máy giải mã <b>Enigma</b> của Turing → <b>IBM</b> → PC → siêu máy tính → <b>Deep Learning</b> → <b>LLM</b> → máy tính <b>lượng tử</b> → <b>AGI</b> tương lai.
        </p>

        <button onClick={() => navigate('/student/ai/flashcards')}
          className="w-full mb-6 px-5 py-4 rounded-2xl font-bold flex items-center justify-between"
          style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.4)', color: '#22d3ee' }}>
          <span className="inline-flex items-center gap-2"><Layers className="w-5 h-5" /> Ôn tập Flashcard (câu đến hạn)</span>
          <span className="opacity-70 text-sm">{stats.questions} câu →</span>
        </button>

        {JOURNEY.map((stop, si) => {
          const lesson = stop.lessons[0]
          const unlocked = isUnlocked(lesson.id)
          const done = isLessonDone(lesson.id)
          const stars = lessonStars(lesson.id)
          return (
            <div key={stop.id} className="relative">
              {si < JOURNEY.length - 1 && (
                <div className="absolute left-[30px] top-16 bottom-0 w-0.5"
                  style={{ background: 'repeating-linear-gradient(to bottom, rgba(34,211,238,0.4) 0 6px, transparent 6px 14px)' }} />
              )}
              <div className="flex items-start gap-4 pt-6">
                <button disabled={!unlocked} onClick={() => navigate(`/student/ai/${lesson.id}`)}
                  className="relative shrink-0 w-[60px] h-[60px] rounded-full flex items-center justify-center text-2xl transition-transform active:scale-95"
                  style={{
                    background: done ? stop.color : unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `3px solid ${done || unlocked ? stop.color : 'rgba(255,255,255,0.15)'}`,
                    boxShadow: unlocked ? `0 0 16px ${stop.color}66` : 'none',
                    opacity: unlocked ? 1 : 0.5, cursor: unlocked ? 'pointer' : 'not-allowed',
                  }}>
                  {!unlocked ? <Lock className="w-5 h-5 opacity-60" /> : done ? <Check className="w-7 h-7 text-white" strokeWidth={3} /> : <span>{stop.emoji}</span>}
                </button>
                <div className="flex-1 min-w-0 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${stop.color}44`, opacity: unlocked ? 1 : 0.55 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold">{stop.placeVi}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${stop.color}22`, color: stop.color }}>{stop.era}</span>
                    <span className="text-xs opacity-50">🕰️ {stop.year}</span>
                  </div>
                  <div className="text-xs opacity-60 mt-0.5">🎯 {stop.topicVi} · 📚 {stop.figure}</div>
                  <div className="text-sm opacity-80 mt-1.5">{stop.blurbVi}</div>
                  {done && (
                    <div className="flex gap-0.5 mt-2">
                      {[1, 2, 3].map(s => <Star key={s} className="w-4 h-4" fill={s <= stars ? '#ffc800' : 'transparent'} style={{ color: s <= stars ? '#ffc800' : 'rgba(255,255,255,0.25)' }} />)}
                    </div>
                  )}
                  {unlocked && (
                    <button onClick={() => navigate(`/student/ai/${lesson.id}`)}
                      className="mt-3 px-4 py-2 rounded-xl font-bold text-white text-sm inline-flex items-center gap-1.5"
                      style={{ background: done ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg,${stop.color},#7c5cff)` }}>
                      <Play className="w-4 h-4" /> {done ? 'Ôn lại' : 'Bắt đầu'} · {lesson.title}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <p className="text-center text-xs opacity-50 mt-10">
          🤖 {stats.stops} chặng · {stats.lessons} bài · {stats.questions} câu hỏi — từ máy giải mã đến trí tuệ tương lai.
        </p>
      </div>
    </div>
  )
}
