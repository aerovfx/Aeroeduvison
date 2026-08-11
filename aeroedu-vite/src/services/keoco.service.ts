/**
 * Kéo Co Kiến Thức (Knowledge Tug-of-War)
 *
 * Hai chế độ chơi:
 *   1) Lớp học (Classroom) — giáo viên tạo phiên, học sinh quét QR, tự động phân
 *      vào đội RED/BLUE cân bằng, câu hỏi đồng bộ, vị trí dây thừng theo thời gian thực.
 *   2) Thách đấu 1-1 (1v1) — phiên bất đồng bộ; người tạo chơi trước, đặt điểm chuẩn,
 *      đối thủ nhận link có thể chia sẻ để chơi và phá kỷ lục.
 *
 * Đồng bộ thời gian thực dựa trên polling (khoảng 1-2s gọi endpoint /state).
 *
 * Kéo Co Kiến Thức (Knowledge Tug-of-War)
 *
 * Two modes:
 *   1) Classroom — teacher creates a session, students scan QR, auto-balanced
 *      to RED/BLUE teams, synchronized question delivery, live rope position.
 *   2) 1v1 Challenge — async; creator plays first, sets baseline score,
 *      opponent gets a shareable link to try and beat it.
 *
 * Polling-based real-time sync (1-2s interval against /state endpoint).
 */
import api from './api'

// ── Types ──────────────────────────────────────────────────────────

export type KcTeam = 'red' | 'blue'
export type KcStatus = 'lobby' | 'running' | 'finished'

export interface KcQuestion {
  index: number
  id: string
  content: string
  options: string[] | { label: string; text: string }[]
  topic?: string | null
  difficulty?: string | null
}

export interface KcPlayer {
  id: string
  name: string
  team: KcTeam
  score: number
  correct: number
  wrong: number
  streak: number
  joinedAt?: string | null
}

export interface KcSession {
  id: string
  title: string
  subject: string
  grade: string
  difficulty: string | null
  topic: string | null
  questionCount: number
  questionIds?: string[]
  timePerQuestion: number
  ropeMax: number
  teacherId: string
  qrToken: string
  shortCode: string
  status: KcStatus
  ropePosition: number
  currentIndex: number
  currentStartedAt: string | null
  winner: KcTeam | 'tie' | null
  createdAt: string | null
  updatedAt: string | null
  finishedAt: string | null
  scanUrl?: string | null
}

export interface KcSessionFull extends KcSession {
  players: KcPlayer[]
  teamCounts: Record<KcTeam, number>
  teamScores: Record<KcTeam, number>
  currentQuestion: KcQuestion | null
}

export interface KcPublicLobby {
  id: string
  title: string
  subject: string
  grade: string
  status: KcStatus
  questionCount: number
  timePerQuestion: number
  ropeMax: number
  ropePosition: number
  shortCode: string
  teamCounts: Record<KcTeam, number>
  playerCount: number
}

export interface KcPlayerState {
  session: {
    id: string
    title: string
    status: KcStatus
    ropePosition: number
    ropeMax: number
    currentIndex: number
    questionCount: number
    timePerQuestion: number
    currentStartedAt: string | null
    winner: KcTeam | 'tie' | null
  }
  player: KcPlayer | null
  currentQuestion: KcQuestion | null
  alreadyAnswered: boolean
  teamCounts: Record<KcTeam, number>
  teamScores: Record<KcTeam, number>
}

export interface KcAnswerResult {
  correct: boolean
  correctAnswer: string | null
  scoreAdd: number
  delta: number
  ropePosition: number
  newScore: number
  newStreak: number
}

export interface KcCreateSessionInput {
  title?: string
  subject?: string
  grade?: string
  difficulty?: string
  topic?: string
  questionCount?: number
  timePerQuestion?: number
  ropeMax?: number
  /** Optional: nguồn câu hỏi từ 1 đề thi cụ thể trong game catalog */
  examId?: string
  examTitle?: string
}

// ── Game catalog (đề thi GV add vào danh mục thi đấu) ──────────────
export interface KcCatalogItem {
  id: string
  examId: string
  examTitle: string
  subject: string | null
  grade: string | null
  questionCount: number
  gameType: string
  addedAt: string
}

// ── Leaderboard top players ────────────────────────────────────────
export interface KcLeaderboardEntry {
  rank: number
  name: string
  wins: number
  totalPlayed: number
  totalScore: number
  winRate: number
}

// ── 1v1 Challenge types ────────────────────────────────────────────

