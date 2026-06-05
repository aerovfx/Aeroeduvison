/**
 * Sidebar — bilingual (VI / EN) via useLanguage()
 * Port từ app/(dashboard)/_components/sidebar.tsx
 */
import { memo, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart, Layout, BookOpen, FileEdit, FileText,
  GraduationCap, StickyNote, Kanban, Zap, Award, MessageSquare,
  Map, FlaskConical, Sparkles, Brain, Heart, Users, Target,
  Calendar, Shield, AlertTriangle, Activity, Settings, Upload,
  Grid3x3, HelpCircle, CheckSquare, BookOpenCheck, Compass,
  Camera, MonitorPlay, Thermometer, Cpu, Mic, ChevronLeft, ChevronRight, Tag,
  CircuitBoard, FunctionSquare, Wand2, ShoppingBag, Bookmark, Newspaper,
  ClipboardList, Network, Gamepad2, CreditCard, Radio, Sparkles as SparklesIcon, KeyRound,
  Bot, MessageCircle, ClipboardEdit, Atom, Languages, Plug, ArrowLeftRight, Presentation,
  type LucideIcon
} from 'lucide-react'
import { useEffect } from 'react'
import { api } from '@/services/api'
import { useCurrentRole } from '@/hooks/useCurrentUser'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

type Route = {
  icon: LucideIcon
  labelKey: string   // key into t()
  href: string
  isHighlighted?: boolean
  badge?: string
  /** Key trong adminNotifications object — render badge số đỏ nếu > 0 */
  notifKey?: 'pendingPaymentCount'
}

type RouteSection = {
  titleKey: string   // key into t()
  routes: Route[]
}

// ── Static route definitions (label keys, not hardcoded strings) ────────────

