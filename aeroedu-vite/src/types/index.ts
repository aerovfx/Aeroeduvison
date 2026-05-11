// ============================================================
// Core Types — AeroEduVision
// Tương ứng với Prisma schema từ Next.js project
// ============================================================

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: UserRole
  isTwoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

// ── Courses ──────────────────────────────────────────────
export interface Category {
  id: string
  name: string
}

export interface Course {
  id: string
  userId: string
  title: string
  description: string | null
  imageUrl: string | null
  price: number | null
  isPublished: boolean
  categoryId: string | null
  category: Category | null
  chapters: Chapter[]
  createdAt: string
  updatedAt: string
  // Computed
  progress?: number | null
}

export interface Chapter {
  id: string
  title: string
  description: string | null
  videoUrl: string | null
  position: number
  isPublished: boolean
  isFree: boolean
  courseId: string
  createdAt: string
  updatedAt: string
  userProgress?: UserProgress[]
}

export interface UserProgress {
  id: string
  userId: string
  chapterId: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

// ── Exams ────────────────────────────────────────────────
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY'
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD'

export interface Question {
  id: string
  content: string
  type: QuestionType
  difficulty: DifficultyLevel
  options: QuestionOption[]
  correctAnswer?: string
  explanation?: string
  points: number
}

export interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface Exam {
  id: string
  title: string
  description: string | null
  duration: number // phút
  totalPoints: number
  passingScore: number
  isPublished: boolean
  questions: Question[]
  createdAt: string
}

// ── Analytics ────────────────────────────────────────────
export interface DashboardStats {
  totalCourses: number
  completedCourses: number
  totalStudyTime: number
  currentStreak: number
  xpPoints: number
  level: number
  averageScore: number
}

export interface ActivityData {
  date: string
  studyTime: number
  lessonsCompleted: number
  score: number
}

// ── Labs ─────────────────────────────────────────────────
export type LabType = 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY' | 'AERODYNAMICS' | 'ELECTRONICS'

export interface Lab {
  id: string
  title: string
  description: string
  type: LabType
  difficulty: DifficultyLevel
  thumbnail?: string
  route: string
  tags: string[]
}

// ── Enrollment / Learning ────────────────────────────────
export interface Enrollment {
  id: string
  userId: string
  courseId: string
  price: number
  createdAt: string
  course: Course & {
    slug: string
    image: string | null
    duration: string | null
    lessons: number
    accessTime: string | null
    user: Pick<User, 'id' | 'name' | 'image'>
  }
}

export interface CourseVideo {
  id: string
  courseId: string
  title: string
  videoUrl: string
  position: number
  duration?: number
  isCompleted?: boolean
  createdAt: string
}

export interface CourseAsset {
  id: string
  courseId: string
  title: string
  fileUrl: string
  fileType: string
  fileSize?: number
  createdAt: string
}

export interface CourseReview {
  id: string
  userId: string
  courseId: string
  rating: number
  comment: string
  createdAt: string
  user: Pick<User, 'id' | 'name' | 'image'>
}

export interface WishlistItem {
  id: string
  userId: string
  courseId: string
  createdAt: string
  course: Course & {
    slug: string
    image: string | null
    regularPrice: number
    beforePrice?: number
    lessons: number
    user: Pick<User, 'id' | 'name' | 'image'>
  }
}

export interface Certificate {
  id: string
  userId: string
  courseId: string
  completedAt: string
  user: Pick<User, 'id' | 'name'>
  course: { title: string; slug: string; user: Pick<User, 'id' | 'name'> }
}

export interface InstructorCourse {
  id: string
  userId: string
  title: string
  slug: string
  overview: string | null
  image: string | null
  regularPrice: number
  beforePrice: number
  lessons: number
  duration: string | null
  accessTime: string | null
  requirements: string | null
  whatYouWillLearn: string | null
  whoIsThisCourseFor: string | null
  isPublished: boolean
  categoryId: string | null
  category: Category | null
  enrollments: Array<{ id: string }>
  videos: CourseVideo[]
  assets: CourseAsset[]
  user: Pick<User, 'id' | 'name' | 'image'>
  createdAt: string
  updatedAt: string
}

// ── Lesson History (Learning Timeline) ──────────────────
export type LessonHistoryAction =
  | 'OPENED'
  | 'RESUMED'
  | 'COMPLETED'
  | 'QUIZ_ATTEMPT'
  | 'CUSTOM'

export interface LessonHistoryEvent {
  id: string
  userId: string
  courseId: string | null
  chapterId: string | null
  instructorId: string | null
  learningPathId: string | null
  segmentId: string | null
  action: LessonHistoryAction
  title: string | null
  metadata: Record<string, unknown> | null
  occurredAt: string
}

export interface CourseActivitySummary {
  courseId: string
  instructorId: string | null
  lastEvent: LessonHistoryEvent | null
  counts: {
    OPENED: number
    RESUMED: number
    COMPLETED: number
    QUIZ_ATTEMPT: number
  }
  totalEvents: number
}

// ── Thống kê kết quả làm bài tập (per-course) ─────────────
export interface CourseAssignmentStats {
  courseId: string
  totalAttempts: number
  completedAttempts: number
  /** 0..100 — điểm trung bình của tất cả lần làm */
  averageScore: number
  /** Điểm cao nhất đã đạt */
  bestScore: number
  /** 0..1 — tỉ lệ đạt ngưỡng passing (>=50) */
  passRate: number
  lastAttemptAt: string | null
  /** Histogram gộp 5 khoảng: 0-20, 20-40, 40-60, 60-80, 80-100 */
  scoreHistogram: [number, number, number, number, number]
}

// ── Đánh giá của tôi (tổng hợp) ───────────────────────────
export interface MyReviewItem {
  id: string
  courseId: string
  courseTitle: string
  courseImage?: string | null
  rating: number
  comment: string
  createdAt: string
}

// ── Career Personality Test ─────────────────────────────
export interface CareerTestResult {
  id: string
  userId: string | null
  user?: Pick<User, 'id' | 'name' | 'image'> | null
  mbtiType: string
  mbtiScores: Record<string, number>
  hollandCode: string
  hollandScores: Record<string, number>
  personalityName: string
  careers: string[]
  answers?: Record<number, number>
  createdAt: string
}

/** Thống kê tổng hợp cộng đồng — hiển thị dưới trang giới thiệu bài test */
export interface CareerCommunityStats {
  /** Tổng số lượt test (có thể đếm trùng) */
  totalAttempts: number
  /** Số người duy nhất đã làm bài */
  totalUsers: number
  /** Thời điểm cập nhật gần nhất */
  updatedAt: string | null
  /** Phân bố theo 16 kiểu MBTI — sort giảm dần theo count */
  mbtiDistribution: Array<{
    type: string
    name: string
    emoji?: string
    count: number
    percentage: number
  }>
  /** Phân bố theo 6 nhóm Holland (R/I/A/S/E/C) */
  hollandDistribution: Array<{
    code: 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
    label: string
    count: number
    percentage: number
  }>
  /** Top ngành nghề được đề xuất nhiều nhất */
  topCareers: Array<{
    name: string
    count: number
    percentage: number
    /** Match với danh sách Hot xu thế 2026 — nếu có thì hiện badge 🔥 */
    trending?: {
      label: string
      reason: string
      heat: number  // 1-5
    } | null
  }>
  /** Danh sách ngành Hot xu thế 2026 (server cung cấp, UI hiển thị riêng) */
  trendingCareers2026?: Array<{
    label: string
    reason: string
    heat: number
  }>
  /** Người đã hoàn thành gần nhất — hiển thị để học sinh tham khảo */
  recentTakers: Array<{
    userName: string
    userImage: string | null
    userYearOfBirth?: number | null
    mbtiType: string
    personalityName: string
    hollandCode: string
    createdAt: string
  }>
  /** Phân bố theo năm sinh (sort giảm dần theo count) */
  yearOfBirthDistribution?: Array<{
    year: number
    count: number
    percentage: number
  }>
}

// ── Exam Prep (Ôn thi) ──────────────────────────────────
export interface ExamPrepQuestion {
  questionId: string
  position: number
  content: string
  questionType: string
  options: string[]
  correctAnswer: string
  explanation?: string
  difficulty: string
  topic?: string
}

export interface PracticeExam {
  id: string
  subject: string
  grade: string
  examType: string
  source: string
  questions: ExamPrepQuestion[]
  timeLimit: number
}

export interface GradeBreakdown {
  correct: number
  incorrect: number
  unanswered: number
  byTopic: Record<string, { correct: number; total: number; accuracy: number }>
  byDifficulty: Record<string, { correct: number; total: number; accuracy: number }>
}

export interface GradeDetailItem {
  questionId: string
  position: number
  content: string
  userAnswer: string | null
  correctAnswer: string
  isCorrect: boolean
  explanation?: string
  topic?: string
}

export interface GradeResult {
  score: number
  total: number
  percentage: number
  breakdown: GradeBreakdown
  recommendations: string[]
  details: GradeDetailItem[]
}

export interface TeacherExam {
  id: string
  title: string
  description?: string
  examType: string
  duration: number
  totalQuestions: number
  totalScore: number
  createdAt: string
  user?: { name: string } | null
}

export interface ExamMatrixItem {
  id: string
  name: string
  subject: string
  grade: string
  examType: string
  duration: number
  totalQuestions: number
  totalScore: number
  createdAt: string
  user?: { name: string } | null
  _count?: { selectedQuestions: number }
}

export interface ExamPrepStats {
  totalExams: number
  avgScore: number
  bestScore: number
  recentTrend: number[]
  weakTopics: string[]
  questionBankCount: number
}

export interface ExamPrepHistoryItem {
  id: string
  subject: string
  grade: string
  examType: string
  questionCount: number
  score: number | null
  percentage: number | null
  completed: boolean
  createdAt: string
  completedAt: string | null
}

/** Thống kê cộng đồng hiển thị trên trang Exam Prep — giúp học sinh tham khảo */
export interface ExamCommunityStats {
  totalAttempts: number
  totalUsers: number
  averagePercentage: number
  updatedAt: string | null
  /** Bảng xếp hạng điểm cao — tối đa 10 */
  leaderboard: Array<{
    userName: string
    userImage: string | null
    subject: string
    examType: string
    percentage: number
    score: number
    total: number
    completedAt: string
  }>
  /** Phân bố theo môn học */
  bySubject: Array<{
    subject: string
    count: number
    avgPercentage: number
  }>
  /** Phân bố theo loại đề */
  byExamType: Array<{
    examType: string
    count: number
    avgPercentage: number
  }>
  /** Người làm gần nhất */
  recentActivity: Array<{
    userName: string
    userImage: string | null
    subject: string
    examType: string
    percentage: number
    completedAt: string
  }>
}

// ── Pagination ───────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── API Error ────────────────────────────────────────────
export interface ApiError {
  message: string
  code?: string
  statusCode?: number
}
