/** Xem bo mạch 3D (R3F) chân thực — mặt nạ navy bóng (clearcoat) + pad/đường
 *  đồng-vàng kim loại (phản chiếu từ Environment dựng bằng Lightformer, KHÔNG
 *  tải HDR mạng) + bóng đổ tiếp xúc + thân linh kiện vát cạnh + LED phát sáng. */
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, RoundedBox, Environment, Lightformer, Edges } from '@react-three/drei'
import type { PcbComponent, PcbLayout, PcbTrace } from '@/types/pcb'
import { footprintOf, padAbs } from './pcbFootprints'

const S = 0.1 // 1mm = 0.1 đơn vị scene
const TOP = 0.08 // mặt trên board

function Trace3D({ t, W, H }: { t: PcbTrace; W: number; H: number }) {
  const y = t.layer === 'top' ? TOP + 0.012 : -TOP - 0.012
  const color = t.layer === 'top' ? '#e08a3c' : '#5f97c6'   // đồng / thép-xanh
  const segs: React.ReactNode[] = []
  for (let i = 1; i < t.pts.length; i++) {
    const a = t.pts[i - 1], b = t.pts[i]
    const ax = (a.x - W / 2) * S, az = (a.y - H / 2) * S, bx = (b.x - W / 2) * S, bz = (b.y - H / 2) * S
    const dx = bx - ax, dz = bz - az; const len = Math.hypot(dx, dz) || 0.001
    segs.push(
      <mesh key={i} position={[(ax + bx) / 2, y, (az + bz) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]}>
        <boxGeometry args={[len + t.width * S * 0.5, 0.014, t.width * S]} />
        <meshStandardMaterial color={color} metalness={0.95} roughness={0.32} />
      </mesh>,
    )
  }
  return <>{segs}</>
}

