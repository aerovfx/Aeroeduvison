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
  ClipboardList,
  type LucideIcon
} from 'lucide-react'
import { useCurrentRole } from '@/hooks/useCurrentUser'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

type Route = {
  icon: LucideIcon
  labelKey: string   // key into t()
  href: string
  isHighlighted?: boolean
  badge?: string
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
      { icon: Brain,        labelKey: 'routeAiTutor',      href: '/ai-tutor',             isHighlighted: true },
      { icon: BookOpen,     labelKey: 'routeMyCourses',    href: '/student/my-courses',   badge: 'LMS' },
      { icon: Map,          labelKey: 'routeLearningPath',  href: '/learning-paths' },
      { icon: FileText,     labelKey: 'routeExamPrep',      href: '/student/exam-prep' },
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
      { icon: Sparkles,       labelKey: 'routeAura',    href: '/dashboard/aura',      badge: '3D' },
      { icon: CircuitBoard,   labelKey: 'routeCircuit', href: '/dashboard/iot-lab',   badge: 'IoT' },
      { icon: Zap,            labelKey: 'routeStem',    href: '/dashboard/stem' },
      { icon: StickyNote,     labelKey: 'routeNotes',   href: '/dashboard/notes' },
      { icon: Kanban,         labelKey: 'routeScrum',   href: '/dashboard/scrumboard' },
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
      { icon: ClipboardList,labelKey: 'routeGradeBook',   href: '/teacher/gradebook' },
      { icon: MonitorPlay,  labelKey: 'routeCameraClass', href: '/teacher/camera-management', badge: 'Live' },
      { icon: Thermometer,  labelKey: 'routeEnvironment', href: '/teacher/environment-monitoring', badge: 'IoT' },
      { icon: FileEdit,     labelKey: 'routeAssignments', href: '/teacher/assignments' },
      { icon: Calendar,     labelKey: 'routeCalendar',    href: '/teacher/calendar' },
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
      { icon: Brain,       labelKey: 'routeModels',        href: '/admin/models' },
      { icon: Settings,    labelKey: 'routeAdminSettings', href: '/admin/settings' },
      { icon: CheckSquare, labelKey: 'routeNewsReview',    href: '/admin/news/review' },
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
}: Route & { label: string; collapsed: boolean }) {
  const location = useLocation()
  const isActive = location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
        isActive
          ? 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]'
          : isHighlighted
          ? 'text-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,58%)]/8'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        collapsed && 'justify-center px-2',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-[hsl(262,83%,58%)]')} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(262,83%,58%)]/15 text-[hsl(262,83%,58%)] font-semibold">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────

export const Sidebar = memo(function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const role = useCurrentRole()
  const location = useLocation()
  const { t } = useLanguage()

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
