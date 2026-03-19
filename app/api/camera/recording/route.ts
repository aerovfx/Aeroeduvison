import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const PYTHON_RECORDER_PATH = process.env.PYTHON_RECORDER_PATH || '/Users/pixibox/Aeroeduvison/python-simulations/camera-recorder/camera_recorder.py';
const UPLOAD_BASE_DIR = process.env.UPLOAD_BASE_DIR || '/uploads/cameras';

/**
 * POST /api/camera/recording/start
 * Start recording a camera stream
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cameraId, cameraName, rtspUrl, classId } = body;

    if (!cameraId || !cameraName || !rtspUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: cameraId, cameraName, rtspUrl' },
        { status: 400 }
      );
    }

    // Start Python recorder
    const command = `python3 "${PYTHON_RECORDER_PATH}" start ` +
      `--camera-id "${cameraId}" ` +
      `--camera-name "${cameraName}" ` +
      `--rtsp-url "${rtspUrl}" ` +
      `--teacher-id "${session.user.id}"` +
      (classId ? ` --class-id "${classId}"` : '');

    const { stdout, stderr } = await execPromise(command);
    const result = JSON.parse(stdout);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to start recording' },
        { status: 500 }
      );
    }

    // Save to database (skip if model not in Prisma client — run `npx prisma generate`)
    const createDelegate = (prisma as any).cameraRecording;
    if (!createDelegate?.create) {
      return NextResponse.json(
        { error: 'Recording service unavailable. Run: npx prisma generate' },
        { status: 503 }
      );
    }
    const recording = await createDelegate.create({
      data: {
        cameraId,
        cameraName,
        teacherId: session.user.id,
        classId: classId || null,
        startTime: new Date(result.start_time),
        videoUrl: result.video_url,
        status: 'recording',
        metadata: {
          rtspUrl,
          output_path: result.output_path
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Recording started successfully',
      recording: {
        id: recording.id,
        cameraId: recording.cameraId,
        cameraName: recording.cameraName,
        startTime: recording.startTime,
        status: recording.status,
        videoUrl: recording.videoUrl
      }
    });

  } catch (error: any) {
    console.error('Error starting recording:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start recording' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/camera/recording
 * List recordings with optional filters
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('cameraId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {};
    
    // Teachers can only see their own recordings
    if (session.user.role === 'TEACHER') {
      where.teacherId = session.user.id;
    }
    
    if (cameraId) where.cameraId = cameraId;
    if (classId) where.classId = classId;
    if (status) where.status = status;

    const delegate = (prisma as any).cameraRecording;
    if (!delegate?.findMany) {
      return NextResponse.json({ recordings: [], total: 0 });
    }

    const recordings = await delegate.findMany({
      where,
      orderBy: [{ startTime: 'desc' }],
      take: limit,
      select: {
        id: true,
        cameraId: true,
        cameraName: true,
        teacherId: true,
        classId: true,
        startTime: true,
        endTime: true,
        duration: true,
        videoUrl: true,
        thumbnailUrl: true,
        fileSize: true,
        status: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      recordings,
      total: recordings.length
    });

  } catch (error: any) {
    console.error('Error listing recordings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list recordings' },
      { status: 500 }
    );
  }
}
