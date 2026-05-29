/**
 * EnglishLearn — màn hình chính học tiếng Anh (skill-tree kiểu Duolingo).
 * Route: /student/english
 *
 * Chọn lứa tuổi (band) → đường học uốn lượn gồm các "bong bóng" bài học
 * (khoá tuần tự, sao, crown). Header hiện XP · streak · tim. Có nút ôn flashcard.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Heart, Star, Lock, Check, Layers, BookOpen } from 'lucide-react'
import { CURRICULUM, curriculumStats, type Band, type EnLesson } from '@/lib/english/curriculum'
import { getProgress, lessonStars, isLessonDone, unitProgress } from '@/lib/english/progress'

export default function EnglishLearn() {
  const navigate = useNavigate()
  const [band, setBand] = useState<Band>('kindergarten')
  const progress = getProgress()
  const stats = useMemo(() => curriculumStats(), [])
  const curBand = CURRICULUM.find(b => b.id === band)!

  // Flatten lesson theo thứ tự band → khoá tuần tự
  const flatLessons = useMemo(() => {
    const arr: EnLesson[] = []
    curBand.units.forEach(u => arr.push(...u.lessons))
    return arr
  }, [curBand])

  function isUnlocked(lessonId: string): boolean {
    const i = flatLessons.findIndex(l => l.id === lessonId)
    if (i <= 0) return true
    return isLessonDone(flatLessons[i - 1].id)
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      {/* Header stats */}
      <div className="sticky top-0 z-10 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--ai-page-bg) 85%, transparent)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <BookOpen className="w-6 h-6" style={{ color: '#58cc02' }} /> Tiếng Anh
          </div>
          <div className="flex items-center gap-4 font-bold text-sm">
            <span className="inline-flex items-center gap-1" style={{ color: '#ff9600' }}>
              <Flame className="w-5 h-5" /> {progress.streakDays}
            </span>
            <span className="inline-flex items-center gap-1" style={{ color: '#1cb0f6' }}>
              ⭐ {progress.xp}
            </span>
            <span className="inline-flex items-center gap-1" style={{ color: '#ff4b4b' }}>
              <Heart className="w-5 h-5" fill="#ff4b4b" /> {progress.hearts}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Ôn flashcard */}
        <button onClick={() => navigate('/student/english/flashcards')}
          className="w-full mt-4 mb-5 px-5 py-4 rounded-2xl font-bold flex items-center justify-between"
          style={{ background: 'rgba(28,176,246,0.12)', border: '1px solid rgba(28,176,246,0.35)', color: '#1cb0f6' }}>
          <span className="inline-flex items-center gap-2"><Layers className="w-5 h-5" /> Ôn tập Flashcard (từ đến hạn)</span>
          <span className="opacity-70 text-sm">{stats.words} từ →</span>
        </button>

        {/* Band picker */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {CURRICULUM.map(b => {
            const active = b.id === band
            return (
              <button key={b.id} onClick={() => setBand(b.id)}
                className="shrink-0 px-4 py-2.5 rounded-2xl font-bold text-sm transition-colors"
                style={{
                  background: active ? `${b.color}22` : 'var(--ai-card-bg)',
                  border: `2px solid ${active ? b.color : 'var(--ai-card-border)'}`,
                  color: active ? b.color : 'hsl(var(--foreground)/0.7)',
                }}>
                {b.emoji} {b.labelVi}
                <span className="block text-[10px] font-medium opacity-70">{b.ageVi} · {b.cefr}</span>
              </button>
            )
          })}
        </div>

        {/* Units + lesson path */}
        {curBand.units.map(unit => {
          const lessonIds = unit.lessons.map(l => l.id)
          const up = unitProgress(lessonIds)
          return (
            <div key={unit.id} className="mt-7">
              {/* Unit banner */}
              <div className="rounded-2xl px-5 py-4 mb-5 flex items-center justify-between"
                style={{ background: unit.color, color: '#fff' }}>
                <div>
                  <div className="text-xs font-bold opacity-90 uppercase tracking-wide">{unit.cefr}</div>
                  <div className="text-lg font-extrabold">{unit.titleVi}</div>
                </div>
                <div className="flex items-center gap-1 font-bold">
                  {[1, 2, 3].map(c => (
                    <Star key={c} className="w-5 h-5" fill={c <= up.crown ? '#fff' : 'transparent'} style={{ color: '#fff' }} />
                  ))}
                </div>
              </div>

              {/* Path các bài */}
              <div className="flex flex-col items-center gap-5">
                {unit.lessons.map((lesson, li) => {
                  const unlocked = isUnlocked(lesson.id)
                  const done = isLessonDone(lesson.id)
                  const stars = lessonStars(lesson.id)
                  // lệch trái/phải tạo đường uốn lượn
                  const offset = li % 2 === 0 ? 0 : li % 4 === 1 ? 64 : -64
                  return (
                    <div key={lesson.id} className="flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                      <button
                        disabled={!unlocked}
                        onClick={() => navigate(`/student/english/${lesson.id}`)}
                        title={lesson.titleVi}
                        className="relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-transform active:scale-95"
                        style={{
                          background: done ? unit.color : unlocked ? 'var(--ai-card-bg)' : 'hsl(var(--foreground)/0.06)',
                          border: `4px solid ${done ? unit.color : unlocked ? unit.color : 'hsl(var(--foreground)/0.15)'}`,
                          boxShadow: unlocked ? `0 5px 0 ${done ? '#0006' : 'color-mix(in srgb, ' + unit.color + ' 55%, #000)'}` : 'none',
                          opacity: unlocked ? 1 : 0.55,
                          cursor: unlocked ? 'pointer' : 'not-allowed',
                        }}>
                        {!unlocked
                          ? <Lock className="w-7 h-7" style={{ color: 'hsl(var(--foreground)/0.4)' }} />
                          : done
                            ? <Check className="w-9 h-9 text-white" strokeWidth={3} />
                            : <span>{lesson.icon}</span>}
                      </button>
                      {/* Sao */}
                      {done && (
                        <div className="flex gap-0.5 mt-1.5">
                          {[1, 2, 3].map(s => (
                            <Star key={s} className="w-3.5 h-3.5"
                              fill={s <= stars ? '#ffc800' : 'transparent'}
                              style={{ color: s <= stars ? '#ffc800' : 'hsl(var(--foreground)/0.25)' }} />
                          ))}
                        </div>
                      )}
                      <div className="text-xs font-semibold mt-1 opacity-70 text-center max-w-[120px]">{lesson.titleVi}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <p className="text-center text-xs opacity-50 mt-10">
          {stats.bands} cấp · {stats.lessons} bài · {stats.words} từ vựng — nội dung sẽ tiếp tục mở rộng.
        </p>
      </div>
    </div>
  )
}
