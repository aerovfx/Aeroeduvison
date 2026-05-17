/**
 * Teacher Sprint Dashboard — /teacher/sprint
 *
 * Centralized weekly action dashboard cho GV với:
 *   - 📉 Class trending weak topics (lớp đang yếu — cần dạy lại)
 *   - 💡 Content gaps (chapters chưa có LP — cần tạo bài)
 *   - 🆘 Students cần hỗ trợ (mastery thấp, ít engage)
 *   - 🛣 HS tự khảo sát (paths HS vừa tạo)
 *
 * Data từ /api/reco/feed?audience=teacher với grouping client-side.
 * Mobile-friendly cho GV review trên điện thoại.
 */
import { useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingDown, Lightbulb, AlertCircle, Footprints, RefreshCw, Loader2,
  ChevronRight, ArrowLeft, Sparkles, Users, Target, CheckCircle2,
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

const SECTIONS: Section[] = [
  {
    id: 'class-weak',
    title: 'Lớp đang yếu',
    icon: TrendingDown,
    accent: '#f43f5e',
    description: 'Topics mà nhiều HS trong nhóm bạn dạy có mastery <50% — ưu tiên dạy lại',
    itemTypes: ['class_trending_weak'],
  },
  {
    id: 'content-gap',
    title: 'Cần tạo bài',
    icon: Lightbulb,
    accent: '#fbbf24',
    description: 'Chapters chưa có lộ trình nào — HS có thể cần content mới',
    itemTypes: ['content_gap'],
  },
  {
    id: 'students-help',
    title: 'HS cần hỗ trợ',
    icon: AlertCircle,
    accent: '#f43f5e',
    description: 'Học sinh có nhiều điểm yếu — cân nhắc trao đổi 1-1',
    itemTypes: ['student_needs_help'],
  },
  {
    id: 'student-paths',
    title: 'HS tự khảo sát',
    icon: Footprints,
    accent: '#fbbf24',
    description: 'Lộ trình tự sinh từ Knowledge Graph của HS gần đây',
    itemTypes: ['student_self_path'],
  },
]

export default function TeacherSprintPage() {
  usePageTitle('Sprint dashboard GV')
  const navigate = useNavigate()
  /** Items GV đã "Đã xử lý" trong session này (filter khỏi view + log signal) */
  const [resolved, setResolved] = useState<Set<string>>(new Set())

  const { data: feed, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reco-feed-teacher-sprint'],
    queryFn: () => rs.getFeed('teacher', 30),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  const handleResolve = useCallback((item: RsFeedItem, e: React.MouseEvent) => {
    e.stopPropagation()
    rs.track({
      action: 'not_interested',
      targetType: item.type,
      targetId: item.id,
      metadata: { source: 'teacher-sprint', reason: 'resolved' },
    })
    setResolved(s => new Set([...s, `${item.type}::${item.id}`]))
    toast.success('Đã đánh dấu xử lý xong', { duration: 1500 })
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, RsFeedItem[]> = {}
    for (const sec of SECTIONS) map[sec.id] = []
    if (!feed) return map
    for (const item of feed.items) {
      const key = `${item.type}::${item.id}`
      if (resolved.has(key)) continue
      for (const sec of SECTIONS) {
        if (sec.itemTypes.includes(item.type)) {
          map[sec.id].push(item)
          break
        }
      }
    }
    return map
  }, [feed, resolved])

  const totalItems = (feed?.items ?? []).filter(
    it => !resolved.has(`${it.type}::${it.id}`)
  ).length
  const resolvedCount = resolved.size

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      {/* Header */}
      <header
        className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <Link to="/teacher/dashboard" className="text-zinc-400 hover:text-zinc-100 p-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">Sprint Dashboard</h1>
            <p className="text-[10px] text-zinc-500 leading-tight">
              {totalItems} item cần xử lý
              {resolvedCount > 0 && (
                <span className="text-emerald-400"> · ✓ {resolvedCount} đã xong</span>
              )}
              {' '}· cá nhân hoá theo lớp bạn dạy
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
        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-sm text-zinc-500 mt-3">Đang phân tích lớp bạn dạy…</p>
          </div>
        )}

        {!isLoading && totalItems === 0 && resolvedCount > 0 && (
          /* Celebratory state: đã xử lý hết tuần này */
          <div className="text-center py-12 px-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent border border-emerald-500/40">
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <p className="text-base font-bold text-emerald-300 mb-1">
              Đã xử lý hết Sprint tuần này!
            </p>
            <p className="text-xs text-zinc-400 mb-5">
              GV vừa hoàn thành {resolvedCount} hành động cho lớp đang dạy.
              Tốc độ tuyệt vời 🚀
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg bg-emerald-500/30 text-emerald-100 border border-emerald-400/50 text-sm font-bold"
              >
                <RefreshCw className="inline w-3.5 h-3.5 mr-1" /> Làm mới feed
              </button>
              <button
                onClick={() => navigate('/teacher/dashboard')}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 text-sm font-bold"
              >
                Về Dashboard
              </button>
            </div>
          </div>
        )}

        {!isLoading && totalItems === 0 && resolvedCount === 0 && (
          <div className="text-center py-16 px-4">
            <Sparkles className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-semibold mb-1">Chưa có item nào</p>
            <p className="text-xs text-zinc-500 mb-6">
              Sau khi HS bắt đầu làm bài + tự tạo lộ trình, hệ thống sẽ phân tích lớp và gợi ý hành động.
            </p>
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 text-sm font-bold"
            >
              Về Dashboard chính
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
                <section key={sec.id} id={sec.id} className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden"
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
                              metadata: { source: 'teacher-sprint' },
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
                            {/* Meta badges */}
                            {item.meta && (
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                {item.meta.studentCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                                    <Users className="w-3 h-3" /> {item.meta.studentCount} HS
                                  </span>
                                )}
                                {item.meta.weakCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-400">
                                    <Target className="w-3 h-3" /> {item.meta.weakCount} yếu
                                  </span>
                                )}
                                {item.meta.avgScore !== undefined && (
                                  <span className="text-[10px] text-amber-400 font-mono">
                                    TB {item.meta.avgScore}%
                                  </span>
                                )}
                              </div>
                            )}
                            {/* CTA */}
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2"
                              style={{ color: meta.accent }}>
                              {item.cta || 'Xem chi tiết'} →
                            </span>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <button
                              onClick={(e) => handleResolve(item, e)}
                              title="Đã xử lý — ẩn item này"
                              aria-label="Đánh dấu xử lý xong"
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
          </>
        )}
      </main>
    </div>
  )
}