const studentSections: RouteSection[] = [
  {
    titleKey: 'sectionOverview',
    routes: [
      { icon: Layout,      labelKey: 'routeDashboard',    href: '/dashboard' },
      { icon: BarChart,    labelKey: 'routeAnalytics',    href: '/dashboard/analytics' },
      { icon: Award,       labelKey: 'routeAchievements', href: '/dashboard/achievements' },
    ],
  },
  {
    titleKey: 'sectionLearning',
    routes: [
      { icon: SparklesIcon, labelKey: 'routeForYou',       href: '/student/for-you',      badge: 'AI', isHighlighted: true },
      { icon: Calendar,     labelKey: 'routeDaily',        href: '/student/daily',        badge: 'AI' },
      { icon: Brain,        labelKey: 'routeAiTutor',      href: '/ai-tutor',             isHighlighted: true },
      { icon: Languages,    labelKey: 'routeEnglish',      href: '/student/english',      badge: 'Mới' },
      { icon: FunctionSquare, labelKey: 'routeMath',       href: '/student/math',         badge: 'Mới' },
      { icon: Cpu,          labelKey: 'routeAiSkill',      href: '/student/ai',           badge: 'Mới' },
      { icon: BookOpen,     labelKey: 'routeMyCourses',    href: '/student/my-courses',   badge: 'LMS' },
      { icon: BookOpenCheck, labelKey: 'routeStorybooks',  href: '/kids/storybooks',      badge: 'Kids' },
      { icon: GraduationCap,labelKey: 'routeMyTeachers',   href: '/student/teachers' },
      { icon: Map,          labelKey: 'routeLearningPath',  href: '/learning-paths' },
      { icon: FileText,     labelKey: 'routeExamPrep',      href: '/student/exam-prep' },
      { icon: Radio,        labelKey: 'routeExamRooms',     href: '/student/exams',        badge: 'Live' },
      { icon: GraduationCap,labelKey: 'routeCareer',        href: '/student/career' },
      { icon: Gamepad2,     labelKey: 'routePixelGames',    href: '/student/games',        badge: 'Game' },
    ],
  },
  {
    titleKey: 'sectionTracking',
    routes: [
      { icon: Activity, labelKey: 'routeProgress',    href: '/student/progress' },
      { icon: Heart,    labelKey: 'routeEmotion',     href: '/dashboard/emotion' },
      { icon: FileEdit, labelKey: 'routeAssignments', href: '/dashboard/assignments' },
      { icon: Calendar, labelKey: 'routeSchedule',    href: '/student/schedule' },
    ],
  },
  {
    titleKey: 'sectionStore',
    routes: [
      { icon: Bookmark,    labelKey: 'routeWishlist',  href: '/student/wishlist' },
      { icon: ShoppingBag, labelKey: 'routePurchase',  href: '/student/purchase-history' },
    ],
  },
  {
    titleKey: 'sectionLabsTools',
    routes: [
      { icon: FunctionSquare, labelKey: 'routeGraph',   href: '/dashboard/graph-lab', badge: 'Mới' },
      { icon: FlaskConical,   labelKey: 'routeLabTwin', href: '/dashboard/labtwin',   badge: 'Lab' },
      { icon: Atom,           labelKey: 'routePeriodicTable', href: '/dashboard/periodic-table', badge: 'Hoá' },
      { icon: Gamepad2,       labelKey: 'routeGames',   href: '/dashboard/games',     badge: 'Game' },
      { icon: Sparkles,       labelKey: 'routeAura',    href: '/dashboard/aura',      badge: '3D' },
      { icon: CircuitBoard,   labelKey: 'routeCircuit', href: '/dashboard/iot-lab',   badge: 'IoT' },
      // /dashboard/stem REMOVED 2026-05-27 — HS dùng /student/stem-projects
      // (unified joined + owned tabs)
      { icon: Zap,            labelKey: 'routeStemProjects',   href: '/student/stem-projects', badge: 'STEM' },
      { icon: StickyNote,     labelKey: 'routeNotes',   href: '/dashboard/notes' },
      { icon: Kanban,         labelKey: 'routeScrum',   href: '/dashboard/scrumboard' },
      { icon: Network,        labelKey: 'routeKnowledgeGraph', href: '/dashboard/knowledge-graph', badge: 'AI' },
      { icon: Camera,         labelKey: 'routePostureMonitor', href: '/dashboard/posture-monitor', badge: 'AI' },
    ],
  },
  {
    titleKey: 'sectionSettings',
    routes: [
      { icon: Settings, labelKey: 'settings',      href: '/dashboard/settings' },
      { icon: Users,    labelKey: 'routeContacts', href: '/dashboard/contacts' },
    ],
  },
  {
    titleKey: 'sectionHelp',
    routes: [
      { icon: BookOpen,  labelKey: 'routeDocs', href: '/docs' },
      { icon: Newspaper, labelKey: 'routeNews', href: '/news' },
    ],
  },
]

