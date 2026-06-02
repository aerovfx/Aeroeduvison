/**
 * ARRealtimeController — WebXR `immersive-ar` realtime (Pha 2 + chọn neo dễ).
 *
 * Đặt bên trong <Canvas>. Khi phiên AR bắt đầu:
 *   1. Đo bao đóng (bbox) của nội dung cảnh, ẩn nền (thấy camera thật).
 *   2. Dò mặt phẳng thật bằng hit-test → reticle LUÔN hiện (vòng + chấm tâm).
 *   3. CHẠM bất cứ đâu để đặt:
 *        - có mặt phẳng → neo lên đúng điểm reticle;
 *        - chưa thấy mặt phẳng → đặt ngay ~0.7m TRƯỚC MẶT (không còn "chạm trượt").
 *      CHẠM LẠI để DI CHUYỂN vật sang chỗ mới (không cần thoát AR).
 *   4. Chụm 2 ngón để phóng to/thu nhỏ.
 * Giữ NGUYÊN tương tác realtime (animation/slider vẫn chạy) vì cảnh R3F sống.
 */
import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const RETICLE_NAME = 'ar-reticle'
const TARGET_SIZE_M = 0.4 // kích thước thật mong muốn (~40cm trên bàn)
const FALLBACK_DIST = 0.7 // mét — khoảng cách đặt trước mặt khi không tìm thấy mặt phẳng

// Khung góc vuông kiểu GeoGebra: 4 góc, mỗi góc 2 thanh chữ L nằm phẳng trên mặt
const RET_HALF = 0.12 // nửa cạnh khung (m)
const RET_LEG = 0.05 // chiều dài mỗi chân chữ L
const RET_W = 0.012 // bề rộng thanh
const RET_H = 0.004 // độ dày (theo trục Y — mỏng để nằm sát mặt)
const RET_CORNERS = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ sx, sz })))

export type ArPhase = 'searching' | 'ready' | 'placed' | null

interface Props {
  /** Báo tỉ lệ thật (cm cho 1 đơn vị cảnh) khi đặt/chỉnh; null khi thoát AR. */
  onPlacedScale?: (cmPerUnit: number | null) => void
  /** Báo trạng thái neo để DOM hiện hướng dẫn: searching / ready / placed / null(thoát). */
  onPhase?: (phase: ArPhase) => void
}

