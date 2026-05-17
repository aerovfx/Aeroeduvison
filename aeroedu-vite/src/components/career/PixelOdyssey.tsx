/**
 * PixelOdyssey — Game khám phá nghề nghiệp pixel art.
 *
 * Cảm hứng: github.com/pablodelucca/pixel-agents + classic top-down JRPG.
 * Player điều khiển character đi qua "Khu phố Nghề nghiệp" — 1 map lớn
 * với nhiều "phòng" tượng trưng cho các nghề khác nhau. Vào mỗi phòng,
 * gặp NPC "chuyên gia" và bấm E để trò chuyện → học về nghề + được
 * trao "Compass Token" 🧭. Mục tiêu: thu thập tất cả tokens để hoàn
 * thành odyssey.
 *
 * Phím:
 *   ↑↓←→ / WASD     → di chuyển character (collision detection)
 *   E / SPACE       → tương tác NPC trong tầm
 *   ESC             → đóng dialog
 *   R               → reset position (không xoá progress)
 *
 * Persist: localStorage 'rs.odyssey.tokens' lưu list job IDs đã thu.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Compass, RotateCcw, Trophy, X, Sparkles, MessageCircle, Map as MapIcon, User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  METRO_CHARACTERS,
  drawMetroCityCharacter,
  drawCharacterPreview,
  getCharacter,
  type Facing as MetroFacing,
} from '@/lib/pixel-characters'
import PixelTouchPad from './PixelTouchPad'
import { useIsVisible } from '@/hooks/useIsVisible'

/* ────────────────────────── Types ────────────────────────── */

interface NPC {
  id: string
  name: string
  emoji: string
  /** MetroCity character palette ID (lookup từ METRO_CHARACTERS) */
  characterId: string
  /** Facing direction khi đứng yên */
  facing: MetroFacing
  job: string
  x: number
  y: number
  /** 1 câu chia sẻ về nghề (hiện trong dialog) */
  intro: string
  /** Quiz đơn giản đúng → trao token */
  quiz: { q: string; choices: string[]; correctIdx: number; explain: string }
}

interface Building {
  /** ID dùng cho lookup */
  id: string
  /** Tên nghề/khu */
  name: string
  /** Hình chữ nhật khu vực (x, y, w, h) tile */
  rect: { x: number; y: number; w: number; h: number }
  /** Màu nền tường */
  wall: string
  /** Màu sàn riêng */
  floor: string
  /** Emoji biểu tượng (hiện ở góc) */
  icon: string
}

/* ────────────────────────── Map config ────────────────────────── */

const TILE_SIZE = 14
const MAP_W = 40
const MAP_H = 24

// 6 buildings (1 NPC per building)
const BUILDINGS: Building[] = [
  { id: 'it',       name: 'Tech Hub',     rect: { x: 2,  y: 2,  w: 9, h: 7 },  wall: '#1e293b', floor: '#334155', icon: '💻' },
  { id: 'med',      name: 'Bệnh viện',     rect: { x: 13, y: 2,  w: 9, h: 7 },  wall: '#7f1d1d', floor: '#fee2e2', icon: '🏥' },
  { id: 'edu',      name: 'Trường học',   rect: { x: 24, y: 2,  w: 9, h: 7 },  wall: '#92400e', floor: '#fef3c7', icon: '🏫' },
  { id: 'finance',  name: 'Ngân hàng',    rect: { x: 2,  y: 14, w: 9, h: 8 },  wall: '#14532d', floor: '#bbf7d0', icon: '🏦' },
  { id: 'creative', name: 'Studio nghệ',  rect: { x: 13, y: 14, w: 9, h: 8 },  wall: '#831843', floor: '#fce7f3', icon: '🎨' },
  { id: 'science',  name: 'Phòng lab',    rect: { x: 24, y: 14, w: 9, h: 8 },  wall: '#0c4a6e', floor: '#e0f2fe', icon: '🔬' },
]

