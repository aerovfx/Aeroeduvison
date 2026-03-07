import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Debug endpoint to check environment variables and baseUrl detection
 * 
 * Usage: GET /api/checkenv
 * 
 * This endpoint helps debug:
 * - NEXTAUTH_URL configuration
 * - Environment detection (Cloud Run, Vercel, etc.)
 * - Base URL detection logic
 */
export async function GET() {
  try {
    return NextResponse.json({
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
      K_SERVICE: process.env.K_SERVICE,
      VERCEL_URL: process.env.VERCEL_URL,
      // Check what getBaseUrl() returns
      detectedBaseUrl: (() => {
        if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
        if (process.env.K_SERVICE) return 'https://inphysic.com';
        if (process.env.NODE_ENV === 'production') return 'https://inphysic.com';
        return 'http://localhost:3000';
      })(),
      // Additional debug info
      host: process.env.HOST || 'not set',
      port: process.env.PORT || 'not set',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check environment',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

