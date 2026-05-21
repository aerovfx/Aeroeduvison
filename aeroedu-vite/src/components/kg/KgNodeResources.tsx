/**
 * KgNodeResources — Học liệu liên quan tới 1 KG node.
 *
 * Hiển thị 5 nhóm tài nguyên match theo label/alias node:
 *   - Bài học (Lesson trong curriculum)
 *   - Block (LessonBlock, đặc biệt lab challenge có badge 🏆)
 *   - Đề thi (Exam đã publish)
 *   - Video bài giảng (CourseVideo)
 *   - Lộ trình (LearningPath)
 *
 * Mỗi item là 1 link clickable mở tới đúng nơi học.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, FileText, ClipboardCheck, Video, GitBranch, Loader2,
  ExternalLink, Trophy, AlertCircle, Sparkles,
} from 'lucide-react'
import { api } from '@/services/api'

interface ResourcesData {
  node: { id: string; label: string; type: string }
  searchTerms: string[]
  lessons: Array<{
    id: string; title: string; description: string | null
    duration: number | null; courseId: string | null; courseTitle: string | null
    link: string | null
  }>
  blocks: Array<{
    id: string; type: string; title: string | null
    isChallenge: boolean; lessonId: string; lessonTitle: string | null
    courseId: string | null; courseTitle: string | null; link: string | null
  }>
  exams: Array<{
    id: string; title: string; duration: number | null
    totalQuestions: number | null; totalScore: number | null; link: string
  }>
  videos: Array<{
    id: string; title: string; thumbUrl: string | null
    duration: number | null; courseId: string | null; link: string | null
  }>
  paths: Array<{
    id: string; name: string; description: string | null
    totalXP: number | null; estimatedDays: number | null; link: string
  }>
}

interface Props {
  nodeId: string
  nodeLabel: string
}

const fmtDuration = (s: number | null | undefined) => {
  if (!s || s < 1) return ''
  const mins = Math.floor(s / 60)
  return mins > 0 ? `${mins} phút` : `${s}s`
}

export default function KgNodeResources({ nodeId, nodeLabel }: Props) {
  const [data, setData] = useState<ResourcesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    api.get<ResourcesData>(`/kg/node/${encodeURIComponent(nodeId)}/resources`)
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [nodeId])

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center text-zinc-400 text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        Đang tìm học liệu liên quan tới "{nodeLabel}"...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-300">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Không tải được học liệu. Hãy thử lại sau.
      </div>
    )
  }

  const totalItems = data.lessons.length + data.blocks.length + data.exams.length
                   + data.videos.length + data.paths.length

  if (totalItems === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center text-xs text-zinc-400">
        <Sparkles className="w-4 h-4 inline mr-2 text-amber-400" />
        Chưa có học liệu tham khảo cho khái niệm này.<br />
        <span className="text-[10px] text-zinc-500">
          Giáo viên có thể thêm bài học/đề thi với tiêu đề chứa "{nodeLabel}".
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
        <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Học liệu liên quan ({totalItems})
        </div>
        <p className="text-[11px] text-cyan-100/80">
          Tài nguyên tự động được liên kết theo từ khoá <strong>"{nodeLabel}"</strong>.
          Click bất kỳ mục nào để bắt đầu học.
        </p>
      </div>

      {/* ── Lessons ── */}
      {data.lessons.length > 0 && (
        <SectionCard icon={<BookOpen className="w-4 h-4" />} title="Bài học" count={data.lessons.length} color="purple">
          {data.lessons.map(l => (
            <ResourceLink key={l.id} to={l.link} title={l.title}
              subtitle={l.courseTitle ? `${l.courseTitle}${l.duration ? ` · ${fmtDuration(l.duration)}` : ''}` : (l.duration ? fmtDuration(l.duration) : '')}
              description={l.description}
            />
          ))}
        </SectionCard>
      )}

      {/* ── Blocks (Lab challenges + content blocks) ── */}
      {data.blocks.length > 0 && (
        <SectionCard icon={<FileText className="w-4 h-4" />} title="Hoạt động trong bài" count={data.blocks.length} color="amber">
          {data.blocks.map(b => (
            <ResourceLink key={b.id} to={b.link}
              title={b.title || `Block ${b.type}`}
              badge={b.isChallenge
                ? { text: 'BÀI TẬP', color: 'amber' }
                : { text: b.type.toUpperCase(), color: 'cyan' }}
              icon={b.isChallenge ? <Trophy className="w-3 h-3" /> : null}
              subtitle={b.lessonTitle ? `${b.lessonTitle}${b.courseTitle ? ` · ${b.courseTitle}` : ''}` : null}
            />
          ))}
        </SectionCard>
      )}

      {/* ── Exams ── */}
      {data.exams.length > 0 && (
        <SectionCard icon={<ClipboardCheck className="w-4 h-4" />} title="Đề thi & Quiz" count={data.exams.length} color="rose">
          {data.exams.map(e => (
            <ResourceLink key={e.id} to={e.link} title={e.title}
              subtitle={[
                e.totalQuestions ? `${e.totalQuestions} câu` : null,
                e.duration ? `${e.duration} phút` : null,
                e.totalScore ? `Tối đa ${e.totalScore} điểm` : null,
              ].filter(Boolean).join(' · ')}
            />
          ))}
        </SectionCard>
      )}

      {/* ── Videos ── */}
      {data.videos.length > 0 && (
        <SectionCard icon={<Video className="w-4 h-4" />} title="Video bài giảng" count={data.videos.length} color="blue">
          {data.videos.map(v => (
            <ResourceLink key={v.id} to={v.link} title={v.title}
              subtitle={v.duration ? fmtDuration(v.duration) : ''}
              thumbUrl={v.thumbUrl}
            />
          ))}
        </SectionCard>
      )}

      {/* ── Learning paths ── */}
      {data.paths.length > 0 && (
        <SectionCard icon={<GitBranch className="w-4 h-4" />} title="Lộ trình học" count={data.paths.length} color="emerald">
          {data.paths.map(p => (
            <ResourceLink key={p.id} to={p.link} title={p.name}
              description={p.description}
              subtitle={[
                p.estimatedDays ? `~${p.estimatedDays} ngày` : null,
                p.totalXP ? `${p.totalXP} XP` : null,
              ].filter(Boolean).join(' · ')}
            />
          ))}
        </SectionCard>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  purple:  { text: 'text-purple-300',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30' },
  amber:   { text: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  rose:    { text: 'text-rose-300',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30' },
  blue:    { text: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  cyan:    { text: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30' },
}

function SectionCard({
  icon, title, count, color, children,
}: {
  icon: React.ReactNode; title: string; count: number; color: string; children: React.ReactNode
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.cyan
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-2.5`}>
      <div className={`flex items-center gap-2 px-1 pb-2 mb-2 border-b ${c.border}`}>
        <span className={c.text}>{icon}</span>
        <h4 className={`text-xs font-bold ${c.text}`}>{title}</h4>
        <span className="ml-auto text-[10px] text-zinc-500">{count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function ResourceLink({
  to, title, subtitle, description, badge, icon, thumbUrl,
}: {
  to: string | null
  title: string
  subtitle?: string | null
  description?: string | null
  badge?: { text: string; color: string }
  icon?: React.ReactNode
  thumbUrl?: string | null
}) {
  const Inner = (
    <div className={`flex items-start gap-2.5 p-2 rounded-lg ${to ? 'hover:bg-white/5 cursor-pointer' : 'opacity-60'} transition-colors`}>
      {thumbUrl ? (
        <img src={thumbUrl} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" />
      ) : icon ? (
        <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center flex-shrink-0 text-amber-400">
          {icon}
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-zinc-100 truncate">{title}</span>
          {badge && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              COLOR_MAP[badge.color]?.bg || 'bg-cyan-500/15'
            } ${COLOR_MAP[badge.color]?.text || 'text-cyan-300'} ${
              COLOR_MAP[badge.color]?.border || 'border-cyan-500/40'
            } border`}>
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && <div className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</div>}
        {description && (
          <div className="text-[10.5px] text-zinc-400 mt-1 line-clamp-2">{description}</div>
        )}
      </div>
      {to && <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />}
    </div>
  )

  if (!to) return Inner
  return <Link to={to}>{Inner}</Link>
}