const teacherSections: RouteSection[] = [
  {
    titleKey: 'sectionOverview',
    routes: [
      { icon: Brain,   labelKey: 'routeAiDashboard', href: '/teacher/ai-dashboard', isHighlighted: true },
      { icon: Zap,     labelKey: 'routeSprint',      href: '/teacher/sprint',       badge: 'AI' },
      { icon: Users,   labelKey: 'routeClassMgmt',   href: '/teacher/dashboard' },
      { icon: BarChart,labelKey: 'routeAnalytics',   href: '/teacher/analytics' },
      { icon: Heart,   labelKey: 'routeEmotionMap',  href: '/teacher/emotion-map' },
      { icon: Network, labelKey: 'routeProfKG',      href: '/teacher/knowledge-graph', badge: 'CPD' },
      { icon: Camera,  labelKey: 'routePostureMonitor', href: '/teacher/posture-monitor', badge: 'AI' },
      { icon: Languages, labelKey: 'routeEnglish',      href: '/student/english',        badge: 'Mới' },
      { icon: FunctionSquare, labelKey: 'routeMath',    href: '/student/math',           badge: 'Mới' },
      { icon: Cpu,       labelKey: 'routeAiSkill',      href: '/student/ai',             badge: 'Mới' },
    ],
  },
  {
    titleKey: 'sectionExam',
    routes: [
      { icon: Wand2,     labelKey: 'routeTaodethi',       href: '/teacher/taodethi',         isHighlighted: true },
      // /teacher/exam-generator REMOVED 2026-05-27 — GV dùng /teacher/taodethi (AI Composer)
      { icon: Grid3x3,   labelKey: 'routeExamMatrix',     href: '/teacher/exam-matrix' },
      { icon: HelpCircle,labelKey: 'routeQuestionBank',   href: '/teacher/question-bank' },
      { icon: FileText,  labelKey: 'routeExams',          href: '/teacher/exams',            badge: 'AI' },
      { icon: Target,    labelKey: 'routeOnlineExam',     href: '/teacher/online-exam-room' },
    ],
  },
  {
    titleKey: 'sectionGrading',
    routes: [
      { icon: CheckSquare, labelKey: 'routeExamGrading', href: '/teacher/exam-grading', badge: 'AI' },
      { icon: Award,       labelKey: 'routeExamReports', href: '/teacher/exam-reports' },
    ],
  },
  {
    titleKey: 'sectionContent',
    routes: [
      { icon: Sparkles, labelKey: 'routeAiContent',  href: '/teacher/create-module',             badge: 'AI' },
      { icon: Upload,   labelKey: 'routeDigitize',   href: '/teacher/document-digitization',     badge: 'AI' },
      { icon: FileEdit, labelKey: 'routeLatex',      href: '/teacher/latex-documents' },
      { icon: ArrowLeftRight, labelKey: 'routeLatexConverter', href: '/teacher/latex-converter', badge: 'AI' },
      { icon: FileText, labelKey: 'routeOfficeDoc', href: '/teacher/office/list/doc', badge: 'Mới' },
      { icon: Presentation, labelKey: 'routeOfficeSlides', href: '/teacher/office/list/slides' },
      { icon: Grid3x3, labelKey: 'routeOfficeSheet', href: '/teacher/office/list/sheet' },
      { icon: FileText, labelKey: 'routeLessonPlans', href: '/teacher/lesson-plans',             badge: 'New' },
      { icon: Mic,      labelKey: 'routeTranscript', href: '/teacher/transcript',                badge: 'AI' },
      { icon: Map,      labelKey: 'routePathBuilder',href: '/teacher/learning-path-builder' },
      { icon: BookOpenCheck, labelKey: 'routeStorybooks', href: '/kids/storybooks',        badge: 'Kids' },
    ],
  },
  {
    titleKey: 'sectionLMS',
    routes: [
      { icon: BookOpen,     labelKey: 'routeMyCourses',   href: '/teacher/my-courses',    badge: 'LMS' },
      { icon: GraduationCap,labelKey: 'routeCreateCourse',href: '/teacher/course/create' },
    ],
  },
  {
    titleKey: 'sectionManage',
    routes: [
      { icon: BookOpenCheck,labelKey: 'routeClasses',     href: '/teacher/classes' },
      { icon: Users,        labelKey: 'routeStudentRequests', href: '/teacher/student-requests' },
      { icon: ClipboardList,labelKey: 'routeGradeBook',   href: '/teacher/gradebook' },
      { icon: MessageCircle,labelKey: 'routeInteraction', href: '/teacher/interaction-center' },
      { icon: MonitorPlay,  labelKey: 'routeCameraClass', href: '/teacher/camera-management', badge: 'Live' },
      { icon: Thermometer,  labelKey: 'routeEnvironment', href: '/teacher/environment-monitoring', badge: 'IoT' },
      { icon: FileEdit,     labelKey: 'routeAssignments', href: '/teacher/assignments' },
      { icon: Calendar,     labelKey: 'routeCalendar',    href: '/teacher/calendar' },
      { icon: ClipboardEdit, labelKey: 'routeMeetingNotes', href: '/teacher/meeting-notes' },
      { icon: Kanban,       labelKey: 'routeScrum',       href: '/teacher/scrumboard' },
      { icon: Bot,          labelKey: 'routeAgents',      href: '/teacher/agents',   badge: 'AI' },
      { icon: KeyRound,     labelKey: 'routeApiKeys',     href: '/teacher/api-keys', badge: 'MCP' },
    ],
  },
  {
    // Mạch điện & Phần cứng — thiết kế PCB (sơ đồ→layout→Gerber/JLCPCB + mô phỏng
    // SPICE) và phòng lab mạch IoT; mảng điện tử/STEM phần cứng của nền tảng
    titleKey: 'sectionHardware',
    routes: [
      { icon: CircuitBoard, labelKey: 'routePcb',     href: '/teacher/pcb',       badge: 'AI' },
      { icon: Cpu,          labelKey: 'routeCircuit',  href: '/dashboard/iot-lab', badge: 'IoT' },
    ],
  },
  {
    // Labs & Simulators — GV cần để minh hoạ dạy học, chuẩn bị thí nghiệm ảo
    titleKey: 'sectionLabsTools',
    routes: [
      { icon: FlaskConical,   labelKey: 'routeLabTwin',        href: '/dashboard/labtwin',          badge: 'Lab' },
      { icon: Sparkles,       labelKey: 'routeAura',           href: '/dashboard/aura',             badge: '3D' },
      { icon: Atom,           labelKey: 'routePeriodicTable',  href: '/dashboard/periodic-table', badge: 'Hoá' },
      { icon: FunctionSquare, labelKey: 'routeGraph',          href: '/dashboard/graph-lab' },
      // /dashboard/stem REMOVED 2026-05-27 — GV dùng /teacher/stem-projects (Agile Scrum đầy đủ)
      { icon: Zap,            labelKey: 'routeStemProjects',   href: '/teacher/stem-projects',      badge: 'STEM' },
      { icon: Gamepad2,       labelKey: 'routeGames',          href: '/dashboard/games',            badge: 'Game' },
      // KG HS (/dashboard/knowledge-graph) đã bỏ — GV dùng "Cây tri thức GV"
      // ở sectionOverview (/teacher/knowledge-graph) thay vì xem KG của HS
    ],
  },
  {
    titleKey: 'sectionHelp',
    routes: [
      { icon: BookOpen,  labelKey: 'routeDocs',        href: '/docs' },
      { icon: Newspaper, labelKey: 'routeNews',        href: '/news' },
      { icon: FileEdit,  labelKey: 'routeNewsCompose', href: '/teacher/news/create' },
    ],
  },
]

