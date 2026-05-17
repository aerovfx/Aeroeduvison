/**
 * CareerDayPixelSim — Pixel-art "1 day in the life" cho mỗi career.
 *
 * Cảm hứng: github.com/pablodelucca/pixel-agents (Claude-powered office sim).
 * Mỗi nghề có scene riêng theo category (IT office / Clinic / Classroom / ...).
 *
 * 2 chế độ:
 *   🤖 AUTO — Character tự đi qua các activities theo dailyLife
 *   🎮 MANUAL — Player điều khiển bằng phím (WASD/Arrow + Space/E)
 *
 * Bug fixes vs v1:
 *   - Speech bubble không clip top khi zone ở row thấp
 *   - Edge case empty dailyLife → render gracefully
 *   - Reset clears activityFrame + char position
 *   - Character facing direction (mirror khi đi sang trái)
 *   - Idle bobbing khi đứng yên
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Play, Pause, RotateCcw, FastForward, Sparkles, Bot, Gamepad2, Info,
} from 'lucide-react'

/* ────────────────────────── Types ────────────────────────── */

interface Zone {
  name: string
  x: number
  y: number
  emoji: string
  bg: string
}

interface SceneConfig {
  name: string
  floorColor: string
  wallColor: string
  zones: Zone[]
  decor?: { x: number; y: number; emoji: string }[]
}

interface Activity {
  raw: string
  time: string | null
  label: string
  zoneKey: string
  emoji: string
  durationFrames: number
}

interface Props {
  careerName: string
  category: string
  dailyLife: string[]
}

/* ────────────────────────── Scene templates ─────────────────────── */

const TILE_SIZE = 16
const GRID_W = 20
const GRID_H = 12

function makeOfficeScene(): SceneConfig {
  return {
    name: 'Văn phòng',
    floorColor: '#3f3f4a',
    wallColor: '#1a1a22',
    zones: [
      { name: 'Bàn làm việc',  x: 4,  y: 6, emoji: '💻', bg: '#52525b' },
      { name: 'Phòng họp',     x: 11, y: 4, emoji: '📊', bg: '#4338ca' },
      { name: 'Bếp',           x: 17, y: 4, emoji: '☕', bg: '#b45309' },
      { name: 'Phòng đọc',     x: 14, y: 8, emoji: '📚', bg: '#7c3aed' },
      { name: 'Cửa ra vào',    x: 1,  y: 10, emoji: '🚪', bg: '#52525b' },
      { name: 'Pair desk',     x: 7,  y: 6, emoji: '👥', bg: '#0e7490' },
    ],
    decor: [
      { x: 2,  y: 5, emoji: '🪴' },
      { x: 18, y: 9, emoji: '🪑' },
      { x: 10, y: 9, emoji: '🖨' },
    ],
  }
}

function makeClinicScene(): SceneConfig {
  return {
    name: 'Phòng khám',
    floorColor: '#e5f4ff',
    wallColor: '#1e3a8a',
    zones: [
      { name: 'Lễ tân',     x: 2,  y: 5, emoji: '🪪', bg: '#bfdbfe' },
      { name: 'Phòng khám', x: 7,  y: 5, emoji: '🩺', bg: '#dcfce7' },
      { name: 'Phòng xét nghiệm', x: 13, y: 4, emoji: '🧪', bg: '#fef3c7' },
      { name: 'Phòng phẫu thuật', x: 16, y: 7, emoji: '🏥', bg: '#fee2e2' },
      { name: 'Phòng họp',   x: 11, y: 9, emoji: '👨‍⚕️', bg: '#e0e7ff' },
      { name: 'Cửa ra vào',  x: 1,  y: 10, emoji: '🚪', bg: '#bfdbfe' },
    ],
    decor: [
      { x: 5,  y: 3, emoji: '💊' },
      { x: 15, y: 10, emoji: '🦽' },
    ],
  }
}