const NPCS: NPC[] = [
  {
    id: 'it', name: 'Anh Long', emoji: '👨‍💻', characterId: 'liam', facing: 'down',
    job: 'Kỹ sư phần mềm',
    x: 6, y: 5,
    intro: 'Mỗi sáng anh stand-up meeting 15 phút, sau đó code feature mới. AI là đồng đội — không phải đối thủ.',
    quiz: {
      q: 'Kỹ năng QUAN TRỌNG NHẤT của lập trình viên hiện đại là?',
      choices: ['Code thật nhanh', 'Hiểu vấn đề + design hệ thống', 'Biết hết mọi framework', 'Code 1 mình'],
      correctIdx: 1,
      explain: 'AI code rất nhanh rồi — giá trị của lập trình viên là HIỂU vấn đề + thiết kế giải pháp.',
    },
  },
  {
    id: 'med', name: 'Chị Hồng', emoji: '👩‍⚕️', characterId: 'duc', facing: 'down',
    job: 'Bác sĩ',
    x: 17, y: 5,
    intro: 'Chị khám 30-40 bệnh nhân/ngày. Quan trọng nhất: lắng nghe + chẩn đoán chính xác.',
    quiz: {
      q: 'Lương bác sĩ Việt Nam mới tốt nghiệp khoảng?',
      choices: ['5-8 triệu', '8-15 triệu', '15-25 triệu', '30+ triệu'],
      correctIdx: 1,
      explain: 'BS mới ra trường ~8-15 triệu, nhưng senior + chuyên khoa có thể 50-100+ triệu/tháng.',
    },
  },
  {
    id: 'edu', name: 'Cô Lan', emoji: '👩‍🏫', characterId: 'nora', facing: 'down',
    job: 'Giáo viên',
    x: 28, y: 5,
    intro: 'Cô dạy 20 tiết/tuần. Niềm vui lớn nhất là thấy HS hiểu bài và phát triển.',
    quiz: {
      q: 'Giáo viên thường phải dậy sớm cỡ mấy giờ?',
      choices: ['4-5h sáng', '5-6h sáng', '6-7h sáng', 'Sau 8h'],
      correctIdx: 1,
      explain: 'Tiết học VN thường bắt đầu 7:00-7:30 → GV phải có mặt 6:30 → dậy ~5:30-6h.',
    },
  },
  {
    id: 'finance', name: 'Chú Hùng', emoji: '👨‍💼', characterId: 'noah', facing: 'down',
    job: 'Nhân viên Ngân hàng',
    x: 6, y: 18,
    intro: 'Mỗi ngày chú gặp 20-30 khách, xử lý giao dịch + tư vấn vay vốn. Tỉ mỉ là tất cả.',
    quiz: {
      q: 'Kỹ năng QUAN TRỌNG NHẤT cho banker là?',
      choices: ['Toán giỏi', 'Tin tưởng & cẩn thận', 'Bán hàng', 'Tin học'],
      correctIdx: 1,
      explain: 'Banker chạm tiền mỗi ngày — 1 sai sót có thể mất việc. Trust + careful > tất cả skills khác.',
    },
  },
  {
    id: 'creative', name: 'Bạn Mai', emoji: '🧑‍🎨', characterId: 'iris', facing: 'down',
    job: 'UX/UI Designer',
    x: 17, y: 18,
    intro: 'Mỗi sáng Mai brainstorm + sketch, chiều design Figma + present cho client. Empathy là siêu năng lực.',
    quiz: {
      q: 'UX Designer phải hiểu nhất điều gì?',
      choices: ['CSS + code', 'Nhu cầu người dùng', 'Tiếng Anh', 'Photoshop'],
      correctIdx: 1,
      explain: 'UX = User Experience. Hiểu user trước, design sau. Tool chỉ là phương tiện.',
    },
  },
  {
    id: 'science', name: 'Cô Trang', emoji: '👩‍🔬', characterId: 'maya', facing: 'down',
    job: 'Nhà khoa học dữ liệu',
    x: 28, y: 18,
    intro: 'Cô spend 75% thời gian clean data, 25% còn lại train model. Insight quan trọng hơn accuracy.',
    quiz: {
      q: 'Data Scientist thực ra làm gì NHIỀU NHẤT?',
      choices: ['Train AI model', 'Clean & explore data', 'Viết paper', 'Meeting'],
      correctIdx: 1,
      explain: 'Reality: 70-80% thời gian là data wrangling. "Garbage in, garbage out" — clean data là tất cả.',
    },
  },
]

/** Player character — selectable from a subset of METRO_CHARACTERS (loại bỏ những char
 *  đã assigned cho NPC để tránh confusion). */
const PLAYER_CHOICES = ['andy', 'sara', 'kai', 'linh']
const LS_PLAYER_KEY = 'rs.odyssey.playerChar'

const LS_TOKENS_KEY = 'rs.odyssey.tokens'
const LS_POSITION_KEY = 'rs.odyssey.pos'
const LS_TUTORIAL_KEY = 'rs.odyssey.tutorialSeen'