const adminSections: RouteSection[] = [
  {
    titleKey: 'sectionSystem',
    routes: [
      { icon: Layout,       labelKey: 'routeAdminOverview', href: '/admin/overview',    isHighlighted: true },
      { icon: BarChart,     labelKey: 'routeAnalytics',     href: '/admin/analytics',   badge: 'Live' },
      { icon: Sparkles,     labelKey: 'routeInsights',      href: '/admin/insights',    badge: 'AI' },
      { icon: Users,        labelKey: 'routeAdminUsers',    href: '/admin/users',       badge: 'Mới', isHighlighted: true },
      { icon: Users,        labelKey: 'routeStudents',      href: '/admin/students' },
      { icon: GraduationCap,labelKey: 'routeTeachers',      href: '/admin/teachers' },
      { icon: AlertTriangle,labelKey: 'routeAtRisk',        href: '/admin/at-risk' },
      { icon: MessageSquare,labelKey: 'routeAgents',        href: '/admin/agents',     badge: 'AI' },
      { icon: Network,      labelKey: 'routeProfKG',        href: '/admin/knowledge-graph', badge: 'CPD' },
    ],
  },
  {
    titleKey: 'sectionMonitor',
    routes: [
      { icon: Camera,   labelKey: 'routeCamera',      href: '/admin/camera-management', badge: 'Live' },
      { icon: Cpu,      labelKey: 'routeIoT',         href: '/admin/iot-management',    badge: 'Hub' },
      { icon: Heart,    labelKey: 'routeAdminEmotion',  href: '/admin/emotion' },
      { icon: BookOpen, labelKey: 'routeContent',       href: '/admin/content' },
      { icon: Languages, labelKey: 'routeEnglishEditor', href: '/admin/english-editor', badge: 'Mới' },
      { icon: Cpu,      labelKey: 'routeSkillsContent',  href: '/admin/skills-content', badge: 'Mới' },
      { icon: Tag,      labelKey: 'routeAdminCategories', href: '/admin/categories' },
    ],
  },
  {
    titleKey: 'sectionOperations',
    routes: [
      { icon: Shield,      labelKey: 'routeOperations',    href: '/admin/operations' },
      { icon: CreditCard,  labelKey: 'routeAdminPayments', href: '/admin/payments',  notifKey: 'pendingPaymentCount' },
      { icon: Brain,       labelKey: 'routeModels',        href: '/admin/models' },
      { icon: Settings,    labelKey: 'routeAdminSettings', href: '/admin/settings' },
      { icon: CheckSquare, labelKey: 'routeNewsReview',    href: '/admin/news/review' },
      { icon: Kanban,      labelKey: 'routeScrum',         href: '/admin/scrumboard' },
      { icon: KeyRound,    labelKey: 'routeApiKeys',       href: '/admin/api-keys', badge: 'MCP' },
      { icon: Plug,        labelKey: 'routeApiIntegrations', href: '/admin/integrations', badge: '🔐' },
      { icon: FlaskConical,labelKey: 'routeRsExperiments', href: '/admin/rs-experiments', badge: 'AI' },
    ],
  },
  {
    titleKey: 'sectionHelp',
    routes: [
      { icon: BookOpen,  labelKey: 'routeDocs', href: '/docs' },
      { icon: Newspaper, labelKey: 'routeNews', href: '/news' },
    ],
  },
]

