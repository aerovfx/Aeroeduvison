/**
 * BuffaloRunner — Mini game kiểu Chrome dinosaur, theme Việt Nam:
 *   Con trâu nhảy qua bụi tre.
 *
 * Dùng cho màn hình chờ AI sinh đề thi (Wayground "Understanding Document...").
 *
 * Điều khiển: Space / ↑ / Click / Tap để nhảy.
 * Game tự pause khi component unmount.
 *
 * Render bằng <canvas> + emoji 🐃 🎋 ☁️ — không cần ảnh ngoài.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, Play } from 'lucide-react'

interface Props {
  /** Tự bật game khi mount. Mặc định false (bấm Play) */
  autoStart?: boolean
  /** Optional: callback khi đạt mốc điểm */
  onScoreUpdate?: (score: number) => void
}

interface Obstacle {
  x: number
  width: number
  height: number
  passed: boolean
}

const W = 600
const H = 180
const GROUND_Y = 150
const BUFFALO_X = 60
const BUFFALO_SIZE = 38
const GRAVITY = 0.7
const JUMP_VELOCITY = -13

export default function BuffaloRunner({ autoStart = false, onScoreUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const stateRef = useRef({
    running: false,
    over: false,
    y: GROUND_Y,
    vy: 0,
    obstacles: [] as Obstacle[],
    score: 0,
    speed: 5,
    spawnCooldown: 0,
    cloudX: 480,
    runFrame: 0,
    frameTick: 0,
  })
  const [, force] = useState(0)
  const rerender = useCallback(() => force(n => n + 1), [])

  // ── Reset & start ───────────────────────────────────────
  const reset = useCallback(() => {
    const s = stateRef.current
    s.running = true
    s.over = false
    s.y = GROUND_Y
    s.vy = 0
    s.obstacles = []
    s.score = 0
    s.speed = 5
    s.spawnCooldown = 60
    s.cloudX = 480
    rerender()
  }, [rerender])

  // ── Jump ────────────────────────────────────────────────
  const jump = useCallback(() => {
    const s = stateRef.current
    if (!s.running) {
      reset()
      return
    }
    if (s.over) {
      reset()
      return
    }
    // chỉ jump khi đang ở mặt đất
    if (s.y >= GROUND_Y - 0.5) {
      s.vy = JUMP_VELOCITY
    }
  }, [reset])

  // ── Game loop ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = W * (window.devicePixelRatio || 1)
    canvas.height = H * (window.devicePixelRatio || 1)
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)

    const tick = () => {
      const s = stateRef.current
      ctx.clearRect(0, 0, W, H)

      // Sky
      ctx.fillStyle = 'rgba(124, 58, 237, 0.04)'
      ctx.fillRect(0, 0, W, GROUND_Y + 6)

      // Cloud (chậm)
      ctx.font = '24px serif'
      ctx.textBaseline = 'middle'
      ctx.fillText('☁️', s.cloudX, 30)
      ctx.fillText('☁️', s.cloudX + 220, 50)
      if (s.running && !s.over) {
        s.cloudX -= 0.5
        if (s.cloudX < -260) s.cloudX = W + 20
      }

      // Ground line
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y + 6)
      ctx.lineTo(W, GROUND_Y + 6)
      ctx.stroke()
      // Ground dots (cảm giác chuyển động)
      ctx.fillStyle = '#94a3b8'
      const dotOffset = (s.score * 2) % 24
      for (let x = -dotOffset; x < W; x += 24) {
        ctx.fillRect(x, GROUND_Y + 11, 4, 2)
      }

      // Physics
      if (s.running && !s.over) {
        s.vy += GRAVITY
        s.y += s.vy
        if (s.y > GROUND_Y) {
          s.y = GROUND_Y
          s.vy = 0
        }
        // Run frame anim
        s.frameTick++
        if (s.frameTick > 6) { s.runFrame = (s.runFrame + 1) % 2; s.frameTick = 0 }
        // Score & speed
        s.score++
        if (s.score % 200 === 0 && s.speed < 11) s.speed += 0.5
        if (onScoreUpdate && s.score % 50 === 0) onScoreUpdate(s.score)

        // Spawn obstacle
        s.spawnCooldown--
        if (s.spawnCooldown <= 0) {
          const tall = Math.random() > 0.5
          s.obstacles.push({
            x: W + 10,
            width: tall ? 26 : 22,
            height: tall ? 50 : 38,
            passed: false,
          })
          s.spawnCooldown = 60 + Math.floor(Math.random() * 70)
        }

        // Move obstacles + collision
        for (const o of s.obstacles) {
          o.x -= s.speed
          // collision box (bounding rect)
          const bx1 = BUFFALO_X + 4, bx2 = BUFFALO_X + BUFFALO_SIZE - 4
          const by1 = s.y - BUFFALO_SIZE + 6, by2 = s.y - 2
          const ox1 = o.x + 3, ox2 = o.x + o.width - 3
          const oy1 = GROUND_Y - o.height + 6, oy2 = GROUND_Y - 2
          if (bx1 < ox2 && bx2 > ox1 && by1 < oy2 && by2 > oy1) {
            s.over = true
          }
        }
        s.obstacles = s.obstacles.filter(o => o.x + o.width > -10)
      }

      // Draw bamboo (tre)
      ctx.font = '40px serif'
      ctx.textBaseline = 'bottom'
      for (const o of s.obstacles) {
        // tall obstacles dùng emoji 🎋 (cao); short → 🌿 (lá)
        const emoji = o.height > 45 ? '🎋' : '🌿'
        ctx.font = `${o.height}px serif`
        ctx.fillText(emoji, o.x, GROUND_Y + 4)
      }

      // Draw buffalo (trâu) — lật ngang để mặt nhìn QUA PHẢI (chiều chạy).
      // Animation run: bob lên xuống + tilt nhẹ + mặt đất nhún để cảm giác guốc đập đất.
      ctx.save()
      ctx.translate(BUFFALO_X + BUFFALO_SIZE / 2, s.y)
      // Trâu mặc định trên hầu hết hệ điều hành nhìn TRÁI (face left).
      // scaleX(-1) để lật mặt nhìn PHẢI (theo chiều chạy).
      ctx.scale(-1, 1)
      const onGround = s.y >= GROUND_Y - 0.5
      const bob = onGround ? (s.runFrame === 1 ? 3 : 0) : 0
      const tilt = onGround ? (s.runFrame === 1 ? 0.05 : -0.03) : -0.18
      ctx.rotate(tilt)
      ctx.font = `${BUFFALO_SIZE}px serif`
      ctx.textBaseline = 'bottom'
      ctx.textAlign = 'center'
      ctx.fillText('🐃', 0, 6 + bob)
      ctx.restore()
      // Bụi mờ dưới chân khi đang chạy + chạm đất
      if (onGround && s.runFrame === 0) {
        ctx.fillStyle = 'rgba(148,163,184,0.4)'
        ctx.beginPath()
        ctx.ellipse(BUFFALO_X + BUFFALO_SIZE / 2 - 14, GROUND_Y + 2, 6, 2, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      // HUD
      ctx.fillStyle = '#475569'
      ctx.font = 'bold 14px ui-monospace, SFMono-Regular, monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.fillText(`HI ${Math.max(s.score, Number(localStorage.getItem('br_hi') || 0))}  ${String(s.score).padStart(5, '0')}`, W - 12, 8)

      // Save high score
      if (s.over) {
        const hi = Math.max(s.score, Number(localStorage.getItem('br_hi') || 0))
        localStorage.setItem('br_hi', String(hi))
        // overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.font = 'bold 20px sans-serif'
        ctx.fillText('Trâu vướng tre rồi! 🐃🎋', W / 2, 70)
        ctx.font = '13px sans-serif'
        ctx.fillText(`Bấm Space hoặc chạm để chơi lại  ·  Cao nhất: ${hi}`, W / 2, 100)
      }
      if (!s.running) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.font = 'bold 18px sans-serif'
        ctx.fillText('🐃 Trâu nhảy qua tre', W / 2, 75)
        ctx.font = '13px sans-serif'
        ctx.fillText('Bấm Space / ↑ / chạm màn hình để bắt đầu', W / 2, 100)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    if (autoStart) reset()
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Input ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jump])

  const s = stateRef.current

  return (
    <div style={{
      width: W, maxWidth: '100%', margin: '0 auto',
      background: 'var(--ai-card-bg)',
      border: '1px solid var(--ai-card-border)',
      borderRadius: 12, padding: 12, position: 'relative',
      userSelect: 'none', touchAction: 'manipulation',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, fontSize: 12, color: 'var(--ai-muted-text)',
      }}>
        <span>🐃 Mini game: Trâu nhảy qua bụi tre</span>
        <button onClick={() => { stateRef.current.over = false; stateRef.current.running = false; reset() }} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'transparent', border: '1px solid var(--ai-card-border)',
          borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
          color: 'var(--ai-muted-text)', fontSize: 11, fontWeight: 600,
        }}>
          <RotateCcw size={11} /> Reset
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump() }}
        style={{
          display: 'block', borderRadius: 8, cursor: 'pointer',
          background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        }}
      />
      {!s.running && (
        <button onClick={() => reset()} style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(90deg, #ec4899, #db2777)', color: '#fff',
          border: 'none', borderRadius: 999, padding: '10px 20px',
          fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 14, boxShadow: '0 4px 12px rgba(236,72,153,0.35)',
        }}>
          <Play size={14} /> Bắt đầu
        </button>
      )}
    </div>
  )
}
