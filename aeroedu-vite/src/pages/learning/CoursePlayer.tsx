/**
 * CoursePlayer — Trang xem video khoá học
 * Ported from elearniv: /learning/course/[slug]/[courseId]
 * Components: video player, sidebar video list, progress, tabs (overview/assets/feedback/history)
 *
 * Tự động ghi lịch sử học (LessonHistory):
 *   - OPENED    khi mở bài lần đầu
 *   - RESUMED   khi quay lại bài đã mở trước đó
 *   - COMPLETED khi nhấn "Đánh dấu hoàn thành"
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  MessageSquare,
  Star,
  Download,
  Trophy,
  Menu,
  X,
  History,
  Award,
  BookOpen,
  Sparkles,
  ClipboardList,
  FlaskConical,
  Gamepad2,
  ExternalLink,
} from 'lucide-react'
import { learningService } from '@/services/learning.service'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { CourseHistoryTimeline } from '@/components/student/CourseHistoryTimeline'
import VideoSecurityOverlay from '@/components/learning/VideoSecurityOverlay'
import TranscriptPanel from '@/components/learning/TranscriptPanel'
import PdfBookViewer from '@/components/learning/PdfBookViewer'
import { LabChallengeAttempt, useLessonLabGate, type LabChallengeMetadata } from '@/components/iot/LabChallengeBlock'
import CurriculumSidebar from '@/components/learning/CurriculumSidebar'
import LessonBlockRenderer from '@/components/learning/LessonBlockRenderer'
import { Lock, Target } from 'lucide-react'
import type { CourseVideo, CourseExtras, StudentChapter, StudentLesson } from '@/types'

// ── Video Player ────────────────────────────────────────────
function VideoPlayer({ videoUrl }: { videoUrl?: string | null }) {
  // Defensive: nếu DB row có url=NULL hoặc API response thiếu field
  // → render placeholder thay vì crash ".includes of undefined".
  if (!videoUrl) {
    return (
      <div className="relative w-full aspect-video bg-muted rounded-xl overflow-hidden
                      flex flex-col items-center justify-center text-muted-foreground gap-2">
        <Play className="w-12 h-12 opacity-40" />
        <p className="text-sm">Video chưa có URL hợp lệ</p>
        <p className="text-[10px] text-muted-foreground/70">Liên hệ giáo viên để cập nhật</p>
      </div>
    )
  }
  const isYoutube = videoUrl.includes('youtube') || videoUrl.includes('youtu.be')
  const isVimeo = videoUrl.includes('vimeo')

  if (isYoutube) {
    const videoId = videoUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (isVimeo) {
    const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1]
    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video
        className="w-full h-full"
        src={videoUrl}
        controls
        autoPlay
        // Hardened anti-copy attributes (chuẩn LMS — Coursera/Udemy pattern):
        // - nodownload: ẩn nút Download trong control bar
        // - noremoteplayback: tắt cast tới TV/Chromecast
        // - nofullscreen: ép xem inline (giảm khả năng OS-level recording)
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        // Sandbox-style: kéo-thả nội dung block
        draggable={false}
      />
    </div>
  )
}

// ── Sidebar Video List ───────────────────────────────────────
/**
 * VideoSidebar — Udemy-style course content sidebar.
 *  - Group videos theo `groupName` (Section)
 *  - Số thứ tự liên tục (1, 2, 3, ...) khắp courses
 *  - Section header collapsible với progress N/M | total min
 *  - Active video highlighted purple
 *  - Completed video: tick xanh; Current: play icon; Other: hollow circle
 *  - Duration badge dưới title
 *  - Mobile-friendly 56px touch target
 */
