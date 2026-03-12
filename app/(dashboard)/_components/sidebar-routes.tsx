"use client";

import { BarChart, Compass, Layout, List, Trophy, BookOpen, FileEdit, FileText, GraduationCap, StickyNote, Kanban, BookOpenCheck, Zap, Award, MessageSquare, Palette, Map, FlaskConical, Sparkles, Brain, Heart, CreditCard, Users, Target, Calendar, Shield, AlertTriangle, TrendingUp, Activity, Database, Settings, Camera, Upload, ScanLine, Grid3x3, HelpCircle, CheckSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { SidebarItem } from "./sidebar-item";

const guestRoutes = [
  {
    icon: Layout,
    label: "Dashboard",
    href: "/",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Compass,
    label: "Browse",
    href: "/search",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: BookOpen,
    label: "📚 Documentation",
    href: "/docs",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
];

// AI-Driven Student Routes - Organized by Categories
const studentRoutes = [
  // ===== CORE AI MODULES =====
  {
    icon: Trophy,
    label: "📊 Dashboard",
    href: "/dashboard",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Map,
    label: "🗺️ Learning Path",
    href: "/learning-paths",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: BarChart,
    label: "📈 Analytics",
    href: "/dashboard/analytics",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  // ===== STUDENT AGENTS (AEROEDUVISION_AGENTS_ARCHITECTURE) =====
  {
    icon: Brain,
    label: "🤖 Gia Sư AI",
    href: "/student/ai-tutor",
    isHighlighted: true, // PRIMARY - Trợ lý học tập
  },
  {
    icon: Calendar,
    label: "📅 Kế hoạch học",
    href: "/learning-paths",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Activity,
    label: "📈 Tiến độ",
    href: "/student/progress",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: FileText,
    label: "📝 Ôn thi",
    href: "/student/exam-prep",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: GraduationCap,
    label: "💼 Hướng nghiệp",
    href: "/student/career",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Settings,
    label: "⚙️ Cài đặt Agent",
    href: "/student/agent-settings",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Heart,
    label: "💝 Emotion Tracker",
    href: "/dashboard/emotion",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Camera,
    label: "👁️ Vision Tracker",
    href: "/dashboard/vision-tracker",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: FileEdit,
    label: "📝 Assignments",
    href: "/dashboard/assignments",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Award,
    label: "🏆 Achievements",
    href: "/dashboard/achievements",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: MessageSquare,
    label: "🔔 Notifications",
    href: "/dashboard/notifications",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  
  
  // ===== ADDITIONAL MODULES: STEM =====
  {
    icon: FlaskConical,
    label: "🧪 LabTwin",
    href: "/dashboard/labtwin",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Zap,
    label: "🚀 STEM",
    href: "/dashboard/stem",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  
  // ===== ADDITIONAL MODULES: COLLABORATION & PLANNING =====
  {
    icon: StickyNote,
    label: "📝 Notes",
    href: "/dashboard/notes",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Kanban,
    label: "📋 Scrum Board",
    href: "/dashboard/scrumboard",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Map,
    label: "🗺️ Bản đồ học nhóm",
    href: "/dashboard/study-group-map",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: BookOpenCheck,
    label: "👥 Danh bạ",
    href: "/dashboard/contacts",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: BookOpen,
    label: "📚 Documentation",
    href: "/docs",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
];

// AI-Driven Teacher Routes - Focused on Teaching & AI Assistance
const teacherRoutes = [
  // ===== CORE AI TEACHING MODULES =====
  {
    icon: Brain,
    label: "🤖 AI Dashboard",
    href: "/teacher/ai-dashboard",
    isHighlighted: true, // PRIMARY - AI-powered insights
  },
  {
    icon: Users,
    label: "👥 Class Overview",
    href: "/teacher/dashboard",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: BarChart,
    label: "📊 Analytics",
    href: "/teacher/analytics",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Heart,
    label: "🗺️ Bản đồ cảm xúc",
    href: "/teacher/emotion-map",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  
  // ===== KHẢO THÍ (EXAMINATION) SYSTEM =====
  {
    icon: Upload,
    label: "📄 Số hoá tài liệu",
    href: "/teacher/document-digitization",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
    badge: "AI", // AI-powered module
  },
  {
    icon: FileEdit,
    label: "Soạn LaTeX",
    href: "/teacher/latex-documents",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Grid3x3,
    label: "📋 Ma trận đề",
    href: "/teacher/exam-matrix",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: HelpCircle,
    label: "📚 Ngân hàng câu hỏi",
    href: "/teacher/question-bank",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: FileText,
    label: "📝 Đề thi",
    href: "/teacher/exams",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
    badge: "AI",
  },
  {
    icon: Users,
    label: "👥 Lớp học",
    href: "/teacher/classes",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Target,
    label: "🎯 Phòng thi trực tuyến",
    href: "/teacher/online-exam-room",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: CheckSquare,
    label: "✅ Chấm thi",
    href: "/teacher/exam-grading",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
    badge: "AI",
  },
  {
    icon: BarChart,
    label: "📊 Báo cáo",
    href: "/teacher/exam-reports",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
    badge: "AI",
  },
  
  // ===== AI CO-TEACHER TOOLS =====
  {
    icon: Target,
    label: "🎯 Learning Paths",
    href: "/teacher/learning-path-builder",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Sparkles,
    label: "✨ AI Content Gen",
    href: "/teacher/create-module",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: MessageSquare,
    label: "💬 Student Chat",
    href: "/teacher/interaction-center",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  
  // ===== MANAGEMENT =====
  {
    icon: FileEdit,
    label: "📝 Assignments",
    href: "/teacher/assignments",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Award,
    label: "🏆 Grading",
    href: "/teacher/grading",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Calendar,
    label: "📅 Schedule",
    href: "/teacher/calendar",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: BookOpen,
    label: "📚 Documentation",
    href: "/docs",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
]

// ===== ADMIN ROUTES =====
const adminRoutes = [
  // ===== CORE ADMIN MODULES =====
  {
    icon: Layout,
    label: "🎛️ System Overview",
    href: "/admin/overview",
    isHighlighted: true,
  },
  {
    icon: Users,
    label: "👩‍🎓 Student Insights",
    href: "/admin/students",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: AlertTriangle,
    label: "⚠️ At-Risk Manager",
    href: "/admin/at-risk",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: MessageSquare,
    label: "💬 Alerts Inbox",
    href: "/admin/alerts",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  
  // ===== ANALYTICS & MONITORING =====
  {
    icon: GraduationCap,
    label: "🧑‍🏫 Teacher Performance",
    href: "/admin/teachers",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Heart,
    label: "💝 Emotion Monitor",
    href: "/admin/emotion",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: BookOpen,
    label: "📚 Content Monitor",
    href: "/admin/content",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  
  // ===== SYSTEM MANAGEMENT =====
  {
    icon: Shield,
    label: "🔒 Operations",
    href: "/admin/operations",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Brain,
    label: "🤖 AI Models",
    href: "/admin/models",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: Settings,
    label: "⚙️ Settings",
    href: "/admin/settings",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
  {
    icon: BookOpen,
    label: "📚 Documentation",
    href: "/docs",
    isHighlighted: false,
    className: "neu-card hover:neu-shadow-lg",
  },
]

export const SidebarRoutes = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isTeacherPage = pathname?.includes("/teacher");
  const isAdminPage = pathname?.includes("/admin");
  const isTeacher = session?.user?.role === "TEACHER";
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const isStudent = session?.user?.role === "STUDENT";

  let routes;
  if (isAdminPage || isAdmin) {
    routes = adminRoutes;
  } else if (isTeacherPage || isTeacher) {
    routes = teacherRoutes;
  } else if (isStudent) {
    routes = studentRoutes;
  } else {
    routes = guestRoutes;
  }

  return (
    <div className="flex flex-col w-full">
      {routes.map((route, index) => (
        <SidebarItem
          key={`${route.href}-${index}`}
          icon={route.icon}
          label={route.label}
          href={route.href}
          isHighlighted={route.isHighlighted}
          badge={route.badge}
        />
      ))}
    </div>
  )
}