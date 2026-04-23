/**
 * Courses Service — thay thế Prisma direct queries + Server Actions
 * Giao tiếp với Rust course-service (:8093) qua proxy /api/courses/*
 */
import api from './api'
import type { Course, Chapter, UserProgress, PaginatedResponse } from '@/types'

export interface CourseFilters {
  categoryId?: string
  title?: string
  page?: number
  pageSize?: number
}

export const coursesService = {
  /** GET /api/courses — danh sách khoá học (thay Server Action getCourses) */
  getAll: (filters?: CourseFilters) =>
    api.get<PaginatedResponse<Course>>('/courses', { params: filters }).then((r) => r.data),

  /** GET /api/courses/:id */
  getById: (id: string) =>
    api.get<Course>(`/courses/${id}`).then((r) => r.data),

  /** GET /api/courses/dashboard — thay Server Action getDashboardCourses */
  getDashboard: () =>
    api.get<{ completedCourses: Course[]; coursesInProgress: Course[] }>('/courses/dashboard').then((r) => r.data),

  /** GET /api/courses/:courseId/chapters/:chapterId */
  getChapter: (courseId: string, chapterId: string) =>
    api.get<{ chapter: Chapter; nextChapter: Chapter | null; userProgress: UserProgress | null }>
    (`/courses/${courseId}/chapters/${chapterId}`).then((r) => r.data),

  /** POST /api/courses — tạo khoá học mới (Teacher/Admin) */
  create: (data: { title: string }) =>
    api.post<Course>('/courses', data).then((r) => r.data),

  /** PATCH /api/courses/:id */
  update: (id: string, data: Partial<Course>) =>
    api.patch<Course>(`/courses/${id}`, data).then((r) => r.data),

  /** DELETE /api/courses/:id */
  delete: (id: string) =>
    api.delete(`/courses/${id}`),

  /** POST /api/courses/:courseId/chapters/:chapterId/progress */
  updateProgress: (courseId: string, chapterId: string, isCompleted: boolean) =>
    api.put(`/courses/${courseId}/chapters/${chapterId}/progress`, { isCompleted }).then((r) => r.data),

  /** GET /api/courses/:courseId/progress */
  getCourseProgress: (courseId: string) =>
    api.get<number>(`/courses/${courseId}/progress`).then((r) => r.data),
}