export interface KcChallenge {
  id: string
  token: string
  title: string
  subject: string
  grade: string
  difficulty: string | null
  topic: string | null
  questionCount: number
  timePerQuestion: number
  creatorName: string
  creatorScore: number | null
  creatorCorrect: number | null
  creatorTimeMs: number | null
  creatorPlayedAt: string | null
  opponentName: string | null
  opponentScore: number | null
  opponentCorrect: number | null
  opponentTimeMs: number | null
  opponentPlayedAt: string | null
  winner: 'creator' | 'opponent' | null
  questions: KcQuestion[]
  challengeUrl?: string
}

export interface KcCreateChallengeInput {
  creatorName: string
  title?: string
  subject?: string
  grade?: string
  difficulty?: string
  topic?: string
  questionCount?: number
  timePerQuestion?: number
}

export interface KcChallengeAnswer {
  questionId: string
  answer: string
  timeMs: number
}

export interface KcChallengeSubmitResult {
  role: 'creator' | 'opponent'
  score: number
  correct: number
  totalQuestions: number
  totalTimeMs: number
  winner: 'creator' | 'opponent' | null
  opponentScore: number | null
  results: { questionId: string; correct: boolean; points: number }[]
}

// ── Live 1v1 (synchronous, real-time) types ──────────────────────────

export type KcLiveStatus = 'waiting' | 'running' | 'finished'
export type KcSlot = 'red' | 'blue'

export interface KcLivePlayerSummary {
  token?: string
  name: string
  slot: KcSlot
  score: number
  correct: number
  wrong: number
  streak: number
  joinedAt?: string
  hasAnswered?: boolean
}

export interface KcLiveMatch {
  id: string
  token: string
  title: string
  subject: string
  grade: string
  difficulty: string | null
  topic: string | null
  questionCount: number
  timePerQuestion: number
  teacherId: string
  status: KcLiveStatus
  currentIndex: number
  currentStartedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  finishedAt: string | null
  winner: KcSlot | 'tie' | null
  leader: KcSlot | 'tie' | null
  players: KcLivePlayerSummary[]
  currentQuestion: KcQuestion | null
  scanUrl?: string | null
}

export interface KcLivePublicLobby {
  id: string
  token: string
  title: string
  subject: string
  grade: string
  questionCount: number
  timePerQuestion: number
  status: KcLiveStatus
  playerCount: number
  slotsTaken: KcSlot[]
  slotsAvailable: KcSlot[]
  full: boolean
}

export interface KcLivePlayerState {
  session: {
    id: string
    token: string
    title: string
    subject: string
    grade: string
    questionCount: number
    timePerQuestion: number
    status: KcLiveStatus
    currentIndex: number
    currentStartedAt: string | null
    winner: KcSlot | 'tie' | null
    playerCount: number
    slotsTaken: KcSlot[]
  }
  me: KcLivePlayerSummary | null
  opponent: KcLivePlayerSummary | null
  currentQuestion: KcQuestion | null
  alreadyAnswered: boolean
}

export interface KcLiveJoinResult {
  playerToken: string
  player: { name: string; slot: KcSlot }
  waiting: boolean
}

export interface KcLiveAnswerResult {
  correct: boolean
  correctAnswer: string | null
  pointsEarned: number
  newScore: number
  newStreak: number
  opponentAnswered: boolean
}

export interface KcCreateLiveInput {
  title?: string
  subject?: string
  grade?: string
  difficulty?: string
  topic?: string
  questionCount?: number
  timePerQuestion?: number
}

