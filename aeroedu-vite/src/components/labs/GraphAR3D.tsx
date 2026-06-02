/**
 * GraphAR3D — đồ thị 3D + AR (kiểu GeoGebra 3D Calculator).
 *
 * Nhận từ GraphLab:
 *   - functions: hàm 1 biến y=f(x) (đã compile) → đường cong đứng trong mặt X-Y (Z=0)
 *   - surfaces:  hàm 2 biến z=f(x,y) (đã compile) → MẶT CONG 3D trên sàn X-Z, cao theo Y
 *   - viewport:  miền x,y hiện tại
 * Vẽ: lưới sàn X-Z + trục X(đỏ)/Y(xanh lá, lên)/Z(xanh dương) + đường cong + mặt.
 * Bọc <XRCanvas> → nút AR đặt lên bàn (Android realtime · iOS Quick Look · QR).
 */
import { useMemo, useState } from 'react'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { XRCanvas } from '@/components/ar/XRCanvas'

export interface PlotFn { fn: (x: number) => number; color: string }
export interface PlotSurface { fn: (x: number, y: number) => number; color: string }
export interface PlotParam {
  kind: 'param' | 'polar'
  fnX: (t: number) => number; fnY: (t: number) => number; fnR: (t: number) => number
  tMin: number; tMax: number; color: string
}

interface Viewport { xMin: number; xMax: number; yMin: number; yMax: number }

interface Props {
  functions: PlotFn[]
  surfaces?: PlotSurface[]
  paramCurves?: PlotParam[]
  viewport: Viewport
}

const H = 1 // nửa kích thước hộp cảnh ([-1,1]³)
const SAMPLES = 280 // điểm/đường cong
const SURF_N = 44 // lưới mặt (N×N ô)
const OUT_OF_BOX = 1.45

type Seg = [number, number, number][]

/* ── Đường cong y=f(x): đứng trong mặt X-Y, Z lệch nhẹ theo từng hàm ── */
function Curves({ functions, viewport }: { functions: PlotFn[]; viewport: Viewport }) {
  const { xMin, xMax, yMin, yMax } = viewport
  const curves = useMemo(() => {
    const xMid = (xMin + xMax) / 2, xHalf = (xMax - xMin) / 2 || 1
    const yMid = (yMin + yMax) / 2, yHalf = (yMax - yMin) / 2 || 1
    const n = Math.max(1, functions.length)
    return functions.map((p, idx) => {
      const z = n > 1 ? (idx - (n - 1) / 2) * 0.05 : 0
      const segs: Seg[] = []
      let cur: Seg = []
      for (let i = 0; i <= SAMPLES; i++) {
        const x = xMin + ((xMax - xMin) * i) / SAMPLES
        let y: number
        try { y = p.fn(x) } catch { y = NaN }
        const ny = (y - yMid) / yHalf
        if (!Number.isFinite(y) || Math.abs(ny) > OUT_OF_BOX) {
          if (cur.length > 1) segs.push(cur); cur = []; continue
        }
        cur.push([((x - xMid) / xHalf) * H, ny * H, z])
      }
      if (cur.length > 1) segs.push(cur)
      return { color: p.color, segs }
    })
  }, [functions, xMin, xMax, yMin, yMax])

  return (
    <>
      {curves.map((c, ci) =>
        c.segs.map((s, si) => (
          <Line key={`${ci}-${si}`} points={s} color={c.color} lineWidth={3} />
        )),
      )}
    </>
  )
}

/* ── Mặt z=f(x,y): trên sàn X-Z, cao theo Y; tô màu gradient theo độ cao ── */
function SurfaceMesh({ surface, viewport }: { surface: PlotSurface; viewport: Viewport }) {
  const geom = useMemo(() => {
    const { xMin, xMax, yMin, yMax } = viewport
    const N = SURF_N
    const zs: number[] = []
    let zMin = Infinity, zMax = -Infinity
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const x = xMin + ((xMax - xMin) * i) / N
        const y = yMin + ((yMax - yMin) * j) / N
        let z: number
        try { z = surface.fn(x, y) } catch { z = NaN }
        zs.push(z)
        if (Number.isFinite(z)) { zMin = Math.min(zMin, z); zMax = Math.max(zMax, z) }
      }
    }
    if (!Number.isFinite(zMin)) { zMin = -1; zMax = 1 }
    const zMid = (zMin + zMax) / 2, zHalf = (zMax - zMin) / 2 || 1
    const base = new THREE.Color(surface.color)
    const hot = new THREE.Color('#ffffff')
    const pos: number[] = [], col: number[] = []
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const z = zs[j * (N + 1) + i]
        const sx = (i / N * 2 - 1) * H
        const sz = (j / N * 2 - 1) * H
        const sy = Number.isFinite(z)
          ? THREE.MathUtils.clamp((z - zMid) / zHalf, -1.3, 1.3) * H * 0.8 : 0
        pos.push(sx, sy, sz)
        const t = Number.isFinite(z) ? (z - zMin) / ((zMax - zMin) || 1) : 0.5
        const cc = base.clone().lerp(hot, t * 0.6)
        col.push(cc.r, cc.g, cc.b)
      }
    }
    const idx: number[] = []
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i, b = a + 1, d = a + (N + 1), e = d + 1
        if (![a, b, d, e].every((k) => Number.isFinite(zs[k]))) continue
        idx.push(a, d, b, b, d, e)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [surface, viewport])

  return (
    <mesh geometry={geom}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.6} metalness={0.05} />
    </mesh>
  )
}

