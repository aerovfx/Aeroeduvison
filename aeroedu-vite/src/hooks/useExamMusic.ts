/**
 * useExamMusic / useBackgroundMusic — Hook nhạc nền cho trang thi đấu + game
 *
 * - Random 1 trong 3 track mỗi session (ANIME / Keep It Cool / jumpaorund)
 * - Phát loop khi mount, volume 0.25 (thấp tránh phiền)
 * - Mute persisted localStorage 'exam-music-muted'
 * - Auto pause khi unmount
 * - Browser autoplay policy: chỉ phát sau khi user click toggle hoặc
 *   tương tác trang
 *
 * Default playlist = 3 track upbeat phù hợp game/thi:
 *   1. Aylex - ANIME (4.6 MB) — anime energetic
 *   2. Walen - Keep It Cool (5.6 MB) — chill lo-fi
 *   3. jumpaorund (1.9 MB) — playful jumping
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

const GCS_BASE = 'https://storage.googleapis.com/aeroedu-media-extreme-lattice-491123-p2/audio'

export const DEFAULT_BACKGROUND_TRACKS = [
  `${GCS_BASE}/games/Aylex%20-%20ANIME.mp3`,
  `${GCS_BASE}/games/Walen%20-%20Keep%20It%20Cool.mp3`,
  `${GCS_BASE}/jumpaorund.mp3`,
]

const STORAGE_KEY = 'exam-music-muted'
const DEFAULT_VOLUME = 0.25

export interface ExamMusicControl {
  muted: boolean
  toggleMute: () => void
  audioReady: boolean
  /** Track URL hiện tại (để debug hoặc hiển thị tên bài) */
  currentTrack: string | null
}

interface Options {
  /** Override playlist — mặc định DEFAULT_BACKGROUND_TRACKS */
  tracks?: string[]
  /** Volume override (0-1) — default 0.25 */
  volume?: number
}

/** Pick 1 track ngẫu nhiên từ playlist (stable per-session) */
function pickRandomTrack(tracks: string[]): string {
  if (tracks.length === 0) return ''
  return tracks[Math.floor(Math.random() * tracks.length)]
}

export function useExamMusic(options: Options = {}): ExamMusicControl {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })
  const [audioReady, setAudioReady] = useState(false)

  // Pick track 1 lần duy nhất per-component-instance (random per session)
  const trackUrl = useMemo(() => {
    const list = options.tracks && options.tracks.length > 0
      ? options.tracks
      : DEFAULT_BACKGROUND_TRACKS
    return pickRandomTrack(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const volume = options.volume ?? DEFAULT_VOLUME

  // Khởi tạo audio element 1 lần
  useEffect(() => {
    if (!trackUrl) return
    const audio = new Audio(trackUrl)
    audio.loop = true
    audio.volume = volume
    audio.preload = 'auto'
    audioRef.current = audio

    const onCanPlay = () => setAudioReady(true)
    const onError = (e: Event) => {
      console.warn('[useExamMusic] audio load error:', e)
      setAudioReady(false)
    }
    audio.addEventListener('canplaythrough', onCanPlay)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('canplaythrough', onCanPlay)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackUrl])

  // Auto-play / pause theo muted state
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (muted) {
      audio.pause()
    } else {
      audio.play().catch((err) => {
        if (err.name !== 'NotAllowedError') {
          console.warn('[useExamMusic] play failed:', err.message)
        }
      })
    }
  }, [muted])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false') } catch {}
      return next
    })
  }, [])

  return { muted, toggleMute, audioReady, currentTrack: trackUrl || null }
}

/** Alias semantically rõ hơn cho game (= useExamMusic) */
export const useBackgroundMusic = useExamMusic
