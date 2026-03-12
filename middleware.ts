import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getDashboardUrl, hasRoutePermission, getFallbackUrl } from '@/lib/auth-redirect'

type CanaryTarget = "node" | "rust";
type StranglerRouteConfig = {
  rustBase: string;
  rustPath: string;
  directProxyEnabled: boolean;
  canaryKey: string;
  canaryEnvPrefix?: string;
};

const DEFAULT_CANARY_STEPS = [10, 25, 50, 100];
type CanaryState = {
  initialized: boolean;
  currentPercent: number;
  stepIndex: number;
  stepStartedAt: number;
  windowStartedAt: number;
  requestsInWindow: number;
  rustRoutedInWindow: number;
  nodeRoutedInWindow: number;
  lastHealthCheckAt: number;
  rustHealthy: boolean;
  rustHealthFailuresInWindow: number;
  lastDecisionLogAt: number;
};
const canaryStates = new Map<string, CanaryState>();

function getCanaryState(key: string): CanaryState {
  let state = canaryStates.get(key);
  if (!state) {
    state = {
      initialized: false,
      currentPercent: 0,
      stepIndex: 0,
      stepStartedAt: Date.now(),
      windowStartedAt: Date.now(),
      requestsInWindow: 0,
      rustRoutedInWindow: 0,
      nodeRoutedInWindow: 0,
      lastHealthCheckAt: 0,
      rustHealthy: true,
      rustHealthFailuresInWindow: 0,
      lastDecisionLogAt: 0,
    };
    canaryStates.set(key, state);
  }
  return state;
}

