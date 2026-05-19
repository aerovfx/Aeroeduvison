/**
 * For You Feed — /student/for-you
 *
 * Mixed feed gợi ý cho HS dựa trên multi-source recommendation:
 *   - 🎯 Điểm yếu (KG mastery <50%) — học lại
 *   - 👩‍🏫 GV mới tạo (linked teachers) — lộ trình mới
 *   - 🔥 Nổi bật — exam được nhiều bạn làm
 *   - ✨ Khám phá (out-of-network) — chưa engage
 *
 * Mobile-first: tối ưu cho iPhone 14 Pro Max (430×932). Card vertical
 * stack, swipe-friendly, no horizontal scroll.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles, RefreshCw, Loader2, ChevronRight, ThumbsDown, ArrowRight,
  Compass, Target, Clock, Users, X, Activity, Send, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  recommendationService as rs,
  getRsTypeMeta,
  type RsFeedItem,
  type RsPredictions,
} from '@/services/recommendation.service'
import usePageTitle from '@/hooks/usePageTitle'
import OnboardingModal from '@/components/reco/OnboardingModal'

export default function ForYouPage() {
  usePageTitle('Gợi ý cho bạn')
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'feed' | 'activity'>('feed')
  const [showOnboarding, setShowOnboarding] = useState(false)

  const { data: feed, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reco-feed-student'],
    queryFn: () => rs.getFeed('student', 20),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // 5 phút
  })

  // RS-Phase 10: trigger onboarding modal nếu cold-start + chưa onboarded; cache prefs
  const [onboardingPrefs, setOnboardingPrefs] = useState<{ subject?: string | null } | null>(null)
  useEffect(() => {
    if (!feed?.isColdStart) return
    rs.getOnboardingPrefs().then(r => {
      const p = r.prefs
      setOnboardingPrefs(p)
      // Show modal nếu chưa có prefs HOẶC chưa skipped + chưa completed
      if (!p || (!p.skipped && !p.completedAt)) {
        setShowOnboarding(true)
      }
    }).catch(() => {})
  }, [feed?.isColdStart])
  const hasOnboardedSubject = !!onboardingPrefs?.subject

  const { data: history } = useQuery({
    queryKey: ['reco-history-student'],
    queryFn: () => rs.getHistory(80),
    enabled: tab === 'activity',
    staleTime: 30_000,
  })

  // Track view 1 lần khi feed load
  useEffect(() => {
    if (feed && feed.items.length > 0) {
      rs.track({
        action: 'view',
        targetType: 'reco_feed',
        targetId: 'student-for-you',
        metadata: { itemCount: feed.items.length, sources: feed.sources },
      })
    }
  }, [feed])

  const handleOpen = useCallback((item: RsFeedItem) => {
    rs.track({
      action: 'click',
      targetType: item.type,
      targetId: item.id,
      metadata: { source: item.source },
    })
    navigate(item.link)
  }, [navigate])

  const handleDismiss = useCallback((item: RsFeedItem) => {
    rs.track({
      action: 'not_interested',
      targetType: item.type,
      targetId: item.id,
    })
    setDismissed(s => new Set([...s, `${item.type}::${item.id}`]))
  }, [])

  const visibleItems = (feed?.items ?? []).filter(
    i => !dismissed.has(`${i.type}::${i.id}`)
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
      {/* RS-Phase 10: cold-start onboarding modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => { setShowOnboarding(false); refetch() }}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
      {/* Header — iOS safe-area aware (notch + dynamic island) */}
      <header
        className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <div className="px-4 py-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight truncate">Gợi ý cho bạn</h1>
            <p className="text-[10px] text-zinc-500 leading-tight">
              Cá nhân hoá từ điểm yếu, GV của bạn, và xu hướng
            </p>
          </div>
          <Link
            to="/student/daily"
            onClick={() => rs.track({
              action: 'click',
              targetType: 'daily_plan',
              targetId: 'student-daily',
              metadata: { source: 'for-you-header' },
            })}
            className="p-2 rounded-lg bg-amber-500/15 active:bg-amber-500/25 text-amber-300 border border-amber-500/30"
            aria-label="Mở Kế hoạch hôm nay"
            title="Chế độ tập trung — group theo việc cần làm"
          >
            <Calendar className="w-4 h-4" />
          </Link>
          <button
            onClick={async () => {
              const r = await rs.sendDigestMe()
              if (r.sent) {
                // RS-Phase 8 multi-channel: liệt kê channels delivered ok
                const ch = r.channels
                const dv = r.deliveries
                const okList: string[] = []
                if (dv?.inApp?.ok)    okList.push('🔔 bell')
                if (dv?.email?.ok)    okList.push('📧 email')
                if (dv?.telegram?.ok) okList.push('💬 telegram')
                if (okList.length > 0) {
                  toast.success(`Digest gửi xong (${r.itemsCount} mục): ${okList.join(', ')}`, { duration: 4000 })
                } else {
                  toast.success(`Digest tạo xong (${r.itemsCount} mục) — bật kênh trong Cài đặt để nhận`, { duration: 4500 })
                }
                // Hint cho user nếu chưa bật multi-channel
                if (ch && !ch.email && !ch.telegram) {
                  setTimeout(() => toast(
                    'Bật Email/Telegram trong Cài đặt → Thông báo → "Gợi ý AI hàng ngày" để nhận daily',
                    { icon: '💡', duration: 5000 }
                  ), 1500)
                }
              } else if (r.reason === 'already_sent_today') {
                toast('Đã gửi digest hôm nay rồi, kiểm tra kênh đã bật 🔔', { icon: 'ℹ️' })
              } else {
                toast.error('Chưa có data để tạo digest')
              }
            }}
            className="p-2 rounded-lg bg-cyan-500/15 active:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30"
            aria-label="Gửi digest"
            title="Gửi tóm tắt 3 mục qua các kênh đã bật (bell / email / telegram)"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-zinc-800 active:bg-zinc-700 text-zinc-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab nav: Feed | Activity */}
        <div className="flex border-t border-zinc-800">
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              tab === 'feed'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-zinc-500'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gợi ý {feed && feed.count > 0 && <span className="text-[10px] opacity-70">({feed.count})</span>}
          </button>
          <button
            onClick={() => setTab('activity')}
            className={`flex-1 py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              tab === 'activity'
                ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-zinc-500'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Hoạt động
          </button>
        </div>

        {/* Source chips — horizontal scroll (chỉ trong tab feed) */}
        {tab === 'feed' && feed && feed.sources.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {feed.sources.map(s => (
              <span key={s} className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {{
                  'kg-mastery':      '🎯 Điểm yếu',
                  'teacher-network': '👩‍🏫 GV',
                  'popular':         '🔥 Nổi bật',
                  'curious':         '✨ Khám phá',
                  'embedding':       '🧠 AI Two-Tower',
                  'cold-start':      '🌱 Khởi đầu',
                  'class-trending':  '📉 Lớp đang yếu',
                  'content-gap':     '💡 Cần tạo bài',
                  'student-need':    '🆘 HS cần hỗ trợ',
                  'student-activity':'🛣 HS tự khảo sát',
                }[s] || s}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Main feed */}
      <main className="px-4 pt-4 max-w-2xl mx-auto">
        {/* ── ACTIVITY TAB ── */}
        {tab === 'activity' && (
          <div className="space-y-2 pb-8">
            <p className="text-[11px] text-zinc-500 mb-3">
              Lịch sử {history?.length ?? 0} hoạt động gần đây của bạn. AI dùng dữ liệu này để cá nhân hoá gợi ý — mỗi lần bạn click / hoàn thành / pass quiz, recsys ghi nhận và cải thiện feed.
            </p>
            {!history && (
              <div className="text-center py-8">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-400" />
              </div>
            )}
            {history && history.length === 0 && (
              <div className="text-center py-12 text-zinc-500 text-sm">
                Chưa có hoạt động nào.<br />
                Bắt đầu khám phá → AI sẽ học sở thích của bạn.
              </div>
            )}
            {history && history.map((h) => {
              const ago = (() => {
                const ms = Date.now() - new Date(h.createdAt).getTime()
                const m = Math.floor(ms / 60000)
                if (m < 1) return 'vừa xong'
                if (m < 60) return `${m}p trước`
                const hr = Math.floor(m / 60)
                if (hr < 24) return `${hr}h trước`
                return `${Math.floor(hr / 24)}d trước`
              })()
              const actionMeta: Record<string, { emoji: string; color: string; label: string }> = {
                'view':         { emoji: '👀', color: 'var(--td-muted)', label: 'Xem' },
                'click':        { emoji: '👆', color: '#22d3ee', label: 'Click' },
                'complete':     { emoji: '✅', color: '#10b981', label: 'Hoàn thành' },
                'pass_quiz':    { emoji: '🏆', color: '#fbbf24', label: 'Đạt' },
                'fail_quiz':    { emoji: '😕', color: '#f43f5e', label: 'Chưa đạt' },
                'not_interested':{ emoji: '🚫', color: 'var(--td-muted)', label: 'Không quan tâm' },
                'dwell_30s':    { emoji: '⏱', color: '#a855f7', label: 'Đọc lâu' },
                'like':         { emoji: '❤️', color: '#ec4899', label: 'Thích' },
                'save':         { emoji: '🔖', color: '#3b82f6', label: 'Lưu' },
              }
              const m = actionMeta[h.action] || { emoji: '📌', color: 'var(--td-muted)', label: h.action }
              const targetLabel = h.metadata?.title || h.metadata?.label
                || h.metadata?.subject || h.targetId
              return (
                <div
                  key={h.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800"
                  style={{ borderLeftWidth: 3, borderLeftColor: m.color }}
                >
                  <span className="text-base shrink-0">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: m.color }}>
                        {m.label}
                      </span>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-500">{h.targetType}</span>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-500">weight {h.weight > 0 ? '+' : ''}{h.weight}</span>
                    </div>
                    <p className="text-xs text-zinc-200 truncate mt-0.5">{String(targetLabel)}</p>
                    {h.metadata?.percentage !== undefined && (
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Kết quả: <span className="font-mono">{h.metadata.percentage}%</span>
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0">{ago}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── FEED TAB ── */}
        {tab === 'feed' && isLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-3" />
            <p className="text-sm text-zinc-500">Đang tính gợi ý cá nhân hoá…</p>
          </div>
        )}

        {tab === 'feed' && !isLoading && visibleItems.length === 0 && (
          <div className="text-center py-16 px-4">
            <Compass className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-zinc-300 mb-1">Chưa có gợi ý nào</p>
            <p className="text-xs text-zinc-500 mb-6">
              Làm 1 vài bài thi / kết nối GV để hệ thống có data
              cá nhân hoá feed.
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <button onClick={() => navigate('/student/teachers')} className="w-full py-2.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 text-sm font-bold">
                Kết nối GV
              </button>
              <button onClick={() => navigate('/dashboard/knowledge-graph')} className="w-full py-2.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-sm font-bold">
                Vào Knowledge Graph
              </button>
            </div>
          </div>
        )}

        {/* RS-Phase 10: Cold-start welcome banner cho user mới — adaptive theo onboarding */}
        {tab === 'feed' && !isLoading && feed?.isColdStart && visibleItems.length > 0 && (
          <div className="mb-3 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/5 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{hasOnboardedSubject ? '🎯' : '🌱'}</span>
              <div className="flex-1">
                <h3 className="font-bold text-amber-200 text-sm mb-1">
                  {hasOnboardedSubject
                    ? `Gợi ý cá nhân hoá cho môn ${onboardingPrefs?.subject}`
                    : 'Chào mừng đến với AeroEduVision!'}
                </h3>
                <p className="text-xs text-amber-100/80 leading-snug">
                  {hasOnboardedSubject ? (
                    <>AI đã lọc gợi ý theo sở thích bạn chọn. Tương tác thêm để feed thông minh hơn nữa. <button onClick={() => setShowOnboarding(true)} className="underline font-bold">Đổi sở thích</button></>
                  ) : (
                    <>Bạn mới đăng ký — đây là <strong>gợi ý khởi đầu</strong> từ content phổ biến + lộ trình GV. Càng tương tác nhiều, feed càng cá nhân hoá. <button onClick={() => setShowOnboarding(true)} className="underline font-bold">Cá nhân hoá ngay →</button></>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === 'feed' && !isLoading && visibleItems.length > 0 && (
          <div className="space-y-3">
            {visibleItems.map((item, idx) => {
              const meta = getRsTypeMeta(item.type)
              return (
                <article
                  key={`${item.type}-${item.id}`}
                  className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden active:bg-zinc-800/60 transition-colors"
                  style={{ borderLeftWidth: 3, borderLeftColor: meta.accent }}
                >
                  <button
                    onClick={() => handleOpen(item)}
                    className="w-full text-left p-3.5 flex items-start gap-3"
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${meta.accent}22`, border: `1px solid ${meta.accent}66` }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                          style={{ background: `${meta.accent}22`, color: meta.accent }}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-zinc-600">#{idx + 1}</span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-100 leading-tight mb-1 line-clamp-2">
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className="text-xs text-zinc-400 leading-snug mb-1.5 line-clamp-1">
                          {item.subtitle}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-xs text-zinc-500 leading-snug line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Meta badges */}
                      {item.meta && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.meta.duration && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                              <Clock className="w-3 h-3" /> {item.meta.duration}p
                            </span>
                          )}
                          {item.meta.teacherName && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                              <Users className="w-3 h-3" /> {item.meta.teacherName}
                            </span>
                          )}
                          {item.meta.takerCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                              <Users className="w-3 h-3" /> {item.meta.takerCount} HS
                            </span>
                          )}
                          {item.meta.masteryScore !== undefined && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-400">
                              <Target className="w-3 h-3" /> {Math.round(item.meta.masteryScore)}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* RS-Phase 3: Reasons chips (transparency — vì sao gợi ý)
                          + RS-Phase 10: matchedPref badge cho cold-start items match subject */}
                      {((item.reasons && item.reasons.length > 0) || item.meta?.matchedPref) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.meta?.matchedPref && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold">
                              ⭐ Khớp sở thích
                            </span>
                          )}
                          {item.reasons?.slice(0, 3).map((r, ri) => (
                            <span
                              key={ri}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Prereq warning bar nếu thiếu prerequisites */}
                      {item.hydration?.prereqStatus !== undefined &&
                       item.hydration.prereqStatus < 50 &&
                       item.hydration.prereqCount && item.hydration.prereqCount > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-1">
                          <span>⚠ Cần học {(item.hydration.prereqCount ?? 0) - (item.hydration.prereqMastered ?? 0)}/{item.hydration.prereqCount} prerequisite trước</span>
                        </div>
                      )}

                      {/* RS-Phase 5: AI Predictions bar (transparency Grok-style) */}
                      {item.predictions && (
                        <details className="mt-2 group">
                          <summary className="cursor-pointer text-[10px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
                            🤖 AI dự đoán
                            <span className="text-[9px] text-cyan-400 font-mono">
                              {item.predictions.mlSignal > 0 ? '+' : ''}{item.predictions.mlSignal}
                            </span>
                            <span className="text-zinc-600 group-open:hidden">▶</span>
                            <span className="text-zinc-600 hidden group-open:inline">▼</span>
                          </summary>
                          <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px]">
                            {[
                              { key: 'complete',   label: '✅ Hoàn thành', color: '#10b981' },
                              { key: 'pass_quiz',  label: '🏆 Đạt',       color: '#fbbf24' },
                              { key: 'like',       label: '❤️ Thích',      color: '#ec4899' },
                              { key: 'dwell_30s',  label: '⏱ Đọc kỹ',     color: '#a855f7' },
                              { key: 'skip',       label: '🚫 Skip',       color: '#f87171' },
                              { key: 'not_interested', label: '👎 Không q.tâm', color: '#f43f5e' },
                            ].map(({ key, label, color }) => {
                              const v = item.predictions![key as keyof RsPredictions] as number
                              const isNeg = key === 'skip' || key === 'not_interested'
                              return (
                                <div key={key} className="flex items-center gap-1.5">
                                  <span className="text-zinc-400 shrink-0" style={{ width: 70 }}>{label}</span>
                                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all"
                                      style={{ width: `${v}%`, background: color, opacity: isNeg && v < 30 ? 0.4 : 1 }} />
                                  </div>
                                  <span className="font-mono shrink-0 text-zinc-500" style={{ width: 24 }}>{v}%</span>
                                </div>
                              )
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 mt-1" />
                  </button>

                  {/* Action row — CTA + dismiss */}
                  <div className="flex items-center gap-2 px-3.5 pb-3 -mt-1">
                    <button
                      onClick={() => handleOpen(item)}
                      className="flex-1 text-xs font-bold py-2 rounded-lg inline-flex items-center justify-center gap-1.5"
                      style={{
                        background: `${meta.accent}22`,
                        color: meta.accent,
                        border: `1px solid ${meta.accent}55`,
                      }}
                    >
                      {item.cta || 'Mở'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDismiss(item)}
                      className="p-2 rounded-lg bg-zinc-800 active:bg-zinc-700 text-zinc-500"
                      aria-label="Không quan tâm"
                      title="Không quan tâm"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              )
            })}

            {/* End marker */}
            <div className="text-center py-8 text-[11px] text-zinc-600">
              Hết feed · <button onClick={() => refetch()} className="text-cyan-400 underline">Tải mới</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
