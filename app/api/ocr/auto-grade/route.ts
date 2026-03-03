import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const OCR_BACKEND_URL = process.env.OCR_BACKEND_URL || 'http://localhost:8014';
const RUST_BACKEND_URL = process.env.RUST_BACKEND_URL || 'http://127.0.0.1:8090';
const USE_RUST_OCR_AUTO_GRADE_SERVICE = process.env.USE_RUST_OCR_AUTO_GRADE_SERVICE === 'true';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Vui lòng đăng nhập' },
        { status: 401 }
      );
    }

    const target = req.nextUrl.searchParams.get('target') || req.headers.get('x-strangler-target');
    const shouldUseRust =
      target === 'rust' || (target !== 'node' && USE_RUST_OCR_AUTO_GRADE_SERVICE);

    // Get form data from request
    const formData = await req.formData();
    const upstreamUrl = shouldUseRust
      ? `${RUST_BACKEND_URL}/api/ocr/auto-grade`
      : `${OCR_BACKEND_URL}/auto-grade`;

    const response = await fetch(upstreamUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Auto-grade backend error:', error);
      return NextResponse.json(
        {
          error: 'Auto-grading failed',
          details: error,
          backend: shouldUseRust ? 'rust' : 'node',
          strangler_target: shouldUseRust ? 'rust' : 'node'
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      ...result,
      backend: shouldUseRust ? 'rust' : 'node',
      strangler_target: shouldUseRust ? 'rust' : 'node'
    });

  } catch (error: any) {
    console.error('Auto-grade error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
