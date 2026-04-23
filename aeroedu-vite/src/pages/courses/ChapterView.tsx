import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesService } from '@/services/courses.service'
import {
  ChevronLeft, ChevronRight, CheckCircle2, FileText,
  BookOpen, Loader2, Volume2, Maximize2, Play, ThumbsUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const DEMO_CHAPTER = {
  id: 'ch-2',
  name: 'Động lực học chuyển động thẳng',
  description: 'Nghiên cứu về vận tốc, gia tốc và chuyển động thẳng đều và biến đổi đều.',
  videoUrl: 'https://www.youtube.com/embed/ZM8ECpBuQYE', // Demo YouTube embed
  muxPlaybackId: null,
  content: `## Mục tiêu bài học

Sau bài học này, bạn sẽ có thể:
- Phân biệt **chuyển động thẳng đều** và **chuyển động thẳng biến đổi đều**
- Tính toán vận tốc trung bình và tức thời
- Áp dụng phương trình chuyển động để giải bài tập

---

## 1. Vận tốc và tốc độ

**Tốc độ trung bình** là đại lượng vô hướng:

\`\`\`
v_tb = s / t
\`\`\`

**Vận tốc tức thời** là giới hạn của tỉ số Δs/Δt khi Δt → 0.

---

## 2. Gia tốc

Gia tốc là đại lượng đặc trưng cho sự thay đổi vận tốc theo thời gian:

\`\`\`
a = Δv / Δt = (v₂ - v₁) / (t₂ - t₁)
\`\`\`

### Đơn vị: m/s²

---

## 3. Phương trình chuyển động thẳng biến đổi đều

| Đại lượng | Công thức |
|-----------|-----------|
| Vận tốc | v = v₀ + at |
| Quãng đường | s = v₀t + ½at² |
| Vận tốc² | v² = v₀² + 2as |

---

## Bài tập ví dụ

Một xe ô tô bắt đầu từ trạng thái đứng yên, sau 10 giây đạt vận tốc 20 m/s.
Tính gia tốc của xe.

**Giải:**
- v₀ = 0, v = 20 m/s, t = 10 s
- a = (v - v₀) / t = (20 - 0) / 10 = **2 m/s²**
`,
  position: 2,
  duration: 60,
}

const DEMO_PREV = { id: 'ch-1', name: 'Giới thiệu về Cơ học Newtonian' }
const DEMO_NEXT = { id: 'ch-3', name: 'Chuyển động tròn và lực hướng tâm' }

// Simple markdown renderer (enough for the use case)
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inTable = false
  let tableRows: string[][] = []

  const flushTable = (key: string) => {
    if (tableRows.length < 2) return
    const headers = tableRows[0]
    const rows = tableRows.slice(2) // skip separator row
    elements.push(
      <div key={key} className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((h, i) => (
                <th key={i} className="border border-border px-3 py-2 text-left font-semibold text-foreground">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="even:bg-muted/20">
                {row.map((cell, j) => (
                  <td key={j} className="border border-border px-3 py-2 text-muted-foreground">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableRows = []
    inTable = false
  }

  lines.forEach((line, i) => {
    if (line.startsWith('|')) {
      inTable = true
      tableRows.push(line.split('|').filter((_, idx) => idx > 0 && idx < line.split('|').length - 1))
      return
    }
    if (inTable) flushTable(`table-${i}`)

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-3">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-2">{line.slice(4)}</h3>)
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="border-border my-4" />)
    } else if (line.startsWith('```')) {
      // skip fence lines
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={i} className="ml-4 text-sm text-muted-foreground list-disc mb-1">
          {line.slice(2).replace(/\*\*(.*?)\*\*/g, '').trim()}
        </li>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      // Inline bold **text**
      const parts = line.split(/\*\*(.*?)\*\*/g)
      elements.push(
        <p key={i} className="text-sm text-muted-foreground leading-relaxed">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="font-semibold text-foreground">{part}</strong> : part
          )}
        </p>
      )
    }
  })
  if (inTable) flushTable('table-final')

  return <div className="space-y-1">{elements}</div>
}

export default function ChapterViewPage() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCompleted, setIsCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'notes'>('content')
  const [videoReady, setVideoReady] = useState(false)

  const { data: chapterData, isLoading } = useQuery({
    queryKey: ['chapter', courseId, chapterId],
    queryFn: () => coursesService.getChapter(courseId!, chapterId!),
    enabled: !!courseId && !!chapterId,
    retry: false,
  })

  const chapter = chapterData?.chapter || DEMO_CHAPTER
  const nextChapter = chapterData?.nextChapter || DEMO_NEXT
  const prevChapter = DEMO_PREV // API doesn't return prev, use demo

  const markCompleteMutation = useMutation({
    mutationFn: () => coursesService.updateProgress(courseId!, chapterId!, true),
    onSuccess: () => {
      setIsCompleted(true)
      queryClient.invalidateQueries({ queryKey: ['courseProgress', courseId] })
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const videoSrc = (chapter as any).videoUrl || DEMO_CHAPTER.videoUrl

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <Link
          to={`/courses/${courseId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Quay lại khoá học
        </Link>
        <div className="flex items-center gap-2">
          {prevChapter && (
            <Link
              to={`/courses/${courseId}/chapters/${prevChapter.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" /> Trước
            </Link>
          )}
          {nextChapter && (
            <Link
              to={`/courses/${courseId}/chapters/${nextChapter.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
            >
              Tiếp <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 min-h-[calc(100vh-8rem)]">
        {/* Video + Content — left 3/5 */}
        <div className="lg:col-span-3 border-r border-border">
          {/* Video Player */}
          <div className="relative bg-black aspect-video">
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center text-white/60">
                  <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Đang tải video...</p>
                </div>
              </div>
            )}
            <iframe
              src={videoSrc}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setVideoReady(true)}
            />
          </div>

          {/* Chapter title + complete button */}
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-foreground">{(chapter as any).name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{(chapter as any).description}</p>
            </div>
            <button
              onClick={() => markCompleteMutation.mutate()}
              disabled={isCompleted || markCompleteMutation.isPending}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all',
                isCompleted
                  ? 'bg-green-500/10 text-green-600 cursor-default'
                  : 'bg-primary text-white hover:bg-primary/90'
              )}
            >
              {markCompleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['content', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-5 py-3 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'content' ? 'Nội dung bài' : 'Ghi chú'}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'content' ? (
              <MarkdownContent content={(chapter as any).content || DEMO_CHAPTER.content} />
            ) : (
              <div>
                <textarea
                  className="w-full h-48 bg-background border border-border rounded-xl p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Ghi chú của bạn về bài học này..."
                />
                <button className="mt-2 text-xs text-primary hover:underline">Lưu ghi chú</button>
              </div>
            )}
          </div>
        </div>

        {/* Chapter list sidebar — right 2/5 */}
        <div className="lg:col-span-2 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Danh sách chương</h3>
          </div>
          <div className="divide-y divide-border">
            {DEMO_CHAPTER && [DEMO_PREV, DEMO_CHAPTER, DEMO_NEXT].map((ch: any, idx) => {
              const isActive = ch.id === chapterId || ch.id === DEMO_CHAPTER.id
              const isDone = idx === 0
              return (
                <Link
                  key={ch.id}
                  to={`/courses/${courseId}/chapters/${ch.id}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/30',
                    isActive && 'bg-primary/5 border-l-2 border-primary'
                  )}
                >
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className={cn(
                        'text-xs font-bold',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}>{idx + 1}</span>
                    )}
                  </div>
                  <span className={cn(
                    'text-sm truncate',
                    isActive ? 'text-primary font-medium' : isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                  )}>
                    {ch.name}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Feedback section */}
          <div className="px-4 py-4 border-t border-border mt-auto">
            <p className="text-xs text-muted-foreground mb-2">Bài học này có hữu ích không?</p>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20 transition-colors">
                <ThumbsUp className="w-3 h-3" /> Có
              </button>
              <button className="flex items-center gap-1 text-xs px-3 py-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                Cần cải thiện
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
