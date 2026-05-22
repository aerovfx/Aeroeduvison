/**
 * Teacher Module service — GV tạo module (giáo án mini) share cho HS/GV.
 *
 * Endpoints map: /api/teacher/modules/*
 */
import { api } from './api'

export type ModuleAudience = 'students' | 'teachers' | 'both'
export type ModuleVisibility = 'public' | 'private'

export interface ModuleChapter {
  id: number
  title: string
  content: string
  videoUrl: string
  duration?: number
}

export interface TeacherModule {
  id: string
  teacherId: string
  teacherName: string | null
  title: string
  description: string
  subject: string
  grade: string
  duration: number
  audience: ModuleAudience
  visibility: ModuleVisibility
  chapters?: ModuleChapter[]
  chapterCount: number
  tags: string[]
  thumbnailUrl: string | null
  allowFreePreview: boolean
  isPublished: boolean
  viewCount: number
  cloneCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateModulePayload {
  title: string
  description?: string
  subject?: string
  grade?: string
  duration?: number
  audience?: ModuleAudience
  visibility?: ModuleVisibility
  chapters?: ModuleChapter[]
  tags?: string[]
  thumbnailUrl?: string
  allowFreePreview?: boolean
  isPublished?: boolean
}

export const teacherModuleService = {
  /** List của tôi + public từ GV khác */
  async list() {
    const r = await api.get<{ mine: TeacherModule[]; public: TeacherModule[] }>('/teacher/modules')
    return r.data
  },

  /** Public library với filter audience/q */
  async listPublic(opts: { audience?: ModuleAudience; q?: string } = {}) {
    const params: Record<string, string> = {}
    if (opts.audience) params.audience = opts.audience
    if (opts.q) params.q = opts.q
    const r = await api.get<{ items: TeacherModule[]; count: number }>('/teacher/modules/public', { params })
    return r.data
  },

  /** Detail (+ tăng viewCount nếu không phải owner) */
  async get(id: string) {
    const r = await api.get<{ module: TeacherModule; isOwner: boolean; canEdit: boolean }>(`/teacher/modules/${id}`)
    return r.data
  },

  /** Create — trả {ok, id} */
  async create(payload: CreateModulePayload) {
    const r = await api.post<{ ok: boolean; id: string }>('/teacher/modules', payload)
    return r.data
  },

  /** Update (chỉ owner/admin) */
  async update(id: string, patch: Partial<CreateModulePayload>) {
    const r = await api.patch<{ ok: boolean }>(`/teacher/modules/${id}`, patch)
    return r.data
  },

  /** Delete (chỉ owner/admin) */
  async remove(id: string) {
    const r = await api.delete<{ ok: boolean }>(`/teacher/modules/${id}`)
    return r.data
  },

  /** Clone public module → tạo bản riêng tư của mình */
  async clone(id: string) {
    const r = await api.post<{ ok: boolean; id: string }>(`/teacher/modules/${id}/clone`)
    return r.data
  },
}
