/**
 * Pixel Odyssey — Hành Trình Ánh Sao Lạc
 * /dashboard/labtwin/labs/pixel-odyssey
 *
 * RPG pixel adventure 2D dựa trên kịch bản gốc của user về thế giới Aetheria:
 * những Ngôi Sao Ký Ức biến mất sau "Đêm Mất Sao", chỉ thiếu niên còn nhìn
 * được Ánh Sao. Kai (16t, dân làng Luneria) tìm thấy Mira sau khi thiên
 * thạch rơi. Hành trình thu thập Star Core, chiến đấu shadow creatures, đi
 * qua 4 chương: Luneria → Astra (thành phố bay) → Mirror Forest → Cánh
 * Cổng Thời Gian.
 *
 * MVP playable:
 *   - 2 maps: Luneria village + Crater (meteor crash site)
 *   - Kai di chuyển WASD/Arrows, tấn công Space (Kiếm Ánh Sáng)
 *   - 3 NPCs: Village Elder, Mira (bất tỉnh → tỉnh), Piko (robot)
 *   - 6 shadow enemies spawn sau khi Mira tỉnh
 *   - Dialogue system với chương 1-4 text từ kịch bản gốc
 *   - HUD: HP, MP, XP, Level, Star Cores
 *   - Hệ thống cảm xúc 4 trục: Hope/Fear/Curiosity/Determination (ảnh
 *     hưởng damage)
 *   - Save/load localStorage
 *
 * Toàn bộ render qua HTML5 Canvas 2D — không dùng asset ngoài, sprite vẽ
 * từ rect + emoji glyph để giữ pixel art aesthetic.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Heart, Zap, Star, Save, RotateCcw, Pause, Play,
  Book, Sparkles, Shield, Smile, Volume2, VolumeX,
} from 'lucide-react'
import { pixelOdysseyAudio as audio } from '@/lib/pixel-odyssey-audio'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type MapKey = 'luneria' | 'crater'
type Facing = 'up' | 'down' | 'left' | 'right'
type Emotion = 'hope' | 'fear' | 'curiosity' | 'determination'

interface Vec2 { x: number; y: number }

interface Player extends Vec2 {
  hp: number; maxHp: number
  mp: number; maxMp: number
  xp: number; level: number
  starCores: number
  facing: Facing
  attackTimer: number      // ms còn lại của swing animation
  invulnTimer: number      // ms invulnerable sau khi bị đánh
  emotion: Record<Emotion, number>   // 0-100
}

interface NPC {
  id: string
  name: string
  x: number; y: number     // tile coords
  color: string
  emoji: string
  /** Dialogue branches — index theo chapter */
  dialogue: string[][]
  /** Một số NPC chỉ xuất hiện sau chapter X */
  appearAfterChapter?: number
  /** Trigger chapter advance khi nói chuyện */
  advanceChapter?: number
  /** Tag riêng cho NPC unique (Mira awakens, Piko activates) */
  tag?: 'mira' | 'piko' | 'elder'
}

interface Enemy extends Vec2 {
  id: string
  hp: number; maxHp: number
  type: 'shadow' | 'wraith'
  speed: number
  damage: number
  cooldown: number    // attack cooldown ms
}

interface GameMap {
  key: MapKey
  name: string
  width: number      // tiles
  height: number     // tiles
  tiles: number[][]  // tile types
  npcs: NPC[]
  enemies: Enemy[]
  exits: Array<{ tx: number; ty: number; to: MapKey; spawnX: number; spawnY: number }>
  spawnX: number; spawnY: number   // default spawn nếu mới vào
}

interface GameState {
  chapter: number               // 1-4
  currentMap: MapKey
  flags: Record<string, boolean>
  storyLog: Array<{ chapter: number; line: string }>
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const TILE_SIZE = 36          // px mỗi tile khi render
const PLAYER_SPEED = 2.2      // px per frame
const ATTACK_RANGE = 48       // px
const ATTACK_DAMAGE = 25
const SAVE_KEY = 'inphysic_pixel_odyssey_v1'

// Tile types
const T_GRASS    = 0
const T_PATH     = 1
const T_TREE     = 2   // solid
const T_WATER    = 3   // solid
const T_STONE    = 4   // solid
const T_HOUSE    = 5   // solid (house wall)
const T_DOOR     = 6   // walkable + exit
const T_FLOWER   = 7   // walkable decoration
const T_CRATER   = 8   // walkable (burnt ground)
const T_METEOR   = 9   // solid (the rock)
const T_STAR     = 10  // collectible
const T_PORTAL   = 11  // exit portal

const SOLID_TILES = new Set([T_TREE, T_WATER, T_STONE, T_HOUSE, T_METEOR])

// ─────────────────────────────────────────────────────────────────
// Map definitions
// ─────────────────────────────────────────────────────────────────
function buildLuneria(): GameMap {
  // 24×16 tiles
  const W = 24, H = 16
  const tiles: number[][] = []
  for (let y = 0; y < H; y++) {
    const row: number[] = []
    for (let x = 0; x < W; x++) {
      // Border trees
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) row.push(T_TREE)
      // Houses
      else if (
        (x >= 3 && x <= 5 && y >= 3 && y <= 4) ||      // House 1
        (x >= 8 && x <= 10 && y >= 3 && y <= 4) ||     // House 2
        (x >= 13 && x <= 15 && y >= 3 && y <= 4) ||    // Village Elder house
        (x >= 4 && x <= 6 && y >= 10 && y <= 11)       // House bottom
      ) row.push(T_HOUSE)
      // Doors
      else if (
        (x === 4 && y === 5) || (x === 9 && y === 5) ||
        (x === 14 && y === 5) || (x === 5 && y === 12)
      ) row.push(T_DOOR)
      // Path
      else if ((x === 12 || x === 13) && y >= 5 && y <= 14) row.push(T_PATH)
      else if (y === 8 && x >= 2 && x <= 22) row.push(T_PATH)
      // Water pond
      else if (x >= 17 && x <= 19 && y >= 10 && y <= 12) row.push(T_WATER)
      // Flowers
      else if ((x === 7 && y === 7) || (x === 19 && y === 6) || (x === 3 && y === 13)) row.push(T_FLOWER)
      // Trees scattered
      else if ((x === 2 && y === 6) || (x === 21 && y === 13) || (x === 16 && y === 6) ||
               (x === 11 && y === 12) || (x === 20 && y === 4)) row.push(T_TREE)
      // Portal to crater (right side)
      else if (x === 22 && y === 8) row.push(T_PORTAL)
      else row.push(T_GRASS)
    }
    tiles.push(row)
  }

