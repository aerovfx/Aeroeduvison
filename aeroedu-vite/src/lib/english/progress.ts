/**
 * progress.ts — tiến trình & gamification kiểu Duolingo cho module English.
 *
 * Lưu localStorage (giống lib/srs.ts) — không cần backend. Gồm:
 *   - XP (điểm kinh nghiệm), streak (chuỗi ngày học liên tục)
 *   - Hearts (tim/mạng) — mất khi trả lời sai, tự hồi 1 tim / 30 phút
 *   - Hoàn thành lesson + số sao (theo % đúng) → crown cho unit
 *
 * Việc lên lịch ôn từ vựng do lib/srs.ts đảm nhiệm (subject = 'English').
 */

const KEY = 'aero_en_progress_v1'
export const MAX_HEARTS = 5
const HEART_REGEN_MS = 30 * 60 * 1000 // 30 phút / 1 tim

export interface LessonResult {
  stars: number       // 0-3
  bestScore: number   // % cao nhất
  completedAt: number
  timesDone: number
}

export interface EnProgress {
  xp: number
  streakDays: number
  lastActiveDate: string          // YYYY-MM-DD (local)
  hearts: number
  heartsTs: number                // mốc tính hồi tim
  lessons: Record<string, LessonResult>
}

//──── Đọc/ghi tiến trình từ localStorage (namespace riêng English) ────
function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00'), db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

function fresh(): EnProgress {
  return { xp: 0, streakDays: 0, lastActiveDate: '', hearts: MAX_HEARTS, heartsTs: Date.now(), lessons: {} }
}

function read(): EnProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return fresh()
}

function write(p: EnProgress): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

/** Tính lại số tim sau khi hồi theo thời gian, persist mốc mới. */
function regenHearts(p: EnProgress): EnProgress {
  if (p.hearts >= MAX_HEARTS) { p.heartsTs = Date.now(); return p }
  const elapsed = Date.now() - (p.heartsTs || Date.now())
  const gained = Math.floor(elapsed / HEART_REGEN_MS)
  if (gained > 0) {
    p.hearts = Math.min(MAX_HEARTS, p.hearts + gained)
    p.heartsTs = p.hearts >= MAX_HEARTS ? Date.now() : p.heartsTs + gained * HEART_REGEN_MS
  }
  return p
}

// ─── Public API ─────────────────────────────────────────────────────────

export function getProgress(): EnProgress {
  const p = regenHearts(read())
  write(p)
  return p
}

/** Số phút tới khi hồi thêm 1 tim (0 nếu đã đầy) */
export function minutesToNextHeart(): number {
  const p = getProgress()
  if (p.hearts >= MAX_HEARTS) return 0
  const remain = HEART_REGEN_MS - ((Date.now() - p.heartsTs) % HEART_REGEN_MS)
  return Math.max(1, Math.ceil(remain / 60000))
}

export function getHearts(): number {
  return getProgress().hearts
}

/** Mất 1 tim (trả lời sai). Trả về số tim còn lại. */
export function loseHeart(): number {
  const p = getProgress()
  if (p.hearts === MAX_HEARTS) p.heartsTs = Date.now() // bắt đầu đếm hồi
  p.hearts = Math.max(0, p.hearts - 1)
  write(p)
  return p.hearts
}

/** Hồi đầy tim (vd sau khi luyện tập / xem quảng cáo — ở đây free refill) */
export function refillHearts(): void {
  const p = getProgress()
  p.hearts = MAX_HEARTS
  p.heartsTs = Date.now()
  write(p)
}

/** Cộng XP trực tiếp */
export function addXp(n: number): void {
  const p = getProgress()
  p.xp += Math.max(0, Math.round(n))
  write(p)
}

export interface CompleteOutcome {
  xpGained: number
  stars: number
  streakDays: number
  streakIncreased: boolean
  isNewLesson: boolean
}

/**
 * Ghi nhận hoàn thành 1 lesson.
 * @param scorePct  % đúng (0-100) → quy ra sao + XP
 */
// Ghi nhận hoàn thành lesson: quy % đúng thành 0-3 sao, cộng XP, cập nhật streak theo ngày
export function completeLesson(lessonId: string, scorePct: number): CompleteOutcome {
  const p = getProgress()
  const stars = scorePct >= 95 ? 3 : scorePct >= 75 ? 2 : scorePct >= 50 ? 1 : 0
  const prev = p.lessons[lessonId]
  const isNewLesson = !prev

  // XP: bài mới 15đ, ôn lại 5đ; +5 nếu 3 sao
  let xpGained = isNewLesson ? 15 : 5
  if (stars === 3) xpGained += 5

  p.lessons[lessonId] = {
    stars: Math.max(prev?.stars || 0, stars),
    bestScore: Math.max(prev?.bestScore || 0, Math.round(scorePct)),
    completedAt: Date.now(),
    timesDone: (prev?.timesDone || 0) + 1,
  }
  p.xp += xpGained

  // Streak: tính theo ngày hoạt động
  const today = todayStr()
  let streakIncreased = false
  if (p.lastActiveDate !== today) {
    const gap = p.lastActiveDate ? daysBetween(p.lastActiveDate, today) : 999
    p.streakDays = gap === 1 ? p.streakDays + 1 : 1 // liền ngày → +1, đứt → reset 1
    p.lastActiveDate = today
    streakIncreased = true
  }

  write(p)
  return { xpGained, stars, streakDays: p.streakDays, streakIncreased, isNewLesson }
}

export function isLessonDone(lessonId: string): boolean {
  return !!getProgress().lessons[lessonId]
}

export function lessonStars(lessonId: string): number {
  return getProgress().lessons[lessonId]?.stars || 0
}

/** Tiến độ 1 unit: số lesson xong / tổng + crown (0-3 theo sao trung bình) */
export function unitProgress(lessonIds: string[]): { done: number; total: number; crown: number } {
  const p = getProgress()
  const done = lessonIds.filter(id => p.lessons[id]).length
  const total = lessonIds.length
  let crown = 0
  if (done === total && total > 0) {
    const avg = lessonIds.reduce((s, id) => s + (p.lessons[id]?.stars || 0), 0) / total
    crown = Math.round(avg)
  }
  return { done, total, crown }
}

export function resetProgress(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
