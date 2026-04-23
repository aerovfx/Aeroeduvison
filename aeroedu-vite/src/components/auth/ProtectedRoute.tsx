/**
 * ProtectedRoute — thay thế middleware.ts của Next.js
 *
 * Chặn unauthenticated users giống middleware.ts:
 *   if (!isAuthenticated) redirect('/auth/login')
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Đang load user (hydrate từ cookie) → hiện spinner
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--ai-page-bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[hsl(262,83%,58%)] animate-spin" />
            <div
              className="absolute inset-2 rounded-full border-2 border-transparent border-b-[hsl(175,80%,50%)] animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Chưa đăng nhập → redirect tới login, lưu lại intended URL
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