function Component3D({ c, layout, W, H }: { c: PcbComponent; layout: PcbLayout; W: number; H: number }) {
  const pl = layout.placements[c.ref]; if (!pl) return null
  const fp = footprintOf(c)
  const big = fp.pads.length > 3
  const isLED = c.type === 'LED'
  const bh = isLED ? 0.18 : big ? 0.5 : c.type === 'C' ? 0.42 : 0.26
  const bw = fp.body.w * S, bd = fp.body.h * S
  const pos: [number, number, number] = [(pl.x - W / 2) * S, TOP + bh / 2, (pl.y - H / 2) * S]
  const rot: [number, number, number] = [0, (-(pl.rot || 0) * Math.PI) / 180, 0]
  if (isLED) {
    return (
      <group position={[pos[0], TOP + 0.02, pos[2]]} rotation={rot}>
        <mesh position={[0, 0.09, 0]} castShadow>
          <sphereGeometry args={[Math.min(bw, bd) * 0.55, 20, 16]} />
          <meshStandardMaterial color={fp.color} emissive={fp.color} emissiveIntensity={1.1} roughness={0.25} transparent opacity={0.92} />
        </mesh>
        <pointLight position={[0, 0.18, 0]} color={fp.color} intensity={0.5} distance={1.2} />
      </group>
    )
  }
  return (
    <group position={pos} rotation={rot}>
      <RoundedBox args={[bw, bh, bd]} radius={Math.min(0.02, bh / 3)} smoothness={3} castShadow>
        <meshStandardMaterial color={fp.color} roughness={big ? 0.42 : 0.55} metalness={big ? 0.35 : 0.1} />
        <Edges threshold={20} color="#ffffff" scale={1.0} />
      </RoundedBox>
      {big && (
        <mesh position={[-bw / 2 + 0.05, bh / 2 + 0.001, -bd / 2 + 0.05]}>
          <cylinderGeometry args={[0.022, 0.022, 0.01, 12]} />
          <meshStandardMaterial color="#e8e8e8" roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}

function Scene({ comps, layout }: { comps: PcbComponent[]; layout: PcbLayout }) {
  const W = layout.board.w, H = layout.board.h
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 5]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-W * S, W * S, H * S, -H * S, 0.1, 30]} />
      </directionalLight>
      <directionalLight position={[-5, 6, -4]} intensity={0.4} color="#bcd4ff" />

      {/* Môi trường phản chiếu dựng tại chỗ (không tải HDR mạng) → kim loại bóng */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={3} position={[0, 6, 2]} scale={[9, 9, 1]} />
        <Lightformer intensity={1.6} position={[-6, 3, 1]} scale={[3, 9, 1]} color="#cfe0ff" />
        <Lightformer intensity={1.6} position={[6, 3, -2]} scale={[3, 9, 1]} color="#ffffff" />
      </Environment>

      {/* FR4 mặt nạ navy — bóng clearcoat */}
      <RoundedBox args={[W * S, 0.16, H * S]} radius={0.035} smoothness={4} position={[0, 0, 0]} receiveShadow>
        <meshPhysicalMaterial color="#0e1d2f" roughness={0.38} metalness={0.12} clearcoat={1} clearcoatRoughness={0.28} />
      </RoundedBox>

      {/* Pads */}
      {comps.flatMap((c) => {
        const pl = layout.placements[c.ref]; if (!pl) return []
        return footprintOf(c).pads.map((pad, i) => {
          const a = padAbs(pl, pad)
          return pad.smd ? (
            <mesh key={c.ref + i} position={[(a.x - W / 2) * S, TOP + 0.006, (a.y - H / 2) * S]}>
              <boxGeometry args={[pad.w * S, 0.03, pad.h * S]} />
              <meshStandardMaterial color="#d99b53" metalness={1} roughness={0.24} />
            </mesh>
          ) : (
            <mesh key={c.ref + i} position={[(a.x - W / 2) * S, TOP + 0.005, (a.y - H / 2) * S]}>
              <cylinderGeometry args={[(pad.d / 2) * S, (pad.d / 2) * S, 0.05, 18]} />
              <meshStandardMaterial color="#e8c14a" metalness={1} roughness={0.2} />
            </mesh>
          )
        })
      })}

      {/* lỗ khoan pad THT (đậm giữa pad cho ra "lỗ mạ") */}
      {comps.flatMap((c) => {
        const pl = layout.placements[c.ref]; if (!pl) return []
        return footprintOf(c).pads.filter((p) => p.drill > 0).map((pad, i) => {
          const a = padAbs(pl, pad)
          return (
            <mesh key={c.ref + 'h' + i} position={[(a.x - W / 2) * S, TOP + 0.02, (a.y - H / 2) * S]}>
              <cylinderGeometry args={[(pad.drill / 2) * S, (pad.drill / 2) * S, 0.06, 14]} />
              <meshStandardMaterial color="#08121e" roughness={0.9} />
            </mesh>
          )
        })
      })}

      {layout.traces.map((t) => <Trace3D key={t.id} t={t} W={W} H={H} />)}

      {/* vias mạ vàng */}
      {(layout.vias || []).map((v, i) => (
        <mesh key={'v' + i} position={[(v.x - W / 2) * S, 0, (v.y - H / 2) * S]}>
          <cylinderGeometry args={[0.45 * S, 0.45 * S, 0.2, 12]} />
          <meshStandardMaterial color="#e8c14a" metalness={1} roughness={0.25} />
        </mesh>
      ))}

      {/* Thân linh kiện */}
      {comps.map((c) => <Component3D key={c.ref} c={c} layout={layout} W={W} H={H} />)}

      <ContactShadows position={[0, -0.085, 0]} opacity={0.5} blur={2.2} far={5} resolution={512} color="#000000" />
      <OrbitControls enablePan target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} />
    </>
  )
}

export default function Board3D({ comps, layout }: { comps: PcbComponent[]; layout: PcbLayout }) {
  const r = Math.max(layout.board.w, layout.board.h, 20) * S   // bán kính khung hình theo board
  return (
    <div className="w-full h-full bg-slate-800">
      <Canvas shadows dpr={[1, 1.8]} camera={{ position: [0, r * 1.15, r * 1.3], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={['#11202f']} />
        <Scene comps={comps} layout={layout} />
      </Canvas>
    </div>
  )
}
