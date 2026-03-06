/**
 * Utility functions for handling role-based redirects in NextAuth.js
 */

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

/**
 * Get the appropriate dashboard URL based on user role
 */
export function getDashboardUrl(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'TEACHER':
      return '/teacher/dashboard';
    case 'STUDENT':
    default:
      return '/dashboard';
  }
}

/**
 * Get the appropriate redirect URL based on user role and callback URL
 */
export function getRedirectUrl(role: UserRole, callbackUrl?: string | null): string {
  // If callbackUrl is provided and it's a valid path, use it
  if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('/auth/')) {
    return callbackUrl;
  }
  
  // Otherwise, redirect to role-based dashboard
  return getDashboardUrl(role);
}

/**
 * Check if a user has permission to access a specific route
 */
export function hasRoutePermission(role: UserRole, pathname: string): boolean {
  // Admin can access everything
  if (role === 'ADMIN') {
    return true;
  }
  
  // Teacher can access teacher routes and dashboard
  if (role === 'TEACHER') {
    return pathname.startsWith('/teacher') || 
           pathname.startsWith('/dashboard') ||
           pathname.startsWith('/learning-paths') ||
           pathname.startsWith('/ai-tutor') ||
           pathname.startsWith('/docs');
  }
  
  // Student can access student routes
  if (role === 'STUDENT') {
    return pathname.startsWith('/dashboard') ||
           pathname.startsWith('/learning-paths') ||
           pathname.startsWith('/ai-tutor') ||
           pathname.startsWith('/courses') ||
           pathname.startsWith('/docs');
  }
  
  return false;
}

/**
 * Get the fallback URL when user doesn't have permission
 */
export function getFallbackUrl(role: UserRole): string {
  return getDashboardUrl(role);
}

/**
 * Client-side redirect function for use in components
 */
export function redirectToDashboard(role: UserRole, router: any): void {
  const url = getDashboardUrl(role);
  router.push(url);
}

/**
 * Server-side redirect function for use in getServerSideProps
 */
export function getServerSideRedirect(role: UserRole, callbackUrl?: string) {
  const destination = getRedirectUrl(role, callbackUrl);
  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
}