function makeClassroomScene(): SceneConfig {
  return {
    name: 'Trường học',
    floorColor: '#fef3c7',
    wallColor: '#92400e',
    zones: [
      { name: 'Bảng',         x: 9,  y: 3, emoji: '📐', bg: '#22c55e' },
      { name: 'Bàn HS',       x: 6,  y: 6, emoji: '✏️', bg: '#fbbf24' },
      { name: 'Bàn HS 2',     x: 12, y: 6, emoji: '📖', bg: '#fbbf24' },
      { name: 'Văn phòng GV', x: 17, y: 4, emoji: '🪑', bg: '#f97316' },
      { name: 'Thư viện',     x: 3,  y: 8, emoji: '📚', bg: '#7c3aed' },
      { name: 'Sân chơi',     x: 1,  y: 10, emoji: '⚽', bg: '#a3e635' },
    ],
    decor: [
      { x: 16, y: 10, emoji: '🪴' },
      { x: 14, y: 3, emoji: '🌍' },
    ],
  }
}

function makeStudioScene(): SceneConfig {
  return {
    name: 'Studio sáng tạo',
    floorColor: '#fdf2f8',
    wallColor: '#831843',
    zones: [
      { name: 'Drawing tablet', x: 5,  y: 6, emoji: '🎨', bg: '#fce7f3' },
      { name: 'Mood board',     x: 10, y: 4, emoji: '🖼', bg: '#a78bfa' },
      { name: 'Photo studio',   x: 15, y: 5, emoji: '📷', bg: '#7c3aed' },
      { name: 'Quán cafe',      x: 17, y: 9, emoji: '☕', bg: '#b45309' },
      { name: 'Phòng họp KH',   x: 11, y: 9, emoji: '🤝', bg: '#22d3ee' },
      { name: 'Cửa ra vào',     x: 1,  y: 10, emoji: '🚪', bg: '#fce7f3' },
    ],
    decor: [
      { x: 3, y: 4, emoji: '🌸' },
      { x: 8, y: 9, emoji: '🪑' },
    ],
  }
}

function makeLabScene(): SceneConfig {
  return {
    name: 'Phòng lab',
    floorColor: '#e0f2fe',
    wallColor: '#0c4a6e',
    zones: [
      { name: 'Bàn thí nghiệm', x: 5,  y: 5, emoji: '🔬', bg: '#bae6fd' },
      { name: 'Máy chủ',        x: 11, y: 4, emoji: '🖥', bg: '#1e40af' },
      { name: 'Bảng kết quả',   x: 16, y: 5, emoji: '📈', bg: '#7c3aed' },
      { name: 'Phòng họp',      x: 13, y: 9, emoji: '🗂', bg: '#22c55e' },
      { name: 'Bếp',            x: 18, y: 9, emoji: '☕', bg: '#b45309' },
      { name: 'Cửa ra vào',     x: 1,  y: 10, emoji: '🚪', bg: '#bae6fd' },
    ],
    decor: [
      { x: 3, y: 9, emoji: '📦' },
      { x: 9, y: 7, emoji: '🧪' },
    ],
  }
}

function makeBankScene(): SceneConfig {
  return {
    name: 'Ngân hàng',
    floorColor: '#f0fdf4',
    wallColor: '#14532d',
    zones: [
      { name: 'Quầy giao dịch', x: 4,  y: 5, emoji: '💵', bg: '#bbf7d0' },
      { name: 'Phòng thẩm định',x: 10, y: 4, emoji: '📋', bg: '#fbbf24' },
      { name: 'Phòng họp KH',   x: 15, y: 5, emoji: '🤝', bg: '#7c3aed' },
      { name: 'Kho an toàn',    x: 17, y: 8, emoji: '🔐', bg: '#52525b' },
      { name: 'Trà nước',       x: 11, y: 9, emoji: '☕', bg: '#b45309' },
      { name: 'Cửa ra vào',     x: 1,  y: 10, emoji: '🚪', bg: '#bbf7d0' },
    ],
    decor: [
      { x: 7, y: 9, emoji: '🪑' },
      { x: 14, y: 9, emoji: '🪴' },
    ],
  }
}

