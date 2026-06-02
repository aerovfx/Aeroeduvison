/**
 * ARRealtimeController — WebXR `immersive-ar` realtime (Pha 2).
 *
 * Đặt bên trong <Canvas>. Khi phiên AR bắt đầu (fiber tự chuyển sang vòng lặp XR
 * và truyền XRFrame vào useFrame):
 *   1. Đo bao đóng (bounding box) của nội dung cảnh, ẩn nền (để thấy camera thật).
 *   2. Dò mặt phẳng thật bằng hit-test → hiện vòng reticle tím trên sàn/bàn.
 *   3. Người dùng chạm (select) → thu nhỏ cảnh về ~0.4m và đặt lên điểm vừa chọn.
 * Giữ NGUYÊN tương tác realtime (animation/slider vẫn chạy) vì cảnh R3F sống.
 *
 * Khác với đường model-viewer (snapshot tĩnh) — đây là cảnh động thực sự.
 * Chỉ kích hoạt khi đang trong phiên XR; ngoài AR gần như không tốn chi phí.
 */
import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const RETICLE_NAME = 'ar-reticle'
const TARGET_SIZE_M = 0.4 // kích thước thật mong muốn (~40cm trên bàn)

interface Props {
  /** Báo tỉ lệ thật (cm cho 1 đơn vị cảnh) khi đặt/chỉnh; null khi thoát AR. */
  onPlacedScale?: (cmPerUnit: number | null) => void
}

export function ARRealtimeController({ onPlacedScale }: Props = {}) {
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

  useEffect(() => {
    const xr: any = gl.xr

    const measure = () => {
      const box = new THREE.Box3()
      scene.children.forEach((child) => {
        if (child.name === RETICLE_NAME) return
        if ((child as any).isLight) return
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
      hitSource.current = null
      userScale.current = 1
      placedPos.current = null
      window.addEventListener('touchstart', onTouchStart, { passive: true })
      window.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('touchend', onTouchEnd, { passive: true })

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

      const onSelect = () => {
        const r = reticle.current
        const m = measured.current
        if (!r || !r.visible || !m || placed.current) return
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        const scl = new THREE.Vector3()
        r.matrix.decompose(pos, quat, scl)
        baseK.current = TARGET_SIZE_M / m.maxDim
        userScale.current = 1
        placedPos.current = pos.clone()
        placed.current = true
        r.visible = false
        applyPlacement()
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
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      onPlacedScale?.(null)
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
  }, [gl, scene, onPlacedScale])

  useFrame((_state, _delta, frame: any) => {
    if (!frame || placed.current) return
    const refSpace = (gl.xr as any).getReferenceSpace?.()
    const r = reticle.current
    if (!refSpace || !r || !hitSource.current) return
    const results = frame.getHitTestResults(hitSource.current)
    if (results && results.length) {
      const pose = results[0].getPose(refSpace)
      if (pose) {
        r.visible = true
        r.matrix.fromArray(pose.transform.matrix)
      }
    } else {
      r.visible = false
    }
  })

  return (
    <group ref={reticle} name={RETICLE_NAME} visible={false} matrixAutoUpdate={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.065, 32]} />
        <meshBasicMaterial color="#7c3aed" toneMapped={false} />
      </mesh>
    </group>
  )
}

export default ARRealtimeController
