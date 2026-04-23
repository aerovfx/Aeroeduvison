/**
 * CourseHistoryTimeline — Hiển thị lịch sử các bài học của học sinh
 * theo dòng thời gian. Dùng được cho:
 *   - 1 khoá học (courseId)
 *   - 1 lộ trình học cá nhân (learningPathId)
 *
 * Sử dụng:
 *   <CourseHistoryTimeline courseId={course.id} compact />
 *   <CourseHistoryTimeline learningPathId={path.id} />
 */
import { useQuery } from '@tanstack/react-query'
import { learningService } from '@/services/learning.service'
import { formatRelativeTime, formatDate, cn } from '@/lib/utils'
import type { LessonHistoryAction, LessonHistoryEvent } from '@/types'
import {
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Loader2,
  History,
} from 'lucide-react'

interface CourseHistoryTimelineProps {
  /** ID khoá học (truyền 1 trong 2: courseId hoặc learningPathId) */
  courseId?: string
  /** ID lộ trình học cá nhân */
  learningPathId?: string
  /** Số lượng sự kiện tải về (mặc định 100/200) */
  limit?: number
  /** Hiển thị gọn: chỉ 5 dòng gần nhất, không tiêu đề */
  compact?: boolean
  /** Class tuỳ chỉnh */
  className?: string
}

const ACTION_META: Record<
  LessonHistoryAction,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  OPENED: {
    label: 'Mở bài',
    icon: PlayCircle,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
  RESUMED: {
    label: 'Tiếp tục học',
    icon: RotateCcw,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  QUIZ_ATTEMPT: {
    label: 'Làm bài kiểm tra',
    icon: HelpCircle,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  },
  CUSTOM: {
    label: 'Sự kiện',
    icon: Sparkles,
    color: 'text-slate-300 bg-slate-500/10 border-slate-500/30',
  },
}

export function CourseHistoryTimeline({
  courseId,
  learningPathId,
  limit,
  compact = false,
  className,
}: CourseHistoryTimelineProps) {
  const queryKey = courseId
    ? ['learning-history', 'course', courseId, limit]
    : ['learning-history', 'path', learningPathId, limit]

  const enabled = Boolean(courseId || learningPathId)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    enabled,
    queryFn: () => {
      if (courseId) return learningService.getCourseHistory(courseId, limit ?? 100)
      if (learningPathId) return learningService.getPathHistory(learningPathId, limit ?? 200)
      return Promise.resolve<LessonHistoryEvent[]>([])
    },
    staleTime: 30_000,
  })

  const events = data ?? []
  const visible = compact ? events.slice(0, 5) : events

  if (!enabled) return null

  return (
    <div className={cn('w-full', className)}>
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-semibold text-white">
              Lịch sử học tập
            </h3>
            <span className="text-sm text-slate-400">({events.length})</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Làm mới
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Đang tải lịch sử…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="text-sm text-red-400 py-2">
          Không tải được lịch sử. Vui lòng thử lại.
        </div>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <div
          className={cn(
            'text-sm text-slate-400 italic py-3',
            compact ? '' : 'text-center bg-slate-900/40 rounded-lg border border-slate-800',
          )}
        >
          Chưa có hoạt động học nào được ghi nhận.
        </div>
      )}

      {!isLoading && visible.length > 0 && (
        <ol
          className={cn(
            'relative',
            compact ? 'space-y-1.5' : 'space-y-3 border-l border-slate-800 pl-5',
          )}
        >
          {visible.map((ev) => {
            const meta = ACTION_META[ev.action] || ACTION_META.CUSTOM
            const Icon = meta.icon
            return (
              <li
                key={ev.id}
                className={cn(
                  'relative',
                  compact ? 'flex items-center gap-2' : '',
                )}
              >
                {!compact && (
                  <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 ring-2 ring-slate-700" />
                )}
                <div
                  className={cn(
                    'flex items-center gap-2',
                    compact ? '' : 'mb-1',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
                      meta.color,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <span
                    className="text-xs text-slate-500"
                    title={formatDate(ev.occurredAt)}
                  >
                    {formatRelativeTime(ev.occurredAt)}
                  </span>
                </div>
                {ev.title && (
                  <p
                    className={cn(
                      'text-slate-200',
                      compact ? 'text-sm truncate flex-1' : 'text-sm',
                    )}
                    title={ev.title}
                  >
                    {ev.title}
                  </p>
                )}
                {!compact && ev.metadata && Object.keys(ev.metadata).length > 0 && (
                  <ExtraMetadata data={ev.metadata} />
                )}
              </li>
            )
          })}
        </ol>
      )}

      {compact && events.length > visible.length && (
        <p className="text-xs text-slate-500 mt-2">
          + {events.length - visible.length} sự kiện trước đó
        </p>
      )}
    </div>
  )
}

function ExtraMetadata({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([k, v]) => v !== null && v !== undefined && k !== 'segment',
  )
  if (entries.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {entries.slice(0, 4).map(([k, v]) => (
        <span
          key={k}
          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-800"
        >
          {k}: {String(v)}
        </span>
      ))}
    </div>
  )
}
