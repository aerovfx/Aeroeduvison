/**
 * MusicToggle — Floating button góc trên phải để tắt/bật nhạc nền
 *
 * Wrap useExamMusic hook + render icon Volume2 / VolumeX với badge animated
 * khi đang phát. Tooltip giải thích.
 *
 * Usage trong page:
 *   <MusicToggle />
 *   (hook tự khởi tạo audio, persist mute state)
 */
import { Volume2, VolumeX } from 'lucide-react'
import { useExamMusic } from '@/hooks/useExamMusic'

interface Props {
  /** Vị trí absolute (default: 'fixed top-right') */
  position?: 'fixed' | 'absolute'
  /** Top offset (default: 16) */
  top?: number
  /** Right offset (default: 16) */
  right?: number
  /** Z-index (default: 50) */
  zIndex?: number
}

export default function MusicToggle({
  position = 'fixed',
  top = 16,
  right = 16,
  zIndex = 50,
}: Props) {
  const { muted, toggleMute, audioReady } = useExamMusic()

  return (
    <button
      onClick={toggleMute}
      title={muted
        ? 'Bật nhạc nền (giúp tập trung khi thi)'
        : 'Tắt nhạc nền (nếu thấy phiền)'}
      style={{
        position, top, right, zIndex,
        width: 40, height: 40, borderRadius: '50%',
        background: muted ? 'rgba(100, 116, 139, 0.7)' : 'rgba(124, 58, 237, 0.85)',
        backdropFilter: 'blur(8px)',
        border: muted
          ? '1px solid rgba(255,255,255,0.2)'
          : '1px solid rgba(167, 139, 250, 0.5)',
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: muted
          ? '0 4px 12px rgba(0,0,0,0.2)'
          : '0 0 16px rgba(124, 58, 237, 0.4), 0 4px 12px rgba(0,0,0,0.2)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {muted
        ? <VolumeX size={18} />
        : (
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Volume2 size={18} />
            {audioReady && (
              <span style={{
                position: 'absolute', top: -2, right: -3, width: 6, height: 6,
                borderRadius: '50%', background: '#10b981',
                boxShadow: '0 0 6px #10b981',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            )}
          </span>
        )}
      <style>{`@keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
      }`}</style>
    </button>
  )
}
