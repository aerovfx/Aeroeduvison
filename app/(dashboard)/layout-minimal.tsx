"use client"

import { useState, useEffect } from "react";

const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Simple Header */}
      <div className="h-16 bg-white border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="text-2xl">✈️</div>
          <h1 className="text-xl font-bold">inPhysic</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">Dashboard</div>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
            U
          </div>
        </div>
      </div>

      {/* Simple Sidebar */}
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-64 bg-white border-r">
          <div className="p-4 space-y-2">
            <a href="/dashboard" className="block p-2 rounded hover:bg-gray-100">🏠 Dashboard</a>
            <a href="/student-dashboard" className="block p-2 rounded hover:bg-gray-100">🏆 Bảng điều khiển</a>
            <a href="/learning-paths-demo" className="block p-2 rounded hover:bg-gray-100">🗺️ Lộ trình học tập</a>
            <a href="/dashboard/labtwin" className="block p-2 rounded bg-blue-100 text-blue-700 font-medium">🧪 LabTwin - Phòng thí nghiệm ảo</a>
            <a href="/dashboard/learning" className="block p-2 rounded hover:bg-gray-100">🎓 Học tập</a>
            <a href="/dashboard/courses" className="block p-2 rounded hover:bg-gray-100">📚 My Courses</a>
            <a href="/dashboard/assignments" className="block p-2 rounded hover:bg-gray-100">📝 Assignments</a>
            <a href="/dashboard/quizzes" className="block p-2 rounded hover:bg-gray-100">❓ Quizzes</a>
            <a href="/dashboard/competition" className="block p-2 rounded hover:bg-gray-100">🏅 Cuộc thi</a>
            <a href="/dashboard/stem" className="block p-2 rounded hover:bg-gray-100">⚡ STEM Projects</a>
            <a href="/dashboard/notes" className="block p-2 rounded hover:bg-gray-100">📝 Ghi chú</a>
            <a href="/dashboard/scrumboard" className="block p-2 rounded hover:bg-gray-100">📋 Scrum Board</a>
            <a href="/dashboard/contacts" className="block p-2 rounded hover:bg-gray-100">👥 Danh bạ</a>
            <a href="/dashboard/theme" className="block p-2 rounded hover:bg-gray-100">🎨 Theme Demo</a>
            <a href="/search" className="block p-2 rounded hover:bg-gray-100">🔍 Browse</a>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;




