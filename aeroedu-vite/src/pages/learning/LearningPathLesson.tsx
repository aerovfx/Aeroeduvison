/**
 * LearningPathLesson — trang học bài trong lộ trình
 * Route: /learning-paths/lesson/:lessonId?pathId=...&title=...
 *
 * Tải toàn bộ lộ trình → tìm module có id = lessonId → hiển thị nội dung.
 * Hỗ trợ type: lesson / reading / video / quiz / challenge / assignment
 *
 * Tính năng:
 *   • Hiển thị video (YouTube, Vimeo, MP4) nếu resourceUrl là video
 *   • Thanh tiến độ lộ trình + điều hướng bài trước / bài sau
 *   • Nút "Đánh dấu hoàn thành" → PATCH /api/student/learning-paths/:pathId/modules/:moduleId/complete
 *   • Hiển thị nội dung text (description) với MathText
 *   • XP reward + confetti khi hoàn thành lần đầu
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Play, Clock, Zap,
  BookOpen, FileQuestion, Star, Lock, ChevronLeft, ChevronRight,
  ExternalLink, Trophy, Target, RotateCcw, Book, AlignLeft,
  Video, Loader2,
} from 'lucide-react'
import { api } from '@/services/api'
import studentLearningPathService, {
  type StudentLearningPath,
  type StudentLearningPathModule,
} from '@/services/studentLearningPath.service'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import usePageTitle from '@/hooks/usePageTitle'
import confetti from 'canvas-confetti'

// ── Helpers ────────────────────────────────────────────────────────────────
function isYoutube(url: string) { return url.includes('youtube') || url.includes('youtu.be') }
function isVimeo(url: string)   { return url.includes('vimeo.com') }

function getYtId(url: string) {
  return url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1] ?? null
}
function getVimeoId(url: string) {
  return url.match(/vimeo\.com\/(\d+)/)?.[1] ?? null
}

function isVideoUrl(url?: string | null) {
  if (!url) return false
  return isYoutube(url) || isVimeo(url) ||
    /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url)
}

// ── TypeIcon ────────────────────────────────────────────────────────────────
function TypeIcon({ type, className }: { type: string; className?: string }) {
  const cls = cn('w-4 h-4', className)
  switch (type) {
    case 'video':      return <Video className={cls} />
    case 'quiz':       return <FileQuestion className={cls} />
    case 'reading':    return <Book className={cls} />
    case 'challenge':  return <Star className={cls} />
    case 'assignment': return <AlignLeft className={cls} />
    default:           return <BookOpen className={cls} />
  }
}

function typeLabel(t: string) {
  const m: Record<string, string> = {
    lesson: 'Bài học', video: 'Video', quiz: 'Câu hỏi',
    reading: 'Đọc', challenge: 'Thử thách', assignment: 'Bài tập',
  }
  return m[t] || t
}

function typeColor(t: string) {
  const m: Record<string, string> = {
    lesson: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    video: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    quiz: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    reading: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    challenge: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    assignment: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  }
  return m[t] || 'text-white/50 bg-white/[0.04] border-white/10'
}

// ── VideoPlayer ─────────────────────────────────────────────────────────────
function VideoPlayer({ url }: { url: string }) {
  if (isYoutube(url)) {
    const vid = getYtId(url)
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${vid}?autoplay=0&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  if (isVimeo(url)) {
    const vid = getVimeoId(url)
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://player.vimeo.com/video/${vid}?autoplay=0`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
      <video
        className="w-full h-full"
        src={url}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={e => e.preventDefault()}
      />
    </div>
  )
}

// ── Module Sidebar Row ───────────────────────────────────────────────────────
function SidebarRow({
  m, index, isCurrent, isDone, isLocked, pathId,
}: {
  m: StudentLearningPathModule
  index: number
  isCurrent: boolean
  isDone: boolean
  isLocked: boolean
  pathId: string
}) {
  const target = m.resourceUrl ||
    `/learning-paths/lesson/${m.id}?pathId=${encodeURIComponent(pathId)}&title=${encodeURIComponent(m.title)}`

  return (
    <Link
      to={isLocked ? '#' : target}
      className={cn(
        'flex items-start gap-2 px-3 py-2.5 rounded-lg transition-all text-left',
        isCurrent && 'bg-violet-500/15 border border-violet-500/25',
        !isCurrent && !isLocked && 'hover:bg-white/[0.04] border border-transparent',
        isLocked && 'opacity-40 cursor-not-allowed border border-transparent',
      )}
      onClick={e => isLocked && e.preventDefault()}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isLocked
          ? <Lock className="w-4 h-4 text-white/20" />
          : isDone
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : isCurrent
          ? <Circle className="w-4 h-4 text-violet-400 animate-pulse" />
          : <Circle className="w-4 h-4 text-white/20" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs font-medium leading-snug truncate',
          isCurrent ? 'text-violet-300' : isDone ? 'text-emerald-300/80' : 'text-white/70',
        )}>
          <span className="text-white/25 mr-1 font-mono">{String(index + 1).padStart(2, '0')}.</span>
          {m.title}
        </p>
        {m.duration && (
          <p className="text-[10px] text-white/30 mt-0.5">{m.duration} phút</p>
        )}
      </div>
    </Link>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LearningPathLesson() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [sp] = useSearchParams()
  const pathId  = sp.get('pathId')  || ''
  const titleFb = sp.get('title')   || 'Bài học'

  const navigate = useNavigate()
  const qc = useQueryClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [marked, setMarked] = useState(false)  // đã đánh dấu trong session

  // ── Load all paths → find this one ───────────────────────────
  const { data: paths = [], isLoading } = useQuery<StudentLearningPath[]>({
    queryKey: ['student-learning-paths'],
    queryFn: studentLearningPathService.getMine,
    staleTime: 60_000,
    retry: false,
  })

  const path = useMemo(
    () => paths.find(p => p.id === pathId) ?? null,
    [paths, pathId]
  )

  const modules: StudentLearningPathModule[] = path?.modules ?? []
  const moduleStatus = path?.moduleStatus ?? {}

  const curIdx = useMemo(
    () => modules.findIndex(m => m.id === lessonId),
    [modules, lessonId]
  )

  const module: StudentLearningPathModule | null = modules[curIdx] ?? null

  const prevModule = curIdx > 0 ? modules[curIdx - 1] : null
  const nextModule = curIdx < modules.length - 1 ? modules[curIdx + 1] : null

  const isCompleted = module ? moduleStatus[module.id] === 'completed' : false
  const alreadyDone = isCompleted

  usePageTitle(module?.title ?? titleFb)

  // ── Mark complete mutation ────────────────────────────────────
  const completeMut = useMutation({
    mutationFn: async () => {
      if (!module || !pathId) throw new Error('missing data')
      const r = await api.patch(
        `/student/learning-paths/${encodeURIComponent(pathId)}/modules/${encodeURIComponent(module.id)}/complete`
      )
      return r.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['student-learning-paths'] })
      setMarked(true)
      toast.success(`+${module?.xpReward ?? 10} XP — Đã hoàn thành bài học! 🎉`)
      // Confetti!
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      // Auto navigate to next after 2s
      if (nextModule) {
        setTimeout(() => {
          const target = nextModule.resourceUrl ||
            `/learning-paths/lesson/${nextModule.id}?pathId=${encodeURIComponent(pathId)}&title=${encodeURIComponent(nextModule.title)}`
          navigate(target)
        }, 2000)
      }
    },
    onError: () => toast.error('Không thể lưu tiến độ. Thử lại sau.'),
  })

  // ── Navigate helpers ────────────────────────────────────────
  const goTo = (m: StudentLearningPathModule) => {
    const target = m.resourceUrl ||
      `/learning-paths/lesson/${m.id}?pathId=${encodeURIComponent(pathId)}&title=${encodeURIComponent(m.title)}`
    navigate(target)
  }

  // ── Progress ───────────────────────────────────────────────
  const doneCount = Object.values(moduleStatus).filter(s => s === 'completed').length
  const progressPct = modules.length > 0
    ? Math.round((doneCount / modules.length) * 100)
    : (path?.progressPct ?? 0)

  // ── Loading / Error states ─────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[hsl(225,15%,7%)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-sm text-white/40">Đang tải bài học...</p>
        </div>
      </div>
    )
  }

  if (!path && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[hsl(225,15%,7%)] gap-4 px-4">
        <Target className="w-12 h-12 text-white/20" />
        <h2 className="text-lg font-bold text-white/60">Không tìm thấy lộ trình</h2>
        <p className="text-sm text-white/30 text-center max-w-xs">
          Lộ trình chưa được phân công hoặc đã hết hạn. Kiểm tra lại với giáo viên của bạn.
        </p>
        <Link
          to="/learning-paths"
          className="mt-2 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm hover:bg-violet-500/30 transition-all"
        >
          ← Về lộ trình học
        </Link>
      </div>
    )
  }

  if (!module && path) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[hsl(225,15%,7%)] gap-4 px-4">
        <BookOpen className="w-12 h-12 text-white/20" />
        <h2 className="text-lg font-bold text-white/60">Không tìm thấy bài học</h2>
        <p className="text-sm text-white/30 text-center max-w-xs">
          Bài học này không thuộc lộ trình <strong className="text-white/60">{path.name}</strong>.
        </p>
        <Link
          to="/learning-paths"
          className="mt-2 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm hover:bg-violet-500/30 transition-all"
        >
          ← Về lộ trình học
        </Link>
      </div>
    )
  }

  const hasVideo = isVideoUrl(module?.resourceUrl)
  const hasExternalLink = module?.resourceUrl && !hasVideo
  const showContent = !hasVideo  // Show description as lesson content

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden bg-[hsl(225,15%,7%)]">

      {/* ════════════ SIDEBAR ════════════════════════════════════ */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        'flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[hsl(225,14%,9%)] transition-all duration-300 z-30',
        'fixed lg:relative inset-y-0 left-0',
        sidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:translate-x-0 lg:w-72',
      )}>
        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] flex-shrink-0">
          <Link
            to="/learning-paths"
            className="flex items-center gap-2 text-xs text-white/40 hover:text-violet-400 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Lộ trình học
          </Link>
          <h2 className="text-sm font-bold text-white/85 leading-tight line-clamp-2">
            {path?.name ?? 'Lộ trình'}
          </h2>
          {path?.teacher?.name && (
            <p className="text-[11px] text-white/35 mt-1">GV: {path.teacher.name}</p>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/30">Tiến độ</span>
              <span className="text-[10px] text-violet-400 font-medium">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-white/25 mt-1">{doneCount} / {modules.length} bài</p>
          </div>
        </div>

        {/* Module list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {modules.map((m, idx) => {
            const done = moduleStatus[m.id] === 'completed'
            const inProg = moduleStatus[m.id] === 'in_progress'
            const locked = idx > 0 && !moduleStatus[modules[idx - 1].id]
            return (
              <SidebarRow
                key={m.id}
                m={m}
                index={idx}
                isCurrent={m.id === lessonId}
                isDone={done || inProg}
                isLocked={false /* free navigation */}
                pathId={pathId}
              />
            )
          })}
        </div>
      </aside>

      {/* ════════════ MAIN CONTENT ══════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[hsl(225,14%,9%)] flex-shrink-0">
          {/* Hamburger (mobile sidebar) */}
          <button
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all"
            onClick={() => setSidebarOpen(s => !s)}
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-white/30 min-w-0 flex-1">
            <Link to="/learning-paths" className="hover:text-violet-400 transition-colors truncate shrink-0">
              Lộ trình
            </Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="text-white/55 truncate">{module?.title ?? titleFb}</span>
          </div>

          {/* Nav prev / next */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => prevModule && goTo(prevModule)}
              disabled={!prevModule}
              title="Bài trước"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all hover:bg-white/[0.08]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => nextModule && goTo(nextModule)}
              disabled={!nextModule}
              title="Bài tiếp"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all hover:bg-white/[0.08]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Lesson body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-12">

            {/* Module metadata */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {module?.type && (
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
                  typeColor(module.type),
                )}>
                  <TypeIcon type={module.type} className="w-3 h-3" />
                  {typeLabel(module.type)}
                </span>
              )}
              {module?.duration && (
                <span className="flex items-center gap-1 text-[11px] text-white/35">
                  <Clock className="w-3 h-3" />
                  {module.duration} phút
                </span>
              )}
              {module?.xpReward && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400/70">
                  <Zap className="w-3 h-3" />
                  +{module.xpReward} XP
                </span>
              )}
              {(alreadyDone || marked) && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã hoàn thành
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white/90 mb-4 leading-tight">
              {module?.title ?? titleFb}
            </h1>

            {/* Video */}
            {hasVideo && module?.resourceUrl && (
              <div className="mb-6">
                <VideoPlayer url={module.resourceUrl} />
              </div>
            )}

            {/* External link card */}
            {hasExternalLink && (
              <a
                href={module!.resourceUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-all group"
              >
                <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-300 group-hover:text-blue-200 transition-colors">
                    Mở tài nguyên học
                  </p>
                  <p className="text-[11px] text-blue-400/60 truncate mt-0.5">
                    {module!.resourceUrl}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-400/60 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </a>
            )}

            {/* Description / lesson content */}
            {module?.description && (
              <div className="prose prose-invert max-w-none mb-6">
                <div
                  className="text-white/75 leading-relaxed text-[0.94rem] space-y-3"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {module.description}
                </div>
              </div>
            )}

            {/* Empty content fallback */}
            {!hasVideo && !hasExternalLink && !module?.description && (
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center mb-6">
                <BookOpen className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-sm text-white/35">Giáo viên chưa thêm nội dung cho bài học này.</p>
                <p className="text-[11px] text-white/20 mt-1">
                  Liên hệ giáo viên để được cập nhật tài liệu học.
                </p>
              </div>
            )}

            {/* ── Complete button ───────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-white/[0.06]">
              {!alreadyDone && !marked ? (
                <button
                  onClick={() => completeMut.mutate()}
                  disabled={completeMut.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm transition-all disabled:opacity-60 shadow-lg shadow-violet-500/25"
                >
                  {completeMut.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />}
                  Đánh dấu hoàn thành
                </button>
              ) : (
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-semibold text-sm">
                  <Trophy className="w-4 h-4" />
                  Đã hoàn thành bài học!
                </div>
              )}

              {/* Next lesson CTA */}
              {nextModule && (
                <button
                  onClick={() => goTo(nextModule)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.07] text-sm font-medium transition-all"
                >
                  Bài tiếp theo
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {!nextModule && (alreadyDone || marked) && (
                <Link
                  to="/learning-paths"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/15 text-sm font-medium transition-all"
                >
                  <Trophy className="w-4 h-4" />
                  Xem kết quả lộ trình
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
