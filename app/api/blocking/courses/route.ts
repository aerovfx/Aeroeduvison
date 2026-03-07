import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiLogger } from '@/lib/logging-simple';
import { CacheManager } from '@/lib/cache';
import { ErrorHandler, APIErrorResponse, AuthenticationError, AuthorizationError, NotFoundError } from '@/lib/error-handling';
import { MonitoringSystem, monitorPerformance } from '@/lib/monitoring';

/**
 * API Blocking: /api/blocking/courses
 * 
 * Client chờ full response sau khi xử lý xong
 * - Fetch tất cả courses từ database
 * - Xử lý data (transform, filter, sort)
 * - Trả về complete response
 * 
 * Use cases:
 * - Course list page cần full data
 * - Admin dashboard cần complete statistics
 * - Export functionality
 */

export async function GET(req: NextRequest) {
  const monitoring = MonitoringSystem.getInstance();
  const errorHandler = ErrorHandler.getInstance();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new AuthenticationError('Authentication required');
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user) {
      throw new NotFoundError('User', session.user.email);
    }

    // Check cache first
    const cacheKey = CacheManager.generateSchoolKey(user.schoolId, 'courses');
    const cachedData = await CacheManager.get(cacheKey);
    
    if (cachedData) {
      monitoring.recordCounter('cache.hits', 1, { endpoint: 'courses' });
      return NextResponse.json(cachedData);
    }

    monitoring.recordCounter('cache.misses', 1, { endpoint: 'courses' });

    // Blocking operation: Fetch all courses
    const startTime = Date.now();
    
    const courses = await db.course.findMany({
      where: { schoolId: user.schoolId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { name: true }
        },
        _count: {
          select: { chapters: true, attachments: true, purchases: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Blocking operation: Process and transform data
    const processedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      teacher: course.user,
      studentsCount: course._count.purchases,
      assignmentsCount: course._count.attachments,
      quizzesCount: course._count.chapters,
      status: course.isPublished ? 'published' : 'draft',
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      // Calculate additional metrics
      completionRate: course._count.purchases > 0 ? 
        Math.round((course._count.purchases / (course._count.purchases + 10)) * 100) : 0,
      difficulty: 'intermediate', // Default since not in schema
      category: course.category?.name || 'general',
      price: course.price || 0,
      imageUrl: course.imageUrl
    }));

    // Blocking operation: Calculate statistics
    const stats = {
      totalCourses: courses.length,
      activeCourses: courses.filter(c => c.isPublished).length,
      draftCourses: courses.filter(c => !c.isPublished).length,
      totalStudents: courses.reduce((sum, c) => sum + c._count.purchases, 0),
      totalAssignments: courses.reduce((sum, c) => sum + c._count.attachments, 0),
      totalQuizzes: courses.reduce((sum, c) => sum + c._count.chapters, 0),
      averageCompletionRate: processedCourses.length > 0 ? 
        Math.round(processedCourses.reduce((sum, c) => sum + c.completionRate, 0) / processedCourses.length) : 0
    };

    const processingTime = Date.now() - startTime;

    // Record performance metrics
    monitoring.recordTimer('api.courses.fetch_time', processingTime, { 
      schoolId: user.schoolId,
      coursesCount: courses.length.toString()
    });
    monitoring.recordGauge('api.courses.count', courses.length, { schoolId: user.schoolId });

    const response = {
      success: true,
      data: {
        courses: processedCourses,
        stats,
        metadata: {
          totalCount: courses.length,
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString()
        }
      }
    };

    // Cache the response
    await CacheManager.set(cacheKey, response, 300); // 5 minutes cache

    apiLogger.info('Blocking API: Courses fetched', {
      metadata: {
        userId: user.id,
        schoolId: user.schoolId,
        coursesCount: courses.length,
        processingTime: `${processingTime}ms`
      }
    });

    // Return complete response - client waits for this
    return NextResponse.json(response);

  } catch (error) {
    errorHandler.handle(error as Error, { endpoint: 'courses', method: 'GET' });
    return APIErrorResponse.create(error as Error, 500);
  }
}

export async function POST(req: NextRequest) {
  const monitoring = MonitoringSystem.getInstance();
  const errorHandler = ErrorHandler.getInstance();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new AuthenticationError('Authentication required');
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user) {
      throw new NotFoundError('User', session.user.email);
    }

    if (user.role !== 'TEACHER') {
      throw new AuthorizationError('Only teachers can create courses', 'courses', 'create');
    }

    const body = await req.json();
    const { title, description, category, price } = body;

    // Blocking operation: Create course
    const newCourse = await db.course.create({
      data: {
        title,
        description,
        price: price || 0,
        isPublished: false,
        userId: user.id,
        schoolId: user.schoolId
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Record metrics
    monitoring.recordCounter('api.courses.created', 1, { 
      schoolId: user.schoolId,
      teacherId: user.id
    });

    // Invalidate cache
    await CacheManager.invalidateSchoolCache(user.schoolId);

    apiLogger.info('Blocking API: Course created', {
      metadata: {
        userId: user.id,
        courseId: newCourse.id,
        courseTitle: newCourse.title
      }
    });

    // Return complete response
    return NextResponse.json({
      success: true,
      data: {
        course: {
          id: newCourse.id,
          title: newCourse.title,
          description: newCourse.description,
          teacher: newCourse.user,
          status: newCourse.isPublished ? 'published' : 'draft',
          createdAt: newCourse.createdAt,
          updatedAt: newCourse.updatedAt
        }
      }
    }, { status: 201 });

  } catch (error) {
    errorHandler.handle(error as Error, { endpoint: 'courses', method: 'POST' });
    return APIErrorResponse.create(error as Error, 500);
  }
}