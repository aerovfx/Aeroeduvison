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
  /**
   * "Upload" course thumbnail — actually client-side compress + data URL.
   *
   * Lý do KHÔNG upload server thật:
   *  - Cloud Run filesystem ephemeral → không lưu local được
   *  - Chưa có GCS bucket auth setup
   *  - BE stub /api/upload/image trả 501 → user gặp 501 console error
   *
   * Workaround: nén ảnh max 1280×720 JPEG q=0.82 (~50-150KB cho course cover
   * 750×500), convert sang data URL base64, lưu inline vào Course.imageUrl.
   * Database TEXT column hold any string OK. Image render qua <img src={url}>
   * như URL bình thường (browser hỗ trợ data: scheme native).
   *
   * Trade-off: data URL ~33% lớn hơn binary. Cho course cover 100KB → ~135KB
   * trong DB. Không vấn đề. Course list query vẫn fast vì JSONB toast lazy.
   *
   * Future: khi setup GCS, đổi method này quay lại upload thật.
   */
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const { compressImage } = await import('@/lib/imageCompression')
    const result = await compressImage(file, {
      maxWidth: 1280,
      maxHeight: 720,
      quality: 0.82,
      skipBelowKB: 100,   // ảnh ≤100KB không cần nén
    })
    // Convert blob → data URL (base64)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Không đọc được file ảnh'))
      reader.readAsDataURL(result.blob)
    })
    // Cảnh báo nếu data URL quá lớn (> 500KB sau nén = ảnh phức tạp)
    if (dataUrl.length > 700_000) {
      console.warn(`[uploadImage] Ảnh sau nén vẫn ${(dataUrl.length / 1024).toFixed(0)}KB — DB sẽ phình`)
    }
    return { url: dataUrl }
  },
}
