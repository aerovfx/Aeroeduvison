/**
 * DashboardLayout — thay thế app/(dashboard)/layout.tsx
 * Bao gồm Sidebar + Navbar + main content area
 */
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

export function DashboardLayout() {
  return (
    <div className="h-screen flex overflow-hidden bg-[var(--ai-page-bg)]">
      {/* Sidebar (fixed height, no scroll) */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
