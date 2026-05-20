/**
 * ProfessionalKG — Cây tri thức nghề nghiệp cho Giáo viên & Admin
 *
 * Tính năng:
 *   - Cây kỹ năng theo 4 lĩnh vực (chuyên môn / sư phạm / số / phát triển)
 *   - Mức độ thành thạo 5 cấp: Chưa biết → Chuyên gia
 *   - Ghi chú học tập per-skill
 *   - CPD Log (nhật ký cập nhật kiến thức)
 *   - Xuất báo cáo Excel & JSON
 *   - Persist vào localStorage (key theo userId)
 *
 * Route: /teacher/knowledge-graph & /admin/knowledge-graph
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Brain, Star, Zap, ChevronDown, ChevronRight, Save, Download,
  FileJson, BookOpen, TrendingUp, Award, CheckCircle2, Plus,
  RotateCcw, Sparkles, Settings, Users, BarChart2, Shield,
  GraduationCap, Cpu, MessageSquare, FlaskConical, Lightbulb,
  PenLine, Clock, Search, Filter,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import * as XLSX from 'xlsx'

// ── Competency data ────────────────────────────────────────────────────────

export type MasteryLevel = 0 | 25 | 50 | 75 | 100

export interface Skill {
  id: string
  label: string
  description: string
  tags?: string[]
}

export interface SkillCategory {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{className?: string}>
  color: string         // Tailwind color token (e.g. 'purple', 'blue')
  skills: Skill[]
}

const TEACHER_TREE: SkillCategory[] = [
  {
    id: 'tce',
    label: 'Kiến thức Chuyên môn',
    description: 'Nội dung bộ môn, chương trình GDPT 2018 và tích hợp liên môn',
    icon: BookOpen,
    color: 'purple',
    skills: [
      { id: 'tce-curriculum2018',  label: 'Chương trình GDPT 2018',         description: 'Nắm vững cấu trúc, mục tiêu, nội dung bộ môn theo CT mới', tags: ['bắt buộc'] },
      { id: 'tce-content-depth',   label: 'Kiến thức chuyên sâu bộ môn',     description: 'Hiểu nguyên lý, có thể giải thích nhiều cách khác nhau' },
      { id: 'tce-cross-subject',   label: 'Tích hợp liên môn',               description: 'Kết nối kiến thức giữa các môn học, dự án liên môn' },
      { id: 'tce-tt58',            label: 'Quy định đánh giá TT22/TT58',      description: 'Thông hiểu chuẩn đánh giá, cách tính ĐTBm, xếp loại', tags: ['pháp lý'] },
      { id: 'tce-research',        label: 'Nghiên cứu khoa học giáo dục',     description: 'Đọc hiểu nghiên cứu, áp dụng vào thực tiễn lớp học' },
      { id: 'tce-update',          label: 'Cập nhật kiến thức liên tục',      description: 'Theo dõi xu hướng mới trong lĩnh vực, tự học ngoài giờ', tags: ['CPD'] },
    ],
  },
  {
    id: 'tp',
    label: 'Năng lực Sư phạm',
    description: 'Phương pháp dạy học tích cực, thiết kế bài dạy, đánh giá quá trình',
    icon: GraduationCap,
    color: 'blue',
    skills: [
      { id: 'tp-lesson-design',    label: 'Thiết kế bài dạy theo năng lực',  description: 'Lập kế hoạch bài dạy đảm bảo 5 hoạt động, mục tiêu NL', tags: ['bắt buộc'] },
      { id: 'tp-active-learning',  label: 'Dạy học tích cực',                description: 'Flip classroom, PBL, game-based learning, discovery learning' },
      { id: 'tp-differentiation',  label: 'Dạy học phân hóa',               description: 'Nhận diện học sinh yếu/khá/giỏi, thiết kế bài tập theo cấp độ' },
      { id: 'tp-formative',        label: 'Đánh giá quá trình',              description: 'Exit ticket, peer assessment, rubric, portfolio đánh giá NL' },
      { id: 'tp-stem',             label: 'Tích hợp STEM/STEAM',             description: 'Thiết kế dự án STEM, phối hợp với GV khác', tags: ['xu hướng'] },
      { id: 'tp-classroom-mgmt',   label: 'Quản lý lớp học hiệu quả',       description: 'Tạo bầu không khí học tích cực, xử lý tình huống sư phạm' },
    ],
  },
  {
    id: 'tds',
    label: 'Kỹ năng Số',
    description: 'Ứng dụng công nghệ, AI và công cụ EdTech vào dạy học hiện đại',
    icon: Cpu,
    color: 'emerald',
    skills: [
      { id: 'tds-lms',             label: 'Sử dụng LMS (inphysic.com)',       description: 'Tạo bài giảng, quản lý lớp, chấm điểm, báo cáo trên nền tảng', tags: ['bắt buộc'] },
      { id: 'tds-ai-tools',        label: 'Công cụ AI hỗ trợ giảng dạy',    description: 'Claude AI Tutor, AI tạo đề, tóm tắt nội dung bằng AI', tags: ['xu hướng'] },
      { id: 'tds-content-creation',label: 'Tạo nội dung số',                 description: 'Video bài giảng, slides tương tác, infographic, podcast' },
      { id: 'tds-data-analytics',  label: 'Phân tích dữ liệu học tập',      description: 'Đọc dashboard, phát hiện học sinh cần hỗ trợ sớm qua data' },
      { id: 'tds-online-teaching', label: 'Dạy học trực tuyến',              description: 'Zoom/Meet, quản lý lớp online, giữ tương tác học sinh' },
      { id: 'tds-security',        label: 'An toàn thông tin cơ bản',        description: 'Bảo vệ dữ liệu học sinh, password hygiene, phishing awareness', tags: ['pháp lý'] },
    ],
  },
  {
    id: 'tpd',
    label: 'Phát triển Nghề nghiệp',
    description: 'Kỹ năng mềm, giao tiếp, tự học và phát triển bản thân dài hạn',
    icon: TrendingUp,
    color: 'amber',
    skills: [
      { id: 'tpd-communication',   label: 'Giao tiếp với phụ huynh & HS',   description: 'Phản hồi tích cực, họp phụ huynh, xử lý khiếu nại' },
      { id: 'tpd-mentoring',       label: 'Hỗ trợ & Mentoring đồng nghiệp', description: 'Chia sẻ kinh nghiệm, dự giờ, phản hồi chuyên môn' },
      { id: 'tpd-reflection',      label: 'Phản tư chuyên nghiệp',           description: 'Tự đánh giá bài dạy, ghi chép journal, cải tiến liên tục', tags: ['CPD'] },
      { id: 'tpd-wellbeing',       label: 'Chăm sóc sức khỏe tâm lý',       description: 'Quản lý stress, work-life balance, phòng tránh burnout' },
      { id: 'tpd-leadership',      label: 'Lãnh đạo nhóm & Tổ bộ môn',     description: 'Điều phối cuộc họp, lập kế hoạch tổ, mentoring GV mới' },
      { id: 'tpd-cpd-plan',        label: 'Lập kế hoạch phát triển cá nhân', description: 'IDP hàng năm, đặt mục tiêu SMART, theo dõi tiến độ', tags: ['CPD'] },
    ],
  },
]

const ADMIN_TREE: SkillCategory[] = [
  {
    id: 'ame',
    label: 'Quản lý Giáo dục',
    description: 'Lãnh đạo nhà trường, quản lý chương trình và phát triển đội ngũ GV',
    icon: Shield,
    color: 'purple',
    skills: [
      { id: 'ame-curriculum-oversight', label: 'Giám sát chương trình giảng dạy', description: 'Đảm bảo chương trình GDPT 2018 được thực hiện đúng, đủ', tags: ['bắt buộc'] },
      { id: 'ame-teacher-eval',         label: 'Đánh giá năng lực GV',           description: 'Tiêu chí đánh giá GV, dự giờ, nhận xét chuyên môn' },
      { id: 'ame-recruitment',          label: 'Tuyển dụng & Phát triển GV',     description: 'Quy trình tuyển dụng, onboarding, lộ trình phát triển' },
      { id: 'ame-school-law',           label: 'Pháp luật Giáo dục',             description: 'Luật GD, Thông tư, Nghị định áp dụng cho nhà trường', tags: ['pháp lý'] },
      { id: 'ame-strategic-plan',       label: 'Lập kế hoạch chiến lược',        description: 'Kế hoạch năm học, kế hoạch cải tiến chất lượng dài hạn' },
      { id: 'ame-accreditation',        label: 'Kiểm định chất lượng',           description: 'Tiêu chuẩn kiểm định, chuẩn bị hồ sơ, tự đánh giá' },
    ],
  },
  {
    id: 'ada',
    label: 'Phân tích & Báo cáo',
    description: 'Đọc hiểu dữ liệu, báo cáo chất lượng, ra quyết định dựa trên bằng chứng',
    icon: BarChart2,
    color: 'blue',
    skills: [
      { id: 'ada-data-reading',    label: 'Đọc hiểu Dashboard dữ liệu',      description: 'Phân tích số liệu tổng hợp, nhận diện xu hướng' },
      { id: 'ada-kpi-tracking',    label: 'Theo dõi KPIs giáo dục',          description: 'Tỉ lệ lên lớp, đỗ tốt nghiệp, học sinh yếu, vắng học' },
      { id: 'ada-excel-analytics', label: 'Phân tích Excel nâng cao',        description: 'PivotTable, biểu đồ, công thức thống kê trong báo cáo' },
      { id: 'ada-reporting',       label: 'Soạn báo cáo Bộ/Sở/Phòng GD',   description: 'Mẫu biểu, deadline, ngôn ngữ hành chính', tags: ['bắt buộc'] },
      { id: 'ada-ai-insights',     label: 'AI hỗ trợ phân tích dữ liệu',    description: 'Dùng AI để phát hiện học sinh at-risk, trend dự báo', tags: ['xu hướng'] },
    ],
  },
  {
    id: 'aod',
    label: 'Phát triển Tổ chức',
    description: 'Văn hóa nhà trường, hợp tác cộng đồng, quản lý thay đổi',
    icon: Users,
    color: 'emerald',
    skills: [
      { id: 'aod-school-culture',  label: 'Xây dựng văn hóa nhà trường',    description: 'Giá trị cốt lõi, quy tắc ứng xử, môi trường học lành mạnh' },
      { id: 'aod-change-mgmt',     label: 'Quản lý thay đổi',               description: 'Triển khai chính sách mới, xử lý phản đối, truyền thông nội bộ' },
      { id: 'aod-community',       label: 'Hợp tác cộng đồng & Phụ huynh',  description: 'Ban đại diện cha mẹ HS, đối tác doanh nghiệp, kết nối cộng đồng' },
      { id: 'aod-conflict-mgmt',   label: 'Giải quyết xung đột',            description: 'Hòa giải tranh chấp GV-GV, GV-HS-PH, xử lý đơn thư' },
      { id: 'aod-innovation',      label: 'Thúc đẩy đổi mới sáng tạo',     description: 'Khuyến khích GV thử nghiệm phương pháp mới, tạo không gian an toàn', tags: ['xu hướng'] },
    ],
  },
  {
    id: 'alc',
    label: 'Lãnh đạo & Truyền thông',
    description: 'Kỹ năng lãnh đạo hiệu quả, giao tiếp tổ chức và tự phát triển',
    icon: Sparkles,
    color: 'amber',
    skills: [
      { id: 'alc-leadership-style', label: 'Phong cách lãnh đạo hiệu quả',  description: 'Servant leadership, coaching leadership, adaptive leadership' },
      { id: 'alc-communication',    label: 'Truyền thông nội bộ & ngoại bộ', description: 'Họp hiệu quả, văn bản hành chính, phát ngôn truyền thông' },
      { id: 'alc-emotional-intel',  label: 'Trí tuệ cảm xúc (EQ)',          description: 'Tự nhận thức, đồng cảm, kiểm soát cảm xúc trong áp lực', tags: ['CPD'] },
      { id: 'alc-decision-making',  label: 'Ra quyết định dựa trên dữ liệu', description: 'Phân tích thông tin, đánh giá rủi ro, lập luận rõ ràng' },
      { id: 'alc-cpd',              label: 'Phát triển nghề nghiệp liên tục', description: 'Đọc sách, hội thảo, khóa học online, network chuyên môn', tags: ['CPD'] },
    ],
  },
]

// ── Mastery level config ───────────────────────────────────────────────────

const MASTERY_LEVELS = [
  { value: 0  as MasteryLevel, label: 'Chưa biết',  color: 'text-gray-400 bg-gray-100  border-gray-200',  dot: 'bg-gray-300'    },
  { value: 25 as MasteryLevel, label: 'Mới bắt đầu', color: 'text-red-600   bg-red-50    border-red-200',   dot: 'bg-red-400'     },
  { value: 50 as MasteryLevel, label: 'Đang học',    color: 'text-amber-700 bg-amber-50  border-amber-200', dot: 'bg-amber-400'   },
  { value: 75 as MasteryLevel, label: 'Thành thạo',  color: 'text-blue-700  bg-blue-50   border-blue-200',  dot: 'bg-blue-500'    },
  { value: 100 as MasteryLevel,label: 'Chuyên gia',  color: 'text-green-700 bg-green-50  border-green-200', dot: 'bg-green-500'   },
]

const CATEGORY_COLORS: Record<string, {
  header: string; bar: string; badge: string; border: string; icon: string
}> = {
  purple: { header: 'from-purple-600 to-purple-700', bar: 'bg-purple-500',  badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200', icon: 'text-purple-600' },
  blue:   { header: 'from-blue-600   to-blue-700',   bar: 'bg-blue-500',    badge: 'bg-blue-100   text-blue-700',   border: 'border-blue-200',   icon: 'text-blue-600'   },
  emerald:{ header: 'from-emerald-600 to-emerald-700',bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700',border: 'border-emerald-200',icon: 'text-emerald-600'},
  amber:  { header: 'from-amber-500  to-amber-600',   bar: 'bg-amber-500',   badge: 'bg-amber-100  text-amber-700',  border: 'border-amber-200',  icon: 'text-amber-600'  },
}

// ── Persistence helpers ────────────────────────────────────────────────────

interface SkillProgress {
  score: MasteryLevel
  note: string
  updatedAt: string
}
type ProgressMap = Record<string, SkillProgress>

interface CpdEntry {
  id: string
  skillId: string
  skillLabel: string
  note: string
  createdAt: string
}

function loadProgress(userId: string): ProgressMap {
  try {
    const raw = localStorage.getItem(`cpd_progress_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveProgress(userId: string, map: ProgressMap) {
  try { localStorage.setItem(`cpd_progress_${userId}`, JSON.stringify(map)) } catch {}
}

function loadCpdLog(userId: string): CpdEntry[] {
  try {
    const raw = localStorage.getItem(`cpd_log_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCpdLog(userId: string, log: CpdEntry[]) {
  try { localStorage.setItem(`cpd_log_${userId}`, JSON.stringify(log)) } catch {}
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProfessionalKG() {
  const { user } = useAuth()
  const isAdmin   = user?.role === 'ADMIN'
  const tree      = isAdmin ? ADMIN_TREE : TEACHER_TREE
  const userId    = user?.id || 'guest'

  const [progress, setProgress]       = useState<ProgressMap>({})
  const [cpdLog, setCpdLog]           = useState<CpdEntry[]>([])
  const [expanded, setExpanded]       = useState<Set<string>>(new Set([tree[0].id]))
  const [activeTab, setActiveTab]     = useState<'tree' | 'log' | 'report'>('tree')
  const [searchQ, setSearchQ]         = useState('')
  const [filterLevel, setFilterLevel] = useState<MasteryLevel | -1>(-1)
  const [newLogNote, setNewLogNote]   = useState('')
  const [newLogSkill, setNewLogSkill] = useState('')
  const [editSkill, setEditSkill]     = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    setProgress(loadProgress(userId))
    setCpdLog(loadCpdLog(userId))
  }, [userId])

  // Persist progress
  const updateSkill = useCallback((skillId: string, score: MasteryLevel, note?: string) => {
    setProgress(prev => {
      const next = {
        ...prev,
        [skillId]: {
          score,
          note: note ?? prev[skillId]?.note ?? '',
          updatedAt: new Date().toISOString(),
        },
      }
      saveProgress(userId, next)
      return next
    })
  }, [userId])

  const updateNote = useCallback((skillId: string, note: string) => {
    setProgress(prev => {
      const existing = prev[skillId] || { score: 0 as MasteryLevel, note: '', updatedAt: new Date().toISOString() }
      const next = { ...prev, [skillId]: { ...existing, note, updatedAt: new Date().toISOString() } }
      saveProgress(userId, next)
      return next
    })
  }, [userId])

  // CPD Log add
  const addCpdEntry = () => {
    if (!newLogNote.trim()) return
    const skill = tree.flatMap(c => c.skills).find(s => s.id === newLogSkill)
    const entry: CpdEntry = {
      id: Date.now().toString(),
      skillId: newLogSkill,
      skillLabel: skill?.label || 'Tổng quát',
      note: newLogNote.trim(),
      createdAt: new Date().toISOString(),
    }
    setCpdLog(prev => {
      const next = [entry, ...prev]
      saveCpdLog(userId, next)
      return next
    })
    setNewLogNote('')
    toast.success('Đã thêm nhật ký học tập')
  }

  // All skills flat list
  const allSkills = useMemo(() => tree.flatMap(c => c.skills.map(s => ({ ...s, catId: c.id, catLabel: c.label, color: c.color }))), [tree])

  // Filter for search / level filter
  const filteredSkills = useMemo(() => {
    return allSkills.filter(s => {
      const q = searchQ.toLowerCase()
      const matchQ = !q || s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || (s.tags || []).some(t => t.includes(q))
      const lvl = progress[s.id]?.score ?? 0
      const matchLevel = filterLevel === -1 || lvl === filterLevel
      return matchQ && matchLevel
    })
  }, [allSkills, searchQ, filterLevel, progress])

  // Stats
  const stats = useMemo(() => {
    const total  = allSkills.length
    const done   = allSkills.filter(s => (progress[s.id]?.score ?? 0) >= 75).length
    const inProg = allSkills.filter(s => { const v = progress[s.id]?.score ?? 0; return v >= 25 && v < 75 }).length
    const avgScore = total ? Math.round(allSkills.reduce((s, sk) => s + (progress[sk.id]?.score ?? 0), 0) / total) : 0
    return { total, done, inProg, avgScore }
  }, [allSkills, progress])

  const catStats = useMemo(() => tree.map(cat => {
    const n = cat.skills.length
    const sum = cat.skills.reduce((s, sk) => s + (progress[sk.id]?.score ?? 0), 0)
    const avg = n ? Math.round(sum / n) : 0
    const mastered = cat.skills.filter(sk => (progress[sk.id]?.score ?? 0) >= 75).length
    return { id: cat.id, avg, mastered, total: n }
  }), [tree, progress])

  // ── Export Excel ──
  const exportExcel = () => {
    const hdr = ['STT', 'Lĩnh vực', 'Kỹ năng / Năng lực', 'Mô tả', 'Mức độ thành thạo', 'Điểm', 'Ghi chú học tập', 'Cập nhật lần cuối']
    const rows = allSkills.map((s, i) => {
      const p = progress[s.id]
      const lvl = MASTERY_LEVELS.find(l => l.value === (p?.score ?? 0))
      return [
        i + 1, s.catLabel, s.label, s.description,
        lvl?.label || 'Chưa biết', p?.score ?? 0,
        p?.note || '',
        p?.updatedAt ? new Date(p.updatedAt).toLocaleString('vi-VN') : '',
      ]
    })
    // Sheet 1: kỹ năng
    const ws1 = XLSX.utils.aoa_to_sheet([
      [`BÁO CÁO PHÁT TRIỂN CHUYÊN MÔN — ${user?.name || ''} — ${isAdmin ? 'Quản lý' : 'Giáo viên'}`],
      [`Xuất ngày: ${new Date().toLocaleString('vi-VN')} — Tiến độ tổng thể: ${stats.avgScore}% — Thành thạo: ${stats.done}/${stats.total} kỹ năng`],
      [],
      hdr,
      ...rows,
    ])
    ws1['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 45 }, { wch: 18 }, { wch: 8 }, { wch: 40 }, { wch: 20 }]
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: hdr.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: hdr.length - 1 } },
    ]
    // Sheet 2: tổng hợp per category
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Lĩnh vực', 'Số kỹ năng', 'Thành thạo (≥75%)', 'Điểm TB (%)'],
      ...tree.map((cat, i) => {
        const cs = catStats[i]
        return [cat.label, cs.total, cs.mastered, cs.avg]
      }),
    ])
    ws2['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 14 }]
    // Sheet 3: CPD log
    const logRows = cpdLog.map(e => [
      new Date(e.createdAt).toLocaleString('vi-VN'),
      e.skillLabel,
      e.note,
    ])
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['Thời gian', 'Kỹ năng liên quan', 'Nội dung cập nhật'],
      ...logRows,
    ])
    ws3['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 60 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'Kỹ năng chi tiết')
    XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp lĩnh vực')
    XLSX.utils.book_append_sheet(wb, ws3, 'Nhật ký học tập')
    const safe = (user?.name || 'user').replace(/[^\w\d-]+/g, '_')
    XLSX.writeFile(wb, `CPD_${safe}_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success('Đã xuất báo cáo CPD Excel (3 sheets)')
  }

  // ── Export JSON ──
  const exportJson = () => {
    const data = {
      meta: {
        user: { name: user?.name, role: user?.role },
        exportedAt: new Date().toISOString(),
        stats: { total: stats.total, mastered: stats.done, inProgress: stats.inProg, avgScore: stats.avgScore },
      },
      categories: tree.map((cat, i) => ({
        ...cat,
        icon: undefined,
        stats: catStats[i],
        skills: cat.skills.map(s => ({
          id: s.id, label: s.label, description: s.description, tags: s.tags,
          mastery: progress[s.id]?.score ?? 0,
          masteryLabel: MASTERY_LEVELS.find(l => l.value === (progress[s.id]?.score ?? 0))?.label,
          note: progress[s.id]?.note || '',
          updatedAt: progress[s.id]?.updatedAt || null,
        })),
      })),
      cpdLog: cpdLog.map(e => ({ ...e })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `CPD_${(user?.name || 'user').replace(/[^\w\d-]+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất JSON phát triển chuyên môn')
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/20">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Cây tri thức Nghề nghiệp
                <span className="ml-2 text-sm font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {isAdmin ? 'Quản lý' : 'Giáo viên'}
                </span>
              </h1>
              <p className="text-sm text-gray-500">
                Theo dõi, cập nhật và phát triển năng lực nghề nghiệp liên tục
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold">
              <Download className="w-3.5 h-3.5" />Excel
            </button>
            <button onClick={exportJson} className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
              <FileJson className="w-3.5 h-3.5" />JSON
            </button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng kỹ năng', value: stats.total, icon: BookOpen, color: 'text-gray-600' },
            { label: 'Thành thạo (≥75%)', value: stats.done, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Đang học',     value: stats.inProg,  icon: TrendingUp,   color: 'text-amber-600' },
            { label: 'Điểm tổng thể', value: `${stats.avgScore}%`, icon: Award, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
              <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
              <div>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="mt-3 flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([
            { key: 'tree', label: 'Cây kỹ năng', icon: Brain },
            { key: 'log',  label: `Nhật ký CPD (${cpdLog.length})`, icon: PenLine },
            { key: 'report', label: 'Tổng quan', icon: BarChart2 },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.key ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* ═══════════════════════════════════════════════
            TAB: Cây kỹ năng
        ═══════════════════════════════════════════════ */}
        {activeTab === 'tree' && (
          <div className="space-y-4">
            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kỹ năng, từ khóa..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                />
              </div>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1">
                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                {[-1, ...MASTERY_LEVELS.map(l => l.value)].map(v => {
                  const lvl = MASTERY_LEVELS.find(l => l.value === v)
                  return (
                    <button
                      key={v}
                      onClick={() => setFilterLevel(v as MasteryLevel | -1)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        filterLevel === v ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {v === -1 ? 'Tất cả' : lvl?.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* If search active, show flat filtered list */}
            {(searchQ || filterLevel !== -1) ? (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-sm text-gray-600 font-medium">
                  Tìm thấy {filteredSkills.length} kỹ năng
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredSkills.map(s => (
                    <SkillRow
                      key={s.id}
                      skill={s}
                      progress={progress[s.id]}
                      onScore={(sc) => updateSkill(s.id, sc)}
                      onNote={(n) => updateNote(s.id, n)}
                      editActive={editSkill === s.id}
                      onToggleEdit={() => setEditSkill(editSkill === s.id ? null : s.id)}
                      color={s.color}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Full category tree */
              tree.map((cat, ci) => {
                const cs = catStats[ci]
                const col = CATEGORY_COLORS[cat.color]
                const isOpen = expanded.has(cat.id)
                return (
                  <div key={cat.id} className={`bg-white rounded-2xl border overflow-hidden ${col.border} shadow-sm`}>
                    {/* Category header */}
                    <button
                      className={`w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${col.header} text-white text-left`}
                      onClick={() => setExpanded(prev => {
                        const next = new Set(prev)
                        next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id)
                        return next
                      })}
                    >
                      <cat.icon className="w-5 h-5 shrink-0 opacity-90" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base">{cat.label}</p>
                        <p className="text-xs text-white/75 truncate">{cat.description}</p>
                      </div>
                      {/* Progress pill */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          {cs.mastered}/{cs.total} ✓
                        </span>
                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {cs.avg}%
                        </span>
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-gray-100">
                      <div
                        className={`h-full ${col.bar} transition-all duration-500`}
                        style={{ width: `${cs.avg}%` }}
                      />
                    </div>

                    {/* Skills list */}
                    {isOpen && (
                      <div className="divide-y divide-gray-50">
                        {cat.skills.map(s => (
                          <SkillRow
                            key={s.id}
                            skill={s}
                            progress={progress[s.id]}
                            onScore={(sc) => updateSkill(s.id, sc)}
                            onNote={(n) => updateNote(s.id, n)}
                            editActive={editSkill === s.id}
                            onToggleEdit={() => setEditSkill(editSkill === s.id ? null : s.id)}
                            color={cat.color}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            TAB: Nhật ký CPD
        ═══════════════════════════════════════════════ */}
        {activeTab === 'log' && (
          <div className="space-y-4 max-w-3xl">
            {/* Add entry form */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-500" />
                Thêm nhật ký học tập mới
              </p>
              <div className="space-y-3">
                <select
                  value={newLogSkill}
                  onChange={e => setNewLogSkill(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  <option value="">— Chọn kỹ năng liên quan (tùy chọn) —</option>
                  {tree.map(cat => (
                    <optgroup key={cat.id} label={cat.label}>
                      {cat.skills.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                <textarea
                  value={newLogNote}
                  onChange={e => setNewLogNote(e.target.value)}
                  placeholder="Ghi lại điều bạn vừa học, tài liệu tham khảo, phương pháp mới thử, khóa học hoàn thành..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
                <button
                  onClick={addCpdEntry}
                  disabled={!newLogNote.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold"
                >
                  <Save className="w-4 h-4" />Lưu nhật ký
                </button>
              </div>
            </div>

            {/* Log entries */}
            {cpdLog.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <PenLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chưa có nhật ký nào. Hãy ghi lại những gì bạn học hôm nay!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cpdLog.map(entry => (
                  <div key={entry.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm flex gap-3">
                    <div className="w-0.5 rounded-full bg-purple-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          {entry.skillLabel}
                        </span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{entry.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            TAB: Tổng quan / Report
        ═══════════════════════════════════════════════ */}
        {activeTab === 'report' && (
          <div className="space-y-6 max-w-4xl">
            {/* Per-category breakdown */}
            <div className="grid gap-4 sm:grid-cols-2">
              {tree.map((cat, ci) => {
                const cs = catStats[ci]
                const col = CATEGORY_COLORS[cat.color]
                const skills = cat.skills
                return (
                  <div key={cat.id} className={`bg-white rounded-2xl border overflow-hidden ${col.border} shadow-sm`}>
                    <div className={`px-4 py-3 bg-gradient-to-r ${col.header} text-white flex items-center gap-2`}>
                      <cat.icon className="w-4 h-4" />
                      <span className="font-semibold text-sm">{cat.label}</span>
                      <span className="ml-auto text-xs bg-white/25 px-2 py-0.5 rounded-full font-bold">{cs.avg}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100">
                      <div className={`h-full ${col.bar}`} style={{ width: `${cs.avg}%` }} />
                    </div>
                    <div className="p-4 space-y-2">
                      {skills.map(s => {
                        const p = progress[s.id]
                        const score = p?.score ?? 0
                        const lvl = MASTERY_LEVELS.find(l => l.value === score)!
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${lvl.dot}`} />
                            <span className="text-xs text-gray-700 flex-1 truncate">{s.label}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${lvl.color}`}>{lvl.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                      Thành thạo: <strong className={col.icon}>{cs.mastered}/{cs.total}</strong> kỹ năng
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Overall radar-like summary table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Award className="w-4 h-4 text-purple-500" />Tóm tắt năng lực</h3>
                <div className="flex gap-2">
                  <button onClick={exportExcel} className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
                  <button onClick={exportJson} className="text-xs text-orange-500 hover:underline flex items-center gap-1"><FileJson className="w-3 h-3" />JSON</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Lĩnh vực</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Điểm TB</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Thành thạo</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tree.map((cat, ci) => {
                      const cs = catStats[ci]
                      const col = CATEGORY_COLORS[cat.color]
                      return (
                        <tr key={cat.id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5 flex items-center gap-2 font-medium text-gray-800">
                            <cat.icon className={`w-4 h-4 ${col.icon}`} />
                            {cat.label}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-gray-700">{cs.avg}%</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${col.badge}`}>
                              {cs.mastered}/{cs.total}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${col.bar} transition-all`} style={{ width: `${cs.avg}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Skills needing attention */}
            {(() => {
              const weak = allSkills.filter(s => (progress[s.id]?.score ?? 0) < 50)
              if (!weak.length) return null
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Kỹ năng cần chú ý ({weak.length} kỹ năng &lt; 50%)
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {weak.slice(0, 8).map(s => {
                      const score = progress[s.id]?.score ?? 0
                      const lvl = MASTERY_LEVELS.find(l => l.value === score)!
                      return (
                        <div key={s.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                          <div className={`w-2 h-2 rounded-full ${lvl.dot} shrink-0`} />
                          <span className="text-xs text-gray-700 flex-1 truncate">{s.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${lvl.color}`}>{lvl.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  {weak.length > 8 && <p className="text-xs text-amber-600 mt-2">... và {weak.length - 8} kỹ năng khác</p>}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

// ── SkillRow subcomponent ──────────────────────────────────────────────────

function SkillRow({
  skill,
  progress,
  onScore,
  onNote,
  editActive,
  onToggleEdit,
  color,
}: {
  skill: Skill
  progress?: SkillProgress
  onScore: (score: MasteryLevel) => void
  onNote: (note: string) => void
  editActive: boolean
  onToggleEdit: () => void
  color: string
}) {
  const score = progress?.score ?? 0
  const lvl   = MASTERY_LEVELS.find(l => l.value === score) ?? MASTERY_LEVELS[0]
  const col   = CATEGORY_COLORS[color]

  return (
    <div className="px-4 sm:px-5 py-3">
      <div className="flex items-start gap-3">
        {/* Mastery dot */}
        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${lvl.dot}`} />
        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold text-gray-800">{skill.label}</span>
            {(skill.tags || []).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{tag}</span>
            ))}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{skill.description}</p>
          {/* Note preview */}
          {progress?.note && !editActive && (
            <p className="mt-1 text-xs text-indigo-600 italic line-clamp-1">📝 {progress.note}</p>
          )}
          {/* Edit note area */}
          {editActive && (
            <textarea
              defaultValue={progress?.note || ''}
              onBlur={e => onNote(e.target.value)}
              placeholder="Ghi chú học tập (nguồn tài liệu, kinh nghiệm thực tế...)"
              rows={2}
              autoFocus
              className="mt-2 w-full px-2 py-1.5 text-xs border border-indigo-200 rounded-lg bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none text-gray-700"
            />
          )}
        </div>
        {/* Mastery level picker */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            {MASTERY_LEVELS.map(l => (
              <button
                key={l.value}
                onClick={() => { onScore(l.value); toast.success(`${skill.label}: ${l.label}`, { duration: 1000 }) }}
                title={l.label}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  l.value === score
                    ? `${l.dot} border-current scale-125 ring-2 ring-offset-1 ring-gray-300`
                    : 'bg-gray-100 border-gray-200 hover:scale-110'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${lvl.color}`}>{lvl.label}</span>
            <button onClick={onToggleEdit} className="p-0.5 text-gray-400 hover:text-indigo-500" title="Ghi chú">
              <PenLine className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
