/**
 * EnglishLearn — HÀNH TRÌNH VŨ TRỤ (Space Journey), màn chính học tiếng Anh.
 * Route: /student/english
 *
 * Lộ trình là bản đồ không gian: 🌍 Trái Đất → 🌕 Mặt Trăng → 🔴 Sao Hoả → …
 * → ⭐ Alpha Centauri → 🌌 Dải Ngân Hà. Mỗi hành tinh là 1 chặng, mỗi "nhiệm vụ"
 * là 1 bài học (lesson). Tên lửa 🚀 đánh dấu nhiệm vụ hiện tại. Khoá tuần tự.
 */
import { useMemo, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Heart, Star, Lock, Check, Layers, Rocket } from 'lucide-react'
import { getJourney, journeyStats, allLessonsInOrder } from '@/lib/english/curriculum'
import { getProgress, lessonStars, isLessonDone } from '@/lib/english/progress'
import { useEnglishContent } from '@/lib/english/contentApi'
import MusicToggle from '@/components/common/MusicToggle'

// Cảnh 3D R3F nặng (three) → lazy, chỉ tải khi vào trang. Có ErrorBoundary nội bộ.
const SpaceScene = lazy(() => import('@/components/english/SpaceScene'))

export default function EnglishLearn() {
  const navigate = useNavigate()
  const v = useEnglishContent() // nạp bản admin (nếu có) + re-render khi xong
  const progress = getProgress()
  const stats = useMemo(() => journeyStats(), [v])

  // Khoá tuần tự theo thứ tự hành trình
  const flat = useMemo(() => allLessonsInOrder(), [v])
  const doneCount = flat.filter(l => isLessonDone(l.id)).length
  const currentLessonId = flat.find(l => !isLessonDone(l.id))?.id ?? null
  const travelledPct = Math.round((doneCount / flat.length) * 100)

  const idxOf = (id: string) => flat.findIndex(l => l.id === id)
  const isUnlocked = (id: string) => {
    const i = idxOf(id)
    return i <= 0 || isLessonDone(flat[i - 1].id)
  }

  // Trường sao nền (cố định, nhẹ)
  const stars = useMemo(
    () => Array.from({ length: 46 }, () => ({
      top: Math.random() * 100, left: Math.random() * 100,
      size: Math.random() * 2 + 1, delay: Math.random() * 4,
    })), [],
  )

  return (
    <div className="min-h-screen relative overflow-hidden text-white"
      style={{ background: 'radial-gradient(ellipse at top, #1b2a5e 0%, #0a0f24 55%, #05060f 100%)' }}>
      {/* Nhạc nền (tái dùng track có sẵn) — nút bật/tắt nổi, ghi nhớ lựa chọn */}
      <MusicToggle top={68} right={14} zIndex={40} />
      {/* Starfield CSS (fallback nhẹ, luôn có) */}
      <div className="pointer-events-none absolute inset-0">
        {stars.map((s, i) => (
          <span key={i} className="absolute rounded-full bg-white en-twinkle"
            style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
        ))}
      </div>
      {/* Cảnh 3D vũ trụ (R3F) — phủ lên, tự ẩn nếu thiết bị không hỗ trợ WebGL */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Suspense fallback={null}><SpaceScene /></Suspense>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur" style={{ background: 'rgba(5,6,15,0.6)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-lg">
              <Rocket className="w-6 h-6" style={{ color: '#7fd8e8' }} /> Hành trình Vũ trụ
            </div>
            <div className="flex items-center gap-3 font-bold text-sm">
              <span className="inline-flex items-center gap-1" style={{ color: '#ff9600' }}><Flame className="w-5 h-5" /> {progress.streakDays}</span>
              <span className="inline-flex items-center gap-1" style={{ color: '#7fd8e8' }}>⭐ {progress.xp}</span>
              <span className="inline-flex items-center gap-1" style={{ color: '#ff4b4b' }}><Heart className="w-5 h-5" fill="#ff4b4b" /> {progress.hearts}</span>
            </div>
          </div>
          {/* Thanh tiến trình bay */}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: `${travelledPct}%`, background: 'linear-gradient(90deg,#7fd8e8,#a06bff)' }} />
            </div>
            <span className="opacity-80 whitespace-nowrap">🚀 {travelledPct}% · {doneCount}/{flat.length} nhiệm vụ</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pb-20">
        {/* Ôn flashcard */}
        <button onClick={() => navigate('/student/english/flashcards')}
          className="w-full mt-4 mb-6 px-5 py-4 rounded-2xl font-bold flex items-center justify-between"
          style={{ background: 'rgba(127,216,232,0.12)', border: '1px solid rgba(127,216,232,0.35)', color: '#7fd8e8' }}>
          <span className="inline-flex items-center gap-2"><Layers className="w-5 h-5" /> Ôn tập Flashcard (từ đến hạn)</span>
          <span className="opacity-70 text-sm">{stats.words} từ →</span>
        </button>

        {/* Các điểm đến */}
        {getJourney().map((dest, di) => {
          const destUnlocked = isUnlocked(dest.lessons[0].id)
          const allDone = dest.lessons.every(l => isLessonDone(l.id))
          return (
            <div key={dest.id} className="relative">
              {/* Đường bay nối xuống điểm kế */}
              {di < getJourney().length - 1 && (
                <div className="absolute left-[34px] top-16 bottom-0 w-0.5"
                  style={{ background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.35) 0 6px, transparent 6px 14px)' }} />
              )}

              {/* Planet header */}
              <div className="flex items-start gap-4 pt-6">
                <div className="relative shrink-0 w-[68px] h-[68px] rounded-full flex items-center justify-center text-4xl"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${dest.color}, #0008)`,
                    boxShadow: destUnlocked ? `0 0 22px ${dest.color}88` : 'none',
                    opacity: destUnlocked ? 1 : 0.4,
                    border: `2px solid ${destUnlocked ? dest.color : 'rgba(255,255,255,0.2)'}`,
                  }}>
                  {dest.emoji}
                  {allDone && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#58cc02' }}>
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-lg">{dest.nameVi}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${dest.color}22`, color: dest.color, border: `1px solid ${dest.color}55` }}>{dest.cefr}</span>
                  </div>
                  <div className="text-xs opacity-60">{dest.name} · {dest.distanceVi}</div>
                  <div className="text-sm opacity-80 mt-1">{dest.blurbVi}</div>
                </div>
              </div>

              {/* Nhiệm vụ (lessons) */}
              <div className="flex flex-col items-center gap-4 py-5 ml-2">
                {dest.lessons.map((lesson, li) => {
                  const unlocked = isUnlocked(lesson.id)
                  const done = isLessonDone(lesson.id)
                  const stars3 = lessonStars(lesson.id)
                  const isCurrent = lesson.id === currentLessonId
                  const offset = li % 2 === 0 ? -40 : 40
                  return (
                    <div key={lesson.id} className="flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                      {isCurrent && (
                        <div className="mb-1 px-3 py-1 rounded-full text-[11px] font-extrabold animate-bounce"
                          style={{ background: dest.color, color: '#04111f' }}>BẮT ĐẦU</div>
                      )}
                      <button disabled={!unlocked} title={lesson.titleVi}
                        onClick={() => navigate(`/student/english/${lesson.id}`)}
                        className="relative w-[68px] h-[68px] rounded-full flex items-center justify-center text-3xl transition-transform active:scale-95"
                        style={{
                          background: done ? dest.color : unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                          border: `4px solid ${done || unlocked ? dest.color : 'rgba(255,255,255,0.15)'}`,
                          boxShadow: isCurrent ? `0 0 0 6px ${dest.color}33, 0 6px 0 ${dest.color}88`
                            : unlocked ? `0 5px 0 ${dest.color}77` : 'none',
                          opacity: unlocked ? 1 : 0.5,
                          cursor: unlocked ? 'pointer' : 'not-allowed',
                        }}>
                        {!unlocked ? <Lock className="w-6 h-6 opacity-60" />
                          : done ? <Check className="w-8 h-8 text-white" strokeWidth={3} />
                          : isCurrent ? <Rocket className="w-8 h-8" style={{ color: dest.color }} />
                          : <span>{lesson.icon}</span>}
                      </button>
                      {done && (
                        <div className="flex gap-0.5 mt-1.5">
                          {[1, 2, 3].map(s => (
                            <Star key={s} className="w-3.5 h-3.5"
                              fill={s <= stars3 ? '#ffc800' : 'transparent'}
                              style={{ color: s <= stars3 ? '#ffc800' : 'rgba(255,255,255,0.25)' }} />
                          ))}
                        </div>
                      )}
                      <div className="text-xs font-semibold mt-1 opacity-75 text-center max-w-[130px]">{lesson.titleVi}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <p className="text-center text-xs opacity-50 mt-8">
          🛰️ {stats.destinations} điểm đến · {stats.lessons} nhiệm vụ · {stats.words} từ vựng — hành trình sẽ còn nối dài tới các thiên hà khác.
        </p>
      </div>

      <style>{`
        @keyframes enTwinkle { 0%,100%{opacity:.25} 50%{opacity:1} }
        .en-twinkle { animation: enTwinkle 3.5s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
