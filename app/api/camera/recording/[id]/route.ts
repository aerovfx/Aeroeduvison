import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const execPromise = promisify(exec);

const PYTHON_RECORDER_PATH = process.env.PYTHON_RECORDER_PATH || '/Users/pixibox/Aeroeduvison/python-simulations/camera-recorder/camera_recorder.py';
const UPLOAD_BASE_DIR = process.env.UPLOAD_BASE_DIR || '/uploads/cameras';

/**
 * POST /api/camera/recording/[id]/stop
 * Stop an active recording
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: recordingId } = params;

    // Get recording from database
    const recording = await prisma.cameraRecording.findUnique({
      where: { id: recordingId }
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Check permission
    if (session.user.role === 'TEACHER' && recording.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Stop Python recorder
    const command = `python3 "${PYTHON_RECORDER_PATH}" stop --camera-id "${recording.cameraId}"`;
    const { stdout } = await execPromise(command);
    const result = JSON.parse(stdout);

    if (!result.success) {
      // Even if Python recorder fails, update database
      console.error('Python recorder error:', result.error);
    }

    // Calculate duration and update database
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - recording.startTime.getTime()) / 1000);

    // Get file info
    const videoPath = join(UPLOAD_BASE_DIR, recording.videoUrl.replace('/api/camera/file/', ''));
    let fileSize = 0;
    
    if (existsSync(videoPath)) {
      const stats = statSync(videoPath);
      fileSize = stats.size;
    }

    // Update database
    const updatedRecording = await prisma.cameraRecording.update({
      where: { id: recordingId },
      data: {
        endTime,
        duration,
        fileSize,
        status: 'completed',
        metadata: {
          ...recording.metadata,
          end_time: result.end_time,
          file_size: fileSize
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Recording stopped successfully',
      recording: {
        ...updatedRecording,
        endTime,
        duration,
        fileSize
      }
    });

  } catch (error: any) {
    console.error('Error stopping recording:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stop recording' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/camera/recording/[id]
 * Get recording details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: recordingId } = params;

    const recording = await prisma.cameraRecording.findUnique({
      where: { id: recordingId }
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Check permission
    if (session.user.role === 'TEACHER' && recording.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ recording });

  } catch (error: any) {
    console.error('Error getting recording:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recording' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/camera/recording/[id]
 * Delete a recording
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: recordingId } = params;

    const recording = await prisma.cameraRecording.findUnique({
      where: { id: recordingId }
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Check permission (only teacher who owns it or admin)
    if (session.user.role === 'TEACHER' && recording.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Note: We're not deleting the actual file, just the database record
    // Add file deletion logic if needed
    await prisma.cameraRecording.delete({
      where: { id: recordingId }
    });

    return NextResponse.json({
      success: true,
      message: 'Recording deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting recording:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete recording' },
      { status: 500 }
    );
  }
}
