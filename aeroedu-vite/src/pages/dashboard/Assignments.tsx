/**
 * Assignments — Dashboard học tập
 * Mapping từ: app/(dashboard)/(routes)/ai-tutor/assignments/page.tsx
 * Dark-first Tailwind classes, useQuery + assignmentsService
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Clock, CheckCircle, Play, Star, Target,
  Search, Award, Zap, Brain, FileText, RefreshCw,
  GraduationCap, Layers, Trophy
} from 'lucide-react'
import { assignmentsService } from '@/services/assignments.service'
import type { Assignment, AssignmentStatus } from '@/services/assignments.service'
import { QuickScanQr } from '@/components/common/QuickScanQr'

// ── Demo data (fallback khi API lỗi) ───────────────────────────────────
const DEMO: Assignment[] = [
  {
    id: 'math-quadratic-1', title: 'Phương trình bậc hai', subject: 'Toán',
    type: 'lesson', status: 'completed', difficulty: 'medium', duration: 45,
    xpReward: 150, accuracy: 92, completedAt: '2024-10-18', assignedAt: '2024-10-18',
    description: 'Giải các bài toán phương trình bậc hai từ cơ bản đến nâng cao',
    tags: ['algebra', 'quadratic'], aiGenerated: true, progress: 100,
  },
  {
    id: 'physics-motion-1', title: 'Chuyển động thẳng đều', subject: 'Vật lý',
    type: 'lesson', status: 'completed', difficulty: 'easy', duration: 30,
    xpReward: 100, accuracy: 88, completedAt: '2024-10-17', assignedAt: '2024-10-17',
    description: 'Phân tích chuyển động thẳng đều và các đại lượng liên quan',
    tags: ['kinematics', 'motion'], progress: 100,
  },
  {
    id: 'chemistry-atom-1', title: 'Cấu tạo nguyên tử', subject: 'Hoá học',
    type: 'quiz', status: 'in-progress', difficulty: 'medium', duration: 40,
    xpReward: 125, assignedAt: '2024-10-16',
    description: 'Cấu tạo nguyên tử và bảng tuần hoàn nguyên tố',
    tags: ['atomic', 'chemistry'], aiGenerated: true, progress: 65,
  },
  {
    id: 'math-trig-1', title: 'Hàm số lượng giác', subject: 'Toán',
    type: 'lesson', status: 'pending', difficulty: 'hard', duration: 60,
    xpReward: 200, assignedAt: '2024-10-19',
    description: 'Tính chất và đồ thị hàm lượng giác',
    tags: ['trigonometry'], progress: 0,
  },
  {
    id: 'bio-photo-1', title: 'Quang hợp và hô hấp', subject: 'Sinh học',
    type: 'lesson', status: 'recommended', difficulty: 'easy', duration: 35,
    xpReward: 110, assignedAt: '2024-10-20',
    description: 'So sánh hai quá trình trao đổi chất cơ bản',
    tags: ['biology', 'metabolism'], aiGenerated: true, progress: 0,
  },
  {
    id: 'physics-newton-1', title: 'Định luật Newton', subject: 'Vật lý',
    type: 'quiz', status: 'pending', difficulty: 'medium', duration: 50,
    xpReward: 175, assignedAt: '2024-10-21',
    description: 'Áp dụng 3 định luật Newton vào bài toán thực tế',
    tags: ['mechanics', 'newton'], progress: 0,
  },
  {
    id: 'math-integral-1', title: 'Tích phân cơ bản', subject: 'Toán',
    type: 'lesson', status: 'in-progress', difficulty: 'hard', duration: 60,
    xpReward: 200, assignedAt: '2024-10-18',
    description: 'Học về tích phân và các phương pháp tính tích phân',
    tags: ['calculus', 'integration'], aiGenerated: true, progress: 30,
  },
  {
    id: 'ai-recommend-1', title: 'Bài tập tổng hợp Toán-Lý', subject: 'Toán',
    type: 'project', status: 'recommended', difficulty: 'medium', duration: 90,
    xpReward: 250, assignedAt: '2024-10-22',
    description: 'AI đề xuất: Bài tập liên môn giúp củng cố kiến thức Toán và Vật lý',
    tags: ['interdisciplinary', 'ai-recommended'], aiGenerated: true, progress: 0,
  },
]

const FILTERS: { value: AssignmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'in-progress', label: '🔄 Đang học' },
  { value: 'pending', label: '⏳ Chờ học' },
  { value: 'recommended', label: '🤖 AI đề xuất' },
  { value: 'completed', label: '✅ Hoàn thành' },
]

const SUBJECT_ICON: Record<string, string> = {
  'Toán': '🧮', 'Vật lý': '⚛️', 'Hoá học': '🧪', 'Sinh học': '🧬',
  'mathematics': '🧮', 'physics': '⚛️', 'chemistry': '🧪', 'biology': '🧬',
  'programming': '💻', 'ai_ml': '🤖',
}
const getSubjectIcon = (s: string) => SUBJECT_ICON[s] ?? '📚'

const DIFFICULTY_STYLE: Record<string, string> = {
  easy:   'bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,50%)] border border-[hsl(142,76%,36%)]/15',
  medium: 'bg-[hsl(38,92%,50%)]/10  text-[hsl(38,92%,60%)]  border border-[hsl(38,92%,50%)]/15',
  hard:   'bg-[hsl(0,84%,60%)]/10   text-[hsl(0,84%,65%)]   border border-[hsl(0,84%,60%)]/15',
}
const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' }

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  completed:    CheckCircle,
  'in-progress': Play,
  pending:      Clock,
  recommended:  Brain,
}
const STATUS_COLOR: Record<string, string> = {
  completed:    'bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,50%)]',
  'in-progress': 'bg-[hsl(210,90%,60%)]/10 text-[hsl(210,90%,65%)]',
  pending:       'bg-[hsl(38,92%,50%)]/10  text-[hsl(38,92%,60%)]',
  recommended:   'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,70%)]',
}
const STATUS_LABEL: Record<string, string> = {
  completed: 'Hoàn thành', 'in-progress': 'Đang học', pending: 'Chờ học', recommended: 'AI đề xuất',
}

// ── Assignment Card ──────────────────────────────────────────────────────
function AssignmentCard({ a, onStart }: { a: Assignment; onStart: (id: string) => void }) {
  const Icon = STATUS_ICON[a.status] ?? Clock
  const isComplete = a.status === 'completed'
  const isRecommended = a.status === 'recommended'

  return (
    <div className={`group bg-white/[0.02] backdrop-blur-xl rounded-2xl border transition-all duration-200 p-5 hover:bg-white/[0.04] cursor-default ${
      isRecommended
        ? 'border-[hsl(262,83%,58%)]/25 hover:border-[hsl(262,83%,58%)]/40'
        : isComplete
        ? 'border-[hsl(142,76%,36%)]/20 hover:border-[hsl(142,76%,36%)]/35'
        : 'border-white/[0.06] hover:border-white/[0.10]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
            isComplete ? 'bg-[hsl(142,76%,36%)]/10' :
            a.status === 'in-progress' ? 'bg-[hsl(210,90%,60%)]/10' :
            isRecommended ? 'bg-[hsl(262,83%,58%)]/10' : 'bg-white/[0.04]'
          }`}>
            {getSubjectIcon(a.subject)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {a.aiGenerated && (
                <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,70%)] border border-[hsl(262,83%,58%)]/15 font-semibold">
                  🤖 AI
                </span>
              )}
              <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_STYLE[a.difficulty]}`}>
                {DIFFICULTY_LABEL[a.difficulty]}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white/85 line-clamp-2 leading-snug">{a.title}</h3>
            <p className="text-[0.7rem] text-white/40 mt-0.5">{a.subject}</p>
          </div>
        </div>
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isComplete ? 'bg-[hsl(142,76%,36%)]/10' :
          a.status === 'in-progress' ? 'bg-[hsl(210,90%,60%)]/10' :
          isRecommended ? 'bg-[hsl(262,83%,58%)]/10' : 'bg-white/[0.04]'
        }`}>
          <Icon className={`w-4 h-4 ${
            isComplete ? 'text-[hsl(142,76%,50%)]' :
            a.status === 'in-progress' ? 'text-[hsl(210,90%,65%)]' :
            isRecommended ? 'text-[hsl(262,83%,70%)]' : 'text-white/25'
          }`} />
        </div>
      </div>

      <p className="text-[0.72rem] text-white/35 mb-3 line-clamp-2 leading-relaxed">{a.description}</p>

      {/* Progress bar */}
      {a.progress !== undefined && a.progress > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[0.6rem] text-white/30 mb-1">
            <span>Tiến độ</span><span>{a.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete
                  ? 'bg-gradient-to-r from-[hsl(142,76%,36%)] to-[hsl(175,80%,50%)]'
                  : 'bg-gradient-to-r from-[hsl(245,85%,65%)] to-[hsl(262,83%,58%)]'
              }`}
              style={{ width: `${a.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status badge */}
      <div className="mb-3">
        <span className={`text-[0.6rem] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status]}`}>
          {STATUS_LABEL[a.status]}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 text-[0.65rem] text-white/30">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.duration}m</span>
          <span className="flex items-center gap-1 text-[hsl(38,92%,60%)]"><Zap className="w-3 h-3" />+{a.xpReward} XP</span>
          {a.accuracy && (
            <span className="flex items-center gap-1 text-[hsl(142,76%,50%)]"><Star className="w-3 h-3" />{a.accuracy}%</span>
          )}
        </div>
        {!isComplete && (
          <button
            onClick={() => onStart(a.id)}
            className={`text-[0.72rem] px-3 py-1.5 rounded-lg font-semibold transition-all ${
              isRecommended
                ? 'bg-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,70%)] border border-[hsl(262,83%,58%)]/25 hover:bg-[hsl(262,83%,58%)]/30'
                : a.status === 'in-progress'
                ? 'bg-[hsl(210,90%,60%)]/15 text-[hsl(210,90%,65%)] border border-[hsl(210,90%,60%)]/20 hover:bg-[hsl(210,90%,60%)]/25'
                : 'bg-white/[0.06] text-white/60 border border-white/[0.08] hover:bg-white/[0.10]'
            }`}
          >
            {a.status === 'in-progress' ? 'Tiếp tục' : 'Bắt đầu'}
          </button>
        )}
        {isComplete && (
          <div className="flex items-center gap-1 text-[0.6rem] text-[hsl(142,76%,50%)]">
            <Trophy className="w-3 h-3" />
            <span>Hoàn thành</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function AssignmentsPage() {
  const [filter, setFilter] = useState<AssignmentStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'xp' | 'difficulty' | 'progress'>('date')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => assignmentsService.getAll(),
    retry: 1,
  })
  const assignments: Assignment[] = (data && data.length > 0) ? data : DEMO

  const startMut = useMutation({
    mutationFn: (id: string) => assignmentsService.updateProgress(id, 1),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const refreshMut = useMutation({
    mutationFn: () => assignmentsService.getAiRecommended(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const filtered = useMemo(() => {
    let list = filter === 'all' ? assignments : assignments.filter((a) => a.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'xp': return b.xpReward - a.xpReward
        case 'difficulty': {
          const o = { easy: 1, medium: 2, hard: 3 }
          return (o[a.difficulty] ?? 2) - (o[b.difficulty] ?? 2)
        }
        case 'progress': return (b.progress || 0) - (a.progress || 0)
        default: return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
      }
    })
  }, [assignments, filter, search, sortBy])

  const stats = useMemo(() => ({
    total:       assignments.length,
    completed:   assignments.filter((a) => a.status === 'completed').length,
    inProgress:  assignments.filter((a) => a.status === 'in-progress').length,
    pending:     assignments.filter((a) => a.status === 'pending').length,
    recommended: assignments.filter((a) => a.status === 'recommended').length,
    totalXP:     assignments.filter((a) => a.status === 'completed').reduce((s, a) => s + a.xpReward, 0),
  }), [assignments])

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* ===== HEADER ===== */}
      <div className="px-6 pt-6 pb-2">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(262,83%,58%)] flex items-center justify-center shadow-[0_0_16px_rgba(140,100,240,0.2)]">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white/90">Bài Tập</h1>
              <p className="text-[0.65rem] text-white/30">Theo dõi và hoàn thành bài tập cá nhân hóa từ AI</p>
            </div>
          </div>
          <button
            onClick={() => refreshMut.mutate()}
            disabled={refreshMut.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[hsl(262,83%,58%)]/10 border border-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,70%)] text-xs font-medium hover:bg-[hsl(262,83%,58%)]/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshMut.isPending ? 'animate-spin' : ''}`} />
            Refresh AI
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-4">

          {/* ---- QR TRUY CẬP NHANH BÀI TẬP ---- */}
          <QuickScanQr
            accent="indigo"
            title="Quét QR để làm bài tập ngay trên điện thoại"
            description="Học sinh mở camera quét QR là vào thẳng danh sách bài tập này — nhanh hơn gõ link. Giáo viên có thể tải PNG về in dán bảng lớp để cả lớp tự vào làm bài."
            downloadName="assignments-qr.png"
          />

          {/* ---- STATS ROW ---- */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Tổng bài',   value: stats.total,       color: 'text-white/70',            bg: 'bg-white/[0.03]',              border: 'border-white/[0.06]' },
              { label: 'Hoàn thành', value: stats.completed,   color: 'text-[hsl(142,76%,50%)]',  bg: 'bg-[hsl(142,76%,36%)]/[0.06]', border: 'border-[hsl(142,76%,36%)]/15' },
              { label: 'Đang học',   value: stats.inProgress,  color: 'text-[hsl(210,90%,65%)]',  bg: 'bg-[hsl(210,90%,60%)]/[0.06]', border: 'border-[hsl(210,90%,60%)]/15' },
              { label: 'Chờ học',    value: stats.pending,     color: 'text-[hsl(38,92%,60%)]',   bg: 'bg-[hsl(38,92%,50%)]/[0.06]',  border: 'border-[hsl(38,92%,50%)]/15' },
              { label: 'AI đề xuất', value: stats.recommended, color: 'text-[hsl(262,83%,70%)]',  bg: 'bg-[hsl(262,83%,58%)]/[0.06]', border: 'border-[hsl(262,83%,58%)]/15' },
              { label: 'XP kiếm được', value: `${stats.totalXP} ⚡`, color: 'text-[hsl(38,92%,60%)]', bg: 'bg-[hsl(38,92%,50%)]/[0.04]', border: 'border-[hsl(38,92%,50%)]/10' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 text-center border ${s.bg} ${s.border}`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[0.6rem] text-white/30 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ---- CONTROLS ---- */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bài tập, môn học, thẻ tag..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-[hsl(245,85%,65%)]/40 focus:bg-white/[0.06] transition-all"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/60 outline-none focus:border-[hsl(245,85%,65%)]/40 transition-all"
            >
              <option value="date">Theo ngày</option>
              <option value="xp">Theo XP</option>
              <option value="difficulty">Theo độ khó</option>
              <option value="progress">Theo tiến độ</option>
            </select>
          </div>

          {/* ---- FILTER TABS ---- */}
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  filter === f.value
                    ? 'bg-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,70%)] border border-[hsl(262,83%,58%)]/30'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ---- GRID ---- */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-56 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
              {filtered.map((a) => (
                <AssignmentCard
                  key={a.id}
                  a={a}
                  onStart={(id) => startMut.mutate(id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 pb-8">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-white/10" />
              </div>
              <p className="text-sm font-medium text-white/40 mb-1">Không tìm thấy bài tập nào</p>
              <p className="text-[0.72rem] text-white/25">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
