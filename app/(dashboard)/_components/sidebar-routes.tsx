"use client";

import { BarChart, Compass, Layout, List, Trophy, BookOpen, FileEdit, FileText, GraduationCap, StickyNote, Kanban, BookOpenCheck, Zap, Award, MessageSquare, Palette, Map, FlaskConical, Sparkles } from "lucide-react";
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

const studentRoutes = [
  {
    icon: Layout,
    label: "Dashboard",
    href: "/dashboard",
    isHighlighted: false,
  },
  {
    icon: Sparkles,
    label: "AI Content Generator",
    href: "/dashboard/ai-content-generator",
    isHighlighted: false,
  },
  {
    icon: Trophy,
    label: "Bảng điều khiển",
    href: "/student-dashboard",
    isHighlighted: false,
  },
  {
    icon: Map,
    label: "Lộ trình học tập",
    href: "/learning-paths-demo",
    isHighlighted: false,
  },
  {
    icon: FlaskConical,
    label: "LabTwin",
    href: "/dashboard/labtwin",
    isHighlighted: false,
  },
  {
    icon: GraduationCap,
    label: "Học tập",
    href: "/dashboard/learning",
    isHighlighted: false,
  },
  {
    icon: BookOpen,
    label: "My Courses",
    href: "/dashboard/courses",
    isHighlighted: false,
  },
  {
    icon: FileEdit,
    label: "Assignments",
    href: "/dashboard/assignments",
    isHighlighted: false,
  },
  {
    icon: FileText,
    label: "Quizzes",
    href: "/dashboard/quizzes",
    isHighlighted: false,
  },
  {
    icon: Award,
    label: "Cuộc thi",
    href: "/dashboard/competition",
    isHighlighted: false,
  },
  {
    icon: MessageSquare,
    label: "Chat",
    href: "/dashboard/chat",
    isHighlighted: false,
  },
  {
    icon: Zap,
    label: "STEM Projects",
    href: "/dashboard/stem",
    isHighlighted: false,
  },
  {
    icon: StickyNote,
    label: "Ghi chú",
    href: "/dashboard/notes",
    isHighlighted: false,
  },
  {
    icon: Kanban,
    label: "Scrum Board",
    href: "/dashboard/scrumboard",
    isHighlighted: false,
  },
  {
    icon: BookOpenCheck,
    label: "Danh bạ",
    href: "/dashboard/contacts",
    isHighlighted: false,
  },
  {
    icon: Palette,
    label: "Theme Demo",
    href: "/dashboard/theme",
    isHighlighted: false,
  },
  {
    icon: Compass,
    label: "Browse",
    href: "/search",
    isHighlighted: false,
  },
];

const teacherRoutes = [
  {
    icon: Layout,
    label: "Dashboard",
    href: "/teacher/dashboard",
    isHighlighted: false,
  },
  {
    icon: BarChart,
    label: "📊 Learning Analytics",
    href: "/teacher/learning-analytics",
    isHighlighted: true, // Special highlight for important feature
  },
  {
    icon: Sparkles,
    label: "AI Content Generator",
    href: "/dashboard/ai-content-generator",
    isHighlighted: false,
  },
  {
    icon: List,
    label: "Courses",
    href: "/teacher/courses",
    isHighlighted: false,
  },
  {
    icon: FlaskConical,
    label: "LabTwin",
    href: "/dashboard/labtwin",
    isHighlighted: false,
  },
  {
    icon: FileEdit,
    label: "Assignments",
    href: "/teacher/assignments",
    isHighlighted: false,
  },
  // {
  //   icon: MessageSquare,
  //   label: "Live Chat",
  //   href: "/dashboard/chat",
  // },
  {
    icon: Zap,
    label: "STEM Projects",
    href: "/teacher/stem",
    isHighlighted: false,
  },
  {
    icon: StickyNote,
    label: "Ghi chú",
    href: "/dashboard/notes",
    isHighlighted: false,
  },
  {
    icon: Kanban,
    label: "Scrum Board",
    href: "/dashboard/scrumboard",
    isHighlighted: false,
  },
  {
    icon: BookOpenCheck,
    label: "Danh bạ",
    href: "/dashboard/contacts",
    isHighlighted: false,
  },
  {
    icon: Palette,
    label: "Theme Demo",
    href: "/dashboard/theme",
    isHighlighted: false,
  },
]

export const SidebarRoutes = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isTeacherPage = pathname?.includes("/teacher");
  const isTeacher = session?.user?.role === "TEACHER";
  const isStudent = session?.user?.role === "STUDENT";

  let routes;
  if (isTeacherPage || isTeacher) {
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