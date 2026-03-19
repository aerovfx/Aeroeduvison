import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const execPromise = promisify(exec);

const PYTHON_DETECTOR_PATH = process.env.PYTHON_DETECTOR_PATH || '/Users/pixibox/Aeroeduvison/python-simulations/mediapipe-object-detector/object_detector.py';
const UPLOAD_DIR = '/Users/pixibox/Aeroeduvison/uploads/mediapipe';

/**
 * POST /api/vision/object-detect
 * Detect objects in an uploaded image using MediaPipe
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const threshold = formData.get('threshold') || '0.5';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Save uploaded file
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = join(UPLOAD_DIR, fileName);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Run Python detector
    const command = `python3 "${PYTHON_DETECTOR_PATH}" --image "${filePath}" --threshold ${threshold} --json`;
    const { stdout, stderr } = await execPromise(command);
    
    const result = JSON.parse(stdout);

    // Clean up uploaded file (optional - keep for now)
    // await unlink(filePath);

    return NextResponse.json({
      success: true,
      ...result,
      original_file: fileName
    });

  } catch (error: any) {
    console.error('Object detection error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to detect objects',
        details: error.stderr?.toString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vision/object-detect
 * List recent detections
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List files in upload directory
    const { stdout } = await execPromise(`ls -t "${UPLOAD_DIR}" | head -20`);
    const files = stdout.trim().split('\n').filter(f => f);

    return NextResponse.json({
      success: true,
      files: files.map(f => ({
        name: f,
        url: `/api/vision/object-detect/file/${f}`
      }))
    });

  } catch (error: any) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}
