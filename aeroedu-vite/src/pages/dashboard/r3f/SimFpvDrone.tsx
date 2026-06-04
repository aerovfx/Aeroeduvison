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
import { QRCodeSVG } from 'qrcode.react'
import { tokenStore, api } from '@/services/api'
import { useBroker } from '@/lib/broker-client'
import { fetchOsmBuildings, OSM_PLACES, type OsmBox } from '@/lib/osm-buildings'

// ── Multiplayer (Thách đấu) helpers ──
type Peer = { name: string; pos: [number, number, number]; yaw: number; pitch: number; roll: number; t: number }
const genRoomCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
/** Lấy mã phòng từ chuỗi quét QR (link ?droneRoom=... ) hoặc mã nhập tay. */
function parseRoomCode(text: string): string {
  try { const r = new URL(text).searchParams.get('droneRoom'); if (r) return r.toUpperCase().slice(0, 8) } catch { /* không phải URL */ }
  return text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}
/** Quét QR bằng camera (BarcodeDetector — Chrome/Android/Quest). iOS dùng camera máy. */
function QrScanner({ onResult, onClose }: { onResult: (t: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let stream: MediaStream | null = null, raf = 0, stopped = false
    const Det = (window as any).BarcodeDetector
    if (!Det) { setErr('Trình duyệt này không quét được trong app. Hãy dùng Camera điện thoại quét QR (sẽ mở link phòng), hoặc nhập mã thủ công bên dưới.'); return }
    const detector = new Det({ formats: ['qr_code'] })
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
        const tick = async () => {
          if (stopped) return
          try {
            const codes = await detector.detect(videoRef.current as HTMLVideoElement)
            if (codes && codes[0]?.rawValue) { onResult(codes[0].rawValue as string); return }
          } catch { /* khung lỗi → thử lại */ }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch { setErr('Không mở được camera. Cho phép quyền camera, hoặc nhập mã thủ công bên dưới.') }
    })()
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()) }
  }, [onResult])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(86vw,360px)', aspectRatio: '1', borderRadius: 16, overflow: 'hidden', border: '3px solid #22d3ee', background: '#000' }}>
        <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: '18%', border: '3px solid rgba(34,211,238,0.8)', borderRadius: 12, pointerEvents: 'none' }} />
      </div>
      <div style={{ color: '#e2faff', fontSize: 14, fontWeight: 700, textAlign: 'center', maxWidth: 360 }}>{err || 'Đưa mã QR của phòng vào khung để tham gia'}</div>
      <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 999, border: 'none', background: '#22d3ee', color: '#04212b', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Đóng</button>
    </div>
  )
}
function myCallsign(): string {
  try {
    let n = localStorage.getItem('drone_callsign')
    if (!n) { n = 'Phi công ' + Math.floor(1000 + Math.random() * 9000); localStorage.setItem('drone_callsign', n) }
    return n
  } catch { return 'Phi công ' + Math.floor(1000 + Math.random() * 9000) }
}
// Leaderboard lưu cục bộ (localStorage) — lịch sử kết quả đua
interface LbEntry { room: string; map: string; name: string; time: number; at: number }
function saveLeaderboard(room: string, mapName: string, name: string, time: number) {
  try {
    const arr: LbEntry[] = JSON.parse(localStorage.getItem('drone_leaderboard') || '[]')
    arr.push({ room, map: mapName, name, time: +time.toFixed(2), at: Date.now() })
    localStorage.setItem('drone_leaderboard', JSON.stringify(arr.slice(-300)))
  } catch { /* */ }
}
function loadLeaderboard(room?: string): LbEntry[] {
  try {
    const arr: LbEntry[] = JSON.parse(localStorage.getItem('drone_leaderboard') || '[]')
    return (room ? arr.filter((e) => e.room === room) : arr).sort((a, b) => a.time - b.time)
  } catch { return [] }
}
// Tên màn theo địa danh + số thứ tự tự tăng (vd "New York map#01")
function nextMapName(place: string): string {
  const short = place.split(',')[0].trim().slice(0, 24) || 'Map'
  try {
    const k = 'drone_mapseq_' + short.toLowerCase()
    const n = (parseInt(localStorage.getItem(k) || '0', 10) || 0) + 1
    localStorage.setItem(k, String(n))
    return `${short} map#${String(n).padStart(2, '0')}`
  } catch { return `${short} map#01` }
}
// Dựng Level bay trên bản đồ thật từ 1 toạ độ (cổng đặt tự động quanh tâm)
function makeMapLevel(name: string, lat: number, lon: number): Level {
  return {
    id: 100, name, emoji: '🗺️', difficulty: 'pro',
    description: 'Đua trên bản đồ thật (OpenStreetMap)',
    timeLimit: 180, reward: 0, type: 'gates',
    map: { lat, lon, radius: 1200 },
    gates: ([[0, 40, -90], [110, 55, -190], [-100, 60, -300], [70, 48, -410], [0, 45, -520]] as Vec3[]).map((p) => ({ pos: p, r: 3.2 })),
    hint: 'Đua qua các cổng giữa thành phố thật. Né toà nhà (box từ OSM). Theo mũi tên chỉ đường.',
  }
}
// Geocode tên địa danh → toạ độ. Gọi BACKEND proxy (/api/geocode) thay vì Nominatim
// trực tiếp: server gắn User-Agent đúng policy + cache + rate-limit ≤1 req/s → tránh ban.
async function geocodePlace(q: string): Promise<{ name: string; lat: number; lon: number }[]> {
  try {
    const { data } = await api.get('/geocode', { params: { q } })
    return Array.isArray(data?.results) ? data.results : []
  } catch { return [] }
}

