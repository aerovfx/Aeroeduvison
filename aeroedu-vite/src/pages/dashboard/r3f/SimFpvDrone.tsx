/**
 * FPV Drone Simulator + WebXR + 5 Levels with Scoring
 *
 * Flow: Setup → LevelSelect → Game → Result → LevelSelect (repeat)
 *
 * Setup screen detects:
 *   - Gamepad/RC controller (auto-pair khi cắm USB)
 *   - WebXR VR headset support
 *   - Fallback: bàn phím/chuột (luyện tập, vẫn play được tất cả levels)
 *
 * 5 levels (độ khó tăng dần):
 *   1. 🌱 Cất cánh — bay lên 5m + giữ 10s (60s,  100đ)
 *   2. 🎯 Vòng đầu — bay qua 1 gate    (60s,  200đ)
 *   3. 🏁 3 vòng — qua 3 gates theo thứ tự (90s, 500đ)
 *   4. ⚡ Tốc độ — 5 gates time trial < 60s (60s, 1000đ)
 *   5. 🏆 Pro — full course + tránh tower (90s, 2000đ)
 *
 * Star rating: 3⭐ < 50% time, 2⭐ < 80%, 1⭐ in time. 0⭐ fail.
 *
 * Progress persist localStorage 'fpv-progress':
 *   { unlockedLevel: 1-5, totalScore, perLevel: { 1: {stars, bestTime, completedAt} } }
 */

import { useRef, useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky, Stars, Text, KeyboardControls, useKeyboardControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// ═════════════════════════════════════════════════════════════
// DRONE MODELS — 3 lựa chọn (procedural + 2 GLTF từ Sketchfab CC-BY-4.0)
// ═════════════════════════════════════════════════════════════
const GCS_BASE = 'https://storage.googleapis.com/aeroedu-media-extreme-lattice-491123-p2/models/drones'

interface DroneModel {
  id: string
  name: string
  emoji: string
  description: string
  /** null = procedural mesh; URL = GLTF file (textures/scene.bin auto-load relative) */
  gltfUrl: string | null
  /** Model-specific transform (vì mỗi model export khác orientation/scale) */
  scale: number
  rotation: [number, number, number]
  position: [number, number, number]
  attribution?: string
}

const DRONE_MODELS: DroneModel[] = [
  {
    id: 'procedural', name: 'AeroEdu FPV', emoji: '🚁',
    description: 'Mẫu mặc định procedural, light-weight, load tức thì',
    gltfUrl: null,
    scale: 1, rotation: [0, 0, 0], position: [0, 0, 0],
  },
  {
    id: 'fpv_drone', name: 'FPV Drone Classic', emoji: '🛸',
    description: 'Mẫu FPV racing 5-inch chuẩn (Sketchfab Jeyhun1985, 3.2MB)',
    gltfUrl: `${GCS_BASE}/fpv_drone/scene.gltf`,
    scale: 0.18, rotation: [0, Math.PI, 0], position: [0, -0.05, 0],
    attribution: 'Jeyhun1985 (CC-BY-4.0)',
  },
  {
    id: 'hornetfpv', name: 'Hornet FPV', emoji: '🦟',
    description: 'Mẫu Hornet FPV chi tiết cao với texture (Sketchfab Mike1980, 32MB)',
    gltfUrl: `${GCS_BASE}/hornetfpv/scene.gltf`,
    scale: 0.25, rotation: [0, Math.PI, 0], position: [0, 0, 0],
    attribution: 'Mike1980 (CC-BY-4.0)',
  },
]

const DEFAULT_MODEL_KEY = 'fpv-selected-model'

function loadSelectedModel(): string {
  try { return localStorage.getItem(DEFAULT_MODEL_KEY) || 'fpv_drone' } catch { return 'fpv_drone' }
}
function saveSelectedModel(id: string) {
  try { localStorage.setItem(DEFAULT_MODEL_KEY, id) } catch {}
}

/** Component load GLTF từ URL — wrapped Suspense ở caller */
function GltfDrone({ url, scale, rotation, position }: {
  url: string; scale: number; rotation: [number, number, number]; position: [number, number, number]
}) {
  const { scene } = useGLTF(url)
  // Clone scene để mỗi instance có transform riêng (useGLTF cache scene shared)
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} scale={scale} rotation={rotation} position={position} />
}

// Preload cả 2 GLTF khi user vào setup screen → khi pick level đã sẵn sàng
function preloadDroneModels() {
  DRONE_MODELS.forEach(m => {
    if (m.gltfUrl) useGLTF.preload(m.gltfUrl)
  })
}

// ═════════════════════════════════════════════════════════════
// LEVEL DEFINITIONS
// ═════════════════════════════════════════════════════════════
type LevelType = 'hover' | 'gates' | 'cargo'
type Vec3 = [number, number, number]
interface Level {
  id: number
  name: string
  emoji: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'pro'
  timeLimit: number          // seconds
  reward: number             // điểm cộng dồn
  type: LevelType
  hover?: { altitude: number; tolerance: number; duration: number }   // hover N giây ở độ cao X±tol
  gates?: Array<{ pos: Vec3; r: number }>                              // qua các gates theo thứ tự
  cargo?: {                                                            // nhiệm vụ giao hàng
    packages: Array<{ pickup: Vec3; drop: Vec3 }>
    enemies?: Array<{ center: Vec3; radius: number; speed: number }>
    poles?: Array<{ pos: Vec3; h: number }>
  }
  hint: string
}

const LEVELS: Level[] = [
  {
    id: 1, name: 'Cất cánh', emoji: '🌱', difficulty: 'easy',
    description: 'Bay lên độ cao 5m và giữ ổn định trong 10 giây',
    timeLimit: 60, reward: 100, type: 'hover',
    hover: { altitude: 5, tolerance: 1, duration: 10 },
    hint: 'Đẩy throttle lên từ từ. Khi đạt 5m (±1m), giữ throttle hover (50%) trong 10s.',
  },
  {
    id: 2, name: 'Vòng đầu', emoji: '🎯', difficulty: 'easy',
    description: 'Bay qua 1 vòng cổng đặt phía trước',
    timeLimit: 60, reward: 200, type: 'gates',
    gates: [{ pos: [0, 4, -8], r: 2.2 }],
    hint: 'Pitch (đẩy stick phải lên) để bay tới. Căn độ cao 4m và bay xuyên giữa vòng.',
  },
  {
    id: 3, name: 'Ba vòng zigzag', emoji: '🏁', difficulty: 'medium',
    description: '3 vòng cổng theo thứ tự, học roll left-right',
    timeLimit: 90, reward: 500, type: 'gates',
    gates: [
      { pos: [ 5, 4, -8],  r: 2.2 },
      { pos: [-5, 5, -16], r: 2.2 },
      { pos: [ 0, 6, -24], r: 2.2 },
    ],
    hint: 'Roll trái/phải khi bay (stick phải nghiêng X). Giảm tốc trước gate để vào chính giữa.',
  },
  {
    id: 4, name: 'Tốc độ trial', emoji: '⚡', difficulty: 'hard',
    description: '5 vòng cổng time trial — bay nhanh nhất có thể',
    timeLimit: 60, reward: 1000, type: 'gates',
    gates: [
      { pos: [ 0,  4, -10], r: 2.0 },
      { pos: [ 8,  6, -20], r: 2.0 },
      { pos: [-8,  8, -30], r: 2.0 },
      { pos: [ 5, 10, -40], r: 2.0 },
      { pos: [ 0, 12, -50], r: 2.0 },
    ],
    hint: 'Throttle 70-80% liên tục. Pitch xuống nhẹ để gain speed. 3⭐ nếu hoàn thành <30s.',
  },
  {
    id: 5, name: 'Pro: Full course', emoji: '🏆', difficulty: 'pro',
    description: 'Bay qua 5 gates rải khắp, có tower obstacle bao quanh',
    timeLimit: 90, reward: 2000, type: 'gates',
    gates: [
      { pos: [ 10,  4,  -8], r: 2.0 },
      { pos: [-15,  8,  20], r: 2.0 },
      { pos: [ 18,  6, -25], r: 2.0 },
      { pos: [-10, 12,  -5], r: 2.0 },
      { pos: [  0,  4, -40], r: 2.0 },
    ],
    hint: 'Yaw + roll combo để xoay theo trục. Né tower xanh. Giữ AOA thấp khi turn nhanh.',
  },
  {
    id: 6, name: 'Giao hàng', emoji: '📦', difficulty: 'expert',
    description: 'Gắp 3 kiện hàng ở bãi LẤY, né drone địch & cọc, thả đúng bãi THẢ',
    timeLimit: 150, reward: 1500, type: 'cargo',
    cargo: {
      packages: [
        { pickup: [-6, 1, -6], drop: [10, 1, -22] },
        { pickup: [8, 1, -4], drop: [-12, 1, -28] },
        { pickup: [0, 1, -34], drop: [6, 1, -10] },
      ],
      enemies: [
        { center: [2, 6, -16], radius: 8, speed: 0.6 },
        { center: [-8, 8, -22], radius: 6, speed: 0.9 },
        { center: [12, 5, -12], radius: 7, speed: 0.75 },
      ],
      poles: [
        { pos: [3, 0, -12], h: 10 }, { pos: [-4, 0, -18], h: 12 },
        { pos: [7, 0, -26], h: 9 }, { pos: [-10, 0, -14], h: 11 },
        { pos: [0, 0, -24], h: 8 }, { pos: [14, 0, -20], h: 10 },
      ],
    },
    hint: 'Bay tới bãi XANH (LẤY) chậm lại để gắp kiện → bay tới bãi XANH DƯƠNG (THẢ). Né drone đỏ và cọc. Theo mũi tên chỉ đường.',
  },
]

// ═════════════════════════════════════════════════════════════
// PROGRESS STORAGE (localStorage)
// ═════════════════════════════════════════════════════════════
interface PerLevelStats {
  stars: number     // 0-3
  bestTime: number  // seconds
  completedAt: string
}
interface Progress {
  unlockedLevel: number
  totalScore: number
  perLevel: Record<number, PerLevelStats>
}
const PROGRESS_KEY = 'fpv-progress'

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { unlockedLevel: 1, totalScore: 0, perLevel: {} }
}

function saveProgress(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)) } catch {}
}

function calculateStars(elapsed: number, timeLimit: number): number {
  const ratio = elapsed / timeLimit
  if (ratio <= 0.5) return 3
  if (ratio <= 0.8) return 2
  return 1
}

// ═════════════════════════════════════════════════════════════
// DJI-FPV STYLE QUADCOPTER MESH
// Inspired by DJI FPV combat drone: shark-nose body, tri-blade props với
// red tips, gimbal camera nổi phía trước, motor pods góc forward, landing
// legs, top cooling intake.
// ═════════════════════════════════════════════════════════════

