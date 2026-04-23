/**
 * WorldMonitorGlobe — 3D globe hero cho trang chủ aeroedu-vite.
 *
 * Mặc định CAMERA zoom vào Việt Nam. Hiển thị:
 *   • 34 đơn vị hành chính mới (6 TP trực thuộc TW + 28 tỉnh) — tầng ưu tiên
 *   • Landmark Việt Nam (di sản, thiên nhiên, lịch sử)
 *   • Startup hubs toàn cầu (tier mega/major/emerging) — tầng nền
 *   • Aero-backend users-geo clusters khi có (fallback: ẩn)
 *
 * Tương tác:
 *   • Auto-rotate nhẹ. Người dùng drag để xoay, scroll để zoom.
 *   • Hover marker → tooltip. Click marker → gọi onSelect(info).
 *   • Nút "Trái đất" / "Việt Nam" để đổi preset camera.
 *
 * Hiệu năng:
 *   • Dùng instancedMesh không cần thiết vì N < 200 markers → để mesh rời.
 *   • Texture earth dùng canvas sinh tại client (không fetch ảnh) để offline
 *     và tránh CORS trên Cloud Run. Người dùng có thể override qua prop.
 */

import { Suspense, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Stars } from '@react-three/drei'
import * as THREE from 'three'
import {
  VN_PROVINCES_2025, VN_LANDMARKS, PROVINCE_KIND_COLORS, LANDMARK_KIND_COLORS,
  type VNProvince2025, type VNLandmark,
} from '@/config/vietnam-provinces-2025'
import {
  STARTUP_HUBS, TIER_COLORS, latLonToVec3,
  type StartupHub,
} from '@/config/world-monitor-data'
import type { AeroStartupMarker, AeroUserMarker } from '@/services/aeroBackend.service'

/* ──────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────── */
export type FocusPreset = 'vietnam' | 'world'

export type SelectedMarker =
  | { kind: 'province'; data: VNProvince2025 }
  | { kind: 'landmark'; data: VNLandmark }
  | { kind: 'startup';  data: StartupHub | AeroStartupMarker }
  | { kind: 'user';     data: AeroUserMarker }

export interface WorldMonitorGlobeProps {
  /** Extra startup markers from the live backend (merged with STARTUP_HUBS). */
  liveStartups?: AeroStartupMarker[]
  /** User cluster markers from /api/users-geo. */
  liveUsers?: AeroUserMarker[]
  /** Initial camera focus — default `'vietnam'`. */
  initialFocus?: FocusPreset
  /** Called when the user clicks any marker. */
  onSelect?: (marker: SelectedMarker | null) => void
  /** Css height of the canvas wrapper. Default 460. */
  height?: number | string
}

/* ──────────────────────────────────────────────────────────────
   Earth texture — real geography rasterised from Natural Earth 110m
   countries GeoJSON (served from /geo/countries-110m.geojson).

   Two-stage render:
     1. Synchronous initial paint  = ocean gradient + lat/lon grid
        (so the globe shows something immediately on mount).
     2. After GeoJSON fetch resolves, we repaint the same canvas
        with filled coastlines + country borders + pink glow over
        the real Vietnam polygon, then flip texture.needsUpdate.

   GeoJSON is cached at module scope so every Globe mount after the
   first paints real geography synchronously.
────────────────────────────────────────────────────────────── */
type GeoRing = number[][]
type GeoFeature = {
  properties?: { ISO_A3?: string; NAME?: string; [k: string]: unknown }
  geometry:
    | { type: 'Polygon'; coordinates: GeoRing[] }
    | { type: 'MultiPolygon'; coordinates: GeoRing[][] }
    | { type: string; coordinates: unknown }
}
type GeoFeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[] }

const COUNTRIES_URL = '/geo/countries-110m.geojson'
let countriesCache: GeoFeatureCollection | null = null
let countriesPromise: Promise<GeoFeatureCollection | null> | null = null

