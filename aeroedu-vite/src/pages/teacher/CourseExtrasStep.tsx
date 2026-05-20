/**
 * CourseExtrasStep — Bước 5: Tài nguyên mở rộng
 *
 * Cho phép GV LIÊN KẾT (không duplicate) các loại tài nguyên platform có sẵn
 * vào khoá học:
 *   - 📝 Bài kiểm tra cuối chương  ← chọn từ /teacher/exams
 *   - 📋 Bài tập học sinh nộp      ← chọn từ /teacher/assignments
 *   - 🧪 Thí nghiệm LabTwin        ← hardcoded LABS_CATALOG
 *   - 🌌 Hiện tượng Aura           ← hardcoded AURA_CATALOG (sync với r3f)
 *   - 🎮 Trò chơi học tập          ← hardcoded GAMES_CATALOG
 *
 * Lưu thông qua PATCH /api/instructor/courses/:id với body { extras: {...} }
 * Server.cjs map vào Course.extras JSONB column.
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronDown, Plus, Trash2, X,
  FileText, ClipboardList, FlaskConical, Sparkles, Gamepad2, Search, Rocket,
} from 'lucide-react'
import { instructorService } from '@/services/instructor.service'
import { examPrepService } from '@/services/examPrep.service'
import { assignmentsService } from '@/services/assignments.service'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import type {
  CourseExtras,
  CourseExtraExam,
  CourseExtraAssignment,
  CourseExtraLab,
  CourseExtraAura,
  CourseExtraGame,
} from '@/types'

// ─────────────────────────────────────────────────────────────
// Hardcoded catalogs — LABS, AURA, GAMES
// ─────────────────────────────────────────────────────────────
const LABS_CATALOG: CourseExtraLab[] = [
  { id: 'iot-lab',          title: 'IoT Lab',             path: '/labs/iot-lab' },
  { id: 'circuit-builder',  title: 'Circuit Builder',     path: '/labs/circuit-builder' },
  { id: 'arduino-emulator', title: 'Arduino Emulator',    path: '/labs/arduino-emulator' },
  { id: 'digital-logic',    title: 'Digital Logic Lab',   path: '/labs/digital-logic-lab' },
  { id: 'graph-lab',        title: 'Graph Lab',           path: '/labs/graph-lab' },
  { id: 'python-labs',      title: 'Python Labs',         path: '/labs/python-labs' },
  { id: 'keoco-app',        title: 'KeoCo App',           path: '/labs/keoco-app' },
  { id: 'pixel-agents',     title: 'Pixel Agents',        path: '/labs/pixel-agents' },
  { id: 'pixel-odyssey',    title: 'Pixel Odyssey',       path: '/labs/pixel-odyssey' },
  { id: 'custom-wokwi',     title: 'Custom Wokwi Board',  path: '/labs/custom-wokwi-board' },
]

// IDs MUST khớp với SIMULATIONS array trong aeroedu-vite/src/pages/dashboard/Aura.tsx
// CoursePlayer deep-link sang /dashboard/aura?sim=<id>
const AURA_CATALOG: CourseExtraAura[] = [
  { id: 'fpv-drone-vr',      title: '🚁 FPV Drone Sandbox + VR' },
  { id: 'interactive-box',   title: 'Interactive Shapes' },
  { id: 'water-molecule',    title: 'Water Molecule (H₂O)' },
  { id: 'chemistry-lab',     title: 'Chemistry Lab' },
  { id: 'pendulum',          title: 'Pendulum' },
  { id: 'solar-system',      title: 'Thái Dương Hệ' },
  { id: 'collision',         title: "Newton's Cradle" },
  { id: 'frosted-glass',     title: 'Frosted Glass Lens' },
  { id: 'carousel',          title: '3D Carousel Gallery' },
  { id: 'particles',         title: 'Particle Field' },
  { id: 'swarm',             title: 'Attract / Repel Swarm' },
  { id: 'wave-shader',       title: 'Wave Shader' },
  { id: 'audio-wave',        title: 'Audio Visualizer' },
  { id: 'portal',            title: 'Layered Portal' },
  { id: 'galaxy',            title: 'Galaxy Generator' },
  { id: 'galaxy-field',      title: 'Galaxy Particle Field' },
  { id: 'terrain',           title: 'Procedural Terrain' },
  { id: 'terrain-fly',       title: 'Terrain Flyover' },
  { id: 'instanced-boxes',   title: 'Instanced Boxes (1000)' },
  { id: 'instanced-flow',    title: 'Particle Flow' },
  { id: 'ocean',             title: 'Ocean Waves' },
  { id: 'ocean-sunset',      title: 'Ocean Sunset' },
  { id: 'dna-helix',         title: 'DNA Double Helix' },
  { id: 'dna-detail',        title: 'DNA Detail View' },
  { id: 'voxel-city',        title: 'Voxel City' },
  { id: 'city-night',        title: 'City at Night' },
  { id: 'raymarching',       title: 'Raymarching SDF' },
  { id: 'metaballs',         title: 'Metaballs' },
  { id: 'cloth-sim',         title: 'Cloth Simulation' },
  { id: 'flag',              title: 'Flag in Wind' },
  { id: 'shoe-configurator', title: 'Shoe Configurator' },
  { id: 'shoe-display',      title: 'Shoe Display' },
  { id: 'prime',             title: 'Prism Refraction' },
  { id: 'prime-simple',      title: 'Prism Scene (Sandbox)' },
  { id: 'solar-eclipse',     title: '🌑 Nhật Thực (Solar Eclipse)' },
  { id: 'lunar-eclipse',     title: '🌕 Nguyệt Thực (Lunar Eclipse)' },
]

const GAMES_CATALOG: CourseExtraGame[] = [
  { id: 'buffalo-runner', title: 'Buffalo Runner',   path: '/games/buffalo-runner' },
  { id: 'pixel-odyssey',  title: 'Pixel Odyssey',    path: '/student/games' },
  { id: 'pixel-agents',   title: 'Pixel Agents',     path: '/labs/pixel-agents' },
  { id: 'career-sim',     title: 'Career Pixel Sim', path: '/student/career-games' },
]

// ─────────────────────────────────────────────────────────────
// Picker Modal — generic searchable list
// ─────────────────────────────────────────────────────────────
interface PickerItem {
  id: string
  title: string
  meta?: string  // dòng phụ (vd: "90 phút · 30 câu")
}

function PickerModal({
  title,
  items,
  selectedIds,
  loading,
  emptyText,
  onPick,
  onClose,
}: {
  title: string
  items: PickerItem[]
  selectedIds: Set<string>
  loading?: boolean
  emptyText: string
  onPick: (item: PickerItem) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(it =>
      it.title.toLowerCase().includes(q) ||
      (it.meta || '').toLowerCase().includes(q)
    )
  }, [items, query])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-[#0d1117] border border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-400">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              {query ? 'Không có kết quả phù hợp.' : emptyText}
            </div>
          ) : (
            filtered.map((it) => {
              const already = selectedIds.has(it.id)
              return (
                <button
                  key={it.id}
                  disabled={already}
                  onClick={() => onPick(it)}
                  className={cn(
                    'w-full text-left rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition-colors',
                    already
                      ? 'opacity-50 cursor-not-allowed bg-white/[0.02]'
                      : 'hover:bg-purple-500/10 active:bg-purple-500/15'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{it.title}</p>
                    {it.meta && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{it.meta}</p>
                    )}
                  </div>
                  {already ? (
                    <span className="text-xs text-green-400 flex-shrink-0">✓ Đã thêm</span>
                  ) : (
                    <Plus className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Section — collapsible với header + add button + items list
// ─────────────────────────────────────────────────────────────
function ResourceSection<T extends { id: string; title: string }>({
  icon: Icon,
  iconColor,
  title,
  description,
  items,
  emptyText,
  renderItemMeta,
  onAdd,
  onRemove,
}: {
  icon: React.FC<{ className?: string }>
  iconColor: string
  title: string
  description: string
  items: T[]
  emptyText: string
  renderItemMeta?: (item: T) => string | null
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}20`, border: `1px solid ${iconColor}30` }}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-white truncate">
              {title}
              {items.length > 0 && (
                <span className="ml-2 text-xs font-normal text-purple-300">
                  ({items.length})
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 truncate">{description}</p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform',
            !open && '-rotate-90'
          )}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 p-4 space-y-2">
          <button
            type="button"
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5 text-purple-300 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm {title.toLowerCase()}
          </button>

          {items.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-3">{emptyText}</p>
          ) : (
            items.map((item) => {
              const meta = renderItemMeta?.(item)
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 px-3 py-2.5 group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.title}</p>
                    {meta && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{meta}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all flex-shrink-0"
                    title="Xoá"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Step component
// ─────────────────────────────────────────────────────────────
export default function CourseExtrasStep({
  courseId,
  initialExtras,
  onBack,
  onFinish,
}: {
  courseId: string
  initialExtras?: CourseExtras
  onBack: () => void
  onFinish: () => void
}) {
  const qc = useQueryClient()
  // Local state — copy của extras từ server, đồng bộ lên qua updateCourse mutation.
  const [extras, setExtras] = useState<CourseExtras>(() => ({
    exams:           initialExtras?.exams           || [],
    assignments:     initialExtras?.assignments     || [],
    labs:            initialExtras?.labs            || [],
    auraSimulations: initialExtras?.auraSimulations || [],
    games:           initialExtras?.games           || [],
  }))

  type PickerKind = 'exam' | 'assignment' | 'lab' | 'aura' | 'game'
  const [openPicker, setOpenPicker] = useState<PickerKind | null>(null)

  // ── Fetch nguồn DỮ LIỆU động (exam + assignment) ──────────
  const { data: examData, isLoading: examLoading } = useQuery({
    queryKey: ['teacher-exams-list'],
    queryFn: examPrepService.getTeacherExams,
    enabled: openPicker === 'exam',
    staleTime: 60_000,
  })

  const { data: assignmentData = [], isLoading: assignmentLoading } = useQuery({
    queryKey: ['teacher-assignments-list'],
    queryFn: () => assignmentsService.getAll('teacher'),
    enabled: openPicker === 'assignment',
    staleTime: 60_000,
  })

  // ── Save mutation ─────────────────────────────────────────
  const save = useMutation({
    mutationFn: (next: CourseExtras) =>
      instructorService.updateCourse(courseId, { extras: next }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-courses'] })
      qc.invalidateQueries({ queryKey: ['instructor-course', courseId] })
      qc.invalidateQueries({ queryKey: ['course-info', courseId] })
    },
    onError: () => toast.error('Lưu thất bại — thử lại nhé.'),
  })

  // ── Helpers: add / remove + auto-save ─────────────────────
  const updateAndSave = (next: CourseExtras) => {
    setExtras(next)
    save.mutate(next)
  }

  const addItem = (kind: PickerKind, item: PickerItem) => {
    if (kind === 'exam') {
      const exam: CourseExtraExam = {
        id: item.id, title: item.title,
        // meta format: "90 phút · 30 câu"
        ...parseExamMeta(item.meta),
      }
      if (extras.exams?.some(e => e.id === exam.id)) return
      updateAndSave({ ...extras, exams: [...(extras.exams || []), exam] })
    } else if (kind === 'assignment') {
      if (extras.assignments?.some(a => a.id === item.id)) return
      updateAndSave({
        ...extras,
        assignments: [...(extras.assignments || []), { id: item.id, title: item.title }],
      })
    } else if (kind === 'lab') {
      if (extras.labs?.some(l => l.id === item.id)) return
      const lab = LABS_CATALOG.find(l => l.id === item.id)!
      updateAndSave({ ...extras, labs: [...(extras.labs || []), lab] })
    } else if (kind === 'aura') {
      if (extras.auraSimulations?.some(a => a.id === item.id)) return
      const aura = AURA_CATALOG.find(a => a.id === item.id)!
      updateAndSave({ ...extras, auraSimulations: [...(extras.auraSimulations || []), aura] })
    } else if (kind === 'game') {
      if (extras.games?.some(g => g.id === item.id)) return
      const game = GAMES_CATALOG.find(g => g.id === item.id)!
      updateAndSave({ ...extras, games: [...(extras.games || []), game] })
    }
    setOpenPicker(null)
  }

  const removeItem = (kind: PickerKind, id: string) => {
    if (kind === 'exam') {
      updateAndSave({ ...extras, exams: (extras.exams || []).filter(e => e.id !== id) })
    } else if (kind === 'assignment') {
      updateAndSave({ ...extras, assignments: (extras.assignments || []).filter(a => a.id !== id) })
    } else if (kind === 'lab') {
      updateAndSave({ ...extras, labs: (extras.labs || []).filter(l => l.id !== id) })
    } else if (kind === 'aura') {
      updateAndSave({ ...extras, auraSimulations: (extras.auraSimulations || []).filter(a => a.id !== id) })
    } else if (kind === 'game') {
      updateAndSave({ ...extras, games: (extras.games || []).filter(g => g.id !== id) })
    }
  }

  // ── Picker items theo kind ─────────────────────────────────
  const pickerData: Record<PickerKind, { title: string; items: PickerItem[]; loading?: boolean; emptyText: string; selectedIds: Set<string> }> = {
    exam: {
      title: '📝 Chọn bài kiểm tra',
      items: (examData?.exams || []).map(ex => ({
        id: ex.id,
        title: ex.title,
        meta: `${ex.duration ?? '?'} phút · ${ex.totalQuestions ?? '?'} câu`,
      })),
      loading: examLoading,
      emptyText: 'Chưa có đề thi nào trong /teacher/exams. Tạo đề trước rồi quay lại.',
      selectedIds: new Set((extras.exams || []).map(e => e.id)),
    },
    assignment: {
      title: '📋 Chọn bài tập',
      items: assignmentData.map(a => ({
        id: a.id,
        title: a.title,
        meta: a.subject || a.type,
      })),
      loading: assignmentLoading,
      emptyText: 'Chưa có bài tập nào trong /teacher/assignments. Tạo bài tập trước.',
      selectedIds: new Set((extras.assignments || []).map(a => a.id)),
    },
    lab: {
      title: '🧪 Chọn thí nghiệm LabTwin',
      items: LABS_CATALOG.map(l => ({ id: l.id, title: l.title, meta: l.path })),
      emptyText: '',
      selectedIds: new Set((extras.labs || []).map(l => l.id)),
    },
    aura: {
      title: '🌌 Chọn mô phỏng Aura',
      items: AURA_CATALOG.map(a => ({ id: a.id, title: a.title })),
      emptyText: '',
      selectedIds: new Set((extras.auraSimulations || []).map(a => a.id)),
    },
    game: {
      title: '🎮 Chọn trò chơi',
      items: GAMES_CATALOG.map(g => ({ id: g.id, title: g.title, meta: g.path })),
      emptyText: '',
      selectedIds: new Set((extras.games || []).map(g => g.id)),
    },
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-400">
          Liên kết bài tập, lab, mô phỏng và trò chơi vào khoá học. Học viên sẽ
          thấy các tài nguyên này ở tab <strong className="text-purple-300">Tài nguyên</strong> trong CoursePlayer.
        </p>
      </div>

      {/* 📝 Bài kiểm tra cuối chương */}
      <ResourceSection
        icon={({ className }) => <FileText className={cn(className, 'text-blue-400')} />}
        iconColor="#3b82f6"
        title="Bài kiểm tra cuối chương"
        description="Chọn đề thi từ /teacher/exams để gắn vào khoá học"
        items={extras.exams || []}
        emptyText="Chưa có bài kiểm tra. Bấm + để thêm."
        renderItemMeta={(e) => {
          const parts = []
          if (e.duration) parts.push(`${e.duration} phút`)
          if (e.questionCount) parts.push(`${e.questionCount} câu`)
          return parts.length ? parts.join(' · ') : null
        }}
        onAdd={() => setOpenPicker('exam')}
        onRemove={(id) => removeItem('exam', id)}
      />

      {/* 📋 Bài tập HS nộp */}
      <ResourceSection
        icon={({ className }) => <ClipboardList className={cn(className, 'text-amber-400')} />}
        iconColor="#f59e0b"
        title="Bài tập học sinh nộp"
        description="Chọn bài tập từ /teacher/assignments"
        items={extras.assignments || []}
        emptyText="Chưa có bài tập. Bấm + để thêm."
        onAdd={() => setOpenPicker('assignment')}
        onRemove={(id) => removeItem('assignment', id)}
      />

      {/* 🧪 LabTwin */}
      <ResourceSection
        icon={({ className }) => <FlaskConical className={cn(className, 'text-emerald-400')} />}
        iconColor="#10b981"
        title="Thí nghiệm LabTwin"
        description="IoT Lab, Circuit Builder, Python Labs, …"
        items={extras.labs || []}
        emptyText="Chưa có thí nghiệm. Bấm + để thêm."
        renderItemMeta={(l) => l.path}
        onAdd={() => setOpenPicker('lab')}
        onRemove={(id) => removeItem('lab', id)}
      />

      {/* 🌌 Aura simulations */}
      <ResourceSection
        icon={({ className }) => <Sparkles className={cn(className, 'text-purple-400')} />}
        iconColor="#a855f7"
        title="Hiện tượng Aura"
        description="Mô phỏng 3D R3F: nhật thực, hệ mặt trời, DNA, …"
        items={extras.auraSimulations || []}
        emptyText="Chưa có mô phỏng. Bấm + để thêm."
        onAdd={() => setOpenPicker('aura')}
        onRemove={(id) => removeItem('aura', id)}
      />

      {/* 🎮 Games */}
      <ResourceSection
        icon={({ className }) => <Gamepad2 className={cn(className, 'text-pink-400')} />}
        iconColor="#ec4899"
        title="Trò chơi học tập"
        description="Buffalo Runner, Pixel Odyssey, Career Sim, …"
        items={extras.games || []}
        emptyText="Chưa có trò chơi. Bấm + để thêm."
        renderItemMeta={(g) => g.path}
        onAdd={() => setOpenPicker('game')}
        onRemove={(id) => removeItem('game', id)}
      />

      {/* Save indicator + actions */}
      {save.isPending && (
        <p className="text-xs text-purple-300">Đang lưu...</p>
      )}

      <div className="flex justify-between pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="flex items-center gap-2 px-7 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
        >
          <Rocket className="w-4 h-4" /> Hoàn thành
        </button>
      </div>

      {/* Picker modal */}
      {openPicker && (
        <PickerModal
          title={pickerData[openPicker].title}
          items={pickerData[openPicker].items}
          selectedIds={pickerData[openPicker].selectedIds}
          loading={pickerData[openPicker].loading}
          emptyText={pickerData[openPicker].emptyText}
          onPick={(it) => addItem(openPicker, it)}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
/** Parse "90 phút · 30 câu" → { duration: 90, questionCount: 30 } */
function parseExamMeta(meta?: string): { duration?: number; questionCount?: number } {
  if (!meta) return {}
  const out: { duration?: number; questionCount?: number } = {}
  const durMatch = meta.match(/(\d+)\s*phút/)
  if (durMatch) out.duration = parseInt(durMatch[1], 10)
  const qMatch = meta.match(/(\d+)\s*câu/)
  if (qMatch) out.questionCount = parseInt(qMatch[1], 10)
  return out
}
