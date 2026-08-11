/**
 * Instructor Service — Dịch vụ quản lý khóa học của giáo viên
 * Được port từ elearniv Next.js: /instructor/*, /api/course/*
 * Xử lý tạo/mở khóa học, danh mục, video/tài nguyên và gói mở rộng khóa học.
 *
 * Instructor Service — Teacher course management
 * Ported from elearniv Next.js: /instructor/*, /api/course/*
 */
import { api } from './api'
import type { InstructorCourse, CourseVideo, CourseAsset, Category, CourseExtras } from '@/types'

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
  /** Tài nguyên liên kết — exams/assignments/labs/aura/games */
  extras?: CourseExtras
}

export interface UploadVideoPayload {
  title: string
  /** Mô tả ngắn cho bài học (1-2 đoạn, HS xem trước khi học) */
  description?: string
  /** URL video (YouTube/Vimeo/MP4 trực tiếp/GCS public URL). BE accept cả 'url' lẫn legacy 'videoUrl'. */
  url?: string
  videoUrl?: string             // legacy alias, vẫn support
  type?: 'youtube' | 'vimeo' | 'mp4' | 'gcs' | 'unknown'  // BE auto-detect nếu thiếu
  thumbUrl?: string
  duration?: number             // giây
  position?: number
  isPreview?: boolean
  groupName?: string
  /** Khi upload qua signed URL — pass gcsPath để BE biết để cleanup khi delete */
  gcsPath?: string
}

export interface UploadAssetPayload {
  title: string
  fileUrl: string
  fileType: string
}

// ─── Curriculum (Mục lục: Chapter → Lesson) ───────────────────
export type LessonType = 'video' | 'reading' | 'quiz' | 'assignment'

export interface CurriculumLesson {
  id: string
  chapterId: string
  title: string
  description?: string | null
  duration?: number | null   // minutes
  type: LessonType
  position: number
  /** Số content block đính kèm (video/pdf/text/quiz/...) — populated bởi GET curriculum */
  blockCount?: number
  createdAt: string
  updatedAt: string
}

export interface CurriculumChapter {
  id: string
  title: string
  description?: string | null
  duration?: number | null
  position: number
  isPublished?: boolean
  isFree?: boolean
  createdAt: string
  updatedAt: string
  lessons: CurriculumLesson[]
}

export interface CreateChapterPayload {
  title: string
  description?: string | null
  position?: number
}

export interface UpdateChapterPayload {
  title?: string
  description?: string | null
  position?: number
  isPublished?: boolean
  isFree?: boolean
}

export interface CreateLessonPayload {
  title: string
  description?: string | null
  duration?: number | null
  type?: LessonType
  position?: number
}

export interface UpdateLessonPayload {
  title?: string
  description?: string | null
  duration?: number | null
  type?: LessonType
  position?: number
}

// ─── Lesson Blocks (Coursera/Notion-style content blocks) ───
export type LessonBlockType =
  | 'video' | 'pdf' | 'text' | 'audio' | 'quiz' | 'pptx'
  | 'simulation' | 'lab' | 'game' | 'link' | 'embed'

export interface LessonBlock {
  id: string
  lessonId: string
  type: LessonBlockType
  title?: string | null
  /** Nội dung chính — URL (video/pdf/audio/pptx/link/embed), HTML (text), ID (sim/lab/game/quiz) */
  content?: string | null
  /** Metadata type-specific: { duration, fileSize, pages, mime, examId, simId, height, ... } */
  metadata?: Record<string, any>
  position: number
  createdAt?: string
  updatedAt?: string
}

export interface CreateLessonBlockPayload {
  type: LessonBlockType
  title?: string | null
  content?: string | null
  metadata?: Record<string, any>
  position?: number
}

export interface UpdateLessonBlockPayload {
  type?: LessonBlockType
  title?: string | null
  content?: string | null
  metadata?: Record<string, any>
  position?: number
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

  /**
   * Lấy GCS signed URL để upload trực tiếp (PUT) — KHÔNG qua Cloud Run.
   * FE nhận uploadUrl, dùng axios PUT file → GCS, sau đó gọi uploadVideo()
   * với publicUrl trả về.
   */
  getVideoUploadUrl: (courseId: string, filename: string, contentType: string) =>
    api.post<{
      uploadUrl: string
      publicUrl: string
      gcsPath: string
      contentType: string
      expiresAt: string
    }>('/upload/video-signed-url', { courseId, filename, contentType }).then(r => r.data),