function getStranglerRouteConfig(pathname: string): StranglerRouteConfig | null {
  const rustVectorBase = process.env.RUST_VECTOR_SERVICE_URL || "http://127.0.0.1:8091";
  const rustBackendBase = process.env.RUST_BACKEND_URL || "http://127.0.0.1:8090";
  const rustAuthBase = process.env.RUST_AUTH_URL || "http://127.0.0.1:8092";
  const rustCourseBase = process.env.RUST_COURSE_URL || "http://127.0.0.1:8093";
  const rustAdminBase = process.env.RUST_ADMIN_URL || "http://127.0.0.1:8094";
  const rustAiBase = process.env.RUST_AI_URL || "http://127.0.0.1:8095";
  const rustStudentBase = process.env.RUST_STUDENT_URL || "http://127.0.0.1:8096";
  const rustStemBase = process.env.RUST_STEM_URL || "http://127.0.0.1:8097";
  const rustMediaBase = process.env.RUST_MEDIA_URL || "http://127.0.0.1:8098";

  const directVectorProxy = process.env.DIRECT_RUST_VECTOR_PROXY === "true";
  const directOcrGradingProxy = process.env.DIRECT_RUST_OCR_GRADING_PROXY === "true";
  const directOcrProcessProxy = process.env.DIRECT_RUST_OCR_PROCESS_PROXY === "true";
  const directLlmGradingProxy = process.env.DIRECT_RUST_LLM_GRADING_PROXY === "true";
  const directAuthProxy = process.env.DIRECT_RUST_AUTH_PROXY === "true";
  const directAdminProxy = process.env.DIRECT_RUST_ADMIN_PROXY === "true";
  const directCourseProxy = process.env.DIRECT_RUST_COURSE_PROXY === "true";
  const directAiProxy = process.env.DIRECT_RUST_AI_PROXY === "true";
  const directStudentProxy = process.env.DIRECT_RUST_STUDENT_PROXY === "true";
  const directStemProxy = process.env.DIRECT_RUST_STEM_PROXY === "true";
  const directMediaProxy = process.env.DIRECT_RUST_MEDIA_PROXY === "true";

  // === VECTOR SERVICE (8091) ===
  if (pathname === "/api/vector-similarity" || pathname === "/api/vector-similarity/cache") {
    return {
      rustBase: rustVectorBase,
      rustPath: pathname === "/api/vector-similarity" ? "/v1/vector-similarity" : "/v1/vector-similarity/cache",
      directProxyEnabled: directVectorProxy,
      canaryKey: "vector",
    };
  }

  // === AERO BACKEND (8090) - OCR & Grading ===
  if (pathname === "/api/ocr-grading") {
    return {
      rustBase: rustBackendBase,
      rustPath: "/api/ocr-grading",
      directProxyEnabled: directOcrGradingProxy,
      canaryKey: "ocr-grading",
    };
  }
  if (pathname === "/api/ocr-process") {
    return {
      rustBase: rustBackendBase,
      rustPath: "/api/ocr-process",
      directProxyEnabled: directOcrProcessProxy,
      canaryKey: "ocr-process",
    };
  }
  if (pathname === "/api/llm-grading") {
    return {
      rustBase: rustBackendBase,
      rustPath: "/api/llm-grading",
      directProxyEnabled: directLlmGradingProxy,
      canaryKey: "llm-grading",
      canaryEnvPrefix: "LLM_GRADING",
    };
  }

  // === AUTH SERVICE (8092) ===
  if (pathname.startsWith("/api/auth/")) {
    const authPathMap: Record<string, string> = {
      "/api/auth/login": "/api/auth/login",
      "/api/auth/register": "/api/auth/register",
      "/api/auth/2fa/setup": "/api/auth/2fa/setup",
      "/api/auth/2fa/verify": "/api/auth/2fa/verify",
      "/api/auth/2fa/disable": "/api/auth/2fa/disable",
      "/api/auth/forgot-password": "/api/auth/forgot-password",
      "/api/auth/reset-password": "/api/auth/reset-password",
      "/api/auth/verify": "/api/auth/verify",
    };
    const rustPath = authPathMap[pathname];
    if (rustPath) {
      return {
        rustBase: rustAuthBase,
        rustPath: rustPath,
        directProxyEnabled: directAuthProxy,
        canaryKey: "auth",
      };
    }
  }

  // === COURSE SERVICE (8093) ===
  if (pathname.startsWith("/api/courses")) {
    return {
      rustBase: rustCourseBase,
      rustPath: pathname.replace("/api/courses", "/api/courses"),
      directProxyEnabled: directCourseProxy,
      canaryKey: "courses",
    };
  }

  // === ADMIN SERVICE (8094) ===
  if (pathname.startsWith("/api/admin")) {
    return {
      rustBase: rustAdminBase,
      rustPath: pathname.replace("/api/admin", "/api/admin"),
      directProxyEnabled: directAdminProxy,
      canaryKey: "admin",
    };
  }
  if (pathname === "/api/webhook" || pathname === "/api/metrics" || pathname === "/api/health" || pathname === "/api/cache") {
    const pathMap: Record<string, string> = {
      "/api/webhook": "/api/webhook",
      "/api/metrics": "/api/metrics",
      "/api/health": "/api/health",
      "/api/cache": "/api/cache",
    };
    return {
      rustBase: rustAdminBase,
      rustPath: pathMap[pathname] || pathname,
      directProxyEnabled: directAdminProxy,
      canaryKey: "admin",
    };
  }

  // === AI SERVICE (8095) ===
  const aiPaths = [
    "/api/ai-chat", "/api/ai-tutor-chat", "/api/ai-generate-lesson",
    "/api/ai-grade-lesson", "/api/generate-lesson", "/api/generate-lesson-grok",
    "/api/generate-daily-plan", "/api/search",
  ];
  if (aiPaths.includes(pathname)) {
    return {
      rustBase: rustAiBase,
      rustPath: pathname,
      directProxyEnabled: directAiProxy,
      canaryKey: "ai",
    };
  }

  // === STUDENT SERVICE (8096) ===
  const studentPaths = ["/api/students", "/api/classes", "/api/learning-paths"];
  if (studentPaths.includes(pathname)) {
    return {
      rustBase: rustStudentBase,
      rustPath: pathname,
      directProxyEnabled: directStudentProxy,
      canaryKey: "student",
    };
  }

  // === STEM SERVICE (8097) ===
  const stemPaths = [
    "/api/physics-motion", "/api/motionsim", "/api/motion-sim",
    "/api/projectile", "/api/harmonic-motion", "/api/refraction",
    "/api/chemistry-lab", "/api/chemlab-3d", "/api/optics-lab",
    "/api/lab-completion",
  ];
  if (stemPaths.includes(pathname)) {
    return {
      rustBase: rustStemBase,
      rustPath: pathname,
      directProxyEnabled: directStemProxy,
      canaryKey: "stem",
    };
  }

  // === MEDIA SERVICE (8098) ===
  const mediaPaths = ["/api/documents", "/api/exam-matrices", "/api/upload", "/api/question-bank", "/api/image-signed-url"];
  if (mediaPaths.includes(pathname)) {
    return {
      rustBase: rustMediaBase,
      rustPath: pathname,
      directProxyEnabled: directMediaProxy,
      canaryKey: "media",
    };
  }

  // === UPDATE LEARNING PROGRESS (Student Service) ===
  if (pathname === "/api/update-learning-progress") {
    return {
      rustBase: rustStudentBase,
      rustPath: "/api/update-learning-progress",
      directProxyEnabled: directStudentProxy,
      canaryKey: "student",
    };
  }

  return null;
}

