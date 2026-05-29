/**
 * SpaceScene — nền 3D vũ trụ (React Three Fiber) cho Hành trình Vũ trụ.
 *
 * Mô phỏng: trường sao chiều sâu (drei <Stars>) + vài hành tinh quay & trôi nhẹ
 * theo màu các điểm đến trong JOURNEY. Lazy-load (three nặng) + ErrorBoundary
 * tự ẩn nếu thiết bị không có WebGL → trang vẫn ổn với starfield CSS bên dưới.
 *
 * pointerEvents:none → không chặn thao tác lên các nút lộ trình phía trên.
 */
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Component, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { JOURNEY } from '@/lib/english/curriculum'

interface PlanetCfg {
  color: string
  radius: number
  pos: [number, number, number]
  spin: number
  bob: number
}

function Planet({ cfg }: { cfg: PlanetCfg }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const m = ref.current
    if (!m) return
    m.rotation.y += cfg.spin
    m.position.y = cfg.pos[1] + Math.sin(state.clock.elapsedTime * 0.35 + cfg.pos[0]) * cfg.bob
  })
  return (
    <mesh ref={ref} position={cfg.pos}>
      <sphereGeometry args={[cfg.radius, 32, 32]} />
      <meshStandardMaterial
        color={cfg.color} roughness={0.75} metalness={0.15}
        emissive={cfg.color} emissiveIntensity={0.18}
      />
    </mesh>
  )
}

function Scene() {
  // Lấy màu từ các điểm đến → đặt rải hai bên cột nội dung, có chiều sâu z
  const planets = useMemo<PlanetCfg[]>(() => {
    const colors = JOURNEY.map(d => d.color)
    const slots: Array<[number, number, number]> = [
      [-5.5, 2.2, -3], [5.2, 1.4, -4], [-4.6, -2.4, -2],
      [5.8, -1.8, -5], [-6.2, 0.2, -6], [4.4, 3.0, -3],
    ]
    return slots.map((pos, i) => ({
      color: colors[(i * 2) % colors.length],
      radius: 0.5 + (i % 3) * 0.35,
      pos,
      spin: 0.002 + (i % 4) * 0.0015,
      bob: 0.15 + (i % 3) * 0.12,
    }))
  }, [])

  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[6, 5, 6]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-8, -3, -4]} intensity={0.6} color="#7fd8e8" />
      <Stars radius={90} depth={60} count={1600} factor={4} saturation={0} fade speed={0.8} />
      {planets.map((cfg, i) => <Planet key={i} cfg={cfg} />)}
    </>
  )
}

/** Ẩn cảnh 3D nếu lỗi (thiếu WebGL…) — không làm sập trang */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { /* nuốt lỗi, dùng fallback CSS bên dưới */ }
  render() { return this.state.failed ? null : this.props.children }
}

export default function SpaceScene() {
  return (
    <SceneBoundary>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 9], fov: 55 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ pointerEvents: 'none' }}
        frameloop="always"
      >
        <Scene />
      </Canvas>
    </SceneBoundary>
  )
}
