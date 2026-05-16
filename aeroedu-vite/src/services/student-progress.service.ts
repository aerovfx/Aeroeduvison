/**
 * Student Progress Service — aggregate dashboard data từ backend
 * + merge với localStorage data (Scrumboard, Pixel Odyssey, Digital Logic Lab)
 * vì các features đó hiện lưu client-side.
 */
import { api } from '@/services/api'

export interface StudentProfile {
  email: string
  name: string
  image?: string | null
  level: number
  totalXp: number
  mbtiType: string | null
  createdAt?: string
}

export interface ExamStats {
  count: number
  avgScore: number
  recent: Array<{ id: string; title: string; score: number; at: string }>
}

export interface StreakInfo {
  current: number
  longest: number
  lastActive: string | null
}

export interface WeeklyDay {
  date: string         // YYYY-MM-DD
  label: string        // 'T2','T3',...
  xp: number
  activities: number
}

export interface KgStats {
  topicsExplored: number
  votesGiven: number
  feedbackPosted: number
}

export interface KeocoStats {
  wins: number
  totalPlayed: number
}

export interface ProgressOverview {
  profile: StudentProfile
  examStats: ExamStats
  streak: StreakInfo
  weekly: WeeklyDay[]
  kgStats: KgStats
  keocoStats: KeocoStats
  lessonsAssigned: number
  generatedAt: string
}

/** Read Scrumboard task counts từ localStorage HS namespace. */
export function readScrumboardStats(): {
  total: number
  done: number
  inProgress: number
  totalXp: number
} {
  try {
    const raw = localStorage.getItem('inphysic_scrumboard_v1')
    if (!raw) return { total: 0, done: 0, inProgress: 0, totalXp: 0 }
    const cols = JSON.parse(raw) as Record<string, Array<{ xp: number }>>
    const all = Object.values(cols).flat()
    const done = (cols.done || []).length
    const inProg = (cols.inprogress || []).length
    return {
      total: all.length,
      done,
      inProgress: inProg,
      totalXp: (cols.done || []).reduce((s, t) => s + (t.xp || 0), 0),
    }
  } catch { return { total: 0, done: 0, inProgress: 0, totalXp: 0 } }
}

/** Read Pixel Odyssey save state. */
export function readPixelOdysseyStats(): {
  hasSave: boolean
  chapter: number
  starCores: number
  level: number
  hp: number
  mapName: string
} {
  try {
    const raw = localStorage.getItem('inphysic_pixel_odyssey_v1')
    if (!raw) return { hasSave: false, chapter: 1, starCores: 0, level: 1, hp: 100, mapName: 'Chưa bắt đầu' }
    const data = JSON.parse(raw)
    return {
      hasSave: true,
      chapter: data?.state?.chapter || 1,
      starCores: data?.player?.starCores || 0,
      level: data?.player?.level || 1,
      hp: data?.player?.hp || 0,
      mapName: data?.state?.currentMap === 'crater' ? 'Hố thiên thạch' : 'Luneria',
    }
  } catch { return { hasSave: false, chapter: 1, starCores: 0, level: 1, hp: 100, mapName: 'Chưa bắt đầu' } }
}

/** Read Digital Logic Lab last circuit. */
export function readDigitalLogicStats(): { hasCircuit: boolean; gateCount: number; wireCount: number; name: string } {
  try {
    const raw = localStorage.getItem('inphysic_digital_logic_circuit_v1')
    if (!raw) return { hasCircuit: false, gateCount: 0, wireCount: 0, name: '' }
    const data = JSON.parse(raw)
    return {
      hasCircuit: true,
      gateCount: Array.isArray(data?.gates) ? data.gates.length : 0,
      wireCount: Array.isArray(data?.wires) ? data.wires.length : 0,
      name: data?.name || 'Mạch chưa đặt tên',
    }
  } catch { return { hasCircuit: false, gateCount: 0, wireCount: 0, name: '' } }
}

export const studentProgressService = {
  /** Aggregate overview từ backend. Gracefully degrade nếu endpoint chưa deploy. */
  getOverview: () =>
    api.get<{ success: boolean } & ProgressOverview>('/student/progress-overview')
      .then(r => r.data)
      .catch((e): ProgressOverview | null => {
        console.warn('[progress] overview API not ready:', e?.message)
        return null
      }),

  readScrumboardStats,
  readPixelOdysseyStats,
  readDigitalLogicStats,
}
