/**
 * PLG - Get Recommendations API
 * 
 * GET /api/plg/:studentId/recommendations
 * Query: ?maxSkills=5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { plgService } from '@/lib/plg/service';

export async function GET(
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
    
    // Check permission
    if (session.user.id !== studentId && session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const maxSkills = parseInt(searchParams.get('maxSkills') || '5');
    
    console.log(`🎯 [PLG] Getting recommendations for student ${studentId}`);
    
    const recommendations = await plgService.recommendNextSkills(studentId, maxSkills);
    const needsReview = await plgService.getSkillsNeedingReview(studentId);
    
    return NextResponse.json({
      success: true,
      data: {
        nextSkills: recommendations,
        needsReview,
        message: recommendations.length > 0 
          ? `Found ${recommendations.length} recommended skills`
          : 'No recommendations available yet',
      },
    });
  } catch (error: any) {
    console.error('❌ [PLG] Recommendations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

