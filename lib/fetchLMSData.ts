import { db } from './db';
import { apiLogger } from './logging-simple';

/**
 * fetchLMSData.ts - Hàm fetch data chung (DB/Prisma)
 * 
 * Centralized data fetching functions for LMS
 * - Reusable database queries
 * - Consistent error handling
 * - Performance optimization
 * - Type safety
 */

// Types
export interface CourseData {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  studentsCount: number;
  assignmentsCount: number;
  quizzesCount: number;
  status: 'published' | 'draft' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentData {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  dueDate: Date;
  submissionsCount: number;
  status: 'active' | 'completed' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizData {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  attemptsCount: number;
  averageScore: number;
  status: 'active' | 'completed' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

export interface StatsData {
  totalCourses: number;
  totalUsers: number;
  totalAssignments: number;
  totalQuizzes: number;
  activeUsers: number;
  completionRate: number;
  averageScore: number;
}

// Course fetching functions
export async function fetchCourses(schoolId: string, options?: {
  limit?: number;
  status?: string;
  teacherId?: string;
}): Promise<CourseData[]> {
  try {
    const courses = await db.course.findMany({
      where: {
        schoolId,
        ...(options?.status && { status: options.status as any }),
        ...(options?.teacherId && { teacherId: options.teacherId })
      },
      include: {
        teacher: { select: { name: true, email: true } },
        _count: { select: { students: true, assignments: true, quizzes: true } }
      },
      orderBy: { createdAt: 'desc' },
      ...(options?.limit && { take: options.limit })
    });

    return courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      teacherId: course.teacherId,
      teacherName: course.teacher.name || 'Unknown',
      studentsCount: course._count.students,
      assignmentsCount: course._count.assignments,
      quizzesCount: course._count.quizzes,
      status: course.status as 'published' | 'draft' | 'archived',
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    }));

  } catch (error) {
    apiLogger.error('Error fetching courses', {
      metadata: { schoolId, options, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}

export async function fetchCourseById(courseId: string, schoolId: string): Promise<CourseData | null> {
  try {
    const course = await db.course.findFirst({
      where: { id: courseId, schoolId },
      include: {
        teacher: { select: { name: true, email: true } },
        _count: { select: { students: true, assignments: true, quizzes: true } }
      }
    });

    if (!course) return null;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      teacherId: course.teacherId,
      teacherName: course.teacher.name || 'Unknown',
      studentsCount: course._count.students,
      assignmentsCount: course._count.assignments,
      quizzesCount: course._count.quizzes,
      status: course.status as 'published' | 'draft' | 'archived',
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    };

  } catch (error) {
    apiLogger.error('Error fetching course by ID', {
      metadata: { courseId, schoolId, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}

// User fetching functions
export async function fetchUsers(schoolId: string, options?: {
  limit?: number;
  role?: string;
  status?: string;
}): Promise<UserData[]> {
  try {
    const users = await db.user.findMany({
      where: {
        schoolId,
        ...(options?.role && { role: options.role as any }),
        ...(options?.status && { status: options.status as any })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      ...(options?.limit && { take: options.limit })
    });

    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'ADMIN' | 'TEACHER' | 'STUDENT',
      schoolId: user.schoolId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

  } catch (error) {
    apiLogger.error('Error fetching users', {
      metadata: { schoolId, options, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}

export async function fetchUserById(userId: string, schoolId: string): Promise<UserData | null> {
  try {
    const user = await db.user.findFirst({
      where: { id: userId, schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'ADMIN' | 'TEACHER' | 'STUDENT',
      schoolId: user.schoolId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

  } catch (error) {
    apiLogger.error('Error fetching user by ID', {
      metadata: { userId, schoolId, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}

// Assignment fetching functions
export async function fetchAssignments(schoolId: string, options?: {
  limit?: number;
  courseId?: string;
  status?: string;
  dueDate?: 'upcoming' | 'overdue' | 'all';
}): Promise<AssignmentData[]> {
  try {
    const whereClause: any = {
      course: { schoolId }
    };

    if (options?.courseId) {
      whereClause.courseId = options.courseId;
    }

    if (options?.status) {
      whereClause.status = options.status;
    }

    if (options?.dueDate === 'upcoming') {
      whereClause.dueDate = { gte: new Date() };
    } else if (options?.dueDate === 'overdue') {
      whereClause.dueDate = { lt: new Date() };
    }

    const assignments = await db.assignment.findMany({
      where: whereClause,
      include: {
        course: { select: { title: true } },
        teacher: { select: { name: true, email: true } },
        _count: { select: { submissions: true } }
      },
      orderBy: { dueDate: 'asc' },
      ...(options?.limit && { take: options.limit })
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      courseId: assignment.courseId,
      courseName: assignment.course.title,
      teacherId: assignment.teacherId,
      teacherName: assignment.teacher.name || 'Unknown',
      dueDate: assignment.dueDate,
      submissionsCount: assignment._count.submissions,
      status: assignment.status as 'active' | 'completed' | 'overdue',
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    }));

  } catch (error) {
    apiLogger.error('Error fetching assignments', {
      metadata: { schoolId, options, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}

// Quiz fetching functions
export async function fetchQuizzes(schoolId: string, options?: {
  limit?: number;
  courseId?: string;
  status?: string;
}): Promise<QuizData[]> {
  try {
    const whereClause: any = {
      course: { schoolId }
    };

    if (options?.courseId) {
      whereClause.courseId = options.courseId;
    }

    if (options?.status) {
      whereClause.status = options.status;
    }

    const quizzes = await db.quiz.findMany({
      where: whereClause,
      include: {
        course: { select: { title: true } },
        teacher: { select: { name: true, email: true } },
        _count: { select: { attempts: true } }
      },
      orderBy: { createdAt: 'desc' },
      ...(options?.limit && { take: options.limit })
    });

    return quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      courseId: quiz.courseId,
      courseName: quiz.course.title,
      teacherId: quiz.teacherId,
      teacherName: quiz.teacher.name || 'Unknown',
      attemptsCount: quiz._count.attempts,
      averageScore: 85, // Mock data - would be calculated from actual attempts
      status: quiz.status as 'active' | 'completed' | 'draft',
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt
    }));

  } catch (error) {
    apiLogger.error('Error fetching quizzes', {
      metadata: { schoolId, options, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}

// Statistics fetching functions
export async function fetchStats(schoolId: string): Promise<StatsData> {
  try {
    const [
      totalCourses,
      totalUsers,
      totalAssignments,
      totalQuizzes,
      activeUsers
    ] = await Promise.all([
      db.course.count({ where: { schoolId } }),
      db.user.count({ where: { schoolId } }),
      db.assignment.count({ where: { course: { schoolId } } }),
      db.quiz.count({ where: { course: { schoolId } } }),
      db.user.count({ 
        where: { 
          schoolId,
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      })
    ]);

    // Calculate completion rate (mock calculation)
    const completionRate = totalUsers > 0 ? Math.round((totalAssignments / (totalUsers * totalCourses)) * 100) : 0;

    return {
      totalCourses,
      totalUsers,
      totalAssignments,
      totalQuizzes,
      activeUsers,
      completionRate,
      averageScore: 85 // Mock data - would be calculated from actual submissions
    };

  } catch (error) {
    apiLogger.error('Error fetching stats', {
      metadata: { schoolId, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}

// Bulk operations
export async function fetchBulkData(schoolId: string, modules: string[]): Promise<Record<string, any[]>> {
  try {
    const results: Record<string, any[]> = {};

    const promises = modules.map(async (module) => {
      switch (module) {
        case 'courses':
          results.courses = await fetchCourses(schoolId, { limit: 100 });
          break;
        case 'users':
          results.users = await fetchUsers(schoolId, { limit: 100 });
          break;
        case 'assignments':
          results.assignments = await fetchAssignments(schoolId, { limit: 100 });
          break;
        case 'quizzes':
          results.quizzes = await fetchQuizzes(schoolId, { limit: 100 });
          break;
        case 'stats':
          results.stats = [await fetchStats(schoolId)];
          break;
      }
    });

    await Promise.all(promises);
    return results;

  } catch (error) {
    apiLogger.error('Error fetching bulk data', {
      metadata: { schoolId, modules, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}

// Search functions
export async function searchData(schoolId: string, query: string, type: string): Promise<any[]> {
  try {
    switch (type) {
      case 'courses':
        return await db.course.findMany({
          where: {
            schoolId,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          },
          include: {
            teacher: { select: { name: true } },
            _count: { select: { students: true } }
          },
          take: 20
        });

      case 'users':
        return await db.user.findMany({
          where: {
            schoolId,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          },
          take: 20
        });

      default:
        return [];
    }

  } catch (error) {
    apiLogger.error('Error searching data', {
      metadata: { schoolId, query, type, errorMessage: (error as Error).message }
    }, error as Error);
    throw error;
  }
}