/** Motor pod (bell shape giống DJI 1804 motor) */
function MotorPod() {
  return (
    <group>
      {/* Body motor (silver bell) */}
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.045, 0.04, 0.05, 16]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Top cap đen */}
      <mesh position={[0, 0.052, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.005, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} />
      </mesh>
      {/* Bell vòng đỏ accent ở chân motor */}
      <mesh position={[0, 0.001, 0]}>
        <torusGeometry args={[0.045, 0.005, 8, 16]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

function DjiFpvDrone({ propSpeed = 1 }: { propSpeed?: number }) {
  // 4 prop refs để spin
  const propRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])
  useFrame((_state, dt) => {
    const spin = dt * 40 * propSpeed
    propRefs.current.forEach((p, i) => {
      if (p) p.rotation.y += spin * (i % 2 === 0 ? 1 : -1)
    })
  })

  // 4 motor positions — slightly góc forward (DJI X-config thiên về phía trước
  // để cinematic forward flight ổn định hơn)
  const motors: [number, number, number][] = [
    [ 0.32,  0,  0.30],   // FR
    [-0.32,  0,  0.30],   // FL
    [ 0.32,  0, -0.28],   // BR
    [-0.32,  0, -0.28],   // BL
  ]

  return (
    <group>
      {/* ── Body chính (shark-nose elongated) ── */}
      <mesh castShadow position={[0, 0.02, 0.02]}>
        <boxGeometry args={[0.32, 0.08, 0.42]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Front nose taper (sharp shark nose) */}
      <mesh castShadow position={[0, 0.02, 0.27]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.12, 0.18, 4]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Top cooling intake (grille đen với LED đỏ) */}
      <mesh position={[0, 0.07, -0.02]}>
        <boxGeometry args={[0.18, 0.03, 0.22]} />
        <meshStandardMaterial color="#0a0a0f" roughness={0.9} />
      </mesh>
      {/* LED bar đỏ (signature DJI FPV night light) */}
      <mesh position={[0, 0.085, 0.05]}>
        <boxGeometry args={[0.08, 0.01, 0.015]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={1.5} />
      </mesh>
      {/* Battery pack phía sau (visible) */}
      <mesh position={[0, 0.06, -0.18]}>
        <boxGeometry args={[0.16, 0.05, 0.14]} />
        <meshStandardMaterial color="#dc2626" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Battery LED indicator (4 chấm) */}
      {[-0.045, -0.015, 0.015, 0.045].map((x, i) => (
        <mesh key={`bat-led-${i}`} position={[x, 0.087, -0.18]}>
          <boxGeometry args={[0.012, 0.005, 0.012]} />
          <meshStandardMaterial color={i < 3 ? '#22c55e' : '#fbbf24'} emissive={i < 3 ? '#22c55e' : '#fbbf24'} emissiveIntensity={0.8} />
        </mesh>
      ))}

      {/* ── Camera gimbal (DJI signature: bulbous head với big lens) ── */}
      <group position={[0, -0.01, 0.32]}>
        {/* Gimbal body */}
        <mesh>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshStandardMaterial color="#0a0a0f" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Lens housing — rotation trên mesh, KHÔNG phải geometry */}
        <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.04, 16]} />
          <meshStandardMaterial color="#0a0a0f" metalness={0.9} />
        </mesh>
        {/* Glass lens (blue tint) */}
        <mesh position={[0, 0, 0.072]}>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial color="#1e293b" emissive="#1e40af" emissiveIntensity={0.4} metalness={0.95} roughness={0.05} />
        </mesh>
        {/* Lens reflection ring */}
        <mesh position={[0, 0, 0.073]}>
          <ringGeometry args={[0.038, 0.045, 24]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* ── 4 motor arms + motors + props ── */}
      {motors.map((pos, i) => {
        const isFront = pos[2] > 0
        // Arm tilt forward 5° để có cinematic forward bias
        return (
          <group key={i} position={pos}>
            {/* Arm carbon tube từ body ra motor — cylinder dọc theo Y default,
                cần rotate Z 90° để nằm ngang dọc theo X (hướng arm) */}
            <mesh
              position={[-pos[0] * 0.5, 0, -pos[2] * 0.5]}
              rotation={[
                Math.PI / 2,
                0,
                Math.atan2(-pos[0], -pos[2]) + Math.PI / 2,
              ]}
            >
              <cylinderGeometry args={[0.02, 0.02, 0.42, 8]} />
              <meshStandardMaterial color="#1c1917" roughness={0.7} />
            </mesh>
            {/* Motor pod (đặt thẳng đứng tại đầu arm) */}
            <MotorPod />
            {/* Tri-blade prop spinning (3 cánh + tip đỏ DJI signature) */}
            <group position={[0, 0.07, 0]} ref={(el) => { propRefs.current[i] = el }}>
              {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, b) => (
                <group key={b} rotation={[0, angle, 0]}>
                  {/* Cánh chính carbon đen */}
                  <mesh position={[0.13, 0, 0]} rotation={[0, 0, 0.06]}>
                    <boxGeometry args={[0.26, 0.005, 0.022]} />
                    <meshStandardMaterial color="#1c1917" roughness={0.6} />
                  </mesh>
                  {/* Tip đỏ */}
                  <mesh position={[0.25, 0, 0]}>
                    <boxGeometry args={[0.05, 0.007, 0.024]} />
                    <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
                  </mesh>
                </group>
              ))}
              {/* Hub đỏ trung tâm */}
              <mesh>
                <cylinderGeometry args={[0.022, 0.022, 0.012, 12]} />
                <meshStandardMaterial color="#dc2626" metalness={0.5} />
              </mesh>
            </group>
            {/* LED arm tip (front = white, back = red — orientation indicator) */}
            <mesh position={[0, -0.005, 0]}>
              <sphereGeometry args={[0.012, 8, 6]} />
              <meshStandardMaterial
                color={isFront ? '#ffffff' : '#dc2626'}
                emissive={isFront ? '#ffffff' : '#dc2626'}
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        )
      })}

      {/* ── Landing legs (2 chân kép) ── */}
      {[-0.12, 0.12].map((x, i) => (
        <group key={`leg-${i}`} position={[x, -0.02, 0]}>
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[0.015, 0.08, 0.015]} />
            <meshStandardMaterial color="#1c1917" />
          </mesh>
          {/* Foot pad */}
          <mesh position={[0, -0.085, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.005, 8]} />
            <meshStandardMaterial color="#0a0a0f" />
          </mesh>
        </group>
      ))}

      {/* ── Tail antenna stub (telemetry/video TX) ── */}
      <mesh position={[0, 0.13, -0.21]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.005, 0.12, 6]} />
        <meshStandardMaterial color="#1c1917" />
      </mesh>
      <mesh position={[0, 0.19, -0.23]}>
        <sphereGeometry args={[0.008, 6, 4]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={1.5} />
      </mesh>
    </group>
  )
}

/** Backward-compat alias (component cũ tên Quadcopter) */
const Quadcopter = DjiFpvDrone

// ═════════════════════════════════════════════════════════════
// SCENERY COMPONENTS — terrain, trees, buildings, obstacles
// ═════════════════════════════════════════════════════════════

/** Hill — half-sphere mound, tô màu cỏ rừng */
function Hill({ pos, r, color = '#15803d' }: { pos: [number, number, number]; r: number; color?: string }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

/** Tree — trunk + 2 cone canopy */
function Tree({ pos, scale = 1, dead = false }: { pos: [number, number, number]; scale?: number; dead?: boolean }) {
  const leafColor = dead ? '#78350f' : '#166534'
  const leafColor2 = dead ? '#92400e' : '#15803d'
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 2, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <coneGeometry args={[1.3, 2.4, 8]} />
        <meshStandardMaterial color={leafColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 4, 0]} castShadow>
        <coneGeometry args={[0.95, 2, 8]} />
        <meshStandardMaterial color={leafColor2} roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Forest cluster — N cây quanh tâm */
function ForestCluster({ center, count, spread, scaleVar = true }: {
  center: [number, number, number]; count: number; spread: number; scaleVar?: boolean
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + (i * 0.7)
        const r = spread * (0.3 + ((i * 13) % 7) / 10)
        const x = center[0] + Math.cos(a) * r
        const z = center[2] + Math.sin(a) * r
        const sc = scaleVar ? (0.7 + ((i * 17) % 5) * 0.18) : 1
        return <Tree key={i} pos={[x, center[1], z]} scale={sc} />
      })}
    </>
  )
}