  return {
    key: 'luneria',
    name: 'Luneria — Ngôi làng yên bình',
    width: W, height: H,
    tiles,
    npcs: [
      {
        id: 'elder', name: 'Trưởng làng',
        x: 14, y: 6, color: '#fbbf24', emoji: '🧓',
        tag: 'elder',
        dialogue: [
          [
            'Trưởng làng: "Kai, con lại mơ mộng nữa rồi! Trời sắp tối rồi đấy."',
            'Trưởng làng: "Nghe nói trong làng bên có thiên thạch rơi xuống — đừng đi xa nhé."',
            'Trưởng làng: "Cổng phía Đông dẫn đến khu rừng cháy. Cẩn thận con à."',
          ],
          [
            'Trưởng làng: "Cô bé đó... ta cảm thấy có gì rất quen thuộc."',
            'Trưởng làng: "Star Core trong tay con đang phản ứng. Hãy giữ chặt cảm xúc của mình."',
            'Trưởng làng: "Khi nào sẵn sàng, hãy đến thành phố bay Astra để tìm hiểu thêm."',
          ],
          [
            'Trưởng làng: "Con đã đi qua Khu Rừng Gương rồi sao? Ta nghe nói nó phản chiếu nỗi sợ..."',
          ],
          [
            'Trưởng làng: "Cánh cổng thời gian... đó là truyền thuyết từ trước Đêm Mất Sao."',
          ],
        ],
      },
      {
        id: 'mira', name: 'Mira',
        x: 12, y: 14, color: '#f0abfc', emoji: '👧',
        tag: 'mira',
        appearAfterChapter: 1,
        advanceChapter: 2,
        dialogue: [
          [],   // Chapter 1: Mira ở crater, chưa xuất hiện ở Luneria
          [
            'Mira: "Cậu đã cứu mình. Mình không nhớ rõ mình là ai..."',
            'Mira: "Star Core của cậu sáng lên khi mình ở gần. Có liên kết nào đó."',
            'Mira: "Mình cảm nhận được — chúng ta cần đến Astra. Thành phố bay phía Tây."',
            '✨ Chapter 2: Thành Phố Không Trọng Lực — sẵn sàng khởi hành',
          ],
          [
            'Mira: "Khu Rừng Gương... mình thấy bóng dáng của một nền văn minh cổ."',
            'Mira: "Có lẽ mình đã từng thuộc về thế giới đó trước Đêm Mất Sao."',
          ],
          [
            'Mira: "Cánh cổng thời gian... mình có thể nhớ tất cả nếu bước qua."',
            'Mira: "Nhưng mình sợ. Sợ mình không còn là Mira nữa."',
          ],
        ],
      },
      {
        id: 'piko', name: 'Piko',
        x: 10, y: 12, color: '#22d3ee', emoji: '🤖',
        tag: 'piko',
        appearAfterChapter: 2,
        dialogue: [
          [], [],
          [
            'Piko: "Bíp bíp! Tôi là Piko, robot mini cổ đại từ tàn tích Luneria."',
            'Piko: "Tôi có thể phân tích quái vật và giải đố cổ đại. Hãy mang tôi theo!"',
            'Piko: "Đã unlock công nghệ thất truyền — bạn có thể đẩy mạnh attack khi MP đầy."',
          ],
          [
            'Piko: "Cảnh báo: cánh cổng thời gian có thể thay đổi hiện tại theo cách không lường được."',
            'Piko: "Nhưng tôi sẽ luôn ở bên bạn, Kai-san."',
          ],
        ],
      },
    ],
    enemies: [],   // Luneria yên bình, không enemies (trừ khi shadow tràn xuống)
    exits: [
      { tx: 22, ty: 8, to: 'crater', spawnX: 1 * TILE_SIZE + TILE_SIZE / 2, spawnY: 7 * TILE_SIZE + TILE_SIZE / 2 },
    ],
    spawnX: 12 * TILE_SIZE + TILE_SIZE / 2,
    spawnY: 9 * TILE_SIZE + TILE_SIZE / 2,
  }
}

function buildCrater(): GameMap {
  // 18×14 tiles, meteor in center
  const W = 18, H = 14
  const tiles: number[][] = []
  for (let y = 0; y < H; y++) {
    const row: number[] = []
    for (let x = 0; x < W; x++) {
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) row.push(T_TREE)
      // Crater (burnt ground in middle)
      else if (Math.sqrt(Math.pow(x - W / 2, 2) + Math.pow(y - H / 2, 2)) < 5) row.push(T_CRATER)
      // Meteor at center
      else if (Math.abs(x - W / 2) <= 0.5 && Math.abs(y - H / 2) <= 0.5) row.push(T_METEOR)
      // Stars scattered (collectibles)
      else if ((x === 4 && y === 5) || (x === 13 && y === 5) ||
               (x === 4 && y === 9) || (x === 13 && y === 9)) row.push(T_STAR)
      else if ((x === 1 && y === 7)) row.push(T_PORTAL)   // exit back to Luneria
      // Trees
      else if ((x === 2 && y === 2) || (x === 16 && y === 2) ||
               (x === 2 && y === 11) || (x === 16 && y === 11)) row.push(T_TREE)
      // Stones
      else if ((x === 6 && y === 4) || (x === 11 && y === 4) ||
               (x === 6 && y === 10) || (x === 11 && y === 10)) row.push(T_STONE)
      else row.push(T_GRASS)
    }
    tiles.push(row)
  }
  // Place meteor exactly
  tiles[Math.floor(H / 2)][Math.floor(W / 2)] = T_METEOR

  return {
    key: 'crater',
    name: 'Hố thiên thạch — Đêm Mất Sao',
    width: W, height: H,
    tiles,
    npcs: [
      {
        id: 'mira-unconscious', name: 'Cô gái bất tỉnh',
        x: Math.floor(W / 2), y: Math.floor(H / 2) + 1,
        color: '#f0abfc', emoji: '✨',
        tag: 'mira',
        advanceChapter: 2,
        dialogue: [
          [
            'Kai: "Có người trong miệng hố!? Cô ấy không sao chứ..."',
            'Cô gái mở mắt: "...ai đó? Mình là... Mira."',
            'Mira: "Bầu trời... đang rạn nứt. Star Core — cậu cảm nhận được không?"',
            'Một mảnh tinh thể phát sáng trượt vào tay Kai.',
            '⭐ Đã nhận: Star Core (mảnh đầu tiên)',
            '⚠️ Cảnh báo: Sinh vật bóng tối đang tràn xuống từ vết nứt!',
          ],
          [
            'Mira: "Trở về làng đi Kai. Trưởng làng sẽ chỉ đường đến Astra."',
          ],
          [], [],
        ],
      },
    ],
    enemies: [],   // Shadow enemies spawn dynamic sau chapter 1 trigger
    exits: [
      { tx: 1, ty: 7, to: 'luneria', spawnX: 21 * TILE_SIZE + TILE_SIZE / 2, spawnY: 8 * TILE_SIZE + TILE_SIZE / 2 },
    ],
    spawnX: 2 * TILE_SIZE + TILE_SIZE / 2,
    spawnY: 7 * TILE_SIZE + TILE_SIZE / 2,
  }
}

