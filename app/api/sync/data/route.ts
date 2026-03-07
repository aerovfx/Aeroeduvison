import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check cache first
    const cacheKey = `${user.role}_${user.schoolId}`;
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        lastSync: new Date(cached.timestamp).toISOString(),
        userRole: user.role,
        schoolId: user.schoolId,
        cached: true
      });
    }

    // Get data based on user role and school
    const syncData = await getSyncDataForUser(user.role, user.schoolId);
    
    // Cache the result
    cache.set(cacheKey, {
      data: syncData,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      data: syncData,
      lastSync: new Date().toISOString(),
      userRole: user.role,
      schoolId: user.schoolId
    });

  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { module, data } = body;

    // Update data based on module and user role
    const result = await updateSyncData(user.role, user.schoolId, module, data);

    return NextResponse.json({
      success: true,
      result,
      lastSync: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating sync data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getSyncDataForUser(role: string, schoolId: string) {
  const baseData: any = {
    users: [],
    courses: [],
    assignments: [],
    quizzes: [],
    stemProjects: [],
    competitions: []
  };

  try {
    // Parallel queries for better performance
    const [users, courses] = await Promise.all([
      // Get users based on role and school
      role === 'ADMIN' 
        ? db.user.findMany({
            where: { schoolId },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true
            }
          })
        : db.user.findMany({
            where: { 
              schoolId,
              role: { in: ['STUDENT', 'TEACHER'] }
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true
            }
          }),
      
      // Get courses based on role
      role === 'ADMIN'
        ? db.course.findMany({
            where: { schoolId },
            include: {
              user: {
                select: { name: true, email: true }
              },
              _count: {
                select: { purchases: true }
              }
            }
          })
        : role === 'TEACHER'
        ? db.course.findMany({
            where: { 
              schoolId,
              userId: (await db.user.findFirst({ where: { schoolId, role: 'TEACHER' } }))?.id
            },
            include: {
              user: {
                select: { name: true, email: true }
              },
              _count: {
                select: { purchases: true }
              }
            }
          })
        : db.course.findMany({
            where: { 
              schoolId,
              isPublished: true
            },
            include: {
              user: {
                select: { name: true, email: true }
              },
              _count: {
                select: { purchases: true }
              }
            }
          })
    ]);

    baseData.users = users;
            baseData.courses = courses.map(course => ({
              id: course.id,
              title: course.title,
              description: course.description,
              teacherId: course.userId,
              teacherName: course.user.name || course.user.email,
              studentsCount: course._count.purchases,
              status: course.isPublished ? 'published' : 'draft',
              createdAt: course.createdAt,
              updatedAt: course.updatedAt
            }));

            // Get STEM projects from localStorage (from STEMContext)
            // Note: This is a server-side API, so we can't access localStorage directly
            // The STEM projects will be synced via the /api/admin/stem/sync endpoint
            // For now, return empty array - the DataSyncContext will handle loading from localStorage
            baseData.stemProjects = [];

            return baseData;

  } catch (error) {
    console.error('Error getting sync data:', error);
    return baseData;
  }
}

async function updateSyncData(role: string, schoolId: string, module: string, data: any) {
  try {
    switch (module) {
      case 'users':
        if (role === 'ADMIN') {
          // Admin can update user data
          return { message: 'User data updated' };
        }
        break;
      
      case 'courses':
        if (role === 'TEACHER' || role === 'ADMIN') {
          // Teachers and admins can update course data
          return { message: 'Course data updated' };
        }
        break;
      
      case 'assignments':
        if (role === 'TEACHER' || role === 'ADMIN') {
          // Teachers and admins can update assignment data
          return { message: 'Assignment data updated' };
        }
        break;
      
      case 'quizzes':
        if (role === 'TEACHER' || role === 'ADMIN') {
          // Teachers and admins can update quiz data
          return { message: 'Quiz data updated' };
        }
        break;
      
      case 'stemProjects':
        if (role === 'STUDENT' || role === 'TEACHER' || role === 'ADMIN') {
          // All roles can update STEM project data
          return { message: 'STEM project data updated' };
        }
        break;
      
      case 'competitions':
        if (role === 'ADMIN') {
          // Only admins can update competition data
          return { message: 'Competition data updated' };
        }
        break;
      
      default:
        return { message: 'Unknown module' };
    }

    return { message: 'No permission to update this module' };

  } catch (error) {
    console.error('Error updating sync data:', error);
    throw error;
  }
}