/** Building — block với cửa sổ phát sáng (city night look) */
function Building({ pos, w, h, d, color = '#475569', litWindows = true }: {
  pos: [number, number, number]; w: number; h: number; d: number; color?: string; litWindows?: boolean
}) {
  const floors = Math.max(1, Math.floor(h / 2.5))
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Roof slab */}
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, h + 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2.5, 6]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.4} />
      </mesh>
      {/* Front-face windows (yellow if lit) */}
      {litWindows && Array.from({ length: floors }).map((_, fi) => (
        <mesh key={`f${fi}`} position={[0, 1.5 + fi * 2.5, d / 2 + 0.02]}>
          <planeGeometry args={[w * 0.78, 0.7]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Back-face windows */}
      {litWindows && Array.from({ length: floors }).map((_, fi) => (
        <mesh key={`b${fi}`} position={[0, 1.5 + fi * 2.5, -d / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[w * 0.78, 0.7]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/** Scaffold — open metal frame tower */
function Scaffold({ pos, h }: { pos: [number, number, number]; h: number }) {
  const w = 2
  const corners: [number, number][] = [[w / 2, w / 2], [-w / 2, w / 2], [w / 2, -w / 2], [-w / 2, -w / 2]]
  const levels = Math.max(2, Math.floor(h / 2))
  return (
    <group position={pos}>
      {corners.map(([x, z], i) => (
        <mesh key={`p${i}`} position={[x, h / 2, z]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, h, 6]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {Array.from({ length: levels }).map((_, li) => (
        <group key={`l${li}`} position={[0, li * 2 + 1, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, w / 2]}>
            <cylinderGeometry args={[0.06, 0.06, w, 6]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, -w / 2]}>
            <cylinderGeometry args={[0.06, 0.06, w, 6]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[w / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, w, 6]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[-w / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, w, 6]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} />
          </mesh>
        </group>
      ))}
      {/* Warning red light on top */}
      <mesh position={[0, h + 0.2, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={1.5} />
      </mesh>
    </group>
  )
}

/** Hangar — half-cylinder arch building */
function Hangar({ pos, rotY = 0 }: { pos: [number, number, number]; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* Arch roof */}
      <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[6, 6, 14, 20, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* End walls (semicircle) */}
      <mesh position={[0, 3, 7]} castShadow>
        <circleGeometry args={[6, 20, 0, Math.PI]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 3, -7]} rotation={[0, Math.PI, 0]} castShadow>
        <circleGeometry args={[6, 20, 0, Math.PI]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {/* Door front (lit) */}
      <mesh position={[0, 2.5, 7.05]}>
        <planeGeometry args={[7, 5]} />
        <meshStandardMaterial color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      {/* HANGAR text */}
      <Text position={[0, 5.5, 7.1]} fontSize={0.6} color="#fbbf24" anchorX="center">HANGAR</Text>
    </group>
  )
}

/** Water tower — red cylindrical tank on legs */
function WaterTower({ pos }: { pos: [number, number, number] }) {
  const legs: [number, number][] = [[1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]]
  return (
    <group position={pos}>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, 5, z]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 10, 6]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Cross braces */}
      {[1, 3, 6].map((y, i) => (
        <group key={`brace${i}`}>
          <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 4.2, 6]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 4.2, 6]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        </group>
      ))}
      {/* Tank */}
      <mesh position={[0, 12, 0]} castShadow>
        <cylinderGeometry args={[2.8, 2.8, 4.5, 16]} />
        <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Top dome */}
      <mesh position={[0, 14.5, 0]} castShadow>
        <sphereGeometry args={[2.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* H₂O text */}
      <Text position={[0, 12.5, 2.85]} fontSize={1.2} color="#fbbf24" anchorX="center">H₂O</Text>
    </group>
  )
}

/** Billboard — large flat sign on 2 posts */
function Billboard({ pos, text, rotY = 0, color = '#fbbf24' }: {
  pos: [number, number, number]; text: string; rotY?: number; color?: string
}) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[-2.2, 4, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 8, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.5} />
      </mesh>
      <mesh position={[2.2, 4, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 8, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.5} />
      </mesh>
      {/* Board (double-sided) */}
      <mesh position={[0, 7, 0]} castShadow>
        <boxGeometry args={[6.5, 3.2, 0.25]} />
        <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.7} />
      </mesh>
      <Text position={[0, 7, 0.13]} fontSize={0.7} color={color} anchorX="center" anchorY="middle"
        maxWidth={6} textAlign="center">{text}</Text>
      <Text position={[0, 7, -0.13]} rotation={[0, Math.PI, 0]} fontSize={0.7} color={color}
        anchorX="center" anchorY="middle" maxWidth={6} textAlign="center">{text}</Text>
    </group>
  )
}

/** Bridge — flat platform on multiple posts (fly under hoặc above) */
function Bridge({ pos, length, height, rotY = 0 }: {
  pos: [number, number, number]; length: number; height: number; rotY?: number
}) {
  const postCount = Math.max(2, Math.floor(length / 6))
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* Deck */}
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.4, 4]} />
        <meshStandardMaterial color="#475569" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Side rails */}
      <mesh position={[0, height + 0.6, 1.95]}>
        <boxGeometry args={[length, 1, 0.1]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, height + 0.6, -1.95]}>
        <boxGeometry args={[length, 1, 0.1]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
      {/* Posts */}
      {Array.from({ length: postCount }).map((_, i) => {
        const x = -length / 2 + (i / (postCount - 1)) * length
        return (
          <group key={i}>
            <mesh position={[x, height / 2, 1.8]} castShadow>
              <cylinderGeometry args={[0.25, 0.3, height, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.4} />
            </mesh>
            <mesh position={[x, height / 2, -1.8]} castShadow>
              <cylinderGeometry args={[0.25, 0.3, height, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.4} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Procedural ground — heightmap with subtle rolling hills, vertex-displaced.
 * Skip displacement trong vòng 8m từ origin để spawn pad luôn phẳng.
 */
function ProceduralGround({ size = 400, segments = 60, color = '#1a4f3a' }: {
  size?: number; segments?: number; color?: string
}) {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, segments, segments)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)   // pre-rotation: local Y → world -Z
      const distSq = x * x + y * y
      if (distSq < 64) continue   // flat zone radius 8m
      // Layered sin/cos cho low-freq rolling hills
      const h =
        Math.sin(x * 0.04) * Math.cos(y * 0.04) * 1.5 +
        Math.sin(x * 0.09 + 1) * Math.cos(y * 0.07 + 2) * 0.6 +
        Math.sin(x * 0.18 + 3) * 0.2
      pos.setZ(i, h)
    }
    g.computeVertexNormals()
    return g
  }, [size, segments])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

// ═════════════════════════════════════════════════════════════
// PER-LEVEL SCENERY — placement hand-tuned per level, không
// chặn flight path qua các gates
// ═════════════════════════════════════════════════════════════
function LevelScenery({ levelId }: { levelId: number }) {
  switch (levelId) {
    case 1:
      // Sunset meadow — open, distant trees, 2 small hills
      return (
        <>
          <Hill pos={[20, 0, 18]} r={5} />
          <Hill pos={[-22, 0, -15]} r={6} color="#14532d" />
          <Hill pos={[18, 0, -20]} r={4} />
          <ForestCluster center={[28, 0, 0]} count={8} spread={6} />
          <ForestCluster center={[-28, 0, 5]} count={7} spread={5} />
          <ForestCluster center={[0, 0, 30]} count={10} spread={8} />
          <ForestCluster center={[0, 0, -32]} count={9} spread={7} />
          <Billboard pos={[0, 0, -25]} text="🌱 LEVEL 1: HOVER 5m" color="#22c55e" />
        </>
      )
    case 2:
      // Forest path — gate at z=-8, flanked by trees, hill behind
      return (
        <>
          {/* Trees lining approach (avoid x ∈ [-3,3], z ∈ [-12,-4]) */}
          <Tree pos={[-7, 0, -3]} scale={1.2} />
          <Tree pos={[-8, 0, -7]} scale={1.0} />
          <Tree pos={[-6, 0, -11]} scale={1.3} />
          <Tree pos={[7, 0, -3]} scale={1.1} />
          <Tree pos={[8, 0, -7]} scale={1.2} />
          <Tree pos={[6, 0, -11]} scale={1.0} />
          {/* Hill behind gate */}
          <Hill pos={[0, 0, -20]} r={8} />
          <ForestCluster center={[0, 0, -28]} count={12} spread={10} />
          <ForestCluster center={[20, 0, -10]} count={6} spread={6} />
          <ForestCluster center={[-20, 0, -10]} count={6} spread={6} />
          <ForestCluster center={[15, 0, 12]} count={5} spread={5} />
          <ForestCluster center={[-15, 0, 12]} count={5} spread={5} />
          <Billboard pos={[-12, 0, -2]} text="🎯 GATE 1" color="#ec4899" rotY={0.4} />
        </>
      )
    case 3:
      // Hill country slalom — 3 zigzag gates ((5,4,-8), (-5,5,-16), (0,6,-24))
      return (
        <>
          {/* Hills between/beside gates (avoid gate radius 2.2) */}
          <Hill pos={[-6, 0, -8]} r={4} />
          <Hill pos={[6, 0, -16]} r={4} />
          <Hill pos={[-6, 0, -24]} r={4} color="#14532d" />
          <Hill pos={[6, 0, -24]} r={3} />
          {/* Forest patches */}
          <ForestCluster center={[12, 0, -8]} count={5} spread={4} />
          <ForestCluster center={[-12, 0, -16]} count={5} spread={4} />
          <ForestCluster center={[12, 0, -24]} count={4} spread={3} />
          <ForestCluster center={[-12, 0, -32]} count={6} spread={5} />
          {/* Bridge across path at z=-30 (under or over) */}
          <Bridge pos={[0, 0, -30]} length={20} height={2} rotY={Math.PI / 2} />
          <ForestCluster center={[20, 0, 5]} count={8} spread={7} />
          <ForestCluster center={[-20, 0, 5]} count={8} spread={7} />
          <Hill pos={[0, 0, 25]} r={10} color="#14532d" />
          <Billboard pos={[14, 0, -8]} text="🏁 ZIGZAG" color="#fbbf24" rotY={-0.4} />
        </>
      )
    case 4:
      // Race track — gates at (0,4,-10), (8,6,-20), (-8,8,-30), (5,10,-40), (0,12,-50)
      return (
        <>
          {/* Billboards alongside */}
          <Billboard pos={[12, 0, -10]} text="⚡ START" color="#22c55e" rotY={-0.3} />
          <Billboard pos={[-12, 0, -10]} text="GO!" color="#fbbf24" rotY={0.3} />
          <Billboard pos={[14, 0, -25]} text="CHECKPOINT" color="#06b6d4" rotY={-0.3} />
          <Billboard pos={[-14, 0, -35]} text="HALFWAY" color="#a78bfa" rotY={0.3} />
          <Billboard pos={[12, 0, -50]} text="🏆 FINISH" color="#ef4444" rotY={-0.4} />
          {/* Scaffold time markers */}
          <Scaffold pos={[15, 0, -20]} h={12} />
          <Scaffold pos={[-15, 0, -30]} h={14} />
          <Scaffold pos={[15, 0, -40]} h={16} />
          <Scaffold pos={[-15, 0, -45]} h={18} />
          {/* Bridge to fly under/over at z=-35 (at height 3, gates above) */}
          <Bridge pos={[0, 0, -35]} length={26} height={3} rotY={Math.PI / 2} />
          {/* Hills along edges */}
          <Hill pos={[22, 0, -15]} r={5} />
          <Hill pos={[-22, 0, -25]} r={5} />
          <Hill pos={[22, 0, -45]} r={6} color="#14532d" />
          {/* Forest perimeters */}
          <ForestCluster center={[28, 0, -25]} count={10} spread={8} />
          <ForestCluster center={[-28, 0, -40]} count={10} spread={8} />
          <ForestCluster center={[0, 0, -65]} count={12} spread={10} />
          <ForestCluster center={[0, 0, 15]} count={8} spread={7} />
        </>
      )
    case 5:
      // Urban warzone — gates spread (10,4,-8), (-15,8,20), (18,6,-25), (-10,12,-5), (0,4,-40)
      return (
        <>
          {/* Building cluster — north (avoid gate at -10,12,-5 = need clearance) */}
          <Building pos={[-22, 0, -10]} w={6} h={14} d={6} color="#475569" />
          <Building pos={[-22, 0, 0]} w={6} h={18} d={6} color="#334155" />
          <Building pos={[-15, 0, -18]} w={5} h={10} d={5} color="#64748b" />
          {/* East tower row (avoid gate 10,4,-8 cylinder ±2.2) */}
          <Building pos={[16, 0, -2]} w={6} h={20} d={6} color="#475569" />
          <Building pos={[22, 0, -8]} w={5} h={16} d={5} color="#334155" />
          <Building pos={[16, 0, -18]} w={6} h={12} d={6} color="#64748b" />
          {/* Hangar (south near spawn-back) */}
          <Hangar pos={[0, 0, 28]} rotY={Math.PI / 2} />
          {/* Water tower */}
          <WaterTower pos={[-25, 0, -30]} />
          <WaterTower pos={[25, 0, 18]} />
          {/* Scaffolds (between gates) */}
          <Scaffold pos={[5, 0, -15]} h={10} />
          <Scaffold pos={[-5, 0, -32]} h={14} />
          <Scaffold pos={[8, 0, -45]} h={16} />
          <Scaffold pos={[-20, 0, 12]} h={12} />
          {/* Bridges (đặt ở perimeter, không chặn gate hay xuyên building) */}
          <Bridge pos={[28, 0, -20]} length={18} height={3} rotY={Math.PI / 2} />
          <Bridge pos={[-28, 0, 5]} length={20} height={3} rotY={Math.PI / 2} />
          {/* Billboards */}
          <Billboard pos={[10, 0, 5]} text="⚡ FPV PRO" color="#ec4899" rotY={-0.5} />
          <Billboard pos={[-10, 0, -45]} text="DANGER ZONE" color="#ef4444" rotY={0.6} />
          <Billboard pos={[20, 0, -35]} text="↑ GATE" color="#fbbf24" rotY={-0.7} />
          {/* Trees around perimeter */}
          <ForestCluster center={[30, 0, 0]} count={10} spread={6} />
          <ForestCluster center={[-30, 0, 25]} count={9} spread={7} />
          <ForestCluster center={[0, 0, -55]} count={12} spread={9} />
          <ForestCluster center={[30, 0, -50]} count={8} spread={6} />
          {/* Hills */}
          <Hill pos={[35, 0, 30]} r={8} color="#14532d" />
          <Hill pos={[-35, 0, -45]} r={9} />
          {/* Misc dead trees for atmosphere */}
          <Tree pos={[8, 0, 12]} scale={1.5} dead />
          <Tree pos={[-8, 0, -22]} scale={1.4} dead />
        </>
      )
    default:
      return null
  }
}

// ═════════════════════════════════════════════════════════════
// LEVEL ENVIRONMENT — gates change theo level + scenery riêng
// ═════════════════════════════════════════════════════════════
function LevelEnvironment({ level, currentGate }: { level: Level; currentGate: number }) {
  return (
    <>
      <Sky distance={4500} sunPosition={[100, 20, 100]} inclination={0.49} azimuth={0.25} />
      <Stars radius={200} depth={50} count={3000} factor={4} fade speed={0.5} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[50, 80, 30]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      {/* Hemisphere fill — sky/ground bounce */}
      <hemisphereLight args={['#87ceeb', '#1a4f3a', 0.4]} />

      {/* Procedural undulating ground */}
      <ProceduralGround size={400} segments={60} />
      {/* Subtle grid for ground plane — visible chỉ trong vùng gần */}
      <gridHelper args={[80, 40, '#22c55e44', '#14532d44']} position={[0, 0.02, 0]} />

      {/* Per-level scenery (terrain + obstacles) */}
      <LevelScenery levelId={level.id} />

      {/* Gates — current gate sáng vàng glow, qua rồi xanh, chưa tới hồng */}
      {(level.gates || []).map((g, i) => {
        const isCurrent = i === currentGate
        const isPast = i < currentGate
        const color = isCurrent ? '#fbbf24' : isPast ? '#10b981' : '#ec4899'
        return (
          <group key={`gate-${i}`} position={g.pos}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[g.r, 0.18, 8, 32]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isCurrent ? 0.8 : 0.4} />
            </mesh>
            <Text position={[0, g.r + 0.5, 0]} fontSize={0.6} color={color} anchorX="center">
              {i + 1}
            </Text>
          </group>
        )
      })}

      {/* Hover target marker (level 1) */}
      {level.type === 'hover' && level.hover && (
        <group position={[0, level.hover.altitude, 0]}>
          <mesh>
            <torusGeometry args={[1.5, 0.05, 8, 32]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
          </mesh>
          <Text position={[0, 1, 0]} fontSize={0.5} color="#fbbf24" anchorX="center">
            HOVER HERE {level.hover.altitude}m
          </Text>
        </group>
      )}

      {/* Spawn pad */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.4} />
      </mesh>
    </>
  )
}

// ═════════════════════════════════════════════════════════════
// PHYSICS + DRONE RIG (gần giống cũ, thêm callback hit gate / hover stable)
// ═════════════════════════════════════════════════════════════
interface DroneState {
  pos: THREE.Vector3
  vel: THREE.Vector3
  yaw: number
  pitch: number
  roll: number
  battery: number
}
interface ControlInputs { throttle: number; yaw: number; pitch: number; roll: number }
const PHYSICS = {
  thrustGain: 25, yawRate: 3, pitchRate: 2.5, rollRate: 2.5,
  airDrag: 0.92, gravity: 9.81, maxAltitude: 80, batteryDrain: 0.5,
}

function DroneRig({
  inputs, level, model, onTelemetry, onGatePass, onHoverProgress, onCrash, posRef,
}: {
  inputs: React.MutableRefObject<ControlInputs>
  level: Level
  model: DroneModel
  onTelemetry: (s: DroneState) => void
  onGatePass: (idx: number) => void
  onHoverProgress: (secondsHeld: number) => void
  onCrash: () => void
  posRef?: React.MutableRefObject<THREE.Vector3>
}) {
  const groupRef = useRef<THREE.Group>(null)
  const stateRef = useRef<DroneState>({
    pos: new THREE.Vector3(0, 0.5, 0), vel: new THREE.Vector3(),
    yaw: 0, pitch: 0, roll: 0, battery: 100,
  })
  const hoverHeldRef = useRef(0)
  const lastGateCheckedRef = useRef(-1)
  const { camera } = useThree()
  // Làm mượt kiểu UE5: input low-pass + camera lerp + FOV theo tốc độ
  const inSmooth = useRef<ControlInputs>({ throttle: 0, yaw: 0, pitch: 0, roll: 0 })
  const camLook = useRef(new THREE.Vector3(0, 0.5, 1))
  const smooth = (dt: number, tau: number) => 1 - Math.exp(-dt / tau)

  useFrame((_state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30) // clamp để không giật khi frame rớt
    const s = stateRef.current
    const i = inputs.current
    const sm = inSmooth.current
    // Input low-pass → cảm giác mượt, không "bụp" như UE5 (frame-independent)
    const ai = smooth(dt, 0.12)
    sm.throttle += (i.throttle - sm.throttle) * ai
    sm.yaw += (i.yaw - sm.yaw) * ai
    sm.pitch += (i.pitch - sm.pitch) * ai
    sm.roll += (i.roll - sm.roll) * ai

    s.yaw += sm.yaw * PHYSICS.yawRate * dt
    // pitch/roll tiến mượt về góc mục tiêu (ease) thay vì gán tức thì
    const ab = smooth(dt, 0.10)
    s.pitch += (sm.pitch * 0.5 - s.pitch) * (ab + (1 - ab) * 0) // ease tới target
    s.roll += (sm.roll * 0.5 - s.roll) * ab
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw)
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.pitch)
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.roll)
    const orient = yawQ.clone().multiply(pitchQ).multiply(rollQ)
    const thrustVec = new THREE.Vector3(0, 1, 0).applyQuaternion(orient)
    const throttleMag = Math.max(0, (sm.throttle + 1) / 2)
    s.vel.addScaledVector(thrustVec, throttleMag * PHYSICS.thrustGain * dt)
    s.vel.y -= PHYSICS.gravity * dt
    s.vel.multiplyScalar(PHYSICS.airDrag ** (dt * 60))
    s.pos.addScaledVector(s.vel, dt)
    if (s.pos.y < 0.3) {
      s.pos.y = 0.3
      const speedSq = s.vel.lengthSq()
      if (speedSq > 100) onCrash()  // đập đất tốc độ cao = crash
      s.vel.y = Math.max(0, s.vel.y * 0.3)
      s.vel.x *= 0.7; s.vel.z *= 0.7
    }
    if (s.pos.y > PHYSICS.maxAltitude) { s.pos.y = PHYSICS.maxAltitude; s.vel.y = Math.min(0, s.vel.y) }
    if (s.battery > 0) s.battery = Math.max(0, s.battery - throttleMag * PHYSICS.batteryDrain * dt)
    if (posRef) posRef.current.copy(s.pos)

    if (groupRef.current) {
      groupRef.current.position.copy(s.pos)
      groupRef.current.quaternion.copy(orient)
    }
    // Camera mượt: lerp vị trí + điểm nhìn, FOV "punch" theo tốc độ (cảm giác UE5)
    const camOffset = new THREE.Vector3(0, 0.05, 0).applyQuaternion(orient)
    const desiredPos = s.pos.clone().add(camOffset)
    camera.position.lerp(desiredPos, smooth(dt, 0.05))
    const lookTarget = s.pos.clone().add(new THREE.Vector3(0, 0, 1).applyQuaternion(orient))
    camLook.current.lerp(lookTarget, smooth(dt, 0.05))
    camera.lookAt(camLook.current)
    const cam = camera as THREE.PerspectiveCamera
    if (cam.isPerspectiveCamera) {
      const targetFov = 88 + Math.min(22, s.vel.length() * 0.7)
      cam.fov += (targetFov - cam.fov) * smooth(dt, 0.25)
      cam.updateProjectionMatrix()
    }

    // ── Level objective check ──
    if (level.type === 'hover' && level.hover) {
      const dy = Math.abs(s.pos.y - level.hover.altitude)
      const horizDist = Math.sqrt(s.pos.x ** 2 + s.pos.z ** 2)
      if (dy <= level.hover.tolerance && horizDist <= 2 && s.vel.length() < 1.5) {
        hoverHeldRef.current += dt
      } else {
        hoverHeldRef.current = Math.max(0, hoverHeldRef.current - dt * 0.5)  // decay nếu lệch
      }
      onHoverProgress(hoverHeldRef.current)
    } else if (level.type === 'gates' && level.gates) {
      const next = level.gates[lastGateCheckedRef.current + 1]
      if (next) {
        const gPos = new THREE.Vector3(...next.pos)
        if (s.pos.distanceTo(gPos) < next.r) {
          lastGateCheckedRef.current++
          onGatePass(lastGateCheckedRef.current)
        }
      }
    }
    onTelemetry({ ...s, pos: s.pos.clone(), vel: s.vel.clone() })
  })

  const propSpeed = Math.max(0.1, (inputs.current.throttle + 1) / 2)
  return (
    <group ref={groupRef}>
      {model.gltfUrl ? (
        // GLTF model — Suspense fallback ở caller, primitive sẽ mount khi load xong
        <GltfDrone url={model.gltfUrl} scale={model.scale}
          rotation={model.rotation} position={model.position} />
      ) : (
        <Quadcopter propSpeed={propSpeed} />
      )}
    </group>
  )
}