  /**
   * Helper: upload file → GCS via signed URL với progress callback.
   * Trả về { publicUrl, gcsPath } để gọi tiếp uploadVideo() lưu metadata.
   */
  uploadVideoFile: async (
    courseId: string,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<{ publicUrl: string; gcsPath: string }> => {
    const ct = file.type || 'video/mp4'
    const { uploadUrl, publicUrl, gcsPath } = await api.post<{
      uploadUrl: string; publicUrl: string; gcsPath: string
    }>('/upload/video-signed-url', { courseId, filename: file.name, contentType: ct }).then(r => r.data)
    // PUT trực tiếp tới GCS với progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', ct)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`GCS upload fail: ${xhr.status} ${xhr.statusText}`))
      xhr.onerror = () => reject(new Error('GCS upload network error'))
      xhr.send(file)
    })
    return { publicUrl, gcsPath }
  },

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

  // ── Curriculum (Chapters + Lessons) ──────────────────────
  /** GET /api/instructor/courses/:courseId/chapters — full curriculum with lessons */
  getCurriculum: (courseId: string) =>
    api.get<CurriculumChapter[]>(`/instructor/courses/${courseId}/chapters`).then((r) => r.data),

  /** POST /api/instructor/courses/:courseId/chapters */
  createChapter: (courseId: string, data: CreateChapterPayload) =>
    api.post<CurriculumChapter>(`/instructor/courses/${courseId}/chapters`, data).then((r) => r.data),

  /** PATCH /api/instructor/courses/:courseId/chapters/:chapterId */
  updateChapter: (courseId: string, chapterId: string, data: UpdateChapterPayload) =>
    api.patch<CurriculumChapter>(`/instructor/courses/${courseId}/chapters/${chapterId}`, data).then((r) => r.data),

  /** DELETE /api/instructor/courses/:courseId/chapters/:chapterId (cascade lessons) */
  deleteChapter: (courseId: string, chapterId: string) =>
    api.delete(`/instructor/courses/${courseId}/chapters/${chapterId}`).then((r) => r.data),

  /** POST /api/instructor/courses/:courseId/chapters/:chapterId/lessons */
  createLesson: (courseId: string, chapterId: string, data: CreateLessonPayload) =>
    api.post<CurriculumLesson>(`/instructor/courses/${courseId}/chapters/${chapterId}/lessons`, data).then((r) => r.data),

  /** PATCH /api/instructor/lessons/:lessonId */
  updateLesson: (lessonId: string, data: UpdateLessonPayload) =>
    api.patch<CurriculumLesson>(`/instructor/lessons/${lessonId}`, data).then((r) => r.data),

  /** DELETE /api/instructor/lessons/:lessonId */
  deleteLesson: (lessonId: string) =>
    api.delete(`/instructor/lessons/${lessonId}`).then((r) => r.data),

  /** POST /api/instructor/courses/:courseId/chapters/reorder */
  reorderChapters: (courseId: string, chapterIds: string[]) =>
    api.post(`/instructor/courses/${courseId}/chapters/reorder`, { chapterIds }).then((r) => r.data),

  /** POST /api/instructor/courses/:courseId/chapters/:chapterId/lessons/reorder */
  reorderLessons: (courseId: string, chapterId: string, lessonIds: string[]) =>
    api.post(`/instructor/courses/${courseId}/chapters/${chapterId}/lessons/reorder`, { lessonIds }).then((r) => r.data),

  // ── Lesson Blocks (content blocks Coursera/Notion-style) ──
  /** GET /api/instructor/lessons/:lessonId/blocks — ordered by position */
  listLessonBlocks: (lessonId: string) =>
    api.get<LessonBlock[]>(`/instructor/lessons/${lessonId}/blocks`).then((r) => r.data),

  /** POST /api/instructor/lessons/:lessonId/blocks */
  createLessonBlock: (lessonId: string, data: CreateLessonBlockPayload) =>
    api.post<LessonBlock>(`/instructor/lessons/${lessonId}/blocks`, data).then((r) => r.data),

  /** PATCH /api/instructor/lesson-blocks/:blockId */
  updateLessonBlock: (blockId: string, data: UpdateLessonBlockPayload) =>
    api.patch<LessonBlock>(`/instructor/lesson-blocks/${blockId}`, data).then((r) => r.data),

  /** DELETE /api/instructor/lesson-blocks/:blockId */
  deleteLessonBlock: (blockId: string) =>
    api.delete(`/instructor/lesson-blocks/${blockId}`).then((r) => r.data),

  /** POST /api/instructor/lessons/:lessonId/blocks/reorder  body: { blockIds } */
  reorderLessonBlocks: (lessonId: string, blockIds: string[]) =>
    api.post(`/instructor/lessons/${lessonId}/blocks/reorder`, { blockIds }).then((r) => r.data),

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
