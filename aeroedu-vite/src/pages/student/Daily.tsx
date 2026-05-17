/**
 * Student Daily Plan — /student/daily
 *
 * Focused daily action page cho HS (mirror Sprint Dashboard của GV):
 *   - 🎯 Phải học hôm nay (kg_weak_topic — mastery thấp + prereqs OK)
 *   - 👩‍🏫 GV gửi bạn (teacher_learning_path + cold_start_teacher_lp)
 *   - 🔥 Đang hot (popular_exam + cold_start_popular)
 *   - ✨ Khám phá (curious_topic + embedding_match + cold_start_intro)
 *
 * Khác với /student/for-you (browse-style infinite feed), trang này
 * group items theo priority + focus vào "hôm nay phải làm gì". Mobile-
 * first, mark-as-done per item (track 'complete' nhẹ).
 *
 * Data từ /api/reco/feed?audience=student (existing endpoint, không
 * cần backend mới).
 */
import { useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Target, GraduationCap, Flame, Sparkles, RefreshCw, Loader2,
  ChevronRight, ArrowLeft, CheckCircle2, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { recommendationService as rs, getRsTypeMeta, type RsFeedItem } from '@/services/recommendation.service'
import usePageTitle from '@/hooks/usePageTitle'

interface Section {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  description: string
  itemTypes: string[]
}

/** Chào theo giờ trong ngày — UX cá nhân hoá nhẹ. */
function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 5)  return { text: 'Khuya rồi, ráng học chút nữa nha', emoji: '🌙' }
  if (h < 11) return { text: 'Chào buổi sáng — khởi đầu thật khoẻ', emoji: '🌅' }
  if (h < 14) return { text: 'Chào buổi trưa, nghỉ một chút nhé', emoji: '☀️' }
  if (h < 18) return { text: 'Chào buổi chiều, học tiếp nào', emoji: '🌤' }
  if (h < 22) return { text: 'Chào buổi tối, cố hoàn thành kế hoạch', emoji: '🌆' }
  return { text: 'Chào buổi tối, đừng thức quá khuya', emoji: '🌙' }
}

const SECTIONS: Section[] = [
  {
    id: 'must-learn',
    title: 'Phải học hôm nay',
    icon: Target,
    accent: '#f43f5e',
    description: 'Topic bạn chưa thông thạo — prerequisites đã sẵn sàng để học',
    itemTypes: ['kg_weak_topic'],
  },
  {
    id: 'teacher-sent',
    title: 'GV gửi bạn',
    icon: GraduationCap,
    accent: '#22d3ee',
    description: 'Lộ trình mới từ giáo viên đang dạy bạn',
    itemTypes: ['teacher_learning_path', 'cold_start_teacher_lp'],
  },
  {
    id: 'trending',
    title: 'Đang hot',
    icon: Flame,
    accent: '#fb923c',
    description: 'Đề thi và lộ trình nhiều bạn đang làm tuần này',
    itemTypes: ['popular_exam', 'cold_start_popular'],
  },
  {
    id: 'explore',
    title: 'Khám phá',
    icon: Sparkles,
    accent: '#a855f7',
    description: 'Topic mới chưa thử + AI khớp sở thích của bạn',
    itemTypes: ['curious_topic', 'embedding_match', 'cold_start_intro'],
  },
]

