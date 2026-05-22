/**
 * KgAudioPlayer — Floating music player cho Knowledge Graph.
 *
 * 3 track instrumental thư giãn từ freetouse.com:
 *  - Aventure — Sunset (3:30)
 *  - Hoffy Beats — Florida Keys (3:42)
 *  - Aventure — A Beautiful Garden (3:18)
 *
 * UI: nút floating bottom-right góc canvas.
 *   - Bấm icon nhạc → toggle play/pause
 *   - Bấm để mở panel: chọn track + chỉnh volume + skip
 *   - Auto loop sang track tiếp theo khi 1 bài kết thúc
 *   - Persist preferences (enabled/volume/track) trong localStorage
 *   - Resume từ trang trước khi user rời + quay lại
 *
 * Lưu ý browser autoplay policy:
 * - <audio>.play() chỉ work sau 1 user gesture đầu tiên
 * - Mặc định enabled=false → user click để bật lần đầu
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Music, Music2, SkipForward, SkipBack, Volume2, VolumeX, X, Play, Pause } from 'lucide-react'
import { KG_TRACKS, loadAudioPref, saveAudioPref } from '@/lib/kgAudio'

export default function KgAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume]   = useState(0.45)
  const [trackIdx, setTrackIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load preferences mount-time
  useEffect(() => {
    const p = loadAudioPref()
    setEnabled(p.enabled)
    setVolume(p.volume)
    setTrackIdx(p.trackIdx)
    setLoaded(true)
  }, [])

  // Apply volume + try play khi enabled/track thay đổi
  useEffect(() => {
    if (!loaded || !audioRef.current) return
    audioRef.current.volume = volume
    if (enabled) {
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch(() => {
          // Autoplay blocked — yêu cầu user gesture trước
          setPlaying(false)
        })
    } else {
      audioRef.current.pause()
      setPlaying(false)
    }
  }, [enabled, trackIdx, loaded, volume])

  const togglePlay = useCallback(() => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    saveAudioPref({ enabled: newEnabled })
  }, [enabled])

  const setVolumeP = useCallback((v: number) => {
    setVolume(v)
    saveAudioPref({ volume: v })
  }, [])

  const skipTrack = useCallback((dir: 1 | -1) => {
    const next = (trackIdx + dir + KG_TRACKS.length) % KG_TRACKS.length
    setTrackIdx(next)
    saveAudioPref({ trackIdx: next })
  }, [trackIdx])

  const pickTrack = useCallback((idx: number) => {
    setTrackIdx(idx)
    saveAudioPref({ trackIdx: idx })
    if (!enabled) {
      setEnabled(true)
      saveAudioPref({ enabled: true })
    }
  }, [enabled])

  // Auto-loop sang track tiếp theo khi 1 bài kết thúc
  const onAudioEnded = useCallback(() => {
    skipTrack(1)
  }, [skipTrack])

  const track = KG_TRACKS[trackIdx]

  return (
    <>
      {/* Hidden audio element — single instance */}
      <audio
        ref={audioRef}
        src={track.url}
        onEnded={onAudioEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="none"
        crossOrigin="anonymous"
      />

      {/* Floating mini-button.
          Mobile (max-md): bottom-20 — trên mobile tab bar (h-14 = 56px).
          Desktop (md+):   bottom-3 — góc canvas. */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Đóng player' : `Nhạc nền: ${enabled ? 'đang phát' : 'tắt'}`}
        className={`absolute right-3 bottom-20 md:bottom-3 z-30 p-2.5 rounded-full
                    backdrop-blur shadow-lg border-2 transition hover:scale-110
                    ${enabled && playing
                      ? 'bg-gradient-to-br from-purple-500/90 to-pink-500/90 border-pink-300/70 text-white animate-pulse'
                      : 'bg-zinc-900/90 border-zinc-600/60 text-zinc-300 hover:text-white'
                    }`}
      >
        {enabled && playing ? <Music2 className="w-4 h-4" /> : <Music className="w-4 h-4" />}
      </button>

      {/* Expandable panel — responsive width cho mobile */}
      {open && (
        <div className="absolute right-3 bottom-32 md:bottom-16 z-30 w-[calc(100vw-24px)] max-w-[280px]
                        rounded-xl bg-zinc-950/95 border-2 border-purple-400/30 shadow-2xl
                        backdrop-blur p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
            <div className="text-base">🎵</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">Nhạc nền thư giãn</div>
              <div className="text-[9px] text-zinc-500">freetouse.com — không bản quyền</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Now playing */}
          <div className="mb-3 px-2 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10
                          border border-purple-400/20">
            <div className="text-[9px] uppercase text-purple-300/70 font-bold tracking-wider mb-0.5">
              {track.mood}
            </div>
            <div className="text-xs font-bold text-white truncate">{track.title}</div>
            <div className="text-[10px] text-zinc-400">{track.duration}</div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => skipTrack(-1)}
              className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
              title="Bài trước"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={togglePlay}
              className={`p-2.5 rounded-full transition shadow-lg hover:scale-105
                          ${enabled
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                            : 'bg-zinc-700/80 text-zinc-200 hover:bg-zinc-600'}`}
              title={enabled ? 'Tạm dừng' : 'Phát nhạc'}
            >
              {enabled && playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => skipTrack(1)}
              className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
              title="Bài tiếp"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-2 mb-3 px-1">
            {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                          : <Volume2 className="w-3.5 h-3.5 text-zinc-400" />}
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={volume}
              onChange={e => setVolumeP(parseFloat(e.target.value))}
              className="flex-1 accent-purple-400 h-1"
            />
            <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Track list */}
          <div className="space-y-0.5 max-h-32 overflow-y-auto scrollbar-thin">
            {KG_TRACKS.map((t, i) => {
              const active = i === trackIdx
              return (
                <button
                  key={t.id}
                  onClick={() => pickTrack(i)}
                  className={`w-full text-left p-1.5 rounded-md text-xs transition
                              ${active
                                ? 'bg-purple-500/20 border border-purple-400/40 text-white'
                                : 'hover:bg-zinc-800/60 text-zinc-300 border border-transparent'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">{active && playing ? '▶' : '🎵'}</span>
                    <span className="flex-1 truncate font-medium">{t.title}</span>
                    <span className="text-[9px] text-zinc-500">{t.duration}</span>
                  </div>
                  <div className="text-[9px] text-zinc-500 pl-4">{t.mood}</div>
                </button>
              )
            })}
          </div>

          {/* Hint */}
          <div className="mt-2 pt-2 border-t border-zinc-800 text-[9px] text-zinc-500 text-center italic">
            💡 Nhạc instrumental — tăng tập trung khi học
          </div>
        </div>
      )}
    </>
  )
}
