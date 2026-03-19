import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const BASE_DIR = join(process.cwd(), 'uploads', 'grading');

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

    const filePath = join(BASE_DIR, ...path);
    if (!filePath.startsWith(BASE_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp',
    };
    const contentType = mimeMap[ext || ''] || 'application/octet-stream';

    const buf = await readFile(filePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buf.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    console.error('[GRADING_FILE]', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
