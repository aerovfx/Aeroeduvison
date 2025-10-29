"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain } from "lucide-react";

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
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <Brain className="w-6 h-6 text-gray-700" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x bg-clip-text text-transparent">
              AeroEdu
            </h1>
          </div>
        </div>
        <div className="flex flex-col w-full">
          <div className="p-4">Loading...</div>
        </div>
      </div>
    );
  }

  // AI-Driven Routes - aligned with sidebar-routes.tsx
  const routes = [
    { href: "/dashboard", label: "📊 Dashboard", icon: "🏠" },
    { href: "/learning-paths", label: "🗺️ Learning Path", icon: "🗺️" },
    { href: "/dashboard/analytics", label: "📈 Analytics", icon: "📊" },
    { href: "/ai-tutor", label: "🤖 AI Tutor", icon: "🤖" },
    { href: "/dashboard/emotion", label: "💝 Emotion Tracker", icon: "💝" },
    { href: "/dashboard/assignments", label: "📝 Assignments", icon: "📝" },
    { href: "/dashboard/achievements", label: "🏆 Achievements", icon: "🏆" },
    { href: "/dashboard/notifications", label: "🔔 Notifications", icon: "🔔" },
    { href: "/dashboard/labtwin", label: "🧪 LabTwin", icon: "🧪" },
    { href: "/dashboard/stem", label: "🚀 STEM", icon: "⚡" },
    { href: "/dashboard/notes", label: "📝 Notes", icon: "📝" },
    { href: "/dashboard/scrumboard", label: "📋 Scrum Board", icon: "📋" },
    { href: "/dashboard/contacts", label: "👥 Danh bạ", icon: "👥" },
  ];

  return (
    <>
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-x {
          animation: gradient-x 4s ease infinite;
        }
      `}</style>
      <div className="h-full border-r flex flex-col overflow-y-auto bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <Brain className="w-6 h-6 text-gray-700" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x bg-clip-text text-transparent">
            AeroEdu
          </h1>
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
    </>
  );
};




