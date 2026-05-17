/**
 * CareerDayPixelSim — Pixel-art "1 day in the life" cho mỗi career.
 * Cảm hứng: github.com/pablodelucca/pixel-agents (Claude-powered office sim).
 *
 * Mỗi nghề có scene riêng theo category (IT office / Clinic / Classroom / ...).
 * Parse career.dailyLife → mỗi entry mapping sang 1 activity với:
 *   - Zone (vị trí trong scene)
 *   - Emoji icon
 *   - Color accent
 * Character walks từ zone hiện tại sang zone mục tiêu, perform activity,
 * sau đó tiến hành sang activity kế tiếp.
 *
 * Canvas 320×200 (auto-scale 2× để fit container). 60fps render loop.
 * Controls: ▶/⏸ play/pause, 1×/2×/4× speed, ↻ restart.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, FastForward, Sparkles } from 'lucide-react'

/* ────────────────────────── Types ────────────────────────── */

interface Zone {
  /** Tên zone hiển thị (vd "Bàn làm việc") */
  name: string
  /** Toạ độ trong grid (col, row) — character đứng ở đây */
  x: number
  y: number
  /** Emoji icon hiển thị tại zone (vd 💻, 📚, 🍱) */
  emoji: string
  /** Màu nền tile của zone */
  bg: string
}

interface SceneConfig {
  /** Tên scene cho hiển thị */
  name: string
  /** Màu sàn (background tile) */
  floorColor: string
  /** Màu tường (top section) */
  wallColor: string
  /** Zones cố định */
  zones: Zone[]
  /** Decorations cố định không phải zone (chỉ để nhìn) */
  decor?: { x: number; y: number; emoji: string }[]
}

interface Activity {
  /** Mô tả raw từ dailyLife (vd "9:30 - Code feature mới") */
  raw: string
  /** Thời gian rút từ raw (vd "9:30") hoặc null */
  time: string | null
  /** Nội dung chính (đã strip time) */
  label: string
  /** Zone target trong scene */
  zoneKey: string
  /** Emoji activity (overlay character khi đang làm) */
  emoji: string
  /** Duration (frames) khi đang ở zone, sau khi đã walk tới */
  durationFrames: number
}

interface Props {
  /** Tên nghề (dùng để chọn scene + display) */
  careerName: string
  /** Category nghề (Công nghệ thông tin / Y tế / ...) — chọn scene */
  category: string
  /** dailyLife array từ CareerDetail */
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
      { name: 'Bảng',         x: 9,  y: 2, emoji: '📐', bg: '#22c55e' },
      { name: 'Bàn HS',       x: 6,  y: 6, emoji: '✏️', bg: '#fbbf24' },
      { name: 'Bàn HS 2',     x: 12, y: 6, emoji: '📖', bg: '#fbbf24' },
      { name: 'Văn phòng GV', x: 17, y: 4, emoji: '🪑', bg: '#f97316' },
      { name: 'Thư viện',     x: 3,  y: 8, emoji: '📚', bg: '#7c3aed' },
      { name: 'Sân chơi',     x: 1,  y: 10, emoji: '⚽', bg: '#a3e635' },
    ],
    decor: [
      { x: 16, y: 10, emoji: '🪴' },
      { x: 14, y: 2, emoji: '🌍' },
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

/** Chọn scene theo category nghề */
function getSceneForCategory(category: string): SceneConfig {
  const c = (category || '').toLowerCase()
  if (c.includes('công nghệ') || c.includes('it') || c.includes('phần mềm')) return makeOfficeScene()
  if (c.includes('y tế') || c.includes('điều dưỡng') || c.includes('dược')) return makeClinicScene()
  if (c.includes('giáo dục') || c.includes('sư phạm')) return makeClassroomScene()
  if (c.includes('sáng tạo') || c.includes('thiết kế') || c.includes('truyền thông')) return makeStudioScene()
  if (c.includes('khoa học') || c.includes('nghiên cứu') || c.includes('kỹ thuật')) return makeLabScene()
  if (c.includes('tài chính') || c.includes('kế toán') || c.includes('ngân hàng') || c.includes('kinh doanh')) return makeBankScene()
  if (c.includes('ẩm thực') || c.includes('đầu bếp') || c.includes('du lịch')) return makeKitchenScene()
  // Default
  return makeOfficeScene()
}

/* ──────────────── Activity parsing ──────────────── */

/** Parse "9:30 - Code feature mới" → { time: "9:30", label: "Code feature mới" } */
function parseActivity(raw: string): { time: string | null; label: string } {
  const m = raw.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*(.+)$/)
  if (m) return { time: m[1], label: m[2].trim() }
  return { time: null, label: raw.trim() }
}

