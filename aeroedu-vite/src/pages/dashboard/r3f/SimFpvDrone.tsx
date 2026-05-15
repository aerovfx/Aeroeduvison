/**
 * FPV Drone Simulator + WebXR (VR) — sandbox bay drone trong môi trường Aura
 *
 * Tính năng:
 *   - Quadcopter mesh + physics (throttle/pitch/roll/yaw + gravity + drag)
 *   - First-person camera mounted to drone (FPV view)
 *   - Gamepad API: hỗ trợ tay cầm FPV USB (FrSky/RadioMaster với joystick mode)
 *     hoặc gamepad chuẩn (PS/Xbox controller)
 *   - WebXR: nút "Vào VR" để xem qua kính (Meta Quest, Vision Pro)
 *   - HUD: altitude, speed, throttle %, battery, GPS lock
 *   - Mode 2 (default RC): Left stick = throttle+yaw, Right stick = pitch+roll
 *   - Keyboard fallback: W/S throttle, A/D yaw, ↑↓ pitch, ←→ roll
 *
 * Mapping Gamepad axes (Mode 2 RC layout standard):
 *   axis[0] = Yaw      (left stick X)   — quay phải/trái
 *   axis[1] = Throttle (left stick Y inverted) — lên xuống
 *   axis[2] = Roll     (right stick X)  — nghiêng trái phải
 *   axis[3] = Pitch    (right stick Y inverted) — gập trước/sau
 *
 * Tham khảo Liftoff/Velocidrone simulator + DJI FPV controller behavior.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky, Stars, Text, KeyboardControls, useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────
// Quadcopter mesh — body + 4 motor arms + spinning props
// ─────────────────────────────────────────────────────────────
function Quadcopter({ propSpeed = 1 }: { propSpeed?: number }) {
  const propRefs = useRef<(THREE.Mesh | null)[]>([])

  useFrame((_state, dt) => {
    propRefs.current.forEach((p, i) => {
      if (p) p.rotation.y += dt * 30 * propSpeed * (i % 2 === 0 ? 1 : -1)
    })
  })

  // 4 motor positions (X-config quadcopter): FL, FR, BL, BR
  const arms: [number, number, number][] = [
    [ 0.4, 0,  0.4],   // FR
    [-0.4, 0,  0.4],   // FL
    [ 0.4, 0, -0.4],   // BR
    [-0.4, 0, -0.4],   // BL
  ]

  return (
    <group>
      {/* Body — flat carbon plate */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.35]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Top stack (FC + camera) */}
      <mesh position={[0, 0.07, 0.05]}>
        <boxGeometry args={[0.15, 0.06, 0.15]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* Camera lens (front-tilted) */}
      <mesh position={[0, 0.05, 0.18]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* 4 arms + motors + props */}
      {arms.map((pos, i) => (
        <group key={i} position={pos}>
          {/* arm */}
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 0.55, 8]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          {/* motor */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
            <meshStandardMaterial color="#6b7280" metalness={0.8} />
          </mesh>
          {/* prop (spinning) */}
          <mesh ref={el => (propRefs.current[i] = el)} position={[0, 0.08, 0]}>
            <boxGeometry args={[0.25, 0.005, 0.025]} />
            <meshStandardMaterial color="#fbbf24" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────
// Procedural environment — terrain + obstacles + sky + stars
// ─────────────────────────────────────────────────────────────
function Environment() {
  return (
    <>
      <Sky distance={4500} sunPosition={[100, 20, 100]} inclination={0.49} azimuth={0.25} />
      <Stars radius={200} depth={50} count={3000} factor={4} fade speed={0.5} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 80, 30]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />

      {/* Ground — large plane with grid pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400, 50, 50]} />
        <meshStandardMaterial color="#1a4f3a" wireframe={false} />
      </mesh>
      {/* Grid lines */}
      <gridHelper args={[400, 80, '#22c55e', '#14532d']} position={[0, 0.01, 0]} />

      {/* Tower obstacles (xếp ngẫu nhiên) — bay luồn qua */}
      {Array.from({ length: 25 }).map((_, i) => {
        const angle = (i / 25) * Math.PI * 2
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

      {/* Race gates — 5 vòng tròn hoop để bay luồn qua */}
      {[
        [10, 4, 15], [-15, 5, 25], [5, 6, 40], [-25, 4, 50], [15, 5, 60],
      ].map((p, i) => (
        <mesh key={`gate-${i}`} position={p as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.2, 0.18, 8, 32]} />
          <meshStandardMaterial color={i === 0 ? '#10b981' : '#ec4899'} emissive={i === 0 ? '#10b981' : '#ec4899'} emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* Spawn pad */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Drone physics + camera controller
// ─────────────────────────────────────────────────────────────
interface DroneState {
  pos:    THREE.Vector3
  vel:    THREE.Vector3
  yaw:    number
  pitch:  number
  roll:   number
  battery: number  // 0-100%
}

interface ControlInputs {
  throttle: number  // -1..1 (down..up)
  yaw:      number  // -1..1 (left..right)
  pitch:    number  // -1..1 (down..up)
  roll:     number  // -1..1 (left..right)
}

const PHYSICS = {
  thrustGain:    25,    // m/s² max khi throttle 100%
  yawRate:       3,     // rad/s
  pitchRate:     2.5,   // rad/s
  rollRate:      2.5,
  airDrag:       0.92,  // velocity multiplier mỗi tick (1=no drag, 0=full stop)
  gravity:       9.81,
  maxAltitude:   80,
  batteryDrain:  0.5,   // %/s khi throttle 100%
}

function DroneRig({
  inputs,
  onTelemetry,
}: {
  inputs: React.MutableRefObject<ControlInputs>
  onTelemetry: (state: DroneState) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const stateRef = useRef<DroneState>({
    pos: new THREE.Vector3(0, 1.5, 0),
    vel: new THREE.Vector3(),
    yaw: 0, pitch: 0, roll: 0,
    battery: 100,
  })
  const { camera } = useThree()

  useFrame((_state, dt) => {
    const s = stateRef.current
    const i = inputs.current
    // Rotation rates from input (degrees of freedom: yaw, pitch tilt, roll tilt)
    s.yaw   += i.yaw   * PHYSICS.yawRate   * dt
    s.pitch  = i.pitch * 0.5    // direct angle, not integrated (instantaneous tilt)
    s.roll   = i.roll  * 0.5
    // Calc thrust direction (drone "up" axis after rotations)
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw)
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.pitch)
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.roll)
    const orientation = yawQuat.clone().multiply(pitchQuat).multiply(rollQuat)
    const thrustVec = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation)
    // Throttle: 0 = hover (cancel gravity), positive = up
    const throttleMag = Math.max(0, (i.throttle + 1) / 2)  // -1..1 → 0..1
    const thrustForce = throttleMag * PHYSICS.thrustGain
    // Apply forces
    s.vel.addScaledVector(thrustVec, thrustForce * dt)
    s.vel.y -= PHYSICS.gravity * dt
    s.vel.multiplyScalar(PHYSICS.airDrag ** (dt * 60))   // frame-rate independent
    s.pos.addScaledVector(s.vel, dt)
    // Ground collision
    if (s.pos.y < 0.3) {
      s.pos.y = 0.3
      s.vel.y = Math.max(0, s.vel.y * 0.3)  // bounce damping
      s.vel.x *= 0.7
      s.vel.z *= 0.7
    }
    if (s.pos.y > PHYSICS.maxAltitude) {
      s.pos.y = PHYSICS.maxAltitude
      s.vel.y = Math.min(0, s.vel.y)
    }
    // Battery
    if (s.battery > 0) {
      s.battery = Math.max(0, s.battery - throttleMag * PHYSICS.batteryDrain * dt)
    }
    // Apply to mesh
    if (groupRef.current) {
      groupRef.current.position.copy(s.pos)
      groupRef.current.quaternion.copy(orientation)
    }
    // FPV camera = mount at drone position, looking forward (+Z relative)
    const camOffset = new THREE.Vector3(0, 0.05, 0).applyQuaternion(orientation)
    camera.position.copy(s.pos).add(camOffset)
    const lookDir = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation)
    camera.lookAt(s.pos.clone().add(lookDir))
    // Telemetry callback (throttled to 10Hz để không re-render nhiều)
    onTelemetry({ ...s, pos: s.pos.clone(), vel: s.vel.clone() })
  })

  return (
    <group ref={groupRef}>
      <Quadcopter propSpeed={Math.max(0.1, (inputs.current.throttle + 1) / 2)} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────
// Gamepad poller — đọc tay cầm FPV mỗi frame, map sang ControlInputs
// ─────────────────────────────────────────────────────────────
function useGamepadInput(inputsRef: React.MutableRefObject<ControlInputs>) {
  const [connected, setConnected] = useState<string | null>(null)

  useEffect(() => {
    const onConnect = (e: GamepadEvent) => setConnected(e.gamepad.id)
    const onDisconnect = () => setConnected(null)
    window.addEventListener('gamepadconnected', onConnect as EventListener)
    window.addEventListener('gamepaddisconnected', onDisconnect as EventListener)
    return () => {
      window.removeEventListener('gamepadconnected', onConnect as EventListener)
      window.removeEventListener('gamepaddisconnected', onDisconnect as EventListener)
    }
  }, [])

  useEffect(() => {
    let raf: number
    const deadzone = 0.08
    const dz = (v: number) => Math.abs(v) < deadzone ? 0 : v
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      const pad = Array.from(pads).find(p => p && p.connected)
      if (pad) {
        // Mode 2 RC layout (standard FPV/sim controller mapping)
        // Note: throttle is left-Y INVERTED (push up = positive)
        inputsRef.current.yaw      = dz(pad.axes[0] || 0)
        inputsRef.current.throttle = dz(-(pad.axes[1] || 0))
        inputsRef.current.roll     = dz(pad.axes[2] || 0)
        inputsRef.current.pitch    = dz(-(pad.axes[3] || 0))
      }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  }, [inputsRef])

  return connected
}

// ─────────────────────────────────────────────────────────────
// Keyboard input fallback (W/S/A/D + arrows)
// ─────────────────────────────────────────────────────────────
function useKeyboardInput(inputsRef: React.MutableRefObject<ControlInputs>) {
  const [, getKeys] = useKeyboardControls()
  useFrame(() => {
    const k = getKeys() as Record<string, boolean>
    // Chỉ overide nếu gamepad không activerm
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    const hasPad = Array.from(pads).some(p => p && p.connected)
    if (hasPad) return
    inputsRef.current.throttle = (k.throttleUp ? 1 : 0) - (k.throttleDown ? 1 : 0)
    inputsRef.current.yaw      = (k.yawRight ? 1 : 0) - (k.yawLeft ? 1 : 0)
    inputsRef.current.pitch    = (k.pitchUp ? 1 : 0) - (k.pitchDown ? 1 : 0)
    inputsRef.current.roll     = (k.rollRight ? 1 : 0) - (k.rollLeft ? 1 : 0)
  })
}

function KeyboardBridge({ inputsRef }: { inputsRef: React.MutableRefObject<ControlInputs> }) {
  useKeyboardInput(inputsRef)
  return null
}

// ─────────────────────────────────────────────────────────────
// HUD overlay (altitude, speed, throttle, battery, gamepad status)
// ─────────────────────────────────────────────────────────────
function FpvHUD({ telemetry, gamepadId }: { telemetry: DroneState | null; gamepadId: string | null }) {
  if (!telemetry) return null
  const speed = telemetry.vel.length()
  const battColor = telemetry.battery > 30 ? '#10b981' : telemetry.battery > 15 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      fontFamily: 'monospace', color: '#22c55e', textShadow: '0 0 4px rgba(0,0,0,0.8)',
    }}>
      {/* Top-left: altitude + speed */}
      <div style={{ position: 'absolute', top: 12, left: 16 }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>ALT</div>
        <div style={{ fontSize: 22, fontWeight: 'bold' }}>{telemetry.pos.y.toFixed(1)}m</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 8 }}>SPEED</div>
        <div style={{ fontSize: 22, fontWeight: 'bold' }}>{speed.toFixed(1)} m/s</div>
      </div>
      {/* Top-right: battery */}
      <div style={{ position: 'absolute', top: 12, right: 16, textAlign: 'right' }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>BATTERY</div>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: battColor }}>
          {telemetry.battery.toFixed(0)}%
        </div>
        <div style={{
          width: 80, height: 6, background: 'rgba(255,255,255,0.2)', marginTop: 4,
          borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{ width: `${telemetry.battery}%`, height: '100%', background: battColor }} />
        </div>
      </div>
      {/* Bottom-center: GPS coords + status */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', fontSize: 11,
      }}>
        <div>X: {telemetry.pos.x.toFixed(1)}  Y: {telemetry.pos.y.toFixed(1)}  Z: {telemetry.pos.z.toFixed(1)}</div>
        <div style={{ marginTop: 4, opacity: 0.7 }}>
          {gamepadId ? `🎮 ${gamepadId.slice(0, 40)}` : '⌨️ Keyboard mode (W/S A/D ↑↓ ←→) — cắm gamepad/RC TX để dùng'}
        </div>
      </div>
      {/* Crosshair center */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 30, height: 30, border: '1.5px solid rgba(34, 197, 94, 0.6)', borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 4, height: 4, background: '#22c55e', borderRadius: '50%',
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// VR Button — dùng vanilla WebXR API (không cần @react-three/xr)
// ─────────────────────────────────────────────────────────────
function VRButton() {
  const { gl } = useThree()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [inXR, setInXR] = useState(false)

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr
    if (!xr) { setSupported(false); return }
    xr.isSessionSupported('immersive-vr').then((ok) => setSupported(ok)).catch(() => setSupported(false))
  }, [])

  const enter = useCallback(async () => {
    const xr = (navigator as Navigator & { xr?: any }).xr
    if (!xr || !gl) return
    try {
      const session = await xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor'],
      })
      gl.xr.enabled = true
      await gl.xr.setSession(session)
      setInXR(true)
      session.addEventListener('end', () => setInXR(false))
    } catch (e) {
      alert('Không khởi động được VR session: ' + (e as Error).message)
    }
  }, [gl])

  if (supported === null) return null
  if (!supported) {
    return (
      <div style={{
        position: 'absolute', bottom: 60, right: 16, padding: '8px 14px',
        background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
        color: '#fca5a5', fontSize: 11, borderRadius: 6, fontFamily: 'monospace', pointerEvents: 'none',
      }}>
        🥽 VR không hỗ trợ trên trình duyệt/thiết bị này
      </div>
    )
  }
  return (
    <button onClick={enter} disabled={inXR} style={{
      position: 'absolute', bottom: 60, right: 16, padding: '10px 18px',
      background: inXR ? 'rgba(34, 197, 94, 0.3)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
      border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: 8, cursor: inXR ? 'default' : 'pointer',
      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)', fontSize: 13,
    }}>
      {inXR ? '✓ Đang ở VR' : '🥽 Vào VR'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Main scene — wraps Canvas + state + HUD
// ─────────────────────────────────────────────────────────────
function FpvScene() {
  const inputsRef = useRef<ControlInputs>({ throttle: 0, yaw: 0, pitch: 0, roll: 0 })
  const [telemetry, setTelemetry] = useState<DroneState | null>(null)
  const gamepadId = useGamepadInput(inputsRef)

  // Throttle telemetry update sang React state (10Hz)
  const lastUpdateRef = useRef(0)
  const onTelemetry = useCallback((s: DroneState) => {
    const now = performance.now()
    if (now - lastUpdateRef.current > 100) {
      setTelemetry(s)
      lastUpdateRef.current = now
    }
  }, [])

  return (
    <KeyboardControls
      map={[
        { name: 'throttleUp',   keys: ['KeyW'] },
        { name: 'throttleDown', keys: ['KeyS'] },
        { name: 'yawLeft',      keys: ['KeyA'] },
        { name: 'yawRight',     keys: ['KeyD'] },
        { name: 'pitchUp',      keys: ['ArrowUp'] },
        { name: 'pitchDown',    keys: ['ArrowDown'] },
        { name: 'rollLeft',     keys: ['ArrowLeft'] },
        { name: 'rollRight',    keys: ['ArrowRight'] },
      ]}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Canvas
          shadows
          camera={{ fov: 90, near: 0.1, far: 1000, position: [0, 1.5, 0] }}
          style={{ background: '#0a0a0f', width: '100%', height: '100%' }}
        >
          <Environment />
          <DroneRig inputs={inputsRef} onTelemetry={onTelemetry} />
          <KeyboardBridge inputsRef={inputsRef} />
          <Text position={[0, 12, -20]} fontSize={1.5} color="#22c55e" anchorX="center">
            AERO FPV SANDBOX
          </Text>
          <VRButton />
        </Canvas>
        <FpvHUD telemetry={telemetry} gamepadId={gamepadId} />
      </div>
    </KeyboardControls>
  )
}

export const fpvSimulations = {
  'fpv-drone-vr': FpvScene,
}
