/**
 * CurriculumSidebar — Sidebar mục lục Chapter → Lesson cho CoursePlayer.
 *
 * - Chapter collapsible, default expand chapter chứa current lesson
 * - Lesson item show số block + duration + completion checkmark
 * - Click lesson → onSelectLesson(lessonId)
 * - Progress bar trên đầu = % lessons completed
 */
import { useMemo, useState, useEffect } from 'react'
import { ChevronDown, CheckCircle2, Play, Award, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentChapter } from '@/types'

interface Props {
  chapters: StudentChapter[]
  currentLessonId: string | null
  completedLessonIds?: Set<string>
  onSelectLesson: (lessonId: string) => void
}

const fmtDur = (sec?: number | null): string => {
  if (!sec || sec < 1) return ''
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `${h}h ${rm}min` : `${h}h`
}

export default function CurriculumSidebar({
  chapters,
  currentLessonId,
  completedLessonIds = new Set(),
  onSelectLesson,
}: Props) {
  const allLessons = useMemo(
    () => chapters.flatMap(c => c.lessons),
    [chapters]
  )
  const completedCount = useMemo(
    () => allLessons.filter(l => completedLessonIds.has(l.id)).length,
    [allLessons, completedLessonIds]
  )
  const progress = allLessons.length > 0
    ? Math.round((completedCount / allLessons.length) * 100)
    : 0

  // Default: expand chapter chứa current lesson
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!currentLessonId) return
    // Tìm chapter chứa current lesson — đảm bảo nó expanded
    const containingChapter = chapters.find(c => c.lessons.some(l => l.id === currentLessonId))
    if (containingChapter && collapsed.has(containingChapter.id)) {
      setCollapsed(prev => {
        const next = new Set(prev)
        next.delete(containingChapter.id)
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLessonId, chapters])

  const toggleChapter = (id: string) => {
    setCollapsed(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Continuous lesson index across all chapters
  const lessonIndexMap = useMemo(() => {
    const m = new Map<string, number>()
    let idx = 0
    chapters.forEach(c => c.lessons.forEach(l => { idx++; m.set(l.id, idx) }))
    return m
  }, [chapters])

  return (
    <div className="flex flex-col h-full">
      {/* Header với progress bar */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Mục lục khoá học
          </h3>
          <span className="text-xs text-purple-600 dark:text-purple-300 font-bold">{progress}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {completedCount}/{allLessons.length} bài đã hoàn thành · {chapters.length} chương
        </p>
      </div>

      {/* Chapter + Lesson list */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {chapters.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            Khoá học chưa có nội dung. Hãy quay lại sau.
          </div>
        )}
        {chapters.map((chapter, cIdx) => {
          const isCollapsed = collapsed.has(chapter.id)
          const sCompleted = chapter.lessons.filter(l => completedLessonIds.has(l.id)).length
          const sTotal     = chapter.lessons.length
          const sDuration  = chapter.lessons.reduce((s, l) => s + (l.duration || 0), 0)

          return (
            <div key={chapter.id} className="border-b">
              {/* Chapter header — collapsible */}
              <button
                onClick={() => toggleChapter(chapter.id)}
                type="button"
                style={{ touchAction: 'manipulation' }}
                className="w-full px-4 py-3 flex items-center gap-2 bg-muted/50 hover:bg-muted
                           active:bg-accent transition text-left min-h-[56px]"
              >
                <ChevronDown
                  className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform',
                    isCollapsed && '-rotate-90')}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate">
                    Chương {cIdx + 1}: {chapter.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {sCompleted} / {sTotal} bài
                    {sDuration > 0 && <> · {fmtDur(sDuration)}</>}
                  </p>
                </div>
              </button>

              {/* Lessons */}
              {!isCollapsed && chapter.lessons.map(lesson => {
                const isCurrent = lesson.id === currentLessonId
                const isDone = completedLessonIds.has(lesson.id)
                const idx = lessonIndexMap.get(lesson.id) || 0
                const blockCount = lesson.blocks.length
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onSelectLesson(lesson.id)}
                    type="button"
                    style={{ touchAction: 'manipulation' }}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition border-l-4',
                      'min-h-[64px] active:bg-accent',
                      isCurrent
                        ? 'bg-purple-500/10 dark:bg-purple-600/15 border-l-purple-500'
                        : 'border-l-transparent hover:bg-accent/50'
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0 transition',
                      isDone
                        ? 'bg-purple-500'
                        : 'border-2 border-muted-foreground/50 bg-transparent'
                    )}>
                      {isDone && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
                      {!isDone && isCurrent && <Play className="w-2.5 h-2.5 text-purple-500 fill-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium leading-snug line-clamp-2',
                        isCurrent ? 'text-purple-700 dark:text-purple-300 font-bold' : 'text-foreground/85'
                      )}>
                        {idx}. {lesson.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        {lesson.duration ? (
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" /> {fmtDur(lesson.duration)}
                          </span>
                        ) : null}
                        {blockCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-700/40 text-zinc-300 text-[10px]">
                            {blockCount} block
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
              {!isCollapsed && chapter.lessons.length === 0 && (
                <div className="px-4 py-3 text-[11px] text-muted-foreground italic">
                  Chương này chưa có bài học
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Certificate button */}
      {progress >= 100 && (
        <div className="p-4 border-t">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                            bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm
                            hover:opacity-90 transition-opacity">
            <Award className="w-4 h-4" /> Nhận chứng chỉ
          </button>
        </div>
      )}
    </div>
  )
}
