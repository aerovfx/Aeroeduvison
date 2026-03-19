import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const UPLOAD_BASE_DIR = process.env.UPLOAD_BASE_DIR || join(process.cwd(), 'uploads/cameras');

/**
 * GET /api/camera/file/[...path]
 * Serve recorded video files securely
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await params;
    
    if (!path || path.length === 0) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }

    // Reconstruct file path
    const filePath = join(UPLOAD_BASE_DIR, ...path);

    // Security: Ensure path is within uploads directory
    const normalizedPath = join(filePath);
    if (!normalizedPath.startsWith(UPLOAD_BASE_DIR)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }

    // Check if file exists
    if (!existsSync(normalizedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Determine content type
    const ext = normalizedPath.split('.').pop()?.toLowerCase();
    const contentType = ext === 'mp4' 
      ? 'video/mp4' 
      : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : 'application/octet-stream';

    // Read file
    const fileBuffer = await readFile(normalizedPath);
    const body = new Uint8Array(fileBuffer);

    // Return with appropriate headers
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error: any) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to serve file' },
      { status: 500 }
    );
  }
}
