"use client";

import { BarChart, Compass, Layout, List, Trophy, BookOpen, FileEdit, FileText, GraduationCap, StickyNote, Kanban, BookOpenCheck, Zap, Award, MessageSquare, Palette, Map, FlaskConical, Sparkles, Brain, Heart, CreditCard, Users, Target, Calendar, Shield, AlertTriangle, TrendingUp, Activity, Database, Settings, Camera, Upload, ScanLine, Grid3x3, HelpCircle, CheckSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { SidebarItem } from "./sidebar-item";
import { LucideIcon } from "lucide-react";

interface SidebarRoute {
    icon: LucideIcon;
    label: string;
    href: string;
    isHighlighted: boolean;
    badge?: string;
}

const guestRoutes: SidebarRoute[] = [
  {
    icon: Layout,
    label: "Dashboard",
    href: "/",
    isHighlighted: false,
  },
  {
    icon: Compass,
    label: "Browse",
    href: "/search",
    isHighlighted: false,
  },
  {
    icon: BookOpen,
    label: "📚 Documentation",
    href: "/docs",
    isHighlighted: false,
  },
];

// AI-Driven Student Routes - Organized by Categories
const studentRoutes: SidebarRoute[] = [
  // ===== CORE AI MODULES =====
  {
    icon: Trophy,
    label: "📊 Dashboard",
    href: "/dashboard",
    isHighlighted: false,
  },
  {
    icon: Map,
    label: "🗺️ Learning Path",
    href: "/learning-paths",
    isHighlighted: false,
  },
  {
    icon: BarChart,
    label: "📈 Analytics",
    href: "/dashboard/analytics",
    isHighlighted: false,
  },
  {
    icon: Brain,
    label: "🤖 AI Tutor",
    href: "/ai-tutor",
    isHighlighted: true, // PRIMARY
  },
  {
    icon: Heart,
    label: "💝 Emotion Tracker",
    href: "/dashboard/emotion",
    isHighlighted: false,
  },
  {
    icon: Camera,
    label: "👁️ Vision Tracker",
    href: "/dashboard/vision-tracker",
    isHighlighted: false,
  },
  {
    icon: FileEdit,
    label: "📝 Assignments",
    href: "/dashboard/assignments",
    isHighlighted: false,
  },
  {
    icon: Award,
    label: "🏆 Achievements",
    href: "/dashboard/achievements",
    isHighlighted: false,
  },
  {
    icon: MessageSquare,
    label: "🔔 Notifications",
    href: "/dashboard/notifications",
    isHighlighted: false,
  },
  
  
  // ===== ADDITIONAL MODULES: STEM =====
  {
    icon: FlaskConical,
    label: "🧪 LabTwin",
    href: "/dashboard/labtwin",
    isHighlighted: false,
  },
  {
    icon: Zap,
    label: "🚀 STEM",
    href: "/dashboard/stem",
    isHighlighted: false,
  },
  
  // ===== ADDITIONAL MODULES: COLLABORATION & PLANNING =====
  {
    icon: StickyNote,
    label: "📝 Notes",
    href: "/dashboard/notes",
    isHighlighted: false,
  },
  {
    icon: Kanban,
    label: "📋 Scrum Board",
    href: "/dashboard/scrumboard",
    isHighlighted: false,
  },
  {
    icon: BookOpenCheck,
    label: "👥 Danh bạ",
    href: "/dashboard/contacts",
    isHighlighted: false,
  },
  {
    icon: BookOpen,
    label: "📚 Documentation",
    href: "/docs",
    isHighlighted: false,
  },
];

// AI-Driven Teacher Routes - Focused on Teaching & AI Assistance
const teacherRoutes: SidebarRoute[] = [
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
  },
  {
    icon: BarChart,
    label: "📊 Analytics",
    href: "/teacher/analytics",
    isHighlighted: false,
  },
  
  // ===== KHẢO THÍ (EXAMINATION) SYSTEM =====
  {
    icon: Upload,
    label: "📄 Số hoá tài liệu",
    href: "/teacher/document-digitization",
    isHighlighted: false,
    badge: "AI", // AI-powered module
  },
  {
    icon: Grid3x3,
    label: "📋 Ma trận đề",
    href: "/teacher/exam-matrix",
    isHighlighted: false,
  },
  {
    icon: HelpCircle,
    label: "📚 Ngân hàng câu hỏi",
    href: "/teacher/question-bank",
    isHighlighted: false,
  },
  {
    icon: FileText,
    label: "📝 Đề thi",
    href: "/teacher/exams",
    isHighlighted: false,
    badge: "AI",
  },
  {
    icon: Users,
    label: "👥 Lớp học",
    href: "/teacher/classes",
    isHighlighted: false,
  },
  {
    icon: Target,
    label: "🎯 Phòng thi trực tuyến",
    href: "/teacher/online-exam-room",
    isHighlighted: false,
  },
  {
    icon: CheckSquare,
    label: "✅ Chấm thi",
    href: "/teacher/exam-grading",
    isHighlighted: false,
    badge: "AI",
  },
  {
    icon: BarChart,
    label: "📊 Báo cáo",
    href: "/teacher/exam-reports",
    isHighlighted: false,
    badge: "AI",
  },
  
  // ===== AI CO-TEACHER TOOLS =====
  {
    icon: Target,
    label: "🎯 Learning Paths",
    href: "/teacher/learning-path-builder",
    isHighlighted: false,
  },
  {
    icon: Search,
    label: "🔍 Semantic Library",
    href: "/teacher/semantic-library",
    isHighlighted: false,
    badge: "OpenFang",
  },
  {
    icon: Sparkles,
    label: "✨ Open Fang AI Gen",
    href: "/teacher/ai-generator",
    isHighlighted: false,
    badge: "Fang",
  },
  {
    icon: Sparkles,
    label: "✨ AI Content Gen",
    href: "/teacher/create-module",
    isHighlighted: false,
  },
  {
    icon: MessageSquare,
    label: "💬 Student Chat",
    href: "/teacher/interaction-center",
    isHighlighted: false,
  },
  
  // ===== MANAGEMENT =====
  {
    icon: FileEdit,
    label: "📝 Assignments",
    href: "/teacher/assignments",
    isHighlighted: false,
  },
  {
    icon: Award,
    label: "🏆 Grading",
    href: "/teacher/grading",
    isHighlighted: false,
  },
  {
    icon: Calendar,
    label: "📅 Schedule",
    href: "/teacher/calendar",
    isHighlighted: false,
  },
  {
    icon: Sparkles,
    label: "🎨 Logo Design",
    href: "/dashboard/logo-design",
    isHighlighted: false,
  },
  {
    icon: BookOpen,
    label: "📚 Documentation",
    href: "/docs",
    isHighlighted: false,
  },
]

