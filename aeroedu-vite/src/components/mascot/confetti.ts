/**
 * confetti.ts — Pháo giấy tự vẽ trên canvas (không cần thư viện).
 * burstConfetti() tạo overlay canvas full màn, bắn hạt rơi rồi tự xoá.
 */
export function burstConfetti(originXFrac = 0.5, originYFrac = 0.6, count = 90) {
  if (typeof document === 'undefined') return
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.remove(); return }

  const colors = ['#22d3ee', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#fb923c']
  const ox = originXFrac * canvas.width
  const oy = originYFrac * canvas.height
  const parts = Array.from({ length: count }, () => {
    const ang = Math.random() * Math.PI * 2
    const spd = 4 + Math.random() * 7
    return {
      x: ox, y: oy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 5,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    }
  })

  let raf = 0
  const start = performance.now()
  const tick = () => {
    const t = (performance.now() - start) / 1000
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of parts) {
      p.vy += 0.22 // trọng lực
      p.x += p.vx; p.y += p.vy; p.rot += p.vr
      p.life = Math.max(0, 1 - t / 1.6)
      if (p.life > 0 && p.y < canvas.height + 20) {
        alive = true
        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
    }
    if (alive && t < 2) raf = requestAnimationFrame(tick)
    else { cancelAnimationFrame(raf); canvas.remove() }
  }
  raf = requestAnimationFrame(tick)
}
