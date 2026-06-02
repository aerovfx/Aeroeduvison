/**
 * GraphAR3D — dựng đồ thị hàm số y=f(x) thành cảnh 3D + nút AR (giống GeoGebra).
 *
 * Nhận các hàm đã compile từ GraphLab (mỗi hàm: eval + màu) + viewport hiện tại,
 * lấy mẫu điểm, map về hộp [-1,1]³ rồi vẽ:
 *   - lưới mặt phẳng X-Y + trục X (đỏ) / Y (xanh lá)
 *   - mỗi hàm 1 đường cong 3D (tách đoạn ở điểm gián đoạn / ra ngoài khung),
 *     nhiều hàm xếp lệch nhẹ theo trục Z để thấy chiều sâu
 *
 * Bọc trong <XRCanvas> → có nút "AR": Android/Quest đặt đồ thị REALTIME lên bàn,
 * iOS Quick Look, desktop QR. OrbitControls để xoay xem 3D khi chưa vào AR.
 */
import { useMemo, useState } from 'react'
import { OrbitControls, Line } from '@react-three/drei'
import { XRCanvas } from '@/components/ar/XRCanvas'

export interface PlotFn {
  fn: (x: number) => number
  color: string
}

interface Viewport {
  xMin: number; xMax: number; yMin: number; yMax: number
}

interface Props {
  functions: PlotFn[]
  viewport: Viewport
}

const H = 1 // nửa kích thước hộp cảnh (cảnh nằm trong [-1,1]³)
const SAMPLES = 280
const OUT_OF_BOX = 1.45 // |y chuẩn hoá| vượt mức này → coi như ra ngoài khung, ngắt đoạn

type Seg = [number, number, number][]

function GraphScene({ functions, viewport }: Props) {
  const { xMin, xMax, yMin, yMax } = viewport
  const curves = useMemo(() => {
    const xMid = (xMin + xMax) / 2
    const xHalf = (xMax - xMin) / 2 || 1
    const yMid = (yMin + yMax) / 2
    const yHalf = (yMax - yMin) / 2 || 1
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
          if (cur.length > 1) segs.push(cur)
          cur = []
          continue
        }
        cur.push([((x - xMid) / xHalf) * H, ny * H, z])
      }
      if (cur.length > 1) segs.push(cur)
      return { color: p.color, segs }
    })
  }, [functions, xMin, xMax, yMin, yMax])

  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={0.6} />
      {/* Lưới mặt phẳng X-Y (gridHelper mặc định nằm X-Z → xoay 90° quanh X) */}
      <gridHelper args={[2 * H, 20, '#475569', '#1e293b']} rotation={[Math.PI / 2, 0, 0]} />
      {/* Trục X (đỏ) + Y (xanh lá) */}
      <Line points={[[-H, 0, 0], [H, 0, 0]]} color="#f87171" lineWidth={2} />
      <Line points={[[0, -H, 0], [0, H, 0]]} color="#34d399" lineWidth={2} />
      {/* Đường cong các hàm */}
      {curves.map((c, ci) =>
        c.segs.map((s, si) => (
          <Line key={`${ci}-${si}`} points={s} color={c.color} lineWidth={3} />
        )),
      )}
    </group>
  )
}

export default function GraphAR3D({ functions, viewport }: Props) {
  const [presenting, setPresenting] = useState(false)
  return (
    <XRCanvas
      arTitle="Đồ thị hàm số 3D"
      onPresentingChange={setPresenting}
      camera={{ position: [1.6, 1.2, 2.0], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: presenting ? 'transparent' : '#020617' }}
    >
      <GraphScene functions={functions} viewport={viewport} />
      <OrbitControls enabled={!presenting} enablePan={false} minDistance={1} maxDistance={8} />
    </XRCanvas>
  )
}
