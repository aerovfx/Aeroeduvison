/**
 * progress.ts — tiến trình & gamification cho module Toán (Hành trình Toán học).
 * Lưu localStorage riêng (key 'aero_math_progress_v1'). XP, streak, tim, sao.
 * (Cùng cơ chế với module Tiếng Anh nhưng namespace riêng.)
 */
const KEY = 'aero_math_progress_v1'
export const MAX_HEARTS = 5
const HEART_REGEN_MS = 30 * 60 * 1000

export interface LessonResult { stars: number; bestScore: number; completedAt: number; timesDone: number }
export interface MathProgress {
  xp: number; streakDays: number; lastActiveDate: string
  hearts: number; heartsTs: number; lessons: Record<string, LessonResult>
}

function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000)
}
function fresh(): MathProgress {
  return { xp: 0, streakDays: 0, lastActiveDate: '', hearts: MAX_HEARTS, heartsTs: Date.now(), lessons: {} }
}
function read(): MathProgress {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...fresh(), ...JSON.parse(raw) } } catch { /* ignore */ }
  return fresh()
}
function write(p: MathProgress): void { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ } }

function regenHearts(p: MathProgress): MathProgress {
  if (p.hearts >= MAX_HEARTS) { p.heartsTs = Date.now(); return p }
  const gained = Math.floor((Date.now() - (p.heartsTs || Date.now())) / HEART_REGEN_MS)
  if (gained > 0) {
    p.hearts = Math.min(MAX_HEARTS, p.hearts + gained)
    p.heartsTs = p.hearts >= MAX_HEARTS ? Date.now() : p.heartsTs + gained * HEART_REGEN_MS
  }
  return p
}

export function getProgress(): MathProgress { const p = regenHearts(read()); write(p); return p }
export function getHearts(): number { return getProgress().hearts }
export function minutesToNextHeart(): number {
  const p = getProgress()
  if (p.hearts >= MAX_HEARTS) return 0
  return Math.max(1, Math.ceil((HEART_REGEN_MS - ((Date.now() - p.heartsTs) % HEART_REGEN_MS)) / 60000))
}
export function loseHeart(): number {
  const p = getProgress()
  if (p.hearts === MAX_HEARTS) p.heartsTs = Date.now()
  p.hearts = Math.max(0, p.hearts - 1); write(p); return p.hearts
}
export function refillHearts(): void { const p = getProgress(); p.hearts = MAX_HEARTS; p.heartsTs = Date.now(); write(p) }

export interface CompleteOutcome { xpGained: number; stars: number; streakDays: number; isNewLesson: boolean }
export function completeLesson(lessonId: string, scorePct: number): CompleteOutcome {
  const p = getProgress()
  const stars = scorePct >= 95 ? 3 : scorePct >= 75 ? 2 : scorePct >= 50 ? 1 : 0
  const prev = p.lessons[lessonId]
  const isNewLesson = !prev
  let xpGained = isNewLesson ? 20 : 6
  if (stars === 3) xpGained += 6
  p.lessons[lessonId] = {
    stars: Math.max(prev?.stars || 0, stars),
    bestScore: Math.max(prev?.bestScore || 0, Math.round(scorePct)),
    completedAt: Date.now(), timesDone: (prev?.timesDone || 0) + 1,
  }
  p.xp += xpGained
  const today = todayStr()
  if (p.lastActiveDate !== today) {
    const gap = p.lastActiveDate ? daysBetween(p.lastActiveDate, today) : 999
    p.streakDays = gap === 1 ? p.streakDays + 1 : 1
    p.lastActiveDate = today
  }
  write(p)
  return { xpGained, stars, streakDays: p.streakDays, isNewLesson }
}
export function isLessonDone(lessonId: string): boolean { return !!getProgress().lessons[lessonId] }
export function lessonStars(lessonId: string): number { return getProgress().lessons[lessonId]?.stars || 0 }
