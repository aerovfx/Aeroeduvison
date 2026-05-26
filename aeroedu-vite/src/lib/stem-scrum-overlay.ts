/**
 * stem-scrum-overlay.ts — Overlay localStorage cho Scrum metadata
 *
 * User: "cập nhật như 1 dự án áp dụng Agile Scrum để quản lí"
 *
 * Backend /api/teacher/stem-projects/:id/dashboard chưa có sprints/standups/
 * retros/DoD persist. Trong khi chờ BE bổ sung, ta lưu các metadata này
 * vào localStorage keyed by projectId — đủ để UX phong phú cho GV.
 *
 * Keys:
 *   stem-scrum-{projectId}-sprint-goals     → Record<sprintNumber, string>
 *   stem-scrum-{projectId}-retros           → Record<sprintNumber, SprintRetro>
 *   stem-scrum-{projectId}-standups         → DailyStandup[]
 *   stem-scrum-{projectId}-dod              → string[]
 *   stem-scrum-{projectId}-review-notes     → Record<sprintNumber, string>
 */

export interface SprintRetro {
  wentWell: string[]
  didNotGoWell: string[]
  improvements: string[]
}

export interface DailyStandup {
  id: string
  sprintNumber: number
  date: string                  // YYYY-MM-DD
  author: string
  yesterday: string
  today: string
  blockers: string
}

/* ── Generic helpers ─────────────────────────────────────────────── */

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch { return fallback }
}

function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

function k(projectId: string, suffix: string) {
  return `stem-scrum-${projectId}-${suffix}`
}

/* ── Sprint Goals ─────────────────────────────────────────────────── */

export function getSprintGoals(projectId: string): Record<number, string> {
  return readJson<Record<number, string>>(k(projectId, 'sprint-goals'), {})
}

export function getSprintGoal(projectId: string, sprintNumber: number): string {
  return getSprintGoals(projectId)[sprintNumber] || ''
}

export function setSprintGoal(projectId: string, sprintNumber: number, goal: string): void {
  const all = getSprintGoals(projectId)
  if (goal.trim()) all[sprintNumber] = goal.trim()
  else delete all[sprintNumber]
  writeJson(k(projectId, 'sprint-goals'), all)
}

/* ── Retrospectives ───────────────────────────────────────────────── */

const EMPTY_RETRO: SprintRetro = { wentWell: [], didNotGoWell: [], improvements: [] }

export function getRetros(projectId: string): Record<number, SprintRetro> {
  return readJson<Record<number, SprintRetro>>(k(projectId, 'retros'), {})
}

export function getRetro(projectId: string, sprintNumber: number): SprintRetro {
  return getRetros(projectId)[sprintNumber] || { ...EMPTY_RETRO }
}

export function setRetro(projectId: string, sprintNumber: number, retro: SprintRetro): void {
  const all = getRetros(projectId)
  all[sprintNumber] = retro
  writeJson(k(projectId, 'retros'), all)
}

/* ── Daily Standups ───────────────────────────────────────────────── */

export function getStandups(projectId: string): DailyStandup[] {
  return readJson<DailyStandup[]>(k(projectId, 'standups'), [])
}

export function getStandupsForSprint(projectId: string, sprintNumber: number): DailyStandup[] {
  return getStandups(projectId)
    .filter((s) => s.sprintNumber === sprintNumber)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function addStandup(
  projectId: string,
  note: Omit<DailyStandup, 'id'>,
): DailyStandup {
  const list = getStandups(projectId)
  const standup: DailyStandup = {
    ...note,
    id: `su_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  }
  list.push(standup)
  writeJson(k(projectId, 'standups'), list)
  return standup
}

export function deleteStandup(projectId: string, standupId: string): void {
  const list = getStandups(projectId).filter((s) => s.id !== standupId)
  writeJson(k(projectId, 'standups'), list)
}

/* ── Definition of Done ───────────────────────────────────────────── */

export function getDefinitionOfDone(projectId: string): string[] {
  return readJson<string[]>(k(projectId, 'dod'), [])
}

export function setDefinitionOfDone(projectId: string, items: string[]): void {
  writeJson(k(projectId, 'dod'), items.filter((x) => x.trim()))
}

/* ── Sprint Review notes (demo summary) ──────────────────────────── */

export function getReviewNotes(projectId: string): Record<number, string> {
  return readJson<Record<number, string>>(k(projectId, 'review-notes'), {})
}

export function setReviewNote(projectId: string, sprintNumber: number, note: string): void {
  const all = getReviewNotes(projectId)
  if (note.trim()) all[sprintNumber] = note.trim()
  else delete all[sprintNumber]
  writeJson(k(projectId, 'review-notes'), all)
}