/** Lưu/load position để user return về nơi cũ */
interface SavedPosition { x: number; y: number; facing: Facing }
function loadSavedPosition(): SavedPosition | null {
  try {
    const raw = localStorage.getItem(LS_POSITION_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (typeof p.x === 'number' && typeof p.y === 'number') {
      return { x: p.x, y: p.y, facing: p.facing || 'down' }
    }
  } catch {}
  return null
}
function saveCurrentPosition(p: SavedPosition) {
  try { localStorage.setItem(LS_POSITION_KEY, JSON.stringify(p)) } catch {}
}

/* ────────────────────────── Collision ────────────────────────── */

/** Tile có walkable không? Walkable nếu: nằm trên đường đi (ngoài building),
 *  HOẶC trong sàn của 1 building (không phải tường). */
function isWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false
  for (const b of BUILDINGS) {
    const inX = x >= b.rect.x && x < b.rect.x + b.rect.w
    const inY = y >= b.rect.y && y < b.rect.y + b.rect.h
    if (inX && inY) {
      // Wall tile = perimeter (trừ door — middle bottom)
      const isPerimeter =
        x === b.rect.x ||
        x === b.rect.x + b.rect.w - 1 ||
        y === b.rect.y ||
        y === b.rect.y + b.rect.h - 1
      if (isPerimeter) {
        // Door at middle of bottom row (open)
        const doorX = b.rect.x + Math.floor(b.rect.w / 2)
        const doorY = b.rect.y + b.rect.h - 1
        if (x === doorX && y === doorY) return true
        return false
      }
      // Inside building floor — walkable
      return true
    }
  }
  // Outside all buildings — walkable plaza
  return true
}

/* ────────────────────────── Component ────────────────────────── */

type Facing = 'left' | 'right' | 'up' | 'down'

interface CharState {
  x: number; y: number
  facing: Facing
  walking: boolean
  bobFrame: number
  // Smooth interpolation
  drawX: number; drawY: number
}

