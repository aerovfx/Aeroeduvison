import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiLogger } from '@/lib/logging-simple';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { stemProjects } = body;

    if (!stemProjects || !Array.isArray(stemProjects)) {
      return NextResponse.json(
        { error: 'STEM projects array is required' },
        { status: 400 }
      );
    }

    // Process and validate STEM projects
    const processedProjects = stemProjects.map((project: any, index: number) => ({
      id: project.id || `stem_${Date.now()}_${index}`,
      title: project.title || `STEM Project ${index + 1}`,
      studentId: project.studentId || `student_${index + 1}`,
      studentName: project.studentName || project.teamMembers?.[0]?.name || `Student ${index + 1}`,
      status: project.status === 'completed' ? 'completed' : 
              project.status === 'in-progress' ? 'in-progress' : 'review',
      progress: Math.min(100, Math.max(0, project.progress || 0)),
      milestones: project.milestones?.length || 6,
      completedMilestones: project.milestones?.filter((m: any) => m.status === 'completed')?.length || 0,
      createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
      updatedAt: new Date()
    }));

    // TODO: Save to database when STEMProject model is implemented
    // For now, just log the processed projects
    apiLogger.info('Admin synced STEM projects from localStorage', {
      metadata: {
        adminId: admin.id,
        schoolId: admin.schoolId,
        originalCount: stemProjects.length,
        processedCount: processedProjects.length,
        projects: processedProjects.map(p => ({
          id: p.id,
          title: p.title,
          studentName: p.studentName,
          status: p.status,
          progress: p.progress
        }))
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `${processedProjects.length} STEM projects synced from localStorage`,
      syncedProjects: processedProjects.length,
      projects: processedProjects
    });

  } catch (error) {
    apiLogger.error('Error syncing STEM projects from localStorage', {
      metadata: { errorMessage: (error as Error).message }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to sync STEM projects from localStorage' },
      { status: 500 }
    );
  }
}
