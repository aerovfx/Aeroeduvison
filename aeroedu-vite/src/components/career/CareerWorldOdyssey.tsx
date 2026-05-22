/**
 * CareerWorldOdyssey — Pixel Odyssey MỞ RỘNG cho 25 nghề.
 *
 * Khác với PixelOdyssey (6 nghề, 1 câu/nghề):
 *   - 25 NPC (5 quận × 5 nghề/quận)
 *   - 3 câu hỏi mỗi nghề (random từ pool 5 câu trong career-quizzes.ts)
 *   - Map lớn hơn (60×36 tile @ 12px)
 *   - Sao đánh giá: 3/3 = ⭐⭐⭐, 2/3 = ⭐⭐, 1/3 = ⭐
 *   - Persist tokens vào localStorage 'career-world-odyssey-tokens'
 *
 * Layout 5 quận (district):
 *   - Tech District (góc trên-trái): Công nghệ thông tin, AI, UX, Quản lý dự án
 *   - Health District (góc trên-phải): Y tế, Y tá, Dược, Tâm lý, Xã hội
 *   - Education & Creative (giữa-trái): Giáo dục, Văn/Báo, Content, Designer, Nghệ sĩ
 *   - Business District (giữa-phải): Kinh doanh, Ngân hàng, Kế toán, Luật, Du lịch
 *   - Industrial & Service (dưới): Cơ khí, Kiến trúc, Phi công, Đầu bếp, Quân nhân
 *
 * Phím: ←↑→↓ / WASD di chuyển · E/SPACE nói chuyện · M map · R reset vị trí · ESC đóng.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Compass, RotateCcw, Trophy, X, Sparkles, MessageCircle, Map as MapIcon, User,
  CheckCircle2, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  METRO_CHARACTERS,
  drawMetroCityCharacter,
  drawCharacterPreview,
  getCharacter,
  pickCharacterForCategory,
  type Facing,
} from '@/lib/pixel-characters'
import PixelTouchPad from './PixelTouchPad'
import { useIsVisible } from '@/hooks/useIsVisible'
import { careerDetails } from '@/lib/career-detail-data'
import { getCareerQuestions, type CareerQuizQuestion } from '@/lib/career-quizzes'

/* ────────────────────────── Types ────────────────────────── */

interface District {
  id: string
  name: string
  rect: { x: number; y: number; w: number; h: number }
  wall: string
  floor: string
  icon: string
  /** Career IDs that live in this district */
  careers: string[]
}

interface WorldNPC {
  /** Career id (matches careerDetails key) */
  careerId: string
  name: string       // tên NPC tiếng Việt thân thiện
  emoji: string      // emoji nghề (từ career-detail-data.ts)
  jobName: string    // career.name
  characterId: string // MetroCity palette
  facing: Facing
  x: number          // tile
  y: number          // tile
  /** Intro 1 dòng từ "dailyLife" hoặc shortDescription */
  intro: string
  /** Tên quận (district) chứa NPC này */
  districtId: string
}

/** Thông tin token đã thu thập: career id + số sao */
interface CollectedToken {
  careerId: string
  /** Số câu đúng (0-3) — quy đổi thành stars */
  correctCount: number
  totalQuestions: number
}

/* ────────────────────────── Map config ────────────────────────── */

const TILE_SIZE = 12
const MAP_W = 60
const MAP_H = 36

const DISTRICTS: District[] = [
  {
    id: 'tech',
    name: 'Tech District',
    rect: { x: 2, y: 2, w: 24, h: 14 },
    wall: '#1e293b',
    floor: '#334155',
    icon: '💻',
    careers: ['ky-su-phan-mem', 'nha-khoa-hoc-du-lieu', 'nha-nghien-cuu-ai', 'ux-designer', 'quan-ly-du-an'],
  },
  {
    id: 'health',
    name: 'Health Quarter',
    rect: { x: 32, y: 2, w: 26, h: 14 },
    wall: '#7f1d1d',
    floor: '#fee2e2',
    icon: '🏥',
    careers: ['bac-si', 'y-ta', 'duoc-si', 'nha-tam-ly', 'nhan-vien-xa-hoi'],
  },
  {
    id: 'edu-art',
    name: 'Edu & Art',
    rect: { x: 2, y: 20, w: 24, h: 14 },
    wall: '#831843',
    floor: '#fce7f3',
    icon: '🎨',
    careers: ['giao-vien', 'nha-van', 'content-creator', 'nha-thiet-ke', 'nghe-si-bieu-dien'],
  },
  {
    id: 'business',
    name: 'Business Hub',
    rect: { x: 32, y: 20, w: 14, h: 14 },
    wall: '#14532d',
    floor: '#bbf7d0',
    icon: '🏦',
    careers: ['doanh-nhan', 'nhan-vien-ngan-hang', 'ke-toan', 'luat-su', 'quan-ly-du-lich-khach-san'],
  },
  {
    id: 'industry',
    name: 'Industry & Service',
    rect: { x: 48, y: 20, w: 10, h: 14 },
    wall: '#92400e',
    floor: '#fef3c7',
    icon: '⚙️',
    careers: ['ky-su-co-khi', 'kien-truc-su', 'phi-cong', 'dau-bep', 'quan-nhan-canh-sat'],
  },
]

