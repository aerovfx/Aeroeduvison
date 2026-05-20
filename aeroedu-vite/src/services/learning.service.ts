/**
 * Learning Service — Student learning operations
 * Ported from elearniv Next.js: /learning/*, /profile/*
 */
import { api } from './api'
import type {
  Enrollment,
  WishlistItem,
  Certificate,
  CourseVideo,
  CourseAsset,
  CourseReview,
  LessonHistoryAction,
  LessonHistoryEvent,
  CourseActivitySummary,
  CourseAssignmentStats,
  MyReviewItem,
} from '@/types'

export interface LogEventPayload {
  action: LessonHistoryAction
  courseId?: string | null
  chapterId?: string | null
  instructorId?: string | null
  learningPathId?: string | null
  segmentId?: string | null
  title?: string | null
  metadata?: Record<string, unknown> | null
}

// Minimal shape cho khoá học public (GET /api/courses)
export interface PublicCourse {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  image: string | null
  price: number
  isFree?: boolean
  lessons: number
  duration: string | null
  slug?: string
  user: { id: string; name: string } | null
}

export const learningService = {
  // ── My Courses ──────────────────────────────────────────
  /** GET /api/learning/my-courses — danh sách khoá học đã đăng ký */
  getMyCourses: () =>
    api.get<Enrollment[]>('/learning/my-courses').then((r) => r.data),

  /** GET /api/courses — lấy khoá học public miễn phí (price = 0 hoặc isFree = true).
   *  Dùng để hiển thị gợi ý cho học sinh chưa đăng ký khoá nào. */
  getFreeCourses: () =>
    api
      .get<{ courses?: PublicCourse[]; items?: PublicCourse[] }>('/courses', {
        params: { limit: 24 },
      })
      .then((r) => {
        const all = r.data.courses ?? r.data.items ?? []
        return all.filter((c) => Number(c.price ?? 0) === 0 || !!c.isFree)
      })
      .catch(() => [] as PublicCourse[]),

  // ── Purchase History ────────────────────────────────────
  /** GET /api/learning/purchase-history */
  getPurchaseHistory: () =>
    api.get<Enrollment[]>('/learning/purchase-history').then((r) => r.data),

  // ── Wishlist ────────────────────────────────────────────
  /** GET /api/learning/wishlist */
  getWishlist: () =>
    api.get<WishlistItem[]>('/learning/wishlist').then((r) => r.data),

  /** POST /api/learning/wishlist/:courseId */
  addToWishlist: (courseId: string) =>
    api.post(`/learning/wishlist/${courseId}`).then((r) => r.data),

  /** DELETE /api/learning/wishlist/:courseId */
  removeFromWishlist: (courseId: string) =>
    api.delete(`/learning/wishlist/${courseId}`).then((r) => r.data),

  // ── Certificate ─────────────────────────────────────────
  /** GET /api/learning/certificate/:courseId */
  getCertificate: (courseId: string) =>
    api.get<Certificate>(`/learning/certificate/${courseId}`).then((r) => r.data),

  // ── Course Player ───────────────────────────────────────
  /** GET /api/learning/course/:courseId — thông tin khoá học (title, pdfBookUrl, extras, …) */
  getCourseInfo: (courseId: string) =>
    api.get<{
      id: string
      title: string
      pdfBookUrl?: string | null
      extras?: import('@/types').CourseExtras
    }>(
      `/learning/course/${courseId}`
    ).then((r) => r.data).catch(() => null as null),

  /** GET /api/learning/course/:courseId/videos */
  getCourseVideos: (courseId: string) =>
    api.get<CourseVideo[]>(`/learning/course/${courseId}/videos`).then((r) => r.data),

  /** GET /api/learning/course/:courseId/assets */
  getCourseAssets: (courseId: string) =>
    api.get<CourseAsset[]>(`/learning/course/${courseId}/assets`).then((r) => r.data),

  /** GET /api/learning/course/:courseId/reviews */
  getCourseReviews: (courseId: string) =>
    api.get<CourseReview[]>(`/learning/course/${courseId}/reviews`).then((r) => r.data),

  /** POST /api/learning/course/:courseId/reviews */
  submitReview: (courseId: string, data: { rating: number; comment: string }) =>
    api.post<CourseReview>(`/learning/course/${courseId}/reviews`, data).then((r) => r.data),

  /** PUT /api/learning/course/:courseId/videos/:videoId/progress */
  markVideoComplete: (courseId: string, videoId: string, completed: boolean) =>
    api
      .put(`/learning/course/${courseId}/videos/${videoId}/progress`, { completed })
      .then((r) => r.data),

  // ── Learning History (Timeline) ─────────────────────────
  /** POST /api/learning/events — log một sự kiện học (mở bài, hoàn thành, làm quiz…) */
  logEvent: (payload: LogEventPayload) =>
    api
      .post<{ event: LessonHistoryEvent }>('/learning/events', payload)
      .then((r) => r.data.event)
      .catch((err) => {
        // không chặn UI nếu logging fail
        if (import.meta.env.DEV) console.warn('[learning.logEvent] fail', err)
        return null
      }),

  /** GET /api/learning/history/course/:courseId — timeline đầy đủ cho 1 khoá */
  getCourseHistory: (courseId: string, limit = 100) =>
    api
      .get<{ events: LessonHistoryEvent[] }>(
        `/learning/history/course/${courseId}`,
        { params: { limit } },
      )
      .then((r) => r.data.events ?? []),

  /** GET /api/learning/history/path/:learningPathId — timeline cho lộ trình học */
  getPathHistory: (learningPathId: string, limit = 200) =>
    api
      .get<{ events: LessonHistoryEvent[] }>(
        `/learning/history/path/${learningPathId}`,
        { params: { limit } },
      )
      .then((r) => r.data.events ?? []),

  /** GET /api/learning/my-courses-activity — tóm tắt hoạt động mọi khoá đã học */
  getMyCoursesActivity: () =>
    api
      .get<{ items: CourseActivitySummary[] }>('/learning/my-courses-activity')
      .then((r) => r.data.items ?? []),

  // ── Thống kê kết quả làm bài tập ───────────────────────
  /** GET /api/learning/assignment-stats — thống kê kết quả cho tất cả khoá
   *  Backend có thể chưa implement → fallback: trả mảng rỗng, UI sẽ derive từ activity. */
  getMyAssignmentStats: () =>
    api
      .get<{ items: CourseAssignmentStats[] }>('/learning/assignment-stats')
      .then((r) => r.data.items ?? [])
      .catch(() => [] as CourseAssignmentStats[]),

  /** GET /api/learning/course/:courseId/assignment-stats — thống kê 1 khoá */
  getCourseAssignmentStats: (courseId: string) =>
    api
      .get<CourseAssignmentStats>(`/learning/course/${courseId}/assignment-stats`)
      .then((r) => r.data)
      .catch(() => null as CourseAssignmentStats | null),

  // ── Đánh giá của tôi ───────────────────────────────────
  /** GET /api/learning/my-reviews — tất cả đánh giá đã gửi, nhóm theo khoá */
  getMyReviews: () =>
    api
      .get<{ items: MyReviewItem[] }>('/learning/my-reviews')
      .then((r) => r.data.items ?? [])
      .catch(() => [] as MyReviewItem[]),

  // ── Profile ─────────────────────────────────────────────
  /** PATCH /api/profile — cập nhật thông tin cơ bản */
  updateProfile: (data: { name?: string; bio?: string; phone?: string; website?: string }) =>
    api.patch('/profile', data).then((r) => r.data),

  /** POST /api/profile/photo — upload avatar */
  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    return api
      .post('/profile/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data as { imageUrl: string })
  },
}
