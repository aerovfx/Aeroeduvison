/**
 * LessonAssetEditor — Coursera/Notion-style asset block editor
 *
 * Mỗi bài học chứa N content block (video/pdf/text/audio/quiz/pptx/
 * simulation/lab/game/link/embed) — teacher click "⚙ Asset" trong
 * CurriculumStep → mở fullscreen modal này → add/edit/reorder blocks.
 *
 * Workflow:
 *   1. Teacher tạo Chapter + Lesson (CurriculumStep)
 *   2. Click "⚙ Asset" → mở LessonAssetEditor
 *   3. Click block type button trên top bar → mở inline add form
 *   4. Submit → block xuất hiện trong list bên dưới
 *   5. Reorder ↑↓, edit ✎, delete 🗑
 *
 * Storage: POST/PATCH/DELETE/reorder gọi instructor.service.ts
 *          → /api/instructor/lessons/:lessonId/blocks/...
 *          → BE lưu vào table "LessonBlock"
 */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, Plus, Trash2, Edit3, ArrowUp, ArrowDown, GripVertical, Settings,
  Video, FileText, Type, Music, HelpCircle, Presentation,
  FlaskConical, Beaker, Gamepad2, Link2, Code2, Copy,
  ExternalLink, Clock, Save, Check, AlertCircle, Target, Trophy,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  instructorService,
  type LessonBlock,
  type LessonBlockType,
  type CreateLessonBlockPayload,
} from '@/services/instructor.service'
import { cn } from '@/lib/utils'
import { RichTextEditor } from './RichTextEditor'
import { LabChallengeAuthor, type LabChallengeMetadata } from '@/components/iot/LabChallengeBlock'
import LabAttemptsReviewer from '@/components/iot/LabAttemptsReviewer'
import ExamPicker, { type ExamSummary } from '@/components/teacher/ExamPicker'

/* ─── Block type registry ────────────────────────────────────────── */
interface BlockTypeMeta {
  type: LessonBlockType
  label: string
  emoji: string
  icon: any
  /** Tailwind text + bg + border accent classes */
  color: string
  /** Mô tả ngắn cho UI */
  hint: string
}