// ═════════════════════════════════════════════════════════════
// INPUT HOOKS (gamepad + keyboard, giống cũ)
// ═════════════════════════════════════════════════════════════
function useGamepadInput(inputsRef: React.MutableRefObject<ControlInputs>) {
  const [connected, setConnected] = useState<string | null>(null)
  useEffect(() => {
    const onC = (e: GamepadEvent) => setConnected(e.gamepad.id)
    const onD = () => setConnected(null)
    window.addEventListener('gamepadconnected', onC as EventListener)
    window.addEventListener('gamepaddisconnected', onD as EventListener)
    // Initial check (browser may already see plugged controller)
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    const p = Array.from(pads).find(p => p && p.connected)
    if (p) setConnected(p.id)
    return () => {
      window.removeEventListener('gamepadconnected', onC as EventListener)
      window.removeEventListener('gamepaddisconnected', onD as EventListener)
    }
  }, [])
  useEffect(() => {
    let raf: number
    const dz = (v: number) => Math.abs(v) < 0.08 ? 0 : v
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      const pad = Array.from(pads).find(p => p && p.connected)
      if (pad) {
        inputsRef.current.yaw = dz(pad.axes[0] || 0)
        inputsRef.current.throttle = dz(-(pad.axes[1] || 0))
        inputsRef.current.roll = dz(pad.axes[2] || 0)
        inputsRef.current.pitch = dz(-(pad.axes[3] || 0))
      }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  }, [inputsRef])
  return connected
}

function KeyboardBridge({ inputsRef }: { inputsRef: React.MutableRefObject<ControlInputs> }) {
  const [, getKeys] = useKeyboardControls()
  useFrame(() => {
    const k = getKeys() as Record<string, boolean>
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    if (Array.from(pads).some(p => p && p.connected)) return
    // Nếu touch input đang active (touched) thì keyboard không override
    if (touchActiveRef.left || touchActiveRef.right) return
    inputsRef.current.throttle = (k.throttleUp ? 1 : 0) - (k.throttleDown ? 1 : 0)
    inputsRef.current.yaw = (k.yawRight ? 1 : 0) - (k.yawLeft ? 1 : 0)
    inputsRef.current.pitch = (k.pitchUp ? 1 : 0) - (k.pitchDown ? 1 : 0)
    inputsRef.current.roll = (k.rollRight ? 1 : 0) - (k.rollLeft ? 1 : 0)
  })
  return null
}

// ═════════════════════════════════════════════════════════════
// MOBILE TOUCH — 2 virtual sticks (Mode 2 RC layout)
// ═════════════════════════════════════════════════════════════
// Module-scoped ref để KeyboardBridge biết khi touch đang active
// (avoid keyboard reset inputs khi user đang giữ stick)
const touchActiveRef = { left: false, right: false }

function isMobile(): boolean {
  return typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  )
}

interface StickProps {
  side: 'left' | 'right'
  label: string
  axisLabels: { x: string; y: string }
  inputsRef: React.MutableRefObject<ControlInputs>
  /** Map (dx, dy) ∈ [-1, 1] → 2 trục input */
  onMove: (dx: number, dy: number, inputs: ControlInputs) => void
  /** Khi nhả stick: reset 2 trục về 0 (hoặc giữ nguyên) */
  onRelease: (inputs: ControlInputs) => void
}

/** Virtual joystick — outer base + inner knob theo dõi finger.
 * Knob clamp trong base radius. Auto-snap về center khi release.
 * Throttle stick (left Y) KHÔNG snap vì cần giữ throttle.
 */
