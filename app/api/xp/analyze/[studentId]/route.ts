/**
 * XP Analytics API
 * 
 * GET /api/xp/analyze/:studentId
 * Returns comprehensive XP analysis including capability, speed, and motivation signals
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { plgService } from '@/lib/plg/service';
import { xpAnalytics } from '@/lib/xp/analytics';

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
    
    console.log(`📊 [XP Analytics] Analyzing XP for student ${studentId}`);
    
    // Get PLG
    const plg = await plgService.getPLG(studentId);
    
    if (!plg) {
      return NextResponse.json(
        { error: 'PLG not found' },
        { status: 404 }
      );
    }
    
    // Analyze XP
    const xpSignal = xpAnalytics.analyzeXP(plg);
    
    console.log(`✅ [XP Analytics] Analysis complete:`, {
      level: xpSignal.level,
      capability: xpSignal.capability.overallScore.toFixed(1),
      speed: xpSignal.learningSpeed.xpPerHour.toFixed(1),
      motivation: xpSignal.motivation.score.toFixed(1),
      insights: xpSignal.aiInsights.length,
    });
    
    return NextResponse.json({
      success: true,
      data: xpSignal,
      message: `XP analysis complete. Level ${xpSignal.level}, ${xpSignal.aiInsights.length} insights generated.`,
    });
  } catch (error: any) {
    console.error('❌ [XP Analytics] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze XP' },
      { status: 500 }
    );
  }
}

