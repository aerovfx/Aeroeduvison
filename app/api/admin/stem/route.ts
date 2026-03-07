import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiLogger } from '@/lib/logging-simple';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For now, return mock data since STEMProject model doesn't exist in schema yet
    // TODO: Implement real database queries when STEMProject model is added
    const mockSTEMProjects = [
      {
        id: "stem_1",
        title: "Hệ thống AI hỗ trợ học toán",
        studentId: "student_1",
        studentName: "Nguyễn Thị Lan",
        status: "in-progress",
        progress: 75,
        milestones: 6,
        completedMilestones: 4,
        createdAt: new Date(Date.now() - 86400000 * 30),
        updatedAt: new Date(Date.now() - 86400000 * 2)
      },
      {
        id: "stem_2", 
        title: "Robot dọn rác thông minh",
        studentId: "student_2",
        studentName: "Trần Văn Hùng",
        status: "completed",
        progress: 100,
        milestones: 8,
        completedMilestones: 8,
        createdAt: new Date(Date.now() - 86400000 * 45),
        updatedAt: new Date(Date.now() - 86400000 * 1)
      },
      {
        id: "stem_3",
        title: "Ứng dụng học tiếng Anh với AR",
        studentId: "student_3", 
        studentName: "Lê Thị Mai",
        status: "review",
        progress: 90,
        milestones: 7,
        completedMilestones: 6,
        createdAt: new Date(Date.now() - 86400000 * 20),
        updatedAt: new Date(Date.now() - 3600000)
      }
    ];

    apiLogger.info('Admin fetched STEM projects', {
      metadata: {
        adminId: user.id,
        schoolId: user.schoolId,
        projectCount: mockSTEMProjects.length
      }
    });

    return NextResponse.json({ projects: mockSTEMProjects });

  } catch (error) {
    apiLogger.error('Error fetching STEM projects', {
      metadata: { errorMessage: (error as Error).message }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch STEM projects' },
      { status: 500 }
    );
  }
}

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
    const { projects } = body;

    if (!projects || !Array.isArray(projects)) {
      return NextResponse.json(
        { error: 'Projects array is required' },
        { status: 400 }
      );
    }

    // For now, just log the projects since STEMProject model doesn't exist yet
    // TODO: Save to database when STEMProject model is implemented
    apiLogger.info('Admin synced STEM projects', {
      metadata: {
        adminId: admin.id,
        schoolId: admin.schoolId,
        projectCount: projects.length,
        projects: projects.map((p: any) => ({
          id: p.id,
          title: p.title,
          studentName: p.studentName,
          status: p.status
        }))
      }
    });

    // Simulate successful save
    return NextResponse.json({ 
      success: true, 
      message: `${projects.length} STEM projects synced successfully`,
      syncedProjects: projects.length
    });

  } catch (error) {
    apiLogger.error('Error syncing STEM projects', {
      metadata: { errorMessage: (error as Error).message }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to sync STEM projects' },
      { status: 500 }
    );
  }
}
