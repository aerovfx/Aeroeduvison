/**
 * QuestionBankDrawer — Right-side drawer cho GV duyệt + chọn câu hỏi
 * từ ngân hàng để gắn vào đề thi.
 *
 * 2 cách thao tác:
 *  1. Multi-select + nút "Thêm N câu vào đề" (chính)
 *  2. Drag từng câu sang exam list (kéo-thả native HTML5 drag API)
 *
 * Props:
 *  - examId, examSubject, examGrade — context để filter mặc định
 *  - onAttached(count) — callback sau khi attach thành công (để parent refetch)
 *  - alreadyInExam — Set<questionId> đã có trong đề (disable chọn để tránh duplicate)
 */
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  X, Search, Loader2, Plus, GripVertical, CheckCircle2,
  Filter, Library, Tag,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'
import { MathText } from '@/components/common/MathText'

interface Question {
  id: string
  content: string
  questionType: string
  subject: string
  grade: string
  difficulty: string
  topic: string
  options: string[]
  correctAnswer: string
  tags: string[]
  usageCount: number
}

interface Props {
  examId: string
  examSubject?: string
  examGrade?: string
  alreadyInExam: Set<string>
  onAttached: (attachedCount: number) => void
  onClose: () => void
}

export default function QuestionBankDrawer({
  examId, examSubject, examGrade, alreadyInExam, onAttached, onClose,
}: Props) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [subject, setSubject] = useState(examSubject || '')
  const [grade, setGrade] = useState(examGrade || '')
  const [difficulty, setDifficulty] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [attaching, setAttaching] = useState(false)
  const [pointsPerQ, setPointsPerQ] = useState(1)

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Load questions when filters change
  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { limit: '50' }
    if (debouncedSearch) params.search = debouncedSearch
    if (subject) params.subject = subject
    if (grade) params.grade = grade
    if (difficulty) params.difficulty = difficulty

    api.get('/questions', { params })
      .then((r: any) => {
        const data = r.data?.data?.questions || []
        setQuestions(data)
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [debouncedSearch, subject, grade, difficulty])

  // ── Selection handlers ──
  const toggleSelect = useCallback((qid: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(qid)) next.delete(qid)
      else next.add(qid)
      return next
    })
  }, [])

  const selectAllVisible = useCallback(() => {
    const visible = questions.filter(q => !alreadyInExam.has(q.id))
    if (selected.size === visible.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visible.map(q => q.id)))
    }
  }, [questions, selected, alreadyInExam])

  // ── Attach to exam ──
  const handleAttach = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    setAttaching(true)
    try {
      const r = await api.post(`/teacher/exams/${examId}/questions/attach`, {
        questionIds: ids,
        points: pointsPerQ,
      })
      const data = r.data as { attached: number; skipped: number }
      const { attached, skipped } = data
      if (attached > 0) {
        toast.success(`Đã thêm ${attached} câu${skipped ? ` (bỏ qua ${skipped} câu đã có)` : ''}`)
        setSelected(new Set())
        onAttached(attached)
      } else {
        toast(skipped > 0 ? 'Tất cả câu đã có trong đề' : 'Không có câu nào được thêm', { icon: '⚠️' })
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Lỗi khi thêm câu hỏi')
    } finally {
      setAttaching(false)
    }
  }, [examId, pointsPerQ, onAttached])

  // ── Drag handler ──
  const handleDragStart = (e: React.DragEvent, q: Question) => {
    if (alreadyInExam.has(q.id)) {
      e.preventDefault()
      return
    }
    // Set both formats for max compatibility
    e.dataTransfer.setData('text/plain', q.id)
    e.dataTransfer.setData('application/x-question-id', q.id)
    e.dataTransfer.effectAllowed = 'copy'
    // Ghost image: small badge
    const ghost = document.createElement('div')
    ghost.style.cssText = `
      position: absolute; top: -1000px; left: -1000px;
      background: #7c3aed; color: white; padding: 6px 12px;
      border-radius: 6px; font-size: 13px; font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `
    ghost.textContent = `📝 ${q.content.slice(0, 40)}...`
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 10, 10)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  // ── Subjects + grades for filter dropdowns (derived from current results) ──
  const availableSubjects = useMemo(() => {
    const set = new Set<string>()
    questions.forEach(q => q.subject && set.add(q.subject))
    return Array.from(set).sort()
  }, [questions])

  const availableGrades = useMemo(() => {
    const set = new Set<string>()
    questions.forEach(q => q.grade && set.add(q.grade))
    return Array.from(set).sort()
  }, [questions])

  const visibleCount = questions.filter(q => !alreadyInExam.has(q.id)).length
  const selectedCount = selected.size

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card2">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">📚 Ngân hàng đề</h2>
              <p className="text-[10px] text-muted-foreground">
                {questions.length} câu · {visibleCount} có thể thêm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + filters */}
        <div className="px-4 py-3 border-b border-border space-y-2 bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo từ khoá nội dung..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="flex-1 min-w-[100px] px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Tất cả môn</option>
              {availableSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="flex-1 min-w-[80px] px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Tất cả lớp</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Độ khó</option>
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">TB</option>
              <option value="HARD">Khó</option>
            </select>
          </div>

          {/* Bulk action row */}
          {questions.length > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <button
                onClick={selectAllVisible}
                className="text-primary hover:underline font-semibold"
              >
                {selected.size === visibleCount && visibleCount > 0 ? 'Bỏ chọn tất cả' : `Chọn ${visibleCount} câu khả dụng`}
              </button>
              <div className="flex items-center gap-2">
                <label className="text-muted-foreground">Điểm/câu:</label>
                <input
                  type="number"
                  min={0} max={10} step={0.5}
                  value={pointsPerQ}
                  onChange={e => setPointsPerQ(Math.max(0, Math.min(10, Number(e.target.value) || 1)))}
                  className="w-14 px-1.5 py-0.5 bg-background border border-border rounded text-foreground text-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 bg-background">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Library className="w-10 h-10 mx-auto mb-2 opacity-30" />
              {debouncedSearch || subject || grade || difficulty
                ? 'Không tìm thấy câu hỏi nào khớp bộ lọc'
                : 'Ngân hàng đề trống'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {questions.map(q => {
                const isInExam = alreadyInExam.has(q.id)
                const isSelected = selected.has(q.id)
                return (
                  <div
                    key={q.id}
                    draggable={!isInExam}
                    onDragStart={e => handleDragStart(e, q)}
                    onClick={() => !isInExam && toggleSelect(q.id)}
                    className={`
                      group rounded-lg border p-2.5 transition cursor-pointer
                      ${isInExam
                        ? 'bg-secondary/40 border-border opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border hover:border-primary/40'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      {/* Drag handle */}
                      {!isInExam && (
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                      )}

                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isInExam}
                        onChange={() => toggleSelect(q.id)}
                        onClick={e => e.stopPropagation()}
                        className="mt-0.5 w-3.5 h-3.5 accent-primary flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-1 mb-1.5">
                          {isInExam && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-bold uppercase">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Đã có
                            </span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase">
                            {q.questionType?.slice(0, 4) || 'MCQ'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            q.difficulty === 'EASY' || q.difficulty === 'easy' ? 'bg-emerald-500/15 text-emerald-700' :
                            q.difficulty === 'HARD' || q.difficulty === 'hard' ? 'bg-rose-500/15 text-rose-700' :
                            'bg-amber-500/15 text-amber-700'
                          }`}>
                            {q.difficulty || 'TB'}
                          </span>
                          {q.subject && (
                            <span className="text-[9px] text-muted-foreground">
                              {q.subject}{q.grade ? ` · ${q.grade}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Content preview (max 2 lines) */}
                        <div className="text-xs text-foreground line-clamp-2 leading-snug">
                          <MathText as="span">{q.content}</MathText>
                        </div>

                        {/* Footer meta */}
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          {q.topic && <span><Tag className="w-2.5 h-2.5 inline mr-0.5" />{q.topic}</span>}
                          {q.usageCount > 0 && <span>· Đã dùng {q.usageCount}×</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer: bulk add button */}
        {selectedCount > 0 && (
          <div className="border-t border-border p-3 bg-card2">
            <button
              onClick={() => handleAttach(Array.from(selected))}
              disabled={attaching}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-sm transition"
            >
              {attaching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Thêm {selectedCount} câu vào đề
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Hoặc kéo từng câu sang danh sách đề bên trái
            </p>
          </div>
        )}

        {/* Hint when no selection */}
        {selectedCount === 0 && !loading && questions.length > 0 && (
          <div className="border-t border-border p-3 bg-card2 text-center">
            <p className="text-[11px] text-muted-foreground">
              <Filter className="w-3 h-3 inline mr-1" />
              Tick chọn nhiều câu HOẶC <GripVertical className="w-3 h-3 inline mx-0.5" />kéo câu sang đề
            </p>
          </div>
        )}
      </div>
    </>
  )
}
