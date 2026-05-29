/**
 * MathJourney — màn chính module Toán: HÀNH TRÌNH TOÁN HỌC qua lịch sử.
 * Route: /student/math
 *
 * Dòng thời gian các trung tâm toán học cổ đại → hiện đại (Alexandria → … →
 * Viện IAS Princeton). Mỗi chặng 1 bài; khoá tuần tự; XP/streak/tim/sao.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Heart, Star, Lock, Check, Compass, Play } from 'lucide-react'
import { JOURNEY, mathStats, allLessonsInOrder } from '@/lib/math/curriculum'
import { getProgress, lessonStars, isLessonDone } from '@/lib/math/progress'
import MusicToggle from '@/components/common/MusicToggle'

export default function MathJourney() {
  const navigate = useNavigate()
  const progress = getProgress()
  const stats = useMemo(() => mathStats(), [])
  const flat = useMemo(() => allLessonsInOrder(), [])
  const doneCount = flat.filter(l => isLessonDone(l.id)).length
  const travelledPct = Math.round((doneCount / flat.length) * 100)

  const isUnlocked = (lessonId: string) => {
    const i = flat.findIndex(l => l.id === lessonId)
    return i <= 0 || isLessonDone(flat[i - 1].id)
  }

  return (
    <div className="min-h-screen pb-16 relative" style={{ background: 'radial-gradient(ellipse at top,#2a230f,#15131f 55%,#0a0a12)', color: '#f5f0e6' }}>
      <MusicToggle top={68} right={14} zIndex={40} />

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur" style={{ background: 'rgba(10,10,18,0.7)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-lg">
              <Compass className="w-6 h-6" style={{ color: '#d4a017' }} /> Hành trình Toán học
            </div>
            <div className="flex items-center gap-3 font-bold text-sm">
              <span className="inline-flex items-center gap-1" style={{ color: '#ff9600' }}><Flame className="w-5 h-5" /> {progress.streakDays}</span>
              <span className="inline-flex items-center gap-1" style={{ color: '#d4a017' }}>⭐ {progress.xp}</span>
              <span className="inline-flex items-center gap-1" style={{ color: '#ff4b4b' }}><Heart className="w-5 h-5" fill="#ff4b4b" /> {progress.hearts}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: `${travelledPct}%`, background: 'linear-gradient(90deg,#d4a017,#7c5cff)' }} />
            </div>
            <span className="opacity-80 whitespace-nowrap">🧭 {travelledPct}% · {doneCount}/{flat.length} chặng</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <p className="text-center text-sm opacity-70 mt-4 mb-6">
          Du hành theo dòng lịch sử: từ thư viện <b>Alexandria</b> cổ đại đến thánh địa toán học hiện đại — <b>Viện IAS Princeton</b>.
        </p>

        {JOURNEY.map((stop, si) => {
          const lesson = stop.lessons[0]
          const unlocked = isUnlocked(lesson.id)
          const done = isLessonDone(lesson.id)
          const stars = lessonStars(lesson.id)
          return (
            <div key={stop.id} className="relative">
              {si < JOURNEY.length - 1 && (
                <div className="absolute left-[30px] top-16 bottom-0 w-0.5"
                  style={{ background: 'repeating-linear-gradient(to bottom, rgba(212,160,23,0.4) 0 6px, transparent 6px 14px)' }} />
              )}
              <div className="flex items-start gap-4 pt-6">
                {/* Node */}
                <button disabled={!unlocked} onClick={() => navigate(`/student/math/${lesson.id}`)}
                  className="relative shrink-0 w-[60px] h-[60px] rounded-full flex items-center justify-center text-2xl transition-transform active:scale-95"
                  style={{
                    background: done ? stop.color : unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `3px solid ${done || unlocked ? stop.color : 'rgba(255,255,255,0.15)'}`,
                    boxShadow: unlocked ? `0 0 16px ${stop.color}66` : 'none',
                    opacity: unlocked ? 1 : 0.5, cursor: unlocked ? 'pointer' : 'not-allowed',
                  }}>
                  {!unlocked ? <Lock className="w-5 h-5 opacity-60" /> : done ? <Check className="w-7 h-7 text-white" strokeWidth={3} /> : <span>{stop.emoji}</span>}
                </button>
                {/* Card */}
                <div className="flex-1 min-w-0 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${stop.color}44`, opacity: unlocked ? 1 : 0.55 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold">{stop.placeVi}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${stop.color}22`, color: stop.color }}>{stop.era}</span>
                  </div>
                  <div className="text-xs opacity-60 mt-0.5">📚 {stop.figure}</div>
                  <div className="text-sm opacity-80 mt-1.5">{stop.blurbVi}</div>
                  {done && (
                    <div className="flex gap-0.5 mt-2">
                      {[1, 2, 3].map(s => <Star key={s} className="w-4 h-4" fill={s <= stars ? '#ffc800' : 'transparent'} style={{ color: s <= stars ? '#ffc800' : 'rgba(255,255,255,0.25)' }} />)}
                    </div>
                  )}
                  {unlocked && (
                    <button onClick={() => navigate(`/student/math/${lesson.id}`)}
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
          🏛️ {stats.stops} chặng lịch sử · {stats.lessons} bài · {stats.questions} câu hỏi — từ cổ đại đến hiện đại.
        </p>
      </div>
    </div>
  )
}
