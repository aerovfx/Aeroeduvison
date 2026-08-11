/**
 * Bộ nạp dữ liệu aero-backend cho quả địa cầu World Monitor trên trang chủ (Landing.tsx).
 *
 * Phản ánh worldmonitor-main/src/services/aero-backend.ts:
 *   GET {VITE_AERO_BACKEND_URL}/api/startups   → AeroStartupResponse[]
 *   GET {VITE_AERO_BACKEND_URL}/api/users-geo  → AeroUserResponse[]
 *
 * Mọi lỗi đều "mềm": hook trả về mảng rỗng và ghi log cảnh báo, nên quả địa cầu
 * vẫn render được với dữ liệu tĩnh STARTUP_HUBS + VN_PROVINCES_2025 từ
 * `@/config/world-monitor-data` và `@/config/vietnam-provinces-2025`.
 *
 * Aero backend loader for the World Monitor hero globe on Landing.tsx.
 *
 * Mirrors worldmonitor-main/src/services/aero-backend.ts:
 *   GET {VITE_AERO_BACKEND_URL}/api/startups   → AeroStartupResponse[]
 *   GET {VITE_AERO_BACKEND_URL}/api/users-geo  → AeroUserResponse[]
 *
 * All failures are soft: the hook returns empty arrays and logs a warning,
 * so the globe still renders with the static STARTUP_HUBS + VN_PROVINCES_2025
 * data from `@/config/world-monitor-data` and `@/config/vietnam-provinces-2025`.
 */

import { useEffect, useRef, useState } from 'react'

/* ──────────────────────────────────────────────────────────────
   API contract
────────────────────────────────────────────────────────────── */
export interface AeroStartupResponse {
  id: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  tier?: 'mega' | 'major' | 'emerging'
  unicorns?: number
  description?: string
  updatedAt?: string
}

export interface AeroUserResponse {
  id: string
  city: string
  country: string
  lat: number
  lon: number
  count: number
  role?: 'student' | 'teacher' | 'parent' | 'mixed'
}

export interface AeroUserMarker {
  id: string
  city: string
  country: string
  lat: number
  lon: number
  count: number
  role: 'student' | 'teacher' | 'parent' | 'mixed'
}

export interface AeroStartupMarker {
  id: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  tier: 'mega' | 'major' | 'emerging'
  unicorns?: number
  description?: string
}

/* ──────────────────────────────────────────────────────────────
   Environment helpers
────────────────────────────────────────────────────────────── */
const FETCH_TIMEOUT_MS = 8_000
const DEFAULT_POLL_MS = 300_000 // 5 minutes

interface AeroEnv {
  base: string
  token: string
  pollMs: number
}

function readEnv(): AeroEnv | null {
  const rawBase = (import.meta.env.VITE_AERO_BACKEND_URL as string | undefined)?.trim()
  if (!rawBase) return null
  const base = rawBase.replace(/\/$/, '')
  const token = ((import.meta.env.VITE_AERO_BACKEND_TOKEN as string | undefined) || '').trim()
  const pollRaw = import.meta.env.VITE_AERO_BACKEND_POLL_MS as string | undefined
  const pollMs = pollRaw !== undefined && pollRaw !== ''
    ? Number(pollRaw)
    : DEFAULT_POLL_MS
  return {
    base,
    token,
    pollMs: Number.isFinite(pollMs) ? pollMs : DEFAULT_POLL_MS,
  }
}

function buildHeaders(env: AeroEnv): HeadersInit {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (env.token) headers.authorization = `Bearer ${env.token}`
  return headers
}

async function fetchJson<T>(url: string, env: AeroEnv): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(env),
      signal: controller.signal,
      credentials: 'omit',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/* ──────────────────────────────────────────────────────────────
   Mappers
────────────────────────────────────────────────────────────── */
function mapStartup(r: AeroStartupResponse): AeroStartupMarker | null {
  if (typeof r.lat !== 'number' || typeof r.lon !== 'number') return null
  const tier: 'mega' | 'major' | 'emerging' =
    r.tier && ['mega', 'major', 'emerging'].includes(r.tier) ? r.tier : 'emerging'
  return {
    id: `aero:${r.id}`,
    name: r.name,
    city: r.city,
    country: r.country,
    lat: r.lat,
    lon: r.lon,
    tier,
    unicorns: r.unicorns,
    description: r.description,
  }
}

function mapUser(r: AeroUserResponse): AeroUserMarker | null {
  if (typeof r.lat !== 'number' || typeof r.lon !== 'number') return null
  const role: AeroUserMarker['role'] =
    r.role && ['student', 'teacher', 'parent', 'mixed'].includes(r.role) ? r.role : 'mixed'
  return {
    id: `aero-user:${r.id}`,
    city: r.city,
    country: r.country,
    lat: r.lat,
    lon: r.lon,
    count: Math.max(1, Math.floor(r.count || 1)),
    role,
  }
}

/* ──────────────────────────────────────────────────────────────
   Fetchers
────────────────────────────────────────────────────────────── */
export async function fetchAeroStartups(): Promise<AeroStartupMarker[]> {
  const env = readEnv()
  if (!env) return []
  try {
    const raw = await fetchJson<AeroStartupResponse[]>(`${env.base}/api/startups`, env)
    if (!Array.isArray(raw)) return []
    return raw.map(mapStartup).filter((x): x is AeroStartupMarker => x !== null)
  } catch (err) {
    console.warn('[aeroBackend] startups fetch failed:', err)
    return []
  }
}

export async function fetchAeroUsers(): Promise<AeroUserMarker[]> {
  const env = readEnv()
  if (!env) return []
  try {
    const raw = await fetchJson<AeroUserResponse[]>(`${env.base}/api/users-geo`, env)
    if (!Array.isArray(raw)) return []
    return raw.map(mapUser).filter((x): x is AeroUserMarker => x !== null)
  } catch (err) {
    console.warn('[aeroBackend] users fetch failed:', err)
    return []
  }
}

/* ──────────────────────────────────────────────────────────────
   React hook: useAeroGeo
────────────────────────────────────────────────────────────── */
export interface UseAeroGeoResult {
  startups: AeroStartupMarker[]
  users: AeroUserMarker[]
  loading: boolean
  error: string | null
  /** Force a refresh outside the polling interval. */
  refresh: () => void
}

/**
 * React hook that loads and auto-refreshes startups + users-geo from the
 * aero-backend. If `VITE_AERO_BACKEND_URL` is unset, it returns empty arrays
 * and `loading: false` immediately — the caller should fall back to static
 * data.
 */
export function useAeroGeo(): UseAeroGeoResult {
  const [startups, setStartups] = useState<AeroStartupMarker[]>([])
  const [users, setUsers] = useState<AeroUserMarker[]>([])
  const [loading, setLoading] = useState<boolean>(() => !!readEnv())
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const envRef = useRef<AeroEnv | null>(null)
  if (envRef.current === null) envRef.current = readEnv()

  useEffect(() => {
    const env = envRef.current
    if (!env) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    Promise.all([fetchAeroStartups(), fetchAeroUsers()])
      .then(([s, u]) => {
        if (cancelled) return
        setStartups(s)
        setUsers(u)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  // Polling
  useEffect(() => {
    const env = envRef.current
    if (!env || env.pollMs <= 0) return
    const id = setInterval(() => setTick((t) => t + 1), env.pollMs)
    return () => clearInterval(id)
  }, [])

  return {
    startups,
    users,
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
  }
}