function makeKitchenScene(): SceneConfig {
  return {
    name: 'Nhà bếp',
    floorColor: '#fffbeb',
    wallColor: '#92400e',
    zones: [
      { name: 'Bếp nấu',        x: 5,  y: 5, emoji: '🍳', bg: '#fcd34d' },
      { name: 'Thớt thái',      x: 9,  y: 5, emoji: '🔪', bg: '#a3e635' },
      { name: 'Tủ đông',        x: 14, y: 4, emoji: '🧊', bg: '#bae6fd' },
      { name: 'Khách hàng',     x: 16, y: 8, emoji: '🍽', bg: '#fbbf24' },
      { name: 'Kho thực phẩm',  x: 3,  y: 9, emoji: '🥗', bg: '#22c55e' },
      { name: 'Cửa ra vào',     x: 1,  y: 10, emoji: '🚪', bg: '#fcd34d' },
    ],
    decor: [
      { x: 12, y: 7, emoji: '🍅' },
      { x: 18, y: 5, emoji: '🍷' },
    ],
  }
}

function getSceneForCategory(category: string): SceneConfig {
  const c = (category || '').toLowerCase()
  if (c.includes('công nghệ') || c.includes('it') || c.includes('phần mềm')) return makeOfficeScene()
  if (c.includes('y tế') || c.includes('điều dưỡng') || c.includes('dược')) return makeClinicScene()
  if (c.includes('giáo dục') || c.includes('sư phạm')) return makeClassroomScene()
  if (c.includes('sáng tạo') || c.includes('thiết kế') || c.includes('truyền thông')) return makeStudioScene()
  if (c.includes('khoa học') || c.includes('nghiên cứu') || c.includes('kỹ thuật')) return makeLabScene()
  if (c.includes('tài chính') || c.includes('kế toán') || c.includes('ngân hàng') || c.includes('kinh doanh')) return makeBankScene()
  if (c.includes('ẩm thực') || c.includes('đầu bếp') || c.includes('du lịch')) return makeKitchenScene()
  return makeOfficeScene()
}

/* ──────────────── Activity parsing ──────────────── */

function parseActivity(raw: string): { time: string | null; label: string } {
  const m = raw.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*(.+)$/)
  if (m) return { time: m[1], label: m[2].trim() }
  return { time: null, label: raw.trim() }
}

function mapActivityToZone(label: string, scene: SceneConfig): { zoneKey: string; emoji: string } {
  const l = label.toLowerCase()
  const matches: Array<[RegExp, string, string]> = [
    [/họp|meeting|stand-?up|standup|trao đổi|present/i,            'meeting', '💬'],
    [/code|lập trình|develop|fix|build|debug|deploy|push/i,         'desk',    '⌨️'],
    [/review|đọc|nghiên cứu|đánh giá|phân tích|read/i,              'reading', '📖'],
    [/lunch|trưa|ăn|nghỉ trưa|cafe|coffee/i,                        'kitchen', '🍱'],
    [/test|kiểm tra|thí nghiệm|lab|experiment/i,                    'lab',     '🧪'],
    [/khám|chẩn đoán|patient|bệnh nhân/i,                           'exam',    '🩺'],
    [/dạy|giảng|teach|class|lớp|bài giảng/i,                        'board',   '👩‍🏫'],
    [/thiết kế|design|vẽ|draw|sketch/i,                             'tablet',  '🎨'],
    [/viết|report|báo cáo|document|tài liệu/i,                      'desk',    '📝'],
    [/khách hàng|client|customer|tư vấn/i,                          'meeting', '🤝'],
    [/nấu|prep|cook|chop|món/i,                                     'cook',    '🍳'],
    [/giao dịch|transaction|tài chính|thẩm định/i,                  'transac', '💵'],
    [/về|tan ca|kết thúc|done|finish/i,                             'door',    '👋'],
  ]
  let zoneEmoji = '✨'
  let zoneHint = ''
  for (const [re, hint, em] of matches) {
    if (re.test(l)) { zoneHint = hint; zoneEmoji = em; break }
  }
  const findZoneByKeyword = (kws: string[]): Zone | undefined =>
    scene.zones.find(z => kws.some(k => z.name.toLowerCase().includes(k)))
  const zoneMap: Record<string, () => Zone | undefined> = {
    meeting: () => findZoneByKeyword(['họp', 'meeting']) || findZoneByKeyword(['phòng']),
    desk:    () => findZoneByKeyword(['bàn', 'desk']) || scene.zones[0],
    reading: () => findZoneByKeyword(['đọc', 'thư viện', 'reading']) || findZoneByKeyword(['bàn']),
    kitchen: () => findZoneByKeyword(['bếp', 'cafe', 'trà']) || findZoneByKeyword(['quán']),
    lab:     () => findZoneByKeyword(['lab', 'thí nghiệm', 'xét nghiệm']),
    exam:    () => findZoneByKeyword(['khám', 'lễ tân']),
    board:   () => findZoneByKeyword(['bảng', 'lớp', 'bàn hs']),
    tablet:  () => findZoneByKeyword(['drawing', 'mood', 'photo']),
    cook:    () => findZoneByKeyword(['bếp', 'thớt', 'nấu']),
    transac: () => findZoneByKeyword(['quầy', 'kho', 'giao dịch']),
    door:    () => findZoneByKeyword(['cửa', 'door']),
  }
  // BUG FIX: use stable fallback (zones[0]) instead of random to avoid jitter
  const zone = zoneMap[zoneHint]?.() || scene.zones[0]
  return { zoneKey: zone.name, emoji: zoneEmoji }
}