// RNG có seed → mọi người chơi cùng phòng thấy phần thưởng/mother ship GIỐNG NHAU
function seedFrom(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// Điểm tích luỹ + cấp độ người chơi (localStorage)
function getPoints(): number { try { return parseInt(localStorage.getItem('drone_points') || '0', 10) || 0 } catch { return 0 } }
function addPoints(d: number): number { try { const v = Math.max(0, getPoints() + d); localStorage.setItem('drone_points', String(v)); return v } catch { return Math.max(0, d) } }
function playerLevel(points: number): number { return Math.floor(Math.sqrt(Math.max(0, points) / 120)) + 1 }

type PickupType = 'battery' | 'points' | 'cargo' | 'upgrade' | 'drone'
interface PickupItem { type: PickupType; pos: Vec3 }
const PICKUP_INFO: Record<PickupType, { color: string; label: string; score: number }> = {
  battery: { color: '#22c55e', label: 'BAT', score: 0 },
  points: { color: '#fbbf24', label: '+50', score: 50 },
  cargo: { color: '#b45309', label: 'BOX', score: 80 },
  upgrade: { color: '#a855f7', label: 'UP', score: 20 },
  drone: { color: '#22d3ee', label: 'NEW', score: 30 },
}
function generatePickups(seedStr: string, count = 14): PickupItem[] {
  const rnd = mulberry32(seedFrom('pk' + seedStr))
  const bag: PickupType[] = ['battery', 'battery', 'points', 'points', 'points', 'cargo', 'cargo', 'upgrade', 'upgrade', 'drone']
  const out: PickupItem[] = []
  for (let i = 0; i < count; i++) out.push({ type: bag[Math.floor(rnd() * bag.length)], pos: [(rnd() - 0.5) * 300, 6 + rnd() * 40, -(rnd() * 460) - 20] })
  return out
}
interface MotherShipSpec { pos: Vec3 }
function generateMotherships(seedStr: string, count = 3): MotherShipSpec[] {
  const rnd = mulberry32(seedFrom('ms' + seedStr))
  const out: MotherShipSpec[] = []
  for (let i = 0; i < count; i++) out.push({ pos: [(rnd() - 0.5) * 260, 32 + rnd() * 26, -(rnd() * 420) - 40] })
  return out
}

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

const DEFAULT_MODEL_KEY = 'fpv-selected-model-v2'  // bump → reset về procedural (cánh quạt quay)

function loadSelectedModel(): string {
  // Mặc định: drone procedural (cánh quạt quay đảm bảo, load tức thì). Người chơi
  // vẫn chọn được model GLTF chi tiết ở màn setup (cũng thử quay cánh theo tên node).
  try { return localStorage.getItem(DEFAULT_MODEL_KEY) || 'procedural' } catch { return 'procedural' }
}
function saveSelectedModel(id: string) {
  try { localStorage.setItem(DEFAULT_MODEL_KEY, id) } catch {}
}

/** Component load GLTF từ URL — wrapped Suspense ở caller */
function GltfDrone({ url, scale, rotation, position, propSpeed = 1 }: {
  url: string; scale: number; rotation: [number, number, number]; position: [number, number, number]; propSpeed?: number
}) {
  const { scene } = useGLTF(url)
  // Clone scene để mỗi instance có transform riêng (useGLTF cache scene shared)
  const cloned = useMemo(() => scene.clone(), [scene])
  // Tìm các node CÁNH QUẠT theo tên để quay (prop/rotor/blade/helice/fan…).
  // Mỗi node lưu trục quay phù hợp (trục local "thẳng đứng" nhất theo world).
  const props = useMemo(() => {
    const list: { obj: THREE.Object3D; axis: 'x' | 'y' | 'z' }[] = []
    cloned.traverse((o) => {
      if (!/prop|rotor|blade|helix|helice|propeller|fan|spin|cánh|quạt/i.test(o.name)) return
      // Chọn trục local mà sau khi xoay ra world gần trục Y (thẳng đứng) nhất
      o.updateWorldMatrix(true, false)
      const m = o.matrixWorld.elements
      const cols: Record<'x' | 'y' | 'z', number> = { x: Math.abs(m[1]), y: Math.abs(m[5]), z: Math.abs(m[9]) }
      const axis = (Object.keys(cols) as ('x' | 'y' | 'z')[]).sort((a, b) => cols[b] - cols[a])[0]
      list.push({ obj: o, axis })
    })
    return list
  }, [cloned])
  useFrame((_s, dt) => {
    const a = dt * 45 * propSpeed
    for (const p of props) p.obj.rotation[p.axis] += a
  })
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
  map?: { lat: number; lon: number; radius?: number }                  // bay trên bản đồ thật (OSM)
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
        { center: [-4, 7, -10], radius: 7, speed: 0.8 },
        { center: [8, 9, -24], radius: 6, speed: 1.0 },
        { center: [-14, 6, -16], radius: 7, speed: 0.7 },
        { center: [0, 10, -30], radius: 8, speed: 0.85 },
      ],
      poles: [
        { pos: [3, 0, -12], h: 10 }, { pos: [-4, 0, -18], h: 12 },
        { pos: [7, 0, -26], h: 9 }, { pos: [-10, 0, -14], h: 11 },
        { pos: [0, 0, -24], h: 8 }, { pos: [14, 0, -20], h: 10 },
      ],
    },
    hint: 'Bay tới bãi XANH (LẤY) chậm lại để gắp kiện → bay tới bãi XANH DƯƠNG (THẢ). Né drone đỏ và cọc. Theo mũi tên chỉ đường.',
  },
  {
    id: 7, name: 'Bản đồ thật', emoji: '🗺️', difficulty: 'pro',
    description: 'Bay qua cổng giữa thành phố thật (OpenStreetMap) — toà nhà dựng từ địa hình thực',
    timeLimit: 150, reward: 2500, type: 'gates',
    map: { lat: 21.0285, lon: 105.8542, radius: 1200 }, // Hồ Gươm, Hà Nội
    gates: [
      { pos: [0, 30, -70], r: 3 },
      { pos: [90, 45, -150], r: 3 },
      { pos: [-80, 55, -240], r: 3 },
      { pos: [40, 40, -330], r: 3 },
    ],
    hint: 'Toà nhà là box từ OpenStreetMap quanh Hồ Gươm. Bay cao trên nóc nhà, né công trình, qua các cổng. Bản đồ tải vài giây lần đầu.',
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

      {/* Map thật → nền ẢNH VỆ TINH (Esri World Imagery); ngược lại → đồi procedural */}
      {level.map ? (
        <>
          <ProceduralGround size={3000} segments={24} color="#5a6b56" />
          <Suspense fallback={null}>
            <SatelliteGround lat={level.map.lat} lon={level.map.lon} radius={level.map.radius || 700} />
          </Suspense>
        </>
      ) : (
        <>
          <ProceduralGround size={2200} segments={90} />
          {/* Subtle grid for ground plane — visible chỉ trong vùng gần */}
          <gridHelper args={[240, 60, '#22c55e44', '#14532d44']} position={[0, 0.02, 0]} />
        </>
      )}

      {/* Per-level scenery (bỏ khi bay bản đồ thật để nhường chỗ cho OSM city) */}
      {!level.map && <LevelScenery levelId={level.id} />}

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
interface ControlInputs { throttle: number; yaw: number; pitch: number; roll: number; fire?: boolean }
const PHYSICS = {
  // Thông số theo FPV tốc độ cao THỰC TẾ:
  //  · thrustGain = gia tốc đẩy tối đa (m/s²). 70 ≈ 7G → TWR~7 (5" racing/freestyle),
  //    0–100 km/h trong ~0.5–0.7s như drone đua thật.
  //  · gravity 9.81 (thực). airDrag 0.985 → cruise ngang terminal ~200 km/h.
  thrustGain: 70, yawRate: 3.2, pitchRate: 2.5, rollRate: 2.5,
  airDrag: 0.985, gravity: 9.81, maxAltitude: 350, batteryDrain: 0.5,
  pitchAngle: 0.78, rollAngle: 0.6,   // góc nghiêng tối đa — vừa đủ dive, dễ kiểm soát
  maxSpeed: 95,                        // ~342 km/h (m/s) — vùng tốc độ FPV cao/kỷ lục
}

function DroneRig({
  inputs, level, model, onTelemetry, onGatePass, onHoverProgress, onCrash, posRef, rotRef,
  rechargeRef, boostRef, sizeMult, rangeMult, respawnRef,
}: {
  inputs: React.MutableRefObject<ControlInputs>
  level: Level
  model: DroneModel
  onTelemetry: (s: DroneState) => void
  onGatePass: (idx: number) => void
  onHoverProgress: (secondsHeld: number) => void
  onCrash: () => void
  posRef?: React.MutableRefObject<THREE.Vector3>
  rotRef?: React.MutableRefObject<{ yaw: number; pitch: number; roll: number }>
  rechargeRef?: React.MutableRefObject<number>          // >0 = nạp pin (phần thưởng trạm sạc)
  boostRef?: React.MutableRefObject<{ mult: number; until: number }>  // tăng lực đẩy tạm thời
  sizeMult?: number   // kích thước drone theo cấp độ người chơi
  rangeMult?: number  // tầm bay / lực đẩy theo cấp độ
  respawnRef?: React.MutableRefObject<number>  // >0 = hồi sinh (về điểm xuất phát, đầy pin)
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
  const thrustSpool = useRef(0.5)   // RPM động cơ (0..1) — tăng/giảm DẦN cho gia tốc có quán tính thật
  const camLook = useRef(new THREE.Vector3(0, 0.5, 1))
  const smooth = (dt: number, tau: number) => 1 - Math.exp(-dt / tau)

  useFrame((_state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30) // clamp để không giật khi frame rớt
    const s = stateRef.current
    const i = inputs.current
    const sm = inSmooth.current
    // Input low-pass → cảm giác mượt, không "bụp" như UE5 (frame-independent)
    const ai = smooth(dt, 0.10)
    sm.throttle += (i.throttle - sm.throttle) * ai
    sm.yaw += (i.yaw - sm.yaw) * ai
    sm.pitch += (i.pitch - sm.pitch) * ai
    sm.roll += (i.roll - sm.roll) * ai

    // Yaw: đẩy TRÁI → xoay TRÁI (trừ vì +X thế giới = bên trái màn hình ở góc nhìn FPV)
    s.yaw -= sm.yaw * PHYSICS.yawRate * dt
    // pitch/roll tiến nhanh-mượt về góc mục tiêu (FPV: nghiêng dốc hơn, phản hồi nhạy hơn)
    const ab = smooth(dt, 0.08)
    s.pitch += (sm.pitch * PHYSICS.pitchAngle - s.pitch) * ab
    s.roll += (sm.roll * PHYSICS.rollAngle - s.roll) * ab
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw)
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.pitch)
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.roll)
    const orient = yawQ.clone().multiply(pitchQ).multiply(rollQ)
    const thrustVec = new THREE.Vector3(0, 1, 0).applyQuaternion(orient)
    // Expo throttle: mịn quanh điểm hover, mạnh ở biên → dễ căn & giữ độ cao.
    const thrExpo = sm.throttle * (0.55 + 0.45 * sm.throttle * sm.throttle)
    const throttleTarget = Math.max(0, (thrExpo + 1) / 2)
    // Motor spool: động cơ lên/xuống RPM DẦN (tau~0.13s) → lực đẩy không tức thì,
    // gia tốc có "sức nặng" như drone thật thay vì bụp ngay.
    thrustSpool.current += (throttleTarget - thrustSpool.current) * smooth(dt, 0.13)
    const throttleMag = thrustSpool.current
    // Nạp pin (trạm sạc / mother ship) + boost (nâng cấp) + tầm bay theo cấp độ
    if (respawnRef && respawnRef.current > 0) { s.pos.set(0, 3, 0); s.vel.set(0, 0, 0); s.battery = 100; respawnRef.current = 0 }
    if (rechargeRef && rechargeRef.current > 0) { s.battery = Math.min(100, s.battery + rechargeRef.current); rechargeRef.current = 0 }
    const boostMult = boostRef && performance.now() < boostRef.current.until ? boostRef.current.mult : 1
    const thrust = PHYSICS.thrustGain * boostMult * (rangeMult ?? 1)
    s.vel.addScaledVector(thrustVec, throttleMag * thrust * dt)
    s.vel.y -= PHYSICS.gravity * dt
    s.vel.multiplyScalar(PHYSICS.airDrag ** (dt * 60))
    const vmax = PHYSICS.maxSpeed * (rangeMult ?? 1)
    if (s.vel.length() > vmax) s.vel.setLength(vmax)   // trần tốc độ (~400 km/h)
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
    if (rotRef) { rotRef.current.yaw = s.yaw; rotRef.current.pitch = s.pitch; rotRef.current.roll = s.roll }

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
    <group ref={groupRef} scale={sizeMult ?? 1}>
      {model.gltfUrl ? (
        // GLTF model — Suspense fallback ở caller, primitive sẽ mount khi load xong
        <GltfDrone url={model.gltfUrl} scale={model.scale}
          rotation={model.rotation} position={model.position} propSpeed={propSpeed} />
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
        inputsRef.current.fire = !!(pad.buttons[0]?.pressed || pad.buttons[5]?.pressed || pad.buttons[7]?.pressed)
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
    // Map sang [-1, 1], invert Y (touch Y down = positive nhưng game up = positive).
    // EXPO: mềm ở gần tâm → điều khiển tinh, vẫn đủ lực ở rìa (dễ lái hơn nhiều).
    const EXPO = 0.65
    const expo = (v: number) => v * (EXPO * v * v + (1 - EXPO))
    onMove(expo(dx / RADIUS), expo(-dy / RADIUS), inputsRef.current)
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
      position: 'absolute', bottom: 70, [side]: 24,
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
          border: `2px solid ${active ? '#22d3ee' : 'rgba(148, 163, 184, 0.4)'}`,
          backdropFilter: 'blur(4px)',
          transition: active ? 'none' : 'background 0.2s',
        }}
      >
        {/* Crosshair lines */}
        <div style={{ position: 'absolute', top: '50%', left: 4, right: 4, height: 1, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ position: 'absolute', left: '50%', top: 4, bottom: 4, width: 1, background: 'rgba(255,255,255,0.15)' }} />
        {/* Axis labels */}
        <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, color: 'rgba(255,255,255,0.82)', fontWeight: 700 }}>{axisLabels.y}+</div>
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, color: 'rgba(255,255,255,0.82)', fontWeight: 700 }}>{axisLabels.y}-</div>
        <div style={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)',
          fontSize: 11, color: 'rgba(255,255,255,0.82)', fontWeight: 700 }}>{axisLabels.x}+</div>
        <div style={{ position: 'absolute', top: '50%', left: 4, transform: 'translateY(-50%)',
          fontSize: 11, color: 'rgba(255,255,255,0.82)', fontWeight: 700 }}>{axisLabels.x}-</div>
        {/* Knob */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 38, height: 38, marginLeft: -19, marginTop: -19,
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          borderRadius: '50%',
          background: active
            ? CYAN_GRAD
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
// PEER DRONES (Thách đấu realtime) — drone người chơi khác
// ═════════════════════════════════════════════════════════════
function PeerDroneMesh() {
  const propRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])
  useFrame((_s, dt) => propRefs.current.forEach((p) => p && (p.rotation.y += dt * 40)))
  const arms: Vec3[] = [[0.22, 0, 0.22], [-0.22, 0, 0.22], [0.22, 0, -0.22], [-0.22, 0, -0.22]]
  return (
    <group>
      <mesh castShadow><boxGeometry args={[0.34, 0.1, 0.34]} /><meshStandardMaterial color="#f97316" metalness={0.5} roughness={0.4} /></mesh>
      {arms.map((p, i) => (
        <group key={i} position={p}>
          <mesh><cylinderGeometry args={[0.03, 0.03, 0.06, 8]} /><meshStandardMaterial color="#1c1917" /></mesh>
          <group ref={(el) => { propRefs.current[i] = el }} position={[0, 0.04, 0]}>
            <mesh><boxGeometry args={[0.26, 0.005, 0.03]} /><meshStandardMaterial color="#fdba74" transparent opacity={0.55} /></mesh>
          </group>
        </group>
      ))}
      <mesh position={[0, 0.08, 0.1]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#fed7aa" /></mesh>
    </group>
  )
}
function PeerGhost({ id, peersRef }: { id: string; peersRef: React.MutableRefObject<Map<string, Peer>> }) {
  const g = useRef<THREE.Group>(null)
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const tp = useMemo(() => new THREE.Vector3(), [])
  const [name, setName] = useState('')
  useFrame((_s, dt) => {
    const p = peersRef.current.get(id)
    const gg = g.current
    if (!p || !gg) return
    if (p.name !== name) setName(p.name)
    const k = 1 - Math.exp(-dt / 0.08)
    gg.position.lerp(tp.set(p.pos[0], p.pos[1], p.pos[2]), k)
    e.set(p.pitch, p.yaw, p.roll)
    gg.quaternion.slerp(q.setFromEuler(e), k)
  })
  return (
    <group ref={g}>
      <PeerDroneMesh />
      <Text position={[0, 0.5, 0]} fontSize={0.32} color="#fdba74" anchorX="center" outlineWidth={0.02} outlineColor="#000">{name}</Text>
    </group>
  )
}
function PeerDrones({ peersRef }: { peersRef: React.MutableRefObject<Map<string, Peer>> }) {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    const it = setInterval(() => {
      const now = performance.now()
      const map = peersRef.current
      for (const [k, v] of map) if (now - v.t > 2500) map.delete(k) // bỏ peer mất tín hiệu
      const keys = Array.from(map.keys())
      setIds((prev) => (prev.length === keys.length && prev.every((x) => keys.includes(x)) ? prev : keys))
    }, 500)
    return () => clearInterval(it)
  }, [peersRef])
  return <>{ids.map((id) => <PeerGhost key={id} id={id} peersRef={peersRef} />)}</>
}

// ═════════════════════════════════════════════════════════════
// PHẦN THƯỞNG (pickups) + MOTHER SHIP (trạm sạc bay)
// ═════════════════════════════════════════════════════════════
function PickupShape({ type }: { type: PickupType }) {
  const info = PICKUP_INFO[type]
  return (
    <group>
      {type === 'battery' && <mesh><cylinderGeometry args={[0.3, 0.3, 0.7, 12]} /><meshStandardMaterial color={info.color} emissive={info.color} emissiveIntensity={0.5} /></mesh>}
      {type === 'points' && <mesh><octahedronGeometry args={[0.45]} /><meshStandardMaterial color={info.color} emissive={info.color} emissiveIntensity={0.6} metalness={0.6} /></mesh>}
      {type === 'cargo' && <mesh><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial color={info.color} /></mesh>}
      {type === 'upgrade' && <mesh><coneGeometry args={[0.35, 0.7, 6]} /><meshStandardMaterial color={info.color} emissive={info.color} emissiveIntensity={0.6} /></mesh>}
      {type === 'drone' && <mesh><torusGeometry args={[0.35, 0.12, 10, 20]} /><meshStandardMaterial color={info.color} emissive={info.color} emissiveIntensity={0.6} /></mesh>}
      <Text position={[0, 0.7, 0]} fontSize={0.3} color={info.color} anchorX="center" outlineWidth={0.02} outlineColor="#000">{info.label}</Text>
    </group>
  )
}
function Pickups({ items, posRef, onCollect }: {
  items: PickupItem[]
  posRef: React.MutableRefObject<THREE.Vector3>
  onCollect: (type: PickupType) => void
}) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const taken = useRef<Set<number>>(new Set())
  useFrame((_s, dt) => {
    const dp = posRef.current
    items.forEach((it, i) => {
      const g = refs.current[i]
      if (!g) return
      if (taken.current.has(i)) { if (g.visible) g.visible = false; return }
      g.rotation.y += dt * 1.6
      g.position.y = it.pos[1] + Math.sin(performance.now() / 420 + i) * 0.25
      if (Math.hypot(dp.x - it.pos[0], dp.y - g.position.y, dp.z - it.pos[2]) < 1.7) {
        taken.current.add(i); g.visible = false; onCollect(it.type)
      }
    })
  })
  return <>{items.map((it, i) => <group key={i} ref={(el) => { refs.current[i] = el }} position={it.pos}><PickupShape type={it.type} /></group>)}</>
}
function MotherShips({ specs, posRef, onNear }: {
  specs: MotherShipSpec[]
  posRef: React.MutableRefObject<THREE.Vector3>
  onNear: () => void
}) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const lastTick = useRef(0)
  useFrame((_s, dt) => {
    const dp = posRef.current
    let near = false
    specs.forEach((sp, i) => {
      const g = refs.current[i]
      if (g) { g.position.y = sp.pos[1] + Math.sin(performance.now() / 1200 + i) * 0.6; g.rotation.y += dt * 0.15 }
      if (Math.hypot(dp.x - sp.pos[0], dp.y - sp.pos[1], dp.z - sp.pos[2]) < 16) near = true
    })
    if (near) { const now = performance.now(); if (now - lastTick.current > 200) { lastTick.current = now; onNear() } }
  })
  return (
    <>
      {specs.map((sp, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }} position={sp.pos}>
          <mesh castShadow><cylinderGeometry args={[6, 7, 1.6, 6]} /><meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[2.4, 4, 1.2, 6]} /><meshStandardMaterial color="#475569" metalness={0.6} /></mesh>
          <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[5, 7, 24]} /><meshBasicMaterial color="#22d3ee" transparent opacity={0.5} side={THREE.DoubleSide} /></mesh>
          <pointLight position={[0, -1, 0]} color="#22d3ee" intensity={2} distance={20} />
          <Text position={[0, 2.4, 0]} fontSize={0.9} color="#22d3ee" anchorX="center" outlineWidth={0.04} outlineColor="#000">⬡ TRẠM SẠC</Text>
        </group>
      ))}
    </>
  )
}

