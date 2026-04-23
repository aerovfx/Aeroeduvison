/**
 * LearningPathsRecommended — /learning-paths/recommended
 *
 * Trang lộ trình học được đề xuất: curated paths theo môn học,
 * mục tiêu và trình độ. Lọc bằng tab + tag. Thêm path vào lộ
 * trình cá nhân qua nút "Bắt đầu".
 */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, Sparkles, Clock, Star, Zap, BookOpen,
  Play, Lock, Filter, ChevronRight, Trophy, Flame, Target,
  ArrowRight, CheckCircle, Users, BarChart3, Atom, FlaskConical,
  Calculator, Code2, Globe, Brain,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────
interface PathLesson {
  title: string
  duration: number  // minutes
}

interface LearningPath {
  id: string
  title: string
  subtitle: string
  description: string
  subject: 'physics' | 'mathematics' | 'chemistry' | 'biology' | 'programming' | 'general'
  goal: 'exam' | 'university' | 'deep' | 'lab' | 'competition'
  level: 'beginner' | 'intermediate' | 'advanced'
  totalWeeks: number
  lessonsPerWeek: number
  totalXP: number
  enrolledCount: number
  rating: number
  icon: string
  gradient: string
  border: string
  accent: string
  badge?: string
  badgeColor?: string
  featured?: boolean
  lessons: PathLesson[]
  skills: string[]
  objectives: string[]
}

