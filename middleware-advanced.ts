import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Advanced middleware configuration
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/auth/signin',
      '/auth/signout',
      '/auth/error',
      '/auth/verify-request',
      '/auth/new-user',
      '/api/auth',
      '/api/health',
      '/api/test',
      '/_next',
      '/favicon.ico',
      '/public'
    ]

    // Check if route is public
    const isPublicRoute = publicRoutes.some(route => 
      pathname.startsWith(route) || pathname === route
    )

    // Allow public routes
    if (isPublicRoute) {
      return NextResponse.next()
    }

    // Redirect unauthenticated users to sign in
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Role-based access control
    const userRole = token.role as string
    const userId = token.id as string

    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Teacher routes
    if (pathname.startsWith('/teacher')) {
      if (!['ADMIN', 'TEACHER'].includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Student routes
    if (pathname.startsWith('/student')) {
      if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // API route protection
    if (pathname.startsWith('/api/')) {
      // Admin API routes
      if (pathname.startsWith('/api/admin')) {
        if (userRole !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Unauthorized - Admin access required' },
            { status: 403 }
          )
        }
      }

      // Teacher API routes
      if (pathname.startsWith('/api/teacher')) {
        if (!['ADMIN', 'TEACHER'].includes(userRole)) {
          return NextResponse.json(
            { error: 'Unauthorized - Teacher access required' },
            { status: 403 }
          )
        }
      }

      // AI Content Generator API
      if (pathname.startsWith('/api/ai-content')) {
        if (!['ADMIN', 'TEACHER'].includes(userRole)) {
          return NextResponse.json(
            { error: 'Unauthorized - Teacher access required' },
            { status: 403 }
          )
        }
      }
    }

    // Add security headers
    const response = NextResponse.next()
    
    // Security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
    
    response.headers.set('Content-Security-Policy', csp)

    // Add user info to headers for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-User-Role', userRole)
      response.headers.set('X-User-ID', userId)
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        
        // Public routes
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signout',
          '/auth/error',
          '/api/auth',
          '/api/health',
          '/_next',
          '/favicon.ico'
        ]

        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }

        // Require authentication for all other routes
        return !!token
      }
    }
  }
)

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// IP-based rate limiting
export function ipRateLimit(req: NextRequest): boolean {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
  return rateLimit(ip, 100, 15 * 60 * 1000) // 100 requests per 15 minutes per IP
}

// User-based rate limiting
export function userRateLimit(userId: string): boolean {
  return rateLimit(userId, 200, 15 * 60 * 1000) // 200 requests per 15 minutes per user
}
