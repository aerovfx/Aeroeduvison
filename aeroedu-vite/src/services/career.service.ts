/**
 * Career Service — Bài test tính cách & hướng nghiệp
 *
 * Endpoints:
 *   POST   /api/personality-test        → lưu kết quả
 *   GET    /api/personality-test?action=history       → lịch sử cá nhân
 *   GET    /api/personality-test?action=community-stats → thống kê cộng đồng
 *
 * Mọi method đều có fallback gracefully nếu backend chưa triển khai:
 *   - saveTest: cache vào localStorage để thống kê offline
 *   - getCommunityStats: derive từ localStorage + lịch sử cá nhân
 */
import { api } from './api'
import type { CareerTestResult, CareerCommunityStats } from '@/types'

const LS_KEY = 'aeroedu_career_results'

// ── LocalStorage fallback store ─────────────────────────────
interface LocalCareerEntry {
  id: string
  userId: string | null
  userName?: string | null
  userImage?: string | null
  userYearOfBirth?: number | null
  mbtiType: string
  mbtiScores: Record<string, number>
  hollandCode: string
  hollandScores: Record<string, number>
  personalityName: string
  careers: string[]
  createdAt: string
}

function readLocalStore(): LocalCareerEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalStore(entries: LocalCareerEntry[]) {
  try {
    // Giới hạn 500 bản ghi để tránh phình to storage
    const capped = entries.slice(-500)
    localStorage.setItem(LS_KEY, JSON.stringify(capped))
  } catch {
    /* noop: quota exceeded */
  }
}

function appendLocalEntry(entry: LocalCareerEntry) {
  const list = readLocalStore()
  list.push(entry)
  writeLocalStore(list)
}

// ── Helpers dùng chung để derive thống kê cộng đồng ─────────
const MBTI_NAMES: Record<string, string> = {
  INTJ: 'Nhà Khoa Học',
  INTP: 'Nhà Tư Duy',
  ENTJ: 'Nhà Lãnh Đạo',
  ENTP: 'Nhà Tranh Luận',
  INFJ: 'Nhà Bảo Vệ',
  INFP: 'Nhà Hoà Giải',
  ENFJ: 'Nhà Truyền Cảm Hứng',
  ENFP: 'Nhà Hoạt Động',
  ISTJ: 'Nhà Tổ Chức',
  ISFJ: 'Nhà Chăm Sóc',
  ESTJ: 'Nhà Quản Lý',
  ESFJ: 'Nhà Ngoại Giao',
  ISTP: 'Nhà Kỹ Thuật',
  ISFP: 'Nhà Nghệ Sĩ',
  ESTP: 'Nhà Mạo Hiểm',
  ESFP: 'Nhà Biểu Diễn',
}

const HOLLAND_LABELS: Record<
  'R' | 'I' | 'A' | 'S' | 'E' | 'C',
  string
> = {
  R: 'Realistic — Thực tế',
  I: 'Investigative — Nghiên cứu',
  A: 'Artistic — Nghệ thuật',
  S: 'Social — Xã hội',
  E: 'Enterprising — Quản lý',
  C: 'Conventional — Quy củ',
}

