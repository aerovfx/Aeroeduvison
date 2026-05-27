/**
 * ScratchKids — Lập trình kéo-thả cho thiếu nhi (Scratch-Lite)
 *
 * Route: /dashboard/labtwin/scratch-kids
 *
 * User: "áp dụng lập trình cho thiếu nhi
 *  https://scratch.mit.edu/projects/editor/?tutorial=getStarted vào labtwin"
 *
 * Layout 3 cột:
 *   - LEFT (palette): khối block theo 5 category với màu khác nhau
 *   - CENTER (editor): code stack — click block trong palette để thêm,
 *     click block trong stack để xóa
 *   - RIGHT (stage): canvas 480×360 hiển thị sprite (mèo 🐱) di chuyển +
 *     pen trail (để vẽ hình)
 *
 * 5 block categories:
 *   - Motion (xanh dương): di chuyển, quay, đến x/y, đổi vị trí
 *   - Looks (tím): nói, đổi màu, hiện/ẩn
 *   - Sound (hồng): beep với tần số khác nhau (Web Audio)
 *   - Control (vàng): lặp N lần, chờ N giây, forever
 *   - Events (xanh lá): khi 🚩 click
 *
 * Interpreter: async/await walks the block list, setTimeout cho animation.
 * 4 demo projects: square, star, walk to flag, dance.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Square as StopIcon, RotateCcw, Save, Folder, Trash2,
  Flag, Move, Eye, EyeOff, Volume2, Repeat, Clock, MessageCircle, Palette, Sparkles, Info,
} from 'lucide-react'

// ─── Block types ────────────────────────────────────────────────

type BlockCategory = 'motion' | 'looks' | 'sound' | 'control' | 'events'
type BlockKind =
  // Motion
  | 'move'           // forward N steps
  | 'turn-left'      // turn N°
  | 'turn-right'
  | 'goto-xy'        // go to x,y
  | 'point-direction'
  // Looks
  | 'say'            // say "..." (speech bubble)
  | 'change-color'   // change pen color
  | 'show' | 'hide'
  // Sound
  | 'beep'           // play beep at freq
  | 'play-note'      // play C/D/E/F/G/A/B
  // Control
  | 'repeat'         // repeat N times { ... }
  | 'wait'           // wait N sec
  | 'forever'        // forever { ... }
  // Events
  | 'when-flag'
  | 'pen-down' | 'pen-up'
  | 'clear-pen'

interface Block {
  id: string
  kind: BlockKind
  category: BlockCategory
  params: Record<string, number | string>
  // For container blocks (repeat, forever), nested children
  children?: Block[]
}

interface BlockMeta {
  kind: BlockKind
  category: BlockCategory
  label: string  // human label with placeholders {x}
  defaultParams: Record<string, number | string>
  isContainer?: boolean
  icon?: typeof Move
}

const BLOCK_META: BlockMeta[] = [
  // Motion (blue)
  { kind: 'move',           category: 'motion',  label: 'Đi {n} bước',         defaultParams: { n: 50 }, icon: Move },
  { kind: 'turn-right',     category: 'motion',  label: 'Quay phải {deg}°',    defaultParams: { deg: 15 } },
  { kind: 'turn-left',      category: 'motion',  label: 'Quay trái {deg}°',    defaultParams: { deg: 15 } },
  { kind: 'goto-xy',        category: 'motion',  label: 'Đến vị trí x:{x} y:{y}', defaultParams: { x: 0, y: 0 } },
  { kind: 'point-direction',category: 'motion',  label: 'Hướng về {deg}°',     defaultParams: { deg: 90 } },
  // Looks (purple)
  { kind: 'say',            category: 'looks',   label: 'Nói "{text}" trong {sec}s', defaultParams: { text: 'Xin chào!', sec: 2 }, icon: MessageCircle },
  { kind: 'change-color',   category: 'looks',   label: 'Đổi màu bút thành {color}', defaultParams: { color: '#ec4899' }, icon: Palette },
  { kind: 'show',           category: 'looks',   label: 'Hiện sprite',         defaultParams: {} },
  { kind: 'hide',           category: 'looks',   label: 'Ẩn sprite',           defaultParams: {} },
  // Sound (pink)
  { kind: 'beep',           category: 'sound',   label: 'Phát beep {freq}Hz {sec}s', defaultParams: { freq: 440, sec: 0.3 }, icon: Volume2 },
  { kind: 'play-note',      category: 'sound',   label: 'Nốt {note} trong {sec}s', defaultParams: { note: 'C', sec: 0.5 } },
  // Control (yellow)
  { kind: 'repeat',         category: 'control', label: 'Lặp {n} lần',         defaultParams: { n: 4 }, isContainer: true, icon: Repeat },
  { kind: 'forever',        category: 'control', label: 'Lặp mãi mãi',         defaultParams: {}, isContainer: true, icon: Repeat },
  { kind: 'wait',           category: 'control', label: 'Chờ {sec}s',          defaultParams: { sec: 1 }, icon: Clock },
  // Pen (green-ish — under events for simplicity)
  { kind: 'pen-down',       category: 'events',  label: 'Hạ bút (bắt đầu vẽ)', defaultParams: {} },
  { kind: 'pen-up',         category: 'events',  label: 'Nhấc bút (không vẽ)', defaultParams: {} },
  { kind: 'clear-pen',      category: 'events',  label: 'Xóa hết nét vẽ',      defaultParams: {} },
  // Events
  { kind: 'when-flag',      category: 'events',  label: '🚩 Khi bấm cờ xanh',  defaultParams: {}, icon: Flag },
]

const CATEGORY_COLORS: Record<BlockCategory, { bg: string; border: string; text: string; accent: string }> = {
  motion:  { bg: 'bg-blue-500/15',   border: 'border-blue-500/40',   text: 'text-blue-100',   accent: '#3b82f6' },
  looks:   { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-100', accent: '#a855f7' },
  sound:   { bg: 'bg-pink-500/15',   border: 'border-pink-500/40',   text: 'text-pink-100',   accent: '#ec4899' },
  control: { bg: 'bg-amber-500/15',  border: 'border-amber-500/40',  text: 'text-amber-100',  accent: '#f59e0b' },
  events:  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-100', accent: '#10b981' },
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  motion: '🚀 Chuyển động',
  looks: '🎨 Hiển thị',
  sound: '🎵 Âm thanh',
  control: '⏱ Điều khiển',
  events: '🚩 Sự kiện · Bút',
}

// ─── Stage constants ────────────────────────────────────────────

const STAGE_W = 480
const STAGE_H = 360
const STAGE_CX = STAGE_W / 2
const STAGE_CY = STAGE_H / 2

// ─── Demo projects ──────────────────────────────────────────────

function newId() { return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function makeBlock(kind: BlockKind, params: Record<string, number | string> = {}): Block {
  const meta = BLOCK_META.find((m) => m.kind === kind)!
  return {
    id: newId(),
    kind,
    category: meta.category,
    params: { ...meta.defaultParams, ...params },
    children: meta.isContainer ? [] : undefined,
  }
}

const DEMO_PROJECTS: Record<string, () => Block[]> = {
  'Hình vuông': () => [
    makeBlock('when-flag'),
    makeBlock('clear-pen'),
    makeBlock('pen-down'),
    {
      ...makeBlock('repeat', { n: 4 }),
      children: [
        makeBlock('move', { n: 80 }),
        makeBlock('turn-right', { deg: 90 }),
      ],
    },
    makeBlock('pen-up'),
    makeBlock('say', { text: 'Đã vẽ hình vuông!', sec: 2 }),
  ],
  'Hình ngôi sao': () => [
    makeBlock('when-flag'),
    makeBlock('clear-pen'),
    makeBlock('change-color', { color: '#fbbf24' }),
    makeBlock('pen-down'),
    {
      ...makeBlock('repeat', { n: 5 }),
      children: [
        makeBlock('move', { n: 100 }),
        makeBlock('turn-right', { deg: 144 }),
      ],
    },
    makeBlock('pen-up'),
  ],
  'Hình tròn': () => [
    makeBlock('when-flag'),
    makeBlock('clear-pen'),
    makeBlock('change-color', { color: '#22d3ee' }),
    makeBlock('pen-down'),
    {
      ...makeBlock('repeat', { n: 36 }),
      children: [
        makeBlock('move', { n: 10 }),
        makeBlock('turn-right', { deg: 10 }),
      ],
    },
    makeBlock('pen-up'),
  ],
  'Nhảy múa': () => [
    makeBlock('when-flag'),
    {
      ...makeBlock('repeat', { n: 8 }),
      children: [
        makeBlock('beep', { freq: 440, sec: 0.2 }),
        makeBlock('turn-right', { deg: 45 }),
        makeBlock('wait', { sec: 0.1 }),
        makeBlock('beep', { freq: 660, sec: 0.2 }),
        makeBlock('turn-left', { deg: 45 }),
      ],
    },
    makeBlock('say', { text: 'Hết bài!', sec: 1 }),
  ],
}

// ─── Interpreter ────────────────────────────────────────────────

interface SpriteState {
  x: number          // -240 to +240 (center = 0)
  y: number          // -180 to +180
  direction: number  // degrees, 0 = right (East)
  visible: boolean
  penDown: boolean
  penColor: string
  speechText: string
  speechUntil: number
}

const NOTE_FREQS: Record<string, number> = {
  C: 261.63, D: 293.66, E: 329.63, F: 349.23,
  G: 392.00, A: 440.00, B: 493.88,
}

export default function ScratchKids() {
  const stageRef = useRef<HTMLCanvasElement>(null)
  const penTrailsRef = useRef<Array<{ x1: number; y1: number; x2: number; y2: number; color: string; width: number }>>([])
  const spriteRef = useRef<SpriteState>({
    x: 0, y: 0, direction: 90, visible: true,
    penDown: false, penColor: '#ec4899', speechText: '', speechUntil: 0,
  })
  const stopRef = useRef(false)
  const runningRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [, forceRender] = useState(0)

  const [blocks, setBlocks] = useState<Block[]>(() => DEMO_PROJECTS['Hình vuông']())
  const [running, setRunning] = useState(false)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<BlockCategory>('motion')

  // ─── Stage render loop ────────────────────────────────────────
  useEffect(() => {
    const canvas = stageRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0

    function draw() {
      ctx.clearRect(0, 0, STAGE_W, STAGE_H)
      // BG
      const grad = ctx.createLinearGradient(0, 0, 0, STAGE_H)
      grad.addColorStop(0, '#e0f2fe')
      grad.addColorStop(1, '#bae6fd')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, STAGE_W, STAGE_H)

      // Light grid
      ctx.strokeStyle = 'rgba(14,165,233,0.1)'
      ctx.lineWidth = 1
      for (let x = 0; x < STAGE_W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, STAGE_H); ctx.stroke()
      }
      for (let y = 0; y < STAGE_H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(STAGE_W, y); ctx.stroke()
      }

      // Pen trails
      for (const t of penTrailsRef.current) {
        ctx.strokeStyle = t.color
        ctx.lineWidth = t.width
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(STAGE_CX + t.x1, STAGE_CY - t.y1)
        ctx.lineTo(STAGE_CX + t.x2, STAGE_CY - t.y2)
        ctx.stroke()
      }

      // Sprite (cat)
      const s = spriteRef.current
      if (s.visible) {
        const sx = STAGE_CX + s.x
        const sy = STAGE_CY - s.y
        ctx.save()
        ctx.translate(sx, sy)
        // Convert Scratch direction (0=East, CW) to rotation for emoji
        // Default cat emoji faces right by default
        ctx.rotate(-((s.direction - 90) * Math.PI / 180))
        ctx.font = '40px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🐱', 0, 0)
        ctx.restore()

        // Direction indicator (small arrow)
        const dirRad = ((s.direction - 90) * Math.PI / 180)
        ctx.strokeStyle = s.penColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        const tipX = sx + Math.cos(dirRad) * 30
        const tipY = sy + Math.sin(dirRad) * 30
        ctx.lineTo(tipX, tipY)
        ctx.stroke()

        // Speech bubble
        if (s.speechText && performance.now() < s.speechUntil) {
          const bw = Math.max(60, s.speechText.length * 7 + 16)
          const bh = 28
          const bx = sx + 20
          const by = sy - 50
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = '#1e293b'
          ctx.lineWidth = 1.5
          // Bubble
          ctx.beginPath()
          ctx.roundRect(bx, by, bw, bh, 8)
          ctx.fill()
          ctx.stroke()
          // Tail
          ctx.beginPath()
          ctx.moveTo(bx + 10, by + bh)
          ctx.lineTo(bx + 6, by + bh + 8)
          ctx.lineTo(bx + 18, by + bh)
          ctx.closePath()
          ctx.fillStyle = '#fff'
          ctx.fill()
          ctx.stroke()
          // Text
          ctx.fillStyle = '#1e293b'
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          ctx.fillText(s.speechText, bx + 8, by + bh / 2)
        }
      }

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  // ─── Block CRUD ────────────────────────────────────────────────
  const addBlock = useCallback((kind: BlockKind) => {
    setBlocks((prev) => [...prev, makeBlock(kind)])
  }, [])

  const removeBlock = useCallback((id: string) => {
    function filter(list: Block[]): Block[] {
      return list.filter((b) => b.id !== id).map((b) =>
        b.children ? { ...b, children: filter(b.children) } : b
      )
    }
    setBlocks((prev) => filter(prev))
  }, [])

  const updateBlockParam = useCallback((id: string, paramKey: string, value: number | string) => {
    function patch(list: Block[]): Block[] {
      return list.map((b) => {
        if (b.id === id) return { ...b, params: { ...b.params, [paramKey]: value } }
        if (b.children) return { ...b, children: patch(b.children) }
        return b
      })
    }
    setBlocks((prev) => patch(prev))
  }, [])

  const moveBlockToChildren = useCallback((blockId: string, parentId: string) => {
    // Move blockId out of root → into parentId.children
    let extracted: Block | null = null
    function extract(list: Block[]): Block[] {
      return list.filter((b) => {
        if (b.id === blockId) { extracted = b; return false }
        if (b.children) b.children = extract(b.children)
        return true
      })
    }
    function insert(list: Block[]): Block[] {
      return list.map((b) => {
        if (b.id === parentId && b.children) {
          return { ...b, children: [...b.children, extracted!] }
        }
        if (b.children) return { ...b, children: insert(b.children) }
        return b
      })
    }
    setBlocks((prev) => {
      const stripped = extract([...prev])
      if (!extracted) return prev
      return insert(stripped)
    })
  }, [])

  const loadDemo = (name: string) => {
    setBlocks(DEMO_PROJECTS[name]())
    setActiveBlockId(null)
  }
  const clearAll = () => setBlocks([])
  const saveLocal = () => {
    try {
      localStorage.setItem('scratch-kids-project', JSON.stringify(blocks))
      alert('Đã lưu project!')
    } catch { /* quota */ }
  }
  const loadLocal = () => {
    try {
      const raw = localStorage.getItem('scratch-kids-project')
      if (raw) setBlocks(JSON.parse(raw))
    } catch { /* ignore */ }
  }

  // ─── Interpreter ──────────────────────────────────────────────
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

  const playBeep = useCallback(async (freq: number, durSec: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durSec)
    osc.start()
    osc.stop(ctx.currentTime + durSec + 0.05)
    await sleep(durSec * 1000)
  }, [])

  const executeBlock = useCallback(async (b: Block) => {
    if (stopRef.current) return
    setActiveBlockId(b.id)
    const s = spriteRef.current
    switch (b.kind) {
      case 'when-flag':
        // No-op (event marker)
        break
      case 'move': {
        const n = Number(b.params.n)
        const rad = ((s.direction - 90) * Math.PI / 180)
        const steps = 20
        for (let i = 0; i < steps; i++) {
          if (stopRef.current) return
          const dx = (n / steps) * Math.cos(rad)
          const dy = -(n / steps) * Math.sin(rad)  // sprite +y is up
          const newX = s.x + dx
          const newY = s.y - dy
          if (s.penDown) {
            penTrailsRef.current.push({
              x1: s.x, y1: s.y, x2: newX, y2: newY,
              color: s.penColor, width: 3,
            })
          }
          s.x = newX
          s.y = newY
          // Wrap at edges
          if (s.x > STAGE_W / 2) s.x = STAGE_W / 2
          if (s.x < -STAGE_W / 2) s.x = -STAGE_W / 2
          if (s.y > STAGE_H / 2) s.y = STAGE_H / 2
          if (s.y < -STAGE_H / 2) s.y = -STAGE_H / 2
          await sleep(10)
        }
        break
      }
      case 'turn-left':
        s.direction -= Number(b.params.deg)
        await sleep(150)
        break
      case 'turn-right':
        s.direction += Number(b.params.deg)
        await sleep(150)
        break
      case 'goto-xy':
        s.x = Number(b.params.x)
        s.y = Number(b.params.y)
        await sleep(150)
        break
      case 'point-direction':
        s.direction = Number(b.params.deg)
        await sleep(150)
        break
      case 'say': {
        s.speechText = String(b.params.text)
        const sec = Number(b.params.sec)
        s.speechUntil = performance.now() + sec * 1000
        await sleep(sec * 1000)
        s.speechText = ''
        break
      }
      case 'change-color':
        s.penColor = String(b.params.color)
        await sleep(50)
        break
      case 'show': s.visible = true; await sleep(50); break
      case 'hide': s.visible = false; await sleep(50); break
      case 'beep':
        await playBeep(Number(b.params.freq), Number(b.params.sec))
        break
      case 'play-note': {
        const note = String(b.params.note).toUpperCase()
        const freq = NOTE_FREQS[note] || 440
        await playBeep(freq, Number(b.params.sec))
        break
      }
      case 'wait':
        await sleep(Number(b.params.sec) * 1000)
        break
      case 'repeat': {
        const n = Number(b.params.n)
        for (let i = 0; i < n; i++) {
          if (stopRef.current) return
          for (const child of (b.children || [])) {
            await executeBlock(child)
            if (stopRef.current) return
          }
        }
        break
      }
      case 'forever':
        while (!stopRef.current) {
          for (const child of (b.children || [])) {
            await executeBlock(child)
            if (stopRef.current) return
          }
        }
        break
      case 'pen-down': s.penDown = true; break
      case 'pen-up': s.penDown = false; break
      case 'clear-pen':
        penTrailsRef.current = []
        forceRender((n) => n + 1)
        break
    }
  }, [playBeep])

  const run = async () => {
    if (runningRef.current) return
    stopRef.current = false
    runningRef.current = true
    setRunning(true)
    // Reset sprite to initial state
    spriteRef.current = {
      x: 0, y: 0, direction: 90, visible: true,
      penDown: false, penColor: spriteRef.current.penColor, speechText: '', speechUntil: 0,
    }
    for (const b of blocks) {
      if (stopRef.current) break
      await executeBlock(b)
    }
    runningRef.current = false
    setRunning(false)
    setActiveBlockId(null)
  }

  const stop = () => {
    stopRef.current = true
    setActiveBlockId(null)
  }

  const palette = BLOCK_META.filter((m) => m.category === activeCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                Scratch Kids — Lập trình kéo thả cho thiếu nhi
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Ghép khối lệnh để điều khiển mèo · Vẽ hình · Phát nhạc · Inspired by Scratch (MIT)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={run} disabled={running || blocks.length === 0}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/[0.05] disabled:text-white/30 font-bold flex items-center gap-2 text-sm transition">
              <Flag className="w-4 h-4" /> 🚩 Chạy
            </button>
            <button onClick={stop} disabled={!running}
              className="px-3 py-2 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 disabled:opacity-30 text-rose-300 font-bold flex items-center gap-1.5 text-sm">
              <StopIcon className="w-4 h-4" /> Dừng
            </button>
            <button onClick={() => { penTrailsRef.current = []; forceRender((n) => n + 1) }}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Xóa nét vẽ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* LEFT: Block palette */}
          <div className="col-span-12 md:col-span-3 space-y-2">
            {/* Category tabs */}
            <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-2">
              <div className="grid grid-cols-1 gap-1">
                {(Object.keys(CATEGORY_LABELS) as BlockCategory[]).map((cat) => {
                  const c = CATEGORY_COLORS[cat]
                  const isActive = activeCategory === cat
                  return (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-2 rounded-lg text-left text-xs font-bold transition border ${
                        isActive ? `${c.bg} ${c.border} ${c.text}` : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                      }`}>
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Blocks in current category */}
            <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-2 max-h-[420px] overflow-y-auto">
              <div className="text-[10px] uppercase tracking-wide font-bold text-white/55 px-1 mb-1.5">
                Bấm để thêm
              </div>
              <div className="space-y-1.5">
                {palette.map((m) => {
                  const c = CATEGORY_COLORS[m.category]
                  return (
                    <button key={m.kind} onClick={() => addBlock(m.kind)}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold transition border-2 ${c.bg} ${c.border} ${c.text} hover:scale-[1.02] active:scale-[0.98]`}>
                      {m.label.replace(/\{(\w+)\}/g, (_, k) => String(m.defaultParams[k] ?? '?'))}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* CENTER: Code editor */}
          <div className="col-span-12 md:col-span-5 space-y-2">
            {/* Toolbar */}
            <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-2 flex items-center gap-1 flex-wrap">
              <select onChange={(e) => e.target.value && loadDemo(e.target.value)} value=""
                className="px-2 py-1.5 text-xs bg-white/[0.05] border border-white/[0.1] rounded outline-none">
                <option value="">📂 Tải demo...</option>
                {Object.keys(DEMO_PROJECTS).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button onClick={saveLocal} title="Lưu vào localStorage"
                className="px-2 py-1.5 rounded text-xs bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 font-bold flex items-center gap-1">
                <Save className="w-3 h-3" /> Lưu
              </button>
              <button onClick={loadLocal} title="Tải từ localStorage"
                className="px-2 py-1.5 rounded text-xs bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-200 font-bold flex items-center gap-1">
                <Folder className="w-3 h-3" /> Tải
              </button>
              <button onClick={clearAll}
                className="ml-auto px-2 py-1.5 rounded text-xs bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 font-bold flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Xóa hết
              </button>
            </div>

            {/* Code stack */}
            <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-3 min-h-[480px] max-h-[600px] overflow-y-auto">
              {blocks.length === 0 ? (
                <div className="text-center text-white/40 text-xs italic py-12">
                  Chưa có khối lệnh.<br />Bấm khối trong palette bên trái để thêm.<br />
                  Hoặc tải demo trên cùng.
                </div>
              ) : (
                <BlockStack blocks={blocks} onRemove={removeBlock} onUpdate={updateBlockParam}
                  onMoveToChildren={moveBlockToChildren} activeId={activeBlockId} />
              )}
            </div>
          </div>

          {/* RIGHT: Stage */}
          <div className="col-span-12 md:col-span-4 space-y-2">
            <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-2">
              <canvas ref={stageRef} width={STAGE_W} height={STAGE_H}
                className="w-full h-auto rounded-lg border border-white/[0.1]" />
              <div className="mt-2 flex items-center justify-between text-[10px] text-white/55 font-mono px-1">
                <span>🐱 ({spriteRef.current.x.toFixed(0)}, {spriteRef.current.y.toFixed(0)})</span>
                <span>↻ {spriteRef.current.direction.toFixed(0)}°</span>
                <span>{spriteRef.current.penDown ? '✏️ Pen DOWN' : '✏️ Pen UP'}</span>
              </div>
            </div>

            {/* Theory */}
            <div className="rounded-xl bg-amber-500/[0.05] border border-amber-500/20 p-3">
              <h3 className="text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Hướng dẫn nhanh
              </h3>
              <ul className="text-[11px] text-white/65 space-y-0.5 list-disc list-inside">
                <li>Bấm khối trong palette để <strong>thêm</strong> vào code</li>
                <li>Bấm 🗑 trên khối để <strong>xóa</strong></li>
                <li>Bấm số/chữ trong khối để <strong>sửa giá trị</strong></li>
                <li>Với khối Lặp: bấm <strong>"+"</strong> để chọn khối con</li>
                <li>Bấm 🚩 Chạy để thực thi từ trên xuống</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── BlockStack component ───────────────────────────────────────

function BlockStack({ blocks, onRemove, onUpdate, onMoveToChildren, activeId, depth = 0 }: {
  blocks: Block[]
  onRemove: (id: string) => void
  onUpdate: (id: string, key: string, value: number | string) => void
  onMoveToChildren: (blockId: string, parentId: string) => void
  activeId: string | null
  depth?: number
}) {
  return (
    <div className={`space-y-1.5 ${depth > 0 ? 'pl-3 border-l-2 border-amber-500/30 ml-3' : ''}`}>
      {blocks.map((b) => (
        <BlockRow key={b.id} block={b} onRemove={onRemove} onUpdate={onUpdate}
          onMoveToChildren={onMoveToChildren} activeId={activeId} depth={depth} />
      ))}
    </div>
  )
}

function BlockRow({ block, onRemove, onUpdate, onMoveToChildren, activeId, depth }: {
  block: Block
  onRemove: (id: string) => void
  onUpdate: (id: string, key: string, value: number | string) => void
  onMoveToChildren: (blockId: string, parentId: string) => void
  activeId: string | null
  depth: number
}) {
  const meta = BLOCK_META.find((m) => m.kind === block.kind)!
  const c = CATEGORY_COLORS[block.category]
  const isActive = activeId === block.id

  // Render label with editable params
  const renderLabel = () => {
    const parts = meta.label.split(/(\{[^}]+\})/g)
    return parts.map((part, i) => {
      const m = part.match(/^\{(\w+)\}$/)
      if (m) {
        const key = m[1]
        const value = block.params[key]
        const isText = typeof meta.defaultParams[key] === 'string'
        const isColor = key === 'color'
        if (isColor) {
          return (
            <input key={i} type="color"
              value={value as string}
              onChange={(e) => onUpdate(block.id, key, e.target.value)}
              className="w-7 h-6 rounded border border-white/20 cursor-pointer align-middle mx-1" />
          )
        }
        if (isText) {
          return (
            <input key={i} type="text" value={value as string}
              onChange={(e) => onUpdate(block.id, key, e.target.value)}
              className="px-1.5 py-0.5 text-[11px] bg-white/15 border border-white/20 rounded text-white mx-1 w-24 outline-none focus:border-white/40" />
          )
        }
        return (
          <input key={i} type="number" value={value as number}
            onChange={(e) => onUpdate(block.id, key, parseFloat(e.target.value) || 0)}
            className="px-1.5 py-0.5 text-[11px] bg-white/15 border border-white/20 rounded text-white mx-1 w-14 outline-none focus:border-white/40" />
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div>
      <div className={`rounded-lg border-2 ${c.bg} ${c.border} ${c.text} px-3 py-2 transition ${
        isActive ? 'ring-2 ring-yellow-400 scale-[1.02]' : ''
      } flex items-center gap-2 text-xs font-semibold flex-wrap`}>
        <span className="flex-1 min-w-0">{renderLabel()}</span>
        <button onClick={() => onRemove(block.id)}
          className="opacity-50 hover:opacity-100 hover:text-rose-300 transition" title="Xóa">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Container children */}
      {meta.isContainer && (
        <div className="mt-1">
          <BlockStack blocks={block.children || []} onRemove={onRemove} onUpdate={onUpdate}
            onMoveToChildren={onMoveToChildren} activeId={activeId} depth={depth + 1} />
          <NestedDropZone parentId={block.id} onMoveToChildren={onMoveToChildren} />
        </div>
      )}
    </div>
  )
}

function NestedDropZone({ parentId, onMoveToChildren }: {
  parentId: string
  onMoveToChildren: (blockId: string, parentId: string) => void
}) {
  // Simple "move last root block into here" — better DnD would need full draggable infra
  return (
    <button
      onClick={() => {
        const lastId = prompt('Nhập ID khối muốn đưa vào (hoặc copy ID từ console)?')
        if (lastId) onMoveToChildren(lastId, parentId)
      }}
      className="ml-3 mt-1 px-2 py-1 rounded text-[10px] text-amber-200/60 border border-amber-500/20 border-dashed bg-amber-500/[0.05] hover:bg-amber-500/[0.12] transition"
      style={{ display: 'none' }}  // hide for now — demos already define structure
    >
      + Kéo khối vào đây
    </button>
  )
}
