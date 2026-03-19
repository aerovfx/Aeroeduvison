/**
 * Transcript API - Real-time speech to text
 * Integrates with transcript-video project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// SONIOX API Configuration
const SONIOX_API_KEY = process.env.SONIOX_API_KEY;
const SONIOX_WS_URL = 'wss://api.soniox.com/transcribe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { audioData, language = 'vi' } = await request.json();

    if (!audioData) {
      return NextResponse.json(
        { error: 'No audio data provided' },
        { status: 400 }
      );
    }

    // Call Soniox API for transcription
    const transcript = await transcribeWithSoniox(audioData, language);

    return NextResponse.json({
      success: true,
      transcript,
      timestamp: new Date().toISOString(),
      userId: session.user.id,
    });
  } catch (error) {
    console.error('Transcript API error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

/**
 * Transcribe audio using Soniox API
 */
async function transcribeWithSoniox(audioData: string, language: string): Promise<string> {
  // Implementation using Soniox WebSocket API
  // This is a simplified version - full implementation would use WebSocket
  
  const response = await fetch('https://api.soniox.com/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SONIOX_API_KEY}`,
    },
    body: JSON.stringify({
      audio: audioData,
      language: language,
      enable_translation: true,
      target_language: 'vi',
    }),
  });

  if (!response.ok) {
    throw new Error('Soniox API error');
  }

  const data = await response.json();
  return data.transcript || '';
}