// ─────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────
const INITIAL_PLAYER: Player = {
  x: 12 * TILE_SIZE + TILE_SIZE / 2,
  y: 9 * TILE_SIZE + TILE_SIZE / 2,
  hp: 100, maxHp: 100,
  mp: 50, maxMp: 50,
  xp: 0, level: 1,
  starCores: 0,
  facing: 'down',
  attackTimer: 0,
  invulnTimer: 0,
  emotion: { hope: 50, fear: 20, curiosity: 60, determination: 30 },
}

const INITIAL_STATE: GameState = {
  chapter: 1,
  currentMap: 'luneria',
  flags: {},
  storyLog: [
    { chapter: 1, line: '"Trưởng thành không phải là đánh mất ước mơ, mà là đủ dũng cảm để tiếp tục theo đuổi chúng." — Pixel Odyssey' },
    { chapter: 1, line: 'Chương 1: Đêm nay trời lạ thường — Kai cảm thấy có điều gì sắp xảy ra...' },
  ],
}

const CHAPTER_TITLES: Record<number, string> = {
  1: 'Chương 1 — Ngôi Sao Rơi Xuống Làng',
  2: 'Chương 2 — Thành Phố Không Trọng Lực (Astra)',
  3: 'Chương 3 — Khu Rừng Gương',
  4: 'Chương 4 — Cánh Cổng Thời Gian',
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export default function PixelOdyssey() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const playerRef = useRef<Player>({ ...INITIAL_PLAYER, emotion: { ...INITIAL_PLAYER.emotion } })
  const stateRef = useRef<GameState>({ ...INITIAL_STATE, flags: {}, storyLog: [...INITIAL_STATE.storyLog] })
  const mapsRef = useRef<Record<MapKey, GameMap>>({
    luneria: buildLuneria(),
    crater: buildCrater(),
  })
  const enemiesRef = useRef<Map<MapKey, Enemy[]>>(new Map([
    ['luneria', []], ['crater', []],
  ]))
  const damageNumbersRef = useRef<Array<{ x: number; y: number; value: number; life: number; color: string }>>([])

  // React state — chỉ cho UI overlay
  const [paused, setPaused] = useState(false)
  const [dialogue, setDialogue] = useState<{ npcName: string; lines: string[]; idx: number } | null>(null)
  const [hud, setHud] = useState({ hp: 100, mp: 50, xp: 0, level: 1, starCores: 0,
    chapter: 1, mapName: 'Luneria',
    emotion: { ...INITIAL_PLAYER.emotion } })
  const [storyOpen, setStoryOpen] = useState(false)
  const [storyLog, setStoryLog] = useState(stateRef.current.storyLog)
  const [showHelp, setShowHelp] = useState(true)
  const [gameOver, setGameOver] = useState(false)
  const [muted, setMuted] = useState(() => audio.isMuted())
  // Ref tránh fire setGameOver lặp lại + tránh dialogue re-trigger ngay sau khi đóng
  const gameOverFiredRef = useRef(false)
  const dialogueCooldownRef = useRef(0)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load saved game ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved?.player && saved?.state) {
          playerRef.current = { ...saved.player, emotion: { ...saved.player.emotion } }
          stateRef.current = { ...saved.state, flags: { ...saved.state.flags }, storyLog: [...saved.state.storyLog] }
          setStoryLog(stateRef.current.storyLog)
          setHud(h => ({
            ...h,
            hp: saved.player.hp, mp: saved.player.mp, xp: saved.player.xp,
            level: saved.player.level, starCores: saved.player.starCores,
            chapter: saved.state.chapter,
            mapName: mapsRef.current[saved.state.currentMap as MapKey].name,
            emotion: { ...saved.player.emotion },
          }))
        }
      }
    } catch { /* ignore */ }
  }, [])

  // ── Keyboard ──
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      keysRef.current.add(k)
      if (k === 'escape') {
        setDialogue(null)
        setStoryOpen(false)
        setShowHelp(false)
      }
      if (k === ' ' || k === 'enter') {
        e.preventDefault()
        // Nếu đang dialogue → next line
        setDialogue(d => {
          if (!d) return d
          if (d.idx < d.lines.length - 1) return { ...d, idx: d.idx + 1 }
          return null
        })
      }
      if (k === 'p') setPaused(p => !p)
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // ── Helpers ──
  const isWalkable = useCallback((map: GameMap, px: number, py: number): boolean => {
    const tx = Math.floor(px / TILE_SIZE)
    const ty = Math.floor(py / TILE_SIZE)
    if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) return false
    const tile = map.tiles[ty][tx]
    return !SOLID_TILES.has(tile)
  }, [])

  const advanceChapter = useCallback((to: number) => {
    const s = stateRef.current
    if (to > s.chapter) {
      s.chapter = to
      s.storyLog.push({ chapter: to, line: CHAPTER_TITLES[to] || `Chương ${to}` })
      setStoryLog([...s.storyLog])
      setHud(h => ({ ...h, chapter: to }))
      audio.sfxChapter()

      // Chapter 2 trigger: spawn shadow enemies in Luneria
      if (to === 2 && enemiesRef.current.get('luneria')!.length === 0) {
        const shadows: Enemy[] = []
        for (let i = 0; i < 6; i++) {
          shadows.push({
            id: `shadow-${i}-${Date.now()}`,
            x: (3 + Math.random() * 18) * TILE_SIZE,
            y: (2 + Math.random() * 12) * TILE_SIZE,
            hp: 50, maxHp: 50,
            type: 'shadow', speed: 0.9, damage: 8, cooldown: 0,
          })
        }
        enemiesRef.current.set('luneria', shadows)
        s.storyLog.push({ chapter: 2, line: '⚠️ Vết nứt bầu trời mở rộng — shadow creatures tràn xuống Luneria!' })
      }
    }
  }, [])

  const startDialogue = useCallback((npc: NPC) => {
    const chapter = stateRef.current.chapter
    const branch = npc.dialogue[chapter - 1] || npc.dialogue[npc.dialogue.length - 1]
    if (!branch || branch.length === 0) return
    setDialogue({ npcName: npc.name, lines: branch, idx: 0 })
    // Cập nhật cảm xúc khi nói chuyện với NPC
    playerRef.current.emotion.curiosity = Math.min(100, playerRef.current.emotion.curiosity + 3)
    playerRef.current.emotion.hope      = Math.min(100, playerRef.current.emotion.hope + 2)
    setHud(h => ({ ...h, emotion: { ...playerRef.current.emotion } }))
    // Log story
    branch.forEach(l => {
      if (l.startsWith('⭐') || l.startsWith('✨') || l.startsWith('⚠️')) {
        stateRef.current.storyLog.push({ chapter, line: l })
      }
    })
    // Advance chapter sau khi xong dialogue (delay 1 tick)
    if (npc.advanceChapter && npc.advanceChapter > chapter) {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = setTimeout(() => {
        advanceChapter(npc.advanceChapter!)
        advanceTimerRef.current = null
      }, 200)
    }
    // Mira awakened flag
    if (npc.tag === 'mira' && stateRef.current.currentMap === 'crater') {
      stateRef.current.flags.miraAwakened = true
      playerRef.current.starCores = Math.max(playerRef.current.starCores, 1)
      setHud(h => ({ ...h, starCores: Math.max(h.starCores, 1) }))
    }
  }, [advanceChapter])

  // ── Save / Load / Reset ──
  const saveGame = useCallback(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        player: playerRef.current,
        state: stateRef.current,
      }))
    } catch {/*ignore*/}
  }, [])

  const resetGame = useCallback(() => {
    if (!confirm('Xoá save và bắt đầu lại từ đầu?')) return
    playerRef.current = { ...INITIAL_PLAYER, emotion: { ...INITIAL_PLAYER.emotion } }
    stateRef.current = { ...INITIAL_STATE, flags: {}, storyLog: [...INITIAL_STATE.storyLog] }
    enemiesRef.current.set('luneria', [])
    enemiesRef.current.set('crater', [])
    setStoryLog(stateRef.current.storyLog)
    setHud({
      hp: 100, mp: 50, xp: 0, level: 1, starCores: 0,
      chapter: 1, mapName: mapsRef.current.luneria.name,
      emotion: { ...INITIAL_PLAYER.emotion },
    })
    setGameOver(false)
    localStorage.removeItem(SAVE_KEY)
  }, [])

  // Auto-save mỗi 10s
  useEffect(() => {
    const t = setInterval(saveGame, 10000)
    return () => clearInterval(t)
  }, [saveGame])

  // ── Audio: init lần đầu + cleanup khi unmount ──
  useEffect(() => {
    audio.init()
    return () => {
      audio.stopBgm()
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  // ── Auto-switch BGM theo map + chapter ──
  useEffect(() => {
    if (gameOver) { audio.stopBgm(); return }
    if (paused || showHelp) { audio.stopBgm(); return }
    const map = stateRef.current.currentMap
    const chapter = stateRef.current.chapter
    // Chapter ≥2 + có shadow trên map → battle music
    const shadows = enemiesRef.current.get(map) || []
    if (chapter >= 2 && shadows.length > 0) {
      audio.playBgm('battle')
    } else if (map === 'crater') {
      audio.playBgm('crater')
    } else {
      audio.playBgm('luneria')
    }
  }, [paused, gameOver, showHelp, hud.chapter, hud.mapName])

  const toggleMute = useCallback(() => {
    const next = audio.toggleMute()
    setMuted(next)
  }, [])

  // ── Set cooldown 400ms khi dialogue đóng — tránh E key re-trigger ngay ──
  useEffect(() => {
    if (dialogue === null) dialogueCooldownRef.current = 400
  }, [dialogue])

  // ── Game loop ──
  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const ctxObj = canvasEl.getContext('2d')
    if (!ctxObj) return
    // Non-null aliases — preserve narrowing inside nested functions
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = ctxObj
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now

      if (!paused && !dialogue && !storyOpen && !gameOver) {
        update(dt)
      }
      draw()
      raf = requestAnimationFrame(tick)
    }

    function update(dt: number) {
      const p = playerRef.current
      const s = stateRef.current
      const map = mapsRef.current[s.currentMap]
      const keys = keysRef.current

      // Input
      let dx = 0, dy = 0
      if (keys.has('w') || keys.has('arrowup'))    { dy -= 1; p.facing = 'up' }
      if (keys.has('s') || keys.has('arrowdown'))  { dy += 1; p.facing = 'down' }
      if (keys.has('a') || keys.has('arrowleft'))  { dx -= 1; p.facing = 'left' }
      if (keys.has('d') || keys.has('arrowright')) { dx += 1; p.facing = 'right' }

      // Normalize diagonal
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707 }

      const moveX = dx * PLAYER_SPEED * (dt / 16.6)
      const moveY = dy * PLAYER_SPEED * (dt / 16.6)

      // Collide axis-by-axis
      if (isWalkable(map, p.x + moveX, p.y - 8) && isWalkable(map, p.x + moveX, p.y + 8)) p.x += moveX
      if (isWalkable(map, p.x - 8, p.y + moveY) && isWalkable(map, p.x + 8, p.y + moveY)) p.y += moveY

      // Clamp
      p.x = Math.max(8, Math.min(map.width * TILE_SIZE - 8, p.x))
      p.y = Math.max(8, Math.min(map.height * TILE_SIZE - 8, p.y))

      // Attack
      if (keys.has(' ') || keys.has('j')) {
        if (p.attackTimer <= 0) {
          p.attackTimer = 250
          audio.sfxAttack()
          // Hit detection
          const enemies = enemiesRef.current.get(s.currentMap) || []
          let attackX = p.x, attackY = p.y
          if (p.facing === 'up') attackY -= ATTACK_RANGE
          if (p.facing === 'down') attackY += ATTACK_RANGE
          if (p.facing === 'left') attackX -= ATTACK_RANGE
          if (p.facing === 'right') attackX += ATTACK_RANGE
          let didHit = false
          enemies.forEach(e => {
            const d = Math.hypot(e.x - attackX, e.y - attackY)
            if (d < ATTACK_RANGE) {
              // Damage boost based on Determination emotion
              const boost = 1 + p.emotion.determination / 200
              const dmg = Math.floor(ATTACK_DAMAGE * boost)
              e.hp -= dmg
              damageNumbersRef.current.push({ x: e.x, y: e.y - 16, value: dmg, life: 800, color: '#fbbf24' })
              p.emotion.determination = Math.min(100, p.emotion.determination + 1)
              didHit = true
            }
          })
          if (didHit) audio.sfxHit()
        }
      }

      // Decrement timers
      if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt)
      if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt)
      if (dialogueCooldownRef.current > 0) dialogueCooldownRef.current = Math.max(0, dialogueCooldownRef.current - dt)

      // NPC interaction (block khi cooldown sau khi đóng dialogue tránh re-trigger ngay)
      if (keys.has('e') && dialogueCooldownRef.current <= 0) {
        const visibleNpcs = map.npcs.filter(n => !n.appearAfterChapter || s.chapter >= n.appearAfterChapter)
        for (const npc of visibleNpcs) {
          const dx2 = npc.x * TILE_SIZE + TILE_SIZE / 2 - p.x
          const dy2 = npc.y * TILE_SIZE + TILE_SIZE / 2 - p.y
          if (Math.hypot(dx2, dy2) < TILE_SIZE * 1.2) {
            keys.delete('e')
            startDialogue(npc)
            audio.sfxDialogue()
            break
          }
        }
      }

      // Pickup stars
      const tx = Math.floor(p.x / TILE_SIZE)
      const ty = Math.floor(p.y / TILE_SIZE)
      if (map.tiles[ty]?.[tx] === T_STAR) {
        map.tiles[ty][tx] = T_GRASS
        p.starCores += 1
        p.emotion.hope = Math.min(100, p.emotion.hope + 5)
        damageNumbersRef.current.push({ x: p.x, y: p.y - 16, value: 1, life: 1000, color: '#fde047' })
        audio.sfxPickup()
        setHud(h => ({ ...h, starCores: p.starCores, emotion: { ...p.emotion } }))
      }

      // Check exits
      for (const ex of map.exits) {
        if (tx === ex.tx && ty === ex.ty) {
          s.currentMap = ex.to
          p.x = ex.spawnX
          p.y = ex.spawnY
          setHud(h => ({ ...h, mapName: mapsRef.current[ex.to].name }))
          return
        }
      }

      // Enemy AI
      const enemies = enemiesRef.current.get(s.currentMap) || []
      enemies.forEach(e => {
        const dxp = p.x - e.x
        const dyp = p.y - e.y
        const dist = Math.hypot(dxp, dyp)
        if (dist > 8 && dist < 400) {
          const nx = e.x + (dxp / dist) * e.speed * (dt / 16.6)
          const ny = e.y + (dyp / dist) * e.speed * (dt / 16.6)
          if (isWalkable(map, nx, ny)) { e.x = nx; e.y = ny }
        }
        // Attack player (skip nếu đã game over để không trừ HP âm)
        if (dist < 32 && e.cooldown <= 0 && p.invulnTimer <= 0 && p.hp > 0) {
          p.hp = Math.max(0, p.hp - e.damage)
          p.invulnTimer = 600
          p.emotion.fear = Math.min(100, p.emotion.fear + 2)
          e.cooldown = 1000
          damageNumbersRef.current.push({ x: p.x, y: p.y - 16, value: e.damage, life: 800, color: '#f87171' })
          audio.sfxDamage()
          // Force sync HUD ngay khi mất HP (không chờ random tick)
          setHud(h => ({ ...h, hp: p.hp, emotion: { ...p.emotion } }))
          if (p.hp <= 0 && !gameOverFiredRef.current) {
            gameOverFiredRef.current = true
            setGameOver(true)
            audio.stopBgm()
          }
        }
        if (e.cooldown > 0) e.cooldown -= dt
      })

      // Remove dead enemies + grant XP + drop star core
      const remaining: Enemy[] = []
      for (const e of enemies) {
        if (e.hp <= 0) {
          p.xp += 25
          damageNumbersRef.current.push({ x: e.x, y: e.y, value: 25, life: 1200, color: '#a78bfa' })
          // 30% chance drop star
          if (Math.random() < 0.3) {
            p.starCores += 1
            damageNumbersRef.current.push({ x: e.x, y: e.y - 24, value: 1, life: 1500, color: '#fde047' })
          }
          // Level up
          while (p.xp >= p.level * 100) {
            p.xp -= p.level * 100
            p.level += 1
            p.maxHp += 20
            p.hp = p.maxHp
            p.maxMp += 10
            p.mp = p.maxMp
            damageNumbersRef.current.push({ x: p.x, y: p.y - 32, value: p.level, life: 2000, color: '#22d3ee' })
            audio.sfxLevelUp()
            // Force HUD sync ngay khi level up (đổi nhiều giá trị)
            setHud(h => ({ ...h, hp: p.hp, mp: p.mp, level: p.level, xp: p.xp }))
          }
        } else {
          remaining.push(e)
        }
      }
      enemiesRef.current.set(s.currentMap, remaining)

      // Sync HUD periodically (avoid setState every frame)
      if (Math.random() < 0.1) {
        setHud(h => ({
          ...h,
          hp: p.hp, mp: p.mp, xp: p.xp, level: p.level, starCores: p.starCores,
          emotion: { ...p.emotion },
        }))
      }

      // Update damage numbers
      damageNumbersRef.current = damageNumbersRef.current.filter(d => {
        d.life -= dt
        d.y -= 0.5
        return d.life > 0
      })
    }

    function draw() {
      const p = playerRef.current
      const s = stateRef.current
      const map = mapsRef.current[s.currentMap]
      const W = canvas.width
      const H = canvas.height

      // Background gradient (day/night based on chapter)
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      if (s.chapter >= 2) {
        grad.addColorStop(0, '#1e1b4b')
        grad.addColorStop(1, '#0f172a')
      } else {
        grad.addColorStop(0, '#1e3a5f')
        grad.addColorStop(1, '#0c1929')
      }
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Camera centered on player
      const camX = Math.floor(p.x - W / 2)
      const camY = Math.floor(p.y - H / 2)

      // Draw tiles
      const startTx = Math.max(0, Math.floor(camX / TILE_SIZE) - 1)
      const endTx = Math.min(map.width, Math.ceil((camX + W) / TILE_SIZE) + 1)
      const startTy = Math.max(0, Math.floor(camY / TILE_SIZE) - 1)
      const endTy = Math.min(map.height, Math.ceil((camY + H) / TILE_SIZE) + 1)

      for (let ty = startTy; ty < endTy; ty++) {
        for (let tx = startTx; tx < endTx; tx++) {
          const tile = map.tiles[ty][tx]
          const sx = tx * TILE_SIZE - camX
          const sy = ty * TILE_SIZE - camY
          drawTile(ctx, tile, sx, sy)
        }
      }

      // Draw NPCs
      const visibleNpcs = map.npcs.filter(n => !n.appearAfterChapter || s.chapter >= n.appearAfterChapter)
      visibleNpcs.forEach(npc => {
        const sx = npc.x * TILE_SIZE - camX + TILE_SIZE / 2
        const sy = npc.y * TILE_SIZE - camY + TILE_SIZE / 2
        drawNpc(ctx, npc, sx, sy)
      })

      // Draw enemies
      const enemies = enemiesRef.current.get(s.currentMap) || []
      enemies.forEach(e => {
        const sx = e.x - camX
        const sy = e.y - camY
        drawEnemy(ctx, e, sx, sy)
      })

      // Draw player
      const psx = p.x - camX
      const psy = p.y - camY
      drawPlayer(ctx, p, psx, psy)

      // Attack swing
      if (p.attackTimer > 0) {
        const alpha = p.attackTimer / 250
        ctx.fillStyle = `rgba(253, 224, 71, ${alpha * 0.6})`
        ctx.strokeStyle = `rgba(253, 224, 71, ${alpha})`
        ctx.lineWidth = 3
        let ax = psx, ay = psy
        if (p.facing === 'up')    ay -= ATTACK_RANGE / 2
        if (p.facing === 'down')  ay += ATTACK_RANGE / 2
        if (p.facing === 'left')  ax -= ATTACK_RANGE / 2
        if (p.facing === 'right') ax += ATTACK_RANGE / 2
        ctx.beginPath()
        ctx.arc(ax, ay, ATTACK_RANGE * 0.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // Damage numbers
      damageNumbersRef.current.forEach(d => {
        const alpha = d.life / 1500
        ctx.fillStyle = d.color
        ctx.globalAlpha = Math.min(1, alpha)
        ctx.font = 'bold 14px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(String(d.value), d.x - camX, d.y - camY)
        ctx.globalAlpha = 1
      })

      // Hint NPC nearby
      for (const npc of visibleNpcs) {
        const dx2 = npc.x * TILE_SIZE + TILE_SIZE / 2 - p.x
        const dy2 = npc.y * TILE_SIZE + TILE_SIZE / 2 - p.y
        if (Math.hypot(dx2, dy2) < TILE_SIZE * 1.2) {
          ctx.fillStyle = '#fbbf24'
          ctx.font = 'bold 12px sans-serif'
          ctx.textAlign = 'center'
          const tx = npc.x * TILE_SIZE - camX + TILE_SIZE / 2
          const ty = npc.y * TILE_SIZE - camY - 6
          ctx.fillText('[E] Nói chuyện', tx, ty)
          break
        }
      }
    }

    function drawTile(ctx: CanvasRenderingContext2D, tile: number, x: number, y: number) {
      switch (tile) {
        case T_GRASS:
          ctx.fillStyle = '#1e4d3a'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          // Grass texture
          ctx.fillStyle = '#2d6b4f'
          for (let i = 0; i < 3; i++) {
            const gx = x + (i * 11 + (Math.floor(x + y) % 7)) % TILE_SIZE
            const gy = y + (i * 13 + (Math.floor(y + x) % 5)) % TILE_SIZE
            ctx.fillRect(gx, gy, 2, 2)
          }
          break
        case T_PATH:
          ctx.fillStyle = '#8b6f3c'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.fillStyle = '#a08550'
          for (let i = 0; i < 4; i++) {
            const px = x + (i * 9 + Math.floor(x) % 5) % TILE_SIZE
            const py = y + (i * 11 + Math.floor(y) % 7) % TILE_SIZE
            ctx.fillRect(px, py, 2, 2)
          }
          break
        case T_TREE:
          ctx.fillStyle = '#1e4d3a'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          // Trunk
          ctx.fillStyle = '#5b3d20'
          ctx.fillRect(x + TILE_SIZE / 2 - 3, y + TILE_SIZE - 12, 6, 12)
          // Leaves
          ctx.fillStyle = '#15803d'
          ctx.beginPath()
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 2, 14, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#22c55e'
          ctx.beginPath()
          ctx.arc(x + TILE_SIZE / 2 - 3, y + TILE_SIZE / 2 - 5, 8, 0, Math.PI * 2)
          ctx.fill()
          break
        case T_WATER:
          ctx.fillStyle = '#1e40af'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.fillStyle = '#3b82f6'
          ctx.fillRect(x + 4, y + 6, TILE_SIZE - 8, 2)
          ctx.fillRect(x + 6, y + 14, TILE_SIZE - 12, 2)
          ctx.fillRect(x + 4, y + 22, TILE_SIZE - 8, 2)
          break
        case T_STONE:
          ctx.fillStyle = '#475569'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.fillStyle = '#64748b'
          ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8)
          ctx.fillStyle = '#94a3b8'
          ctx.fillRect(x + 8, y + 8, 6, 6)
          break
        case T_HOUSE:
          ctx.fillStyle = '#92400e'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.fillStyle = '#b45309'
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
          ctx.fillStyle = '#451a03'
          ctx.fillRect(x + 6, y + 8, 6, 6)   // window
          ctx.fillRect(x + TILE_SIZE - 14, y + 8, 6, 6)
          break
        case T_DOOR:
          ctx.fillStyle = '#1e4d3a'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.fillStyle = '#451a03'
          ctx.fillRect(x + 8, y + 6, TILE_SIZE - 16, TILE_SIZE - 8)
          ctx.fillStyle = '#fbbf24'
          ctx.fillRect(x + TILE_SIZE - 12, y + TILE_SIZE / 2, 2, 2)   // handle
          break
        case T_FLOWER:
          ctx.fillStyle = '#1e4d3a'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.fillStyle = '#f0abfc'
          ctx.fillRect(x + 14, y + 14, 8, 8)
          ctx.fillStyle = '#fde047'
          ctx.fillRect(x + 16, y + 16, 4, 4)
          break
        case T_CRATER:
          ctx.fillStyle = '#451a03'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.fillStyle = '#78350f'
          for (let i = 0; i < 5; i++) {
            const px = x + (i * 7 + Math.floor(x) % 11) % TILE_SIZE
            const py = y + (i * 5 + Math.floor(y) % 9) % TILE_SIZE
            ctx.fillRect(px, py, 3, 3)
          }
          break
        case T_METEOR:
          ctx.fillStyle = '#451a03'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.fillStyle = '#a78bfa'
          ctx.beginPath()
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 - 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#c4b5fd'
          ctx.beginPath()
          ctx.arc(x + TILE_SIZE / 2 - 4, y + TILE_SIZE / 2 - 4, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.fillRect(x + TILE_SIZE / 2 - 2, y + TILE_SIZE / 2 - 2, 2, 2)
          break
        case T_STAR:
          ctx.fillStyle = '#1e4d3a'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          // Star pulse
          const pulse = (Math.sin(performance.now() / 300) + 1) / 2
          ctx.fillStyle = `rgba(253, 224, 71, ${0.7 + pulse * 0.3})`
          ctx.beginPath()
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 8 + pulse * 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 3, 0, Math.PI * 2)
          ctx.fill()
          break
        case T_PORTAL:
          ctx.fillStyle = '#1e4d3a'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          const portalPulse = (Math.sin(performance.now() / 200) + 1) / 2
          ctx.strokeStyle = `rgba(167, 139, 250, ${0.5 + portalPulse * 0.5})`
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 - 4, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = `rgba(124, 58, 237, ${0.4 + portalPulse * 0.3})`
          ctx.beginPath()
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 - 10, 0, Math.PI * 2)
          ctx.fill()
          break
      }
    }

    function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, x: number, y: number) {
      const invuln = p.invulnTimer > 0 && Math.floor(p.invulnTimer / 80) % 2 === 0
      if (invuln) ctx.globalAlpha = 0.4

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.ellipse(x, y + 14, 12, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Body (Kai - blue tunic)
      ctx.fillStyle = '#2563eb'
      ctx.fillRect(x - 8, y - 4, 16, 14)
      ctx.fillStyle = '#1d4ed8'
      ctx.fillRect(x - 8, y + 6, 16, 4)

      // Head
      ctx.fillStyle = '#fde68a'
      ctx.fillRect(x - 6, y - 16, 12, 12)
      // Hair (brown)
      ctx.fillStyle = '#78350f'
      ctx.fillRect(x - 6, y - 16, 12, 4)
      ctx.fillRect(x - 7, y - 14, 2, 4)
      ctx.fillRect(x + 5, y - 14, 2, 4)

      // Eyes
      ctx.fillStyle = '#000'
      if (p.facing === 'left') {
        ctx.fillRect(x - 4, y - 10, 2, 2)
      } else if (p.facing === 'right') {
        ctx.fillRect(x + 2, y - 10, 2, 2)
      } else {
        ctx.fillRect(x - 4, y - 10, 2, 2)
        ctx.fillRect(x + 2, y - 10, 2, 2)
      }

      // Sword (shown when attacking)
      if (p.attackTimer > 0) {
        ctx.fillStyle = '#fde047'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        let sx = x, sy = y - 2
        if (p.facing === 'right') { sx += 10; sy -= 4 }
        if (p.facing === 'left')  { sx -= 18; sy -= 4 }
        if (p.facing === 'up')    { sy -= 16; sx -= 2 }
        if (p.facing === 'down')  { sy += 8; sx -= 2 }
        ctx.fillRect(sx, sy, 8, 2)
        ctx.fillRect(sx, sy - 1, 8, 1)
      }

      ctx.globalAlpha = 1
    }

    function drawNpc(ctx: CanvasRenderingContext2D, npc: NPC, x: number, y: number) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(x, y + 14, 12, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Body
      ctx.fillStyle = npc.color
      ctx.fillRect(x - 8, y - 4, 16, 14)

      // Head
      ctx.fillStyle = '#fde68a'
      ctx.fillRect(x - 6, y - 16, 12, 12)

      // Emoji label above
      ctx.font = '20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(npc.emoji, x, y - 22)

      // Glow if Mira (Star)
      if (npc.tag === 'mira') {
        const pulse = (Math.sin(performance.now() / 400) + 1) / 2
        ctx.strokeStyle = `rgba(240, 171, 252, ${0.4 + pulse * 0.4})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y - 4, 18 + pulse * 3, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath()
      ctx.ellipse(x, y + 12, 10, 3, 0, 0, Math.PI * 2)
      ctx.fill()

      // Body — shadow blob with glow
      const pulse = (Math.sin(performance.now() / 200) + 1) / 2
      ctx.fillStyle = `rgba(124, 58, 237, ${0.7 + pulse * 0.3})`
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgba(239, 68, 68, ${0.6 + pulse * 0.4})`
      ctx.beginPath()
      ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + 3, y - 2, 2, 0, Math.PI * 2)
      ctx.fill()

      // HP bar
      const hpPct = e.hp / e.maxHp
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(x - 12, y - 22, 24, 4)
      ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#fbbf24' : '#ef4444'
      ctx.fillRect(x - 12, y - 22, 24 * hpPct, 4)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, dialogue, storyOpen, gameOver, isWalkable, startDialogue])

  // ── Render ──
  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-[#0a0612] dark:text-white">
      {/* Top bar */}
      <header className="border-b bg-card/80 dark:bg-black/40 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/dashboard/labtwin" className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Labs
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h1 className="font-bold">Pixel Odyssey — Hành Trình Ánh Sao Lạc</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            RPG · Pixel Adventure
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setStoryOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted dark:bg-white/5 border text-foreground/85 hover:bg-white/10 inline-flex items-center gap-1.5"
          >
            <Book className="w-3.5 h-3.5" /> Nhật ký cốt truyện
          </button>
          <button
            onClick={toggleMute}
            title={muted ? 'Bật nhạc nền' : 'Tắt nhạc nền'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 ${
              muted
                ? 'bg-muted dark:bg-white/5 border text-muted-foreground hover:bg-white/10'
                : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25'
            }`}
          >
            {muted ? <><VolumeX className="w-3.5 h-3.5" /> Tắt</> : <><Volume2 className="w-3.5 h-3.5" /> Nhạc</>}
          </button>
          <button
            onClick={() => setPaused(p => !p)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted dark:bg-white/5 border text-foreground/85 hover:bg-white/10 inline-flex items-center gap-1.5"
          >
            {paused ? <><Play className="w-3.5 h-3.5" /> Tiếp tục</> : <><Pause className="w-3.5 h-3.5" /> Tạm dừng</>}
          </button>
          <button
            onClick={saveGame}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 inline-flex items-center gap-1.5"
            title="Lưu game (cũng tự lưu mỗi 10s)"
          >
            <Save className="w-3.5 h-3.5" /> Lưu
          </button>
          <button
            onClick={resetGame}
            className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
            title="Bắt đầu lại"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-4 grid grid-cols-12 gap-4">
        {/* Game canvas */}
        <main className="col-span-12 lg:col-span-9">
          <div className="relative bg-black rounded-xl overflow-hidden border border-purple-500/20">
            <canvas
              ref={canvasRef}
              width={960}
              height={576}
              className="w-full block"
              style={{ imageRendering: 'pixelated' }}
              tabIndex={0}
            />

            {/* Map title overlay */}
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-card/90 dark:bg-black/70 backdrop-blur rounded-lg border">
              <div className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">
                📍 {hud.mapName}
              </div>
              <div className="text-xs text-white/80 mt-0.5">{CHAPTER_TITLES[hud.chapter]}</div>
            </div>

            {/* Pause overlay */}
            {paused && !dialogue && !storyOpen && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <Pause className="w-16 h-16 mx-auto mb-3 text-purple-400" />
                  <h2 className="text-2xl font-bold mb-2">Tạm dừng</h2>
                  <p className="text-white/60 text-sm">Bấm P hoặc nút Tiếp tục để chơi tiếp</p>
                </div>
              </div>
            )}

            {/* Game over overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-rose-900/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <Heart className="w-16 h-16 mx-auto mb-3 text-rose-400" />
                  <h2 className="text-2xl font-bold mb-2 text-rose-200">Kai đã ngã xuống...</h2>
                  <p className="text-white/70 text-sm mb-4">Star Core mờ dần, nhưng hy vọng vẫn còn.</p>
                  <button
                    onClick={resetGame}
                    className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 font-bold text-sm inline-flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Bắt đầu lại
                  </button>
                </div>
              </div>
            )}

            {/* Help overlay (chỉ hiện lần đầu) */}
            {showHelp && !dialogue && !paused && !gameOver && (
              <div onClick={() => setShowHelp(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer p-6">
                <div className="bg-card dark:bg-[#1a0a2e] border border-purple-500/40 rounded-2xl p-6 max-w-md">
                  <h2 className="text-xl font-bold mb-3 text-purple-200">🌟 Chào mừng đến Aetheria</h2>
                  <p className="text-sm text-white/70 mb-4 leading-relaxed">
                    Bạn là <strong>Kai</strong>, 16 tuổi, sống ở làng Luneria. Đêm qua,
                    một thiên thạch rơi xuống rừng. Hãy đi tìm hiểu — vận mệnh của Aetheria
                    có thể nằm trong tay bạn.
                  </p>
                  <div className="space-y-1 text-xs text-white/60 font-mono mb-4">
                    <div>🎮 <strong>WASD / Mũi tên</strong> — Di chuyển</div>
                    <div>⚔️ <strong>Space / J</strong> — Tấn công (Kiếm Ánh Sáng)</div>
                    <div>💬 <strong>E</strong> — Nói chuyện NPC (đến gần)</div>
                    <div>⏸ <strong>P</strong> — Tạm dừng</div>
                    <div>⎋ <strong>Esc</strong> — Đóng dialogue</div>
                  </div>
                  <button className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-400 font-bold text-sm">
                    Bắt đầu hành trình → Bấm vào để đóng
                  </button>
                </div>
              </div>
            )}

            {/* Dialogue box */}
            {dialogue && (
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="bg-card dark:bg-black/90 border-2 border-purple-400/60 rounded-xl p-4 backdrop-blur"
                  style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <span className="text-purple-300 font-bold text-sm uppercase tracking-wider">{dialogue.npcName}</span>
                    <span className="text-xs text-white/40 ml-auto">
                      {dialogue.idx + 1} / {dialogue.lines.length}
                    </span>
                  </div>
                  <p className="text-base text-white/95 leading-relaxed mb-3">
                    {dialogue.lines[dialogue.idx]}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40 italic">[Space] hoặc [Enter] để tiếp tục</span>
                    <button
                      onClick={() => setDialogue(d => {
                        if (!d) return d
                        if (d.idx < d.lines.length - 1) return { ...d, idx: d.idx + 1 }
                        return null
                      })}
                      className="px-3 py-1 rounded bg-purple-500/30 hover:bg-purple-500/50 text-xs font-bold"
                    >
                      {dialogue.idx < dialogue.lines.length - 1 ? 'Tiếp ▶' : 'Đóng'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* HUD sidebar */}
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          {/* Player stats */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase font-bold text-white/60 tracking-wider">Kai · Lv.{hud.level}</h3>
              <span className="text-xs text-purple-300">⭐ {hud.starCores}</span>
            </div>
            {/* HP bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-white/60 mb-0.5">
                <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" /> HP</span>
                <span className="text-rose-300 font-mono">{Math.round(hud.hp)}/100</span>
              </div>
              <div className="h-2 bg-muted dark:bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all"
                  style={{ width: `${Math.max(0, hud.hp)}%` }} />
              </div>
            </div>
            {/* MP bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-white/60 mb-0.5">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-cyan-400" /> MP</span>
                <span className="text-cyan-300 font-mono">{Math.round(hud.mp)}/{Math.round(hud.mp >= 50 ? hud.mp : 50)}</span>
              </div>
              <div className="h-2 bg-muted dark:bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                  style={{ width: `${Math.max(0, (hud.mp / 50) * 100)}%` }} />
              </div>
            </div>
            {/* XP bar */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-white/60 mb-0.5">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> XP</span>
                <span className="text-yellow-300 font-mono">{hud.xp}/{hud.level * 100}</span>
              </div>
              <div className="h-2 bg-muted dark:bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all"
                  style={{ width: `${(hud.xp / (hud.level * 100)) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Emotion stats */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <h3 className="text-xs uppercase font-bold text-white/60 tracking-wider mb-2 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-amber-400" /> Cảm xúc
            </h3>
            <div className="space-y-1.5">
              {([
                { key: 'hope' as const,         label: 'Hy vọng',    color: 'amber',   emoji: '🌟' },
                { key: 'curiosity' as const,    label: 'Tò mò',      color: 'cyan',    emoji: '🔍' },
                { key: 'determination' as const, label: 'Quyết tâm', color: 'rose',    emoji: '⚔️' },
                { key: 'fear' as const,         label: 'Sợ hãi',     color: 'violet',  emoji: '😨' },
              ]).map(e => (
                <div key={e.key}>
                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>{e.emoji} {e.label}</span>
                    <span className="font-mono">{Math.round(hud.emotion[e.key])}%</span>
                  </div>
                  <div className="h-1 bg-muted dark:bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${hud.emotion[e.key]}%`,
                        background: e.key === 'hope' ? '#fbbf24'
                                  : e.key === 'curiosity' ? '#22d3ee'
                                  : e.key === 'determination' ? '#f87171'
                                  : '#a78bfa',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/40 italic mt-2 leading-tight">
              Quyết tâm tăng damage. Hy vọng giúp hồi phục. Tò mò mở khoá hội thoại bí mật.
            </p>
          </div>

          {/* Story hint */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-xs text-white/70 space-y-1.5">
            <div className="flex items-center gap-1.5 text-purple-300 font-bold">
              <Shield className="w-3.5 h-3.5" /> Gợi ý hiện tại
            </div>
            {hud.chapter === 1 && (
              <>
                <div>• Đến phía Đông làng (cổng portal tím)</div>
                <div>• Tìm cô gái trong miệng hố thiên thạch</div>
                <div>• Bấm E để nói chuyện khi đến gần</div>
              </>
            )}
            {hud.chapter === 2 && (
              <>
                <div>• Đánh bại 6 shadow creatures đã tràn xuống Luneria</div>
                <div>• Nói chuyện với Mira ở bến làng</div>
                <div>• Tìm Piko trong làng (robot mini cổ đại)</div>
              </>
            )}
            {hud.chapter >= 3 && (
              <>
                <div>• Tiếp tục cuộc hành trình qua Mirror Forest</div>
                <div>• Quay lại Trưởng làng để mở cánh cổng Thời Gian</div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Story log modal */}
      {storyOpen && (
        <div onClick={() => setStoryOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()}
            className="bg-[#0a0612] border border-purple-500/40 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Book className="w-5 h-5 text-purple-400" /> Nhật ký cốt truyện
                </h2>
                <p className="text-xs text-white/50 mt-0.5">Tự động ghi lại các sự kiện quan trọng</p>
              </div>
              <button onClick={() => setStoryOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {storyLog.map((entry, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                  <div className="text-[10px] text-purple-300 uppercase font-bold tracking-wider mb-1">
                    Chương {entry.chapter}
                  </div>
                  <div className="text-sm text-white/85 leading-relaxed">{entry.line}</div>
                </div>
              ))}
              {storyLog.length === 0 && (
                <p className="text-center text-white/40 py-8">Chưa có sự kiện nào được ghi lại</p>
              )}
            </div>
            <div className="p-3 border-t border-white/10 text-[11px] text-white/40 italic text-center">
              "Trưởng thành không phải là đánh mất ước mơ, mà là đủ dũng cảm để tiếp tục theo đuổi chúng."
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
