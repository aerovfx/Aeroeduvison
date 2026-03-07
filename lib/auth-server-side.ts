/**
 * Example getServerSideProps implementations for role-based redirects
 * These can be used in pages that need server-side authentication checks
 */

import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getServerSideRedirect, hasRoutePermission } from '@/lib/auth-redirect'

// Example 1: Protect a page and redirect based on role
export const getServerSidePropsWithAuth: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  // If not authenticated, redirect to login
  if (!session) {
    return {
      redirect: {
        destination: `/auth/login?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    }
  }
  
  // Check if user has permission for this route
  if (!hasRoutePermission(session.user.role as any, context.resolvedUrl)) {
    return getServerSideRedirect(session.user.role as any)
  }
  
  // User is authenticated and has permission
  return {
    props: {
      session,
    },
  }
}

// Example 2: Admin-only page
export const getServerSidePropsAdminOnly: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session) {
    return {
      redirect: {
        destination: `/auth/login?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    }
  }
  
  if (session.user.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }
  
  return {
    props: {
      session,
    },
  }
}

// Example 3: Teacher or Admin only page
export const getServerSidePropsTeacherOrAdmin: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session) {
    return {
      redirect: {
        destination: `/auth/login?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    }
  }
  
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }
  
  return {
    props: {
      session,
    },
  }
}

// Example 4: Public page that shows different content based on role
export const getServerSidePropsPublicWithRole: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  return {
    props: {
      session: session || null,
    },
  }
}

// Example usage in a page component:
/*
// pages/admin/dashboard.tsx
import { getServerSidePropsAdminOnly } from '@/lib/auth-server-side'

export const getServerSideProps = getServerSidePropsAdminOnly

export default function AdminDashboard({ session }: { session: Session }) {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {session.user.name}!</p>
    </div>
  )
}
*/

// Example usage with custom logic:
/*
// pages/teacher/courses.tsx
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session) {
    return {
      redirect: {
        destination: `/auth/login?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    }
  }
  
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }
  
  // Fetch teacher-specific data
  const courses = await fetchTeacherCourses(session.user.id)
  
  return {
    props: {
      session,
      courses,
    },
  }
}
*/
