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
import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react'
import { learningService } from '@/services/learning.service'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { CourseHistoryTimeline } from '@/components/student/CourseHistoryTimeline'
import VideoSecurityOverlay from '@/components/learning/VideoSecurityOverlay'
import type { CourseVideo } from '@/types'

// ── Video Player ────────────────────────────────────────────
function VideoPlayer({ videoUrl }: { videoUrl?: string | null }) {
  // Defensive: nếu DB row có url=NULL hoặc API response thiếu field
  // → render placeholder thay vì crash ".includes of undefined".
  if (!videoUrl) {
    return (
      <div className="relative w-full aspect-video bg-zinc-900 rounded-xl overflow-hidden
                      flex flex-col items-center justify-center text-gray-400 gap-2">
        <Play className="w-12 h-12 opacity-40" />
        <p className="text-sm">Video chưa có URL hợp lệ</p>
        <p className="text-[10px] text-gray-600">Liên hệ giáo viên để cập nhật</p>
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

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="p-4 border-b border-white/10 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300 font-medium">Tiến độ</span>
          <span className="text-purple-300">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-purple-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {completedCount}/{videos.length} bài đã hoàn thành
        </p>
      </div>

      {/* Video list — touch-action manipulation để bỏ 300ms tap delay trên mobile */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {videos.map((video, idx) => (
          <button
            key={video.id}
            onClick={() => onSelect(video)}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
              'min-h-[56px] active:scale-[0.98]',  // 56px Apple HIG touch target + tactile feedback
              video.id === currentVideoId
                ? 'bg-purple-600/30 border border-purple-500/50'
                : 'hover:bg-white/5 active:bg-white/10'
            )}
          >
            {video.isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            ) : video.id === currentVideoId ? (
              <Play className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-medium truncate',
                  video.id === currentVideoId ? 'text-purple-300' : 'text-gray-300'
                )}
              >
                {idx + 1}. {video.title}
              </p>
              {video.duration && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Certificate button */}
      {progress >= 100 && (
        <div className="p-4 border-t border-white/10">
          <Link
            to={`/student/certificate/${courseId}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-medium text-sm transition-colors border border-yellow-500/30"
          >
            <Trophy className="w-4 h-4" />
            Nhận chứng chỉ
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Tabs: Overview / Assets / Feedback / History ────────────
type Tab = 'overview' | 'assets' | 'feedback' | 'history'

function OverviewTab({ overview }: { overview: string | null }) {
  return (
    <div
      className="tiptap-display text-gray-300 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: overview || '<p>Chưa có mô tả.</p>' }}
    />
  )
}

function AssetsTab({ courseId }: { courseId: string }) {
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['course-assets', courseId],
    queryFn: () => learningService.getCourseAssets(courseId),
  })

  if (isLoading) return <div className="text-gray-400 text-sm">Đang tải...</div>

  if (assets.length === 0)
    return <div className="text-gray-500 text-sm">Khoá học chưa có tài liệu đính kèm.</div>

  return (
    <div className="space-y-2">
      {assets.map((asset) => (
        <a
          key={asset.id}
          href={asset.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{asset.title}</p>
            <p className="text-xs text-gray-500 uppercase">{asset.fileType}</p>
          </div>
          <Download className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
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
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-4">
        <h4 className="font-semibold text-white text-sm">Đánh giá khoá học</h4>

        {/* Star rating */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              className={cn('w-7 h-7', s <= rating ? 'text-yellow-400' : 'text-gray-600')}
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
          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 transition-colors"
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
        <div className="text-gray-400 text-sm">Đang tải...</div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 text-sm">Chưa có đánh giá nào.</p>
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
                  <span className="text-sm font-medium text-white">{r.user.name}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          'w-3 h-3',
                          s <= r.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-300">{r.comment}</p>
                <p className="text-xs text-gray-500">
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
    select: (data) => {
      // Set first video if none selected
      if (!currentVideo && data.length > 0) {
        setCurrentVideo(data[0])
      }
      return data
    },
  })

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

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Play className="w-16 h-16 text-gray-600" />
        <h2 className="text-xl font-bold text-white">Khoá học chưa có video</h2>
        <Link to="/student/my-courses" className="text-purple-400 hover:text-purple-300">
          ← Quay lại khoá học
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top nav */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gray-900/50 flex-shrink-0">
          <Link
            to="/student/my-courses"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-medium text-white truncate flex-1">
            {currentVideo?.title || 'Đang tải...'}
          </h1>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            type="button"
            style={{ touchAction: 'manipulation' }}
            aria-label={sidebarOpen ? 'Đóng menu' : 'Mở menu khoá học'}
            className="text-gray-400 hover:text-white transition-colors
                       p-2 -m-2 rounded-lg hover:bg-white/10 active:bg-white/20
                       min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Video — wrap với VideoSecurityOverlay (watermark + chống quay) */}
        <div className="p-4 lg:p-6">
          {currentVideo ? (
            <VideoSecurityOverlay videoTitle={currentVideo.title}>
              <VideoPlayer videoUrl={currentVideo.videoUrl || (currentVideo as any).url} />
            </VideoSecurityOverlay>
          ) : (
            <div className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center">
              <Play className="w-16 h-16 text-gray-600" />
            </div>
          )}

          {/* Nav controls */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => prevVideo && setCurrentVideo(prevVideo)}
              disabled={!prevVideo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 text-sm text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Trước
            </button>

            {currentVideo && !currentVideo.isCompleted && (
              <button
                onClick={() => markComplete.mutate(currentVideo.id)}
                disabled={markComplete.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm border border-green-500/30 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Đánh dấu hoàn thành
              </button>
            )}
            {currentVideo?.isCompleted && (
              <span className="flex items-center gap-1 text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
              </span>
            )}

            <button
              onClick={() => nextVideo && setCurrentVideo(nextVideo)}
              disabled={!nextVideo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 text-sm text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Tiếp <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 lg:px-6 pb-8">
          <div className="flex gap-1 border-b border-white/10 mb-6">
            {([
              { key: 'overview', label: 'Tổng quan', icon: FileText },
              { key: 'assets', label: 'Tài liệu', icon: Download },
              { key: 'feedback', label: 'Đánh giá', icon: MessageSquare },
              { key: 'history', label: 'Lịch sử', icon: History },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                type="button"
                style={{ touchAction: 'manipulation' }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  'min-h-[44px] active:bg-white/5',  // touch target + tactile
                  activeTab === key
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-gray-400 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <OverviewTab overview={null} />
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
            className="lg:w-80 lg:flex-shrink-0 lg:static lg:border-l lg:border-white/10
                       fixed top-0 right-0 z-50 h-full w-[85vw] max-w-sm
                       bg-gray-900/95 backdrop-blur-md
                       overflow-hidden flex flex-col
                       shadow-2xl lg:shadow-none"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Nội dung khoá học</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {courseId && (
                <VideoSidebar
                  videos={videos}
                  currentVideoId={currentVideo?.id || ''}
                  onSelect={(v) => {
                    setCurrentVideo(v)
                    // Auto-đóng sidebar trên mobile khi chọn video → user thấy player ngay
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setSidebarOpen(false)
                    }
                  }}
                  courseId={courseId}
                />
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