// ===== ADMIN ROUTES =====
const adminRoutes: SidebarRoute[] = [
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
  },
  {
    icon: AlertTriangle,
    label: "⚠️ At-Risk Manager",
    href: "/admin/at-risk",
    isHighlighted: false,
  },
  {
    icon: MessageSquare,
    label: "💬 Alerts Inbox",
    href: "/admin/alerts",
    isHighlighted: false,
  },
  
  // ===== ANALYTICS & MONITORING =====
  {
    icon: GraduationCap,
    label: "🧑‍🏫 Teacher Performance",
    href: "/admin/teachers",
    isHighlighted: false,
  },
  {
    icon: Heart,
    label: "💝 Emotion Monitor",
    href: "/admin/emotion",
    isHighlighted: false,
  },
  {
    icon: BookOpen,
    label: "📚 Content Monitor",
    href: "/admin/content",
    isHighlighted: false,
  },
  
  // ===== SYSTEM MANAGEMENT =====
  {
    icon: Shield,
    label: "🔒 Operations",
    href: "/admin/operations",
    isHighlighted: false,
  },
  {
    icon: Brain,
    label: "🤖 AI Models",
    href: "/admin/models",
    isHighlighted: false,
  },
  {
    icon: Settings,
    label: "⚙️ Settings",
    href: "/admin/settings",
    isHighlighted: false,
  },
  {
    icon: BookOpen,
    label: "📚 Documentation",
    href: "/docs",
    isHighlighted: false,
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
      {routes.map((route) => (
        <SidebarItem
          key={route.href}
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