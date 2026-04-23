import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesService } from '@/services/courses.service'
import {
  BookOpen, Clock, BarChart2, Users, Star, PlayCircle,
  CheckCircle2, Lock, ChevronRight, ArrowLeft, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const DEMO_COURSE = {
  id: 'course-1',
  name: 'Vật Lý Cơ Học Nâng Cao',
  description: 'Khám phá các nguyên lý cơ học từ cơ bản đến nâng cao với các thí nghiệm 3D tương tác và bài giảng video chất lượng cao.',
  imageUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&q=80',
  categoryId: 'physics',
  price: 0,
  level: 'Trung cấp',
  duration: 2400,
  enrollCount: 1248,
  rating: 4.8,
  isPublished: true,
  chapters: [
    { id: 'ch-1', name: 'Giới thiệu về Cơ học Newtonian', description: 'Ba định luật Newton và ứng dụng', duration: 45, isFree: true, isPublished: true, position: 1, progress: 100 },
    { id: 'ch-2', name: 'Động lực học chuyển động thẳng', description: 'Vận tốc, gia tốc, quãng đường', duration: 60, isFree: true, isPublished: true, position: 2, progress: 80 },
    { id: 'ch-3', name: 'Chuyển động tròn và lực hướng tâm', description: 'Phân tích chuyển động tròn đều và không đều', duration: 55, isFree: false, isPublished: true, position: 3, progress: 0 },
    { id: 'ch-4', name: 'Định luật bảo toàn năng lượng', description: 'Cơ năng, thế năng, động năng', duration: 70, isFree: false, isPublished: true, position: 4, progress: 0 },
    { id: 'ch-5', name: 'Va chạm và xung lượng', description: 'Va chạm đàn hồi, không đàn hồi', duration: 50, isFree: false, isPublished: true, position: 5, progress: 0 },
    { id: 'ch-6', name: 'Dao động và sóng cơ', description: 'Con lắc đơn, con lắc lò xo, sóng cơ học', duration: 65, isFree: false, isPublished: true, position: 6, progress: 0 },
  ],
  instructor: { name: 'ThS. Nguyễn Văn Khoa', avatar: null, title: 'Giảng viên Vật lý' },
  tags: ['vật lý', 'cơ học', '3D labs', 'nâng cao'],
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} phút`
  return `${h}g ${m}p`
}

export default function CourseViewPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesService.getById(courseId!),
    enabled: !!courseId,
    retry: false,
    // Fallback to demo when API unavailable
    placeholderData: DEMO_COURSE as any,
  })

  const { data: progress } = useQuery({
    queryKey: ['courseProgress', courseId],
    queryFn: () => coursesService.getCourseProgress(courseId!),
    enabled: !!courseId,
    retry: false,
  })

  const displayCourse = course || DEMO_COURSE
  const chapters = (displayCourse as any).chapters || DEMO_COURSE.chapters
  const totalProgress = progress ?? Math.round(
    chapters.filter((c: any) => c.progress === 100).length / chapters.length * 100
  )

  // Find first incomplete chapter for "Continue" button
  const nextChapter = chapters.find((c: any) => !c.progress || c.progress < 100) || chapters[0]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=1200&q=30')] bg-cover bg-center opacity-20" />
        <div className="relative px-6 py-8 max-w-5xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                {DEMO_COURSE.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-white/10 text-white/80 rounded-full">{tag}</span>
                ))}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{(displayCourse as any).name || DEMO_COURSE.name}</h1>
              <p className="text-white/70 text-sm max-w-2xl">{(displayCourse as any).description || DEMO_COURSE.description}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-white/70">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {DEMO_COURSE.rating}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {DEMO_COURSE.enrollCount.toLocaleString()} học viên</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDuration(DEMO_COURSE.duration)}</span>
                <span className="flex items-center gap-1"><BarChart2 className="w-4 h-4" /> {DEMO_COURSE.level}</span>
              </div>
              <p className="text-white/60 text-xs mt-2">Giảng viên: {DEMO_COURSE.instructor.name} — {DEMO_COURSE.instructor.title}</p>
            </div>
          </div>

          {/* Progress bar */}
          {totalProgress > 0 && (
            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Tiến độ</span>
                <span>{totalProgress}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chapter list — left 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Nội dung khoá học
              </h2>
              <span className="text-xs text-muted-foreground">{chapters.length} chương</span>
            </div>
            <div className="divide-y divide-border">
              {chapters.map((chapter: any, idx: number) => {
                const isDone = chapter.progress === 100
                const isInProgress = chapter.progress > 0 && chapter.progress < 100
                const isLocked = !chapter.isFree && idx > 1

                return (
                  <Link
                    key={chapter.id}
                    to={isLocked ? '#' : `/courses/${courseId}/chapters/${chapter.id}`}
                    className={cn(
                      'flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group',
                      isLocked && 'opacity-60 cursor-not-allowed'
                    )}
                    onClick={(e) => isLocked && e.preventDefault()}
                  >
                    {/* Status icon */}
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <div className={cn(
                          'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                          isInProgress ? 'border-primary text-primary' : 'border-border text-muted-foreground group-hover:border-primary group-hover:text-primary'
                        )}>
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                        )}>
                          {chapter.name}
                        </p>
                        {chapter.isFree && !isDone && (
                          <span className="text-xs bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded shrink-0">Miễn phí</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{chapter.description}</p>
                      {isInProgress && (
                        <div className="mt-1.5 h-1 bg-muted rounded-full w-32">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${chapter.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{formatDuration(chapter.duration)}</span>
                      <ChevronRight className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform',
                        !isLocked && 'group-hover:translate-x-0.5 group-hover:text-primary'
                      )} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 sticky top-6">
            <div className="text-2xl font-bold text-foreground mb-1">
              {DEMO_COURSE.price === 0 ? 'Miễn phí' : `${DEMO_COURSE.price.toLocaleString()}đ`}
            </div>

            <Link
              to={`/courses/${courseId}/chapters/${nextChapter?.id}`}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl hover:bg-primary/90 transition-colors font-medium text-sm mt-4"
            >
              <PlayCircle className="w-4 h-4" />
              {totalProgress > 0 ? 'Tiếp tục học' : 'Bắt đầu học'}
            </Link>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số chương</span>
                <span className="font-medium text-foreground">{chapters.length} chương</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thời lượng</span>
                <span className="font-medium text-foreground">{formatDuration(DEMO_COURSE.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cấp độ</span>
                <span className="font-medium text-foreground">{DEMO_COURSE.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Học viên</span>
                <span className="font-medium text-foreground">{DEMO_COURSE.enrollCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đánh giá</span>
                <span className="font-medium text-foreground flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  {DEMO_COURSE.rating}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
