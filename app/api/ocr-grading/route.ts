import { NextRequest, NextResponse } from 'next/server';

const OCR_GRADING_BACKEND_URL = process.env.OCR_GRADING_BACKEND_URL || 'http://localhost:8012';
const RUST_BACKEND_URL = process.env.RUST_BACKEND_URL || 'http://127.0.0.1:8090';
const USE_RUST_OCR_GRADING_SERVICE = process.env.USE_RUST_OCR_GRADING_SERVICE === 'true';

export async function POST(request: NextRequest) {
  try {
    const target = request.nextUrl.searchParams.get('target') || request.headers.get('x-strangler-target');
    const shouldUseRust = target === 'rust' || (target !== 'node' && USE_RUST_OCR_GRADING_SERVICE);

    if (shouldUseRust) {
      const rawBody = await request.text();
      const rustResponse = await fetch(`${RUST_BACKEND_URL}/api/ocr-grading`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: rawBody,
        signal: AbortSignal.timeout(8_000),
      });

      const rustData = await rustResponse.json().catch(() => ({}));
      if (!rustResponse.ok) {
        return NextResponse.json(
          {
            ...rustData,
            backend: 'rust',
            strangler_target: 'rust',
          },
          { status: rustResponse.status }
        );
      }

      return NextResponse.json({
        ...rustData,
        backend: 'rust',
        strangler_target: 'rust',
      });
    }

    const body = await request.json();
    
    const response = await fetch(`${OCR_GRADING_BACKEND_URL}/api/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      ...data,
      backend: 'node',
      strangler_target: 'node',
    });
  } catch (error) {
    console.error('OCR Grading API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Backend not available',
        message: 'OCR Grading backend is not running on port 8012'
      },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const target = request.nextUrl.searchParams.get('target') || request.headers.get('x-strangler-target');
    const shouldUseRust = target === 'rust' || (target !== 'node' && USE_RUST_OCR_GRADING_SERVICE);

    if (shouldUseRust) {
      const rustResponse = await fetch(`${RUST_BACKEND_URL}/api/ocr-grading`, {
        signal: AbortSignal.timeout(8_000),
      });
      const rustData = await rustResponse.json().catch(() => ({}));
      if (!rustResponse.ok) {
        return NextResponse.json(
          {
            ...rustData,
            backend: 'rust',
            strangler_target: 'rust',
          },
          { status: rustResponse.status }
        );
      }
      return NextResponse.json({
        ...rustData,
        backend: 'rust',
        strangler_target: 'rust',
      });
    }

    const response = await fetch(`${OCR_GRADING_BACKEND_URL}/api/health`);
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      ...data,
      backend: 'node',
      strangler_target: 'node',
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Backend not available',
        message: 'OCR Grading backend is not running on port 8012'
      },
      { status: 503 }
    );
  }
}
