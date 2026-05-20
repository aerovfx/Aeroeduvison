/**
 * ProfessionalKG — Cây tri thức nghề nghiệp GV/Admin (Force-directed Graph)
 *
 * Hiển thị kỹ năng nghề nghiệp dạng đồ thị lực tương tác, tương tự Knowledge Graph của HS.
 * Center node "CPD" → 4 category nodes → ~24 skill nodes + 7 career milestone nodes (bên phải).
 *
 * Route: /teacher/knowledge-graph & /admin/knowledge-graph
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Brain, Download, FileJson, TrendingUp, Award, Plus, PenLine,
  BarChart2, Sparkles, Users, BookOpen, GraduationCap, Cpu,
  Shield, Save, Clock, Lightbulb, CheckCircle2, X, MapPin, Navigation,
  ExternalLink, Target, Wrench, MessageCircle, PlayCircle,
  ChevronDown, ChevronUp, Loader2, Link2, RotateCcw,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useCareerSurveyGuard } from '@/hooks/useCareerSurveyGuard'
import * as XLSX from 'xlsx'
import { api } from '@/services/api'
import { getSuggestion, type SuggestionMethod } from './skillSuggestions'
import {
  buildCareerKG, findCrossCareerBridges, getCareerLabel, annotateWithBridges,
  type KGCategory,
} from '@/lib/career-kg'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  icon: React.ComponentType<{ className?: string }>
  color: string
  skills: Skill[]
}

// ── Teacher skill tree ─────────────────────────────────────────────────────────

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
      { id: 'tds-lms',              label: 'Sử dụng LMS (inphysic.com)',       description: 'Tạo bài giảng, quản lý lớp, chấm điểm, báo cáo trên nền tảng', tags: ['bắt buộc'] },
      { id: 'tds-ai-tools',         label: 'Công cụ AI hỗ trợ giảng dạy',    description: 'Claude AI Tutor, AI tạo đề, tóm tắt nội dung bằng AI', tags: ['xu hướng'] },
      { id: 'tds-content-creation', label: 'Tạo nội dung số',                 description: 'Video bài giảng, slides tương tác, infographic, podcast' },
      { id: 'tds-data-analytics',   label: 'Phân tích dữ liệu học tập',      description: 'Đọc dashboard, phát hiện học sinh cần hỗ trợ sớm qua data' },
      { id: 'tds-online-teaching',  label: 'Dạy học trực tuyến',              description: 'Zoom/Meet, quản lý lớp online, giữ tương tác học sinh' },
      { id: 'tds-security',         label: 'An toàn thông tin cơ bản',        description: 'Bảo vệ dữ liệu học sinh, password hygiene, phishing awareness', tags: ['pháp lý'] },
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

// ── Mastery ───────────────────────────────────────────────────────────────────

const MASTERY_LEVELS = [
  { value: 0   as MasteryLevel, label: 'Chưa biết',   color: 'text-gray-400  bg-gray-100  border-gray-200',  dot: 'bg-gray-300',   hex: '#6b7280' },
  { value: 25  as MasteryLevel, label: 'Mới bắt đầu', color: 'text-red-600   bg-red-50    border-red-200',   dot: 'bg-red-400',    hex: '#ef4444' },
  { value: 50  as MasteryLevel, label: 'Đang học',    color: 'text-amber-700 bg-amber-50  border-amber-200', dot: 'bg-amber-400',  hex: '#f59e0b' },
  { value: 75  as MasteryLevel, label: 'Thành thạo',  color: 'text-blue-700  bg-blue-50   border-blue-200',  dot: 'bg-blue-500',   hex: '#3b82f6' },
  { value: 100 as MasteryLevel, label: 'Chuyên gia',  color: 'text-green-700 bg-green-50  border-green-200', dot: 'bg-green-500',  hex: '#22c55e' },
]

const CATEGORY_COLORS: Record<string, {
  header: string; bar: string; badge: string; border: string; icon: string; hex: string; abbr: string
}> = {
  purple: { header: 'from-purple-600 to-purple-700', bar: 'bg-purple-500',  badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200', icon: 'text-purple-600', hex: '#9333ea', abbr: 'CM' },
  blue:   { header: 'from-blue-600   to-blue-700',   bar: 'bg-blue-500',    badge: 'bg-blue-100   text-blue-700',   border: 'border-blue-200',   icon: 'text-blue-600',   hex: '#3b82f6', abbr: 'SP' },
  emerald:{ header: 'from-emerald-600 to-emerald-700',bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700',border: 'border-emerald-200',icon: 'text-emerald-600',hex: '#10b981', abbr: 'KS' },
  amber:  { header: 'from-amber-500  to-amber-600',   bar: 'bg-amber-500',   badge: 'bg-amber-100  text-amber-700',  border: 'border-amber-200',  icon: 'text-amber-600',  hex: '#f59e0b', abbr: 'PN' },
}

// ── Career milestones ──────────────────────────────────────────────────────────

interface CareerMilestone {
  id: string
  label: string
  shortLabel: string
  minScore: number
  requiredSkillIds?: string[]
  emoji: string
}

const TEACHER_MILESTONES: CareerMilestone[] = [
  { id: 'cm-young',      label: 'Giáo viên trẻ',         shortLabel: 'GV Trẻ',   minScore: 30, emoji: '🌱' },
  { id: 'cm-experienced',label: 'GV có kinh nghiệm',     shortLabel: 'GV KN',    minScore: 50, emoji: '📚' },
  { id: 'cm-core',       label: 'Giáo viên cốt cán',     shortLabel: 'GV Cốt',   minScore: 65, emoji: '⭐' },
  { id: 'cm-headteacher',label: 'Tổ trưởng bộ môn',      shortLabel: 'Tổ trưởng', minScore: 75, requiredSkillIds: ['tpd-leadership'], emoji: '🏅' },
  { id: 'cm-vp',         label: 'Phó Hiệu trưởng',       shortLabel: 'P.HT',     minScore: 80, emoji: '🎖️' },
  { id: 'cm-principal',  label: 'Hiệu trưởng',           shortLabel: 'HT',       minScore: 88, emoji: '🏆' },
  { id: 'cm-expert',     label: 'Chuyên gia Quốc gia',   shortLabel: 'CG Quốc Gia', minScore: 95, emoji: '🌟' },
]

const ADMIN_MILESTONES: CareerMilestone[] = [
  { id: 'adm-chuyenvien', label: 'Chuyên viên',        shortLabel: 'CV',       minScore: 30, emoji: '🌱' },
  { id: 'adm-totruong',   label: 'Tổ trưởng',          shortLabel: 'Tổ Trưởng', minScore: 50, emoji: '📚' },
  { id: 'adm-pho-ht',     label: 'Phó Hiệu trưởng',   shortLabel: 'P.HT',     minScore: 65, emoji: '⭐' },
  { id: 'adm-ht',         label: 'Hiệu trưởng',        shortLabel: 'HT',       minScore: 75, emoji: '🏅' },
  { id: 'adm-truong-pgd', label: 'Trưởng phòng GD',   shortLabel: 'Trưởng Phg', minScore: 82, emoji: '🎖️' },
  { id: 'adm-giam-doc',   label: 'Giám đốc Sở',       shortLabel: 'GĐ Sở',    minScore: 90, emoji: '🏆' },
  { id: 'adm-cg-bo',      label: 'Chuyên gia Bộ',     shortLabel: 'CG Bộ',    minScore: 95, emoji: '🌟' },
]

// ── Persistence types ─────────────────────────────────────────────────────────

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

// ── Graph node types ───────────────────────────────────────────────────────────

type NodeType = 'center' | 'category' | 'skill' | 'milestone'

interface GraphNode {
  id: string
  type: NodeType
  label: string
  shortLabel?: string
  x: number
  y: number
  vx: number
  vy: number
  fx?: number   // pinned x
  fy?: number   // pinned y
  radius: number
  color: string
  catColor?: string   // for category nodes
  skillId?: string    // for skill nodes
  catId?: string      // which category this skill belongs to
  milestoneIndex?: number
  emoji?: string
}

interface GraphEdge {
  source: string
  target: string
  type: 'center-cat' | 'cat-skill' | 'cross' | 'milestone-path'
  color: string
  dash?: number[]
  width: number
  opacity: number
}

// ── Physics constants ──────────────────────────────────────────────────────────

const REPULSION     = 2000
const SPRING_K      = 0.022
const SPRING_LENGTH = 150
const CENTERING     = 0.0008
const DAMPING       = 0.86
const MAX_VELOCITY  = 10

// ── Cross-skill edges ──────────────────────────────────────────────────────────

const CROSS_EDGES: [string, string][] = [
  ['tce-curriculum2018', 'tp-lesson-design'],
  ['tce-research',       'tp-formative'],
  ['tp-active-learning', 'tds-ai-tools'],
  ['tp-differentiation', 'tds-data-analytics'],
  ['tds-lms',            'tpd-cpd-plan'],
  ['tds-content-creation','tp-stem'],
  ['tpd-reflection',     'tce-update'],
  ['tpd-mentoring',      'tpd-leadership'],
]

// ── Main component ────────────────────────────────────────────────────────────

/** Special tab identifiers for the career picker bar. */
const LEGACY_CAREER_KEY = '__legacy__'
const BRIDGES_KEY = '__bridges__'

