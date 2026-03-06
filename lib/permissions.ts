// Permission system for inPhysic LMS
export type PermissionLevel = 'none' | 'view' | 'create' | 'edit' | 'delete' | 'full';

export interface ModulePermissions {
  // Core LMS Modules
  users: PermissionLevel;
  courses: PermissionLevel;
  lessons: PermissionLevel;
  quizzes: PermissionLevel;
  assignments: PermissionLevel;
  progress: PermissionLevel;
  payments: PermissionLevel;
  
  // Extended Modules
  videos: PermissionLevel;
  learningPath: PermissionLevel;
  liveChat: PermissionLevel;
  competition: PermissionLevel;
  stem: PermissionLevel;
  calendar: PermissionLevel;
  notes: PermissionLevel;
  tasks: PermissionLevel;
  scrumboard: PermissionLevel;
  contacts: PermissionLevel;
  analytics: PermissionLevel;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: ModulePermissions;
  color: string;
  icon: string;
}

export const PERMISSION_DESCRIPTIONS = {
  none: {
    label: 'Không có quyền',
    description: 'Không được truy cập',
    color: 'bg-gray-100 text-gray-600',
    icon: '🚫'
  },
  view: {
    label: 'Xem',
    description: 'Chỉ được xem và đọc thông tin',
    color: 'bg-blue-100 text-blue-800',
    icon: '👁️'
  },
  create: {
    label: 'Tạo mới',
    description: 'Xem và tạo mới nội dung',
    color: 'bg-green-100 text-green-800',
    icon: '➕'
  },
  edit: {
    label: 'Chỉnh sửa',
    description: 'Xem, tạo mới và chỉnh sửa thông tin',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '✏️'
  },
  delete: {
    label: 'Xóa',
    description: 'Xem, chỉnh sửa và xóa nội dung',
    color: 'bg-orange-100 text-orange-800',
    icon: '🗑️'
  },
  full: {
    label: 'Toàn quyền',
    description: 'Tất cả quyền (CRUD + quản lý)',
    color: 'bg-red-100 text-red-800',
    icon: '🔑'
  }
};