export default function StudentDailyPage() {
  usePageTitle('Kế hoạch hôm nay')
  const navigate = useNavigate()
  /** Items đã đánh dấu hoàn thành trong session này */
  const [done, setDone] = useState<Set<string>>(new Set())
  /** Greeting recompute mỗi mount (không cần realtime tick) */
  const greeting = useMemo(() => getGreeting(), [])

  const { data: feed, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reco-feed-student-daily'],
    queryFn: () => rs.getFeed('student', 24),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  const handleDone = useCallback((item: RsFeedItem, e: React.MouseEvent) => {
    e.stopPropagation()
    rs.track({
      action: 'complete',
      targetType: item.type,
      targetId: item.id,
      metadata: { source: 'student-daily', reason: 'manual_done' },
    })
    setDone(s => new Set([...s, `${item.type}::${item.id}`]))
    toast.success('Tuyệt vời! Đã đánh dấu hoàn thành 🎯', { duration: 1500 })
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, RsFeedItem[]> = {}
    for (const sec of SECTIONS) map[sec.id] = []
    if (!feed) return map
    for (const item of feed.items) {
      const key = `${item.type}::${item.id}`
      if (done.has(key)) continue
      for (const sec of SECTIONS) {
        if (sec.itemTypes.includes(item.type)) {
          map[sec.id].push(item)
          break
        }
      }
    }
    return map
  }, [feed, done])

  const totalItems = (feed?.items ?? []).filter(
    it => !done.has(`${it.type}::${it.id}`)
  ).length
  const doneCount = done.size
  const isColdStart = feed?.isColdStart

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      {/* Header */}
      <header
        className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <Link to="/student/dashboard" className="text-zinc-400 hover:text-zinc-100 p-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Clock className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">Kế hoạch hôm nay</h1>
            <p className="text-[10px] text-zinc-500 leading-tight">
              {totalItems} việc cần làm
              {doneCount > 0 && (
                <span className="text-emerald-400"> · ✓ {doneCount} đã xong</span>
              )}
              {' '}· cá nhân hoá cho bạn
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* Greeting theo giờ — UX cá nhân hoá nhẹ */}
        {!isLoading && totalItems > 0 && (
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium px-1">
            <span className="text-xl">{greeting.emoji}</span>
            <span>{greeting.text}.</span>
          </div>
        )}

        {/* Cold-start banner */}
        {!isLoading && isColdStart && totalItems > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/8 to-transparent border border-amber-500/40 p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🌱</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-200 mb-1">Chào mừng bạn đến với inphysic!</p>
                <p className="text-xs text-zinc-400 leading-snug">
                  Bạn còn mới — dưới đây là những gợi ý khởi đầu. Làm vài bài
                  để hệ thống hiểu sở thích và đưa gợi ý chính xác hơn.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-sm text-zinc-500 mt-3">Đang lên kế hoạch cho bạn…</p>
          </div>
        )}

        {!isLoading && totalItems === 0 && doneCount > 0 && (
          /* Celebratory: HS đã làm xong hết kế hoạch hôm nay */
          <div className="text-center py-12 px-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent border border-emerald-500/40">
            <div className="text-5xl mb-3 animate-bounce">🏆</div>
            <p className="text-base font-bold text-emerald-300 mb-1">
              Hoàn thành kế hoạch hôm nay!
            </p>
            <p className="text-xs text-zinc-400 mb-5">
              Bạn vừa làm xong {doneCount} việc. Quay lại mai để có gợi ý mới
              từ AI dựa trên tiến độ của bạn nhé ✨
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg bg-emerald-500/30 text-emerald-100 border border-emerald-400/50 text-sm font-bold"
              >
                <RefreshCw className="inline w-3.5 h-3.5 mr-1" /> Tải gợi ý mới
              </button>
              <button
                onClick={() => navigate('/student/for-you')}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 text-sm font-bold"
              >
                Khám phá thêm
              </button>
            </div>
          </div>
        )}

        {!isLoading && totalItems === 0 && doneCount === 0 && (
          <div className="text-center py-16 px-4">
            <Sparkles className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-semibold mb-1">Chưa có gợi ý nào</p>
            <p className="text-xs text-zinc-500 mb-6">
              Sau khi bạn làm vài bài hoặc tự khảo sát Knowledge Graph, hệ thống
              sẽ phân tích và đưa kế hoạch học cá nhân hoá.
            </p>
            <button
              onClick={() => navigate('/dashboard/knowledge-graph')}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 text-sm font-bold"
            >
              Khám phá Knowledge Graph
            </button>
          </div>
        )}

        {!isLoading && totalItems > 0 && (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SECTIONS.map(sec => {
                const count = grouped[sec.id].length
                const Icon = sec.icon
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="block p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: sec.accent }} />
                      <span className="text-xs font-bold text-zinc-200 truncate">{sec.title}</span>
                    </div>
                    <div className="text-2xl font-black" style={{ color: sec.accent }}>
                      {count}
                    </div>
                  </a>
                )
              })}
            </div>

            {/* Sections */}
            {SECTIONS.map(sec => {
              const items = grouped[sec.id]
              if (items.length === 0) return null
              const Icon = sec.icon
              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden"
                  style={{ borderLeftWidth: 3, borderLeftColor: sec.accent }}
                >
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                    <Icon className="w-5 h-5 shrink-0" style={{ color: sec.accent }} />
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-sm" style={{ color: sec.accent }}>
                        {sec.title}
                        <span className="ml-2 text-[10px] text-zinc-500 font-normal">{items.length}</span>
                      </h2>
                      <p className="text-[11px] text-zinc-500 leading-tight">{sec.description}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-800/60">
                    {items.map(item => {
                      const meta = getRsTypeMeta(item.type)
                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          onClick={() => {
                            rs.track({
                              action: 'click',
                              targetType: item.type,
                              targetId: item.id,
                              metadata: { source: 'student-daily' },
                            })
                            navigate(item.link)
                          }}
                          className="w-full text-left p-3 hover:bg-zinc-800/40 transition flex items-start gap-3 cursor-pointer"
                          role="button"
                          tabIndex={0}
                        >
                          <div
                            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                            style={{ background: `${meta.accent}22`, border: `1px solid ${meta.accent}55` }}
                          >
                            {meta.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-100 leading-tight line-clamp-1">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-zinc-400 leading-snug line-clamp-1 mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                            {item.description && (
                              <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2 mt-1">
                                {item.description}
                              </p>
                            )}
                            {/* Hydration signals (Phase 3) */}
                            {item.hydration && (
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                {item.hydration.currentMastery !== undefined && (
                                  <span className="text-[10px] text-amber-400 font-mono">
                                    Mastery {item.hydration.currentMastery}%
                                  </span>
                                )}
                                {item.hydration.estimatedMinutes && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                                    <Clock className="w-3 h-3" /> ~{item.hydration.estimatedMinutes}p
                                  </span>
                                )}
                                {item.hydration.popularity !== undefined && item.hydration.popularity > 0 && (
                                  <span className="text-[10px] text-orange-400">
                                    🔥 {item.hydration.popularity} bạn
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Reasons (Phase 3) */}
                            {item.reasons && item.reasons.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {item.reasons.slice(0, 2).map((r, i) => (
                                  <span
                                    key={i}
                                    className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* CTA */}
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2"
                              style={{ color: meta.accent }}
                            >
                              {item.cta || 'Học ngay'} →
                            </span>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <button
                              onClick={(e) => handleDone(item, e)}
                              title="Đánh dấu đã làm xong"
                              aria-label="Đánh dấu hoàn thành"
                              className="p-1.5 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-zinc-600 mt-0.5" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            {/* Link to full ForYou feed */}
            <div className="text-center pt-2">
              <Link
                to="/student/for-you"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                ✨ Xem feed gợi ý đầy đủ
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