export interface KcLeaderboardRow {
  token: string
  title: string
  creatorName: string
  creatorScore: number | null
  opponentName: string | null
  opponentScore: number | null
  winner: 'creator' | 'opponent' | null
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────

function unwrap<T>(r: { data: { success: boolean; data: T; error?: string; message?: string } }): T {
  if (!r.data?.success) {
    const err = r.data?.error || 'unknown'
    const msg = r.data?.message || err
    throw new Error(msg)
  }
  return r.data.data
}

// ── Service ────────────────────────────────────────────────────────

export const keocoService = {
  // ── Teacher: classroom sessions ──
  createSession: (input: KcCreateSessionInput) =>
    api.post('/keoco/sessions', input).then(unwrap<KcSession>),

  listSessions: () =>
    api.get('/keoco/sessions').then(unwrap<KcSession[]>),

  getSession: (id: string) =>
    api.get(`/keoco/sessions/${id}`).then(unwrap<KcSessionFull>),

  startSession: (id: string) =>
    api.post(`/keoco/sessions/${id}/start`).then(unwrap<KcSession>),

  nextQuestion: (id: string) =>
    api.post(`/keoco/sessions/${id}/next`).then(unwrap<KcSession>),

  finishSession: (id: string) =>
    api.post(`/keoco/sessions/${id}/finish`).then(unwrap<KcSession>),

  deleteSession: (id: string) =>
    api.delete(`/keoco/sessions/${id}`).then((r) => r.data),

  // ── Public: students (no auth) ──
  publicGetLobby: (token: string) =>
    api.get(`/keoco/public/sessions/${token}`).then(unwrap<KcPublicLobby>),

  publicJoin: (token: string, payload: { name: string; team?: KcTeam | 'auto' }) =>
    api
      .post(`/keoco/public/sessions/${token}/join`, payload)
      .then(unwrap<{ playerToken: string; player: KcPlayer; session: Partial<KcSession> }>),

  publicState: (token: string, playerToken?: string) =>
    api
      .get(`/keoco/public/sessions/${token}/state`, {
        params: playerToken ? { playerToken } : undefined,
      })
      .then(unwrap<KcPlayerState>),

  publicAnswer: (
    token: string,
    payload: { playerToken: string; questionIdx: number; answer: string; timeMs: number },
  ) =>
    api
      .post(`/keoco/public/sessions/${token}/answer`, payload)
      .then(unwrap<KcAnswerResult>),

  // ── 1v1 Challenge ──
  createChallenge: (input: KcCreateChallengeInput) =>
    api.post('/keoco/challenges', input).then(unwrap<KcChallenge>),

  publicGetChallenge: (token: string) =>
    api.get(`/keoco/public/challenges/${token}`).then(unwrap<KcChallenge>),

  publicSubmitChallenge: (
    token: string,
    payload: { role: 'creator' | 'opponent'; name?: string; answers: KcChallengeAnswer[] },
  ) =>
    api
      .post(`/keoco/public/challenges/${token}/submit`, payload)
      .then(unwrap<KcChallengeSubmitResult>),

  challengeLeaderboard: () =>
    api.get('/keoco/challenges/leaderboard').then(unwrap<KcLeaderboardRow[]>),

  // ── Live 1v1 (synchronous) ──
  createLive: (input: KcCreateLiveInput) =>
    api.post('/keoco/lives', input).then(unwrap<KcLiveMatch>),

  listLives: () =>
    api.get('/keoco/lives').then(unwrap<KcLiveMatch[]>),

  getLive: (token: string) =>
    api.get(`/keoco/lives/${token}`).then(unwrap<KcLiveMatch>),

  deleteLive: (token: string) =>
    api.delete(`/keoco/lives/${token}`).then((r) => r.data),

  publicGetLive: (token: string) =>
    api.get(`/keoco/public/lives/${token}`).then(unwrap<KcLivePublicLobby>),

  publicJoinLive: (token: string, payload: { name: string; slot?: KcSlot }) =>
    api.post(`/keoco/public/lives/${token}/join`, payload).then(unwrap<KcLiveJoinResult>),

  publicLiveState: (token: string, playerToken?: string) =>
    api
      .get(`/keoco/public/lives/${token}/state`, {
        params: playerToken ? { playerToken } : undefined,
      })
      .then(unwrap<KcLivePlayerState>),

  publicLiveAnswer: (
    token: string,
    payload: { playerToken: string; questionIdx: number; answer: string; timeMs: number },
  ) =>
    api
      .post(`/keoco/public/lives/${token}/answer`, payload)
      .then(unwrap<KcLiveAnswerResult>),

  // ── Game catalog (GV add đề vào danh mục thi đấu) ───────────────
  listGameCatalog: (gameType: string = 'keo-co'): Promise<KcCatalogItem[]> =>
    api.get(`/games/catalog?type=${encodeURIComponent(gameType)}`)
      .then(r => Array.isArray(r.data?.items) ? r.data.items : []),

  removeFromCatalog: (id: string): Promise<void> =>
    api.delete(`/games/catalog/${id}`).then(() => undefined),

  // ── Leaderboard top players (cross-session aggregate) ───────────
  getLeaderboard: (): Promise<KcLeaderboardEntry[]> =>
    api.get(`/keoco/leaderboard`)
      .then(r => Array.isArray(r.data?.leaderboard) ? r.data.leaderboard : []),
}

export default keocoService