function VirtualStick({ side, label, axisLabels, inputsRef, onMove, onRelease }: StickProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const RADIUS = 60   // px — outer base radius

  const updateFromTouch = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return
    const r = baseRef.current.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > RADIUS) { dx = (dx / dist) * RADIUS; dy = (dy / dist) * RADIUS }
    setKnobPos({ x: dx, y: dy })
    // Map sang [-1, 1], invert Y (touch Y down = positive nhưng game up = positive)
    onMove(dx / RADIUS, -dy / RADIUS, inputsRef.current)
  }, [inputsRef, onMove])

  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setActive(true)
    touchActiveRef[side] = true
    const t = 'touches' in e ? e.touches[0] : e
    updateFromTouch(t.clientX, t.clientY)
  }, [side, updateFromTouch])

  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!active) return
    e.preventDefault()
    const t = 'touches' in e ? e.touches[0] : e
    updateFromTouch(t.clientX, t.clientY)
  }, [active, updateFromTouch])

  const handleEnd = useCallback(() => {
    setActive(false)
    touchActiveRef[side] = false
    setKnobPos({ x: 0, y: 0 })
    onRelease(inputsRef.current)
  }, [side, inputsRef, onRelease])

  // Global mouseup/touchend listener (vì user có thể release ngoài stick area)
  useEffect(() => {
    if (!active) return
    const onMu = () => handleEnd()
    const onMm = (e: MouseEvent) => updateFromTouch(e.clientX, e.clientY)
    const onTm = (e: TouchEvent) => {
      if (e.touches[0]) updateFromTouch(e.touches[0].clientX, e.touches[0].clientY)
    }
    window.addEventListener('mouseup', onMu)
    window.addEventListener('mousemove', onMm)
    window.addEventListener('touchend', onMu)
    window.addEventListener('touchmove', onTm, { passive: false })
    return () => {
      window.removeEventListener('mouseup', onMu)
      window.removeEventListener('mousemove', onMm)
      window.removeEventListener('touchend', onMu)
      window.removeEventListener('touchmove', onTm)
    }
  }, [active, handleEnd, updateFromTouch])

  return (
    <div style={{
      position: 'absolute', bottom: 24, [side]: 24,
      width: RADIUS * 2 + 20, padding: 10,
      pointerEvents: 'auto', userSelect: 'none', touchAction: 'none',
    } as React.CSSProperties}>
      <div style={{
        textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.6)',
        fontFamily: 'monospace', marginBottom: 6, fontWeight: 'bold',
      }}>
        {label}
      </div>
      <div
        ref={baseRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        style={{
          position: 'relative', width: RADIUS * 2, height: RADIUS * 2, margin: '0 auto',
          borderRadius: '50%',
          background: active ? 'rgba(236, 72, 153, 0.15)' : 'rgba(15, 23, 42, 0.5)',
          border: `2px solid ${active ? '#ec4899' : 'rgba(148, 163, 184, 0.4)'}`,
          backdropFilter: 'blur(4px)',
          transition: active ? 'none' : 'background 0.2s',
        }}
      >
        {/* Crosshair lines */}
        <div style={{ position: 'absolute', top: '50%', left: 4, right: 4, height: 1, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ position: 'absolute', left: '50%', top: 4, bottom: 4, width: 1, background: 'rgba(255,255,255,0.15)' }} />
        {/* Axis labels */}
        <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{axisLabels.y}+</div>
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{axisLabels.y}-</div>
        <div style={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)',
          fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{axisLabels.x}+</div>
        <div style={{ position: 'absolute', top: '50%', left: 4, transform: 'translateY(-50%)',
          fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{axisLabels.x}-</div>
        {/* Knob */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 38, height: 38, marginLeft: -19, marginTop: -19,
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          borderRadius: '50%',
          background: active
            ? 'linear-gradient(135deg, #ec4899, #8b5cf6)'
            : 'rgba(100, 116, 139, 0.7)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: active ? '0 0 16px rgba(236, 72, 153, 0.6)' : '0 2px 6px rgba(0,0,0,0.4)',
          transition: active ? 'none' : 'transform 0.15s',
        }} />
      </div>
    </div>
  )
}

/** Render 2 sticks (Mode 2 RC standard).
 * LEFT stick: Y=throttle (KHÔNG snap về 0 khi release để giữ throttle), X=yaw
 * RIGHT stick: Y=pitch, X=roll (cả 2 snap về 0 khi release)
 */
function MobileTouchSticks({ inputsRef }: { inputsRef: React.MutableRefObject<ControlInputs> }) {
  return (
    <>
      <VirtualStick
        side="left" label="THROTTLE / YAW"
        axisLabels={{ x: 'YAW', y: 'THR' }}
        inputsRef={inputsRef}
        onMove={(dx, dy, ins) => { ins.throttle = dy; ins.yaw = dx }}
        onRelease={(ins) => {
          // Throttle KHÔNG reset (giữ giá trị cuối) — yaw reset 0
          ins.yaw = 0
          // throttle giữ nguyên — user phải kéo lại stick xuống nếu muốn hạ
        }}
      />
      <VirtualStick
        side="right" label="PITCH / ROLL"
        axisLabels={{ x: 'ROLL', y: 'PITCH' }}
        inputsRef={inputsRef}
        onMove={(dx, dy, ins) => { ins.pitch = dy; ins.roll = dx }}
        onRelease={(ins) => { ins.pitch = 0; ins.roll = 0 }}
      />
    </>
  )
}

// ═════════════════════════════════════════════════════════════
// MŨI TÊN CHỈ ĐƯỜNG (3D) — bay tới mục tiêu kế tiếp
// ═════════════════════════════════════════════════════════════
function WaypointGuide({ posRef, target, color = '#22d3ee' }: {
  posRef: React.MutableRefObject<THREE.Vector3>
  target: [number, number, number] | null
  color?: string
}) {
  const arrowRef = useRef<THREE.Group>(null)
  const beaconRef = useRef<THREE.Group>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((_s, dt) => {
    const a = arrowRef.current, b = beaconRef.current
    if (!target) { if (a) a.visible = false; if (b) b.visible = false; return }
    const tp = tmp.set(target[0], target[1], target[2])
    const dp = posRef.current
    const dir = tp.clone().sub(dp)
    const dist = dir.length()
    if (a) {
      a.visible = dist > 1.5
      if (dist > 0.001) {
        dir.normalize()
        a.position.copy(dp).addScaledVector(dir, 2.6)
        a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
        const pulse = 1 + Math.sin(performance.now() / 180) * 0.12
        a.scale.setScalar(pulse)
      }
    }
    if (b) { b.visible = true; b.position.set(tp.x, 0, tp.z) }
  })
  return (
    <>
      {/* Mũi tên trôi phía trước, chỉ về mục tiêu */}
      <group ref={arrowRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.28]}>
          <coneGeometry args={[0.2, 0.42, 18]} />
          <meshBasicMaterial color={color} transparent opacity={0.92} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.34, 14]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
        </mesh>
      </group>
      {/* Cột sáng tại mục tiêu */}
      <group ref={beaconRef}>
        <mesh position={[0, 40, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 80, 12]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.16} toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}

// ═════════════════════════════════════════════════════════════
// ÂM THANH ĐỘNG CƠ DRONE — WebAudio, phản ứng theo throttle
// ═════════════════════════════════════════════════════════════
function DroneSound({ inputsRef, muted }: {
  inputsRef: React.MutableRefObject<ControlInputs>
  muted: boolean
}) {
  useEffect(() => {
    if (muted) return
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
    if (!AC) return
    let ctx: AudioContext | null = null
    let raf = 0
    let stopped = false
    const build = () => {
      if (ctx) return
      ctx = new AC()
      const sr = ctx.sampleRate
      const buf = ctx.createBuffer(1, sr, sr)
      const data = buf.getChannelData(0)
      for (let k = 0; k < sr; k++) data[k] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 200; bp.Q.value = 0.7
      const ng = ctx.createGain(); ng.gain.value = 0
      noise.connect(bp); bp.connect(ng); ng.connect(ctx.destination)
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 80
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900
      const og = ctx.createGain(); og.gain.value = 0
      osc.connect(lp); lp.connect(og); og.connect(ctx.destination)
      noise.start(); osc.start()
      const loop = () => {
        if (stopped || !ctx) return
        const thr = Math.max(0, (inputsRef.current.throttle + 1) / 2)
        const t = ctx.currentTime
        ng.gain.setTargetAtTime(0.035 + thr * 0.11, t, 0.05)
        og.gain.setTargetAtTime(0.012 + thr * 0.045, t, 0.05)
        osc.frequency.setTargetAtTime(68 + thr * 190, t, 0.05)
        bp.frequency.setTargetAtTime(160 + thr * 240, t, 0.05)
        raf = requestAnimationFrame(loop)
      }
      loop()
    }
    const resume = () => { build(); ctx?.resume?.() }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    build() // thử khởi tạo ngay (có thể suspended tới khi có gesture)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      ctx?.close?.()
    }
  }, [inputsRef, muted])
  return null
}

// ═════════════════════════════════════════════════════════════
// SFX một-lần (va chạm / giao hàng) — WebAudio dùng chung
// ═════════════════════════════════════════════════════════════
let sfxCtx: AudioContext | null = null
function sfxTone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.18) {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
    if (!AC) return
    sfxCtx = sfxCtx || new AC()
    const o = sfxCtx.createOscillator(), g = sfxCtx.createGain()
    o.type = type; o.frequency.value = freq
    o.connect(g); g.connect(sfxCtx.destination)
    const t = sfxCtx.currentTime
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.start(t); o.stop(t + dur + 0.02)
  } catch { /* ignore */ }
}
const playHit = () => sfxTone(130, 0.25, 'square', 0.22)
const playPickup = () => sfxTone(520, 0.12, 'triangle', 0.18)
const playDeliver = () => { sfxTone(660, 0.12, 'triangle', 0.18); setTimeout(() => sfxTone(880, 0.18, 'triangle', 0.18), 90) }

