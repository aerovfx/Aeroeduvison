"use client";

import { BarChart, Compass, Layout, List, Trophy, BookOpen, FileEdit, FileText, GraduationCap, StickyNote, Kanban, BookOpenCheck, Zap, Award, MessageSquare, Palette, Map, FlaskConical, Sparkles, Brain, Heart, CreditCard, Users, Target, Calendar, Shield, AlertTriangle, TrendingUp, Activity, Database, Settings, Camera } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { SidebarItem } from "./sidebar-item";

const guestRoutes = [
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
];

// AI-Driven Student Routes - Organized by Categories
const studentRoutes = [
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
  },
  {
    icon: BarChart,
    label: "📊 Analytics",
    href: "/teacher/analytics",
    isHighlighted: false,
  },
  
  // ===== AI CO-TEACHER TOOLS =====
  {
    icon: Target,
    label: "🎯 Learning Paths",
    href: "/teacher/learning-path-builder",
    isHighlighted: false,
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
    icon: FileText,
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
];

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
        />
      ))}
    </div>
  )
}