export function ARRealtimeController({ onPlacedScale, onPhase }: Props = {}) {
  const { gl, scene } = useThree()
  const reticle = useRef<THREE.Group>(null)
  const hitSource = useRef<any>(null)
  const placed = useRef(false)
  const measured = useRef<{ center: THREE.Vector3; minY: number; maxDim: number } | null>(null)
  const saved = useRef<{ pos: THREE.Vector3; scl: THREE.Vector3; bg: any } | null>(null)
  // trạng thái đặt + cử chỉ chụm ngón (pinch) để phóng to/thu nhỏ
  const placedPos = useRef<THREE.Vector3 | null>(null)
  const baseK = useRef(1)
  const userScale = useRef(1)
  const pinchStartDist = useRef(0)
  const pinchStartScale = useRef(1)
  // pose đầu (viewer) cập nhật mỗi frame — dùng cho đặt fallback trước mặt
  const camPos = useRef(new THREE.Vector3())
  const camQuat = useRef(new THREE.Quaternion())
  const planeFound = useRef(false)
  const lastPhase = useRef<ArPhase>(null)

  useEffect(() => {
    const xr: any = gl.xr

    const emitPhase = () => {
      const phase: ArPhase = placed.current ? 'placed' : planeFound.current ? 'ready' : 'searching'
      if (phase !== lastPhase.current) {
        lastPhase.current = phase
        onPhase?.(phase)
      }
    }

    const measure = () => {
      const box = new THREE.Box3()
      scene.children.forEach((child) => {
        if (child.name === RETICLE_NAME) return
        if ((child as any).isLight) return
        // Bỏ qua Points/starfield (vd drei <Stars> bán kính ~300) — nếu tính vào
        // bbox sẽ phình to → cảnh thật bị thu nhỏ tí xíu.
        if ((child as any).isPoints) return
        box.expandByObject(child)
      })
      if (box.isEmpty()) {
        measured.current = { center: new THREE.Vector3(), minY: 0, maxDim: 1 }
        return
      }
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)
      measured.current = {
        center,
        minY: box.min.y,
        maxDim: Math.max(size.x, size.y, size.z) || 1,
      }
    }

    // Áp tỉ lệ + vị trí: neo đáy cảnh tại điểm đã chọn, đổi kích thước theo userScale
    const applyPlacement = () => {
      const m = measured.current
      const p = placedPos.current
      if (!m || !p) return
      const k = baseK.current * userScale.current
      scene.scale.setScalar(k)
      scene.position.set(p.x - m.center.x * k, p.y - m.minY * k, p.z - m.center.z * k)
      onPlacedScale?.(k * 100) // cm cho 1 đơn vị cảnh
    }

    const touchDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onTouchStart = (e: TouchEvent) => {
      if (!placed.current || e.touches.length !== 2) return
      pinchStartDist.current = touchDist(e.touches)
      pinchStartScale.current = userScale.current
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!placed.current || e.touches.length !== 2 || pinchStartDist.current <= 0) return
      const ratio = touchDist(e.touches) / pinchStartDist.current
      userScale.current = THREE.MathUtils.clamp(pinchStartScale.current * ratio, 0.2, 6)
      applyPlacement()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDist.current = 0
    }

    const onStart = () => {
      saved.current = {
        pos: scene.position.clone(),
        scl: scene.scale.clone(),
        bg: scene.background,
      }
      measure()
      scene.background = null // để thấy camera thật xuyên qua
      placed.current = false
      planeFound.current = false
      lastPhase.current = null
      hitSource.current = null
      userScale.current = 1
      placedPos.current = null
      pinchStartDist.current = 0
      window.addEventListener('touchstart', onTouchStart, { passive: true })
      window.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('touchend', onTouchEnd, { passive: true })
      emitPhase()

      const session: any = xr.getSession?.()
      if (!session?.requestReferenceSpace) return

      session
        .requestReferenceSpace('viewer')
        .then((viewerSpace: any) =>
          session
            .requestHitTestSource?.({ space: viewerSpace })
            .then((src: any) => {
              hitSource.current = src
            })
            .catch(() => {}),
        )
        .catch(() => {})

      // CHẠM để đặt / di chuyển. Bỏ qua khi đang chụm 2 ngón (tránh "teleport").
      const onSelect = () => {
        const m = measured.current
        if (!m || pinchStartDist.current > 0) return
        const r = reticle.current
        const pos = new THREE.Vector3()
        if (r && r.visible) {
          // Neo lên đúng điểm reticle trên mặt phẳng
          const q = new THREE.Quaternion()
          const s = new THREE.Vector3()
          r.matrix.decompose(pos, q, s)
        } else {
          // Fallback: đặt ~0.7m trước mặt (mặt phẳng chưa dò được)
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat.current)
          pos.copy(camPos.current).add(fwd.multiplyScalar(FALLBACK_DIST))
        }
        baseK.current = TARGET_SIZE_M / m.maxDim
        if (!placed.current) userScale.current = 1 // lần đầu: cỡ chuẩn; di chuyển sau giữ nguyên cỡ
        placedPos.current = pos.clone()
        placed.current = true
        applyPlacement()
        emitPhase()
      }
      session.addEventListener?.('select', onSelect)
    }

    const onEnd = () => {
      if (saved.current) {
        scene.position.copy(saved.current.pos)
        scene.scale.copy(saved.current.scl)
        scene.background = saved.current.bg
      }
      if (reticle.current) reticle.current.visible = false
      hitSource.current = null
      placed.current = false
      planeFound.current = false
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      onPlacedScale?.(null)
      lastPhase.current = null
      onPhase?.(null)
    }

    xr.addEventListener?.('sessionstart', onStart)
    xr.addEventListener?.('sessionend', onEnd)
    return () => {
      xr.removeEventListener?.('sessionstart', onStart)
      xr.removeEventListener?.('sessionend', onEnd)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [gl, scene, onPlacedScale, onPhase])

  useFrame((_state, _delta, frame: any) => {
    if (!frame) return
    const refSpace = (gl.xr as any).getReferenceSpace?.()
    if (!refSpace) return

    // Cập nhật pose đầu (cho đặt fallback trước mặt)
    const vp = frame.getViewerPose?.(refSpace)
    if (vp) {
      const p = vp.transform.position
      const o = vp.transform.orientation
      camPos.current.set(p.x, p.y, p.z)
      camQuat.current.set(o.x, o.y, o.z, o.w)
    }

    // Reticle LUÔN cập nhật (kể cả sau khi đặt) để còn chạm di chuyển
    const r = reticle.current
    if (!r || !hitSource.current) return
    const results = frame.getHitTestResults(hitSource.current)
    const found = !!(results && results.length)
    if (found) {
      const pose = results[0].getPose(refSpace)
      if (pose) {
        r.visible = true
        r.matrix.fromArray(pose.transform.matrix)
      }
    } else {
      r.visible = false
    }
    if (found !== planeFound.current) {
      planeFound.current = found
      // chỉ đổi phase khi chưa đặt (đặt rồi giữ 'placed')
      if (!placed.current) {
        const phase: ArPhase = found ? 'ready' : 'searching'
        if (phase !== lastPhase.current) {
          lastPhase.current = phase
          onPhase?.(phase)
        }
      }
    }
  })

  return (
    <group ref={reticle} name={RETICLE_NAME} visible={false} matrixAutoUpdate={false}>
      {/* Khung 4 góc vuông (┏ ┓ ┗ ┛) nằm phẳng trên mặt phẳng — kiểu GeoGebra */}
      {RET_CORNERS.map(({ sx, sz }, i) => (
        <group key={i}>
          {/* chân theo trục X */}
          <mesh position={[sx * (RET_HALF - RET_LEG / 2), 0, sz * RET_HALF]}>
            <boxGeometry args={[RET_LEG, RET_H, RET_W]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          {/* chân theo trục Z */}
          <mesh position={[sx * RET_HALF, 0, sz * (RET_HALF - RET_LEG / 2)]}>
            <boxGeometry args={[RET_W, RET_H, RET_LEG]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* chấm tâm mờ để ngắm chính xác điểm neo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.009, 24]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

export default ARRealtimeController
