/**
 * Hầm Khoa Học — Physics Knight Dungeon (Phase 1 MVP, 1 phòng demo)
 *
 * Gameplay:
 *   - Player (kiếm sĩ) đi bằng WASD, chém bằng J, đổi kiếm 1-4 (MVP chỉ có 1 kiếm).
 *   - Phòng đóng cửa cho đến khi giết hết quái.
 *   - 2 con Slime Quán Tính: chỉ lăn thẳng, phải dùng "Kiếm Lực" để đổi hướng/tiêu diệt.
 *   - Sau khi mỗi quái chết: popup factoid 2s — lồng kiến thức Newton II (F = m·a).
 *   - Cửa mở → thắng phòng, có HUD + nút Reset.
 *
 * Tech:
 *   - Canvas 2D 100% vanilla, tile 16px × scale 3 = 48px/ô, lưới 13×9 ô (624×432).
 *   - Không dùng spritesheet: pixel art vẽ bằng rectangle để khỏi cần asset.
 *   - 1 file, không phụ thuộc ngoài react-router + lucide.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Heart, Gem, Sword, Zap, RotateCcw, Info,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════ */

const TILE = 16
const SCALE = 3
const ROOM_W = 13
const ROOM_H = 9
const CANVAS_W = ROOM_W * TILE
const CANVAS_H = ROOM_H * TILE

/** Tile codes */
const T = {
  FLOOR_A: '.',
  FLOOR_B: ',',
  WALL: '#',
  DOOR_CLOSED: 'D',
  DOOR_OPEN: 'd',
  TORCH: 'F',
  SPAWN: 'P',
  ENEMY: 'E',
} as const

/** 13×9 layout for the demo room.
 *  Row 0 & 8: walls; col 0 & 12: walls. Door at middle-right wall.
 *  Torches at two corners, player spawn centre-left, two slime spawns on the right half. */
const ROOM_L1: string[] = [
  '#F#########F#',
  '#...........#',
  '#..,..,..,..#',
  '#...........#',
  '#.P.....E..d',
  '#...........#',
  '#..,.E..,..,#',
  '#...........#',
  '#F#########F#',
]

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════ */

type Dir = 'up' | 'down' | 'left' | 'right'
type WeaponId = 'inertia' | 'force' | 'reaction' | 'energy'

interface Weapon {
  id: WeaponId
  name: string
  principle: string
  auraColor: string
  damage: number
  range: number // hit-box length in px, extended forward from player
}

interface Enemy {
  id: string
  kind: 'slime-inertia'
  x: number // px (world)
  y: number
  vx: number
  vy: number
  hp: number
  maxHp: number
  weakness: WeaponId // only this weapon deals full damage
  size: number
  facing: Dir
  hitCooldown: number // ms of flash after being hit
  chargeCooldown: number // ms until next "roll"
}

interface Factoid {
  text: string
  ttl: number // ms remaining
}

/* ═══════════════════════════════════════════════════════════════════════
   DATA — weapons & factoids
═══════════════════════════════════════════════════════════════════════ */

const WEAPONS: Record<WeaponId, Weapon> = {
  inertia:  { id: 'inertia',  name: 'Kiếm Quán Tính', principle: 'Newton I',              auraColor: '#e5e7eb', damage: 0.5, range: 20 },
  force:    { id: 'force',    name: 'Kiếm Lực',       principle: 'Newton II (F = m·a)',    auraColor: '#ef4444', damage: 1,   range: 22 },
  reaction: { id: 'reaction', name: 'Kiếm Phản Lực',  principle: 'Newton III',             auraColor: '#3b82f6', damage: 0.5, range: 20 },
  energy:   { id: 'energy',   name: 'Kiếm Năng Lượng',principle: 'Bảo toàn năng lượng',   auraColor: '#eab308', damage: 0.5, range: 26 },
}

