"use client";

import {
  BarChart, Layout, BookOpen, FileEdit, FileText,
  GraduationCap, StickyNote, Kanban, Zap, Award, MessageSquare,
  Map, FlaskConical, Sparkles, Brain, Heart, Users, Target,
  Calendar, Shield, AlertTriangle, Activity, Settings, Upload,
  Grid3x3, HelpCircle, CheckSquare, BookOpenCheck, Compass,
  Camera, MonitorPlay, Thermometer, Cpu, Mic
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { memo, useMemo } from "react";

import { SidebarItem } from "./sidebar-item";

type Route = {
  icon: typeof Layout;
  label: string;
  href: string;
  isHighlighted?: boolean;
  badge?: string;
};

type RouteSection = {
  title: string;
  routes: Route[];
};

/* ── Guest Routes ── */
const guestSections: RouteSection[] = [
  {
    title: "",
    routes: [
      { icon: Layout, label: "Dashboard", href: "/" },
      { icon: Compass, label: "Browse", href: "/search" },
    ],
  },
];

/* ── Student Routes ── */
const studentSections: RouteSection[] = [
  {
    title: "Overview",
    routes: [
      { icon: Layout, label: "Dashboard", href: "/dashboard" },
      { icon: BarChart, label: "Analytics", href: "/dashboard/analytics" },
      { icon: Award, label: "Achievements", href: "/dashboard/achievements" },
    ],
  },
  {
    title: "Learning",
    routes: [
      { icon: Brain, label: "Gia Sư AI", href: "/student/ai-tutor", isHighlighted: true },
      { icon: Map, label: "Learning Path", href: "/learning-paths" },
      { icon: FileText, label: "Ôn thi", href: "/student/exam-prep" },
      { icon: GraduationCap, label: "Hướng nghiệp", href: "/student/career" },
    ],
  },
  {
    title: "Tracking",
    routes: [
      { icon: Activity, label: "Tiến độ", href: "/student/progress" },
      { icon: Heart, label: "Cảm xúc", href: "/dashboard/emotion" },
      { icon: FileEdit, label: "Bài tập", href: "/dashboard/assignments" },
      { icon: MessageSquare, label: "Thông báo", href: "/dashboard/notifications" },
    ],
  },
  {
    title: "Labs & Tools",
    routes: [
      { icon: FlaskConical, label: "LabTwin", href: "/dashboard/labtwin", badge: "Lab" },
      { icon: Sparkles, label: "Aura", href: "/dashboard/aura", badge: "3D" },
      { icon: Zap, label: "STEM Projects", href: "/dashboard/stem" },
      { icon: StickyNote, label: "Ghi chú", href: "/dashboard/notes" },
      { icon: Kanban, label: "Scrum Board", href: "/dashboard/scrumboard" },
    ],
  },
  {
    title: "Settings",
    routes: [
      { icon: Settings, label: "Cài đặt Agent", href: "/student/agent-settings" },
      { icon: Users, label: "Danh bạ", href: "/dashboard/contacts" },
    ],
  },
];

/* ── Teacher Routes ── */
const teacherSections: RouteSection[] = [
  {
    title: "Tổng quan",
    routes: [
      { icon: Brain, label: "AI Dashboard", href: "/teacher/ai-dashboard", isHighlighted: true },
      { icon: Users, label: "Quản lý lớp", href: "/teacher/dashboard" },
      { icon: BarChart, label: "Analytics", href: "/teacher/analytics" },
      { icon: Heart, label: "Bản đồ cảm xúc", href: "/teacher/emotion-map" },
      { icon: MessageSquare, label: "Chat Agents", href: "/teacher/agents" },
    ],
  },
  {
    title: "Ra đề & Kiểm tra",
    routes: [
      { icon: Grid3x3, label: "Ma trận đề", href: "/teacher/exam-matrix" },
      { icon: HelpCircle, label: "Ngân hàng câu hỏi", href: "/teacher/question-bank" },
      { icon: FileText, label: "Đề thi", href: "/teacher/exams", badge: "AI" },
      { icon: Target, label: "Phòng thi online", href: "/teacher/online-exam-room" },
    ],
  },
  {
    title: "Chấm thi & Báo cáo",
    routes: [
      { icon: CheckSquare, label: "Chấm thi", href: "/teacher/exam-grading", badge: "AI" },
      { icon: Award, label: "Báo cáo thi", href: "/teacher/exam-reports" },
    ],
  },
  {
    title: "Soạn bài & AI",
    routes: [
      { icon: Sparkles, label: "AI Content Gen", href: "/teacher/create-module", badge: "AI" },
      { icon: Upload, label: "Số hóa tài liệu", href: "/teacher/document-digitization", badge: "AI" },
      { icon: FileEdit, label: "Soạn LaTeX", href: "/teacher/latex-documents" },
      { icon: Mic, label: "Transcript & Phụ đề", href: "/teacher/transcript", badge: "AI" },
      { icon: Map, label: "Learning Paths", href: "/teacher/learning-path-builder" },
    ],
  },
  {
    title: "Quản lý",
    routes: [
      { icon: BookOpenCheck, label: "Lớp học", href: "/teacher/classes" },
      { icon: MonitorPlay, label: "Camera lớp học", href: "/teacher/camera-management", badge: "Live" },
      { icon: Thermometer, label: "Môi trường học", href: "/teacher/environment-monitoring", badge: "IoT" },
      { icon: FileEdit, label: "Bài tập", href: "/teacher/assignments" },
      { icon: Award, label: "Chấm điểm", href: "/teacher/grading" },
      { icon: MessageSquare, label: "Tương tác HS", href: "/teacher/interaction-center" },
      { icon: Calendar, label: "Lịch trình", href: "/teacher/calendar" },
    ],
  },
];

/* ── Admin Routes ── */
const adminSections: RouteSection[] = [
  {
    title: "Hệ thống",
    routes: [
      { icon: Layout, label: "Tổng quan", href: "/admin/overview", isHighlighted: true },
      { icon: Users, label: "Học sinh", href: "/admin/students" },
      { icon: GraduationCap, label: "Giáo viên", href: "/admin/teachers" },
      { icon: AlertTriangle, label: "Cảnh báo rủi ro", href: "/admin/at-risk" },
      { icon: MessageSquare, label: "Chat Agents", href: "/admin/agents", badge: "AI" },
    ],
  },
  {
    title: "Giám sát",
    routes: [
      { icon: Camera, label: "Camera trường", href: "/admin/camera-management", badge: "Live" },
      { icon: Cpu, label: "IoT Gateway", href: "/admin/iot-management", badge: "Hub" },
      { icon: Heart, label: "Cảm xúc", href: "/admin/emotion" },
      { icon: BookOpen, label: "Nội dung", href: "/admin/content" },
      { icon: MessageSquare, label: "Thông báo", href: "/admin/alerts" },
    ],
  },
  {
    title: "Vận hành",
    routes: [
      { icon: Shield, label: "Operations", href: "/admin/operations" },
      { icon: Brain, label: "AI Models", href: "/admin/models" },
      { icon: Settings, label: "Cài đặt", href: "/admin/settings" },
    ],
  },
];

export const SidebarRoutes = memo(function SidebarRoutes({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const sections = useMemo(() => {
    const isTeacherPage = pathname?.includes("/teacher");
    const isAdminPage = pathname?.includes("/admin");
    const isTeacher = session?.user?.role === "TEACHER";
    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
    const isStudent = session?.user?.role === "STUDENT";

    if (isAdminPage || isAdmin) return adminSections;
    if (isTeacherPage || isTeacher) return teacherSections;
    if (isStudent) return studentSections;
    return guestSections;
  }, [pathname, session?.user?.role]);

  return (
    <div className={`flex flex-col w-full ${collapsed ? 'items-center px-1' : ''}`}>
      {sections.map((section, si) => (
        <div key={si} className={collapsed ? 'w-full' : ''}>
          {section.title && !collapsed && (
            <div className="section-label">{section.title}</div>
          )}
          {collapsed && si > 0 && section.title && (
            <div className="w-6 h-px bg-border mx-auto my-1.5" />
          )}
          {section.routes.map((route) => (
            <SidebarItem
              key={route.href}
              icon={route.icon}
              label={route.label}
              href={route.href}
              isHighlighted={route.isHighlighted}
              badge={route.badge}
              collapsed={collapsed}
            />
          ))}
        </div>
      ))}
    </div>
  );
});
