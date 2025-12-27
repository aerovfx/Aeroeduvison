/**
 * PLG - Update Skill API
 * 
 * POST /api/plg/:studentId/update-skill
 * Body: { skillId, masteryDelta, attempt?, practiced? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { plgService } from '@/lib/plg/service';

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
    
    // Only student themselves or teacher/admin can update
    if (session.user.id !== studentId && session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { skillId, masteryDelta, attempt, practiced } = body;
    
    if (!skillId) {
      return NextResponse.json(
        { error: 'skillId is required' },
        { status: 400 }
      );
    }
    
    console.log(`📊 [PLG] Updating skill ${skillId} for student ${studentId}`);
    
    const updatedSkill = await plgService.updateSkill(studentId, skillId, {
      masteryDelta,
      attempt,
      practiced,
    });
    
    return NextResponse.json({
      success: true,
      data: updatedSkill,
    });
  } catch (error: any) {
    console.error('❌ [PLG] Update skill error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update skill' },
      { status: 500 }
    );
  }
}