function loadCountries(): Promise<GeoFeatureCollection | null> {
  if (countriesCache) return Promise.resolve(countriesCache)
  if (countriesPromise) return countriesPromise
  countriesPromise = fetch(COUNTRIES_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: GeoFeatureCollection | null) => { countriesCache = j; return j })
    .catch((err) => { console.warn('[WorldMonitorGlobe] countries geojson failed:', err); return null })
  return countriesPromise
}

function forEachRing(
  geom: GeoFeature['geometry'],
  fn: (ring: GeoRing) => void,
): void {
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates as GeoRing[]) fn(ring)
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates as GeoRing[][]) for (const ring of poly) fn(ring)
  }
}

function paintEarthCanvas(canvas: HTMLCanvasElement, geo: GeoFeatureCollection | null): void {
  const W = canvas.width
  const H = canvas.height
  const ctx = canvas.getContext('2d')!

  // 1) Deep ocean gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0b1238')
  grad.addColorStop(0.5, '#0a1a40')
  grad.addColorStop(1, '#050c22')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // 2) Lat/lon grid — drawn first so coastlines sit on top.
  ctx.strokeStyle = 'rgba(99, 179, 255, 0.12)'
  ctx.lineWidth = 1
  const gridStepY = H / 8           // 8 lat bands
  const gridStepX = W / 16          // 16 lon meridians
  for (let y = 0; y <= H + 0.5; y += gridStepY) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
  for (let x = 0; x <= W + 0.5; x += gridStepX) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }

  if (!geo) return   // first paint — real coastlines arrive in the repaint pass

  // Equirectangular projection: lon[-180..180] → x[0..W], lat[-90..90] → y[H..0]
  const lonK = W / 360
  const latK = H / 180
  const tracePath = (ring: GeoRing): void => {
    if (ring.length < 2) return
    const p0 = ring[0]
    ctx.moveTo((p0[0] + 180) * lonK, (90 - p0[1]) * latK)
    for (let i = 1; i < ring.length; i++) {
      const p = ring[i]
      ctx.lineTo((p[0] + 180) * lonK, (90 - p[1]) * latK)
    }
    ctx.closePath()
  }

  // 3) Fill land — single path, even-odd fill so interior holes render correctly.
  ctx.fillStyle = 'rgba(34, 211, 238, 0.22)'
  ctx.beginPath()
  for (const f of geo.features) forEachRing(f.geometry, tracePath)
  ctx.fill('evenodd')

  // 4) Country borders — thin cyan stroke over the land fill.
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)'
  ctx.lineWidth = 0.6
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (const f of geo.features) forEachRing(f.geometry, tracePath)
  ctx.stroke()

  // 5) Vietnam glow — find the real VN polygon by ISO_A3, overlay pink tint + blur.
  const vn = geo.features.find((f) => f.properties?.ISO_A3 === 'VNM')
  if (vn) {
    ctx.save()
    ctx.shadowColor = 'rgba(232, 121, 249, 0.9)'
    ctx.shadowBlur = 14
    ctx.fillStyle = 'rgba(232, 121, 249, 0.55)'
    ctx.beginPath()
    forEachRing(vn.geometry, tracePath)
    ctx.fill('evenodd')
    // Secondary crisp stroke so the border reads at a distance.
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(249, 168, 212, 0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    forEachRing(vn.geometry, tracePath)
    ctx.stroke()
    ctx.restore()
  }
}

function makeEarthTexture(): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
  const c = document.createElement('canvas')
  c.width = 2048    // Higher res → crisper coastlines on the hero globe.
  c.height = 1024
  paintEarthCanvas(c, countriesCache)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return { texture: tex, canvas: c }
}

/* ──────────────────────────────────────────────────────────────
   Marker mesh — animated pulse ring
────────────────────────────────────────────────────────────── */
interface MarkerProps {
  position: [number, number, number]
  color: string
  size?: number
  onPointerOver?: () => void
  onPointerOut?: () => void
  onClick?: () => void
  label?: string
  hovered?: boolean
}

