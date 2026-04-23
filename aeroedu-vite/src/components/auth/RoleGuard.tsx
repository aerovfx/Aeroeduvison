/**
 * RoleGuard — kiểm tra role trước khi vào route
 * Thay thế logic hasRoutePermission() trong middleware.ts
 *
 * Dùng:
 *   <Route element={<RoleGuard roles={['ADMIN', 'TEACHER']} />}>
 *     <Route path="/admin/*" element={<AdminRoutes />} />
 *   </Route>
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentRole } from '@/hooks/useCurrentUser'
import type { UserRole } from '@/types'

interface RoleGuardProps {
  roles: UserRole[]
  redirectTo?: string
}

export function RoleGuard({ roles, redirectTo = '/dashboard' }: RoleGuardProps) {
  const currentRole = useCurrentRole()

  if (!currentRole || !roles.includes(currentRole)) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}

// Convenient named exports
export const AdminGuard = () => <RoleGuard roles={['ADMIN']} />
export const TeacherGuard = () => <RoleGuard roles={['TEACHER', 'ADMIN']} />
export const StudentGuard = () => <RoleGuard roles={['STUDENT']} />
