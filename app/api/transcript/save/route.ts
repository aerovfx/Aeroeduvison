/**
 * Save Transcript API
 * Saves transcript to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createTranscriptRecord, TranscriptType } from '@/lib/transcript/transcript-repository';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      transcript,
      summary,
      type,
      title,
      duration
    } = await request.json();

    const normalizedTitle = String(title || "").trim()

    if (!transcript || !type || !normalizedTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type !== "lecture" && type !== "meeting") {
      return NextResponse.json(
        { error: 'Invalid type. Expected "lecture" or "meeting"' },
        { status: 400 }
      );
    }

    const savedTranscript = await createTranscriptRecord({
      userId: session.user.id,
      type: type as TranscriptType,
      title: normalizedTitle,
      transcript: String(transcript),
      summary: summary ? String(summary) : '',
      duration: Number.isFinite(duration) ? Number(duration) : 0,
    });

    return NextResponse.json({
      success: true,
      data: savedTranscript,
    });
  } catch (error) {
    console.error('Save transcript error:', error);
    return NextResponse.json(
      { error: 'Failed to save transcript' },
      { status: 500 }
    );
  }
}