export default function ProfessionalKG() {
  const { user } = useAuth()
  const { checking, allowed } = useCareerSurveyGuard()
  const isAdmin   = user?.role === 'ADMIN'
  const legacyTree = isAdmin ? ADMIN_TREE : TEACHER_TREE
  const legacyMilestones = isAdmin ? ADMIN_MILESTONES : TEACHER_MILESTONES
  const userId    = user?.id || 'guest'

  // Career selection — list từ survey + tab hiện tại
  const [selectedCareers, setSelectedCareers] = useState<string[]>([])
  const [activeCareer, setActiveCareer] = useState<string>(LEGACY_CAREER_KEY)
  const [careersLoaded, setCareersLoaded] = useState(false)

  // State
  const [progressMap, setProgressMap] = useState<ProgressMap>({})
  const [cpdLog, setCpdLog]           = useState<CpdEntry[]>([])
  const [activeTab, setActiveTab]     = useState<'graph' | 'log' | 'report'>('graph')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [newLogNote, setNewLogNote]   = useState('')
  const [newLogSkill, setNewLogSkill] = useState('')

  // ── Fetch career survey để biết user đã chọn nghề nào ──
  useEffect(() => {
    if (!userId || userId === 'guest') {
      setCareersLoaded(true)
      return
    }
    api.get<{ completed: boolean; data?: { profession?: { selectedCareers?: string[] } } }>('/users/me/career-survey')
      .then((res) => {
        const list = res.data?.data?.profession?.selectedCareers || []
        const clean = Array.isArray(list) ? list.filter((c) => typeof c === 'string') : []
        setSelectedCareers(clean)
        // Auto-pick tab: first career nếu có, else legacy
        if (clean.length > 0) {
          setActiveCareer(clean[0])
        } else {
          setActiveCareer(LEGACY_CAREER_KEY)
        }
      })
      .catch(() => {/* fallback to legacy */})
      .finally(() => setCareersLoaded(true))
  }, [userId])

  // ── Tree hiện tại dựa trên activeCareer ──
  const tree: SkillCategory[] = useMemo(() => {
    if (activeCareer === LEGACY_CAREER_KEY || activeCareer === BRIDGES_KEY) {
      return legacyTree
    }
    const kg = buildCareerKG(activeCareer)
    if (!kg.length) return legacyTree
    // Annotate với bridges nếu có nhiều nghề
    const annotated = annotateWithBridges(kg, activeCareer, selectedCareers) as KGCategory[]
    return annotated as unknown as SkillCategory[]
  }, [activeCareer, selectedCareers, legacyTree])

  // Milestones: chỉ áp dụng cho legacy view; với career-specific KG không hiển thị milestones
  // (để giữ giao diện gọn, role-progression vẫn ở legacy mode).
  const milestones = legacyMilestones
  const showMilestones = activeCareer === LEGACY_CAREER_KEY

  // Canvas refs
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const nodesRef    = useRef<GraphNode[]>([])
  const edgesRef    = useRef<GraphEdge[]>([])
  const animRef     = useRef<number>(0)
  const panRef      = useRef({ x: 0, y: 0 })
  const zoomRef     = useRef(1)
  const dragRef     = useRef<{ nodeId: string | null; panStart: { x: number; y: number } | null; mouseStart: { x: number; y: number } | null }>({ nodeId: null, panStart: null, mouseStart: null })
  const hoveredRef  = useRef<string | null>(null)
  const glowPhase   = useRef(0)
  const selectedRef = useRef<GraphNode | null>(null)

  // Keep selectedRef in sync
  useEffect(() => { selectedRef.current = selectedNode }, [selectedNode])

  // Load from backend (primary) + localStorage (fallback) on mount
  useEffect(() => {
    if (!userId || userId === 'guest') {
      setProgressMap(loadProgress(userId))
      setCpdLog(loadCpdLog(userId))
      return
    }
    // Try backend first
    api.get('/teachers/cpd').then(res => {
      const remoteProgress = res.data?.progress || {}
      if (Object.keys(remoteProgress).length > 0) {
        // Merge remote với local (ưu tiên newer updatedAt)
        const local = loadProgress(userId)
        const merged: ProgressMap = { ...local }
        for (const [k, v] of Object.entries(remoteProgress)) {
          const rem = v as SkillProgress
          const loc = local[k]
          if (!loc || new Date(rem.updatedAt) >= new Date(loc.updatedAt)) {
            merged[k] = rem
          }
        }
        setProgressMap(merged)
        saveProgress(userId, merged)
      } else {
        setProgressMap(loadProgress(userId))
      }
    }).catch(() => {
      setProgressMap(loadProgress(userId))
    })
    setCpdLog(loadCpdLog(userId))
  }, [userId])

  // Debounced backend sync (fire-and-forget sau mỗi lần update skill)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncToBackend = useCallback((map: ProgressMap) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      api.post('/teachers/cpd', { progress: map }).catch(() => {/* silent */})
    }, 2000) // debounce 2s
  }, [])

  // Derived stats
  const allSkills = useMemo(() => tree.flatMap(c => c.skills.map(s => ({ ...s, catId: c.id, catLabel: c.label, color: c.color }))), [tree])
  const totalSkills = allSkills.length

  const avgScore = useMemo(() => {
    if (!totalSkills) return 0
    return Math.round(allSkills.reduce((sum, s) => sum + (progressMap[s.id]?.score ?? 0), 0) / totalSkills)
  }, [allSkills, progressMap, totalSkills])

  const catStats = useMemo(() => tree.map(cat => {
    const n = cat.skills.length
    const sum = cat.skills.reduce((s, sk) => s + (progressMap[sk.id]?.score ?? 0), 0)
    const avg = n ? Math.round(sum / n) : 0
    const mastered = cat.skills.filter(sk => (progressMap[sk.id]?.score ?? 0) >= 75).length
    return { id: cat.id, avg, mastered, total: n }
  }), [tree, progressMap])

  const currentMilestone = useMemo(() => {
    return milestones.slice().reverse().find(m => {
      if (avgScore < m.minScore) return false
      if (m.requiredSkillIds) return m.requiredSkillIds.every(id => (progressMap[id]?.score ?? 0) >= 75)
      return true
    }) || null
  }, [milestones, avgScore, progressMap])

  const nextMilestone = useMemo(() => {
    return milestones.find(m => {
      if (avgScore >= m.minScore) return false
      return true
    }) || null
  }, [milestones, avgScore])

  // ── Update skill ──
  const updateSkill = useCallback((skillId: string, score: MasteryLevel, note?: string) => {
    setProgressMap(prev => {
      const next = {
        ...prev,
        [skillId]: {
          score,
          note: note ?? prev[skillId]?.note ?? '',
          updatedAt: new Date().toISOString(),
        },
      }
      saveProgress(userId, next)
      syncToBackend(next)
      return next
    })
  }, [userId, syncToBackend])

  const updateNote = useCallback((skillId: string, note: string) => {
    setProgressMap(prev => {
      const existing = prev[skillId] || { score: 0 as MasteryLevel, note: '', updatedAt: new Date().toISOString() }
      const next = { ...prev, [skillId]: { ...existing, note, updatedAt: new Date().toISOString() } }
      saveProgress(userId, next)
      syncToBackend(next)
      return next
    })
  }, [userId, syncToBackend])

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

  // ── Build graph nodes + edges ──
  const buildGraph = useCallback((canvasW: number, canvasH: number, currentProgress: ProgressMap) => {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const cx = canvasW / 2 - 80  // shift left a bit for milestone column
    const cy = canvasH / 2

    // Center node
    nodes.push({
      id: 'center',
      type: 'center',
      label: 'CPD',
      x: cx, y: cy,
      vx: 0, vy: 0,
      fx: cx, fy: cy,
      radius: 40,
      color: '#7c3aed',
    })

    // Category nodes (around center)
    const catAngles = [(-3 * Math.PI) / 6, (-1 * Math.PI) / 6, (1 * Math.PI) / 6, (3 * Math.PI) / 6]
    tree.forEach((cat, ci) => {
      const angle = catAngles[ci]
      const col = CATEGORY_COLORS[cat.color]
      const nx = cx + Math.cos(angle) * 200
      const ny = cy + Math.sin(angle) * 200
      nodes.push({
        id: `cat-${cat.id}`,
        type: 'category',
        label: cat.label,
        shortLabel: col.abbr,
        x: nx, y: ny,
        vx: 0, vy: 0,
        radius: 28,
        color: col.hex,
        catColor: cat.color,
        catId: cat.id,
      })
      edges.push({
        source: 'center',
        target: `cat-${cat.id}`,
        type: 'center-cat',
        color: '#9333ea',
        width: 2.5,
        opacity: 0.5,
      })

      // Skill nodes (around category)
      cat.skills.forEach((skill, si) => {
        const skillAngle = angle + (si - (cat.skills.length - 1) / 2) * (Math.PI / 5)
        const skillDist = 120
        const sx = nx + Math.cos(skillAngle) * skillDist
        const sy = ny + Math.sin(skillAngle) * skillDist
        const score = currentProgress[skill.id]?.score ?? 0
        const masteryConfig = MASTERY_LEVELS.find(l => l.value === score) || MASTERY_LEVELS[0]
        nodes.push({
          id: skill.id,
          type: 'skill',
          label: skill.label,
          x: sx, y: sy,
          vx: 0, vy: 0,
          radius: 16,
          color: masteryConfig.hex,
          catColor: cat.color,
          skillId: skill.id,
          catId: cat.id,
        })
        edges.push({
          source: `cat-${cat.id}`,
          target: skill.id,
          type: 'cat-skill',
          color: col.hex,
          width: 1.5,
          opacity: 0.4,
        })
      })
    })

    // Milestone nodes — pinned right side (chỉ ở legacy view)
    if (showMilestones) {
      const milestoneCount = milestones.length
      const milestoneX = canvasW - 100
      const milestoneSpacing = (canvasH - 80) / (milestoneCount + 1)
      milestones.forEach((m, mi) => {
        const my = 40 + milestoneSpacing * (mi + 1)
        nodes.push({
          id: m.id,
          type: 'milestone',
          label: m.label,
          shortLabel: m.shortLabel,
          x: milestoneX, y: my,
          vx: 0, vy: 0,
          fx: milestoneX, fy: my,
          radius: 20,
          color: '#d97706',
          milestoneIndex: mi,
          emoji: m.emoji,
        })
      })

      // Milestone vertical path edges (bottom → top)
      for (let mi = milestoneCount - 1; mi > 0; mi--) {
        edges.push({
          source: milestones[mi].id,
          target: milestones[mi - 1].id,
          type: 'milestone-path',
          color: '#d97706',
          width: 2,
          opacity: 0.35,
        })
      }

      // Center → bottom milestone (dashed gold)
      edges.push({
        source: 'center',
        target: milestones[milestoneCount - 1].id,
        type: 'milestone-path',
        color: '#d97706',
        dash: [6, 4],
        width: 1.5,
        opacity: 0.3,
      })
    }

    // Cross-skill edges (only for teacher legacy tree)
    if (!isAdmin && activeCareer === LEGACY_CAREER_KEY) {
      CROSS_EDGES.forEach(([src, tgt]) => {
        const srcNode = nodes.find(n => n.id === src)
        const tgtNode = nodes.find(n => n.id === tgt)
        if (srcNode && tgtNode) {
          edges.push({
            source: src,
            target: tgt,
            type: 'cross',
            color: '#94a3b8',
            dash: [4, 3],
            width: 1,
            opacity: 0.35,
          })
        }
      })
    }

    nodesRef.current = nodes
    edgesRef.current = edges
  }, [tree, milestones, isAdmin, activeCareer, showMilestones])

  // ── Physics step ──
  const physicsStep = useCallback(() => {
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const n = nodes.length

    for (let i = 0; i < n; i++) {
      const a = nodes[i]
      if (a.fx !== undefined || a.fy !== undefined) continue

      let fx = 0, fy = 0

      // Repulsion from other nodes
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = a.radius + b.radius + 20
        if (dist < minDist * 3) {
          const force = REPULSION / (dist * dist)
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        }
      }

      // Spring forces from edges
      for (const edge of edges) {
        let otherNode: GraphNode | undefined
        if (edge.source === a.id) otherNode = nodes.find(n => n.id === edge.target)
        else if (edge.target === a.id) otherNode = nodes.find(n => n.id === edge.source)
        if (!otherNode) continue

        const dx = otherNode.x - a.x
        const dy = otherNode.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const stretch = dist - SPRING_LENGTH
        fx += (dx / dist) * stretch * SPRING_K
        fy += (dy / dist) * stretch * SPRING_K
      }

      // Centering force toward canvas center (use canvas size approximation)
      const canvasEl = canvasRef.current
      if (canvasEl) {
        const cxCanvas = canvasEl.width / (window.devicePixelRatio || 1) / 2
        const cyCanvas = canvasEl.height / (window.devicePixelRatio || 1) / 2
        fx += (cxCanvas - a.x) * CENTERING
        fy += (cyCanvas - a.y) * CENTERING
      }

      a.vx = (a.vx + fx) * DAMPING
      a.vy = (a.vy + fy) * DAMPING
      const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy)
      if (speed > MAX_VELOCITY) { a.vx = (a.vx / speed) * MAX_VELOCITY; a.vy = (a.vy / speed) * MAX_VELOCITY }
      a.x += a.vx
      a.y += a.vy
    }

    // Keep pinned nodes locked
    for (const node of nodes) {
      if (node.fx !== undefined) node.x = node.fx
      if (node.fy !== undefined) node.y = node.fy
    }
  }, [])

  // ── Draw star shape ──
  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    const spikes = 5
    const outerR = r
    const innerR = r * 0.45
    ctx.beginPath()
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2
      const radius = i % 2 === 0 ? outerR : innerR
      const px = cx + Math.cos(angle) * radius
      const py = cy + Math.sin(angle) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  }

  // ── Draw frame ──
  const drawFrame = useCallback((currentProgress: ProgressMap) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const pan = panRef.current
    const zoom = zoomRef.current

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const selected = selectedRef.current
    const hovered = hoveredRef.current

    glowPhase.current += 0.06

    // 1. Milestone vertical line (behind all)
    const mNodes = nodes.filter(n => n.type === 'milestone').sort((a, b) => (a.milestoneIndex ?? 0) - (b.milestoneIndex ?? 0))
    if (mNodes.length >= 2) {
      ctx.save()
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.18
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.moveTo(mNodes[0].x, mNodes[0].y)
      for (let mi = 1; mi < mNodes.length; mi++) ctx.lineTo(mNodes[mi].x, mNodes[mi].y)
      ctx.stroke()
      ctx.restore()
    }

    // 2. Edges
    for (const edge of edges) {
      if (edge.type === 'milestone-path') continue  // handled above
      const src = nodeMap.get(edge.source)
      const tgt = nodeMap.get(edge.target)
      if (!src || !tgt) continue

      ctx.save()
      ctx.strokeStyle = edge.color
      ctx.lineWidth = edge.width
      ctx.globalAlpha = edge.opacity
      if (edge.dash) ctx.setLineDash(edge.dash)
      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      ctx.lineTo(tgt.x, tgt.y)
      ctx.stroke()
      ctx.restore()
    }

    // 3. Nodes
    for (const node of nodes) {
      const isHovered  = hoveredRef.current === node.id
      const isSelected = selected?.id === node.id
      const scale = isHovered && !isSelected ? 1.15 : 1
      const r = node.radius * scale

      ctx.save()
      ctx.translate(node.x, node.y)

      // Pulsing glow for selected
      if (isSelected) {
        const glowR = r + 8 + Math.sin(glowPhase.current) * 4
        ctx.shadowColor = '#ffffff'
        ctx.shadowBlur = 18
        ctx.beginPath()
        ctx.arc(0, 0, glowR, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.lineWidth = 2.5
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      if (node.type === 'center') {
        // Gradient circle
        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r)
        grad.addColorStop(0, '#a855f7')
        grad.addColorStop(1, '#4c1d95')
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.strokeStyle = '#d8b4fe'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.round(r * 0.45)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('CPD', 0, 0)

      } else if (node.type === 'category') {
        const col = node.catColor ? CATEGORY_COLORS[node.catColor] : null
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fillStyle = node.color
        ctx.globalAlpha = 0.92
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.strokeStyle = col ? col.hex + 'aa' : '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.round(r * 0.55)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.shortLabel || node.label.slice(0, 2), 0, 0)

      } else if (node.type === 'skill') {
        const score = currentProgress[node.id]?.score ?? 0
        const masteryHex = (MASTERY_LEVELS.find(l => l.value === score) || MASTERY_LEVELS[0]).hex

        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fillStyle = '#1e1b4b'
        ctx.globalAlpha = 0.85
        ctx.fill()
        ctx.globalAlpha = 1

        if (score > 0) {
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.strokeStyle = masteryHex
          ctx.lineWidth = 3
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.strokeStyle = '#4b5563'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Inner dot
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = masteryHex
        ctx.globalAlpha = 0.8
        ctx.fill()
        ctx.globalAlpha = 1

      } else if (node.type === 'milestone') {
        const mIdx = node.milestoneIndex ?? 0
        const ms = milestones[mIdx]
        const unlocked = ms ? avgScore >= ms.minScore && (!ms.requiredSkillIds || ms.requiredSkillIds.every(id => (currentProgress[id]?.score ?? 0) >= 75)) : false

        drawStar(ctx, 0, 0, r)
        ctx.fillStyle = unlocked ? '#fbbf24' : '#374151'
        ctx.globalAlpha = unlocked ? 0.95 : 0.5
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.strokeStyle = unlocked ? '#d97706' : '#6b7280'
        ctx.lineWidth = 2
        ctx.stroke()

        // Emoji
        ctx.font = `${Math.round(r * 0.65)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.globalAlpha = unlocked ? 1 : 0.4
        ctx.fillText(node.emoji || '⭐', 0, 0)
        ctx.globalAlpha = 1
      }

      ctx.restore()
    }

    // 4. Labels
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const node of nodes) {
      if (node.type === 'center') continue
      const isHovered  = hovered === node.id
      const isSelected = selected?.id === node.id

      const labelY = node.y + node.radius + 5
      const fontSize = node.type === 'skill' ? 9 : node.type === 'milestone' ? 8 : 10
      ctx.font = `${isSelected || isHovered ? 'bold ' : ''}${fontSize}px system-ui`

      // Draw text with bg
      const label = node.type === 'milestone' ? (node.shortLabel || node.label) : (isHovered || isSelected ? node.label : (node.shortLabel || node.label))
      const maxLen = node.type === 'skill' ? 14 : 16
      const truncated = label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label

      ctx.fillStyle = isSelected ? '#c4b5fd' : isHovered ? '#e2e8f0' : node.type === 'milestone' ? '#fcd34d' : '#cbd5e1'
      ctx.globalAlpha = isHovered || isSelected ? 1 : 0.85
      ctx.fillText(truncated, node.x, labelY)
      ctx.globalAlpha = 1
    }
    ctx.restore()

    ctx.restore()  // undo translate/scale
    ctx.restore()  // undo DPR transform
  }, [milestones, avgScore])

  // ── Resize observer ──
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    canvas.width  = W * dpr
    canvas.height = H * dpr
    buildGraph(W, H, progressMap)
  }, [buildGraph, progressMap])

  // ── RAF loop ──
  useEffect(() => {
    const loop = () => {
      physicsStep()
      drawFrame(progressMap)
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [physicsStep, drawFrame, progressMap])

  // ── Canvas resize ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    resizeCanvas()
    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(canvas.parentElement || canvas)
    return () => ro.disconnect()
  }, [resizeCanvas])

  // ── Rebuild graph khi đổi career tab ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    if (W > 0 && H > 0) {
      // Reset selection & pan/zoom khi đổi nghề
      setSelectedNode(null)
      panRef.current = { x: 0, y: 0 }
      zoomRef.current = 1
      buildGraph(W, H, progressMap)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCareer])

  // Rebuild graph when progress changes (to update skill node colors)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    if (W > 0 && H > 0) {
      // Only update skill node colors, don't rebuild full graph (would reset positions)
      nodesRef.current.forEach(node => {
        if (node.type === 'skill' && node.skillId) {
          const score = progressMap[node.skillId]?.score ?? 0
          const m = MASTERY_LEVELS.find(l => l.value === score) || MASTERY_LEVELS[0]
          node.color = m.hex
        }
      })
    }
  }, [progressMap])

  // ── Mouse helpers ──
  const getWorldPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const wx = (mx - panRef.current.x) / zoomRef.current
    const wy = (my - panRef.current.y) / zoomRef.current
    return { mx, my, wx, wy }
  }

  const hitTest = (wx: number, wy: number): GraphNode | null => {
    const nodes = nodesRef.current
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dx = wx - n.x
      const dy = wy - n.y
      const hitR = n.type === 'milestone' ? n.radius + 4 : n.radius
      if (dx * dx + dy * dy <= hitR * hitR) return n
    }
    return null
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my, wx, wy } = getWorldPos(e)
    const drag = dragRef.current

    if (drag.nodeId) {
      // Dragging a node
      const node = nodesRef.current.find(n => n.id === drag.nodeId)
      if (node && node.fx === undefined && node.fy === undefined) {
        node.x = wx
        node.y = wy
        node.vx = 0; node.vy = 0
      }
    } else if (drag.panStart && drag.mouseStart) {
      // Panning
      panRef.current = {
        x: drag.panStart.x + (mx - drag.mouseStart.x),
        y: drag.panStart.y + (my - drag.mouseStart.y),
      }
    } else {
      // Hover detection
      const hit = hitTest(wx, wy)
      const newHovered = hit?.id || null
      if (hoveredRef.current !== newHovered) {
        hoveredRef.current = newHovered
        if (canvasRef.current) {
          canvasRef.current.style.cursor = newHovered ? 'pointer' : 'grab'
        }
      }
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my, wx, wy } = getWorldPos(e)
    const hit = hitTest(wx, wy)
    if (hit) {
      dragRef.current = { nodeId: hit.id, panStart: null, mouseStart: null }
    } else {
      dragRef.current = { nodeId: null, panStart: { ...panRef.current }, mouseStart: { x: mx, y: my } }
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
    }
  }

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { wx, wy } = getWorldPos(e)
    const drag = dragRef.current
    // If we were dragging a node with very small movement — treat as click
    if (drag.nodeId && drag.mouseStart === null) {
      const node = nodesRef.current.find(n => n.id === drag.nodeId)
      if (node) {
        setSelectedNode(prev => prev?.id === node.id ? null : node)
      }
    } else if (!drag.nodeId && drag.mouseStart) {
      // check if it was a click (tiny movement) on empty space → deselect
      const hit = hitTest(wx, wy)
      if (hit) {
        setSelectedNode(prev => prev?.id === hit.id ? null : hit)
      } else {
        setSelectedNode(null)
      }
    }
    dragRef.current = { nodeId: null, panStart: null, mouseStart: null }
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
  }

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const delta = e.deltaY < 0 ? 1.12 : 0.9
    const newZoom = Math.min(3.0, Math.max(0.4, zoomRef.current * delta))
    // Zoom toward mouse
    panRef.current = {
      x: mx - (mx - panRef.current.x) * (newZoom / zoomRef.current),
      y: my - (my - panRef.current.y) * (newZoom / zoomRef.current),
    }
    zoomRef.current = newZoom
  }

  // ── Right panel data ──
  const panelData = useMemo(() => {
    if (!selectedNode) return null
    if (selectedNode.type === 'skill' && selectedNode.skillId) {
      const skill = allSkills.find(s => s.id === selectedNode.skillId)
      if (!skill) return null
      const progress = progressMap[skill.id]
      const neighbors = edgesRef.current
        .filter(e => e.type !== 'milestone-path' && (e.source === skill.id || e.target === skill.id))
        .map(e => e.source === skill.id ? e.target : e.source)
        .filter(id => id !== skill.id)
        .slice(0, 5)
      return { type: 'skill' as const, skill, progress, neighbors }
    }
    if (selectedNode.type === 'milestone' && selectedNode.milestoneIndex !== undefined) {
      const ms = milestones[selectedNode.milestoneIndex]
      if (!ms) return null
      const unlocked = avgScore >= ms.minScore && (!ms.requiredSkillIds || ms.requiredSkillIds.every(id => (progressMap[id]?.score ?? 0) >= 75))
      return { type: 'milestone' as const, milestone: ms, unlocked }
    }
    if (selectedNode.type === 'category') {
      const cat = tree.find(c => `cat-${c.id}` === selectedNode.id)
      if (!cat) return null
      const ci = tree.indexOf(cat)
      return { type: 'category' as const, cat, stats: catStats[ci] }
    }
    return null
  }, [selectedNode, allSkills, progressMap, milestones, avgScore, tree, catStats])

  // ── Export Excel ──
  const exportExcel = () => {
    const hdr = ['STT', 'Lĩnh vực', 'Kỹ năng / Năng lực', 'Mô tả', 'Mức độ thành thạo', 'Điểm', 'Ghi chú học tập', 'Cập nhật lần cuối']
    const rows = allSkills.map((s, i) => {
      const p = progressMap[s.id]
      const lvl = MASTERY_LEVELS.find(l => l.value === (p?.score ?? 0))
      return [
        i + 1, s.catLabel, s.label, s.description,
        lvl?.label || 'Chưa biết', p?.score ?? 0,
        p?.note || '',
        p?.updatedAt ? new Date(p.updatedAt).toLocaleString('vi-VN') : '',
      ]
    })
    const ws1 = XLSX.utils.aoa_to_sheet([
      [`BÁO CÁO PHÁT TRIỂN CHUYÊN MÔN — ${user?.name || ''} — ${isAdmin ? 'Quản lý' : 'Giáo viên'}`],
      [`Xuất ngày: ${new Date().toLocaleString('vi-VN')} — Tiến độ tổng thể: ${avgScore}% — Thành thạo: ${allSkills.filter(s => (progressMap[s.id]?.score ?? 0) >= 75).length}/${totalSkills} kỹ năng`],
      [],
      hdr,
      ...rows,
    ])
    ws1['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 45 }, { wch: 18 }, { wch: 8 }, { wch: 40 }, { wch: 20 }]
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: hdr.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: hdr.length - 1 } },
    ]
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Lĩnh vực', 'Số kỹ năng', 'Thành thạo (≥75%)', 'Điểm TB (%)'],
      ...tree.map((cat, i) => {
        const cs = catStats[i]
        return [cat.label, cs.total, cs.mastered, cs.avg]
      }),
    ])
    ws2['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 14 }]
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['Thời gian', 'Kỹ năng liên quan', 'Nội dung cập nhật'],
      ...cpdLog.map(e => [new Date(e.createdAt).toLocaleString('vi-VN'), e.skillLabel, e.note]),
    ])
    ws3['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 60 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'Kỹ năng chi tiết')
    XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp lĩnh vực')
    XLSX.utils.book_append_sheet(wb, ws3, 'Nhật ký học tập')
    XLSX.writeFile(wb, `CPD_${(user?.name || 'user').replace(/[^\w\d-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Đã xuất báo cáo CPD Excel (3 sheets)')
  }

  const exportJson = () => {
    const data = {
      meta: {
        user: { name: user?.name, role: user?.role },
        exportedAt: new Date().toISOString(),
        stats: { total: totalSkills, mastered: allSkills.filter(s => (progressMap[s.id]?.score ?? 0) >= 75).length, avgScore },
      },
      categories: tree.map((cat, i) => ({
        id: cat.id, label: cat.label, description: cat.description, color: cat.color,
        stats: catStats[i],
        skills: cat.skills.map(s => ({
          id: s.id, label: s.label, description: s.description, tags: s.tags,
          mastery: progressMap[s.id]?.score ?? 0,
          masteryLabel: MASTERY_LEVELS.find(l => l.value === (progressMap[s.id]?.score ?? 0))?.label,
          note: progressMap[s.id]?.note || '',
          updatedAt: progressMap[s.id]?.updatedAt || null,
        })),
      })),
      cpdLog,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `CPD_${(user?.name || 'user').replace(/[^\w\d-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất JSON phát triển chuyên môn')
  }

  // ── Career survey gate — TEACHER/PARENT/ADMIN phải hoàn thành khảo sát trước ──
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }
  if (!allowed) return null  // hook đã redirect

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }} className="bg-slate-950 text-white">

      {/* ── Top bar ── */}
      <div className="shrink-0 bg-slate-900/80 border-b border-slate-700/50 px-4 py-2.5 flex items-center gap-3 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white leading-none flex items-center gap-2 flex-wrap">
            Phát triển Chuyên môn
            {(() => {
              if (activeCareer === BRIDGES_KEY) {
                return (
                  <span className="text-[10px] font-medium text-amber-300 bg-amber-900/40 px-1.5 py-0.5 rounded-full">
                    Liên kết nghề
                  </span>
                )
              }
              if (activeCareer === LEGACY_CAREER_KEY) {
                return (
                  <span className="text-[10px] font-medium text-purple-300 bg-purple-900/50 px-1.5 py-0.5 rounded-full">
                    {isAdmin ? 'Quản lý' : 'Giáo viên'}
                  </span>
                )
              }
              const meta = getCareerLabel(activeCareer)
              return meta ? (
                <span className="text-[10px] font-medium text-purple-200 bg-purple-900/50 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span>{meta.icon}</span>
                  <span>{meta.name}</span>
                </span>
              ) : null
            })()}
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
            {activeCareer === BRIDGES_KEY
              ? 'Skill chung giữa các nghề bạn đã chọn'
              : 'Đồ thị năng lực nghề nghiệp — click node để xem & cập nhật'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
          {([
            { key: 'graph', label: 'Cây kỹ năng', icon: Brain },
            { key: 'log',   label: `CPD (${cpdLog.length})`, icon: PenLine },
            { key: 'report',label: 'Báo cáo', icon: BarChart2 },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === t.key ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <t.icon className="w-3 h-3" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <button onClick={exportExcel} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold">
          <Download className="w-3 h-3" /><span className="hidden sm:inline">Excel</span>
        </button>
        <button onClick={exportJson} className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold">
          <FileJson className="w-3 h-3" /><span className="hidden sm:inline">JSON</span>
        </button>
        {/* Chia sẻ vị trí trường lên bản đồ */}
        <ShareLocationButton userId={userId} progressMap={progressMap} syncToBackend={syncToBackend} />
      </div>

      {/* ── Career picker bar — tabs cho mỗi nghề user đã chọn ── */}
      {careersLoaded && selectedCareers.length > 0 && (
        <div className="shrink-0 bg-slate-900/70 border-b border-slate-700/40 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Nghề:
          </span>
          {selectedCareers.map((cid) => {
            const meta = getCareerLabel(cid)
            if (!meta) return null
            const active = activeCareer === cid
            return (
              <button
                key={cid}
                onClick={() => setActiveCareer(cid)}
                title={meta.name}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  active
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{meta.icon}</span>
                <span className="max-w-[10rem] truncate">{meta.name}</span>
              </button>
            )
          })}
          {selectedCareers.length >= 2 && (
            <button
              onClick={() => setActiveCareer(BRIDGES_KEY)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                activeCareer === BRIDGES_KEY
                  ? 'bg-amber-500 text-slate-900 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
              title="Skill chung giữa các nghề bạn đã chọn"
            >
              <Link2 className="w-3 h-3" />
              <span>Liên kết nghề</span>
            </button>
          )}
          <button
            onClick={() => setActiveCareer(LEGACY_CAREER_KEY)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              activeCareer === LEGACY_CAREER_KEY
                ? 'bg-slate-200 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title={isAdmin ? 'CPD Quản lý gốc' : 'CPD Giáo viên gốc'}
          >
            <span>{isAdmin ? 'CPD Quản lý' : 'CPD GV gốc'}</span>
          </button>

          {/* Spacer to push retake button right */}
          <div className="flex-1 min-w-2" />

          {/* Retake survey button — cho phép user chọn lại nghề/cập nhật rating */}
          <a
            href="/profile/career-survey?retake=1"
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
            title="Làm lại khảo sát — chọn lại nghề, cập nhật rating skill"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Làm lại khảo sát</span>
          </a>
        </div>
      )}

      {/* ── Career stats bar ── */}
      <div className="shrink-0 bg-slate-900/50 border-b border-slate-700/30 px-4 py-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 font-medium">
            {currentMilestone ? `${currentMilestone.emoji} ${currentMilestone.label}` : '🌱 Bắt đầu'}
          </span>
        </div>
        <div className="flex-1 max-w-48">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-700 rounded-full h-1.5">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${avgScore}%` }}
              />
            </div>
            <span className="text-slate-300 font-bold w-8 text-right">{avgScore}%</span>
          </div>
        </div>
        {nextMilestone && (
          <span className="text-slate-400 hidden sm:inline">
            Tiếp theo: <span className="text-amber-300">{nextMilestone.emoji} {nextMilestone.label}</span>
            <span className="text-slate-500 ml-1">({nextMilestone.minScore}%)</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {MASTERY_LEVELS.slice(1).map(l => {
            const count = allSkills.filter(s => (progressMap[s.id]?.score ?? 0) === l.value).length
            return count > 0 ? (
              <span key={l.value} className="flex items-center gap-1" style={{ color: l.hex }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.hex }} />
                <span className="text-slate-400">{count}</span>
              </span>
            ) : null
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-h-0 flex">

        {/* ── Bridges tab — danh sách skill chung giữa các nghề ── */}
        {activeTab === 'graph' && activeCareer === BRIDGES_KEY && (
          <BridgesView
            careerIds={selectedCareers}
            onPickCareer={(cid) => setActiveCareer(cid)}
          />
        )}

        {/* ── Graph tab — KG của 1 nghề (career-specific hoặc legacy) ── */}
        {activeTab === 'graph' && activeCareer !== BRIDGES_KEY && (
          <>
            {/* Canvas area */}
            <div className="relative flex-1 min-h-0">
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
                onMouseMove={onMouseMove}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseLeave={() => {
                  hoveredRef.current = null
                  dragRef.current = { nodeId: null, panStart: null, mouseStart: null }
                  if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
                }}
                onWheel={onWheel}
              />
              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur rounded-xl px-3 py-2 text-[10px] text-slate-400 space-y-1">
                <div className="text-slate-300 font-semibold mb-1.5">Mức thành thạo</div>
                {MASTERY_LEVELS.map(l => (
                  <div key={l.value} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.hex }} />
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>
              {/* Zoom hint */}
              <div className="absolute top-3 left-3 bg-slate-900/60 backdrop-blur rounded-lg px-2 py-1 text-[10px] text-slate-500">
                Scroll để zoom · Kéo để di chuyển · Click node để xem
              </div>
            </div>

            {/* ── Right panel ── */}
            {selectedNode && panelData && (
              <div className="w-72 shrink-0 bg-slate-900 border-l border-slate-700/50 overflow-y-auto flex flex-col">
                <div className="p-4 border-b border-slate-700/50 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {panelData.type === 'skill' && (
                      <>
                        <div className="flex items-center gap-1.5 mb-1">
                          {(panelData.skill.tags || []).map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-900/60 text-purple-300">{tag}</span>
                          ))}
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug">{panelData.skill.label}</h3>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{panelData.skill.description}</p>
                      </>
                    )}
                    {panelData.type === 'milestone' && (
                      <>
                        <div className="text-xl mb-1">{panelData.milestone.emoji}</div>
                        <h3 className="text-sm font-bold text-white">{panelData.milestone.label}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${panelData.unlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>
                          {panelData.unlocked ? 'Đã đạt' : 'Chưa đạt'}
                        </span>
                      </>
                    )}
                    {panelData.type === 'category' && (
                      <>
                        <h3 className="text-sm font-bold text-white">{panelData.cat.label}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">{panelData.cat.description}</p>
                      </>
                    )}
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="p-1 text-slate-500 hover:text-white shrink-0 ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {panelData.type === 'skill' && (() => {
                    const skill = panelData.skill
                    const prog = panelData.progress
                    const score = prog?.score ?? 0
                    const currentLvl = MASTERY_LEVELS.find(l => l.value === score)!
                    return (
                      <>
                        {/* Mastery badge */}
                        <div>
                          <p className="text-[10px] text-slate-500 mb-2 uppercase font-semibold tracking-wide">Mức thành thạo</p>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold ${currentLvl.color}`}>
                            <span className={`w-2 h-2 rounded-full ${currentLvl.dot}`} />
                            {currentLvl.label}
                          </div>
                        </div>

                        {/* Mastery picker */}
                        <div>
                          <p className="text-[10px] text-slate-500 mb-2 uppercase font-semibold tracking-wide">Cập nhật mức độ</p>
                          <div className="flex gap-2 flex-wrap">
                            {MASTERY_LEVELS.map(l => (
                              <button
                                key={l.value}
                                onClick={() => {
                                  updateSkill(skill.id, l.value)
                                  toast.success(`${skill.label}: ${l.label}`, { duration: 1200 })
                                }}
                                title={l.label}
                                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                                  l.value === score
                                    ? 'border-white scale-125 ring-2 ring-offset-1 ring-offset-slate-900 ring-white/30'
                                    : 'border-slate-600 hover:scale-110 hover:border-slate-400'
                                }`}
                                style={{ background: l.hex + '33', borderColor: l.value === score ? l.hex : undefined }}
                              >
                                <span className="w-3 h-3 rounded-full" style={{ background: l.hex }} />
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1 mt-1.5">
                            {MASTERY_LEVELS.map(l => (
                              <span key={l.value} className="text-[9px] text-slate-500 w-8 text-center">{l.value}%</span>
                            ))}
                          </div>
                        </div>

                        {/* Note */}
                        <div>
                          <p className="text-[10px] text-slate-500 mb-1.5 uppercase font-semibold tracking-wide">Ghi chú học tập</p>
                          <textarea
                            defaultValue={prog?.note || ''}
                            onBlur={e => updateNote(skill.id, e.target.value)}
                            placeholder="Tài liệu tham khảo, kinh nghiệm thực tế..."
                            rows={3}
                            className="w-full px-2.5 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                          />
                        </div>

                        {/* Add CPD button */}
                        <button
                          onClick={() => {
                            const entry: CpdEntry = {
                              id: Date.now().toString(),
                              skillId: skill.id,
                              skillLabel: skill.label,
                              note: `Cập nhật ${currentLvl.label} — ${skill.label}`,
                              createdAt: new Date().toISOString(),
                            }
                            setCpdLog(prev => {
                              const next = [entry, ...prev]
                              saveCpdLog(userId, next)
                              return next
                            })
                            toast.success('Đã thêm vào nhật ký CPD')
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm vào CPD Log
                        </button>

                        {/* Gợi ý phương pháp + bài tập nâng cao năng lực */}
                        <SkillSuggestionsPanel skillId={skill.id} />

                        {/* Related skills */}
                        {panelData.neighbors.length > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-500 mb-2 uppercase font-semibold tracking-wide">Kỹ năng liên quan</p>
                            <div className="space-y-1.5">
                              {panelData.neighbors.map(nId => {
                                const neighbor = allSkills.find(s => s.id === nId)
                                if (!neighbor) return null
                                const nScore = progressMap[nId]?.score ?? 0
                                const nLvl = MASTERY_LEVELS.find(l => l.value === nScore)!
                                return (
                                  <button
                                    key={nId}
                                    onClick={() => {
                                      const n = nodesRef.current.find(node => node.id === nId)
                                      if (n) setSelectedNode(n)
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-left"
                                  >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: nLvl.hex }} />
                                    <span className="text-xs text-slate-300 flex-1 truncate">{neighbor.label}</span>
                                    <span className="text-[9px] text-slate-500">{nScore}%</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Last updated */}
                        {prog?.updatedAt && (
                          <p className="text-[10px] text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(prog.updatedAt).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </>
                    )
                  })()}

                  {panelData.type === 'milestone' && (
                    <div className="space-y-3">
                      <div className="bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 mb-1.5 uppercase font-semibold tracking-wide">Yêu cầu</p>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${Math.min(100, (avgScore / panelData.milestone.minScore) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-amber-300 font-bold">{avgScore}/{panelData.milestone.minScore}%</span>
                        </div>
                        <p className="text-xs text-slate-400">Điểm TB tối thiểu: <strong className="text-white">{panelData.milestone.minScore}%</strong></p>
                        {panelData.milestone.requiredSkillIds && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] text-slate-500">Kỹ năng bắt buộc:</p>
                            {panelData.milestone.requiredSkillIds.map(id => {
                              const sk = allSkills.find(s => s.id === id)
                              const score = progressMap[id]?.score ?? 0
                              return (
                                <div key={id} className="flex items-center gap-2 text-xs">
                                  <CheckCircle2 className={`w-3 h-3 ${score >= 75 ? 'text-green-400' : 'text-slate-600'}`} />
                                  <span className={score >= 75 ? 'text-green-300' : 'text-slate-400'}>{sk?.label || id}</span>
                                  <span className="ml-auto text-slate-500">{score}%</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {panelData.type === 'category' && (
                    <div className="space-y-3">
                      <div className="bg-slate-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400">Tiến độ lĩnh vực</span>
                          <span className="text-sm font-bold" style={{ color: CATEGORY_COLORS[panelData.cat.color]?.hex }}>{panelData.stats.avg}%</span>
                        </div>
                        <div className="bg-slate-700 rounded-full h-2 mb-3">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${panelData.stats.avg}%`, background: CATEGORY_COLORS[panelData.cat.color]?.hex }}
                          />
                        </div>
                        <p className="text-xs text-slate-400">Thành thạo <strong className="text-white">{panelData.stats.mastered}/{panelData.stats.total}</strong> kỹ năng</p>
                      </div>
                      <div className="space-y-1.5">
                        {panelData.cat.skills.map(s => {
                          const score = progressMap[s.id]?.score ?? 0
                          const lvl = MASTERY_LEVELS.find(l => l.value === score)!
                          return (
                            <button
                              key={s.id}
                              onClick={() => {
                                const n = nodesRef.current.find(node => node.id === s.id)
                                if (n) setSelectedNode(n)
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-left"
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: lvl.hex }} />
                              <span className="text-xs text-slate-300 flex-1 truncate">{s.label}</span>
                              <span className="text-[9px] text-slate-500">{score}%</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CPD Log tab ── */}
        {activeTab === 'log' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  Thêm nhật ký học tập
                </p>
                <div className="space-y-3">
                  <select
                    value={newLogSkill}
                    onChange={e => setNewLogSkill(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    placeholder="Ghi lại điều bạn vừa học, tài liệu tham khảo, khóa học hoàn thành..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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

              {cpdLog.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <PenLine className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Chưa có nhật ký nào. Hãy ghi lại những gì bạn học hôm nay!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cpdLog.map(entry => (
                    <div key={entry.id} className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 flex gap-3">
                      <div className="w-0.5 rounded-full bg-purple-500/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-700/40">
                            {entry.skillLabel}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(entry.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{entry.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Report tab ── */}
        {activeTab === 'report' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Tổng kỹ năng', value: totalSkills, icon: BookOpen, color: 'text-slate-300' },
                  { label: 'Thành thạo (≥75%)', value: allSkills.filter(s => (progressMap[s.id]?.score ?? 0) >= 75).length, icon: CheckCircle2, color: 'text-green-400' },
                  { label: 'Đang học', value: allSkills.filter(s => { const v = progressMap[s.id]?.score ?? 0; return v >= 25 && v < 75 }).length, icon: TrendingUp, color: 'text-amber-400' },
                  { label: 'Điểm tổng thể', value: `${avgScore}%`, icon: Award, color: 'text-purple-400' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800 rounded-xl border border-slate-700 px-3 py-3 flex items-center gap-2.5">
                    <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
                    <div>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              <div className="grid gap-4 sm:grid-cols-2">
                {tree.map((cat, ci) => {
                  const cs = catStats[ci]
                  const col = CATEGORY_COLORS[cat.color]
                  return (
                    <div key={cat.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-2" style={{ background: col.hex + '22', borderBottom: `1px solid ${col.hex}33` }}>
                        <span style={{ color: col.hex }}><cat.icon className="w-4 h-4" /></span>
                        <span className="font-semibold text-sm text-white">{cat.label}</span>
                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: col.hex + '33', color: col.hex }}>{cs.avg}%</span>
                      </div>
                      <div className="h-1" style={{ background: '#1e293b' }}>
                        <div className="h-full" style={{ width: `${cs.avg}%`, background: col.hex }} />
                      </div>
                      <div className="p-3 space-y-1.5">
                        {cat.skills.map(s => {
                          const score = progressMap[s.id]?.score ?? 0
                          const lvl = MASTERY_LEVELS.find(l => l.value === score)!
                          return (
                            <div key={s.id} className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: lvl.hex }} />
                              <span className="text-xs text-slate-300 flex-1 truncate">{s.label}</span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: lvl.hex + '22', color: lvl.hex }}>{lvl.label}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="px-3 py-2 border-t border-slate-700 text-[10px] text-slate-500">
                        Thành thạo: <strong style={{ color: col.hex }}>{cs.mastered}/{cs.total}</strong> kỹ năng
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Career milestones progress */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Lộ trình sự nghiệp
                </h3>
                <div className="space-y-2">
                  {milestones.map(m => {
                    const unlocked = avgScore >= m.minScore && (!m.requiredSkillIds || m.requiredSkillIds.every(id => (progressMap[id]?.score ?? 0) >= 75))
                    const isCurrent = currentMilestone?.id === m.id
                    return (
                      <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isCurrent ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-900/50'}`}>
                        <span className="text-base">{m.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${unlocked ? 'text-white' : 'text-slate-400'}`}>{m.label}</span>
                            {isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 font-bold">Đang ở</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-slate-700 rounded-full h-1">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(100, (avgScore / m.minScore) * 100)}%`, background: unlocked ? '#f59e0b' : '#4b5563' }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 w-16 text-right">{avgScore}/{m.minScore}%</span>
                          </div>
                        </div>
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${unlocked ? 'text-amber-400' : 'text-slate-700'}`} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Weak skills */}
              {(() => {
                const weak = allSkills.filter(s => (progressMap[s.id]?.score ?? 0) < 50)
                if (!weak.length) return (
                  <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4 text-center text-green-300 text-sm">
                    Tuyệt vời! Tất cả kỹ năng đều đạt 50% trở lên.
                  </div>
                )
                return (
                  <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-4">
                    <p className="font-semibold text-amber-300 mb-3 flex items-center gap-2 text-sm">
                      <Lightbulb className="w-4 h-4" />
                      Kỹ năng cần chú ý ({weak.length} kỹ năng dưới 50%)
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {weak.slice(0, 10).map(s => {
                        const score = progressMap[s.id]?.score ?? 0
                        const lvl = MASTERY_LEVELS.find(l => l.value === score)!
                        return (
                          <div key={s.id} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-amber-800/30">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: lvl.hex }} />
                            <span className="text-xs text-slate-300 flex-1 truncate">{s.label}</span>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: lvl.hex + '22', color: lvl.hex }}>{lvl.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    {weak.length > 10 && <p className="text-xs text-amber-600 mt-2">... và {weak.length - 10} kỹ năng khác</p>}
                  </div>
                )
              })()}

              {/* Export buttons */}
              <div className="flex gap-3">
                <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold">
                  <Download className="w-4 h-4" />Xuất Excel (3 sheets)
                </button>
                <button onClick={exportJson} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold">
                  <FileJson className="w-4 h-4" />Xuất JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BridgesView — Danh sách skill chia sẻ giữa các nghề đã chọn
// ─────────────────────────────────────────────────────────────
// Hiển thị các skill "cầu nối" — skill cùng label xuất hiện ở ≥2 nghề.
// Mỗi item show label + category badge + chips các nghề có chung.

const BRIDGE_CAT_LABELS: Record<string, { label: string; color: string }> = {
  technical: { label: 'Kỹ năng chuyên môn', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  soft:      { label: 'Kỹ năng mềm',         color: 'bg-blue-500/15   text-blue-300   border-blue-500/30'   },
  tools:     { label: 'Công cụ',             color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  subjects:  { label: 'Môn học',             color: 'bg-amber-500/15  text-amber-300  border-amber-500/30'  },
}

function BridgesView({
  careerIds, onPickCareer,
}: {
  careerIds: string[]
  onPickCareer: (cid: string) => void
}) {
  const bridges = useMemo(() => findCrossCareerBridges(careerIds), [careerIds])

  if (careerIds.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-400 max-w-md">
          <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Cần ≥ 2 nghề để hiển thị các skill cầu nối.</p>
        </div>
      </div>
    )
  }

  // Group theo category để gọn UI
  const grouped = useMemo(() => {
    const map = new Map<string, typeof bridges>()
    for (const b of bridges) {
      if (!map.has(b.category)) map.set(b.category, [])
      map.get(b.category)!.push(b)
    }
    return Array.from(map.entries())
  }, [bridges])

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-gradient-to-br from-amber-900/30 to-slate-900/50 border border-amber-700/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Link2 className="w-4 h-4 text-amber-300" />
            <h3 className="text-sm font-bold text-amber-200">
              Skill chung giữa {careerIds.length} nghề bạn đã chọn
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Đây là các skill xuất hiện ở nhiều nghề. Nâng cấp 1 skill bridge ở đây → tự động đẩy
            tiến độ trên tất cả các Cây tri thức nghề mà bạn đã chọn.
          </p>
        </div>

        {bridges.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center text-sm text-slate-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Các nghề bạn chọn không có skill nào trùng nhau (theo tên). Đây là combo nghề chuyên biệt!
          </div>
        ) : (
          grouped.map(([cat, items]) => {
            const catMeta = BRIDGE_CAT_LABELS[cat] || { label: cat, color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' }
            return (
              <div key={cat} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className={`px-4 py-2 border-b border-slate-700/50 text-xs font-bold ${catMeta.color}`}>
                  {catMeta.label}
                  <span className="ml-2 text-[10px] opacity-70 font-normal">{items.length} skill</span>
                </div>
                <div className="divide-y divide-slate-800">
                  {items.map((b, i) => (
                    <div key={`${cat}-${i}`} className="px-4 py-3">
                      <div className="text-sm font-semibold text-white mb-2">{b.label}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {b.careerIds.map((cid) => {
                          const meta = getCareerLabel(cid)
                          if (!meta) return null
                          return (
                            <button
                              key={cid}
                              onClick={() => onPickCareer(cid)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 hover:bg-purple-700 text-[11px] text-slate-200 border border-slate-700 hover:border-purple-500 transition"
                              title={`Mở Cây ${meta.name}`}
                            >
                              <span>{meta.icon}</span>
                              <span className="font-medium">{meta.name}</span>
                            </button>
                          )
                        })}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 text-[10px] text-amber-300 border border-amber-500/30 font-bold">
                          ×{b.careerIds.length}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}

        <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3 text-xs text-purple-200 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-purple-300 mt-0.5 shrink-0" />
          <span>
            <strong>Mẹo:</strong> nâng cấp 1 skill bridge → đẩy điểm trên nhiều KG cùng lúc.
            Click chip nghề để mở Cây tri thức tương ứng.
          </span>
        </div>
      </div>
    </div>
  )
}

// ── ShareLocationButton — GV chia sẻ vị trí trường để hiện trên bản đồ HS ──

interface ShareLocationProps {
  userId: string
  progressMap: ProgressMap
  syncToBackend: (map: ProgressMap) => void
}

function ShareLocationButton({ userId, progressMap, syncToBackend: _syncToBackend }: ShareLocationProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')

  const share = () => {
    if (!navigator.geolocation) { toast.error('Trình duyệt không hỗ trợ GPS'); return }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          // Reverse geocode to province using a simple approach
          let province = ''
          try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=vi`)
            const d = await r.json()
            province = d.address?.state || d.address?.province || d.address?.county || ''
          } catch {}
          await api.post('/teachers/cpd', { progress: progressMap, lat, lon, province })
          saveProgress(userId, progressMap)
          setStatus('done')
          toast.success(`Đã chia sẻ vị trí${province ? ' (' + province + ')' : ''} lên bản đồ GV`)
        } catch (e) {
          setStatus('idle')
          toast.error('Không lưu được vị trí')
        }
      },
      (err) => {
        setStatus(err.code === 1 ? 'denied' : 'idle')
        if (err.code === 1) toast.error('Quyền GPS bị từ chối')
      },
      { timeout: 10000, maximumAge: 300000 }
    )
  }

  if (status === 'done') return (
    <button disabled className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-800/50 text-blue-300 rounded-lg text-xs font-semibold opacity-70 cursor-default">
      <MapPin className="w-3 h-3" /><span className="hidden sm:inline">Đã chia sẻ</span>
    </button>
  )
  if (status === 'denied') return (
    <button disabled className="flex items-center gap-1 px-2.5 py-1.5 bg-red-900/30 text-red-400 rounded-lg text-xs font-semibold opacity-70 cursor-default">
      <MapPin className="w-3 h-3" /><span className="hidden sm:inline">GPS bị từ chối</span>
    </button>
  )

  return (
    <button
      onClick={share}
      disabled={status === 'loading'}
      title="Chia sẻ vị trí trường để HS có thể tìm GV gần địa phương"
      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-xs font-semibold"
    >
      {status === 'loading'
        ? <><Navigation className="w-3 h-3 animate-spin" /><span className="hidden sm:inline">...</span></>
        : <><MapPin className="w-3 h-3" /><span className="hidden sm:inline">Vị trí</span></>
      }
    </button>
  )
}


// ─────────────────────────────────────────────────────────────
// SkillSuggestionsPanel — Phương pháp + bài tập nâng cao
// ─────────────────────────────────────────────────────────────
// Đọc database SKILL_SUGGESTIONS (skillSuggestions.ts) → hiển thị
// dạng accordion 2 phần: "Phương pháp" + "Bài tập gợi ý".
// Mỗi method có icon theo type, có link nếu có url.
// Mỗi exercise có badge difficulty + time + steps + deliverable.

const METHOD_ICONS: Record<SuggestionMethod['type'], React.ComponentType<{ className?: string }>> = {
  course:    PlayCircle,
  book:      BookOpen,
  practice:  Wrench,
  community: MessageCircle,
  project:   Target,
  tool:      Cpu,
  video:     PlayCircle,
}

const METHOD_LABELS: Record<SuggestionMethod['type'], string> = {
  course:    'Khóa học',
  book:      'Sách',
  practice:  'Thực hành',
  community: 'Cộng đồng',
  project:   'Dự án',
  tool:      'Công cụ',
  video:     'Video',
}

const DIFFICULTY_BADGE: Record<'easy' | 'medium' | 'hard', { label: string; color: string }> = {
  easy:   { label: 'Dễ',         color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' },
  medium: { label: 'Trung bình', color: 'bg-amber-900/40   text-amber-300   border-amber-700/40' },
  hard:   { label: 'Khó',        color: 'bg-rose-900/40    text-rose-300    border-rose-700/40' },
}

function SkillSuggestionsPanel({ skillId }: { skillId: string }) {
  const sug = getSuggestion(skillId)
  const [methodsOpen,   setMethodsOpen]   = useState(true)
  const [exercisesOpen, setExercisesOpen] = useState(true)

  if (!sug) {
    return (
      <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-3 text-[11px] text-slate-500 italic flex items-start gap-2">
        <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-600" />
        Chưa có gợi ý cho kỹ năng này. Liên hệ admin để bổ sung.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* ── Phương pháp nâng cao ── */}
      <div className="rounded-lg bg-gradient-to-br from-purple-950/40 to-slate-900/40 border border-purple-700/30 overflow-hidden">
        <button
          onClick={() => setMethodsOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-900/20 transition-colors"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-purple-300">
            <Lightbulb className="w-3.5 h-3.5" />
            Phương pháp nâng cao
            <span className="text-[9px] text-purple-400/60 normal-case font-normal">({sug.methods.length})</span>
          </span>
          {methodsOpen ? <ChevronUp className="w-3.5 h-3.5 text-purple-400" /> : <ChevronDown className="w-3.5 h-3.5 text-purple-400" />}
        </button>
        {methodsOpen && (
          <div className="px-3 pb-3 space-y-2">
            {sug.methods.map((m, i) => {
              const Icon = METHOD_ICONS[m.type] || Lightbulb
              return (
                <div key={i} className="bg-slate-900/60 border border-slate-700/40 rounded-md p-2.5">
                  <div className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-purple-400/80">
                          {METHOD_LABELS[m.type]}
                        </span>
                        {m.duration && (
                          <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{m.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-100 leading-snug mb-0.5">
                        {m.title}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {m.description}
                      </p>
                      {m.url && (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-purple-300 hover:text-purple-200 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Mở liên kết
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bài tập gợi ý ── */}
      <div className="rounded-lg bg-gradient-to-br from-emerald-950/40 to-slate-900/40 border border-emerald-700/30 overflow-hidden">
        <button
          onClick={() => setExercisesOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-emerald-900/20 transition-colors"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
            <Target className="w-3.5 h-3.5" />
            Bài tập thực hành
            <span className="text-[9px] text-emerald-400/60 normal-case font-normal">({sug.exercises.length})</span>
          </span>
          {exercisesOpen ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
        {exercisesOpen && (
          <div className="px-3 pb-3 space-y-2.5">
            {sug.exercises.map((ex, i) => {
              const diff = DIFFICULTY_BADGE[ex.difficulty]
              return (
                <div key={i} className="bg-slate-900/60 border border-slate-700/40 rounded-md p-2.5">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-100 leading-snug">
                        {ex.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${diff.color} font-semibold uppercase tracking-wider`}>
                          {diff.label}
                        </span>
                        <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />{ex.estimatedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pl-7">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Các bước:</p>
                    <ol className="space-y-1">
                      {ex.steps.map((s, j) => (
                        <li key={j} className="text-[11px] text-slate-300 leading-relaxed flex gap-1.5">
                          <span className="text-emerald-500/80 font-mono flex-shrink-0">{j + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="pl-7 mt-2 pt-2 border-t border-slate-700/40">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        <span className="text-emerald-400 font-semibold">Sản phẩm: </span>
                        {ex.deliverable}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
