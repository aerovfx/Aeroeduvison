/**
 * lms.d.ts - TypeScript types: Course, Quiz, Assignment
 * 
 * Centralized type definitions for LMS
 * - Database models
 * - API responses
 * - Component props
 * - Utility types
 */

// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolEntity extends BaseEntity {
  schoolId: string;
}

// User types
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface User extends SchoolEntity {
  name: string | null;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: Date | null;
  phoneVerified: Date | null;
  lastLoginAt: Date | null;
  profileImage?: string;
  bio?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  timezone: string;
}

export interface UserStats {
  coursesCompleted: number;
  totalStudyTime: number;
  achievements: number;
  streak: number;
  xp: number;
  level: number;
  gems: number;
}

// Course types
export type CourseStatus = 'published' | 'draft' | 'archived';
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CourseCategory = 'mathematics' | 'science' | 'language' | 'history' | 'art' | 'technology' | 'other';

export interface Course extends SchoolEntity {
  title: string;
  description: string;
  content: string;
  teacherId: string;
  teacher: User;
  status: CourseStatus;
  difficulty: CourseDifficulty;
  category: CourseCategory;
  thumbnail?: string;
  duration: number; // in hours
  price: number;
  isPublic: boolean;
  enrollmentCount: number;
  rating: number;
  tags: string[];
  prerequisites: string[];
  learningObjectives: string[];
  resources: CourseResource[];
  students: User[];
  assignments: Assignment[];
  quizzes: Quiz[];
}

export interface CourseResource {
  id: string;
  title: string;
  type: 'video' | 'document' | 'link' | 'quiz' | 'assignment';
  url: string;
  description?: string;
  duration?: number; // for videos
  size?: number; // for files
  order: number;
}

// Assignment types
export type AssignmentStatus = 'active' | 'completed' | 'overdue' | 'draft';
export type AssignmentType = 'essay' | 'project' | 'presentation' | 'lab' | 'homework' | 'other';

export interface Assignment extends SchoolEntity {
  title: string;
  description: string;
  content: string;
  courseId: string;
  course: Course;
  teacherId: string;
  teacher: User;
  type: AssignmentType;
  status: AssignmentStatus;
  dueDate: Date;
  maxScore: number;
  instructions: string;
  resources: AssignmentResource[];
  submissions: AssignmentSubmission[];
  rubric?: AssignmentRubric;
}

export interface AssignmentResource {
  id: string;
  title: string;
  type: 'file' | 'link' | 'video' | 'document';
  url: string;
  description?: string;
  size?: number;
}

export interface AssignmentRubric {
  criteria: RubricCriteria[];
  totalPoints: number;
}

export interface RubricCriteria {
  id: string;
  title: string;
  description: string;
  points: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  title: string;
  description: string;
  points: number;
}

export interface AssignmentSubmission extends BaseEntity {
  assignmentId: string;
  assignment: Assignment;
  studentId: string;
  student: User;
  content: string;
  attachments: SubmissionAttachment[];
  score?: number;
  feedback?: string;
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: string;
}

export interface SubmissionAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
}

// Quiz types
export type QuizStatus = 'active' | 'completed' | 'draft';
export type QuizType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'mixed';
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'matching' | 'ordering';

export interface Quiz extends SchoolEntity {
  title: string;
  description: string;
  courseId: string;
  course: Course;
  teacherId: string;
  teacher: User;
  type: QuizType;
  status: QuizStatus;
  timeLimit?: number; // in minutes
  maxAttempts?: number;
  passingScore: number;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  instructions: string;
  isRandomized: boolean;
  showCorrectAnswers: boolean;
  showResults: boolean;
}

