import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import {
  Plus, Brain, BookOpen, FolderKanban, Save,
  Settings, Zap, Clock, ChevronRight, Trash2,
  GripVertical, TrendingUp, Users, X, FolderOpen, Check,
  Loader2, AlertCircle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'

const CreateModuleModal = lazy(() => import('@/components/learning-path/CreateModuleModal'))

/* ── Dark palette ── */
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  wall:        'var(--td-wall)',
  topbar:      'var(--td-topbar)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  divider:     'var(--td-divider)',
  grid:        'var(--td-grid)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  muted2:      'var(--td-muted2)',
  purple:      'var(--td-purple)',
  purpleL:     'var(--td-purple-l)',
  purpleHover: 'var(--td-purple-hover)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  rose:        'var(--td-rose)',
  blue:        'var(--td-blue)',
  pink:        'var(--td-pink)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
  greenA:  (a: number) => `rgba(var(--td-green-rgb), ${a})`,
  redA:    (a: number) => `rgba(var(--td-red-rgb), ${a})`,
  cyanA:   (a: number) => `rgba(var(--td-cyan-rgb), ${a})`,
  blueA:   (a: number) => `rgba(var(--td-blue-rgb), ${a})`,
} as const


/* ── Types ── */
export type Difficulty = 'easy' | 'medium' | 'hard'
export type ModuleType =
  | 'lesson'
  | 'quiz'
  | 'project'
  | 'assignment'
  | 'video'        // Bài video (YouTube / Vimeo / GCS mp4)
  | 'survey'       // Bài khảo sát (rating/text/choice)
  | 'final-exam'   // Bài kiểm tra cuối khoá (link tới Exam đã tạo)
  | 'stem-skill'   // Hoàn thành 1 kĩ năng STEM
  | 'challenge'    // Thách đấu với 1 HS khác

export interface QuizQuestion {
  id: string
  q: string
  options: string[]            // 2-4 đáp án
  correctIndex: number         // 0-based
  explanation?: string
}

export interface SurveyQuestion {
  id: string
  q: string
  type: 'rating' | 'text' | 'choice'
  options?: string[]           // dùng cho 'choice'
  scaleMax?: number            // dùng cho 'rating' (mặc định 5)
}

export type VideoEmbedKind = 'youtube' | 'vimeo' | 'mp4' | 'gcs'
export type ChallengeFormat = 'speed-quiz' | 'best-of-3' | 'duel-3min'

export interface Module {
  id: string
  type: ModuleType
  title: string
  subject: string
  difficulty: Difficulty
  duration: number             // phút
  xpTarget: number
  prerequisites?: string[]

  // ── Rich content (optional, type-specific) ──
  description?: string
  tags?: string[]
  passingScore?: number        // % đạt cho quiz/exam (0-100)
  attempts?: number            // số lần làm tối đa (0 = unlimited)

  // type=video
  videoUrl?: string
  videoEmbedKind?: VideoEmbedKind

  // type=quiz
  quizQuestions?: QuizQuestion[]

  // type=survey
  surveyQuestions?: SurveyQuestion[]

  // type=final-exam
  examId?: string              // link tới existing Exam trong /teacher/exams
  examName?: string

  // type=stem-skill
  stemSkillId?: string
  stemSkillName?: string

  // type=challenge
  challengeStudentId?: string
  challengeStudentName?: string
  challengeFormat?: ChallengeFormat
}

export interface RosterStudent {
  id: string
  userId: string | null
  name: string
  email: string
  avatar: string | null
  classNames: string[]
  isLinked: boolean
}

interface LearningPath {
  id: string
  name: string
  description: string
  subject: string | null
  difficulty: string
  modules: Module[]
  estimatedDays: number
  totalXP: number
  totalDuration: number
  isTemplate: boolean
  assignments: Array<{ id: string; studentId: string; studentName: string; studentEmail: string; status: string; progressPct: number }>
  assignedCount: number
  createdAt: string
  updatedAt: string
}

