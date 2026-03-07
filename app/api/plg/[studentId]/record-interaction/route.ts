/**
 * PLG - Record Interaction API
 * 
 * POST /api/plg/:studentId/record-interaction
 * Body: InteractionSignals
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { plgService } from '@/lib/plg/service';
import { InteractionSignals } from '@/lib/plg/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { studentId } = await params;
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Only student themselves can record interactions
    if (session.user.id !== studentId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const signals: InteractionSignals = await request.json();
    
    console.log(`😊 [PLG] Recording interaction for student ${studentId}`);
    
    const emotion = await plgService.recordInteraction(studentId, signals);
    
    return NextResponse.json({
      success: true,
      data: {
        emotion,
        message: `Emotion inferred: ${emotion.primary} (${(emotion.intensity * 100).toFixed(0)}% intensity)`,
      },
    });
  } catch (error: any) {
    console.error('❌ [PLG] Record interaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record interaction' },
      { status: 500 }
    );
  }
}