// ═════════════════════════════════════════════════════════════
// CARGO / ENEMY / OBSTACLE (chế độ Giao hàng)
// ═════════════════════════════════════════════════════════════
function CargoCrate() {
  return (
    <group>
      <mesh castShadow><boxGeometry args={[0.7, 0.55, 0.7]} /><meshStandardMaterial color="#b45309" /></mesh>
      <mesh position={[0, 0.28, 0]}><boxGeometry args={[0.74, 0.05, 0.18]} /><meshStandardMaterial color="#fbbf24" /></mesh>
      <mesh position={[0, 0.28, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.74, 0.05, 0.18]} /><meshStandardMaterial color="#fbbf24" /></mesh>
    </group>
  )
}
function Pad({ pos, color, label }: { pos: Vec3; color: string; label: string }) {
  return (
    <group position={[pos[0], 0.06, pos[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.5, 2.1, 36]} /><meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><circleGeometry args={[1.5, 36]} /><meshBasicMaterial color={color} transparent opacity={0.14} side={THREE.DoubleSide} /></mesh>
      <Text position={[0, 2.6, 0]} fontSize={0.7} color={color} anchorX="center" outlineWidth={0.05} outlineColor="#000">{label}</Text>
    </group>
  )
}
function CargoMission({ posRef, packages, onState, onComplete }: {
  posRef: React.MutableRefObject<THREE.Vector3>
  packages: Array<{ pickup: Vec3; drop: Vec3 }>
  onState: (idx: number, carrying: boolean) => void
  onComplete: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [carrying, setCarrying] = useState(false)
  const idxRef = useRef(0), carryingRef = useRef(false), doneRef = useRef(false)
  const boxRef = useRef<THREE.Group>(null)
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    if (doneRef.current) return
    const pkg = packages[idxRef.current]
    if (!pkg) return
    const dp = posRef.current
    if (!carryingRef.current) {
      if (boxRef.current) boxRef.current.position.set(pkg.pickup[0], pkg.pickup[1], pkg.pickup[2])
      if (dp.distanceTo(v.set(...pkg.pickup)) < 2.2) {
        carryingRef.current = true; setCarrying(true); onState(idxRef.current, true); playPickup()
      }
    } else {
      if (boxRef.current) boxRef.current.position.set(dp.x, dp.y - 0.45, dp.z)
      if (dp.distanceTo(v.set(...pkg.drop)) < 2.2) {
        carryingRef.current = false; setCarrying(false)
        const next = idxRef.current + 1; idxRef.current = next; setIdx(next); onState(next, false); playDeliver()
        if (next >= packages.length) { doneRef.current = true; onComplete() }
      }
    }
  })
  const pkg = packages[idx]
  return (
    <>
      <group ref={boxRef} visible={!!pkg}><CargoCrate /></group>
      {pkg && <Pad pos={pkg.pickup} color="#22c55e" label={carrying ? '...' : 'LẤY'} />}
      {pkg && <Pad pos={pkg.drop} color="#3b82f6" label="THẢ" />}
    </>
  )
}
function EnemyMesh() {
  return (
    <group>
      <mesh><boxGeometry args={[0.32, 0.1, 0.32]} /><meshStandardMaterial color="#7f1d1d" metalness={0.5} roughness={0.4} /></mesh>
      {([[0.24, 0, 0.24], [-0.24, 0, 0.24], [0.24, 0, -0.24], [-0.24, 0, -0.24]] as Vec3[]).map((p, i) => (
        <mesh key={i} position={p}><cylinderGeometry args={[0.14, 0.14, 0.02, 12]} /><meshStandardMaterial color="#ef4444" transparent opacity={0.5} /></mesh>
      ))}
      <mesh position={[0, 0.09, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshBasicMaterial color="#fecaca" /></mesh>
    </group>
  )
}
function EnemyDrones({ posRef, specs, onHit }: {
  posRef: React.MutableRefObject<THREE.Vector3>
  specs: Array<{ center: Vec3; radius: number; speed: number }>
  onHit: () => void
}) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const phase = useRef(specs.map((_, i) => i * 1.9))
  const lastHit = useRef(0)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((_s, dt) => {
    const dp = posRef.current
    specs.forEach((sp, i) => {
      phase.current[i] += dt * sp.speed
      const g = refs.current[i]
      if (!g) return
      const a = phase.current[i]
      const ep = tmp.set(
        sp.center[0] + Math.cos(a) * sp.radius,
        sp.center[1] + Math.sin(a * 0.7) * 1.6,
        sp.center[2] + Math.sin(a) * sp.radius,
      )
      if (ep.distanceTo(dp) < 16) ep.lerp(dp, 0.015) // bám nhẹ khi gần
      g.position.copy(ep); g.rotation.y += dt * 5
      if (ep.distanceTo(dp) < 1.3) { const now = performance.now(); if (now - lastHit.current > 1200) { lastHit.current = now; onHit() } }
    })
  })
  return <>{specs.map((_, i) => (<group key={i} ref={(el) => { refs.current[i] = el }}><EnemyMesh /></group>))}</>
}
function PoleObstacles({ posRef, poles, onHit }: {
  posRef: React.MutableRefObject<THREE.Vector3>
  poles: Array<{ pos: Vec3; h: number }>
  onHit: () => void
}) {
  const lastHit = useRef(0)
  useFrame(() => {
    const dp = posRef.current
    for (const p of poles) {
      const hd = Math.hypot(dp.x - p.pos[0], dp.z - p.pos[2])
      if (hd < 0.95 && dp.y < p.h) { const now = performance.now(); if (now - lastHit.current > 1200) { lastHit.current = now; onHit() } break }
    }
  })
  return (
    <>
      {poles.map((p, i) => (
        <group key={i} position={[p.pos[0], 0, p.pos[2]]}>
          <mesh position={[0, p.h / 2, 0]} castShadow><cylinderGeometry args={[0.36, 0.42, p.h, 12]} /><meshStandardMaterial color="#dc2626" metalness={0.2} roughness={0.7} /></mesh>
          <mesh position={[0, p.h - 0.5, 0]}><cylinderGeometry args={[0.44, 0.44, 0.5, 12]} /><meshStandardMaterial color="#fbbf24" /></mesh>
          <mesh position={[0, p.h + 0.15, 0]}><sphereGeometry args={[0.26, 10, 10]} /><meshBasicMaterial color="#f87171" /></mesh>
        </group>
      ))}
    </>
  )
}

// ═════════════════════════════════════════════════════════════
// HUD + VR (giống cũ, thêm objective progress)
// ═════════════════════════════════════════════════════════════
function GlCapture({ glRef }: { glRef: React.MutableRefObject<THREE.WebGLRenderer | null> }) {
  const { gl } = useThree()
  useEffect(() => { glRef.current = gl }, [gl, glRef])
  return null
}

function VRButton({ glRef }: { glRef: React.MutableRefObject<THREE.WebGLRenderer | null> }) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [inXR, setInXR] = useState(false)
  useEffect(() => {
    const xr = (navigator as any).xr
    if (!xr) { setSupported(false); return }
    xr.isSessionSupported('immersive-vr').then((ok: boolean) => setSupported(ok)).catch(() => setSupported(false))
  }, [])
  const enter = useCallback(async () => {
    const xr = (navigator as any).xr
    const gl = glRef.current
    if (!xr || !gl) return
    try {
      const session = await xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] })
      gl.xr.enabled = true
      await gl.xr.setSession(session)
      setInXR(true)
      session.addEventListener('end', () => setInXR(false))
    } catch (e) { alert('Không khởi động được VR: ' + (e as Error).message) }
  }, [glRef])
  if (supported === null || !supported) return null
  return (
    <button onClick={enter} disabled={inXR} style={{
      position: 'absolute', bottom: 60, right: 16, padding: '10px 18px',
      background: inXR ? 'rgba(34, 197, 94, 0.3)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
      border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: 8,
      cursor: inXR ? 'default' : 'pointer', fontSize: 13, zIndex: 10,
    }}>{inXR ? '✓ VR' : '🥽 Vào VR'}</button>
  )
}

function GameHUD({
  telemetry, gamepadId, level, gateProgress, hoverProgress, timeRemaining,
}: {
  telemetry: DroneState | null; gamepadId: string | null; level: Level
  gateProgress: number; hoverProgress: number; timeRemaining: number
}) {
  if (!telemetry) return null
  const speed = telemetry.vel.length()
  const battColor = telemetry.battery > 30 ? '#10b981' : telemetry.battery > 15 ? '#f59e0b' : '#ef4444'
  const objStr = level.type === 'hover' && level.hover
    ? `Hover ${hoverProgress.toFixed(1)}/${level.hover.duration}s`
    : `Gate ${gateProgress}/${(level.gates || []).length}`
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      fontFamily: 'monospace', color: '#22c55e', textShadow: '0 0 4px rgba(0,0,0,0.8)',
    }}>
      {/* Top-left: alt + speed */}
      <div style={{ position: 'absolute', top: 12, left: 16 }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>ALT</div>
        <div style={{ fontSize: 22, fontWeight: 'bold' }}>{telemetry.pos.y.toFixed(1)}m</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 8 }}>SPEED</div>
        <div style={{ fontSize: 22, fontWeight: 'bold' }}>{speed.toFixed(1)} m/s</div>
      </div>
      {/* Top-center: objective + time */}
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{level.emoji} LEVEL {level.id} • {level.name.toUpperCase()}</div>
        <div style={{ fontSize: 26, fontWeight: 'bold', marginTop: 2, color: '#fbbf24' }}>{objStr}</div>
        <div style={{ fontSize: 14, marginTop: 4, color: timeRemaining < 10 ? '#ef4444' : '#22c55e' }}>
          ⏱ {timeRemaining.toFixed(1)}s
        </div>
      </div>
      {/* Top-right: battery */}
      <div style={{ position: 'absolute', top: 12, right: 16, textAlign: 'right' }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>BATTERY</div>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: battColor }}>{telemetry.battery.toFixed(0)}%</div>
        <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.2)', marginTop: 4, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${telemetry.battery}%`, height: '100%', background: battColor }} />
        </div>
      </div>
      {/* Bottom: input source */}
      <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', fontSize: 11 }}>
        <div style={{ opacity: 0.7 }}>
          {gamepadId ? `🎮 ${gamepadId.slice(0, 40)}` : '⌨️ Bàn phím (W/S A/D ↑↓ ←→)'}
        </div>
      </div>
      {/* Crosshair */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 30, height: 30, border: '1.5px solid rgba(34, 197, 94, 0.6)', borderRadius: '50%',
      }} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// SCREEN: SETUP — device detection + instructions