/* ────────────────────────── Helpers ────────────────────────── */

/**
 * Build danh sách 25 NPC, mỗi nghề 1 NPC, đặt tại tile bên trong district tương ứng.
 * Tile được rải đều theo grid 5 cột x 1 hàng (hoặc 5 ô khác nhau) trong từng district.
 */
function buildWorldNPCs(): WorldNPC[] {
  const result: WorldNPC[] = []

  for (const d of DISTRICTS) {
    const careers = d.careers
    const cols = Math.min(careers.length, 5)
    // Đặt NPC theo grid bên trong district, padding 2 tile
    const innerW = d.rect.w - 4
    const innerH = d.rect.h - 4
    const stepX = Math.floor(innerW / Math.max(cols, 1))
    careers.forEach((careerId, i) => {
      const detail = careerDetails[careerId]
      if (!detail) return
      const x = d.rect.x + 2 + i * stepX + Math.floor(stepX / 2)
      // Đặt NPC trong 2 hàng (cứ chẵn ở giữa, lẻ thấp hơn 1 chút) để đỡ thẳng tắp
      const y = d.rect.y + 2 + Math.floor(innerH / 2) + (i % 2 === 0 ? -2 : 2)
      // Lấy intro ngắn từ dailyLife đầu tiên hoặc shortDescription
      const intro = detail.dailyLife?.[0] || detail.shortDescription || 'Chào bạn! Để mình kể về nghề mình.'
      // Pick character theo category
      const ch = pickCharacterForCategory(detail.category)
      result.push({
        careerId,
        name: getNpcDisplayName(detail.name),
        emoji: detail.icon,
        jobName: detail.name,
        characterId: ch.id,
        facing: 'down',
        x,
        y,
        intro: trimIntro(intro),
        districtId: d.id,
      })
    })
  }

  return result
}

/** Cắt intro xuống <= 140 ký tự cho dialog gọn */
function trimIntro(s: string): string {
  if (s.length <= 140) return s
  return s.slice(0, 137).trimEnd() + '...'
}

/** Đổi "Kỹ sư phần mềm" → "Bạn Long (Kỹ sư phần mềm)" — chỉ tên ngắn */
function getNpcDisplayName(jobName: string): string {
  // Cycle qua vài tên VN phổ biến — để mỗi NPC có "danh tính"
  const names = ['Long', 'Hồng', 'Lan', 'Hùng', 'Mai', 'Trang', 'Hà', 'Nam', 'Tú', 'Linh', 'Dũng', 'Vy', 'Quân', 'Phong', 'Nhi', 'Bảo', 'Anh', 'Kiên', 'Hằng', 'Khoa', 'Vân', 'Tâm', 'Diệu', 'Sơn', 'Yến']
  // Hash đơn giản từ jobName để pick deterministic
  let h = 0
  for (let i = 0; i < jobName.length; i++) h = (h * 31 + jobName.charCodeAt(i)) >>> 0
  const name = names[h % names.length]
  // Prefix phù hợp theo nghề
  if (jobName.includes('Giáo viên') || jobName.includes('Bác sĩ')) return `Cô ${name}`
  if (jobName.includes('Kỹ sư') || jobName.includes('Doanh nhân') || jobName.includes('Phi công') || jobName.includes('Quân nhân')) return `Anh ${name}`
  return `Bạn ${name}`
}

const WORLD_NPCS: WorldNPC[] = buildWorldNPCs()

const PLAYER_CHOICES = ['andy', 'sara', 'kai', 'linh', 'maya', 'iris']
const LS_TOKENS_KEY = 'career-world-odyssey-tokens'
const LS_PLAYER_KEY = 'career-world-odyssey.playerChar'
const LS_POSITION_KEY = 'career-world-odyssey.pos'
const LS_TUTORIAL_KEY = 'career-world-odyssey.tutorialSeen'

/* ────────────────────────── Position storage ────────────────────────── */

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

/* ────────────────────────── Tokens storage ────────────────────────── */

function loadTokens(): Map<string, CollectedToken> {
  try {
    const raw = localStorage.getItem(LS_TOKENS_KEY)
    if (!raw) return new Map()
    const arr = JSON.parse(raw) as CollectedToken[]
    return new Map(arr.map(t => [t.careerId, t]))
  } catch {}
  return new Map()
}
function saveTokens(tokens: Map<string, CollectedToken>) {
  try {
    localStorage.setItem(LS_TOKENS_KEY, JSON.stringify([...tokens.values()]))
  } catch {}
}

/* ────────────────────────── Collision ────────────────────────── */

function isWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false
  for (const d of DISTRICTS) {
    const inX = x >= d.rect.x && x < d.rect.x + d.rect.w
    const inY = y >= d.rect.y && y < d.rect.y + d.rect.h
    if (inX && inY) {
      const isPerimeter =
        x === d.rect.x ||
        x === d.rect.x + d.rect.w - 1 ||
        y === d.rect.y ||
        y === d.rect.y + d.rect.h - 1
      if (isPerimeter) {
        // Door at middle of bottom row
        const doorX = d.rect.x + Math.floor(d.rect.w / 2)
        const doorY = d.rect.y + d.rect.h - 1
        if (x === doorX && y === doorY) return true
        // Cũng có cửa giữa-trên cho district lớn
        const doorTopY = d.rect.y
        if (x === doorX && y === doorTopY) return true
        return false
      }
      return true
    }
  }
  return true
}

/* ────────────────────────── Component ────────────────────────── */

interface CharState {
  x: number; y: number
  facing: Facing
  walking: boolean
  bobFrame: number
  drawX: number; drawY: number
}

interface Props {
  /** Optional callback khi user đóng game (nếu mount trong modal) */
  onClose?: () => void
}

export default function CareerWorldOdyssey({ onClose }: Props = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isVisible = useIsVisible(canvasRef, { threshold: 0.1 })
  const rafRef = useRef<number | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const moveTimerRef = useRef(0)

  // Initial position: load saved or default near center (30, 17 — giữa plaza)
  const charRef = useRef<CharState>((() => {
    const saved = loadSavedPosition()
    if (saved && isWalkable(saved.x, saved.y)) {
      return {
        x: saved.x, y: saved.y, facing: saved.facing, walking: false, bobFrame: 0,
        drawX: saved.x, drawY: saved.y,
      }
    }
    return { x: 30, y: 17, facing: 'down' as Facing, walking: false, bobFrame: 0, drawX: 30, drawY: 17 }
  })())

  const [tokens, setTokens] = useState<Map<string, CollectedToken>>(() => loadTokens())
  const [activeNPC, setActiveNPC] = useState<WorldNPC | null>(null)
  /** Bước trong quy trình quiz cho 1 NPC */
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result' | 'final'>('intro')
  /** 3 câu hỏi đã shuffle cho NPC hiện tại */
  const [npcQuestions, setNpcQuestions] = useState<CareerQuizQuestion[]>([])
  /** Index câu hỏi đang trả lời (0..n-1) */
  const [qIndex, setQIndex] = useState(0)
  /** User chọn câu nào ở câu hiện tại */
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  /** Số câu đúng tích luỹ trong session NPC hiện tại */
  const [sessionCorrect, setSessionCorrect] = useState(0)

  const [showMap, setShowMap] = useState(false)
  const [showCharPicker, setShowCharPicker] = useState(false)
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try { return !localStorage.getItem(LS_TUTORIAL_KEY) }
    catch { return false }
  })

  // Modal opened: clear key state để character không bị stuck
  const anyModalOpen = !!activeNPC || showCharPicker || showTutorial || showMap
  useEffect(() => {
    if (anyModalOpen) keysRef.current.clear()
  }, [anyModalOpen])

  const [playerCharId, setPlayerCharId] = useState<string>(() => {
    try { return localStorage.getItem(LS_PLAYER_KEY) || PLAYER_CHOICES[0] }
    catch { return PLAYER_CHOICES[0] }
  })
  const playerChar = useMemo(() => getCharacter(playerCharId), [playerCharId])

  const handleCharChange = useCallback((id: string) => {
    setPlayerCharId(id)
    try { localStorage.setItem(LS_PLAYER_KEY, id) } catch {}
  }, [])

  /** Tìm NPC gần character (≤ 2 tile) — Manhattan distance */
  const findNearbyNPC = useCallback((): WorldNPC | null => {
    const c = charRef.current
    for (const npc of WORLD_NPCS) {
      const d = Math.abs(npc.x - c.x) + Math.abs(npc.y - c.y)
      if (d <= 2) return npc
    }
    return null
  }, [])

  const handleInteract = useCallback(() => {
    const npc = findNearbyNPC()
    if (!npc) return
    setActiveNPC(npc)
    setPhase('intro')
    setSelectedChoice(null)
    setQIndex(0)
    setSessionCorrect(0)
    setNpcQuestions(getCareerQuestions(npc.careerId, 3))
  }, [findNearbyNPC])

  const startQuiz = useCallback(() => {
    setPhase('quiz')
    setSelectedChoice(null)
  }, [])

  const handleAnswer = useCallback((idx: number) => {
    if (!activeNPC || !npcQuestions[qIndex]) return
    setSelectedChoice(idx)
    const isCorrect = idx === npcQuestions[qIndex].correctIdx
    if (isCorrect) setSessionCorrect(s => s + 1)
    setPhase('result')
  }, [activeNPC, npcQuestions, qIndex])

  const nextQuestion = useCallback(() => {
    if (qIndex + 1 >= npcQuestions.length) {
      // Hết câu — chốt session, ghi token
      if (!activeNPC) return
      const finalCorrect = sessionCorrect // đã update bởi handleAnswer
      const total = npcQuestions.length
      const newToken: CollectedToken = {
        careerId: activeNPC.careerId,
        correctCount: finalCorrect,
        totalQuestions: total,
      }
      setTokens(prev => {
        const next = new Map(prev)
        // Chỉ cập nhật nếu cao hơn (giữ best score)
        const old = prev.get(activeNPC.careerId)
        if (!old || finalCorrect > old.correctCount) {
          next.set(activeNPC.careerId, newToken)
          saveTokens(next)
          // Toast achievement
          const stars = '⭐'.repeat(Math.max(finalCorrect, 1))
          const totalAfter = next.size
          toast.success(
            totalAfter >= WORLD_NPCS.length
              ? `🏆 HOÀN THÀNH CAREER WORLD! ${totalAfter}/${WORLD_NPCS.length} 🎉`
              : `${stars} +1 token từ ${activeNPC.name}! (${totalAfter}/${WORLD_NPCS.length})`,
            {
              duration: 3500,
              style: {
                background: '#1c1917',
                color: '#fcd34d',
                border: '2px solid #fbbf24',
                fontSize: '13px',
                fontWeight: 'bold',
              },
            },
          )
        } else if (old) {
          // Vẫn để user xem score
          next.set(activeNPC.careerId, { ...old })
        }
        return next
      })
      setPhase('final')
      return
    }
    setQIndex(i => i + 1)
    setSelectedChoice(null)
    setPhase('quiz')
  }, [activeNPC, npcQuestions, qIndex, sessionCorrect])

  const closeDialog = useCallback(() => {
    setActiveNPC(null)
    setPhase('intro')
    setSelectedChoice(null)
    setQIndex(0)
    setSessionCorrect(0)
  }, [])

  const resetTokens = useCallback(() => {
    if (!confirm('Xoá tất cả tokens đã thu thập? Tiến độ sẽ reset toàn bộ.')) return
    setTokens(new Map())
    saveTokens(new Map())
  }, [])

  const resetPosition = useCallback(() => {
    charRef.current = {
      x: 30, y: 17, facing: 'down', walking: false, bobFrame: 0,
      drawX: 30, drawY: 17,
    }
    try { localStorage.removeItem(LS_POSITION_KEY) } catch {}
  }, [])

  // Keyboard handling
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (target.isContentEditable) return true
      return false
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const k = e.key.toLowerCase()

      if (activeNPC) {
        if (k === 'escape') {
          e.preventDefault()
          closeDialog()
        }
        return
      }
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
  }, [activeNPC, handleInteract, resetPosition, showCharPicker, showTutorial, showMap, closeDialog])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastT = performance.now()
    const STEP_DELAY = 110 // ms

    const tick = (dt: number) => {
      const char = charRef.current
      char.bobFrame += dt / 16.67

      const lerp = Math.min(1, dt / 60)
      char.drawX += (char.x - char.drawX) * lerp * 0.5
      char.drawY += (char.y - char.drawY) * lerp * 0.5
      const movingVisually = Math.abs(char.x - char.drawX) > 0.01 || Math.abs(char.y - char.drawY) > 0.01
      char.walking = movingVisually

      if (activeNPC) return

      moveTimerRef.current += dt
      if (moveTimerRef.current < STEP_DELAY) return

      const keys = keysRef.current
      let dx = 0, dy = 0
      let newFacing: Facing | null = null
      if (keys.has('arrowleft') || keys.has('a'))      { dx = -1; newFacing = 'left' }
      else if (keys.has('arrowright') || keys.has('d')) { dx = 1; newFacing = 'right' }
      else if (keys.has('arrowup') || keys.has('w'))    { dy = -1; newFacing = 'up' }
      else if (keys.has('arrowdown') || keys.has('s'))  { dy = 1; newFacing = 'down' }

      if (newFacing) char.facing = newFacing

      if (dx !== 0 || dy !== 0) {
        const nx = char.x + dx
        const ny = char.y + dy
        if (isWalkable(nx, ny)) {
          char.x = nx
          char.y = ny
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
      for (let row = 0; row < MAP_H; row += 1) {
        for (let col = 0; col < MAP_W; col += 1) {
          if ((row + col) % 4 === 0) {
            ctx.fillStyle = '#4ade80'
            ctx.fillRect(col * TILE_SIZE + 3, row * TILE_SIZE + 3, 2, 2)
          }
        }
      }

      // Paths: cross at center + ring
      ctx.fillStyle = '#d4d4d8'
      // Horizontal mid (y=17-18)
      ctx.fillRect(0, 17 * TILE_SIZE, W, 2 * TILE_SIZE)
      // Vertical mid (x=28-29)
      ctx.fillRect(28 * TILE_SIZE, 0, 2 * TILE_SIZE, H)
      // Top horizontal between tech & health (y=16)
      ctx.fillRect(0, 16 * TILE_SIZE, W, TILE_SIZE)
      // Inter-district narrow vertical paths
      ctx.fillRect(46 * TILE_SIZE, 20 * TILE_SIZE, TILE_SIZE, 14 * TILE_SIZE)

      // Districts
      for (const d of DISTRICTS) {
        // Floor
        ctx.fillStyle = d.floor
        ctx.fillRect(d.rect.x * TILE_SIZE, d.rect.y * TILE_SIZE,
          d.rect.w * TILE_SIZE, d.rect.h * TILE_SIZE)

        // Wall (perimeter)
        ctx.fillStyle = d.wall
        // Top
        ctx.fillRect(d.rect.x * TILE_SIZE, d.rect.y * TILE_SIZE, d.rect.w * TILE_SIZE, TILE_SIZE)
        // Bottom with door
        const doorX = d.rect.x + Math.floor(d.rect.w / 2)
        ctx.fillRect(d.rect.x * TILE_SIZE, (d.rect.y + d.rect.h - 1) * TILE_SIZE,
          (doorX - d.rect.x) * TILE_SIZE, TILE_SIZE)
        ctx.fillRect((doorX + 1) * TILE_SIZE, (d.rect.y + d.rect.h - 1) * TILE_SIZE,
          (d.rect.x + d.rect.w - doorX - 1) * TILE_SIZE, TILE_SIZE)
        // Top door (chỉ vẽ wall trừ ô doorX)
        ctx.fillStyle = d.wall
        ctx.fillRect(d.rect.x * TILE_SIZE, d.rect.y * TILE_SIZE, (doorX - d.rect.x) * TILE_SIZE, TILE_SIZE)
        ctx.fillRect((doorX + 1) * TILE_SIZE, d.rect.y * TILE_SIZE,
          (d.rect.x + d.rect.w - doorX - 1) * TILE_SIZE, TILE_SIZE)
        // Left wall
        ctx.fillRect(d.rect.x * TILE_SIZE, d.rect.y * TILE_SIZE, TILE_SIZE, d.rect.h * TILE_SIZE)
        // Right wall
        ctx.fillRect((d.rect.x + d.rect.w - 1) * TILE_SIZE, d.rect.y * TILE_SIZE,
          TILE_SIZE, d.rect.h * TILE_SIZE)

        // Doors highlight
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(doorX * TILE_SIZE + 3, (d.rect.y + d.rect.h - 1) * TILE_SIZE + 3,
          TILE_SIZE - 6, TILE_SIZE - 4)
        ctx.fillRect(doorX * TILE_SIZE + 3, d.rect.y * TILE_SIZE + 3,
          TILE_SIZE - 6, TILE_SIZE - 4)

        // District sign on top-center
        ctx.font = '11px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#fff'
        ctx.fillText(d.icon, (d.rect.x + d.rect.w / 2) * TILE_SIZE, (d.rect.y - 0.5) * TILE_SIZE)
        // Name plate above wall
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        const plateWidth = (d.rect.w - 4) * TILE_SIZE
        ctx.fillRect((d.rect.x + 2) * TILE_SIZE, d.rect.y * TILE_SIZE - 12, plateWidth, 10)
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 8px sans-serif'
        ctx.fillText(d.name, (d.rect.x + d.rect.w / 2) * TILE_SIZE, d.rect.y * TILE_SIZE - 7)
      }

      // NPCs
      for (const npc of WORLD_NPCS) {
        const tok = tokens.get(npc.careerId)
        const cx = npc.x * TILE_SIZE
        const cy = npc.y * TILE_SIZE
        const npcChar = getCharacter(npc.characterId)
        drawMetroCityCharacter(ctx, cx, cy, npcChar, npc.facing, false, charRef.current.bobFrame)
        // Career icon emoji floating above NPC
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(npc.emoji, cx + 7, cy - 3)
        // Token / pulse indicator
        if (tok) {
          // Show stars
          const stars = Math.max(tok.correctCount, 1)
          ctx.fillStyle = stars >= 3 ? '#10b981' : stars >= 2 ? '#fbbf24' : '#94a3b8'
          ctx.fillRect(cx + 1, cy - 12, 13, 5)
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 5px sans-serif'
          ctx.fillText('★'.repeat(stars), cx + 7, cy - 10)
        } else {
          const pulse = Math.sin(performance.now() / 200) > 0
          if (pulse) {
            ctx.fillStyle = '#ef4444'
            ctx.fillRect(cx + 5, cy - 11, 4, 6)
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 5px sans-serif'
            ctx.fillText('!', cx + 7, cy - 8)
          }
        }
      }

      // Player
      const char = charRef.current
      const cx = char.drawX * TILE_SIZE
      const cy = char.drawY * TILE_SIZE
      drawMetroCityCharacter(ctx, cx, cy, playerChar, char.facing, char.walking, char.bobFrame)

      // Interact prompt
      const nearby = findNearbyNPC()
      if (nearby && !activeNPC) {
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(cx - 4, cy - 19, 24, 11)
        ctx.fillStyle = '#000'
        ctx.font = 'bold 7px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('E nói', cx + 8, cy - 13)
      }
    }

    const render = (t: number) => {
      const dt = Math.min(50, t - lastT)
      lastT = t
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
  }, [activeNPC, tokens, findNearbyNPC, playerChar, isVisible])

  // Stats
  const tokenCount = tokens.size
  const totalNPCs = WORLD_NPCS.length
  const completed = tokenCount >= totalNPCs
  const totalStars = useMemo(() => {
    let s = 0
    tokens.forEach(t => { s += t.correctCount })
    return s
  }, [tokens])
  const maxStars = totalNPCs * 3

  // Group districts for map view
  const districtProgress = useMemo(() => {
    return DISTRICTS.map(d => {
      const collected = d.careers.filter(c => tokens.has(c)).length
      return { ...d, collected, total: d.careers.length }
    })
  }, [tokens])

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/20 via-purple-500/15 to-cyan-500/20 border-b border-zinc-800 flex items-center gap-3 flex-wrap">
        <Compass className="w-5 h-5 text-amber-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-amber-100">Career World — Khám phá 25 nghề</h3>
          <p className="text-[10px] text-zinc-400 leading-tight">
            5 quận · 25 NPC · 3 câu hỏi mỗi nghề · ⭐ tối đa 3 sao/nghề
          </p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-1 rounded-lg shrink-0">
          <Trophy className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-xs font-bold text-amber-200">{tokenCount}/{totalNPCs}</span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-1 rounded-lg shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
          <span className="text-xs font-bold text-purple-200">{totalStars}/{maxStars} ★</span>
        </div>
        <button onClick={() => setShowTutorial(true)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0"
          title="Xem hướng dẫn chơi">
          <span className="text-xs font-bold leading-none w-3.5 h-3.5 inline-flex items-center justify-center">?</span>
        </button>
        <button onClick={() => setShowCharPicker(true)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0"
          title={`Đổi nhân vật (${playerChar.displayName || playerChar.name})`}>
          <User className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setShowMap(s => !s)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0"
          title="Mở bản đồ thế giới (M)">
          <MapIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={resetPosition}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0"
          title="Reset vị trí (R)">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        {onClose && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0"
            title="Đóng">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Completion banner */}
      {completed && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-emerald-500/20 border-b border-amber-500/40 flex items-center gap-2 flex-wrap">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
          <p className="text-xs font-bold text-amber-100 flex-1 min-w-[60%]">
            🎉 Đã khám phá đủ {totalNPCs} nghề! Tổng {totalStars}/{maxStars} ★ — bạn là Career Explorer huyền thoại!
          </p>
          <button onClick={resetTokens}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 underline whitespace-nowrap">
            Chơi lại
          </button>
        </div>
      )}

      {/* Key hints */}
      <div className="px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800 text-[10px] text-zinc-400">
        <kbd className="kbd-cwo">↑↓←→</kbd> hoặc <kbd className="kbd-cwo">WASD</kbd> di chuyển ·
        <kbd className="kbd-cwo">E</kbd>/<kbd className="kbd-cwo">SPACE</kbd> nói chuyện ·
        <kbd className="kbd-cwo">M</kbd> bản đồ ·
        <kbd className="kbd-cwo">R</kbd> reset vị trí ·
        <kbd className="kbd-cwo">ESC</kbd> đóng dialog
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
            maxWidth: '960px',
          }}
        />

        {/* Tutorial */}
        {showTutorial && (
          <TutorialOverlay onClose={() => {
            setShowTutorial(false)
            try { localStorage.setItem(LS_TUTORIAL_KEY, '1') } catch {}
          }} />
        )}

        {/* Character picker */}
        {showCharPicker && (
          <div
            onClick={() => setShowCharPicker(false)}
            className="absolute inset-2 bg-black/85 backdrop-blur flex items-center justify-center cursor-pointer"
          >
            <div className="bg-zinc-900 rounded-xl p-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h4 className="font-bold text-amber-200 mb-1 flex items-center gap-2">
                <User className="w-4 h-4" /> Chọn nhân vật của bạn
              </h4>
              <p className="text-[11px] text-zinc-500 mb-3">
                Tham khảo MetroCity Top-Down Pack — jik-a-4.itch.io
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
                      <div className="text-left min-w-0">
                        <p className="text-xs font-bold text-zinc-100 truncate">
                          {ch.displayName || ch.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 capitalize">
                          {ch.hairStyle}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-3 text-center">
                Click ngoài để đóng
              </p>
            </div>
          </div>
        )}

        {/* World map */}
        {showMap && (
          <div
            onClick={() => setShowMap(false)}
            className="absolute inset-2 bg-black/85 backdrop-blur flex items-center justify-center cursor-pointer overflow-y-auto"
          >
            <div className="bg-zinc-900 rounded-xl p-4 max-w-lg w-full max-h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h4 className="font-bold text-amber-200 mb-3 flex items-center gap-2">
                <MapIcon className="w-4 h-4" /> Bản đồ Career World
              </h4>
              <div className="space-y-2">
                {districtProgress.map(d => (
                  <div key={d.id} className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-lg">{d.icon}</div>
                      <p className="text-xs font-bold text-zinc-100 flex-1">{d.name}</p>
                      <span className={`text-[10px] font-bold ${d.collected === d.total ? 'text-emerald-300' : 'text-zinc-400'}`}>
                        {d.collected}/{d.total}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {d.careers.map(cid => {
                        const detail = careerDetails[cid]
                        const tok = tokens.get(cid)
                        if (!detail) return null
                        return (
                          <div
                            key={cid}
                            className={`p-1.5 rounded text-center border ${
                              tok
                                ? 'bg-emerald-500/20 border-emerald-500/40'
                                : 'bg-zinc-900 border-zinc-700'
                            }`}
                            title={detail.name}
                          >
                            <div className="text-base leading-none">{detail.icon}</div>
                            {tok && (
                              <p className="text-[8px] text-amber-300 mt-0.5 leading-none">
                                {'★'.repeat(tok.correctCount)}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-3 text-center">
                Click bất kỳ đâu để đóng · Bấm <kbd className="kbd-cwo">M</kbd> để mở lại
              </p>
            </div>
          </div>
        )}

        {/* NPC dialog */}
        {activeNPC && (
          <div className="absolute inset-2 bg-black/85 backdrop-blur flex items-end md:items-center justify-center overflow-y-auto">
            <div className="bg-zinc-900 border-2 border-amber-500/50 rounded-xl m-2 max-w-md w-full">
              {/* NPC header */}
              <div className="px-4 py-3 bg-gradient-to-r from-amber-500/20 to-purple-500/20 border-b border-zinc-800 flex items-center gap-3">
                <div className="text-3xl">{activeNPC.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-zinc-100">{activeNPC.name}</p>
                  <p className="text-[11px] text-amber-300">{activeNPC.jobName}</p>
                </div>
                {phase === 'quiz' && npcQuestions.length > 0 && (
                  <div className="text-[10px] text-zinc-400 font-mono shrink-0">
                    {qIndex + 1}/{npcQuestions.length}
                  </div>
                )}
                <button onClick={closeDialog}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"
                  title="Đóng (ESC)">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                {phase === 'intro' && (
                  <>
                    <div className="flex items-start gap-2 mb-4">
                      <MessageCircle className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-200 leading-relaxed">{activeNPC.intro}</p>
                    </div>
                    <p className="text-[11px] text-zinc-500 mb-3">
                      💼 Hãy trả lời <b>{npcQuestions.length} câu hỏi</b> về nghề này để nhận ⭐. Đúng càng nhiều, sao càng cao.
                    </p>
                    <button onClick={startQuiz}
                      className="w-full px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                      Bắt đầu phỏng vấn nghề <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {phase === 'quiz' && npcQuestions[qIndex] && (
                  <>
                    <div className="flex items-start gap-2 mb-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        npcQuestions[qIndex].difficulty === 'Dễ' ? 'bg-emerald-500/20 text-emerald-300' :
                        npcQuestions[qIndex].difficulty === 'Trung bình' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {npcQuestions[qIndex].difficulty}
                      </span>
                      {npcQuestions[qIndex].topic && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 shrink-0">
                          {npcQuestions[qIndex].topic}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-zinc-100 mb-3">❓ {npcQuestions[qIndex].q}</p>
                    <div className="space-y-2">
                      {npcQuestions[qIndex].choices.map((c, i) => (
                        <button key={i} onClick={() => handleAnswer(i)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-200">
                          <span className="text-amber-400 font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {phase === 'result' && selectedChoice !== null && npcQuestions[qIndex] && (
                  <>
                    {selectedChoice === npcQuestions[qIndex].correctIdx ? (
                      <div className="text-center py-2">
                        <div className="text-3xl mb-1 animate-bounce">✅</div>
                        <p className="font-bold text-emerald-300 text-sm">Chính xác! +1 ⭐</p>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <div className="text-3xl mb-1">😅</div>
                        <p className="font-bold text-amber-300 text-sm">Chưa đúng, nhưng giờ bạn đã biết!</p>
                      </div>
                    )}
                    <div className="mt-3 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700">
                      <p className="text-[11px] text-zinc-400 mb-1">
                        💡 Đáp án: <span className="text-emerald-300 font-bold">
                          {String.fromCharCode(65 + npcQuestions[qIndex].correctIdx)}. {npcQuestions[qIndex].choices[npcQuestions[qIndex].correctIdx]}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-200 leading-relaxed">{npcQuestions[qIndex].explain}</p>
                    </div>
                    <button onClick={nextQuestion}
                      className="w-full mt-3 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                      {qIndex + 1 >= npcQuestions.length ? 'Hoàn thành phỏng vấn' : `Câu tiếp ${qIndex + 2}/${npcQuestions.length}`}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {phase === 'final' && (
                  <FinalSummary
                    correct={sessionCorrect}
                    total={npcQuestions.length}
                    careerName={activeNPC.jobName}
                    onRetry={() => {
                      setNpcQuestions(getCareerQuestions(activeNPC.careerId, 3))
                      setQIndex(0)
                      setSelectedChoice(null)
                      setSessionCorrect(0)
                      setPhase('quiz')
                    }}
                    onClose={closeDialog}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile touch controls */}
      <PixelTouchPad hasMap hasInteract hasReset />

      {/* Progress bar */}
      <div className="px-4 py-2 bg-zinc-900/30 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-purple-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${(tokenCount / totalNPCs) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-amber-300 font-mono">
            {Math.round((tokenCount / totalNPCs) * 100)}%
          </span>
        </div>
      </div>

      <style>{`
        .kbd-cwo {
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

/* ────────────────────────── Final summary for NPC ────────────────────────── */

function FinalSummary({
  correct,
  total,
  careerName,
  onRetry,
  onClose,
}: {
  correct: number
  total: number
  careerName: string
  onRetry: () => void
  onClose: () => void
}) {
  const stars = Math.max(correct, 1)
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0
  const label =
    correct === total ? '⭐⭐⭐ Chuyên gia nghề!' :
    correct >= 2 ? '⭐⭐ Đã hiểu khá rõ!' :
    correct >= 1 ? '⭐ Đã biết chút!' :
    'Học lại nha 😅'

  return (
    <div className="text-center py-2">
      <div className="text-4xl mb-2">{correct === total ? '🏆' : correct >= 2 ? '🎉' : correct >= 1 ? '👍' : '📚'}</div>
      <p className="font-bold text-amber-200 text-base mb-1">{label}</p>
      <p className="text-xs text-zinc-400 mb-3">
        Bạn trả lời đúng <span className="font-bold text-emerald-300">{correct}/{total}</span> câu về <span className="text-amber-300">{careerName}</span> ({percent}%)
      </p>
      <div className="flex justify-center gap-1 mb-4">
        {[1, 2, 3].map(i => (
          <span key={i} className={`text-2xl ${i <= stars ? 'text-amber-400' : 'text-zinc-700'}`}>
            ★
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        {correct < total && (
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Thử lại
          </button>
        )}
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Tiếp tục khám phá
        </button>
      </div>
    </div>
  )
}

/* ────────────────────────── Tutorial overlay ────────────────────────── */

function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const [slide, setSlide] = useState(0)
  const slides = [
    {
      title: 'Chào mừng tới Career World!',
      emoji: '🌍',
      body: (
        <>
          Map khổng lồ với <b>5 quận nghề</b> & <b>25 NPC</b> đại diện 25 nghề ở Việt Nam.
          Mỗi NPC sẽ phỏng vấn bạn 3 câu hỏi về nghề của họ.
        </>
      ),
    },
    {
      title: 'Cách di chuyển + nói chuyện',
      emoji: '🕹️',
      body: (
        <>
          <p className="mb-2">Phím:</p>
          <ul className="space-y-1">
            <li><kbd className="kbd-cwo">↑↓←→</kbd> hoặc <kbd className="kbd-cwo">WASD</kbd> — đi 4 hướng</li>
            <li><kbd className="kbd-cwo">E</kbd> hoặc <kbd className="kbd-cwo">SPACE</kbd> — nói chuyện NPC gần đó</li>
            <li><kbd className="kbd-cwo">M</kbd> — mở bản đồ thế giới</li>
            <li><kbd className="kbd-cwo">R</kbd> — reset vị trí</li>
          </ul>
          <p className="text-[11px] text-zinc-400 mt-3">Mobile: dùng D-pad bên dưới canvas.</p>
        </>
      ),
    },
    {
      title: 'Hệ thống ⭐ Sao',
      emoji: '⭐',
      body: (
        <>
          Mỗi NPC hỏi <b>3 câu</b>. Trả lời đúng càng nhiều, càng nhiều sao:
          <ul className="mt-2 space-y-1 text-xs">
            <li>⭐⭐⭐ — đúng 3/3 (chuyên gia)</li>
            <li>⭐⭐ — đúng 2/3 (khá rõ)</li>
            <li>⭐ — đúng 1/3 (biết chút)</li>
            <li>0 — có thể chơi lại</li>
          </ul>
          <p className="text-[11px] text-zinc-500 mt-3">
            Tiến độ tự lưu vào trình duyệt. Có thể quay lại bất cứ lúc nào để cải thiện điểm.
          </p>
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

/* ────────────────────────── Character preview (picker) ────────────────────────── */

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

// Re-export for typed consumers if needed
export { WORLD_NPCS, DISTRICTS }
// Re-export to silence unused — but keep available for future use
export type { WorldNPC, District }
void METRO_CHARACTERS
