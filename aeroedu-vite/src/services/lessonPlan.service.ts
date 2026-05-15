/**
 * LessonPlan Service — Giáo án WYSIWYG cho GV
 *
 * Endpoints:
 *  - list()           → GET  /api/teacher/lesson-plans
 *  - get(id)          → GET  /api/teacher/lesson-plans/:id
 *  - create(payload)  → POST /api/teacher/lesson-plans
 *  - update(id, p)    → PATCH /api/teacher/lesson-plans/:id (auto-save)
 *  - remove(id)       → DELETE /api/teacher/lesson-plans/:id
 *  - backup(id)       → POST /api/teacher/lesson-plans/:id/backup (GCS snapshot)
 */
import { api } from './api'

export interface LessonPlanSummary {
  id: string
  title: string
  subject: string | null
  grade: string | null
  tags: string[]
  wordCount: number
  isArchived: boolean
  contentPreview?: string
  gcsBackupUrl: string | null
  gcsBackupAt: string | null
  lastSavedAt: string
  createdAt: string
  updatedAt: string
}

export interface LessonPlan extends LessonPlanSummary {
  content: string                  // HTML rendered
  contentJson: any                 // TipTap doc JSON
}

export interface LessonPlanCreatePayload {
  title?: string
  content?: string
  contentJson?: any
  subject?: string
  grade?: string
  tags?: string[]
}

export interface LessonPlanUpdatePayload extends LessonPlanCreatePayload {
  isArchived?: boolean
}

export const lessonPlanService = {
  list: (includeArchived = false) =>
    api.get<{ plans: LessonPlanSummary[]; count: number }>('/teacher/lesson-plans', {
      params: includeArchived ? { archived: '1' } : {},
    }).then(r => r.data),

  get: (id: string) =>
    api.get<LessonPlan>(`/teacher/lesson-plans/${id}`).then(r => r.data),

  create: (payload: LessonPlanCreatePayload) =>
    api.post<{ plan: LessonPlan }>('/teacher/lesson-plans', payload).then(r => r.data.plan),

  update: (id: string, payload: LessonPlanUpdatePayload) =>
    api.patch<{ plan: LessonPlan }>(`/teacher/lesson-plans/${id}`, payload).then(r => r.data.plan),

  remove: (id: string) =>
    api.delete<{ ok: boolean }>(`/teacher/lesson-plans/${id}`).then(r => r.data),

  backup: (id: string) =>
    api.post<{ ok: boolean; url: string; backedUpAt: string }>(`/teacher/lesson-plans/${id}/backup`).then(r => r.data),

  // ── GCS snapshots — danh mục các giáo án đã sao lưu lên Drive ──
  listGcsSnapshots: () =>
    api.get<{ snapshots: GcsSnapshot[]; count: number; bucket: string; prefix: string }>('/teacher/lesson-plans-gcs').then(r => r.data),

  deleteGcsSnapshot: (filename: string) =>
    api.delete<{ ok: boolean; deleted: string }>(`/teacher/lesson-plans-gcs/${encodeURIComponent(filename)}`).then(r => r.data),
}

export interface GcsSnapshot {
  name: string           // file basename (e.g., "giao-an-toan-1717024829.html")
  fullPath: string       // full GCS path (lesson-plans/{teacherId}/{name})
  url: string            // public URL
  size: number           // bytes
  updated: string | null // ISO timestamp
  contentType: string
}
