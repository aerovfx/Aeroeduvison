'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: string | string[]
  fallbackPath?: string
  showLoader?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = '/auth/signin',
  showLoader = true 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'unauthenticated') {
      router.push(fallbackPath)
      return
    }

    if (session && requiredRole) {
      const userRole = session.user.role
      const hasAccess = Array.isArray(requiredRole) 
        ? requiredRole.includes(userRole)
        : userRole === requiredRole

      if (!hasAccess) {
        router.push('/dashboard') // Default fallback
        return
      }
    }
  }, [session, status, requiredRole, fallbackPath, router])

  // Show loading spinner while checking authentication
  if (status === 'loading' && showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (status === 'unauthenticated' || (session && requiredRole && !hasRequiredRole(session.user.role, requiredRole))) {
    return null
  }

  return <>{children}</>
}

// Helper function to check role access
function hasRequiredRole(userRole: string, requiredRole: string | string[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole)
  }
  return userRole === requiredRole
}

// Higher-order component for role-based access
export function withRole<T extends object>(
  Component: React.ComponentType<T>,
  requiredRole: string | string[],
  fallbackPath?: string
) {
  return function RoleProtectedComponent(props: T) {
    return (
      <ProtectedRoute requiredRole={requiredRole} fallbackPath={fallbackPath}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Hook for role checking
export function useRole() {
  const { data: session } = useSession()
  
  const hasRole = (role: string | string[]): boolean => {
    if (!session?.user?.role) return false
    
    if (Array.isArray(role)) {
      return role.includes(session.user.role)
    }
    return session.user.role === role
  }

  const hasAnyRole = (roles: string[]): boolean => {
    if (!session?.user?.role) return false
    return roles.includes(session.user.role)
  }

  const isAdmin = (): boolean => hasRole('ADMIN')
  const isTeacher = (): boolean => hasRole(['ADMIN', 'TEACHER'])
  const isStudent = (): boolean => hasRole(['ADMIN', 'TEACHER', 'STUDENT'])

  return {
    user: session?.user,
    role: session?.user?.role,
    hasRole,
    hasAnyRole,
    isAdmin,
    isTeacher,
    isStudent,
  }
}
