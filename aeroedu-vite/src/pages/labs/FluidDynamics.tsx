import { useState, useRef, useEffect } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  ax: number
  ay: number
  mass: number
  pressure: number
  temperature: number
}

export default function FluidDynamics() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const [gravity, setGravity] = useState(true)
  const [viscosity, setViscosity] = useState(0.98)
  const [particleCount, setParticleCount] = useState(400)
  const [colorMode, setColorMode] = useState<'velocity' | 'pressure' | 'temperature'>('velocity')
  const [fps, setFps] = useState(0)
  const animationRef = useRef<number | null>(null)
  const fpsRef = useRef({ count: 0, time: Date.now() })
  const mouseRef = useRef({ x: 0, y: 0, active: false })

  const canvasWidth = 800
  const canvasHeight = 500

  useEffect(() => {
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * (canvasWidth - 40) + 20,
      y: Math.random() * (canvasHeight - 40) + 20,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      ax: 0,
      ay: 0,
      mass: 1,
      pressure: 0,
      temperature: 0.5 + Math.random() * 0.5,
    }))
  }, [particleCount])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    const handleMouseEnter = () => {
      mouseRef.current.active = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseenter', handleMouseEnter)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    const simulate = () => {
      const particles = particlesRef.current

      particles.forEach((p) => {
        p.ax = 0
        p.ay = gravity ? 0.3 : 0

        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x
          const dy = mouseRef.current.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100 && dist > 0) {
            const force = (100 - dist) / 100 * 0.5
            p.ax += (dx / dist) * force
            p.ay += (dy / dist) * force
          }
        }

        particles.forEach((other) => {
          if (p === other) return
          const dx = other.x - p.x
          const dy = other.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = 10

          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist
            const angle = Math.atan2(dy, dx)
            p.ax -= Math.cos(angle) * overlap * 0.01
            p.ay -= Math.sin(angle) * overlap * 0.01
          }

          if (dist < 50 && dist > 0) {
            p.pressure += 0.01 / (dist + 1)
          }
        })
      })

      particles.forEach((p) => {
        p.vx += p.ax
        p.vy += p.ay

        p.vx *= viscosity
        p.vy *= viscosity

        p.x += p.vx
        p.y += p.vy

        if (p.x < 5) {
          p.x = 5
          p.vx *= -0.8
        }
        if (p.x > canvasWidth - 5) {
          p.x = canvasWidth - 5
          p.vx *= -0.8
        }
        if (p.y < 5) {
          p.y = 5
          p.vy *= -0.8
        }
        if (p.y > canvasHeight - 5) {
          p.y = canvasHeight - 5
          p.vy *= -0.8
        }

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        p.temperature = 0.5 + speed / 10

        p.pressure *= 0.95
      })

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      ctx.strokeStyle = '#4f46e5'
      ctx.lineWidth = 2
      ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4)

      particles.forEach((p) => {
        let color = '#ffffff'

        if (colorMode === 'velocity') {
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
          const normalized = Math.min(speed / 5, 1)
          const hue = 240 - normalized * 240
          color = `hsl(${hue}, 100%, 50%)`
        } else if (colorMode === 'pressure') {
          const normalized = Math.min(p.pressure, 1)
          const hue = 240 - normalized * 120
          color = `hsl(${hue}, 100%, 50%)`
        } else if (colorMode === 'temperature') {
          const hue = (1 - p.temperature) * 240
          color = `hsl(${hue}, 100%, 50%)`
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      fpsRef.current.count++
      const now = Date.now()
      if (now - fpsRef.current.time > 1000) {
        setFps(fpsRef.current.count)
        fpsRef.current.count = 0
        fpsRef.current.time = now
      }

      animationRef.current = requestAnimationFrame(simulate)
    }

    animate()

    function animate() {
      simulate()
    }

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseenter', handleMouseEnter)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gravity, viscosity, colorMode])

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-3xl font-bold text-indigo-400">Fluid Dynamics Simulator</h1>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-indigo-500/50 cursor-pointer"
      />

      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-indigo-500/30 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <label className="text-sm font-semibold text-indigo-300 block mb-2">Viscosity</label>
              <input
                type="range"
                min="0.90"
                max="0.99"
                step="0.01"
                value={viscosity}
                onChange={(e) => setViscosity(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <span className="text-indigo-400 font-bold">{viscosity.toFixed(2)}</span>
            </div>
            <div>
              <label className="text-sm font-semibold text-indigo-300 block mb-2">Particle Count</label>
              <input
                type="range"
                min="100"
                max="600"
                step="50"
                value={particleCount}
                onChange={(e) => setParticleCount(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <span className="text-indigo-400 font-bold">{particleCount}</span>
            </div>
            <div className="flex gap-2 items-end">
              <button
                onClick={() => setGravity(!gravity)}
                className={`px-4 py-2 rounded font-semibold transition-all ${
                  gravity ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {gravity ? 'Gravity ON' : 'Gravity OFF'}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            {(['velocity', 'pressure', 'temperature'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setColorMode(mode)}
                className={`px-4 py-2 rounded font-semibold transition-all ${
                  colorMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Color: {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs uppercase">FPS</p>
              <p className="text-indigo-300 font-bold text-lg">{fps}</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs uppercase">Active Particles</p>
              <p className="text-indigo-300 font-bold text-lg">{particleCount}</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs uppercase">Interaction</p>
              <p className="text-indigo-300 font-bold text-sm">Hover to Push | Adjust Sliders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
