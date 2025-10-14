"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Sidebar = () => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full border-r flex flex-col overflow-y-auto bg-white shadow-sm">
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚛️</span>
            <h1 className="text-2xl font-bold text-primary">LabTwin</h1>
          </div>
        </div>
        <div className="flex flex-col w-full">
          <div className="p-4">Loading...</div>
        </div>
      </div>
    );
  }

  const routes = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/student-dashboard", label: "Bảng điều khiển", icon: "🏆" },
    { href: "/learning-paths-demo", label: "Lộ trình học tập", icon: "🗺️" },
    { href: "/dashboard/labtwin", label: "LabTwin - Phòng thí nghiệm ảo", icon: "🧪" },
    { href: "/dashboard/learning", label: "Học tập", icon: "🎓" },
    { href: "/dashboard/courses", label: "My Courses", icon: "📚" },
    { href: "/dashboard/assignments", label: "Assignments", icon: "📝" },
    { href: "/dashboard/quizzes", label: "Quizzes", icon: "❓" },
    { href: "/dashboard/competition", label: "Cuộc thi", icon: "🏅" },
    { href: "/dashboard/stem", label: "STEM Projects", icon: "⚡" },
    { href: "/dashboard/notes", label: "Ghi chú", icon: "📝" },
    { href: "/dashboard/scrumboard", label: "Scrum Board", icon: "📋" },
    { href: "/dashboard/contacts", label: "Danh bạ", icon: "👥" },
    { href: "/dashboard/theme", label: "Theme Demo", icon: "🎨" },
    { href: "/search", label: "Browse", icon: "🔍" }
  ];

  return (
    <div className="h-full border-r flex flex-col overflow-y-auto bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">✈️</span>
          <h1 className="text-2xl font-bold text-primary">inPhysic</h1>
        </div>
      </div>
      <div className="flex flex-col w-full">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`
              flex items-center gap-x-2 text-sm font-medium pl-6 transition-colors hover:text-primary hover:bg-slate-300/20
              ${pathname === route.href ? "text-sky-700 bg-sky-200/20 border-r-2 border-sky-700" : "text-slate-500"}
            `}
          >
            <span className="text-lg">{route.icon}</span>
            <span className="py-4">{route.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};




