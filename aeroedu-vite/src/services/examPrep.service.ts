/**
 * Exam Prep Service — Ôn thi thông minh
 *
 * Endpoint gốc:
 *   GET  /api/agents/exam-prep?action=stats            → thống kê cá nhân
 *   GET  /api/agents/exam-prep?action=topics&subject=  → danh sách chủ đề
 *   GET  /api/agents/exam-prep?action=teacher_exams    → đề từ giáo viên
 *   GET  /api/agents/exam-prep?action=history          → lịch sử làm bài cá nhân
 *   GET  /api/agents/exam-prep?action=community-stats  → thống kê cộng đồng (fallback localStorage)
 *   POST /api/agents/exam-prep  { action: 'create'|'create_from_exam'|'create_from_matrix'|'submit', ... }
 *
 * Mọi method đều fallback gracefully nếu BE chưa sẵn sàng:
 *   - submit: mirror vào localStorage (có userId/userName/userImage) để derive cộng đồng
 *   - history: fallback từ localStorage
 *   - community-stats: derive từ localStorage nếu BE không trả data
 */
import { api } from './api'
import type {
  PracticeExam,
  GradeResult,
  TeacherExam,
  ExamMatrixItem,
  ExamPrepStats,
  ExamPrepHistoryItem,
  ExamCommunityStats,
} from '@/types'

const LS_KEY = 'aeroedu_exam_prep_results'

/**
 * Flag module-level: nếu BE từng trả lỗi cho action=community-stats,
 * session này sẽ không gọi lại endpoint nữa (tránh noise trong console).
 * Reset khi reload trang.
 */
let communityEndpointUnsupported = false

// ── LocalStorage fallback store ─────────────────────────────
interface LocalExamEntry {
  id: string
  userId: string | null
  userName: string | null
  userImage: string | null
  practiceId: string
  subject: string
  grade: string
  examType: string
  questionCount: number
  score: number
  total: number
  percentage: number
  weakTopics: string[]
  createdAt: string
  completedAt: string
}

function readLocalStore(): LocalExamEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalStore(entries: LocalExamEntry[]) {
  try {
    const capped = entries.slice(-500)
    localStorage.setItem(LS_KEY, JSON.stringify(capped))
  } catch {
    /* quota exceeded: noop */
  }
}

function appendLocalEntry(entry: LocalExamEntry) {
  const list = readLocalStore()
  list.push(entry)
  writeLocalStore(list)
}