export interface QuizQuestion extends BaseEntity {
  quizId: string;
  quiz: Quiz;
  type: QuestionType;
  question: string;
  options: QuestionOption[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  order: number;
  timeLimit?: number; // in seconds
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizAttempt extends BaseEntity {
  quizId: string;
  quiz: Quiz;
  studentId: string;
  student: User;
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  timeSpent: number; // in seconds
  completedAt: Date;
  isPassed: boolean;
}

export interface QuizAnswer extends BaseEntity {
  attemptId: string;
  attempt: QuizAttempt;
  questionId: string;
  question: QuizQuestion;
  answer: string | string[];
  isCorrect: boolean;
  points: number;
  timeSpent: number; // in seconds
}

// Grade types
export interface Grade extends SchoolEntity {
  studentId: string;
  student: User;
  courseId: string;
  course: Course;
  assignmentId?: string;
  assignment?: Assignment;
  quizId?: string;
  quiz?: Quiz;
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade: string;
  feedback?: string;
  gradedBy: string;
  gradedAt: Date;
}

// Analytics types
export interface AnalyticsData {
  totalUsers: number;
  totalCourses: number;
  totalAssignments: number;
  totalQuizzes: number;
  activeUsers: number;
  completionRate: number;
  averageScore: number;
  engagementRate: number;
  retentionRate: number;
}

export interface UserAnalytics {
  userId: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  assignmentsSubmitted: number;
  quizzesTaken: number;
  totalStudyTime: number;
  averageScore: number;
  streak: number;
  lastActive: Date;
}

export interface CourseAnalytics {
  courseId: string;
  enrollmentCount: number;
  completionCount: number;
  averageScore: number;
  averageTimeSpent: number;
  dropoutRate: number;
  rating: number;
  reviews: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    totalCount?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    timestamp?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: {
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
  };
}

// Component Props types
export interface DashboardProps {
  user: User;
  stats: AnalyticsData;
  recentActivity: ActivityItem[];
}

export interface CourseCardProps {
  course: Course;
  showEnrollment?: boolean;
  showProgress?: boolean;
  onEnroll?: (courseId: string) => void;
}

export interface AssignmentCardProps {
  assignment: Assignment;
  submission?: AssignmentSubmission;
  showActions?: boolean;
  onSubmit?: (assignmentId: string) => void;
}

export interface QuizCardProps {
  quiz: Quiz;
  attempt?: QuizAttempt;
  showActions?: boolean;
  onStart?: (quizId: string) => void;
}

// Activity types
export interface ActivityItem extends BaseEntity {
  type: 'course' | 'assignment' | 'quiz' | 'user' | 'system';
  action: string;
  description: string;
  userId: string;
  user: User;
  courseId?: string;
  course?: Course;
  assignmentId?: string;
  assignment?: Assignment;
  quizId?: string;
  quiz?: Quiz;
  metadata?: Record<string, any>;
}

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification extends BaseEntity {
  userId: string;
  user: User;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// Search types
export interface SearchFilters {
  query?: string;
  type?: 'courses' | 'assignments' | 'quizzes' | 'users';
  category?: string;
  difficulty?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export interface SearchResult<T = any> {
  items: T[];
  totalCount: number;
  filters: SearchFilters;
  suggestions?: string[];
}

// Form types
export interface CourseFormData {
  title: string;
  description: string;
  content: string;
  difficulty: CourseDifficulty;
  category: CourseCategory;
  duration: number;
  price: number;
  isPublic: boolean;
  tags: string[];
  prerequisites: string[];
  learningObjectives: string[];
}

export interface AssignmentFormData {
  title: string;
  description: string;
  content: string;
  type: AssignmentType;
  dueDate: Date;
  maxScore: number;
  instructions: string;
  resources: AssignmentResource[];
}

export interface QuizFormData {
  title: string;
  description: string;
  type: QuizType;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore: number;
  instructions: string;
  isRandomized: boolean;
  showCorrectAnswers: boolean;
  showResults: boolean;
  questions: QuizQuestion[];
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Event types
export interface LMSEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  courseId?: string;
  assignmentId?: string;
  quizId?: string;
}

// Export all types
export * from './lms';