// ═════════════════════════════════════════════════════════════
function SetupScreen({ onStart }: { onStart: (mode: 'device' | 'keyboard' | 'mobile') => void }) {
  const [gamepadId, setGamepadId] = useState<string | null>(null)
  const [vrSupport, setVrSupport] = useState<'checking' | 'yes' | 'no'>('checking')
  const mobile = isMobile()

  useEffect(() => {
    const checkPad = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      const p = Array.from(pads).find(p => p && p.connected)
      setGamepadId(p?.id || null)
    }
    checkPad()
    const id = setInterval(checkPad, 1000)
    const onC = (e: GamepadEvent) => setGamepadId(e.gamepad.id)
    const onD = () => setGamepadId(null)
    window.addEventListener('gamepadconnected', onC as EventListener)
    window.addEventListener('gamepaddisconnected', onD as EventListener)
    return () => {
      clearInterval(id)
      window.removeEventListener('gamepadconnected', onC as EventListener)
      window.removeEventListener('gamepaddisconnected', onD as EventListener)
    }
  }, [])

  useEffect(() => {
    const xr = (navigator as any).xr
    if (!xr) { setVrSupport('no'); return }
    xr.isSessionSupported('immersive-vr')
      .then((ok: boolean) => setVrSupport(ok ? 'yes' : 'no'))
      .catch(() => setVrSupport('no'))
  }, [])

  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0a0a0f 100%)',
      color: '#e2e8f0', padding: '32px 24px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 'bold', margin: '0 0 8px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🚁 FPV Drone Sandbox + VR
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            Sàn tập bay drone FPV với 5 cấp độ + WebXR VR. Cài đặt thiết bị trước khi bắt đầu.
          </p>
        </div>

        {/* Detection status — 2 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Gamepad */}
          <div style={{
            padding: 20, borderRadius: 16,
            background: gamepadId ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            border: `1px solid ${gamepadId ? 'rgba(34, 197, 94, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>🎮 Tay cầm / RC TX</span>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: gamepadId ? '#10b981' : '#475569', color: 'white' }}>
                {gamepadId ? 'KẾT NỐI' : 'CHƯA THẤY'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, minHeight: 32 }}>
              {gamepadId ? `✅ ${gamepadId.slice(0, 60)}` : '⏳ Đang chờ thiết bị... cắm USB nay nếu chưa'}
            </p>
          </div>

          {/* VR */}
          <div style={{
            padding: 20, borderRadius: 16,
            background: vrSupport === 'yes' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            border: `1px solid ${vrSupport === 'yes' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>🥽 VR Headset</span>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: vrSupport === 'yes' ? '#8b5cf6' : '#475569', color: 'white' }}>
                {vrSupport === 'checking' ? 'KIỂM TRA' : vrSupport === 'yes' ? 'HỖ TRỢ' : 'KHÔNG HỖ TRỢ'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, minHeight: 32 }}>
              {vrSupport === 'yes'
                ? '✅ WebXR sẵn sàng — bấm "Vào VR" trong game'
                : '⚠️ Cần Meta Quest Browser hoặc trình duyệt hỗ trợ WebXR (tuỳ chọn)'}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          padding: 20, borderRadius: 16, marginBottom: 24,
          background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(71, 85, 105, 0.4)',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', marginTop: 0, marginBottom: 12, color: '#fbbf24' }}>
            📖 Hướng dẫn cài đặt
          </h3>
          <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}><b style={{ color: '#ec4899' }}>1. Tay cầm FPV (FrSky / RadioMaster / TBS Tango):</b></p>
            <ul style={{ marginTop: 4, paddingLeft: 22 }}>
              <li>Cắm cáp USB-C từ TX → laptop/PC</li>
              <li>Vào menu System → <code style={{ color: '#fbbf24' }}>USB Joystick (HID)</code> mode</li>
              <li>Trình duyệt sẽ tự nhận → status sẽ chuyển sang ✅ KẾT NỐI</li>
              <li>Mode 2 RC layout standard: stick trái = throttle+yaw, stick phải = pitch+roll</li>
            </ul>
            <p style={{ marginTop: 12 }}><b style={{ color: '#3b82f6' }}>2. Gamepad chuẩn (PS/Xbox/Logitech):</b></p>
            <ul style={{ marginTop: 4, paddingLeft: 22 }}>
              <li>Cắm USB hoặc pair Bluetooth</li>
              <li>Test joystick: <a href="https://hardwaretester.com/gamepad" target="_blank" rel="noreferrer" style={{ color: '#06b6d4' }}>hardwaretester.com/gamepad</a></li>
            </ul>
            <p style={{ marginTop: 12 }}><b style={{ color: '#8b5cf6' }}>3. VR Headset (tuỳ chọn — Meta Quest / Vision Pro):</b></p>
            <ul style={{ marginTop: 4, paddingLeft: 22 }}>
              <li>Mở trình duyệt trên Quest (Meta Browser hoặc Wolvic)</li>
              <li>Truy cập <code style={{ color: '#fbbf24' }}>inphysic.com/dashboard/aura</code></li>
              <li>Vào sim → bấm "🥽 Vào VR" → đeo kính</li>
            </ul>
            <p style={{ marginTop: 12, padding: 12, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              💡 <b>Không có thiết bị?</b> Chọn "<b style={{ color: '#22c55e' }}>Bàn phím luyện tập</b>" bên dưới — vẫn chơi đủ 5 levels với W/S throttle, A/D yaw, ↑↓ pitch, ←→ roll.
            </p>
            {mobile && (
              <p style={{ marginTop: 8, padding: 12, background: 'rgba(34, 197, 94, 0.08)', borderRadius: 8, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                📱 <b>Đang dùng điện thoại?</b> Chọn "<b style={{ color: '#10b981' }}>Bay trên điện thoại</b>" — 2 cần joystick ảo Mode 2: trái = throttle/yaw (giữ throttle khi nhả), phải = pitch/roll (snap về 0). Xoay ngang điện thoại để có không gian rộng.
              </p>
            )}
          </div>
        </div>

        {/* Start buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => onStart('device')}
            disabled={!gamepadId}
            style={{
              padding: '14px 28px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 'bold',
              background: gamepadId ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : '#475569',
              color: 'white', cursor: gamepadId ? 'pointer' : 'not-allowed', opacity: gamepadId ? 1 : 0.5,
              boxShadow: gamepadId ? '0 4px 16px rgba(236, 72, 153, 0.4)' : 'none',
            }}
          >
            🚁 Bắt đầu với thiết bị
          </button>
          {mobile && (
            <button
              onClick={() => onStart('mobile')}
              style={{
                padding: '14px 28px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 'bold',
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              }}
            >
              📱 Bay trên điện thoại
            </button>
          )}
          <button
            onClick={() => onStart('keyboard')}
            style={{
              padding: '14px 28px', borderRadius: 12, border: '2px solid rgba(34, 197, 94, 0.4)',
              fontSize: 15, fontWeight: 'bold', background: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e', cursor: 'pointer',
            }}
          >
            ⌨️ Bàn phím luyện tập
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// SCREEN: LEVEL SELECT
// ═════════════════════════════════════════════════════════════
function LevelSelectScreen({
  progress, selectedModelId, onSelectModel, onPick, onBackToSetup,
}: {
  progress: Progress
  selectedModelId: string
  onSelectModel: (id: string) => void
  onPick: (l: Level) => void
  onBackToSetup: () => void
}) {
  // Preload GLTF khi vào level select để khi pick level đã sẵn sàng
  useEffect(() => { preloadDroneModels() }, [])
  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0a0a0f 100%)',
      color: '#e2e8f0', padding: '24px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>Chọn cấp độ</h1>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
              Mỗi cấp độ mở khoá khi hoàn thành cấp trước
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>TỔNG ĐIỂM</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fbbf24' }}>
              ⭐ {progress.totalScore.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* ── Model picker ── */}
        <div style={{
          padding: 16, borderRadius: 12, marginBottom: 24,
          background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(71, 85, 105, 0.4)',
        }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, fontWeight: 'bold', letterSpacing: 1 }}>
            🛸 CHỌN MẪU DRONE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {DRONE_MODELS.map(m => {
              const active = m.id === selectedModelId
              return (
                <button
                  key={m.id}
                  onClick={() => { onSelectModel(m.id); saveSelectedModel(m.id) }}
                  style={{
                    padding: 12, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    background: active ? 'rgba(236, 72, 153, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    border: `1px solid ${active ? '#ec4899' : 'rgba(71, 85, 105, 0.4)'}`,
                    color: '#e2e8f0', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>{m.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                        {m.name}
                        {active && <span style={{ marginLeft: 6, fontSize: 11, color: '#ec4899' }}>● ĐANG DÙNG</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.description}</div>
                      {m.attribution && (
                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>
                          📜 {m.attribution}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {LEVELS.map(level => {
            const stats = progress.perLevel[level.id]
            const unlocked = level.id <= progress.unlockedLevel
            const stars = stats?.stars || 0
            return (
              <button
                key={level.id}
                onClick={() => unlocked && onPick(level)}
                disabled={!unlocked}
                style={{
                  padding: 20, borderRadius: 16, textAlign: 'left', cursor: unlocked ? 'pointer' : 'not-allowed',
                  background: unlocked
                    ? `linear-gradient(135deg, ${{
                        easy: 'rgba(34, 197, 94, 0.15)', medium: 'rgba(245, 158, 11, 0.15)',
                        hard: 'rgba(239, 68, 68, 0.15)', expert: 'rgba(139, 92, 246, 0.15)',
                        pro: 'rgba(236, 72, 153, 0.15)',
                      }[level.difficulty]} 0%, transparent 100%)`
                    : 'rgba(30, 41, 59, 0.3)',
                  border: `1px solid ${unlocked ? {
                    easy: '#22c55e44', medium: '#f59e0b44', hard: '#ef444444',
                    expert: '#8b5cf644', pro: '#ec489944',
                  }[level.difficulty] : '#33415544'}`,
                  color: '#e2e8f0', opacity: unlocked ? 1 : 0.4, transition: 'transform 0.15s',
                }}
                onMouseEnter={e => unlocked && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 32 }}>{level.emoji}</span>
                  {!unlocked && <span style={{ fontSize: 18 }}>🔒</span>}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                  CẤP {level.id} • {level.difficulty.toUpperCase()}
                </div>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 6 }}>{level.name}</div>
                <div style={{ fontSize: 12, color: '#cbd5e1', minHeight: 40, marginBottom: 10 }}>
                  {level.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>⏱ {level.timeLimit}s</span>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>+{level.reward}đ</span>
                </div>
                {stats && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(71, 85, 105, 0.4)' }}>
                    <div style={{ fontSize: 16 }}>
                      {[1, 2, 3].map(i => (
                        <span key={i} style={{ color: i <= stars ? '#fbbf24' : '#475569' }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      Best: {stats.bestTime.toFixed(1)}s
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={onBackToSetup} style={{
            padding: '8px 16px', background: 'transparent', border: '1px solid rgba(100, 116, 139, 0.4)',
            color: '#94a3b8', borderRadius: 8, cursor: 'pointer', fontSize: 13,
          }}>← Quay lại setup</button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// SCREEN: GAME (level đang chạy)
// ═════════════════════════════════════════════════════════════
function GameScreen({
  level, model, onComplete, onAbort,
}: {
  level: Level
  model: DroneModel
  onComplete: (success: boolean, elapsed: number) => void
  onAbort: () => void
}) {
  const inputsRef = useRef<ControlInputs>({ throttle: 0, yaw: 0, pitch: 0, roll: 0 })
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const [telemetry, setTelemetry] = useState<DroneState | null>(null)
  const [gateProgress, setGateProgress] = useState(0)
  const [hoverProgress, setHoverProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(level.timeLimit)
  const startTimeRef = useRef(Date.now())
  const completedRef = useRef(false)
  const gamepadId = useGamepadInput(inputsRef)
  const dronePosRef = useRef(new THREE.Vector3(0, 0.5, 0))
  const [muted, setMuted] = useState(false)
  const [showSticks, setShowSticks] = useState(isMobile())
  const [showHint, setShowHint] = useState(true)
  const [cargoIdx, setCargoIdx] = useState(0)
  const [cargoCarrying, setCargoCarrying] = useState(false)
  const [hits, setHits] = useState(0)
  const [hitFlash, setHitFlash] = useState(false)
  useEffect(() => { const id = setTimeout(() => setShowHint(false), 9000); return () => clearTimeout(id) }, [])

  const onCargoState = useCallback((idx: number, carrying: boolean) => { setCargoIdx(idx); setCargoCarrying(carrying) }, [])
  const onCargoComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete(true, (Date.now() - startTimeRef.current) / 1000)
  }, [onComplete])
  const onHit = useCallback(() => {
    playHit(); setHits((h) => h + 1); setHitFlash(true)
    setTimeout(() => setHitFlash(false), 280)
  }, [])

  // Mục tiêu kế tiếp để vẽ mũi tên chỉ đường + đo khoảng cách
  const guideTarget: [number, number, number] | null = useMemo(() => {
    if (level.type === 'hover' && level.hover) return [0, level.hover.altitude, 0]
    if (level.type === 'gates' && level.gates) return level.gates[gateProgress]?.pos ?? null
    if (level.type === 'cargo' && level.cargo) {
      const pkg = level.cargo.packages[cargoIdx]
      if (!pkg) return null
      return cargoCarrying ? pkg.drop : pkg.pickup
    }
    return null
  }, [level, gateProgress, cargoIdx, cargoCarrying])
  const guideDist = telemetry && guideTarget
    ? telemetry.pos.distanceTo(new THREE.Vector3(...guideTarget)) : null

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const remaining = Math.max(0, level.timeLimit - elapsed)
      setTimeRemaining(remaining)
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true
        onComplete(false, level.timeLimit)
      }
    }, 100)
    return () => clearInterval(id)
  }, [level, onComplete])

  // Throttled telemetry
  const lastUpdRef = useRef(0)
  const onTelemetry = useCallback((s: DroneState) => {
    const now = performance.now()
    if (now - lastUpdRef.current > 100) {
      setTelemetry(s); lastUpdRef.current = now
    }
  }, [])

  const onGatePass = useCallback((idx: number) => {
    setGateProgress(idx + 1)
    if (idx + 1 >= (level.gates?.length || 0) && !completedRef.current) {
      completedRef.current = true
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      onComplete(true, elapsed)
    }
  }, [level, onComplete])

  const onHoverProg = useCallback((sec: number) => {
    setHoverProgress(sec)
    if (level.hover && sec >= level.hover.duration && !completedRef.current) {
      completedRef.current = true
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      onComplete(true, elapsed)
    }
  }, [level, onComplete])

  const onCrash = useCallback(() => {
    if (completedRef.current) return
    // Crash chỉ in log, không fail level
    console.log('[fpv] crash detected — bay lại tiếp')
  }, [])

  return (
    <KeyboardControls map={[
      { name: 'throttleUp', keys: ['KeyW'] }, { name: 'throttleDown', keys: ['KeyS'] },
      { name: 'yawLeft', keys: ['KeyA'] }, { name: 'yawRight', keys: ['KeyD'] },
      { name: 'pitchUp', keys: ['ArrowUp'] }, { name: 'pitchDown', keys: ['ArrowDown'] },
      { name: 'rollLeft', keys: ['ArrowLeft'] }, { name: 'rollRight', keys: ['ArrowRight'] },
    ]}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Canvas
          shadows
          camera={{ fov: 90, near: 0.1, far: 1000, position: [0, 1.5, 0] }}
          style={{ background: '#0a0a0f', width: '100%', height: '100%' }}
        >
          <LevelEnvironment level={level} currentGate={gateProgress} />
          <Suspense fallback={null}>
            <DroneRig inputs={inputsRef} level={level} model={model} onTelemetry={onTelemetry}
              onGatePass={onGatePass} onHoverProgress={onHoverProg} onCrash={onCrash} posRef={dronePosRef} />
          </Suspense>
          <WaypointGuide posRef={dronePosRef} target={guideTarget} />
          {level.type === 'cargo' && level.cargo && (
            <>
              <CargoMission posRef={dronePosRef} packages={level.cargo.packages}
                onState={onCargoState} onComplete={onCargoComplete} />
              {level.cargo.enemies && level.cargo.enemies.length > 0 && (
                <EnemyDrones posRef={dronePosRef} specs={level.cargo.enemies} onHit={onHit} />
              )}
              {level.cargo.poles && level.cargo.poles.length > 0 && (
                <PoleObstacles posRef={dronePosRef} poles={level.cargo.poles} onHit={onHit} />
              )}
            </>
          )}
          <KeyboardBridge inputsRef={inputsRef} />
          <Text position={[0, 14, -20]} fontSize={1.5} color="#22c55e" anchorX="center">
            {level.emoji} {level.name.toUpperCase()}
          </Text>
          <GlCapture glRef={glRef} />
        </Canvas>
        <GameHUD telemetry={telemetry} gamepadId={gamepadId} level={level}
          gateProgress={gateProgress} hoverProgress={hoverProgress} timeRemaining={timeRemaining} />
        <VRButton glRef={glRef} />
        {/* Âm thanh động cơ (WebAudio) */}
        <DroneSound inputsRef={inputsRef} muted={muted} />
        {/* Joystick ảo — bật khi mobile-không-gamepad hoặc user tự bật */}
        {showSticks && !gamepadId && <MobileTouchSticks inputsRef={inputsRef} />}

        {/* Khoảng cách tới mục tiêu kế tiếp */}
        {guideDist != null && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8,145,178,0.85)', color: '#ecfeff', padding: '5px 14px',
            borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: 'monospace', zIndex: 10,
          }}>{level.type === 'cargo' ? (cargoCarrying ? '📦→ Thả' : '📦 Lấy') : '🎯 Mục tiêu'}: {guideDist.toFixed(1)}m</div>
        )}

        {/* HUD cargo: tiến độ giao hàng + va chạm */}
        {level.type === 'cargo' && level.cargo && (
          <div style={{
            position: 'absolute', top: 46, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8, zIndex: 10,
          }}>
            <span style={{ background: 'rgba(34,197,94,0.85)', color: '#052e16', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, fontFamily: 'monospace' }}>
              📦 {cargoIdx}/{level.cargo.packages.length}
            </span>
            <span style={{ background: 'rgba(239,68,68,0.85)', color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, fontFamily: 'monospace' }}>
              💥 {hits}
            </span>
          </div>
        )}

        {/* Flash đỏ khi va chạm */}
        {hitFlash && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 9, pointerEvents: 'none',
            boxShadow: 'inset 0 0 120px 40px rgba(239,68,68,0.55)',
          }} />
        )}

        {/* Hint điều khiển lúc bắt đầu */}
        {showHint && (
          <div onClick={() => setShowHint(false)} style={{
            position: 'absolute', bottom: 120, left: '50%', transform: 'translateX(-50%)',
            maxWidth: '90%', background: 'rgba(15,23,42,0.9)', color: '#e2e8f0',
            padding: '10px 16px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
            textAlign: 'center', zIndex: 11, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <b style={{ color: '#22d3ee' }}>{level.emoji} {level.name}</b><br />
            {level.hint}<br />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {gamepadId ? '🎮 Tay cầm' : showSticks ? '🕹️ Joystick 2 cần (trái: ga/xoay · phải: nghiêng)' : '⌨️ W/S A/D · ↑↓ ←→'} · chạm để ẩn
            </span>
          </div>
        )}

        {/* Nút điều khiển góc phải-trên */}
        <button onClick={() => setMuted((m) => !m)} title="Bật/tắt âm thanh" style={{
          position: 'absolute', top: 12, right: 200, padding: '6px 10px',
          background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 14, zIndex: 10,
        }}>{muted ? '🔇' : '🔊'}</button>
        <button onClick={() => setShowSticks((s) => !s)} title="Bật/tắt joystick ảo" style={{
          position: 'absolute', top: 12, right: 156, padding: '6px 10px',
          background: showSticks ? 'rgba(34,197,94,0.25)' : 'rgba(30,41,59,0.7)',
          border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', borderRadius: 6,
          cursor: 'pointer', fontSize: 14, zIndex: 10,
        }}>🕹️</button>
        {/* Abort button top-left of canvas */}
        <button onClick={onAbort} style={{
          position: 'absolute', top: 12, right: 110, padding: '6px 12px',
          background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)',
          color: '#fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 12, zIndex: 10,
        }}>← Thoát</button>
      </div>
    </KeyboardControls>
  )
}

// ═════════════════════════════════════════════════════════════
// SCREEN: RESULT (sau khi xong level)
// ═════════════════════════════════════════════════════════════
function ResultScreen({
  level, success, elapsed, isNewBest, isNewUnlock, onContinue, onRetry,
}: {
  level: Level; success: boolean; elapsed: number; isNewBest: boolean; isNewUnlock: boolean
  onContinue: () => void; onRetry: () => void
}) {
  const stars = success ? calculateStars(elapsed, level.timeLimit) : 0
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0a0a0f 100%)',
      color: '#e2e8f0', padding: 32,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{success ? '🏆' : '⏱'}</div>
        <h2 style={{ fontSize: 28, fontWeight: 'bold', margin: '0 0 8px',
          color: success ? '#22c55e' : '#ef4444' }}>
          {success ? 'HOÀN THÀNH!' : 'HẾT GIỜ'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
          {level.emoji} {level.name} — Cấp {level.id}
        </p>

        {success && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {[1, 2, 3].map(i => (
                <span key={i} style={{ color: i <= stars ? '#fbbf24' : '#475569', margin: '0 4px' }}>★</span>
              ))}
            </div>
            <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 8 }}>
              Thời gian: <b>{elapsed.toFixed(1)}s</b> / {level.timeLimit}s
              {isNewBest && <span style={{ color: '#fbbf24', marginLeft: 8 }}>🆕 Best!</span>}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 'bold', color: '#fbbf24',
              padding: '12px 24px', display: 'inline-block',
              background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.4)',
              borderRadius: 12, marginBottom: 16,
            }}>
              +{level.reward.toLocaleString('vi-VN')} điểm
            </div>
            {isNewUnlock && (
              <div style={{ fontSize: 13, color: '#a78bfa', marginBottom: 16 }}>
                🔓 Mở khoá Cấp {level.id + 1}!
              </div>
            )}
          </>
        )}

        {!success && (
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            💡 {level.hint}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
          <button onClick={onRetry} style={{
            padding: '10px 20px', background: 'rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.5)', color: '#a78bfa',
            borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 'bold',
          }}>🔄 Thử lại</button>
          <button onClick={onContinue} style={{
            padding: '10px 24px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            border: 'none', color: 'white', borderRadius: 10, cursor: 'pointer',
            fontSize: 14, fontWeight: 'bold',
          }}>{success ? '→ Cấp tiếp / chọn cấp' : '← Chọn cấp khác'}</button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// MAIN — flow controller
// ═════════════════════════════════════════════════════════════
type Screen =
  | { kind: 'setup' }
  | { kind: 'levels' }
  | { kind: 'game'; level: Level }
  | { kind: 'result'; level: Level; success: boolean; elapsed: number; isNewBest: boolean; isNewUnlock: boolean }

function FpvAppRoot() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [screen, setScreen] = useState<Screen>({ kind: 'setup' })
  const [selectedModelId, setSelectedModelId] = useState<string>(() => loadSelectedModel())
  const selectedModel = useMemo(
    () => DRONE_MODELS.find(m => m.id === selectedModelId) || DRONE_MODELS[0],
    [selectedModelId]
  )

  const handleComplete = useCallback((level: Level, success: boolean, elapsed: number) => {
    let isNewBest = false, isNewUnlock = false
    setProgress(prev => {
      const next: Progress = JSON.parse(JSON.stringify(prev))
      if (success) {
        const stars = calculateStars(elapsed, level.timeLimit)
        const old = next.perLevel[level.id]
        if (!old) {
          // first completion
          next.perLevel[level.id] = { stars, bestTime: elapsed, completedAt: new Date().toISOString() }
          next.totalScore += level.reward
          isNewBest = true
        } else {
          if (elapsed < old.bestTime) {
            next.perLevel[level.id].bestTime = elapsed
            isNewBest = true
          }
          if (stars > old.stars) {
            next.perLevel[level.id].stars = stars
          }
        }
        if (level.id === next.unlockedLevel && level.id < LEVELS.length) {
          next.unlockedLevel = level.id + 1
          isNewUnlock = true
        }
      }
      saveProgress(next)
      return next
    })
    setScreen({ kind: 'result', level, success, elapsed, isNewBest, isNewUnlock })
  }, [])

  switch (screen.kind) {
    case 'setup':
      return <SetupScreen onStart={() => setScreen({ kind: 'levels' })} />
    case 'levels':
      return (
        <LevelSelectScreen
          progress={progress}
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          onPick={(l) => setScreen({ kind: 'game', level: l })}
          onBackToSetup={() => setScreen({ kind: 'setup' })}
        />
      )
    case 'game':
      return (
        <GameScreen
          level={screen.level}
          model={selectedModel}
          onComplete={(success, elapsed) => handleComplete(screen.level, success, elapsed)}
          onAbort={() => setScreen({ kind: 'levels' })}
        />
      )
    case 'result':
      return (
        <ResultScreen
          level={screen.level}
          success={screen.success}
          elapsed={screen.elapsed}
          isNewBest={screen.isNewBest}
          isNewUnlock={screen.isNewUnlock}
          onRetry={() => setScreen({ kind: 'game', level: screen.level })}
          onContinue={() => setScreen({ kind: 'levels' })}
        />
      )
  }
}

export const fpvSimulations = {
  'fpv-drone-vr': FpvAppRoot,
}