// ── Community stats derivation ──────────────────────────────
function deriveCommunityStats(entries: LocalExamEntry[]): ExamCommunityStats {
  const total = entries.length
  const uniqueUsers = new Set(entries.map((e) => e.userId || `guest-${e.userName ?? ''}`))
  const avg = total > 0
    ? Math.round(entries.reduce((s, e) => s + (e.percentage || 0), 0) / total)
    : 0

  // Leaderboard — top 10 điểm cao (tie-break theo thời gian hoàn thành sớm hơn)
  const leaderboard = [...entries]
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    })
    .slice(0, 10)
    .map((e) => ({
      userName: e.userName || 'Học sinh ẩn danh',
      userImage: e.userImage ?? null,
      subject: e.subject,
      examType: e.examType,
      percentage: e.percentage,
      score: e.score,
      total: e.total,
      completedAt: e.completedAt,
    }))

  // By subject
  const subjectMap = new Map<string, { count: number; totalPct: number }>()
  for (const e of entries) {
    const cur = subjectMap.get(e.subject) ?? { count: 0, totalPct: 0 }
    cur.count += 1
    cur.totalPct += e.percentage || 0
    subjectMap.set(e.subject, cur)
  }
  const bySubject = Array.from(subjectMap.entries())
    .map(([subject, v]) => ({
      subject,
      count: v.count,
      avgPercentage: v.count > 0 ? Math.round(v.totalPct / v.count) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // By exam type
  const examTypeMap = new Map<string, { count: number; totalPct: number }>()
  for (const e of entries) {
    const cur = examTypeMap.get(e.examType) ?? { count: 0, totalPct: 0 }
    cur.count += 1
    cur.totalPct += e.percentage || 0
    examTypeMap.set(e.examType, cur)
  }
  const byExamType = Array.from(examTypeMap.entries())
    .map(([examType, v]) => ({
      examType,
      count: v.count,
      avgPercentage: v.count > 0 ? Math.round(v.totalPct / v.count) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Recent activity — 10 hoàn thành gần nhất
  const recentActivity = [...entries]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 10)
    .map((e) => ({
      userName: e.userName || 'Học sinh ẩn danh',
      userImage: e.userImage ?? null,
      subject: e.subject,
      examType: e.examType,
      percentage: e.percentage,
      completedAt: e.completedAt,
    }))

  return {
    totalAttempts: total,
    totalUsers: uniqueUsers.size,
    averagePercentage: avg,
    updatedAt: entries.length > 0 ? entries[entries.length - 1].completedAt : null,
    leaderboard,
    bySubject,
    byExamType,
    recentActivity,
  }
}

// ── Payloads ────────────────────────────────────────────────
export interface CreateFromBankPayload {
  subject: string
  grade: string
  examType: string
  questionCount: number
  timeLimit: number
  topic?: string
}

export interface SubmitExamPayload {
  practiceId: string
  answers: Record<string, string>
  /** Thông tin người làm — để lưu gắn với user */
  userId?: string | null
  userName?: string | null
  userImage?: string | null
  /** Metadata đề thi — dùng cho localStorage mirror */
  subject?: string
  grade?: string
  examType?: string
  questionCount?: number
}

// ── Service ─────────────────────────────────────────────────
export const examPrepService = {
  /** GET stats cá nhân */
  getStats: async (): Promise<ExamPrepStats | null> => {
    try {
      const res = await api.get<{ success: boolean; data: { stats: ExamPrepStats } }>(
        '/agents/exam-prep',
        { params: { action: 'stats' } },
      )
      return res.data?.data?.stats ?? null
    } catch {
      return null
    }
  },

  /** GET danh sách chủ đề theo môn */
  getTopics: async (subject: string): Promise<string[]> => {
    try {
      const res = await api.get<{ success: boolean; data: { topics: string[] } }>(
        '/agents/exam-prep',
        { params: { action: 'topics', subject } },
      )
      return res.data?.data?.topics ?? []
    } catch {
      return []
    }
  },

  /** GET đề từ giáo viên (exams + matrices) */
  getTeacherExams: async (): Promise<{ exams: TeacherExam[]; matrices: ExamMatrixItem[] }> => {
    try {
      const res = await api.get<{
        success: boolean
        data: { exams: TeacherExam[]; matrices: ExamMatrixItem[] }
      }>('/agents/exam-prep', { params: { action: 'teacher_exams' } })
      return {
        exams: res.data?.data?.exams ?? [],
        matrices: res.data?.data?.matrices ?? [],
      }
    } catch {
      return { exams: [], matrices: [] }
    }
  },

  /** GET lịch sử cá nhân — fallback localStorage */
  getHistory: async (): Promise<ExamPrepHistoryItem[]> => {
    try {
      const res = await api.get<{ success: boolean; data: { history: ExamPrepHistoryItem[] } }>(
        '/agents/exam-prep',
        { params: { action: 'history' } },
      )
      return res.data?.data?.history ?? []
    } catch {
      // Fallback: map từ localStorage
      const local = readLocalStore()
      return local
        .slice()
        .reverse()
        .map((e) => ({
          id: e.id,
          subject: e.subject,
          grade: e.grade,
          examType: e.examType,
          questionCount: e.questionCount,
          score: e.score,
          percentage: e.percentage,
          completed: true,
          createdAt: e.createdAt,
          completedAt: e.completedAt,
        }))
    }
  },

  /**
   * GET thống kê cộng đồng — fallback derive từ localStorage.
   * Nếu backend đã 1 lần trả 4xx/5xx (action chưa triển khai), ta nhớ lại
   * và không gọi lại trong session này để tránh spam 400 vào console.
   */
  getCommunityStats: async (): Promise<ExamCommunityStats> => {
    if (communityEndpointUnsupported) {
      return deriveCommunityStats(readLocalStore())
    }
    try {
      const res = await api.get<{ success: boolean; data: ExamCommunityStats }>(
        '/agents/exam-prep',
        { params: { action: 'community-stats' } },
      )
      if (res.data?.data) return res.data.data
      throw new Error('empty')
    } catch (err) {
      // Bất kể lỗi gì (400/404/500) — BE chưa hỗ trợ → chuyển sang fallback vĩnh viễn
      communityEndpointUnsupported = true
      if (import.meta.env.DEV) {
        console.info('[examPrepService] community-stats endpoint không khả dụng — dùng dữ liệu cục bộ', err)
      }
      return deriveCommunityStats(readLocalStore())
    }
  },

  /** POST tạo đề từ ngân hàng */
  createFromBank: async (payload: CreateFromBankPayload): Promise<PracticeExam | null> => {
    const res = await api.post<{
      success: boolean
      data: { practice: PracticeExam }
      message?: string
      error?: string
    }>('/agents/exam-prep', { action: 'create', ...payload })
    return res.data?.data?.practice ?? null
  },

  /** POST tạo đề từ đề giáo viên */
  createFromTeacherExam: async (
    id: string,
    type: 'exam' | 'matrix',
  ): Promise<PracticeExam | null> => {
    const action = type === 'exam' ? 'create_from_exam' : 'create_from_matrix'
    const key = type === 'exam' ? 'examId' : 'matrixId'
    const res = await api.post<{
      success: boolean
      data: { practice: PracticeExam }
      message?: string
      error?: string
    }>('/agents/exam-prep', { action, [key]: id })
    return res.data?.data?.practice ?? null
  },

  /**
   * POST nộp bài.
   * Chỉ gửi field mà backend chấp nhận (action/practiceId/answers) — BE hiện tại
   * validate strict và trả 400 nếu payload có field lạ. Thông tin user được
   * dùng cục bộ cho localStorage mirror (phục vụ bảng xếp hạng cộng đồng).
   */
  submit: async (payload: SubmitExamPayload): Promise<GradeResult | null> => {
    let result: GradeResult | null = null
    try {
      const res = await api.post<{ success: boolean; data: { result: GradeResult } }>(
        '/agents/exam-prep',
        {
          action: 'submit',
          practiceId: payload.practiceId,
          answers: payload.answers,
        },
      )
      result = res.data?.data?.result ?? null
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[examPrepService.submit] backend error', err)
    }

    // Mirror vào localStorage (phục vụ history + community-stats)
    if (result) {
      const weakTopics = Object.entries(result.breakdown.byTopic)
        .filter(([, s]) => s.accuracy < 50)
        .map(([topic]) => topic)
      const now = new Date().toISOString()
      appendLocalEntry({
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: payload.userId ?? null,
        userName: payload.userName ?? null,
        userImage: payload.userImage ?? null,
        practiceId: payload.practiceId,
        subject: payload.subject ?? 'Không rõ',
        grade: payload.grade ?? '',
        examType: payload.examType ?? '',
        questionCount: payload.questionCount ?? result.total,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        weakTopics,
        createdAt: now,
        completedAt: now,
      })
    }

    return result
  },

  /** DEV only — xoá mirror local */
  _clearLocal: () => writeLocalStore([]),
}

export default examPrepService
