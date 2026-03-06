/**
 * Personal Learning Graph API
 * 
 * GET  /api/plg/:studentId - Get student's PLG
 * POST /api/plg/:studentId - Create/Update PLG
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
    
    // Get PLG
    let plg = await plgService.getPLG(studentId);
    
    // Create if doesn't exist
    if (!plg) {
      console.log(`📊 [PLG] Creating new PLG for student ${studentId}`);
      plg = await plgService.createPLG(studentId);
    }
    
    return NextResponse.json({
      success: true,
      data: plg,
    });
  } catch (error: any) {
    console.error('❌ [PLG] Get error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get PLG' },
      { status: 500 }
    );
  }
}

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
    
    // Check permission
    if (session.user.id !== studentId && session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    console.log(`📊 [PLG] Creating PLG for student ${studentId}`);
    const plg = await plgService.createPLG(studentId);
    
    return NextResponse.json({
      success: true,
      data: plg,
    });
  } catch (error: any) {
    console.error('❌ [PLG] Create error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PLG' },
      { status: 500 }
    );
  }
}

