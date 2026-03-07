import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canManageCourse,
  canAccessCourseContent,
  canManageLesson,
  canTakeQuiz,
  canManageQuiz,
  canSubmitAssignment,
  canGradeAssignment,
  canViewAssignmentSubmission,
  canManageEnrollment,
  canEnrollInCourse,
  canUploadFiles,
  canViewFiles,
  canManageUserRoles,
  canViewUserProfile,
  canEditUserProfile,
  canChangeUserRole,
  isAdmin,
  isTeacher,
  isStudent
} from "@/lib/permissions";

// Generic permission check middleware
export async function checkPermission(
  request: NextRequest,
  permissionCheck: (session: any) => Promise<boolean> | boolean
): Promise<NextResponse | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const hasPermission = await permissionCheck(session);
    
    if (!hasPermission) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return null; // Permission granted, continue
  } catch (error) {
    console.error("Permission check error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Course Management Permissions
export async function checkCourseManagementPermission(
  request: NextRequest,
  courseId?: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    if (!courseId) {
      // Creating new course - only teachers and admins
      return isTeacher(session.user.role);
    }

    // Managing existing course - check ownership
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { userId: true }
    });

    if (!course) return false;

    return canManageCourse(session.user.role, session.user.id, course.userId);
  });
}

export async function checkCourseAccessPermission(
  request: NextRequest,
  courseId: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { 
        userId: true,
        purchases: {
          select: { userId: true }
        }
      }
    });

    if (!course) return false;

    const enrolledUserIds = course.purchases.map(p => p.userId);
    return canAccessCourseContent(
      session.user.role,
      session.user.id,
      course.userId,
      enrolledUserIds
    );
  });
}

// Lesson Management Permissions
export async function checkLessonManagementPermission(
  request: NextRequest,
  courseId: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { userId: true }
    });

    if (!course) return false;

    return canManageLesson(session.user.role, session.user.id, course.userId);
  });
}

// Quiz Permissions
export async function checkQuizManagementPermission(
  request: NextRequest,
  courseId: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { userId: true }
    });

    if (!course) return false;

    return canManageQuiz(session.user.role, session.user.id, course.userId);
  });
}

export async function checkQuizTakingPermission(
  request: NextRequest,
  courseId: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { 
        userId: true,
        purchases: {
          select: { userId: true }
        }
      }
    });

    if (!course) return false;

    const enrolledUserIds = course.purchases.map(p => p.userId);
    return canTakeQuiz(
      session.user.role,
      session.user.id,
      course.userId,
      enrolledUserIds
    );
  });
}

// Assignment Permissions
export async function checkAssignmentManagementPermission(
  request: NextRequest,
  courseId: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { userId: true }
    });

    if (!course) return false;

    return canGradeAssignment(session.user.role, session.user.id, course.userId);
  });
}

export async function checkAssignmentSubmissionPermission(
  request: NextRequest,
  courseId: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { 
        userId: true,
        purchases: {
          select: { userId: true }
        }
      }
    });

    if (!course) return false;

    const enrolledUserIds = course.purchases.map(p => p.userId);
    return canSubmitAssignment(
      session.user.role,
      session.user.id,
      course.userId,
      enrolledUserIds
    );
  });
}

// User Management Permissions
export async function checkUserManagementPermission(
  request: NextRequest,
  targetUserId?: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    if (!targetUserId) {
      // Managing users in general - only admins
      return canManageUserRoles(session.user.role);
    }

    // Managing specific user
    if (session.user.id === targetUserId) {
      // Users can manage their own profile
      return true;
    }

    // Only admins can manage other users
    return isAdmin(session.user.role);
  });
}

// File Upload Permissions
export async function checkFileUploadPermission(
  request: NextRequest,
  courseId?: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    if (!courseId) {
      // Uploading without course context - only admins
      return isAdmin(session.user.role);
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { userId: true }
    });

    if (!course) return false;

    return canUploadFiles(session.user.role, session.user.id, course.userId);
  });
}

// Enrollment Permissions
export async function checkEnrollmentPermission(
  request: NextRequest,
  courseId: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    // Check if user can enroll (students only)
    if (!canEnrollInCourse(session.user.role)) {
      return false;
    }

    // Check if course exists and is published
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true }
    });

    return course?.isPublished || false;
  });
}

// Analytics Permissions
export async function checkAnalyticsPermission(
  request: NextRequest,
  courseId?: string
): Promise<NextResponse | null> {
  return checkPermission(request, async (session) => {
    if (!courseId) {
      // System-wide analytics - only admins
      return isAdmin(session.user.role);
    }

    // Course-specific analytics
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { userId: true }
    });

    if (!course) return false;

    // Admin can view all, teacher can view their own courses
    return isAdmin(session.user.role) || 
           (isTeacher(session.user.role) && course.userId === session.user.id);
  });
}

// Helper function to extract course ID from request
export function getCourseIdFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  
  // Look for courseId in common patterns
  const courseIndex = pathSegments.findIndex(segment => segment === 'courses');
  if (courseIndex !== -1 && pathSegments[courseIndex + 1]) {
    return pathSegments[courseIndex + 1];
  }
  
  return null;
}

// Helper function to extract user ID from request
export function getUserIdFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  
  // Look for userId in common patterns
  const userIndex = pathSegments.findIndex(segment => segment === 'users');
  if (userIndex !== -1 && pathSegments[userIndex + 1]) {
    return pathSegments[userIndex + 1];
  }
  
  return null;
}