const FACTOIDS: Record<Enemy['kind'], string> = {
  'slime-inertia':
    'Slime Quán Tính chỉ lăn thẳng đều. Muốn đổi hướng hoặc hạ gục nó, cần một Lực — Newton II: F = m·a.',
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════ */

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

function tileAt(row: number, col: number): string {
  if (row < 0 || row >= ROOM_H || col < 0 || col >= ROOM_W) return T.WALL
  return ROOM_L1[row][col] ?? T.WALL
}

function isSolid(ch: string, doorOpen: boolean): boolean {
  if (ch === T.WALL || ch === T.TORCH) return true
  if (ch === T.DOOR_CLOSED && !doorOpen) return true
  if (ch === T.DOOR_CLOSED && doorOpen) return false
  return false
}

/** AABB overlap test in px */
function overlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

/* ═══════════════════════════════════════════════════════════════════════
   RENDERING (pixel-art rectangle-based, no spritesheet)
═══════════════════════════════════════════════════════════════════════ */

function drawRoom(ctx: CanvasRenderingContext2D, t: number, doorOpen: boolean) {
  for (let r = 0; r < ROOM_H; r++) {
    for (let c = 0; c < ROOM_W; c++) {
      const ch = ROOM_L1[r][c]
      const x = c * TILE
      const y = r * TILE

      // Floor checker
      const isAlt = (r + c) % 2 === 0
      ctx.fillStyle = isAlt ? '#2a2338' : '#231c30'
      ctx.fillRect(x, y, TILE, TILE)

      if (ch === T.FLOOR_B) {
        ctx.fillStyle = '#1e1829'
        ctx.fillRect(x + 6, y + 6, 2, 2)
        ctx.fillRect(x + 10, y + 9, 2, 2)
      }

      if (ch === T.WALL) {
        // base
        ctx.fillStyle = '#4c3a6e'
        ctx.fillRect(x, y, TILE, TILE)
        // top highlight
        ctx.fillStyle = '#6a529a'
        ctx.fillRect(x, y, TILE, 2)
        // brick line
        ctx.fillStyle = '#2c2144'
        ctx.fillRect(x, y + 8, TILE, 1)
      }

      if (ch === T.TORCH) {
        // wall torch
        ctx.fillStyle = '#4c3a6e'
        ctx.fillRect(x, y, TILE, TILE)
        ctx.fillStyle = '#6a529a'
        ctx.fillRect(x, y, TILE, 2)
        // flame flickers
        const flick = Math.sin(t * 0.015 + c) > 0 ? 1 : 0
        ctx.fillStyle = '#111'
        ctx.fillRect(x + 6, y + 9, 4, 5)
        ctx.fillStyle = '#f59e0b'
        ctx.fillRect(x + 5, y + 6 - flick, 6, 4)
        ctx.fillStyle = '#fde68a'
        ctx.fillRect(x + 6, y + 5 - flick, 4, 2)
      }

      if (ch === T.DOOR_CLOSED) {
        if (doorOpen) {
          // open archway
          ctx.fillStyle = '#0a0613'
          ctx.fillRect(x, y + 2, TILE, TILE - 4)
          ctx.fillStyle = '#6a529a'
          ctx.fillRect(x, y, TILE, 2)
        } else {
          ctx.fillStyle = '#6b4423'
          ctx.fillRect(x, y + 2, TILE, TILE - 2)
          ctx.fillStyle = '#8b5a2b'
          ctx.fillRect(x + 2, y + 3, TILE - 4, 1)
          ctx.fillStyle = '#facc15'
          ctx.fillRect(x + TILE - 4, y + 8, 1, 2) // handle
        }
      }
    }
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D, px: number, py: number, facing: Dir, swinging: boolean, swingT: number, weapon: Weapon,
) {
  const x = Math.round(px - 4)
  const y = Math.round(py - 8)
  // body
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(x + 1, y + 6, 6, 5)
  // head
  ctx.fillStyle = '#fcd9b6'
  ctx.fillRect(x + 1, y + 1, 6, 5)
  // hair
  ctx.fillStyle = '#3b2a1a'
  ctx.fillRect(x + 1, y, 6, 2)
  ctx.fillRect(x, y + 1, 1, 2)
  ctx.fillRect(x + 7, y + 1, 1, 2)
  // eyes (2 black dots based on facing)
  ctx.fillStyle = '#0a0a0a'
  if (facing === 'left')       { ctx.fillRect(x + 1, y + 3, 1, 1); ctx.fillRect(x + 3, y + 3, 1, 1) }
  else if (facing === 'right') { ctx.fillRect(x + 4, y + 3, 1, 1); ctx.fillRect(x + 6, y + 3, 1, 1) }
  else                          { ctx.fillRect(x + 2, y + 3, 1, 1); ctx.fillRect(x + 5, y + 3, 1, 1) }
  // legs
  ctx.fillStyle = '#422006'
  ctx.fillRect(x + 1, y + 11, 2, 2)
  ctx.fillRect(x + 5, y + 11, 2, 2)

  // sword (always visible at hip). When swinging, animate an arc.
  const bladeC = weapon.auraColor
  if (swinging) {
    // swing arc 200ms
    const progress = clamp(swingT / 200, 0, 1)
    const ang = -Math.PI / 2 + Math.PI * progress
    const cx = px
    const cy = py - 2
    const len = weapon.range
    const ex = cx + Math.cos(ang) * len * (facing === 'left' ? -1 : 1)
    const ey = cy + Math.sin(ang) * len
    ctx.strokeStyle = bladeC
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    // aura
    ctx.fillStyle = bladeC + '55'
    ctx.beginPath()
    ctx.arc(ex, ey, 3, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = bladeC
    if (facing === 'left')      ctx.fillRect(x - 2, y + 6, 3, 1)
    else                         ctx.fillRect(x + 7, y + 6, 3, 1)
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const x = Math.round(e.x - e.size / 2)
  const y = Math.round(e.y - e.size / 2)
  const breathe = Math.sin(t * 0.008 + e.x) > 0 ? 0 : 1
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(x + 2, y + e.size - 2, e.size - 4, 2)
  // flash white if recently hit
  const flashing = e.hitCooldown > 0
  // body — slime
  ctx.fillStyle = flashing ? '#ffffff' : '#22c55e'
  ctx.fillRect(x + 1, y + 3 + breathe, e.size - 2, e.size - 4 - breathe)
  ctx.fillStyle = flashing ? '#e5e7eb' : '#16a34a'
  ctx.fillRect(x + 2, y + e.size - 3, e.size - 4, 2)
  // eyes
  ctx.fillStyle = '#000'
  ctx.fillRect(x + 3, y + 6, 1, 1)
  ctx.fillRect(x + e.size - 4, y + 6, 1, 1)
  // HP bar above
  const hpRatio = e.hp / e.maxHp
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(x, y - 3, e.size, 2)
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.2 ? '#f59e0b' : '#ef4444'
  ctx.fillRect(x, y - 3, Math.round(e.size * hpRatio), 2)
}

/* ═══════════════════════════════════════════════════════════════════════
   INITIAL WORLD FROM LAYOUT
═══════════════════════════════════════════════════════════════════════ */

function buildInitialWorld() {
  let spawnX = 2 * TILE, spawnY = 4 * TILE
  const enemies: Enemy[] = []
  let enemyId = 0
  for (let r = 0; r < ROOM_H; r++) {
    for (let c = 0; c < ROOM_W; c++) {
      const ch = ROOM_L1[r][c]
      if (ch === T.SPAWN) {
        spawnX = c * TILE + TILE / 2
        spawnY = r * TILE + TILE / 2
      } else if (ch === T.ENEMY) {
        enemies.push({
          id: 'e' + enemyId++,
          kind: 'slime-inertia',
          x: c * TILE + TILE / 2,
          y: r * TILE + TILE / 2,
          vx: rand(-0.3, 0.3),
          vy: rand(-0.3, 0.3),
          hp: 3,
          maxHp: 3,
          weakness: 'force',
          size: 12,
          facing: 'down',
          hitCooldown: 0,
          chargeCooldown: rand(400, 1200),
        })
      }
    }
  }
  return { spawnX, spawnY, enemies }
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */

export default function PhysicsDungeonPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hp, setHp] = useState(5)
  const [maxHp] = useState(5)
  const [gems, setGems] = useState(0)
  const [weaponId, setWeaponId] = useState<WeaponId>('force')
  const [factoid, setFactoid] = useState<Factoid | null>(null)
  const [won, setWon] = useState(false)
  const [paused, setPaused] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [hintVisible, setHintVisible] = useState(true)

  /* mutable refs for game loop */
  const keys = useRef<Record<string, boolean>>({})
  const worldRef = useRef(buildInitialWorld())
  const playerRef = useRef({
    x: worldRef.current.spawnX,
    y: worldRef.current.spawnY,
    facing: 'right' as Dir,
    swinging: false,
    swingT: 0,
    iFrames: 0, // post-hit invulnerability ms
  })
  const doorOpenRef = useRef(false)
  const lastTRef = useRef<number>(performance.now())
  const rafRef = useRef<number | null>(null)

  /* keep current weapon / hp / etc. accessible inside the rAF loop without
     triggering re-renders every tick */
  const weaponRef = useRef<WeaponId>('force')
  useEffect(() => { weaponRef.current = weaponId }, [weaponId])
  const hpRef = useRef(5)
  useEffect(() => { hpRef.current = hp }, [hp])

  /* Reset when user hits R / Reset button */
  useEffect(() => {
    worldRef.current = buildInitialWorld()
    playerRef.current = {
      x: worldRef.current.spawnX,
      y: worldRef.current.spawnY,
      facing: 'right',
      swinging: false,
      swingT: 0,
      iFrames: 0,
    }
    doorOpenRef.current = false
    setHp(5)
    setGems(0)
    setWon(false)
    setFactoid(null)
    setPaused(false)
  }, [resetKey])

  /* Keyboard handlers */
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      keys.current[k] = true
      if (k === '1') setWeaponId('inertia')
      else if (k === '2') setWeaponId('force')
      else if (k === '3') setWeaponId('reaction')
      else if (k === '4') setWeaponId('energy')
      else if (k === 'r') setResetKey((n) => n + 1)
      else if (k === 'p' || k === 'escape') setPaused((p) => !p)
      else if (k === 'j' || k === ' ') {
        const p = playerRef.current
        if (!p.swinging && hpRef.current > 0 && !won) {
          p.swinging = true
          p.swingT = 0
        }
      }
      // prevent browser scroll on arrows/space
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault()
    }
    const onUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [won])

  /* Game loop */
  const tick = useCallback((now: number) => {
    const dt = Math.min(now - lastTRef.current, 50) // cap to 50ms
    lastTRef.current = now

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    if (!paused && !won && hpRef.current > 0) {
      updateWorld(dt)
    }

    // ─── RENDER ───────────────────────────────────────────────────
    ctx.fillStyle = '#0a0613'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    drawRoom(ctx, now, doorOpenRef.current)

    const { enemies } = worldRef.current
    for (const e of enemies) if (e.hp > 0) drawEnemy(ctx, e, now)

    const p = playerRef.current
    // draw player only if alive
    if (hpRef.current > 0) {
      drawPlayer(ctx, p.x, p.y, p.facing, p.swinging, p.swingT, WEAPONS[weaponRef.current])
    }

    // vignette corners — very cheap
    const grad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H / 3, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    rafRef.current = requestAnimationFrame(tick)
  }, [paused, won])

  /* World update — pulled out so tick() stays short */
  function updateWorld(dt: number) {
    const p = playerRef.current
    const world = worldRef.current

    // ── Player input ───────────────────────────────────────────
    let dx = 0, dy = 0
    if (keys.current['w'] || keys.current['arrowup'])    dy -= 1
    if (keys.current['s'] || keys.current['arrowdown'])  dy += 1
    if (keys.current['a'] || keys.current['arrowleft'])  dx -= 1
    if (keys.current['d'] || keys.current['arrowright']) dx += 1
    if (dx && dy) { dx *= 0.707; dy *= 0.707 }
    const speed = 0.06 // px per ms = 60 px/s — leisurely RPG pace
    const nx = p.x + dx * speed * dt
    const ny = p.y + dy * speed * dt

    // Facing (only update if moving)
    if (dx < 0) p.facing = 'left'
    else if (dx > 0) p.facing = 'right'
    else if (dy < 0) p.facing = 'up'
    else if (dy > 0) p.facing = 'down'

    // Collide with walls — sample corners of a 6×10 hitbox
    if (!collidesAt(nx, p.y)) p.x = nx
    if (!collidesAt(p.x, ny)) p.y = ny

    // I-frames tick
    if (p.iFrames > 0) p.iFrames = Math.max(0, p.iFrames - dt)

    // Swing animation
    if (p.swinging) {
      p.swingT += dt
      if (p.swingT >= 200) {
        p.swinging = false
        p.swingT = 0
      } else {
        // hit detection at peak 80–160 ms
        if (p.swingT >= 80 && p.swingT <= 160) {
          const w = WEAPONS[weaponRef.current]
          const hbX = p.facing === 'left' ? p.x - w.range : p.x
          const hbY = p.y - 8
          const hbW = w.range
          const hbH = 16
          for (const e of world.enemies) {
            if (e.hp <= 0 || e.hitCooldown > 0) continue
            if (overlap(hbX, hbY, hbW, hbH, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size)) {
              // Damage: weakness = full, else 0.25
              const dmgMult = e.weakness === w.id ? 1 : 0.25
              e.hp = Math.max(0, e.hp - w.damage * 2 * dmgMult)
              e.hitCooldown = 120
              // Knockback (simple)
              const kb = p.facing === 'left' ? -1.5 : 1.5
              e.vx = kb
              if (e.hp <= 0) onEnemyKilled(e)
            }
          }
        }
      }
    }

    // ── Enemies ────────────────────────────────────────────────
    for (const e of world.enemies) {
      if (e.hp <= 0) continue
      if (e.hitCooldown > 0) e.hitCooldown = Math.max(0, e.hitCooldown - dt)
      e.chargeCooldown -= dt
      if (e.chargeCooldown <= 0) {
        // pick a new straight-line direction toward player — quán tính style
        const ang = Math.atan2(p.y - e.y, p.x - e.x) + rand(-0.25, 0.25)
        e.vx = Math.cos(ang) * 0.45
        e.vy = Math.sin(ang) * 0.45
        e.chargeCooldown = rand(900, 1600)
      }
      const enx = e.x + e.vx * dt * 0.1
      const eny = e.y + e.vy * dt * 0.1
      if (!collidesAt(enx, e.y, e.size - 2)) e.x = enx; else e.vx *= -0.5
      if (!collidesAt(e.x, eny, e.size - 2)) e.y = eny; else e.vy *= -0.5

      // Contact damage
      if (p.iFrames <= 0 && hpRef.current > 0) {
        if (overlap(p.x - 3, p.y - 8, 6, 14, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size)) {
          hpRef.current = Math.max(0, hpRef.current - 1)
          setHp(hpRef.current)
          p.iFrames = 800
        }
      }
    }

    // Door opens when all dead
    if (!doorOpenRef.current && world.enemies.every((e) => e.hp <= 0)) {
      doorOpenRef.current = true
    }

    // Win condition: player walks through opened door tile
    if (doorOpenRef.current && !won) {
      const tileCol = Math.floor(p.x / TILE)
      const tileRow = Math.floor(p.y / TILE)
      if (ROOM_L1[tileRow]?.[tileCol] === T.DOOR_CLOSED) {
        setWon(true)
      }
    }

    // Factoid TTL
    setFactoid((cur) => {
      if (!cur) return cur
      const nextTtl = cur.ttl - dt
      return nextTtl <= 0 ? null : { ...cur, ttl: nextTtl }
    })
  }

  function onEnemyKilled(e: Enemy) {
    setGems((g) => g + 1)
    setFactoid({ text: FACTOIDS[e.kind], ttl: 3500 })
  }

  /** Simple wall/door collision using current player hitbox. */
  function collidesAt(cx: number, cy: number, size = 10): boolean {
    const half = size / 2
    const corners: [number, number][] = [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx - half, cy + half],
      [cx + half, cy + half],
    ]
    for (const [px, py] of corners) {
      const col = Math.floor(px / TILE)
      const row = Math.floor(py / TILE)
      const ch = tileAt(row, col)
      if (isSolid(ch, doorOpenRef.current)) return true
    }
    return false
  }

  /* Mount game loop */
  useEffect(() => {
    lastTRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [tick])

  const weapon = WEAPONS[weaponId]
  const dead = hp <= 0

  return (
    <div className="min-h-screen bg-[#0a0613] text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/40">
        <Link
          to="/dashboard/labtwin/labs"
          className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Labs
        </Link>
        <div className="h-5 w-px bg-white/20" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
            <Sword className="w-4 h-4 text-white" />
          </div>
          <div className="font-bold text-sm">Hầm Khoa Học — Tầng 1: Hang Quán Tính</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setResetKey((n) => n + 1)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset (R)
          </button>
          <button
            onClick={() => setHintVisible((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs transition"
          >
            <Info className="w-3 h-3" /> Hướng dẫn
          </button>
        </div>
      </div>

      {/* HUD */}
      <div className="flex items-center gap-4 px-4 py-2 bg-black/30 border-b border-white/5 text-sm">
        <div className="flex items-center gap-1">
          {Array.from({ length: maxHp }).map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 ${i < hp ? 'text-red-500 fill-red-500' : 'text-white/20'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Gem className="w-4 h-4 text-cyan-400" />
          <span className="tabular-nums">{gems}</span>
          <span className="text-white/40 text-xs">hạt tri thức</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-white/50">Kiếm:</span>
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded border"
            style={{ borderColor: weapon.auraColor, color: weapon.auraColor }}
          >
            <Zap className="w-3 h-3" />
            <span className="font-bold">{weapon.name}</span>
            <span className="text-white/50">· {weapon.principle}</span>
          </div>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div
          className="relative"
          style={{
            width: CANVAS_W * SCALE,
            height: CANVAS_H * SCALE,
            imageRendering: 'pixelated',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              width: CANVAS_W * SCALE,
              height: CANVAS_H * SCALE,
              imageRendering: 'pixelated',
              display: 'block',
              boxShadow: '0 0 40px rgba(124, 58, 237, 0.4)',
              borderRadius: 4,
            }}
          />

          {/* Factoid popup — 2.5s */}
          {factoid && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-amber-500/90 text-black text-sm font-medium max-w-[90%] shadow-lg animate-pulse">
              💡 {factoid.text}
            </div>
          )}

          {/* Hint overlay */}
          {hintVisible && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/80 border border-white/20 text-xs text-center max-w-[95%]">
              <div className="font-bold mb-1">Điều khiển</div>
              <div className="text-white/80">
                <kbd className="px-1 bg-white/10 rounded">WASD</kbd> di chuyển ·{' '}
                <kbd className="px-1 bg-white/10 rounded">J</kbd> chém ·{' '}
                <kbd className="px-1 bg-white/10 rounded">1-4</kbd> đổi kiếm ·{' '}
                <kbd className="px-1 bg-white/10 rounded">R</kbd> reset ·{' '}
                <kbd className="px-1 bg-white/10 rounded">P</kbd> tạm dừng
              </div>
              <div className="text-amber-300 mt-1">
                Mẹo: chọn <b>Kiếm Lực</b> (phím <kbd className="px-1 bg-white/10 rounded">2</kbd>) để
                hạ Slime Quán Tính đúng điểm yếu.
              </div>
            </div>
          )}

          {/* Pause / win / dead overlays */}
          {(paused || won || dead) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75">
              <div className="text-center">
                {paused && !won && !dead && (
                  <>
                    <div className="text-2xl font-bold mb-2">Tạm dừng</div>
                    <div className="text-sm text-white/60">Nhấn P để tiếp tục</div>
                  </>
                )}
                {won && (
                  <>
                    <div className="text-3xl font-bold mb-2 text-amber-400">🏆 Phòng hoàn thành!</div>
                    <div className="text-sm text-white/80 mb-4">
                      Bạn đã thu được <b>{gems}</b> hạt tri thức · Newton II đã được áp dụng đúng.
                    </div>
                    <button
                      onClick={() => setResetKey((n) => n + 1)}
                      className="px-4 py-2 rounded bg-amber-500 text-black font-bold hover:bg-amber-400 transition"
                    >
                      Chơi lại
                    </button>
                  </>
                )}
                {dead && (
                  <>
                    <div className="text-3xl font-bold mb-2 text-red-500">☠ Kiếm sĩ ngã xuống</div>
                    <div className="text-sm text-white/80 mb-4">
                      Slime đã áp dụng định luật I Newton — nó vẫn lăn. Bạn cần dùng Lực đúng lúc.
                    </div>
                    <button
                      onClick={() => setResetKey((n) => n + 1)}
                      className="px-4 py-2 rounded bg-red-500 text-white font-bold hover:bg-red-400 transition"
                    >
                      Thử lại
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strip footer — hint theo phòng */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/40 text-xs text-white/70">
        <b className="text-white">Câu đố phòng:</b> Slime Quán Tính chỉ lăn thẳng theo quán tính (Newton I).
        Muốn nó chậm lại và tan biến, phải dùng một <b style={{ color: '#ef4444' }}>Lực</b> tác dụng —
        chính là <b>Kiếm Lực</b> (phím 2). Các kiếm khác chỉ gây 25% sát thương.
      </div>
    </div>
  )
}
