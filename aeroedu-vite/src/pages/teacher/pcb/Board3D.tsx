/** Xem bo mạch 3D (R3F) — nền FR4 xanh + pad đồng + thân linh kiện + đường mạch. */
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { PcbComponent, PcbLayout, PcbTrace } from '@/types/pcb'
import { footprintOf, padAbs } from './pcbFootprints'

const S = 0.1 // 1mm = 0.1 đơn vị scene

function Trace3D({ t, W, H }: { t: PcbTrace; W: number; H: number }) {
  const y = t.layer === 'top' ? 0.095 : -0.095
  const color = t.layer === 'top' ? '#e53e3e' : '#3182ce'
  const segs: React.ReactNode[] = []
  for (let i = 1; i < t.pts.length; i++) {
    const a = t.pts[i - 1], b = t.pts[i]
    const ax = (a.x - W / 2) * S, az = (a.y - H / 2) * S, bx = (b.x - W / 2) * S, bz = (b.y - H / 2) * S
    const dx = bx - ax, dz = bz - az; const len = Math.hypot(dx, dz) || 0.001
    segs.push(
      <mesh key={i} position={[(ax + bx) / 2, y, (az + bz) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]}>
        <boxGeometry args={[len, 0.02, t.width * S]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>,
    )
  }
  return <>{segs}</>
}

function Scene({ comps, layout }: { comps: PcbComponent[]; layout: PcbLayout }) {
  const W = layout.board.w, H = layout.board.h
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} />
      <directionalLight position={[-4, 5, -3]} intensity={0.4} />
      {/* FR4 board */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[W * S, 0.16, H * S]} />
        <meshStandardMaterial color="#0b6b3a" roughness={0.8} />
      </mesh>
      {/* Pads */}
      {comps.flatMap((c) => {
        const pl = layout.placements[c.ref]; if (!pl) return []
        return footprintOf(c).pads.map((pad, i) => {
          const a = padAbs(pl, pad)
          return pad.smd ? (
            <mesh key={c.ref + i} position={[(a.x - W / 2) * S, 0.085, (a.y - H / 2) * S]}>
              <boxGeometry args={[pad.w * S, 0.04, pad.h * S]} />
              <meshStandardMaterial color="#cd7f32" metalness={0.9} roughness={0.3} />
            </mesh>
          ) : (
            <mesh key={c.ref + i} position={[(a.x - W / 2) * S, 0.085, (a.y - H / 2) * S]}>
              <cylinderGeometry args={[(pad.d / 2) * S, (pad.d / 2) * S, 0.05, 16]} />
              <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
            </mesh>
          )
        })
      })}
      {/* Thân linh kiện */}
      {comps.map((c) => {
        const pl = layout.placements[c.ref]; if (!pl) return null
        const fp = footprintOf(c); const bh = 0.35
        return (
          <group key={c.ref} position={[(pl.x - W / 2) * S, 0.08 + bh / 2, (pl.y - H / 2) * S]} rotation={[0, (-(pl.rot || 0) * Math.PI) / 180, 0]}>
            <mesh castShadow>
              <boxGeometry args={[fp.body.w * S, bh, fp.body.h * S]} />
              <meshStandardMaterial color={fp.color} roughness={0.5} />
            </mesh>
          </group>
        )
      })}
      {layout.traces.map((t) => <Trace3D key={t.id} t={t} W={W} H={H} />)}
      {/* vias */}
      {(layout.vias || []).map((v, i) => (
        <mesh key={'v' + i} position={[(v.x - W / 2) * S, 0, (v.y - H / 2) * S]}>
          <cylinderGeometry args={[0.45 * S, 0.45 * S, 0.2, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      <OrbitControls enablePan target={[0, 0, 0]} />
    </>
  )
}

export default function Board3D({ comps, layout }: { comps: PcbComponent[]; layout: PcbLayout }) {
  return (
    <div className="w-full h-full bg-slate-800">
      <Canvas camera={{ position: [0, 6, 7], fov: 45 }} dpr={[1, 1.8]}>
        <color attach="background" args={['#1e293b']} />
        <Scene comps={comps} layout={layout} />
      </Canvas>
    </div>
  )
}
