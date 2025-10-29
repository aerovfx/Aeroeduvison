import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getDashboardUrl, hasRoutePermission, getFallbackUrl } from '@/lib/auth-redirect'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the token to check authentication status
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: 'next-auth.session-token'
  })

  // Marketing/Public routes (only for non-authenticated users)
  const marketingRoutes = ["/", "/pricing", "/contact-sales"]
  const isMarketingRoute = marketingRoutes.includes(pathname)
  
  // Legal pages (always public)
  const legalRoutes = ["/terms", "/privacy", "/cookies"]
  const isLegalRoute = legalRoutes.includes(pathname)

  // Auth routes
  const authRoutes = ["/auth/login", "/auth/signup", "/forgot-password", "/reset-password"]
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // API routes (always allow)
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Test routes (allow in development)
  const testRoutes = [
    "/test", "/test-simple", "/test-db", "/test-nextauth",
    "/test-all", "/test-signup", "/test-form", "/test-s3-upload",
    "/test-gcs-video", "/test-auth"
  ]
  const isTestRoute = testRoutes.some(route => pathname.startsWith(route))
  if (isTestRoute && process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  // ===== REDIRECT AUTHENTICATED USERS FROM MARKETING PAGES =====
  if (token && (isMarketingRoute || isAuthRoute)) {
    console.log(`🔒 [MIDDLEWARE] Authenticated user trying to access ${pathname}, redirecting to dashboard`)
    
    // Use utility function for role-based redirect
    const dashboardUrl = getDashboardUrl(token.role as any)
    return NextResponse.redirect(new URL(dashboardUrl, request.url))
  }

  // ===== ALLOW PUBLIC ACCESS TO LEGAL PAGES =====
  if (isLegalRoute) {
    return NextResponse.next()
  }

  // ===== ALLOW UNAUTHENTICATED USERS TO MARKETING & AUTH PAGES =====
  if (!token && (isMarketingRoute || isAuthRoute)) {
    return NextResponse.next()
  }

  // ===== PROTECT ROUTES BASED ON ROLE =====
  if (token) {
    // Check if user has permission to access the current route
    const hasPermission = hasRoutePermission(token.role as any, pathname)
    
    if (!hasPermission) {
      console.log(`🚫 [MIDDLEWARE] User ${token.email} (${token.role}) doesn't have permission for ${pathname}`)
      const fallbackUrl = getFallbackUrl(token.role as any)
      return NextResponse.redirect(new URL(fallbackUrl, request.url))
    }
    
    console.log(`✅ [MIDDLEWARE] User ${token.email} (${token.role}) accessing ${pathname}`)
    return NextResponse.next()
  }
  
  // ===== PROTECT ALL AUTHENTICATED ROUTES =====
  const protectedRoutes = ['/admin', '/teacher', '/dashboard', '/learning-paths', '/ai-tutor', '/courses']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    console.log(`🚫 [MIDDLEWARE] Unauthenticated access to ${pathname}, redirecting to login`)
    return NextResponse.redirect(new URL('/auth/login?callbackUrl=' + encodeURIComponent(pathname), request.url))
  }
  
  // ===== DEFAULT: REQUIRE AUTH FOR ALL OTHER ROUTES =====
  if (!token) {
    console.log(`🚫 [MIDDLEWARE] Unauthenticated access to ${pathname}, redirecting to login`)
    return NextResponse.redirect(new URL('/auth/login?callbackUrl=' + encodeURIComponent(pathname), request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
 