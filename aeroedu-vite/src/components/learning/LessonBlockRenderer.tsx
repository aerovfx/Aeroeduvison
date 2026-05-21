/**
 * LessonBlockRenderer — Hiển thị 1 LessonBlock cho học sinh trong CoursePlayer.
 *
 * Dispatch theo block.type:
 *   - video      → <video> hoặc YouTube/Vimeo iframe
 *   - pdf        → iframe Google Docs viewer
 *   - text       → RichText HTML rendering
 *   - audio      → <audio>
 *   - quiz       → button mở quiz (link out hoặc inline future)
 *   - pptx       → iframe Office online viewer
 *   - simulation → iframe lab URL
 *   - lab        → LabChallengeAttempt nếu có metadata.challenge, else link
 *   - game       → button mở game tab mới
 *   - link       → card có icon + URL
 *   - embed      → iframe URL với height tuỳ chỉnh
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Video, FileText, Type, Music, HelpCircle, Presentation,
  FlaskConical, Beaker, Gamepad2, Link2, Code2, ExternalLink, Play,
} from 'lucide-react'
import type { StudentLessonBlock } from '@/types'
import { LabChallengeAttempt, type LabChallengeMetadata } from '@/components/iot/LabChallengeBlock'

interface Props {
  block: StudentLessonBlock
  lessonId?: string
  onLabPass?: () => void
}

const BLOCK_ICONS: Record<string, React.FC<{ className?: string }>> = {
  video: Video, pdf: FileText, text: Type, audio: Music, quiz: HelpCircle,
  pptx: Presentation, simulation: FlaskConical, lab: Beaker, game: Gamepad2,
  link: Link2, embed: Code2,
}

const BLOCK_COLORS: Record<string, string> = {
  video: 'text-red-400 bg-red-500/10 border-red-500/30',
  pdf: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  text: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  audio: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  quiz: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  pptx: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  simulation: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  lab: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  game: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  link: 'text-gray-300 bg-white/5 border-white/15',
  embed: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
}

// Convert YouTube watch URL → embed URL
function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    // YouTube
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) return `https://www.youtube.com/embed/${id}`
    }
    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }
    return url
  } catch { return url }
}

export default function LessonBlockRenderer({ block, lessonId, onLabPass }: Props) {
  const Icon = BLOCK_ICONS[block.type] || FileText
  const colorClass = BLOCK_COLORS[block.type] || 'text-gray-400 bg-white/5 border-white/10'
  const meta = block.metadata || {}
  const title = block.title || `${block.type[0].toUpperCase() + block.type.slice(1)}`

  // Block header (luôn render)
  const header = (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider mb-3 border ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{block.type}</span>
    </div>
  )

  // ─── Lab challenge (inline interactive) ─────────────────
  if (block.type === 'lab' && (meta as { challenge?: boolean }).challenge) {
    return (
      <div className="rounded-2xl border border-cyan-500/30 bg-card/50 p-4">
        {header}
        {block.title && <h3 className="text-base font-bold text-foreground mb-3">{block.title}</h3>}
        <LabChallengeAttempt
          blockId={block.id}
          lessonId={lessonId}
          metadata={meta as unknown as LabChallengeMetadata}
          onPass={onLabPass}
        />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card/50 p-4">
      {header}
      {block.title && <h3 className="text-base font-bold text-foreground mb-3">{block.title}</h3>}

      {/* VIDEO */}
      {block.type === 'video' && block.content && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          {block.content.match(/\.(mp4|webm|mov|m4v)(\?|$)/i) ? (
            <video src={block.content} controls className="w-full h-full">
              Trình duyệt không hỗ trợ video.
            </video>
          ) : (
            <iframe
              src={toEmbedUrl(block.content)}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      )}

      {/* PDF */}
      {block.type === 'pdf' && block.content && (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: '70vh' }}>
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(block.content)}&embedded=true`}
            title={title}
            className="w-full h-full"
          />
        </div>
      )}

      {/* TEXT — render HTML từ RichText (đã trusted GV) */}
      {block.type === 'text' && block.content && (
        <div
          className="prose prose-invert max-w-none prose-sm text-foreground/90"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      )}

      {/* AUDIO */}
      {block.type === 'audio' && block.content && (
        <audio src={block.content} controls className="w-full">
          Trình duyệt không hỗ trợ audio.
        </audio>
      )}

      {/* PPTX — Office online viewer */}
      {block.type === 'pptx' && block.content && (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: '70vh' }}>
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(block.content)}`}
            title={title}
            className="w-full h-full"
          />
        </div>
      )}

      {/* SIMULATION / LAB (không challenge) — link out */}
      {(block.type === 'simulation' || block.type === 'lab' || block.type === 'game') && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass.split(' ')[1]}`}>
              <Icon className={`w-6 h-6 ${colorClass.split(' ')[0]}`} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-foreground truncate">{title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {block.type === 'simulation' ? 'Mô phỏng 3D' :
                 block.type === 'lab'        ? 'Phòng thí nghiệm ảo' :
                                               'Trò chơi học tập'}
              </div>
            </div>
          </div>
          {(meta as { path?: string }).path && (
            <Link
              to={(meta as { path: string }).path}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold ${colorClass}`}
            >
              <Play className="w-4 h-4" /> Mở {block.type === 'game' ? 'game' : 'lab'}
            </Link>
          )}
        </div>
      )}

      {/* QUIZ — link out hoặc inline (future) */}
      {block.type === 'quiz' && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-foreground truncate">{title}</div>
              <div className="text-xs text-muted-foreground">
                {(meta as { questionCount?: number }).questionCount
                  ? `${(meta as { questionCount: number }).questionCount} câu hỏi`
                  : 'Bài kiểm tra'}
              </div>
            </div>
          </div>
          {block.content && (
            <Link
              to={`/student/exams/${block.content}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-500/40 text-sm font-bold hover:bg-amber-500/25"
            >
              <Play className="w-4 h-4" /> Làm quiz
            </Link>
          )}
        </div>
      )}

      {/* LINK */}
      {block.type === 'link' && block.content && (
        <a
          href={block.content}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <Link2 className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground truncate">{title}</div>
            <div className="text-xs text-muted-foreground truncate font-mono">{block.content}</div>
            {(meta as { description?: string }).description && (
              <div className="text-xs text-muted-foreground mt-1">{(meta as { description: string }).description}</div>
            )}
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
        </a>
      )}

      {/* EMBED */}
      {block.type === 'embed' && block.content && (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: `${(meta as { height?: number }).height || 480}px` }}>
          <iframe
            src={block.content}
            title={title}
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      )}

      {/* Description / fallback */}
      {!block.content && block.type !== 'lab' && block.type !== 'quiz' && (
        <div className="text-sm text-muted-foreground italic">
          (Block trống — GV chưa cung cấp nội dung)
        </div>
      )}
    </div>
  )
}
