import { NextRequest, NextResponse } from 'next/server';

// PaddleOCR server endpoint
const OCR_SERVER_URL = process.env.OCR_SERVER_URL || 'http://localhost:8001';
const RUST_BACKEND_URL = process.env.RUST_BACKEND_URL || 'http://127.0.0.1:8090';
const USE_RUST_OCR_PROCESS_SERVICE = process.env.USE_RUST_OCR_PROCESS_SERVICE === 'true';

export async function POST(req: NextRequest) {
  try {
    const target = req.nextUrl.searchParams.get('target') || req.headers.get('x-strangler-target');
    const shouldUseRust =
      target === 'rust' || (target !== 'node' && USE_RUST_OCR_PROCESS_SERVICE);
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image (JPG, PNG)' },
        { status: 400 }
      );
    }

    console.log(`🔍 Processing OCR for: ${file.name} (${file.size} bytes)`);

    try {
      // Forward to Python PaddleOCR service
      const ocrFormData = new FormData();
      ocrFormData.append('file', file);

      const upstreamUrl = shouldUseRust
        ? `${RUST_BACKEND_URL}/api/ocr-process`
        : `${OCR_SERVER_URL}/ocr`;
      const ocrResponse = await fetch(upstreamUrl, {
        method: 'POST',
        body: ocrFormData
      });

      if (!ocrResponse.ok) {
        throw new Error(`OCR server error: ${ocrResponse.statusText}`);
      }

      const ocrResult = await ocrResponse.json();

      if (shouldUseRust) {
        return NextResponse.json({
          ...ocrResult,
          backend: 'rust',
          strangler_target: 'rust'
        });
      }
      
      console.log(`✅ OCR completed: ${ocrResult.total_lines} lines, confidence: ${(ocrResult.confidence * 100).toFixed(1)}%`);

      return NextResponse.json({
        success: true,
        data: {
          text: ocrResult.text,
          lines: ocrResult.lines,
          confidence: ocrResult.confidence,
          boxes: ocrResult.boxes,
          total_lines: ocrResult.total_lines,
          filename: file.name
        },
        backend: shouldUseRust ? 'rust' : 'node',
        strangler_target: shouldUseRust ? 'rust' : 'node'
      });

    } catch (ocrError: any) {
      console.error('PaddleOCR service error:', ocrError.message);
      
      // DO NOT use fallback simulation - return error instead
      // This prevents wrong OCR text from being saved to documents
      console.error('❌ OCR service not available - returning error instead of simulation');
      
      return NextResponse.json(
        { 
          error: 'OCR service không khả dụng. Vui lòng đảm bảo OCR service đang chạy.',
          details: ocrError.message,
          serviceUrl: shouldUseRust ? RUST_BACKEND_URL : OCR_SERVER_URL,
          backend: shouldUseRust ? 'rust' : 'node',
          strangler_target: shouldUseRust ? 'rust' : 'node'
        },
        { status: 503 } // Service Unavailable
      );
    }

  } catch (error: any) {
    console.error('Error in OCR processing:', error);
    return NextResponse.json(
      { 
        error: 'Error processing OCR request',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