export const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'admin',
    name: 'ADMIN',
    description: 'Quản trị toàn bộ hệ thống - Tạo/sửa/xóa mọi user, course, lesson, quiz, assignment. Quản lý phân quyền và analytics toàn hệ thống',
    permissions: {
      users: 'full', // Tạo, sửa, xóa mọi user, reset password, phân quyền
      courses: 'full', // Tạo/sửa/xóa mọi khóa học, gán teacher, duyệt/publish
      lessons: 'full', // Toàn quyền quản lý lesson của tất cả khóa học
      quizzes: 'full', // Toàn quyền CRUD quiz, có thể chấm điểm thay teacher
      assignments: 'full', // Toàn quyền quản lý assignment & submission
      progress: 'full', // Quản lý toàn bộ enrollment, override progress
      payments: 'full', // Quản lý toàn bộ thanh toán và billing
      videos: 'full', // Toàn quyền quản lý bucket/file
      learningPath: 'full',
      liveChat: 'full',
      competition: 'full',
      stem: 'full',
      calendar: 'full',
      notes: 'full',
      tasks: 'full',
      scrumboard: 'full',
      contacts: 'full',
      analytics: 'full' // Toàn quyền xem analytics của toàn hệ thống
    },
    color: 'bg-red-100 text-red-800',
    icon: '👑'
  },
  {
    id: 'teacher',
    name: 'TEACHER',
    description: 'Tạo & quản lý khóa học, bài giảng, quiz của mình. Quản lý học sinh đăng ký & submissions. Xem thống kê tiến độ học viên',
    permissions: {
      users: 'edit', // Chỉ xem/sửa hồ sơ cá nhân, không thể tự đổi role
      courses: 'edit', // Tạo/sửa/xóa khóa học do mình sở hữu, quản lý lesson/quiz/assignment
      lessons: 'edit', // Tạo/sửa/xóa lesson trong khóa học mình sở hữu, upload video/tài liệu
      quizzes: 'edit', // Tạo quiz cho lesson của mình, chỉnh sửa đáp án, import từ PDF/JSON
      assignments: 'edit', // Tạo assignment trong khóa học của mình, xem submissions, chấm điểm
      progress: 'view', // Xem danh sách học viên đăng ký, không thể tự enroll học viên
      payments: 'view', // Xem revenue của mình
      videos: 'edit', // Upload tài liệu, video cho course/lesson của mình
      learningPath: 'edit',
      liveChat: 'edit',
      competition: 'edit',
      stem: 'edit',
      calendar: 'edit',
      notes: 'edit',
      tasks: 'edit',
      scrumboard: 'edit',
      contacts: 'edit',
      analytics: 'view' // Xem analytics của các khóa học mình sở hữu
    },
    color: 'bg-blue-100 text-blue-800',
    icon: '👨‍🏫'
  },
  {
    id: 'student',
    name: 'STUDENT',
    description: 'Đăng ký & mua khóa học. Xem nội dung, học bài, làm quiz, nộp assignment. Xem bảng điểm & tiến độ cá nhân',
    permissions: {
      users: 'edit', // Xem/sửa hồ sơ cá nhân, không thể đổi role, không xem được user khác
      courses: 'view', // Chỉ xem các khóa học đã mua/đăng ký, không thể chỉnh sửa nội dung
      lessons: 'view', // Chỉ được xem lesson trong khóa học đã đăng ký, đánh dấu hoàn thành
      quizzes: 'view', // Làm quiz trong khóa học đã đăng ký, xem kết quả quiz của mình
      assignments: 'view', // Nộp bài assignment, chỉnh sửa/xóa submission trước deadline, xem feedback/grade
      progress: 'view', // Tự enroll qua Stripe/payment, xem tiến độ học của mình
      payments: 'view', // Thanh toán / mua khóa học
      videos: 'view', // Chỉ có signed URL để xem/tải file liên quan đến khóa học đã đăng ký
      learningPath: 'view',
      liveChat: 'view',
      competition: 'view',
      stem: 'view',
      calendar: 'view',
      notes: 'edit',
      tasks: 'edit',
      scrumboard: 'view',
      contacts: 'view',
      analytics: 'none' // Xem dashboard cá nhân: progress, điểm quiz, assignment đã nộp, chứng chỉ
    },
    color: 'bg-green-100 text-green-800',
    icon: '🎓'
  },
  {
    id: 'guest',
    name: 'GUEST',
    description: 'Chỉ có quyền duyệt catalog khóa học (không xem nội dung chi tiết). Muốn tham gia → phải đăng ký tài khoản',
    permissions: {
      users: 'create', // Đăng ký / login
      courses: 'view', // Chỉ xem catalog khóa học
      lessons: 'none', // Không có quyền xem nội dung chi tiết
      quizzes: 'none', // Không có quyền làm quiz
      assignments: 'none', // Không có quyền nộp assignment
      progress: 'none', // Không có quyền xem tiến độ
      payments: 'none', // Không có quyền thanh toán
      videos: 'none',
      learningPath: 'none',
      liveChat: 'none',
      competition: 'none',
      stem: 'none',
      calendar: 'none',
      notes: 'none',
      tasks: 'none',
      scrumboard: 'none',
      contacts: 'none',
      analytics: 'none'
    },
    color: 'bg-gray-100 text-gray-800',
    icon: '👤'
  }
];

export const MODULE_NAMES = {
  // Core LMS Modules
  users: 'Người dùng',
  courses: 'Khóa học',
  lessons: 'Bài học',
  quizzes: 'Quiz',
  assignments: 'Bài tập',
  progress: 'Tiến độ',
  payments: 'Thanh toán',
  
  // Extended Modules
  videos: 'Video',
  learningPath: 'Lộ trình học',
  liveChat: 'Live Chat',
  competition: 'Cuộc thi',
  stem: 'STEM Projects',
  calendar: 'Calendar',
  notes: 'Ghi chú',
  tasks: 'Công việc',
  scrumboard: 'Scrum Board',
  contacts: 'Danh bạ',
  analytics: 'Phân tích'
};

export function hasPermission(
  userRole: UserRole | undefined,
  module: keyof ModulePermissions,
  requiredLevel: PermissionLevel
): boolean {
  if (!userRole) return false;

  const userPermission = userRole.permissions[module];
  
  const levelHierarchy = { 
    none: 0, 
    view: 1, 
    create: 2, 
    edit: 3, 
    delete: 4, 
    full: 5 
  };
  return levelHierarchy[userPermission] >= levelHierarchy[requiredLevel];
}

export function canView(userRole: UserRole | undefined, module: keyof ModulePermissions): boolean {
  return hasPermission(userRole, module, 'view');
}

export function canCreate(userRole: UserRole | undefined, module: keyof ModulePermissions): boolean {
  return hasPermission(userRole, module, 'create');
}

export function canEdit(userRole: UserRole | undefined, module: keyof ModulePermissions): boolean {
  return hasPermission(userRole, module, 'edit');
}

export function canDelete(userRole: UserRole | undefined, module: keyof ModulePermissions): boolean {
  return hasPermission(userRole, module, 'delete');
}