function getCanarySteps(raw?: string) {
  if (!raw) return DEFAULT_CANARY_STEPS;

  const parsed = raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.max(0, Math.min(100, Math.floor(n))))
    .sort((a, b) => a - b);

  return parsed.length > 0 ? Array.from(new Set(parsed)) : DEFAULT_CANARY_STEPS;
}

function initializeCanaryState(state: CanaryState, steps: number[], initialPercent: number) {
  if (state.initialized) return;
  const clamped = Math.max(0, Math.min(100, Math.floor(initialPercent)));
  const nearestIndex = steps.findIndex((s) => s >= clamped);
  state.stepIndex = nearestIndex === -1 ? steps.length - 1 : nearestIndex;
  state.currentPercent = steps[state.stepIndex];
  state.initialized = true;
  state.stepStartedAt = Date.now();
  state.windowStartedAt = Date.now();
}

async function checkRustHealth(state: CanaryState, rustBase: string, intervalMs: number) {
  const now = Date.now();
  if (now - state.lastHealthCheckAt < intervalMs) {
    return state.rustHealthy;
  }

  state.lastHealthCheckAt = now;
  try {
    const response = await fetch(`${rustBase}/health`, {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    state.rustHealthy = response.ok;
    if (!response.ok) {
      state.rustHealthFailuresInWindow += 1;
    }
  } catch {
    state.rustHealthy = false;
    state.rustHealthFailuresInWindow += 1;
  }
  return state.rustHealthy;
}

function maybePromoteCanary(
  state: CanaryState,
  autoEnabled: boolean,
  steps: number[],
  minRequests: number,
  minStepMinutes: number
) {
  if (!autoEnabled) return;
  const minStepMs = Math.max(1, minStepMinutes) * 60 * 1000;
  const now = Date.now();

  if (state.stepIndex >= steps.length - 1) return;
  if (now - state.stepStartedAt < minStepMs) return;
  if (state.requestsInWindow < minRequests) return;
  if (state.rustHealthFailuresInWindow > 0) return;

  state.stepIndex += 1;
  state.currentPercent = steps[state.stepIndex];
  state.stepStartedAt = now;
  state.windowStartedAt = now;
  state.requestsInWindow = 0;
  state.rustRoutedInWindow = 0;
  state.nodeRoutedInWindow = 0;
  state.rustHealthFailuresInWindow = 0;

  console.log(`[STRANGLER] Auto-promoted Rust canary to ${state.currentPercent}%`);
}

function recordCanaryDecision(state: CanaryState, target: CanaryTarget) {
  state.requestsInWindow += 1;
  if (target === "rust") {
    state.rustRoutedInWindow += 1;
  } else {
    state.nodeRoutedInWindow += 1;
  }

  const now = Date.now();
  const shouldLog = state.requestsInWindow % 100 === 0 || now - state.lastDecisionLogAt > 60000;
  if (shouldLog) {
    state.lastDecisionLogAt = now;
    console.log(
      `[STRANGLER] step=${state.currentPercent}% windowReq=${state.requestsInWindow} rust=${state.rustRoutedInWindow} node=${state.nodeRoutedInWindow} rustHealthy=${state.rustHealthy} healthFailures=${state.rustHealthFailuresInWindow}`
    );
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ===== STRANGLER CANARY PROXY FOR HEAVY API =====
  // Apply only on selected API routes before generic /api bypass.
  const stranglerRouteConfig = getStranglerRouteConfig(pathname);
  if (stranglerRouteConfig) {
    const { rustBase, rustPath, directProxyEnabled, canaryKey, canaryEnvPrefix } = stranglerRouteConfig;
    const state = getCanaryState(canaryKey);
    const useScopedCanaryConfig = canaryEnvPrefix === "LLM_GRADING";

    const canaryEnabled = useScopedCanaryConfig
      ? process.env.ENABLE_RUST_CANARY_LLM_GRADING_PROXY === "true"
      : process.env.ENABLE_RUST_CANARY_PROXY === "true";
    const autoRolloutEnabled = useScopedCanaryConfig
      ? process.env.ENABLE_RUST_CANARY_LLM_GRADING_AUTO_ROLLOUT === "true"
      : process.env.ENABLE_RUST_CANARY_AUTO_ROLLOUT === "true";
    const canaryPercentRaw = Number(process.env.RUST_CANARY_PERCENT || "0");
    const llmCanaryPercentRaw = Number(process.env.RUST_CANARY_LLM_GRADING_PERCENT || "0");
    const canaryPercent = Number.isFinite(canaryPercentRaw)
      ? Math.max(0, Math.min(100, Math.floor(canaryPercentRaw)))
      : 0;
    const llmCanaryPercent = Number.isFinite(llmCanaryPercentRaw)
      ? Math.max(0, Math.min(100, Math.floor(llmCanaryPercentRaw)))
      : 0;
    const initialPercent = useScopedCanaryConfig ? llmCanaryPercent : canaryPercent;
    const steps = getCanarySteps(
      useScopedCanaryConfig
        ? process.env.RUST_CANARY_LLM_GRADING_STEPS
        : process.env.RUST_CANARY_STEPS
    );
    initializeCanaryState(state, steps, initialPercent);
    const cookieName = useScopedCanaryConfig
      ? process.env.RUST_CANARY_LLM_GRADING_COOKIE_NAME || "rust_canary_llm_bucket"
      : process.env.RUST_CANARY_COOKIE_NAME || "rust_canary_bucket";
    const healthIntervalMs = Number(
      useScopedCanaryConfig
        ? process.env.RUST_CANARY_LLM_GRADING_HEALTHCHECK_INTERVAL_MS || "5000"
        : process.env.RUST_CANARY_HEALTHCHECK_INTERVAL_MS || "5000"
    );
    const disableRustWhenUnhealthy = useScopedCanaryConfig
      ? process.env.RUST_DISABLE_LLM_GRADING_ON_UNHEALTHY !== "false"
      : process.env.RUST_DISABLE_ON_UNHEALTHY !== "false";
    const minRequests = Number(
      useScopedCanaryConfig
        ? process.env.RUST_CANARY_LLM_GRADING_MIN_REQUESTS_PER_STEP || "200"
        : process.env.RUST_CANARY_MIN_REQUESTS_PER_STEP || "200"
    );
    const minStepMinutes = Number(
      useScopedCanaryConfig
        ? process.env.RUST_CANARY_LLM_GRADING_MIN_STEP_MINUTES || "10"
        : process.env.RUST_CANARY_MIN_STEP_MINUTES || "10"
    );

    // Force switch for testing/rollout controls.
    const targetOverride =
      request.headers.get("x-strangler-target") ||
      request.headers.get("x-canary-target") ||
      request.nextUrl.searchParams.get("target");

    if (targetOverride === "node") {
      return NextResponse.next();
    }

    const shouldForceRust = targetOverride === "rust";
    const shouldUseCanary = canaryEnabled || directProxyEnabled || initialPercent > 0 || shouldForceRust;

    if (!shouldUseCanary) {
      return NextResponse.next();
    }

    let bucket = Number(request.cookies.get(cookieName)?.value);
    if (!Number.isFinite(bucket) || bucket < 0 || bucket > 99) {
      bucket = Math.floor(Math.random() * 100);
    }

    const activePercent = autoRolloutEnabled ? state.currentPercent : initialPercent;
    await checkRustHealth(state, rustBase, healthIntervalMs);
    maybePromoteCanary(state, autoRolloutEnabled, steps, minRequests, minStepMinutes);

    const canRouteRustByPercent = directProxyEnabled || shouldForceRust || activePercent >= 100 || bucket < activePercent;
    const shouldRouteRust = disableRustWhenUnhealthy
      ? canRouteRustByPercent && state.rustHealthy
      : canRouteRustByPercent;

    if (!shouldRouteRust) {
      recordCanaryDecision(state, "node");
      const response = NextResponse.next();
      response.cookies.set(cookieName, String(bucket), {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production"
      });
      response.headers.set("x-strangler-target", "node");
      response.headers.set("x-strangler-bucket", String(bucket));
      response.headers.set("x-strangler-percent", String(activePercent));
      response.headers.set("x-strangler-rust-healthy", String(state.rustHealthy));
      return response;
    }

    recordCanaryDecision(state, "rust");
    const rewriteUrl = new URL(`${rustBase}${rustPath}`);
    rewriteUrl.search = request.nextUrl.search;

    const rewriteResponse = NextResponse.rewrite(rewriteUrl);
    rewriteResponse.cookies.set(cookieName, String(bucket), {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production"
    });
    rewriteResponse.headers.set("x-strangler-target", "rust");
    rewriteResponse.headers.set("x-strangler-bucket", String(bucket));
    rewriteResponse.headers.set("x-strangler-percent", String(activePercent));
    rewriteResponse.headers.set("x-strangler-rust-healthy", String(state.rustHealthy));
    return rewriteResponse;
  }

  // Allow static files immediately (before any auth checks)
  // This MUST be checked first to avoid any token fetching for static files
  if (
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/fonts/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/i)
  ) {
    return NextResponse.next()
  }

  // Get the token to check authentication status
  // Only fetch token if not a static file
  let token = null
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production"
    })
  } catch (error) {
    // If token fetch fails, continue without token (will redirect to login if needed)
    console.warn('[MIDDLEWARE] Token fetch failed:', error)
  }

  // Marketing/Public routes (only for non-authenticated users)
  const marketingRoutes = ["/", "/pricing", "/contact-sales"]
  const isMarketingRoute = marketingRoutes.includes(pathname)

  // Legal pages (always public)
  const legalRoutes = ["/terms", "/privacy", "/cookies"]
  const isLegalRoute = legalRoutes.includes(pathname)

  // Docs routes (always public - documentation should be accessible to everyone)
  const isDocsRoute = pathname.startsWith("/docs")

  // Auth routes
  const authRoutes = ["/auth/login", "/auth/signup", "/forgot-password", "/reset-password"]
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

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

  // ===== ALLOW PUBLIC ACCESS TO LEGAL PAGES & DOCS =====
  if (isLegalRoute || isDocsRoute) {
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
  const protectedRoutes = ['/admin', '/teacher', '/dashboard', '/learning-paths', '/ai-tutor', '/student', '/courses']
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
    // Rust canary proxy routes - all API routes
    '/api/vector-similarity',
    '/api/vector-similarity/cache',
    '/api/ocr-grading',
    '/api/ocr-process',
    '/api/llm-grading',
    '/api/auth/:path*',
    '/api/courses/:path*',
    '/api/admin/:path*',
    '/api/ai-chat',
    '/api/ai-tutor-chat',
    '/api/ai-generate-lesson',
    '/api/ai-grade-lesson',
    '/api/generate-lesson',
    '/api/generate-lesson-grok',
    '/api/generate-daily-plan',
    '/api/search',
    '/api/students',
    '/api/classes',
    '/api/learning-paths',
    '/api/physics-motion',
    '/api/motionsim',
    '/api/motion-sim',
    '/api/projectile',
    '/api/harmonic-motion',
    '/api/refraction',
    '/api/chemistry-lab',
    '/api/chemlab-3d',
    '/api/optics-lab',
    '/api/lab-completion',
    '/api/documents',
    '/api/exam-matrices',
    '/api/upload',
    '/api/question-bank',
    '/api/image-signed-url',
    '/api/webhook',
    '/api/metrics',
    '/api/health',
    '/api/cache',
    '/api/update-learning-progress',
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