function VideoSidebar({
  videos,
  currentVideoId,
  onSelect,
  courseId,
}: {
  videos: CourseVideo[]
  currentVideoId: string
  onSelect: (v: CourseVideo) => void
  courseId: string
}) {
  const completedCount = videos.filter((v) => v.isCompleted).length
  const progress = videos.length > 0
    ? Math.round((completedCount / videos.length) * 100)
    : 0

  // Format duration: 7min, 1h 23min
  const fmtDur = (sec?: number | null): string => {
    if (!sec || sec < 1) return ''
    const m = Math.floor(sec / 60)
    if (m < 60) return `${m}min`
    const h = Math.floor(m / 60)
    const rm = m % 60
    return rm > 0 ? `${h}h ${rm}min` : `${h}h`
  }

  // Group videos theo groupName (Section), giữ thứ tự gốc của API
  const sections = useMemo(() => {
    const map = new Map<string, { name: string; videos: Array<CourseVideo & { _idx: number }> }>()
    videos.forEach((v, i) => {
      const sName = v.groupName?.trim() || 'Nội dung khoá học'
      if (!map.has(sName)) map.set(sName, { name: sName, videos: [] })
      map.get(sName)!.videos.push({ ...v, _idx: i + 1 })  // _idx = số thứ tự continuous
    })
    return Array.from(map.values())
  }, [videos])

  // State: collapsed sections (default tất cả expanded)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggleSection = (name: string) => {
    setCollapsed(s => {
      const next = new Set(s)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header với progress bar mảnh trên đầu */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-sm font-bold text-foreground">Course content</h3>
          <span className="text-xs text-purple-600 dark:text-purple-300 font-bold">{progress}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {completedCount}/{videos.length} bài đã hoàn thành
        </p>
      </div>

      {/* Section + Video list */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {sections.map((section, sIdx) => {
          const isCollapsed = collapsed.has(section.name)
          const sCompleted = section.videos.filter(v => v.isCompleted).length
          const sTotal     = section.videos.length
          const sDuration  = section.videos.reduce((s, v) => s + (v.duration || 0), 0)

          return (
            <div key={section.name} className="border-b">
              {/* Section header — collapsible */}
              <button
                onClick={() => toggleSection(section.name)}
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
                    Section {sIdx + 1}: {section.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {sCompleted} / {sTotal}
                    {sDuration > 0 && <> | {fmtDur(sDuration)}</>}
                  </p>
                </div>
              </button>

              {/* Videos in section */}
              {!isCollapsed && section.videos.map(video => {
                const isCurrent = video.id === currentVideoId
                const isDone    = video.isCompleted
                return (
                  <button
                    key={video.id}
                    onClick={() => onSelect(video)}
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
                    {/* Custom checkbox — filled khi completed */}
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
                        {video._idx}. {video.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Play className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {fmtDur(video.duration) || '—'}
                        </span>
                        {video.isPreview && (
                          <span className="text-[9px] px-1 py-0.5 rounded
                                          bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
                            Preview
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Certificate button */}
      {progress >= 100 && (
        <div className="p-4 border-t">
          <Link
            to={`/student/certificate/${courseId}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-400 font-medium text-sm transition-colors border border-yellow-500/30"
          >
            <Trophy className="w-4 h-4" />
            Nhận chứng chỉ
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Tabs: Overview / Assets / Feedback / History / PDF Book / Extras ─
type Tab = 'overview' | 'assets' | 'feedback' | 'history' | 'pdfbook' | 'extras' | 'labs'

// Lesson block from /api/learning/lessons/:id/blocks (referenceSnapshot ẩn)
interface LessonBlockPub {
  id: string
  lessonId: string
  type: string
  title: string | null
  content: string | null
  metadata: Record<string, unknown> & { challenge?: boolean; labType?: string }
  position: number
}

function OverviewTab({ overview }: { overview: string | null }) {
  return (
    <div
      className="tiptap-display text-foreground/85 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: overview || '<p>Chưa có mô tả.</p>' }}
    />
  )
}

function AssetsTab({ courseId }: { courseId: string }) {
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['course-assets', courseId],
    queryFn: () => learningService.getCourseAssets(courseId),
  })

  if (isLoading) return <div className="text-muted-foreground text-sm">Đang tải...</div>

  if (assets.length === 0)
    return <div className="text-muted-foreground text-sm">Khoá học chưa có tài liệu đính kèm.</div>

  return (
    <div className="space-y-2">
      {assets.map((asset) => (
        <a
          key={asset.id}
          href={asset.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted border transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium truncate">{asset.title}</p>
            <p className="text-xs text-muted-foreground uppercase">{asset.fileType}</p>
          </div>
          <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </a>
      ))}
    </div>
  )
}

function FeedbackTab({ courseId }: { courseId: string }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['course-reviews', courseId],
    queryFn: () => learningService.getCourseReviews(courseId),
  })

  const submit = useMutation({
    mutationFn: () => learningService.submitReview(courseId, { rating, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-reviews', courseId] })
      setComment('')
      setRating(5)
    },
  })

  return (
    <div className="space-y-6">
      {/* Submit review */}
      <div className="rounded-xl bg-card border p-5 space-y-4">
        <h4 className="font-semibold text-foreground text-sm">Đánh giá khoá học</h4>

        {/* Star rating */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              className={cn('w-7 h-7', s <= rating ? 'text-yellow-500 dark:text-yellow-400' : 'text-muted-foreground/50')}
            >
              <Star className="w-full h-full fill-current" />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ trải nghiệm học tập của bạn..."
          rows={3}
          className="w-full rounded-lg bg-background border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-purple-500 transition-colors"
        />

        <button
          onClick={() => submit.mutate()}
          disabled={!comment.trim() || submit.isPending}
          className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {submit.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </div>

      {/* Review list */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Đang tải...</div>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có đánh giá nào.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="flex gap-3">
              <img
                src={r.user.image || '/images/user1.jpg'}
                alt={r.user.name || ''}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{r.user.name}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          'w-3 h-3',
                          s <= r.rating ? 'text-yellow-500 dark:text-yellow-400 fill-current' : 'text-muted-foreground/50'
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-foreground/85">{r.comment}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function CoursePlayer() {
  const { slug, courseId } = useParams<{ slug: string; courseId: string }>()
  const [currentVideo, setCurrentVideo] = useState<CourseVideo | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  // Mobile mặc định ĐÓNG sidebar (w-80 = 320px nuốt hết video player trên màn nhỏ).
  // Desktop (≥1024px) mở mặc định.
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const qc = useQueryClient()

  // Track which videos we've already logged in this session so we can emit
  // OPENED the first time and RESUMED on subsequent selections
  const openedSetRef = useRef<Set<string>>(new Set())

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['course-videos', courseId],
    queryFn: () => learningService.getCourseVideos(courseId!),
    enabled: !!courseId,
  })

  // Fetch course info (pdfBookUrl) — ignore errors gracefully
  const { data: courseInfo } = useQuery({
    queryKey: ['course-info', courseId],
    queryFn: () => learningService.getCourseInfo(courseId!),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  })

  // ── Curriculum (NEW — Chapter → Lesson → LessonBlock hierarchy) ──
  // Khi course có curriculum chapters → ưu tiên render mục lục thay vì
  // flat video list. Fallback CourseVideo cũ nếu chưa có curriculum.
  const { data: curriculum = [], refetch: refetchCurriculum } = useQuery<StudentChapter[]>({
    queryKey: ['course-curriculum', courseId],
    queryFn: () => learningService.getCurriculum(courseId!),
    enabled: !!courseId,
    // V2 (2026-05-22): giảm staleTime 60s→10s vì GV thường add block xong
    // chuyển sang xem ngay với role HS — cần thấy update sớm.
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })
  const hasCurriculum = curriculum.length > 0 && curriculum.some(c => c.lessons.length > 0)

  // Auto-select first video chỉ khi NO curriculum (tránh override curriculum mode)
  useEffect(() => {
    if (!currentVideo && videos.length > 0 && !hasCurriculum) {
      setCurrentVideo(videos[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.length, hasCurriculum])

  // Current lesson state (chỉ dùng khi hasCurriculum)
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null)
  const currentLesson: StudentLesson | null = useMemo(() => {
    if (!hasCurriculum || !currentLessonId) return null
    for (const c of curriculum) {
      for (const l of c.lessons) if (l.id === currentLessonId) return l
    }
    return null
  }, [hasCurriculum, currentLessonId, curriculum])

  // Flatten lessons để compute prev/next
  const allLessons = useMemo(
    () => curriculum.flatMap(c => c.lessons),
    [curriculum]
  )
  const currentLessonIdx = currentLesson ? allLessons.findIndex(l => l.id === currentLesson.id) : -1
  const prevLesson = currentLessonIdx > 0 ? allLessons[currentLessonIdx - 1] : null
  const nextLesson = currentLessonIdx >= 0 && currentLessonIdx < allLessons.length - 1
    ? allLessons[currentLessonIdx + 1] : null

  // Auto-select first lesson khi curriculum loaded
  useEffect(() => {
    if (hasCurriculum && !currentLessonId && allLessons.length > 0) {
      setCurrentLessonId(allLessons[0].id)
    }
  }, [hasCurriculum, currentLessonId, allLessons])

  // Track completed lessons (localStorage cho V1; future: dùng LessonHistory API)
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!courseId) return
    try {
      const raw = localStorage.getItem(`completed-lessons:${courseId}`)
      if (raw) setCompletedLessonIds(new Set(JSON.parse(raw)))
    } catch { /* ignore */ }
  }, [courseId])
  const markLessonComplete = (id: string) => {
    setCompletedLessonIds(prev => {
      const next = new Set(prev).add(id)
      try { localStorage.setItem(`completed-lessons:${courseId}`, JSON.stringify(Array.from(next))) } catch { /* ignore */ }
      return next
    })
  }

  // Blocks của lesson hiện tại (từ curriculum) hoặc fetch riêng (legacy video mode)
  const lessonBlocks: LessonBlockPub[] = useMemo(() => {
    if (hasCurriculum && currentLesson) {
      return currentLesson.blocks.map(b => ({
        id: b.id, lessonId: b.lessonId, type: b.type,
        title: b.title, content: b.content,
        metadata: b.metadata as { challenge?: boolean; labType?: string },
        position: b.position,
      }))
    }
    return []
  }, [hasCurriculum, currentLesson])

  // Legacy fetch blocks cho currentVideo (chỉ khi không có curriculum)
  const { data: legacyBlocks = [] } = useQuery<LessonBlockPub[]>({
    queryKey: ['lesson-blocks-legacy', currentVideo?.id],
    queryFn: async () => {
      if (!currentVideo?.id) return []
      try {
        const { data } = await api.get(`/learning/lessons/${currentVideo.id}/blocks`)
        return data.blocks || []
      } catch { return [] }
    },
    enabled: !!currentVideo?.id && !hasCurriculum,
    staleTime: 30_000,
  })
  const effectiveBlocks = hasCurriculum ? lessonBlocks : legacyBlocks

  // Challenge blocks (lab type + metadata.challenge=true)
  const challengeBlocks = useMemo(
    () => effectiveBlocks.filter(b => b.type === 'lab' && b.metadata?.challenge),
    [effectiveBlocks]
  )
  const challengeIds = useMemo(() => challengeBlocks.map(b => b.id), [challengeBlocks])

  // Gate: nếu lesson hiện tại có challenge → check user đã pass hết chưa
  const labGate = useLessonLabGate(
    hasCurriculum ? currentLessonId || undefined : currentVideo?.id,
    challengeIds,
  )

  // ── History logging helpers ────────────────────────────────
  const logEvent = learningService.logEvent

  // Emit OPENED / RESUMED each time a video becomes current
  useEffect(() => {
    if (!currentVideo || !courseId) return
    const seen = openedSetRef.current.has(currentVideo.id)
    openedSetRef.current.add(currentVideo.id)
    logEvent({
      action: seen ? 'RESUMED' : 'OPENED',
      courseId,
      chapterId: currentVideo.id,
      title: currentVideo.title,
      metadata: {
        slug: slug ?? null,
        videoPosition: currentVideo.position,
      },
    }).then(() => {
      qc.invalidateQueries({ queryKey: ['learning-history', 'course', courseId] })
      qc.invalidateQueries({ queryKey: ['my-courses-activity'] })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.id, courseId])

  const markComplete = useMutation({
    mutationFn: (videoId: string) =>
      learningService.markVideoComplete(courseId!, videoId, true),
    onSuccess: async (_data, videoId) => {
      const v = videos.find((x) => x.id === videoId)
      if (courseId) {
        await logEvent({
          action: 'COMPLETED',
          courseId,
          chapterId: videoId,
          title: v?.title ?? null,
          metadata: { slug: slug ?? null },
        })
      }
      qc.invalidateQueries({ queryKey: ['course-videos', courseId] })
      qc.invalidateQueries({ queryKey: ['learning-history', 'course', courseId] })
      qc.invalidateQueries({ queryKey: ['my-courses-activity'] })
    },
  })

  const currentIndex = videos.findIndex((v) => v.id === currentVideo?.id)
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null
  const nextVideo = currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (videos.length === 0 && !hasCurriculum) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Play className="w-16 h-16 text-muted-foreground/50" />
        <h2 className="text-xl font-bold text-foreground">Khoá học chưa có nội dung</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Giáo viên chưa thêm video hoặc mục lục bài học. Vui lòng quay lại sau.
        </p>
        <Link to="/student/my-courses" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
          ← Quay lại khoá học
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background protected-content">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top nav — Udemy style với progress badge */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/50 flex-shrink-0">
          <Link
            to="/student/my-courses"
            className="text-muted-foreground hover:text-foreground transition-colors p-2 -m-2 rounded-lg hover:bg-accent
                       min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ touchAction: 'manipulation' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-medium text-foreground truncate flex-1">
            {hasCurriculum
              ? (currentLesson?.title || 'Chọn bài học bên sidebar')
              : (currentVideo?.title || 'Đang tải...')}
          </h1>

          {/* Your progress badge (chuẩn Udemy) */}
          {hasCurriculum ? (
            allLessons.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              bg-purple-500/15 border border-purple-400/30
                              text-purple-700 dark:text-purple-200 text-xs font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>{Math.round((completedLessonIds.size / allLessons.length) * 100)}%</span>
                <span className="text-purple-600/70 dark:text-purple-300/70 font-normal hidden md:inline">tiến độ</span>
              </div>
            )
          ) : (
            videos.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              bg-purple-500/15 border border-purple-400/30
                              text-purple-700 dark:text-purple-200 text-xs font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>{Math.round((videos.filter(v => v.isCompleted).length / videos.length) * 100)}%</span>
                <span className="text-purple-600/70 dark:text-purple-300/70 font-normal hidden md:inline">tiến độ</span>
              </div>
            )
          )}

          <button
            onClick={() => setSidebarOpen((v) => !v)}
            type="button"
            style={{ touchAction: 'manipulation' }}
            aria-label={sidebarOpen ? 'Đóng menu' : 'Mở menu khoá học'}
            className="text-muted-foreground hover:text-foreground transition-colors
                       p-2 -m-2 rounded-lg hover:bg-accent active:bg-accent/80
                       min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* === Main content area: curriculum mode vs legacy video === */}
        <div className="p-4 lg:p-6">
          {hasCurriculum ? (
            /* CURRICULUM MODE: render blocks của current lesson */
            <>
              {!currentLesson ? (
                <div className="aspect-video bg-muted rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Play className="w-16 h-16 opacity-50" />
                  <p className="text-sm">Chọn bài học từ mục lục bên sidebar để bắt đầu</p>
                </div>
              ) : effectiveBlocks.length === 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
                  <FileText className="w-12 h-12 text-amber-400/70 mx-auto mb-3" />
                  <h3 className="font-bold text-amber-200 mb-1">Bài học này chưa có nội dung</h3>
                  <p className="text-xs text-amber-100/70 mb-3">
                    Giáo viên chưa thêm video, tài liệu hay bài tập cho bài học này.
                    Nếu GV vừa thêm xong, bấm "Tải lại" để cập nhật.
                  </p>
                  <button
                    onClick={() => refetchCurriculum()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-bold"
                  >
                    🔄 Tải lại mục lục
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Lesson header */}
                  <div className="rounded-xl border bg-card/40 p-4">
                    <h2 className="text-lg font-bold text-foreground mb-1">{currentLesson.title}</h2>
                    {currentLesson.description && (
                      <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span>{effectiveBlocks.length} block</span>
                      {currentLesson.duration && (
                        <span>· {Math.ceil(currentLesson.duration / 60)} phút</span>
                      )}
                      {completedLessonIds.has(currentLesson.id) && (
                        <span className="text-emerald-400">· ✓ Đã hoàn thành</span>
                      )}
                    </div>
                  </div>

                  {/* Render từng block */}
                  {effectiveBlocks
                    .sort((a, b) => a.position - b.position)
                    .map(block => (
                      <LessonBlockRenderer
                        key={block.id}
                        block={block as unknown as import('@/types').StudentLessonBlock}
                        lessonId={currentLessonId || undefined}
                        onLabPass={() => markLessonComplete(currentLessonId!)}
                      />
                    ))}
                </div>
              )}
            </>
          ) : (
            /* LEGACY MODE: video player */
            <>
              {currentVideo ? (
                <VideoSecurityOverlay videoTitle={currentVideo.title}>
                  <VideoPlayer videoUrl={currentVideo.videoUrl || (currentVideo as { url?: string }).url} />
                </VideoSecurityOverlay>
              ) : (
                <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                  <Play className="w-16 h-16 text-muted-foreground/50" />
                </div>
              )}
              {/* 📄 TRANSCRIPT — chỉ ở legacy video mode */}
              <div className="mt-4">
                <TranscriptPanel
                  videoId={currentVideo?.id || null}
                  videoTitle={currentVideo?.title}
                />
              </div>
            </>
          )}

          {/* Nav controls — chung cho cả 2 mode */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => {
                if (hasCurriculum && prevLesson) setCurrentLessonId(prevLesson.id)
                else if (!hasCurriculum && prevVideo) setCurrentVideo(prevVideo)
              }}
              disabled={hasCurriculum ? !prevLesson : !prevVideo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent text-sm text-foreground/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Trước
            </button>

            {/* Mark complete — different per mode */}
            {hasCurriculum && currentLesson && !completedLessonIds.has(currentLesson.id) && (
              <button
                onClick={() => markLessonComplete(currentLesson.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-700 dark:text-green-400 text-sm border border-green-500/30 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Đánh dấu hoàn thành
              </button>
            )}
            {hasCurriculum && currentLesson && completedLessonIds.has(currentLesson.id) && (
              <span className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
              </span>
            )}
            {!hasCurriculum && currentVideo && !currentVideo.isCompleted && (
              <button
                onClick={() => markComplete.mutate(currentVideo.id)}
                disabled={markComplete.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-700 dark:text-green-400 text-sm border border-green-500/30 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Đánh dấu hoàn thành
              </button>
            )}
            {!hasCurriculum && currentVideo?.isCompleted && (
              <span className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
              </span>
            )}

            <button
              onClick={() => {
                if (labGate.isLocked) {
                  setActiveTab('labs')
                  return
                }
                if (hasCurriculum && nextLesson) setCurrentLessonId(nextLesson.id)
                else if (!hasCurriculum && nextVideo) setCurrentVideo(nextVideo)
              }}
              disabled={hasCurriculum
                ? (!nextLesson && !labGate.isLocked)
                : (!nextVideo && !labGate.isLocked)}
              title={labGate.isLocked
                ? 'Hoàn thành bài tập Lab trước khi qua bài kế tiếp'
                : undefined}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                labGate.isLocked
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                  : 'border hover:bg-accent text-foreground/85'
              )}
            >
              {labGate.isLocked
                ? <><Lock className="w-4 h-4" /> Làm Lab để mở</>
                : <>Tiếp <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 lg:px-6 pb-8">
          <div className="flex gap-1 border-b mb-6 overflow-x-auto">
            {([
              { key: 'overview', label: 'Tổng quan', icon: FileText },
              { key: 'labs', label: `Bài tập Lab${challengeBlocks.length ? ` (${challengeBlocks.length})` : ''}`, icon: Target },
              { key: 'assets', label: 'Tài liệu', icon: Download },
              { key: 'feedback', label: 'Đánh giá', icon: MessageSquare },
              { key: 'history', label: 'Lịch sử', icon: History },
              { key: 'pdfbook', label: 'Sách giáo trình', icon: BookOpen },
            ] as const).map(({ key, label, icon: Icon }) => {
              const hasPdf = courseInfo?.pdfBookUrl
              if (key === 'pdfbook' && !hasPdf) return null
              if (key === 'labs' && challengeBlocks.length === 0) return null
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    'min-h-[44px] active:bg-accent/50 flex-shrink-0',
                    activeTab === key
                      ? key === 'pdfbook'
                        ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'border-purple-500 text-purple-700 dark:text-purple-300'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              )
            })}
          </div>

          {activeTab === 'overview' && (
            <OverviewTab overview={null} />
          )}
          {activeTab === 'labs' && challengeBlocks.length > 0 && (
            <div className="space-y-6">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                <div className="flex items-center gap-2 mb-1 text-cyan-200 font-bold">
                  <Target className="w-5 h-5" /> Bài tập thực hành Lab
                </div>
                <p className="text-xs text-zinc-400">
                  Bài học này có <b>{challengeBlocks.length}</b> bài tập lab.
                  Hãy lắp mạch theo yêu cầu, mô phỏng, rồi <b>Nộp bài</b> — bạn cần pass HẾT
                  để mở khoá bài học tiếp theo.
                </p>
              </div>
              {challengeBlocks.map(block => (
                <div key={block.id}>
                  {block.title && (
                    <h3 className="text-base font-bold text-foreground mb-3">{block.title}</h3>
                  )}
                  <LabChallengeAttempt
                    blockId={block.id}
                    lessonId={currentVideo?.id}
                    metadata={block.metadata as unknown as LabChallengeMetadata}
                    onPass={() => qc.invalidateQueries({ queryKey: ['course-videos', courseId] })}
                  />
                </div>
              ))}
            </div>
          )}
          {activeTab === 'assets' && courseId && (
            <AssetsTab courseId={courseId} />
          )}
          {activeTab === 'feedback' && courseId && (
            <FeedbackTab courseId={courseId} />
          )}
          {activeTab === 'history' && courseId && (
            <CourseHistoryTimeline courseId={courseId} limit={200} />
          )}
          {activeTab === 'pdfbook' && (
            courseInfo?.pdfBookUrl ? (
              <PdfBookViewer
                pdfUrl={courseInfo.pdfBookUrl}
                title={courseInfo?.title ? `Sách: ${courseInfo.title}` : 'Sách giáo trình'}
                compact
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <BookOpen className="w-12 h-12 opacity-30" />
                <p className="text-sm">Khoá học chưa có sách giáo trình PDF.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Sidebar — Desktop: column flex-shrink-0 inline; Mobile: drawer overlay fixed */}
      {sidebarOpen && (
        <>
          {/* MOBILE backdrop — bấm để đóng */}
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="lg:w-80 lg:flex-shrink-0 lg:static lg:border-l
                       fixed top-0 right-0 z-50 h-full w-[85vw] max-w-sm
                       bg-card/95 backdrop-blur-md border-l
                       overflow-hidden flex flex-col
                       shadow-2xl lg:shadow-none"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Nội dung khoá học</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {courseId && hasCurriculum ? (
                <CurriculumSidebar
                  chapters={curriculum}
                  currentLessonId={currentLessonId}
                  completedLessonIds={completedLessonIds}
                  onSelectLesson={(lessonId) => {
                    setCurrentLessonId(lessonId)
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setSidebarOpen(false)
                    }
                  }}
                />
              ) : courseId ? (
                <VideoSidebar
                  videos={videos}
                  currentVideoId={currentVideo?.id || ''}
                  onSelect={(v) => {
                    setCurrentVideo(v)
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setSidebarOpen(false)
                    }
                  }}
                  courseId={courseId}
                />
              ) : null}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
