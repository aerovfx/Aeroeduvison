"use client";

import { 
  LayoutDashboard,
  Users, 
  BookOpen, 
  HelpCircle, 
  FileText, 
  Video, 
  Map, 
  MessageCircle, 
  Trophy, 
  Microscope,
  Calendar,
  Shield
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

export const AdminSidebarRoutes = () => {
  const pathname = usePathname();
  const { t } = useLanguage();

  const routes = [
    {
      icon: LayoutDashboard,
      label: t('admin.dashboard'),
      href: "/admin/dashboard",
    },
    {
      icon: Users,
      label: t('admin.users'),
      href: "/admin/users",
    },
    {
      icon: Shield,
      label: 'Phân quyền',
      href: "/admin/permissions",
    },
    {
      icon: BookOpen,
      label: t('admin.courses'),
      href: "/admin/courses",
    },
    {
      icon: HelpCircle,
      label: t('admin.quiz'),
      href: "/admin/quiz",
    },
    {
      icon: FileText,
      label: t('admin.assignments'),
      href: "/admin/assignments",
    },
    {
      icon: Video,
      label: t('admin.video'),
      href: "/admin/video",
    },
    {
      icon: Map,
      label: t('admin.learning-path'),
      href: "/admin/learning-path",
    },
    {
      icon: MessageCircle,
      label: t('admin.live-chat'),
      href: "/admin/live-chat",
    },
    {
      icon: Trophy,
      label: t('admin.competition'),
      href: "/admin/competition",
    },
    {
      icon: Microscope,
      label: t('admin.stem'),
      href: "/admin/stem",
    },
    {
      icon: Calendar,
      label: t('admin.calendar'),
      href: "/admin/calendar",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-black hover:bg-gray-200 rounded-lg transition",
            pathname === route.href
              ? "text-black bg-gray-200"
              : "text-gray-600"
          )}
        >
          <div className="flex items-center flex-1">
            <route.icon className={cn("h-5 w-5 mr-3", route.icon === LayoutDashboard ? "h-6 w-6" : "")} />
            {route.label}
          </div>
        </Link>
      ))}
    </div>
  );
};