/* ── Helpers ── */
const MODULE_ICONS: Record<ModuleType, string> = {
  lesson:       '📖',
  quiz:         '📝',
  project:      '🎯',
  assignment:   '📋',
  video:        '🎬',
  survey:       '📊',
  'final-exam': '🏆',
  'stem-skill': '⚙️',
  challenge:    '⚔️',
}

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  lesson:       'Bài giảng',
  quiz:         'Trắc nghiệm',
  project:      'Dự án',
  assignment:   'Bài tập',
  video:        'Video',
  survey:       'Khảo sát',
  'final-exam': 'Bài kiểm tra cuối khoá',
  'stem-skill': 'Kĩ năng STEM',
  challenge:    'Thách đấu HS khác',
}

const DIFF_COLORS: Record<Difficulty, { bg: string; border: string; text: string }> = {
  easy:   { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  text: '#4ade80' },
  medium: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', text: '#facc15' },
  hard:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171' },
}

function DiffBadge({ diff }: { diff: Difficulty }) {
  const c = DIFF_COLORS[diff]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 11, fontWeight: 700, color: c.text,
      textTransform: 'capitalize',
    }}>{diff}</span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  color: D.muted, fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10,
  color: D.text, fontSize: 14, padding: '9px 14px',
  width: '100%', boxSizing: 'border-box', outline: 'none',
}

/* ── Static Data ── */
const AVAILABLE_MODULES: Module[] = [
  { id: 'math-derivatives-1', type: 'lesson', title: 'Giới thiệu Đạo hàm',    subject: 'mathematics', difficulty: 'easy',   duration: 30, xpTarget: 80 },
  { id: 'math-derivatives-2', type: 'lesson', title: 'Quy tắc tính đạo hàm', subject: 'mathematics', difficulty: 'medium', duration: 45, xpTarget: 120 },
  { id: 'math-quiz-1',        type: 'quiz',   title: 'Kiểm tra Đạo hàm',     subject: 'mathematics', difficulty: 'medium', duration: 20, xpTarget: 100 },
  { id: 'math-integrals-1',   type: 'lesson', title: 'Tích phân cơ bản',      subject: 'mathematics', difficulty: 'hard',   duration: 60, xpTarget: 150, prerequisites: ['math-derivatives-2'] },
  { id: 'math-project-1',     type: 'project',title: 'Dự án: Ứng dụng Giải tích', subject: 'mathematics', difficulty: 'hard', duration: 90, xpTarget: 200 },
]

const AI_SUGGESTIONS = [
  { module: 'Bài tập Logic nâng cao', reason: 'Học sinh mạnh về logic (90%), nên thử thách hơn', priority: 'high' as const },
  { module: 'Drill: Tính toán nhanh', reason: '2 học sinh yếu về tính toán, cần luyện tập',       priority: 'medium' as const },
  { module: 'Video: Hình học không gian', reason: 'Lớp có xu hướng học tốt qua visual content',   priority: 'high' as const },
]