function buildActivities(dailyLife: string[], scene: SceneConfig): Activity[] {
  if (!dailyLife || dailyLife.length === 0) {
    return [
      { raw: '8:00 - Đến nơi làm việc', time: '8:00', label: 'Đến nơi làm việc',
        zoneKey: scene.zones[0].name, emoji: '🚶', durationFrames: 90 },
      { raw: '9:00 - Bắt đầu làm việc', time: '9:00', label: 'Bắt đầu làm việc',
        zoneKey: scene.zones[0].name, emoji: '✨', durationFrames: 120 },
    ]
  }
  return dailyLife.map(raw => {
    const { time, label } = parseActivity(raw)
    const { zoneKey, emoji } = mapActivityToZone(label, scene)
    return { raw, time, label, zoneKey, emoji, durationFrames: 110 }
  })
}

/* ────────────────────────── Component ────────────────────────── */

type Mode = 'auto' | 'manual'
type Facing = 'left' | 'right'

export default function CareerDayPixelSim({ careerName, category, dailyLife }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const [mode, setMode] = useState<Mode>('auto')
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<1 | 2 | 4>(1)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [interactedZone, setInteractedZone] = useState<string | null>(null)

  const scene = useMemo(() => getSceneForCategory(category), [category])
  const activities = useMemo(() => buildActivities(dailyLife, scene), [dailyLife, scene])

  // Character state — extended with facing + visual state
  const charRef = useRef<{
    x: number; y: number
    targetX: number; targetY: number
    progress: number
    activityFrame: number
    walking: boolean
    facing: Facing
    idleBobFrame: number
  }>({
    x: 1, y: 10, targetX: 1, targetY: 10, progress: 1,
    activityFrame: 0, walking: false, facing: 'right', idleBobFrame: 0,
  })

  // Keyboard state for manual mode
  const keysRef = useRef<Set<string>>(new Set())

  const resetChar = useCallback(() => {
    charRef.current = {
      x: 1, y: 10, targetX: 1, targetY: 10, progress: 1,
      activityFrame: 0, walking: false, facing: 'right', idleBobFrame: 0,
    }
    setCurrentIdx(0)
    setInteractedZone(null)
  }, [])

  // Reset khi đổi career
  useEffect(() => { resetChar() }, [careerName, resetChar])

  // Manual mode: capture keyboard
  useEffect(() => {
    if (mode !== 'manual') {
      keysRef.current.clear()
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'e', 'r'].includes(k)) {
        e.preventDefault()
        keysRef.current.add(k)
        if (k === 'r') resetChar()
        if (k === ' ' || k === 'e') {
          // Interact with closest zone
          const char = charRef.current
          let closest: Zone | null = null
          let minDist = Infinity
          for (const z of scene.zones) {
            const d = Math.abs(z.x - char.x) + Math.abs(z.y - char.y)
            if (d < minDist) { minDist = d; closest = z }
          }
          if (closest && minDist <= 2) {
            setInteractedZone(closest.name)
            // Find activity matching this zone
            const idx = activities.findIndex(a => a.zoneKey === closest!.name)
            if (idx !== -1) setCurrentIdx(idx)
          }
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [mode, scene.zones, activities, resetChar])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastT = performance.now()

    const tick = (dt: number) => {
      const char = charRef.current

      if (mode === 'manual') {
        // Manual mode: direct grid movement (1 tile per keypress with delay)
        const keys = keysRef.current
        const moveSpeed = (dt / 1000) * 2 // ~2 tiles/sec
        let dx = 0, dy = 0
        if (keys.has('arrowleft') || keys.has('a')) { dx -= moveSpeed; char.facing = 'left' }
        if (keys.has('arrowright') || keys.has('d')) { dx += moveSpeed; char.facing = 'right' }
        if (keys.has('arrowup') || keys.has('w')) dy -= moveSpeed
        if (keys.has('arrowdown') || keys.has('s')) dy += moveSpeed

        if (dx !== 0 || dy !== 0) {
          char.x = Math.max(0, Math.min(GRID_W - 1, char.x + dx))
          char.y = Math.max(2, Math.min(GRID_H - 1, char.y + dy))
          char.walking = true
        } else {
          char.walking = false
          char.idleBobFrame += dt / 16.67
        }
        return
      }

      // AUTO mode: walk to current activity zone, then dwell
      if (!playing || activities.length === 0) {
        char.idleBobFrame += dt / 16.67
        return
      }
      const cur = activities[currentIdx]
      if (!cur) return
      const targetZone = scene.zones.find(z => z.name === cur.zoneKey)
      if (!targetZone) return

      if (char.targetX !== targetZone.x || char.targetY !== targetZone.y) {
        if (!char.walking) {
          char.targetX = targetZone.x
          char.targetY = targetZone.y
          // Set facing based on direction
          if (targetZone.x < char.x) char.facing = 'left'
          else if (targetZone.x > char.x) char.facing = 'right'
          char.progress = 0
          char.walking = true
          char.activityFrame = 0
        }
      }

      if (char.walking) {
        char.progress += (dt / 1000) * 1.5
        if (char.progress >= 1) {
          char.progress = 1
          char.x = char.targetX
          char.y = char.targetY
          char.walking = false
          char.activityFrame = 0
        }
      } else {
        char.activityFrame += dt / 16.67
        if (char.activityFrame >= cur.durationFrames) {
          // BUG FIX: guard against length=0 (won't happen since we early-return above)
          setCurrentIdx(i => (i + 1) % Math.max(1, activities.length))
        }
        char.idleBobFrame += dt / 16.67
      }
    }

    const draw = () => {
      const W = GRID_W * TILE_SIZE
      const H = GRID_H * TILE_SIZE
      ctx.imageSmoothingEnabled = false

      // Wall (top rows)
      ctx.fillStyle = scene.wallColor
      ctx.fillRect(0, 0, W, 2 * TILE_SIZE)
      // Floor
      ctx.fillStyle = scene.floorColor
      ctx.fillRect(0, 2 * TILE_SIZE, W, H - 2 * TILE_SIZE)

      // Checker pattern
      for (let row = 2; row < GRID_H; row++) {
        for (let col = 0; col < GRID_W; col++) {
          if ((row + col) % 2 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.06)'
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          }
        }
      }

      // Wall windows
      for (let i = 2; i < GRID_W; i += 5) {
        ctx.fillStyle = '#7dd3fc'
        ctx.fillRect(i * TILE_SIZE + 2, 4, TILE_SIZE - 4, TILE_SIZE - 6)
        ctx.fillStyle = '#0c4a6e'
        ctx.fillRect(i * TILE_SIZE + 2, 4, TILE_SIZE - 4, 1)
      }

      // Zones — highlight active zone with glow
      const char = charRef.current
      const cur = activities[currentIdx]
      for (const z of scene.zones) {
        const isActive = mode === 'auto' && cur?.zoneKey === z.name
        const isInteracted = interactedZone === z.name

        if (isActive || isInteracted) {
          // Glow halo around zone
          ctx.fillStyle = isInteracted ? 'rgba(251,191,36,0.3)' : 'rgba(34,211,238,0.3)'
          ctx.fillRect(z.x * TILE_SIZE - 2, z.y * TILE_SIZE - 2, TILE_SIZE * 2 + 4, TILE_SIZE + 4)
        }
        ctx.fillStyle = z.bg
        ctx.fillRect(z.x * TILE_SIZE, z.y * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE)

        // Border for emphasis
        ctx.strokeStyle = isActive ? '#22d3ee' : isInteracted ? '#fbbf24' : 'rgba(0,0,0,0.2)'
        ctx.lineWidth = isActive || isInteracted ? 2 : 1
        ctx.strokeRect(z.x * TILE_SIZE, z.y * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE)

        // Zone emoji
        ctx.font = '12px serif'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText(z.emoji, z.x * TILE_SIZE + TILE_SIZE, z.y * TILE_SIZE + TILE_SIZE / 2)
      }

      // Decor
      if (scene.decor) {
        ctx.font = '11px serif'
        for (const d of scene.decor) {
          ctx.fillText(d.emoji, d.x * TILE_SIZE + TILE_SIZE / 2, d.y * TILE_SIZE + TILE_SIZE / 2)
        }
      }

      // Character render
      const cx = char.walking && mode === 'auto'
        ? (char.x + (char.targetX - char.x) * char.progress) * TILE_SIZE
        : char.x * TILE_SIZE
      const cy = char.walking && mode === 'auto'
        ? (char.y + (char.targetY - char.y) * char.progress) * TILE_SIZE
        : char.y * TILE_SIZE

      drawCharacter(ctx, cx, cy, char.facing, char.walking, char.idleBobFrame)

      // Speech bubble — BUG FIX: clamp Y so it stays visible
      if (!char.walking && cur && mode === 'auto') {
        const bubbleX = cx + 8
        const bubbleY = Math.max(2, cy - 26)
        ctx.fillStyle = '#fff'
        ctx.fillRect(bubbleX, bubbleY, 16, 14)
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1
        ctx.strokeRect(bubbleX, bubbleY, 16, 14)
        ctx.font = '11px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#000'
        ctx.fillText(cur.emoji, bubbleX + 8, bubbleY + 7)
        // Pointer tail
        ctx.fillStyle = '#fff'
        ctx.fillRect(cx + 12, bubbleY + 14, 3, 2)
      }

      // Interacted zone hint in manual mode
      if (mode === 'manual' && interactedZone) {
        const z = scene.zones.find(zo => zo.name === interactedZone)
        if (z) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'
          ctx.fillRect(0, 0, W, 14)
          ctx.fillStyle = '#fbbf24'
          ctx.font = 'bold 10px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`💬 ${z.name}`, W / 2, 7)
        }
      }
    }

    const render = (t: number) => {
      const dt = Math.min(50, t - lastT)
      lastT = t
      tick(dt * (mode === 'auto' ? speed : 1))
      draw()
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [mode, playing, speed, currentIdx, activities, scene, interactedZone])

  const current = activities[currentIdx]

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border-b border-zinc-800 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-300" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-zinc-100">Pixel Agent — Mô phỏng 1 ngày</h3>
          <p className="text-[10px] text-zinc-500 leading-tight">
            Cảm hứng pixel-agents · {scene.name} · {careerName}
          </p>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-zinc-800/80 rounded-lg p-0.5">
          <button
            onClick={() => setMode('auto')}
            className={`px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
              mode === 'auto' ? 'bg-cyan-500 text-white' : 'text-zinc-400'
            }`}
          >
            <Bot className="w-3 h-3" /> AUTO
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
              mode === 'manual' ? 'bg-amber-500 text-white' : 'text-zinc-400'
            }`}
          >
            <Gamepad2 className="w-3 h-3" /> CHƠI
          </button>
        </div>
      </div>

      {/* Mode-specific controls */}
      {mode === 'auto' ? (
        <>
          {current && (
            <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-2">
              <span className="text-xl">{current.emoji}</span>
              <div className="flex-1 min-w-0">
                {current.time && <span className="text-[10px] font-mono text-cyan-400">{current.time}</span>}
                <p className="text-xs text-zinc-200 leading-tight">{current.label}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPlaying(p => !p)}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  title={playing ? 'Tạm dừng' : 'Phát'}>
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold inline-flex items-center gap-1"
                  title="Tốc độ">
                  <FastForward className="w-3 h-3" /> {speed}×
                </button>
                <button onClick={resetChar}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  title="Bắt đầu lại">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {currentIdx + 1}/{activities.length}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <p className="text-[11px] text-amber-200 leading-tight flex-1">
            <kbd className="kbd">↑↓←→</kbd> hoặc <kbd className="kbd">WASD</kbd> di chuyển ·
            <kbd className="kbd">SPACE</kbd>/<kbd className="kbd">E</kbd> tương tác zone ·
            <kbd className="kbd">R</kbd> reset
          </p>
          <button onClick={resetChar}
            className="p-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200"
            title="Reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="bg-black p-2 flex justify-center" tabIndex={mode === 'manual' ? 0 : -1}>
        <canvas
          ref={canvasRef}
          width={GRID_W * TILE_SIZE}
          height={GRID_H * TILE_SIZE}
          className="w-full max-w-[640px]"
          style={{
            imageRendering: 'pixelated',
            aspectRatio: `${GRID_W * TILE_SIZE} / ${GRID_H * TILE_SIZE}`,
          }}
        />
      </div>

      {/* Timeline (auto mode only) */}
      {mode === 'auto' && (
        <div className="px-4 py-3 bg-zinc-900/30 border-t border-zinc-800">
          <div className="flex items-center gap-0.5 h-5 mb-1">
            {activities.map((a, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`flex-1 h-full rounded-sm transition-all relative ${
                  i === currentIdx
                    ? 'bg-gradient-to-b from-cyan-400 to-cyan-600'
                    : i < currentIdx
                    ? 'bg-cyan-900/60'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
                title={`${a.time || ''} ${a.label}`}
              >
                {i === currentIdx && (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px]">
                    {a.emoji}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 text-center">
            ⬛ {scene.zones.length} zones · {activities.length} hoạt động · click timeline để jump
          </p>
        </div>
      )}

      {/* Style cho kbd tag inline */}
      <style>{`
        .kbd {
          display: inline-block;
          padding: 1px 5px;
          font-family: 'SF Mono', Menlo, monospace;
          font-size: 9px;
          line-height: 1;
          background: rgba(251, 191, 36, 0.2);
          border: 1px solid rgba(251, 191, 36, 0.5);
          border-radius: 3px;
          color: #fbbf24;
          margin: 0 1px;
        }
      `}</style>
    </div>
  )
}

