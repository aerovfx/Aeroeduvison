/**
 * Security Middleware
 * Integrates PII detection, content filtering, rate limiting, and audit logging
 * Add to API routes for comprehensive security
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectPII, redactPII, sanitizeInput } from '@/lib/security/pii-detection';
import { filterContent } from '@/lib/security/content-filter';
import {
  enforceRateLimit,
  apiLimiter,
  authLimiter,
  gradingLimiter
} from '@/lib/security/rate-limiter';
import {
  logPIIDetected,
  logContentBlocked,
  logSecurityAlert
} from '@/lib/security/audit-logger';

export interface SecurityCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized: any;
}

/**
 * Run security checks on request body
 */
export async function runSecurityChecks(
  req: NextRequest,
  body: any,
  options: {
    checkPII?: boolean;
    checkContent?: boolean;
    checkRateLimit?: boolean;
    limiter?: any;
    blockedFields?: string[];
  } = {}
): Promise<SecurityCheckResult> {
  const {
    checkPII = true,
    checkContent = true,
    checkRateLimit = true,
    limiter = apiLimiter,
    blockedFields = []
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitized = { ...body };

  // Rate limiting check
  if (checkRateLimit) {
    const rateLimitError = enforceRateLimit(req, limiter);
    if (rateLimitError) {
      errors.push('Rate limit exceeded');
      return { isValid: false, errors, warnings, sanitized };
    }
  }

  // Check each field in body
  for (const [field, value] of Object.entries(body)) {
    if (typeof value !== 'string') continue;

    // Check if field is blocked
    if (blockedFields.includes(field)) {
      errors.push(`Field '${field}' is not allowed`);
      delete sanitized[field];
      continue;
    }

    // Sanitize input
    const sanitizedValue = sanitizeInput(value);
    sanitized[field] = sanitizedValue;

    // PII detection
    if (checkPII) {
      const piiDetected = detectPII(sanitizedValue);
      if (piiDetected.length > 0) {
        const piiTypes = [...new Set(piiDetected.map(p => p.type))];
        warnings.push(
          `PII detected in field '${field}': ${piiTypes.join(', ')}`
        );

        // Redact PII from sanitized value
        sanitized[field] = redactPII(sanitizedValue);

        // Log PII detection
        const userId = req.headers.get('x-user-id') || 'unknown';
        const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
        await logPIIDetected(userId, ipAddress, value, piiTypes.join(', '));
      }
    }

    // Content filtering
    if (checkContent) {
      const filterResult = filterContent(sanitizedValue);
      if (filterResult.isBlocked) {
        errors.push(
          `Field '${field}' contains blocked content: ${filterResult.categories.join(', ')}`
        );

        // Log blocked content
        const userId = req.headers.get('x-user-id') || 'unknown';
        const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
        await logContentBlocked(userId, ipAddress, filterResult.categories.join(', '));
      } else if (filterResult.warning) {
        warnings.push(
          `Field '${field}' may contain sensitive content: ${filterResult.categories.join(', ')}`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized
  };
}

/**
 * Get security middleware for route handler
 *
 * Usage:
 * export const middleware = getSecurityMiddleware({
 *   checkPII: true,
 *   checkContent: true,
 *   checkRateLimit: true
 * });
 *
 * export async function POST(req: NextRequest) {
 *   const result = await middleware(req);
 *   if (!result.isValid) {
 *     return result.response;
 *   }
 *   // Continue with handler
 * }
 */
export function getSecurityMiddleware(options: any) {
  return async (
    req: NextRequest
  ): Promise<{ isValid: boolean; response?: NextResponse; body?: any }> => {
    try {
      const body = await req.json();
      const result = await runSecurityChecks(req, body, options);

      if (!result.isValid) {
        const userId = req.headers.get('x-user-id') || 'unknown';
        const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

        await logSecurityAlert(userId, ipAddress, 'Security check failed', {
          errors: result.errors,
          endpoint: req.nextUrl.pathname
        });

        return {
          isValid: false,
          response: new NextResponse(
            JSON.stringify({
              success: false,
              error: 'Security validation failed',
              details: result.errors
            }),
            { status: 400 }
          )
        };
      }

      return {
        isValid: true,
        body: result.sanitized
      };
    } catch (error: any) {
      return {
        isValid: false,
        response: new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Security check error: ' + error.message
          }),
          { status: 400 }
        )
      };
    }
  };
}

/**
 * Decorator-style security check for API routes
 *
 * Usage:
 * export async function POST(req: NextRequest) {
 *   const body = await withSecurityCheck(req, endpoint);
 *   if (body instanceof NextResponse) return body; // Error
 *   // Handle body
 * }
 */
export async function withSecurityCheck(
  req: NextRequest,
  endpoint: string
): Promise<any | NextResponse> {
  try {
    const body = await req.json();

    const options: any = {};

    // Customize checks based on endpoint
    if (endpoint.includes('auth')) {
      // Auth endpoints: strict rate limiting, PII check
      options.checkContent = false;
      options.limiter = authLimiter;
    } else if (endpoint.includes('grading')) {
      // Grading: strict blocking, rate limiting
      options.checkPII = true;
      options.checkContent = true;
      options.limiter = gradingLimiter;
    }

    const result = await runSecurityChecks(req, body, options);

    if (!result.isValid) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Security validation failed',
          details: result.errors
        }),
        { status: 400 }
      );
    }

    return result.sanitized;
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Failed to validate request: ' + error.message
      }),
      { status: 400 }
    );
  }
}

/**
 * Export security headers for response
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}

/**
 * Create a secure response with headers
 */
export function createSecureResponse(
  data: any,
  status: number = 200
): NextResponse {
  const response = new NextResponse(JSON.stringify(data), { status });

  // Add security headers
  for (const [key, value] of Object.entries(getSecurityHeaders())) {
    response.headers.set(key, value);
  }

  return response;
}