/* ── Đường tham số x(t),y(t) & cực r(θ): trong mặt X-Y, Z=0 ── */
function ParamCurves({ curves, viewport }: { curves: PlotParam[]; viewport: Viewport }) {
  const { xMin, xMax, yMin, yMax } = viewport
  const out = useMemo(() => {
    const xMid = (xMin + xMax) / 2, xHalf = (xMax - xMin) / 2 || 1
    const yMid = (yMin + yMax) / 2, yHalf = (yMax - yMin) / 2 || 1
    const N = 600
    return curves.map((cv) => {
      const segs: Seg[] = []
      let cur: Seg = []
      for (let i = 0; i <= N; i++) {
        const t = cv.tMin + ((cv.tMax - cv.tMin) * i) / N
        let X: number, Y: number
        if (cv.kind === 'param') { try { X = cv.fnX(t); Y = cv.fnY(t) } catch { X = NaN; Y = NaN } }
        else { let r: number; try { r = cv.fnR(t) } catch { r = NaN } X = r * Math.cos(t); Y = r * Math.sin(t) }
        const nx = (X - xMid) / xHalf, ny = (Y - yMid) / yHalf
        if (!Number.isFinite(X) || !Number.isFinite(Y) || Math.abs(nx) > OUT_OF_BOX || Math.abs(ny) > OUT_OF_BOX) {
          if (cur.length > 1) segs.push(cur); cur = []; continue
        }
        cur.push([nx * H, ny * H, 0])
      }
      if (cur.length > 1) segs.push(cur)
      return { color: cv.color, segs }
    })
  }, [curves, xMin, xMax, yMin, yMax])

  return (
    <>
      {out.map((c, ci) => c.segs.map((s, si) => (
        <Line key={`pc-${ci}-${si}`} points={s} color={c.color} lineWidth={3} />
      )))}
    </>
  )
}

function GraphScene({ functions, surfaces, paramCurves, viewport }: Props) {
  return (
    <group>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={0.7} />
      <directionalLight position={[-3, 2, -4]} intensity={0.3} />
      {/* Lưới sàn X-Z (ngang) */}
      <gridHelper args={[2 * H, 20, '#475569', '#1e293b']} />
      {/* Trục: X đỏ, Y(lên) xanh lá, Z xanh dương */}
      <Line points={[[-H, 0, 0], [H, 0, 0]]} color="#f87171" lineWidth={2} />
      <Line points={[[0, -H, 0], [0, H, 0]]} color="#34d399" lineWidth={2} />
      <Line points={[[0, 0, -H], [0, 0, H]]} color="#60a5fa" lineWidth={2} />
      {(surfaces ?? []).map((s, i) => (
        <SurfaceMesh key={`s-${i}`} surface={s} viewport={viewport} />
      ))}
      <Curves functions={functions} viewport={viewport} />
      <ParamCurves curves={paramCurves ?? []} viewport={viewport} />
    </group>
  )
}

export default function GraphAR3D({ functions, surfaces, paramCurves, viewport }: Props) {
  const [presenting, setPresenting] = useState(false)
  return (
    <XRCanvas
      arTitle="Đồ thị 3D"
      onPresentingChange={setPresenting}
      camera={{ position: [1.8, 1.4, 2.2], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: presenting ? 'transparent' : '#020617' }}
    >
      <GraphScene functions={functions} surfaces={surfaces} paramCurves={paramCurves} viewport={viewport} />
      <OrbitControls enabled={!presenting} enablePan={false} minDistance={1} maxDistance={8} />
    </XRCanvas>
  )
}