function deriveCommunityStats(
  entries: Array<{
    mbtiType: string
    hollandCode: string
    careers: string[]
    userId: string | null
    userName?: string | null
    userImage?: string | null
    userYearOfBirth?: number | null
    personalityName: string
    createdAt: string
  }>,
): CareerCommunityStats {
  const total = entries.length
  const uniqueUsers = new Set(entries.map((e) => e.userId || `guest-${e.userName ?? ''}`))

  // MBTI distribution
  const mbtiCount: Record<string, number> = {}
  for (const e of entries) mbtiCount[e.mbtiType] = (mbtiCount[e.mbtiType] ?? 0) + 1
  const mbtiDistribution = Object.entries(mbtiCount)
    .map(([type, count]) => ({
      type,
      name: MBTI_NAMES[type] ?? type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Holland — tính theo từng ký tự trong hollandCode (VD: "IAS" → I+A+S)
  const hollandCount: Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number> = {
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0,
  }
  let hollandTotal = 0
  for (const e of entries) {
    for (const ch of (e.hollandCode ?? '').toUpperCase()) {
      if (ch in hollandCount) {
        hollandCount[ch as keyof typeof hollandCount] += 1
        hollandTotal += 1
      }
    }
  }
  const hollandDistribution = (Object.keys(hollandCount) as Array<keyof typeof hollandCount>)
    .map((code) => ({
      code,
      label: HOLLAND_LABELS[code],
      count: hollandCount[code],
      percentage: hollandTotal > 0 ? Math.round((hollandCount[code] / hollandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Top careers
  const careerCount: Record<string, number> = {}
  for (const e of entries) {
    for (const c of e.careers ?? []) {
      careerCount[c] = (careerCount[c] ?? 0) + 1
    }
  }
  const topCareers = Object.entries(careerCount)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Recent takers
  const recentTakers = [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)
    .map((e) => ({
      userName: e.userName || 'Học sinh ẩn danh',
      userImage: e.userImage ?? null,
      userYearOfBirth: e.userYearOfBirth ?? null,
      mbtiType: e.mbtiType,
      personalityName: e.personalityName,
      hollandCode: e.hollandCode,
      createdAt: e.createdAt,
    }))

  // Year-of-birth distribution
  const yobCount: Record<number, number> = {}
  let yobTotal = 0
  for (const e of entries) {
    if (e.userYearOfBirth && Number.isFinite(e.userYearOfBirth)) {
      yobCount[e.userYearOfBirth] = (yobCount[e.userYearOfBirth] ?? 0) + 1
      yobTotal += 1
    }
  }
  const yearOfBirthDistribution = Object.entries(yobCount)
    .map(([year, count]) => ({
      year: Number(year),
      count,
      percentage: yobTotal > 0 ? Math.round((count / yobTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    totalAttempts: total,
    totalUsers: uniqueUsers.size,
    updatedAt: entries.length > 0 ? entries[entries.length - 1].createdAt : null,
    mbtiDistribution,
    hollandDistribution,
    topCareers,
    recentTakers,
    yearOfBirthDistribution,
  }
}

// ── Service ─────────────────────────────────────────────────
export interface SaveCareerPayload {
  mbtiType: string
  mbtiScores: Record<string, number>
  hollandCode: string
  hollandScores: Record<string, number>
  personalityName: string
  careers: string[]
  answers: Record<number, number>
  /** Metadata người làm (gửi kèm để backend lưu gắn với user) */
  userId?: string | null
  userName?: string | null
  userImage?: string | null
  userYearOfBirth?: number | null
}

export const careerService = {
  /** POST /api/personality-test — lưu kết quả bài test (kèm thông tin user) */
  saveTest: async (payload: SaveCareerPayload) => {
    // Luôn cache local để phục vụ thống kê cộng đồng kể cả khi BE lỗi
    const localEntry: LocalCareerEntry = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: payload.userId ?? null,
      userName: payload.userName ?? null,
      userImage: payload.userImage ?? null,
      userYearOfBirth: payload.userYearOfBirth ?? null,
      mbtiType: payload.mbtiType,
      mbtiScores: payload.mbtiScores,
      hollandCode: payload.hollandCode,
      hollandScores: payload.hollandScores,
      personalityName: payload.personalityName,
      careers: payload.careers,
      createdAt: new Date().toISOString(),
    }
    appendLocalEntry(localEntry)

    try {
      const res = await api.post<{ success: boolean; data?: CareerTestResult }>(
        '/personality-test',
        { action: 'save', ...payload },
      )
      return res.data?.data ?? null
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[careerService.saveTest] fallback to local', err)
      return null
    }
  },

  /** GET /api/personality-test?action=history — lịch sử bài test của user hiện tại */
  getMyHistory: async (): Promise<CareerTestResult[]> => {
    try {
      const res = await api.get<{ success: boolean; data: CareerTestResult[] }>(
        '/personality-test',
        { params: { action: 'history' } },
      )
      return res.data?.data ?? []
    } catch {
      // Fallback: trả lịch sử từ localStorage
      const local = readLocalStore()
      return local.map((e) => ({
        id: e.id,
        userId: e.userId,
        user: e.userName ? { id: e.userId ?? 'local', name: e.userName, image: e.userImage ?? null } : null,
        mbtiType: e.mbtiType,
        mbtiScores: e.mbtiScores,
        hollandCode: e.hollandCode,
        hollandScores: e.hollandScores,
        personalityName: e.personalityName,
        careers: e.careers,
        createdAt: e.createdAt,
      }))
    }
  },

  /**
   * GET /api/personality-test?action=community-stats — thống kê tổng hợp cộng đồng.
   * Backend chưa có → tự derive từ localStorage để trang vẫn có nội dung tham khảo.
   */
  getCommunityStats: async (): Promise<CareerCommunityStats> => {
    try {
      const res = await api.get<{ success: boolean; data: CareerCommunityStats }>(
        '/personality-test',
        { params: { action: 'community-stats' } },
      )
      if (res.data?.data) return res.data.data
      throw new Error('empty')
    } catch {
      const local = readLocalStore()
      return deriveCommunityStats(local)
    }
  },

  /**
   * Lấy toàn bộ bản ghi local (dùng để xuất CSV thống kê).
   * Trả về danh sách đã ẩn danh hoá phù hợp cho xuất CSV.
   */
  getAllLocalEntries: (): Array<{
    id: string
    userName: string
    userYearOfBirth: number | null
    mbtiType: string
    personalityName: string
    hollandCode: string
    mbtiScores: Record<string, number>
    hollandScores: Record<string, number>
    careers: string[]
    createdAt: string
  }> => {
    return readLocalStore().map((e) => ({
      id: e.id,
      userName: e.userName || 'Học sinh ẩn danh',
      userYearOfBirth: e.userYearOfBirth ?? null,
      mbtiType: e.mbtiType,
      personalityName: e.personalityName,
      hollandCode: e.hollandCode,
      mbtiScores: e.mbtiScores,
      hollandScores: e.hollandScores,
      careers: e.careers,
      createdAt: e.createdAt,
    }))
  },

  /** Xoá dữ liệu local (dùng cho DEV) */
  _clearLocal: () => writeLocalStore([]),
}