/** Draw pixel art character at (cx, cy) — top-left of foot tile. */
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  facing: Facing,
  walking: boolean,
  bobFrame: number,
) {
  // Idle bob (subtle)
  const bobOffset = walking
    ? (Math.sin(performance.now() / 80) > 0 ? 0 : -1)
    : Math.sin(bobFrame / 20) * 0.5

  ctx.save()
  if (facing === 'left') {
    ctx.translate(cx + 16, 0)
    ctx.scale(-1, 1)
    cx = 0
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(cx + 3, cy + 4, 10, 2)

  // Body outline
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(cx + 3, cy - 14 + bobOffset, 10, 18)

  // Shirt
  ctx.fillStyle = '#06b6d4'
  ctx.fillRect(cx + 4, cy - 8 + bobOffset, 8, 8)
  // Shirt collar
  ctx.fillStyle = '#0e7490'
  ctx.fillRect(cx + 7, cy - 8 + bobOffset, 2, 2)

  // Pants
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(cx + 4, cy + bobOffset, 8, 4)
  // Leg split (walking)
  if (walking) {
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(cx + 7, cy + bobOffset, 2, 4)
  }

  // Head (skin tone)
  ctx.fillStyle = '#fde68a'
  ctx.fillRect(cx + 4, cy - 14 + bobOffset, 8, 7)
  // Hair top
  ctx.fillStyle = '#78350f'
  ctx.fillRect(cx + 4, cy - 14 + bobOffset, 8, 2)
  // Eyes
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(cx + 6, cy - 11 + bobOffset, 1, 1)
  ctx.fillRect(cx + 9, cy - 11 + bobOffset, 1, 1)
  // Smile
  if (!walking) {
    ctx.fillStyle = '#a16207'
    ctx.fillRect(cx + 7, cy - 9 + bobOffset, 2, 1)
  }
  ctx.restore()
}
