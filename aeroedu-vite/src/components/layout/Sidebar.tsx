/**
 * Sidebar — bilingual (VI / EN) via useLanguage()
 * Port từ app/(dashboard)/_components/sidebar.tsx
 */
import { memo, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart, Layout, BookOpen, FileEdit, FileText,
  GraduationCap, StickyNote, Kanban, Zap, Award, MessageSquare,
  Map, FlaskConical, Sparkles, Brain, Heart, Users, Target,
  Calendar, Shield, AlertTriangle, Activity, Settings, Upload,
  Grid3x3, HelpCircle, CheckSquare, BookOpenCheck, Compass,
  Camera, MonitorPlay, Thermometer, Cpu, Mic, ChevronLeft, ChevronRight, Tag,
  CircuitBoard, FunctionSquare, Wand2, ShoppingBag, Bookmark, Newspaper,
  ClipboardList, Network, Gamepad2, CreditCard, Radio, Sparkles as SparklesIcon,
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
      { icon: Brain,        labelKey: 'routeAiTutor',      href: '/ai-tutor',             isHighlighted: true },
      { icon: BookOpen,     labelKey: 'routeMyCourses',    href: '/student/my-courses',   badge: 'LMS' },
      { icon: GraduationCap,labelKey: 'routeMyTeachers',   href: '/student/teachers' },
      { icon: Map,          labelKey: 'routeLearningPath',  href: '/learning-paths' },
      { icon: FileText,     labelKey: 'routeExamPrep',      href: '/student/exam-prep' },
      { icon: Radio,        labelKey: 'routeExamRooms',     href: '/student/exams',        badge: 'Live' },
      { icon: GraduationCap,labelKey: 'routeCareer',        href: '/student/career' },
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
      { icon: Gamepad2,       labelKey: 'routeGames',   href: '/dashboard/games',     badge: 'Game' },
      { icon: Sparkles,       labelKey: 'routeAura',    href: '/dashboard/aura',      badge: '3D' },
      { icon: CircuitBoard,   labelKey: 'routeCircuit', href: '/dashboard/iot-lab',   badge: 'IoT' },
      { icon: Zap,            labelKey: 'routeStem',    href: '/dashboard/stem' },
      { icon: StickyNote,     labelKey: 'routeNotes',   href: '/dashboard/notes' },
      { icon: Kanban,         labelKey: 'routeScrum',   href: '/dashboard/scrumboard' },
      { icon: Network,        labelKey: 'routeKnowledgeGraph', href: '/dashboard/knowledge-graph', badge: 'AI' },
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
    ],
  },
  {
    titleKey: 'sectionExam',
    routes: [
      { icon: Wand2,     labelKey: 'routeTaodethi',      href: '/teacher/taodethi',         isHighlighted: true },
      { icon: Grid3x3,   labelKey: 'routeExamMatrix',   href: '/teacher/exam-matrix' },
      { icon: HelpCircle,labelKey: 'routeQuestionBank',  href: '/teacher/question-bank' },
      { icon: FileText,  labelKey: 'routeExams',         href: '/teacher/exams',            badge: 'AI' },
      { icon: Target,    labelKey: 'routeOnlineExam',    href: '/teacher/online-exam-room' },
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
      { icon: FileText, labelKey: 'routeLessonPlans', href: '/teacher/lesson-plans',             badge: 'New' },
      { icon: Mic,      labelKey: 'routeTranscript', href: '/teacher/transcript',                badge: 'AI' },
      { icon: Map,      labelKey: 'routePathBuilder',href: '/teacher/learning-path-builder' },
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
      { icon: MonitorPlay,  labelKey: 'routeCameraClass', href: '/teacher/camera-management', badge: 'Live' },
      { icon: Thermometer,  labelKey: 'routeEnvironment', href: '/teacher/environment-monitoring', badge: 'IoT' },
      { icon: FileEdit,     labelKey: 'routeAssignments', href: '/teacher/assignments' },
      { icon: Calendar,     labelKey: 'routeCalendar',    href: '/teacher/calendar' },
      { icon: Kanban,       labelKey: 'routeScrum',       href: '/teacher/scrumboard' },
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
      { icon: Users,        labelKey: 'routeStudents',      href: '/admin/students' },
      { icon: GraduationCap,labelKey: 'routeTeachers',      href: '/admin/teachers' },
      { icon: AlertTriangle,labelKey: 'routeAtRisk',        href: '/admin/at-risk' },
      { icon: MessageSquare,labelKey: 'routeAgents',        href: '/admin/agents',     badge: 'AI' },
    ],
  },
  {
    titleKey: 'sectionMonitor',
    routes: [
      { icon: Camera,   labelKey: 'routeCamera',      href: '/admin/camera-management', badge: 'Live' },
      { icon: Cpu,      labelKey: 'routeIoT',         href: '/admin/iot-management',    badge: 'Hub' },
      { icon: Heart,    labelKey: 'routeAdminEmotion',  href: '/admin/emotion' },
      { icon: BookOpen, labelKey: 'routeContent',       href: '/admin/content' },
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

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative',
        isActive
          ? 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]'
          : isHighlighted
          ? 'text-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,58%)]/8'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        collapsed && 'justify-center px-2',
      )}
      title={collapsed ? label : undefined}
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

export const Sidebar = memo(function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const role = useCurrentRole()
  const location = useLocation()
  const { t } = useLanguage()

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
    <aside
      className={cn(
        'flex flex-col h-full border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-4 border-b border-border',
        collapsed && 'justify-center px-2',
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(217,91%,60%)] flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
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
  )
})
