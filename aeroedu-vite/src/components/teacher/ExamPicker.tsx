/**
 * ExamPicker — Modal cho GV chọn đề thi từ /teacher/exams khi soạn quiz block
 * trong LessonAssetEditor.
 *
 * Thay thế việc gõ tay exam ID thủ công bằng UI:
 *   - Search theo title / subject
 *   - Filter theo status (Bản nháp / Đang diễn ra / Đã đóng)
 *   - Click 1 card → đóng modal + return { id, title, totalQuestions, duration, ... }
 *
 * Cũng dùng được cho final-exam block trong LearningPath module.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Search, Loader2, ClipboardList, Clock, Hash, Award,
  CheckCircle2, AlertCircle, FileText, Plus, ExternalLink,
} from 'lucide-react'
import { api } from '@/services/api'

export interface ExamSummary {
  id: string
  title: string
  examType?: string | null
  subject?: string | null
  grade?: string | null
  status: string
  duration?: number
  totalQuestions?: number
  totalScore?: number
  createdAt: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (exam: ExamSummary) => void
  currentExamId?: string | null
}

type StatusFilter = 'all' | 'published' | 'draft'

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  'Đang diễn ra':  { text: 'Đang diễn ra', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  'Bản nháp':      { text: 'Bản nháp',      color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40' },
  'Đã đóng':       { text: 'Đã đóng',       color: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
  published:       { text: 'Published',     color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  draft:           { text: 'Draft',         color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40' },
}

export default function ExamPicker({ open, onClose, onSelect, currentExamId }: Props) {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get<{ exams: ExamSummary[] }>('/teacher/exams')
      .then(r => setExams(r.data.exams || []))
      .catch(() => setExams([]))
      .finally(() => setLoading(false))
  }, [open])

  const visible = useMemo(() => {
    let list = exams
    if (statusFilter === 'published') {
      list = list.filter(e => e.status === 'Đang diễn ra' || e.status === 'published')
    } else if (statusFilter === 'draft') {
      list = list.filter(e => e.status === 'Bản nháp' || e.status === 'draft')
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.subject || '').toLowerCase().includes(q) ||
        (e.grade || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [exams, search, statusFilter])

  if (!open) return null

  const content = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <ClipboardList className="w-5 h-5 text-amber-400" />
          <div className="flex-1">
            <h3 className="text-base font-bold text-white">Chọn đề thi liên kết</h3>
            <p className="text-xs text-zinc-400">
              {exams.length > 0 ? `${exams.length} đề thi có sẵn` : 'Không có đề'} ·
              HS sẽ làm trực tiếp trong course player
            </p>
          </div>
          <a
            href="/teacher/exams"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 px-2.5 py-1 rounded-lg border border-purple-500/30 hover:bg-purple-500/15"
          >
            <Plus className="w-3.5 h-3.5" /> Tạo đề mới
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <button onClick={onClose} className="p-2 rounded hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-5 py-3 border-b border-zinc-800 flex gap-2 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề / môn / khối..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            {([
              { id: 'all',       label: 'Tất cả' },
              { id: 'published', label: 'Đã đăng' },
              { id: 'draft',     label: 'Nháp' },
            ] as Array<{ id: StatusFilter; label: string }>).map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  statusFilter === f.id
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-400/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải danh sách đề...
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-2">
                {exams.length === 0
                  ? 'Bạn chưa có đề thi nào.'
                  : 'Không tìm thấy đề khớp filter.'}
              </p>
              {exams.length === 0 && (
                <a
                  href="/teacher/exams/create"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 px-3 py-1.5 rounded-lg border border-purple-500/30 hover:bg-purple-500/15"
                >
                  <Plus className="w-3.5 h-3.5" /> Tạo đề đầu tiên
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {visible.map(exam => {
                const isCurrent = exam.id === currentExamId
                const status = STATUS_LABEL[exam.status] || { text: exam.status, color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40' }
                return (
                  <button
                    key={exam.id}
                    onClick={() => { onSelect(exam); onClose() }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-purple-500/15 border-purple-400/40 hover:bg-purple-500/20'
                        : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isCurrent ? 'bg-purple-500/20' : 'bg-zinc-800'
                      }`}>
                        {isCurrent
                          ? <CheckCircle2 className="w-5 h-5 text-purple-300" />
                          : <ClipboardList className="w-5 h-5 text-zinc-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-white truncate">{exam.title}</h4>
                          {isCurrent && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">
                              Đang chọn
                            </span>
                          )}
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                          {exam.subject && <span>{exam.subject}</span>}
                          {exam.grade && <span>· Khối {exam.grade}</span>}
                          {exam.totalQuestions !== undefined && exam.totalQuestions !== null && (
                            <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {exam.totalQuestions} câu</span>
                          )}
                          {exam.duration && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration} phút</span>
                          )}
                          {exam.totalScore && (
                            <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {exam.totalScore} điểm</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40">
          <p className="text-[11px] text-zinc-500 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              Đề thi và câu hỏi quản lý tại <strong>Ngân hàng câu hỏi</strong> + <strong>/teacher/exams</strong>.
              Khi đề thay đổi, block sẽ tự động cập nhật metadata cho HS.
            </span>
          </p>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