export default function PixelOdyssey() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /** Pause render loop khi canvas scrolled off-screen (battery saver mobile) */
  const isVisible = useIsVisible(canvasRef, { threshold: 0.1 })
  const rafRef = useRef<number | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const moveTimerRef = useRef(0)
  // Initial position: load saved hoặc default center (12, 11)
  const charRef = useRef<CharState>((() => {
    const saved = loadSavedPosition()
    if (saved && isWalkable(saved.x, saved.y)) {
      return {
        x: saved.x, y: saved.y, facing: saved.facing, walking: false, bobFrame: 0,
        drawX: saved.x, drawY: saved.y,
      }
    }
    return { x: 12, y: 11, facing: 'down' as Facing, walking: false, bobFrame: 0, drawX: 12, drawY: 11 }
  })())

  const [collectedTokens, setCollectedTokens] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(LS_TOKENS_KEY)
      return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
  })
  const [activeNPC, setActiveNPC] = useState<NPC | null>(null)
  const [quizPhase, setQuizPhase] = useState<'intro' | 'quiz' | 'result'>('intro')
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [showCharPicker, setShowCharPicker] = useState(false)
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try { return !localStorage.getItem(LS_TUTORIAL_KEY) }
    catch { return false }
  })

  /** Khi bất kỳ modal mở: clear pressed keys để character không bị stuck đi tiếp */
  const anyModalOpen = !!activeNPC || showCharPicker || showTutorial || showMap
  useEffect(() => {
    if (anyModalOpen) keysRef.current.clear()
  }, [anyModalOpen])
  const [playerCharId, setPlayerCharId] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_PLAYER_KEY) || PLAYER_CHOICES[0]
    } catch { return PLAYER_CHOICES[0] }
  })
  const playerChar = useMemo(() => getCharacter(playerCharId), [playerCharId])

  const handleCharChange = useCallback((id: string) => {
    setPlayerCharId(id)
    try { localStorage.setItem(LS_PLAYER_KEY, id) } catch {}
  }, [])

  const persistTokens = useCallback((tokens: Set<string>) => {
    try { localStorage.setItem(LS_TOKENS_KEY, JSON.stringify([...tokens])) } catch {}
  }, [])

  /** Tìm NPC gần character trong khoảng 2 tile */
  const findNearbyNPC = useCallback((): NPC | null => {
    const c = charRef.current
    for (const npc of NPCS) {
      const d = Math.abs(npc.x - c.x) + Math.abs(npc.y - c.y)
      if (d <= 2) return npc
    }
    return null
  }, [])

  const handleInteract = useCallback(() => {
    const npc = findNearbyNPC()
    if (npc) {
      setActiveNPC(npc)
      setQuizPhase('intro')
      setSelectedChoice(null)
    }
  }, [findNearbyNPC])

  const handleAnswer = useCallback((idx: number) => {
    if (!activeNPC) return
    setSelectedChoice(idx)
    if (idx === activeNPC.quiz.correctIdx) {
      // Token! Show achievement toast với animated bounce
      setCollectedTokens(prev => {
        if (prev.has(activeNPC.id)) {
          // Already collected — không spam toast
          return prev
        }
        const next = new Set(prev)
        next.add(activeNPC.id)
        persistTokens(next)
        // Toast bottom-right với emoji + tên NPC + count
        const totalAfter = next.size
        toast.success(
          totalAfter >= NPCS.length
            ? `🏆 HOÀN THÀNH ODYSSEY! ${totalAfter}/${NPCS.length} 🎉`
            : `🧭 +1 Token từ ${activeNPC.name}! (${totalAfter}/${NPCS.length})`,
          {
            duration: 3500,
            style: {
              background: '#1c1917',
              color: '#fcd34d',
              border: '2px solid #fbbf24',
              fontSize: '13px',
              fontWeight: 'bold',
            },
          }
        )
        return next
      })
    }
    setQuizPhase('result')
  }, [activeNPC, persistTokens])

  const resetTokens = useCallback(() => {
    if (!confirm('Xoá tất cả tokens đã thu thập? Tiến độ sẽ reset.')) return
    setCollectedTokens(new Set())
    persistTokens(new Set())
  }, [persistTokens])

  const resetPosition = useCallback(() => {
    charRef.current = {
      x: 12, y: 11, facing: 'down', walking: false, bobFrame: 0,
      drawX: 12, drawY: 11,
    }
    // Clear saved position để bắt đầu lại sạch
    try { localStorage.removeItem(LS_POSITION_KEY) } catch {}
  }, [])

  // Keyboard — skip nếu user đang focus vào input/textarea/contenteditable
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (target.isContentEditable) return true
      return false
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // BUG FIX: don't hijack keys while user typing in forms
      if (isTypingTarget(e.target)) return

      const k = e.key.toLowerCase()
      // Khi NPC dialog mở: chỉ Escape work để đóng
      if (activeNPC) {
        if (k === 'escape') {
          e.preventDefault()
          setActiveNPC(null)
          setQuizPhase('intro')
          setSelectedChoice(null)
        }
        return
      }
      // Khi modal khác (char picker / tutorial / map) mở: Escape đóng modal, ignore game keys
      if (showCharPicker || showTutorial || showMap) {
        if (k === 'escape') {
          e.preventDefault()
          setShowCharPicker(false)
          setShowTutorial(false)
          setShowMap(false)
        }
        return
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'e', 'r', 'm', 'escape'].includes(k)) {
        e.preventDefault()
        keysRef.current.add(k)
        if (k === ' ' || k === 'e') handleInteract()
        if (k === 'r') resetPosition()
        if (k === 'm') setShowMap(s => !s)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [activeNPC, handleInteract, resetPosition, showCharPicker, showTutorial, showMap])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastT = performance.now()
    const STEP_DELAY = 120 // ms between grid moves

    const tick = (dt: number) => {
      const char = charRef.current
      char.bobFrame += dt / 16.67

      // Smooth drawX/drawY toward x/y
      const lerp = Math.min(1, dt / 60)
      char.drawX += (char.x - char.drawX) * lerp * 0.5
      char.drawY += (char.y - char.drawY) * lerp * 0.5
      const movingVisually = Math.abs(char.x - char.drawX) > 0.01 || Math.abs(char.y - char.drawY) > 0.01
      char.walking = movingVisually

      if (activeNPC) return // không di chuyển khi đang dialog

      moveTimerRef.current += dt
      if (moveTimerRef.current < STEP_DELAY) return

      const keys = keysRef.current
      let dx = 0, dy = 0
      let newFacing: Facing | null = null
      if (keys.has('arrowleft') || keys.has('a'))  { dx = -1; newFacing = 'left' }
      else if (keys.has('arrowright') || keys.has('d')) { dx = 1; newFacing = 'right' }
      else if (keys.has('arrowup') || keys.has('w')) { dy = -1; newFacing = 'up' }
      else if (keys.has('arrowdown') || keys.has('s')) { dy = 1; newFacing = 'down' }

      if (newFacing) char.facing = newFacing

      if (dx !== 0 || dy !== 0) {
        const nx = char.x + dx
        const ny = char.y + dy
        if (isWalkable(nx, ny)) {
          char.x = nx
          char.y = ny
          // Save position (throttled — chỉ lưu khi tile thay đổi)
          saveCurrentPosition({ x: nx, y: ny, facing: char.facing })
        }
        moveTimerRef.current = 0
      }
    }

    const draw = () => {
      const W = MAP_W * TILE_SIZE
      const H = MAP_H * TILE_SIZE
      ctx.imageSmoothingEnabled = false

      // Plaza grass background
      ctx.fillStyle = '#86efac'
      ctx.fillRect(0, 0, W, H)
      // Grass pattern dots
      for (let row = 0; row < MAP_H; row++) {
        for (let col = 0; col < MAP_W; col++) {
          if ((row + col) % 3 === 0) {
            ctx.fillStyle = '#4ade80'
            ctx.fillRect(col * TILE_SIZE + 4, row * TILE_SIZE + 4, 2, 2)
          }
        }
      }

      // Paths — vertical and horizontal between buildings
      ctx.fillStyle = '#d4d4d8'
      // Horizontal middle path
      ctx.fillRect(0, 11 * TILE_SIZE, W, 2 * TILE_SIZE)
      // Vertical paths between buildings
      ctx.fillRect(11 * TILE_SIZE, 0, 2 * TILE_SIZE, H)
      ctx.fillRect(22 * TILE_SIZE, 0, 2 * TILE_SIZE, H)
      ctx.fillRect(33 * TILE_SIZE, 0, 2 * TILE_SIZE, H)

      // Buildings
      for (const b of BUILDINGS) {
        // Floor
        ctx.fillStyle = b.floor
        ctx.fillRect(b.rect.x * TILE_SIZE, b.rect.y * TILE_SIZE,
          b.rect.w * TILE_SIZE, b.rect.h * TILE_SIZE)

        // Wall (perimeter)
        ctx.fillStyle = b.wall
        // Top wall
        ctx.fillRect(b.rect.x * TILE_SIZE, b.rect.y * TILE_SIZE, b.rect.w * TILE_SIZE, TILE_SIZE)
        // Bottom wall (skip door)
        const doorX = b.rect.x + Math.floor(b.rect.w / 2)
        ctx.fillRect(b.rect.x * TILE_SIZE, (b.rect.y + b.rect.h - 1) * TILE_SIZE,
          (doorX - b.rect.x) * TILE_SIZE, TILE_SIZE)
        ctx.fillRect((doorX + 1) * TILE_SIZE, (b.rect.y + b.rect.h - 1) * TILE_SIZE,
          (b.rect.x + b.rect.w - doorX - 1) * TILE_SIZE, TILE_SIZE)
        // Left wall
        ctx.fillRect(b.rect.x * TILE_SIZE, b.rect.y * TILE_SIZE, TILE_SIZE, b.rect.h * TILE_SIZE)
        // Right wall
        ctx.fillRect((b.rect.x + b.rect.w - 1) * TILE_SIZE, b.rect.y * TILE_SIZE,
          TILE_SIZE, b.rect.h * TILE_SIZE)

        // Door highlight
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(doorX * TILE_SIZE + 4, (b.rect.y + b.rect.h - 1) * TILE_SIZE + 4,
          TILE_SIZE - 8, TILE_SIZE - 6)

        // Roof sign (top center)
        ctx.font = '12px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#fff'
        ctx.fillText(b.icon, (b.rect.x + b.rect.w / 2) * TILE_SIZE, (b.rect.y + 0.5) * TILE_SIZE)

        // Bottom plaque (under door)
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect((b.rect.x + 1) * TILE_SIZE, (b.rect.y + b.rect.h) * TILE_SIZE,
          (b.rect.w - 2) * TILE_SIZE, 10)
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 8px sans-serif'
        ctx.fillText(b.name, (b.rect.x + b.rect.w / 2) * TILE_SIZE,
          (b.rect.y + b.rect.h) * TILE_SIZE + 5)
      }

      // NPCs (always drawn inside their buildings — using MetroCity sprites)
      for (const npc of NPCS) {
        const hasToken = collectedTokens.has(npc.id)
        const cx = npc.x * TILE_SIZE
        const cy = npc.y * TILE_SIZE
        const npcChar = getCharacter(npc.characterId)
        // Render MetroCity character
        drawMetroCityCharacter(ctx, cx, cy, npcChar, npc.facing, false, charRef.current.bobFrame)
        // Token indicator above NPC head
        if (hasToken) {
          ctx.fillStyle = '#10b981'
          ctx.font = 'bold 9px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('✓', cx + 7, cy - 5)
        } else {
          // Pulse "!" red indicator
          const pulse = Math.sin(performance.now() / 200) > 0
          if (pulse) {
            ctx.fillStyle = '#ef4444'
            ctx.fillRect(cx + 5, cy - 9, 4, 6)
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 6px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('!', cx + 7, cy - 6)
          }
        }
      }

      // Player character
      const char = charRef.current
      const cx = char.drawX * TILE_SIZE
      const cy = char.drawY * TILE_SIZE
      drawMetroCityCharacter(ctx, cx, cy, playerChar, char.facing, char.walking, char.bobFrame)

      // Interact prompt if near NPC
      const nearby = findNearbyNPC()
      if (nearby && !activeNPC) {
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(cx - 4, cy - 20, 24, 12)
        ctx.fillStyle = '#000'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('E nói', cx + 8, cy - 14)
      }
    }

    const render = (t: number) => {
      const dt = Math.min(50, t - lastT)
      lastT = t
      // Battery saver: chỉ tick + draw khi canvas visible.
      // Vẫn schedule RAF để khi visible quay lại không miss frame.
      if (isVisible) {
        tick(dt)
        draw()
      }
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [activeNPC, collectedTokens, findNearbyNPC, playerChar, isVisible])

  const tokenCount = collectedTokens.size
  const totalNPCs = NPCS.length
  const completed = tokenCount >= totalNPCs

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-cyan-500/20 border-b border-zinc-800 flex items-center gap-3">
        <Compass className="w-5 h-5 text-amber-300" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-amber-100">Pixel Odyssey — Khám phá Nghề</h3>
          <p className="text-[10px] text-zinc-400 leading-tight">
            Đi qua 6 building, nói chuyện chuyên gia, thu thập 🧭 Compass Tokens
          </p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-1 rounded-lg">
          <Trophy className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-xs font-bold text-amber-200">{tokenCount}/{totalNPCs}</span>
        </div>
        <button onClick={() => setShowTutorial(true)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          title="Xem hướng dẫn chơi">
          <span className="text-xs font-bold leading-none w-3.5 h-3.5 inline-flex items-center justify-center">?</span>
        </button>
        <button onClick={() => setShowCharPicker(true)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          title={`Đổi nhân vật (hiện tại: ${playerChar.displayName || playerChar.name})`}>
          <User className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setShowMap(s => !s)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          title="Mở mini-map (phím M)">
          <MapIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={resetPosition}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          title="Reset vị trí (phím R)">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Completion banner */}
      {completed && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-b border-amber-500/40 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <p className="text-xs font-bold text-amber-100 flex-1">
            🎉 Hoàn thành Odyssey! Bạn đã khám phá đủ {totalNPCs} nghề.
          </p>
          <button onClick={resetTokens}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 underline">
            Chơi lại
          </button>
        </div>
      )}

      {/* Key hints */}
      <div className="px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800 text-[10px] text-zinc-400">
        <kbd className="kbd-ody">↑↓←→</kbd> hoặc <kbd className="kbd-ody">WASD</kbd> di chuyển ·
        <kbd className="kbd-ody">E</kbd>/<kbd className="kbd-ody">SPACE</kbd> nói chuyện ·
        <kbd className="kbd-ody">M</kbd> map ·
        <kbd className="kbd-ody">R</kbd> reset vị trí ·
        <kbd className="kbd-ody">ESC</kbd> đóng dialog
      </div>

      {/* Canvas */}
      <div className="bg-emerald-900/50 p-2 relative">
        <canvas
          ref={canvasRef}
          width={MAP_W * TILE_SIZE}
          height={MAP_H * TILE_SIZE}
          className="w-full mx-auto block"
          style={{
            imageRendering: 'pixelated',
            aspectRatio: `${MAP_W * TILE_SIZE} / ${MAP_H * TILE_SIZE}`,
            maxWidth: '720px',
          }}
        />

        {/* First-visit tutorial overlay */}
        {showTutorial && (
          <TutorialOverlay onClose={() => {
            setShowTutorial(false)
            try { localStorage.setItem(LS_TUTORIAL_KEY, '1') } catch {}
          }} />
        )}

        {/* Character picker overlay */}
        {showCharPicker && (
          <div
            onClick={() => setShowCharPicker(false)}
            className="absolute inset-2 bg-black/85 backdrop-blur flex items-center justify-center cursor-pointer"
          >
            <div className="bg-zinc-900 rounded-xl p-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h4 className="font-bold text-amber-200 mb-1 flex items-center gap-2">
                <User className="w-4 h-4" /> Chọn nhân vật
              </h4>
              <p className="text-[11px] text-zinc-500 mb-3">
                Tham khảo MetroCity Free Top-Down Character Pack — jik-a-4.itch.io
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PLAYER_CHOICES.map(id => {
                  const ch = getCharacter(id)
                  const isActive = id === playerCharId
                  return (
                    <button
                      key={id}
                      onClick={() => { handleCharChange(id); setShowCharPicker(false) }}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 transition ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400'
                          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <CharacterPreview character={ch} />
                      <div className="text-left">
                        <p className="text-xs font-bold text-zinc-100">{ch.displayName || ch.name}</p>
                        <p className="text-[10px] text-zinc-500 capitalize">
                          {ch.hairStyle} · {ch.accessory || 'no accessory'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-3 text-center">
                Click ngoài hoặc chọn nhân vật để đóng
              </p>
            </div>
          </div>
        )}

        {/* Mini-map overlay */}
        {showMap && (
          <div
            onClick={() => setShowMap(false)}
            className="absolute inset-2 bg-black/85 backdrop-blur flex items-center justify-center cursor-pointer"
          >
            <div className="bg-zinc-900 rounded-xl p-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h4 className="font-bold text-amber-200 mb-3 flex items-center gap-2">
                <MapIcon className="w-4 h-4" /> Bản đồ khu phố nghề
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {BUILDINGS.map(b => {
                  const hasToken = collectedTokens.has(b.id)
                  return (
                    <div key={b.id}
                      className={`p-2 rounded-lg border text-center ${
                        hasToken ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      <div className="text-xl">{b.icon}</div>
                      <p className="text-[10px] font-bold text-zinc-200 mt-1">{b.name}</p>
                      {hasToken && <p className="text-[10px] text-emerald-300 mt-0.5">🧭 ✓</p>}
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-3 text-center">
                Click bất kỳ đâu để đóng · Bấm <kbd className="kbd-ody">M</kbd> trên game
              </p>
            </div>
          </div>
        )}

        {/* NPC dialog overlay */}
        {activeNPC && (
          <div className="absolute inset-2 bg-black/85 backdrop-blur flex items-end md:items-center justify-center">
            <div className="bg-zinc-900 border-2 border-amber-500/50 rounded-xl m-2 max-w-md w-full">
              {/* NPC header */}
              <div className="px-4 py-3 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-b border-zinc-800 flex items-center gap-3">
                <div className="text-3xl">{activeNPC.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-zinc-100">{activeNPC.name}</p>
                  <p className="text-[11px] text-amber-300">{activeNPC.job}</p>
                </div>
                <button onClick={() => { setActiveNPC(null); setQuizPhase('intro'); setSelectedChoice(null) }}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"
                  title="Đóng (ESC)">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                {quizPhase === 'intro' && (
                  <>
                    <div className="flex items-start gap-2 mb-4">
                      <MessageCircle className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-200 leading-relaxed">{activeNPC.intro}</p>
                    </div>
                    <button onClick={() => setQuizPhase('quiz')}
                      className="w-full px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                      Trả lời câu hỏi để nhận 🧭 →
                    </button>
                  </>
                )}

                {quizPhase === 'quiz' && (
                  <>
                    <p className="text-sm font-bold text-zinc-100 mb-3">❓ {activeNPC.quiz.q}</p>
                    <div className="space-y-2">
                      {activeNPC.quiz.choices.map((c, i) => (
                        <button key={i} onClick={() => handleAnswer(i)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-200">
                          <span className="text-amber-400 font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {quizPhase === 'result' && selectedChoice !== null && (
                  <>
                    {selectedChoice === activeNPC.quiz.correctIdx ? (
                      <div className="text-center py-2">
                        <div className="text-4xl mb-2 animate-bounce">🧭</div>
                        <p className="font-bold text-emerald-300 text-base">Đúng rồi! +1 Compass Token</p>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <div className="text-4xl mb-2">😅</div>
                        <p className="font-bold text-amber-300 text-base">Chưa đúng, nhưng đừng buồn!</p>
                      </div>
                    )}
                    <div className="mt-3 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700">
                      <p className="text-[11px] text-zinc-400 mb-1">💡 Đáp án: {String.fromCharCode(65 + activeNPC.quiz.correctIdx)}. {activeNPC.quiz.choices[activeNPC.quiz.correctIdx]}</p>
                      <p className="text-xs text-zinc-200 leading-relaxed">{activeNPC.quiz.explain}</p>
                    </div>
                    <button onClick={() => { setActiveNPC(null); setQuizPhase('intro'); setSelectedChoice(null) }}
                      className="w-full mt-3 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm">
                      Tiếp tục khám phá →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile touch controls — only show on small screens (md:hidden inside) */}
      <PixelTouchPad hasMap hasInteract hasReset />

      {/* Progress bar */}
      <div className="px-4 py-2 bg-zinc-900/30 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${(tokenCount / totalNPCs) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-amber-300 font-mono">
            {Math.round((tokenCount / totalNPCs) * 100)}%
          </span>
        </div>
      </div>

      <style>{`
        .kbd-ody {
          display: inline-block;
          padding: 1px 5px;
          font-family: 'SF Mono', Menlo, monospace;
          font-size: 9px;
          line-height: 1;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.4);
          border-radius: 3px;
          color: #fbbf24;
          margin: 0 1px;
        }
      `}</style>
    </div>
  )
}

// drawPlayerCharacter() removed — using drawMetroCityCharacter from @/lib/pixel-characters

/** Tutorial overlay 3 slides cho first-visit users. */
function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const [slide, setSlide] = useState(0)
  const slides = [
    {
      title: 'Chào mừng tới Khu phố Nghề!',
      emoji: '🎮',
      body: (
        <>
          Bạn sẽ điều khiển nhân vật khám phá <b>6 building</b> tượng trưng cho 6 nghề.
          Mỗi building có 1 chuyên gia chia sẻ về nghề đó.
        </>
      ),
    },
    {
      title: 'Cách di chuyển',
      emoji: '⌨️',
      body: (
        <>
          <p className="mb-2">Bấm phím:</p>
          <ul className="space-y-1">
            <li><kbd className="kbd-ody">↑↓←→</kbd> hoặc <kbd className="kbd-ody">WASD</kbd> — đi 4 hướng</li>
            <li><kbd className="kbd-ody">E</kbd> hoặc <kbd className="kbd-ody">SPACE</kbd> — nói chuyện với NPC gần đó</li>
            <li><kbd className="kbd-ody">M</kbd> — mở bản đồ</li>
            <li><kbd className="kbd-ody">R</kbd> — reset vị trí</li>
          </ul>
          <p className="text-[11px] text-zinc-400 mt-3">Trên điện thoại: dùng D-pad bên dưới canvas.</p>
        </>
      ),
    },
    {
      title: 'Thu thập 🧭 Compass Tokens',
      emoji: '🧭',
      body: (
        <>
          Vào mỗi building, bấm <kbd className="kbd-ody">E</kbd> để nói chuyện chuyên gia.
          Trả lời đúng câu hỏi → nhận <b>1 🧭 token</b>. Mục tiêu: thu đủ <b>6/6 tokens</b> để hoàn thành Odyssey.
          <p className="text-[11px] text-zinc-500 mt-3">Tiến độ tự lưu — bạn có thể rời và quay lại bất kỳ lúc nào.</p>
        </>
      ),
    },
  ]
  const cur = slides[slide]
  const isLast = slide === slides.length - 1

  return (
    <div className="absolute inset-2 bg-black/85 backdrop-blur flex items-center justify-center z-10">
      <div className="bg-zinc-900 rounded-2xl border-2 border-amber-500/50 p-5 max-w-sm w-full mx-2">
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">{cur.emoji}</div>
          <h3 className="font-bold text-amber-200 text-base">{cur.title}</h3>
        </div>
        <div className="text-sm text-zinc-200 leading-relaxed">{cur.body}</div>
        {/* Slide indicators */}
        <div className="flex gap-1.5 justify-center mt-4">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${i === slide ? 'bg-amber-400' : 'bg-zinc-700'}`}
            />
          ))}
        </div>
        {/* Controls */}
        <div className="flex gap-2 mt-4 justify-between">
          <button onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline">
            Bỏ qua
          </button>
          <div className="flex gap-2">
            {slide > 0 && (
              <button onClick={() => setSlide(s => s - 1)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold">
                ← Lùi
              </button>
            )}
            <button
              onClick={() => isLast ? onClose() : setSlide(s => s + 1)}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
            >
              {isLast ? '🎮 Bắt đầu chơi!' : 'Tiếp →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Small canvas preview của 1 character (cho picker UI). */
function CharacterPreview({ character }: { character: ReturnType<typeof getCharacter> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, c.width, c.height)
    drawCharacterPreview(ctx, 0, 0, character, 2)
  }, [character])
  return (
    <canvas
      ref={ref}
      width={28}
      height={32}
      style={{ imageRendering: 'pixelated' }}
      className="shrink-0"
    />
  )
}