// ═════════════════════════════════════════════════════════════
// VŨ KHÍ — đạn bắn (tiêu diệt drone địch / bắn trúng đối thủ PvP)
// ═════════════════════════════════════════════════════════════
interface EnemyShared { pos: THREE.Vector3[]; alive: boolean[]; respawnAt: number[] }
const playShoot = () => sfxTone(900, 0.06, 'square', 0.1)
const playEmptyClick = () => sfxTone(150, 0.05, 'square', 0.07)
function Projectiles({ posRef, rotRef, inputs, ammoRef, onShoot, onEmpty, enemyShared, peersRef, onEnemyKill, onPeerShot, onExplode }: {
  posRef: React.MutableRefObject<THREE.Vector3>
  rotRef: React.MutableRefObject<{ yaw: number; pitch: number; roll: number }>
  inputs: React.MutableRefObject<ControlInputs>
  ammoRef: React.MutableRefObject<number>
  onShoot: () => void
  onEmpty?: () => void
  enemyShared?: React.MutableRefObject<EnemyShared | null>
  peersRef?: React.MutableRefObject<Map<string, Peer>>
  onEnemyKill?: () => void
  onPeerShot?: (cid: string) => void
  onExplode?: (x: number, y: number, z: number) => void
}) {
  const MAX = 24, SPEED = 70, LIFE = 2.2
  const pool = useRef(Array.from({ length: MAX }, () => ({ active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 })))
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const lastFire = useRef(0)
  const lastEmpty = useRef(0)
  const e = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  useFrame((_s, dt) => {
    const now = performance.now()
    // Bắn (edge + cooldown 220ms) — chỉ khi còn đạn
    if (inputs.current.fire && ammoRef.current > 0 && now - lastFire.current > 220) {
      lastFire.current = now
      ammoRef.current -= 1
      onShoot()
      playShoot()
      const r = rotRef.current
      const dir = new THREE.Vector3(0, 0, 1).applyEuler(e.set(r.pitch, r.yaw, r.roll))
      const slot = pool.current.find((p) => !p.active)
      if (slot) {
        slot.active = true; slot.life = LIFE
        slot.pos.copy(posRef.current).addScaledVector(dir, 1)
        slot.vel.copy(dir).multiplyScalar(SPEED)
      }
    } else if (inputs.current.fire && ammoRef.current <= 0 && now - lastEmpty.current > 600) {
      // Hết đạn: kêu lách cách + nhắc nạp ở tàu mẹ
      lastEmpty.current = now
      playEmptyClick()
      onEmpty?.()
    }
    // Cập nhật đạn + va chạm
    const es = enemyShared?.current
    pool.current.forEach((p, i) => {
      const m = refs.current[i]
      if (!p.active) { if (m) m.visible = false; return }
      p.life -= dt
      p.pos.addScaledVector(p.vel, dt)
      if (p.life <= 0 || p.pos.y < 0) { p.active = false; if (m) m.visible = false; return }
      // trúng địch
      if (es) {
        for (let k = 0; k < es.pos.length; k++) {
          if (!es.alive[k]) continue
          if (p.pos.distanceTo(es.pos[k]) < 1.6) { es.alive[k] = false; es.respawnAt[k] = now + 4000; p.active = false; onExplode?.(es.pos[k].x, es.pos[k].y, es.pos[k].z); onEnemyKill?.(); break }
        }
      }
      // trúng đối thủ PvP
      if (p.active && peersRef) {
        for (const [cid, pr] of peersRef.current) {
          if (p.pos.distanceTo(new THREE.Vector3(pr.pos[0], pr.pos[1], pr.pos[2])) < 1.6) { p.active = false; onExplode?.(pr.pos[0], pr.pos[1], pr.pos[2]); onPeerShot?.(cid); break }
        }
      }
      if (m) { m.visible = p.active; m.position.copy(p.pos) }
    })
  })
  return (
    <>
      {pool.current.map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }} visible={false}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#fde047" toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

// Hiệu ứng nổ (khi đạn trúng / drone bị hạ gục)
function Explosions({ fxRef }: { fxRef: React.MutableRefObject<{ x: number; y: number; z: number; t: number }[]> }) {
  const MAX = 12
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    const now = performance.now()
    const arr = fxRef.current
    while (arr.length && now - arr[0].t > 700) arr.shift()
    for (let i = 0; i < MAX; i++) {
      const m = refs.current[i]
      if (!m) continue
      const fx = arr[i]
      if (!fx) { m.visible = false; continue }
      const age = (now - fx.t) / 700
      m.visible = true
      m.position.set(fx.x, fx.y, fx.z)
      m.scale.setScalar(0.5 + age * 3.5)
      ;(m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - age))
    }
  })
  return <>{Array.from({ length: MAX }).map((_, i) => (
    <mesh key={i} ref={(el) => { refs.current[i] = el }} visible={false}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color="#fb923c" transparent opacity={0.85} toneMapped={false} />
    </mesh>
  ))}</>
}

