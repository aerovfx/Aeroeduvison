/**
 * DashboardLayout — thay thế app/(dashboard)/layout.tsx
 * Bao gồm Sidebar + Navbar + main content area
 *
 * Mobile: Sidebar ẩn mặc định, kích hoạt bằng nút hamburger ở Navbar.
 */
import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { AntiScreenshotWarning } from '@/components/common/AntiScreenshotWarning'
import LabShareFloating from '@/components/common/LabShareFloating'

export function DashboardLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const openSidebar  = useCallback(() => setMobileSidebarOpen(true),  [])
  const closeSidebar = useCallback(() => setMobileSidebarOpen(false), [])

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--ai-page-bg)]">
      {/* Sidebar — desktop: fixed column; mobile: slide-in drawer */}
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={closeSidebar} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={openSidebar} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Nút chia sẻ nổi cho các trang lab (IoT / Aura / Vẽ đồ thị / LabTwin) */}
      <LabShareFloating />

      {/* Anti-screenshot warning overlay */}
      <AntiScreenshotWarning />
    </div>
  )
}
