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
type LevelType = 'hover' | 'gates'
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
  gates?: Array<{ pos: [number, number, number]; r: number }>          // qua các gates theo thứ tự
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
// LEVEL ENVIRONMENT — gates change theo level
// ═════════════════════════════════════════════════════════════
function LevelEnvironment({ level, currentGate }: { level: Level; currentGate: number }) {
  const towerCount = level.difficulty === 'pro' ? 25 : level.difficulty === 'hard' ? 12 : 6
  return (
    <>
      <Sky distance={4500} sunPosition={[100, 20, 100]} inclination={0.49} azimuth={0.25} />
      <Stars radius={200} depth={50} count={3000} factor={4} fade speed={0.5} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 80, 30]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400, 50, 50]} />
        <meshStandardMaterial color="#1a4f3a" />
      </mesh>
      <gridHelper args={[400, 80, '#22c55e', '#14532d']} position={[0, 0.01, 0]} />

      {/* Towers */}
      {Array.from({ length: towerCount }).map((_, i) => {
        const angle = (i / towerCount) * Math.PI * 2
        const r = 30 + (i % 5) * 12
        const x = Math.cos(angle) * r
        const z = Math.sin(angle) * r
        const h = 8 + (i % 4) * 4
        return (
          <mesh key={i} position={[x, h / 2, z]} castShadow>
            <boxGeometry args={[2, h, 2]} />
            <meshStandardMaterial color={['#7c3aed', '#3b82f6', '#10b981', '#f59e0b'][i % 4]} />
          </mesh>
        )
      })}

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
  inputs, level, model, onTelemetry, onGatePass, onHoverProgress, onCrash,
}: {
  inputs: React.MutableRefObject<ControlInputs>
  level: Level
  model: DroneModel
  onTelemetry: (s: DroneState) => void
  onGatePass: (idx: number) => void
  onHoverProgress: (secondsHeld: number) => void
  onCrash: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const stateRef = useRef<DroneState>({
    pos: new THREE.Vector3(0, 0.5, 0), vel: new THREE.Vector3(),
    yaw: 0, pitch: 0, roll: 0, battery: 100,
  })
  const hoverHeldRef = useRef(0)
  const lastGateCheckedRef = useRef(-1)
  const { camera } = useThree()

  useFrame((_state, dt) => {
    const s = stateRef.current
    const i = inputs.current
    s.yaw += i.yaw * PHYSICS.yawRate * dt
    s.pitch = i.pitch * 0.5
    s.roll = i.roll * 0.5
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw)
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.pitch)
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.roll)
    const orient = yawQ.clone().multiply(pitchQ).multiply(rollQ)
    const thrustVec = new THREE.Vector3(0, 1, 0).applyQuaternion(orient)
    const throttleMag = Math.max(0, (i.throttle + 1) / 2)
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

    if (groupRef.current) {
      groupRef.current.position.copy(s.pos)
      groupRef.current.quaternion.copy(orient)
    }
    const camOffset = new THREE.Vector3(0, 0.05, 0).applyQuaternion(orient)
    camera.position.copy(s.pos).add(camOffset)
    camera.lookAt(s.pos.clone().add(new THREE.Vector3(0, 0, 1).applyQuaternion(orient)))

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
    inputsRef.current.throttle = (k.throttleUp ? 1 : 0) - (k.throttleDown ? 1 : 0)
    inputsRef.current.yaw = (k.yawRight ? 1 : 0) - (k.yawLeft ? 1 : 0)
    inputsRef.current.pitch = (k.pitchUp ? 1 : 0) - (k.pitchDown ? 1 : 0)
    inputsRef.current.roll = (k.rollRight ? 1 : 0) - (k.rollLeft ? 1 : 0)
  })
  return null
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
function SetupScreen({ onStart }: { onStart: (mode: 'device' | 'keyboard') => void }) {
  const [gamepadId, setGamepadId] = useState<string | null>(null)
  const [vrSupport, setVrSupport] = useState<'checking' | 'yes' | 'no'>('checking')

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
          </div>
        </div>

        {/* Start buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
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
              onGatePass={onGatePass} onHoverProgress={onHoverProg} onCrash={onCrash} />
          </Suspense>
          <KeyboardBridge inputsRef={inputsRef} />
          <Text position={[0, 14, -20]} fontSize={1.5} color="#22c55e" anchorX="center">
            {level.emoji} {level.name.toUpperCase()}
          </Text>
          <GlCapture glRef={glRef} />
        </Canvas>
        <GameHUD telemetry={telemetry} gamepadId={gamepadId} level={level}
          gateProgress={gateProgress} hoverProgress={hoverProgress} timeRemaining={timeRemaining} />
        <VRButton glRef={glRef} />
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