/* ── Main Component ── */
export default function LearningPathBuilder() {
  const [pathName, setPathName] = useState('')
  const [pathDescription, setPathDescription] = useState('')
  const [selectedModules, setSelectedModules] = useState<Module[]>([])
  const [xpPerDay, setXpPerDay] = useState('150')
  const [diffMode, setDiffMode] = useState('auto')
  const [autoAdjust, setAutoAdjust] = useState(true)

  // ── HS được gán path (multi-select) ──
  const [roster, setRoster] = useState<RosterStudent[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  // ── Existing paths (load để chỉnh sửa) ──
  const [existingPaths, setExistingPaths] = useState<LearningPath[]>([])
  const [pathsLoading, setPathsLoading] = useState(true)
  const [pathsListOpen, setPathsListOpen] = useState(false)
  const [editingPathId, setEditingPathId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Tạo Module Mới modal ──
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  // Modules tự tạo bởi GV (lưu local state để hiển thị bên cột Modules có sẵn)
  const [customModules, setCustomModules] = useState<Module[]>([])

  const handleCreateModule = (m: Module) => {
    // 1. Thêm vào danh sách "Modules có sẵn" (sticky để dùng lại)
    setCustomModules(prev => [m, ...prev])
    // 2. Auto-add ngay vào path đang soạn
    setSelectedModules(prev => [...prev, m])
  }

  // Load roster + existing paths on mount
  useEffect(() => {
    (async () => {
      setRosterLoading(true)
      try {
        const r = await api.get<{ students: RosterStudent[] }>('/teacher/roster')
        setRoster(Array.isArray(r.data?.students) ? r.data.students : [])
      } catch (e: any) {
        console.warn('[lpb:roster]', e?.response?.data || e.message)
      } finally { setRosterLoading(false) }
    })()
    ;(async () => {
      setPathsLoading(true)
      try {
        const r = await api.get<{ paths: LearningPath[] }>('/teacher/learning-paths')
        setExistingPaths(Array.isArray(r.data?.paths) ? r.data.paths : [])
      } catch (e: any) {
        console.warn('[lpb:paths]', e?.response?.data || e.message)
      } finally { setPathsLoading(false) }
    })()
  }, [])

  const filteredRoster = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return roster
    return roster.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.classNames.some(c => c.toLowerCase().includes(q))
    )
  }, [roster, studentSearch])

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }
  const selectAllStudents = () => setSelectedStudentIds(new Set(filteredRoster.map(s => s.id)))
  const clearAllStudents = () => setSelectedStudentIds(new Set())

  // Load 1 path (chỉnh sửa)
  const loadPath = (p: LearningPath) => {
    setEditingPathId(p.id)
    setPathName(p.name)
    setPathDescription(p.description)
    setSelectedModules(p.modules || [])
    setSelectedStudentIds(new Set(p.assignments.map(a => a.studentId)))
    setPathsListOpen(false)
    toast.success(`Đã load path "${p.name}"`)
  }

  const newPath = () => {
    setEditingPathId(null)
    setPathName('')
    setPathDescription('')
    setSelectedModules([])
    setSelectedStudentIds(new Set())
    setPathsListOpen(false)
  }

  const addModule = (module: Module) => setSelectedModules(prev => [...prev, module])
  const removeModule = (moduleId: string) => setSelectedModules(prev => prev.filter(m => m.id !== moduleId))

  const moveModule = (index: number, dir: 'up' | 'down') => {
    const next = [...selectedModules]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target >= 0 && target < next.length) {
      ;[next[index], next[target]] = [next[target], next[index]]
      setSelectedModules(next)
    }
  }

  const totalDuration = selectedModules.reduce((s, m) => s + m.duration, 0)
  const totalXP       = selectedModules.reduce((s, m) => s + m.xpTarget, 0)
  const estimatedDays = Math.max(1, Math.ceil(totalDuration / 60))

  const canSave = selectedModules.length > 0 && pathName.trim().length > 0

  const savePath = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      // Build assignTo từ selected students (lookup roster để lấy name/email)
      const assignTo = Array.from(selectedStudentIds).map(sid => {
        const r = roster.find(x => x.id === sid)
        return {
          studentId: sid,
          studentName: r?.name || '',
          studentEmail: r?.email || '',
        }
      })
      if (editingPathId) {
        // Update existing path (modules + name + desc)
        await api.patch(`/teacher/learning-paths/${editingPathId}`, {
          name: pathName,
          description: pathDescription,
          modules: selectedModules,
        })
        // Sync assignments: assign newly added (skip if already)
        if (assignTo.length > 0) {
          await api.post(`/teacher/learning-paths/${editingPathId}/assign`, {
            students: assignTo,
          })
        }
        toast.success(`Đã cập nhật path "${pathName}" — gán cho ${assignTo.length} HS`)
      } else {
        // Create new
        await api.post('/teacher/learning-paths', {
          name: pathName,
          description: pathDescription,
          modules: selectedModules,
          assignTo,
        })
        toast.success(`Đã tạo path "${pathName}" — gán cho ${assignTo.length} HS`)
      }
      // Reload list
      const r = await api.get<{ paths: LearningPath[] }>('/teacher/learning-paths')
      setExistingPaths(Array.isArray(r.data?.paths) ? r.data.paths : [])
      // Reset form
      newPath()
    } catch (e: any) {
      const msg = e?.response?.data?.error || e.message || 'Lỗi lưu path'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const deletePath = async (pathId: string, pathName: string) => {
    if (!confirm(`Xoá path "${pathName}"?\nTất cả assignments cho HS sẽ bị xoá theo.`)) return
    try {
      await api.delete(`/teacher/learning-paths/${pathId}`)
      toast.success(`Đã xoá path "${pathName}"`)
      setExistingPaths(prev => prev.filter(p => p.id !== pathId))
      if (editingPathId === pathId) newPath()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || 'Lỗi xoá path')
    }
  }

  return (
    <div style={{ background: D.bg, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header Card ── */}
        <Card style={{ position: 'relative', overflow: 'hidden' }}>
          {/* gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
            background: 'linear-gradient(120deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.05) 100%)',
          }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                <h1 style={{ color: D.text, fontSize: 24, fontWeight: 900, margin: '0 0 4px' }}>
                  🎓 Learning Path Builder
                </h1>
                <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>
                  {editingPathId
                    ? `Đang chỉnh sửa: "${pathName}" — sẽ ghi đè khi lưu`
                    : 'Tạo lộ trình học tập cá nhân hoá cho từng học sinh bạn dạy'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {/* Open existing paths */}
              <button
                onClick={() => setPathsListOpen(true)}
                title="Mở danh sách paths đã tạo (chỉnh sửa, xoá)"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.06)', border: `1px solid ${D.border2}`,
                  borderRadius: 11, cursor: 'pointer',
                  color: D.text, fontWeight: 600, fontSize: 13,
                  padding: '10px 16px',
                }}
              >
                <FolderOpen size={15} />
                Paths ({existingPaths.length})
              </button>
              {editingPathId && (
                <button
                  onClick={newPath}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${D.border2}`,
                    borderRadius: 11, cursor: 'pointer',
                    color: D.muted, fontWeight: 600, fontSize: 13, padding: '10px 16px',
                  }}
                >
                  <Plus size={14} /> Path mới
                </button>
              )}
              <button
                onClick={savePath}
                disabled={!canSave || saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: canSave && !saving ? D.purple : '#2a2b3d',
                  border: 'none', borderRadius: 11,
                  cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                  color: canSave && !saving ? '#fff' : D.muted, fontWeight: 700, fontSize: 14,
                  padding: '10px 22px', transition: 'background 0.2s',
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingPathId ? 'Cập nhật' : 'Lưu Path'}
                {selectedStudentIds.size > 0 && ` (${selectedStudentIds.size} HS)`}
              </button>
            </div>
          </div>

          {/* ── Student picker chip area (multi-select) ── */}
          <div style={{ position: 'relative', marginBottom: 16, padding: '12px 14px',
            background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a78bfa', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Users size={13} /> Học sinh được gán path
                {rosterLoading && <Loader2 size={11} className="animate-spin" />}
              </label>
              <button onClick={() => setStudentPickerOpen(o => !o)}
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 8, color: '#a78bfa', fontSize: 12, fontWeight: 700,
                  padding: '4px 12px', cursor: 'pointer' }}>
                {studentPickerOpen ? 'Đóng danh sách' : `Chọn HS (${roster.length} có sẵn)`}
              </button>
            </div>
            {selectedStudentIds.size === 0 ? (
              <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>
                {roster.length === 0 ? '⚠ Chưa có HS nào trong lớp — vào /teacher/classes để import HS hoặc chờ HS kết nối.' : 'Chưa chọn HS nào — path sẽ được lưu dạng template (không gán cho ai).'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Array.from(selectedStudentIds).slice(0, 12).map(sid => {
                  const s = roster.find(x => x.id === sid)
                  if (!s) return null
                  return (
                    <span key={sid} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.4)',
                      borderRadius: 999, padding: '3px 4px 3px 10px',
                      color: D.text, fontSize: 12, fontWeight: 600,
                    }}>
                      {s.name}
                      <button onClick={() => toggleStudent(sid)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#a78bfa', display: 'flex', padding: 2 }}>
                        <X size={11} />
                      </button>
                    </span>
                  )
                })}
                {selectedStudentIds.size > 12 && (
                  <span style={{ color: D.muted, fontSize: 12, padding: '3px 8px' }}>
                    +{selectedStudentIds.size - 12} HS khác
                  </span>
                )}
              </div>
            )}
            {/* Picker dropdown */}
            {studentPickerOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                background: '#13141f', border: `1px solid ${D.border2}`, borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 20, maxHeight: 360, overflowY: 'auto',
              }}>
                <div style={{ position: 'sticky', top: 0, background: '#13141f', padding: 10, borderBottom: `1px solid ${D.border}` }}>
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Tìm HS theo tên / email / lớp..."
                    style={{ ...inputStyle, fontSize: 13 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={selectAllStudents} style={{
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: 6, color: '#4ade80', padding: '4px 10px', fontSize: 11,
                      fontWeight: 700, cursor: 'pointer',
                    }}>Chọn tất cả ({filteredRoster.length})</button>
                    <button onClick={clearAllStudents} style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 6, color: '#f87171', padding: '4px 10px', fontSize: 11,
                      fontWeight: 700, cursor: 'pointer',
                    }}>Bỏ chọn tất cả</button>
                  </div>
                </div>
                <div>
                  {filteredRoster.length === 0 ? (
                    <p style={{ color: D.muted, fontSize: 12, padding: 16, textAlign: 'center', margin: 0 }}>
                      Không tìm thấy HS phù hợp
                    </p>
                  ) : filteredRoster.map(s => {
                    const checked = selectedStudentIds.has(s.id)
                    return (
                      <label key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                          cursor: 'pointer', borderBottom: `1px solid ${D.border}`,
                          background: checked ? 'rgba(124,58,237,0.08)' : 'transparent',
                        }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 4,
                          background: checked ? D.purple : 'transparent',
                          border: `2px solid ${checked ? D.purple : D.border2}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: D.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{s.name}</p>
                          <p style={{ color: D.muted, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.email}{s.classNames.length > 0 && ` • ${s.classNames.join(', ')}`}
                          </p>
                        </div>
                        {!s.isLinked && (
                          <span style={{ fontSize: 9, color: '#facc15', background: 'rgba(234,179,8,0.1)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>
                            CHƯA LINK
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Tên Learning Path</label>
              <input
                style={inputStyle}
                placeholder="Ví dụ: Giải tích cơ bản – 2 tuần"
                value={pathName}
                onChange={e => setPathName(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Mô tả</label>
              <input
                style={inputStyle}
                placeholder="Mô tả ngắn gọn về lộ trình"
                value={pathDescription}
                onChange={e => setPathDescription(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ── 3-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 260px', gap: 18 }}>

          {/* ── Left: Available Modules ── */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <h3 style={{ color: D.text, fontSize: 15, fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <BookOpen size={16} style={{ color: '#a78bfa' }} /> Modules có sẵn
            </h3>

            {/* Nút "Tạo Module Mới" — đặt NGAY DƯỚI header để GV thấy ngay,
                không cần scroll xuống cuối list dài (user request 2026-05-19). */}
            <button
              onClick={() => setCreateModuleOpen(true)}
              style={{
                marginBottom: 12, width: '100%',
                background: 'linear-gradient(90deg, #7c3aed, #6d28d9)',
                border: '1px solid rgba(124,58,237,0.5)', borderRadius: 10,
                color: '#fff', cursor: 'pointer', padding: '10px 0',
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 3px 10px rgba(124,58,237,0.25)',
              }}
              title="Mở wizard tạo module với 9 loại: bài giảng, video, trắc nghiệm, khảo sát, kiểm tra cuối khoá, kĩ năng STEM, thách đấu HS..."
            >
              <Plus size={14} /> Tạo Module Mới
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {customModules.length > 0 && (
                <div style={{
                  fontSize: 10, color: '#a78bfa', textTransform: 'uppercase',
                  fontWeight: 800, letterSpacing: '0.05em',
                  paddingTop: 4, paddingBottom: 2,
                }}>
                  ✨ Module bạn vừa tạo
                </div>
              )}
              {customModules.map(module => (
                <div
                  key={module.id}
                  onClick={() => addModule(module)}
                  style={{
                    background: 'rgba(124,58,237,0.08)',
                    border: '1px solid rgba(124,58,237,0.4)', borderRadius: 10,
                    padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{MODULE_ICONS[module.type]}</span>
                    <DiffBadge diff={module.difficulty} />
                  </div>
                  <p style={{ color: D.text, fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>{module.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} /> {module.duration}m
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Zap size={10} /> {module.xpTarget} XP
                    </span>
                  </div>
                  {/* Rich content preview line */}
                  {(module.quizQuestions || module.surveyQuestions || module.videoUrl ||
                    module.examName || module.stemSkillName || module.challengeStudentName) && (
                    <div style={{
                      marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${D.border2}`,
                      fontSize: 10, color: '#c4b5fd', display: 'flex', flexWrap: 'wrap', gap: 6,
                    }}>
                      {module.quizQuestions && <span>· {module.quizQuestions.length} câu MCQ</span>}
                      {module.surveyQuestions && <span>· {module.surveyQuestions.length} câu khảo sát</span>}
                      {module.videoUrl && <span>· 🎬 {module.videoEmbedKind}</span>}
                      {module.examName && <span>· 🏆 {module.examName.slice(0, 20)}</span>}
                      {module.stemSkillName && <span>· ⚙️ {module.stemSkillName}</span>}
                      {module.challengeStudentName && <span>· ⚔️ vs {module.challengeStudentName}</span>}
                    </div>
                  )}
                </div>
              ))}

              {customModules.length > 0 && (
                <div style={{
                  fontSize: 10, color: D.muted, textTransform: 'uppercase',
                  fontWeight: 800, letterSpacing: '0.05em',
                  paddingTop: 8, paddingBottom: 2, borderTop: `1px solid ${D.border}`, marginTop: 2,
                }}>
                  Module mặc định (demo)
                </div>
              )}

              {AVAILABLE_MODULES.map(module => (
                <div
                  key={module.id}
                  onClick={() => addModule(module)}
                  style={{
                    background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10,
                    padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = D.border2)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{MODULE_ICONS[module.type]}</span>
                    <DiffBadge diff={module.difficulty} />
                  </div>
                  <p style={{ color: D.text, fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>{module.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} /> {module.duration}m
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Zap size={10} /> {module.xpTarget} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Center: Path Canvas ── */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ color: D.text, fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                <FolderKanban size={16} style={{ color: '#a78bfa' }} /> Lộ trình học tập
              </h3>
              {selectedModules.length > 0 && (
                <button
                  onClick={() => setSelectedModules([])}
                  style={{
                    background: 'transparent', border: '1px solid transparent', borderRadius: 8,
                    color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '4px 10px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {selectedModules.length === 0 ? (
              <div style={{
                border: `2px dashed ${D.border2}`, borderRadius: 12, padding: '48px 24px',
                textAlign: 'center', background: 'rgba(255,255,255,0.01)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(124,58,237,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                }}>
                  <Brain size={26} style={{ color: '#a78bfa' }} />
                </div>
                <p style={{ color: D.muted, fontSize: 14, fontWeight: 500, margin: 0 }}>
                  Click vào modules bên trái để thêm vào lộ trình
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {selectedModules.map((module, index) => (
                  <div key={`${module.id}-${index}`}>
                    {/* Module card */}
                    <div style={{
                      background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {/* Order controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <button
                            onClick={() => moveModule(index, 'up')}
                            disabled={index === 0}
                            style={{
                              background: 'transparent', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer',
                              color: D.muted, padding: 2, opacity: index === 0 ? 0.3 : 1,
                            }}
                          >
                            <GripVertical size={14} />
                          </button>
                          <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 900 }}>#{index + 1}</span>
                          <button
                            onClick={() => moveModule(index, 'down')}
                            disabled={index === selectedModules.length - 1}
                            style={{
                              background: 'transparent', border: 'none',
                              cursor: index === selectedModules.length - 1 ? 'not-allowed' : 'pointer',
                              color: D.muted, padding: 2,
                              opacity: index === selectedModules.length - 1 ? 0.3 : 1,
                            }}
                          >
                            <GripVertical size={14} />
                          </button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                            paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${D.border}`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 22 }}>{MODULE_ICONS[module.type]}</span>
                              <div>
                                <p style={{ color: D.text, fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{module.title}</p>
                                <p style={{ color: D.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>{module.type}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeModule(module.id)}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#f87171', padding: 4, borderRadius: 7,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Stats row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                              <p style={{ color: D.muted, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px' }}>Thời gian</p>
                              <p style={{ color: D.text, fontWeight: 700, fontSize: 13, margin: 0 }}>{module.duration}p</p>
                            </div>
                            <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                              <p style={{ color: D.muted, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px' }}>Mục tiêu XP</p>
                              <p style={{ color: '#a78bfa', fontWeight: 900, fontSize: 13, margin: 0 }}>{module.xpTarget}</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <p style={{ color: D.muted, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 4px' }}>Độ khó</p>
                              <DiffBadge diff={module.difficulty} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Connector arrow */}
                    {index < selectedModules.length - 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
                        <ChevronRight size={20} style={{ color: '#a78bfa', transform: 'rotate(90deg)' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Right Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Summary */}
            <Card>
              <h3 style={{ color: D.text, fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <TrendingUp size={15} style={{ color: '#4ade80' }} /> Tóm tắt
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Tổng số Modules', value: `${selectedModules.length}`, color: D.text, bg: 'rgba(255,255,255,0.03)', border: 'transparent' },
                  { label: 'Thời lượng dự kiến', value: `${totalDuration} phút`, color: D.text, bg: 'rgba(255,255,255,0.03)', border: 'transparent' },
                  { label: 'Tổng cung cấp XP', value: `${totalXP}`, color: '#a78bfa', bg: 'rgba(124,58,237,0.07)', border: 'rgba(124,58,237,0.2)' },
                  { label: 'Ước tính (Ngày)', value: `${estimatedDays} ngày`, color: '#facc15', bg: 'rgba(234,179,8,0.07)', border: 'rgba(234,179,8,0.2)' },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: row.bg, border: `1px solid ${row.border}`,
                    borderRadius: 8, padding: '7px 10px', fontSize: 13,
                  }}>
                    <span style={{ color: D.muted }}>{row.label}</span>
                    <span style={{ color: row.color, fontWeight: 800 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Suggestions */}
            <Card style={{ border: `1px solid rgba(124,58,237,0.25)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(124,58,237,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Brain size={15} style={{ color: '#a78bfa' }} />
                </div>
                <h3 style={{ color: D.text, fontWeight: 700, fontSize: 14, margin: 0 }}>Gợi ý AI</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {AI_SUGGESTIONS.map((s, idx) => {
                  const badgeColor = s.priority === 'high'
                    ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171' }
                    : { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', text: '#facc15' }
                  return (
                    <div key={idx} style={{
                      background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 10,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                        <p style={{ color: D.text, fontSize: 12, fontWeight: 700, margin: 0, maxWidth: '60%' }}>{s.module}</p>
                        <span style={{
                          display: 'inline-flex', background: badgeColor.bg,
                          border: `1px solid ${badgeColor.border}`, borderRadius: 5,
                          padding: '2px 7px', fontSize: 10, fontWeight: 700, color: badgeColor.text,
                          textTransform: 'capitalize', flexShrink: 0,
                        }}>{s.priority}</span>
                      </div>
                      <p style={{ color: D.muted, fontSize: 10, margin: '0 0 8px' }}>{s.reason}</p>
                      <button
                        style={{
                          width: '100%', background: 'transparent', border: `1px solid ${D.border2}`,
                          borderRadius: 7, color: D.muted, cursor: 'pointer', padding: '5px 0',
                          fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = D.border2; e.currentTarget.style.color = D.muted }}
                      >
                        Thêm vào Lộ trình
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Quick Settings */}
            <Card>
              <h3 style={{ color: D.text, fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Settings size={14} style={{ color: D.muted }} /> Cài đặt
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Mục tiêu XP / Ngày</label>
                  <input
                    type="number"
                    value={xpPerDay}
                    onChange={e => setXpPerDay(e.target.value)}
                    style={{ ...inputStyle, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Độ khó linh hoạt</label>
                  <select
                    value={diffMode}
                    onChange={e => setDiffMode(e.target.value)}
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="auto">Tự động (Theo AI)</option>
                    <option value="easy">Cố định - Dễ</option>
                    <option value="medium">Cố định - Vừa</option>
                    <option value="hard">Cố định - Khó</option>
                  </select>
                </div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  borderTop: `1px solid ${D.border}`, paddingTop: 12,
                }}>
                  <input
                    type="checkbox"
                    checked={autoAdjust}
                    onChange={e => setAutoAdjust(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: D.purple, cursor: 'pointer' }}
                  />
                  <span style={{ color: D.text, fontSize: 12, fontWeight: 500 }}>
                    Tự động điều chỉnh theo tiến trình
                  </span>
                </label>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Modal: Danh sách paths đã tạo (load để chỉnh sửa hoặc xoá) ── */}
      {pathsListOpen && (
        <div onClick={() => setPathsListOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: D.card, border: `1px solid ${D.border2}`, borderRadius: 16,
              maxWidth: 720, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${D.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ color: D.text, fontSize: 18, fontWeight: 800, margin: 0 }}>
                  📚 Learning Paths đã tạo
                </h3>
                <p style={{ color: D.muted, fontSize: 12, margin: '4px 0 0' }}>
                  {existingPaths.length} path · Click để load chỉnh sửa
                </p>
              </div>
              <button onClick={() => setPathsListOpen(false)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer', color: D.muted, padding: 6,
              }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {pathsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Loader2 size={28} className="animate-spin" style={{ color: D.purple, margin: '0 auto' }} />
                </div>
              ) : existingPaths.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <AlertCircle size={32} style={{ color: D.muted, margin: '0 auto 12px' }} />
                  <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>
                    Chưa có path nào — tạo path đầu tiên bằng form bên dưới
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {existingPaths.map(p => (
                    <div key={p.id} style={{
                      background: D.card2, border: `1px solid ${editingPathId === p.id ? D.purple : D.border}`,
                      borderRadius: 12, padding: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <button onClick={() => loadPath(p)} style={{
                          flex: 1, textAlign: 'left', background: 'transparent', border: 'none',
                          cursor: 'pointer', padding: 0,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <h4 style={{ color: D.text, fontSize: 14, fontWeight: 700, margin: 0 }}>
                              {p.name}
                            </h4>
                            {p.isTemplate && (
                              <span style={{ fontSize: 9, color: '#facc15', background: 'rgba(234,179,8,0.15)',
                                padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                TEMPLATE
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p style={{ color: D.muted, fontSize: 12, margin: '0 0 6px' }}>{p.description}</p>
                          )}
                          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: D.muted }}>
                            <span>📦 {p.modules.length} modules</span>
                            <span>⏱ {p.totalDuration}p</span>
                            <span>⚡ {p.totalXP} XP</span>
                            <span>👥 {p.assignedCount} HS</span>
                          </div>
                        </button>
                        <button onClick={() => deletePath(p.id, p.name)} style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8, color: '#f87171', cursor: 'pointer', padding: 6,
                        }} title="Xoá path">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tạo Module Mới Modal ── */}
      <Suspense fallback={null}>
        <CreateModuleModal
          open={createModuleOpen}
          onClose={() => setCreateModuleOpen(false)}
          onCreate={handleCreateModule}
          roster={roster}
        />
      </Suspense>
    </div>
  )
}