function Marker({
  position, color, size = 0.012,
  onPointerOver, onPointerOut, onClick,
  label, hovered,
}: MarkerProps) {
  const ringRef = useRef<THREE.Mesh>(null)
  const dotRef = useRef<THREE.Mesh>(null)
  const dir = useMemo(() => new THREE.Vector3(...position).normalize(), [position])
  const quat = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
    return q
  }, [dir])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 2) * 0.25
      ringRef.current.scale.setScalar(s)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.4 + Math.cos(t * 2) * 0.2
    }
    if (dotRef.current && hovered) {
      dotRef.current.scale.setScalar(1.4 + Math.sin(t * 6) * 0.1)
    } else if (dotRef.current) {
      dotRef.current.scale.setScalar(1)
    }
  })

  return (
    <group position={position} quaternion={quat}>
      {/* Glow ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[size * 1.6, size * 2.4, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Solid dot */}
      <mesh
        ref={dotRef}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.() }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.() }}
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Vertical beam */}
      <mesh position={[0, 0, size * 2]}>
        <cylinderGeometry args={[size * 0.25, size * 0.25, size * 4, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      {hovered && label && (
        <Html
          position={[0, 0, size * 6]}
          style={{ pointerEvents: 'none' }}
          center
          distanceFactor={3}
        >
          <div style={{
            background: 'rgba(8, 15, 40, 0.92)',
            border: `1px solid ${color}`,
            color: '#e2e8f0',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: `0 0 8px ${color}66`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}

/* ──────────────────────────────────────────────────────────────
   Earth + atmosphere
────────────────────────────────────────────────────────────── */
function Earth() {
  const { texture, canvas } = useMemo(() => makeEarthTexture(), [])

  // Repaint once the real countries GeoJSON loads. Cached after the first
  // successful fetch, so subsequent mounts paint real geography synchronously.
  useEffect(() => {
    let cancelled = false
    if (countriesCache) return   // already painted with real geography
    loadCountries().then((geo) => {
      if (cancelled || !geo) return
      paintEarthCanvas(canvas, geo)
      texture.needsUpdate = true
    })
    return () => { cancelled = true }
  }, [texture, canvas])

  return (
    <group>
      {/* Surface */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          emissive="#0a1a40"
          emissiveIntensity={0.25}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[1.04, 64, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      {/* Outer haze */}
      <mesh>
        <sphereGeometry args={[1.12, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

/* ──────────────────────────────────────────────────────────────
   WorldSpin — one rotating frame for Earth + all markers.
   With real geography, the texture and the markers must rotate
   in lock-step or the dots drift off the land they label.
────────────────────────────────────────────────────────────── */
function WorldSpin({ autoRotate, children }: { autoRotate: boolean; children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_s, dt) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += dt * 0.05
    }
  })
  return <group ref={groupRef}>{children}</group>
}

/* ──────────────────────────────────────────────────────────────
   Camera controller — animates to Vietnam / World preset
────────────────────────────────────────────────────────────── */
interface CameraControllerProps {
  preset: FocusPreset
  controlsRef: React.RefObject<any>
}

function CameraController({ preset, controlsRef }: CameraControllerProps) {
  useFrame(({ camera }, dt) => {
    // Target positions
    const vietnam = new THREE.Vector3(...latLonToVec3(16, 107.5, 2.6))
    const world = new THREE.Vector3(1.5, 1.2, 3.2)
    const target = preset === 'vietnam' ? vietnam : world

    // Smooth interpolate
    camera.position.lerp(target, Math.min(1, dt * 1.5))
    if (controlsRef.current) {
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, dt * 2))
      controlsRef.current.update()
    }
    camera.lookAt(0, 0, 0)
  })
  return null
}

/* ──────────────────────────────────────────────────────────────
   Main component
────────────────────────────────────────────────────────────── */
export default function WorldMonitorGlobe({
  liveStartups = [],
  liveUsers = [],
  initialFocus = 'vietnam',
  onSelect,
  height = 460,
}: WorldMonitorGlobeProps) {
  const [focus, setFocus] = useState<FocusPreset>(initialFocus)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedMarker | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const controlsRef = useRef<any>(null)

  // Merge live + static startup hubs (dedupe by city+name fuzzily — id wins).
  const startups = useMemo<(StartupHub | AeroStartupMarker)[]>(() => {
    const ids = new Set(liveStartups.map((s) => s.id))
    const statics = STARTUP_HUBS.filter((s) => !ids.has(`aero:${s.id}`))
    return [...liveStartups, ...statics]
  }, [liveStartups])

  const handleSelect = useCallback((m: SelectedMarker) => {
    setSelected(m)
    onSelect?.(m)
  }, [onSelect])

  const handleCloseDetail = useCallback(() => {
    setSelected(null)
    onSelect?.(null)
  }, [onSelect])

  useEffect(() => {
    // Reset hover when focus changes (markers may be re-culled).
    setHoveredId(null)
  }, [focus])

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height,
      borderRadius: 20,
      overflow: 'hidden',
      background: 'radial-gradient(circle at 30% 30%, #0a1030 0%, #020412 80%)',
      border: '1px solid rgba(99,179,255,0.22)',
      boxShadow: '0 0 40px rgba(34,211,238,0.1), inset 0 0 60px rgba(34,211,238,0.05)',
    }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <pointLight position={[-5, -3, -5]} intensity={0.4} color="#7c3aed" />

        <Suspense fallback={null}>
          <Stars radius={50} depth={40} count={2000} factor={3} saturation={0} fade speed={0.5} />
          <WorldSpin autoRotate={autoRotate}>
          <Earth />

          {/* Vietnam provinces — primary layer */}
          {VN_PROVINCES_2025.map((p) => {
            const pos = latLonToVec3(p.lat, p.lon, 1.01)
            const color = PROVINCE_KIND_COLORS[p.kind]
            const size = p.kind === 'central-city' ? 0.016 : 0.011
            return (
              <Marker
                key={p.id}
                position={pos}
                color={color}
                size={size}
                label={p.name}
                hovered={hoveredId === `p:${p.id}`}
                onPointerOver={() => setHoveredId(`p:${p.id}`)}
                onPointerOut={() => setHoveredId(null)}
                onClick={() => handleSelect({ kind: 'province', data: p })}
              />
            )
          })}

          {/* Vietnam landmarks — smaller */}
          {VN_LANDMARKS.map((l) => {
            const pos = latLonToVec3(l.lat, l.lon, 1.008)
            const color = LANDMARK_KIND_COLORS[l.kind]
            return (
              <Marker
                key={l.id}
                position={pos}
                color={color}
                size={0.008}
                label={l.name}
                hovered={hoveredId === `l:${l.id}`}
                onPointerOver={() => setHoveredId(`l:${l.id}`)}
                onPointerOut={() => setHoveredId(null)}
                onClick={() => handleSelect({ kind: 'landmark', data: l })}
              />
            )
          })}

          {/* Global startup hubs — tier-coloured */}
          {startups.map((s) => {
            const pos = latLonToVec3(s.lat, s.lon, 1.005)
            const color = TIER_COLORS[s.tier]
            const size = s.tier === 'mega' ? 0.013 : s.tier === 'major' ? 0.01 : 0.007
            return (
              <Marker
                key={s.id}
                position={pos}
                color={color}
                size={size}
                label={s.name}
                hovered={hoveredId === `s:${s.id}`}
                onPointerOver={() => setHoveredId(`s:${s.id}`)}
                onPointerOut={() => setHoveredId(null)}
                onClick={() => handleSelect({ kind: 'startup', data: s })}
              />
            )
          })}

          {/* Live users-geo clusters */}
          {liveUsers.map((u) => {
            const pos = latLonToVec3(u.lat, u.lon, 1.003)
            const size = Math.min(0.025, 0.007 + Math.log10(u.count + 1) * 0.004)
            return (
              <Marker
                key={u.id}
                position={pos}
                color="#10b981"
                size={size}
                label={`${u.count} ${u.role === 'mixed' ? 'người' : u.role} · ${u.city}`}
                hovered={hoveredId === `u:${u.id}`}
                onPointerOver={() => setHoveredId(`u:${u.id}`)}
                onPointerOut={() => setHoveredId(null)}
                onClick={() => handleSelect({ kind: 'user', data: u })}
              />
            )
          })}
          </WorldSpin>

          <CameraController preset={focus} controlsRef={controlsRef} />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={1.6}
            maxDistance={5}
            rotateSpeed={0.4}
            zoomSpeed={0.6}
            onStart={() => setAutoRotate(false)}
          />
        </Suspense>
      </Canvas>

      {/* ── Overlay UI ── */}
      {/* Top-left: focus toggle */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        display: 'flex', gap: 6,
        background: 'rgba(8,15,40,0.85)',
        border: '1px solid rgba(99,179,255,0.22)',
        borderRadius: 10,
        padding: 4,
        backdropFilter: 'blur(10px)',
      }}>
        {(['vietnam', 'world'] as const).map((p) => (
          <button
            key={p}
            onClick={() => { setFocus(p); setAutoRotate(p === 'world') }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              color: focus === p ? '#020412' : '#94a3b8',
              background: focus === p
                ? 'linear-gradient(135deg,#22d3ee,#3b82f6)'
                : 'transparent',
              transition: 'all .2s',
            }}
          >
            {p === 'vietnam' ? '🇻🇳 Việt Nam' : '🌏 Thế giới'}
          </button>
        ))}
      </div>

      {/* Top-right: legend */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(8,15,40,0.85)',
        border: '1px solid rgba(99,179,255,0.22)',
        borderRadius: 10,
        padding: '8px 12px',
        backdropFilter: 'blur(10px)',
        fontSize: 11, color: '#94a3b8',
        lineHeight: 1.8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }} />
          TP trực thuộc TW
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />
          Tỉnh (sau sáp nhập 2025)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e879f9', boxShadow: '0 0 6px #e879f9' }} />
          Di sản / danh thắng
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          Cụm người dùng
        </div>
      </div>

      {/* Live status */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(8,15,40,0.85)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 99,
        padding: '4px 10px',
        fontSize: 10, color: '#10b981', fontWeight: 700,
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulse-glow 2s infinite' }} />
        LIVE · {VN_PROVINCES_2025.length} tỉnh/TP · {VN_LANDMARKS.length} danh thắng
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel marker={selected} onClose={handleCloseDetail} />
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Detail panel — sliding card on the right
────────────────────────────────────────────────────────────── */
function DetailPanel({
  marker, onClose,
}: {
  marker: SelectedMarker
  onClose: () => void
}) {
  const title = (() => {
    switch (marker.kind) {
      case 'province': return marker.data.name
      case 'landmark': return marker.data.name
      case 'startup':  return marker.data.name
      case 'user':     return `${marker.data.count} người dùng`
    }
  })()

  const subtitle = (() => {
    switch (marker.kind) {
      case 'province':
        return marker.data.kind === 'central-city'
          ? `Thành phố trực thuộc Trung ương · Thủ phủ: ${marker.data.capital}`
          : `Tỉnh · Thủ phủ: ${marker.data.capital}`
      case 'landmark': return `Danh thắng · ${marker.data.province}`
      case 'startup':  return `${marker.data.city}, ${marker.data.country}`
      case 'user':     return `${marker.data.city}, ${marker.data.country}`
    }
  })()

  const color = (() => {
    switch (marker.kind) {
      case 'province': return PROVINCE_KIND_COLORS[marker.data.kind]
      case 'landmark': return LANDMARK_KIND_COLORS[marker.data.kind]
      case 'startup':  return TIER_COLORS[marker.data.tier]
      case 'user':     return '#10b981'
    }
  })()

  return (
    <div style={{
      position: 'absolute', top: 72, right: 12,
      width: 300, maxHeight: 'calc(100% - 96px)',
      overflowY: 'auto',
      background: 'rgba(8,15,40,0.95)',
      border: `1px solid ${color}55`,
      borderRadius: 14,
      padding: 16,
      backdropFilter: 'blur(16px)',
      boxShadow: `0 8px 32px ${color}22`,
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animation: 'slide-up .25s ease both',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {marker.kind === 'province'
              ? (marker.data.kind === 'central-city' ? '🏛 TP TRỰC THUỘC TW' : '🏞 TỈNH')
              : marker.kind === 'landmark' ? '✨ DANH THẮNG'
              : marker.kind === 'startup' ? '🚀 STARTUP HUB'
              : '👥 CỤM NGƯỜI DÙNG'}
          </p>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h3>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{subtitle}</p>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none',
          color: '#94a3b8', cursor: 'pointer', padding: 4, fontSize: 18, lineHeight: 1,
        }}>×</button>
      </div>

      {marker.kind === 'province' && (
        <ProvinceDetail province={marker.data} />
      )}
      {marker.kind === 'landmark' && (
        <LandmarkDetail landmark={marker.data} />
      )}
      {marker.kind === 'startup' && (
        <StartupDetail startup={marker.data} />
      )}
      {marker.kind === 'user' && (
        <UserDetail user={marker.data} />
      )}
    </div>
  )
}

function ProvinceDetail({ province }: { province: VNProvince2025 }) {
  const isMerged = province.mergedFrom.length > 1
  return (
    <div>
      <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 }}>
        {province.description}
      </p>

      {isMerged && (
        <div style={{
          background: 'rgba(168,139,250,0.08)',
          border: '1px solid rgba(168,139,250,0.25)',
          borderRadius: 8, padding: 10, marginBottom: 12,
        }}>
          <p style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 6 }}>
            SÁP NHẬP 2025 ({province.mergedFrom.length} tỉnh cũ)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {province.mergedFrom.map((old) => (
              <span key={old} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 99,
                background: old === province.name ? 'rgba(34,211,238,0.15)' : 'rgba(148,163,184,0.1)',
                color: old === province.name ? '#22d3ee' : '#cbd5e1',
                border: `1px solid ${old === province.name ? '#22d3ee44' : '#94a3b822'}`,
              }}>{old}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {province.areaKm2 !== undefined && (
          <div style={{ background: 'rgba(34,211,238,0.06)', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: '#94a3b8' }}>Diện tích</p>
            <p style={{ fontSize: 14, color: '#22d3ee', fontWeight: 700 }}>
              {province.areaKm2.toLocaleString('vi-VN')} km²
            </p>
          </div>
        )}
        {province.populationM !== undefined && (
          <div style={{ background: 'rgba(168,139,250,0.06)', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: '#94a3b8' }}>Dân số</p>
            <p style={{ fontSize: 14, color: '#a78bfa', fontWeight: 700 }}>
              {province.populationM.toFixed(1)}M
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function LandmarkDetail({ landmark }: { landmark: VNLandmark }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 }}>
        {landmark.description}
      </p>
      {landmark.unesco && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(232,121,249,0.1)',
          border: '1px solid rgba(232,121,249,0.35)',
          borderRadius: 99, padding: '4px 10px',
          fontSize: 11, color: '#e879f9', fontWeight: 700,
        }}>
          🏛 UNESCO World Heritage
        </div>
      )}
    </div>
  )
}

function StartupDetail({ startup }: { startup: StartupHub | AeroStartupMarker }) {
  const color = TIER_COLORS[startup.tier]
  return (
    <div>
      {startup.description && (
        <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 }}>
          {startup.description}
        </p>
      )}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: `${color}15`,
        border: `1px solid ${color}55`,
        borderRadius: 99, padding: '4px 10px',
        fontSize: 11, color, fontWeight: 700, marginBottom: 8,
      }}>
        {startup.tier === 'mega' ? '🦄 Mega Hub' : startup.tier === 'major' ? '🚀 Major' : '💡 Emerging'}
      </div>
      {startup.unicorns !== undefined && (
        <p style={{ fontSize: 12, color: '#94a3b8' }}>
          <strong style={{ color: '#fff' }}>{startup.unicorns}</strong> unicorn startups
        </p>
      )}
    </div>
  )
}

function UserDetail({ user }: { user: AeroUserMarker }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>
          {user.count.toLocaleString('vi-VN')}
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {user.role === 'mixed' ? 'người dùng' : user.role}
        </span>
      </div>
    </div>
  )
}