const PATHS: LearningPath[] = [
  // ── Featured ────────────────────────────────────────────────────
  {
    id: 'physics-thpt',
    title: 'Vật lý THPT Toàn diện',
    subtitle: 'Ôn thi tốt nghiệp & đại học',
    description: 'Bao phủ toàn bộ chương trình Vật lý 10-12. Từ cơ học đến điện từ, sóng và lượng tử. Mỗi chủ đề có lý thuyết, bài tập và mô phỏng tương tác.',
    subject: 'physics', goal: 'exam', level: 'intermediate',
    totalWeeks: 12, lessonsPerWeek: 5, totalXP: 6000, enrolledCount: 2840, rating: 4.9,
    icon: '⚛️', gradient: 'from-cyan-500/15 to-blue-600/10',
    border: 'border-cyan-500/25', accent: 'text-cyan-400',
    badge: 'Phổ biến nhất', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    featured: true,
    skills: ['Cơ học Newton', 'Điện từ trường', 'Sóng cơ & âm', 'Quang học', 'Vật lý hạt nhân'],
    objectives: ['Nắm vững lý thuyết toàn bộ chương trình THPT', 'Giải thành thạo các dạng bài thi', 'Đạt 8+ điểm thi THPTQG'],
    lessons: [
      { title: 'Động học chất điểm', duration: 45 },
      { title: 'Định luật Newton', duration: 50 },
      { title: 'Chuyển động tròn đều', duration: 40 },
      { title: 'Công và năng lượng', duration: 45 },
      { title: 'Bảo toàn năng lượng', duration: 50 },
    ],
  },
  {
    id: 'math-calculus',
    title: 'Giải tích & Đại số tuyến tính',
    subtitle: 'Nền tảng toán học đại học',
    description: 'Lộ trình từ giới hạn, đạo hàm, tích phân đến ma trận và không gian vectơ. Phù hợp sinh viên kỹ thuật năm 1-2.',
    subject: 'mathematics', goal: 'university', level: 'intermediate',
    totalWeeks: 10, lessonsPerWeek: 4, totalXP: 4800, enrolledCount: 1920, rating: 4.8,
    icon: '🧮', gradient: 'from-violet-500/15 to-purple-600/10',
    border: 'border-violet-500/25', accent: 'text-violet-400',
    badge: 'Đề xuất', badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    featured: true,
    skills: ['Giới hạn & liên tục', 'Đạo hàm', 'Tích phân', 'Chuỗi số', 'Ma trận & định thức'],
    objectives: ['Tính thành thạo đạo hàm và tích phân', 'Hiểu cơ sở đại số tuyến tính', 'Ứng dụng vào bài toán kỹ thuật'],
    lessons: [
      { title: 'Giới hạn hàm số', duration: 45 },
      { title: 'Đạo hàm và quy tắc tính', duration: 50 },
      { title: 'Ứng dụng đạo hàm', duration: 45 },
      { title: 'Tích phân xác định', duration: 55 },
      { title: 'Ma trận và phép toán', duration: 50 },
    ],
  },
  // ── Physics paths ───────────────────────────────────────────────
  {
    id: 'physics-mechanics',
    title: 'Cơ học cổ điển',
    subtitle: 'Newton đến Lagrange',
    description: 'Cơ học từ định luật Newton, năng lượng, va chạm đến cơ học Lagrange và Hamilton dành cho người muốn đào sâu.',
    subject: 'physics', goal: 'deep', level: 'advanced',
    totalWeeks: 8, lessonsPerWeek: 4, totalXP: 3800, enrolledCount: 980, rating: 4.7,
    icon: '⚙️', gradient: 'from-blue-500/10 to-sky-600/10',
    border: 'border-blue-500/20', accent: 'text-blue-400',
    badge: 'Chuyên sâu', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    skills: ['Động lực học', 'Bảo toàn động lượng', 'Dao động & sóng', 'Cơ học Lagrange'],
    objectives: ['Phân tích hệ cơ học phức tạp', 'Dùng phương pháp năng lượng', 'Nền tảng cho cơ lượng tử'],
    lessons: [
      { title: 'Hệ quy chiếu và chuyển động', duration: 50 },
      { title: 'Định luật bảo toàn', duration: 55 },
      { title: 'Dao động điều hòa', duration: 45 },
      { title: 'Sóng cơ học', duration: 50 },
      { title: 'Giới thiệu cơ học Lagrange', duration: 60 },
    ],
  },
  {
    id: 'physics-electromagnetism',
    title: 'Điện từ học',
    subtitle: 'Từ điện tĩnh đến Maxwell',
    description: 'Điện trường, từ trường, cảm ứng điện từ và phương trình Maxwell. Kết hợp lý thuyết với mô phỏng trực quan.',
    subject: 'physics', goal: 'deep', level: 'advanced',
    totalWeeks: 8, lessonsPerWeek: 4, totalXP: 3600, enrolledCount: 756, rating: 4.6,
    icon: '🔌', gradient: 'from-amber-500/10 to-yellow-600/10',
    border: 'border-amber-500/20', accent: 'text-amber-400',
    skills: ['Điện trường & thế', 'Dòng điện & mạch', 'Từ trường', 'Cảm ứng & Maxwell'],
    objectives: ['Tính toán trường EM', 'Phân tích mạch điện', 'Hiểu lan truyền sóng EM'],
    lessons: [
      { title: 'Định luật Coulomb và điện trường', duration: 45 },
      { title: 'Điện thế và tụ điện', duration: 50 },
      { title: 'Mạch điện một chiều', duration: 45 },
      { title: 'Từ trường và lực Lorentz', duration: 50 },
      { title: 'Cảm ứng Faraday', duration: 55 },
    ],
  },
  {
    id: 'physics-lab',
    title: 'Thực hành Vật lý số',
    subtitle: 'Mô phỏng & phân tích dữ liệu',
    description: 'Học vật lý qua 15 thí nghiệm mô phỏng: con lắc, quang học, điện từ. Phân tích số liệu bằng Python cơ bản.',
    subject: 'physics', goal: 'lab', level: 'beginner',
    totalWeeks: 6, lessonsPerWeek: 3, totalXP: 2400, enrolledCount: 1340, rating: 4.8,
    icon: '🔬', gradient: 'from-emerald-500/10 to-teal-600/10',
    border: 'border-emerald-500/20', accent: 'text-emerald-400',
    badge: 'Mới', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    skills: ['Con lắc & dao động', 'Quang học ray', 'Giao thoa sóng', 'Phân tích số liệu'],
    objectives: ['Thực hành 15 thí nghiệm ảo', 'Xử lý số liệu thực nghiệm', 'Viết báo cáo thí nghiệm'],
    lessons: [
      { title: 'Con lắc đơn — đo g', duration: 40 },
      { title: 'Định luật Hooke — lò xo', duration: 40 },
      { title: 'Quang học — khúc xạ ánh sáng', duration: 45 },
      { title: 'Giao thoa Young', duration: 50 },
      { title: 'Phân tích số liệu với Python', duration: 55 },
    ],
  },
  // ── Math paths ──────────────────────────────────────────────────
  {
    id: 'math-thpt',
    title: 'Toán THPT — Ôn thi',
    subtitle: 'Luyện đề thi THPTQG',
    description: 'Ôn tập toàn bộ Toán 12 theo dạng đề thi: giải tích, hình học không gian, xác suất, lượng giác.',
    subject: 'mathematics', goal: 'exam', level: 'intermediate',
    totalWeeks: 10, lessonsPerWeek: 5, totalXP: 5000, enrolledCount: 3210, rating: 4.9,
    icon: '📐', gradient: 'from-pink-500/10 to-rose-600/10',
    border: 'border-pink-500/20', accent: 'text-pink-400',
    badge: 'Hot 🔥', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    skills: ['Hàm số & đồ thị', 'Tích phân ứng dụng', 'Hình học KG', 'Xác suất & TK', 'Lượng giác'],
    objectives: ['Phân loại và giải các dạng đề', 'Rèn kỹ năng làm bài trong giờ', 'Mục tiêu 9+ điểm'],
    lessons: [
      { title: 'Hàm số bậc ba và cực trị', duration: 45 },
      { title: 'Ứng dụng tích phân', duration: 50 },
      { title: 'Khối đa diện và thể tích', duration: 45 },
      { title: 'Xác suất có điều kiện', duration: 40 },
      { title: 'Phương trình lượng giác', duration: 45 },
    ],
  },
  {
    id: 'math-olympiad',
    title: 'Toán Olympic & HSG',
    subtitle: 'Tư duy và kỹ thuật thi',
    description: 'Lộ trình chuyên sâu cho học sinh giỏi: bất đẳng thức, tổ hợp, lý thuyết số và hình học cao cấp.',
    subject: 'mathematics', goal: 'competition', level: 'advanced',
    totalWeeks: 16, lessonsPerWeek: 4, totalXP: 7200, enrolledCount: 420, rating: 4.8,
    icon: '🏆', gradient: 'from-yellow-500/10 to-amber-600/10',
    border: 'border-yellow-500/20', accent: 'text-yellow-400',
    skills: ['Bất đẳng thức', 'Tổ hợp nâng cao', 'Lý thuyết số', 'Hình học Olympic'],
    objectives: ['Thành thạo các kỹ thuật chứng minh', 'Luyện đề HSG tỉnh / quốc gia', 'Tư duy giải quyết vấn đề sáng tạo'],
    lessons: [
      { title: 'AM-GM và biến thể', duration: 60 },
      { title: 'Nguyên lý Dirichlet', duration: 55 },
      { title: 'Đồng dư và số nguyên tố', duration: 60 },
      { title: 'Hình học biến đổi', duration: 65 },
      { title: 'Đề thi thử HSG tỉnh', duration: 90 },
    ],
  },
  // ── Chemistry & Bio ─────────────────────────────────────────────
  {
    id: 'chemistry-thpt',
    title: 'Hóa học THPT Toàn diện',
    subtitle: 'Lý thuyết + bài tập định lượng',
    description: 'Từ hóa đại cương, hóa vô cơ đến hữu cơ. Phương pháp bảo toàn khối lượng, electron và giải nhanh trắc nghiệm.',
    subject: 'chemistry', goal: 'exam', level: 'intermediate',
    totalWeeks: 10, lessonsPerWeek: 5, totalXP: 5200, enrolledCount: 1870, rating: 4.7,
    icon: '🧪', gradient: 'from-teal-500/10 to-cyan-600/10',
    border: 'border-teal-500/20', accent: 'text-teal-400',
    skills: ['Cấu tạo nguyên tử', 'Phản ứng oxy hóa khử', 'Hóa hữu cơ', 'Bảo toàn electron'],
    objectives: ['Nắm vững lý thuyết hóa học 10-12', 'Giải nhanh 50 câu trong 50 phút', 'Đạt 8+ thi THPTQG'],
    lessons: [
      { title: 'Cấu hình electron & bảng tuần hoàn', duration: 45 },
      { title: 'Liên kết hóa học', duration: 50 },
      { title: 'Phản ứng oxy hóa khử', duration: 55 },
      { title: 'Hiđrocacbon no và không no', duration: 45 },
      { title: 'Amino axit và peptit', duration: 50 },
    ],
  },
  // ── Programming ─────────────────────────────────────────────────
  {
    id: 'python-science',
    title: 'Python cho Khoa học',
    subtitle: 'NumPy, Matplotlib, Sympy',
    description: 'Học Python từ đầu với hướng ứng dụng khoa học: tính toán số, vẽ đồ thị, giải phương trình đại số và vi phân.',
    subject: 'programming', goal: 'lab', level: 'beginner',
    totalWeeks: 8, lessonsPerWeek: 4, totalXP: 3200, enrolledCount: 2100, rating: 4.8,
    icon: '🐍', gradient: 'from-green-500/10 to-emerald-600/10',
    border: 'border-green-500/20', accent: 'text-green-400',
    badge: 'Thực hành', badgeColor: 'bg-green-500/20 text-green-300 border-green-500/30',
    skills: ['Cú pháp Python', 'NumPy & SciPy', 'Matplotlib', 'SymPy', 'Pandas cơ bản'],
    objectives: ['Viết script tính toán khoa học', 'Vẽ đồ thị chuyên nghiệp', 'Giải PT bằng lập trình'],
    lessons: [
      { title: 'Python cơ bản — biến và hàm', duration: 40 },
      { title: 'NumPy — mảng và phép toán', duration: 50 },
      { title: 'Matplotlib — vẽ đồ thị', duration: 45 },
      { title: 'SymPy — đại số máy tính', duration: 55 },
      { title: 'Dự án: Mô phỏng con lắc đơn', duration: 60 },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const SUBJECT_TABS = [
  { key: 'all',         label: 'Tất cả',    icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'physics',     label: 'Vật lý',    icon: <Atom className="w-3.5 h-3.5" /> },
  { key: 'mathematics', label: 'Toán học',  icon: <Calculator className="w-3.5 h-3.5" /> },
  { key: 'chemistry',   label: 'Hóa học',   icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { key: 'programming', label: 'Lập trình', icon: <Code2 className="w-3.5 h-3.5" /> },
]

const GOAL_FILTERS = [
  { key: 'all',         label: 'Tất cả mục tiêu' },
  { key: 'exam',        label: 'Ôn thi THPTQG' },
  { key: 'university',  label: 'Đại học' },
  { key: 'deep',        label: 'Chuyên sâu' },
  { key: 'lab',         label: 'Thực hành' },
  { key: 'competition', label: 'Thi HSG / Olympic' },
]

const LEVEL_STYLE: Record<string, string> = {
  beginner:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  intermediate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  advanced:     'text-rose-400 bg-rose-500/10 border-rose-500/25',
}
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Cơ bản', intermediate: 'Trung bình', advanced: 'Nâng cao',
}

const SUBJECT_ICON_MAP: Record<string, React.ReactNode> = {
  physics:     <Atom className="w-4 h-4" />,
  mathematics: <Calculator className="w-4 h-4" />,
  chemistry:   <FlaskConical className="w-4 h-4" />,
  biology:     <Globe className="w-4 h-4" />,
  programming: <Code2 className="w-4 h-4" />,
  general:     <Brain className="w-4 h-4" />,
}

// ─────────────────────────────────────────────────────────────────
// PathCard
// ─────────────────────────────────────────────────────────────────
function PathCard({ path, featured = false }: { path: LearningPath; featured?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const totalDuration = path.lessons.reduce((s, l) => s + l.duration, 0)
  const totalLessons = path.totalWeeks * path.lessonsPerWeek

  return (
    <div
      className={`relative rounded-2xl border bg-gradient-to-br ${path.gradient} ${path.border} overflow-hidden transition-all duration-200 hover:border-opacity-70 ${featured ? 'ring-1 ring-white/5' : ''}`}
    >
      {/* Badge */}
      {path.badge && (
        <div className={`absolute top-3 right-3 text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${path.badgeColor}`}>
          {path.badge}
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="text-3xl leading-none mt-0.5">{path.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white/90 text-sm leading-snug mb-0.5 pr-16">{path.title}</h3>
            <p className={`text-xs font-medium ${path.accent}`}>{path.subtitle}</p>
          </div>
        </div>

        <p className="text-white/55 text-xs leading-relaxed mb-4">{path.description}</p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[0.7rem] text-white/40 mb-4 flex-wrap">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${LEVEL_STYLE[path.level]}`}>
            {LEVEL_LABEL[path.level]}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />{totalLessons} bài
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{path.totalWeeks} tuần
          </span>
          <span className="flex items-center gap-1 text-yellow-400/70">
            <Zap className="w-3 h-3" />+{path.totalXP.toLocaleString()} XP
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{path.rating}
          </span>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {path.skills.map(s => (
            <span key={s} className="text-[0.65rem] px-2 py-0.5 rounded-md bg-white/[0.06] text-white/50 border border-white/[0.07]">
              {s}
            </span>
          ))}
        </div>

        {/* Expand lessons */}
        {expanded && (
          <div className="mb-4 space-y-1.5">
            <p className="text-[0.65rem] font-semibold text-white/30 uppercase tracking-wider mb-2">
              5 bài đầu tiên
            </p>
            {path.lessons.map((lesson, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[0.6rem] font-bold ${i === 0 ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/30'}`}>
                  {i === 0 ? <Play className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                </div>
                <span className="text-xs text-white/65 flex-1 truncate">{lesson.title}</span>
                <span className="text-[0.65rem] text-white/30 shrink-0">{lesson.duration}p</span>
              </div>
            ))}
            <p className="text-[0.65rem] text-white/25 text-center pt-1">
              + {totalLessons - 5} bài nữa · {Math.round(totalDuration / 60)}h {totalDuration % 60}p tổng cộng
            </p>
          </div>
        )}

        {/* Objectives */}
        {expanded && (
          <div className="mb-4">
            <p className="text-[0.65rem] font-semibold text-white/30 uppercase tracking-wider mb-2">Mục tiêu học tập</p>
            <ul className="space-y-1.5">
              {path.objectives.map(o => (
                <li key={o} className="flex items-start gap-2 text-xs text-white/60">
                  <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />{o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Enrolled + CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            {expanded ? 'Thu gọn' : 'Xem chi tiết'}
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          <span className="text-[0.65rem] text-white/25 flex items-center gap-1 ml-auto">
            <Users className="w-3 h-3" />{path.enrolledCount.toLocaleString()} đã học
          </span>
          <Link
            to="/learning-paths"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${path.accent.replace('text-', 'bg-').replace('400', '500/20')} hover:brightness-125 border ${path.border}`}
          >
            <Play className="w-3 h-3" /> Bắt đầu
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
export default function LearningPathsRecommended() {
  const [activeSubject, setActiveSubject] = useState<string>('all')
  const [activeGoal, setActiveGoal]       = useState<string>('all')
  const [activeLevel, setActiveLevel]     = useState<string>('all')

  const filtered = useMemo(() => PATHS.filter(p => {
    if (activeSubject !== 'all' && p.subject !== activeSubject) return false
    if (activeGoal    !== 'all' && p.goal    !== activeGoal)    return false
    if (activeLevel   !== 'all' && p.level   !== activeLevel)   return false
    return true
  }), [activeSubject, activeGoal, activeLevel])

  const featured = useMemo(() => PATHS.filter(p => p.featured), [])

  const totalXP    = useMemo(() => PATHS.reduce((s, p) => s + p.totalXP, 0), [])
  const totalPaths = PATHS.length

  return (
    <div className="min-h-screen bg-[hsl(225,15%,8%)] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Breadcrumb ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-white/30 mb-6">
          <Link to="/learning-paths" className="hover:text-white/60 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Lộ trình học
          </Link>
          <span>/</span>
          <span className="text-white/60">Được đề xuất</span>
        </div>

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/25">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold">Lộ trình được đề xuất</h1>
          </div>
          <p className="text-white/50 text-sm leading-relaxed max-w-xl">
            Các lộ trình học được thiết kế bởi đội ngũ giáo viên chuyên môn, tối ưu cho từng mục tiêu học tập. Chọn lộ trình phù hợp và bắt đầu ngay hôm nay.
          </p>
          <div className="flex items-center gap-6 mt-4 text-xs text-white/35">
            <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{totalPaths} lộ trình</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-400" />{totalXP.toLocaleString()} XP tổng</span>
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{PATHS.reduce((s, p) => s + p.enrolledCount, 0).toLocaleString()} học viên</span>
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />4.8 / 5.0 trung bình</span>
          </div>
        </div>

        {/* ── Featured ─────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold text-white/80 uppercase tracking-wide">Nổi bật</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featured.map(p => <PathCard key={p.id} path={p} featured />)}
          </div>
        </div>

        {/* ── Filters ──────────────────────────────────────────── */}
        <div className="mb-6 space-y-3">
          {/* Subject tabs */}
          <div className="flex gap-2 flex-wrap">
            {SUBJECT_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSubject(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeSubject === tab.key
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.07]'
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* Goal + Level row */}
          <div className="flex gap-3 items-center flex-wrap">
            <Filter className="w-3.5 h-3.5 text-white/25" />
            <select
              value={activeGoal}
              onChange={e => setActiveGoal(e.target.value)}
              className="text-xs bg-[hsl(225,15%,12%)] border border-white/[0.08] text-white/60 rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500/40 transition-colors"
            >
              {GOAL_FILTERS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <select
              value={activeLevel}
              onChange={e => setActiveLevel(e.target.value)}
              className="text-xs bg-[hsl(225,15%,12%)] border border-white/[0.08] text-white/60 rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500/40 transition-colors"
            >
              <option value="all">Mọi trình độ</option>
              <option value="beginner">Cơ bản</option>
              <option value="intermediate">Trung bình</option>
              <option value="advanced">Nâng cao</option>
            </select>
            {(activeSubject !== 'all' || activeGoal !== 'all' || activeLevel !== 'all') && (
              <button
                onClick={() => { setActiveSubject('all'); setActiveGoal('all'); setActiveLevel('all') }}
                className="text-xs text-white/35 hover:text-white/60 transition-colors"
              >
                Xóa bộ lọc ×
              </button>
            )}
            <span className="text-xs text-white/25 ml-auto">{filtered.length} kết quả</span>
          </div>
        </div>

        {/* ── All paths grid ───────────────────────────────────── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => <PathCard key={p.id} path={p} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-white/40 text-sm mb-2">Không có lộ trình phù hợp với bộ lọc hiện tại</p>
            <button
              onClick={() => { setActiveSubject('all'); setActiveGoal('all'); setActiveLevel('all') }}
              className="mt-4 text-xs text-violet-400 hover:text-violet-300 underline transition-colors"
            >
              Xem tất cả lộ trình
            </button>
          </div>
        )}

        {/* ── Progress CTA ─────────────────────────────────────── */}
        <div className="mt-12 p-6 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-blue-600/5 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-white/90">Lộ trình cá nhân hoá</h3>
          </div>
          <p className="text-white/50 text-sm mb-5 max-w-md mx-auto">
            Để AI tạo lộ trình riêng cho bạn dựa trên mục tiêu, trình độ và thời gian học mỗi ngày.
          </p>
          <Link
            to="/learning-paths"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
          >
            <Target className="w-4 h-4" /> Tạo lộ trình của tôi <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}
