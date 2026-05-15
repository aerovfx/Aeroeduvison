/**
 * useExamMusic — Hook nhạc nền cho các trang thi đấu cá nhân
 *
 * - Phát nhạc loop khi mount
 * - Mute/unmute persisted vào localStorage 'exam-music-muted'
 * - Volume thấp 0.25 để không gây phiền
 * - Auto pause khi unmount (rời trang)
 * - Browser autoplay policy: chỉ phát sau khi user click 1 lần
 *   (toggle sẽ trigger play, hoặc khi user tương tác trang)
 *
 * Returns: { muted, toggleMute, audioReady, hasInteracted }
 */
import { useEffect, useRef, useState, useCallback } from 'react'

const MUSIC_URL = 'https://storage.googleapis.com/aeroedu-media-extreme-lattice-491123-p2/audio/jumpaorund.mp3'
const STORAGE_KEY = 'exam-music-muted'
const DEFAULT_VOLUME = 0.25

export interface ExamMusicControl {
  muted: boolean
  toggleMute: () => void
  audioReady: boolean
}

export function useExamMusic(): ExamMusicControl {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(() => {
    try {
      // Default = muted=false (nhạc bật) — nhưng autoplay browser block
      // → user click toggle hoặc tương tác trang để start
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch { return false }
  })
  const [audioReady, setAudioReady] = useState(false)

  // Khởi tạo audio element 1 lần
  useEffect(() => {
    const audio = new Audio(MUSIC_URL)
    audio.loop = true
    audio.volume = DEFAULT_VOLUME
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
  }, [])

  // Auto-play / pause theo muted state — sau interaction đầu tiên
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (muted) {
      audio.pause()
    } else {
      // Play silently fails nếu chưa user interact (browser autoplay policy)
      // → catch và log, không crash
      audio.play().catch((err) => {
        // NotAllowedError = chưa user interact → silent ignore
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

  return { muted, toggleMute, audioReady }
}