/** Map activity label → zone key + emoji bằng keyword matching */
function mapActivityToZone(label: string, scene: SceneConfig): { zoneKey: string; emoji: string } {
  const l = label.toLowerCase()

  // Keywords → zones (priority order)
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

  // Map zone hint → actual zone in scene (best-match by name keyword)
  const findZoneByKeyword = (kws: string[]): Zone | undefined =>
    scene.zones.find(z => kws.some(k => z.name.toLowerCase().includes(k)))

  const zoneMap: Record<string, () => Zone | undefined> = {
    meeting: () => findZoneByKeyword(['họp', 'meeting']) || findZoneByKeyword(['phòng']) ,
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
  const zone = zoneMap[zoneHint]?.() || scene.zones[Math.floor(Math.random() * scene.zones.length)]
  return { zoneKey: zone.name, emoji: zoneEmoji }
}

function buildActivities(dailyLife: string[], scene: SceneConfig): Activity[] {
  if (!dailyLife || dailyLife.length === 0) {
    // Default fallback
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

export default function CareerDayPixelSim({ careerName, category, dailyLife }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<1 | 2 | 4>(1)
  const [currentIdx, setCurrentIdx] = useState(0)

  const scene = useMemo(() => getSceneForCategory(category), [category])
  const activities = useMemo(() => buildActivities(dailyLife, scene), [dailyLife, scene])

  // Character state: position + target
  const charRef = useRef({
    x: 1, y: 10, // bắt đầu ở cửa
    targetX: 1, targetY: 10,
    progress: 1, // 0..1 — 1 = đến nơi
    activityFrame: 0,
    walking: false,
  })

  // Reset khi đổi careerName
  useEffect(() => {
    setCurrentIdx(0)
    charRef.current = { x: 1, y: 10, targetX: 1, targetY: 10, progress: 1, activityFrame: 0, walking: false }
  }, [careerName])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastT = performance.now()

    const render = (t: number) => {
      const dt = Math.min(50, t - lastT)
      lastT = t

      if (playing && activities.length > 0) {
        tick(dt * speed)
      }
      draw(ctx)

      rafRef.current = requestAnimationFrame(render)
    }

    const tick = (dt: number) => {
      const char = charRef.current
      const cur = activities[currentIdx]
      if (!cur) return
      const targetZone = scene.zones.find(z => z.name === cur.zoneKey)
      if (!targetZone) return

      // Set target
      if (char.targetX !== targetZone.x || char.targetY !== targetZone.y) {
        if (!char.walking) {
          char.targetX = targetZone.x
          char.targetY = targetZone.y
          char.progress = 0
          char.walking = true
          char.activityFrame = 0
        }
      }

      if (char.walking) {
        // ~2 tiles/sec
        char.progress += (dt / 1000) * 1.5
        if (char.progress >= 1) {
          char.progress = 1
          char.x = char.targetX
          char.y = char.targetY
          char.walking = false
          char.activityFrame = 0
        }
      } else {
        // At target, accumulate activity frames
        char.activityFrame += dt / 16.67 // ~60fps frames
        if (char.activityFrame >= cur.durationFrames) {
          setCurrentIdx(i => (i + 1) % activities.length)
        }
      }
    }

    const draw = (ctx: CanvasRenderingContext2D) => {
      const W = GRID_W * TILE_SIZE
      const H = GRID_H * TILE_SIZE
      ctx.imageSmoothingEnabled = false

      // Wall (top 2 rows)
      ctx.fillStyle = scene.wallColor
      ctx.fillRect(0, 0, W, 2 * TILE_SIZE)
      // Floor
      ctx.fillStyle = scene.floorColor
      ctx.fillRect(0, 2 * TILE_SIZE, W, H - 2 * TILE_SIZE)

      // Floor pattern — checker
      for (let row = 2; row < GRID_H; row++) {
        for (let col = 0; col < GRID_W; col++) {
          if ((row + col) % 2 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.06)'
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          }
        }
      }

      // Wall top decor — windows
      for (let i = 2; i < GRID_W; i += 5) {
        ctx.fillStyle = '#7dd3fc'
        ctx.fillRect(i * TILE_SIZE + 2, 4, TILE_SIZE - 4, TILE_SIZE - 6)
        ctx.fillStyle = '#0c4a6e'
        ctx.fillRect(i * TILE_SIZE + 2, 4, TILE_SIZE - 4, 1)
      }

      // Zones (rendered as colored tiles)
      for (const z of scene.zones) {
        ctx.fillStyle = z.bg
        ctx.fillRect(z.x * TILE_SIZE, z.y * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE)
        // Emoji
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

      // Character
      const char = charRef.current
      const cx = char.walking
        ? (char.x + (char.targetX - char.x) * char.progress) * TILE_SIZE
        : char.x * TILE_SIZE
      const cy = char.walking
        ? (char.y + (char.targetY - char.y) * char.progress) * TILE_SIZE
        : char.y * TILE_SIZE

      // Body (pixel art-style)
      ctx.fillStyle = '#1e293b' // dark outline
      ctx.fillRect(cx + 3, cy - 14, 10, 18)
      // Shirt (cyan)
      ctx.fillStyle = '#06b6d4'
      ctx.fillRect(cx + 4, cy - 8, 8, 8)
      // Pants
      ctx.fillStyle = '#1e3a8a'
      ctx.fillRect(cx + 4, cy, 8, 4)
      // Head (skin tone)
      ctx.fillStyle = '#fde68a'
      ctx.fillRect(cx + 4, cy - 14, 8, 7)
      // Eyes
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(cx + 6, cy - 11, 1, 1)
      ctx.fillRect(cx + 9, cy - 11, 1, 1)

      // Walking bounce
      if (char.walking) {
        const bob = Math.sin(performance.now() / 100) > 0 ? 0 : -1
        ctx.fillRect(cx + 5, cy + bob, 6, 1)
      }

      // Activity emoji (above head when working)
      const cur = activities[currentIdx]
      if (!char.walking && cur) {
        // Speech bubble
        ctx.fillStyle = '#fff'
        ctx.fillRect(cx + 8, cy - 26, 14, 12)
        ctx.fillStyle = '#000'
        ctx.fillRect(cx + 8, cy - 26, 14, 1)
        ctx.fillRect(cx + 8, cy - 15, 14, 1)
        ctx.fillRect(cx + 8, cy - 26, 1, 12)
        ctx.fillRect(cx + 21, cy - 26, 1, 12)
        ctx.font = '10px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cur.emoji, cx + 15, cy - 20)
      }
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, speed, currentIdx, activities, scene])

  const current = activities[currentIdx]

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border-b border-zinc-800 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-300" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-zinc-100">Mô phỏng 1 ngày làm việc</h3>
          <p className="text-[10px] text-zinc-500 leading-tight">
            Pixel-art sim · cảm hứng từ pixel-agents · scene: {scene.name}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setPlaying(p => !p)}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            title={playing ? 'Tạm dừng' : 'Phát'}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold inline-flex items-center gap-1"
            title="Tốc độ"
          >
            <FastForward className="w-3 h-3" /> {speed}×
          </button>
          <button
            onClick={() => { setCurrentIdx(0); charRef.current = { x: 1, y: 10, targetX: 1, targetY: 10, progress: 1, activityFrame: 0, walking: false } }}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            title="Bắt đầu lại"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Current activity strip */}
      {current && (
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-2">
          <span className="text-xl">{current.emoji}</span>
          <div className="flex-1 min-w-0">
            {current.time && (
              <span className="text-[10px] font-mono text-cyan-400">{current.time}</span>
            )}
            <p className="text-xs text-zinc-200 leading-tight">{current.label}</p>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {currentIdx + 1}/{activities.length}
          </span>
        </div>
      )}

      {/* Canvas */}
      <div className="bg-black p-2 flex justify-center">
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

      {/* Timeline */}
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
          ⬛ {careerName} · scene: {scene.zones.length} zones · {activities.length} hoạt động · click timeline để jump
        </p>
      </div>
    </div>
  )
}