// ── SidebarTooltip ─────────────────────────────────────────────────────────
/** Tooltip rendered as a body portal — tránh bị clip bởi overflow-y:auto của nav */
function SidebarTooltip({
  label,
  badge,
  anchorY,
  anchorRight,
  visible,
}: {
  label: string
  badge?: string
  anchorY: number
  anchorRight: number
  visible: boolean
}) {
  if (!visible) return null
  return createPortal(
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-md shadow-lg border border-border whitespace-nowrap"
      style={{
        position: 'fixed',
        left: anchorRight + 8,
        top: anchorY,
        transform: 'translateY(-50%)',
        zIndex: 9999,
        pointerEvents: 'none',
        animation: 'sidebar-tooltip-in 0.12s ease-out',
      }}
    >
      {label}
      {badge && (
        <span className="text-[9px] px-1 py-0.5 rounded bg-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,58%)] font-semibold leading-none">
          {badge}
        </span>
      )}
    </div>,
    document.body,
  )
}

// ── SidebarItem ────────────────────────────────────────────────────────────

function SidebarItem({
  icon: Icon,
  label,
  href,
  isHighlighted,
  badge,
  collapsed,
  notifCount,
}: Route & { label: string; collapsed: boolean; notifCount?: number }) {
  const location = useLocation()
  const isActive = location.pathname === href || location.pathname.startsWith(href + '/')
  const linkRef = useRef<HTMLAnchorElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ y: number; right: number } | null>(null)
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTooltipAt = () => {
    if (!collapsed || !linkRef.current) return
    const rect = linkRef.current.getBoundingClientRect()
    setTooltipPos({ y: rect.top + rect.height / 2, right: rect.right })
  }
  const handleMouseEnter = showTooltipAt
  const handleMouseLeave = () => setTooltipPos(null)

  // Mobile: tap nhanh = hiện tooltip 1.5s rồi tự ẩn (long-press đến đó user đã đọc xong)
  const handleTouchStart = () => {
    showTooltipAt()
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    touchTimerRef.current = setTimeout(() => setTooltipPos(null), 1500)
  }
  useEffect(() => () => { if (touchTimerRef.current) clearTimeout(touchTimerRef.current) }, [])

  return (
    <>
      <Link
        ref={linkRef}
        to={href}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative',
          isActive
            ? 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]'
            : isHighlighted
            ? 'text-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,58%)]/8'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          collapsed && 'justify-center px-2',
        )}
      >
        <div className="relative shrink-0">
          <Icon className={cn('w-4 h-4', isActive && 'text-[hsl(262,83%,58%)]')} />
          {/* Red dot indicator khi collapsed + có notification */}
          {collapsed && notifCount !== undefined && notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-background" />
          )}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {notifCount !== undefined && notifCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 animate-pulse">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
            {badge && !notifCount && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(262,83%,58%)]/15 text-[hsl(262,83%,58%)] font-semibold">
                {badge}
              </span>
            )}
          </>
        )}
      </Link>
      {/* Portal tooltip — tránh clip bởi overflow-y:auto trong nav */}
      {collapsed && tooltipPos && (
        <SidebarTooltip
          label={label}
          badge={badge}
          anchorY={tooltipPos.y}
          anchorRight={tooltipPos.right}
          visible
        />
      )}
    </>
  )
}