export function canManage(userRole: UserRole | undefined, module: keyof ModulePermissions): boolean {
  return hasPermission(userRole, module, 'full');
}

// Helper functions for common LMS operations

export function canCreateCourses(userRole: UserRole | undefined): boolean {
  return canCreate(userRole, 'courses');
}

export function canEditOwnCourses(userRole: UserRole | undefined): boolean {
  return canEdit(userRole, 'courses');
}


export function canTakeQuizzes(userRole: UserRole | undefined): boolean {
  return canView(userRole, 'quizzes');
}

export function canCreateQuizzes(userRole: UserRole | undefined): boolean {
  return canCreate(userRole, 'quizzes');
}

export function canSubmitAssignments(userRole: UserRole | undefined): boolean {
  return canView(userRole, 'assignments');
}

export function canGradeAssignments(userRole: UserRole | undefined): boolean {
  return canEdit(userRole, 'assignments');
}

export function canViewProgress(userRole: UserRole | undefined): boolean {
  return canView(userRole, 'progress');
}

export function canViewAllProgress(userRole: UserRole | undefined): boolean {
  return canManage(userRole, 'progress');
}

export function canMakePayments(userRole: UserRole | undefined): boolean {
  return canView(userRole, 'payments');
}


export function getPermissionBadge(level: PermissionLevel) {
  const permission = PERMISSION_DESCRIPTIONS[level];
  return {
    className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${permission.color}`,
    icon: permission.icon,
    label: permission.label,
    description: permission.description
  };
}

// Role checking helpers
export function isAdmin(role?: string | null): boolean {
  return role === 'ADMIN';
}

export function isTeacher(role?: string | null): boolean {
  return role === 'TEACHER' || role === 'ADMIN';
}

export function isStudent(role?: string | null): boolean {
  return role === 'STUDENT';
}

export function isGuest(role?: string | null): boolean {
  return role === 'GUEST' || !role;
}

// Get user role object from role string
export function getUserRole(roleString?: string | null): UserRole | undefined {
  if (!roleString) return undefined;
  return DEFAULT_ROLES.find(role => role.id === roleString.toLowerCase());
}

// Check if user has permission for a specific module
export function checkModulePermission(
  userRole: string | null | undefined,
  module: keyof ModulePermissions,
  requiredLevel: PermissionLevel
): boolean {
  const role = getUserRole(userRole);
  return hasPermission(role, module, requiredLevel);
}

// Check if user can access admin panel
export function canAccessAdmin(userRole?: string | null): boolean {
  return isAdmin(userRole);
}

// Check if user can access teacher panel
export function canAccessTeacher(userRole?: string | null): boolean {
  return isTeacher(userRole);
}

// Check if user can access student dashboard
export function canAccessStudent(userRole?: string | null): boolean {
  return isStudent(userRole) || isTeacher(userRole) || isAdmin(userRole);
}

// Check if user can manage courses (create, edit, delete)
export function canManageCourses(userRole?: string | null): boolean {
  return checkModulePermission(userRole, 'courses', 'edit');
}

// Check if user can view all courses (admin only)
export function canViewAllCourses(userRole?: string | null): boolean {
  return checkModulePermission(userRole, 'courses', 'full');
}

// Check if user can manage users (admin only)
export function canManageUsers(userRole?: string | null): boolean {
  return checkModulePermission(userRole, 'users', 'full');
}

// Check if user can view analytics
export function canViewAnalytics(userRole?: string | null): boolean {
  return checkModulePermission(userRole, 'analytics', 'view');
}

// Check if user can manage payments
export function canManagePayments(userRole?: string | null): boolean {
  return checkModulePermission(userRole, 'payments', 'full');
}

// ===== ABAC (Attribute-Based Access Control) Helpers =====

// Check if user owns a course (for teachers)
export function ownsCourse(userId: string, courseOwnerId: string): boolean {
  return userId === courseOwnerId;
}

// Check if user is enrolled in a course (for students)
export function isEnrolledInCourse(userId: string, enrolledUserIds: string[]): boolean {
  return enrolledUserIds.includes(userId);
}

// Check if user can access course content
export function canAccessCourseContent(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId: string,
  enrolledUserIds: string[] = []
): boolean {
  // Admin can access everything
  if (isAdmin(userRole)) return true;
  
  // Teacher can access their own courses
  if (isTeacher(userRole) && ownsCourse(userId, courseOwnerId)) return true;
  
  // Student can access enrolled courses
  if (isStudent(userRole) && isEnrolledInCourse(userId, enrolledUserIds)) return true;
  
  return false;
}

// Check if user can manage course (create, edit, delete)
export function canManageCourse(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId?: string
): boolean {
  // Admin can manage all courses
  if (isAdmin(userRole)) return true;
  
  // Teacher can manage their own courses
  if (isTeacher(userRole) && courseOwnerId && ownsCourse(userId, courseOwnerId)) return true;
  
  // Teacher can create new courses (no courseOwnerId means new course)
  if (isTeacher(userRole) && !courseOwnerId) return true;
  
  return false;
}

// Check if user can view course analytics
export function canViewCourseAnalytics(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId?: string
): boolean {
  // Admin can view all analytics
  if (isAdmin(userRole)) return true;
  
  // Teacher can view analytics of their own courses
  if (isTeacher(userRole) && courseOwnerId && ownsCourse(userId, courseOwnerId)) return true;
  
  return false;
}

// Check if user can manage lesson
export function canManageLesson(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId?: string
): boolean {
  return canManageCourse(userRole, userId, courseOwnerId);
}

// Check if user can take quiz
export function canTakeQuiz(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId: string,
  enrolledUserIds: string[] = []
): boolean {
  // Only students can take quizzes
  if (!isStudent(userRole)) return false;
  
  // Must be enrolled in the course
  return isEnrolledInCourse(userId, enrolledUserIds);
}

// Check if user can create/edit quiz
export function canManageQuiz(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId?: string
): boolean {
  return canManageCourse(userRole, userId, courseOwnerId);
}

// Check if user can submit assignment
export function canSubmitAssignment(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId: string,
  enrolledUserIds: string[] = []
): boolean {
  // Only students can submit assignments
  if (!isStudent(userRole)) return false;
  
  // Must be enrolled in the course
  return isEnrolledInCourse(userId, enrolledUserIds);
}

// Check if user can grade assignment
export function canGradeAssignment(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId?: string
): boolean {
  // Admin can grade all assignments
  if (isAdmin(userRole)) return true;
  
  // Teacher can grade assignments in their own courses
  if (isTeacher(userRole) && courseOwnerId && ownsCourse(userId, courseOwnerId)) return true;
  
  return false;
}

// Check if user can view assignment submission
export function canViewAssignmentSubmission(
  userRole: string | null | undefined,
  userId: string,
  submissionUserId: string,
  courseOwnerId?: string
): boolean {
  // Admin can view all submissions
  if (isAdmin(userRole)) return true;
  
  // Teacher can view submissions in their own courses
  if (isTeacher(userRole) && courseOwnerId && ownsCourse(userId, courseOwnerId)) return true;
  
  // Student can view their own submissions
  if (isStudent(userRole) && userId === submissionUserId) return true;
  
  return false;
}

// Check if user can manage enrollment
export function canManageEnrollment(userRole: string | null | undefined): boolean {
  // Only admin can manage enrollment
  return isAdmin(userRole);
}

// Check if user can enroll in course
export function canEnrollInCourse(userRole: string | null | undefined): boolean {
  // Only students can enroll
  return isStudent(userRole);
}

// Check if user can upload files
export function canUploadFiles(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId?: string
): boolean {
  // Admin can upload anywhere
  if (isAdmin(userRole)) return true;
  
  // Teacher can upload to their own courses
  if (isTeacher(userRole) && courseOwnerId && ownsCourse(userId, courseOwnerId)) return true;
  
  return false;
}

// Check if user can view files
export function canViewFiles(
  userRole: string | null | undefined,
  userId: string,
  courseOwnerId: string,
  enrolledUserIds: string[] = []
): boolean {
  return canAccessCourseContent(userRole, userId, courseOwnerId, enrolledUserIds);
}

// Check if user can manage user roles
export function canManageUserRoles(userRole: string | null | undefined): boolean {
  // Only admin can manage user roles
  return isAdmin(userRole);
}

// Check if user can view user profile
export function canViewUserProfile(
  userRole: string | null | undefined,
  userId: string,
  targetUserId: string
): boolean {
  // Admin can view all profiles
  if (isAdmin(userRole)) return true;
  
  // Users can view their own profile
  if (userId === targetUserId) return true;
  
  return false;
}

// Check if user can edit user profile
export function canEditUserProfile(
  userRole: string | null | undefined,
  userId: string,
  targetUserId: string
): boolean {
  // Admin can edit all profiles
  if (isAdmin(userRole)) return true;
  
  // Users can edit their own profile (but not change role)
  if (userId === targetUserId) return true;
  
  return false;
}

// Check if user can change user role
export function canChangeUserRole(userRole: string | null | undefined): boolean {
  // Only admin can change user roles
  return isAdmin(userRole);
}
