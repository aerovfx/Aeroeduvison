import api from './api'

export type AssignmentType = 'lesson' | 'quiz' | 'project' | 'ai-generated'
export type AssignmentStatus = 'completed' | 'in-progress' | 'pending' | 'recommended' | 'published' | 'draft' | 'closed'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface Assignment {
  id: string
  title: string
  subject: string
  type: AssignmentType
  status: AssignmentStatus
  difficulty: DifficultyLevel
  duration: number // minutes
  xpReward: number
  accuracy?: number
  completedAt?: string | null
  assignedAt: string
  description: string
  tags: string[]
  aiGenerated?: boolean
  progress?: number
  courseId?: string
  chapterId?: string

  // Teacher-created fields
  teacherId?: string | null
  qrToken?: string | null
  scanUrl?: string | null
  maxScore?: number
  dueDate?: string | null
  content?: string

  // Teacher list aggregates
  submissionCount?: number
  avgScore?: number
}

export interface AssignmentSubmission {
  id: string
  assignmentId: string
  scannerName: string
  scannerEmail?: string | null
  scannerUserId?: string | null
  score?: number | null
  answerText?: string | null
  timeSpent?: number | null
  metadata?: unknown
  submittedAt: string
}

export interface AssignmentStats {
  assignmentId: string
  title: string
  maxScore: number
  total: number
  scored: number
  avgScore: number
  minScore: number
  maxSubmittedScore: number
  uniqueScanners: number
  daily: { day: string; count: number }[]
}

export interface PublicAssignmentView {
  id: string
  title: string
  description: string
  subject: string
  difficulty: DifficultyLevel
  duration: number
  content: string
  maxScore: number
  dueDate: string | null
  teacherName: string
  qrToken: string
}

/* Attachment GV upload kèm bài tập (2026-05-20) */
export interface AssignmentAttachment {
  url: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: string
}

export interface CreateAssignmentInput {
  title: string
  description?: string
  subject?: string
  type?: AssignmentType
  difficulty?: DifficultyLevel
  duration?: number
  xpReward?: number
  maxScore?: number
  content?: string
  tags?: string[]
  dueDate?: string | null
  status?: AssignmentStatus
  generateQr?: boolean
  attachments?: AssignmentAttachment[]
}

export const assignmentsService = {
  // Student view
  getAll: (role?: 'student' | 'teacher') =>
    api
      .get<Assignment[]>('/assignments', { params: role ? { role } : undefined })
      .then((r) => r.data),

  getById: (id: string) => api.get<Assignment>(`/assignments/${id}`).then((r) => r.data),

  updateProgress: (id: string, progress: number) =>
    api.patch<Assignment>(`/assignments/${id}/progress`, { progress }).then((r) => r.data),

  markComplete: (id: string, accuracy?: number) =>
    api.post<Assignment>(`/assignments/${id}/complete`, { accuracy }).then((r) => r.data),

  getAiRecommended: () =>
    api.get<Assignment[]>('/assignments/recommended').then((r) => r.data),

  // Teacher
  create: (input: CreateAssignmentInput) =>
    api.post<Assignment>('/assignments', input).then((r) => r.data),

  /** Tạo assignment từ Exam có sẵn */
  createFromExam: (input: { examId: string; title?: string; description?: string; dueDate?: string | null; duration?: number }) =>
    api.post<Assignment>('/assignments/from-exam', input).then((r) => r.data),

  remove: (id: string) =>
    api.delete<{ success: boolean; id: string }>(`/assignments/${id}`).then((r) => r.data),

  /** Targeting: giao bài cho lớp/HS cụ thể, BE tự gửi notification */
  listTargets: (id: string) =>
    api.get<{ targets: Array<{ id: string; type: 'class' | 'student'; targetId: string; label: string; createdAt: string }> }>(`/assignments/${id}/targets`).then(r => r.data),

  assignTo: (id: string, payload: { classIds?: string[]; studentIds?: string[] }) =>
    api.post<{ ok: boolean; added: number; notified: number }>(`/assignments/${id}/targets`, payload).then(r => r.data),

  removeTarget: (id: string, type: 'class' | 'student', targetId: string) =>
    api.delete<{ ok: boolean }>(`/assignments/${id}/targets/${type}/${encodeURIComponent(targetId)}`).then(r => r.data),

  getSubmissions: (id: string) =>
    api.get<AssignmentSubmission[]>(`/assignments/${id}/submissions`).then((r) => r.data),

  getStats: (id: string) =>
    api.get<AssignmentStats>(`/assignments/${id}/stats`).then((r) => r.data),

  // Public (no auth) — scan flow
  publicGet: (token: string) =>
    api.get<PublicAssignmentView>(`/public/assignments/${token}`).then((r) => r.data),

  publicSubmit: (
    token: string,
    payload: { scannerName: string; scannerEmail?: string; answerText?: string; score?: number; timeSpent?: number; metadata?: unknown },
  ) =>
    api
      .post<{ success: boolean; data: { id: string; assignmentId: string; scannerName: string } }>(
        `/public/assignments/${token}/submit`,
        payload,
      )
      .then((r) => r.data),
}