/** Poll /api/admin/notifications mỗi 60s để hiện badge số đỏ trên menu Payments. */
function useAdminNotifications(enabled: boolean) {
  const [data, setData] = useState<{ pendingPaymentCount: number } | null>(null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const tick = async () => {
      try {
        const res = await api.get<{ pendingPaymentCount: number }>('/admin/notifications')
        if (!cancelled) setData(res.data)
      } catch {
        // im lặng — nếu BE chưa support, badge sẽ không hiện
      }
    }
    tick()
    const i = setInterval(tick, 60_000)
    return () => { cancelled = true; clearInterval(i) }
  }, [enabled])
  return data
}

// ── Sidebar ────────────────────────────────────────────────────────────────

interface SidebarProps {
  /** Mobile drawer mode — khi true, render as fixed overlay từ trái */
  mobileOpen?: boolean
  /** Callback đóng drawer (gọi khi click backdrop / route change) */
  onMobileClose?: () => void
}

export const Sidebar = memo(function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps = {}) {
  /* 2026-05-20: mặc định COLLAPSED — tiết kiệm chỗ cho content area.
     User có thể bấm "Expand" để mở rộng. localStorage lưu preference. */
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('sidebar.collapsed')
    return saved === null ? true : saved === 'true'
  })

  /* Persist collapsed state khi user đổi */
  useEffect(() => {
    try { localStorage.setItem('sidebar.collapsed', String(collapsed)) } catch {}
  }, [collapsed])
  const role = useCurrentRole()
  const location = useLocation()
  const { t } = useLanguage()

  /* 2026-05-20: Auto-close mobile drawer khi đổi route — tránh
     drawer còn mở khi user vừa navigate. Touch UX standard. */
  useEffect(() => {
    if (mobileOpen) onMobileClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  /* Lock body scroll khi mobile drawer mở */
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const isAdminContext = role === 'ADMIN' || location.pathname.startsWith('/admin')
  const adminNotifs = useAdminNotifications(isAdminContext)

  const sections = useMemo(() => {
    const isTeacherPage = location.pathname.startsWith('/teacher')
    const isAdminPage   = location.pathname.startsWith('/admin')

    if (role === 'ADMIN'    || isAdminPage)   return adminSections
    if (role === 'TEACHER'  || isTeacherPage) return teacherSections
    return studentSections
  }, [role, location.pathname])

  return (
    <>
      {/* Mobile backdrop — chỉ render khi drawer open */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
    <aside
      data-sidebar="main"
      className={cn(
        'flex flex-col h-full border-r border-border bg-card transition-all duration-300',
        /* Desktop: w-14 collapsed / w-60 expanded
           Mobile drawer: w-16 collapsed (just icon) / w-56 expanded (labels visible)
           — co theo collapsed để không có vùng trống thừa bên phải. */
        collapsed ? 'lg:w-14 w-16' : 'lg:w-60 w-56',
        mobileOpen
          ? 'fixed top-0 left-0 h-full z-50 shadow-2xl lg:relative lg:shadow-none mobile-open'
          : 'hidden lg:flex',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-4 border-b border-border',
        collapsed && 'justify-center px-2',
      )}>
        <img src="/logo.png" alt="AeroEduVision" className="w-8 h-8 rounded-lg shrink-0 object-contain" />
        {!collapsed && (
          <span className="font-bold text-sm text-foreground">AeroEduVision</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {sections.map((section) => (
          <div key={section.titleKey}>
            {section.titleKey && !collapsed && (
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {t(section.titleKey)}
              </p>
            )}
            {section.routes.map((route) => (
              <SidebarItem
                key={route.href}
                {...route}
                label={t(route.labelKey)}
                collapsed={collapsed}
                notifCount={route.notifKey && adminNotifs
                  ? adminNotifs[route.notifKey]
                  : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition text-sm"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />
          }
          {!collapsed && <span>{t('collapse')}</span>}
        </button>
      </div>
    </aside>
    </>
  )
})
