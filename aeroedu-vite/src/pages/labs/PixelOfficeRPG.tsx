/**
 * PixelOfficeRPG — Game pixel art RPG VS Code-themed với AI agent chat
 *
 * Route: /dashboard/labtwin/labs/pixel-office-rpg
 *
 * User: paste HTML reference complete với:
 *   - VS Code UI (tabs, sidebar icons, status bar đỏ)
 *   - Bản đồ top-down 18×13 tile 32px (văn phòng 2 phòng)
 *   - WASD/arrow di chuyển nhân vật pixel art
 *   - 3 NPC Agents wander tự động + Agent #1 "Busy" indicator
 *   - Chat panel phải với messages + quick buttons
 *   - Tooltip + WASD hint
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────
const TILE = 32
const COLS = 18
const ROWS = 13

// 0=floor 1=wall 2=desk 3=plant 4=monitor 5=window 6=shelf 7=chair 8=rug 9=path
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,2,0,0,1,0,0,0,5,0,0,0,0,1],
  [1,0,4,4,0,2,0,0,1,0,6,6,6,6,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,3,1],
  [1,3,0,0,0,0,0,0,9,0,0,8,8,8,0,0,0,1],
  [1,0,0,0,0,0,0,0,9,0,0,8,7,8,0,3,0,1],
  [1,0,2,2,0,0,0,0,9,0,0,8,8,8,0,0,0,1],
  [1,0,0,0,0,3,0,0,9,0,0,0,0,0,0,0,0,1],
  [1,0,2,2,2,0,0,0,1,0,6,6,6,0,0,0,3,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,2,2,0,1],
  [1,3,0,0,0,0,0,0,1,0,0,0,0,0,4,0,0,1],
  [1,0,0,0,5,0,0,0,1,0,0,3,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

const C = {
  floor1: '#4a6741', floor2: '#3d5934',
  wall: '#2c1810', wallTop: '#6b3a28',
  desk: '#8B5E3C', desk2: '#7a4e2c', desk3: '#5c3920',
  carpet: '#1a3a5c', carpet2: '#153252',
  plant: '#2d6a2d', plantStem: '#4a8a2d', plantPot: '#8B4513',
  monitor: '#1a1a2e',
  window: '#87ceeb', windowFrame: '#8B6914',
  shelf: '#6B4423',
  chair: '#c0392b', chairSeat: '#922b21',
  rugBorder: '#c0396b',
  path: '#7a6a50',
}

const AGENT_REPLIES = [
  'Đang phân tích codebase... tìm thấy 47 file. Kiến trúc khá sạch.',
  'Subagent #1 hoàn thành! Đề xuất: tạo landing page với demo video.',
  'Subagent #2 báo cáo: 3 TODO còn lại, coverage test ~82%.',
  'Tôi sẽ khám phá khu vực phía Đông của bản đồ ngay bây giờ.',
  'Phát hiện pattern thú vị trong module xử lý dữ liệu. Tối ưu hoá 30% tốc độ.',
  'Đã gọi thêm 2 subagent để xử lý song song nhiệm vụ mới.',
  'Mission complete! Kết quả được lưu vào /reports/summary.md',
]

// ── Types ─────────────────────────────────────────────────────
interface Player { x: number; y: number; px: number; py: number; moving: boolean }
interface NPC { x: number; y: number; px: number; py: number; color: string; name: string; busy: boolean }
type ChatMsg = { type: 'user' | 'agent' | 'system'; text: string; label?: string }

// ── Helper drawing functions ──────────────────────────────────
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, stroke?: string) {
  ctx.fillStyle = c
  ctx.fillRect(x, y, w, h)
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
  }
}

function walkable(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false
  const t = MAP[ty][tx]
  return t === 0 || t === 8 || t === 9
}

function drawFloor(ctx: CanvasRenderingContext2D) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = MAP[row][col]
      const x = col * TILE, y = row * TILE
      const odd = (row + col) % 2
      if (t === 1) {
        rect(ctx, x, y, TILE, TILE, C.wall)
        rect(ctx, x, y, TILE, 4, C.wallTop)
      } else if (t === 9) {
        rect(ctx, x, y, TILE, TILE, C.path)
        rect(ctx, x, y, TILE, 2, '#8B7A60')
      } else if (t === 8) {
        rect(ctx, x, y, TILE, TILE, odd ? C.carpet : C.carpet2)
      } else {
        rect(ctx, x, y, TILE, TILE, odd ? C.floor1 : C.floor2)
      }
    }
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x + 2, y + 8, TILE - 4, TILE - 10, C.desk, '#5c3920')
  rect(ctx, x + 2, y + 8, TILE - 4, 6, C.desk2)
  rect(ctx, x + 3, y + TILE - 6, 4, 6, C.desk3)
  rect(ctx, x + TILE - 7, y + TILE - 6, 4, 6, C.desk3)
}
function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x + 10, y + 22, 12, 10, C.plantPot)
  rect(ctx, x + 11, y + 21, 10, 2, '#7a3e10')
  ctx.fillStyle = C.plant
  ctx.beginPath(); ctx.ellipse(x + 16, y + 14, 7, 9, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(x + 10, y + 17, 5, 7, -0.4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(x + 22, y + 17, 5, 7, 0.4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.plantStem
  ctx.beginPath(); ctx.ellipse(x + 16, y + 10, 4, 6, 0, 0, Math.PI * 2); ctx.fill()
}
function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x + 4, y + 4, TILE - 8, TILE - 14, '#111', '#333')
  rect(ctx, x + 6, y + 6, TILE - 12, TILE - 18, C.carpet)
  ctx.fillStyle = 'rgba(0,255,136,0.15)'
  ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 18)
  ctx.fillStyle = 'rgba(0,255,136,0.5)'
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 8, y + 8 + i * 4, Math.random() * 10 + 5, 1)
  rect(ctx, x + 12, y + TILE - 10, 8, 4, '#333')
  rect(ctx, x + 8, y + TILE - 7, 16, 4, '#444')
}
function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x + 1, y + 2, TILE - 2, TILE - 4, C.windowFrame)
  rect(ctx, x + 3, y + 4, TILE - 6, TILE - 8, C.window)
  ctx.fillStyle = '#ffd700'
  ctx.beginPath(); ctx.arc(x + 20, y + 12, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#4a8a2d'
  ctx.beginPath(); ctx.ellipse(x + 10, y + TILE - 6, 10, 7, 0, 0, Math.PI); ctx.fill()
  ctx.beginPath(); ctx.ellipse(x + 22, y + TILE - 6, 10, 7, 0, 0, Math.PI); ctx.fill()
  ctx.strokeStyle = C.windowFrame; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x + TILE / 2, y + 4); ctx.lineTo(x + TILE / 2, y + TILE - 4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y + TILE / 2); ctx.lineTo(x + TILE - 3, y + TILE / 2); ctx.stroke()
}
function drawShelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x + 1, y + 4, TILE - 2, 6, C.shelf)
  const books = ['#c0392b', '#27ae60', '#2980b9', '#e67e22', '#8e44ad']
  for (let i = 0; i < 5; i++) rect(ctx, x + 2 + i * 6, y + 5, 5, TILE - 10, books[i % 5])
  rect(ctx, x + 1, y + TILE - 5, TILE - 2, 4, C.shelf)
}
function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x + 4, y + 14, TILE - 8, TILE - 18, C.chair, '#7d1e1e')
  rect(ctx, x + 6, y + 6, TILE - 12, 10, C.chairSeat, '#6b1919')
  rect(ctx, x + 4, y + TILE - 8, 4, 8, C.desk3)
  rect(ctx, x + TILE - 8, y + TILE - 8, 4, 8, C.desk3)
}
function drawRug(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
  const hasL = col === 0 || MAP[row][col - 1] !== 8
  const hasR = col === COLS - 1 || MAP[row][col + 1] !== 8
  const hasT = row === 0 || MAP[row - 1][col] !== 8
  const hasB = row === ROWS - 1 || MAP[row + 1][col] !== 8
  if (hasL || hasR || hasT || hasB) {
    ctx.strokeStyle = C.rugBorder; ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2)
  }
}

function drawObjects(ctx: CanvasRenderingContext2D) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = MAP[row][col]
      const x = col * TILE, y = row * TILE
      if (t === 2) drawDesk(ctx, x, y)
      else if (t === 3) drawPlant(ctx, x, y)
      else if (t === 4) drawMonitor(ctx, x, y)
      else if (t === 5) drawWindow(ctx, x, y)
      else if (t === 6) drawShelf(ctx, x, y)
      else if (t === 7) drawChair(ctx, x, y)
      else if (t === 8) drawRug(ctx, x, y, col, row)
    }
  }
}

function drawChar(ctx: CanvasRenderingContext2D, px: number, py: number, col: string, name: string, busy: boolean) {
  const x = Math.round(px), y = Math.round(py)
  const bob = Math.sin(Date.now() / 200) * 1.5
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE - 3, 8, 3, 0, 0, Math.PI * 2); ctx.fill()
  rect(ctx, x + 10, y + 16 + bob, 12, 12, col)
  rect(ctx, x + 8, y + 6 + bob, 16, 14, col)
  rect(ctx, x + 11, y + 9 + bob, 3, 3, '#fff')
  rect(ctx, x + 18, y + 9 + bob, 3, 3, '#fff')
  rect(ctx, x + 12, y + 10 + bob, 2, 2, '#222')
  rect(ctx, x + 19, y + 10 + bob, 2, 2, '#222')
  rect(ctx, x + 8, y + 5 + bob, 16, 4, '#3d2510')
  rect(ctx, x + 10, y + 20 + bob, 12, 2, 'rgba(0,0,0,0.2)')
  rect(ctx, x + 10, y + 28 + bob, 5, 6, '#3d5a9e')
  rect(ctx, x + 17, y + 28 + bob, 5, 6, '#3d5a9e')
  rect(ctx, x + 9, y + 33 + bob, 7, 4, '#222')
  rect(ctx, x + 16, y + 33 + bob, 7, 4, '#222')
  if (busy) {
    const t = Date.now() / 500
    ctx.fillStyle = `hsl(${(t * 60) % 360},80%,60%)`
    ctx.beginPath(); ctx.arc(x + TILE / 2, y + bob - 4, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = '6px VT323'; ctx.textAlign = 'center'
    ctx.fillText('!', x + TILE / 2, y + bob - 2)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(x + TILE / 2 - 18, y - 2 + bob, 36, 10)
  ctx.fillStyle = '#fff'; ctx.font = '8px "Share Tech Mono", monospace'; ctx.textAlign = 'center'
  ctx.fillText(name, x + TILE / 2, y + 7 + bob)
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
  const bob = p.moving ? Math.sin(Date.now() / 120) * 2 : 0
  const x = Math.round(p.px), y = Math.round(p.py)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE - 3, 9, 3, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,213,0,0.5)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE - 3, 10, 4, 0, 0, Math.PI * 2); ctx.stroke()
  rect(ctx, x + 9, y + 16 + bob, 14, 13, '#2965b0')
  rect(ctx, x + 7, y + 5 + bob, 18, 16, '#f0c070')
  rect(ctx, x + 7, y + 4 + bob, 18, 5, '#3d2510')
  rect(ctx, x + 7, y + 5 + bob, 3, 10, '#3d2510')
  rect(ctx, x + 11, y + 9 + bob, 3, 3, '#fff')
  rect(ctx, x + 19, y + 9 + bob, 3, 3, '#fff')
  rect(ctx, x + 12, y + 10 + bob, 2, 2, '#222')
  rect(ctx, x + 20, y + 10 + bob, 2, 2, '#222')
  rect(ctx, x + 9, y + 21 + bob, 14, 2, 'rgba(0,0,0,0.25)')
  rect(ctx, x + 5, y + 17 + bob, 5, 10, '#f0c070')
  rect(ctx, x + 22, y + 17 + bob, 5, 10, '#f0c070')
  rect(ctx, x + 9, y + 29 + bob, 6, 8, '#1a1a4a')
  rect(ctx, x + 17, y + 29 + bob, 6, 8, '#1a1a4a')
  rect(ctx, x + 8, y + 36 + bob, 8, 5, '#111')
  rect(ctx, x + 16, y + 36 + bob, 8, 5, '#111')
  ctx.fillStyle = 'rgba(0,0,0,0.8)'
  ctx.fillRect(x + TILE / 2 - 12, y - 3 + bob, 24, 10)
  ctx.fillStyle = '#ffd700'; ctx.font = '8px "Share Tech Mono", monospace'; ctx.textAlign = 'center'
  ctx.fillText('YOU', x + TILE / 2, y + 6 + bob)
}

// ── Main component ────────────────────────────────────────────
export default function PixelOfficeRPG() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const chatLogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const playerRef = useRef<Player>({ x: 7, y: 5, px: 7 * TILE, py: 5 * TILE, moving: false })
  const targetRef = useRef({ x: 7 * TILE, y: 5 * TILE })
  const keysRef = useRef<Record<string, boolean>>({})
  const lastMoveRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const npcTimerRef = useRef(0)

  const npcsRef = useRef<NPC[]>([
    { x: 2, y: 2, px: 2 * TILE, py: 2 * TILE, color: '#e8a87c', name: 'Agent #1', busy: true },
    { x: 12, y: 5, px: 12 * TILE, py: 5 * TILE, color: '#a87ce8', name: 'Agent #2', busy: false },
    { x: 14, y: 9, px: 14 * TILE, py: 9 * TILE, color: '#7ce8a8', name: 'Agent #3', busy: false },
  ])

  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 7, y: 5 })
  const [state, setState] = useState<'Idle' | 'Moving'>('Idle')
  const [messages, setMessages] = useState<ChatMsg[]>([
    { type: 'system', text: '✦ Session bắt đầu · ID: bb044fa4-2bc3-47f2' },
    {
      type: 'user', label: 'Bạn',
      text: 'Hi! Call 2 subagents to:<br>1. Look into how we could best present this project to people online<br>2. Look around the codebase and report on the state of the project',
    },
    {
      type: 'agent', label: 'Agent',
      text: 'Understood! Dispatching 2 subagents now…<br><br><span class="tag">🔍 Subagent #1</span> <span class="tag">📦 Subagent #2</span><br><br><strong style="color:#ffd700">Subagent #1</strong> — Analysing presentation strategy for online audiences…<br><strong style="color:#4fc3f7">Subagent #2</strong> — Scanning codebase structure and health…',
    },
    { type: 'system', text: '⚡ Hullaballooing… (thinking)' },
  ])
  const [thinking, setThinking] = useState(true)
  const replyIdxRef = useRef(0)
  const [chatInput, setChatInput] = useState('')

  // ── Resize ────────────────────────────────────────────────
  const handleResize = useCallback(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const w = wrap.clientWidth, h = wrap.clientHeight
    const s = Math.max(1, Math.min(3, Math.min(Math.floor(w / (COLS * TILE)), Math.floor(h / (ROWS * TILE))) || 1))
    setScale(s)
    canvas.width = COLS * TILE
    canvas.height = ROWS * TILE
    canvas.style.width = COLS * TILE * s + 'px'
    canvas.style.height = ROWS * TILE * s + 'px'
  }, [])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // ── Input ─────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return
      keysRef.current[e.key] = true
    }
    const up = (e: KeyboardEvent) => { keysRef.current[e.key] = false }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
    }
  }, [])

  // ── Game loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const loop = (ts: number) => {
      // Input
      const k = keysRef.current
      if (ts - lastMoveRef.current >= 150) {
        let dx = 0, dy = 0
        if (k['ArrowUp'] || k['w'] || k['W']) dy = -1
        else if (k['ArrowDown'] || k['s'] || k['S']) dy = 1
        else if (k['ArrowLeft'] || k['a'] || k['A']) dx = -1
        else if (k['ArrowRight'] || k['d'] || k['D']) dx = 1
        if (dx || dy) {
          const p = playerRef.current
          const nx = p.x + dx, ny = p.y + dy
          if (walkable(nx, ny)) {
            p.x = nx; p.y = ny
            targetRef.current = { x: nx * TILE, y: ny * TILE }
            p.moving = true
            lastMoveRef.current = ts
            setPos({ x: nx, y: ny })
          }
        }
      }

      // Update player movement
      const p = playerRef.current
      const dx = targetRef.current.x - p.px
      const dy = targetRef.current.y - p.py
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 1) {
        const speed = 2 * (TILE / 8)
        p.px += dx / dist * speed
        p.py += dy / dist * speed
        p.moving = true
      } else {
        p.px = targetRef.current.x
        p.py = targetRef.current.y
        if (p.moving) {
          p.moving = false
          setState('Idle')
        }
      }
      if (p.moving && state !== 'Moving') setState('Moving')

      // NPC wander
      if (ts - npcTimerRef.current > 2000) {
        npcTimerRef.current = ts
        npcsRef.current.forEach(n => {
          if (n.busy) return
          const dxRand = [0, 0, 1, -1][Math.floor(Math.random() * 4)]
          const dyRand = dxRand ? 0 : [1, -1][Math.floor(Math.random() * 2)]
          const nx = n.x + dxRand, ny = n.y + dyRand
          if (walkable(nx, ny)) { n.x = nx; n.y = ny }
        })
      }
      npcsRef.current.forEach(n => {
        const tx = n.x * TILE, ty = n.y * TILE
        const dxn = tx - n.px, dyn = ty - n.py
        const d = Math.sqrt(dxn * dxn + dyn * dyn)
        if (d > 1) { n.px += dxn / d * 1.5; n.py += dyn / d * 1.5 }
        else { n.px = tx; n.py = ty }
      })

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawFloor(ctx)
      drawObjects(ctx)
      npcsRef.current.forEach(n => drawChar(ctx, n.px, n.py, n.color, n.name, n.busy))
      drawPlayer(ctx, p)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [state])

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
  }, [messages])

  const sendMsg = () => {
    const txt = chatInput.trim()
    if (!txt) return
    setMessages(prev => [...prev, { type: 'user', label: 'Bạn', text: txt }])
    setChatInput('')
    setThinking(true)
    setTimeout(() => {
      const reply = AGENT_REPLIES[replyIdxRef.current % AGENT_REPLIES.length]
      replyIdxRef.current++
      setMessages(prev => [...prev, { type: 'agent', label: 'Agent', text: reply }])
      setThinking(false)
    }, 800 + Math.random() * 700)
  }

  const quickMsg = (txt: string) => {
    setChatInput(txt)
    setTimeout(() => {
      setMessages(prev => [...prev, { type: 'user', label: 'Bạn', text: txt }])
      setChatInput('')
      setThinking(true)
      setTimeout(() => {
        const reply = AGENT_REPLIES[replyIdxRef.current % AGENT_REPLIES.length]
        replyIdxRef.current++
        setMessages(prev => [...prev, { type: 'agent', label: 'Agent', text: reply }])
        setThinking(false)
      }, 800 + Math.random() * 700)
    }, 30)
  }

  const zoom = (d: number) => {
    const newScale = Math.max(1, Math.min(4, scale + d))
    setScale(newScale)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.width = COLS * TILE * newScale + 'px'
      canvas.style.height = ROWS * TILE * newScale + 'px'
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col text-[#c8d8e8] overflow-hidden"
      style={{ background: '#1a1a2e', fontFamily: '"Share Tech Mono", monospace' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href="https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap" rel="stylesheet" />

      <style>{`
        .tag { display:inline-block; background:#1a0a30; border:1px solid #5533aa; color:#c084fc; font-size:10px; padding:1px 6px; border-radius:10px; margin:2px 2px 0 0; }
        .bubble strong { color:inherit; }
      `}</style>

      {/* TOP BAR */}
      <div className="h-9 bg-[#0d1117] border-b border-[#2a4a6a] flex items-center text-[11px] flex-shrink-0">
        <button onClick={() => navigate('/dashboard/labtwin')}
          className="px-2 py-1 mx-1 rounded flex items-center gap-1 text-[#c8d8e8] hover:bg-[#0f3460]">
          <ArrowLeft className="h-3 w-3" /> LabTwin
        </button>
        <button onClick={() => navigate('/dashboard')}
          className="px-2 py-1 rounded flex items-center gap-1 text-[#c8d8e8] hover:bg-[#0f3460]">
          <Home className="h-3 w-3" /> Dashboard
        </button>
        <div className="h-5 w-px bg-[#2a4a6a] mx-1" />
        {['📁 File', '✏️ Edit', '☰ Selection', '👁 View', '···'].map(t => (
          <div key={t} className="px-4 h-full flex items-center text-[#567890] border-r border-[#2a4a6a] tracking-wider">{t}</div>
        ))}
        <div className="px-4 h-full flex items-center text-[#567890] border-l border-[#2a4a6a]">
          PROBLEMS <span className="bg-[#e94560] text-white text-[9px] px-1.5 rounded ml-1.5">18</span>
        </div>
        <div className="px-4 h-full flex items-center text-[#567890]">OUTPUT</div>
        <div className="px-4 h-full flex items-center text-[#567890]">DEBUG</div>
        <div className="px-4 h-full flex items-center text-[#c8d8e8] relative">
          TERMINAL
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e94560]" />
        </div>
        <div className="ml-auto px-3 text-[11px] text-[#567890] flex items-center gap-4">
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ff88] mr-1 animate-pulse" /> CONNECTED</span>
          <span className="text-[#ffd700]">⚡ Claude Max</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-12 bg-[#0d1117] border-r border-[#2a4a6a] flex flex-col items-center py-2 gap-1 flex-shrink-0">
          {['📁', '🔍', '🌿', '🐛', '🧩'].map((icon, i) => (
            <div key={icon}
              className={`w-9 h-9 rounded-md flex items-center justify-center cursor-pointer hover:bg-[#0f3460] text-base ${i === 0 ? 'bg-[#0f3460]' : ''}`}>
              {icon}
            </div>
          ))}
          <div className="flex-1" />
          <div className="w-9 h-9 rounded-md flex items-center justify-center cursor-pointer hover:bg-[#0f3460] text-base">⚙️</div>
        </div>

        {/* GAME PANEL */}
        <div className="flex-1 flex flex-col bg-[#16213e] border-r border-[#2a4a6a] overflow-hidden">
          <div className="bg-[#0d1117] px-3 py-1 text-[11px] text-[#567890] border-b border-[#2a4a6a] flex items-center gap-2">
            <span className="text-[#ffd700] tracking-widest" style={{ fontFamily: '"VT323", monospace', fontSize: 16 }}>
              ∨ PIXEL AGENTS
            </span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => zoom(1)}
                className="w-6 h-6 rounded bg-[#0f3460] hover:bg-[#e94560] flex items-center justify-center text-white">+</button>
              <button onClick={() => zoom(-1)}
                className="w-6 h-6 rounded bg-[#0f3460] hover:bg-[#e94560] flex items-center justify-center text-white">−</button>
            </div>
          </div>
          <div ref={wrapRef}
            className="flex-1 flex items-center justify-center bg-[#0a0a14] relative overflow-hidden">
            <canvas ref={canvasRef}
              className="block"
              style={{ imageRendering: 'pixelated' }} />
            <div className="absolute bottom-2 left-2 bg-black/70 border border-[#2a4a6a] rounded-md px-2.5 py-1.5 text-[10px] text-[#567890] pointer-events-none">
              <div className="mb-1 text-[#c8d8e8]">DI CHUYỂN</div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="inline-block w-4 h-4 bg-[#2a4a6a] text-[#c8d8e8] text-center leading-4 rounded text-[9px]">W</span>
                <div>
                  <span className="inline-block w-4 h-4 bg-[#2a4a6a] text-[#c8d8e8] text-center leading-4 rounded text-[9px] mx-0.5">A</span>
                  <span className="inline-block w-4 h-4 bg-[#2a4a6a] text-[#c8d8e8] text-center leading-4 rounded text-[9px] mx-0.5">S</span>
                  <span className="inline-block w-4 h-4 bg-[#2a4a6a] text-[#c8d8e8] text-center leading-4 rounded text-[9px] mx-0.5">D</span>
                </div>
                <div className="mt-1 text-[#567890] text-[9px]">hoặc ↑ ↓ ← →</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — CHAT */}
        <div className="w-[340px] flex flex-col bg-[#0d1117] flex-shrink-0">
          <div className="p-2.5 border-b border-[#2a4a6a] flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#e8734a] to-[#c8522a] flex items-center justify-center text-xl relative">
              🤖
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1.5 bg-[#a855f7] rounded-sm" />
            </div>
            <div className="flex-1">
              <div className="text-[#c8d8e8] tracking-wider" style={{ fontFamily: '"VT323", monospace', fontSize: 18 }}>
                Claude Code
              </div>
              <div className="text-[10px] text-[#567890]">v2.1.49 · Opus 4.6</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#4fc3f7]">Claude Max</div>
              <div className="text-[9px] text-[#567890]">~/Desktop/Commission…</div>
            </div>
          </div>

          <div ref={chatLogRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                {m.label && <div className="text-[10px] text-[#567890] px-0.5">{m.label}</div>}
                {m.type === 'user' && (
                  <div className="self-end max-w-[90%] bg-[#0f3460] border border-[#2a4a6a] rounded-tl-md rounded-tr-md rounded-bl-md px-2.5 py-2 text-xs text-[#c8d8e8]">
                    <span className="text-[#00ff88] font-bold">{'> '}</span>
                    <span dangerouslySetInnerHTML={{ __html: m.text }} />
                  </div>
                )}
                {m.type === 'agent' && (
                  <div className="max-w-[96%] bg-[#141e30] border border-[#2a3a50] border-l-[3px] border-l-[#e94560] rounded-tr-md rounded-br-md rounded-bl-md px-2.5 py-2 text-xs text-[#c8d8e8] leading-relaxed bubble"
                    dangerouslySetInnerHTML={{ __html: m.text }} />
                )}
                {m.type === 'system' && (
                  <div className="bg-[#0a1a0a] border border-[#1a3a1a] border-l-[3px] border-l-[#00ff88] rounded px-2.5 py-1.5 text-[11px] text-[#00ff88] opacity-85">
                    {m.text}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#a855f7] py-1">
                <div className="flex gap-0.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-[#a855f7] animate-bounce" />
                  <span className="inline-block w-1 h-1 rounded-full bg-[#a855f7] animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="inline-block w-1 h-1 rounded-full bg-[#a855f7] animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
                Agent đang xử lý…
              </div>
            )}
          </div>

          <div className="border-t border-[#2a4a6a] p-2.5 flex flex-col gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {[
                ['🗺 Khám phá', 'Khám phá bản đồ'],
                ['🤖 Thêm Agent', 'Gọi thêm agent'],
                ['📊 Báo cáo', 'Báo cáo trạng thái'],
                ['▶ Tiếp tục', 'Tiếp tục nhiệm vụ'],
              ].map(([label, msg]) => (
                <button key={label} onClick={() => quickMsg(msg)}
                  className="bg-[#0f3460] border border-[#2a4a6a] text-[#567890] hover:border-[#4fc3f7] hover:text-[#4fc3f7] text-[10px] px-2 py-0.5 rounded">
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-[#141e30] border border-[#2a4a6a] rounded-md px-2.5 py-1.5">
              <span className="text-[#00ff88] text-sm">›</span>
              <input
                ref={inputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMsg() } }}
                placeholder="Nhập lệnh cho agent…"
                className="flex-1 bg-transparent border-none outline-none text-xs text-[#c8d8e8] placeholder-[#567890]"
                style={{ fontFamily: '"Share Tech Mono", monospace', caretColor: '#00ff88' }} />
              <button onClick={sendMsg}
                className="bg-[#e94560] hover:opacity-80 text-white text-sm px-2.5 py-1 rounded"
                style={{ fontFamily: '"VT323", monospace' }}>
                GỬI
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="h-[22px] bg-[#e94560] flex items-center px-3 gap-5 text-[10px] text-white tracking-wider flex-shrink-0">
        <span>⚡ PIXEL AGENTS</span>
        <span>X: {pos.x}  Y: {pos.y}</span>
        <span>{state}</span>
        <span className="ml-auto">Opus 4.6 · Claude Max · UTF-8</span>
      </div>

      {scale > 0 && <Link to="/dashboard/labtwin" className="hidden">Back to labs</Link>}
    </div>
  )
}