// ═════════════════════════════════════════════════════════════
// OSM CITY — box công trình từ OpenStreetMap + tile culling
// Chia bản đồ thành ô vuông (tile), chỉ dựng ô quanh drone (trong tầm nhìn).
// 1 InstancedMesh → 1 draw call; chỉ rebuild khi drone sang ô mới.
// ═════════════════════════════════════════════════════════════
function OsmCity({ boxes, posRef, tile = 90, viewTiles = 4, onHitBuilding }: {
  boxes: OsmBox[]
  posRef: React.MutableRefObject<THREE.Vector3>
  tile?: number
  viewTiles?: number
  onHitBuilding?: () => void   // drone đâm vào toà nhà → cháy & die
}) {
  const MAX = 5000
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const lastKey = useRef('')
  const hitCd = useRef(0)   // cooldown tránh trigger nổ liên tục cùng 1 va chạm
  const tiles = useMemo(() => {
    const m = new Map<string, OsmBox[]>()
    for (const b of boxes) {
      const k = `${Math.floor(b.cx / tile)}_${Math.floor(b.cz / tile)}`
      let a = m.get(k); if (!a) { a = []; m.set(k, a) }
      a.push(b)
    }
    return m
  }, [boxes, tile])
  useEffect(() => { if (meshRef.current) meshRef.current.count = 0; lastKey.current = '' }, [boxes])
  useFrame(() => {
    const dp = posRef.current
    const tx = Math.floor(dp.x / tile), tz = Math.floor(dp.z / tile)

    // ── VA CHẠM CÔNG TRÌNH → cháy & die ──
    // Kiểm tra mỗi frame: drone nằm trong khối nhà nào (footprint + dưới mái) không.
    // Chỉ quét các ô quanh drone (đã bucket) cho nhẹ; cooldown 2s sau mỗi lần đâm.
    if (onHitBuilding && performance.now() > hitCd.current && dp.y > 0.4 && dp.y < 400) {
      const R = 0.7 // bán kính drone
      outer:
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const arr = tiles.get(`${tx + i}_${tz + j}`)
        if (!arr) continue
        for (const b of arr) {
          if (dp.y < b.h + R &&
              Math.abs(dp.x - b.cx) < b.w / 2 + R &&
              Math.abs(dp.z - b.cz) < b.d / 2 + R) {
            hitCd.current = performance.now() + 2000
            onHitBuilding()
            break outer
          }
        }
      }
    }

    const key = `${tx}_${tz}`
    if (key === lastKey.current) return // chưa sang ô mới → khỏi rebuild
    lastKey.current = key
    const mesh = meshRef.current
    if (!mesh) return
    let n = 0
    for (let i = -viewTiles; i <= viewTiles && n < MAX; i++) {
      for (let j = -viewTiles; j <= viewTiles && n < MAX; j++) {
        const arr = tiles.get(`${tx + i}_${tz + j}`)
        if (!arr) continue
        for (const b of arr) {
          if (n >= MAX) break
          dummy.position.set(b.cx, b.h / 2, b.cz)
          dummy.scale.set(Math.max(2, b.w), b.h, Math.max(2, b.d))
          dummy.rotation.set(0, 0, 0)
          dummy.updateMatrix()
          mesh.setMatrixAt(n, dummy.matrix)
          n++
        }
      }
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#7b8794" roughness={0.85} metalness={0.05} />
    </instancedMesh>
  )
}
// Nền ẢNH VỆ TINH cho map thật: ảnh Esri World Imagery (miễn phí, không cần key)
// căn theo (lat,lon) — trục khớp với box OSM (đông=+x, bắc=-z).
function SatelliteGround({ lat, lon, radius }: { lat: number; lon: number; radius: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const dLat = radius / 110540
    const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180))
    const bbox = `${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=1024,1024&format=jpeg&transparent=false&f=image`
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    let alive = true
    loader.load(url, (t) => {
      if (!alive) { t.dispose(); return }
      ;(t as any).colorSpace = (THREE as any).SRGBColorSpace || 'srgb'
      t.anisotropy = 4
      setTex(t)
    }, undefined, () => { /* lỗi tải → giữ nền procedural */ })
    return () => { alive = false }
  }, [lat, lon, radius])
  if (!tex) return null
  const size = radius * 2
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={tex} roughness={1} metalness={0} />
    </mesh>
  )
}
function OsmCityLoader({ lat, lon, radius = 700, posRef, onStatus, onHitBuilding }: {
  lat: number; lon: number; radius?: number
  posRef: React.MutableRefObject<THREE.Vector3>
  onStatus?: (s: 'loading' | 'ready' | 'empty' | 'error') => void
  onHitBuilding?: () => void
}) {
  const [boxes, setBoxes] = useState<OsmBox[] | null>(null)
  useEffect(() => {
    let alive = true
    onStatus?.('loading')
    fetchOsmBuildings(lat, lon, radius)
      .then((b) => { if (!alive) return; setBoxes(b); onStatus?.(b.length ? 'ready' : 'empty') })
      .catch(() => alive && onStatus?.('error'))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, radius])
  if (!boxes || !boxes.length) return null
  return <OsmCity boxes={boxes} posRef={posRef} onHitBuilding={onHitBuilding} />
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
function EnemyDrones({ posRef, specs, onHit, shared }: {
  posRef: React.MutableRefObject<THREE.Vector3>
  specs: Array<{ center: Vec3; radius: number; speed: number }>
  onHit: () => void
  shared?: React.MutableRefObject<EnemyShared | null>
}) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const lastHit = useRef(0)
  const local = useRef<EnemyShared>({ pos: specs.map(() => new THREE.Vector3()), alive: specs.map(() => true), respawnAt: specs.map(() => 0) })
  const vel = useRef(specs.map(() => new THREE.Vector3()))
  const atk = useRef(specs.map(() => ({ attacking: false, until: 0 })))   // trạng thái tấn công/cooldown
  const nextWave = useRef(performance.now() + 2200)
  const inited = useRef(false)
  useEffect(() => { if (shared) shared.current = local.current }, [shared])
  const T = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), center: new THREE.Vector3(), avg: new THREE.Vector3(), steer: new THREE.Vector3() }), [])

  useFrame((_s, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const dp = posRef.current
    const st = local.current
    const now = performance.now()
    if (!inited.current) {
      specs.forEach((sp, i) => st.pos[i].set(sp.center[0] + Math.cos(i) * sp.radius, sp.center[1] + 3, sp.center[2] + Math.sin(i) * sp.radius))
      inited.current = true
    }
    const aliveIdx: number[] = []
    for (let i = 0; i < specs.length; i++) if (st.alive[i]) aliveIdx.push(i)

    // Tâm bầy
    T.center.set(0, 0, 0)
    for (const i of aliveIdx) T.center.add(st.pos[i])
    if (aliveIdx.length) T.center.multiplyScalar(1 / aliveIdx.length)

    // CHIẾN THUẬT THEO ĐỢT: cứ vài giây cử ~1/3 bầy lao vào tấn công (so le)
    const nAttacking = aliveIdx.filter((i) => atk.current[i].attacking).length
    if (now > nextWave.current && aliveIdx.length && nAttacking < Math.max(1, Math.ceil(aliveIdx.length / 3))) {
      const cand = aliveIdx.filter((i) => !atk.current[i].attacking && now > atk.current[i].until)
      if (cand.length) {
        const pick = cand[Math.floor(Math.random() * cand.length)]
        atk.current[pick].attacking = true
        atk.current[pick].until = now + 3800
        nextWave.current = now + 1500 + Math.random() * 1300
      } else nextWave.current = now + 700
    }

    specs.forEach((sp, i) => {
      const g = refs.current[i]; if (!g) return
      if (!st.alive[i]) { g.visible = false; if (now > st.respawnAt[i]) { st.alive[i] = true; atk.current[i].attacking = false } return }
      g.visible = true
      const p = st.pos[i], v = vel.current[i]
      const base = sp.speed * 3 + 9   // tốc độ nền (m/s)
      T.steer.set(0, 0, 0)

      // ── BOIDS: tách (separation) · đồng hướng (alignment) · quây (cohesion) ──
      let aliN = 0; T.avg.set(0, 0, 0)
      for (const j of aliveIdx) {
        if (j === i) continue
        const d = p.distanceTo(st.pos[j])
        if (d > 0.001 && d < 4.2) { T.b.copy(p).sub(st.pos[j]).multiplyScalar(1.8 / d); T.steer.add(T.b) }   // separation
        if (d < 15) { T.avg.add(vel.current[j]); aliN++ }
      }
      if (aliN) { T.avg.multiplyScalar(1 / aliN).sub(v); if (T.avg.lengthSq() > 1e-4) T.steer.addScaledVector(T.avg.normalize(), 0.8) }  // alignment
      T.a.copy(T.center).sub(p); if (T.a.lengthSq() > 1e-4) T.steer.addScaledVector(T.a.normalize(), 0.35)  // cohesion

      const toP = T.b.copy(dp).sub(p); const dPlayer = toP.length(); if (dPlayer > 1e-3) toP.normalize()

      if (atk.current[i].attacking) {
        // ── ĐÒN BỔ NHÀO: lao thẳng vào người chơi, tốc độ cao ──
        T.steer.addScaledVector(toP, 5)
        if (dPlayer < 2.2 || now > atk.current[i].until) { atk.current[i].attacking = false; atk.current[i].until = now + 2400 + Math.random() * 2200 }
      } else {
        // ── BAO VÂY: giữ vị trí quanh người chơi ở cự ly chờ (encircle) ──
        const ang = (i / Math.max(1, specs.length)) * Math.PI * 2 + now * 0.0002
        T.a.set(dp.x + Math.cos(ang) * 20, dp.y + 4 + Math.sin(i * 1.3) * 3, dp.z + Math.sin(ang) * 20).sub(p)
        if (T.a.lengthSq() > 1e-4) T.steer.addScaledVector(T.a.normalize(), 1.7)
      }

      // Tích phân vận tốc + giới hạn + cản
      v.addScaledVector(T.steer, base * dt * 2.2)
      const vmax = atk.current[i].attacking ? base * 1.9 : base
      if (v.length() > vmax) v.setLength(vmax)
      v.multiplyScalar(0.95)
      p.addScaledVector(v, dt)
      if (p.y < 1) { p.y = 1; if (v.y < 0) v.y = -v.y * 0.3 }

      g.position.copy(p)
      if (v.lengthSq() > 0.15) g.rotation.y = Math.atan2(v.x, v.z)
      g.rotation.z = Math.sin(now * 0.012 + i) * 0.18   // nghiêng cánh
      g.scale.setScalar(atk.current[i].attacking ? 1.18 : 1)   // phình to khi bổ nhào

      if (dPlayer < 1.5 && now - lastHit.current > 900) { lastHit.current = now; onHit() }
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

// ── Sci-fi HUD palette ──
const HUD_C = '#7cf7e6'        // teal-cyan sáng (tương phản tốt hơn)
const HUD_DIM = '#c7f5ec'      // sáng + ĐẶC (trước là 45% opacity → quá mờ)
const HUD_BG = 'rgba(3,20,26,0.82)'  // nền panel đậm hơn để chữ nổi
// Viền tối quanh chữ SVG → đọc rõ trên MỌI nền (trời sáng, đất, biển…)
const HUD_OUTLINE = { stroke: 'rgba(1,14,18,0.92)', strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' } as React.CSSProperties
// Bóng tối cho chữ HTML (thay glow cyan vốn không tăng tương phản)
const HUD_TXT_SHADOW = '0 1px 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.85)'
// Nền sci-fi dùng chung cho các màn (lưới + glow + gradient tối)
const SCIFI_BG = [
  'radial-gradient(circle at 50% 8%, rgba(34,211,238,0.12), transparent 55%)',
  'linear-gradient(rgba(34,211,238,0.045) 1px, transparent 1px) 0 0/42px 42px',
  'linear-gradient(90deg, rgba(34,211,238,0.045) 1px, transparent 1px) 0 0/42px 42px',
  'linear-gradient(160deg, #07151c 0%, #040c12 100%)',
].join(',')
const CYAN_GRAD = 'linear-gradient(135deg, #22d3ee, #0ea5e9)'
// 4 khung góc sci-fi cho màn hình
function ScreenCorners() {
  const b = (s: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: 42, height: 42, borderColor: 'rgba(34,211,238,0.45)',
    borderStyle: 'solid', pointerEvents: 'none', zIndex: 2, ...s,
  })
  return (
    <>
      <div style={b({ top: 8, left: 8, borderWidth: '2px 0 0 2px' })} />
      <div style={b({ top: 8, right: 8, borderWidth: '2px 2px 0 0' })} />
      <div style={b({ bottom: 8, left: 8, borderWidth: '0 0 2px 2px' })} />
      <div style={b({ bottom: 8, right: 8, borderWidth: '0 2px 2px 0' })} />
    </>
  )
}

/** Thước dọc (tốc độ / độ cao) kiểu HUD máy bay. */
function HudTape({ value, label, unit, side, warn }: { value: number; label: string; unit: string; side: 'left' | 'right'; warn?: boolean }) {
  const boxStroke = warn ? '#ffd24d' : HUD_C
  const H = 200, W = 64, step = 5, win = 20
  const ticks: { v: number; y: number }[] = []
  const startV = Math.ceil((value - win) / step) * step
  for (let v = startV; v <= value + win; v += step) ticks.push({ v, y: H / 2 - ((v - value) / (win * 2)) * H })
  const railX = side === 'left' ? W - 2 : 2
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <text x={railX} y={-8} fontSize={11} fontWeight="bold" fill={HUD_C} textAnchor={side === 'left' ? 'end' : 'start'} style={{ letterSpacing: 1, ...HUD_OUTLINE }}>{label}</text>
      <line x1={railX} y1={0} x2={railX} y2={H} stroke={HUD_DIM} strokeWidth={1.5} />
      {ticks.map((t, i) => {
        const major = Math.abs(Math.round(t.v) % 10) === 0
        const len = major ? 14 : 7
        const x2 = side === 'left' ? railX - len : railX + len
        return (
          <g key={i} opacity={0.92}>
            <line x1={railX} y1={t.y} x2={x2} y2={t.y} stroke={HUD_C} strokeWidth={1.3} />
            {major && <text x={side === 'left' ? railX - 18 : railX + 18} y={t.y + 3} fontSize={10} fontWeight="bold" fill={HUD_C} textAnchor={side === 'left' ? 'end' : 'start'} style={HUD_OUTLINE}>{Math.round(t.v)}</text>}
          </g>
        )
      })}
      <polygon
        points={side === 'left'
          ? `${railX},${H / 2} ${railX - 8},${H / 2 - 12} ${W - 56},${H / 2 - 12} ${W - 56},${H / 2 + 12} ${railX - 8},${H / 2 + 12}`
          : `${railX},${H / 2} ${railX + 8},${H / 2 - 12} ${58},${H / 2 - 12} ${58},${H / 2 + 12} ${railX + 8},${H / 2 + 12}`}
        fill={HUD_BG} stroke={boxStroke} strokeWidth={2}
      />
      <text x={side === 'left' ? W / 2 - 6 : W / 2 + 6} y={H / 2 + 6} fontSize={20} fontWeight="bold" fill={warn ? '#ffd24d' : '#fff'} textAnchor="middle" style={HUD_OUTLINE}>{value.toFixed(0)}</text>
      <text x={railX} y={H + 14} fontSize={9} fontWeight="bold" fill={HUD_DIM} textAnchor={side === 'left' ? 'end' : 'start'} style={HUD_OUTLINE}>{unit}</text>
    </svg>
  )
}

/** Dải la bàn ngang trên đỉnh. */
function HudCompass({ heading }: { heading: number }) {
  const W = 300, H = 34, win = 60
  const marks: { d: number; x: number }[] = []
  const start = Math.ceil((heading - win) / 15) * 15
  for (let d = start; d <= heading + win; d += 15) {
    let dd = ((d % 360) + 360) % 360
    marks.push({ d: dd, x: W / 2 + ((d - heading) / win) * (W / 2) })
  }
  const card: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }
  return (
    <svg width={W} height={H} style={{ overflow: 'hidden' }}>
      <line x1={0} y1={H - 2} x2={W} y2={H - 2} stroke={HUD_DIM} strokeWidth={1} />
      {marks.map((m, i) => (
        <g key={i} opacity={0.85}>
          <line x1={m.x} y1={H - 2} x2={m.x} y2={card[m.d] ? H - 14 : H - 8} stroke={HUD_C} strokeWidth={card[m.d] ? 1.6 : 1} />
          {card[m.d] && <text x={m.x} y={H - 18} fontSize={13} fontWeight="bold" fill={HUD_C} textAnchor="middle" style={HUD_OUTLINE}>{card[m.d]}</text>}
        </g>
      ))}
      <polygon points={`${W / 2},2 ${W / 2 - 6},-6 ${W / 2 + 6},-6`} fill="#fbbf24" transform="translate(0,8)" />
      <rect x={W / 2 - 24} y={0} width={48} height={16} rx={2} fill={HUD_BG} stroke={HUD_C} strokeWidth={1.3} />
      <text x={W / 2} y={12} fontSize={12} fontWeight="bold" fill="#fff" textAnchor="middle" style={HUD_OUTLINE}>{Math.round(heading)}°</text>
    </svg>
  )
}

/** Radar tròn góc dưới-phải: chấm mục tiêu quanh drone (forward = lên). */
function HudRadar({ heading, rel }: { heading: number; rel: { x: number; z: number; color: string }[] }) {
  const R = 56, range = 60
  const yaw = (heading * Math.PI) / 180
  const fx = Math.sin(yaw), fz = Math.cos(yaw)
  return (
    <svg width={R * 2} height={R * 2}>
      <circle cx={R} cy={R} r={R - 2} fill="rgba(6,30,38,0.5)" stroke={HUD_DIM} strokeWidth={1} />
      <circle cx={R} cy={R} r={(R - 2) * 0.6} fill="none" stroke={HUD_DIM} strokeWidth={0.6} />
      <line x1={R} y1={4} x2={R} y2={R * 2 - 4} stroke={HUD_DIM} strokeWidth={0.5} />
      <line x1={4} y1={R} x2={R * 2 - 4} y2={R} stroke={HUD_DIM} strokeWidth={0.5} />
      {/* Tia quét quay (SMIL — mượt, không phụ thuộc React render) */}
      <polygon points={`${R},${R} ${R},6 ${R + 22},10`} fill={HUD_C} opacity={0.22}>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${R} ${R}`} to={`360 ${R} ${R}`} dur="3.2s" repeatCount="indefinite" />
      </polygon>
      {rel.map((t, i) => {
        const right = t.x * fz - t.z * fx
        const fwd = t.x * fx + t.z * fz
        let px = R + (right / range) * (R - 6)
        let py = R - (fwd / range) * (R - 6)
        const d = Math.hypot(px - R, py - R)
        if (d > R - 6) { px = R + ((px - R) / d) * (R - 6); py = R + ((py - R) / d) * (R - 6) }
        return <circle key={i} cx={px} cy={py} r={3.5} fill={t.color} />
      })}
      <polygon points={`${R},${R - 6} ${R - 5},${R + 5} ${R + 5},${R + 5}`} fill={HUD_C} />
    </svg>
  )
}

/** Đường chân trời nhân tạo — nghiêng theo roll, trượt theo pitch (FPV artificial horizon). */
function HudHorizon({ pitch, roll }: { pitch: number; roll: number }) {
  const W = 260, H = 160
  const rollDeg = (roll * 180) / Math.PI
  const pitchPx = (pitch * 180) / Math.PI * 2.2 // độ → px
  const ladder = [-20, -10, 10, 20]
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', opacity: 0.95 }}>
      <g transform={`rotate(${-rollDeg} ${W / 2} ${H / 2})`}>
        <g transform={`translate(0 ${pitchPx})`}>
          {/* đường chân trời */}
          <line x1={W / 2 - 110} y1={H / 2} x2={W / 2 - 24} y2={H / 2} stroke={HUD_C} strokeWidth={1.4} />
          <line x1={W / 2 + 24} y1={H / 2} x2={W / 2 + 110} y2={H / 2} stroke={HUD_C} strokeWidth={1.4} />
          {ladder.map((d) => {
            const y = H / 2 - d * 2.2
            const w = d % 20 === 0 ? 44 : 28
            return (
              <g key={d} opacity={0.92}>
                <line x1={W / 2 - w} y1={y} x2={W / 2 - 14} y2={y} stroke={HUD_C} strokeWidth={1.3} />
                <line x1={W / 2 + 14} y1={y} x2={W / 2 + w} y2={y} stroke={HUD_C} strokeWidth={1.3} />
                <text x={W / 2 - w - 6} y={y + 3} fontSize={9} fontWeight="bold" fill={HUD_C} textAnchor="end" style={HUD_OUTLINE}>{Math.abs(d)}</text>
              </g>
            )
          })}
        </g>
      </g>
      {/* chỉ báo roll cố định (cung trên) */}
      <path d={`M${W / 2 - 40},${H / 2 - 56} A56,56 0 0 1 ${W / 2 + 40},${H / 2 - 56}`} fill="none" stroke={HUD_DIM} strokeWidth={1} />
      <polygon points={`${W / 2},${H / 2 - 52} ${W / 2 - 5},${H / 2 - 44} ${W / 2 + 5},${H / 2 - 44}`} fill="#fbbf24"
        transform={`rotate(${rollDeg} ${W / 2} ${H / 2})`} />
    </svg>
  )
}

function GameHUD({
  telemetry, gamepadId, level, gateProgress, hoverProgress, timeRemaining, targets = [],
}: {
  telemetry: DroneState | null; gamepadId: string | null; level: Level
  gateProgress: number; hoverProgress: number; timeRemaining: number
  targets?: { x: number; z: number; color: string }[]
}) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const upd = () => setScale(Math.min(1, window.innerWidth / 900))
    upd(); window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])
  if (!telemetry) return null
  const speed = telemetry.vel.length() * 3.6 // km/h cho cảm giác HUD
  const altM = telemetry.pos.y               // độ cao trên mặt đất (m)
  const climb = telemetry.vel.y              // tốc độ lên/xuống (m/s)
  const altWarn = altM < 3                   // gần mặt đất → cảnh báo
  const climbStr = climb > 0.4 ? `▲ ${Math.abs(climb).toFixed(1)}` : climb < -0.4 ? `▼ ${Math.abs(climb).toFixed(1)}` : '• 0.0'
  const climbColor = climb > 0.4 ? '#7CFC9A' : climb < -0.4 ? '#ffb86b' : HUD_DIM
  const heading = ((telemetry.yaw * 180) / Math.PI % 360 + 360) % 360
  const battColor = telemetry.battery > 30 ? HUD_C : telemetry.battery > 15 ? '#f59e0b' : '#ef4444'
  const rel = targets.map((t) => ({ x: t.x - telemetry.pos.x, z: t.z - telemetry.pos.z, color: t.color }))
  const objStr = level.type === 'hover' && level.hover
    ? `HOVER ${hoverProgress.toFixed(1)}/${level.hover.duration}s`
    : level.type === 'cargo' && level.cargo
      ? `CARGO ${gateProgress}` // gateProgress unused cho cargo; HUD cargo riêng ở GameScreen
      : `GATE ${gateProgress}/${(level.gates || []).length}`
  const bracket = (corner: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: 26, height: 26, borderColor: HUD_DIM, borderStyle: 'solid', ...corner,
  })
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      fontFamily: 'ui-monospace, monospace', color: HUD_C, fontWeight: 600,
      textShadow: HUD_TXT_SHADOW,
      // Quầng tối quanh MỌI nét HUD → tương phản rõ cả khi bay trên nền TRỜI sáng
      // (cyan/trắng trên trời xanh dễ chìm). Áp 1 lần cho toàn overlay, rẻ về GPU.
      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.92)) drop-shadow(0 0 2px rgba(0,0,0,0.8))',
      transform: `scale(${scale})`, transformOrigin: 'center center',
    }}>
      {/* Đường chân trời nhân tạo (sau tâm ngắm) */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
        <HudHorizon pitch={telemetry.pitch} roll={telemetry.roll} />
      </div>
      {/* Khung góc HUD */}
      <div style={bracket({ top: 14, left: 14, borderWidth: '2px 0 0 2px' })} />
      <div style={bracket({ top: 14, right: 14, borderWidth: '2px 2px 0 0' })} />
      <div style={bracket({ bottom: 14, left: 14, borderWidth: '0 0 2px 2px' })} />
      <div style={bracket({ bottom: 14, right: 14, borderWidth: '0 2px 2px 0' })} />

      {/* La bàn — đẩy xuống dưới bảng chỉ số ở đỉnh */}
      <div style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)' }}>
        <HudCompass heading={heading} />
      </div>

      {/* Thước tốc độ (trái) + độ cao (phải) */}
      <div style={{ position: 'absolute', top: '50%', left: 26, transform: 'translateY(-50%)' }}>
        <HudTape value={speed} label="SPD" unit="km/h" side="left" />
      </div>
      <div style={{ position: 'absolute', top: '50%', right: 26, transform: 'translateY(-50%)' }}>
        <HudTape value={altM} label="ALT" unit="m" side="right" warn={altWarn} />
      </div>

      {/* Tâm ngắm + ladder */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
        <svg width={120} height={70} style={{ overflow: 'visible' }}>
          <circle cx={60} cy={35} r={5} fill="none" stroke={HUD_C} strokeWidth={1.4} />
          <line x1={18} y1={35} x2={48} y2={35} stroke={HUD_C} strokeWidth={1.4} />
          <line x1={72} y1={35} x2={102} y2={35} stroke={HUD_C} strokeWidth={1.4} />
          <line x1={48} y1={35} x2={52} y2={31} stroke={HUD_C} strokeWidth={1.4} />
          <line x1={72} y1={35} x2={68} y2={31} stroke={HUD_C} strokeWidth={1.4} />
        </svg>
      </div>

      {/* TỐC ĐỘ + ĐỘ CAO — số lớn rõ kiểu OSD FPV (ngay dưới tâm ngắm), độ cao
          ngang hàng với tốc độ + mũi tên lên/xuống để dễ quan sát & căn độ cao */}
      <div style={{ position: 'absolute', top: 'calc(50% + 40px)', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'flex-start', gap: 52, fontFamily: 'monospace', background: 'rgba(2,12,16,0.42)', borderRadius: 14, padding: '6px 18px 4px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#ffffff', lineHeight: 1, textShadow: HUD_TXT_SHADOW }}>{Math.round(speed)}</div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: HUD_DIM, letterSpacing: 2 }}>KM/H</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: altWarn ? '#ffd24d' : '#ffffff', lineHeight: 1, textShadow: HUD_TXT_SHADOW }}>{Math.round(altM)}</div>
          <div style={{ fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
            <span style={{ color: HUD_DIM }}>ALT m </span>
            <span style={{ color: climbColor }}>{climbStr}</span>
          </div>
        </div>
      </div>

      {/* Objective + time — thanh trên */}
      <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#fcd34d', fontWeight: 'bold' }}>{objStr}</div>
        <div style={{ fontSize: 15, fontWeight: 'bold', color: timeRemaining < 10 ? '#ff6b6b' : HUD_C }}>⏱ {timeRemaining.toFixed(1)}s</div>
      </div>

      {/* Pin — cột dọc bên trái ngoài */}
      <div style={{ position: 'absolute', top: '50%', left: 96, transform: 'translateY(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 'bold', color: HUD_DIM, marginBottom: 3 }}>BATT</div>
        <div style={{ width: 8, height: 120, background: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', border: `1px solid ${HUD_DIM}` }}>
          <div style={{ width: '100%', height: `${telemetry.battery}%`, background: battColor }} />
        </div>
        <div style={{ fontSize: 12, color: battColor, marginTop: 3, fontWeight: 'bold' }}>{telemetry.battery.toFixed(0)}%</div>
      </div>

      {/* Radar góc dưới-phải */}
      <div style={{ position: 'absolute', bottom: 26, right: 26 }}>
        <HudRadar heading={heading} rel={rel} />
        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 'bold', color: HUD_DIM, marginTop: 2 }}>RADAR {Math.round(speed)}km/h</div>
      </div>

      {/* Input source góc dưới-trái */}
      <div style={{ position: 'absolute', bottom: 28, left: 50, fontSize: 11, fontWeight: 'bold', color: HUD_DIM }}>
        {gamepadId ? `🎮 ${gamepadId.slice(0, 24)}` : '⌨️/🕹️ READY'}
      </div>
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
      position: 'relative',
      width: '100%', height: '100%', overflowY: 'auto',
      background: SCIFI_BG,
      color: '#e2e8f0', padding: '32px 24px', fontFamily: 'ui-monospace, monospace',
    }}>
      <ScreenCorners />
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 'bold', margin: '0 0 8px', background: CYAN_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
                background: vrSupport === 'yes' ? '#22d3ee' : '#475569', color: 'white' }}>
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
            <p style={{ marginTop: 0 }}><b style={{ color: '#22d3ee' }}>1. Tay cầm FPV (FrSky / RadioMaster / TBS Tango):</b></p>
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
            <p style={{ marginTop: 12 }}><b style={{ color: '#22d3ee' }}>3. VR Headset (tuỳ chọn — Meta Quest / Vision Pro):</b></p>
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
              background: gamepadId ? CYAN_GRAD : '#475569',
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
      position: 'relative',
      width: '100%', height: '100%', overflowY: 'auto',
      background: SCIFI_BG,
      color: '#e2e8f0', padding: '24px', fontFamily: 'ui-monospace, monospace',
    }}>
      <ScreenCorners />
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
          <div style={{ fontSize: 10, color: '#7dd3fc', marginBottom: 8 }}>Cấp người chơi: <b style={{ color: '#fbbf24' }}>{playerLevel(getPoints())}</b> · drone xịn mở khoá theo cấp</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {DRONE_MODELS.map((m, idx) => {
              const active = m.id === selectedModelId
              const reqLevel = idx === 0 ? 1 : idx * 2 // model0 free, sau đó cấp 2,4,6…
              const locked = playerLevel(getPoints()) < reqLevel
              return (
                <button
                  key={m.id}
                  disabled={locked}
                  onClick={() => { if (locked) return; onSelectModel(m.id); saveSelectedModel(m.id) }}
                  style={{
                    padding: 12, borderRadius: 10, cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left',
                    background: active ? 'rgba(34,211,238,0.15)' : 'rgba(15, 23, 42, 0.5)',
                    border: `1px solid ${active ? '#22d3ee' : 'rgba(71, 85, 105, 0.4)'}`,
                    color: '#e2e8f0', transition: 'all 0.15s', opacity: locked ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>{locked ? '🔒' : m.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                        {m.name}
                        {active && <span style={{ marginLeft: 6, fontSize: 11, color: '#22d3ee' }}>● ĐANG DÙNG</span>}
                        {locked && <span style={{ marginLeft: 6, fontSize: 11, color: '#f87171' }}>🔒 Cấp {reqLevel}</span>}
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
  level, model, onComplete, onAbort, room, playerName,
}: {
  level: Level
  model: DroneModel
  onComplete: (success: boolean, elapsed: number) => void
  onAbort: () => void
  room?: string
  playerName?: string
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
  const droneRotRef = useRef({ yaw: 0, pitch: 0, roll: 0 })
  // Phần thưởng / nâng cấp / cấp độ
  const rechargeRef = useRef(0)
  const boostRef = useRef({ mult: 1, until: 0 })
  const [points] = useState(() => getPoints())
  const lvlNum = playerLevel(points)
  const sizeMult = 1 + (lvlNum - 1) * 0.08
  const rangeMult = 1 + (lvlNum - 1) * 0.06
  const [runScore, setRunScore] = useState(0)
  const [collectMsg, setCollectMsg] = useState<string | null>(null)
  const [modelOverride, setModelOverride] = useState<DroneModel | null>(null)
  const [boostOn, setBoostOn] = useState(false)
  const seedStr = room || `lvl${level.id}`
  const pickups = useMemo(() => generatePickups(seedStr), [seedStr])
  const motherships = useMemo(() => generateMotherships(seedStr), [seedStr])
  const onCollect = useCallback((type: PickupType) => {
    playPickup()
    const info = PICKUP_INFO[type]
    if (type === 'battery') rechargeRef.current = 100
    else if (type === 'upgrade') { boostRef.current = { mult: 1.6, until: performance.now() + 9000 }; setBoostOn(true); setTimeout(() => setBoostOn(false), 9000); ammoRef.current = Math.min(30, ammoRef.current + 10); setAmmo(ammoRef.current) }
    else if (type === 'drone') setModelOverride(DRONE_MODELS[Math.floor(Math.random() * DRONE_MODELS.length)])
    if (info.score) setRunScore((s) => s + info.score)
    setCollectMsg(type === 'battery' ? '🔋 Sạc đầy pin!' : type === 'upgrade' ? '⚡ Tăng tốc 9s!' : type === 'drone' ? '🚁 Drone mới!' : `+${info.score} điểm`)
    setTimeout(() => setCollectMsg(null), 1400)
  }, [])
  // Vũ khí
  const AMMO_MAX = 30
  const ammoRef = useRef(AMMO_MAX)
  const [ammo, setAmmo] = useState(AMMO_MAX)
  const enemySharedRef = useRef<EnemyShared | null>(null)
  // Bầy địch tuần tra trên màn BẢN ĐỒ thật (PvE trong thành phố) — rải quanh khu vực
  const mapEnemies = useMemo<Array<{ center: Vec3; radius: number; speed: number }>>(() => {
    if (!level.map) return []
    const n = 8
    return Array.from({ length: n }, (_, k) => {
      const ang = (k / n) * Math.PI * 2
      const r = 45 + (k % 3) * 28
      return { center: [Math.cos(ang) * r, 16 + (k % 4) * 7, Math.sin(ang) * r] as Vec3, radius: 12, speed: 0.7 + (k % 3) * 0.15 }
    })
  }, [level.map?.lat, level.map?.lon, level.map?.radius])
  const onShoot = useCallback(() => setAmmo(ammoRef.current), [])
  const [emptyWarn, setEmptyWarn] = useState(false)
  const emptyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onEmpty = useCallback(() => {
    setEmptyWarn(true)
    if (emptyTimer.current) clearTimeout(emptyTimer.current)
    emptyTimer.current = setTimeout(() => setEmptyWarn(false), 1500)
  }, [])
  const onEnemyKill = useCallback(() => { setRunScore((s) => s + 40); setCollectMsg('💥 Hạ địch +40'); setTimeout(() => setCollectMsg(null), 1200) }, [])
  const onMotherNear = useCallback(() => {
    rechargeRef.current = Math.max(rechargeRef.current, 1.5)
    if (ammoRef.current < AMMO_MAX) { ammoRef.current = AMMO_MAX; setAmmo(AMMO_MAX); setCollectMsg('🔫 Nạp đầy đạn!'); setTimeout(() => setCollectMsg(null), 1200) }
  }, [])
  // ── Thách đấu realtime: đồng bộ vị trí drone qua broker ──
  const peersRef = useRef<Map<string, Peer>>(new Map())
  const raceRef = useRef<Map<string, { name: string; time: number }>>(new Map())
  const lastPeerHit = useRef(0)
  const finishedRef = useRef(false)
  const onHitRef = useRef<() => void>(() => {})
  const myCid = useRef(Math.random().toString(36).slice(2, 9)).current
  const myName = playerName || myCallsign()
  const token = room ? tokenStore.getAccessToken() : null
  const topic = room ? `drone:room:${room}` : ''
  const [peerCount, setPeerCount] = useState(0)
  const [raceBoard, setRaceBoard] = useState<{ name: string; time: number; me?: boolean }[]>([])
  const [myFinishTime, setMyFinishTime] = useState<number | null>(null)
  const buildBoard = useCallback(() => {
    const arr = Array.from(raceRef.current.entries()).map(([cid, v]) => ({ name: v.name, time: v.time, me: cid === myCid }))
    return arr.sort((a, b) => a.time - b.time)
  }, [myCid])

  const { publish } = useBroker(token, room ? [topic] : [], {
    onMsg: (m) => {
      const p = m.payload as any
      if (!p || p.cid === myCid) return
      if (p.kind === 'state') {
        peersRef.current.set(p.cid, { name: p.name, pos: p.p, yaw: p.y, pitch: p.pi, roll: p.r, t: performance.now() })
      } else if (p.kind === 'finish') {
        if (!raceRef.current.has(p.cid)) { raceRef.current.set(p.cid, { name: p.name, time: p.time }); setRaceBoard(buildBoard()) }
      } else if (p.kind === 'shot' && p.target === myCid) {
        lastShooterRef.current = p.cid; onHitRef.current(); damageRef.current(34) // bị bắn → flash + mất máu
      } else if (p.kind === 'down' && p.by === myCid) {
        onKillRef.current() // mình hạ gục được đối thủ
      }
    },
  })

  // Bị bắn trúng peer → cộng điểm + báo cho phòng (đặt SAU useBroker để publish/topic/myCid đã khai báo)
  const onPeerShot = useCallback((cid: string) => {
    setRunScore((s) => s + 30); setCollectMsg('🎯 Bắn trúng +30'); setTimeout(() => setCollectMsg(null), 1200)
    if (room) publish(topic, { kind: 'shot', cid: myCid, target: cid, by: myName })
  }, [room, publish, topic, myCid, myName])

  const finishRace = useCallback((elapsed: number) => {
    if (finishedRef.current) return
    finishedRef.current = true
    raceRef.current.set(myCid, { name: myName, time: elapsed })
    setMyFinishTime(elapsed)
    setRaceBoard(buildBoard())
    publish(topic, { kind: 'finish', cid: myCid, name: myName, time: +elapsed.toFixed(2) })
    if (room) saveLeaderboard(room, `${level.emoji} ${level.name}`, myName, elapsed)
  }, [myCid, myName, publish, topic, room, level, buildBoard])

  // Trong phòng: thắng = về đích nhanh nhất; KHÔNG thoát ngay (xem bảng + bay tiếp)
  const completeRef = useRef<(s: boolean, e: number) => void>(() => {})
  completeRef.current = (success: boolean, elapsed: number) => {
    if (room) { if (success) { finishRace(elapsed); addPoints(60 + runScore) } return }
    if (success) addPoints(40 + runScore) // nhiệm vụ: cộng điểm
    onComplete(success, elapsed)
  }
  // Thoát giữa chừng trận thách đấu (chưa về đích) → TRỪ điểm
  const handleAbort = useCallback(() => {
    if (room && !finishedRef.current) addPoints(-30)
    onAbort()
  }, [room, onAbort])

  // ── Máu / hạ gục / nổ ──
  const HP_MAX = 100
  const hpRef = useRef(HP_MAX)
  const respawnRef = useRef(0)
  const lastShooterRef = useRef<string | null>(null)
  const fxRef = useRef<{ x: number; y: number; z: number; t: number }[]>([])
  const [hp, setHp] = useState(HP_MAX)
  const [kills, setKills] = useState(0)
  const [deaths, setDeaths] = useState(0)
  const [knockMsg, setKnockMsg] = useState(false)
  const explode = useCallback((x: number, y: number, z: number) => {
    fxRef.current.push({ x, y, z, t: performance.now() })
    if (fxRef.current.length > 16) fxRef.current.shift()
  }, [])
  const knockdown = useCallback(() => {
    const dp = dronePosRef.current
    explode(dp.x, dp.y, dp.z)
    respawnRef.current = 1; hpRef.current = HP_MAX; setHp(HP_MAX); setDeaths((d) => d + 1); addPoints(-20)
    setKnockMsg(true); setTimeout(() => setKnockMsg(false), 1800)
    if (room && lastShooterRef.current) publish(topic, { kind: 'down', cid: myCid, by: lastShooterRef.current })
    lastShooterRef.current = null
  }, [explode, room, publish, topic, myCid])
  const damage = useCallback((amt: number) => {
    hpRef.current -= amt
    if (hpRef.current <= 0) knockdown()
    setHp(Math.max(0, hpRef.current))
  }, [knockdown])
  const damageRef = useRef<(a: number) => void>(() => {})
  damageRef.current = damage
  const onKillRef = useRef<() => void>(() => {})
  onKillRef.current = () => { setKills((k) => k + 1); addPoints(100); setCollectMsg('💀 Hạ gục đối thủ +100'); setTimeout(() => setCollectMsg(null), 1400) }

  useEffect(() => {
    if (!room) return
    const send = setInterval(() => {
      const dp = dronePosRef.current, dr = droneRotRef.current
      publish(topic, { kind: 'state', cid: myCid, name: myName, p: [+dp.x.toFixed(2), +dp.y.toFixed(2), +dp.z.toFixed(2)], y: +dr.yaw.toFixed(3), pi: +dr.pitch.toFixed(3), r: +dr.roll.toFixed(3) })
      // Va chạm PvP giữa người chơi
      for (const pr of peersRef.current.values()) {
        if (Math.hypot(dp.x - pr.pos[0], dp.y - pr.pos[1], dp.z - pr.pos[2]) < 1.4) {
          const now = performance.now()
          if (now - lastPeerHit.current > 1000) { lastPeerHit.current = now; onHitRef.current() }
          break
        }
      }
    }, 80)
    const count = setInterval(() => setPeerCount(peersRef.current.size), 600)
    return () => { clearInterval(send); clearInterval(count) }
  }, [room, topic, myCid, myName, publish])

  const [muted, setMuted] = useState(false)
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'empty' | 'error' | null>(null)
  const [showSticks, setShowSticks] = useState(isMobile())
  const [showHint, setShowHint] = useState(true)
  const [cargoIdx, setCargoIdx] = useState(0)
  const [cargoCarrying, setCargoCarrying] = useState(false)
  const [hits, setHits] = useState(0)
  const [hitFlash, setHitFlash] = useState(false)
  useEffect(() => { const id = setTimeout(() => setShowHint(false), 9000); return () => clearTimeout(id) }, [])
  // Phím Space = bắn (giữ để bắn liên tục)
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); inputsRef.current.fire = true } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') inputsRef.current.fire = false }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  const onCargoState = useCallback((idx: number, carrying: boolean) => { setCargoIdx(idx); setCargoCarrying(carrying) }, [])
  const onCargoComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    completeRef.current(true, (Date.now() - startTimeRef.current) / 1000)
  }, [])
  const onHit = useCallback(() => {
    playHit(); setHits((h) => h + 1); setHitFlash(true)
    setTimeout(() => setHitFlash(false), 280)
    damageRef.current(12) // va chạm cũng mất máu
  }, [])
  onHitRef.current = onHit

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

  // Chấm mục tiêu cho radar HUD
  const radarTargets = useMemo(() => {
    const t: { x: number; z: number; color: string }[] = []
    if (level.type === 'gates' && level.gates) {
      level.gates.forEach((g, i) => t.push({ x: g.pos[0], z: g.pos[2], color: i === gateProgress ? '#fbbf24' : i < gateProgress ? '#10b981' : '#ec4899' }))
    } else if (level.type === 'hover') {
      t.push({ x: 0, z: 0, color: '#fbbf24' })
    } else if (level.type === 'cargo' && level.cargo) {
      const pkg = level.cargo.packages[cargoIdx]
      if (pkg) { const tgt = cargoCarrying ? pkg.drop : pkg.pickup; t.push({ x: tgt[0], z: tgt[2], color: cargoCarrying ? '#3b82f6' : '#22c55e' }) }
      level.cargo.enemies?.forEach((e) => t.push({ x: e.center[0], z: e.center[2], color: '#ef4444' }))
    }
    return t
  }, [level, gateProgress, cargoIdx, cargoCarrying])

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const remaining = Math.max(0, level.timeLimit - elapsed)
      setTimeRemaining(remaining)
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true
        completeRef.current(false, level.timeLimit)
      }
    }, 100)
    return () => clearInterval(id)
  }, [level])

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
      completeRef.current(true, elapsed)
    }
  }, [level])

  const onHoverProg = useCallback((sec: number) => {
    setHoverProgress(sec)
    if (level.hover && sec >= level.hover.duration && !completedRef.current) {
      completedRef.current = true
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      completeRef.current(true, elapsed)
    }
  }, [level])

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
      { name: 'fire', keys: ['Space'] },
    ]}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Canvas
          shadows
          camera={{ fov: 90, near: 0.1, far: 3000, position: [0, 1.5, 0] }}
          style={{ background: '#0a0a0f', width: '100%', height: '100%' }}
        >
          <LevelEnvironment level={level} currentGate={gateProgress} />
          <Suspense fallback={null}>
            <DroneRig inputs={inputsRef} level={level} model={modelOverride || model} onTelemetry={onTelemetry}
              onGatePass={onGatePass} onHoverProgress={onHoverProg} onCrash={onCrash}
              posRef={dronePosRef} rotRef={droneRotRef}
              rechargeRef={rechargeRef} boostRef={boostRef} sizeMult={sizeMult} rangeMult={rangeMult}
              respawnRef={respawnRef} />
          </Suspense>
          <Pickups items={pickups} posRef={dronePosRef} onCollect={onCollect} />
          <MotherShips specs={motherships} posRef={dronePosRef} onNear={onMotherNear} />
          <Projectiles posRef={dronePosRef} rotRef={droneRotRef} inputs={inputsRef} ammoRef={ammoRef}
            onShoot={onShoot} onEmpty={onEmpty} enemyShared={enemySharedRef} peersRef={peersRef}
            onEnemyKill={onEnemyKill} onPeerShot={onPeerShot} onExplode={explode} />
          <Explosions fxRef={fxRef} />
          {room && <PeerDrones peersRef={peersRef} />}
          {level.map && (
            <Suspense fallback={null}>
              <OsmCityLoader lat={level.map.lat} lon={level.map.lon} radius={level.map.radius} posRef={dronePosRef} onStatus={setMapStatus}
                onHitBuilding={() => { const dp = dronePosRef.current; explode(dp.x, dp.y, dp.z); damageRef.current(HP_MAX) }} />
            </Suspense>
          )}
          {/* Bầy địch tuần tra trên màn bản đồ thật (PvE thành phố) */}
          {level.map && mapEnemies.length > 0 && (
            <EnemyDrones posRef={dronePosRef} specs={mapEnemies} onHit={onHit} shared={enemySharedRef} />
          )}
          <WaypointGuide posRef={dronePosRef} target={guideTarget} />
          {level.type === 'cargo' && level.cargo && (
            <>
              <CargoMission posRef={dronePosRef} packages={level.cargo.packages}
                onState={onCargoState} onComplete={onCargoComplete} />
              {level.cargo.enemies && level.cargo.enemies.length > 0 && (
                <EnemyDrones posRef={dronePosRef} specs={level.cargo.enemies} onHit={onHit} shared={enemySharedRef} />
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
          gateProgress={gateProgress} hoverProgress={hoverProgress} timeRemaining={timeRemaining}
          targets={(() => {
            // Vị trí địch TRỰC TIẾP lên radar (đỏ) — cập nhật mỗi khung qua telemetry
            const es = enemySharedRef.current
            if (!es) return radarTargets
            const live = es.pos.flatMap((p, i) => es.alive[i] ? [{ x: p.x, z: p.z, color: '#ef4444' }] : [])
            return live.length ? [...radarTargets.filter((t) => t.color !== '#ef4444'), ...live] : radarTargets
          })()} />
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

        {/* Thách đấu: phòng + số đối thủ đang bay */}
        {room && (
          <div style={{
            position: 'absolute', top: 80, right: 24, zIndex: 10, textAlign: 'right',
            background: 'rgba(249,115,22,0.85)', color: '#1c1917', padding: '4px 12px',
            borderRadius: 999, fontSize: 12, fontWeight: 800, fontFamily: 'monospace',
          }}>⚔️ PHÒNG {room} · {peerCount} đối thủ · ☠️{kills}/💀{deaths}</div>
        )}

        {/* Overlay HẠ GỤC */}
        {knockMsg && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(127,29,29,0.85)', color: '#fff', padding: '16px 34px', borderRadius: 14, fontFamily: 'monospace', fontSize: 30, fontWeight: 'bold', border: '2px solid #ef4444' }}>💥 HẠ GỤC!</div>
          </div>
        )}

        {/* Bảng xếp hạng về đích realtime */}
        {room && raceBoard.length > 0 && (
          <div style={{
            position: 'absolute', top: 110, left: 50, zIndex: 10, fontFamily: 'monospace', fontSize: 12,
            background: 'rgba(8,30,38,0.82)', border: '1px solid rgba(34,211,238,0.35)', borderRadius: 10, padding: '8px 12px', minWidth: 170,
          }}>
            <div style={{ color: '#7dd3fc', fontSize: 10, marginBottom: 4 }}>🏁 VỀ ĐÍCH</div>
            {raceBoard.slice(0, 6).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: r.me ? '#22d3ee' : '#e2e8f0', fontWeight: r.me ? 700 : 400 }}>
                <span>{['🥇', '🥈', '🥉'][i] || `${i + 1}.`} {r.name}{r.me ? ' (bạn)' : ''}</span>
                <span>{r.time.toFixed(1)}s</span>
              </div>
            ))}
          </div>
        )}

        {/* Banner về đích + rời phòng */}
        {room && myFinishTime != null && (
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 12, pointerEvents: 'auto' }}>
            <div style={{ background: 'rgba(8,30,38,0.94)', border: '1px solid #22d3ee', borderRadius: 16, padding: '18px 28px', color: '#e2e8f0', fontFamily: 'monospace', textAlign: 'center', boxShadow: '0 0 30px rgba(34,211,238,0.3)' }}>
              <div style={{ fontSize: 28 }}>🏁 VỀ ĐÍCH!</div>
              <div style={{ fontSize: 15, color: '#7dd3fc', margin: '6px 0' }}>Hạng {(raceBoard.findIndex((r) => r.me) + 1) || '-'} · {myFinishTime.toFixed(2)}s</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>Bay tiếp để xem bảng hoặc rời phòng</div>
              <button onClick={handleAbort} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: CYAN_GRAD, color: '#04212b', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Rời phòng →</button>
            </div>
          </div>
        )}

        {/* Trạng thái tải bản đồ thật (OSM) */}
        {level.map && mapStatus && mapStatus !== 'ready' && (
          <div style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
            background: 'rgba(15,23,42,0.9)', color: '#7dd3fc', padding: '6px 14px', borderRadius: 999,
            fontSize: 12, fontFamily: 'monospace',
          }}>
            {mapStatus === 'loading' && '🗺️ Đang tải bản đồ OpenStreetMap…'}
            {mapStatus === 'empty' && '🗺️ Không có dữ liệu công trình ở khu vực này'}
            {mapStatus === 'error' && '⚠️ Lỗi tải bản đồ (mạng/Overpass) — bay không có toà nhà'}
          </div>
        )}

        {/* Bảng chỉ số Drone — đặt TRÊN ĐỈNH (đáy nhường cho joystick), cuộn ngang nếu hẹp */}
        <div style={{
          position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 12,
          display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(8,30,38,0.82)',
          border: '1px solid rgba(34,211,238,0.3)', borderRadius: 10, padding: '5px 10px', fontFamily: 'monospace',
          maxWidth: '94vw', overflowX: 'auto',
        }}>
          {(() => {
            const spd = telemetry ? telemetry.vel.length() * 3.6 : 0
            const maxSpd = PHYSICS.maxSpeed * 3.6 * rangeMult  // ~418 km/h
            const bar = (label: string, frac: number, col: string) => (
              <div style={{ textAlign: 'center', minWidth: 46 }}>
                <div style={{ fontSize: 11, color: '#a8e0ff', fontWeight: 700, marginBottom: 3 }}>{label}</div>
                <div style={{ width: 44, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, height: '100%', background: col }} />
                </div>
              </div>
            )
            return (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#a8e0ff', fontWeight: 700 }}>CẤP</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fbbf24' }}>{lvlNum}</div>
                </div>
                {bar('MÁU', hp / HP_MAX, hp < 30 ? '#ef4444' : '#f87171')}
                {bar('TỐC ĐỘ', spd / maxSpd, '#22d3ee')}
                {bar('PIN', (telemetry?.battery ?? 0) / 100, telemetry && telemetry.battery < 20 ? '#ef4444' : '#22c55e')}
                {bar('TẦM BAY', (rangeMult - 1) / 0.6 + 0.2, '#a855f7')}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#a8e0ff', fontWeight: 700 }}>BOOST</div>
                  <div style={{ fontSize: 14, color: boostOn ? '#a855f7' : '#475569' }}>{boostOn ? '⚡ON' : '—'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#a8e0ff', fontWeight: 700 }}>ĐẠN</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: ammo > 0 ? '#fde047' : '#ef4444' }}>
                    {ammo}<span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>/{AMMO_MAX}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 10 }}>
                  <div style={{ fontSize: 11, color: '#a8e0ff', fontWeight: 700 }}>ĐIỂM MÀN</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#fde68a' }}>{runScore}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#a8e0ff', fontWeight: 700 }}>TỔNG</div>
                  <div style={{ fontSize: 14, color: '#cbd5e1' }}>{points + runScore}</div>
                </div>
              </>
            )
          })()}
        </div>

        {/* Cảnh báo HẾT ĐẠN */}
        {emptyWarn && (
          <div style={{
            position: 'absolute', top: '38%', left: '50%', transform: 'translateX(-50%)', zIndex: 13,
            background: 'rgba(127,10,10,0.82)', border: '2px solid rgba(239,68,68,0.9)', borderRadius: 12,
            padding: '8px 18px', color: '#fff', fontWeight: 800, fontSize: 15, pointerEvents: 'none',
            textShadow: HUD_TXT_SHADOW, whiteSpace: 'nowrap',
          }}>🔫 HẾT ĐẠN — bay về tàu mẹ để nạp</div>
        )}

        {/* Nút BẮN (chạm/giữ) */}
        <button
          onPointerDown={(e) => { e.preventDefault(); inputsRef.current.fire = true }}
          onPointerUp={() => { inputsRef.current.fire = false }}
          onPointerLeave={() => { inputsRef.current.fire = false }}
          title={ammo > 0 ? `Bắn (${ammo}/${AMMO_MAX} đạn)` : 'Hết đạn — về tàu mẹ nạp'}
          style={{
            position: 'absolute', bottom: 300, right: 24, zIndex: 11, width: 64, height: 64, borderRadius: '50%',
            background: ammo > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(100,116,139,0.25)',
            border: ammo > 0 ? '2px solid rgba(239,68,68,0.8)' : '2px solid rgba(148,163,184,0.6)',
            color: '#fff', opacity: ammo > 0 ? 1 : 0.55,
            fontSize: 26, cursor: 'pointer', userSelect: 'none', touchAction: 'none', pointerEvents: 'auto',
          }}>🔫</button>

        {/* Toast nhận thưởng */}
        {collectMsg && (
          <div style={{
            position: 'absolute', top: '32%', left: '50%', transform: 'translateX(-50%)', zIndex: 11,
            background: 'rgba(168,85,247,0.9)', color: '#fff', padding: '8px 18px', borderRadius: 999,
            fontSize: 15, fontWeight: 'bold', fontFamily: 'monospace', pointerEvents: 'none',
          }}>{collectMsg}</div>
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
              {gamepadId ? '🎮 Tay cầm' : showSticks ? '🕹️ Joystick 2 cần (trái: ga/xoay · phải: nghiêng)' : '⌨️ W/S A/D · ↑↓ ←→'} · 🔫/Space bắn · chạm để ẩn
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
        <button onClick={handleAbort} style={{
          position: 'absolute', top: 12, right: 110, padding: '6px 12px',
          background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)',
          color: '#fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 12, zIndex: 10,
        }}>← Thoát</button>
        {/* Nút xoay ngang / toàn màn hình — tăng diện tích chơi (Android/desktop;
            iOS Safari không khoá được hướng nên là no-op an toàn, user xoay tay). */}
        <button
          onClick={async () => {
            try {
              if (document.fullscreenElement) {
                try { (screen.orientation as any)?.unlock?.() } catch { /* */ }
                await document.exitFullscreen()
              } else {
                const el = document.documentElement as any
                if (el.requestFullscreen) await el.requestFullscreen()
                else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
                try { await (screen.orientation as any)?.lock?.('landscape') } catch { /* */ }
              }
            } catch { /* */ }
          }}
          title="Mở rộng toàn màn hình / xoay ngang (tăng diện tích chơi)"
          style={{
            position: 'absolute', top: 10, right: 12, zIndex: 12, width: 48, height: 34,
            background: 'rgba(8,30,38,0.7)', border: '1px solid rgba(34,211,238,0.55)',
            color: '#7dd3fc', borderRadius: 8, cursor: 'pointer', fontSize: 19, lineHeight: 1,
          }}>⛶</button>
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
      position: 'relative',
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: SCIFI_BG,
      color: '#e2e8f0', padding: 32, fontFamily: 'ui-monospace, monospace',
    }}>
      <ScreenCorners />
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
            padding: '10px 24px', background: CYAN_GRAD,
            border: 'none', color: 'white', borderRadius: 10, cursor: 'pointer',
            fontSize: 14, fontWeight: 'bold',
          }}>{success ? '→ Cấp tiếp / chọn cấp' : '← Chọn cấp khác'}</button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// SCREEN: MODE — chọn Nhiệm vụ / Thách đấu
// ═════════════════════════════════════════════════════════════
function ModeScreen({ onMission, onChallenge }: { onMission: () => void; onChallenge: () => void }) {
  const card: React.CSSProperties = {
    padding: '28px 20px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
    background: 'rgba(8,30,38,0.6)', border: '1px solid rgba(34,211,238,0.4)', color: '#e2e8f0',
    fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 'bold', lineHeight: 1.5,
  }
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SCIFI_BG, color: '#e2e8f0', fontFamily: 'ui-monospace, monospace', padding: 24 }}>
      <ScreenCorners />
      <div style={{ textAlign: 'center', maxWidth: 720, width: '100%' }}>
        <h1 style={{ fontSize: 32, margin: '0 0 4px', background: CYAN_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🚁 FPV DRONE</h1>
        <p style={{ color: '#7dd3fc', marginBottom: 28, fontSize: 13 }}>Chọn chế độ chơi</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <button onClick={onMission} style={card}>
            <div style={{ fontSize: 40 }}>🎯</div>NHIỆM VỤ
            <div style={{ fontSize: 12, fontWeight: 'normal', color: '#94a3b8', marginTop: 6 }}>Chiến dịch 6 cấp độ + Giao hàng</div>
          </button>
          <button onClick={onChallenge} style={card}>
            <div style={{ fontSize: 40 }}>⚔️</div>THÁCH ĐẤU
            <div style={{ fontSize: 12, fontWeight: 'normal', color: '#94a3b8', marginTop: 6 }}>Tạo phòng → mời bạn quét QR / link bay cùng realtime</div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// SCREEN: CHALLENGE — lobby thách đấu (mã/QR/link/người chơi)
// ═════════════════════════════════════════════════════════════
const ROOM_MAX = 10
function ChallengeScreen({ initialRoom, initialLvl, initialMap, onStart, onBack, onJoin }: {
  initialRoom?: string; initialLvl?: number; initialMap?: { lat: number; lon: number; name: string }
  onStart: (level: Level, room: string, name: string) => void
  onBack: () => void
  onJoin?: (code: string) => void
}) {
  const isJoiner = !!initialRoom
  const [room] = useState(() => initialRoom || genRoomCode())
  const [scanOpen, setScanOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [name, setName] = useState(() => myCallsign())
  const [mode, setMode] = useState<'level' | 'map'>(initialMap ? 'map' : 'level')
  const [levelId, setLevelId] = useState(() => initialLvl || 4)
  const [picked, setPicked] = useState<{ lat: number; lon: number; name: string } | null>(initialMap || null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ name: string; lat: number; lon: number }[]>([])
  const [searching, setSearching] = useState(false)
  const [players, setPlayers] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const myCid = useRef(Math.random().toString(36).slice(2, 9)).current
  const token = tokenStore.getAccessToken()
  const base = `${window.location.origin}${window.location.pathname}?droneRoom=${room}`
  const link = mode === 'map' && picked
    ? `${base}&mlat=${picked.lat.toFixed(5)}&mlon=${picked.lon.toFixed(5)}&mname=${encodeURIComponent(picked.name)}`
    : `${base}&lvl=${levelId}`

  useEffect(() => { try { localStorage.setItem('drone_callsign', name) } catch { /* */ } }, [name])

  const { publish } = useBroker(token, [`drone:lobby:${room}`], {
    onMsg: (m) => {
      const p = m.payload as any
      if (!p || p.cid === myCid || p.kind !== 'hello') return
      setPlayers((s) => ({ ...s, [p.cid]: p.name }))
      if (isJoiner && p.host) { // joiner đồng bộ lựa chọn theo chủ phòng
        if (p.map) { setMode('map'); setPicked(p.map) }
        else if (p.lvl) { setMode('level'); setLevelId(p.lvl) }
      }
    },
  })
  useEffect(() => {
    const id = setInterval(() => publish(`drone:lobby:${room}`, {
      kind: 'hello', cid: myCid, name, host: !isJoiner,
      lvl: mode === 'level' ? levelId : undefined,
      map: mode === 'map' && picked ? picked : undefined,
    }), 1500)
    return () => clearInterval(id)
  }, [room, name, mode, levelId, picked, isJoiner, myCid, publish])

  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults(await geocodePlace(query.trim()))
    setSearching(false)
  }
  const choosePlace = (pl: { name: string; lat: number; lon: number }) => {
    setPicked({ lat: pl.lat, lon: pl.lon, name: nextMapName(pl.name) })
    setResults([])
  }

  const level = mode === 'map' && picked ? makeMapLevel(picked.name, picked.lat, picked.lon) : (LEVELS.find((l) => l.id === levelId) || LEVELS[3])
  const allNames = [`${name} (bạn)`, ...Object.values(players)]
  const full = allNames.length > ROOM_MAX
  const fld: React.CSSProperties = { background: 'rgba(8,30,38,0.6)', border: '1px solid rgba(34,211,238,0.35)', borderRadius: 10, padding: 14 }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px', borderRadius: 8, cursor: isJoiner ? 'default' : 'pointer', fontSize: 13, fontFamily: 'inherit',
    background: active ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? '#22d3ee' : 'rgba(255,255,255,0.12)'}`, color: '#e2e8f0',
  })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflowY: 'auto', background: SCIFI_BG, color: '#e2e8f0', fontFamily: 'ui-monospace, monospace', padding: '28px 20px' }}>
      <ScreenCorners />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#7dd3fc', cursor: 'pointer', fontSize: 13, marginBottom: 8 }}>← Quay lại</button>
        <h1 style={{ fontSize: 24, margin: '0 0 16px', background: CYAN_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚔️ THÁCH ĐẤU — {isJoiner ? 'Tham gia phòng' : 'Tạo phòng'}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={fld}>
              <div style={{ fontSize: 11, color: '#7dd3fc', marginBottom: 4 }}>MÃ PHÒNG</div>
              <div style={{ fontSize: 30, fontWeight: 'bold', letterSpacing: 4, color: '#22d3ee' }}>{room}</div>
            </div>
            <div style={fld}>
              <div style={{ fontSize: 11, color: '#7dd3fc', marginBottom: 6 }}>TÊN PHI CÔNG</div>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,211,238,0.3)', color: '#e2e8f0', borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 14 }} />
            </div>
            <div style={fld}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button disabled={isJoiner} onClick={() => setMode('level')} style={tabBtn(mode === 'level')}>🎮 Bản đồ dựng sẵn</button>
                <button disabled={isJoiner} onClick={() => setMode('map')} style={tabBtn(mode === 'map')}>🗺️ Bản đồ thật</button>
              </div>
              {mode === 'level' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {LEVELS.map((l) => (
                    <button key={l.id} disabled={isJoiner} onClick={() => setLevelId(l.id)}
                      style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: isJoiner ? 'default' : 'pointer',
                        background: l.id === levelId ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${l.id === levelId ? '#22d3ee' : 'rgba(255,255,255,0.12)'}`, color: '#e2e8f0', fontFamily: 'inherit' }}>
                      {l.emoji} {l.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  {!isJoiner && (
                    <>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                          placeholder="Tìm địa danh: New York, Paris, Hồ Gươm…"
                          style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,211,238,0.3)', color: '#e2e8f0', borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13 }} />
                        <button onClick={doSearch} style={{ padding: '0 14px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.4)', background: 'rgba(34,211,238,0.12)', color: '#22d3ee', cursor: 'pointer', fontFamily: 'inherit' }}>{searching ? '…' : '🔍'}</button>
                      </div>
                      {results.length > 0 && (
                        <div style={{ maxHeight: 130, overflowY: 'auto', marginBottom: 8, display: 'grid', gap: 4 }}>
                          {results.map((r, i) => (
                            <button key={i} onClick={() => choosePlace(r)} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>📍 {r.name}</button>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {OSM_PLACES.map((pl) => (
                          <button key={pl.id} onClick={() => choosePlace(pl)} style={{ padding: '5px 9px', borderRadius: 8, fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', cursor: 'pointer', fontFamily: 'inherit' }}>{pl.name}</button>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 13, color: picked ? '#22d3ee' : '#94a3b8', fontWeight: picked ? 700 : 400 }}>
                    {picked ? `🗺️ ${picked.name}` : 'Chọn 1 địa danh trên bản đồ →'}
                  </div>
                </div>
              )}
            </div>
            <div style={fld}>
              <div style={{ fontSize: 11, color: full ? '#f87171' : '#7dd3fc', marginBottom: 6 }}>
                PHI CÔNG TRONG PHÒNG ({allNames.length}/{ROOM_MAX}){full ? ' — ĐẦY' : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allNames.map((n, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.4)', color: '#fdba74' }}>🛩 {n}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...fld, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#7dd3fc', marginBottom: 8 }}>QUÉT ĐỂ THAM GIA</div>
            <div style={{ background: '#fff', padding: 8, borderRadius: 8, display: 'inline-block' }}>
              <QRCodeSVG value={link} size={150} />
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }}
              style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.4)', background: 'rgba(34,211,238,0.12)', color: '#22d3ee', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
              {copied ? '✓ Đã copy link' : '🔗 Copy link mời'}
            </button>
            {!isJoiner && onJoin && (
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: '#7dd3fc', marginBottom: 6 }}>HOẶC THAM GIA PHÒNG KHÁC</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && joinCode.trim() && onJoin(parseRoomCode(joinCode))}
                    placeholder="NHẬP MÃ" maxLength={8}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,211,238,0.3)', color: '#e2e8f0', borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, letterSpacing: 2, textAlign: 'center' }} />
                  <button onClick={() => joinCode.trim() && onJoin(parseRoomCode(joinCode))} disabled={!joinCode.trim()}
                    style={{ padding: '0 14px', borderRadius: 8, border: 'none', background: joinCode.trim() ? CYAN_GRAD : '#475569', color: '#04212b', fontWeight: 'bold', cursor: joinCode.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Vào</button>
                </div>
                <button onClick={() => setScanOpen(true)}
                  style={{ marginTop: 6, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.4)', background: 'rgba(34,211,238,0.12)', color: '#22d3ee', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>📷 Quét mã QR tham gia</button>
              </div>
            )}
          </div>
        </div>
        {scanOpen && <QrScanner onResult={(t) => { setScanOpen(false); const c = parseRoomCode(t); if (c) onJoin?.(c) }} onClose={() => setScanOpen(false)} />}

        <button onClick={() => !full && (mode === 'level' || picked) && onStart(level, room, name)} disabled={full || (mode === 'map' && !picked)}
          style={{ marginTop: 18, width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: full || (mode === 'map' && !picked) ? '#475569' : CYAN_GRAD, color: '#04212b', fontWeight: 'bold', fontSize: 16, cursor: full || (mode === 'map' && !picked) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: full || (mode === 'map' && !picked) ? 0.6 : 1 }}>
          {full ? '🚫 PHÒNG ĐẦY (tối đa 10)' : `🚁 VÀO BAY (${level.emoji} ${level.name})`}
        </button>
        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
          Mỗi người tự bấm “Vào bay” — thấy drone của nhau realtime, đua về đích. ⚠️ Thoát giữa chừng bị TRỪ ĐIỂM.
        </p>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// MAIN — flow controller
// ═════════════════════════════════════════════════════════════
type MapPick = { lat: number; lon: number; name: string }
type Screen =
  | { kind: 'mode' }
  | { kind: 'challenge'; room?: string; lvl?: number; map?: MapPick }
  | { kind: 'setup' }
  | { kind: 'levels' }
  | { kind: 'game'; level: Level; room?: string; playerName?: string }
  | { kind: 'result'; level: Level; success: boolean; elapsed: number; isNewBest: boolean; isNewUnlock: boolean }

function readInitialScreen(): Screen {
  try {
    const q = new URLSearchParams(window.location.search)
    const room = q.get('droneRoom')
    if (room) {
      const mlat = parseFloat(q.get('mlat') || ''), mlon = parseFloat(q.get('mlon') || '')
      const map = Number.isFinite(mlat) && Number.isFinite(mlon)
        ? { lat: mlat, lon: mlon, name: q.get('mname') || 'Bản đồ thật' } : undefined
      return { kind: 'challenge', room: room.toUpperCase().slice(0, 8), lvl: Number(q.get('lvl')) || undefined, map }
    }
  } catch { /* */ }
  return { kind: 'mode' }
}

function FpvAppRoot() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [screen, setScreen] = useState<Screen>(() => readInitialScreen())
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
    case 'mode':
      return <ModeScreen onMission={() => setScreen({ kind: 'setup' })} onChallenge={() => setScreen({ kind: 'challenge' })} />
    case 'challenge':
      return (
        <ChallengeScreen
          key={screen.room || 'host'}
          initialRoom={screen.room} initialLvl={screen.lvl} initialMap={screen.map}
          onStart={(level, room, name) => setScreen({ kind: 'game', level, room, playerName: name })}
          onBack={() => setScreen({ kind: 'mode' })}
          onJoin={(code) => code && setScreen({ kind: 'challenge', room: code })}
        />
      )
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
          room={screen.room}
          playerName={screen.playerName}
          onComplete={(success, elapsed) => handleComplete(screen.level, success, elapsed)}
          onAbort={() => setScreen(screen.room ? { kind: 'challenge', room: screen.room } : { kind: 'levels' })}
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
