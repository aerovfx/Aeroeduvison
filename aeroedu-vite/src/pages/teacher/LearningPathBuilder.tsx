/**
 * LearningPathBuilder — Wizard 5 bước tạo Learning Path với khung năng lực.
 *
 * Steps:
 *   1. Cơ bản       — tên/mô tả/môn/độ khó/ước tính ngày học
 *   2. Năng lực     — pick competency pillars + target levels (Chương trình GDPT 2018 + STEM)
 *   3. Mục lục      — chọn/tạo modules, kéo thả thứ tự
 *   4. Đánh giá     — rubric per-module + grading scale tổng path
 *   5. Gán HS       — multi-select students from roster
 *   6. Xem trước    — review + save/publish
 *
 * Lưu vào /api/teacher/learning-paths với competencies + pathRubric fields.
 */
import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import {
  Plus, Brain, BookOpen, Save, Settings, Zap, Clock, ChevronLeft, ChevronRight,
  Trash2, GripVertical, Users, X, FolderOpen, Check, Loader2, Target, Scale,
  Eye, Award, Edit3, AlertCircle, Sparkles,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'
import CompetencyPicker, { type CompetencyTarget } from '@/components/learning-path/CompetencyPicker'
import CompetencyCoverage from '@/components/learning-path/CompetencyCoverage'
import RubricEditor, { defaultEvaluation, type ModuleEvaluation } from '@/components/learning-path/RubricEditor'
import KgPathSuggester, { type KgSuggestedModule } from '@/components/learning-path/KgPathSuggester'
import KgPathSketch, { type SketchModuleOut } from '@/components/learning-path/KgPathSketch'
import { MODULE_TYPE_TO_PILLARS, getPillar, COMPETENCY_LEVELS } from '@/lib/competency-framework'

const CreateModuleModal = lazy(() => import('@/components/learning-path/CreateModuleModal'))

/* ── Dark palette ── */
const D = {
  bg:      'var(--td-bg)',
  card:    'var(--td-card)',
  card2:   'var(--td-card2)',
  border:  'var(--td-border)',
  border2: 'var(--td-border2)',
  text:    'var(--td-text)',
  muted:   'var(--td-muted)',
  purple:  'var(--td-purple)',
  green:   'var(--td-green)',
  amber:   'var(--td-amber)',
  red:     'var(--td-red)',
  cyan:    'var(--td-cyan)',
} as const

/* ── Types ── */
export type Difficulty = 'easy' | 'medium' | 'hard'
export type ModuleType =
  | 'lesson' | 'quiz' | 'project' | 'assignment'
  | 'video' | 'survey' | 'final-exam' | 'stem-skill' | 'challenge'

export interface QuizQuestion {
  id: string; q: string; options: string[]; correctIndex: number; explanation?: string
}
export interface SurveyQuestion {
  id: string; q: string; type: 'rating' | 'text' | 'choice'; options?: string[]; scaleMax?: number
}
export type VideoEmbedKind = 'youtube' | 'vimeo' | 'mp4' | 'gcs'
export type ChallengeFormat = 'speed-quiz' | 'best-of-3' | 'duel-3min'

export interface Module {
  id: string
  type: ModuleType
  title: string
  subject: string
  difficulty: Difficulty
  duration: number
  xpTarget: number
  prerequisites?: string[]
  description?: string
  tags?: string[]
  passingScore?: number
  attempts?: number
  videoUrl?: string
  videoEmbedKind?: VideoEmbedKind
  quizQuestions?: QuizQuestion[]
  surveyQuestions?: SurveyQuestion[]
  examId?: string
  examName?: string
  stemSkillId?: string
  stemSkillName?: string
  challengeStudentId?: string
  challengeStudentName?: string
  challengeFormat?: ChallengeFormat
  // V2: competency framework + rubric
  competencies?: CompetencyTarget[]
  evaluation?: ModuleEvaluation
  // V3: KG source (track origin nếu module được sinh từ KG suggester)
  kgNodeId?: string
  kgNodeType?: string
}

export interface RosterStudent {
  id: string; userId: string | null; name: string; email: string
  avatar: string | null; classNames: string[]; isLinked: boolean
}

interface LearningPath {
  id: string; name: string; description: string; subject: string | null
  difficulty: string; modules: Module[]; estimatedDays: number; totalXP: number
  totalDuration: number; isTemplate: boolean
  assignments: Array<{ id: string; studentId: string; studentName: string; studentEmail: string; status: string; progressPct: number }>
  assignedCount: number; createdAt: string; updatedAt: string
  // V2:
  competencies?: CompetencyTarget[]
  pathRubric?: PathRubric
}

interface PathRubric {
  gradingScale?: 'percent' | '10' | '4'                  // % / thang 10 / thang 4
  certificateThreshold?: number                          // % để được chứng chỉ
  recognitionLevels?: { name: string; minPercent: number; color: string }[]
}

const DEFAULT_PATH_RUBRIC: PathRubric = {
  gradingScale: 'percent',
  certificateThreshold: 70,
  recognitionLevels: [
    { name: 'Xuất sắc',   minPercent: 90, color: '#fbbf24' },
    { name: 'Giỏi',       minPercent: 80, color: '#a78bfa' },
    { name: 'Khá',        minPercent: 70, color: '#60a5fa' },
    { name: 'Trung bình', minPercent: 50, color: '#94a3b8' },
  ],
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

const MODULE_ICONS: Record<ModuleType, string> = {
  lesson: '📖', quiz: '📝', project: '🎯', assignment: '📋',
  video: '🎬', survey: '📊', 'final-exam': '🏆', 'stem-skill': '⚙️', challenge: '⚔️',
}

const DIFF_COLORS: Record<Difficulty, { bg: string; border: string; text: string; label: string }> = {
  easy:   { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  text: '#4ade80', label: 'Dễ' },
  medium: { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  text: '#facc15', label: 'TB' },
  hard:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#f87171', label: 'Khó' },
}

const SUBJECTS = [
  { id: 'mathematics', label: 'Toán' }, { id: 'physics', label: 'Vật lý' },
  { id: 'chemistry', label: 'Hoá' }, { id: 'biology', label: 'Sinh' },
  { id: 'literature', label: 'Văn' }, { id: 'english', label: 'Tiếng Anh' },
  { id: 'history', label: 'Sử' }, { id: 'geography', label: 'Địa' },
  { id: 'informatics', label: 'Tin học' }, { id: 'technology', label: 'Công nghệ' },
  { id: 'stem', label: 'STEM liên môn' },
]

/* ── Static suggestions ── */
const AVAILABLE_MODULES: Module[] = [
  { id: 'math-derivatives-1', type: 'lesson', title: 'Giới thiệu Đạo hàm',    subject: 'mathematics', difficulty: 'easy',   duration: 30, xpTarget: 80 },
  { id: 'math-derivatives-2', type: 'lesson', title: 'Quy tắc tính đạo hàm', subject: 'mathematics', difficulty: 'medium', duration: 45, xpTarget: 120 },
  { id: 'math-quiz-1',        type: 'quiz',   title: 'Kiểm tra Đạo hàm',     subject: 'mathematics', difficulty: 'medium', duration: 20, xpTarget: 100 },
  { id: 'math-integrals-1',   type: 'lesson', title: 'Tích phân cơ bản',      subject: 'mathematics', difficulty: 'hard',   duration: 60, xpTarget: 150 },
  { id: 'math-project-1',     type: 'project',title: 'Dự án: Ứng dụng Giải tích', subject: 'mathematics', difficulty: 'hard', duration: 90, xpTarget: 200 },
]

/* ── Wizard Steps ── */
type StepId = 0 | 1 | 2 | 3 | 4 | 5
const STEPS: { id: StepId; label: string; icon: typeof BookOpen }[] = [
  { id: 0, label: 'Cơ bản',     icon: BookOpen },
  { id: 1, label: 'Năng lực',   icon: Target },
  { id: 2, label: 'Mục lục',    icon: FolderOpen },
  { id: 3, label: 'Đánh giá',   icon: Scale },
  { id: 4, label: 'Gán HS',     icon: Users },
  { id: 5, label: 'Xem trước',  icon: Eye },
]

// StepNav — thanh tiến trình 5-6 bước, chặn nhảy bước chưa hợp lệ
function StepNav({ current, onJump, blocked }: {
  current: StepId; onJump: (s: StepId) => void; blocked: Record<StepId, boolean>
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
      {STEPS.map((s, i) => {
        const done = s.id < current
        const active = s.id === current
        const disabled = !!blocked[s.id]
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => !disabled && onJump(s.id)}
              disabled={disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
                background: active ? 'rgba(168,139,250,0.18)' : done ? 'rgba(74,222,128,0.10)' : 'transparent',
                border: `1.5px solid ${active ? '#a78bfa' : done ? '#22c55e60' : 'rgba(255,255,255,0.1)'}`,
                color: active ? '#a78bfa' : done ? '#4ade80' : disabled ? 'rgba(255,255,255,0.25)' : '#fff',
                fontWeight: 700, fontSize: 13, opacity: disabled ? 0.5 : 1,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: done ? '#22c55e' : active ? '#a78bfa' : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#0a0612',
              }}>
                {done ? <Check size={12} /> : (i + 1)}
              </div>
              <span style={{ whiteSpace: 'nowrap' }}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Helpers ── */
function newId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function applyDefaultsToModule(m: Module): Module {
  const suggested = MODULE_TYPE_TO_PILLARS[m.type] || []
  return {
    ...m,
    competencies: m.competencies && m.competencies.length > 0
      ? m.competencies
      : suggested.slice(0, 2).map(pillarId => ({ pillarId, targetLevel: 2 as const })),
    evaluation: m.evaluation || defaultEvaluation(),
  }
}

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20,
    ...style,
  }}>
    {children}
  </div>
)

const labelStyle: React.CSSProperties = {
  color: D.muted, fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10,
  color: D.text, fontSize: 14, padding: '9px 14px',
  width: '100%', boxSizing: 'border-box', outline: 'none',
}

/* ── Main Component ── */
// Component chính: wizard dựng lộ trình học + gán HS + xuất bản
export default function LearningPathBuilder() {
  const [step, setStep] = useState<StepId>(0)

  // Path metadata
  const [pathName, setPathName] = useState('')
  const [pathDescription, setPathDescription] = useState('')
  const [pathSubject, setPathSubject] = useState('mathematics')
  const [pathDifficulty, setPathDifficulty] = useState<Difficulty>('medium')

  // V2: competency targets + rubric
  const [pathCompetencies, setPathCompetencies] = useState<CompetencyTarget[]>([])
  const [pathRubric, setPathRubric] = useState<PathRubric>(DEFAULT_PATH_RUBRIC)

  // Modules
  const [selectedModules, setSelectedModules] = useState<Module[]>([])

  // Students
  const [roster, setRoster] = useState<RosterStudent[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [studentSearch, setStudentSearch] = useState('')

  // Existing paths
  const [existingPaths, setExistingPaths] = useState<LearningPath[]>([])
  const [pathsListOpen, setPathsListOpen] = useState(false)
  const [editingPathId, setEditingPathId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Module creation
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  const [customModules, setCustomModules] = useState<Module[]>([])
  const [activeModuleIdForRubric, setActiveModuleIdForRubric] = useState<string | null>(null)

  // KG method tabs (Suggester vs Sketch) + Sketch modal
  const [kgMethod, setKgMethod] = useState<'suggest' | 'sketch'>('suggest')
  const [sketchOpen, setSketchOpen] = useState(false)

  const handleCreateModule = (m: Module) => {
    const enriched = applyDefaultsToModule(m)
    setCustomModules(prev => [enriched, ...prev])
    setSelectedModules(prev => [...prev, enriched])
  }

  /* KG → Module helpers */
  const kgSuggestedToModule = (kg: KgSuggestedModule): Module => applyDefaultsToModule({
    id: kg.id,
    type: kg.type,
    title: kg.title,
    subject: kg.subject || pathSubject,
    difficulty: kg.difficulty,
    duration: kg.duration,
    xpTarget: kg.xpTarget,
    description: kg.description,
    tags: kg.tags,
    kgNodeId: kg.kgNodeId,
    kgNodeType: kg.kgNodeType,
  })

  const handleKgAddOne = (kg: KgSuggestedModule) => {
    const m = kgSuggestedToModule(kg)
    setSelectedModules(prev => [...prev, m])
    toast.success(`Đã thêm "${m.title}" từ KG`)
  }

  const handleKgAddMany = (mods: KgSuggestedModule[]) => {
    if (mods.length === 0) return
    const converted = mods.map(kgSuggestedToModule)
    setSelectedModules(prev => [...prev, ...converted])
    toast.success(`Đã thêm ${converted.length} module từ KG`)
  }

  // Method 2: từ Sketch canvas → modules (already topologically sorted)
  const handleSketchSave = (mods: SketchModuleOut[]) => {
    if (mods.length === 0) return
    const converted = mods.map((m): Module => applyDefaultsToModule({
      id: m.id,
      type: m.type,
      title: m.title,
      subject: m.subject || pathSubject,
      difficulty: m.difficulty,
      duration: m.duration,
      xpTarget: m.xpTarget,
      description: m.description,
      tags: m.tags,
      kgNodeId: m.kgNodeId,
      kgNodeType: m.kgNodeType,
    }))
    setSelectedModules(prev => [...prev, ...converted])
    toast.success(`Đã chuyển ${converted.length} node thành module (topological order)`)
  }

  /* Track which KG nodes are already in path (để tránh thêm trùng) */
  const existingKgNodeIds = useMemo(
    () => selectedModules.map(m => m.kgNodeId).filter((x): x is string => !!x),
    [selectedModules]
  )

  // Load roster + paths
  useEffect(() => {
    (async () => {
      setRosterLoading(true)
      try {
        const r = await api.get<{ students: RosterStudent[] }>('/teacher/roster')
        setRoster(Array.isArray(r.data?.students) ? r.data.students : [])
      } catch { /* ignore */ }
      finally { setRosterLoading(false) }
    })()
    ;(async () => {
      try {
        const r = await api.get<{ paths: LearningPath[] }>('/teacher/learning-paths')
        setExistingPaths(Array.isArray(r.data?.paths) ? r.data.paths : [])
      } catch { /* ignore */ }
    })()
  }, [])

  const totalXP       = selectedModules.reduce((s, m) => s + m.xpTarget, 0)
  const totalDuration = selectedModules.reduce((s, m) => s + m.duration, 0)
  const estimatedDays = Math.max(1, Math.ceil(totalDuration / 60))

  const filteredRoster = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return roster
    return roster.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.classNames.some(c => c.toLowerCase().includes(q)))
  }, [roster, studentSearch])

  const newPath = () => {
    setEditingPathId(null)
    setPathName(''); setPathDescription(''); setPathSubject('mathematics'); setPathDifficulty('medium')
    setSelectedModules([])
    setSelectedStudentIds(new Set())
    setPathCompetencies([]); setPathRubric(DEFAULT_PATH_RUBRIC)
    setStep(0)
  }

  const loadPath = (p: LearningPath) => {
    setEditingPathId(p.id)
    setPathName(p.name)
    setPathDescription(p.description || '')
    setPathSubject(p.subject || 'mathematics')
    setPathDifficulty((p.difficulty as Difficulty) || 'medium')
    setSelectedModules(p.modules.map(applyDefaultsToModule))
    const ids = new Set<string>()
    for (const a of p.assignments || []) ids.add(a.studentId)
    setSelectedStudentIds(ids)
    setPathCompetencies(p.competencies || [])
    setPathRubric({ ...DEFAULT_PATH_RUBRIC, ...(p.pathRubric || {}) })
    setPathsListOpen(false)
    setStep(0)
  }

  const stepBlocked: Record<StepId, boolean> = {
    0: false,
    1: !pathName.trim(),
    2: !pathName.trim(),
    3: !pathName.trim() || selectedModules.length === 0,
    4: !pathName.trim() || selectedModules.length === 0,
    5: !pathName.trim() || selectedModules.length === 0,
  }

  const goNext = () => {
    const nextStep = Math.min(5, step + 1) as StepId
    if (!stepBlocked[nextStep]) setStep(nextStep)
  }
  const goPrev = () => setStep(Math.max(0, step - 1) as StepId)

  const updateModule = (id: string, patch: Partial<Module>) => {
    setSelectedModules(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }
  const removeModule = (id: string) => {
    setSelectedModules(prev => prev.filter(m => m.id !== id))
  }
  const moveModule = (id: string, dir: -1 | 1) => {
    setSelectedModules(prev => {
      const i = prev.findIndex(m => m.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const savePath = async () => {
    if (!pathName.trim() || selectedModules.length === 0 || saving) return
    setSaving(true)
    try {
      const assignTo = Array.from(selectedStudentIds).map(sid => {
        const r = roster.find(x => x.id === sid)
        return { studentId: sid, studentName: r?.name || '', studentEmail: r?.email || '' }
      })
      const payload = {
        name: pathName,
        description: pathDescription,
        subject: pathSubject,
        difficulty: pathDifficulty,
        modules: selectedModules,
        competencies: pathCompetencies,
        pathRubric,
      }
      if (editingPathId) {
        await api.patch(`/teacher/learning-paths/${editingPathId}`, payload)
        if (assignTo.length > 0) {
          await api.post(`/teacher/learning-paths/${editingPathId}/assign`, { students: assignTo })
        }
        toast.success(`Đã cập nhật "${pathName}" — gán cho ${assignTo.length} HS`)
      } else {
        await api.post('/teacher/learning-paths', { ...payload, assignTo })
        toast.success(`Đã tạo "${pathName}" — gán cho ${assignTo.length} HS`)
      }
      const r = await api.get<{ paths: LearningPath[] }>('/teacher/learning-paths')
      setExistingPaths(Array.isArray(r.data?.paths) ? r.data.paths : [])
      newPath()
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi lưu path'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const deletePath = async (pathId: string, name: string) => {
    if (!confirm(`Xoá path "${name}"? Tất cả assignments cho HS sẽ bị xoá theo.`)) return
    try {
      await api.delete(`/teacher/learning-paths/${pathId}`)
      toast.success(`Đã xoá path "${name}"`)
      setExistingPaths(prev => prev.filter(p => p.id !== pathId))
      if (editingPathId === pathId) newPath()
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi xoá path'
      toast.error(msg)
    }
  }

  const activeModuleForRubric = selectedModules.find(m => m.id === activeModuleIdForRubric)

  return (
    <div style={{ background: D.bg, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ── */}
        <Card style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
            background: 'linear-gradient(120deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.05) 100%)',
          }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 13, flexShrink: 0,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Brain size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                <h1 style={{ color: D.text, fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>
                  🎓 Learning Path Builder
                </h1>
                <p style={{ color: D.muted, fontSize: 12.5, margin: 0 }}>
                  {editingPathId
                    ? `Đang chỉnh sửa: "${pathName || '...'}" — sẽ ghi đè khi lưu`
                    : 'Soạn lộ trình từ Knowledge Graph — gắn khung năng lực GDPT 2018 + STEM'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPathsListOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${D.border}`,
                  color: D.text, fontSize: 13, fontWeight: 700,
                }}
              >
                <FolderOpen size={14} /> Path đã tạo ({existingPaths.length})
              </button>
              {editingPathId && (
                <button
                  onClick={newPath}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.35)',
                    color: '#22d3ee', fontSize: 13, fontWeight: 700,
                  }}
                >
                  <Plus size={14} /> Path mới
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* ── Step navigation ── */}
        <StepNav current={step} onJump={setStep} blocked={stepBlocked} />

        {/* ─── Step 0: CƠ BẢN ─── */}
        {step === 0 && (
          <Card>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} style={{ color: '#a78bfa' }} /> 1. Thông tin cơ bản
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={labelStyle}>Tên lộ trình <span style={{ color: D.red }}>*</span></label>
                <input
                  value={pathName} onChange={e => setPathName(e.target.value)}
                  placeholder="VD: Lộ trình Đạo hàm & Tích phân — 11 tuần"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Mô tả mục tiêu lộ trình</label>
                <textarea
                  value={pathDescription} onChange={e => setPathDescription(e.target.value)}
                  rows={3}
                  placeholder="HS hoàn thành lộ trình sẽ làm được gì? Áp dụng vào thực tiễn ra sao?"
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Môn học chủ đạo</label>
                  <select value={pathSubject} onChange={e => setPathSubject(e.target.value)} style={inputStyle}>
                    {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Độ khó tổng thể</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setPathDifficulty(d)}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          background: pathDifficulty === d ? DIFF_COLORS[d].bg : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${pathDifficulty === d ? DIFF_COLORS[d].border : 'rgba(255,255,255,0.08)'}`,
                          color: pathDifficulty === d ? DIFF_COLORS[d].text : D.muted,
                          fontWeight: 700, fontSize: 13,
                        }}
                      >
                        {DIFF_COLORS[d].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ─── Step 1: NĂNG LỰC ─── */}
        {step === 1 && (
          <Card>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={18} style={{ color: '#a78bfa' }} /> 2. Năng lực mục tiêu
            </h2>
            <p style={{ fontSize: 12.5, color: D.muted, margin: '0 0 16px' }}>
              Chọn các trụ cột năng lực mà lộ trình hướng đến (Chương trình GDPT 2018 + STEM)
              và cấp độ mục tiêu HS phải đạt sau khi hoàn thành lộ trình.
            </p>
            <CompetencyPicker
              value={pathCompetencies}
              onChange={setPathCompetencies}
              mode="inline"
            />
          </Card>
        )}

        {/* ─── Step 2: MỤC LỤC ─── */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }} className="lpb-grid">
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderOpen size={18} style={{ color: '#a78bfa' }} /> 3. Mục lục lộ trình ({selectedModules.length})
                </h2>
                <button
                  onClick={() => setCreateModuleOpen(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(168,139,250,0.15)', border: '1px solid rgba(168,139,250,0.4)',
                    color: '#a78bfa', fontWeight: 700, fontSize: 12.5,
                  }}
                >
                  <Plus size={14} /> Tạo module mới
                </button>
              </div>

              {selectedModules.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.12)',
                }}>
                  <p style={{ fontSize: 13, color: D.muted, margin: 0 }}>
                    Chưa có module. Bấm "Tạo module mới" hoặc chọn từ danh sách bên phải.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedModules.map((m, idx) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12,
                        background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10,
                      }}
                    >
                      <GripVertical size={14} style={{ color: D.muted, marginTop: 4, cursor: 'grab' }} />
                      <span style={{ fontSize: 22 }}>{MODULE_ICONS[m.type]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1.5px 6px', borderRadius: 4,
                            background: 'rgba(168,139,250,0.15)', color: '#a78bfa',
                          }}>#{idx + 1}</span>
                          <span style={{ fontWeight: 700, color: D.text, fontSize: 13.5 }}>{m.title}</span>
                          <span style={{ fontSize: 10.5, color: D.muted }}>· {MODULE_TYPE_LABELS[m.type]}</span>
                          <span style={{
                            fontSize: 10, padding: '1.5px 6px', borderRadius: 4,
                            background: DIFF_COLORS[m.difficulty].bg, color: DIFF_COLORS[m.difficulty].text,
                            border: `1px solid ${DIFF_COLORS[m.difficulty].border}`,
                          }}>{DIFF_COLORS[m.difficulty].label}</span>
                          {m.kgNodeId && (
                            <span title={`Từ KG · ${m.kgNodeType || 'Node'}`} style={{
                              fontSize: 10, padding: '1.5px 6px', borderRadius: 4,
                              background: 'rgba(168,139,250,0.15)', color: '#a78bfa',
                              border: '1px solid rgba(168,139,250,0.3)',
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                            }}>
                              <Brain size={9} /> KG
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: D.muted, display: 'flex', gap: 12, marginBottom: 6 }}>
                          <span>⏱ {m.duration} phút</span>
                          <span>⭐ {m.xpTarget} XP</span>
                        </div>
                        <CompetencyPicker
                          value={m.competencies || []}
                          onChange={(next) => updateModule(m.id, { competencies: next })}
                          mode="compact"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button onClick={() => moveModule(m.id, -1)} disabled={idx === 0}
                          style={{ padding: 4, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: D.text, cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                          <ChevronLeft size={12} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <button onClick={() => moveModule(m.id, 1)} disabled={idx === selectedModules.length - 1}
                          style={{ padding: 4, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: D.text, cursor: 'pointer', opacity: idx === selectedModules.length - 1 ? 0.3 : 1 }}>
                          <ChevronLeft size={12} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <button onClick={() => removeModule(m.id)}
                          style={{ padding: 4, borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="lpb-sidebar">
              {/* ── 🧠 2 METHODS từ KG: Suggester + Sketch ──
                  User: "xây dựng lộ trình học dựa vào 2 phương pháp:
                   1. Node KG gợi ý mở rộng từ khoá có quan hệ
                   2. Bảng kéo thả node + nối các node tạo lộ trình
                   Sau đó GV điền nội dung cụ thể" */}
              <Card style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(99,102,241,0.04))', border: '1px solid rgba(168,139,250,0.25)' }}>
                <h3 style={{
                  fontSize: 13, fontWeight: 800, color: D.text, margin: '0 0 8px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Brain size={14} style={{ color: '#a78bfa' }} />
                  Xây lộ trình từ Knowledge Graph
                </h3>
                {/* 2-tab sub-toggle */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, padding: 2,
                  background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                  <button onClick={() => setKgMethod('suggest')}
                    style={{
                      flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                      background: kgMethod === 'suggest' ? 'rgba(168,139,250,0.25)' : 'transparent',
                      border: kgMethod === 'suggest' ? '1px solid #a78bfa' : '1px solid transparent',
                      color: kgMethod === 'suggest' ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                      fontWeight: 700, fontSize: 10.5,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                    🔍 Cách 1: Gợi ý
                  </button>
                  <button onClick={() => setKgMethod('sketch')}
                    style={{
                      flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                      background: kgMethod === 'sketch' ? 'rgba(34,211,238,0.2)' : 'transparent',
                      border: kgMethod === 'sketch' ? '1px solid #22d3ee' : '1px solid transparent',
                      color: kgMethod === 'sketch' ? '#22d3ee' : 'rgba(255,255,255,0.55)',
                      fontWeight: 700, fontSize: 10.5,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                    🎨 Cách 2: Bảng vẽ
                  </button>
                </div>
                {kgMethod === 'suggest' ? (
                  <>
                    <p style={{ fontSize: 10.5, color: D.muted, margin: '0 0 10px', lineHeight: 1.4 }}>
                      Thuật toán tự tìm node liên quan từ keyword
                    </p>
                    <KgPathSuggester
                      pathSubject={pathSubject}
                      onAdd={handleKgAddOne}
                      onAddMany={handleKgAddMany}
                      existingKgNodeIds={existingKgNodeIds}
                    />
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 10.5, color: D.muted, margin: '0 0 8px', lineHeight: 1.4 }}>
                      Mở bảng vẽ riêng — kéo thả node + nối edge → điền nội dung
                    </p>
                    <button onClick={() => setSketchOpen(true)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                        border: 'none', color: '#fff', fontWeight: 700, fontSize: 12,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                      🎨 Mở bảng vẽ lộ trình
                    </button>
                  </>
                )}
              </Card>

              <Card>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: '0 0 12px' }}>📦 Modules gợi ý (mẫu)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {[...customModules, ...AVAILABLE_MODULES].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModules(prev => [...prev, applyDefaultsToModule({ ...m, id: newId() })])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: 8,
                        borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        background: 'rgba(255,255,255,0.03)', border: `1px solid ${D.border}`,
                        color: D.text, fontSize: 12,
                      }}
                    >
                      <span>{MODULE_ICONS[m.type]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{m.title}</div>
                        <div style={{ fontSize: 10, color: D.muted }}>
                          {MODULE_TYPE_LABELS[m.type]} · {m.duration}p · {m.xpTarget} XP
                        </div>
                      </div>
                      <Plus size={14} style={{ color: '#a78bfa' }} />
                    </button>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: '0 0 8px' }}>📊 Tổng quan</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: D.muted }}>Tổng XP</span>
                    <strong style={{ color: '#fbbf24' }}>{totalXP}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: D.muted }}>Tổng thời gian</span>
                    <strong style={{ color: D.text }}>{totalDuration} phút</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: D.muted }}>Ước tính</span>
                    <strong style={{ color: '#a78bfa' }}>{estimatedDays} ngày</strong>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ─── Step 3: ĐÁNH GIÁ ─── */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }} className="lpb-grid">
            <Card>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={18} style={{ color: '#a78bfa' }} /> 4. Rubric đánh giá theo module
              </h2>
              <p style={{ fontSize: 12.5, color: D.muted, margin: '0 0 16px' }}>
                Chọn module rồi soạn rubric chi tiết. Tổng trọng số tiêu chí mỗi module phải = 100%.
              </p>

              {selectedModules.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.12)' }}>
                  <p style={{ color: D.muted, margin: 0, fontSize: 13 }}>Chưa có module để đánh giá. Quay lại Step 3 để thêm.</p>
                </div>
              ) : !activeModuleForRubric ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedModules.map((m, idx) => {
                    const evalConfigured = m.evaluation && m.evaluation.criteria.length > 0
                    return (
                      <button
                        key={m.id}
                        onClick={() => setActiveModuleIdForRubric(m.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                          borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                          background: D.card2, border: `1px solid ${D.border2}`,
                          color: D.text,
                        }}
                      >
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(168,139,250,0.15)', color: '#a78bfa',
                        }}>#{idx + 1}</span>
                        <span style={{ fontSize: 18 }}>{MODULE_ICONS[m.type]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
                          <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
                            {evalConfigured ? `${m.evaluation!.criteria.length} tiêu chí · ${m.evaluation!.evidenceType}` : '⚠ chưa cấu hình rubric'}
                          </div>
                        </div>
                        <Edit3 size={14} style={{ color: '#a78bfa' }} />
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: 10, background: D.card2, borderRadius: 8 }}>
                    <button onClick={() => setActiveModuleIdForRubric(null)}
                      style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
                      <ChevronLeft size={14} /> Danh sách module
                    </button>
                    <span style={{ color: D.muted, fontSize: 12 }}>/</span>
                    <span style={{ fontSize: 18 }}>{MODULE_ICONS[activeModuleForRubric.type]}</span>
                    <strong style={{ fontSize: 13, color: D.text }}>{activeModuleForRubric.title}</strong>
                  </div>
                  <RubricEditor
                    evaluation={activeModuleForRubric.evaluation || defaultEvaluation()}
                    competencies={activeModuleForRubric.competencies || []}
                    onChange={(nextEval) => updateModule(activeModuleForRubric.id, { evaluation: nextEval })}
                  />
                </div>
              )}
            </Card>

            <Card>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={14} style={{ color: '#fbbf24' }} /> Thang đánh giá tổng path
              </h3>
              <div>
                <label style={labelStyle}>Thang điểm</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {(['percent', '10', '4'] as const).map(s => (
                    <button key={s}
                      onClick={() => setPathRubric({ ...pathRubric, gradingScale: s })}
                      style={{
                        flex: 1, padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                        background: pathRubric.gradingScale === s ? 'rgba(168,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${pathRubric.gradingScale === s ? '#a78bfa' : D.border}`,
                        color: pathRubric.gradingScale === s ? '#a78bfa' : D.muted,
                        fontSize: 11.5, fontWeight: 700,
                      }}>
                      {s === 'percent' ? '% (0-100)' : s === '10' ? 'Thang 10' : 'Thang 4'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Ngưỡng chứng chỉ (%)</label>
                <input type="number" min={0} max={100}
                  value={pathRubric.certificateThreshold || 70}
                  onChange={e => setPathRubric({ ...pathRubric, certificateThreshold: Number(e.target.value) || 0 })}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Mức công nhận</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {pathRubric.recognitionLevels?.map((lv, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                      borderRadius: 6, background: `${lv.color}15`, border: `1px solid ${lv.color}40`,
                      fontSize: 11.5,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: lv.color }} />
                      <strong style={{ color: lv.color, flex: 1 }}>{lv.name}</strong>
                      <span style={{ color: D.muted }}>≥ {lv.minPercent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ─── Step 4: GÁN HS ─── */}
        {step === 4 && (
          <Card>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} style={{ color: '#a78bfa' }} /> 5. Gán cho học sinh ({selectedStudentIds.size})
            </h2>
            <input
              value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
              placeholder="Tìm theo tên / email / lớp..."
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            {rosterLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: D.muted }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, overflowY: 'auto' }}>
                {filteredRoster.length === 0 ? (
                  <p style={{ color: D.muted, textAlign: 'center', padding: 20, fontSize: 13 }}>
                    Không tìm thấy học sinh.
                  </p>
                ) : filteredRoster.map(s => {
                  const sel = selectedStudentIds.has(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        const next = new Set(selectedStudentIds)
                        if (sel) next.delete(s.id); else next.add(s.id)
                        setSelectedStudentIds(next)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8,
                        background: sel ? 'rgba(168,139,250,0.12)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${sel ? '#a78bfa' : D.border}`,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4,
                        background: sel ? '#a78bfa' : 'transparent',
                        border: `1.5px solid ${sel ? '#a78bfa' : D.muted}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {sel && <Check size={11} style={{ color: '#fff' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: D.text }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: D.muted }}>
                          {s.email}{s.classNames.length > 0 ? ' · ' + s.classNames.join(', ') : ''}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {/* ─── Step 5: XEM TRƯỚC ─── */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={18} style={{ color: '#a78bfa' }} /> 6. Xem trước & Lưu
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Module', value: selectedModules.length, color: '#a78bfa' },
                  { label: 'Năng lực', value: pathCompetencies.length, color: '#22d3ee' },
                  { label: 'XP', value: totalXP, color: '#fbbf24' },
                  { label: 'HS gán', value: selectedStudentIds.size, color: '#34d399' },
                ].map(s => (
                  <div key={s.label} style={{ padding: 12, background: D.card2, borderRadius: 10, textAlign: 'center', border: `1px solid ${D.border2}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: D.muted, padding: 12, background: D.card2, borderRadius: 8, marginBottom: 12 }}>
                <strong style={{ color: D.text }}>{pathName || '(chưa đặt tên)'}</strong>
                {pathDescription && <p style={{ margin: '4px 0 0' }}>{pathDescription}</p>}
              </div>
            </Card>

            <CompetencyCoverage modules={selectedModules} pathCompetencies={pathCompetencies} />

            <Card>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: '0 0 10px' }}>
                ✅ Checklist trước khi xuất bản
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                {[
                  { ok: pathName.trim().length > 0, text: 'Đã đặt tên lộ trình' },
                  { ok: selectedModules.length > 0, text: `Có ít nhất 1 module (hiện ${selectedModules.length})` },
                  { ok: pathCompetencies.length > 0, text: `Đã chọn năng lực mục tiêu (${pathCompetencies.length})` },
                  { ok: selectedModules.every(m => (m.competencies?.length || 0) > 0), text: 'Mọi module có gắn năng lực' },
                  { ok: selectedModules.every(m => m.evaluation && m.evaluation.criteria.length > 0), text: 'Mọi module có rubric' },
                  { ok: selectedStudentIds.size > 0, text: `Đã chọn học sinh (${selectedStudentIds.size})` },
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.ok ? '#4ade80' : '#fbbf24' }}>
                    {c.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
            </Card>

            <button
              onClick={savePath}
              disabled={saving || !pathName.trim() || selectedModules.length === 0}
              style={{
                padding: '14px 24px', borderRadius: 12, cursor: 'pointer',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                border: 'none', color: '#fff', fontWeight: 800, fontSize: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              {editingPathId ? 'Cập nhật lộ trình' : 'Tạo lộ trình & Gán HS'}
            </button>
          </div>
        )}

        {/* ── Step nav buttons ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: 12,
          padding: '14px 0', borderTop: `1px solid ${D.border}`, marginTop: 8,
        }}>
          <button
            onClick={goPrev} disabled={step === 0}
            style={{
              padding: '9px 18px', borderRadius: 10, cursor: step === 0 ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${D.border}`,
              color: D.text, fontSize: 13, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              opacity: step === 0 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={14} /> Bước trước
          </button>
          {step < 5 && (
            <button
              onClick={goNext}
              disabled={stepBlocked[Math.min(5, step + 1) as StepId]}
              style={{
                padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(168,139,250,0.18)', border: '1px solid #a78bfa',
                color: '#a78bfa', fontSize: 13, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              Bước tiếp <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Create Module modal */}
      <Suspense fallback={null}>
        {createModuleOpen && (
          <CreateModuleModal
            open={createModuleOpen}
            onClose={() => setCreateModuleOpen(false)}
            onCreate={(m) => { handleCreateModule(m); setCreateModuleOpen(false) }}
            roster={roster}
          />
        )}
      </Suspense>

      {/* 🎨 KG Sketch fullscreen modal — Method 2 (drag-drop canvas) */}
      {sketchOpen && (
        <div onClick={() => setSketchOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(5,3,12,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(8px)',
          }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0a0612', border: '1px solid rgba(168,139,250,0.3)', borderRadius: 14,
              padding: 18, maxWidth: 1280, width: '100%', maxHeight: '95vh', overflowY: 'auto',
              boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 80px rgba(168,139,250,0.15)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🎨 Bảng vẽ lộ trình từ KG
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.55)' }}>
                  Kéo node KG vào bảng · Nối với "+" để tạo edge · Click node để điền nội dung
                </p>
              </div>
              <button onClick={() => setSketchOpen(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '6px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Đóng (giữ lại sketch)
              </button>
            </div>
            <KgPathSketch
              pathSubject={pathSubject}
              onSave={(mods) => { handleSketchSave(mods); setSketchOpen(false) }}
            />
          </div>
        </div>
      )}

      {/* Existing paths dialog */}
      {pathsListOpen && (
        <div
          onClick={() => setPathsListOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 14,
            padding: 18, maxWidth: 720, width: '100%', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, color: D.text, fontSize: 15, fontWeight: 800 }}>
                📁 Path đã tạo ({existingPaths.length})
              </h3>
              <button onClick={() => setPathsListOpen(false)} style={{ background: 'none', border: 'none', color: D.muted, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            {existingPaths.length === 0 ? (
              <p style={{ color: D.muted, textAlign: 'center', padding: 20 }}>Chưa có path nào.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {existingPaths.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                    background: D.card2, borderRadius: 8, border: `1px solid ${D.border2}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: D.text, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: D.muted }}>
                        {p.modules?.length || 0} module · {p.assignedCount || 0} HS · {p.competencies?.length || 0} năng lực
                      </div>
                    </div>
                    <button onClick={() => loadPath(p)} style={{
                      padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                      background: 'rgba(168,139,250,0.15)', border: '1px solid #a78bfa',
                      color: '#a78bfa', fontSize: 11, fontWeight: 700,
                    }}>Sửa</button>
                    <button onClick={() => deletePath(p.id, p.name)} style={{
                      padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#f87171', fontSize: 11, fontWeight: 700,
                    }}>Xoá</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .lpb-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
