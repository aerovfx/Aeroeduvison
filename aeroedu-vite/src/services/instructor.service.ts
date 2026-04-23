/**
 * Instructor Service — Teacher course management
 * Ported from elearniv Next.js: /instructor/*, /api/course/*
 */
import { api } from './api'
import type { InstructorCourse, CourseVideo, CourseAsset, Category } from '@/types'

export interface CreateCoursePayload {
  title: string
  slug?: string
  categoryId: string
  overview: string
  lessons: number
  duration: string
  regularPrice: number
  beforePrice: number
  accessTime: string
  image: string
  requirements: string
  whatYouWillLearn: string
  whoIsThisCourseFor: string
}

export interface UploadVideoPayload {
  title: string
  videoUrl: string
  position: number
}

export interface UploadAssetPayload {
  title: string
  fileUrl: string
  fileType: string
}

export const instructorService = {
  // ── Courses ─────────────────────────────────────────────
  /** GET /api/instructor/courses — my courses as instructor */
  getMyCourses: () =>
    api.get<InstructorCourse[]>('/instructor/courses').then((r) => r.data),

  /** GET /api/instructor/courses/:id */
  getCourse: (id: string) =>
    api.get<InstructorCourse>(`/instructor/courses/${id}`).then((r) => r.data),

  /** POST /api/instructor/courses */
  createCourse: (data: CreateCoursePayload) =>
    api.post<InstructorCourse>('/instructor/courses', data).then((r) => r.data),

  /** PATCH /api/instructor/courses/:id */
  updateCourse: (id: string, data: Partial<CreateCoursePayload>) =>
    api.patch<InstructorCourse>(`/instructor/courses/${id}`, data).then((r) => r.data),

  /** DELETE /api/instructor/courses/:id */
  deleteCourse: (id: string) =>
    api.delete(`/instructor/courses/${id}`).then((r) => r.data),

  /** PATCH /api/instructor/courses/:id/publish */
  togglePublish: (id: string, isPublished: boolean) =>
    api.patch(`/instructor/courses/${id}/publish`, { isPublished }).then((r) => r.data),

  // ── Videos ──────────────────────────────────────────────
  /** GET /api/instructor/courses/:courseId/videos */
  getVideos: (courseId: string) =>
    api.get<CourseVideo[]>(`/instructor/courses/${courseId}/videos`).then((r) => r.data),

  /** POST /api/instructor/courses/:courseId/videos */
  uploadVideo: (courseId: string, data: UploadVideoPayload) =>
    api.post<CourseVideo>(`/instructor/courses/${courseId}/videos`, data).then((r) => r.data),

  /** DELETE /api/instructor/courses/:courseId/videos/:videoId */
  deleteVideo: (courseId: string, videoId: string) =>
    api.delete(`/instructor/courses/${courseId}/videos/${videoId}`).then((r) => r.data),

  // ── Assets ──────────────────────────────────────────────
  /** GET /api/instructor/courses/:courseId/assets */
  getAssets: (courseId: string) =>
    api.get<CourseAsset[]>(`/instructor/courses/${courseId}/assets`).then((r) => r.data),

  /** POST /api/instructor/courses/:courseId/assets */
  uploadAsset: (courseId: string, file: File, title: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('title', title)
    return api
      .post<CourseAsset>(`/instructor/courses/${courseId}/assets`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  /** DELETE /api/instructor/courses/:courseId/assets/:assetId */
  deleteAsset: (courseId: string, assetId: string) =>
    api.delete(`/instructor/courses/${courseId}/assets/${assetId}`).then((r) => r.data),

  // ── Categories ──────────────────────────────────────────
  /** GET /api/categories */
  getCategories: () =>
    api.get<Category[]>('/categories').then((r) => r.data),

  // ── Image Upload ─────────────────────────────────────────
  /** POST /api/upload/image — upload course thumbnail */
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    return api
      .post<{ url: string }>('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
