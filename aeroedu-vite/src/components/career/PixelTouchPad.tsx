/**
 * PixelTouchPad — Virtual D-pad + action buttons cho pixel games trên mobile.
 *
 * Render dưới canvas khi user là touch device. Phát ra synthetic keyboard
 * events ('keydown'/'keyup' on window) để game logic không cần thay đổi
 * (đã listen window.keydown).
 *
 * Layout:
 *   [⬅️ ⬆️ ➡️]            [E]  [R]
 *   [⬇️]                  [M]
 *
 * 4 direction buttons (left/up/right + down separately) + 3 action keys.
 * Hold-to-repeat: keydown khi touchstart, keyup khi touchend/touchcancel.
 */
import { useCallback, useEffect, useRef } from 'react'

interface Props {
  /** Show map button (Odyssey only) */
  hasMap?: boolean
  /** Show interact button */
  hasInteract?: boolean
  /** Show reset button */
  hasReset?: boolean
}

/** Phát keyboard event với key tương ứng — game listen window.keydown sẽ pickup. */
function dispatchKey(type: 'keydown' | 'keyup', key: string) {
  const event = new KeyboardEvent(type, { key, bubbles: true })
  window.dispatchEvent(event)
}

export default function PixelTouchPad({ hasMap = false, hasInteract = true, hasReset = true }: Props) {
  /** Track active touches per button to prevent duplicate dispatch */
  const activeKeysRef = useRef<Set<string>>(new Set())

  const handlePress = useCallback((key: string) => {
    if (activeKeysRef.current.has(key)) return
    activeKeysRef.current.add(key)
    dispatchKey('keydown', key)
  }, [])

  const handleRelease = useCallback((key: string) => {
    if (!activeKeysRef.current.has(key)) return
    activeKeysRef.current.delete(key)
    dispatchKey('keyup', key)
  }, [])

  // Cleanup: release all keys on unmount
  useEffect(() => {
    return () => {
      activeKeysRef.current.forEach(k => dispatchKey('keyup', k))
      activeKeysRef.current.clear()
    }
  }, [])

  /** Single direction/action button */
  const PadButton = ({
    label, keyName, onTap, large = false, color = 'zinc',
  }: {
    label: React.ReactNode
    keyName?: string
    onTap?: () => void
    large?: boolean
    color?: 'zinc' | 'amber' | 'cyan'
  }) => {
    const colorClass = {
      zinc: 'bg-zinc-700/80 hover:bg-zinc-600 active:bg-zinc-500 border-zinc-500',
      amber: 'bg-amber-600/80 hover:bg-amber-500 active:bg-amber-400 border-amber-400',
      cyan: 'bg-cyan-600/80 hover:bg-cyan-500 active:bg-cyan-400 border-cyan-400',
    }[color]

    return (
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault()
          if (keyName) handlePress(keyName)
          if (onTap) onTap()
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          if (keyName) handleRelease(keyName)
        }}
        onTouchCancel={(e) => {
          e.preventDefault()
          if (keyName) handleRelease(keyName)
        }}
        onMouseDown={() => {
          if (keyName) handlePress(keyName)
          if (onTap) onTap()
        }}
        onMouseUp={() => { if (keyName) handleRelease(keyName) }}
        onMouseLeave={() => { if (keyName) handleRelease(keyName) }}
        className={`${colorClass} ${large ? 'w-14 h-14' : 'w-11 h-11'}
                    rounded-xl border-2 text-white text-xl font-bold
                    flex items-center justify-center select-none touch-none
                    shadow-lg active:scale-95 transition-transform`}
        style={{ touchAction: 'none' }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="bg-zinc-900/95 backdrop-blur border-t border-zinc-800 px-3 py-3 flex items-center justify-between gap-4 md:hidden">
      {/* D-pad (left side) */}
      <div className="relative w-36 h-36 shrink-0">
        {/* Up */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          <PadButton label="↑" keyName="ArrowUp" />
        </div>
        {/* Left */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2">
          <PadButton label="←" keyName="ArrowLeft" />
        </div>
        {/* Right */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2">
          <PadButton label="→" keyName="ArrowRight" />
        </div>
        {/* Down */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <PadButton label="↓" keyName="ArrowDown" />
        </div>
        {/* Center decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-4 h-4 rounded-full bg-zinc-700/50 border border-zinc-600" />
      </div>

      {/* Action buttons (right side) */}
      <div className="flex flex-col gap-2 items-end">
        {hasInteract && (
          <PadButton label="E" keyName="e" large color="amber" />
        )}
        <div className="flex gap-2">
          {hasMap && <PadButton label="M" keyName="m" color="cyan" />}
          {hasReset && <PadButton label="R" keyName="r" color="zinc" />}
        </div>
      </div>
    </div>
  )
}