const BLOCK_TYPES: BlockTypeMeta[] = [
  { type: 'video',      label: 'Video',      emoji: '🎥', icon: Video,        color: 'text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20',                hint: 'YouTube / Vimeo / MP4 / GCS' },
  { type: 'pdf',        label: 'PDF',        emoji: '📄', icon: FileText,     color: 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20',           hint: 'Tài liệu / Sách / Worksheet' },
  { type: 'text',       label: 'Văn bản',    emoji: '📝', icon: Type,         color: 'text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',           hint: 'Rich text — công thức, tóm tắt' },
  { type: 'audio',      label: 'Audio',      emoji: '🎵', icon: Music,        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20', hint: 'MP3 / WAV podcast' },
  { type: 'quiz',       label: 'Quiz',       emoji: '❓', icon: HelpCircle,   color: 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',       hint: 'Liên kết đề thi hoặc inline' },
  { type: 'pptx',       label: 'PPTX',       emoji: '📊', icon: Presentation, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',   hint: 'Slide PowerPoint' },
  { type: 'simulation', label: 'Sim 3D',     emoji: '🧪', icon: FlaskConical, color: 'text-violet-400 bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/20',   hint: 'Aura — sim Three.js' },
  { type: 'lab',        label: 'Lab',        emoji: '🧪', icon: Beaker,       color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20',           hint: 'IoT / Circuit / Arduino' },
  { type: 'game',       label: 'Game',       emoji: '🎮', icon: Gamepad2,     color: 'text-pink-400 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20',           hint: 'Pixel Odyssey, Buffalo...' },
  { type: 'link',       label: 'Liên kết',   emoji: '🔗', icon: Link2,        color: 'text-gray-300 bg-white/5 border-white/15 hover:bg-white/10',                    hint: 'URL ngoài (web/blog)' },
  { type: 'embed',      label: 'Embed',      emoji: '💬', icon: Code2,        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20',   hint: 'iframe (YouTube live, CodePen)' },
]

function getBlockMeta(type: LessonBlockType): BlockTypeMeta {
  return BLOCK_TYPES.find(b => b.type === type) || BLOCK_TYPES[0]
}

/* ─── Curated lists for sim/lab/game pickers ────────────────────── */
// Aura sims — phổ biến nhất từ aeroedu-vite/src/pages/dashboard/Aura.tsx
const SIM_OPTIONS: { id: string; title: string }[] = [
  { id: 'fpv-drone-vr',     title: '🚁 FPV Drone Sandbox + VR' },
  { id: 'interactive-box',  title: 'Interactive Shapes' },
  { id: 'water-molecule',   title: 'Phân tử nước H₂O' },
  { id: 'chemistry-lab',    title: 'Chemistry Lab' },
  { id: 'pendulum',         title: 'Con lắc đơn' },
  { id: 'solar-system',     title: 'Hệ mặt trời' },
  { id: 'collision',        title: 'Va chạm đàn hồi' },
  { id: 'frosted-glass',    title: 'Frosted Glass' },
  { id: 'particles',        title: 'Particles' },
  { id: 'swarm',            title: 'Swarm' },
  { id: 'wave-shader',      title: 'Wave Shader' },
  { id: 'audio-wave',       title: 'Audio Wave' },
  { id: 'portal',           title: 'Portal' },
  { id: 'galaxy',           title: 'Thiên hà' },
  { id: 'terrain',          title: 'Địa hình' },
  { id: 'ocean',            title: 'Đại dương' },
  { id: 'dna-helix',        title: 'DNA Helix' },
  { id: 'voxel-city',       title: 'Voxel City' },
  { id: 'raymarching',      title: 'Raymarching' },
  { id: 'metaballs',        title: 'Metaballs' },
]

// Labs — hardcoded list (paths đã có route trong app)
const LAB_OPTIONS: {
  id: string; title: string; path: string;
  supportsChallenge?: boolean;
  labType?: 'analog' | 'digital' | 'arduino';
}[] = [
  { id: 'analog-circuit',   title: '🔌 Mạch Analog — tự lắp ghép (hỗ trợ chấm)',  path: '/dashboard/iot-lab',     supportsChallenge: true, labType: 'analog' },
  { id: 'digital-logic',    title: '🧠 Digital Logic — cổng AND/OR/XOR (hỗ trợ chấm)', path: '/labs/digital-logic', supportsChallenge: true, labType: 'digital' },
  { id: 'arduino-emulator', title: '🤖 Arduino Emulator — viết C++ chạy giả lập (hỗ trợ chấm)', path: '/labs/arduino', supportsChallenge: true, labType: 'arduino' },
  { id: 'iot-lab',          title: 'IoT Lab — cảm biến + actuator',  path: '/labs/iot' },
  { id: 'circuit-lab',      title: 'Circuit Lab — mạch điện',          path: '/labs/circuit' },
  { id: 'graph-lab',        title: 'Graph Lab — đồ thị hàm số',         path: '/labs/graph' },
  { id: 'custom-circuit',   title: 'Custom Circuit Builder',            path: '/labs/custom-circuit' },
  { id: 'eclipse',          title: 'Eclipse — Nhật/Nguyệt thực 3D',    path: '/labs/eclipse' },
  { id: 'stem-monitor',     title: 'STEM Monitor — đo điện tử',         path: '/labs/stem-monitor' },
  { id: 'flipbook-pdf',     title: 'Flipbook PDF 3D',                   path: '/labs/flipbook' },
  { id: 'physics-r3f',      title: 'Physics R3F sandbox',                path: '/labs/physics' },
  { id: 'chemistry-r3f',    title: 'Chemistry R3F sandbox',              path: '/labs/chemistry' },
]

// Games
const GAME_OPTIONS: { id: string; title: string; path: string }[] = [
  { id: 'pixel-odyssey',   title: 'Pixel Odyssey — khám phá nghề',     path: '/student/games/pixel-odyssey' },
  { id: 'pixel-agent',     title: 'Pixel Agent v2',                     path: '/student/games/pixel-agent' },
  { id: 'metro-city',      title: 'MetroCity — career sim',             path: '/student/games/metro-city' },
  { id: 'career-pixel-sim', title: 'Career Pixel Sim 1-day',            path: '/student/games/career-sim' },
  { id: 'buffalo',         title: 'Buffalo — trắc nghiệm vui',           path: '/student/games/buffalo' },
  { id: 'pixel-life',      title: 'Daily Life — mô phỏng ngày',         path: '/student/games/daily-life' },
]

/* ─── Helpers ────────────────────────────────────────────────────── */
function blockSummary(b: LessonBlock): string {
  // Hiển thị 1 dòng tóm tắt content
  const c = b.content || ''
  if (b.type === 'text') {
    const plain = c.replace(/<[^>]+>/g, '').slice(0, 80)
    return plain || '(trống)'
  }
  if (c.length <= 80) return c
  return c.slice(0, 77) + '...'
}

function estimatedMinutes(b: LessonBlock): number {
  const m = b.metadata || {}
  if (m.duration && Number.isFinite(Number(m.duration))) return Number(m.duration)
  // Heuristic — text/quiz ~3p, video/audio mặc định 5p nếu thiếu duration
  if (b.type === 'text') return 3
  if (b.type === 'quiz') return 5
  if (b.type === 'video' || b.type === 'audio') return 5
  if (b.type === 'pdf') return Number(m.pages || 0) * 1.5 || 5
  if (b.type === 'simulation' || b.type === 'lab' || b.type === 'game') return 10
  return 2
}

function detectVideoType(url: string): 'youtube' | 'vimeo' | 'mp4' | 'gcs' | 'unknown' {
  if (!url) return 'unknown'
  if (/(youtube\.com|youtu\.be)/i.test(url)) return 'youtube'
  if (/vimeo\.com/i.test(url)) return 'vimeo'
  if (/\.mp4(\?|$)/i.test(url)) return 'mp4'
  if (/storage\.googleapis\.com/i.test(url)) return 'gcs'
  return 'unknown'
}

/* ─── Add / edit form per block type ─────────────────────────────── */
interface BlockFormProps {
  initialType: LessonBlockType
  initial?: LessonBlock | null
  onCancel: () => void
  onSubmit: (data: CreateLessonBlockPayload) => void
  busy: boolean
}

function BlockForm({ initialType, initial, onCancel, onSubmit, busy }: BlockFormProps) {
  const [type, setType] = useState<LessonBlockType>(initial?.type || initialType)
  const [title, setTitle] = useState<string>(initial?.title || '')
  const [content, setContent] = useState<string>(initial?.content || '')
  const [meta, setMeta] = useState<Record<string, any>>(initial?.metadata || {})
  // ExamPicker modal — chỉ mở khi user click "Chọn đề thi" trong quiz block
  const [examPickerOpen, setExamPickerOpen] = useState(false)

  // Re-sync when switching the active type (only when adding new — not editing)
  useEffect(() => {
    if (!initial) {
      setType(initialType)
      setTitle('')
      setContent('')
      setMeta({})
    }
  }, [initialType, initial])

  const meta_ = (k: string, v: any) => setMeta(prev => ({ ...prev, [k]: v }))
  const m = getBlockMeta(type)

  function submit() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle && type !== 'text') {
      toast.error('Thiếu tiêu đề')
      return
    }
    // Type-specific validation
    if (['video','pdf','audio','pptx','link','embed'].includes(type) && !content.trim()) {
      toast.error('Cần URL')
      return
    }
    if (type === 'simulation' && !content.trim()) { toast.error('Chọn sim'); return }
    if (type === 'lab' && !content.trim()) { toast.error('Chọn lab'); return }
    if (type === 'game' && !content.trim()) { toast.error('Chọn game'); return }
    if (type === 'quiz' && !content.trim()) { toast.error('Cần exam ID'); return }
    if (type === 'text' && !content.trim()) { toast.error('Cần nội dung'); return }

    // For video — auto-fill metadata.videoType if not set
    const finalMeta = { ...meta }
    if (type === 'video' && !finalMeta.videoType) {
      finalMeta.videoType = detectVideoType(content.trim())
    }

    onSubmit({
      type,
      title: trimmedTitle || null,
      content: content.trim() || null,
      metadata: finalMeta,
    })
  }

  return (
    <div className={cn('rounded-xl border-2 p-4 space-y-3', m.color.split(' ').filter(c => c.startsWith('border-')).join(' '), 'bg-white/[0.02]')}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{m.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {initial ? `Sửa block ${m.label}` : `Thêm block ${m.label}`}
          </p>
          <p className="text-xs text-gray-400">{m.hint}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-7 h-7 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center"
          title="Đóng form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Title — common for all types except pure text */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1">
          Tiêu đề {type !== 'text' && <span className="text-red-400">*</span>}
        </label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={
            type === 'video' ? 'VD: Giảng giải lý thuyết' :
            type === 'pdf'   ? 'VD: Slide giảng + bài tập' :
            type === 'text'  ? 'VD: Tóm tắt công thức (tuỳ chọn)' :
            type === 'audio' ? 'VD: Podcast ôn tập' :
            type === 'quiz'  ? 'VD: Kiểm tra hiểu bài' :
            type === 'pptx'  ? 'VD: Slide chương 1' :
            type === 'simulation' ? 'VD: Quan sát sóng' :
            type === 'lab'   ? 'VD: Thí nghiệm IoT' :
            type === 'game'  ? 'VD: Game khám phá nghề' :
            type === 'link'  ? 'VD: Tài liệu Wikipedia' :
            'VD: Embed CodePen'
          }
          className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
          onKeyDown={e => {
            if (e.key === 'Enter' && type !== 'text' && content.trim()) submit()
            if (e.key === 'Escape') onCancel()
          }}
        />
      </div>

      {/* Type-specific fields */}
      {type === 'video' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">URL video <span className="text-red-400">*</span></label>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="https://youtube.com/watch?v=... | https://vimeo.com/... | https://...mp4"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none font-mono"
            />
            {content && (
              <p className="text-[10px] text-gray-500 mt-1">
                Phát hiện: <span className="text-purple-300">{detectVideoType(content)}</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Thời lượng (phút)</label>
              <input
                type="number" min={0}
                value={meta.duration ?? ''}
                onChange={e => meta_('duration', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="VD: 12"
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Thumbnail URL (tuỳ chọn)</label>
              <input
                value={meta.thumbUrl || ''}
                onChange={e => meta_('thumbUrl', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none font-mono"
              />
            </div>
          </div>
        </>
      )}

      {type === 'pdf' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">URL PDF <span className="text-red-400">*</span></label>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="https://.../tai-lieu.pdf"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Số trang</label>
              <input
                type="number" min={0}
                value={meta.pages ?? ''}
                onChange={e => meta_('pages', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="VD: 24"
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Kích thước (KB)</label>
              <input
                type="number" min={0}
                value={meta.fileSize ?? ''}
                onChange={e => meta_('fileSize', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="tuỳ chọn"
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>
          </div>
        </>
      )}

      {type === 'text' && (
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Nội dung <span className="text-red-400">*</span></label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Nhập nội dung bài học — công thức, tóm tắt, ghi chú..."
            minHeight={180}
          />
        </div>
      )}

      {type === 'audio' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">URL audio <span className="text-red-400">*</span></label>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="https://.../bai-giang.mp3"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Thời lượng (phút)</label>
            <input
              type="number" min={0}
              value={meta.duration ?? ''}
              onChange={e => meta_('duration', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="VD: 5"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
        </>
      )}

      {type === 'quiz' && (() => {
        const hasExam = !!content && !!meta.examTitle
        return (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Chọn đề thi từ Ngân hàng câu hỏi <span className="text-red-400">*</span>
            </label>
            {hasExam ? (
              /* Selected exam preview card */
              <div className="rounded-xl border border-purple-500/40 bg-purple-500/5 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{meta.examTitle}</div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 flex-wrap">
                      {meta.subject && <span>{meta.subject}</span>}
                      {meta.grade && <span>· Khối {meta.grade}</span>}
                      {meta.questionCount !== undefined && <span>· {meta.questionCount} câu</span>}
                      {meta.duration && <span>· {meta.duration} phút</span>}
                      {meta.totalScore && <span>· {meta.totalScore} điểm</span>}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 font-mono">ID: {content}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExamPickerOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 font-bold flex-shrink-0"
                  >
                    Đổi đề
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state — pick button */
              <button
                type="button"
                onClick={() => setExamPickerOpen(true)}
                className="w-full p-4 rounded-xl border border-dashed border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 text-purple-200 transition-colors flex flex-col items-center gap-2"
              >
                <HelpCircle className="w-7 h-7" />
                <div className="font-bold text-sm">Bấm để chọn đề thi</div>
                <div className="text-[11px] text-purple-300/70">
                  Liên kết với đề có sẵn trong Ngân hàng câu hỏi
                </div>
              </button>
            )}
            <p className="text-[11px] text-gray-500">
              HS sẽ làm đề trực tiếp trong course player. Số câu + thời gian tự động đồng bộ từ đề.
            </p>
          </div>
        )
      })()}

      {type === 'pptx' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">URL .pptx <span className="text-red-400">*</span></label>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="https://.../bai-giang.pptx"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Render qua Google Docs viewer iframe HS xem trực tiếp (không cần download)
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Số slide</label>
            <input
              type="number" min={0}
              value={meta.slideCount ?? ''}
              onChange={e => meta_('slideCount', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="VD: 32"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
        </>
      )}

      {type === 'simulation' && (() => {
        const selectedSim = SIM_OPTIONS.find(s => s.id === content)
        return (
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Chọn sim Aura 3D <span className="text-red-400">*</span></label>
            <select
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">— Chọn —</option>
              {SIM_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            {selectedSim && (
              <div className="mt-2 flex items-center gap-3 p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20">
                <FlaskConical className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-violet-200 truncate">{selectedSim.title}</div>
                  <div className="text-[10.5px] text-zinc-500">Sim Three.js (Aura) · render fullscreen trong player</div>
                </div>
                <a
                  href={`/dashboard/aura?sim=${selectedSim.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-violet-300 hover:text-violet-200 px-2 py-1 rounded border border-violet-500/30 hover:bg-violet-500/15 inline-flex items-center gap-1 flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" /> Mở sim
                </a>
              </div>
            )}
            <p className="text-[10px] text-gray-500 mt-1">
              HS sẽ vào sim trực tiếp trong player.
            </p>
          </div>
        )
      })()}

      {type === 'lab' && (() => {
        const selectedLab = LAB_OPTIONS.find(l => l.id === content)
        const supportsChallenge = !!selectedLab?.supportsChallenge
        const isChallenge = !!meta.challenge
        const inferredLabType = selectedLab?.labType || (meta.labType as 'analog' | 'digital' | 'arduino' | undefined) || 'analog'
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Chọn lab <span className="text-red-400">*</span></label>
              <select
                value={content}
                onChange={e => {
                  const lab = LAB_OPTIONS.find(l => l.id === e.target.value)
                  setContent(e.target.value)
                  if (lab) {
                    meta_('path', lab.path)
                    // Reset challenge data khi đổi lab type khác (tránh mismatch)
                    if (meta.labType && lab.labType && meta.labType !== lab.labType) {
                      meta_('referenceSnapshot', undefined)
                      meta_('criteria', undefined)
                    }
                    if (lab.labType) meta_('labType', lab.labType)
                  }
                }}
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">— Chọn —</option>
                {LAB_OPTIONS.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
              {selectedLab && !supportsChallenge && (
                <p className="text-[11px] text-zinc-500 mt-1">
                  Lab này chưa hỗ trợ chấm tự động. Chỉ hiển thị link mở lab.
                </p>
              )}
              {/* Preview card khi đã pick lab — show description + link "Mở lab" */}
              {selectedLab && (
                <div className="mt-2 flex items-center gap-3 p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                  <Beaker className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-cyan-200 truncate">{selectedLab.title}</div>
                    <div className="text-[10.5px] text-zinc-500 font-mono truncate">{selectedLab.path}</div>
                  </div>
                  <a
                    href={selectedLab.path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-300 hover:text-cyan-200 px-2 py-1 rounded border border-cyan-500/30 hover:bg-cyan-500/15 inline-flex items-center gap-1 flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" /> Mở lab
                  </a>
                </div>
              )}
            </div>

            {/* Challenge toggle — chỉ show khi lab support */}
            {supportsChallenge && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChallenge}
                    onChange={e => {
                      meta_('challenge', e.target.checked || undefined)
                      meta_('labType', e.target.checked ? inferredLabType : undefined)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-amber-200 flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> Bài tập có chấm —
                      <span className="text-[11px] uppercase px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40">
                        {inferredLabType}
                      </span>
                    </div>
                    <div className="text-xs text-amber-100/70 mt-1">
                      Có thể thêm <b>nhiều bài tập</b> trong cùng 1 lesson — HS phải pass HẾT mới qua bài kế tiếp.
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Inline challenge author — show simulator + save reference */}
            {supportsChallenge && isChallenge && (
              <LabChallengeAuthor
                initialMetadata={{ ...meta, labType: inferredLabType } as Partial<LabChallengeMetadata>}
                onSave={(md) => {
                  meta_('challenge', true)
                  meta_('labType', md.labType)
                  meta_('referenceSnapshot', md.referenceSnapshot)
                  meta_('criteria', md.criteria)
                  meta_('description', md.description)
                  toast.success('Đã lưu đáp án vào block — bấm "Lưu thay đổi" để hoàn tất')
                }}
              />
            )}
          </div>
        )
      })()}

      {type === 'game' && (() => {
        const selectedGame = GAME_OPTIONS.find(g => g.id === content)
        return (
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Chọn game từ Game Hub <span className="text-red-400">*</span></label>
            <select
              value={content}
              onChange={e => {
                const g = GAME_OPTIONS.find(x => x.id === e.target.value)
                setContent(e.target.value)
                if (g) meta_('path', g.path)
              }}
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">— Chọn —</option>
              {GAME_OPTIONS.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
            {selectedGame && (
              <div className="mt-2 flex items-center gap-3 p-2.5 rounded-lg bg-pink-500/5 border border-pink-500/20">
                <Gamepad2 className="w-4 h-4 text-pink-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-pink-200 truncate">{selectedGame.title}</div>
                  <div className="text-[10.5px] text-zinc-500 font-mono truncate">{selectedGame.path}</div>
                </div>
                <a
                  href={selectedGame.path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-pink-300 hover:text-pink-200 px-2 py-1 rounded border border-pink-500/30 hover:bg-pink-500/15 inline-flex items-center gap-1 flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" /> Mở game
                </a>
              </div>
            )}
            <p className="text-[10px] text-gray-500 mt-1">
              Game học tập trong /student/games — HS hoàn thành sẽ ghi nhận điểm.
            </p>
          </div>
        )
      })()}

      {type === 'link' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">URL <span className="text-red-400">*</span></label>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Mô tả (tuỳ chọn)</label>
            <textarea
              value={meta.description || ''}
              onChange={e => meta_('description', e.target.value)}
              rows={2}
              placeholder="Tài liệu này nói về..."
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none resize-y"
            />
          </div>
        </>
      )}

      {type === 'embed' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">URL iframe <span className="text-red-400">*</span></label>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="https://www.youtube.com/embed/... | https://codepen.io/...embed"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Chiều cao (px)</label>
            <input
              type="number" min={200} max={2000}
              value={meta.height ?? 480}
              onChange={e => meta_('height', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="480"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 text-sm hover:border-white/40 transition-colors"
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {initial ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {busy ? 'Đang lưu...' : initial ? 'Lưu thay đổi' : 'Thêm block'}
        </button>
      </div>

      {/* ExamPicker modal — chỉ render khi quiz block + user mở picker */}
      <ExamPicker
        open={examPickerOpen}
        onClose={() => setExamPickerOpen(false)}
        currentExamId={content || null}
        onSelect={(exam: ExamSummary) => {
          // Sync content + meta từ exam đã chọn
          setContent(exam.id)
          // Auto-populate title nếu chưa có
          if (!title.trim()) setTitle(exam.title)
          // Sync meta fields cho preview card
          setMeta(prev => ({
            ...prev,
            examTitle: exam.title,
            subject: exam.subject || undefined,
            grade: exam.grade || undefined,
            questionCount: exam.totalQuestions ?? prev.questionCount,
            duration: exam.duration ?? prev.duration,
            totalScore: exam.totalScore ?? prev.totalScore,
            examStatus: exam.status,
          }))
        }}
      />
    </div>
  )
}

/* ─── Main Editor (fullscreen modal) ────────────────────────────── */
interface Props {
  open: boolean
  lessonId: string
  lessonTitle: string
  courseId: string
  onClose: () => void
}

export default function LessonAssetEditor({ open, lessonId, lessonTitle, courseId, onClose }: Props) {
  const qc = useQueryClient()
  const [addingType, setAddingType] = useState<LessonBlockType | null>(null)
  const [editingBlock, setEditingBlock] = useState<LessonBlock | null>(null)
  const [reviewingBlock, setReviewingBlock] = useState<LessonBlock | null>(null)

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ESC to close (but not when typing in input or showing add/edit form)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !addingType && !editingBlock) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, addingType, editingBlock])

  /* ── Data ── */
  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['lessonBlocks', lessonId],
    queryFn: () => instructorService.listLessonBlocks(lessonId),
    enabled: open && !!lessonId,
  })

  /* ── Mutations ── */
  const createM = useMutation({
    mutationFn: (data: CreateLessonBlockPayload) => instructorService.createLessonBlock(lessonId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lessonBlocks', lessonId] })
      qc.invalidateQueries({ queryKey: ['curriculum', courseId] })
      toast.success('Đã thêm block')
      setAddingType(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi tạo block'),
  })

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateLessonBlockPayload }) =>
      instructorService.updateLessonBlock(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lessonBlocks', lessonId] })
      toast.success('Đã lưu')
      setEditingBlock(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi cập nhật'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => instructorService.deleteLessonBlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lessonBlocks', lessonId] })
      qc.invalidateQueries({ queryKey: ['curriculum', courseId] })
      toast.success('Đã xoá')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi xoá'),
  })

  const reorderM = useMutation({
    mutationFn: (ids: string[]) => instructorService.reorderLessonBlocks(lessonId, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessonBlocks', lessonId] }),
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi sắp xếp'),
  })

  function moveBlock(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= blocks.length) return
    const ids = blocks.map(b => b.id)
    const tmp = ids[idx]
    ids[idx] = ids[newIdx]
    ids[newIdx] = tmp
    reorderM.mutate(ids)
  }

  function duplicateBlock(b: LessonBlock) {
    createM.mutate({
      type: b.type,
      title: b.title ? `${b.title} (sao chép)` : null,
      content: b.content || null,
      metadata: b.metadata || {},
    })
  }

  /* ── Stats ── */
  const totalMinutes = useMemo(
    () => blocks.reduce((s, b) => s + estimatedMinutes(b), 0),
    [blocks]
  )

  if (!open) return null

  const showAddForm = addingType !== null
  const showEditForm = editingBlock !== null

  const content = (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-5xl sm:max-h-[92vh] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 sm:rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-purple-900/20 to-indigo-900/10 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-purple-300/70 font-semibold">Bài học</p>
            <h2 className="text-base sm:text-lg font-semibold text-white truncate">{lessonTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Type picker */}
          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              Thêm asset vào bài học
              <span className="text-[10px] text-gray-500 font-normal">(11 loại block)</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {BLOCK_TYPES.map(bt => {
                const Icon = bt.icon
                const active = addingType === bt.type
                return (
                  <button
                    key={bt.type}
                    type="button"
                    onClick={() => {
                      setEditingBlock(null)
                      setAddingType(active ? null : bt.type)
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-left',
                      bt.color,
                      active && 'ring-2 ring-purple-500/50 scale-[1.02]'
                    )}
                    title={bt.hint}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-semibold truncate">{bt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Add form (inline) */}
          {showAddForm && (
            <BlockForm
              initialType={addingType!}
              onCancel={() => setAddingType(null)}
              onSubmit={(d) => createM.mutate(d)}
              busy={createM.isPending}
            />
          )}

          {/* Edit form (inline, replaces add) */}
          {showEditForm && (
            <BlockForm
              initialType={editingBlock!.type}
              initial={editingBlock}
              onCancel={() => setEditingBlock(null)}
              onSubmit={(d) => updateM.mutate({ id: editingBlock!.id, data: d })}
              busy={updateM.isPending}
            />
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-white/10" />
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Nội dung bài học ({blocks.length} asset)
            </p>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Block list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : blocks.length === 0 && !showAddForm ? (
            <div className="rounded-xl bg-white/[0.02] border-2 border-dashed border-white/10 p-10 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-10 h-10 text-gray-600" />
              <p className="text-gray-400 text-sm">Bài học này chưa có asset nào.</p>
              <p className="text-gray-500 text-xs">Bấm nút loại block bên trên để thêm video, PDF, quiz... vào bài học.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block, idx) => {
                const meta = getBlockMeta(block.type)
                const Icon = meta.icon
                const mins = estimatedMinutes(block)
                const summary = blockSummary(block)
                const labelTitle = block.title || `${meta.label} #${idx + 1}`
                return (
                  <div
                    key={block.id}
                    className="group flex items-stretch gap-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 overflow-hidden transition-colors"
                  >
                    {/* Drag handle + position number */}
                    <div className="flex flex-col items-center justify-center px-2 py-2 bg-white/[0.02] flex-shrink-0">
                      <GripVertical className="w-3 h-3 text-gray-600" />
                      <span className="text-[10px] font-mono text-gray-500 mt-1">{idx + 1}</span>
                    </div>

                    {/* Icon block */}
                    <div className={cn(
                      'flex items-center justify-center w-10 sm:w-12 flex-shrink-0',
                      meta.color.split(' ').filter(c => c.startsWith('bg-')).join(' '),
                    )}>
                      <Icon className={cn('w-5 h-5', meta.color.split(' ').filter(c => c.startsWith('text-')).join(' '))} />
                    </div>

                    {/* Main content */}
                    <button
                      type="button"
                      onClick={() => { setAddingType(null); setEditingBlock(block) }}
                      className="flex-1 min-w-0 text-left py-2.5 pr-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                          meta.color.split(' ').filter(c => c.startsWith('text-') || c.startsWith('bg-')).join(' '),
                        )}>
                          {meta.emoji} {meta.label}
                        </span>
                        <p className="text-sm font-medium text-white truncate flex-1 min-w-0">
                          {labelTitle}
                        </p>
                        {mins > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Clock className="w-3 h-3" /> ~{mins}p
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {summary}
                      </p>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 pr-2 flex-shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, -1)}
                        disabled={idx === 0 || reorderM.isPending}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 hover:text-white"
                        title="Lên"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, 1)}
                        disabled={idx === blocks.length - 1 || reorderM.isPending}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 hover:text-white"
                        title="Xuống"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingType(null); setEditingBlock(block) }}
                        className="w-7 h-7 rounded-lg hover:bg-cyan-500/20 flex items-center justify-center text-cyan-400"
                        title="Sửa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateBlock(block)}
                        className="w-7 h-7 rounded-lg hover:bg-blue-500/20 flex items-center justify-center text-blue-400 hidden sm:flex"
                        title="Nhân bản"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {/* Reviewer button — chỉ show cho lab challenge */}
                      {block.type === 'lab' && (block.metadata as { challenge?: boolean })?.challenge && (
                        <button
                          type="button"
                          onClick={() => setReviewingBlock(block)}
                          className="w-7 h-7 rounded-lg hover:bg-amber-500/20 flex items-center justify-center text-amber-400"
                          title="Xem bài nộp của HS"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(block.type === 'video' || block.type === 'pdf' || block.type === 'audio' || block.type === 'link' || block.type === 'pptx' || block.type === 'embed') && block.content && (
                        <a
                          href={block.content}
                          target="_blank"
                          rel="noreferrer"
                          className="w-7 h-7 rounded-lg hover:bg-purple-500/20 flex items-center justify-center text-purple-300 hidden sm:flex"
                          title="Mở viewer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xoá block "${labelTitle}"?`)) {
                            deleteM.mutate(block.id)
                          }
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-red-400"
                        title="Xoá"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer / stats */}
        <footer className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10 bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-4 text-xs text-gray-300">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <b className="text-white">{blocks.length}</b> asset
            </span>
            {totalMinutes > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                ước tính <b className="text-white">{totalMinutes} phút</b>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            Đóng
          </button>
        </footer>
      </div>

      {/* Reviewer modal — GV xem bài nộp HS */}
      {reviewingBlock && (
        <LabAttemptsReviewer
          blockId={reviewingBlock.id}
          blockTitle={reviewingBlock.title || undefined}
          onClose={() => setReviewingBlock(null)}
        />
      )}
    </div>
  )

  return createPortal(content, document.body)
}
