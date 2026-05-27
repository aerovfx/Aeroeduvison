/**
 * WfcBuilder — Wave Function Collapse pattern generator
 *
 * Route: /dashboard/labtwin/wfc-builder
 * User: "fix /wfc-builder"
 *
 * Thuật toán WFC (Maxim Gumin 2016): sinh pattern ngẫu nhiên có cấu trúc
 * từ tập "tile" với "constraints" (mỗi tile có rule về tile lân cận nào
 * được phép). Dùng trong procedural game maps, ô chữ, tranh nghệ thuật.
 *
 * Implementation đơn giản: tile-based (không phải overlapping model).
 * 3 tile sets:
 *   - Knot (đường thẳng + cua)
 *   - Pipe (ống nước với joint)
 *   - Circuit (mạch điện với linh kiện)
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play, RotateCcw, Sparkles, Info, Grid3x3 } from 'lucide-react'

// ─── Tile types: side codes for adjacency matching ──────────────
// Each tile has 4 sides: top, right, bottom, left
// Two tiles connect if facing sides have SAME code
type Side = 'wire' | 'blank' | 'pipe-A' | 'pipe-B'

interface TileDef {
  id: string
  emoji: string  // visual representation
  sides: [Side, Side, Side, Side]  // [top, right, bottom, left]
}

// Set 1: Knot (line patterns)
const KNOT_TILES: TileDef[] = [
  { id: 'k-blank',     emoji: '·', sides: ['blank', 'blank', 'blank', 'blank'] },
  { id: 'k-horiz',     emoji: '─', sides: ['blank', 'wire', 'blank', 'wire'] },
  { id: 'k-vert',      emoji: '│', sides: ['wire', 'blank', 'wire', 'blank'] },
  { id: 'k-cross',     emoji: '┼', sides: ['wire', 'wire', 'wire', 'wire'] },
  { id: 'k-corner-tr', emoji: '┐', sides: ['blank', 'blank', 'wire', 'wire'] },
  { id: 'k-corner-tl', emoji: '┌', sides: ['blank', 'wire', 'wire', 'blank'] },
  { id: 'k-corner-br', emoji: '┘', sides: ['wire', 'blank', 'blank', 'wire'] },
  { id: 'k-corner-bl', emoji: '└', sides: ['wire', 'wire', 'blank', 'blank'] },
  { id: 'k-t-up',      emoji: '┴', sides: ['wire', 'wire', 'blank', 'wire'] },
  { id: 'k-t-down',    emoji: '┬', sides: ['blank', 'wire', 'wire', 'wire'] },
  { id: 'k-t-left',    emoji: '┤', sides: ['wire', 'blank', 'wire', 'wire'] },
  { id: 'k-t-right',   emoji: '├', sides: ['wire', 'wire', 'wire', 'blank'] },
]

// Set 2: Pipe (with 2 types of pipes)
const PIPE_TILES: TileDef[] = [
  { id: 'p-blank',     emoji: '·', sides: ['blank', 'blank', 'blank', 'blank'] },
  { id: 'p-horiz-a',   emoji: '═', sides: ['blank', 'pipe-A', 'blank', 'pipe-A'] },
  { id: 'p-vert-a',    emoji: '║', sides: ['pipe-A', 'blank', 'pipe-A', 'blank'] },
  { id: 'p-cross-a',   emoji: '╬', sides: ['pipe-A', 'pipe-A', 'pipe-A', 'pipe-A'] },
  { id: 'p-corner-tr', emoji: '╗', sides: ['blank', 'blank', 'pipe-A', 'pipe-A'] },
  { id: 'p-corner-tl', emoji: '╔', sides: ['blank', 'pipe-A', 'pipe-A', 'blank'] },
  { id: 'p-corner-br', emoji: '╝', sides: ['pipe-A', 'blank', 'blank', 'pipe-A'] },
  { id: 'p-corner-bl', emoji: '╚', sides: ['pipe-A', 'pipe-A', 'blank', 'blank'] },
  { id: 'p-horiz-b',   emoji: '━', sides: ['blank', 'pipe-B', 'blank', 'pipe-B'] },
  { id: 'p-vert-b',    emoji: '┃', sides: ['pipe-B', 'blank', 'pipe-B', 'blank'] },
]

// Set 3: Circuit-like
const CIRCUIT_TILES: TileDef[] = [
  { id: 'c-blank',  emoji: '·',  sides: ['blank', 'blank', 'blank', 'blank'] },
  { id: 'c-wire-h', emoji: '═',  sides: ['blank', 'wire', 'blank', 'wire'] },
  { id: 'c-wire-v', emoji: '║',  sides: ['wire', 'blank', 'wire', 'blank'] },
  { id: 'c-resistor-h', emoji: 'R', sides: ['blank', 'wire', 'blank', 'wire'] },
  { id: 'c-led-h',  emoji: '💡', sides: ['blank', 'wire', 'blank', 'wire'] },
  { id: 'c-corner-tr', emoji: '┐', sides: ['blank', 'blank', 'wire', 'wire'] },
  { id: 'c-corner-tl', emoji: '┌', sides: ['blank', 'wire', 'wire', 'blank'] },
  { id: 'c-corner-br', emoji: '┘', sides: ['wire', 'blank', 'blank', 'wire'] },
  { id: 'c-corner-bl', emoji: '└', sides: ['wire', 'wire', 'blank', 'blank'] },
  { id: 'c-battery', emoji: '🔋', sides: ['blank', 'wire', 'blank', 'wire'] },
]

const TILE_SETS = { knot: KNOT_TILES, pipe: PIPE_TILES, circuit: CIRCUIT_TILES }
type TileSetKey = keyof typeof TILE_SETS

// ─── WFC Algorithm ──────────────────────────────────────────────

interface Cell {
  options: number[]  // indices into tile list still possible
  collapsed: boolean
}

function createGrid(W: number, H: number, numTiles: number): Cell[][] {
  return Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({
      options: Array.from({ length: numTiles }, (_, i) => i),
      collapsed: false,
    }))
  )
}

function findLowestEntropy(grid: Cell[][]): [number, number] | null {
  let minOptions = Infinity
  let candidates: [number, number][] = []
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      const cell = grid[y][x]
      if (cell.collapsed) continue
      const n = cell.options.length
      if (n === 0) return null  // contradiction
      if (n < minOptions) {
        minOptions = n
        candidates = [[x, y]]
      } else if (n === minOptions) {
        candidates.push([x, y])
      }
    }
  }
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

const DIRS: Array<[number, number, number, number]> = [
  [0, -1, 0, 2],  // top neighbor; my side 0 ↔ their side 2
  [1, 0, 1, 3],   // right neighbor; my side 1 ↔ their side 3
  [0, 1, 2, 0],   // bottom; my side 2 ↔ their side 0
  [-1, 0, 3, 1],  // left; my side 3 ↔ their side 1
]

function propagate(grid: Cell[][], tiles: TileDef[], startX: number, startY: number): boolean {
  const stack: Array<[number, number]> = [[startX, startY]]
  const W = grid[0].length, H = grid.length

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    const cell = grid[y][x]
    const possibleSides: Set<Side>[] = [new Set(), new Set(), new Set(), new Set()]
    for (const optIdx of cell.options) {
      for (let s = 0; s < 4; s++) {
        possibleSides[s].add(tiles[optIdx].sides[s])
      }
    }

    for (const [dx, dy, mySide, theirSide] of DIRS) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
      const neighbor = grid[ny][nx]
      if (neighbor.collapsed) continue

      const allowedSides = possibleSides[mySide]
      const newOptions = neighbor.options.filter((idx) =>
        allowedSides.has(tiles[idx].sides[theirSide])
      )
      if (newOptions.length < neighbor.options.length) {
        neighbor.options = newOptions
        if (newOptions.length === 0) return false  // contradiction
        stack.push([nx, ny])
      }
    }
  }
  return true
}

function wfcStep(grid: Cell[][], tiles: TileDef[]): 'continue' | 'done' | 'failed' {
  const pick = findLowestEntropy(grid)
  if (!pick) {
    // Check if all collapsed
    const allDone = grid.every((row) => row.every((c) => c.collapsed))
    return allDone ? 'done' : 'failed'
  }
  const [x, y] = pick
  const cell = grid[y][x]
  const choice = cell.options[Math.floor(Math.random() * cell.options.length)]
  cell.options = [choice]
  cell.collapsed = true
  const ok = propagate(grid, tiles, x, y)
  return ok ? 'continue' : 'failed'
}

// ─── Component ────────────────────────────────────────────────────

const CELL_PX = 32

export default function WfcBuilder() {
  const [tileSet, setTileSet] = useState<TileSetKey>('knot')
  const [gridW, setGridW] = useState(16)
  const [gridH, setGridH] = useState(12)
  const [grid, setGrid] = useState<Cell[][]>([])
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'failed'>('idle')
  const [seed, setSeed] = useState(0)
  const animRef = useRef(0)

  const tiles = TILE_SETS[tileSet]

  // Initialize
  const reset = () => {
    setGrid(createGrid(gridW, gridH, tiles.length))
    setStatus('idle')
  }

  useEffect(() => { reset() /* eslint-disable-next-line */ }, [tileSet, gridW, gridH])

  // Step-by-step generation with animation
  const generate = () => {
    if (generating) return
    setGenerating(true)
    const newGrid = createGrid(gridW, gridH, tiles.length)
    setGrid(newGrid)
    setStatus('running')

    const STEPS_PER_FRAME = 3
    const tick = () => {
      let outcome: 'continue' | 'done' | 'failed' = 'continue'
      for (let k = 0; k < STEPS_PER_FRAME && outcome === 'continue'; k++) {
        outcome = wfcStep(newGrid, tiles)
      }
      setGrid([...newGrid])  // trigger re-render with new ref
      if (outcome === 'continue') {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setStatus(outcome)
        setGenerating(false)
      }
    }
    animRef.current = requestAnimationFrame(tick)
  }

  // Cleanup
  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  const renderTileEmoji = (cell: Cell): string => {
    if (cell.collapsed && cell.options.length === 1) {
      return tiles[cell.options[0]].emoji
    }
    return ' '  // uncertain
  }

  const cellColor = (cell: Cell): string => {
    if (cell.collapsed) return '#0a0f1f'
    const n = cell.options.length
    const totalOptions = tiles.length
    const intensity = 1 - (n / totalOptions)
    const hue = 200 - intensity * 60  // blue (uncertain) → green (almost certain)
    return `hsl(${hue}, 50%, ${15 + intensity * 25}%)`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent flex items-center gap-2">
                <Grid3x3 className="w-6 h-6 text-violet-400" />
                Wave Function Collapse Builder
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Sinh pattern procedural từ tile + adjacency constraints (Maxim Gumin 2016)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={generate} disabled={generating}
              className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:bg-white/[0.05] disabled:text-white/30 font-bold flex items-center gap-2 text-sm transition">
              <Sparkles className="w-4 h-4" /> Sinh pattern
            </button>
            <button onClick={reset}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button onClick={() => { setSeed(seed + 1); generate() }}
              className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-bold flex items-center gap-1.5 text-sm">
              <Play className="w-4 h-4" /> Sinh lại
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🎨 Bộ Tile</h3>
              <div className="space-y-1.5">
                {([
                  { id: 'knot' as const,    label: '🔗 Knot (đường + cua)',   count: KNOT_TILES.length },
                  { id: 'pipe' as const,    label: '🔧 Pipe (2 loại ống)',    count: PIPE_TILES.length },
                  { id: 'circuit' as const, label: '⚡ Circuit (mạch điện)', count: CIRCUIT_TILES.length },
                ] as const).map((m) => (
                  <button key={m.id} onClick={() => setTileSet(m.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition ${
                      tileSet === m.id ? 'bg-violet-500/20 border border-violet-500/40 text-violet-100' : 'bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
                    }`}>
                    <div className="font-bold">{m.label}</div>
                    <div className="text-[10px] text-white/45 mt-0.5 font-mono">{m.count} tiles</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Grid</h3>
              <Slider label="Chiều rộng" value={gridW} min={8} max={30} step={1} suffix="" onChange={(v) => setGridW(Math.round(v))} />
              <Slider label="Chiều cao" value={gridH} min={6} max={24} step={1} suffix="" onChange={(v) => setGridH(Math.round(v))} />
            </div>

            <div className="rounded-2xl bg-violet-500/[0.06] border border-violet-500/25 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-violet-300 mb-1.5">📊 Status</h3>
              <div className="text-xs text-white/70 space-y-1">
                <div>
                  Grid: <span className="font-mono text-violet-300">{gridW}×{gridH}</span> = <span className="font-mono">{gridW * gridH}</span> cells
                </div>
                <div>
                  Tile set: <span className="font-mono text-violet-300">{tiles.length}</span> tiles
                </div>
                <div className={`mt-2 px-2 py-1 rounded text-[11px] font-bold ${
                  status === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                  status === 'failed' ? 'bg-rose-500/20 text-rose-300' :
                  status === 'running' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                  'bg-white/[0.05] text-white/50'
                }`}>
                  {status === 'done' && '✓ Hoàn thành'}
                  {status === 'failed' && '✗ Mâu thuẫn (thử lại)'}
                  {status === 'running' && '⏱ Đang sinh...'}
                  {status === 'idle' && 'Sẵn sàng — bấm "Sinh pattern"'}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 flex items-center justify-center overflow-auto">
              <div className="inline-block" style={{ fontFamily: 'monospace' }}>
                {grid.map((row, y) => (
                  <div key={y} style={{ display: 'flex' }}>
                    {row.map((cell, x) => {
                      const isCollapsed = cell.collapsed
                      const emoji = renderTileEmoji(cell)
                      return (
                        <div key={x}
                          style={{
                            width: CELL_PX, height: CELL_PX,
                            background: cellColor(cell),
                            border: '1px solid rgba(148,163,184,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isCollapsed ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                            fontSize: 22, fontWeight: 'bold',
                            transition: 'background 0.2s',
                          }}>
                          {emoji}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-violet-500/[0.04] border border-violet-500/20 p-4">
              <h3 className="font-bold text-violet-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Wave Function Collapse là gì?
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1">🌊 Thuật toán</h4>
                  <p className="text-white/55 leading-relaxed">
                    1. Mỗi cell ban đầu có <strong>tất cả tile có thể</strong> (superposition).<br />
                    2. Chọn cell có ít option nhất → <strong>"collapse"</strong> ngẫu nhiên 1 tile.<br />
                    3. <strong>Propagate</strong> ràng buộc đến cells lân cận: lọc bỏ tile vi phạm adjacency.<br />
                    4. Lặp đến khi all cells collapsed hoặc gặp contradiction (thử lại).
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-300 mb-1">🎮 Ứng dụng</h4>
                  <p className="text-white/55 leading-relaxed">
                    • <strong>Game maps</strong>: Townscaper, Caves of Qud<br />
                    • <strong>Tranh procedural</strong>: pattern textures<br />
                    • <strong>Sudoku solver</strong> (cùng nguyên lý)<br />
                    • <strong>Constraint satisfaction</strong> tổng quát
                  </p>
                </div>
                <div className="md:col-span-2 mt-1">
                  <h4 className="font-bold text-amber-300 mb-1">🧠 Bản chất</h4>
                  <p className="text-white/55 leading-relaxed">
                    WFC giống <strong>cơ học lượng tử quan sát</strong>: mỗi cell ở trạng thái chồng chập
                    (superposition của nhiều tile). Khi "đo" (collapse) → cell chọn 1 tile cụ thể, các cell
                    lân cận điều chỉnh khả năng (entanglement). Lấy cảm hứng từ tên gọi!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-violet-300">{value.toFixed(0)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-500" />
    </div>
  )
}
