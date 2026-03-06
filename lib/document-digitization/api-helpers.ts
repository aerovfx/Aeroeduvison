/**
 * API Helpers for Document Digitization
 * 
 * Standardized API responses and utilities
 */

import { NextResponse } from "next/server"

export interface StandardAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
    executionTime?: number
  }
}

export function createSuccessResponse<T>(
  data: T,
  meta?: { executionTime?: number; requestId?: string }
): NextResponse<StandardAPIResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  })
}

export function createErrorResponse(
  error: {
    code: string
    message: string
    details?: any
  },
  status: number = 500,
  meta?: { requestId?: string }
): NextResponse<StandardAPIResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  )
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PROCESSING_ERROR: "PROCESSING_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const
